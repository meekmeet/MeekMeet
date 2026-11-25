"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  getAdminRoster,
  inviteAdmin,
  revokeAdmin,
  revokeAdminInvite,
  getAuditLog,
  type AdminRosterEntry,
  type AdminInviteEntry,
} from "./actions";
import { Crown, Loader2, Mail, Plus, ScrollText, ShieldCheck, Trash2, UserPlus } from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminRosterEntry[]>([]);
  const [invites, setInvites] = useState<AdminInviteEntry[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, log] = await Promise.all([getAdminRoster(), getAuditLog()]);
      setAdmins(data.admins);
      setInvites(data.invites);
      setAudit(log);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const outcome = await inviteAdmin(email);
        setNotice(
          outcome === "invited"
            ? `Invitation sent to ${email}. They'll become an admin when they sign in.`
            : `${email} already had an account — admin access granted immediately.`
        );
        setEmail("");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send invite");
      }
    });
  };

  const handleRevokeAdmin = (admin: AdminRosterEntry) => {
    if (admin.is_master) return;
    if (!window.confirm(`Revoke admin access for ${admin.email ?? admin.full_name ?? "this user"}?`)) {
      return;
    }
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await revokeAdmin(admin.id);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to revoke admin");
      }
    });
  };

  const handleRevokeInvite = (invite: AdminInviteEntry) => {
    if (!window.confirm(`Cancel the pending invite for ${invite.email}?`)) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await revokeAdminInvite(invite.id);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to revoke invite");
      }
    });
  };

  const pendingInvites = invites.filter((i) => i.status === "pending");
  const pastInvites = invites.filter((i) => i.status !== "pending");

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl text-charcoal mb-2">Admins</h1>
      <p className="text-sm text-charcoal-muted mb-8">
        Invite trusted leaders to share the admin area. Invited admins have the
        same powers as you — reviewing applications, verifying documents, and
        tending circles. Only you can invite or revoke admins.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-terracotta-pale rounded-xl text-sm text-terracotta flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-6 p-4 bg-sage/20 rounded-xl text-sm text-charcoal flex items-center gap-2">
          <UserPlus className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          {notice}
        </div>
      )}

      <form
        onSubmit={handleInvite}
        className="bg-cream-warm rounded-3xl border border-border-soft p-6 mb-10"
      >
        <label className="text-sm text-charcoal-light font-medium block mb-2">
          Invite an admin
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted" strokeWidth={1.5} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="their@email.com"
              className="w-full pl-10 pr-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none transition-colors text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-3 bg-midnight text-cream rounded-full text-sm font-medium tracking-wide hover:bg-midnight-soft transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" strokeWidth={1.5} />
            )}
            Send invite
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-charcoal-muted" />
        </div>
      ) : (
        <>
          <h2 className="font-serif text-xl text-charcoal mb-4">Current admins</h2>
          <div className="space-y-3 mb-10">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between gap-4 bg-cream-warm rounded-2xl border border-border-soft px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {admin.is_master && (
                      <Crown className="w-4 h-4 text-wheat-dark shrink-0" strokeWidth={1.5} />
                    )}
                    <span className="text-sm font-medium text-charcoal truncate">
                      {admin.full_name ?? admin.email ?? "Admin"}
                    </span>
                    {admin.is_master && (
                      <span className="text-[10px] uppercase tracking-wider bg-wheat-pale text-wheat-dark px-2 py-0.5 rounded-full">
                        Master
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-charcoal-muted mt-0.5 truncate">
                    {admin.email} ·{" "}
                    {admin.is_master
                      ? `member since ${formatDate(admin.created_at)}`
                      : admin.admin_since
                      ? `admin since ${formatDate(admin.admin_since)}`
                      : `member since ${formatDate(admin.created_at)}`}
                  </div>
                </div>
                {!admin.is_master && (
                  <button
                    onClick={() => handleRevokeAdmin(admin)}
                    disabled={isPending}
                    className="text-xs text-terracotta hover:text-terracotta/80 transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>

          {pendingInvites.length > 0 && (
            <>
              <h2 className="font-serif text-xl text-charcoal mb-4">Pending invites</h2>
              <div className="space-y-3 mb-10">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-4 bg-cream-warm rounded-2xl border border-border-soft px-5 py-4"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-charcoal truncate block">
                        {invite.email}
                      </span>
                      <span className="text-xs text-charcoal-muted mt-0.5 block">
                        invite sent {formatDate(invite.email_sent_at ?? invite.created_at)} · becomes an admin when they sign in
                      </span>
                    </div>
                    <button
                      onClick={() => handleRevokeInvite(invite)}
                      disabled={isPending}
                      className="text-xs text-charcoal-muted hover:text-terracotta transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {pastInvites.length > 0 && (
            <>
              <h2 className="font-serif text-xl text-charcoal mb-4">Invite history</h2>
              <div className="space-y-2">
                {pastInvites.slice(0, 10).map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-4 px-5 py-3 text-xs text-charcoal-muted"
                  >
                    <span className="truncate">{invite.email}</span>
                    <span className="shrink-0 capitalize">
                      {invite.status} · {formatDate(invite.accepted_at ?? invite.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <h2 className="font-serif text-xl text-charcoal mt-12 mb-4 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-charcoal-muted" strokeWidth={1.5} />
            Audit log
          </h2>
          <p className="text-xs text-charcoal-muted mb-4">
            Every consequential admin action — invites, revocations, application and
            document reviews, marketing sends, authority changes — most recent first.
          </p>
          {audit.length === 0 ? (
            <p className="text-sm text-charcoal-muted">No admin actions recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {audit.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-4 bg-cream-warm rounded-2xl border border-border-soft px-5 py-3"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-charcoal">
                      {entry.action}
                      {entry.target_id ? (
                        <span className="text-charcoal-muted font-normal"> → {entry.target_id}</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-charcoal-muted block mt-0.5">
                      {entry.actor_email ?? "unknown"} ·{" "}
                      {new Date(entry.created_at).toLocaleString("en-AU", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    {Object.keys(entry.detail).length > 0 && (
                      <span className="text-[11px] text-charcoal-muted/80 block mt-0.5 font-mono truncate">
                        {JSON.stringify(entry.detail)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
