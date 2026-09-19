// ============================================================
// GHIBLI FOREST — voice.js
// Turns raw calendar facts into short, characterful notification
// copy. Pure text generation — no state, no firing, no scheduling.
// That's engine.js's job. This file only answers: "what should it
// say?" for a given situation.
// ============================================================

const Voice = (() => {
  // avoid saying the exact same line twice in a row per category
  const lastPick = {};
  function pick(category, pool) {
    let i = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && i === lastPick[category]) i = (i + 1) % pool.length;
    lastPick[category] = i;
    return pool[i];
  }

  function itemLabel(item) {
    // Uses the task/event's own title verbatim — context-aware, not generic
    return item.title;
  }

  // ---------- 1. UPCOMING ----------
  function upcoming(item, minutes) {
    const t = itemLabel(item);
    const m = minutes <= 1 ? "a minute" : `${minutes} minutes`;
    const pool = [
      { title: "🌿 Something is approaching…", body: `${t} starts in ${m}.` },
      { title: "Getting closer 📖", body: `Your ${m}-away plan: ${t}.` },
      { title: `${t} is on its way 🍃`, body: `${m} left before it begins.` },
      { title: "✨ Almost time", body: `${t} is ${m} out.` },
    ];
    return pick("upcoming", pool);
  }

  // ---------- 2. STARTING NOW ----------
  function startingNow(item) {
    const t = itemLabel(item);
    const pool = [
      { title: "🌱 It's time.", body: `${t} is waiting for you.` },
      { title: "Your next little adventure begins now 📖", body: t },
      { title: "✨ Right on cue", body: `${t} starts now.` },
      { title: "🍃 Here we go", body: `Time for ${t}.` },
    ];
    return pick("starting", pool);
  }

  // ---------- 3. REMAINING TASKS ----------
  function remaining(tasks) {
    const n = tasks.length;
    const list = tasks.slice(0, 3).map((t) => `${LF.CATEGORIES[t.category]?.emoji || "🌱"} ${t.title}`).join("\n");
    const openers = n === 1
      ? [`🍃 One thing is still waiting in your forest.`, `🌱 Your forest has one task waiting for you.`]
      : [`🍃 Your forest still has ${n} things waiting.`, `🌱 ${n} little tasks are still growing.`, `Your forest has ${n} things waiting for you 🌿`];
    return { title: pick("remaining-title", openers), body: list };
  }

  // ---------- 4. DAY PROGRESS ----------
  function progress(done, total) {
    if (total === 0) return { title: "🍃 Quiet day ahead.", body: "Your forest has some breathing room today." };
    const pct = Math.round((done / total) * 100);
    const remain = total - done;
    const pool = [
      { title: "🌤️ Your day so far", body: `${done} task${done === 1 ? "" : "s"} completed, ${remain} still growing.` },
      { title: `🌲 ${pct}% through today's plan.`, body: remain > 0 ? `${remain} left to go.` : "Nearly there." },
      { title: "A little check-in 🌿", body: `${done}/${total} done today.` },
    ];
    return pick("progress", pool);
  }

  // ---------- 5. NEXT-UP (after completing something) ----------
  function nextUp(item) {
    if (!item) return { title: "✨ Nice.", body: "That's everything on today's plan." };
    const t = itemLabel(item);
    const time = item.startTime || item.time;
    const pool = [
      { title: "✨ Nice. What's growing next?", body: time ? `Next: ${t} • ${time}` : `Next: ${t}` },
      { title: "🌿 One leaf down.", body: `Next up — ${t}${time ? " at " + time : ""}.` },
      { title: "Onward 🍃", body: `Next: ${t}${time ? " • " + time : ""}` },
    ];
    return pick("nextup", pool);
  }

  // ---------- 6. OVERDUE (never guilt-heavy) ----------
  function overdue(task) {
    const t = itemLabel(task);
    const pool = [
      { title: "🍂 This one is still waiting.", body: `${t} didn't disappear. Want to pick it up?` },
      { title: `Your ${t} task is still here 🍃`, body: "No rush — whenever you're ready." },
      { title: "🍂 Still on the ground, not forgotten.", body: t },
    ];
    return pick("overdue", pool);
  }

  // ---------- 7. COMPLETION ----------
  function completion() {
    const pool = [
      { title: "✨ One more leaf on today's tree.", body: "" },
      { title: "🌿 Done.", body: "The forest remembers." },
      { title: "✨ Nicely planted.", body: "One more thing taken care of." },
    ];
    return pick("completion", pool);
  }

  // ---------- 8/9. BUSY / CALM DAY (used inside morning briefing) ----------
  function busyDay(count, nextItem) {
    const t = nextItem ? itemLabel(nextItem) : null;
    return {
      title: "🌲 Busy forest today.",
      body: `${count} things ahead.` + (t ? ` First up: ${t}.` : ""),
    };
  }
  function calmDay() {
    return { title: "🍃 Quiet day ahead.", body: "Your forest has some breathing room today." };
  }

  // ---------- 10. MORNING BRIEFING ----------
  function morningBriefing(items, taskCount) {
    const lines = items.slice(0, 4).map((it) => {
      const cat = LF.CATEGORIES[it.category] || {};
      const time = it.startTime || it.time || "";
      return `${cat.emoji || "🌱"} ${it.title}${time ? " • " + time : ""}`;
    });
    if (taskCount > 0) lines.push(`🌱 ${taskCount} task${taskCount === 1 ? "" : "s"} remaining`);
    const openers = ["☀️ Good morning.\nHere's what's growing today.", "☀️ Morning. Your forest is waking up too.", "☀️ A new day in the forest."];
    return { title: pick("morning", openers).split("\n")[0], body: (lines.join("\n") || "Nothing planned — a calm one.") };
  }

  // ---------- 11. EVENING WRAP-UP / DAY STORY ----------
  function eveningWrapup(done, remain, tomorrowItem) {
    const openers = ["🌙 The forest is getting quiet.", "🌙 Today's forest, in short:", "🌙 Winding down."];
    let body = `${done} task${done === 1 ? "" : "s"} completed`;
    body += remain > 0 ? `\n${remain} left for tomorrow.` : `\nAll clear.`;
    if (tomorrowItem) body += `\nTomorrow: ${itemLabel(tomorrowItem)}${tomorrowItem.startTime || tomorrowItem.time ? " • " + (tomorrowItem.startTime || tomorrowItem.time) : ""}`;
    return { title: pick("evening", openers), body };
  }

  // ---------- 12. STREAK / CONSISTENCY ----------
  function streak(count) {
    const pool = [
      { title: "🌿 Your little routine is becoming a forest.", body: `${count} days of showing up.` },
      { title: "🌲 Quietly consistent.", body: `${count} days and counting.` },
      { title: "✨ A pattern is growing.", body: `${count} days in a row.` },
    ];
    return pick("streak", pool);
  }

  // ---------- Forest Memory ----------
  function forestMemory(title) {
    const pool = [
      { title: `🌿 ${title} again today.`, body: "Ready to continue?" },
      { title: "🌱 A familiar leaf.", body: `${title} was here yesterday too.` },
    ];
    return pick("memory", pool);
  }

  return {
    upcoming, startingNow, remaining, progress, nextUp, overdue, completion,
    busyDay, calmDay, morningBriefing, eveningWrapup, streak, forestMemory,
  };
})();

window.Voice = Voice;
