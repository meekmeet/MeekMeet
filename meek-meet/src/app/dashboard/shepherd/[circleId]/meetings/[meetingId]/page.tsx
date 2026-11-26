"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Dices,
  DoorOpen,
  GraduationCap,
  Loader2,
  MapPin,
  Send,
  Settings2,
  UserCheck,
  UserX,
  Video,
} from "lucide-react";
import {
  getLeaderRoomData,
  markRsvpAttendance,
  notifyMembersOfJoinDetails,
  updateMeetingAccess,
  type LeaderRoomData,
  type LeaderRoomMember,
} from "./actions";
import { updateCircle } from "../../actions";
import {
  LEADER_OPENING_WORDS,
  LEADER_CLOSING_WORDS,
  LEADER_RUN_SHEET,
  HANDBOOK_SEAL_RULE,
  isHandbookSealed,
  toRoman,
} from "@/lib/handbook";
import { LEADER_GUIDE, LEADER_GUIDE_INTRO } from "@/lib/leader-guide";
import { getTopicForDate, THRESHOLD_TOPIC } from "@meekmeet/core/questions";

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
  sealed,
  onMark,
  marking,
}: {
  member: LeaderRoomMember;
  sealed: boolean;
  onMark: (rsvpId: string, attendance: "attended" | "absent" | null) => void;
  marking: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const handbookStatus = member.handbook
    ? member.handbook.completed
      ? "handbook sealed"
      : sealed
        ? "handbook unsealed — the door closed for them"
        : "handbook in progress"
    : sealed
      ? "no handbook — the door closed for them"
      : "no handbook yet";

  return (
    <div className="bg-cream-warm rounded-xl border border-border-soft p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-charcoal">{member.name}</p>
          <p className="text-xs text-charcoal-muted mt-0.5">
            {member.handbook
              ? `${member.handbook.variant === "first_circle" ? "First circle" : "Returning"} · ${handbookStatus}`
              : handbookStatus}
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
          {member.handbook.responses.map((r, i) => {
            const threshold = THRESHOLD_TOPIC.questions.some((q) => q.id === r.question_id);
            return (
              <div key={r.question_id}>
                {threshold && (
                  <p className="text-[10px] tracking-[0.25em] uppercase text-terracotta mb-1 font-medium">
                    The threshold — the question the whole country sits with tonight
                  </p>
                )}
                <p className="font-serif text-sm text-charcoal leading-snug mb-1">
                  <span className="text-terracotta mr-1.5 tracking-widest">{toRoman(i + 1)}.</span>
                  {r.question}
                </p>
                <p className="text-sm text-charcoal-muted leading-relaxed whitespace-pre-wrap pl-5">
                  {r.answer.trim() || <em className="text-faint">Not yet answered.</em>}
                </p>
              </div>
            );
          })}
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

  // The way in form
  const [joinUrl, setJoinUrl] = useState("");
  const [accessId, setAccessId] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [accessSaved, setAccessSaved] = useState(false);
  const [notified, setNotified] = useState<number | null>(null);

  // The circle form
  const [circleOpen, setCircleOpen] = useState(false);
  const [circleName, setCircleName] = useState("");
  const [circleDescription, setCircleDescription] = useState("");
  const [circleLocation, setCircleLocation] = useState("");
  const [circleMeetingPlace, setCircleMeetingPlace] = useState("");
  const [circleMeetingAddress, setCircleMeetingAddress] = useState("");
  const [circleImage, setCircleImage] = useState("");
  const [circleRoom, setCircleRoom] = useState("");
  const [circleSaved, setCircleSaved] = useState(false);

  // The training corpus
  const [openChapter, setOpenChapter] = useState<string | null>(null);

  // The open floor: one more question, drawn aloud from the night's theme
  const [floorQuestion, setFloorQuestion] = useState<string | null>(null);

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

  // Seed the forms when (and only when) a fresh room snapshot arrives. Done
  // during render with a guard, per the React docs on adjusting state when
  // data changes — not in an effect.
  const [seededFrom, setSeededFrom] = useState<LeaderRoomData | null>(null);
  if (data && seededFrom !== data) {
    setSeededFrom(data);
    setJoinUrl(data.meeting.join_url ?? "");
    setAccessId(data.meeting.access_id ?? "");
    setAccessCode(data.meeting.access_code ?? "");
    setCircleName(data.circle.name);
    setCircleDescription(data.circle.description ?? "");
    setCircleLocation(data.circle.location ?? "");
    setCircleMeetingPlace(data.circle.meeting_place ?? "");
    setCircleMeetingAddress(data.circle.meeting_address ?? "");
    setCircleImage(data.circle.image_url ?? "");
    setCircleRoom(data.circle.zoom_room_url ?? "");
  }

  const handleMark = useCallback(
    (rsvpId: string, attendance: "attended" | "absent" | null) => {
      if (!ids || !data) return;
      setError(null);
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

  const handleSaveAccess = useCallback(() => {
    if (!ids) return;
    setError(null);
    setAccessSaved(false);
    startTransition(async () => {
      try {
        await updateMeetingAccess(ids.meetingId, { joinUrl, accessId, accessCode });
        setAccessSaved(true);
        await load(ids.circleId, ids.meetingId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save the way in");
      }
    });
  }, [ids, joinUrl, accessId, accessCode, load]);

  const handleNotify = useCallback(() => {
    if (!ids || !data) return;
    if (!joinUrl.trim()) {
      setError("Set the way in first — a join link is required.");
      return;
    }
    if (!confirm(`Send the way in to ${data.counts.reserved} reserved member(s)?`)) return;
    setError(null);
    setNotified(null);
    startTransition(async () => {
      try {
        const result = await notifyMembersOfJoinDetails(ids.meetingId);
        setNotified(result.notified);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send the way in");
      }
    });
  }, [ids, data, joinUrl]);

  const handleSaveCircle = useCallback(() => {
    if (!ids) return;
    setError(null);
    setCircleSaved(false);
    startTransition(async () => {
      try {
        await updateCircle(ids.circleId, {
          name: circleName,
          description: circleDescription,
          location: circleLocation,
          meetingPlace: circleMeetingPlace,
          meetingAddress: circleMeetingAddress,
          imageUrl: circleImage,
          zoomRoomUrl: circleRoom,
        });
        setCircleSaved(true);
        await load(ids.circleId, ids.meetingId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save the circle");
      }
    });
  }, [ids, circleName, circleDescription, circleLocation, circleMeetingPlace, circleMeetingAddress, circleImage, circleRoom, load]);

  const topic = useMemo(
    () => (data ? getTopicForDate(new Date(data.meeting.scheduled_at)) : null),
    [data]
  );

  const drawFloorQuestion = useCallback(() => {
    if (!topic) return;
    const pick = topic.questions[Math.floor(Math.random() * topic.questions.length)];
    setFloorQuestion(pick?.text ?? null);
  }, [topic]);

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

  const { meeting, roster, counts } = data;
  const online = meeting.meeting_type === "digital" || meeting.meeting_type === "hybrid";
  const markedCount = roster.filter((m) => m.attendance !== null).length;
  const sealed = isHandbookSealed(meeting.scheduled_at);

  return (
    <div className="max-w-3xl">
      <span className="text-xs tracking-[0.3em] uppercase text-terracotta mb-2 block font-medium">
        The leader room
      </span>
      <h1 className="font-serif text-3xl text-charcoal mb-2">{meeting.circle_name}</h1>
      <div className="flex flex-wrap gap-4 text-sm text-charcoal-muted mb-3">
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
      <p className="text-xs text-charcoal-muted mb-6">
        {counts.reserved} reserved
        {counts.maybe > 0 ? ` · ${counts.maybe} maybe` : ""} · {counts.sealed} sealed
        {counts.firstCircle > 0 ? ` · ${counts.firstCircle} first circle` : ""}
      </p>

      {error && (
        <div className="mb-6 p-4 bg-terracotta-pale rounded-xl text-terracotta text-sm">{error}</div>
      )}

      {/* The way in */}
      {online && (
        <div className="bg-midnight rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs tracking-[0.25em] uppercase text-cream/50 font-medium">
              The way in
            </p>
            {meeting.join_url ? (
              <span className="text-[11px] text-cream/50">set</span>
            ) : (
              <span className="text-[11px] text-terracotta">not set yet</span>
            )}
          </div>
          <p className="text-xs text-cream/60 mb-4">
            The link, the meeting ID, the passcode. Saving is quiet; the button below
            carries the details to every reserved member in one breath.
          </p>
          <div className="space-y-3">
            <input
              type="url"
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
              placeholder="https://zoom.us/j/… or https://meet.google.com/…"
              className="w-full px-4 py-3 bg-cream/10 border border-cream/20 rounded-xl focus:border-cream/50 focus:outline-none text-sm text-cream placeholder:text-cream/30"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={accessId}
                onChange={(e) => setAccessId(e.target.value)}
                placeholder="Meeting ID (optional)"
                className="w-full px-4 py-3 bg-cream/10 border border-cream/20 rounded-xl focus:border-cream/50 focus:outline-none text-sm text-cream placeholder:text-cream/30"
              />
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Passcode (optional)"
                className="w-full px-4 py-3 bg-cream/10 border border-cream/20 rounded-xl focus:border-cream/50 focus:outline-none text-sm text-cream placeholder:text-cream/30"
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={handleSaveAccess}
                disabled={isPending}
                className="px-5 py-2.5 bg-cream text-midnight text-sm rounded-full hover:bg-parchment transition-all font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={1.5} />}
                {accessSaved ? "Saved" : "Save the way in"}
              </button>
              <button
                onClick={handleNotify}
                disabled={isPending}
                className="px-5 py-2.5 border border-cream/40 text-cream text-sm rounded-full hover:bg-cream/10 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" strokeWidth={1.5} />
                Send the way in to the circle
              </button>
            </div>
            {notified !== null && (
              <p className="text-xs text-cream/60">
                The way in went out to {notified} reserved member{notified === 1 ? "" : "s"}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tonight's theme */}
      {topic && (
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

          {/* The open floor: one more question, drawn aloud */}
          <div className="mt-4 pt-4 border-t border-border-warm">
            {floorQuestion ? (
              <div className="flex items-start justify-between gap-3">
                <p className="font-serif text-sm text-charcoal leading-snug italic">
                  &ldquo;{floorQuestion}&rdquo;
                </p>
                <button
                  onClick={drawFloorQuestion}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-border-soft text-charcoal-muted hover:text-charcoal transition-colors"
                >
                  <Dices className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Draw another
                </button>
              </div>
            ) : (
              <button
                onClick={drawFloorQuestion}
                className="inline-flex items-center gap-2 text-xs text-charcoal-muted hover:text-charcoal transition-colors"
              >
                <Dices className="w-3.5 h-3.5" strokeWidth={1.5} />
                The open floor is near — draw a question aloud from tonight&rsquo;s theme
              </button>
            )}
          </div>
        </div>
      )}

      {/* The shape of the night */}
      <div className="bg-cream-warm rounded-2xl border border-border-soft p-6 mb-8">
        <h2 className="font-serif text-xl text-charcoal mb-4">The shape of the night</h2>
        <ol className="space-y-4 mb-6">
          {LEADER_RUN_SHEET.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-wheat/40 text-charcoal text-xs font-serif tracking-widest flex items-center justify-center mt-0.5">
                {toRoman(i + 1)}
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

      {/* The leader's training */}
      <div className="bg-cream-warm rounded-2xl border border-border-soft p-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-wheat-pale flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-wheat-dark" strokeWidth={1.5} />
          </div>
          <h2 className="font-serif text-xl text-charcoal">The leader&rsquo;s training</h2>
        </div>
        <p className="text-sm text-charcoal-muted leading-relaxed mb-4">{LEADER_GUIDE_INTRO}</p>
        <div className="space-y-2">
          {LEADER_GUIDE.map((chapter) => (
            <div key={chapter.id} className="border border-border-soft rounded-xl bg-cream">
              <button
                onClick={() => setOpenChapter(openChapter === chapter.id ? null : chapter.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-medium text-charcoal">{chapter.title}</span>
                {openChapter === chapter.id ? (
                  <ChevronUp className="w-4 h-4 text-charcoal-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-charcoal-muted" />
                )}
              </button>
              {openChapter === chapter.id && (
                <p className="px-4 pb-4 text-sm text-charcoal-muted leading-relaxed border-t border-border-soft pt-3">
                  {chapter.body}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* The roster */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl text-charcoal">The roster</h2>
        <span className="text-xs text-charcoal-muted">
          {counts.sealed} of {roster.length} sealed · {markedCount} of {roster.length} marked
        </span>
      </div>
      <p className="text-sm text-charcoal-muted leading-relaxed mb-4">
        Tick who attends and who does not — during the night or after it. Expand a member
        to read their completed handbook before you call on them. {HANDBOOK_SEAL_RULE} A
        member the door closed for is marked absent — the next summons finds them.
      </p>
      <div className="space-y-3">
        {roster.map((member) => (
          <MemberRow key={member.rsvpId} member={member} sealed={sealed} onMark={handleMark} marking={isPending} />
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

      {/* The circle is yours */}
      <div className="mt-8 bg-cream-warm rounded-2xl border border-border-soft p-6">
        <button
          onClick={() => setCircleOpen(!circleOpen)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-pale flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-sky-soft" strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <h2 className="font-serif text-xl text-charcoal">The circle is yours</h2>
              <p className="text-xs text-charcoal-muted">Name, description, image, standing room.</p>
            </div>
          </div>
          {circleOpen ? (
            <ChevronUp className="w-4 h-4 text-charcoal-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-charcoal-muted" />
          )}
        </button>

        {circleOpen && (
          <div className="mt-5 space-y-4 border-t border-border-soft pt-5">
            <div className="space-y-2">
              <label className="text-sm text-charcoal-light font-medium">Circle name</label>
              <input
                type="text"
                value={circleName}
                onChange={(e) => setCircleName(e.target.value)}
                className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-charcoal-light font-medium">Description</label>
              <textarea
                value={circleDescription}
                onChange={(e) => setCircleDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none text-sm resize-none"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-charcoal-light font-medium">Location</label>
                <input
                  type="text"
                  value={circleLocation}
                  onChange={(e) => setCircleLocation(e.target.value)}
                  placeholder="Suburb / City / State"
                  className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-charcoal-light font-medium">Cover image URL</label>
                <input
                  type="url"
                  value={circleImage}
                  onChange={(e) => setCircleImage(e.target.value)}
                  placeholder="https://… (empty for the default)"
                  className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-charcoal-light font-medium">
                The circle&rsquo;s standing room (video link)
              </label>
              <input
                type="url"
                value={circleRoom}
                onChange={(e) => setCircleRoom(e.target.value)}
                placeholder="https://zoom.us/j/… or your Google Meet link"
                className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none text-sm"
              />
              <p className="text-xs text-charcoal-muted">
                Digital meetings without their own link use this one — the circle always
                has a door to walk through.
              </p>
            </div>
            <button
              onClick={handleSaveCircle}
              disabled={isPending || !circleName.trim() || !circleLocation.trim()}
              className="px-6 py-3 bg-midnight text-cream rounded-full hover:bg-midnight-soft transition-all text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={1.5} />}
              {circleSaved ? "Saved" : "Save the circle"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-charcoal-muted">
        <DoorOpen className="w-3.5 h-3.5 text-sage" strokeWidth={1.5} />
        The session has no set time. It runs until everyone is heard — you keep the order,
        never the clock.
      </div>
    </div>
  );
}
