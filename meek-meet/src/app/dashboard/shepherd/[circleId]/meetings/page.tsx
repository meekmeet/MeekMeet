"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { createMeeting, cancelMeeting, deleteMeeting } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { getNextNewMoon, formatNewMoon } from "@meekmeet/core/utils";
import Link from "next/link";
import { Plus, Trash2, X, Loader2, Calendar, MapPin, Clock, Video, BookOpen } from "lucide-react";

interface Props {
  params: Promise<{ circleId: string }>;
}

interface Meeting {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  location_name: string | null;
  location_address: string | null;
  notes: string | null;
  is_cancelled: boolean;
  meeting_type: "in_person" | "digital" | "hybrid";
  join_url: string | null;
}

export default function MeetingsPage({ params }: Props) {
  const [circleId, setCircleId] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("120");
  const [notes, setNotes] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [moonHint, setMoonHint] = useState<string | null>(null);

  // Circles gather on the new moon. Opening the form offers the next one —
  // the leader still picks the hour and the room.
  const toggleForm = () => {
    setShowForm((open) => {
      const next = !open;
      if (next) {
        const nm = getNextNewMoon();
        const y = nm.getFullYear();
        const m = String(nm.getMonth() + 1).padStart(2, "0");
        const d = String(nm.getDate()).padStart(2, "0");
        setDate((current) => current || `${y}-${m}-${d}`);
        setMoonHint(formatNewMoon(nm));
      }
      return next;
    });
  };

  const supabase = createClient();

  const loadMeetings = useCallback(async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("meetings")
      .select("id, scheduled_at, duration_minutes, location_name, location_address, notes, is_cancelled, meeting_type, join_url")
      .eq("circle_id", id)
      .order("scheduled_at", { ascending: true });

    if (error) {
      setError("Failed to load meetings.");
    } else {
      setMeetings((data ?? []) as Meeting[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    params.then(({ circleId: id }) => {
      setCircleId(id);
      loadMeetings(id);
    });
  }, [params, loadMeetings]);

  const handleAdd = () => {
    if (!date || !time || !circleId) return;
    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    setError(null);

    startTransition(async () => {
      try {
        await createMeeting(
          circleId,
          scheduledAt,
          parseInt(duration) || 120,
          "",
          "",
          notes,
          "digital",
          joinUrl
        );
        setDate("");
        setTime("");
        setDuration("120");
        setNotes("");
        setJoinUrl("");
        setShowForm(false);
        await loadMeetings(circleId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to schedule meeting");
      }
    });
  };

  const handleCancel = (id: string) => {
    if (!circleId) return;
    setError(null);
    startTransition(async () => {
      try {
        await cancelMeeting(id);
        await loadMeetings(circleId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to cancel meeting");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!circleId) return;
    if (!confirm("Are you sure you want to delete this meeting?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteMeeting(id);
        await loadMeetings(circleId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete meeting");
      }
    });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading && meetings.length === 0) {
    return (
      <div className="max-w-3xl">
        <h2 className="font-serif text-2xl text-charcoal mb-6">Scheduled Meetings</h2>
        <div className="flex items-center gap-3 text-charcoal-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading meetings...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-charcoal">Scheduled Meetings</h2>
        <button
          onClick={toggleForm}
          className="px-5 py-2.5 bg-midnight text-cream rounded-full hover:bg-midnight-soft transition-all text-sm font-medium flex items-center gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "Schedule New"}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-terracotta-pale rounded-xl text-terracotta text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-cream-warm rounded-xl border border-border-soft p-6 mb-8 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-charcoal-light font-medium mb-1.5 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none text-sm"
              />
              {moonHint && (
                <p className="text-xs text-charcoal-muted mt-1.5">
                  Circles gather on the new moon. The next one rises on {moonHint} — the
                  night belongs to the circle; pick any hour that suits it.
                </p>
              )}
            </div>
            <div>
              <label className="text-sm text-charcoal-light font-medium mb-1.5 block">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-charcoal-light font-medium mb-1.5 block">Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="120"
              className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-charcoal-light font-medium">
            <Video className="w-4 h-4 text-sage" strokeWidth={1.5} />
            Online only — the circle meets in a private video room.
          </div>

          <div>
            <label className="text-sm text-charcoal-light font-medium mb-1.5 block flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5" strokeWidth={1.5} />
              Join URL
            </label>
            <input
              type="url"
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
              placeholder="https://zoom.us/j/... or https://meet.google.com/..."
              className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none text-sm"
            />
            <p className="text-xs text-charcoal-muted mt-1.5">
              Paste a Zoom or Google Meet link, or leave blank to use the circle&rsquo;s
              standing room. It is only shown to members who RSVP &ldquo;Going&rdquo; — never
              published publicly.
            </p>
          </div>

          <div>
            <label className="text-sm text-charcoal-light font-medium mb-1.5 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for attendees..."
              rows={3}
              className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none transition-colors text-sm resize-none"
            />
          </div>

          <button
            onClick={handleAdd}
            disabled={isPending || !date || !time || !circleId}
            className="w-full py-3 bg-midnight text-cream rounded-full hover:bg-midnight-soft transition-all text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Schedule Meeting
          </button>
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            className={`bg-cream-warm rounded-xl border border-border-soft p-5 ${
              meeting.is_cancelled ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-terracotta" strokeWidth={1.5} />
                  <p className={`font-medium ${meeting.is_cancelled ? "line-through text-charcoal-muted" : "text-charcoal"}`}>
                    {formatDate(meeting.scheduled_at)}
                  </p>
                  {meeting.is_cancelled && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-terracotta-pale text-terracotta">
                      Cancelled
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-charcoal-muted">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-wheat" strokeWidth={1.5} />
                    {formatTime(meeting.scheduled_at)}
                    {meeting.duration_minutes && ` · ${meeting.duration_minutes} min`}
                  </span>
                  {meeting.location_name && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sage" strokeWidth={1.5} />
                      {meeting.location_name}
                    </span>
                  )}
                </div>
                {meeting.location_address && (
                  <p className="text-sm text-charcoal-muted mt-2">{meeting.location_address}</p>
                )}
                {meeting.notes && (
                  <p className="text-sm text-charcoal-muted mt-2">{meeting.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/shepherd/${circleId}/meetings/${meeting.id}`}
                  className="px-3 py-1.5 text-xs bg-midnight text-cream rounded-full hover:bg-midnight-soft transition-colors flex items-center gap-1.5"
                >
                  <BookOpen className="w-3 h-3" strokeWidth={1.5} />
                  Leader room
                </Link>
                {!meeting.is_cancelled && (
                  <button
                    onClick={() => handleCancel(meeting.id)}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs border border-terracotta text-terracotta rounded-full hover:bg-terracotta-pale transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => handleDelete(meeting.id)}
                  disabled={isPending}
                  className="p-2 text-charcoal-muted hover:text-terracotta transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {meetings.length === 0 && !loading && (
          <div className="text-center py-12 bg-cream-warm rounded-xl border border-border-soft">
            <p className="text-charcoal-muted">No meetings scheduled yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
