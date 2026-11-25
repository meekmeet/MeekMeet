import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ auditEvent: vi.fn() }));
vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

import { createClient } from "@/lib/supabase/server";
import { createSequence, stopSequence, getSequences, getMarketingStats } from "./actions";

const mockSupa = new MockSupabaseClient();
const admin = makeAuthUser();

function asAdmin() {
  mockSupa.asUser(admin);
  mockSupa.enqueue({ id: admin.id, role: "admin" });
}

function personSequenceRow(email: string) {
  return {
    id: "seq-1",
    kind: "person",
    recipient_email: email,
    recipient_name: "Sam",
    org_name: null,
    contact_name: null,
    template_key: "invite_vision",
    current_step: 0,
    faith: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockReset().mockResolvedValue({ id: "email-1" });
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  mockSupa.rpc.mockReset();
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
});

describe("createSequence", () => {
  it("validates the email before any work", async () => {
    await expect(
      createSequence({ kind: "person", recipientEmail: "nope" })
    ).rejects.toThrow("Invalid email address");
  });

  it("requires an org name for organisation sequences", async () => {
    await expect(
      createSequence({ kind: "org", recipientEmail: "a@b.co", orgName: "" })
    ).rejects.toThrow("Organisation is required");
  });

  it("throws for non-admins", async () => {
    mockSupa.asUser(admin);
    mockSupa.enqueue({ id: admin.id, role: "member" });
    await expect(
      createSequence({ kind: "person", recipientEmail: "a@b.co" })
    ).rejects.toThrow("Not authorized");
  });

  it("cancels any existing active ladder, upserts, and fires day 0 immediately", async () => {
    asAdmin();
    mockSupa.enqueue(null); // cancel-existing update
    mockSupa.enqueue(personSequenceRow("sam@example.com")); // upsert select
    mockSupa.enqueue({ id: "send-1" }); // day-0 send log insert
    mockSupa.enqueue(null); // send status update
    mockSupa.enqueue(null); // sequence advance
    await expect(
      createSequence({ kind: "person", recipientEmail: "sam@example.com", recipientName: "Sam" })
    ).resolves.toEqual({ success: true });
    expect(mockSupa.tables).toEqual([
      "profiles",
      "marketing_sequences",
      "marketing_sequences",
      "marketing_sends",
      "marketing_sends",
      "marketing_sequences",
    ]);
    // Day 0 went out NOW in parchment — the cron only handles days 7/14.
    expect(sendMock).toHaveBeenCalledTimes(1);
    const sent = sendMock.mock.calls[0][0];
    expect(sent.to).toBe("sam@example.com");
    expect(sent.html).toContain("t=parchment");
    expect(sent.html).toContain("s=send-1");
  });

  it("creates org sequences against the org template and sends the flyer", async () => {
    asAdmin();
    mockSupa.enqueue(null);
    mockSupa.enqueue({
      id: "seq-2",
      kind: "org",
      recipient_email: "o@x.example",
      recipient_name: null,
      org_name: "Church",
      contact_name: null,
      template_key: "org_partnership",
      current_step: 0,
      faith: null,
    });
    mockSupa.enqueue({ id: "send-2" });
    mockSupa.enqueue(null);
    mockSupa.enqueue(null);
    await expect(
      createSequence({ kind: "org", recipientEmail: "o@x.example", orgName: "Church" })
    ).resolves.toEqual({ success: true });
    const sent = sendMock.mock.calls[0][0];
    expect(sent.subject).toContain("proposal");
    expect(sent.attachments.map((a: { filename: string }) => a.filename)).toContain(
      "meek-meet-flyer.svg"
    );
  });

  it("carries the faith tradition into the sequence row and the letter", async () => {
    asAdmin();
    mockSupa.enqueue(null);
    mockSupa.enqueue({
      id: "seq-3",
      kind: "org",
      recipient_email: "imam@mosque.example",
      recipient_name: null,
      org_name: "Coast Mosque",
      contact_name: null,
      template_key: "org_partnership",
      current_step: 0,
      faith: "islamic",
    });
    mockSupa.enqueue({ id: "send-3" });
    mockSupa.enqueue(null);
    mockSupa.enqueue(null);
    await expect(
      createSequence({
        kind: "org",
        recipientEmail: "imam@mosque.example",
        orgName: "Coast Mosque",
        faith: "islamic",
      })
    ).resolves.toEqual({ success: true });
    const sent = sendMock.mock.calls[0][0];
    expect(sent.html).toContain("Qur'an 49:13");
    // The spark is never hidden: the islamic pitch names Isa's saying openly.
    expect(sent.html.split("<!-- Footer -->")[0]).toContain("the meek shall inherit the earth");
  });
});

describe("stopSequence", () => {
  it("rejects invalid ids", async () => {
    await expect(stopSequence("bad")).rejects.toThrow("Invalid sequence ID");
  });

  it("stops an active sequence for admins", async () => {
    asAdmin();
    mockSupa.enqueue(null);
    await expect(stopSequence("11111111-1111-1111-1111-111111111111")).resolves.toBeUndefined();
  });
});

describe("getSequences", () => {
  it("returns sequences newest-first", async () => {
    asAdmin();
    mockSupa.enqueue([{ id: "s1" }, { id: "s2" }]);
    const seqs = await getSequences();
    expect(seqs).toHaveLength(2);
    expect(mockSupa.tables[1]).toBe("marketing_sequences");
  });

  it("throws for non-admins", async () => {
    mockSupa.asUser(admin);
    mockSupa.enqueue({ id: admin.id, role: "member" });
    await expect(getSequences()).rejects.toThrow("Not authorized");
  });
});

describe("getMarketingStats", () => {
  it("computes per-theme and per-template click rates", async () => {
    asAdmin();
    // role check
    // then two parallel selects: sends and clicks
    mockSupa
      .enqueue([
        { theme: "parchment", template_key: "invite_vision", status: "sent" },
        { theme: "parchment", template_key: "invite_vision", status: "sent" },
        { theme: "midnight", template_key: "invite_circle", status: "sent" },
        { theme: "midnight", template_key: "invite_circle", status: "failed" },
      ])
      .enqueue([
        { theme: "parchment", template_key: "invite_vision" },
        { theme: "parchment", template_key: "invite_vision" },
      ]);

    const stats = await getMarketingStats();
    const parchment = stats.perTheme.find((t) => t.theme === "parchment")!;
    const midnight = stats.perTheme.find((t) => t.theme === "midnight")!;
    expect(parchment).toMatchObject({ sends: 2, clicks: 2 });
    expect(midnight).toMatchObject({ sends: 1, clicks: 0 }); // failed send excluded
    const vision = stats.perTemplate.find((t) => t.template === "invite_vision")!;
    expect(vision).toMatchObject({ sends: 2, clicks: 2 });
  });
});
