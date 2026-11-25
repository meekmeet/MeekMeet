"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  UserCheck,
  UserX,
  Video,
} from "lucide-react";
import { getLeaderRoomData, markRsvpAttendance, type LeaderRoomData, type LeaderRoomMember } from "./actions";
import {
  LEADER_OPENING_WORDS,
  LEADER_CLOSING_WORDS,
  LEADER_RUN_SHEET,
} from "@/lib/handbook";
import { getTopicForDate } from "@meekmeet/core/questions";

interface Props {
  params: Promise<{ circleId: string; meetingId: string }>;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })} · ${d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`;
}

function MemberRow({
  member,
  onMark,
  marking,
}: {
  member: LeaderRoomMember;
  onMark: (rsvpId: string, attendance: "attended" | "absent" | null) => void;
  marking: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-cream-warm rounded-xl border border-border-soft p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-charcoal">{member.name}</p>
          <p className="text-xs text-charcoal-muted mt-0.5">
            {member.handbook
              ? `${member.handbook.variant === "first_circle" ? "First circle" : "Returning"} · handbook ${member.handbook.completed ? "completed" : "in progress"}`
              : "No handbook yet"}
            {member.status === "maybe" ? " · RSVP: maybe" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMark(member.rsvpId, member.attendance === "attended" ? null : "attended")}
            disabled={marking}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors disabled:opacity-50 ${
              member.attendance === "attended"
                ? "bg-sage/20 border-sage text-sage-dark"
                : "border-border-soft text-charcoal-muted hover:text-charcoal"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
            Attended
          </button>
          <button
            onClick={() => onMark(member.rsvpId, member.attendance === "absent" ? null : "absent")}
            disabled={marking}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors disabled:opacity-50 ${
              member.attendance === "absent"
                ? "bg-terracotta-pale border-terracotta text-terracotta"
                : "border-border-soft text-charcoal-muted hover:text-charcoal"
            }`}
          >
            <UserX className="w-3.5 h-3.5" strokeWidth={1.5} />
            Absent
          </button>
          {member.handbook && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-border-soft text-charcoal-muted hover:text-charcoal transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {expanded && member.handbook && (
        <div className="mt-4 pt-4 border-t border-border-soft space-y-4">
          {member.handbook.responses.map((r, i) => (
            <div key={r.question_id}>
              <p className="font-serif text-sm text-charcoal leading-snug mb-1">
                <span className="text-terracotta mr-1.5">{i + 1}.</span>
                {r.question}
              </p>
              <p className="text-sm text-charcoal-muted leading-relaxed whitespace-pre-wrap pl-5">
                {r.answer.trim() || <em className="text-faint">Not yet answered.</em>}
              </p>
            </div>
          ))}
          {member.handbook.intentions?.trim() && (
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-terracotta mb-1 font-medium">
                Intentions &amp; notes
              </p>
              <p className="text-sm text-charcoal-muted leading-relaxed whitespace-pre-wrap">
                {member.handbook.intentions}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LeaderRoomPage({ params }: Props) {
  const [ids, setIds] = useState<{ circleId: string; meetingId: string } | null>(null);
  const [data, setData] = useState<LeaderRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    params.then((p) => setIds(p));
  }, [params]);

  const load = useCallback(async (circleId: string, meetingId: string) => {
    try {
      const room = await getLeaderRoomData(circleId, meetingId);
      setData(room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the leader room");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ids) return;
    void Promise.resolve().then(() => load(ids.circleId, ids.meetingId));
  }, [ids, load]);

  const handleMark = useCallback(
    (rsvpId: string, attendance: "attended" | "absent" | null) => {
      if (!ids || !data) return;
      setError(null);
      // Optimistic: reflect the mark immediately, reload on failure.
      setData({
        ...data,
        roster: data.roster.map((m) => (m.rsvpId === rsvpId ? { ...m, attendance } : m)),
      });
      startTransition(async () => {
        try {
          await markRsvpAttendance(rsvpId, attendance);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to mark attendance");
          await load(ids.circleId, ids.meetingId);
        }
      });
    },
    [ids, data, load]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-charcoal-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Opening the leader room…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-3xl">
        <div className="p-4 bg-terracotta-pale rounded-xl text-sm text-terracotta">
          {error ?? "The leader room could not be opened."}
        </div>
      </div>
    );
  }

  const { meeting, roster } = data;
  const topic = getTopicForDate(new Date(meeting.scheduled_at));
  const online = meeting.meeting_type === "digital" || meeting.meeting_type === "hybrid";
  const markedCount = roster.filter((m) => m.attendance !== null).length;

  return (
    <div className="max-w-3xl">
      <span className="text-xs tracking-[0.3em] uppercase text-terracotta mb-2 block font-medium">
        The leader room
      </span>
      <h1 className="font-serif text-3xl text-charcoal mb-2">{meeting.circle_name}</h1>
      <div className="flex flex-wrap gap-4 text-sm text-charcoal-muted mb-6">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-terracotta" strokeWidth={1.5} />
          {formatWhen(meeting.scheduled_at)}
        </span>
        {meeting.location_name && (
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-sage" strokeWidth={1.5} />
            {meeting.location_name}
          </span>
        )}
        {online && meeting.join_url && (
          <a
            href={meeting.join_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-midnight hover:text-terracotta transition-colors"
          >
            <Video className="w-3.5 h-3.5" strokeWidth={1.5} />
            Open the online room
          </a>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-terracotta-pale rounded-xl text-terracotta text-sm">{error}</div>
      )}

      {/* Tonight's theme */}
      <div className="bg-parchment border border-border-warm rounded-2xl p-6 mb-8">
        <p className="text-xs tracking-[0.25em] uppercase text-terracotta mb-1 font-medium">
          Tonight&rsquo;s theme
        </p>
        <h2 className="font-serif text-xl text-charcoal mb-1">
          {topic.name} <span className="text-charcoal-muted text-base">— {topic.epithet}</span>
        </h2>
        <p className="text-sm text-charcoal-muted leading-relaxed">{topic.symbolism}</p>
        <p className="text-xs text-charcoal-muted leading-relaxed mt-3 border-t border-border-warm pt-3">
          Every circle gathering on this weekday, across the country, sits with this theme.
          Each member drew their own questions from it by lot — no two handbooks in your
          room are the same.
        </p>
      </div>

      {/* The run sheet */}
      <div className="bg-cream-warm rounded-2xl border border-border-soft p-6 mb-8">
        <h2 className="font-serif text-xl text-charcoal mb-4">The shape of the night</h2>
        <ol className="space-y-4 mb-6">
          {LEADER_RUN_SHEET.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-wheat/40 text-charcoal text-xs font-serif flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-charcoal">{step.title}</p>
                <p className="text-sm text-charcoal-muted leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="space-y-4">
          <div className="border-l-2 border-wheat pl-4">
            <p className="text-xs tracking-[0.2em] uppercase text-terracotta mb-1 font-medium">
              The opening words
            </p>
            <p className="font-serif italic text-sm text-charcoal leading-relaxed">
              &ldquo;{LEADER_OPENING_WORDS}&rdquo;
            </p>
          </div>
          <div className="border-l-2 border-wheat pl-4">
            <p className="text-xs tracking-[0.2em] uppercase text-terracotta mb-1 font-medium">
              The closing words
            </p>
            <p className="font-serif italic text-sm text-charcoal leading-relaxed">
              &ldquo;{LEADER_CLOSING_WORDS}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* The roster */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl text-charcoal">The roster</h2>
        <span className="text-xs text-charcoal-muted">
          {markedCount} of {roster.length} marked
        </span>
      </div>
      <p className="text-sm text-charcoal-muted leading-relaxed mb-4">
        Tick who attends and who does not — during the night or after it. Expand a member
        to read their completed handbook before you call on them.
      </p>
      <div className="space-y-3">
        {roster.map((member) => (
          <MemberRow key={member.rsvpId} member={member} onMark={handleMark} marking={isPending} />
        ))}
        {roster.length === 0 && (
          <div className="text-center py-12 bg-cream-warm rounded-xl border border-border-soft">
            <p className="text-charcoal-muted">No reservations yet.</p>
          </div>
        )}
      </div>

      {meeting.notes && (
        <div className="mt-8 bg-cream-warm rounded-xl border border-border-soft p-5">
          <p className="text-xs tracking-[0.2em] uppercase text-terracotta mb-1 font-medium">
            Your notes for the night
          </p>
          <p className="text-sm text-charcoal-muted leading-relaxed whitespace-pre-wrap">
            {meeting.notes}
          </p>
        </div>
      )}

      <div className="mt-8 flex items-center gap-2 text-xs text-charcoal-muted">
        <Check className="w-3.5 h-3.5 text-sage" strokeWidth={1.5} />
        The session has no set time. It runs until everyone is heard — you keep the order,
        never the clock.
      </div>
    </div>
  );
}
