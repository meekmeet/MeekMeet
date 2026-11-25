import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit, rateLimitResponse, limiters } from "@/lib/rate-limit";

// Tracked-click redirect for marketing CTAs and QR codes.
// /api/t?d=/circles&tpl=invite_vision&t=midnight&s=<sendId>
// Logs the click (theme/template attribution), stops any active ladder for
// the recipient (a click is engagement), then redirects to the destination.
export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "tracked-click", limiters.publicInsights());
  if (!limit.ok) return rateLimitResponse(limit);

  const { searchParams } = new URL(request.url);
  const dest = searchParams.get("d") ?? "/circles";
  const templateKey = searchParams.get("tpl") ?? "unknown";
  const theme = searchParams.get("t") ?? "parchment";
  const sendId = searchParams.get("s");

  // Only same-site relative destinations are allowed.
  const target = dest.startsWith("/") && !dest.startsWith("//") ? dest : "/circles";

  const supabase = createServiceClient();

  let sequenceId: string | null = null;
  let recipientEmail: string | null = null;

  if (sendId) {
    const { data: send } = await supabase
      .from("marketing_sends")
      .select("id, recipient_email, sequence_id")
      .eq("id", sendId)
      .maybeSingle();
    if (send) {
      recipientEmail = send.recipient_email;
      sequenceId = send.sequence_id;
    }
  }

  await supabase.from("marketing_events").insert({
    kind: "click",
    recipient_email: recipientEmail ?? "unknown",
    theme,
    template_key: templateKey,
    send_id: sendId ?? null,
    sequence_id: sequenceId ?? null,
  });

  // A click means the ladder worked — stop it, and mark the lead engaged.
  if (sequenceId) {
    await supabase
      .from("marketing_sequences")
      .update({ status: "stopped_engaged", stopped_at: new Date().toISOString() })
      .eq("id", sequenceId)
      .eq("status", "active");
  }
  if (recipientEmail) {
    await supabase
      .from("marketing_leads")
      .update({ status: "engaged" })
      .eq("email", recipientEmail.toLowerCase())
      .in("status", ["new", "drip"]);
  }

  return NextResponse.redirect(new URL(target, request.url));
}
