// Seeds (idempotently) a demo circle so the master admin can walk the two
// member-facing rooms end to end:
//   - the member handbook  /dashboard/handbook/[meetingId]
//   - the leader room      /dashboard/shepherd/[circleId]/meetings/[meetingId]
//
//   node scripts/seed-demo-circle.mjs [email]
//
// Uses the service-role key from meek-meet/.env.local. Safe to re-run: every
// row is upserted or reused, never duplicated.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const here = dirname(fileURLToPath(import.meta.url));
const jiti = createJiti(import.meta.url, {
  alias: { "@": resolve(here, "../src") },
});

const envPath = resolve(here, "../.env.local");
for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { createClient } = await jiti.import("@supabase/supabase-js");
const { drawHandbookQuestions, drawThresholdQuestions } = await jiti.import(
  resolve(here, "../src/lib/handbook.ts")
);
const { getTopicForDate } = await jiti.import("@meekmeet/core/questions");

const email = process.argv[2] ?? "meekmeets@gmail.com";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Supabase env not found in meek-meet/.env.local");

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── The member ────────────────────────────────────────────────
const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id, full_name")
  .eq("email", email)
  .single();
if (profileError || !profile) {
  throw new Error(`No profile found for ${email}: ${profileError?.message}`);
}
console.log(`✓ member: ${profile.full_name ?? email} (${profile.id})`);

// ── The circle ────────────────────────────────────────────────
const CIRCLE_SLUG = "demo-circle";
let { data: circle } = await supabase
  .from("circles")
  .select("id, name")
  .eq("slug", CIRCLE_SLUG)
  .maybeSingle();

if (!circle) {
  const { data: created, error } = await supabase
    .from("circles")
    .insert({
      name: "The Demonstration Circle",
      slug: CIRCLE_SLUG,
      description:
        "A standing demonstration circle — walk the handbook, the leader room, and the seal exactly as members and leaders will.",
      location: "Online — Australia",
      meeting_place: "Online",
      kind: "local",
      is_active: true,
      shepherd_id: profile.id,
    })
    .select("id, name")
    .single();
  if (error) throw new Error(`circle insert: ${error.message}`);
  circle = created;
  console.log(`✓ circle created: ${circle.name} (${circle.id})`);
} else {
  console.log(`✓ circle exists: ${circle.name} (${circle.id})`);
}

// ── The leadership seat (so the leader room opens for them) ──
const { error: seatError } = await supabase
  .from("circle_shepherds")
  .upsert(
    { circle_id: circle.id, user_id: profile.id, role: "lead" },
    { onConflict: "circle_id,user_id" }
  );
if (seatError) console.warn(`! circle_shepherds upsert: ${seatError.message}`);
else console.log("✓ leader seat held");

// ── The meeting: 5 days out, 6:30pm local, digital ───────────
const scheduled = new Date();
scheduled.setDate(scheduled.getDate() + 5);
scheduled.setHours(18, 30, 0, 0);

let { data: meeting } = await supabase
  .from("meetings")
  .select("id, scheduled_at")
  .eq("circle_id", circle.id)
  .eq("is_cancelled", false)
  .gte("scheduled_at", new Date().toISOString())
  .order("scheduled_at", { ascending: true })
  .limit(1)
  .maybeSingle();

if (!meeting) {
  const { data: created, error } = await supabase
    .from("meetings")
    .insert({
      circle_id: circle.id,
      scheduled_at: scheduled.toISOString(),
      duration_minutes: 90,
      meeting_type: "digital",
      location_name: "Online",
      join_url: "https://meet.jit.si/meekmeet-demonstration-circle",
      notes: "Demonstration meeting — walk the run sheet and the roster.",
    })
    .select("id, scheduled_at")
    .single();
  if (error) throw new Error(`meeting insert: ${error.message}`);
  meeting = created;
  console.log(`✓ meeting created: ${meeting.scheduled_at} (${meeting.id})`);
} else {
  console.log(`✓ meeting exists: ${meeting.scheduled_at} (${meeting.id})`);
}

// ── The reservation ───────────────────────────────────────────
const { error: rsvpError } = await supabase
  .from("rsvps")
  .upsert(
    { meeting_id: meeting.id, user_id: profile.id, status: "going" },
    { onConflict: "meeting_id,user_id" }
  );
if (rsvpError) console.warn(`! rsvp upsert: ${rsvpError.message}`);
else console.log("✓ RSVP: going");

// ── The handbook (drawn exactly as the dispatch cron draws it) ─
const { data: existingHandbook } = await supabase
  .from("session_handbooks")
  .select("id")
  .eq("meeting_id", meeting.id)
  .eq("profile_id", profile.id)
  .maybeSingle();

if (!existingHandbook) {
  const topic = getTopicForDate(new Date(meeting.scheduled_at));
  const responses = [
    ...drawHandbookQuestions(topic),
    ...drawThresholdQuestions(),
  ];
  const { error: hbError } = await supabase.from("session_handbooks").insert({
    meeting_id: meeting.id,
    circle_id: circle.id,
    profile_id: profile.id,
    variant: "first_circle",
    topic_id: topic.id,
    responses,
    emailed_at: new Date().toISOString(),
  });
  if (hbError) throw new Error(`handbook insert: ${hbError.message}`);
  console.log(`✓ handbook drawn from "${topic.name}" (${responses.length} questions)`);
} else {
  console.log("✓ handbook already exists");
}

// ── The way in ────────────────────────────────────────────────
const base = "https://meekmeet.com";
console.log("\nWalk both rooms as meekmeets@gmail.com:");
console.log(`  Member handbook : ${base}/dashboard/handbook/${meeting.id}`);
console.log(`  Leader room     : ${base}/dashboard/shepherd/${circle.id}/meetings/${meeting.id}`);
console.log(`  Leader hub      : ${base}/dashboard/shepherd`);
console.log(`  Circle page     : ${base}/circles/${CIRCLE_SLUG}`);
