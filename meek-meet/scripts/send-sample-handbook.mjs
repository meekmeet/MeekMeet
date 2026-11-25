// Sends sample session-handbook emails (both member variants + the leader
// pack) to a recipient, using the exact production templates and the live
// Resend account.
//
//   node scripts/send-sample-handbook.mjs [to@email]
//
// Reads RESEND_API_KEY from meek-meet/.env.local. Runs the real TypeScript
// templates in src/lib/handbook.ts through jiti so the sample is never a copy.

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

const { Resend } = await jiti.import("resend");
const { buildHandbookEmail, buildLeaderPackEmail } =
  await jiti.import(resolve(here, "../src/lib/handbook.ts"));

const to = process.argv[2] ?? "meekmeets@gmail.com";
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) throw new Error("RESEND_API_KEY not found in meek-meet/.env.local");

const resend = new Resend(apiKey);

// Four days from now, 6:30pm — the exact window the cron dispatches in.
const meeting = new Date();
meeting.setDate(meeting.getDate() + 4);
meeting.setHours(18, 30, 0, 0);

async function send(label, subject, html) {
  const { data, error } = await resend.emails.send({
    from: "Meek Meet <hello@meekmeet.com>",
    to,
    subject: `[SAMPLE — ${label}] ${subject}`,
    html,
  });
  if (error) {
    console.error(`✗ ${label}:`, error.message);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${label} sent to ${to} (${data?.id})`);
  }
}

for (const variant of ["first_circle", "returning"]) {
  const { subject, html } = buildHandbookEmail({
    recipientName: "Martin",
    circleName: "Gosford Circle (sample)",
    scheduledAt: meeting.toISOString(),
    variant,
    handbookUrl: "https://meekmeet.com/dashboard",
  });
  await send(variant, subject, html);
}

const pack = buildLeaderPackEmail({
  leaderName: "Martin",
  circleName: "Gosford Circle (sample)",
  scheduledAt: meeting.toISOString(),
  expectedCount: 7,
  leaderRoomUrl: "https://meekmeet.com/dashboard",
});
await send("leader pack", pack.subject, pack.html);
