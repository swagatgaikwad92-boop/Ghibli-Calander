// ============================================================
// GHIBLI FOREST — notify.js
// Real notification delivery layered on top of the existing
// reminders array in state.js. Does not change LF's data shape.
//
// Three honest tiers (see README "Notifications architecture"):
//   A. App open (foreground)      → always reliable
//   B. App backgrounded, not killed → reliable on most browsers
//   C. App fully closed/killed     → best-effort only (Periodic
//      Background Sync where supported; no guarantee without a
//      real push server — see README for why)
// ============================================================

const Notify = (() => {
  const DB_NAME = "ghibli-forest-notify";
  const STORE = "reminders";
  const SYNC_TAG = "check-reminders";

  // ---- tiny IndexedDB helper (service worker can't read localStorage) ----
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function mirrorReminders() {
    if (!("indexedDB" in window)) return;
    try {
      const db = await openDB();
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.clear();
      LF.state.reminders.forEach((r) => store.put({ ...r }));
      await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
      db.close();
    } catch (e) { console.warn("Notify: mirror failed", e); }
  }

  // Pull back any "fired" flags the service worker set while we were away,
  // so a reminder never fires twice once the page catches up.
  async function reconcileFromDB() {
    if (!("indexedDB" in window)) return;
    try {
      const db = await openDB();
      const tx = db.transaction(STORE, "readonly");
      const all = await new Promise((res, rej) => {
        const q = tx.objectStore(STORE).getAll();
        q.onsuccess = () => res(q.result);
        q.onerror = () => rej(q.error);
      });
      db.close();
      let changed = false;
      all.forEach((rec) => {
        const local = LF.state.reminders.find((r) => r.id === rec.id);
        if (local && rec.fired && !local.fired) { local.fired = true; changed = true; }
      });
      if (changed) LF.save();
    } catch (e) { console.warn("Notify: reconcile failed", e); }
  }

  // ---- permission flow ----
  function supported() { return "Notification" in window; }
  function permission() { return supported() ? Notification.permission : "unsupported"; }

  async function requestPermission() {
    if (!supported()) return "unsupported";
    if (Notification.permission !== "default") return Notification.permission; // never re-prompt
    const result = await Notification.requestPermission();
    if (result === "granted") registerPeriodicSync();
    return result;
  }

  // ---- showing a real notification (works while backgrounded, not just foreground) ----
  async function fire(title, body, day) {
    if (permission() !== "granted") return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: "icon-192.png",
        badge: "icon-192.png",
        tag: "ghibli-forest-reminder",
        data: { day: day || null },
      });
      return true;
    } catch (e) {
      // fall back to a page-level Notification if SW isn't ready yet
      try { new Notification(title, { body, icon: "icon-192.png" }); return true; } catch (e2) { return false; }
    }
  }

  // ---- best-effort background delivery ----
  async function registerPeriodicSync() {
    try {
      const status = await navigator.permissions.query({ name: "periodic-background-sync" });
      if (status.state !== "granted") return false;
      const reg = await navigator.serviceWorker.ready;
      if (!("periodicSync" in reg)) return false;
      await reg.periodicSync.register(SYNC_TAG, { minInterval: 15 * 60 * 1000 });
      return true;
    } catch (e) {
      return false; // not supported on this browser — silent, expected on iOS/Firefox/desktop
    }
  }

  async function backgroundSyncStatus() {
    if (!("serviceWorker" in navigator) || !navigator.permissions) return "unsupported";
    try {
      const status = await navigator.permissions.query({ name: "periodic-background-sync" });
      const reg = await navigator.serviceWorker.ready;
      if (!("periodicSync" in reg)) return "unsupported";
      return status.state; // "granted" | "denied" | "prompt"
    } catch (e) { return "unsupported"; }
  }

  // ---- navigation when a notification is tapped ----
  function listenForNavigation(onNavigateDay) {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "open-day" && event.data.day) {
        onNavigateDay(event.data.day);
      }
    });
    // handle the case where the app was opened fresh via ?day=... from the SW
    const params = new URLSearchParams(location.search);
    const day = params.get("day");
    if (day) onNavigateDay(day);
  }

  return {
    supported, permission, requestPermission, fire,
    mirrorReminders, reconcileFromDB, registerPeriodicSync, backgroundSyncStatus,
    listenForNavigation,
  };
})();

window.Notify = Notify;
