// ============================================================
// GHIBLI FOREST — tasks.js
// Task item markup + swipe-to-complete / swipe-to-postpone
// ============================================================

function taskItemHTML(t) {
  const cat = LF.CATEGORIES[t.category] || LF.CATEGORIES.personal;
  return `
  <div class="task-item" data-id="${t.id}" style="--cat-color:${cat.color}">
    <div class="task-swipe-bg right">Done ✓</div>
    <div class="task-swipe-bg left">→ Tomorrow</div>
    <div class="task-drag">
      <button class="task-check ${t.done ? "checked" : ""}" data-action="toggle" aria-label="Mark ${t.done ? "not done" : "done"}">
        <svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 12L13 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="task-body" data-action="expand">
        <div class="task-title">${escapeHTML(t.title)}</div>
        <div class="task-meta">
          <span class="cat-tag" style="color:${cat.color}">${cat.emoji} ${cat.label}</span>
          ${t.time ? `<span class="time">${LFCal.fmtTime(t.time)}</span>` : ""}
          ${t.priority === "high" ? `<span class="time">🔥 Priority</span>` : ""}
        </div>
      </div>
    </div>
  </div>`;
}

function escapeHTML(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

function attachTaskGestures(root, { onComplete, onPostpone, onExpand }) {
  root.querySelectorAll(".task-item").forEach((item) => {
    const id = item.dataset.id;
    const drag = item.querySelector(".task-drag");
    let startX = 0, curX = 0, dragging = false;

    const checkBtn = item.querySelector('[data-action="toggle"]');
    checkBtn.addEventListener("click", (e) => { e.stopPropagation(); onComplete(id); });

    const body = item.querySelector('[data-action="expand"]');
    body.addEventListener("click", () => onExpand && onExpand(id));

    function onStart(x) { dragging = true; startX = x; curX = x; drag.style.transition = "none"; }
    function onMove(x) {
      if (!dragging) return;
      curX = x;
      const dx = curX - startX;
      drag.style.transform = `translateX(${dx}px)`;
      const rightBg = item.querySelector(".task-swipe-bg.right");
      const leftBg = item.querySelector(".task-swipe-bg.left");
      rightBg.style.opacity = dx > 20 ? Math.min(1, dx / 90) : 0;
      leftBg.style.opacity = dx < -20 ? Math.min(1, -dx / 90) : 0;
    }
    function onEnd() {
      if (!dragging) return;
      dragging = false;
      const dx = curX - startX;
      drag.style.transition = "transform var(--dur-med) var(--ease-spring)";
      if (dx > 90) { onComplete(id); }
      else if (dx < -90) { onPostpone(id); }
      drag.style.transform = "translateX(0)";
      item.querySelectorAll(".task-swipe-bg").forEach((b) => (b.style.opacity = 0));
    }

    drag.addEventListener("touchstart", (e) => onStart(e.touches[0].clientX), { passive: true });
    drag.addEventListener("touchmove", (e) => onMove(e.touches[0].clientX), { passive: true });
    drag.addEventListener("touchend", onEnd);
    drag.addEventListener("mousedown", (e) => onStart(e.clientX));
    window.addEventListener("mousemove", (e) => onMove(e.clientX));
    window.addEventListener("mouseup", onEnd);
  });
}

window.LFTasks = { taskItemHTML, attachTaskGestures, escapeHTML };
