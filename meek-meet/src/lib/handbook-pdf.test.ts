import { describe, it, expect } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildHandbookPdf, wrapText, type HandbookPdfData } from "./handbook-pdf";

const BASE: HandbookPdfData = {
  memberName: "Miriam Khoury",
  circleName: "Gosford Circle",
  scheduledAt: "2026-12-01T09:00:00.000Z",
  locationName: "Gosford Library",
  variant: "first_circle",
  topicName: "Home & Street",
  topicEpithet: "The ground beneath your feet",
  introTitle: "Your introduction",
  responses: [
    {
      question_id: "hom-1",
      question: 'What does "home" mean to you — the building, the people, the feeling?',
      answer: "Home is the people who notice when you don't show up. The building is just the shell.",
    },
    {
      question_id: "hom-2",
      question: "What is the housing reality of your street right now?",
      answer: "Three families on my street are stretched to the edge.",
    },
  ],
  intentions: "Please carry the family at number 14 in the circle's thoughts.",
};

async function textOf(pdfBytes: Uint8Array): Promise<string> {
  // pdf-lib doesn't extract text; instead verify structure by reloading.
  const doc = await PDFDocument.load(pdfBytes);
  return `${doc.getPageCount()} pages, title=${doc.getTitle()}`;
}

describe("buildHandbookPdf", () => {
  it("produces a valid PDF document", async () => {
    const bytes = await buildHandbookPdf(BASE);
    expect(bytes).toBeInstanceOf(Uint8Array);
    // PDF magic header
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it("is loadable by a PDF reader with the circle name in the title", async () => {
    const bytes = await buildHandbookPdf(BASE);
    const info = await textOf(bytes);
    expect(info).toContain("1 pages");
    expect(info).toContain("Gosford Circle");
  });

  it("paginates long handbooks onto multiple pages", async () => {
    const longAnswer = Array.from({ length: 40 }, (_, i) => `Sentence number ${i + 1} of a very long and honest answer.`).join(" ");
    const bytes = await buildHandbookPdf({
      ...BASE,
      responses: Array.from({ length: 8 }, (_, i) => ({
        question_id: `q${i}`,
        question: `Question number ${i + 1}, asked at length so it wraps across lines?`,
        answer: longAnswer,
      })),
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });

  it("renders unanswered questions without crashing", async () => {
    const bytes = await buildHandbookPdf({
      ...BASE,
      responses: [{ question_id: "q1", question: "An unanswered question?", answer: "" }],
      intentions: null,
    });
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("survives member text with characters outside the standard encoding", async () => {
    const bytes = await buildHandbookPdf({
      ...BASE,
      memberName: "Zoë 李",
      responses: [
        {
          question_id: "q1",
          question: "A question with an arrow → and a star ★?",
          answer: "Emoji-free but exotic: naïve café über — – 'quoted' “double” €100 日本語テキスト",
        },
      ],
    });
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("handles the returning variant and a missing location/topic", async () => {
    const bytes = await buildHandbookPdf({
      ...BASE,
      variant: "returning",
      locationName: null,
      topicName: null,
      topicEpithet: null,
      introTitle: "Your check-in",
    });
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
  });
});

describe("wrapText", () => {
  it("wraps to the given width without losing words", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.TimesRoman);
    const text = "The quick brown fox jumps over the lazy dog and keeps running into the night";
    const lines = wrapText(text, font, 12, 120);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toBe(text);
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(120);
    }
  });

  it("hard-splits words longer than a full line", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.TimesRoman);
    const longWord = "supercalifragilisticexpialidocious".repeat(4);
    const lines = wrapText(longWord, font, 12, 100);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("")).toBe(longWord);
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(100);
    }
  });

  it("preserves intentional blank lines between paragraphs", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.TimesRoman);
    const lines = wrapText("First paragraph.\n\nSecond paragraph.", font, 12, 400);
    expect(lines).toEqual(["First paragraph.", "", "Second paragraph."]);
  });
});
