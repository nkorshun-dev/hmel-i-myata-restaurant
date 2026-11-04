// Главная страница: хиты, бизнес-ланч, превью схемы, банкеты, отзывы, FAQ.
import { DISHES } from './menu-data.js';
import { dishCard, openDish } from './menu.js';
import { LUNCH, BANQUET, REVIEWS, FAQ } from './content-data.js';
import { workingHours, fromMin, isTableBusy } from './availability.js';
import { mountFloor } from './floor.js';
import { $, $$, esc, money, todayStr, minskNow, MONTHS_GEN, reveal } from './ui.js';
import { mountLayout } from './layout.js';
import { maskPhone } from './phone-mask.js';
import { validatePhone } from './validation.js';

mountLayout();

// Сегодняшние часы работы.
const today = todayStr();
$('#today').textContent = `Сегодня до ${fromMin(workingHours(today).close)}`;

// Хиты меню.
const hits = $('#hits-grid');
hits.innerHTML = DISHES.filter((d) => d.tags.includes('hit')).slice(0, 6).map(dishCard).join('');
hits.addEventListener('click', (e) => { const b = e.target.closest('.dish__open'); if (b) openDish(b.dataset.id); });
hits.addEventListener('error', (e) => { if (e.target.tagName === 'IMG') e.target.classList.add('img-fail'); }, true);

// Бизнес-ланч: вкладки Пн–Пт.
(function lunch() {
  const tabs = $('#lunch-tabs'), panel = $('#lunch-panel');
  const dow = minskNow().getDay();
  let cur = dow >= 1 && dow <= 5 ? dow - 1 : 0;
  tabs.innerHTML = LUNCH.days.map((d, i) => `<button type="button" role="tab" id="lt-${i}" aria-controls="lunch-panel" data-i="${i}">${d.day}</button>`).join('');
  const show = (i, focus) => {
    cur = i;
    $$('[role=tab]', tabs).forEach((b, k) => { b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; });
    const d = LUNCH.days[i];
    panel.setAttribute('aria-labelledby', `lt-${i}`);
    panel.innerHTML = `<ul class="lunch__list"><li><span class="eyebrow">Суп</span>${esc(d.soup)}</li><li><span class="eyebrow">Горячее</span>${esc(d.main)}</li><li><span class="eyebrow">Напиток</span>${esc(d.drink)}</li></ul>`;
    if (focus) $(`#lt-${i}`).focus();
  };
  tabs.addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b) show(+b.dataset.i); });
  tabs.addEventListener('keydown', (e) => {
    const n = LUNCH.days.length;
    if (e.key === 'ArrowRight') show((cur + 1) % n, true);
    else if (e.key === 'ArrowLeft') show((cur + n - 1) % n, true);
  });
  $('#lunch-price').textContent = `${money(LUNCH.price)} BYN`;
  $('#lunch-note').textContent = LUNCH.note;
  show(cur);
})();

// Превью схемы: занятость на сегодня, 19:00.
mountFloor($('#floor-preview'), { interactive: false }).render({
  hallId: 'main',
  statusOf: (t) => (isTableBusy(t.id, today, '19:00') ? 'busy' : 'free'),
});

// Банкеты.
$('#banquet-halls').innerHTML = BANQUET.halls.map((h) => `<article class="card"><h3>${esc(h.name)}</h3><p class="eyebrow">${esc(h.cap)}</p><p>${esc(h.text)}</p></article>`).join('');
$('#banquet-from').textContent = `от ${BANQUET.from} BYN на человека`;
$('#b-format').innerHTML = BANQUET.formats.map((f) => `<option>${f}</option>`).join('');
$('#b-date').min = today;
maskPhone($('#b-phone'));
$('#banquet-form').addEventListener('submit', (e) => {
  e.preventDefault();
  $('#banquet-ok').hidden = true;
  const date = $('#b-date'), guests = $('#b-guests'), phone = $('#b-phone');
  const g = Number(guests.value);
  const errs = [
    [date, !date.value || date.value < today ? 'Выберите дату не раньше сегодняшней' : ''],
    [guests, !Number.isInteger(g) || g < 9 || g > 60 ? 'Для банкета от 9 до 60 гостей' : ''],
    [phone, validatePhone(phone.value)],
  ];
  errs.forEach(([el, msg]) => { $(`#${el.id}-err`).textContent = msg; el.setAttribute('aria-invalid', msg ? 'true' : 'false'); });
  const bad = errs.find(([, m]) => m);
  if (bad) { bad[0].focus(); return; }
  $('#banquet-ok').hidden = false;
  $('#banquet-ok').textContent = 'Заявка принята. Менеджер перезвонит в течение дня. Демо-режим: заявка никуда не отправляется.';
  e.target.reset();
});

// Отзывы.
const stars = (n) => `<span class="stars" role="img" aria-label="Оценка ${n} из 5">${'★'.repeat(n)}<span class="stars__off">${'★'.repeat(5 - n)}</span></span>`;
const longDate = (s) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${MONTHS_GEN[m - 1]} ${y}`; };
const rv = $('#reviews');
rv.innerHTML = REVIEWS.map((r) => `<article class="review">${stars(r.rating)}<p class="review__text">${esc(r.text)}</p><p class="review__who"><strong>${esc(r.name)}</strong><span class="muted">${esc(r.occasion)} · ${longDate(r.date)}</span></p>${r.reply ? `<div class="review__reply"><strong>Ответ ресторана</strong><p>${esc(r.reply)}</p></div>` : ''}</article>`).join('');
const syncRv = () => $$('[data-rv]').forEach((b) => b.setAttribute('aria-disabled', String(Number(b.dataset.rv) < 0 ? rv.scrollLeft <= 1 : rv.scrollLeft >= rv.scrollWidth - rv.clientWidth - 1)));
rv.addEventListener('scroll', syncRv, { passive: true });
addEventListener('resize', syncRv);
syncRv();
$$('[data-rv]').forEach((b) => b.addEventListener('click', () => {
  rv.scrollBy({ left: Number(b.dataset.rv) * Math.min(rv.clientWidth * 0.9, 420), behavior: 'smooth' });
}));

// FAQ: открыт только один пункт.
const faq = $('#faq');
faq.innerHTML = FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
faq.addEventListener('toggle', (e) => {
  if (e.target.open) $$('details', faq).forEach((d) => { if (d !== e.target) d.open = false; });
}, true);

reveal();
