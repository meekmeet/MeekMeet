// Drip-sequence engine: theme-escalated follow-up ladders for marketing
// outreach. Step 1 (parchment) on day 0, step 2 (midnight) on day 7,
// step 3 (terracotta) on day 14. A reply or a tracked click stops the ladder.
// Shared by the marketing-drip cron route and the admin actions.

import { getMarketingTemplate, MARKETING_EMAIL_FROM } from "@/lib/emails/marketing";
import { generateFlyerSvg, ORG_ACCENTS, accentForOrg } from "@/lib/flyer";
import { getResend } from "@/lib/resend";
import { trackedUrl } from "@/lib/emails/shell";

export const DRIP_STEPS = [
  { step: 1, theme: "parchment" as const, delayDays: 0 },
  { step: 2, theme: "midnight" as const, delayDays: 7 },
  { step: 3, theme: "terracotta" as const, delayDays: 14 },
];

export function stepForIndex(index: number) {
  return DRIP_STEPS[Math.min(Math.max(index, 0), DRIP_STEPS.length - 1)];
}

/** Deterministic A/B: rotate the person opener between the two invitations. */
export function openerTemplateFor(email: string, kind: "person" | "org"): string {
  if (kind === "org") return "org_partnership";
  let hash = 0;
  const key = email.trim().toLowerCase();
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2 === 0 ? "invite_vision" : "invite_circle";
}

export interface SequenceRow {
  id: string;
  kind: "person" | "org";
  recipient_email: string;
  recipient_name: string | null;
  org_name: string | null;
  contact_name: string | null;
  template_key: string;
  current_step: number;
  /** Recipient's faith tradition — the org letter quotes their own scripture. */
  faith?: string | null;
}

interface SupabaseService {
  from: (table: string) => any;
}

/**
 * Send one step of a sequence. Logs the send (linked to the sequence),
 * updates the sequence's step / next_run_at / terminal status.
 * Returns a summary for the caller to aggregate.
 */
export async function sendSequenceStep(
  supabase: SupabaseService,
  sequence: SequenceRow
): Promise<{ sent: boolean; step: number; theme: string; error?: string }> {
  const next = stepForIndex(sequence.current_step);
  // Steps 2/3 re-send the SAME template the sequence opened with — the theme
  // does the escalating, the opener stays coherent.
  const active = getMarketingTemplate(sequence.template_key);
  if (!active) throw new Error("Sequence template missing");

  const accent = sequence.kind === "org" ? accentForOrg(sequence.org_name ?? "") : undefined;
  const built = active.build({
    recipientName: sequence.recipient_name ?? sequence.contact_name ?? undefined,
    orgName: sequence.org_name ?? undefined,
    theme: next.theme,
    orgAccent: accent,
    faith: sequence.faith ?? undefined,
  });

  // Insert the send row first so the tracked URL can carry its id.
  const { data: sendRow, error: insertError } = await supabase
    .from("marketing_sends")
    .insert({
      kind: sequence.kind === "org" ? "org_flyer" : "person_invite",
      recipient_email: sequence.recipient_email,
      recipient_name: sequence.recipient_name ?? sequence.contact_name,
      recipient_org: sequence.org_name,
      template_key: active.key,
      theme: next.theme,
      status: "pending",
      sent_by: null,
      sequence_id: sequence.id,
      step: next.step,
    })
    .select("id")
    .single();
  if (insertError || !sendRow) {
    throw new Error(insertError?.message ?? "send log insert returned no id");
  }

  // Stamp the CTA with this send's tracked id (same scheme as ad-hoc sends).
  const htmlWithTracking = built.html
    .replaceAll(
      trackedUrl("/circles", active.key, next.theme),
      trackedUrl("/circles", active.key, next.theme, sendRow.id)
    )
    .replaceAll(
      trackedUrl("/shepherd", active.key, next.theme),
      trackedUrl("/shepherd", active.key, next.theme, sendRow.id)
    );

  let status: "sent" | "failed" = "sent";
  let errorMessage: string | null = null;

  try {
    const attachments: { filename: string; content: string }[] = [];
    if (sequence.kind === "org") {
      const flyerSvg = await generateFlyerSvg({
        orgName: sequence.org_name ?? undefined,
        accent,
        theme: next.theme,
        faith: sequence.faith ?? undefined,
      });
      const qrPng = flyerSvg.match(/xlink:href="data:image\/png;base64,([^"]+)"/)?.[1] ?? "";
      attachments.push({
        filename: "meek-meet-flyer.svg",
        content: Buffer.from(flyerSvg, "utf-8").toString("base64"),
      });
      if (qrPng) attachments.push({ filename: "meek-meet-qr.png", content: qrPng });
    }

    await getResend().emails.send({
      from: MARKETING_EMAIL_FROM,
      to: sequence.recipient_email,
      subject: built.subject,
      html: htmlWithTracking,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  } catch (err) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : "Send failed";
  }

  await supabase
    .from("marketing_sends")
    .update({ status, error: errorMessage })
    .eq("id", sendRow.id);

  // Advance the ladder.
  const isLast = next.step >= DRIP_STEPS.length;
  await supabase
    .from("marketing_sequences")
    .update({
      current_step: next.step,
      status: isLast ? "completed" : "active",
      next_run_at: isLast
        ? new Date().toISOString()
        : new Date(Date.now() + DRIP_STEPS[next.step].delayDays * 24 * 3600 * 1000).toISOString(),
    })
    .eq("id", sequence.id);

  return { sent: status === "sent", step: next.step, theme: next.theme, error: errorMessage ?? undefined };
}

export { ORG_ACCENTS };
