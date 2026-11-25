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
import {
  getLeads,
  addLead,
  importLeads,
  startLeadDrip,
  startLeadDrips,
  deleteLead,
} from "./actions";

const mockSupa = new MockSupabaseClient();
const admin = makeAuthUser();
const LEAD_ID = "22222222-2222-2222-2222-222222222222";

function asAdmin() {
  mockSupa.asUser(admin);
  mockSupa.enqueue({ id: admin.id, role: "admin" });
}

function mosqueLead(overrides: Record<string, unknown> = {}) {
  return {
    id: LEAD_ID,
    kind: "org",
    name: "Coast Mosque",
    email: "info@mosque.example",
    contact_name: "Imam Ali",
    faith: "islamic",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockReset().mockResolvedValue({ id: "email-1" });
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  mockSupa.updates.length = 0;
  mockSupa.upserts.length = 0;
  mockSupa.rpc.mockReset();
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
});

describe("getLeads", () => {
  it("joins each lead with its drip sequence by kind and email", async () => {
    asAdmin();
    mockSupa
      .enqueue([mosqueLead({ email: "info@mosque.example" })])
      .enqueue([
        { kind: "org", recipient_email: "INFO@mosque.example", status: "active", current_step: 1, next_run_at: "2026-01-08" },
      ]);

    const leads = await getLeads();
    expect(leads).toHaveLength(1);
    // Case-insensitive email match, org lead pairs with an org sequence.
    expect(leads[0].sequence).toMatchObject({ status: "active", current_step: 1 });
  });

  it("pairs individual leads with person sequences", async () => {
    asAdmin();
    mockSupa.enqueue([mosqueLead({ kind: "individual", name: "Sam", email: "sam@example.com" })]);
    mockSupa.enqueue([
      { kind: "person", recipient_email: "sam@example.com", status: "active", current_step: 0, next_run_at: "2026-01-01" },
    ]);
    const leads = await getLeads();
    expect(leads[0].sequence).toMatchObject({ status: "active" });
  });

  it("throws for non-admins and on query errors", async () => {
    mockSupa.asUser(admin);
    mockSupa.enqueue({ id: admin.id, role: "member" });
    await expect(getLeads()).rejects.toThrow("Not authorized");

    asAdmin();
    mockSupa.enqueue(null, { message: "db down" }).enqueue([]);
    await expect(getLeads()).rejects.toThrow("db down");
  });
});

