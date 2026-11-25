"use server";

import { createClient } from "@/lib/supabase/server";
import { getResend } from "@/lib/resend";
import { revalidatePath } from "next/cache";
import {
  isValidEmail,
  isValidUuid,
  assertNonEmptyString,
} from "@/lib/validation";
import { isMasterEmail } from "@/lib/master-admin";
import { auditEvent } from "@/lib/audit";
import {
  buildAdminInviteEmail,
  buildAdminGrantedEmail,
  ADMIN_EMAIL_FROM,
} from "@/lib/emails/admin-invite";

export interface AdminRosterEntry {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  is_master: boolean;
  /** When their admin invitation was accepted (null for the bootstrap admin). */
  admin_since: string | null;
}

export interface AdminInviteEntry {
  id: string;
  email: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  email_sent_at: string | null;
}

async function requireMaster() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" || !isMasterEmail(profile?.email)) {
    throw new Error("Only the master admin can manage admins");
  }

  return { supabase, user, profile };
}

export async function getAdminRoster(): Promise<{
  admins: AdminRosterEntry[];
  invites: AdminInviteEntry[];
}> {
  const { supabase } = await requireMaster();

  const { data: admins, error: adminsError } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  if (adminsError) throw new Error(adminsError.message);

  const { data: invites, error: invitesError } = await supabase.rpc(
    "get_admin_invites"
  );
  if (invitesError) throw new Error(invitesError.message);

  const inviteList = (invites ?? []) as AdminInviteEntry[];

  return {
    admins: (admins ?? []).map((a) => {
      const accepted = inviteList.find(
        (i) => i.email === a.email && i.status === "accepted"
      );
      return {
        ...a,
        is_master: isMasterEmail(a.email),
        admin_since: accepted?.accepted_at ?? null,
      };
    }),
    invites: inviteList,
  };
}

/**
 * Invite a new admin. The database RPC enforces master-only access and
 * returns 'invited' (pending — email sent) or 'promoted' (existing user
 * granted admin immediately). Invited admins have the same powers as the
 * master; only inviting/revoking is master-only.
 */
export async function inviteAdmin(email: string): Promise<"invited" | "promoted"> {
  const safeEmail = assertNonEmptyString(email, "Email", 255);
  if (!isValidEmail(safeEmail)) throw new Error("Invalid email address");

  const { supabase, user, profile } = await requireMaster();

  const { data: outcome, error } = await supabase.rpc("invite_admin", {
    p_email: safeEmail,
  });
  if (error) throw new Error(error.message);
  if (outcome !== "invited" && outcome !== "promoted") {
    throw new Error("Unexpected invite result");
  }

  await auditEvent(supabase, user.id, {
    action: "admin.invite",
    targetType: "profile",
    targetId: safeEmail,
    detail: { outcome },
  });

  const inviterName =
    profile.full_name?.trim() || profile.email || "The Meek Meet team";
  const template =
    outcome === "invited"
      ? buildAdminInviteEmail({ inviterName, invitedEmail: safeEmail })
      : buildAdminGrantedEmail({ invitedEmail: safeEmail });

  try {
    await getResend().emails.send({
      from: ADMIN_EMAIL_FROM,
      to: safeEmail,
      subject: template.subject,
      html: template.html,
    });
    await supabase.rpc("record_admin_invite_email_sent", {
      p_email: safeEmail,
    });
  } catch (err) {
    // The invite/promotion is already recorded; a failed email must not roll
    // it back. Log so the master can re-send by inviting again.
    console.error("Failed to send admin invite email:", err);
  }

  revalidatePath("/dashboard/admin/admins");
  return outcome;
}

export async function revokeAdmin(userId: string) {
  if (!isValidUuid(userId)) throw new Error("Invalid user ID");

  const { supabase, user } = await requireMaster();

  const { error } = await supabase.rpc("revoke_admin", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);

  await auditEvent(supabase, user.id, {
    action: "admin.revoke",
    targetType: "profile",
    targetId: userId,
  });

  revalidatePath("/dashboard/admin/admins");
}

export async function getAuditLog(): Promise<
  {
    id: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    detail: Record<string, unknown>;
    created_at: string;
    actor_id: string | null;
    actor_email: string | null;
  }[]
> {
  const { supabase } = await requireMaster();

  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("id, action, target_type, target_id, detail, created_at, actor")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor).filter(Boolean))
  ) as string[];

  let emailById: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", actorIds);
    emailById = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.email])
    );
  }

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    target_type: r.target_type,
    target_id: r.target_id,
    detail: r.detail ?? {},
    created_at: r.created_at,
    actor_id: r.actor,
    actor_email: r.actor ? (emailById[r.actor] ?? null) : null,
  }));
}

export async function revokeAdminInvite(inviteId: string) {
  if (!isValidUuid(inviteId)) throw new Error("Invalid invite ID");

  const { supabase, user } = await requireMaster();

  const { error } = await supabase.rpc("revoke_admin_invite", {
    p_invite_id: inviteId,
  });
  if (error) throw new Error(error.message);

  await auditEvent(supabase, user.id, {
    action: "admin.invite_revoke",
    targetType: "admin_invite",
    targetId: inviteId,
  });

  revalidatePath("/dashboard/admin/admins");
}
