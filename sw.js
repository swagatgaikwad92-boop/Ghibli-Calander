// Ghibli Forest — service worker
const CACHE = "ghibli-forest-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./core.css",
  "./components.css",
  "./themes.css",
  "./dabsy-core.js",
  "./state.js",
  "./companion.js",
  "./calendar.js",
  "./render.js",
  "./tasks.js",
  "./search.js",
  "./notify.js",
  "./voice.js",
  "./engine.js",
  "./app.js",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// ============================================================
// Notifications — click-to-navigate
// ============================================================
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = event.action || "";
  const day = event.notification.data && event.notification.data.day;

  let messageType = "open-day";
  let messagePayload = { day };
  let targetUrl = day ? `./index.html?day=${day}` : "./index.html";

  if (action.startsWith("mark-done:")) {
    const taskId = action.slice("mark-done:".length);
    messageType = "mark-done";
    messagePayload = { taskId };
    targetUrl = `./index.html?markDone=${taskId}`;
  } else if (action === "view-tasks") {
    messageType = "open-screen";
    messagePayload = { screen: "tasks" };
    targetUrl = `./index.html?screen=tasks`;
  } else if (action === "open-calendar") {
    messageType = "open-day";
    messagePayload = { day };
    targetUrl = day ? `./index.html?day=${day}` : `./index.html?screen=calendar`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          client.postMessage(Object.assign({ type: messageType }, messagePayload));
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// ============================================================
// Best-effort background delivery (Periodic Background Sync).
// Only fires on browsers/OS combinations that support it (mainly
// Chrome on Android, for an installed PWA with enough engagement).
// The service worker can't read localStorage, so reminders are
// mirrored into IndexedDB by notify.js whenever they change — this
// reads that mirror, never localStorage directly.
// ============================================================
const NOTIFY_DB = "ghibli-forest-notify";
const NOTIFY_STORE = "reminders";

function openNotifyDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NOTIFY_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(NOTIFY_STORE)) db.createObjectStore(NOTIFY_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function checkRemindersInBackground() {
  try {
    const db = await openNotifyDB();
    const tx = db.transaction(NOTIFY_STORE, "readwrite");
    const store = tx.objectStore(NOTIFY_STORE);
    const all = await new Promise((res, rej) => {
      const q = store.getAll();
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
    const now = new Date();
    for (const r of all) {
      if (r.fired) continue;
      const target = new Date(r.datetime);
      target.setMinutes(target.getMinutes() - (r.offsetMinutes || 0));
      if (now >= target) {
        await self.registration.showNotification(`🌱 Tiny reminder: ${r.title}`, {
          body: "Tap to open Ghibli Forest.",
          icon: "icon-192.png",
          badge: "icon-192.png",
          tag: "ghibli-forest-reminder",
          data: { day: (r.datetime || "").slice(0, 10) },
        });
        r.fired = true;
        store.put(r);
      }
    }
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch (e) {
    // IndexedDB not populated yet, or unsupported — safe to ignore
  }
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-reminders") event.waitUntil(checkRemindersInBackground());
});
