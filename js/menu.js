// Меню: карточки, фильтры, поиск, синхронизация с URL, модалка блюда, пиво на кране.
import { DISHES, CATEGORIES, TAGS, ALLERGENS, BEERS, beerById, photo } from './menu-data.js';
import { $, $$, esc, money, debounce, openModal, reveal } from './ui.js';
import { mountLayout } from './layout.js';

const FILTER_TAGS = ['veg', 'vegan', 'gf', 'spicy'];
const ICONS = {
  spicy: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M8 1c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 1 .5 2 1 2 .5-2-.5-4 1-6z" fill="currentColor"/></svg>',
  veg: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3 13C3 6 8 3 14 3c0 7-3 11-9 11M3 13l6-6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  hit: '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M8 1.5l2 4.3 4.6.6-3.4 3.2.9 4.6L8 11.8 3.9 14.2l.9-4.6L1.4 6.4 6 5.8z" fill="currentColor"/></svg>',
};
const tagIcon = (t) => ICONS[t] || (t === 'vegan' ? '<b aria-hidden="true">V</b>' : t === 'gf' ? '<b aria-hidden="true">GF</b>' : t === 'new' ? '<b aria-hidden="true">NEW</b>' : '');

export const norm = (s) => s.toLowerCase().replace(/ё/g, 'е');

// Чистая функция фильтрации: легко проверять отдельно от DOM.
export function filterDishes(dishes, { tags = new Set(), exclude = new Set(), q = '' }) {
  const needle = norm(q.trim());
  return dishes.filter((d) =>
    [...tags].every((t) => d.tags.includes(t)) &&
    ![...exclude].some((a) => d.allergens.includes(a)) &&
    (!needle || norm(`${d.name} ${d.desc}`).includes(needle)));
}

export function stateFromUrl(search) {
  const p = new URLSearchParams(search);
  return {
    tags: new Set(FILTER_TAGS.filter((t) => p.get(t) === '1')),
    exclude: new Set((p.get('exclude') || '').split(',').filter((a) => a in ALLERGENS)),
    q: p.get('q') || '',
  };
}

