// ============================================================
// LITTLE FOREST — state.js
// Central data model + localStorage persistence
// ============================================================

const STORAGE_KEY = "littleforest_v1";

const CATEGORIES = {
  study:     { label: "Study",     emoji: "📚", color: "var(--cat-study)" },
  college:   { label: "College",   emoji: "🎓", color: "var(--cat-college)" },
  homework:  { label: "Homework",  emoji: "📝", color: "var(--cat-homework)" },
  personal:  { label: "Personal",  emoji: "🌱", color: "var(--cat-personal)" },
  creative:  { label: "Creative",  emoji: "🎨", color: "var(--cat-creative)" },
  meeting:   { label: "Meeting",   emoji: "👥", color: "var(--cat-meeting)" },
  important: { label: "Important", emoji: "⭐", color: "var(--cat-important)" },
  deadline:  { label: "Deadline",  emoji: "⏰", color: "var(--cat-deadline)" },
};

const MOODS = [
  { id: "peaceful",   emoji: "😌", label: "Peaceful" },
  { id: "happy",      emoji: "🙂", label: "Happy" },
  { id: "tired",      emoji: "😴", label: "Tired" },
  { id: "productive", emoji: "💪", label: "Productive" },
  { id: "chaotic",    emoji: "🌀", label: "Chaotic" },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultState() {
  return {
    version: 1,
    settings: {
      theme: "auto",        // auto | day | night
      season: "auto",       // auto | spring | summer | autumn | winter
      reducedMotion: false,
      reminderStyle: "cozy", // minimal | cozy | quiet | off
      soundOn: false,
    },
    events: [],     // {id, title, date, startTime, endTime, category, notes, repeat}
    tasks: [],      // {id, title, date, time, category, priority, notes, deadline, duration, done, doneAt, subtasks:[{id,title,done}]}
    reminders: [],  // {id, title, datetime, offsetMinutes, fired}
    days: {},       // dateKey -> {mood, intention, notes, journal:{felt,littleThings,tinyWin,favMoment,energy}, capsule}
    streak: { count: 0, lastActiveDate: null },
    companion: { mood: "content" },
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultState(), parsed);
  } catch (e) {
    console.warn("Little Forest: could not load state, starting fresh", e);
    return defaultState();
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Little Forest: save failed", e);
  }
}

function getDay(dateKey) {
  if (!state.days[dateKey]) {
    state.days[dateKey] = { mood: null, intention: "", notes: "", journal: {}, capsule: null };
  }
  return state.days[dateKey];
}

function eventsOn(dateKey) {
  return state.events.filter((e) => e.date === dateKey).sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
}
function tasksOn(dateKey) {
  return state.tasks.filter((t) => t.date === dateKey).sort((a, b) => (a.time || "23:59").localeCompare(b.time || "23:59"));
}

function addEvent(ev) {
  ev.id = uid();
  state.events.push(ev);
  save();
  return ev;
}
function addTask(t) {
  t.id = uid();
  t.done = false;
  t.subtasks = t.subtasks || [];
  state.tasks.push(t);
  save();
  return t;
}
function addReminder(r) {
  r.id = uid();
  r.fired = false;
  state.reminders.push(r);
  save();
  return r;
}
function toggleTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return null;
  t.done = !t.done;
  t.doneAt = t.done ? new Date().toISOString() : null;
  if (t.done) bumpStreak();
  save();
  return t;
}
function removeItem(kind, id) {
  const arr = state[kind];
  const i = arr.findIndex((x) => x.id === id);
  if (i >= 0) arr.splice(i, 1);
  save();
}
function moveTaskToDate(id, dateKey) {
  const t = state.tasks.find((x) => x.id === id);
  if (t) { t.date = dateKey; save(); }
}

function bumpStreak() {
  const today = todayKey();
  if (state.streak.lastActiveDate === today) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = todayKey(y);
  state.streak.count = state.streak.lastActiveDate === yesterday ? state.streak.count + 1 : 1;
  state.streak.lastActiveDate = today;
  save();
}

// ---- conflict detection ----
function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function findConflicts(dateKey) {
  const items = [
    ...eventsOn(dateKey).map((e) => ({ id: e.id, title: e.title, start: toMinutes(e.startTime), end: toMinutes(e.endTime) || toMinutes(e.startTime) + 30, kind: "event" })),
    ...tasksOn(dateKey).filter((t) => t.time).map((t) => ({ id: t.id, title: t.title, start: toMinutes(t.time), end: toMinutes(t.time) + (t.duration || 30), kind: "task" })),
  ].filter((x) => x.start != null).sort((a, b) => a.start - b.start);

  const conflicts = [];
  for (let i = 0; i < items.length - 1; i++) {
    const a = items[i], b = items[i + 1];
    if (b.start < a.end) conflicts.push({ a, b });
  }
  return conflicts;
}

function overdueTasks(dateKey) {
  return tasksOn(dateKey).filter((t) => !t.done && t.deadline && t.deadline < dateKey);
}

window.LF = {
  state, save, load, uid, todayKey, getDay, eventsOn, tasksOn,
  addEvent, addTask, addReminder, toggleTask, removeItem, moveTaskToDate,
  bumpStreak, findConflicts, overdueTasks, toMinutes,
  CATEGORIES, MOODS,
};
