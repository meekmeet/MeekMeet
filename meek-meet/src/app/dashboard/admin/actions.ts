"use server";

import { createClient } from "@/lib/supabase/server";
import { getResend } from "@/lib/resend";
import { revalidatePath } from "next/cache";
import { isValidUuid, escapeHtml, assertNonEmptyString } from "@/lib/validation";
import { auditEvent } from "@/lib/audit";
import {
  normalizeAreaKey,
  suburbStatus,
  circleNameForSuburb,
  circleSlugForSuburb,
  type SuburbStatus,
} from "@/lib/circles/territory";

type AdminClient = Awaited<ReturnType<typeof createClient>>;

// ── Circle territory ───────────────────────────────────────────
// An approved leader claims their suburb. One active circle per suburb
// until it overflows (full, or enough unseated demand waiting); then a new
// leader opens the successor circle. See src/lib/circles/territory.ts.

export interface AreaStatus {
  areaKey: string;
  status: SuburbStatus;
  circles: string[];
}

/** Compute a suburb's claim status: its active circles, their seats taken,
 *  and the unseated demand waiting in the area. */
async function computeAreaStatus(
  supabase: AdminClient,
  location: string
): Promise<AreaStatus | null> {
  const areaKey = normalizeAreaKey(location);
  if (!areaKey) return null;

  const { data: suburbCircles } = await supabase
    .from("circles")
    .select("id, name")
    .eq("kind", "local")
    .eq("is_active", true)
    .eq("area_key", areaKey);

  const circles = (suburbCircles ?? []) as { id: string; name: string }[];

  const seats: { memberCount: number }[] = [];
  let seatedTotal = 0;
  for (const circle of circles) {
    const { data: meetings } = await supabase
      .from("meetings")
      .select("id")
      .eq("circle_id", circle.id)
      .eq("is_cancelled", false);
    const ids = ((meetings ?? []) as { id: string }[]).map((m) => m.id);
    let count = 0;
    if (ids.length > 0) {
      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("user_id")
        .eq("status", "going")
        .in("meeting_id", ids);
      count = new Set(((rsvps ?? []) as { user_id: string }[]).map((r) => r.user_id)).size;
    }
    seats.push({ memberCount: count });
    seatedTotal += count;
  }

  // Waiting demand: members of this suburb (member_areas) not yet seated.
  const { count: areaMembers } = await supabase
    .from("member_areas")
    .select("user_id", { count: "exact", head: true })
    .eq("area_key", areaKey);
  const waitingCount = Math.max(0, (areaMembers ?? 0) - seatedTotal);

  return {
    areaKey,
    status: suburbStatus({ circles: seats, waitingCount }),
    circles: circles.map((c) => c.name),
  };
}

export type ClaimOutcome =
  | { outcome: "created"; circleId: string; circleName: string; areaKey: string; existingCount: number }
  | { outcome: "claimed"; areaKey: string; claimingCircles: string[] }
  | { outcome: "no_location" };

/**
 * Claim the leader's suburb: create their circle when the suburb is open
 * (or has overflowed), and seat them as its lead. A claimed suburb with
 * room stays locked to its existing circle.
 */
export async function claimSuburbForLeader(
  supabase: AdminClient,
  opts: { userId: string; location: string }
): Promise<ClaimOutcome> {
  const area = await computeAreaStatus(supabase, opts.location);
  if (!area) return { outcome: "no_location" };

  if (area.status === "claimed") {
    return { outcome: "claimed", areaKey: area.areaKey, claimingCircles: area.circles };
  }

  const existingCount = area.circles.length;
  const name = circleNameForSuburb(opts.location, existingCount);
  const baseSlug = circleSlugForSuburb(opts.location, existingCount);
  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: clash } = await supabase
      .from("circles")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!clash) break;
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("circles")
    .insert({
      slug,
      name,
      description: `${name} — neighbours gathering to be heard, one honest question at a time. Every faith and none; every voice read from what it has written.`,
      location: opts.location.trim(),
      meeting_place: "Zoom",
      kind: "local",
      country_code: "WW",
      is_active: true,
      shepherd_id: opts.userId,
      area_key: area.areaKey,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "Failed to create the circle");
  }

  const { error: linkError } = await supabase
    .from("circle_shepherds")
    .insert({ circle_id: inserted.id, user_id: opts.userId, role: "lead" });
  if (linkError) throw new Error(linkError.message);

  return {
    outcome: "created",
    circleId: inserted.id as string,
    circleName: name,
    areaKey: area.areaKey,
    existingCount,
  };
}

