# Meek Meet — Apple App Store Listing

Use this content in App Store Connect. Apple has no bulk import — paste manually.
The description below is identical to the Google Play full description (both
stores allow 4,000 characters).

---

## App Information

- **App name:** Meek Meet: Sacred Text & Voice (30-char limit, exact fit)
- **Subtitle** (30-char limit):
  `Sacred text, new-moon circles.`
- **Promotional text** (170-char limit, editable without new release):
  `Free sacred texts from five faiths, new-moon community meetups, and a safe way to turn shared concern into real change. Blessed are the meek — organised.`
- **Category:** Primary: Lifestyle (or Reference). Secondary: Social Networking
- **Content rights:** Meek Meet contains original content and public-domain sacred texts.

## Keywords (100-char limit, comma-separated, no spaces)

```
scripture,bible,quran,tanakh,faith,prayer,meditation,church,community,reflection,meetup
```

(99 characters — verify in App Store Connect, which counts differently for some locales.)

---

## Description (4,000 characters max)

Meek Meet is where the quiet ones become a chorus. 🕊️
Sacred texts from five faiths. New-moon community meetups. A safe way to turn shared concern into real change — 100% free, no ads, and no tracking of your reading. Ever.

⚠️ INDEPENDENT INITIATIVE
Meek Meet is a private community app. It is not a government entity, is not affiliated with any government, council or public authority, and does not provide government services. Official government portals: australia.gov.au · usa.gov · gov.uk · gov.il

📖 THE SACRED LIBRARY — FREE FOREVER
Read the Holy Bible, the Holy Quran, the Tanakh, the Dhammapada and the Book of Mormon in one warm, reverent reading space. Daily verses, weekly themes, bookmarks, highlights and journaling — every feature free. No subscriptions. No paywalls. No advertisement ever interrupting Scripture. Sacred words should never sit behind a price tag — so they never will here.

🧭 FIND THE OTHER MEEK IN YOUR AREA
Meek Meet is an Australia-first initiative that grows with demand — now welcoming the world. Discover a New Moon Circle near you: church-basement warmth, a mosque's welcome, a synagogue's depth, a meditation hall's calm — or gather online by video call from anywhere while your local community forms. Every circle is led by a verified local shepherd, so every room stays safe, warm and honest.

🌙 GATHER UNDER THE NEW MOON
For thousands of years the new moon has called communities to pause, reflect and begin again. We honour that rhythm: monthly meetups, in person or by video call, where every voice is heard and nobody is shouted over. Few people? Everyone meets in one global circle. Many? The community gently divides into local circles — the system organises itself as you grow. No logistics, no gatekeeping, no loneliness.

🗣️ YOUR VOICE IS THE POINT
In each gathering, thoughtful questions arrive on your phone. Answer in your own time, in your own words — like journaling, except your words join a chorus. Meek Meet's anonymised synthesis weaves many answers into one clear signal: the real patterns, concerns and hopes your community shares. Not the loudest voice. The truest one.

📊 QUIET POWER, PROVEN
"Blessed are the meek, for they shall inherit the earth." — Matthew 5:5
The meek do not shout — they organise. When many small voices speak together, neighbourhoods change and leaders listen. Meek Meet turns circle conversations into anonymised, decision-ready reports — yours to share with local councils, MPs or community groups through their official channels (see the official portals above). The gentlest among us, gathered, are the strongest force in society. We build the world from the inside out. 🌍

🐑 BECOME A SHEPHERD
Lead a circle in your area. Full shepherd tools: meeting scheduling, guided questions, live meeting flow, anonymised analytics and one-tap report generation — with identity and safeguarding verification for every leader. Lead your community the way it deserves.

