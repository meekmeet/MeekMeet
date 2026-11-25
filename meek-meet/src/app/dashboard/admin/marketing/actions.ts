"use server";

import { createClient } from "@/lib/supabase/server";
import { getResend } from "@/lib/resend";
import { revalidatePath } from "next/cache";
import { isValidEmail, assertNonEmptyString, assertOptionalString, isValidUuid } from "@/lib/validation";
import {
  MARKETING_TEMPLATES,
  MARKETING_EMAIL_FROM,
  getMarketingTemplate,
} from "@/lib/emails/marketing";
import { getEmailTheme, type EmailThemeKey } from "@/lib/emails/shell";
import { generateFlyerSvg, accentForOrg } from "@/lib/flyer";
import { auditEvent } from "@/lib/audit";
import { DRIP_STEPS, openerTemplateFor, sendSequenceStep } from "@/lib/marketing/drip";
import {
  DRIP_COOLDOWN_DAYS,
  SUPPRESSED_LEAD_STATUSES,
  computeSendSlots,
  dripCooldownCutoff,
  marketingDailyBudget,
  startOfUtcDay,
  windowCapacity,
} from "@/lib/marketing/pace";
import { trackedUrl } from "@/lib/emails/shell";

export interface MarketingSendEntry {
  id: string;
  kind: string;
  recipient_email: string;
  recipient_name: string | null;
  recipient_org: string | null;
  template_key: string;
  theme: string;
  status: string;
  error: string | null;
  sent_by: string | null;
  created_at: string;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");

  return { supabase, user };
}

export async function getMarketingTemplates() {
  return MARKETING_TEMPLATES.map((t) => ({
    key: t.key,
    name: t.name,
    audience: t.audience,
    description: t.description,
  }));
}

/** Live preview of a template — used by the marketing page preview pane. */
export async function previewMarketingTemplate(
  templateKey: string,
  recipientName?: string,
  orgName?: string,
  theme?: string,
  faith?: string
) {
  const template = getMarketingTemplate(templateKey);
  if (!template) throw new Error("Unknown template");
  const sample = template.build({
    recipientName: recipientName?.trim() ? recipientName.trim() : undefined,
    orgName: orgName?.trim() ? orgName.trim() : undefined,
    theme: getEmailTheme(theme).key,
    faith: faith?.trim() ? faith.trim() : undefined,
  });
  return { subject: sample.subject, html: sample.html };
}

function parseTheme(theme: string | undefined): EmailThemeKey {
  return getEmailTheme(theme).key;
}

/** Live preview of the flyer — rendered exactly as the email attachment. */
export async function previewFlyer(orgName?: string, faith?: string) {
  const name = orgName?.trim() ? assertNonEmptyString(orgName, "Organisation", 200) : undefined;
  const f = faith?.trim() ? assertOptionalString(faith, "Faith", 30) : undefined;
  return generateFlyerSvg({ orgName: name, faith: f ?? undefined });
}

export interface DripPreviewStep {
  step: number;
  theme: string;
  delayDays: number;
  /** Human label: "now" for day 0, "day 7" / "day 14" for follow-ups. */
  when: string;
  subject: string;
  html: string;
  /** Org steps carry the exact flyer attachment for that step's theme. */
  flyerSvg?: string;
}

/**
 * Preview the ENTIRE drip ladder for a recipient — every step, in the theme
 * it will actually arrive in, with the org flyer attachment per step — so an
 * admin can review the full sequence before starting it.
 */
export async function previewDripSequence(options: {
  kind: "person" | "org";
  templateKey?: string;
  recipientName?: string;
  orgName?: string;
  faith?: string;
}): Promise<DripPreviewStep[]> {
  const key =
    options.kind === "org" ? "org_partnership" : (options.templateKey ?? "invite_vision");
  const template = getMarketingTemplate(key);
  if (!template) throw new Error("Choose a valid invitation template");

  const recipientName = options.recipientName?.trim() ? options.recipientName.trim() : undefined;
  const orgName = options.orgName?.trim() ? options.orgName.trim() : undefined;
  const faith = options.faith?.trim() ? options.faith.trim() : undefined;
  const accent = options.kind === "org" ? accentForOrg(orgName ?? "") : undefined;

  const steps: DripPreviewStep[] = [];
  for (const s of DRIP_STEPS) {
    const built = template.build({
      recipientName,
      orgName,
      theme: s.theme,
      orgAccent: accent,
      faith,
    });
    steps.push({
      step: s.step,
      theme: s.theme,
      delayDays: s.delayDays,
      when: s.delayDays === 0 ? "now" : `day ${s.delayDays}`,
      subject: built.subject,
      html: built.html,
    });
  }

  if (options.kind === "org") {
    for (const s of steps) {
      s.flyerSvg = await generateFlyerSvg({
        orgName,
        accent,
        theme: s.theme as (typeof DRIP_STEPS)[number]["theme"],
        faith,
      });
    }
  }
  return steps;
}

