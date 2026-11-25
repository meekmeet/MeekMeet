"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { BookOpen, CheckCircle2, Download, Loader2, RefreshCw, Video } from "lucide-react";
import { getMyHandbook, saveHandbook, regenerateHandbookQuestion, type HandbookData } from "../actions";
import { HANDBOOK_INTROS, handbookComplete, formatMeetingWhen, toRoman } from "@/lib/handbook";
import { getTopicById, THRESHOLD_TOPIC } from "@meekmeet/core/questions";

function isThresholdQuestion(questionId: string): boolean {
  return THRESHOLD_TOPIC.questions.some((q) => q.id === questionId);
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
  const [redrawingId, setRedrawingId] = useState<string | null>(null);
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
              ? "Your handbook is sealed. On the night, you will read what you have written — nothing more is asked of you."
              : "Draft kept. Return any time before the circle gathers."
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

  const redraw = useCallback(
    (questionId: string) => {
      if (!handbook || redrawingId) return;
      setError(null);
      setNotice(null);
      setRedrawingId(questionId);
      startTransition(async () => {
        try {
          // Persist current writing first so no draft is lost in the swap.
          const current = handbook.responses.map((r) => ({
            ...r,
            answer: answers[r.question_id] ?? "",
          }));
          await saveHandbook(meetingId, current, intentions, false);
          const result = await regenerateHandbookQuestion(meetingId, questionId);
          setHandbook({ ...handbook, responses: result.responses });
          const map: Record<string, string> = {};
          for (const r of result.responses) map[r.question_id] = r.answer;
          setAnswers(map);
          setNotice("The lot has fallen again — a new question from the same bank. The one you returned is noted; it teaches us which questions fit.");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to draw a new question");
        } finally {
          setRedrawingId(null);
        }
      });
    },
    [handbook, answers, intentions, meetingId, redrawingId]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-charcoal-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Unsealing your handbook…
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
  const topic = handbook.topic_id ? getTopicById(handbook.topic_id) : null;
  const answeredCount = handbook.responses.filter(
    (r) => (answers[r.question_id] ?? "").trim().length > 0
  ).length;
  const totalCount = handbook.responses.length;
  const allAnswered = handbookComplete(
    handbook.responses.map((r) => ({ ...r, answer: answers[r.question_id] ?? "" }))
  );

  return (
    <div className="max-w-2xl">
      {/* The chapter plate */}
      <div className="text-center mb-10">
        <p className="text-xs tracking-[0.35em] uppercase text-terracotta mb-3 font-medium">
          {handbook.variant === "first_circle" ? "The first handbook" : "The handbook"}
        </p>
        <h1 className="font-serif text-4xl text-charcoal mb-3 leading-tight">
          {handbook.meeting.circle_name}
        </h1>
        <p className="text-xs tracking-[0.25em] uppercase text-charcoal-muted">
          {formatMeetingWhen(handbook.meeting.scheduled_at)}
        </p>
        <div className="flex items-center justify-center gap-4 mt-6">
          <span className="h-px w-16 bg-border-warm" />
          <span className="font-serif text-terracotta tracking-[0.3em] text-sm">
            {toRoman(totalCount)}
          </span>
          <span className="h-px w-16 bg-border-warm" />
        </div>
      </div>

      {handbook.meeting.join_url && (
        <div className="text-center mb-8">
          <a
            href={handbook.meeting.join_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-midnight text-cream rounded-full text-sm tracking-wide hover:bg-midnight-soft transition-colors"
          >
            <Video className="w-4 h-4" strokeWidth={1.5} />
            The way in — join the circle online
          </a>
        </div>
      )}

      {/* The theme — revealed here, never in the email */}
      {topic && (
        <div className="bg-parchment border border-border-warm rounded-2xl p-7 mb-8 text-center">
          <p className="text-xs tracking-[0.25em] uppercase text-terracotta mb-2 font-medium">
            The theme of the night
          </p>
          <h2 className="font-serif text-2xl text-charcoal mb-1">
            {topic.name}
          </h2>
          <p className="font-serif italic text-charcoal-muted mb-4">{topic.epithet}</p>
          <p className="text-sm text-charcoal-muted leading-relaxed">{topic.symbolism}</p>
          <p className="text-xs text-charcoal-muted leading-relaxed mt-4 border-t border-border-warm pt-4">
            Every circle gathering on this day, across the country, sits with this theme.
            Your questions were drawn from it by lot — if one does not fit, draw again.
            The theme stays; the question changes.
          </p>
        </div>
      )}

      {/* The law */}
      <p className="text-center font-serif italic text-charcoal text-lg leading-relaxed mb-10 max-w-xl mx-auto">
        Answer in writing before you arrive. In the room, you read what you
        wrote — no one will ask you to think on the spot.
      </p>

      {notice && (
        <div className="mb-6 p-4 bg-sage/15 rounded-xl text-sm text-sage-dark text-center">{notice}</div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-terracotta-pale rounded-xl text-sm text-terracotta">{error}</div>
      )}

      {/* The introduction rite */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-4 h-4 text-terracotta" strokeWidth={1.5} />
          <h2 className="font-serif text-xl text-charcoal">{intro.title}</h2>
        </div>
        <p className="text-sm text-charcoal-muted leading-relaxed mb-4">{intro.guidance}</p>
      </section>

      {/* The questions */}
      <section className="space-y-10 mb-12">
        {handbook.responses.map((r, i) => {
          const threshold = isThresholdQuestion(r.question_id);
          const redrawable =
            threshold || (topic && topic.questions.some((q) => q.id === r.question_id));
          return (
            <div key={r.question_id}>
              {threshold && (
                <p className="text-xs tracking-[0.3em] uppercase text-terracotta mb-2 font-medium">
                  The threshold — one question, every circle, the same night
                </p>
              )}
              <div className="flex items-start justify-between gap-4 mb-3">
                <label
                  htmlFor={`q-${r.question_id}`}
                  className="block font-serif text-lg text-charcoal leading-snug"
                >
                  <span className="text-terracotta mr-3 tracking-widest">{toRoman(i + 1)}.</span>
                  {r.question}
                </label>
                {redrawable ? (
                  <button
                    type="button"
                    onClick={() => redraw(r.question_id)}
                    disabled={isPending || redrawingId !== null}
                    title="Let the lot fall again within the same bank"
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-warm rounded-full text-xs text-charcoal-muted hover:text-charcoal hover:bg-parchment transition-colors disabled:opacity-50"
                  >
                    {redrawingId === r.question_id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
                    )}
                    Draw again
                  </button>
                ) : null}
              </div>
              <textarea
                id={`q-${r.question_id}`}
                value={answers[r.question_id] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [r.question_id]: e.target.value }))
                }
                rows={4}
                maxLength={4000}
                placeholder="Write what is true. Take your time."
                className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-[15px] font-serif text-charcoal leading-relaxed focus:outline-none focus:ring-2 focus:ring-terracotta/30 resize-y"
              />
            </div>
          );
        })}
      </section>

      {/* Intentions */}
      <section className="mb-12">
        <h2 className="font-serif text-xl text-charcoal mb-1">What the leader should carry</h2>
        <p className="text-sm text-charcoal-muted leading-relaxed mb-4">
          An intention, a concern, a hope for the circle — anything you want carried
          into the room ahead of you. Optional.
        </p>
        <textarea
          value={intentions}
          onChange={(e) => setIntentions(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Optional."
          className="w-full bg-white border border-border-warm rounded-xl px-4 py-3 text-[15px] font-serif text-charcoal leading-relaxed focus:outline-none focus:ring-2 focus:ring-terracotta/30 resize-y"
        />
      </section>

      {/* The sealing */}
      <div className="border-t border-border-warm pt-8">
        <p className="text-center text-xs tracking-[0.25em] uppercase text-charcoal-muted mb-6">
          {toRoman(answeredCount)} of {toRoman(totalCount)} written
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => save(false)}
            disabled={isPending}
            className="px-6 py-3 border border-border-warm rounded-full text-sm text-charcoal hover:bg-parchment transition-colors disabled:opacity-50"
          >
            {isPending ? "Keeping…" : "Keep draft"}
          </button>
          <button
            onClick={() => save(true)}
            disabled={isPending || !allAnswered}
            title={allAnswered ? undefined : "Write every answer first"}
            className="inline-flex items-center gap-2 px-6 py-3 bg-midnight text-cream rounded-full text-sm tracking-wide hover:bg-midnight-soft transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
            {handbook.completed_at ? "Reseal the handbook" : "Seal your handbook"}
          </button>
          <a
            href={`/dashboard/handbook/${meetingId}/pdf`}
            className="inline-flex items-center gap-2 px-6 py-3 border border-border-warm rounded-full text-sm text-charcoal hover:bg-parchment transition-colors"
          >
            <Download className="w-4 h-4" strokeWidth={1.5} />
            Take it with you — PDF
          </a>
        </div>
        {handbook.completed_at && (
          <p className="text-center text-xs text-sage-dark mt-4">
            Sealed — you may still revise until the circle gathers.
          </p>
        )}
      </div>
    </div>
  );
}