✨ WHY MEEK MEET
🕊️ Sacred texts from five traditions — Bible, Quran, Tanakh, Dhammapada, Book of Mormon
💛 Free forever — no ads, no subscriptions, no paywalls
📿 Daily verses and weekly themes for prayer, reflection and journaling
⭕ Find or lead local circles — verified shepherds keep every gathering safe
🌙 New-moon rhythm — a monthly reset, ancient and alive
💻 Virtual meetups from anywhere; local circles form as your community grows
🤝 People of every faith, culture and way of life — everyone welcome
🔒 Anonymised answers — your words count, your identity stays yours
📈 Insight patterns emerge from collective listening
🏛️ Decision-ready reports — share them with whoever can act
🎨 Warm, calm design — an app that feels like rest, not noise
🚫 Zero ads. Zero data selling. That's a promise.

The world doesn't need more noise. It needs the meek — organised. 🕊️
Download Meek Meet. Bring your voice. Meet the others.

🏳️ An Australia-first initiative — expanding as communities form.

---

## Screenshots (App Store Connect)

- **iPhone 6.7"** (1290×2796): REQUIRED — `store-assets/output/iphone67/` (8 images)
- **iPhone 6.5"** (1242×2688): optional but recommended — `store-assets/output/iphone65/` (8 images)
- **iPad Pro 12.9"** (2048×2732): REQUIRED (app supports iPad) — `store-assets/output/ipad129/` (8 images)

Upload order matches the Play listing captions:
1. The Word, every day
2. Blessed are the meek
3. Reflection with purpose
4. Find your circle
5. Gather under the new moon
6. One voice, counted
7. The pattern emerges
8. The meek organise

- **App icon:** 1024×1024 — `store-assets/output/icon-1024.png`
  (already installed into the Xcode asset catalog at
  `ios/App/App/Assets.xcassets/AppIcon.appiconset/`)

---

## Version Information (per release)

- **What's New** example: "In-app account deletion, safety reporting, and under-the-hood improvements."

---

## App Review Information

- **Sign-in required:** Yes
- **Demo account:** same reviewer credentials as Google Play:
  - Email: `review@meekmeet.com`
  - Password: see `PLAY_STORE_LISTING.md` (single source of truth — keep both in sync)
- **Notes for reviewer:** "Tap 'Reviewer access' on the login screen to switch from
  magic-link mode to password mode, then sign in with the credentials above. This
  account has admin and shepherd privileges for full feature access. Account
  deletion is available in Profile → Delete account."

## Compliance checklists

- **Account deletion in-app:** DONE — Profile → Delete account (permanently removes
  account and personal data via the `delete_own_account` RPC).
- **UGC moderation:** in-app "Report a safety concern" (9 categories) + admin review;
  published conduct policy in Terms; child-safety page at
  https://www.meekmeet.com/child-safety.
- **Privacy policy:** https://www.meekmeet.com/privacy
- **Terms of Use:** https://www.meekmeet.com/terms
- **Age rating:** 13+ / Teen equivalent — user interaction in closed circles,
  no explicit content. Answer the questionnaire honestly (unmoderated UGC: yes,
  restricted to members; no gambling, no contests).
- **Sign in with Apple:** NOT required — login is email magic-link/password only
  (Apple mandates it only when third-party/social logins are offered).
- **Export compliance:** standard HTTPS only — answer "no" to encryption exemption
  questions (or use the exemption for standard encryption).
- **Data collection:** mirrors the Google Play Data Safety form — see
  `PLAY_STORE_LISTING.md` for the full list.

---

## Build & Upload (requires macOS, cloud Mac, or CI macOS runner)

1. `cd meek-meet-mobile && npm run build`
2. `npx cap sync ios`
3. Open `ios/App/App.xcodeproj` in Xcode, select the App target → Signing & Capabilities →
   choose your Apple Developer team (bundle id `com.meekmeet.app` must be registered).
4. Product → Archive → Distribute App → App Store Connect.
5. In App Store Connect: create the app, attach the build, paste this listing, submit.

Versioning: `MARKETING_VERSION` (1.0.22) and `CURRENT_PROJECT_VERSION` (127) are set
in the Xcode project to match Android.
