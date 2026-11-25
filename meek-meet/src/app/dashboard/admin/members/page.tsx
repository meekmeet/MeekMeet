"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { getMembers } from "../members/actions";
import { Loader2, Search, User as UserIcon } from "lucide-react";

interface MemberEntry {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  location: string | null;
  created_at: string;
}

const roleStyles: Record<string, string> = {
  admin: "bg-wheat-pale text-wheat-dark",
  shepherd: "bg-sage/20 text-sage-dark",
  member: "bg-midnight/5 text-charcoal-muted",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (term?: string) => {
    setLoading(true);
    try {
      setMembers(await getMembers(term));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await load(search);
    });
  };

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl text-charcoal mb-2">Members</h1>
      <p className="text-sm text-charcoal-muted mb-8">
        Everyone in the Meek Meet community, newest first.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-terracotta-pale rounded-xl text-sm text-terracotta">{error}</div>
      )}

      <form onSubmit={handleSearch} className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-muted" strokeWidth={1.5} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-10 pr-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none transition-colors text-sm"
        />
      </form>

      {loading || isPending ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-charcoal-muted" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-charcoal-muted">No members found.</p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-4 bg-cream-warm rounded-2xl border border-border-soft px-5 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-midnight/5 text-charcoal-muted flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-charcoal truncate block">
                    {member.full_name ?? member.email ?? "Unnamed"}
                  </span>
                  <span className="text-xs text-charcoal-muted truncate block">
                    {member.email}
                    {member.location ? ` · ${member.location}` : ""} · joined{" "}
                    {formatDate(member.created_at)}
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  roleStyles[member.role] ?? roleStyles.member
                }`}
              >
                {member.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
