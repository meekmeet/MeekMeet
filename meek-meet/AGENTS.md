<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Meek Meet — Project Context

## Overview
Meek Meet is a faith-rooted, interfaith community organizing platform. The core mission: "The meek shall inherit the earth" (Matthew 5:5) — the spark is Christian, but the promise is claimed by every major tradition (Psalm 37:11, Qur'an 21:105, Bhagavad Gita 5:18, Dhammapada 223, Japji Sahib 27, Tao Te Ching 66), and the public site says so explicitly (`(marketing)/_components/ManyNamesSection.tsx` — the "One Promise, Many Names" section, echoed in the email-shell footer and the flyer footer). Members gather in local **circles** led by **leaders**, answer discussion questions in regular meetings, and the platform synthesizes their responses into anonymized insights and reports for civic authorities.

## Terminology — the shepherd doctrine (do not regress)
- **The facilitator is a "leader", never a "shepherd", in all user-facing copy.** Calling one member the shepherd implies the rest are sheep; the platform's doctrine is the opposite.
- **Every member is a shepherd** — of the neighbours and friends not yet in the circle. The leader is first among shepherds: they keep the order of the room, they are not above it. This thread is deliberate in the FeaturesSection card ("Everyone Is a Shepherd", hadith + Psalm 23), the handbook email P.S., and the invite_shepherd email pitches.
- **Internal identifiers keep the old name** (`profiles.role = 'shepherd'`, `circle_shepherds`, `shepherd_applications`, `/shepherd` and `/dashboard/shepherd` routes, `invite_shepherd` template key). Renaming them is a DB migration with zero user benefit — change copy, not identifiers.

## The deficit gate (internal — master admin only, never regress)
- **Every circle question is authored from a (deficit → virtue) pair**, not tagged after the fact. The taxonomy lives in `packages/core/src/questions/deficits.ts` in TWO families: **the Seven (personal)** — pride, greed, craving/lust, envy, gluttony, wrath, sloth/acedia — what holds a person back; and **the Five (societal)** — stagnation→Momentum, fragmentation→Cohesion, helplessness→Agency, short_sightedness→Foresight, gatekeeping→Open Access — what holds a people back. Each carries its virtue pole and Buddhist/Islamic/Jewish/Hindu/Sikh/classical parallels.
- **The gate is fixed; the topics grow.** The deficit families change only with deliberate doctrine work. Day-topics (7 today, designed to grow toward 14 cycled in a pattern) and their question banks can grow freely — but every new question must be authored from a gate pair, and the balance is test-enforced (147 topic questions = exactly 21 per personal deficit and exactly 3 per deficit within every topic; 20 threshold questions = 4 per societal deficit). A question without a deficit cannot ship.
- **The bridge rule (how every question is authored)**: a question passes the gate only if it crosses from the personal root to the productive turn — chamber one names what holds YOU back (the deficit), chamber two lands on what the circle, the street, or the country can DO with the answer (the virtue made civic). A question that ends inside the person is therapy, not a circle; a question with no inner root is a survey. Both fail the gate.
- **Never twice**: the dispatch cron and the redraw action gather the member's full question history (every past handbook's responses, up to 80) and draw only from questions never dealt (`drawWithRecycling` in `src/lib/handbook.ts`). With 21 per theme and 3 drawn weekly, a member sees seven weeks of fresh questions per theme before the well turns over; even then, no question repeats within a single draw.
- **The Threshold** (`packages/core/src/questions/threshold.ts`): a day-less bank (`dayOfWeek: -1`, NOT in `CIRCLE_TOPICS`) drawn into EVERY handbook regardless of weekday — one question per member (`HANDBOOK_THRESHOLD_COUNT`), the standing appointment with what carries us forward (technology, science, housing, health, access — the speeding-up of human progress). Threshold redraws stay within the threshold bank; swaps log `topic_id: "the-threshold"`.
- **The layer is invisible**: members and regular admins never see deficit/virtue metadata anywhere. The only surface is `/dashboard/admin/deficits` ("The Gate" nav item), gated server-side by `isMasterEmail`, rendering both families. Never render gate content in any member-facing or regular-admin UI, email, or PDF.
- **The ratio is the product**: `src/lib/deficit-matrix.ts` aggregates drawn/answered/sent-back per deficit (both families) from handbooks + swap log. A high sent-back rate on a deficit is itself the finding (the street can't name it aloud yet). This feeds the anonymised reports toward the virtue poles.

## Circle territory (suburb claims)
- **An approved leader claims their suburb.** `approveApplication` calls `claimSuburbForLeader` (`src/app/dashboard/admin/actions.ts`): circles carry a normalized `area_key` (migration 000040; same normalization as `member_areas` and the circle-organizer), and approval creates the suburb's circle (`New Moon Circle — {Suburb}`) with the leader seated as `lead` in `circle_shepherds` (admin insert policy, migration 000041).
- **The suburb locks; growth is by overflow, never competition.** A second applicant from a claimed suburb gets NO rival circle while the claiming circle has room — the approval email tells them the suburb is held and they'll be called on when it overflows. The lock releases (`suburbStatus` → `expandable` in `src/lib/circles/territory.ts`) when every circle in the suburb is full (seat cap, `DEFAULT_CAP` from the matcher) OR unseated demand from the suburb (`member_areas` count minus seated) reaches `EXPANSION_DEMAND` (8, matching the organizer's spinout threshold). Expansion creates the successor circle (…II, III) under the NEW leader.
- **Admin visibility**: the applications page shows a territory chip per application (Suburb open / Held — {circle} / Overflowing) via `getTerritoryStatuses`. Claims and deferrals are audit-logged (`circle.claim`, `circle.claim_deferred`).
- Territory claim is best-effort inside approval: a claim failure must never undo an approval (logged, email still sends).

