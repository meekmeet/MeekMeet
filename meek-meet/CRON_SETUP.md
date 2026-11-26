# Cron & Automation Setup

Meek Meet relies on five scheduled jobs to keep the platform alive:

1. **Daily meeting reminders** — `/api/send-reminders` (18:00)
2. **Daily news-driven questions** — `/api/trigger-news-questions` (09:00)
3. **Meeting lifecycle** — `/api/meeting-lifecycle` (02:00): completes past meetings, triggers insight synthesis, generates monthly draft reports
4. **Marketing drip** — `/api/marketing-drip`, four times a day (02:30, 05:30, 08:30, 23:30 UTC — 12:30pm, 3:30pm, 6:30pm and 9:30am Sydney): sends the due step of every active outreach ladder (parchment on day 0, midnight on day 7, terracotta on day 14), picking up queued bulk-campaign day-0s at their assigned window. Each run is capped at one window's capacity (`MARKETING_DAILY_BUDGET` ÷ 4, default 20) and at the remaining daily budget. Replies, tracked clicks and bounces stop a ladder before the cron sees it, and the cron additionally refuses to email leads marked bounced/replied/engaged.
5. **Leader countdown** — `/api/leader-reminders`, every 15 minutes via Vercel Cron (`*/15 * * * *` in the root `vercel.json`; Vercel attaches the `CRON_SECRET` Bearer header automatically): one short letter to each circle leader at 60, 30, and 15 minutes before their circle — the reserved/sealed counts, the way in when set, and the door to the leader room. Idempotent through the `meeting_leader_reminders` ledger (migration 000043): a (meeting, leader, step) row is claimed before each send and rolled back on failure, so re-runs never double a reminder.

## Authorization

All five endpoints accept exactly one credential:

```
Authorization: Bearer <CRON_SECRET>
```

There is no User-Agent check and no `?secret=` URL parameter (both were removed — User-Agent is spoofable and URL secrets leak into access logs). When `CRON_SECRET` is set as a Vercel environment variable, **Vercel Cron automatically sends this header** on every invocation, so no extra configuration is needed.

## Required Environment Variables

```bash
# Shared secret for all cron endpoints (generate a long random string)
CRON_SECRET=your-random-secret

# Used by the lifecycle route and the document upload flow
SUPABASE_SECRET_KEY=your-secret-key

# Public Supabase URL (already present for the app)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

## Option A: Vercel Cron (Recommended)

The `vercel.json` defines all three jobs (18:00, 09:00, 02:00 daily). Vercel calls the endpoints automatically on deploy with the Bearer header attached. Confirm under **Vercel Dashboard → Your Project → Cron Jobs** after deploying.

## Option B: External Scheduler (cron-job.org, Supabase Cron, etc.)

Configure your scheduler to send the header (never put the secret in the URL):

```
GET https://your-domain.com/api/send-reminders
GET https://your-domain.com/api/trigger-news-questions
GET https://your-domain.com/api/meeting-lifecycle
curl -H "Authorization: Bearer $CRON_SECRET"   https://your-domain.com/api/marketing-drip
curl -H "Authorization: Bearer $CRON_SECRET"   https://your-domain.com/api/leader-reminders
Header: Authorization: Bearer <CRON_SECRET>
```

The leader countdown runs on Vercel Cron every 15 minutes (`*/15 * * * *` in the root `vercel.json`). If you ever move it to an external scheduler instead, it wants a 15-minute cadence (e.g. cron-job.org: `*/15 * * * *`).

## Securing the Endpoints

The Bearer check is the only gate. For additional protection, add a reverse-proxy rate limit in production. `CRON_SECRET` must be long, random, and stored only in environment variables — rotate it if it ever appears in a log or URL.
