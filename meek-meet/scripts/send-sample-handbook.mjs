// Sends sample session-handbook emails (both variants) to a recipient, using
// the exact production template and the live Resend account.
//
//   node scripts/send-sample-handbook.mjs [to@email]
//
// Reads RESEND_API_KEY from meek-meet/.env.local. Runs the real TypeScript
// template in src/lib/handbook.ts through jiti so the sample is never a copy.

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
const { buildHandbookEmail, buildHandbookQuestions } = await jiti.import(
  resolve(here, "../src/lib/handbook.ts")
);

const to = process.argv[2] ?? "meekmeets@gmail.com";
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) throw new Error("RESEND_API_KEY not found in meek-meet/.env.local");

const resend = new Resend(apiKey);

// Four days from now, 6:30pm — the exact window the cron dispatches in.
const meeting = new Date();
meeting.setDate(meeting.getDate() + 4);
meeting.setHours(18, 30, 0, 0);

const questions = buildHandbookQuestions([
  {
    question_id: "sample-q1",
    content:
      "When you walk your street at night, what makes you feel safe — and what doesn't?",
  },
  {
    question_id: "sample-q2",
    content: "Who in your neighbourhood do you think eats most meals alone?",
  },
  {
    question_id: "sample-q3",
    content:
      "If the council gave your street one change this year, what should it be?",
  },
  {
    question_id: "sample-q4",
    content: "What is one thing this circle could do together within a month?",
  },
]);

for (const variant of ["first_circle", "returning"]) {
  const { subject, html } = buildHandbookEmail({
    recipientName: "Martin",
    circleName: "Gosford Circle (sample)",
    scheduledAt: meeting.toISOString(),
    locationName: "Gosford Community Hall",
    variant,
    questions,
    handbookUrl: "https://meekmeet.com/dashboard",
  });

  const { data, error } = await resend.emails.send({
    from: "Meek Meet <hello@meekmeet.com>",
    to,
    subject: `[SAMPLE — ${variant}] ${subject}`,
    html,
  });

  if (error) {
    console.error(`✗ ${variant}:`, error.message);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${variant} sent to ${to} (${data?.id})`);
  }
}
