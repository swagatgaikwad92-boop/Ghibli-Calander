// ============================================================
// GHIBLI FOREST — app.js
// Wiring: navigation, sheets, forms, timers, PWA install
// ============================================================

(function () {
  let currentScreen = "today";
  let calMonth = new Date().getMonth();
  let calYear = new Date().getFullYear();
  let selectedDayKey = LF.todayKey();
  let weekAnchor = new Date();
  let calMode = "month";
  let pendingCategory = { task: "study", event: "college" };
  let pendingPriority = "normal";
  let journalMood = null;
  let dayMood = null;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------------------------------------------------------
  // Screen navigation
  // ---------------------------------------------------------
  function showScreen(name) {
    currentScreen = name;
    $$(".screen").forEach((s) => s.classList.remove("active"));
    const target = $(`#screen-${name}`);
    if (target) target.classList.add("active");
    $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.screen === name));
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

    if (name === "today") renderToday();
    if (name === "calendar") renderCalendarScreen();
    if (name === "tasks") renderTasksScreen();
    if (name === "daylog") renderDayLogScreen();
    if (name === "forest") renderForestScreen();
  }

  $$(".nav-btn").forEach((btn) => btn.addEventListener("click", () => showScreen(btn.dataset.screen)));

  // ---------------------------------------------------------
  // Today screen
  // ---------------------------------------------------------
  function renderToday() {
    const now = new Date();
    const hour = now.getHours();
    $("#greetingText").textContent = LFCal.greetingForHour(hour);
    $("#dateLine").textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) +
      " · " + now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

    const key = LF.todayKey();
    const day = LF.getDay(key);
    $("#intentionInput").value = day.intention || "";

    Render.conflicts($("#conflictSlot"), key);
    Render.timeline($("#todayTimeline"), key);

    const tasks = LF.tasksOn(key);
    const done = tasks.filter((t) => t.done).length;
    $("#progressCount").textContent = `${done} / ${tasks.length}`;
    $("#progressFill").style.width = tasks.length ? `${Math.round((done / tasks.length) * 100)}%` : "0%";

    Render.taskList($("#todayTasks"), tasks, {
      onComplete: (id) => { LF.toggleTask(id); Companion.celebrate(); renderToday(); },
      onPostpone: (id) => { postponeToTomorrow(id); renderToday(); },
      onExpand: () => {},
    });

    checkUnfinishedEndOfDay();
  }

  $("#intentionInput").addEventListener("input", (e) => {
    LF.getDay(LF.todayKey()).intention = e.target.value;
    LF.save();
  });

  function postponeToTomorrow(id) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    LF.moveTaskToDate(id, LF.todayKey(d));
    toast("Moved to tomorrow 🌙");
  }

  // ---------------------------------------------------------
  // Calendar screen (month / week)
  // ---------------------------------------------------------
  $("#modeMonthBtn").addEventListener("click", () => { calMode = "month"; renderCalendarScreen(); });
  $("#modeWeekBtn").addEventListener("click", () => { calMode = "week"; renderCalendarScreen(); });
  $("#prevWeek").addEventListener("click", () => { weekAnchor = new Date(weekAnchor); weekAnchor.setDate(weekAnchor.getDate() - 7); renderCalendarScreen(); });
  $("#nextWeek").addEventListener("click", () => { weekAnchor = new Date(weekAnchor); weekAnchor.setDate(weekAnchor.getDate() + 7); renderCalendarScreen(); });
  $("#prevMonth").addEventListener("click", () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendarScreen(); });
  $("#nextMonth").addEventListener("click", () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendarScreen(); });

  function renderCalendarScreen() {
    $("#modeMonthBtn").classList.toggle("btn-primary", calMode === "month");
    $("#modeWeekBtn").classList.toggle("btn-primary", calMode === "week");
    $("#monthView").style.display = calMode === "month" ? "" : "none";
    $("#weekView").style.display = calMode === "week" ? "" : "none";

    if (calMode === "month") {
      $("#weekdayRow").innerHTML = LFCal.WEEKDAY_SHORT.map((d) => `<span>${d}</span>`).join("");
      Render.monthGridView($("#monthGrid"), $("#monthLabel"), calYear, calMonth, selectedDayKey);
      $$("#monthGrid [data-daykey]").forEach((cell) => {
        cell.addEventListener("click", () => { selectedDayKey = cell.dataset.daykey; openDayDetail(selectedDayKey); });
        cell.addEventListener("contextmenu", (e) => { e.preventDefault(); openPlantMenuFor(cell.dataset.daykey); });
        let pressTimer;
        cell.addEventListener("touchstart", () => { pressTimer = setTimeout(() => openPlantMenuFor(cell.dataset.daykey), 550); });
        cell.addEventListener("touchend", () => clearTimeout(pressTimer));
      });
    } else {
      const dates = LFCal.weekDates(weekAnchor);
      $("#weekLabel").textContent = `${LFCal.MONTH_NAMES[dates[0].getMonth()]} ${dates[0].getDate()} – ${dates[6].getDate()}`;
      Render.weekStripView($("#weekStrip"), dates, selectedDayKey);
      Render.timeline($("#weekDayTimeline"), selectedDayKey);
      $$("#weekStrip [data-daykey]").forEach((c) => c.addEventListener("click", () => { selectedDayKey = c.dataset.daykey; renderCalendarScreen(); }));
    }
  }

  let plantTargetDate = null;
  function openPlantMenuFor(dateKey) {
    plantTargetDate = dateKey;
    togglePlantMenu(true);
  }

  // ---------------------------------------------------------
  // Day detail screen
  // ---------------------------------------------------------
  function openDayDetail(dateKey) {
    selectedDayKey = dateKey;
    const d = new Date(dateKey + "T00:00:00");
    $("#dayHeading").textContent = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

    const day = LF.getDay(dateKey);
    dayMood = day.mood;
    Render.moodRow($("#dayMoodRow"), dayMood, (id) => { dayMood = id; LF.getDay(dateKey).mood = id; LF.save(); });
    $("#dayIntentionInput").value = day.intention || "";
    $("#dayNotesInput").value = day.notes || "";

    Render.conflicts($("#dayConflictSlot"), dateKey);
    Render.timeline($("#dayTimeline"), dateKey);

    Render.taskList($("#dayTasks"), LF.tasksOn(dateKey), {
      onComplete: (id) => { LF.toggleTask(id); Companion.celebrate(); openDayDetail(dateKey); },
      onPostpone: (id) => { LF.moveTaskToDate(id, nextDay(dateKey)); openDayDetail(dateKey); },
      onExpand: () => {},
    });

    showScreen("day");
  }

  function nextDay(dateKey) {
    const d = new Date(dateKey + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return LF.todayKey(d);
  }

  $("#backFromDay").addEventListener("click", () => showScreen("calendar"));
  $("#dayIntentionInput").addEventListener("input", (e) => { LF.getDay(selectedDayKey).intention = e.target.value; LF.save(); });
  $("#dayNotesInput").addEventListener("input", (e) => { LF.getDay(selectedDayKey).notes = e.target.value; LF.save(); });
  $("#openJournalFromDay").addEventListener("click", () => openJournalSheet(selectedDayKey));

  // ---------------------------------------------------------
  // Tasks screen
  // ---------------------------------------------------------
  $$('#screen-tasks [data-filter]').forEach((btn) => {
    btn.addEventListener("click", () => {
      $$('#screen-tasks [data-filter]').forEach((b) => b.classList.remove("btn-primary"));
      btn.classList.add("btn-primary");
      renderTasksScreen(btn.dataset.filter);
    });
  });

  function renderTasksScreen(filter = "upcoming") {
    const today = LF.todayKey();
    let list = [...LF.state.tasks];
    if (filter === "today") list = list.filter((t) => t.date === today && !t.done);
    else if (filter === "overdue") list = list.filter((t) => !t.done && t.deadline && t.deadline < today);
    else if (filter === "done") list = list.filter((t) => t.done);
    else list = list.filter((t) => !t.done && t.date >= today);
    list.sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));

    Render.taskList($("#taskListAll"), list, {
      onComplete: (id) => { LF.toggleTask(id); Companion.celebrate(); renderTasksScreen(filter); },
      onPostpone: (id) => {
        const t = LF.state.tasks.find((x) => x.id === id);
        if (t) LF.moveTaskToDate(id, nextDay(t.date || today));
        renderTasksScreen(filter);
      },
      onExpand: () => {},
    });
  }

  // ---------------------------------------------------------
  // Day Log screen
  // ---------------------------------------------------------
  $("#openTodayJournal").addEventListener("click", () => openJournalSheet(LF.todayKey()));

  function renderDayLogScreen() {
    const entries = Object.entries(LF.state.days)
      .filter(([, d]) => d.capsule)
      .sort((a, b) => b[0].localeCompare(a[0]));
    const el = $("#capsuleList");
    if (entries.length === 0) {
      el.innerHTML = Render.emptyState("No little days recorded yet 🌱", "empty");
      return;
    }
    el.innerHTML = entries.map(([key, d]) => Render.capsuleCard(key, d.capsule)).join("");
  }

  function buildCapsule(dateKey) {
    const tasks = LF.tasksOn(dateKey);
    const day = LF.getDay(dateKey);
    const cap = {
      tasksDone: tasks.filter((t) => t.done).length,
      events: LF.eventsOn(dateKey).length,
      mood: day.mood ? (LF.MOODS.find((m) => m.id === day.mood) || {}).label : null,
      favMoment: day.journal && day.journal.favMoment,
    };
    day.capsule = cap;
    LF.save();
    return cap;
  }

  // ---------------------------------------------------------
  // Forest screen
  // ---------------------------------------------------------
  function renderForestScreen() {
    const n = LF.state.streak.count;
    $("#streakText").textContent = n > 0 ? `You've been showing up for ${n} day${n === 1 ? "" : "s"}.` : "Plant your first day whenever you're ready.";
    const stages = ["🌱", "🌿", "🌳", "🌲"];
    let path = "";
    for (let i = 0; i < Math.min(n, 30); i++) {
      path += `<span class="streak-node">${stages[Math.min(3, Math.floor(i / 7))]}</span>`;
    }
    $("#streakPath").innerHTML = path || `<span class="faint" style="font-size:13px;">Your path will grow here 🌿</span>`;

    const doneTotal = LF.state.tasks.filter((t) => t.done).length;
    const forestEmojis = ["🌳", "🌸", "🍄", "🌼", "🦋", "🐿️", "✨"];
    let scene = "";
    for (let i = 0; i < Math.min(doneTotal, 24); i++) scene += `<span class="forest-item">${forestEmojis[i % forestEmojis.length]}</span>`;
    $("#forestScene").innerHTML = scene || `<span class="faint" style="font-size:13px; align-self:center;">Complete tasks to grow your forest 🌿</span>`;

    renderWeeklyReflection();
  }

  function renderWeeklyReflection() {
    const dates = LFCal.weekDates(new Date());
    let tasksCompleted = 0, carried = 0, events = 0;
    const dayCounts = {};
    dates.forEach((d) => {
      const key = LF.todayKey(d);
      const tasks = LF.tasksOn(key);
      const done = tasks.filter((t) => t.done).length;
      tasksCompleted += done;
      carried += tasks.filter((t) => !t.done && t.date < LF.todayKey()).length;
      events += LF.eventsOn(key).length;
      dayCounts[key] = done + LF.eventsOn(key).length;
    });
    const busiest = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
    const busiestDate = busiest && busiest[1] > 0 ? new Date(busiest[0] + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" }) : "—";
    $("#weeklyReflection").innerHTML = `
      <div class="cap-stats" style="flex-direction:column; gap:8px;">
        <span>📚 ${tasksCompleted} tasks completed</span>
        <span>🎓 ${events} events</span>
        <span>🔁 ${carried} tasks carried forward</span>
        <span>📅 Most active day: ${busiestDate}</span>
      </div>`;
  }

  // ---------------------------------------------------------
  // Search
  // ---------------------------------------------------------
  $("#btnSearch").addEventListener("click", () => { showScreen("search"); $("#searchInput").focus(); });
  $("#btnCloseSearch").addEventListener("click", () => showScreen("today"));
  $("#searchInput").addEventListener("input", (e) => {
    const results = LFSearch.universalSearch(e.target.value);
    const el = $("#searchResults");
    if (!e.target.value.trim()) { el.innerHTML = ""; return; }
    if (results.length === 0) { el.innerHTML = `<p class="muted" style="padding:14px;">No little matches yet.</p>`; return; }
    el.innerHTML = results.map((r) => `
      <div class="glass result-item" data-jump="${r.date || ""}">
        <span class="em">${r.emoji}</span>
        <div><div class="r-title">${LFTasks.escapeHTML(r.title)}</div><div class="r-sub">${r.sub}</div></div>
      </div>`).join("");
    $$("#searchResults [data-jump]").forEach((item) => item.addEventListener("click", () => {
      const dk = item.dataset.jump;
      if (dk) openDayDetail(dk);
    }));
  });

  // ---------------------------------------------------------
  // Plant Something menu
  // ---------------------------------------------------------
  const plantMenu = $("#plantMenu");
  const scrim = $("#scrim");
  let menuOpen = false;

  function togglePlantMenu(force) {
    menuOpen = force !== undefined ? force : !menuOpen;
    plantMenu.classList.toggle("open", menuOpen);
    scrim.classList.toggle("show", menuOpen);
    $("#plantFab").style.transform = menuOpen ? "rotate(45deg)" : "";
    if (!menuOpen) plantTargetDate = null;
  }
  $("#plantFab").addEventListener("click", () => togglePlantMenu());
  scrim.addEventListener("click", () => { togglePlantMenu(false); closeAllSheets(); });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-plant]")) togglePlantMenu(true);
  });

  $$("[data-create]").forEach((btn) => btn.addEventListener("click", () => {
    togglePlantMenu(false);
    const kind = btn.dataset.create;
    const dateKey = plantTargetDate || selectedDayKey || LF.todayKey();
    if (kind === "task") openTaskSheet(dateKey);
    if (kind === "event") openEventSheet(dateKey);
    if (kind === "reminder") openReminderSheet(dateKey);
    if (kind === "journal") openJournalSheet(dateKey);
    if (kind === "note") openNoteSheet(dateKey);
  }));

  // ---------------------------------------------------------
  // Sheets — generic open/close
  // ---------------------------------------------------------
  function openSheet(id) {
    closeAllSheets();
    $(id).classList.add("open");
    scrim.classList.add("show");
  }
  function closeAllSheets() {
    $$(".sheet").forEach((s) => s.classList.remove("open"));
    if (!menuOpen) scrim.classList.remove("show");
  }
  $$("[data-close-sheet]").forEach((btn) => btn.addEventListener("click", closeAllSheets));

  // --- Task sheet ---
  function openTaskSheet(dateKey) {
    $("#taskTitle").value = "";
    $("#taskDate").value = dateKey;
    $("#taskTime").value = "";
    $("#taskDeadline").value = "";
    $("#taskDuration").value = "30";
    $("#taskNotes").value = "";
    pendingPriority = "normal";
    $$('#sheetTask [data-priority]').forEach((b) => b.classList.toggle("selected", b.dataset.priority === "normal"));
    Render.categoryGrid($("#taskCatGrid"), pendingCategory.task, (id) => (pendingCategory.task = id));
    openSheet("#sheetTask");
  }
  $$('#sheetTask [data-priority]').forEach((btn) => btn.addEventListener("click", () => {
    pendingPriority = btn.dataset.priority;
    $$('#sheetTask [data-priority]').forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
  }));
  $("#saveTask").addEventListener("click", () => {
    const title = $("#taskTitle").value.trim();
    if (!title) { toast("Give it a little name first 🌱"); return; }
    const t = LF.addTask({
      title, date: $("#taskDate").value || LF.todayKey(),
      time: $("#taskTime").value || null,
      deadline: $("#taskDeadline").value || null,
      duration: parseInt($("#taskDuration").value, 10) || 30,
      category: pendingCategory.task, priority: pendingPriority,
      notes: $("#taskNotes").value.trim(),
    });
    closeAllSheets();
    toast("Planted 🌱 — task added");
    refreshVisibleScreen();
    maybeWarnConflict(t.date);
  });

  // --- Event sheet ---
  function openEventSheet(dateKey) {
    $("#eventTitle").value = "";
    $("#eventDate").value = dateKey;
    $("#eventStart").value = "";
    $("#eventEnd").value = "";
    $("#eventNotes").value = "";
    Render.categoryGrid($("#eventCatGrid"), pendingCategory.event, (id) => (pendingCategory.event = id));
    openSheet("#sheetEvent");
  }
  $("#saveEvent").addEventListener("click", () => {
    const title = $("#eventTitle").value.trim();
    if (!title) { toast("Give it a little name first 🌱"); return; }
    const ev = LF.addEvent({
      title, date: $("#eventDate").value || LF.todayKey(),
      startTime: $("#eventStart").value || null,
      endTime: $("#eventEnd").value || null,
      category: pendingCategory.event,
      notes: $("#eventNotes").value.trim(),
    });
    closeAllSheets();
    toast("Planted 🌱 — event added");
    refreshVisibleScreen();
    maybeWarnConflict(ev.date);
  });

  // --- Reminder sheet ---
  function openReminderSheet(dateKey) {
    $("#remTitle").value = "";
    $("#remDate").value = dateKey;
    $("#remTime").value = "";
    $("#remOffset").value = "5";
    openSheet("#sheetReminder");
  }
  $("#saveReminder").addEventListener("click", () => {
    const title = $("#remTitle").value.trim();
    if (!title) { toast("Give it a little name first 🌱"); return; }
    const date = $("#remDate").value || LF.todayKey();
    const time = $("#remTime").value || "09:00";
    LF.addReminder({ title, datetime: `${date}T${time}`, offsetMinutes: parseInt($("#remOffset").value, 10) || 0 });
    closeAllSheets();
    toast("Planted 🌱 — reminder set");
  });

  // --- Note sheet ---
  function openNoteSheet(dateKey) {
    $("#noteDate").value = dateKey;
    $("#noteText").value = "";
    openSheet("#sheetNote");
  }
  $("#saveNote").addEventListener("click", () => {
    const text = $("#noteText").value.trim();
    if (!text) { toast("Write a little something first 💭"); return; }
    const date = $("#noteDate").value || LF.todayKey();
    const day = LF.getDay(date);
    day.notes = day.notes ? `${day.notes}\n${text}` : text;
    LF.save();
    closeAllSheets();
    toast("Noted 💭");
    refreshVisibleScreen();
  });

  // --- Journal sheet ---
  function openJournalSheet(dateKey) {
    const day = LF.getDay(dateKey);
    const j = day.journal || {};
    journalMood = day.mood;
    $("#journalHeading").textContent = `📖 ${dateKey === LF.todayKey() ? "Today" : dateKey} felt…`;
    Render.moodRow($("#journalMoodRow"), journalMood, (id) => (journalMood = id));
    $("#jLittleThings").value = j.littleThings || "";
    $("#jTinyWin").value = j.tinyWin || "";
    $("#jFavMoment").value = j.favMoment || "";
    $("#jEnergy").value = j.energy || 3;
    openSheet("#sheetJournal");
    sheetJournalDate = dateKey;
  }
  let sheetJournalDate = null;
  $("#saveJournal").addEventListener("click", () => {
    const dateKey = sheetJournalDate || LF.todayKey();
    const day = LF.getDay(dateKey);
    day.mood = journalMood || day.mood;
    day.journal = {
      littleThings: $("#jLittleThings").value.trim(),
      tinyWin: $("#jTinyWin").value.trim(),
      favMoment: $("#jFavMoment").value.trim(),
      energy: parseInt($("#jEnergy").value, 10),
    };
    LF.save();
    buildCapsule(dateKey);
    closeAllSheets();
    toast("Your little day is saved 📖");
    refreshVisibleScreen();
  });

  // ---------------------------------------------------------
  // Conflict warning toast on create
  // ---------------------------------------------------------
  function maybeWarnConflict(dateKey) {
    const cf = LF.findConflicts(dateKey);
    if (cf.length) toast("⚠️ That overlaps with something else today");
  }

  function refreshVisibleScreen() { showScreen(currentScreen); }

  // ---------------------------------------------------------
  // End-of-day unfinished tasks nudge
  // ---------------------------------------------------------
  let nudgeShownToday = false;
  function checkUnfinishedEndOfDay() {
    const now = new Date();
    if (now.getHours() < 21 || nudgeShownToday) return;
    const key = LF.todayKey();
    const unfinished = LF.tasksOn(key).filter((t) => !t.done);
    if (unfinished.length === 0) return;
    nudgeShownToday = true;
    toast(`🌙 You have ${unfinished.length} unfinished thing${unfinished.length === 1 ? "" : "s"}.`);
  }

  // ---------------------------------------------------------
  // Toast
  // ---------------------------------------------------------
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  // ---------------------------------------------------------
  // Settings
  // ---------------------------------------------------------
  $("#btnSettings").addEventListener("click", () => { syncSettingsUI(); openSheet("#sheetSettings"); });
  function syncSettingsUI() {
    $("#themeSelect").value = LF.state.settings.theme;
    $("#reminderStyleSelect").value = LF.state.settings.reminderStyle;
    $("#toggleReducedMotion").classList.toggle("on", LF.state.settings.reducedMotion);
    $("#toggleSound").classList.toggle("on", LF.state.settings.soundOn);
  }
  $("#themeSelect").addEventListener("change", (e) => { LF.state.settings.theme = e.target.value; LF.save(); applyAtmosphere(); });
  $("#reminderStyleSelect").addEventListener("change", (e) => { LF.state.settings.reminderStyle = e.target.value; LF.save(); });
  $("#toggleReducedMotion").addEventListener("click", (e) => {
    LF.state.settings.reducedMotion = !LF.state.settings.reducedMotion;
    LF.save();
    e.target.classList.toggle("on", LF.state.settings.reducedMotion);
    document.body.classList.toggle("reduced-motion", LF.state.settings.reducedMotion);
  });
  $("#toggleSound").addEventListener("click", (e) => {
    LF.state.settings.soundOn = !LF.state.settings.soundOn;
    LF.save();
    e.target.classList.toggle("on", LF.state.settings.soundOn);
  });

  // ---------------------------------------------------------
  // Day/night + seasonal atmosphere
  // ---------------------------------------------------------
  function applyAtmosphere() {
    const hour = new Date().getHours();
    const themeSetting = LF.state.settings.theme;
    const effective = themeSetting === "auto" ? (hour >= 20 || hour < 6 ? "night" : "day") : themeSetting;
    document.documentElement.setAttribute("data-theme", effective === "night" ? "night" : "light");
    document.body.setAttribute("data-time", LFCal.timeOfDayKey(hour));
    document.body.setAttribute("data-season", LFCal.seasonForMonth(new Date().getMonth()));
    Companion.reactToHour(hour);
    renderParticles(effective === "night" ? ["✨", "🌙"] : ["🍃", "🌿"]);
  }

  function renderParticles(symbols) {
    const el = $("#atmoParticles");
    if (LF.state.settings.reducedMotion) { el.innerHTML = ""; return; }
    let html = "";
    for (let i = 0; i < 10; i++) {
      const left = Math.random() * 100;
      const dur = 14 + Math.random() * 14;
      const delay = Math.random() * 14;
      const sym = symbols[i % symbols.length];
      html += `<span style="left:${left}%; animation-duration:${dur}s; animation-delay:-${delay}s;">${sym}</span>`;
    }
    el.innerHTML = html;
  }

  // ---------------------------------------------------------
  // Reminders — foreground timer check
  // ---------------------------------------------------------
  function checkReminders() {
    if (LF.state.settings.reminderStyle === "off") return;
    const now = new Date();
    LF.state.reminders.forEach((r) => {
      if (r.fired) return;
      const target = new Date(r.datetime);
      target.setMinutes(target.getMinutes() - (r.offsetMinutes || 0));
      if (now >= target) {
        r.fired = true;
        speakReminder(r.title);
      }
    });
    LF.save();
  }
  function speakReminder(title) {
    const style = LF.state.settings.reminderStyle;
    let msg;
    if (style === "minimal") msg = title;
    else if (style === "quiet") msg = `Your "${title}" is coming up.`;
    else msg = `🌱 Tiny reminder: ${title}`;
    toast(msg);
    Companion.setMood("curious");
    setTimeout(() => Companion.reactToHour(new Date().getHours()), 2500);
  }

  // ---------------------------------------------------------
  // PWA install
  // ---------------------------------------------------------
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $("#installRow").style.display = "flex";
  });
  $("#installBtn").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $("#installRow").style.display = "none";
  });
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => console.warn("SW registration failed", err));
    });
  }

  // ---------------------------------------------------------
  // Init
  // ---------------------------------------------------------
  function init() {
    document.body.classList.toggle("reduced-motion", LF.state.settings.reducedMotion);
    Companion.mount($("#companionMount"));
    applyAtmosphere();
    showScreen("today");
    setInterval(() => { applyAtmosphere(); renderToday(); if (currentScreen === "calendar") renderCalendarScreen(); }, 60000);
    setInterval(checkReminders, 20000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
