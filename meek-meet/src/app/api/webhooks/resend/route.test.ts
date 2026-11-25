import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import { NextRequest } from "next/server";
import { MockSupabaseClient } from "@/test/mock-supabase";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));

import { createServiceClient } from "@/lib/supabase/service";
import { POST } from "./route";

const SECRET = "whsec_testsecretkey0123456789abcdef";
const RAW_KEY = Buffer.from(SECRET.replace(/^whsec_/, ""), "base64");

const mockSupa = new MockSupabaseClient();

function signedRequest(body: object, opts: { stale?: boolean; tamper?: boolean } = {}) {
  const raw = JSON.stringify(body);
  const id = "msg_1";
  const timestamp = opts.stale
    ? String(Math.floor(Date.now() / 1000) - 600)
    : String(Math.floor(Date.now() / 1000));
  const payload = `${id}.${timestamp}.${opts.tamper ? raw + "x" : raw}`;
  const sig = createHmac("sha256", RAW_KEY).update(payload, "utf-8").digest("base64");
  return new NextRequest("http://localhost/api/webhooks/resend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${sig}`,
      "x-forwarded-for": "10.9.99.1",
    },
    body: raw,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_WEBHOOK_SECRET = SECRET;
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  vi.mocked(createServiceClient).mockReturnValue(mockSupa as never);
});

describe("POST /api/webhooks/resend", () => {
  it("rejects requests without a configured secret", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const res = await POST(signedRequest({ type: "email.received" }));
    expect(res.status).toBe(500);
  });

  it("rejects an invalid signature", async () => {
    const res = await POST(signedRequest({ type: "email.received" }, { tamper: true }));
    expect(res.status).toBe(401);
  });

  it("rejects a stale timestamp", async () => {
    const res = await POST(signedRequest({ type: "email.received" }, { stale: true }));
    expect(res.status).toBe(401);
  });

  it("stops active ladders when a reply arrives", async () => {
    // The sequence-stop update returns its rows (select) then per-row events.
    mockSupa.enqueue([{ id: "seq-1" }]).enqueue(null);
    const res = await POST(
      signedRequest({
        type: "email.received",
        data: { from: "Sam Smith <sam@example.com>", subject: "Re: hello" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockSupa.tables).toContain("marketing_sequences");
    expect(mockSupa.tables).toContain("marketing_events");
    expect(mockSupa.tables).toContain("marketing_leads"); // the lead has answered
  });

  it("accepts delivery events without a sender match", async () => {
    const res = await POST(signedRequest({ type: "email.delivered", data: { to: "x@y.z" } }));
    expect(res.status).toBe(200);
  });

  it("marks bounced and complained addresses' sends as failed and kills their ladder", async () => {
    mockSupa.enqueue(null); // the failed-update query
    mockSupa.enqueue(null); // lead flagged for review
    mockSupa.enqueue(null); // active sequences stopped — no day-7/14 to a dead inbox
    const res = await POST(
      signedRequest({ type: "email.bounced", data: { to: "sam@example.com" } })
    );
    expect(res.status).toBe(200);
    expect(mockSupa.tables).toContain("marketing_sends");
    expect(mockSupa.tables).toContain("marketing_leads"); // lead flagged for review
    expect(mockSupa.tables).toContain("marketing_sequences"); // ladder stopped
  });

  it("stops ladders for a reply even with a display name in From", async () => {
    mockSupa.enqueue([]).enqueue(null); // zero active sequences; no events
    const res = await POST(
      signedRequest({
        type: "email.received",
        data: { from: '"Smith, Sam" <sam@example.com>' },
      })
    );
    expect(res.status).toBe(200);
    expect(mockSupa.tables).toEqual(["marketing_sequences", "marketing_leads"]);
  });
});