export async function sendPersonInvite(options: {
  recipientEmail: string;
  recipientName?: string;
  templateKey: string;
  theme?: string;
}) {
  const email = assertNonEmptyString(options.recipientEmail, "Email", 255);
  if (!isValidEmail(email)) throw new Error("Invalid email address");
  const name = assertOptionalString(options.recipientName, "Name", 100);

  const template = getMarketingTemplate(options.templateKey);
  if (!template || template.audience !== "person") {
    throw new Error("Choose a valid invitation template");
  }

  const { supabase, user } = await requireAdmin();
  const themeKey = parseTheme(options.theme);

  const built = template.build({ recipientName: name ?? undefined, theme: themeKey });

  // Insert the log row first so the CTA can carry its tracked id.
  const { data: sendRow, error: logError } = await supabase
    .from("marketing_sends")
    .insert({
      kind: "person_invite",
      recipient_email: email,
      recipient_name: name,
      template_key: template.key,
      theme: themeKey,
      status: "pending",
      sent_by: user.id,
    })
    .select("id")
    .single();
  if (logError || !sendRow) throw new Error(logError?.message ?? "send log insert returned no id");

  const htmlWithTracking = built.html.replaceAll(
    trackedUrl("/circles", template.key, themeKey),
    trackedUrl("/circles", template.key, themeKey, sendRow.id)
  ).replaceAll(
    trackedUrl("/shepherd", template.key, themeKey),
    trackedUrl("/shepherd", template.key, themeKey, sendRow.id)
  );

  let status: "sent" | "failed" = "sent";
  let errorMessage: string | null = null;

  try {
    await getResend().emails.send({
      from: MARKETING_EMAIL_FROM,
      to: email,
      subject: built.subject,
      html: htmlWithTracking,
    });
  } catch (err) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : "Send failed";
  }

  await supabase
    .from("marketing_sends")
    .update({ status, error: errorMessage })
    .eq("id", sendRow.id);
  if (status === "failed") throw new Error(`Email failed to send: ${errorMessage}`);

  await auditEvent(supabase, user.id, {
    action: "marketing.send",
    targetType: "email",
    targetId: email,
    detail: { kind: "person_invite", template: template.key, status, error: errorMessage },
  });

  revalidatePath("/dashboard/admin/marketing");
  return { success: true as const, template: template.name };
}

