# hangouts ❤

A little web app for two people: ask each other out, find days you're both free, plan dates, and keep the photos.

**Live:** https://mikachufm2202.github.io/hangouts/

| Tab | What it does |
|---|---|
| 💌 Ask | "Will you go on a date with me?" The No button glides away from your cursor or finger and never lands on a link or button. Yes ends with confetti. |
| 📅 Calendar | Each of you taps the days you're free. Days you're both free turn purple. |
| ✨ Plans | Upcoming dates, a countdown to the next one, ideas saved for later. |
| 💡 Ideas | 156 daytime date ideas around KL (100 of them 🔥 trending), all under RM150 for two. Search, filter by type, budget and distance, save to Plans. |
| 🎟️ What’s on | Real events in KL and nearby for the next month (refreshed every Friday at 5am, or any time with **Find new events**), from Meetup and allevents.in, plus Eventbrite when it's reachable (Eventbrite blocks GitHub's servers, so it only shows up when `scripts/events.py` runs from a home connection). Work trainings, conferences and webinars are left out. Filter by daytime or weekend, add one to Plans. **Find new events** asks GitHub to search again right away. |
| 🎮 Activities | 71 ways to do things together: watch-together sites like Scener and Teleparty, browser games, phone games, co-op games, couple apps and things to create or explore. Search and a Free-only filter. |
| 📷 Memories | Past dates by month, with ratings, best moments and photos. |
| 💖 button | Tap **I love you** as many times as you like. Each tap floats hearts; after a short pause one message goes out, "I love you ×27", and the other phone plays a full-screen heart show. |
| 📸 button | Opens the camera. Photos attach to today's date. |

## Sharing between two phones

The site runs entirely in the browser. Until you turn on sync, everything stays on one device.

Sync stores your data in this repo, on the `data` branch, **encrypted** (AES-256-GCM, key derived from your shared passphrase with PBKDF2-SHA256 at 600k iterations). The repo is public, but nobody can read your plans or photos without the passphrase.

One-time setup:
1. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token.
   - Repository access: **Only select repositories → hangouts**
   - Permissions → Repository → **Contents: Read and write**
2. Open the site → ⚙ → paste the token, pick a long passphrase → **Create vault & sync**.
3. On the other phone, open the site and enter the same passphrase. Done.

The token is stored in `vault.json`, encrypted with the passphrase. A weak passphrase can be brute-forced offline, so use a long one (a sentence works well).

## Notifications

⚙ → Notifications → **Turn on** (on iPhone, from the home-screen app). You can pick which kinds you get: I love yous, love notes, date questions.

There's no server: the sender's phone starts the `notify` GitHub Action (`.github/workflows/notify.yml`) with the other person's push subscriptions, and it delivers a standard Web Push, usually within 20–40 seconds. The signing key is the `VAPID_PRIVATE_KEY` repo secret; the public half is in `app.js` and the workflow. Notification text is always generic ("Mika wrote you a note"), never the note itself, because GitHub sees it. Needs sync set up.

## Dev

No build step. `python3 -m http.server` and open `localhost:8000`. `node merge.test.mjs` checks the sync merge rule. `python3 scripts/events.py --check` checks the event parser; without `--check` it prints this week's events.
