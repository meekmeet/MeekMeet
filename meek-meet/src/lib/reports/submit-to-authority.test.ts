import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

import { createClient } from "@/lib/supabase/server";
import { submitReportToAuthority } from "./submit-to-authority";

const mockSupa = new MockSupabaseClient();
const user = makeAuthUser();
const reportId = "33333333-3333-3333-3333-333333333333";
const authorityId = "44444444-4444-4444-4444-444444444444";

const report = {
  id: reportId,
  circle_id: "22222222-2222-2222-2222-222222222222",
  summary: "A summary",
  content: {
    responseCount: 10,
    meetingCount: 2,
    timeWindow: "all_time",
    topThemes: [{ theme: "Parks", count: 5, sentiment: "positive", sampleQuotes: [] }],
    sentimentSummary: { positive: 8, neutral: 1, negative: 1, dominant: "positive" },
    consensusItems: [{ statement: "Build more parks", agreementLevel: 75, evidence: "" }],
    anonymisedQuotes: [],
    rawSummary: "People want parks.",
  },
  circles: { name: "Test <Circle>", location: "Sydney & surrounds", lga_code: "sydney", state_code: null },
};

const authority = {
  id: authorityId,
  name: "City of Sydney",
  contact_email: "council@cityofsydney.nsw.gov.au",
};

function emailSendMock() {
  return sendMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockReset().mockResolvedValue({ id: "email-1" });
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
});

describe("submitReportToAuthority", () => {
  it("throws when not authenticated", async () => {
    mockSupa.asUser(null);
    await expect(submitReportToAuthority(reportId)).rejects.toThrow("Not authenticated");
  });

  it("throws when the report does not exist", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue(null, { message: "not found" });
    await expect(submitReportToAuthority(reportId)).rejects.toThrow("Report not found");
  });

  it("rejects non-admin, non-shepherd users", async () => {
    mockSupa.asUser(user);
    // report fetch → profiles role → shepherd lookup
    mockSupa.enqueue(report).enqueue({ role: "member" }).enqueue(null);
    await expect(submitReportToAuthority(reportId)).rejects.toThrow("Not authorized");
  });

  it("rejects non-admins for reports without a circle", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue({ ...report, circle_id: null })
      .enqueue({ role: "member" });
    await expect(submitReportToAuthority(reportId)).rejects.toThrow("Not authorized");
  });

  it("allows admins to submit any circle report", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue(report) // report
      .enqueue({ role: "admin" }) // role (short-circuits shepherd check)
      .enqueue(authority) // authority fetch
      .enqueue(null) // submission insert
      .enqueue(null); // report update
    const result = await submitReportToAuthority(reportId, authorityId);
    expect(result).toEqual({ success: true, authority: "City of Sydney" });
    expect(emailSendMock()).toHaveBeenCalledTimes(1);
  });

  it("allows shepherds of the circle", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue(report)
      .enqueue({ role: "shepherd" })
      .enqueue({ id: "shep-1" })
      .enqueue(authority)
      .enqueue(null)
      .enqueue(null);
    await expect(submitReportToAuthority(reportId, authorityId)).resolves.toBeDefined();
  });

  it("matches authorities by circle region when no id is given", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue(report)
      .enqueue({ role: "admin" })
      .enqueue(authority) // region match on lga
      .enqueue(null)
      .enqueue(null);
    await submitReportToAuthority(reportId);
    expect(mockSupa.tables[2]).toBe("authorities");
  });

  it("uses state-level fallback when no lga code exists", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue({ ...report, circles: { name: "C", location: "L", lga_code: null, state_code: "nsw" } })
      .enqueue({ role: "admin" })
      .enqueue(authority)
      .enqueue(null)
      .enqueue(null);
    await submitReportToAuthority(reportId);
    expect(mockSupa.tables[2]).toBe("authorities");
  });

  it("throws when no authority matches the region", async () => {
    mockSupa.asUser(user);
    mockSupa.enqueue(report).enqueue({ role: "admin" }).enqueue(null, { message: "none" });
    await expect(submitReportToAuthority(reportId)).rejects.toThrow(
      "No matching authority with email found"
    );
  });

  it("throws when the matched authority has no contact email", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue(report)
      .enqueue({ role: "admin" })
      .enqueue({ id: authorityId, name: "Council", contact_email: null });
    await expect(submitReportToAuthority(reportId)).rejects.toThrow(
      "No matching authority with email found"
    );
  });

  it("escapes HTML in the outgoing email", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue(report)
      .enqueue({ role: "admin" })
      .enqueue(authority)
      .enqueue(null)
      .enqueue(null);
    await submitReportToAuthority(reportId, authorityId);
    const sent = emailSendMock().mock.calls[0][0];
    expect(sent.to).toBe("council@cityofsydney.nsw.gov.au");
    expect(sent.subject).toContain("Sydney & surrounds");
    expect(sent.subject).toMatch(/ref MM-\d{8}-/);
    expect(sent.html).toContain("Test &lt;Circle&gt;");
    expect(sent.html).toContain("Sydney &amp; surrounds");
    expect(sent.html).not.toContain("<Circle>");
  });

  it("sends an enterprise-grade letter with reference, method, and a clear ask", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue(report)
      .enqueue({ role: "admin" })
      .enqueue(authority)
      .enqueue(null)
      .enqueue(null);
    await submitReportToAuthority(reportId, authorityId);
    const sent = emailSendMock().mock.calls[0][0];
    expect(sent.html).toContain("Reference MM-");
    expect(sent.html).toContain("Method and data integrity");
    expect(sent.html).toContain("What we ask");
    expect(sent.html).toContain("96 557 008 393");
    expect(sent.html).not.toContain("—");
  });

  it("throws when the email send fails", async () => {
    mockSupa.asUser(user);
    sendMock.mockRejectedValueOnce(new Error("smtp down"));
    mockSupa.enqueue(report).enqueue({ role: "admin" }).enqueue(authority);
    await expect(submitReportToAuthority(reportId, authorityId)).rejects.toThrow(
      "Failed to send report email"
    );
  });

  it("records the submission and marks the report submitted", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue(report)
      .enqueue({ role: "admin" })
      .enqueue(authority)
      .enqueue(null)
      .enqueue(null);
    await submitReportToAuthority(reportId, authorityId);
    expect(mockSupa.tables).toEqual([
      "reports",
      "profiles",
      "authorities",
      "authority_submissions",
      "reports",
    ]);
  });

  it("throws when the submission insert fails", async () => {
    mockSupa.asUser(user);
    mockSupa
      .enqueue(report)
      .enqueue({ role: "admin" })
      .enqueue(authority)
      .enqueue(null, { message: "fk violation" });
    await expect(submitReportToAuthority(reportId, authorityId)).rejects.toThrow("fk violation");
  });
});
