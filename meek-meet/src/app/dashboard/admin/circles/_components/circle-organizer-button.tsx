"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";

type OrganizerResult = {
  created: { area: string; member_count: number; slug: string }[];
  below_threshold: { area: string; member_count: number }[];
  errors?: string[];
};

export default function CircleOrganizerButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<OrganizerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <button
        onClick={() =>
          startTransition(async () => {
            setError(null);
            setResult(null);
            try {
              const res = await fetch("/api/circle-organizer", { method: "POST" });
              const data = (await res.json()) as OrganizerResult & { error?: string };
              if (!res.ok) {
                setError(data.error ?? `Request failed (${res.status})`);
              } else {
                setResult(data);
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : "Request failed");
            }
          })
        }
        disabled={isPending}
        className="px-5 py-2.5 rounded-full text-sm font-medium bg-midnight text-cream hover:bg-midnight-soft transition-all flex items-center gap-2 disabled:opacity-60"
      >
        {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />}
        <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
        Run circle organizer
      </button>

      {error && (
        <p className="text-sm text-terracotta">Organizer failed: {error}</p>
      )}

      {result && (
        <div className="bg-cream-warm rounded-2xl border border-border-soft p-6 space-y-3 text-sm">
          <p className="font-medium text-charcoal">
            Organizer run complete — {result.created.length}{" "}
            {result.created.length === 1 ? "circle" : "circles"} created.
          </p>

          {result.created.length > 0 && (
            <ul className="space-y-1 text-charcoal">
              {result.created.map((c) => (
                <li key={c.slug}>
                  <span className="font-medium">{c.area}</span> — {c.member_count} members
                  → <span className="text-charcoal-muted">/circles/{c.slug}</span>
                </li>
              ))}
            </ul>
          )}

          {result.below_threshold.length > 0 && (
            <div className="text-charcoal-muted">
              <p>Below the 8-member threshold (not created yet):</p>
              <ul className="space-y-1 mt-1">
                {result.below_threshold.map((b) => (
                  <li key={b.area}>
                    {b.area} — {b.member_count}{" "}
                    {b.member_count === 1 ? "member" : "members"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <p className="text-terracotta">
              {result.errors.length}{" "}
              {result.errors.length === 1 ? "area" : "areas"} failed:{" "}
              {result.errors.join("; ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
