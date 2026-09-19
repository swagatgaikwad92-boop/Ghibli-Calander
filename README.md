# 🌿 Ghibli Forest — Calendar, Tasks & Day Log

A cozy, iOS-glassmorphism calendar + task + reminder + day-journal PWA with a
tiny forest-spirit companion. Fully functional, works offline, installable
to your home screen.

## What was broken

Your live site was missing all styling because the `styles/`, `scripts/`,
and `icons/` **folders got flattened** during upload (GitHub's drag-and-drop
uploader does this sometimes) — so `index.html` was still asking for files
like `styles/core.css`, but that folder no longer existed on the server,
only loose files at the root. The HTML and JS still loaded fine (which is
why you saw text and working buttons), but every CSS file 404'd, so the
page fell back to unstyled default browser styles.

**The fix:** every file in this package now lives directly in one flat
folder — no subfolders at all — and every reference inside `index.html`,
`manifest.json`, and `sw.js` points to plain filenames (`core.css`, not
`styles/core.css`). This makes it upload-proof: there's nothing left for
GitHub's uploader to flatten.

## What's inside (all flat, no subfolders)

```
index.html            ← the whole app shell (all screens + sheets)
manifest.json          ← PWA install config
sw.js                   ← offline service worker (caches the app)
core.css                 ← colors, type, glass system, layout tokens
components.css            ← nav, cards, timeline, calendar grid, sheets
themes.css                  ← day/night + seasonal atmosphere
state.js                     ← data model + localStorage persistence
calendar.js                   ← month/week date math
companion.js                   ← the forest-spirit mascot (SVG, reactive)
tasks.js                        ← task cards + swipe-to-complete/postpone
search.js                        ← universal search
render.js                         ← screen markup builders
app.js                             ← navigation, forms, reminders, PWA install
icon-192.png, icon-512.png, icon-180.png
```

Everything is plain HTML/CSS/JS — no build step, no framework, no bundler.
All your data is stored on your own device in `localStorage`; nothing is
sent anywhere.

## 1. Upload to GitHub (exact steps)

1. Go to your repository on GitHub (the one that publishes to
   `https://yourusername.github.io`, or a project repo — either works).
2. If you have old files there from the previous attempt (a `styles/`,
   `scripts/`, or `icons/` folder, or an old `index.html`), **delete them
   first** so nothing conflicts.
3. Click **Add file → Upload files**.
4. Drag in **all the files from this folder** — they're all loose files
   now, so there's no folder structure that can get flattened or broken.
5. Scroll down, write a commit message like "Fix styling — flat layout",
   and click **Commit changes**.

## 2. Turn on GitHub Pages

1. In your repo, go to **Settings → Pages** (left sidebar).
2. Under **Build and deployment → Source**, choose **Deploy from a
   branch**.
3. Under **Branch**, choose `main` and folder `/ (root)`, then **Save**.
4. Wait about a minute, then visit your site.
5. **If you had visited the broken version before**, do a hard refresh
   (Ctrl/Cmd+Shift+R) or clear site data for that domain once — the
   offline service worker may have a stale copy cached. After that first
   hard refresh it stays fresh automatically.

## 3. Install it on your phone

- **iPhone (Safari):** open the link → tap the Share icon → **Add to Home
  Screen**.
- **Android (Chrome):** open the link → you'll see an **Install Ghibli
  Forest** banner, or tap the ⋮ menu → **Add to Home screen**. The app
  also shows an in-app **Install** button in Settings once your browser
  is ready to install it.

Once installed, it opens full-screen with no browser bar, and works
offline.

## What changed in this update

Nothing about the Ghibli aesthetic, calendar, tasks, Day Log, Forest,
search, mascot, animations, glassmorphism, DABSy sync, or your existing
saved data was touched. Two things were added on top:

### 1. Standalone PWA fixes

- `manifest.json` gained `id`, `lang`, `categories`, and
  `display_override: ["standalone","minimal-ui","browser"]` — extra
  signals Android/Chrome use to decide how "installed" the app should
  feel. `display: "standalone"` (already correct) and your icons/colors
  were left as-is.
- The app now uses `100dvh` (real visible viewport height on mobile,
  falls back to `100vh` on older browsers) instead of plain `100vh`,
  which was letting the browser's address bar eat into the layout.
- The top bar, floating nav, and the 🌱 "Plant something" button now pad
  themselves with `env(safe-area-inset-*)`, so they sit clear of notches,
  camera cutouts, and Android's gesture bar instead of crowding them.
- `overscroll-behavior-y: none` stops the page "bouncing"/showing browser
  chrome on overscroll, which is one of the biggest things that makes a
  PWA feel like "a website in a box" instead of a real app.

### 2. Real notifications (new file: `notify.js`)

