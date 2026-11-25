<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Meek Meet — Project Context

## Overview
Meek Meet is a faith-rooted, interfaith community organizing platform. The core mission: "The meek shall inherit the earth" (Matthew 5:5) — the spark is Christian, but the promise is claimed by every major tradition (Psalm 37:11, Qur'an 21:105, Bhagavad Gita 5:18, Dhammapada 223, Japji Sahib 27, Tao Te Ching 66), and the public site says so explicitly (`(marketing)/_components/ManyNamesSection.tsx` — the "One Promise, Many Names" section, echoed in the email-shell footer and the flyer footer). Members gather in local **circles** led by **shepherds**, answer discussion questions in regular meetings, and the platform synthesizes their responses into anonymized insights and reports for civic authorities.

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
- **Deploy**: Vercel (workspace root `vercel.json`; 3 cron jobs — see CRON_SETUP.md)
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
      shepherd/[circleId]/# shepherd area: meetings, questions, routine, reports, settings
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
  migrations/             # ordered SQL; 000025 = production hardening, 000029 = virtual-first circles, 000031 = dual admin invites (run in order)
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
