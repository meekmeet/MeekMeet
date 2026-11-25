// The downloadable handbook — the member's session as a PDF: every question
// in order, their written answer beneath it, intentions at the end. Rendered
// with pdf-lib's standard fonts (no font files, no native deps) in the
// platform's parchment language.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { HandbookQuestion, HandbookVariant } from "@/lib/handbook";

export interface HandbookPdfData {
  memberName: string;
  circleName: string;
  scheduledAt: string;
  locationName: string | null;
  variant: HandbookVariant;
  topicName: string | null;
  topicEpithet: string | null;
  introTitle: string;
  responses: HandbookQuestion[];
  intentions: string | null;
}

// ── Palette (the parchment theme, in PDF rgb) ──────────────────
const PARCHMENT = rgb(0.98, 0.965, 0.933); // #faf6ee
const INK = rgb(0.173, 0.173, 0.173); // #2c2c2c
const MUTED = rgb(0.42, 0.42, 0.42); // #6b6b6b
const FAINT = rgb(0.541, 0.51, 0.447); // #8a8272
const ACCENT = rgb(0.647, 0.522, 0.31); // #a5854f
const RULE = rgb(0.91, 0.878, 0.8); // #e8e0cc

const PAGE_WIDTH = 595.28; // A4 portrait, points
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM_LIMIT = MARGIN + 24;

/**
 * Standard PDF fonts encode WinAnsi only; a character outside it makes
 * pdf-lib throw. Filter per character (cached), so member-written text can
 * never crash the render.
 */
function makeSanitizer(font: PDFFont): (text: string) => string {
  const cache = new Map<string, boolean>();
  const encodable = (ch: string): boolean => {
    let ok = cache.get(ch);
    if (ok === undefined) {
      try {
        font.encodeText(ch);
        ok = true;
      } catch {
        ok = false;
      }
      cache.set(ch, ok);
    }
    return ok;
  };
  return (text: string) =>
    text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .split("")
      .map((ch) => (encodable(ch) ? ch : ""))
      .join("");
}

/** Word-wrap `text` to `maxWidth` at `size`, hard-splitting long words. */
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      // Hard-split a word longer than the whole line.
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) {
          cut--;
        }
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Sydney",
  });
  const time = d.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  });
  return `${date}, ${time}`;
}

