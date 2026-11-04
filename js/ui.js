// Общие помощники интерфейса.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => n.toFixed(2).replace('.', ',');
export const pad = (n) => String(n).padStart(2, '0');
export const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const plural = (n, one, few, many) => {
  const a = Math.abs(n) % 100, b = a % 10;
  return a > 10 && a < 20 ? many : b > 1 && b < 5 ? few : b === 1 ? one : many;
};

export function store(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
export function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

// Текущее время по Минску (UTC+3), независимо от часового пояса посетителя: поля Date = настенные часы Минска.
export const minskNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Minsk' }));
export const todayStr = (d = minskNow()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const DAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
export function fmtDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return `${d} ${MONTHS_GEN[m - 1]}, ${DAYS_SHORT[new Date(y, m - 1, d).getDay()]}`;
}

// Плавное появление секций; при prefers-reduced-motion показываем сразу.
export function reveal() {
  const els = $$('[data-reveal]');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((e) => e.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  els.forEach((e) => io.observe(e));
}

// Модалка с ловушкой фокуса, Esc и возвратом фокуса.
export function openModal({ html, label, wide = false }) {
  const prev = document.activeElement;
  const root = document.createElement('div');
  root.className = 'modal';
  root.innerHTML = `<div class="modal__box${wide ? ' modal__box--wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(label)}" tabindex="-1"><button class="modal__close" type="button" aria-label="Закрыть">&times;</button><div class="modal__body">${html}</div></div>`;
  document.body.appendChild(root);
  document.body.classList.add('no-scroll');
  const box = root.firstElementChild;
  const focusables = () => $$('a[href],button:not([disabled]),input,select,textarea', box);
  const close = () => {
    root.remove();
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', onKey);
    if (prev && prev.focus) prev.focus();
  };
  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables();
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', onKey);
  root.addEventListener('click', (e) => { if (e.target === root) close(); });
  $('.modal__close', root).addEventListener('click', close);
  box.focus();
  return { el: box, close };
}
