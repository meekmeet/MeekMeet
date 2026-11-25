import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { generateCircleReport } from "./generate-report";

const mockSupa = new MockSupabaseClient();
const circleId = "22222222-2222-2222-2222-222222222222";
const user = makeAuthUser();

const insight = {
  response_count: 12,
  meeting_count: 3,
  top_themes: [{ theme: "Community safety", count: 8, sentiment: "positive", sampleQuotes: ["quote"] }],
  sentiment_summary: { positive: 9, neutral: 2, negative: 1, dominant: "positive" },
  consensus_items: [{ statement: "More parks", agreementLevel: 80, evidence: "evidence" }],
  anonymised_quotes: ["Anon quote"],
  raw_summary: "The circle cares deeply about safety.",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
});

describe("generateCircleReport", () => {
  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(generateCircleReport(circleId)).rejects.toThrow("Not authenticated");
  });

  it("throws when the user is not a shepherd of the circle", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null); // shepherd lookup
    await expect(generateCircleReport(circleId)).rejects.toThrow(
      "You are not a shepherd of this circle"
    );
  });

  it("throws when the circle does not exist", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue({ id: "s1" }).enqueue(null, { message: "not found" });
    await expect(generateCircleReport(circleId)).rejects.toThrow("Circle not found");
  });

  it("generates a report from an existing insight", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue({ id: "s1" }) // shepherd check
      .enqueue({ name: "Test Circle", location: "Sydney" }) // circle
      .enqueue(insight) // existing insight
      .enqueue({ id: "report-1", generated_at: "2026-01-01T00:00:00Z" }); // report insert

    const report = await generateCircleReport(circleId, "all_time");

    expect(report.id).toBe("report-1");
    expect(report.circleName).toBe("Test Circle");
    expect(report.circleLocation).toBe("Sydney");
    expect(report.content.responseCount).toBe(12);
    expect(report.content.meetingCount).toBe(3);
    expect(report.content.timeWindow).toBe("all_time");
    expect(report.content.topThemes).toHaveLength(1);
    expect(report.content.sentimentSummary.dominant).toBe("positive");
    expect(report.content.consensusItems).toHaveLength(1);
    expect(report.content.anonymisedQuotes).toEqual(["Anon quote"]);
    expect(report.content.rawSummary).toBe("The circle cares deeply about safety.");
    expect(mockSupa.tables).toEqual(["circle_shepherds", "circles", "circle_insights", "reports"]);
  });

  it.each(["last_30_days", "last_90_days", "all_time"] as const)(
    "passes the %s time window through to the report",
    async (window) => {
      mockSupa.asUser(user);
      mockSupa
        .enqueue({ id: "s1" })
        .enqueue({ name: "C", location: null })
        .enqueue(insight)
        .enqueue({ id: "r", generated_at: "2026-01-01T00:00:00Z" });
      const report = await generateCircleReport(circleId, window);
      expect(report.content.timeWindow).toBe(window);
      expect(report.circleLocation).toBe("Unknown location");
    }
  );

  it("defaults missing insight fields to empty/zero values", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue({ id: "s1" })
      .enqueue({ name: "C", location: "L" })
      .enqueue({}) // bare insight row
      .enqueue({ id: "r", generated_at: "2026-01-01T00:00:00Z" });

    const report = await generateCircleReport(circleId);
    expect(report.content.responseCount).toBe(0);
    expect(report.content.meetingCount).toBe(0);
    expect(report.content.topThemes).toEqual([]);
    expect(report.content.sentimentSummary).toEqual({
      positive: 0,
      neutral: 0,
      negative: 0,
      dominant: "neutral",
    });
    expect(report.content.consensusItems).toEqual([]);
    expect(report.content.anonymisedQuotes).toEqual([]);
    expect(report.content.rawSummary).toBe("");
  });

  it("throws when no insight exists and synthesis is not configured", async () => {
    delete process.env.SUPABASE_SECRET_KEY;
    mockSupa.asUser(user);
    mockSupa
      .enqueue({ id: "s1" })
      .enqueue({ name: "C", location: "L" })
      .enqueue(null, { message: "no rows" }); // no insight
    await expect(generateCircleReport(circleId)).rejects.toThrow(
      "No insights available for this circle yet"
    );
  });

  it("triggers synthesis when an insight is missing and config is present", async () => {
    process.env.SUPABASE_SECRET_KEY = "service-key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    mockSupa.asUser(user);
    mockSupa
      .enqueue({ id: "s1" })
      .enqueue({ name: "C", location: "L" })
      .enqueue(null, { message: "no rows" }) // insight missing
      .enqueue(insight) // refetch after synthesis
      .enqueue({ id: "r", generated_at: "2026-01-01T00:00:00Z" });

    const report = await generateCircleReport(circleId);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://placeholder.supabase.co/functions/v1/synthesize-circle",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer service-key",
        }),
      })
    );
    expect(report.content.responseCount).toBe(12);
  });

  it("still throws when synthesis ran but no insight appeared", async () => {
    process.env.SUPABASE_SECRET_KEY = "service-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    mockSupa.asUser(user);
    mockSupa
      .enqueue({ id: "s1" })
      .enqueue({ name: "C", location: "L" })
      .enqueue(null, { message: "no rows" })
      .enqueue(null, { message: "still nothing" });
    await expect(generateCircleReport(circleId)).rejects.toThrow(
      "No insights available for this circle yet"
    );
  });

  it("throws when the report insert fails", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue({ id: "s1" })
      .enqueue({ name: "C", location: "L" })
      .enqueue(insight)
      .enqueue(null, { message: "insert failed" });
    await expect(generateCircleReport(circleId)).rejects.toThrow("Failed to save report");
  });
});