export async function sendOrganisationFlyer(options: {
  orgName: string;
  contactEmail: string;
  contactName?: string;
  theme?: string;
  faith?: string;
}) {
  const orgName = assertNonEmptyString(options.orgName, "Organisation", 200);
  const email = assertNonEmptyString(options.contactEmail, "Contact email", 255);
  if (!isValidEmail(email)) throw new Error("Invalid contact email");
  const contactName = assertOptionalString(options.contactName, "Contact name", 100);
  const faith = assertOptionalString(options.faith, "Faith", 30);

  const template = getMarketingTemplate("org_partnership");
  if (!template) throw new Error("Organisation template missing");

  const { supabase, user } = await requireAdmin();
  const themeKey = parseTheme(options.theme);

  const built = template.build({
    recipientName: contactName ?? undefined,
    orgName,
    theme: themeKey,
    orgAccent: accentForOrg(orgName),
    faith: faith ?? undefined,
  });
  const flyerSvg = await generateFlyerSvg({ orgName, theme: themeKey, faith: faith ?? undefined });
  const qrPng = flyerSvg.match(/xlink:href="data:image\/png;base64,([^"]+)"/)?.[1] ?? "";

  // Insert the log row first so the flyer QR and links carry its tracked id.
  const { data: sendRow, error: logError } = await supabase
    .from("marketing_sends")
    .insert({
      kind: "org_flyer",
      recipient_email: email,
      recipient_name: contactName,
      recipient_org: orgName,
      template_key: template.key,
      theme: themeKey,
      status: "pending",
      sent_by: user.id,
    })
    .select("id")
    .single();
  if (logError || !sendRow) throw new Error(logError?.message ?? "send log insert returned no id");

  const htmlWithTracking = built.html.replaceAll(
    trackedUrl("/shepherd", template.key, themeKey),
    trackedUrl("/shepherd", template.key, themeKey, sendRow.id)
  );

  let status: "sent" | "failed" = "sent";
  let errorMessage: string | null = null;

  try {
    await getResend().emails.send({
      from: MARKETING_EMAIL_FROM,
      to: email,
      subject: built.subject,
      html: htmlWithTracking,
      attachments: [
        {
          filename: "meek-meet-flyer.svg",
          content: Buffer.from(flyerSvg, "utf-8").toString("base64"),
        },
        ...(qrPng ? [{ filename: "meek-meet-qr.png", content: qrPng }] : []),
      ],
    });
  } catch (err) {
    status = "failed";
    errorMessage = err instanceof Error ? err.message : "Send failed";
  }

  await supabase
    .from("marketing_sends")
    .update({ status, error: errorMessage })
    .eq("id", sendRow.id);
  if (status === "failed") throw new Error(`Email failed to send: ${errorMessage}`);

  await auditEvent(supabase, user.id, {
    action: "marketing.send",
    targetType: "email",
    targetId: email,
    detail: { kind: "org_flyer", org: orgName, template: template.key, status, error: errorMessage },
  });

  revalidatePath("/dashboard/admin/marketing");
  return { success: true as const, org: orgName };
}

export async function getMarketingHistory(): Promise<MarketingSendEntry[]> {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("marketing_sends")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface SequenceEntry {
  id: string;
  kind: string;
  recipient_email: string;
  recipient_name: string | null;
  org_name: string | null;
  contact_name: string | null;
  template_key: string;
  status: string;
  current_step: number;
  next_run_at: string;
  created_at: string;
}

/** Start (or restart) a drip ladder for a recipient and fire step 1 now. */
export async function createSequence(options: {
  kind: "person" | "org";
  recipientEmail: string;
  recipientName?: string;
  orgName?: string;
  contactName?: string;
  faith?: string;
}) {
  const email = assertNonEmptyString(options.recipientEmail, "Email", 255);
  if (!isValidEmail(email)) throw new Error("Invalid email address");
  const name = assertOptionalString(options.recipientName, "Name", 100);
  const orgName =
    options.kind === "org" ? assertNonEmptyString(options.orgName ?? "", "Organisation", 200) : null;
  const contactName = assertOptionalString(options.contactName, "Contact name", 100);
  const faith = assertOptionalString(options.faith, "Faith", 30);

  const { supabase, user } = await requireAdmin();

  const sequence = await beginSequence(supabase, user, {
    kind: options.kind,
    email,
    name,
    orgName,
    contactName,
    faith,
  });

  // Day 0 fires immediately — the cron only handles the day 7/14 escalations.
  await sendSequenceStep(supabase, sequence);

  revalidatePath("/dashboard/admin/marketing");
  return { success: true as const };
}

/**
 * Create or restart the sequence row itself (cancel existing active ladder,
 * upsert fresh at step 0). Shared by createSequence and the leads actions.
 * Does NOT send — callers own the first step.
 */
async function beginSequence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string },
  options: {
    kind: "person" | "org";
    email: string;
    name: string | null;
    orgName: string | null;
    contactName: string | null;
    faith?: string | null;
  }
) {
  // Restart semantics: cancel any existing ladder for this recipient+kind.
  await supabase
    .from("marketing_sequences")
    .update({ status: "stopped_manual", stopped_at: new Date().toISOString() })
    .eq("recipient_email", options.email)
    .eq("kind", options.kind)
    .eq("status", "active");

  const { data, error } = await supabase
    .from("marketing_sequences")
    .upsert(
      {
        kind: options.kind,
        recipient_email: options.email,
        recipient_name: options.name,
        org_name: options.orgName,
        contact_name: options.contactName,
        template_key: openerTemplateFor(options.email, options.kind),
        status: "active",
        current_step: 0,
        next_run_at: new Date().toISOString(), // step 1 fires immediately by the caller
        started_by: user.id,
        stopped_at: null,
        faith: options.faith ?? null,
      },
      { onConflict: "recipient_email,kind" }
    )
    .select("id, kind, recipient_email, recipient_name, org_name, contact_name, template_key, current_step, faith")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create sequence");

  await auditEvent(supabase, user.id, {
    action: "marketing.sequence_start",
    targetType: "email",
    targetId: options.email,
    detail: { kind: options.kind, opener: openerTemplateFor(options.email, options.kind) },
  });

  return data;
}

