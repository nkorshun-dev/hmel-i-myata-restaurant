// Детерминированная занятость столиков. Все функции чистые: результат зависит только от аргументов.
export const BOOKING_MIN = 120; // бронь держит столик 2 часа
export const SEASON = { veranda: [5, 9] }; // месяцы работы веранды, включительно
const ZONE_ORDER = ['window', 'sofa', 'fire', 'quiet', 'bar'];

const pad = (n) => String(n).padStart(2, '0');
export const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const fromMin = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d, dow: new Date(y, m - 1, d).getDay() };
}

// Часы работы в минутах от полуночи; 1500 = 01:00 следующих суток.
export function workingHours(dateStr) {
  const { dow } = parseDate(dateStr);
  if (dow === 0) return { open: 720, close: 1320 };
  if (dow === 5 || dow === 6) return { open: 720, close: 1500 };
  return { open: 720, close: 1380 };
}

// Слоты по 30 минут; последний — за 2 часа до закрытия. nowMin — для сегодняшнего дня.
export function timeSlots(dateStr, nowMin = null) {
  const { open, close } = workingHours(dateStr);
  const out = [];
  for (let t = open; t <= close - BOOKING_MIN; t += 30) {
    if (nowMin !== null && t <= nowMin) continue;
    out.push(fromMin(t));
  }
  return out;
}

export function isHallOpen(hallId, dateStr) {
  const season = SEASON[hallId];
  if (!season) return true;
  const { m } = parseDate(dateStr);
  return m >= season[0] && m <= season[1];
}

// FNV-1a: одинаковая строка всегда даёт одно число.
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const rand = (seed) => hash(seed) / 4294967296;

// Вероятность, что в этом слоте начинается бронь: вечер пт–сб самый плотный.
function load(dow, start) {
  const hr = start / 60;
  const weekend = dow === 5 || dow === 6;
  let p = weekend ? 0.05 : 0.03;
  if (hr >= 18 && hr < 22) p += weekend ? 0.15 : 0.06;
  else if (hr >= 13 && hr < 15) p += 0.03;
  if (dow === 0 && hr >= 14 && hr < 18) p += 0.04;
  return p;
}

// Старты «чужих» броней столика на дату (минуты). Жадно, без пересечений.
export function generatedBookings(tableId, dateStr) {
  const { dow } = parseDate(dateStr);
  const { open, close } = workingHours(dateStr);
  const res = [];
  let freeFrom = open;
  for (let s = open; s <= close - BOOKING_MIN; s += 30) {
    if (s < freeFrom) continue;
    if (rand(`${tableId}|${dateStr}|${s}`) < load(dow, s)) { res.push(s); freeFrom = s + BOOKING_MIN; }
  }
  return res;
}

// Интервалы [s, s+120) и [t, t+120) пересекаются, если |s - t| < 120.
export function isTableBusy(tableId, dateStr, time, userBookings = []) {
  const t = toMin(time);
  if (generatedBookings(tableId, dateStr).some((s) => Math.abs(s - t) < BOOKING_MIN)) return true;
  return userBookings.some((b) => b.tableId === tableId && b.date === dateStr && Math.abs(toMin(b.time) - t) < BOOKING_MIN);
}

export const fitsParty = (seats, guests) => seats >= guests && seats <= guests + 2;

// closed | busy | small | big | free
export function tableStatus(table, { date, time, guests, bookings = [] }) {
  if (!isHallOpen(table.hall, date)) return 'closed';
  if (isTableBusy(table.id, date, time, bookings)) return 'busy';
  if (table.seats < guests) return 'small';
  if (table.seats > guests + 2) return 'big';
  return 'free';
}

// Лучший столик: самый компактный из подходящих, затем по зоне и номеру.
export function autoPick(tables, ctx) {
  const free = tables.filter((t) => tableStatus(t, ctx) === 'free');
  free.sort((a, b) => a.seats - b.seats || ZONE_ORDER.indexOf(a.zone) - ZONE_ORDER.indexOf(b.zone) || a.num - b.num);
  return free[0] || null;
}
