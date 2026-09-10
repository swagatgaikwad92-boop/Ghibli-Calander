// ============================================================
// GHIBLI FOREST — search.js
// Universal search across tasks, events, reminders, journal, notes
// ============================================================

function universalSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results = [];

  LF.state.tasks.forEach((t) => {
    if (t.title.toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q)) {
      const cat = LF.CATEGORIES[t.category] || LF.CATEGORIES.personal;
      results.push({ kind: "task", emoji: cat.emoji, title: t.title, sub: `Task · ${t.date}`, date: t.date });
    }
  });
  LF.state.events.forEach((e) => {
    if (e.title.toLowerCase().includes(q) || (e.notes || "").toLowerCase().includes(q)) {
      const cat = LF.CATEGORIES[e.category] || LF.CATEGORIES.personal;
      results.push({ kind: "event", emoji: cat.emoji, title: e.title, sub: `Event · ${e.date}`, date: e.date });
    }
  });
  LF.state.reminders.forEach((r) => {
    if (r.title.toLowerCase().includes(q)) {
      results.push({ kind: "reminder", emoji: "🔔", title: r.title, sub: `Reminder · ${(r.datetime || "").slice(0, 10)}`, date: (r.datetime || "").slice(0, 10) });
    }
  });
  Object.entries(LF.state.days).forEach(([dateKey, day]) => {
    const j = day.journal || {};
    const blob = [day.intention, day.notes, j.felt, j.littleThings, j.tinyWin, j.favMoment].filter(Boolean).join(" ").toLowerCase();
    if (blob.includes(q)) {
      results.push({ kind: "journal", emoji: "📖", title: `Journal entry`, sub: `Day Log · ${dateKey}`, date: dateKey });
    }
  });

  return results.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

window.LFSearch = { universalSearch };
