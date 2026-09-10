// ============================================================
// GHIBLI FOREST — calendar.js
// Pure date/grid helpers for month & week views
// ============================================================

const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function monthGrid(year, month) {
  // month: 0-11. Returns array of {date, key, inMonth}
  const first = new Date(year, month, 1);
  const startOffset = first.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrevMonth - i);
    cells.push({ date: d, key: LF.todayKey(d), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    cells.push({ date: dt, key: LF.todayKey(dt), inMonth: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last);
    d.setDate(d.getDate() + 1);
    cells.push({ date: d, key: LF.todayKey(d), inMonth: false });
    if (cells.length >= 42) break;
  }
  return cells;
}

function weekDates(anchorDate) {
  const d = new Date(anchorDate);
  const dow = d.getDay();
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - dow);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    out.push(day);
  }
  return out;
}

function greetingForHour(h) {
  if (h >= 5 && h < 12) return "Good morning, little explorer 🌿";
  if (h >= 12 && h < 17) return "Good afternoon 🌱";
  if (h >= 17 && h < 21) return "Evening already. Let's see how today went.";
  return "Everything is quiet now. 🌙";
}

function timeOfDayKey(h) {
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

function seasonForMonth(m) {
  if ([2, 3, 4].includes(m)) return "spring";
  if ([5, 6, 7].includes(m)) return "summer";
  if ([8, 9, 10].includes(m)) return "autumn";
  return "winter";
}

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

window.LFCal = { monthGrid, weekDates, greetingForHour, timeOfDayKey, seasonForMonth, fmtTime, WEEKDAY_SHORT, WEEKDAY_FULL, MONTH_NAMES };
