# hangouts ❤

An unreasonably over-engineered web app for two people: ask each other out, find days you're both free, plan dates, and keep the photos.

**Live:** https://mikachufm2202.github.io/hangouts/

| Tab | What it does |
|---|---|
| `ask.tsx` | "Will you go on a date with me?" The No button dodges your cursor or finger, changes its excuse, and gives up after 15 tries. Yes runs a fake deploy pipeline and then confetti. |
| `calendar.ts` | Monthly calendar. Each person taps (or drags) the days they're free. Days you're both free light up 💞 and are listed with a "Plan a date" button. |
| `plans.yml` | Upcoming dates as Jira-style tickets (Backlog → Awaiting RSVP → Scheduled), a live countdown to the next one, and 🎲 date ideas. |
| `archive.log` | Past dates as a `git log`: rating, mood, best moment, and a photo gallery. |
| 📸 button | Take or upload photos. They attach to today's date, or start a "Spontaneous hangout" if nothing is planned. |

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

## Dev

No build step. `python3 -m http.server` and open `localhost:8000`. `node merge.test.mjs` checks the sync merge rule.