## The session handbook (the meeting engine)
- **No reservation, no participation**: `join_url` renders only for signed-in users with an active `going` RSVP — already an invariant, and the foundation of the model.
- **One theme per weekday** (`packages/core/src/questions/circle-topics.ts`): every circle gathering on the same weekday — anywhere in the country — sits with the same circle topic (Sunday The Source … Saturday Justice & the Common Good), with a ~12-question bank per theme. The theme follows the meeting's weekday **in Australia/Sydney** (`getTopicForDate`), never UTC. The bank is shared with mobile via `@meekmeet/core` — change it in core only.
- **Circles gather on the new moon and no other night.** `createMeeting` (`src/app/dashboard/shepherd/[circleId]/actions.ts`) and both mobile creation screens (`MeetingCreateScreen`, `ShepherdManageScreen`) reject any date more than 1.5 days from the nearest new moon (`isNewMoonDay`/`getNearestNewMoon` in `@meekmeet/core/utils`), naming the nearest new moon in the error. The leader-room form defaults its date to the next new moon. Because the lunar month drifts through the solar week, the weekday theme rotates naturally month to month.
- **Meek Meet gathers online only.** New meetings must be `digital` — `createMeeting` rejects `in_person`/`hybrid` (and any unknown type) with an online-only error, and both mobile screens enforce the same guard (they insert directly, bypassing the server action). The leader-room and mobile forms carry no type selector or location fields — only the new-moon date, the hour, and a join link (blank falls back to the circle's standing room). Legacy in-person rows still render, but nothing new can be one. First aid is not collected or claimed anywhere: the apply form, server action, privacy notice, SafetyTrust card, admin applications view, LeaderCTA, and authority letter all dropped it (leaders verify identity, WWCC, and police check only; the `first_aid_expiry` column and `first_aid` document type remain in the DB for legacy rows only).
- **The questions are never fixed**: four days before a meeting, `/api/handbook-dispatch` (daily cron, 19:00 UTC) creates a `session_handbooks` row (migrations 000038/000039) for every `going` RSVP with **3 questions drawn at random** from the day's theme plus **1 threshold question**, stamps `topic_id`, and emails the member their **summons** — never the session. Idempotent via `(meeting_id, profile_id)`, `emailed_at`, and `meetings.leader_pack_sent_at`.
- **The summons returns daily until answered**: the same cron's reminder phase (`sendDueReminders`) scans incomplete handbooks (`completed_at` null AND answers actually empty — `handbookComplete` is the truth, `completed_at` can lag) for upcoming, scheduled meetings and emails `buildHandbookReminderEmail` ("The summons stands" / COMPLETE YOUR HANDBOOK), at most once per `REMINDER_INTERVAL_HOURS` (20h, so the daily cron never skips through drift), stamped via `last_reminder_at` (migration 000042). It runs even when no meeting sits in the dispatch window, and stops the moment the handbook is complete or the meeting passes.
- **The summons is sealed (sanctum theme)**: the emails are deliberately near-empty (~70 words) — a black letter under a sparse gold star sky (`public/sacred/star-sky-bg.png`), the logo + MEEK MEET wordmark, the luminous moon bearing the Seed of Life etched within her limb (`public/sacred/moon-seed.png`, carried as a real `<img>` so no copy ever crosses her face), a standing copy form (`{name},` / `{circle} meets {date} · {mode}.` / the law: answer before you join, in the circle you read what you wrote), one button, one attendance line, and the scripture footer. Both images are generated by `store-assets/sacred-background.mjs`. The whole letter fits on one screen — no second band, nothing collapsed behind "show quoted text". They NEVER carry the theme, the questions, the roster names, the place, or the join link — everything opens only behind sign-in (the handbook page; the leader room for the leader). The sanctum theme lives in `EMAIL_THEMES` outside the marketing ladder (`EMAIL_THEME_ORDER` stays 3 rungs).
- **Members may redraw any drawn question** ("Draw another" on `/dashboard/handbook/[meetingId]` → `regenerateHandbookQuestion`): same theme, new random question; every redraw is logged to `handbook_question_swaps` — the self-assortment dataset (which questions people answer vs skip). Leader-set custom questions cannot be redrawn.
- **The form is variable**: `variant = 'first_circle'` (warmer intro, read aloud) or `'returning'` (modest check-in: name, passions, what happened since the last circle). Logic in `src/lib/handbook.ts`.
- **The leader pack**: the same cron emails each circle leader their summons (also sanctum): the theme, the roster with first-circle markers, and the charge — the full run sheet (`LEADER_RUN_SHEET`) and the liturgies (`LEADER_OPENING_WORDS`/`LEADER_CLOSING_WORDS`) live only in the leader room. **Sessions have no set time — they run until everyone is heard.**
- **The leader room** (`/dashboard/shepherd/[circleId]/meetings/[meetingId]`): the night's whole kit — the theme, the open-floor question drawer (a question drawn aloud from the night's bank), the full run sheet and liturgies, the leader's training (`src/lib/leader-guide.ts`, nine chapters), the roster (attendance via the `mark_attendance` RPC — the ONLY write path for `rsvps.attendance`), counts (reserved/sealed/first-circle), and **the way in**: the leader sets `join_url` + `access_id`/`access_code` (migration 000043) and one click sends them to every reserved member (`buildJoinDetailsEmail`, sanctum). Circle editing (name/description/image/standing room) lives in a panel in the room and in Settings. **Leaders never edit the questions** — the structure belongs to the platform, the room to the leader; the Questions and Routine tabs were removed with the topic engine.
- **The leader's countdown**: `/api/leader-reminders` (Vercel Cron every 15 min, `*/15 * * * *` in the root `vercel.json`) emails each leader at 60, 30, and 15 minutes before the circle: the counts, the way in when set (nagging honestly when not), the door. Idempotent via the `meeting_leader_reminders` ledger — a (meeting, leader, step) row is claimed before each send and rolled back on failure.
- **The seal — no sealed handbook, no entry**: the handbook seals `HANDBOOK_LOCK_HOURS_BEFORE` (2) hours before the circle (`handbookSealsAt`/`isHandbookSealed`/`HANDBOOK_SEAL_RULE` in `src/lib/handbook.ts`). Enforced three ways: the join link renders ONLY for a completed handbook (handbook page AND the public circle page's `joinLinks`/`handbookPendingMeetingIds`), `saveHandbook`/`regenerateHandbookQuestion` refuse writes after the seal, and the leader room roster names who the door closed for ("handbook unsealed — the door closed for them") with a sealed-count in the header. The summons and reminder both declare the rule in one line. Members reach the handbook in-app via the dashboard's upcoming-gatherings chips ("Complete your handbook" / "Handbook sealed") — the email is never the only door.
- **Online circles**: digital/hybrid meetings carry `join_url` plus `access_id`/`access_code` (meeting ID and passcode, set by the leader) into the handbook page and the join-details email — always gated to reserved members with sealed handbooks, never public.
- **The PDF handbook**: `/dashboard/handbook/[meetingId]/pdf` renders the member's own Q&A (in order) + intentions via pdf-lib (`src/lib/handbook-pdf.ts`; standard fonts — sanitize member text, it throws on non-WinAnsi chars).
- Sample renderer: `node meek-meet/scripts/send-sample-handbook.mjs [email]` (jiti; renders the real templates — both member variants + the leader pack).
- Demo walkthrough: `node meek-meet/scripts/seed-demo-circle.mjs [email]` (idempotently seeds a demonstration circle + digital meeting + RSVP + drawn handbook for the given member and prints the handbook / leader-room URLs — how to eyeball both rooms end to end).

## Design Language
- **Aesthetic**: warm, reverent, editorial — parchment/paper feel rather than institutional navy
- **Palette tokens** (`src/app/globals.css` @theme): cream, parchment, charcoal, midnight, wheat, sage, terracotta, sky-soft, border-warm
- **Typography**: Cormorant Garamond (serif headings), Source Sans 3 (body), Caveat (scripture/script accents) — self-hosted woff2 in `src/app/fonts/` via `next/font/local` in `src/app/layout.tsx` (downloaded by `scripts/download-fonts.mjs`; never fetch Google Fonts at build time)
- **Mood**: gentle, structured, trustworthy

## Architecture
- **Framework**: Next.js 16 (App Router, dynamic rendering) + TypeScript (strict) + Tailwind CSS v4
- **Backend**: Supabase (Postgres + RLS + Auth + Storage + Edge Functions + Realtime)
- **Auth**: magic link + Google OAuth via `@supabase/ssr`; session refresh in `src/proxy.ts` (protects `/dashboard`)
- **Email**: Resend (`src/lib/resend.ts`, lazy-initialized)
- **Animation**: Framer Motion · **Icons**: Lucide React
- **Error monitoring**: Sentry via `@sentry/nextjs` — `src/instrumentation.ts` (server) + `src/instrumentation-client.ts` (browser), both inert without `NEXT_PUBLIC_SENTRY_DSN`. Client boundaries report through `src/lib/monitor.ts`.
- **Rate limiting**: fixed-window per-IP limiter in `src/lib/rate-limit.ts`, applied to all `/api` routes (env-tunable, see `limiters`)
- **Deploy**: Vercel (workspace root `vercel.json` — the authoritative cron config; 7 cron entries incl. the 15-minute leader countdown — see CRON_SETUP.md)
- **Mobile**: sibling workspace `meek-meet-mobile` (Capacitor/React) shares the same Supabase project. Its scripture reader loads JSON from `meek-meet-mobile/public/data/scriptures/<tradition>/`; the "Sacred Library" (Dead Sea Scrolls, Nag Hammadi, Apocrypha, Pseudepigrapha, Rig Veda, Upanishads, Tao Te Ching, Analects, Japji Sahib, Jain Sutras) is editorial curation — passage texts are selected public-domain excerpts with source references, never paraphrase passed off as scripture.

## File Structure
```
src/
  app/
    (marketing)/          # public pages: /, /about, /circles, /circles/[slug], /shepherd,
                          # /voice, /child-safety, /delete-account, /code-of-love, /library
                          # (+ /library/[tradition]/[book] — the Sacred Library reader,
                          # all statically generated) — every public page gets
                          # Navbar+Footer via the group layout; never add public pages at
                          # src/app root level, they would render chrome-less
    dashboard/            # authenticated member area
      admin/              # admin-only: applications, verification, authorities, members, marketing
      shepherd/[circleId]/# shepherd area: meetings, reports, settings
    api/                  # route handlers (cron + public insights + upload + circle-organizer)
    auth/callback/        # OAuth/magic-link callback
    login/ privacy/ terms/
  components/             # shared components (auth-provider, pwa/install-banner)
  data/
    sacred-library.ts     # editorial metadata for the 10 curated collections
    scriptures/           # curated public-domain excerpts per tradition — MIRROR of
                          # meek-meet-mobile/public/data/scriptures/ (the 10 Sacred
                          # Library traditions only; main canons stay mobile-only).
                          # Change one, change both. Read via src/lib/library.ts at
                          # build time; library pages are fully static.
  lib/
    supabase/             # client.ts (browser), server.ts (RSC), middleware.ts, service.ts (service role)
    reports/              # circle report generation + authority submission
    cron-auth.ts          # Bearer-only check shared by all /api cron routes
    rate-limit.ts         # fixed-window per-IP limiter used by all /api routes
    monitor.ts            # Sentry reporting wrapper (inert without DSN)
    env.ts                # requireEnv() fail-fast env validation
    validation.ts         # isValidUuid, escapeHtml, assertNonEmptyString, ...
  test/
    mock-supabase.ts      # chainable Supabase client mock for unit tests
    setup.ts              # vitest setup (cleanup, env reset)
  proxy.ts                # session refresh + /dashboard guard (Next 16 proxy convention)
supabase/
  migrations/             # ordered SQL; 000025 = production hardening, 000029 = virtual-first circles, 000031 = dual admin invites, 000043 = leader room (meeting access details + reminder ledger) (run in order)
  functions/              # 5 edge functions (Deno): synthesize-*, generate-*
  config.toml             # verify_jwt per function
```

## Invariants — do not break these
- **`profiles.role` is immutable from user-JWT clients** (DB trigger `guard_profile_role`). Role changes happen ONLY through three SECURITY DEFINER RPCs, each flipping the transaction-local `app.role_change_allowed` switch: `review_shepherd_application` (admin shepherd approvals), `invite_admin`/`revoke_admin` (master admin only — see below). Never write `role` via `.from('profiles').update()`.
- **Admin management is master-only.** The master admin is `meekmeets@gmail.com` — hardcoded in `src/lib/master-admin.ts`, migration 000025 (`handle_new_user_admin` bootstrap) and migration 000031 (`is_master_admin()`). Invited admins have full admin powers everywhere EXCEPT inviting/revoking admins (server actions in `dashboard/admin/admins/actions.ts` check `isMasterEmail`, and the `invite_admin`/`revoke_admin`/`revoke_admin_invite`/`get_admin_invites` RPCs enforce it in the DB). The Admins nav item renders only for the master.
- **Service-role key never in the database.** It lives in Supabase Vault (`supabase_service_role_key` secret); `meek_meet_config` holds only non-secret config. See DEPLOYMENT.md §4.
- **Cron routes** accept only `Authorization: Bearer $CRON_SECRET` via `src/lib/cron-auth.ts`. No User-Agent checks, no URL secrets. All are also rate-limited via `src/lib/rate-limit.ts`.
- **API routes must call `rateLimit()` before doing any work** (see any `src/app/api/**/route.ts`). Tune via `RATE_LIMIT_*` env vars; never bypass for public endpoints.
- **Anonymous meeting reads** go through the `public_meetings` view (no join_url/notes/coordinates). The `meetings` table itself is authenticated-only.
- **Marketing sends are paced, never blasted.** Bulk lead drips (`startLeadDrips`) QUEUE sequences with staggered `next_run_at` slots — `src/lib/marketing/pace.ts` assigns ~`MARKETING_DAILY_BUDGET`(default 80)÷4 per send window (02:30/05:30/08:30/23:30 UTC = 12:30/15:30/18:30/09:30 Sydney), rolling across days for large batches; nothing sends from the action itself. `/api/marketing-drip` (4×/day per `vercel.json`) fires due steps, capped per window AND by the remaining daily budget. One drip per address per 14-day cooldown (`DRIP_COOLDOWN_DAYS`): active ladders and any ladder that sent mail within the cooldown block a new one (one-off sends are the deliberate escape hatch). Bounced/complained addresses are stopped at the webhook (`stopped_bounced`) and the cron refuses to email leads marked bounced/replied/engaged. Marketing sends default to the drip ladder (`marketing_sequences`, migration 000036): day 0 fires per schedule, days 7/14 from the cron. One-off sends are the exception, behind the "One-off send" toggle. `marketing_leads` (000037) is admin-only and org-facing: import only publicly-listed org contact emails, never scraped personal addresses. The org letter's scripture quote is faith-aware (`faith` column → Qur'an 49:13, Hillel/Pirkei Avot 1:14, Metta Sutta, Mahabharata, Guru Nanak, or civic). Every pitch body also NAMES the spark openly — our name comes from Jesus' promise that the meek shall inherit the earth (Isa in the islamic pitch, "Psalms 37:11 says it first" in the jewish one, civic restatement in the secular one). The spark is never hidden; it's the bridge. The shared email-shell footer and flyer footer carry the deliberate "The promise has many names — Matthew 5:5 · Psalm 37:11 · Qur'an 21:105 · Tao Te Ching 66" thread line on every send.- **Public marketing pages never touch Supabase per request.** `src/proxy.ts` skips `updateSession` (the `auth.getUser()` round-trip) unless the request carries a Supabase auth cookie (`*-auth-token*`) — anonymous visitors pay zero auth latency; logged-in users still get session refresh everywhere. Public circle reads go through `src/lib/public-data.ts`: cookie-free anon-key queries wrapped in `unstable_cache` (60s TTL, `circles` tag). Never close over cookies/headers inside those cached functions. Anonymous `/dashboard` requests are redirected by the proxy without any Supabase call.
- **The site is an installable PWA** (`src/app/manifest.ts`, cache-free `public/sw.js`, `InstallBanner` in the root layout). The service worker must stay cache-free — a caching SW on a dynamic site invites stale-page bugs; only add caching with a deliberate strategy. The banner self-suppresses when installed, dismissed (localStorage `mm-pwa-dismissed`), or in standalone mode; iOS gets Share → Add to Home Screen instructions since Safari has no install API.
- **Join URLs are never public**: `join_url` renders only for signed-in users with an active `going` RSVP on that meeting (see the `[slug]` page). Never expose it in public queries or anonymous HTML.
- **Admin stats** come from the `get_admin_stats()` RPC (admin-gated), not a view.
- Server actions must call `supabase.auth.getUser()` and verify role/membership before any mutation (see `src/app/dashboard/admin/actions.ts` for the pattern).
- Never expose `SUPABASE_SECRET_KEY` to client components; the `NEXT_PUBLIC_*` publishable key is the only key the browser sees.

## Testing / verification
- `npm run build` from the workspace root builds `@meekmeet/core` then this app (type-checks + lints).
- **Web tests**: vitest + Testing Library, colocated as `*.test.ts(x)` under `src/`. Run `npm run test:run --workspace=meek-meet` (or `npm run test:web` from the root). The shared Supabase mock helper lives at `src/test/mock-supabase.ts`; test setup at `src/test/setup.ts`.
- `@meekmeet/core` has vitest unit tests for moon math and question-bank data integrity (`npm run test:core`).
- The mobile workspace (`meek-meet-mobile`) has vitest coverage (`npm run test:mobile` — watch mode; `test:run` for CI).
- CI runs all three suites on every push/PR (`.github/workflows/ci.yml`).
- Docs: DEPLOYMENT.md (infra + env), CRON_SETUP.md (schedulers), API.md (routes), GOVERNANCE.md (data policy).
