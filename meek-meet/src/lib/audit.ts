// Audit trail helper. Every consequential admin action calls auditEvent so
// the admin_audit_log table captures who did what, to what, and when.
// Best-effort by design: an audit failure must never break the action itself.

interface SupabaseLike {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  };
}

export interface AuditEntry {
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
}

export async function auditEvent(
  supabase: SupabaseLike,
  actorId: string,
  entry: AuditEntry
): Promise<void> {
  try {
    const { error } = await supabase.from("admin_audit_log").insert({
      actor: actorId,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      detail: entry.detail ?? {},
    });
    if (error) {
      console.error("audit log write failed:", error);
    }
  } catch (err) {
    console.error("audit log write failed:", err);
  }
}