export async function buildHandbookPdf(data: HandbookPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Meek Meet — Circle Handbook — ${data.circleName}`);
  doc.setAuthor("Meek Meet");
  doc.setSubject("Session handbook: the questions of the circle and the member's written answers");

  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sanitize = makeSanitizer(serif);
  const sanitizeBold = makeSanitizer(serifBold);

  let page: PDFPage = null as unknown as PDFPage;
  let y = 0;
  let pageNumber = 0;

  const paintBackground = (p: PDFPage) => {
    p.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: PARCHMENT,
    });
  };

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    paintBackground(page);
    pageNumber++;
    y = PAGE_HEIGHT - MARGIN;
    // Footer
    const footer = "Meek Meet · meekmeet.com";
    const footerWidth = serif.widthOfTextAtSize(footer, 8);
    page.drawText(footer, {
      x: (PAGE_WIDTH - footerWidth) / 2,
      y: MARGIN - 18,
      size: 8,
      font: serif,
      color: FAINT,
    });
    const num = `${pageNumber}`;
    page.drawText(num, {
      x: PAGE_WIDTH - MARGIN - serif.widthOfTextAtSize(num, 8),
      y: MARGIN - 18,
      size: 8,
      font: serif,
      color: FAINT,
    });
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < BOTTOM_LIMIT) newPage();
  };

  const drawLines = (
    lines: string[],
    options: { font: PDFFont; size: number; color: ReturnType<typeof rgb>; lineHeight: number; indent?: number }
  ) => {
    for (const line of lines) {
      ensureSpace(options.lineHeight);
      if (line) {
        page.drawText(line, {
          x: MARGIN + (options.indent ?? 0),
          y: y - options.size,
          size: options.size,
          font: options.font,
          color: options.color,
        });
      }
      y -= options.lineHeight;
    }
  };

  const drawRule = (gapBefore = 6, gapAfter = 14) => {
    ensureSpace(gapBefore + gapAfter + 2);
    y -= gapBefore;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.75,
      color: RULE,
    });
    y -= gapAfter;
  };

  // ── Title page header ─────────────────────────────────────────
  newPage();

  const wordmark = "M E E K   M E E T";
  page.drawText(wordmark, {
    x: (PAGE_WIDTH - serif.widthOfTextAtSize(wordmark, 11)) / 2,
    y: y - 11,
    size: 11,
    font: serif,
    color: ACCENT,
  });
  y -= 34;

  const title = sanitizeBold(data.circleName);
  const titleLines = wrapText(title, serifBold, 24, CONTENT_WIDTH);
  drawLines(titleLines, { font: serifBold, size: 24, color: INK, lineHeight: 30 });

  const subtitle = "Circle Handbook — the whole session, pre-answered";
  drawLines([subtitle], { font: serifItalic, size: 12, color: MUTED, lineHeight: 18 });

  const meta = [
    `Prepared for: ${sanitize(data.memberName)}`,
    `Gathering: ${formatWhen(data.scheduledAt)}`,
    data.locationName ? `Place: ${sanitize(data.locationName)}` : null,
    data.topicName
      ? `Theme: ${sanitize(data.topicName)}${data.topicEpithet ? ` — ${sanitize(data.topicEpithet)}` : ""}`
      : null,
    `Introduction: ${data.variant === "first_circle" ? "First circle" : "Returning member"}`,
  ].filter((m): m is string => Boolean(m));
  y -= 6;
  drawLines(meta, { font: serif, size: 10.5, color: MUTED, lineHeight: 15 });

  drawRule(10, 18);

  // ── The introduction section ──────────────────────────────────
  drawLines([sanitizeBold(data.introTitle)], {
    font: serifBold,
    size: 14,
    color: ACCENT,
    lineHeight: 20,
  });
  y -= 2;
  drawLines(
    wrapText(
      sanitize(
        data.variant === "first_circle"
          ? "Read aloud when the leader invites you: your name, where you are on the street, and one thing you hope this circle becomes."
          : "Read aloud when the leader opens the circle: your name, your passions, and what has happened for you since the last circle."
      ),
      serifItalic,
      10.5,
      CONTENT_WIDTH
    ),
    { font: serifItalic, size: 10.5, color: MUTED, lineHeight: 15 }
  );

  drawRule(10, 18);

  // ── Questions and answers, in order ───────────────────────────
  data.responses.forEach((r, i) => {
    ensureSpace(60); // keep a question with at least the start of its answer
    drawLines(wrapText(sanitizeBold(`${i + 1}. ${r.question}`), serifBold, 12.5, CONTENT_WIDTH), {
      font: serifBold,
      size: 12.5,
      color: INK,
      lineHeight: 17,
    });
    y -= 4;
    const answer = r.answer.trim();
    drawLines(
      wrapText(
        sanitize(answer || "(unanswered)"),
        serif,
        11.5,
        CONTENT_WIDTH - 14
      ),
      { font: serif, size: 11.5, color: answer ? INK : FAINT, lineHeight: 16, indent: 14 }
    );
    y -= 12;
  });

  // ── Intentions ────────────────────────────────────────────────
  if (data.intentions?.trim()) {
    drawRule(4, 16);
    drawLines(["Intentions & notes for the leader"], {
      font: serifBold,
      size: 13,
      color: ACCENT,
      lineHeight: 19,
    });
    y -= 2;
    drawLines(wrapText(sanitize(data.intentions.trim()), serif, 11.5, CONTENT_WIDTH), {
      font: serif,
      size: 11.5,
      color: INK,
      lineHeight: 16,
    });
  }

  // ── Colophon ──────────────────────────────────────────────────
  y -= 16;
  ensureSpace(40);
  const colophon =
    "Blessed are the meek, for they shall inherit the earth. — Matthew 5:5 · The promise has many names.";
  drawLines(wrapText(colophon, serifItalic, 9.5, CONTENT_WIDTH), {
    font: serifItalic,
    size: 9.5,
    color: FAINT,
    lineHeight: 13,
  });

  return doc.save();
}
