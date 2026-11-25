"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { BookOpen, CheckCircle2, Loader2 } from "lucide-react";
import { getMyHandbook, saveHandbook, type HandbookData } from "../actions";
import { HANDBOOK_INTROS, handbookComplete } from "@/lib/handbook";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })} · ${d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`;
}

export default function HandbookPage() {
  const params = useParams<{ meetingId: string }>();
  const meetingId = params.meetingId;

  const [handbook, setHandbook] = useState<HandbookData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [intentions, setIntentions] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getMyHandbook(meetingId)
      .then((data) => {
        if (cancelled) return;
        setHandbook(data);
        const map: Record<string, string> = {};
        for (const r of data.responses) map[r.question_id] = r.answer;
        setAnswers(map);
        setIntentions(data.intentions ?? "");
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load your handbook");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  const save = useCallback(
    (complete: boolean) => {
      if (!handbook) return;
      setError(null);
      setNotice(null);
      const responses = handbook.responses.map((r) => ({
        ...r,
        answer: answers[r.question_id] ?? "",
      }));
      startTransition(async () => {
        try {
          const result = await saveHandbook(meetingId, responses, intentions, complete);
          setNotice(
            result.completed
              ? "Your handbook is complete. On the night, you'll read what you've written — nothing more is asked of you."
              : "Draft saved. Come back any time before the circle gathers."
          );
          setHandbook({
            ...handbook,
            responses,
            intentions,
            completed_at: result.completed ? new Date().toISOString() : null,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to save");
        }
      });
    },
    [handbook, answers, intentions, meetingId]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-charcoal-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Opening your handbook…
      </div>
    );
  }

  if (error && !handbook) {
    return (
      <div className="max-w-2xl">
        <div className="p-4 bg-terracotta-pale rounded-xl text-sm text-terracotta">{error}</div>
      </div>
    );
  }

  if (!handbook) return null;

  const intro = HANDBOOK_INTROS[handbook.variant];
  const allAnswered = handbookComplete(
    handbook.responses.map((r) => ({ ...r, answer: answers[r.question_id] ?? "" }))
  );

  return (
    <div className="max-w-2xl">
      <span className="text-xs tracking-[0.3em] uppercase text-terracotta mb-2 block font-medium">
        {handbook.variant === "first_circle" ? "Your first circle" : "Your circle handbook"}
      </span>
      <h1 className="font-serif text-3xl text-charcoal mb-2">
        {handbook.meeting.circle_name}
      </h1>
      <p className="text-sm text-charcoal-muted mb-8">
        {formatWhen(handbook.meeting.scheduled_at)}
        {handbook.meeting.location_name ? ` · ${handbook.meeting.location_name}` : ""}
      </p>

      <div className="bg-parchment border border-border-warm rounded-2xl p-6 mb-8">
        <p className="text-sm leading-relaxed text-charcoal">
          This is the whole of the session. Answer each question in writing, in
          your own time — when the circle gathers, you will read what you have
          already thought through. No one will ask you to think on the spot.
        </p>
      </div>

      {notice && (
        <div className="mb-6 p-4 bg-sage/15 rounded-xl text-sm text-sage-dark">{notice}</div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-terracotta-pale rounded-xl text-sm text-terracotta">{error}</div>
      )}

      <section className="mb-10">
        <h2 className="font-serif text-xl text-charcoal mb-1 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-terracotta" strokeWidth={1.5} />
          {intro.title}
        </h2>
        <p className="text-sm text-charcoal-muted leading-relaxed mb-4">{intro.guidance}</p>
      </section>

      <section className="space-y-8 mb-10">
        {handbook.responses.map((r, i) => (
          <div key={r.question_id}>
            <label
              htmlFor={`q-${r.question_id}`}
              className="block font-serif text-lg text-charcoal leading-snug mb-3"
            >
              <span className="text-terracotta mr-2">{i + 1}.</span>
              {r.question}
            </label>
            <textarea
              id={`q-${r.question_id}`}
              value={answers[r.question_id] ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [r.question_id]: e.target.value }))
              }
              rows={4}
              maxLength={4000}
              placeholder="Write what is true. Take your time."
              className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-sm text-charcoal leading-relaxed focus:outline-none focus:ring-2 focus:ring-terracotta/30 resize-y"
            />
          </div>
        ))}
      </section>

      <section className="mb-10">
        <h2 className="font-serif text-xl text-charcoal mb-1">Intentions &amp; notes</h2>
        <p className="text-sm text-charcoal-muted leading-relaxed mb-4">
          Anything you want the leader to carry — an intention, a concern, a
          hope for the circle. Optional.
        </p>
        <textarea
          value={intentions}
          onChange={(e) => setIntentions(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Optional."
          className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-sm text-charcoal leading-relaxed focus:outline-none focus:ring-2 focus:ring-terracotta/30 resize-y"
        />
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={() => save(false)}
          disabled={isPending}
          className="px-6 py-3 border border-border-warm rounded-full text-sm text-charcoal hover:bg-parchment transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save draft"}
        </button>
        <button
          onClick={() => save(true)}
          disabled={isPending || !allAnswered}
          title={allAnswered ? undefined : "Answer every question first"}
          className="inline-flex items-center gap-2 px-6 py-3 bg-midnight text-cream rounded-full text-sm tracking-wide hover:bg-midnight-soft transition-colors disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
          {handbook.completed_at ? "Update completed handbook" : "Mark complete"}
        </button>
        {handbook.completed_at && (
          <span className="text-xs text-sage-dark">Completed — you can still revise until the circle gathers.</span>
        )}
      </div>
    </div>
  );
}
