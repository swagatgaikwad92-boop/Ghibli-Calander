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
