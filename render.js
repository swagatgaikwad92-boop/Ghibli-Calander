// ============================================================
// LITTLE FOREST — render.js
// Builds the dynamic markup for every screen from LF state
// ============================================================

const Render = (() => {

  function categoryGrid(container, selectedId, onPick) {
    container.innerHTML = Object.entries(LF.CATEGORIES).map(([id, c]) => `
      <button type="button" class="cat-pick ${id === selectedId ? "selected" : ""}" data-cat="${id}" style="--cat-color:${c.color}">
        ${c.emoji} ${c.label}
      </button>`).join("");
    container.querySelectorAll("[data-cat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        container.querySelectorAll("[data-cat]").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        onPick(btn.dataset.cat);
      });
    });
  }

  function moodRow(container, selectedId, onPick) {
    container.innerHTML = LF.MOODS.map((m) => `
      <button type="button" class="mood-btn ${m.id === selectedId ? "selected" : ""}" data-mood="${m.id}">
        <span class="em">${m.emoji}</span><span>${m.label}</span>
      </button>`).join("");
    container.querySelectorAll("[data-mood]").forEach((btn) => {
      btn.addEventListener("click", () => {
        container.querySelectorAll("[data-mood]").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        onPick(btn.dataset.mood);
      });
    });
  }

  function timeline(container, dateKey) {
    const events = LF.eventsOn(dateKey).map((e) => ({ ...e, kind: "event", time: e.startTime }));
    const tasks = LF.tasksOn(dateKey).filter((t) => t.time).map((t) => ({ ...t, kind: "task" }));
    const items = [...events, ...tasks].sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    if (items.length === 0) {
      container.innerHTML = emptyState("Nothing planned here yet 🌱", "sleeping");
      return;
    }

    const now = new Date();
    const isToday = dateKey === LF.todayKey();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    let html = "";
    let nowInserted = false;
    items.forEach((it) => {
      const cat = LF.CATEGORIES[it.category] || LF.CATEGORIES.personal;
      const itMin = LF.toMinutes(it.time);
      const isPast = isToday && itMin != null && itMin < nowMin - 5;
      const isNow = isToday && itMin != null && Math.abs(itMin - nowMin) <= 20 && !isPast;

      if (isToday && !nowInserted && itMin != null && itMin >= nowMin) {
        html += `<div class="now-line" style="top:0"></div>`;
        nowInserted = true;
      }

      html += `
        <div class="tl-item ${isPast ? "past" : ""} ${isNow ? "now" : ""}" style="--cat-color:${cat.color}">
          <div class="tl-time">${LFCal.fmtTime(it.time)}</div>
          <div class="tl-card glass">
            <span class="emoji">${cat.emoji}</span>
            <span class="title">${LFTasks.escapeHTML(it.title)}</span>
            ${it.kind === "task" ? `<span class="dot" style="background:${cat.color}"></span>` : ""}
          </div>
        </div>`;
    });
    container.innerHTML = html;
  }

  function emptyState(text, mode) {
    return `
      <div class="empty-state">
        <svg viewBox="0 0 100 100"><circle cx="50" cy="55" r="26" fill="#DCCFAE" opacity="0.6"/><ellipse cx="50" cy="56" rx="18" ry="20" fill="#E8DFC8"/><path d="M42 54 h6 M52 54 h6" stroke="#8A8175" stroke-width="2.5" stroke-linecap="round"/></svg>
        <p>${text}</p>
        <button class="btn btn-primary btn-sm" data-open-plant>Plant something</button>
      </div>`;
  }

  function conflicts(container, dateKey) {
    const cf = LF.findConflicts(dateKey);
    if (cf.length === 0) { container.innerHTML = ""; return; }
    container.innerHTML = cf.map((c) => `
      <div class="conflict-note">⚠️ "${LFTasks.escapeHTML(c.a.title)}" and "${LFTasks.escapeHTML(c.b.title)}" overlap.</div>
    `).join("");
  }

  function taskList(container, tasks, { onComplete, onPostpone, onExpand }) {
    if (tasks.length === 0) {
      container.innerHTML = emptyState("No tasks here yet 🌱", "empty");
      return;
    }
    container.innerHTML = tasks.map(LFTasks.taskItemHTML).join("");
    LFTasks.attachTaskGestures(container, { onComplete, onPostpone, onExpand });
  }

  function monthGridView(gridEl, labelEl, year, month, selectedKey) {
    labelEl.textContent = `${LFCal.MONTH_NAMES[month]} ${year}`;
    const cells = LFCal.monthGrid(year, month);
    const today = LF.todayKey();
    gridEl.innerHTML = cells.map((c) => {
      const ev = LF.eventsOn(c.key);
      const tk = LF.tasksOn(c.key);
      const dots = [...ev.slice(0, 2), ...tk.slice(0, 2)].slice(0, 3).map((it) => {
        const cat = LF.CATEGORIES[it.category] || LF.CATEGORIES.personal;
        return `<span class="dot" style="background:${cat.color}"></span>`;
      }).join("");
      const cls = [
        "day-cell",
        !c.inMonth ? "other" : "",
        c.key === today ? "today" : "",
        c.key === selectedKey ? "selected" : "",
      ].filter(Boolean).join(" ");
      return `<button type="button" class="${cls}" data-daykey="${c.key}">${c.date.getDate()}<span class="day-dots">${dots}</span></button>`;
    }).join("");
  }

  function weekStripView(container, weekDates, selectedKey) {
    const today = LF.todayKey();
    container.innerHTML = weekDates.map((d) => {
      const key = LF.todayKey(d);
      const tasks = LF.tasksOn(key);
      const done = tasks.filter((t) => t.done).length;
      const events = LF.eventsOn(key);
      const dots = [...events.slice(0, 3)].map((e) => {
        const cat = LF.CATEGORIES[e.category] || LF.CATEGORIES.personal;
        return `<span class="dot" style="background:${cat.color}"></span>`;
      }).join("");
      return `
        <button type="button" class="week-day-card glass ${key === selectedKey ? "selected" : ""}" data-daykey="${key}">
          <div class="wd-name">${LFCal.WEEKDAY_SHORT[d.getDay()]}${key === today ? " · today" : ""}</div>
          <div class="wd-num">${d.getDate()}</div>
          <div class="wd-stats">${tasks.length ? `${done}/${tasks.length} tasks` : "No tasks"}</div>
          <div class="wd-dots">${dots}</div>
        </button>`;
    }).join("");
  }

  function capsuleCard(dateKey, cap) {
    return `
      <div class="glass capsule">
        <div class="cap-title">${cap.label || "Your little day 🌿"} — ${dateKey}</div>
        <div class="cap-stats">
          <span>📚 ${cap.tasksDone} tasks completed</span>
          <span>🎓 ${cap.events} events</span>
          <span>🌤️ Mood: ${cap.mood || "—"}</span>
        </div>
        ${cap.favMoment ? `<div class="cap-fav">"${LFTasks.escapeHTML(cap.favMoment)}"</div>` : ""}
      </div>`;
  }

  return {
    categoryGrid, moodRow, timeline, emptyState, conflicts, taskList,
    monthGridView, weekStripView, capsuleCard,
  };
})();

window.Render = Render;
