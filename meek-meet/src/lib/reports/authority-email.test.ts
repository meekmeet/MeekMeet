import { describe, it, expect } from "vitest";
import { buildAuthorityLetter } from "./authority-email";
import type { ReportContent } from "./generate-report";

const fullContent: Partial<ReportContent> = {
  responseCount: 42,
  meetingCount: 6,
  timeWindow: "last_30_days",
  topThemes: [
    { theme: "Street lighting", count: 18, sentiment: "negative", sampleQuotes: [] },
    { theme: "Youth programs", count: 11, sentiment: "positive", sampleQuotes: [] },
  ],
  sentimentSummary: { positive: 20, neutral: 12, negative: 10, dominant: "positive" },
  consensusItems: [
    { statement: "Bus services should run later on weekends", agreementLevel: 87, evidence: "36 of 42 responses" },
  ],
  anonymisedQuotes: ["The street goes dark at seven and the kids come straight inside."],
  rawSummary: "Residents raised safety and transport more than any other theme.",
};

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    authorityName: "Central Coast Council",
    circleName: "New Moon Circle, Gosford",
    circleLocation: "Gosford, NSW",
    content: fullContent,
    summary: "Residents raised safety and transport more than any other theme.",
    reportId: "9f2c1a4e-7b3d-4c5a-9e8f-1a2b3c4d5e6f",
    generatedAt: "2026-11-25T03:15:24.000Z",
    ...overrides,
  };
}

describe("buildAuthorityLetter", () => {
  it("carries a stable reference number derived from date and report id", () => {
    const letter = buildAuthorityLetter(makeInput());
    expect(letter.reference).toBe("MM-20261125-9F2C1A4E");
    expect(letter.subject).toContain(letter.reference);
  });

  it("addresses the authority and the circle by name", () => {
    const { html } = buildAuthorityLetter(makeInput());
    expect(html).toContain("Central Coast Council");
    expect(html).toContain("New Moon Circle, Gosford");
    expect(html).toContain("Gosford, NSW");
  });

  it("presents the at-a-glance figures and the evidence tables", () => {
    const { html } = buildAuthorityLetter(makeInput());
    expect(html).toContain("Responses collected");
    expect(html).toContain("42");
    expect(html).toContain("Street lighting");
    expect(html).toContain("18 mentions");
    expect(html).toContain("87% agreement");
    expect(html).toContain("In their own words");
  });

  it("declares method, data integrity, verification pipeline, and the ABN", () => {
    const { html } = buildAuthorityLetter(makeInput());
    expect(html).toContain("Method and data integrity");
    expect(html).toContain("anonymised");
    expect(html).toContain("Working With Children Check");
    expect(html).toContain("National Police Check");
    expect(html).toContain("96 557 008 393");
    expect(html).toContain("hello@meekmeet.com");
  });

  it("states a clear ask and a reply path", () => {
    const { html } = buildAuthorityLetter(makeInput());
    expect(html).toContain("What we ask");
    expect(html).toContain("tabled, acknowledged, and answered");
  });

  it("escapes hostile content so the letter cannot be injected", () => {
    const { html } = buildAuthorityLetter(
      makeInput({ circleName: '<script>alert("x")</script>' })
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("degrades gracefully with empty content", () => {
    const { html } = buildAuthorityLetter(
      makeInput({ content: {}, summary: "" })
    );
    expect(html).toContain("Responses collected");
    expect(html).toContain("Method and data integrity");
    expect(html).not.toContain("What the circle raised");
    expect(html).not.toContain("In their own words");
  });

  it("contains no em dashes, anywhere", () => {
    const { html, subject } = buildAuthorityLetter(makeInput());
    expect(html).not.toContain("—");
    expect(subject).not.toContain("—");
  });
});