export function urlFromState(st) {
  const p = new URLSearchParams();
  FILTER_TAGS.forEach((t) => { if (st.tags.has(t)) p.set(t, '1'); });
  if (st.exclude.size) p.set('exclude', [...st.exclude].join(','));
  if (st.q.trim()) p.set('q', st.q.trim());
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const badge = (t) => `<span class="tag tag--${t}">${tagIcon(t)}<span>${TAGS[t]}</span></span>`;
const allergenLine = (d) => (d.allergens.length ? `Аллергены: ${d.allergens.map((a) => ALLERGENS[a].toLowerCase()).join(', ')}` : 'Аллергенов из списка нет');

export function dishCard(d) {
  return `<article class="dish" data-id="${d.id}">
<div class="dish__img"><img src="${photo(d.img)}" alt="" width="640" height="440" loading="lazy" decoding="async"><div class="dish__tags">${d.tags.map(badge).join('')}</div></div>
<div class="dish__body"><h3><button type="button" class="dish__open" data-id="${d.id}">${esc(d.name)}</button></h3>
<p class="dish__desc">${esc(d.desc)}</p>
<div class="dish__meta"><span class="muted">${esc(d.weight)}</span><span class="price">${money(d.price)} BYN</span></div>
<p class="dish__all">${allergenLine(d)}</p></div></article>`;
}

export function openDish(id) {
  const d = DISHES.find((x) => x.id === id);
  if (!d) return;
  const b = d.beer && beerById(d.beer);
  openModal({
    label: d.name,
    wide: true,
    html: `<img class="modal__img" src="${photo(d.img, 1000, 640)}" alt="${esc(d.name)}" width="1000" height="640">
<div class="modal__text"><div class="dish__tags dish__tags--static">${d.tags.map(badge).join('')}</div>
<h2>${esc(d.name)}</h2><p>${esc(d.desc)}</p>
<p class="dish__meta"><span class="muted">${esc(d.weight)}</span><span class="price">${money(d.price)} BYN</span></p>
<p class="dish__all">${allergenLine(d)}</p>
${b ? `<div class="pairing"><p class="eyebrow">Пиво к блюду</p><p><strong>${esc(b.name)}</strong>, ${esc(b.style)}, ${b.abv}%</p><p class="muted">${esc(b.note)}. 0,5 л: ${money(b.p05)} BYN</p></div>` : ''}
<a class="btn btn--sm" href="booking.html">Забронировать столик</a></div>`,
  });
}

function beerCard(b) {
  return `<article class="beer"><div class="beer__top"><h3>${esc(b.name)}</h3><span class="beer__abv">${b.abv}%</span></div>
<p class="muted">${esc(b.style)} · ${esc(b.brewery)} · IBU ${b.ibu}</p><p>${esc(b.note)}</p>
<p class="beer__price"><span>0,3 л <b>${money(b.p03)}</b></span><span>0,5 л <b>${money(b.p05)}</b></span></p></article>`;
}

function initMenu() {
  mountLayout();
  const st = stateFromUrl(location.search);
  const list = $('#menu-list'), catnav = $('#catnav'), count = $('#count'), q = $('#q');
  q.value = st.q;

  $('#tag-chips').innerHTML = FILTER_TAGS.map((t) => `<button type="button" class="chip" data-tag="${t}" aria-pressed="false">${TAGS[t]}</button>`).join('');
  $('#allergen-chips').innerHTML = Object.entries(ALLERGENS).map(([k, v]) => `<button type="button" class="chip" data-al="${k}" aria-pressed="false" aria-label="Исключить: ${v}">${v}</button>`).join('');
  $('#beer-list').innerHTML = BEERS.map(beerCard).join('');

  function render() {
    $$('[data-tag]').forEach((b) => b.setAttribute('aria-pressed', st.tags.has(b.dataset.tag)));
    $$('[data-al]').forEach((b) => b.setAttribute('aria-pressed', st.exclude.has(b.dataset.al)));
    const found = filterDishes(DISHES, st);
    const active = st.tags.size || st.exclude.size || st.q.trim();
    count.textContent = `Найдено блюд: ${found.length} из ${DISHES.length}`;
    $('#reset').hidden = !active;
    const cats = CATEGORIES.filter((c) => found.some((d) => d.cat === c.id));
    list.innerHTML = cats.length
      ? cats.map((c) => `<section class="menu-cat" id="cat-${c.id}" aria-labelledby="h-${c.id}"><h2 id="h-${c.id}">${c.name}</h2><div class="grid">${found.filter((d) => d.cat === c.id).map(dishCard).join('')}</div></section>`).join('')
      : '<p class="empty">Ничего не нашлось. Попробуйте убрать часть фильтров.</p>';
    catnav.innerHTML = cats.map((c) => `<a href="#cat-${c.id}" data-cat="cat-${c.id}">${c.name}</a>`).join('') + '<a href="#beer" data-cat="beer">Пиво на кране</a>';
    history.replaceState(null, '', location.pathname + urlFromState(st) + location.hash);
    markActive();
  }

  function markActive() {
    const ids = $$('#catnav a').map((a) => a.dataset.cat);
    let cur = ids[0];
    ids.forEach((id) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= 150) cur = id; });
    $$('#catnav a').forEach((a) => {
      const on = a.dataset.cat === cur;
      if (on) { a.setAttribute('aria-current', 'true'); catnav.scrollTo({ left: a.offsetLeft - 16, behavior: 'auto' }); } else a.removeAttribute('aria-current');
    });
  }

  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { markActive(); ticking = false; }); } }, { passive: true });

  $('#tag-chips').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tag]')?.dataset.tag;
    if (!t) return;
    st.tags.has(t) ? st.tags.delete(t) : st.tags.add(t);
    render();
  });
  $('#allergen-chips').addEventListener('click', (e) => {
    const a = e.target.closest('[data-al]')?.dataset.al;
    if (!a) return;
    st.exclude.has(a) ? st.exclude.delete(a) : st.exclude.add(a);
    render();
  });
  q.addEventListener('input', debounce(() => { st.q = q.value; render(); }, 250));
  $('#reset').addEventListener('click', () => { st.tags.clear(); st.exclude.clear(); st.q = ''; q.value = ''; render(); });
  list.addEventListener('click', (e) => { const b = e.target.closest('.dish__open'); if (b) openDish(b.dataset.id); });
  list.addEventListener('error', (e) => { if (e.target.tagName === 'IMG') e.target.classList.add('img-fail'); }, true);

  render();
  reveal();
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

if (document.body.dataset.page === 'menu') initMenu();