/** Territory statuses for the applications page: one entry per suburb. */
export async function getTerritoryStatuses(
  locations: string[]
): Promise<Record<string, AreaStatus>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Not authorized");

  const out: Record<string, AreaStatus> = {};
  const seen = new Set<string>();
  for (const location of locations) {
    const key = normalizeAreaKey(location ?? "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const status = await computeAreaStatus(supabase, location);
    if (status) out[key] = status;
  }
  return out;
}

export async function getApplications(status?: "pending" | "approved" | "rejected") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");

  let query = supabase
    .from("shepherd_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function approveApplication(applicationId: string, userId: string) {
  if (!isValidUuid(applicationId)) throw new Error("Invalid application ID");
  if (!isValidUuid(userId)) throw new Error("Invalid user ID");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");

  // Atomically mark the application approved and promote the user to
  // shepherd (role changes are only allowed via this RPC).
  const { error: reviewError } = await supabase.rpc(
    "review_shepherd_application",
    { p_application_id: applicationId, p_decision: "approved" }
  );

  if (reviewError) throw new Error(reviewError.message);

  await auditEvent(supabase, user.id, {
    action: "application.approve",
    targetType: "application",
    targetId: applicationId,
  });

  // Send approval email
  const { data: application } = await supabase
    .from("shepherd_applications")
    .select("full_name, email, location")
    .eq("id", applicationId)
    .single();

  // Territory: the approved leader claims their suburb. Best-effort — the
  // approval itself has already succeeded and must not be undone by a
  // circle-creation failure.
  let circleLine = "";
  if (application?.location?.trim()) {
    try {
      const claim = await claimSuburbForLeader(supabase, {
        userId,
        location: application.location,
      });
      if (claim.outcome === "created") {
        await auditEvent(supabase, user.id, {
          action: "circle.claim",
          targetType: "circle",
          targetId: claim.circleId,
          detail: {
            area_key: claim.areaKey,
            name: claim.circleName,
            expanded: claim.existingCount > 0,
          },
        });
        circleLine = `<p style="margin: 12px 0 0;">Your circle — <strong>${escapeHtml(claim.circleName)}</strong> — is yours to keep. Schedule its first gathering from your dashboard.</p>`;
      } else if (claim.outcome === "claimed") {
        await auditEvent(supabase, user.id, {
          action: "circle.claim_deferred",
          targetType: "application",
          targetId: applicationId,
          detail: { area_key: claim.areaKey, held_by: claim.claimingCircles },
        });
        circleLine = `<p style="margin: 12px 0 0;">Your suburb is currently held by an existing circle. When it overflows, the next circle there is yours — until then, sit in their room and learn it.</p>`;
      }
    } catch (err) {
      console.error("Territory claim failed:", err);
    }
  }

  if (application?.email) {
    const safeName = escapeHtml(assertNonEmptyString(application.full_name, "Name", 100));
    try {
      await getResend().emails.send({
        from: "Meek Meet <hello@meekmeet.com>",
        to: application.email,
        subject: "Welcome, Leader — Your Application is Approved",
        html: `
          <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #faf6ee; color: #2c2c2c;">
            <h1 style="font-size: 24px; margin-bottom: 8px;">Hello ${safeName},</h1>
            <p style="font-size: 16px; line-height: 1.6;">
              It is with great joy that we welcome you as a <strong>Meek Meet Leader</strong>.
            </p>
            <div style="background: #f5efe0; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0;">Your leader dashboard is now live. You can create your first circle, set your questions, and schedule your first gathering.</p>
              ${circleLine}
            </div>
            <a href="https://meekmeet.com/dashboard/shepherd" style="display: inline-block; padding: 12px 24px; background: #1e2337; color: #faf6ee; text-decoration: none; border-radius: 24px; margin-top: 8px;">Go to Shepherd Dashboard</a>
            <hr style="border: 0; border-top: 1px solid #e8e0cc; margin: 24px 0;" />
            <p style="font-size: 12px; color: #6b6b6b;">
              Meek Meet · A warm community of faith
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error("Failed to send approval email:", err);
    }
  }

  revalidatePath("/dashboard/admin/applications");
}

export async function rejectApplication(applicationId: string) {
  if (!isValidUuid(applicationId)) throw new Error("Invalid application ID");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");

  const { error: reviewError } = await supabase.rpc(
    "review_shepherd_application",
    { p_application_id: applicationId, p_decision: "rejected" }
  );

  if (reviewError) throw new Error(reviewError.message);

  await auditEvent(supabase, user.id, {
    action: "application.reject",
    targetType: "application",
    targetId: applicationId,
  });

  // Send rejection email
  const { data: application } = await supabase
    .from("shepherd_applications")
    .select("full_name, email")
    .eq("id", applicationId)
    .single();

  if (application?.email) {
    const safeName = escapeHtml(assertNonEmptyString(application.full_name, "Name", 100));
    try {
      await getResend().emails.send({
        from: "Meek Meet <hello@meekmeet.com>",
        to: application.email,
        subject: "Update on Your Leader Application",
        html: `
          <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #faf6ee; color: #2c2c2c;">
            <h1 style="font-size: 24px; margin-bottom: 8px;">Hello ${safeName},</h1>
            <p style="font-size: 16px; line-height: 1.6;">
              Thank you for your interest in becoming a Meek Meet leader. After prayerful consideration, we are unable to move forward with your application at this time.
            </p>
            <p style="font-size: 14px; color: #6b6b6b; margin-top: 16px;">
              This does not reflect on your character or calling. We encourage you to remain connected with your local community and consider reapplying in the future.
            </p>
            <hr style="border: 0; border-top: 1px solid #e8e0cc; margin: 24px 0;" />
            <p style="font-size: 12px; color: #6b6b6b;">
              Meek Meet · A warm community of faith
            </p>
          </div>
        `,
      });
    } catch (err) {
      console.error("Failed to send rejection email:", err);
    }
  }

  revalidatePath("/dashboard/admin/applications");
}


export async function getPendingDocuments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");

  const { data, error } = await supabase
    .from("shepherd_application_documents")
    .select(`
      *,
      application:shepherd_applications(*, profile:profiles(full_name, email))
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function reviewDocument(
  documentId: string,
  decision: "verified" | "rejected"
) {
  if (!isValidUuid(documentId)) throw new Error("Invalid document ID");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("shepherd_application_documents")
    .update({
      status: decision,
      reviewed_at: now,
      reviewed_by: user.id,
    })
    .eq("id", documentId);

  if (error) throw new Error(error.message);

  await auditEvent(supabase, user.id, {
    action: "document.review",
    targetType: "document",
    targetId: documentId,
    detail: { decision },
  });

  revalidatePath("/dashboard/admin/verification");
  revalidatePath("/dashboard/admin/applications");
}

export async function getApplicationDocuments(applicationId: string) {
  if (!isValidUuid(applicationId)) throw new Error("Invalid application ID");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");

  const { data, error } = await supabase
    .from("shepherd_application_documents")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}


export async function getDocumentSignedUrl(storagePath: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");

  const { data, error } = await supabase.storage
    .from("shepherd-documents")
    .createSignedUrl(storagePath, 60 * 60); // 1 hour

  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function toggleMessageStatus(messageId: string, currentStatus: string) {
  if (!isValidUuid(messageId)) throw new Error("Invalid message ID");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");

  const resolving = currentStatus !== "resolved";

  const { error } = await supabase
    .from("admin_messages")
    .update({
      status: resolving ? "resolved" : "open",
      resolved_at: resolving ? new Date().toISOString() : null,
      resolved_by: resolving ? user.id : null,
    })
    .eq("id", messageId);

  if (error) throw new Error(error.message);

  await auditEvent(supabase, user.id, {
    action: resolving ? "message.resolve" : "message.reopen",
    targetType: "message",
    targetId: messageId,
  });

  revalidatePath("/dashboard/admin/inbox");
}