export async function stopSequence(sequenceId: string) {
  if (!isValidUuid(sequenceId)) throw new Error("Invalid sequence ID");
  const { supabase, user } = await requireAdmin();

  const { error } = await supabase
    .from("marketing_sequences")
    .update({ status: "stopped_manual", stopped_at: new Date().toISOString() })
    .eq("id", sequenceId)
    .eq("status", "active");
  if (error) throw new Error(error.message);

  await auditEvent(supabase, user.id, {
    action: "marketing.sequence_stop",
    targetType: "sequence",
    targetId: sequenceId,
  });

  revalidatePath("/dashboard/admin/marketing");
}

export async function getSequences(): Promise<SequenceEntry[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("marketing_sequences")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Sends and clicks grouped per theme and per template — the A/B scoreboard. */
export async function getMarketingStats(): Promise<{
  perTheme: { theme: string; sends: number; clicks: number }[];
  perTemplate: { template: string; sends: number; clicks: number }[];
}> {
  const { supabase } = await requireAdmin();

  const [{ data: sends }, { data: clicks }] = await Promise.all([
    supabase.from("marketing_sends").select("theme, template_key, status"),
    supabase.from("marketing_events").select("theme, template_key").eq("kind", "click"),
  ]);

  const perTheme = new Map<string, { sends: number; clicks: number }>();
  const perTemplate = new Map<string, { sends: number; clicks: number }>();
  for (const key of ["parchment", "midnight", "terracotta"]) {
    perTheme.set(key, { sends: 0, clicks: 0 });
  }

  for (const send of sends ?? []) {
    if (send.status !== "sent") continue;
    const t = perTheme.get(send.theme) ?? { sends: 0, clicks: 0 };
    t.sends += 1;
    perTheme.set(send.theme, t);
    const tpl = perTemplate.get(send.template_key) ?? { sends: 0, clicks: 0 };
    tpl.sends += 1;
    perTemplate.set(send.template_key, tpl);
  }
  for (const click of clicks ?? []) {
    const t = perTheme.get(click.theme);
    if (t) {
      t.clicks += 1;
      perTheme.set(click.theme, t);
    }
    const tpl = perTemplate.get(click.template_key);
    if (tpl) {
      tpl.clicks += 1;
      perTemplate.set(click.template_key, tpl);
    }
  }

  return {
    perTheme: Array.from(perTheme.entries()).map(([theme, v]) => ({ theme, ...v })),
    perTemplate: Array.from(perTemplate.entries()).map(([template, v]) => ({ template, ...v })),
  };
}

// ============================================
// Leads — the outreach database
// ============================================

const LEAD_KINDS = ["org", "individual"] as const;
const LEAD_STATUSES = ["new", "drip", "replied", "engaged", "completed", "stopped", "bounced"] as const;

/** The tradition a lead belongs to — drives the scripture quoted in org letters. */
const LEAD_FAITHS = ["christian", "islamic", "jewish", "buddhist", "hindu", "sikh", "interfaith", "secular", "other"] as const;

const LEAD_TYPE_FAITH: Record<string, string> = {
  "church-catholic": "christian",
  "church-anglican": "christian",
  "church-baptist": "christian",
  "church-uniting": "christian",
  "church-pentecostal": "christian",
  "church-salvos": "christian",
  "church-salvation-army": "christian",
  "church-greek-orthodox": "christian",
  "church-alliance": "christian",
  "church-presbyterian": "christian",
  "church-independent": "christian",
  "church-christian": "christian",
  "church-other": "christian",
  mosque: "islamic",
  "islamic-centre": "islamic",
  synagogue: "jewish",
  "jewish-org": "jewish",
  "temple-buddhist": "buddhist",
  "temple-hindu": "hindu",
  gurdwara: "sikh",
  interfaith: "interfaith",
  council: "secular",
  library: "secular",
  "community-centre": "secular",
  charity: "secular",
  welfare: "secular",
  youth: "secular",
  garden: "secular",
  "mens-shed": "secular",
  "service-club": "secular",
  other: "secular",
};

export interface LeadInput {
  kind: "org" | "individual";
  name: string;
  email: string;
  contactName?: string;
  leadType?: string;
  region?: string;
  suburb?: string;
  sourceUrl?: string;
  /** Overrides the faith implied by leadType; org letters quote this tradition. */
  faith?: string;
}

export interface LeadEntry {
  id: string;
  kind: "org" | "individual";
  name: string;
  email: string;
  contact_name: string | null;
  lead_type: string | null;
  region: string | null;
  suburb: string | null;
  source_url: string | null;
  faith: string | null;
  status: string;
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
  /** Live drip progress, derived from the sequence on this email. */
  sequence: { status: string; current_step: number; next_run_at: string } | null;
}

function leadKind(value: unknown): "org" | "individual" {
  if (value === "org" || value === "individual") return value;
  throw new Error("Lead kind must be 'org' or 'individual'");
}

function assertLeadType(value: string | undefined): string | null {
  return assertOptionalString(value, "Lead type", 50);
}

function assertRegion(value: string | undefined): string | null {
  return assertOptionalString(value, "Region", 50);
}

function assertSuburb(value: string | undefined): string | null {
  return assertOptionalString(value, "Suburb", 80);
}

function assertSourceUrl(value: string | undefined): string | null {
  const v = assertOptionalString(value, "Source URL", 500);
  if (v && !/^https?:\/\//i.test(v)) throw new Error("Source URL must start with http(s)://");
  return v;
}

function validateLeadInput(input: LeadInput) {
  const kind = leadKind(input?.kind);
  const name = assertNonEmptyString(input?.name ?? "", "Name", 200);
  const email = assertNonEmptyString(input?.email ?? "", "Email", 255).toLowerCase();
  if (!isValidEmail(email)) throw new Error("Invalid email address");
  const contactName = assertOptionalString(input?.contactName, "Contact name", 100);
  const leadType = assertLeadType(input?.leadType);
  const region = assertRegion(input?.region);
  const suburb = assertSuburb(input?.suburb);
  const sourceUrl = assertSourceUrl(input?.sourceUrl);
  // Faith comes from the explicit field, else is implied by the lead type,
  // else defaults to christian (the historical letter voice).
  let faith: string | null = null;
  if (input?.faith !== undefined && input.faith !== "") {
    const f = input.faith.trim().toLowerCase();
    if (!(LEAD_FAITHS as readonly string[]).includes(f)) throw new Error("Unknown faith value");
    faith = f;
  } else if (leadType && LEAD_TYPE_FAITH[leadType]) {
    faith = LEAD_TYPE_FAITH[leadType];
  }
  return { kind, name, email, contactName, leadType, region, suburb, sourceUrl, faith };
}

function leadRow(input: ReturnType<typeof validateLeadInput>, addedBy: string) {
  return {
    kind: input.kind,
    name: input.name,
    email: input.email,
    contact_name: input.contactName,
    lead_type: input.leadType,
    region: input.region,
    suburb: input.suburb,
    source_url: input.sourceUrl,
    faith: input.faith,
    added_by: addedBy,
  };
}

/** All leads joined with their drip sequence (for live status display). */
export async function getLeads(): Promise<LeadEntry[]> {
  const { supabase } = await requireAdmin();

  const [{ data: leads, error }, { data: sequences }] = await Promise.all([
    supabase.from("marketing_leads").select("*").order("region").order("name").limit(2000),
    supabase.from("marketing_sequences").select("kind, recipient_email, status, current_step, next_run_at"),
  ]);
  if (error) throw new Error(error.message);

  const byEmail = new Map<string, { status: string; current_step: number; next_run_at: string }>();
  for (const seq of sequences ?? []) {
    byEmail.set(`${seq.kind}|${seq.recipient_email.toLowerCase()}`, seq);
  }

  return (leads ?? []).map((lead) => ({
    ...lead,
    sequence: byEmail.get(`${lead.kind === "org" ? "org" : "person"}|${lead.email.toLowerCase()}`) ?? null,
  }));
}

/** Add one lead (upserts on email — re-adding refreshes the details). */
export async function addLead(input: LeadInput) {
  const valid = validateLeadInput(input);
  const { supabase, user } = await requireAdmin();

  const { data, error } = await supabase
    .from("marketing_leads")
    .upsert(leadRow(valid, user.id), { onConflict: "email" })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to add lead");

  await auditEvent(supabase, user.id, {
    action: "marketing.lead_add",
    targetType: "lead",
    targetId: valid.email,
    detail: { kind: valid.kind, name: valid.name },
  });

  revalidatePath("/dashboard/admin/marketing");
  return { success: true as const, faith: valid.faith };
}

/**
 * Bulk-import leads (used by the paste-box and by one-off research imports).
 * Invalid rows are skipped, not fatal — returns per-row outcomes.
 */
export async function importLeads(inputs: LeadInput[]): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  if (!Array.isArray(inputs) || inputs.length === 0) throw new Error("Nothing to import");
  if (inputs.length > 1000) throw new Error("Import at most 1000 leads at a time");

  const { supabase, user } = await requireAdmin();

  const rows: ReturnType<typeof leadRow>[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const [i, input] of inputs.entries()) {
    try {
      const valid = validateLeadInput(input);
      if (seen.has(valid.email)) {
        errors.push(`row ${i + 1}: duplicate email ${valid.email}`);
        continue;
      }
      seen.add(valid.email);
      rows.push(leadRow(valid, user.id));
    } catch (err) {
      errors.push(`row ${i + 1}: ${err instanceof Error ? err.message : "invalid"}`);
    }
  }
  if (rows.length === 0) return { imported: 0, skipped: inputs.length, errors };

  const { error } = await supabase.from("marketing_leads").upsert(rows, { onConflict: "email" });
  if (error) throw new Error(error.message);

  await auditEvent(supabase, user.id, {
    action: "marketing.lead_import",
    targetType: "lead",
    targetId: `${rows.length} leads`,
    detail: { imported: rows.length, skipped: errors.length },
  });

  revalidatePath("/dashboard/admin/marketing");
  return { imported: rows.length, skipped: errors.length, errors };
}

/** Queued day-0 sequences (active, not yet sent, future slot). */
async function countQueuedSequences(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number> {
  const { data } = await supabase
    .from("marketing_sequences")
    .select("id")
    .eq("status", "active")
    .eq("current_step", 0)
    .gt("next_run_at", new Date().toISOString());
  return (data ?? []).length;
}

/** Marketing emails already sent today (UTC) — the daily budget counter. */
async function countSentToday(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number> {
  const { data } = await supabase
    .from("marketing_sends")
    .select("id")
    .gte("created_at", startOfUtcDay(new Date()).toISOString())
    .eq("status", "sent");
  return (data ?? []).length;
}

interface DripHistoryRow {
  recipient_email: string;
  status: string;
  current_step: number;
  next_run_at: string | null;
  stopped_at: string | null;
  created_at: string | null;
}

async function getDripHistories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  emails: string[]
): Promise<DripHistoryRow[]> {
  const { data } = await supabase
    .from("marketing_sequences")
    .select("recipient_email, status, current_step, next_run_at, stopped_at, created_at")
    .in("recipient_email", emails);
  return (data ?? []) as DripHistoryRow[];
}

function lastActivityAt(seq: DripHistoryRow): number | null {
  const raw = seq.stopped_at ?? seq.next_run_at ?? seq.created_at;
  return raw ? new Date(raw).getTime() : null;
}

/** A ladder that has sent at least one email and ended within the cooldown. */
function isRecentDrip(seq: DripHistoryRow, cutoff: number): boolean {
  return seq.current_step > 0 && (lastActivityAt(seq) ?? 0) >= cutoff;
}

function ordinal(step: number): string {
  return step >= 3 ? "final" : step === 2 ? "2nd" : "1st";
}

/**
 * The one-drip-per-cooldown rule: any address with an active ladder, or a
 * ladder that sent mail within DRIP_COOLDOWN_DAYS, is blocked from starting
 * another. One-off sends remain the deliberate escape hatch.
 */
async function assertNoRecentDrip(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string
): Promise<void> {
  const histories = await getDripHistories(supabase, [email.toLowerCase()]);
  const cutoff = dripCooldownCutoff();
  const blocking = histories.find(
    (s) => s.status === "active" || isRecentDrip(s, cutoff)
  );
  if (blocking) {
    throw new Error(
      blocking.status === "active"
        ? `Already in a drip — the ${ordinal(blocking.current_step)} email stage is active for this address.`
        : `Already dripped — the ${ordinal(blocking.current_step)} email went out within the last ${DRIP_COOLDOWN_DAYS} days. A new ladder can start once the cooldown passes; use a one-off send for a deliberate re-send.`
    );
  }
}

/**
 * Start (or restart) the drip ladder for a single lead. Day 0 sends now —
 * unless today's marketing budget is already spent, in which case the
 * sequence queues to the next send window instead of pushing the account
 * over its daily quota.
 */
export async function startLeadDrip(leadId: string) {
  if (!isValidUuid(leadId)) throw new Error("Invalid lead ID");
  const { supabase, user } = await requireAdmin();

  const { data: lead, error } = await supabase
    .from("marketing_leads")
    .select("*")
    .eq("id", leadId)
    .single();
  if (error || !lead) throw new Error(error?.message ?? "Lead not found");

  await assertNoRecentDrip(supabase, lead.email);

  const kind = leadKind(lead.kind);
  // Leads say "individual"; sequences say "person" — same ladder, two dialects.
  const seqKind: "person" | "org" = kind === "org" ? "org" : "person";
  const sequence = await beginSequence(supabase, user, {
    kind: seqKind,
    email: lead.email,
    name: kind === "individual" ? lead.contact_name ?? lead.name : lead.contact_name,
    orgName: kind === "org" ? lead.name : null,
    contactName: lead.contact_name,
    faith: lead.faith,
  });

  await supabase
    .from("marketing_leads")
    .update({ status: "drip", last_contacted_at: new Date().toISOString() })
    .eq("id", leadId);

  if ((await countSentToday(supabase)) >= marketingDailyBudget()) {
    // Daily budget spent — queue to the next window rather than exceeding it.
    const slot = computeSendSlots(new Date(), await countQueuedSequences(supabase), 1)[0];
    await supabase
      .from("marketing_sequences")
      .update({ next_run_at: slot.toISOString() })
      .eq("id", sequence.id);

    await auditEvent(supabase, user.id, {
      action: "marketing.lead_drip",
      targetType: "lead",
      targetId: lead.email,
      detail: { name: lead.name, queued: true, next_run_at: slot.toISOString() },
    });

    revalidatePath("/dashboard/admin/marketing");
    return { success: true as const, sent: false, queuedAt: slot.toISOString() };
  }

  const outcome = await sendSequenceStep(supabase, sequence);

  await auditEvent(supabase, user.id, {
    action: "marketing.lead_drip",
    targetType: "lead",
    targetId: lead.email,
    detail: { name: lead.name, step: outcome.step, sent: outcome.sent },
  });

  revalidatePath("/dashboard/admin/marketing");
  return { success: true as const, sent: outcome.sent };
}

/**
 * Bulk drip — queues every eligible lead into the paced send windows
 * (~budget ÷ 4 per window, see src/lib/marketing/pace.ts). Nothing sends
 * from this action; the /api/marketing-drip cron fires each day-0 email at
 * its assigned slot, so a 300-lead selection goes out as a ~4-day trickle
 * instead of a 300-email burst that would exhaust the daily quota, starve
 * transactional mail, and trip receiving providers' spam defences.
 *
 * Skips leads already in an active ladder (re-sending day 0 to someone who
 * got it yesterday is spam), leads whose last ladder sent mail within the
 * 14-day cooldown (one drip at a time, tracked end to end), and suppressed
 * leads (bounced / replied / engaged) — those must never receive another
 * automated email.
 */
export async function startLeadDrips(leadIds: string[]): Promise<{
  queued: number;
  skippedActive: number;
  skippedRecent: number;
  skippedSuppressed: number;
  failures: string[];
  schedule: { perWindow: number; firstSendAt: string | null; lastSendAt: string | null };
}> {
  if (!Array.isArray(leadIds) || leadIds.length === 0) throw new Error("Select at least one lead");
  if (leadIds.length > 1000) throw new Error("Queue at most 1000 drips at a time");

  const { supabase, user } = await requireAdmin();

  const empty = {
    queued: 0,
    skippedActive: 0,
    skippedRecent: 0,
    skippedSuppressed: 0,
    failures: [] as string[],
    schedule: { perWindow: windowCapacity(), firstSendAt: null, lastSendAt: null },
  };

  const { data: leads, error: leadsError } = await supabase
    .from("marketing_leads")
    .select("*")
    .in("id", leadIds);
  if (leadsError) throw new Error(leadsError.message);
  if (!leads || leads.length === 0) return empty;

  const emails = leads.map((l) => l.email.toLowerCase());
  const [historyRes, suppressedRes, pendingRes] = await Promise.all([
    getDripHistories(supabase, emails),
    supabase
      .from("marketing_leads")
      .select("email")
      .in("email", emails)
      .in("status", [...SUPPRESSED_LEAD_STATUSES]),
    supabase
      .from("marketing_sequences")
      .select("id")
      .eq("status", "active")
      .eq("current_step", 0)
      .gt("next_run_at", new Date().toISOString()),
  ]);

  const suppressed = new Set((suppressedRes.data ?? []).map((r) => r.email.toLowerCase()));
  const histories = historyRes;
  const cutoff = dripCooldownCutoff();
  const blockedActive = new Set(
    histories.filter((s) => s.status === "active").map((s) => s.recipient_email.toLowerCase())
  );
  const blockedRecent = new Set(
    histories
      .filter((s) => s.status !== "active" && isRecentDrip(s, cutoff))
      .map((s) => s.recipient_email.toLowerCase())
  );

  const skippedSuppressed = leads.filter((l) => suppressed.has(l.email.toLowerCase())).length;
  const eligible = leads.filter((l) => {
    const email = l.email.toLowerCase();
    if (suppressed.has(email)) return false; // counted above
    if (blockedActive.has(email)) return false; // counted below
    return !blockedRecent.has(email);
  });
  const skippedActive = leads.filter((l) => {
    const email = l.email.toLowerCase();
    return !suppressed.has(email) && blockedActive.has(email);
  }).length;
  const skippedRecent = leads.filter((l) => {
    const email = l.email.toLowerCase();
    return !suppressed.has(email) && !blockedActive.has(email) && blockedRecent.has(email);
  }).length;

  if (eligible.length === 0) {
    return { ...empty, skippedActive, skippedRecent, skippedSuppressed };
  }

  // Reserve room for sequences queued by earlier runs, then assign slots.
  const slots = computeSendSlots(new Date(), (pendingRes.data ?? []).length, eligible.length);

  const failures: string[] = [];
  let queued = 0;
  for (const [i, lead] of eligible.entries()) {
    try {
      const kind = leadKind(lead.kind);
      const seqKind: "person" | "org" = kind === "org" ? "org" : "person";
      const sequence = await beginSequence(supabase, user, {
        kind: seqKind,
        email: lead.email,
        name: kind === "individual" ? lead.contact_name ?? lead.name : lead.contact_name,
        orgName: kind === "org" ? lead.name : null,
        contactName: lead.contact_name,
        faith: lead.faith,
      });
      await supabase
        .from("marketing_sequences")
        .update({ next_run_at: slots[i].toISOString() })
        .eq("id", sequence.id);
      await supabase
        .from("marketing_leads")
        .update({ status: "drip", last_contacted_at: new Date().toISOString() })
        .eq("id", lead.id);
      queued += 1;
    } catch (err) {
      failures.push(`${lead.email}: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  await auditEvent(supabase, user.id, {
    action: "marketing.lead_drip_batch",
    targetType: "lead",
    targetId: `${queued} leads`,
    detail: {
      requested: leadIds.length,
      queued,
      skippedActive,
      skippedRecent,
      skippedSuppressed,
      firstSendAt: slots[0]?.toISOString() ?? null,
      lastSendAt: slots[slots.length - 1]?.toISOString() ?? null,
    },
  });

  revalidatePath("/dashboard/admin/marketing");
  return {
    queued,
    skippedActive,
    skippedRecent,
    skippedSuppressed,
    failures,
    schedule: {
      perWindow: windowCapacity(),
      firstSendAt: slots[0]?.toISOString() ?? null,
      lastSendAt: slots[slots.length - 1]?.toISOString() ?? null,
    },
  };
}

/** Remove a lead. Sequences and send history are kept for the audit trail. */
export async function deleteLead(leadId: string) {
  if (!isValidUuid(leadId)) throw new Error("Invalid lead ID");
  const { supabase, user } = await requireAdmin();

  const { data: lead } = await supabase
    .from("marketing_leads")
    .select("email, name")
    .eq("id", leadId)
    .single();
  if (!lead) throw new Error("Lead not found");

  const { error } = await supabase.from("marketing_leads").delete().eq("id", leadId);
  if (error) throw new Error(error.message);

  await auditEvent(supabase, user.id, {
    action: "marketing.lead_delete",
    targetType: "lead",
    targetId: lead.email,
    detail: { name: lead.name },
  });

  revalidatePath("/dashboard/admin/marketing");
  return { success: true as const };
}

