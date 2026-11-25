import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(() => ({ emails: { send: sendMock } })),
}));
vi.mock("@/lib/monitor", () => ({ captureMonitoringMessage: vi.fn() }));

import { createServiceClient } from "@/lib/supabase/service";
import { GET } from "./route";

const mockSupa = new (class {
  results: { data: unknown; error: unknown }[] = [];
  tables: string[] = [];
  enqueue(data: unknown, error: unknown = null) {
    this.results.push({ data, error });
    return this;
  }
  from = vi.fn((table: string) => {
    this.tables.push(table);

    const thenable: {
      select: () => unknown;
      insert: (row: Record<string, unknown>) => { select: () => { single: () => Promise<unknown> } };
      eq: () => unknown;
      lte: () => unknown;
      gte: () => unknown;
      in: () => unknown;
      order: () => unknown;
      limit: () => unknown;
      single: () => Promise<unknown>;
      then: (onF: (v: unknown) => unknown) => Promise<unknown>;
    } = {
      select: () => thenable,
      insert: () => ({ select: () => ({ single: () => this.next() }) }),
      update: () => ({ eq: () => this.next(), in: () => this.next() }),
      eq: () => thenable,
      lte: () => thenable,
      gte: () => thenable,
      in: () => thenable,
      order: () => thenable,
      limit: () => thenable,
      single: () => this.next(),
      then: (onF) => this.next().then(onF),
    };
    return thenable;
  });
  next() {
    return Promise.resolve(this.results.shift() ?? { data: null, error: null });
  }
})();

let ipSeq = 0;
function cronRequest(secret?: string, ip?: string): NextRequest {
  const headers: Record<string, string> = {
    "x-forwarded-for": ip ?? `10.8.${++ipSeq}.1`,
  };
  if (secret) headers.authorization = `Bearer ${secret}`;
  return new NextRequest("http://localhost/api/marketing-drip", { headers });
}

const DUE_SEQ = {
  id: "seq-1",
  kind: "person",
  recipient_email: "sam@example.com",
  recipient_name: "Sam",
  org_name: null,
  contact_name: null,
  template_key: "invite_vision",
  current_step: 0,
  next_run_at: "2020-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockReset().mockResolvedValue({ id: "email-1" });
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  vi.mocked(createServiceClient).mockReturnValue(mockSupa as never);
});

describe("GET /api/marketing-drip", () => {
  it("returns 401 without the cron secret", async () => {
    const res = await GET(cronRequest());
    expect(res.status).toBe(401);
  });

  it("runs every due sequence step and reports progress", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue([]); // sent-today count
    mockSupa.enqueue([DUE_SEQ]); // due select
    mockSupa.enqueue([]); // suppression check
    // Step send: log insert → log update → sequence update.
    mockSupa.enqueue({ id: "send-1" });
    mockSupa.enqueue(null);
    mockSupa.enqueue(null);

    const res = await GET(cronRequest("cron"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.due).toBe(1);
    expect(body.sent).toBe(1);
    expect(body.completed).toBe(0);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(mockSupa.tables[0]).toBe("marketing_sends");
    expect(mockSupa.tables[1]).toBe("marketing_sequences");
  });

  it("completes sequences on their third step", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue([]);
    mockSupa.enqueue([{ ...DUE_SEQ, current_step: 2 }]);
    mockSupa.enqueue([]);
    mockSupa.enqueue({ id: "send-2" });
    mockSupa.enqueue(null);
    mockSupa.enqueue(null);

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.completed).toBe(1);
  });

  it("collects per-sequence failures without aborting the run", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue([]);
    mockSupa.enqueue([DUE_SEQ, { ...DUE_SEQ, id: "seq-2", recipient_email: "jo@example.com" }]);
    mockSupa.enqueue([]);
    // seq-1 succeeds; seq-2's log insert returns nothing → error.
    mockSupa.enqueue({ id: "send-1" });
    mockSupa.enqueue(null);
    mockSupa.enqueue(null);

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain("jo@example.com");
  });

  it("returns 500 when the due query fails", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue([]);
    mockSupa.enqueue(null, { message: "db error" });
    const res = await GET(cronRequest("cron"));
    expect(res.status).toBe(500);
  });

  it("sends nothing once the daily budget is spent", async () => {
    process.env.CRON_SECRET = "cron";
    // Default budget is 80 — 80 sends already went out today.
    mockSupa.enqueue(Array.from({ length: 80 }, (_, i) => ({ id: `s${i}` })));

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.budgetExhausted).toBe(true);
    expect(body.sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
    // The due-sequence query never even runs.
    expect(mockSupa.tables).toEqual(["marketing_sends"]);
  });

  it("caps each run at one window's capacity", async () => {
    process.env.CRON_SECRET = "cron";
    process.env.MARKETING_DAILY_BUDGET = "4"; // → 1 send per window
    mockSupa.enqueue([]);
    mockSupa.enqueue([DUE_SEQ, { ...DUE_SEQ, id: "seq-2", recipient_email: "jo@example.com" }]);
    mockSupa.enqueue([]);
    mockSupa.enqueue({ id: "send-1" });
    mockSupa.enqueue(null);
    mockSupa.enqueue(null);

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.due).toBe(2);
    expect(body.sent).toBe(1);
    expect(sendMock).toHaveBeenCalledTimes(1);
    delete process.env.MARKETING_DAILY_BUDGET;
  });

  it("stops ladders for suppressed leads instead of emailing them", async () => {
    process.env.CRON_SECRET = "cron";
    mockSupa.enqueue([]);
    mockSupa.enqueue([DUE_SEQ]);
    mockSupa.enqueue([{ email: "sam@example.com" }]); // sam bounced
    mockSupa.enqueue(null); // sequence stop update

    const res = await GET(cronRequest("cron"));
    const body = await res.json();
    expect(body.suppressedStopped).toBe(1);
    expect(body.sent).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
    // ...the stop lands on marketing_sequences.
    expect(mockSupa.tables).toContain("marketing_sequences");
  });
});