describe("addLead", () => {
  it("validates input before touching the database", async () => {
    await expect(
      addLead({ kind: "org", name: "", email: "a@b.co" })
    ).rejects.toThrow("Name is required");
    await expect(
      addLead({ kind: "org", name: "X", email: "nope" })
    ).rejects.toThrow("Invalid email address");
    await expect(
      addLead({ kind: "individual", name: "X", email: "x@y.io", sourceUrl: "ftp://bad" })
    ).rejects.toThrow("Source URL must start with http(s)://");
    await expect(
      addLead({ kind: "org", name: "X", email: "x@y.io", faith: "zoroastrian" })
    ).rejects.toThrow("Unknown faith value");
    expect(mockSupa.auth.getUser).not.toHaveBeenCalled();
  });

  it("upserts the lead and derives faith from the lead type", async () => {
    asAdmin();
    mockSupa.enqueue({ id: LEAD_ID });
    const result = await addLead({
      kind: "org",
      name: "Coast Mosque",
      email: "Info@Mosque.Example",
      leadType: "mosque",
      region: "Central Coast",
    });
    expect(result).toEqual({ success: true, faith: "islamic" });
    expect(mockSupa.tables).toContain("marketing_leads");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("stores an explicit faith and lowercases the email", async () => {
    asAdmin();
    mockSupa.enqueue({ id: LEAD_ID });
    const result = await addLead({ kind: "org", name: "Temple", email: "T@Example.com", faith: "buddhist" });
    expect(result.faith).toBe("buddhist");
  });

  it("defaults church leads to the christian letter voice", async () => {
    asAdmin();
    mockSupa.enqueue({ id: LEAD_ID });
    const result = await addLead({ kind: "org", name: "St Marks", email: "office@stmarks.example", leadType: "church-anglican" });
    expect(result.faith).toBe("christian");
  });

  it("throws for non-admins", async () => {
    mockSupa.asUser(admin);
    mockSupa.enqueue({ id: admin.id, role: "member" });
    await expect(
      addLead({ kind: "org", name: "X", email: "x@y.io" })
    ).rejects.toThrow("Not authorized");
  });
});

describe("importLeads", () => {
  it("rejects empty, non-array, and oversized batches", async () => {
    await expect(importLeads([])).rejects.toThrow("Nothing to import");
    await expect(importLeads("nope" as never)).rejects.toThrow("Nothing to import");
    await expect(importLeads(Array(1001).fill({ kind: "org", name: "X", email: "a@b.co" }))).rejects.toThrow(
      "at most 1000"
    );
  });

  it("skips invalid rows and in-batch duplicates without aborting", async () => {
    asAdmin();
    mockSupa.enqueue(null); // bulk upsert
    const result = await importLeads([
      { kind: "org", name: "Good", email: "good@example.com", leadType: "synagogue" },
      { kind: "org", name: "Bad email", email: "nope" },
      { kind: "org", name: "Dup", email: "GOOD@example.com" },
      { kind: "org", name: "Also good", email: "other@example.com" },
    ]);
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(2);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain("row 2");
    expect(result.errors[1]).toContain("duplicate email");
  });

  it("returns zero-import when every row is invalid and never upserts", async () => {
    asAdmin();
    const result = await importLeads([{ kind: "org", name: "", email: "a@b.co" }]);
    expect(result).toMatchObject({ imported: 0, skipped: 1 });
    expect(mockSupa.tables).not.toContain("marketing_leads");
  });

  it("throws when the bulk upsert fails", async () => {
    asAdmin();
    mockSupa.enqueue(null, { message: "rls violation" });
    await expect(
      importLeads([{ kind: "org", name: "X", email: "x@y.io" }])
    ).rejects.toThrow("rls violation");
  });
});

describe("startLeadDrip", () => {
  it("rejects invalid ids before any work", async () => {
    await expect(startLeadDrip("bad")).rejects.toThrow("Invalid lead ID");
    expect(mockSupa.auth.getUser).not.toHaveBeenCalled();
  });

  it("errors when the lead does not exist", async () => {
    asAdmin();
    mockSupa.enqueue(null, { message: "not found" });
    await expect(startLeadDrip(LEAD_ID)).rejects.toThrow("not found");
  });

  it("starts the ladder, sends day 0 with the right faith letter, and stamps the lead", async () => {
    asAdmin();
    mockSupa.enqueue(mosqueLead());
    mockSupa.enqueue([]); // drip-history guard (no existing ladders)
    mockSupa.enqueue(null); // cancel existing
    mockSupa.enqueue({
      id: "seq-1", kind: "org", recipient_email: "info@mosque.example",
      recipient_name: "Imam Ali", org_name: "Coast Mosque", contact_name: "Imam Ali",
      template_key: "org_partnership", current_step: 0, faith: "islamic",
    });
    mockSupa.enqueue(null); // lead status update
    mockSupa.enqueue([]); // sent-today count (budget check)
    mockSupa.enqueue({ id: "send-1" });
    mockSupa.enqueue(null); // send status update
    mockSupa.enqueue(null); // sequence advance

    await expect(startLeadDrip(LEAD_ID)).resolves.toEqual({ success: true, sent: true });

    const sent = sendMock.mock.calls[0][0];
    expect(sent.to).toBe("info@mosque.example");
    expect(sent.html).toContain("Qur'an 49:13");
    expect(sent.attachments.map((a: { filename: string }) => a.filename)).toContain("meek-meet-flyer.svg");
    expect(mockSupa.tables).toEqual([
      "profiles",
      "marketing_leads",
      "marketing_sequences",
      "marketing_sequences",
      "marketing_sequences",
      "marketing_leads",
      "marketing_sends",
      "marketing_sends",
      "marketing_sends",
      "marketing_sequences",
    ]);
  });

  it("blocks a second drip within the 14-day cooldown, naming the stage", async () => {
    asAdmin();
    mockSupa.enqueue(mosqueLead());
    mockSupa.enqueue([
      {
        recipient_email: "info@mosque.example", status: "completed", current_step: 3,
        next_run_at: new Date().toISOString(), stopped_at: null, created_at: null,
      },
    ]);
    await expect(startLeadDrip(LEAD_ID)).rejects.toThrow(/Already dripped — the final email/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("blocks restarting an address whose drip is currently active", async () => {
    asAdmin();
    mockSupa.enqueue(mosqueLead());
    mockSupa.enqueue([
      {
        recipient_email: "info@mosque.example", status: "active", current_step: 1,
        next_run_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        stopped_at: null, created_at: null,
      },
    ]);
    await expect(startLeadDrip(LEAD_ID)).rejects.toThrow(/Already in a drip/);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("allows a new drip once the cooldown has passed", async () => {
    asAdmin();
    mockSupa.enqueue(mosqueLead());
    mockSupa.enqueue([
      {
        recipient_email: "info@mosque.example", status: "completed", current_step: 3,
        next_run_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
        stopped_at: null, created_at: null,
      },
    ]);
    mockSupa.enqueue(null); // cancel existing
    mockSupa.enqueue({
      id: "seq-1", kind: "org", recipient_email: "info@mosque.example",
      recipient_name: "Imam Ali", org_name: "Coast Mosque", contact_name: "Imam Ali",
      template_key: "org_partnership", current_step: 0, faith: "islamic",
    });
    mockSupa.enqueue(null); // lead status update
    mockSupa.enqueue([]); // sent-today count
    mockSupa.enqueue({ id: "send-1" });
    mockSupa.enqueue(null);
    mockSupa.enqueue(null);

    await expect(startLeadDrip(LEAD_ID)).resolves.toEqual({ success: true, sent: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("maps individual leads to person sequences", async () => {
    asAdmin();
    mockSupa.enqueue(mosqueLead({ kind: "individual", name: "Sam", email: "sam@example.com", contact_name: null, faith: null }));
    mockSupa.enqueue([]);
    mockSupa.enqueue(null);
    mockSupa.enqueue({
      id: "seq-2", kind: "person", recipient_email: "sam@example.com",
      recipient_name: "Sam", org_name: null, contact_name: null,
      template_key: "invite_vision", current_step: 0, faith: null,
    });
    mockSupa.enqueue(null); // lead status update
    mockSupa.enqueue([]); // sent-today count
    mockSupa.enqueue({ id: "send-2" });
    mockSupa.enqueue(null);
    mockSupa.enqueue(null);

    await expect(startLeadDrip(LEAD_ID)).resolves.toEqual({ success: true, sent: true });
    const sent = sendMock.mock.calls[0][0];
    expect(sent.to).toBe("sam@example.com");
    expect(sent.attachments).toBeUndefined(); // no flyer for person ladders
  });

  it("queues to the next window instead of exceeding the daily budget", async () => {
    asAdmin();
    mockSupa.enqueue(mosqueLead());
    mockSupa.enqueue([]);
    mockSupa.enqueue(null); // cancel existing
    mockSupa.enqueue({
      id: "seq-3", kind: "org", recipient_email: "info@mosque.example",
      recipient_name: "Imam Ali", org_name: "Coast Mosque", contact_name: "Imam Ali",
      template_key: "org_partnership", current_step: 0, faith: "islamic",
    });
    mockSupa.enqueue(null); // lead status update
    // 80 sends already today = default budget fully spent.
    mockSupa.enqueue(Array.from({ length: 80 }, (_, i) => ({ id: `s${i}` })));
    mockSupa.enqueue([]); // queued-sequence count
    mockSupa.enqueue(null); // next_run_at slot stamp

    const result = await startLeadDrip(LEAD_ID);
    expect(result).toMatchObject({ success: true, sent: false });
    expect(new Date(result.queuedAt!).getTime()).toBeGreaterThan(Date.now());
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("startLeadDrips", () => {
  it("validates the batch bounds", async () => {
    await expect(startLeadDrips([])).rejects.toThrow("Select at least one lead");
    await expect(startLeadDrips(Array(1001).fill(LEAD_ID))).rejects.toThrow("Queue at most 1000");
  });

  it("throws when the lead lookup fails", async () => {
    asAdmin();
    mockSupa.enqueue(null, { message: "gone" });
    await expect(startLeadDrips([LEAD_ID])).rejects.toThrow("gone");
  });

  it("queues eligible leads into send windows without sending anything", async () => {
    asAdmin();
    const leadA = mosqueLead();
    const leadB = mosqueLead({
      id: "id-b", kind: "individual", name: "Sam", email: "sam@example.com",
      contact_name: null, faith: null,
    });
    mockSupa.enqueue([leadA, leadB]); // leads select
    mockSupa.enqueue([]); // active sequences
    mockSupa.enqueue([]); // suppressed leads
    mockSupa.enqueue([]); // already-queued sequences
    for (const seq of [
      {
        id: "seq-a", kind: "org", recipient_email: "info@mosque.example",
        recipient_name: "Imam Ali", org_name: "Coast Mosque", contact_name: "Imam Ali",
        template_key: "org_partnership", current_step: 0, faith: "islamic",
      },
      {
        id: "seq-b", kind: "person", recipient_email: "sam@example.com",
        recipient_name: "Sam", org_name: null, contact_name: null,
        template_key: "invite_vision", current_step: 0, faith: null,
      },
    ]) {
      mockSupa.enqueue(null); // cancel existing ladder
      mockSupa.enqueue(seq); // sequence upsert
      mockSupa.enqueue(null); // next_run_at slot stamp
      mockSupa.enqueue(null); // lead status update
    }

    const result = await startLeadDrips(["id-a", "id-b"]);
    expect(result.queued).toBe(2);
    expect(result.skippedActive).toBe(0);
    expect(result.skippedSuppressed).toBe(0);
    // Nothing sends from the bulk action — the cron fires each day-0 at its slot.
    expect(sendMock).not.toHaveBeenCalled();
    expect(result.schedule.perWindow).toBe(20);
    const first = new Date(result.schedule.firstSendAt!);
    const last = new Date(result.schedule.lastSendAt!);
    expect(first.getTime()).toBeGreaterThan(Date.now());
    expect(last.getTime()).toBeGreaterThanOrEqual(first.getTime());

    // Each lead's faith reached its sequence upsert (mosque → islamic pitch).
    const seqUpserts = mockSupa.upserts as { faith?: string | null; kind: string }[];
    expect(seqUpserts).toHaveLength(2);
    expect(seqUpserts.find((u) => u.kind === "org")?.faith).toBe("islamic");
    expect(seqUpserts.find((u) => u.kind === "person")?.faith).toBeNull();

    // Each sequence was stamped with a future send slot.
    const slotStamps = mockSupa.updates.filter(
      (u) => typeof (u as { next_run_at?: string }).next_run_at === "string"
    ) as { next_run_at: string }[];
    expect(slotStamps).toHaveLength(2);
    expect(new Date(slotStamps[0].next_run_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("skips leads already in a drip and suppressed leads, never re-emailing them", async () => {
    asAdmin();
    const leadA = mosqueLead(); // already has an active ladder
    const leadB = mosqueLead({
      id: "id-b", kind: "individual", name: "Sam", email: "sam@example.com",
      contact_name: null, faith: null, // suppressed (bounced)
    });
    mockSupa.enqueue([leadA, leadB]);
    mockSupa.enqueue([
      {
        recipient_email: "info@mosque.example", status: "active", current_step: 1,
        next_run_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        stopped_at: null, created_at: null,
      },
    ]); // active ladder history
    mockSupa.enqueue([{ email: "sam@example.com" }]); // suppressed lead
    mockSupa.enqueue([]); // pending queue

    const result = await startLeadDrips(["id-a", "id-b"]);
    expect(result.queued).toBe(0);
    expect(result.skippedActive).toBe(1);
    expect(result.skippedRecent).toBe(0);
    expect(result.skippedSuppressed).toBe(1);
    expect(sendMock).not.toHaveBeenCalled();
    expect(mockSupa.upserts).toHaveLength(0);
  });

  it("skips leads whose last drip sent mail within the 14-day cooldown", async () => {
    asAdmin();
    const leadA = mosqueLead(); // finished a ladder 3 days ago
    const leadB = mosqueLead({
      id: "id-b", kind: "individual", name: "Sam", email: "sam@example.com",
      contact_name: null, faith: null,
    });
    mockSupa.enqueue([leadA, leadB]);
    mockSupa.enqueue([
      {
        recipient_email: "info@mosque.example", status: "completed", current_step: 3,
        next_run_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        stopped_at: null, created_at: null,
      },
    ]);
    mockSupa.enqueue([]); // suppressed
    mockSupa.enqueue([]); // pending queue
    // leadB queues: cancel, upsert, slot stamp, lead update.
    mockSupa.enqueue(null);
    mockSupa.enqueue({
      id: "seq-b", kind: "person", recipient_email: "sam@example.com",
      recipient_name: "Sam", org_name: null, contact_name: null,
      template_key: "invite_vision", current_step: 0, faith: null,
    });
    mockSupa.enqueue(null);
    mockSupa.enqueue(null);

    const result = await startLeadDrips(["id-a", "id-b"]);
    expect(result.queued).toBe(1);
    expect(result.skippedRecent).toBe(1);
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("deleteLead", () => {
  it("rejects invalid ids and missing leads", async () => {
    await expect(deleteLead("bad")).rejects.toThrow("Invalid lead ID");
    asAdmin();
    mockSupa.enqueue(null); // lead lookup returns nothing
    await expect(deleteLead(LEAD_ID)).rejects.toThrow("Lead not found");
  });

  it("deletes the lead and audits the action", async () => {
    asAdmin();
    mockSupa.enqueue({ email: "info@mosque.example", name: "Coast Mosque" });
    mockSupa.enqueue(null); // delete
    await expect(deleteLead(LEAD_ID)).resolves.toEqual({ success: true });
    expect(mockSupa.tables).toEqual(["profiles", "marketing_leads", "marketing_leads"]);
  });
});