A permission flow lives in **Settings → Notifications**: tap **Enable**
once, and the browser's own permission prompt appears. If you dismiss or
block it, the app never re-prompts (browsers don't allow that anyway) —
it just tells you where to re-enable it. Notifications are delivered
through the service worker (`reg.showNotification(...)`), not a plain
`new Notification()`, so they work even when the tab isn't focused, and
tapping one opens Ghibli Forest straight to that day.

**Be direct about what's actually guaranteed**, because this matters for
a static, backend-free app:

| Situation | Reliability |
|---|---|
| **A. App open** | Reliable — checked every 20s, plus instantly on reopen/focus. |
| **B. App backgrounded** (tab/installed app still running, not force-closed) | Reliable on most browsers — timers are throttled but keep running. |
| **C. App fully closed/killed** | **Best-effort only.** Uses the Periodic Background Sync API, which only exists on Chrome-based browsers on Android, only for an installed PWA, and only once Chrome decides you've engaged with the app enough (its own internal heuristic — there's no toggle for this). iOS Safari, Firefox, and desktop Chrome don't support it at all, so on those, a reminder only fires once you actually reopen the app (at which point it catches up immediately, so nothing is silently lost). |

**Why not just fix C properly:** truly reliable delivery to a fully
closed app requires **Web Push** — the browser's OS-level push service
(FCM/APNs under the hood) waking the service worker even when nothing is
running. That needs a small server that holds a push subscription per
device and sends it a payload at the right time (or a third-party push
relay). That's a real backend, which you asked to avoid, and it's also
the only architecture that can guarantee tier C — nothing purely
client-side can. Periodic Background Sync above is the closest
approximation GitHub Pages allows without one. If you ever do want true
guaranteed background delivery, the smallest version of that backend
would be: one small server (even a free-tier serverless function) that
stores `{subscription, reminderTime}` and calls the Push API at the
right time — everything else in this app stays exactly the same.

Technical note: the service worker can't read `localStorage` (it's
page-only), so `notify.js` mirrors your reminders into IndexedDB
whenever one is added or checked, and the service worker reads *that*
during a background sync — it never touches your `localStorage` data
directly, and your reminders array in `localStorage` stays the single
source of truth (IndexedDB is just a read mirror for the SW).

## Notification personality upgrade (new files: `voice.js`, `engine.js`)

Reminders no longer say "Reminder: Study Physics at 5:30 PM." Instead:

- **`voice.js`** — the wording layer. A pool of several rotating,
  in-character lines per situation (upcoming, starting now, remaining
  tasks, progress, next-up, overdue, completion, morning briefing,
  evening wrap-up, streaks, "forest memory"). It picks from the pool each
  time and avoids repeating the exact same line twice in a row. Always
  uses your task/event's own title — never generic.
- **`engine.js`** — the decision layer. Reads your actual events/tasks
  each check and decides *if* a notification is warranted, using a
  dedupe log (`LF.state.notifyLog`, auto-pruned after 3 days) so nothing
  repeats within the same day. Runs on the same cadence as before (every
  ~20s while open, instantly on reopen/focus) — the reliability tiers
  below don't change.
- **Settings → Notifications** now has seven individually toggleable
  categories (morning briefing, upcoming, starting, remaining/progress,
  overdue, evening wrap-up, completion) — all on by default, stored in
  `LF.state.settings.notifCategories`.
- **Notification actions**, where the browser supports them: upcoming/
  starting/morning/evening get an **Open Calendar** action; remaining-
  tasks gets **View Tasks**; overdue gets **Mark Done** (actually marks
  the task complete, via a message to the open app or a `?markDone=` URL
  param if the app had to open fresh). Platforms without action support
  (iOS Safari) just fall back to a normal tap-to-open.
- Fixed default check windows: morning briefing 8–11am, remaining-tasks
  nudge from 1pm, progress update 5–9pm, evening wrap-up from 9pm — not
  user-configurable yet, just the on/off toggles are. Say the word if
  you'd like a time picker added later.

**Scope note on the closed-app (tier C) path:** the best-effort Periodic
Background Sync in `sw.js` still uses the simpler plain-reminder check,
not the full Voice/Engine personality. Duplicating this much
context-aware logic inside the service worker — which can only see an
IndexedDB mirror, not your live app state — would add real complexity to
a path that isn't guaranteed to run on most browsers anyway. Tiers A
(open) and B (backgrounded) get the full creative system; tier C keeps
working, just with simpler wording, until true Web Push is worth adding.

## Editing later

Everything is one small file per concern, so most changes only touch one
file:
- Colors/fonts → `core.css`
- Layout of cards, nav, calendar → `components.css`
- What the mascot looks like → `companion.js`
- Adding a new screen or button → `index.html` + `app.js`

Your data (tasks, events, journal entries) lives in the browser's
`localStorage`, under the key `ghibliforest_v1` — clearing your browser
data will clear it, so nothing to configure on the code side to keep it
persisting normally.
