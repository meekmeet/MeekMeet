import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, Settings, ArrowRight, FileText, DoorOpen } from "lucide-react";

interface Circle {
  id: string;
  name: string;
  location: string | null;
  slug: string;
  is_active: boolean;
  created_at: string;
}

interface NextMeeting {
  id: string;
  circle_id: string;
  scheduled_at: string;
  _count?: { rsvps?: number };
  rsvps?: { status: string }[];
}

export default async function ShepherdDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch circles this user leads (legacy owner + circle_shepherds membership)
  const [{ data: ownedCircles }, { data: shepherdedCircles }] = await Promise.all([
    supabase
      .from("circles")
      .select("*")
      .eq("shepherd_id", user.id)
      .eq("is_active", true),
    supabase
      .from("circle_shepherds")
      .select("circle:circles(*)")
      .eq("user_id", user.id),
  ]);

  const circleMap = new Map<string, Circle>();
  for (const c of (ownedCircles ?? []) as Circle[]) circleMap.set(c.id, c);
  for (const row of (shepherdedCircles ?? []) as unknown as { circle: Circle | null }[]) {
    const c = row.circle;
    if (c && c.is_active) circleMap.set(c.id, c);
  }
  const myCircles = Array.from(circleMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // The next gathering per circle — the leader room is built around it.
  const circleIds = myCircles.map((c) => c.id);
  const nextMeetingByCircle = new Map<string, NextMeeting>();
  if (circleIds.length > 0) {
    const { data: upcoming } = await supabase
      .from("meetings")
      .select("id, circle_id, scheduled_at, rsvps(status)")
      .in("circle_id", circleIds)
      .gte("scheduled_at", new Date().toISOString())
      .eq("is_cancelled", false)
      .order("scheduled_at", { ascending: true });

    for (const m of (upcoming ?? []) as unknown as NextMeeting[]) {
      if (!nextMeetingByCircle.has(m.circle_id)) {
        nextMeetingByCircle.set(m.circle_id, m);
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="font-serif text-3xl text-charcoal mb-2">Leader Dashboard</h1>
      <p className="text-charcoal-muted mb-8">
        Your circles, their gatherings, and everything you need to hold the room.
      </p>

      {myCircles && myCircles.length > 0 ? (
        <div className="space-y-8">
          {myCircles.map((circle) => {
            const next = nextMeetingByCircle.get(circle.id);
            const reserved =
              next?.rsvps?.filter((r) => r.status === "going").length ?? 0;
            return (
              <div
                key={circle.id}
                className="bg-cream-warm rounded-2xl border border-border-soft p-8"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-serif text-2xl text-charcoal">
                      {circle.name}
                    </h2>
                    <p className="text-sm text-charcoal-muted mt-1">
                      {circle.location}
                    </p>
                  </div>
                  <Link
                    href={`/circles/${circle.slug}`}
                    className="text-sm text-terracotta hover:text-terracotta-light transition-colors flex items-center gap-1"
                  >
                    View public page <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* The next gathering: the door straight into the leader room */}
                {next ? (
                  <div className="bg-midnight rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs tracking-[0.25em] uppercase text-cream/50 mb-1 font-medium">
                        The next gathering
                      </p>
                      <p className="font-serif text-xl text-cream">
                        {new Date(next.scheduled_at).toLocaleDateString("en-AU", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-xs text-cream/60 mt-1">
                        {reserved} reserved
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/shepherd/${circle.id}/meetings/${next.id}`}
                      className="px-6 py-3 bg-cream text-midnight text-sm rounded-full hover:bg-parchment transition-all font-medium flex items-center gap-2 shrink-0"
                    >
                      <DoorOpen className="w-4 h-4" strokeWidth={1.5} />
                      Open the leader room
                    </Link>
                  </div>
                ) : (
                  <div className="bg-cream rounded-xl border border-dashed border-border-soft p-5 mb-6 text-sm text-charcoal-muted">
                    No gathering scheduled. The circle gathers on the new moon rhythm — schedule the next one under Meetings.
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <Link
                    href={`/dashboard/shepherd/${circle.id}/meetings`}
                    className="bg-cream rounded-xl border border-border-soft p-5 hover:border-wheat/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-sage-pale flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-sage-dark" strokeWidth={1.5} />
                      </div>
                      <h3 className="font-medium text-charcoal group-hover:text-terracotta transition-colors">
                        Meetings
                      </h3>
                    </div>
                    <p className="text-sm text-charcoal-muted">
                      Schedule gatherings, set the way in, and open the leader room.
                    </p>
                  </Link>

                  <Link
                    href={`/dashboard/shepherd/${circle.id}/reports`}
                    className="bg-cream rounded-xl border border-border-soft p-5 hover:border-wheat/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-terracotta-pale flex items-center justify-center">
                        <FileText className="w-5 h-5 text-terracotta" strokeWidth={1.5} />
                      </div>
                      <h3 className="font-medium text-charcoal group-hover:text-terracotta transition-colors">
                        Reports
                      </h3>
                    </div>
                    <p className="text-sm text-charcoal-muted">
                      What your circle has said, carried upward.
                    </p>
                  </Link>

                  <Link
                    href={`/dashboard/shepherd/${circle.id}/settings`}
                    className="bg-cream rounded-xl border border-border-soft p-5 hover:border-wheat/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-pale flex items-center justify-center">
                        <Settings className="w-5 h-5 text-sky-soft" strokeWidth={1.5} />
                      </div>
                      <h3 className="font-medium text-charcoal group-hover:text-terracotta transition-colors">
                        Settings
                      </h3>
                    </div>
                    <p className="text-sm text-charcoal-muted">
                      Name, description, image, and the circle&rsquo;s standing room.
                    </p>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-cream-warm rounded-2xl border border-border-soft p-12 text-center">
          <p className="text-charcoal-muted mb-4">
            You are not leading any circles yet.
          </p>
          <Link
            href="/shepherd"
            className="px-6 py-3 bg-midnight text-cream text-sm rounded-full hover:bg-midnight-soft transition-all inline-block"
          >
            Apply to Become a Leader
          </Link>
        </div>
      )}
    </div>
  );
}
