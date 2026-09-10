# 🌿 Little Forest — Calendar, Tasks & Day Log

A cozy, iOS-glassmorphism calendar + task + reminder + day-journal PWA with a
tiny forest-spirit companion. Fully functional, works offline, installable
to your home screen.

## What's inside

```
index.html            ← the whole app shell (all screens + sheets)
manifest.json          ← PWA install config
sw.js                   ← offline service worker (caches the app)
styles/
  core.css              ← colors, type, glass system, layout tokens
  components.css         ← nav, cards, timeline, calendar grid, sheets
  themes.css              ← day/night + seasonal atmosphere
scripts/
  state.js               ← data model + localStorage persistence
  calendar.js             ← month/week date math
  companion.js             ← the forest-spirit mascot (SVG, reactive)
  tasks.js                  ← task cards + swipe-to-complete/postpone
  search.js                  ← universal search
  render.js                   ← screen markup builders
  app.js                       ← navigation, forms, reminders, PWA install
icons/
  icon-192.png, icon-512.png, icon-180.png
```

Everything is plain HTML/CSS/JS — no build step, no framework, no bundler.
All your data is stored on your own device in `localStorage`; nothing is
sent anywhere.

## 1. Upload to GitHub (exact steps)

1. Go to your repository on GitHub (create a new one if you don't have one
   yet — click the **+** in the top right → **New repository**, give it a
   name like `little-forest`, keep it **Public**, and click **Create
   repository**).
2. On the repo page, click **Add file → Upload files**.
3. Drag in **all the files and folders exactly as they are** — keep the
   `styles/`, `scripts/`, and `icons/` folders intact. Most browsers let you
   drag whole folders straight into the GitHub upload box and it will
   preserve the folder structure. If GitHub flattens your folders (some
   browsers do this), see the note at the bottom.
4. Scroll down, write a commit message like "Add Little Forest app", and
   click **Commit changes**.

## 2. Turn on GitHub Pages (makes it a real installable website)

1. In your repo, go to **Settings → Pages** (left sidebar).
2. Under **Build and deployment → Source**, choose **Deploy from a
   branch**.
3. Under **Branch**, choose `main` and folder `/ (root)`, then **Save**.
4. Wait about a minute, then refresh the page — GitHub will show you a
   link like `https://yourusername.github.io/little-forest/`. That's your
   live app.

## 3. Install it on your phone

- **iPhone (Safari):** open the link → tap the Share icon → **Add to Home
  Screen**.
- **Android (Chrome):** open the link → you'll see an **Install Little
  Forest** banner, or tap the ⋮ menu → **Add to Home screen**. The app
  also shows an in-app **Install** button in Settings once your browser
  is ready to install it.

Once installed, it opens full-screen with no browser bar, and works
offline.

## If GitHub flattens your folders

If your uploader puts every file in the repo root instead of keeping
`styles/` and `scripts/` as folders, the file paths in `index.html`,
`sw.js`, and `manifest.json` won't match anymore, and the app will load
with no styling. If that happens, tell me and I'll reshape the files to
match a flat layout — the same fix already used on your other project.

## Editing later

Everything is one small file per concern, so most changes only touch one
file:
- Colors/fonts → `styles/core.css`
- Layout of cards, nav, calendar → `styles/components.css`
- What the mascot looks like → `scripts/companion.js`
- Adding a new screen or button → `index.html` + `scripts/app.js`

Your data (tasks, events, journal entries) lives in the browser's
`localStorage`, under the key `littleforest_v1` — clearing your browser
data will clear it, so nothing to configure on the code side to keep it
persisting normally.
