// Рендер и взаимодействие со схемой зала. SVG строится из данных floor-data.js.
import { HALLS, DECOR, SIZES, ZONES, TABLES } from './floor-data.js';
import { plural } from './ui.js';

export const STATUS_LABEL = { free: 'свободен', busy: 'занят', small: 'мало мест', big: 'слишком большой столик', closed: 'зал закрыт' };
export const seatsText = (n) => `${n} ${plural(n, 'место', 'места', 'мест')}`;
export const tableLabel = (t, status, selected) =>
  `Столик ${t.num}, ${seatsText(t.seats)}, ${ZONES[t.zone]}, ${selected ? 'выбран' : STATUS_LABEL[status]}`;


function chairs(t) {
  const out = [];
  if (t.shape === 'round') {
    const { r } = SIZES.round[t.seats];
    for (let i = 0; i < t.seats; i++) {
      const a = (i / t.seats) * Math.PI * 2 - Math.PI / 2;
      out.push(`<circle class="chair" cx="${(Math.cos(a) * (r + 9)).toFixed(1)}" cy="${(Math.sin(a) * (r + 9)).toFixed(1)}" r="6"/>`);
    }
  } else {
    const { w, h } = SIZES.rect[t.seats];
    const per = t.seats / 2;
    for (let i = 0; i < per; i++) {
      const x = -w / 2 + (w * (i + 0.5)) / per;
      out.push(`<circle class="chair" cx="${x}" cy="${-h / 2 - 9}" r="6"/><circle class="chair" cx="${x}" cy="${h / 2 + 9}" r="6"/>`);
    }
  }
  return out.join('');
}

function tableMarkup(t, status, selected, interactive, tab) {
  const body = t.shape === 'round'
    ? `<circle class="shape" r="${SIZES.round[t.seats].r}"/>`
    : (() => { const { w, h } = SIZES.rect[t.seats]; return `<rect class="shape" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="8"/>`; })();
  const a11y = interactive
    ? ` role="button" tabindex="${tab ? 0 : -1}" aria-label="${tableLabel(t, status, selected)}" aria-pressed="${selected}"${status !== 'free' && !selected ? ' aria-disabled="true"' : ''}`
    : '';
  return `<g class="tbl st-${status}${selected ? ' sel' : ''}" data-id="${t.id}" transform="translate(${t.x} ${t.y})"${a11y}><circle class="hit" r="46"/>${chairs(t)}${body}<text class="num" text-anchor="middle" dominant-baseline="central">${t.num}</text></g>`;
}

function decorMarkup(hallId) {
  const h = HALLS[hallId], d = DECOR[hallId];
  let s = `<rect class="floor-bg" x="0" y="0" width="${h.w}" height="${h.h}" rx="14"/>`;
  d.rugs.forEach((r) => { s += `<rect class="rug" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="18"/>`; });
  d.windows.forEach(([x, y, w]) => {
    s += `<rect class="win" x="${x}" y="${y}" width="${w}" height="9"/><path class="win" d="M${x + w / 3} 0v9M${x + (2 * w) / 3} 0v9"/>`;
  });
  if (d.fireplace) {
    const f = d.fireplace;
    s += `<rect class="deco" x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" rx="4"/><path class="flame" d="M17 ${f.y + 70}c-8-10 0-16 0-26 8 6 12 14 8 22 4-2 6-6 6-10 6 12 0 18-14 14z"/><text class="lbl" x="${f.x + 46}" y="${f.y + f.h / 2 + 4}">Камин</text>`;
  }
  if (d.bar) {
    const b = d.bar;
    s += `<rect class="deco" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10"/><text class="lbl" x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + 4}" text-anchor="middle">Барная стойка · 14 кранов</text>`;
    for (let i = 0; i < d.stools; i++) s += `<circle class="chair" cx="${b.x + (b.w * (i + 0.5)) / d.stools}" cy="${b.y + b.h + 14}" r="7"/>`;
  }
  const o = d.door;
  s += `<path class="deco" d="M${o.x} ${o.y}h${o.w}M${o.x} ${o.y}a${o.w} ${o.w} 0 0 1 ${o.w} ${-o.w}"/><text class="lbl" x="${o.x + o.w + 8}" y="${o.y - 8}">Вход</text>`;
  d.plants.forEach(([x, y]) => {
    s += `<g class="plant" transform="translate(${x} ${y})"><circle r="15"/><circle r="9" cx="-4" cy="-3"/><circle r="5" cx="5" cy="4"/></g>`;
  });
  return s;
}

