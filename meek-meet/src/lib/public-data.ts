// Public, cookie-free reads for the marketing pages, cached with
// unstable_cache (60s TTL, 'circles' tag). Anonymous visitors all see the
// same data, so the per-request cookie client — and its Supabase round-trips
// — is pure overhead here. Visibility is identical: this uses the same anon
// publishable key the cookie-based client sends for logged-out users, so
// RLS answers are the same.
//
// These MUST stay free of per-request state (cookies, headers) — closing
// over them would poison the shared cache.

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

function publicSupabase() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  );
}

export const getActiveCircles = unstable_cache(
  async () => {
    const { data, error } = await publicSupabase()
      .from("circles")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch circles: ${error.message}`);
    return data ?? [];
  },
  ["active-circles"],
  { revalidate: 60, tags: ["circles"] }
);

export const getCircleBySlug = unstable_cache(
  async (slug: string) => {
    const { data, error } = await publicSupabase()
      .from("circles")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(`Failed to fetch circle: ${error.message}`);
    return data ?? null;
  },
  ["circle-by-slug"],
  { revalidate: 60, tags: ["circles"] }
);

/** Public circle detail data: questions, routine flow, upcoming meetings. */
export const getCirclePublicData = unstable_cache(
  async (circleId: string) => {
    const supabase = publicSupabase();
    const [questions, routines, meetings] = await Promise.all([
      supabase
        .from("circle_questions")
        .select("*")
        .eq("circle_id", circleId)
        .eq("is_active", true)
        .order("order_index", { ascending: true }),
      supabase
        .from("circle_routines")
        .select("*")
        .eq("circle_id", circleId)
        .order("order_index", { ascending: true }),
      supabase
        .from("public_meetings")
        .select("id, scheduled_at, duration_minutes, location_name, location_address")
        .eq("circle_id", circleId)
        .eq("is_cancelled", false)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5),
    ]);
    if (questions.error) throw new Error(`Failed to fetch questions: ${questions.error.message}`);
    if (routines.error) throw new Error(`Failed to fetch routines: ${routines.error.message}`);
    if (meetings.error) throw new Error(`Failed to fetch meetings: ${meetings.error.message}`);
    return {
      questions: questions.data ?? [],
      routines: routines.data ?? [],
      meetings: meetings.data ?? [],
    };
  },
  ["circle-public-data"],
  { revalidate: 60, tags: ["circles"] }
);
