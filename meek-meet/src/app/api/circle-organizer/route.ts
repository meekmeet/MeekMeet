import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { isAuthorizedCron } from "@/lib/cron-auth";

// Minimum number of distinct members with a 'going' RSVP on a non-cancelled
// meeting of the global circle required to auto-provision a local circle for
// their area. Deliberately well above a shepherd's typical starting circle so
// only clearly self-sustaining areas spin out on their own.
const MIN_MEMBERS = 8;

// Circle names are capped near 60 chars: "New Moon Circle — " + area.
const NAME_PREFIX = "New Moon Circle — ";
const MAX_NAME_LENGTH = 60;

const NAME_PREFIX_LENGTH = NAME_PREFIX.length; // 19 chars (em dash + spaces)

type AreaGroup = {
  areaKey: string;
  areaName: string;
  memberCount: number;
};

function normalizeArea(location: string): string {
  return location.trim().replace(/\s+/g, " ");
}

function areaKeyOf(areaName: string): string {
  return areaName.toLowerCase();
}

function kebabCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Title-case an area name, preserving short all-caps tokens like NSW, VIC, WA.
function titleCaseArea(area: string): string {
  return area
    .split(" ")
    .map((word) => {
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

// Bearer CRON_SECRET (Vercel Cron) or an authenticated admin session.
async function isAuthorized(request: NextRequest): Promise<boolean> {
  if (isAuthorizedCron(request)) return true;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return profile?.role === "admin";
  } catch {
    return false;
  }
}

// POST /api/circle-organizer
// Groups members of the global (virtual-first) circle by their profile
// location and provisions a local circle for any area with at least
// MIN_MEMBERS distinct 'going' RSVPs that doesn't have a circle yet.
export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const created: { area: string; member_count: number; circle_id: string; slug: string }[] = [];
  const belowThreshold: { area: string; member_count: number }[] = [];
  const errors: string[] = [];

  try {
    // 1. Find the global circle.
    const { data: globalCircles, error: globalError } = await supabase
      .from("circles")
      .select("id, slug, name")
      .eq("kind", "global")
      .eq("is_active", true)
      .limit(1);

    if (globalError) throw globalError;

    const globalCircle = globalCircles?.[0];
    if (!globalCircle) {
      return NextResponse.json(
        { error: "No active global circle found" },
        { status: 404 }
      );
    }

    // 2. All non-cancelled meetings of the global circle.
    const { data: meetings, error: meetingsError } = await supabase
      .from("meetings")
      .select("id")
      .eq("circle_id", globalCircle.id)
      .eq("is_cancelled", false);

    if (meetingsError) throw meetingsError;

    const meetingIds = (meetings ?? []).map((m) => m.id);
    if (meetingIds.length === 0) {
      return NextResponse.json({ created, below_threshold: belowThreshold });
    }

    // 3. Distinct users with a 'going' RSVP on any of those meetings.
    const { data: rsvps, error: rsvpsError } = await supabase
      .from("rsvps")
      .select("user_id")
      .eq("status", "going")
      .in("meeting_id", meetingIds);

    if (rsvpsError) throw rsvpsError;

    const userIds = Array.from(
      new Set((rsvps ?? []).map((r) => r.user_id).filter(Boolean))
    );
    if (userIds.length === 0) {
      return NextResponse.json({ created, below_threshold: belowThreshold });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, location")
      .in("id", userIds);

    if (profilesError) throw profilesError;

    // 4. Group members by normalized location; skip empty locations.
    const groups = new Map<string, AreaGroup>();
    for (const profile of profiles ?? []) {
      if (!profile.location) continue;
      const areaName = normalizeArea(profile.location);
      if (!areaName) continue;
      const areaKey = areaKeyOf(areaName);
      const group = groups.get(areaKey);
      if (group) {
        group.memberCount += 1;
      } else {
        groups.set(areaKey, { areaKey, areaName, memberCount: 1 });
      }
    }

    // 5. Areas already organized are left alone entirely.
    const { data: existingGroups, error: existingError } = await supabase
      .from("circle_auto_groups")
      .select("area_key");

    if (existingError) throw existingError;

    const organized = new Set((existingGroups ?? []).map((g) => g.area_key));

    // 6. Provision local circles for qualifying areas.
    for (const group of groups.values()) {
      if (organized.has(group.areaKey)) continue;

      if (group.memberCount < MIN_MEMBERS) {
        belowThreshold.push({
          area: group.areaName,
          member_count: group.memberCount,
        });
        continue;
      }

      try {
        const titleCased = titleCaseArea(group.areaName);
        let areaPart = titleCased;
        if (NAME_PREFIX_LENGTH + areaPart.length > MAX_NAME_LENGTH) {
          areaPart = `${areaPart.slice(0, MAX_NAME_LENGTH - NAME_PREFIX_LENGTH - 1).trimEnd()}…`;
        }
        const circleName = `${NAME_PREFIX}${areaPart}`;

        // Slug derived from the area key; short random suffix on collision.
        const baseSlug = `new-moon-${kebabCase(group.areaKey)}`;
        let slug = baseSlug;
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data: clash } = await supabase
            .from("circles")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();
          if (!clash) break;
          slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
        }

        const { data: newCircle, error: circleError } = await supabase
          .from("circles")
          .insert({
            slug,
            name: circleName,
            description:
              `This circle grew out of the ${globalCircle.name}, where ` +
              `${group.memberCount} members from ${titleCased} RSVP'd to gather — ` +
              `enough to form a circle of their own. They meet virtually on Zoom.`,
            location: group.areaName,
            meeting_place: "Zoom",
            kind: "local",
            country_code: "WW",
            is_active: true,
            shepherd_id: null,
          })
          .select("id")
          .single();

        if (circleError) throw circleError;
        if (!newCircle) throw new Error("Circle insert returned no id");

        const { error: linkError } = await supabase
          .from("circle_auto_groups")
          .insert({
            area_key: group.areaKey,
            area_name: group.areaName,
            member_count: group.memberCount,
            circle_id: newCircle.id,
          });

        if (linkError) throw linkError;

        created.push({
          area: group.areaName,
          member_count: group.memberCount,
          circle_id: newCircle.id,
          slug,
        });
      } catch (err) {
        errors.push(
          `${group.areaName}: ${err instanceof Error ? err.message : "unknown error"}`
        );
      }
    }

    const response: Record<string, unknown> = { created, below_threshold: belowThreshold };
    if (errors.length > 0) response.errors = errors;
    return NextResponse.json(response);
  } catch (err) {
    console.error("circle-organizer error:", err);
    return NextResponse.json(
      { error: "Internal error", created, below_threshold: belowThreshold },
      { status: 500 }
    );
  }
}