const CTRL = '<div class="floor__ctrl"><button type="button" data-z="in" aria-label="Приблизить схему">+</button><button type="button" data-z="out" aria-label="Отдалить схему">&minus;</button><button type="button" data-z="reset" aria-label="Сбросить масштаб">&#x2922;</button></div>';

export function mountFloor(host, { interactive = true, onSelect = () => {}, onHover = () => {} } = {}) {
  host.classList.add('floor');
  host.classList.toggle('floor--live', interactive);
  host.innerHTML = `<div class="floor__stage"></div><div class="floor__tip" hidden></div>${interactive ? CTRL : ''}`;
  const stage = host.querySelector('.floor__stage');
  const tip = host.querySelector('.floor__tip');
  let cur = { hallId: 'main', statusOf: () => 'free', selectedId: null };
  let vb = null, svg = null, suppress = false;
  const base = () => HALLS[cur.hallId];
  const applyVB = () => {
    svg.setAttribute('viewBox', `${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}`);
    host.classList.toggle('zoomed', vb.w < base().w - 1);
  };
  const clampVB = () => {
    const b = base();
    vb.w = Math.min(b.w, Math.max(b.w / 4, vb.w));
    vb.h = (vb.w * b.h) / b.w;
    vb.x = Math.min(b.w - vb.w, Math.max(0, vb.x));
    vb.y = Math.min(b.h - vb.h, Math.max(0, vb.y));
  };
  // Масштаб относительно точки (px, py) в долях видимой области (0..1).
  function zoomAt(f, px = 0.5, py = 0.5) {
    const ax = vb.x + vb.w * px, ay = vb.y + vb.h * py;
    vb.w /= f; vb.h /= f;
    vb.x = ax - vb.w * px; vb.y = ay - vb.h * py;
    clampVB(); applyVB();
  }

  function render(state) {
    const hallChanged = state.hallId !== cur.hallId;
    cur = { ...cur, ...state };
    const h = base();
    if (hallChanged || !vb) vb = { x: 0, y: 0, w: h.w, h: h.h };
    const fid = stage.contains(document.activeElement) ? document.activeElement.dataset.id : null;
    const list = TABLES.filter((t) => t.hall === cur.hallId);
    const statuses = list.map((t) => cur.statusOf(t));
    let tabIdx = list.findIndex((t) => t.id === cur.selectedId);
    if (tabIdx < 0) tabIdx = Math.max(0, statuses.indexOf('free'));
    const tables = list.map((t, i) => tableMarkup(t, statuses[i], t.id === cur.selectedId, interactive, i === tabIdx)).join('');
    stage.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${h.w} ${h.h}" ${interactive ? `role="group" aria-label="Схема зала: ${h.name}"` : 'aria-hidden="true"'} preserveAspectRatio="xMidYMid meet">${decorMarkup(cur.hallId)}${tables}</svg>`;
    svg = stage.firstElementChild;
    applyVB();
    if (fid) { const el = stage.querySelector(`[data-id="${fid}"]`); if (el) el.focus({ preventScroll: true }); }
  }

  const tableOf = (el) => el && el.closest && el.closest('.tbl');
  const dataOf = (g) => {
    const t = TABLES.find((x) => x.id === g.dataset.id);
    return { t, status: cur.statusOf(t) };
  };

  function showTip(g) {
    const { t, status } = dataOf(g);
    const text = `Столик ${t.num} · ${seatsText(t.seats)} · ${ZONES[t.zone]} · ${t.id === cur.selectedId ? 'выбран' : STATUS_LABEL[status]}`;
    tip.textContent = text;
    tip.hidden = false;
    const hr = host.getBoundingClientRect(), r = g.getBoundingClientRect();
    const x = Math.min(Math.max(r.left - hr.left + r.width / 2, 90), hr.width - 90);
    tip.style.left = `${x}px`;
    tip.style.top = `${Math.max(r.top - hr.top - 8, 8)}px`;
    onHover(t, status);
  }
  const hideTip = () => { tip.hidden = true; onHover(null); };

  if (interactive) {
    stage.addEventListener('click', (e) => {
      if (suppress) { suppress = false; return; }
      const g = tableOf(e.target);
      if (g) { const { t, status } = dataOf(g); onSelect(t, status); }
    });
    stage.addEventListener('mouseover', (e) => { const g = tableOf(e.target); if (g) showTip(g); });
    stage.addEventListener('mouseout', (e) => { if (tableOf(e.target)) hideTip(); });
    stage.addEventListener('focusin', (e) => { const g = tableOf(e.target); if (g) showTip(g); });
    stage.addEventListener('focusout', hideTip);

    stage.addEventListener('keydown', (e) => {
      const g = tableOf(e.target);
      if (!g) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const { t, status } = dataOf(g);
        onSelect(t, status);
        return;
      }
      const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
      if (!dir) return;
      e.preventDefault();
      const from = TABLES.find((x) => x.id === g.dataset.id);
      let best = null, bestScore = Infinity;
      TABLES.filter((x) => x.hall === from.hall && x !== from).forEach((x) => {
        const dx = x.x - from.x, dy = x.y - from.y;
        const along = dx * dir[0] + dy * dir[1], across = Math.abs(dx * dir[1] + dy * dir[0]);
        if (along <= 10) return;
        const score = along + across * 2;
        if (score < bestScore) { bestScore = score; best = x; }
      });
      if (!best) return;
      stage.querySelectorAll('.tbl').forEach((n) => n.setAttribute('tabindex', '-1'));
      const next = stage.querySelector(`[data-id="${best.id}"]`);
      next.setAttribute('tabindex', '0');
      next.focus();
    });

    host.querySelector('.floor__ctrl').addEventListener('click', (e) => {
      const z = e.target.closest('button')?.dataset.z;
      if (!z) return;
      if (z === 'reset') { const b = base(); vb = { x: 0, y: 0, w: b.w, h: b.h }; applyVB(); } else zoomAt(z === 'in' ? 1.5 : 1 / 1.5);
    });

    // Перетаскивание и pinch-zoom (pointer events работают и для мыши, и для пальцев).
    const ptrs = new Map();
    let last = null, moved = false;
    host.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.floor__ctrl')) return;
      suppress = false; moved = false;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
      if (ptrs.size === 2) last = dist();
    });
    const dist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    host.addEventListener('pointermove', (e) => {
      const p = ptrs.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      const rect = svg.getBoundingClientRect();
      if (ptrs.size === 2) {
        const d = dist();
        if (last) { const [a, b] = [...ptrs.values()]; zoomAt(d / last, ((a.x + b.x) / 2 - rect.left) / rect.width, ((a.y + b.y) / 2 - rect.top) / rect.height); }
        last = d; moved = true; suppress = true;
      } else if (ptrs.size === 1 && vb.w < base().w - 1) {
        if (!moved && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 6) return;
        moved = true; suppress = true;
        try { host.setPointerCapture(e.pointerId); } catch { /* не критично */ }
        const k = Math.max(vb.w / rect.width, vb.h / rect.height);
        vb.x -= dx * k; vb.y -= dy * k;
        clampVB(); applyVB();
      }
    });
    const up = (e) => { ptrs.delete(e.pointerId); last = null; };
    host.addEventListener('pointerup', up);
    host.addEventListener('pointercancel', up);
  }

  return {
    render,
    focusSelected() { const el = stage.querySelector('.tbl.sel') || stage.querySelector('.tbl[tabindex="0"]'); if (el) el.focus(); },
  };
}
