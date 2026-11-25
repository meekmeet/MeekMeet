import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit, rateLimitResponse, limiters } from "@/lib/rate-limit";

// Resend webhook receiver. Two jobs:
//   1. email.received (requires Resend Inbound + MX on a subdomain) — an
//      actual reply. Stops any active drip ladder for the sender as
//      'stopped_replied' and logs a marketing_events row.
//   2. Email delivery events (bounced/complained) are accepted and logged so
//      the ladder can be cleaned up later.
//
// Signature verification is the Svix scheme Resend uses:
//   signed payload = `${svix-id}.${svix-timestamp}.${body}`
//   HMAC-SHA256 with base64-decoded secret (strip the whsec_ prefix).

const MAX_AGE_SECONDS = 5 * 60;

function verifySvixSignature(
  rawBody: string,
  headers: Headers,
  secret: string
): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_AGE_SECONDS) return false;

  let key: Buffer;
  try {
    key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  } catch {
    return false;
  }

  const payload = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", key).update(payload, "utf-8").digest("base64");

  // svix-signature: "v1,<base64>" (space-separated if multiple).
  const versions = signature.split(" ");
  for (const version of versions) {
    const match = /^v1,(.+)$/.exec(version);
    if (!match) continue;
    const provided = Buffer.from(match[1]);
    const want = Buffer.from(expected);
    if (provided.length === want.length && timingSafeEqual(provided, want)) {
      return true;
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "resend-webhook", limiters.publicInsights());
  if (!limit.ok) return rateLimitResponse(limit);

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  if (!verifySvixSignature(rawBody, request.headers, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (event.type === "email.received") {
    const from = String(event.data?.from ?? "");
    const emailMatch = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(from);
    const sender = emailMatch?.[0]?.toLowerCase() ?? null;

    if (sender) {
      // Stop active ladders for this sender.
      const { data: stopped } = await supabase
        .from("marketing_sequences")
        .update({ status: "stopped_replied", stopped_at: new Date().toISOString() })
        .eq("recipient_email", sender)
        .eq("status", "active")
        .select("id");

      for (const seq of stopped ?? []) {
        await supabase.from("marketing_events").insert({
          kind: "reply",
          recipient_email: sender,
          theme: "parchment",
          sequence_id: seq.id,
          meta: { source: "resend_inbound" },
        });
      }

      // The lead has answered — the campaign side mirrors the ladder state.
      await supabase
        .from("marketing_leads")
        .update({ status: "replied" })
        .eq("email", sender)
        .in("status", ["new", "drip", "engaged"]);
    }
  }

  // Delivery problems: mark the newest send to that address as failed so the
  // ladder isn't pointed at a dead inbox.
  if (event.type === "email.bounced" || event.type === "email.complained") {
    const to = String(event.data?.to ?? "").toLowerCase();
    if (to) {
      await supabase
        .from("marketing_sends")
        .update({ status: "failed", error: event.type })
        .eq("recipient_email", to)
        .eq("status", "sent");

      // Don't keep mailing a dead inbox — the lead is marked for review.
      await supabase
        .from("marketing_leads")
        .update({ status: "bounced" })
        .eq("email", to)
        .in("status", ["new", "drip"]);

      // And the ladder itself dies with it — a bounce must never receive the
      // day-7 or day-14 follow-up. (The cron's suppression guard is the
      // second line of defence; this is the first.)
      await supabase
        .from("marketing_sequences")
        .update({ status: "stopped_bounced", stopped_at: new Date().toISOString() })
        .eq("recipient_email", to)
        .eq("status", "active");
    }
  }

  return NextResponse.json({ received: true });
}
