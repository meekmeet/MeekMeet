// Removes the demonstration circle (slug "demo-circle") and everything the
// seed script created for it, so it no longer lists on the public circles
// page. Safe to re-run: every delete is scoped to the demo circle's own rows.
//
//   node scripts/remove-demo-circle.mjs
//
// Uses the service-role key from meek-meet/.env.local.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "../.env.local");
for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { createClient } = await import("@supabase/supabase-js");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Supabase env not found in meek-meet/.env.local");
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: circle } = await supabase
  .from("circles")
  .select("id, name")
  .eq("slug", "demo-circle")
  .maybeSingle();

if (!circle) {
  console.log("nothing to remove — no circle with slug 'demo-circle'");
  process.exit(0);
}
console.log(`removing: ${circle.name} (${circle.id})`);

const { data: meetings } = await supabase
  .from("meetings")
  .select("id")
  .eq("circle_id", circle.id);
const meetingIds = (meetings ?? []).map((m) => m.id);
console.log(`meetings: ${meetingIds.length}`);

const wipe = async (table, filter) => {
  let q = supabase.from(table).delete();
  for (const [col, val] of Object.entries(filter)) q = q.eq(col, val);
  const { error, count } = await q;
  if (error) console.warn(`! ${table}: ${error.message}`);
  else console.log(`✓ ${table}: removed ${count ?? "?"} row(s)`);
};

if (meetingIds.length > 0) {
  await wipe("session_handbooks", { circle_id: circle.id });
  for (const id of meetingIds) {
    await wipe("rsvps", { meeting_id: id });
    await wipe("meeting_leader_reminders", { meeting_id: id });
  }
  for (const id of meetingIds) {
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    if (error) console.warn(`! meetings ${id}: ${error.message}`);
    else console.log(`✓ meeting ${id} removed`);
  }
}

await wipe("circle_shepherds", { circle_id: circle.id });

const { error: circleError } = await supabase
  .from("circles")
  .delete()
  .eq("id", circle.id);
if (circleError) console.warn(`! circles: ${circleError.message}`);
else console.log("✓ circle removed");

console.log("\nThe Demonstration Circle no longer lists on /circles.");
