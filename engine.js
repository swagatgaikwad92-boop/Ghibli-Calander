// ============================================================
// GHIBLI FOREST — engine.js
// Decides WHEN to notify and WHAT category applies, by reading
// today's actual events/tasks from LF.state. Delegates wording to
// Voice, delivery to Notify. Dedupes via LF.wasNotified/markNotified
// so nothing repeats within the same day.
//
// Runs on the same cadence app.js already uses for reminders (every
// ~20s while open, plus instantly on focus/reopen) — see "app open /
// backgrounded / closed" note in notify.js and the README. This is
// tier A/B logic; the closed-app best-effort path in sw.js stays on
// the simpler manual-reminder check, since duplicating this much
// context-aware logic inside the service worker (which can only see
// an IndexedDB mirror, not live state) would add a lot of complexity
// for a path that already isn't guaranteed to run.
// ============================================================

const Engine = (() => {
  const MORNING_HOUR = 8;
  const REMAINING_HOUR = 13;
  const PROGRESS_HOUR = 17;
  const EVENING_HOUR = 21;
  const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 100, 200, 365];

  function categoryOn(name) {
    const cats = LF.state.settings.notifCategories || {};
    return cats[name] !== false;
  }

  function todaysSchedule(dateKey) {
    const events = LF.eventsOn(dateKey).map((e) => ({ ...e, kind: "event", start: e.startTime }));
    const timedTasks = LF.tasksOn(dateKey).filter((t) => t.time && !t.done).map((t) => ({ ...t, kind: "task", start: t.time }));
    return [...events, ...timedTasks].filter((it) => it.start).sort((a, b) => a.start.localeCompare(b.start));
  }

  function fireFor(key, voiceMsg, day, opts) {
    if (LF.wasNotified(key)) return false;
    Notify.fire(voiceMsg.title, voiceMsg.body, day, opts);
    LF.markNotified(key);
    return true;
  }

  const OPEN_CALENDAR = [{ action: "open-calendar", title: "Open Calendar" }];
  const VIEW_TASKS = [{ action: "view-tasks", title: "View Tasks" }];

  function markDoneAction(taskId) {
    return [{ action: `mark-done:${taskId}`, title: "Mark Done" }, { action: "open-calendar", title: "Open Calendar" }];
  }

  // ---------------------------------------------------------
  // Main tick — call every ~20s while the app is open/focused
  // ---------------------------------------------------------
  function tick() {
    if (Notify.permission() !== "granted") return;
    LF.pruneNotifyLog();

    const now = new Date();
    const dateKey = LF.todayKey();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const schedule = todaysSchedule(dateKey);

    // ---- 1. UPCOMING (~30 min before) ----
    if (categoryOn("upcoming")) {
      schedule.forEach((it) => {
        const startMin = LF.toMinutes(it.start);
        const diff = startMin - nowMin;
        if (diff > 0 && diff <= 30) {
          fireFor(`upcoming:${it.id}:${dateKey}`, Voice.upcoming(it, diff), dateKey, { tag: "gf-upcoming", actions: OPEN_CALENDAR, taskId: it.kind === "task" ? it.id : null });
        }
      });
    }

    // ---- 2. STARTING NOW ----
    if (categoryOn("starting")) {
      schedule.forEach((it) => {
        const startMin = LF.toMinutes(it.start);
        if (nowMin >= startMin && nowMin <= startMin + 2) {
          fireFor(`starting:${it.id}:${dateKey}`, Voice.startingNow(it), dateKey, { tag: "gf-starting", renotify: true, actions: OPEN_CALENDAR });
        }
      });
    }

    // ---- 3. REMAINING TASKS (once, early afternoon) ----
    if (categoryOn("remaining") && now.getHours() >= REMAINING_HOUR) {
      const remain = LF.tasksOn(dateKey).filter((t) => !t.done);
      if (remain.length > 0) {
        fireFor(`remaining:${dateKey}`, Voice.remaining(remain), dateKey, { tag: "gf-remaining", actions: VIEW_TASKS });
      }
    }

    // ---- 4. DAY PROGRESS (once, late afternoon) ----
    if (categoryOn("remaining") && now.getHours() >= PROGRESS_HOUR && now.getHours() < EVENING_HOUR) {
      const all = LF.tasksOn(dateKey);
      if (all.length > 0) {
        const done = all.filter((t) => t.done).length;
        fireFor(`progress:${dateKey}`, Voice.progress(done, all.length), dateKey, { tag: "gf-progress" });
      }
    }

    // ---- 6. OVERDUE ----
    if (categoryOn("overdue")) {
      LF.state.tasks.filter((t) => !t.done && t.deadline && t.deadline < dateKey).forEach((t) => {
        fireFor(`overdue:${t.id}:${dateKey}`, Voice.overdue(t), t.date, { tag: "gf-overdue", actions: markDoneAction(t.id), taskId: t.id });
      });
    }

    // ---- 10. MORNING BRIEFING ----
    if (categoryOn("morning") && now.getHours() >= MORNING_HOUR && now.getHours() < MORNING_HOUR + 3) {
      if (!LF.wasNotified(`morning:${dateKey}`)) {
        const items = todaysSchedule(dateKey);
        const openTasks = LF.tasksOn(dateKey).filter((t) => !t.done).length;
        let msg = Voice.morningBriefing(items, openTasks);
        // fold busy/calm awareness into the briefing tone (#8/#9), rather
        // than firing yet another separate notification the same morning
        if (items.length >= 4) msg = Object.assign({}, msg, { title: Voice.busyDay(items.length, items[0]).title });
        else if (items.length === 0 && openTasks === 0) msg = Voice.calmDay();
        fireFor(`morning:${dateKey}`, msg, dateKey, { tag: "gf-morning", actions: OPEN_CALENDAR });
      }
    }

    // ---- 11. EVENING WRAP-UP / DAY STORY ----
    if (categoryOn("evening") && now.getHours() >= EVENING_HOUR) {
      if (!LF.wasNotified(`evening:${dateKey}`)) {
        const all = LF.tasksOn(dateKey);
        const done = all.filter((t) => t.done).length;
        const remain = all.length - done;
        const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
        const tKey = LF.todayKey(tomorrow);
        const tomorrowItems = todaysSchedule(tKey);
        fireFor(`evening:${dateKey}`, Voice.eveningWrapup(done, remain, tomorrowItems[0]), dateKey, { tag: "gf-evening", actions: OPEN_CALENDAR });
      }
    }

    // ---- 12. STREAK ----
    const count = LF.state.streak.count;
    if (STREAK_MILESTONES.includes(count) && !LF.wasNotified(`streak:${count}`)) {
      fireFor(`streak:${count}`, Voice.streak(count), dateKey, { tag: "gf-streak" });
    }

    // ---- Forest Memory ----
    if (!LF.wasNotified(`memory:${dateKey}`)) {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const yKey = LF.todayKey(y);
      const doneYesterdayTitles = new Set(LF.tasksOn(yKey).filter((t) => t.done).map((t) => t.title.trim().toLowerCase()));
      const todayMatch = LF.tasksOn(dateKey).find((t) => doneYesterdayTitles.has(t.title.trim().toLowerCase()));
      if (todayMatch) fireFor(`memory:${dateKey}`, Voice.forestMemory(todayMatch.title), dateKey, { tag: "gf-memory" });
    }
  }

  // ---------------------------------------------------------
  // Called right when a task is completed — "next up" + occasional
  // completion celebration. Kept separate from tick() since it's
  // event-driven, not time-driven.
  // ---------------------------------------------------------
  function onTaskCompleted(taskId) {
    if (Notify.permission() !== "granted" || !categoryOn("completion")) return;
    const dateKey = LF.todayKey();
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    // celebrate roughly every other completion, so it stays occasional
    if (Math.random() < 0.5) {
      Notify.fire(Voice.completion().title, "", dateKey, { tag: "gf-completion" });
    }

    const upcomingItems = todaysSchedule(dateKey).filter((it) => LF.toMinutes(it.start) > nowMin);
    const next = Voice.nextUp(upcomingItems[0]);
    Notify.fire(next.title, next.body, dateKey, { tag: "gf-nextup", actions: OPEN_CALENDAR });
  }

  return { tick, onTaskCompleted };
})();

window.Engine = Engine;
