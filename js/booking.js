// Бронирование: 3 шага, выбор столика на схеме, сводка, экран успеха, .ics, отмена.
import { HALLS, ZONES, TABLES, tableById } from './floor-data.js';
import { mountFloor, seatsText, STATUS_LABEL } from './floor.js';
import { timeSlots, tableStatus, autoPick, isHallOpen, toMin, workingHours, fromMin, BOOKING_MIN } from './availability.js';
import { $, $$, esc, store, save, todayStr, minskNow, fmtDate, plural } from './ui.js';
import { mountLayout } from './layout.js';
import { maskPhone } from './phone-mask.js';
import { validateName, validatePhone, validateWish, validateConsent, WISH_MAX } from './validation.js';

const KEY = 'hm_bookings';
const DEPOSIT = 30; // BYN с человека для компании от 6 гостей
const OCCASIONS = ['Без повода', 'День рождения', 'Годовщина', 'Деловая встреча', 'Свидание', 'Другое'];
const MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

// Мусор в localStorage (не массив, битые записи) отбрасываем.
const getBookings = () => {
  const v = store(KEY, []);
  return Array.isArray(v) ? v.filter((b) => b && typeof b.id === 'string' && /^\d{4}-\d\d-\d\d$/.test(b.date) && /^\d\d:\d\d$/.test(b.time) && Number.isInteger(b.guests) && tableById(b.tableId)) : [];
};
const state = { step: 1, date: '', time: '', guests: 2, occasion: OCCASIONS[0], hall: 'main', tableId: null };
let floor;

const nowMinFor = (date) => {
  if (date !== todayStr()) return null;
  const n = minskNow();
  return n.getHours() * 60 + n.getMinutes();
};
const slotsFor = (date) => timeSlots(date, nowMinFor(date));
const ctx = () => ({ date: state.date, time: state.time, guests: state.guests, bookings: getBookings() });
const say = (msg) => { $('#live').textContent = ''; setTimeout(() => { $('#live').textContent = msg; }, 30); };
const depositOf = (guests) => (guests >= 6 ? DEPOSIT * guests : 0);

// ---------- Шаг 1 ----------
function renderCal() {
  const today = minskNow(); today.setHours(0, 0, 0, 0);
  const lead = (today.getDay() + 6) % 7;
  let html = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((d) => `<span class="cal__h" aria-hidden="true">${d}</span>`).join('');
  for (let i = -lead; i < 30; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const s = todayStr(d);
    const label = i === 0 || d.getDate() === 1 ? `<small>${MONTH_SHORT[d.getMonth()]}</small>` : '';
    html += `<button type="button" class="cal__day" data-date="${s}" aria-label="${fmtDate(s)}" aria-pressed="${s === state.date}"${i < 0 ? ' disabled' : ''}><span>${d.getDate()}</span>${label}</button>`;
  }
  $('#cal').innerHTML = html;
}

function renderSlots() {
  const slots = slotsFor(state.date);
  const { close } = workingHours(state.date);
  $('#slots').innerHTML = slots.length
    ? slots.map((t) => `<button type="button" class="slot" data-time="${t}" aria-pressed="${t === state.time}">${t}</button>`).join('')
    : '<p class="muted">На этот день свободных слотов нет, выберите другую дату.</p>';
  $('#slots-note').textContent = `Бронь держит столик ${BOOKING_MIN / 60} часа. Последняя посадка в этот день: ${slots.length ? slots[slots.length - 1] : 'нет'}, ресторан закрывается в ${fromMin(close)}.`;
}

function renderGuests() {
  $('#g-val').textContent = state.guests;
  $('#g-minus').disabled = state.guests <= 1;
  $('#g-plus').disabled = state.guests >= 12;
  $('#g-hint').innerHTML = state.guests >= 9
    ? 'Для компании от 9 человек удобнее банкетный зал: <a href="index.html#banquets">оставить заявку на банкет</a>.'
    : state.guests >= 6 ? `От 6 гостей нужен депозит ${DEPOSIT} BYN с человека, он засчитывается в счёт.` : '';
}

// Смена параметров: подбираем время и сбрасываем столик, если он перестал подходить.
function onParamsChange(reason) {
  const slots = slotsFor(state.date);
  if (!slots.includes(state.time)) state.time = slots.includes('19:00') ? '19:00' : slots[0] || '';
  if (state.hall === 'veranda' && !isHallOpen('veranda', state.date)) state.hall = 'main';
  if (state.tableId && (!state.time || tableStatus(tableById(state.tableId), ctx()) !== 'free')) {
    state.tableId = null;
    say(`Выбор столика сброшен: ${reason}. Выберите столик заново.`);
  }
  renderSlots(); renderGuests(); renderSummary();
  $$('#cal .cal__day').forEach((b) => b.setAttribute('aria-pressed', b.dataset.date === state.date));
  $('#next1').disabled = !state.time;
}

// ---------- Шаг 2 ----------
function renderStep2() {
  const c = ctx();
  const veranda = isHallOpen('veranda', state.date);
  $('#halls').innerHTML = Object.values(HALLS).map((h) => {
    const closed = h.id === 'veranda' && !veranda;
    return `<button type="button" class="seg" data-hall="${h.id}" aria-pressed="${h.id === state.hall}"${closed ? ' aria-disabled="true"' : ''}>${h.name}${closed ? ' (закрыта)' : ''}</button>`;
  }).join('');
  $('#hall-note').textContent = veranda ? '' : 'Веранда работает с мая по сентябрь, на выбранную дату она закрыта.';
  $('#banq-note').hidden = state.guests < 9;
  floor.render({ hallId: state.hall, selectedId: state.tableId, statusOf: (t) => tableStatus(t, c) });

  const fits = TABLES.filter((t) => tableStatus(t, c) === 'free');
  $('#tlist').innerHTML = fits.length
    ? fits.map((t) => `<li><button type="button" class="tbtn" data-id="${t.id}" aria-pressed="${t.id === state.tableId}">Столик ${t.num}: ${seatsText(t.seats)}, ${ZONES[t.zone]}, ${HALLS[t.hall].name.toLowerCase()}</button></li>`).join('')
    : '<li class="muted">На это время подходящих столиков нет. Попробуйте другое время или дату.</li>';
  $('#next2').disabled = !state.tableId;
}

function selectTable(t, status) {
  if (status !== 'free') {
    if (t.id !== state.tableId) say(`Столик ${t.num} недоступен: ${STATUS_LABEL[status]}.`);
    return;
  }
  state.tableId = t.id;
  state.hall = t.hall;
  renderStep2(); renderSummary();
  floor.focusSelected();
  say(`Выбран столик ${t.num}, ${seatsText(t.seats)}, ${ZONES[t.zone]}.`);
}

// ---------- Сводка ----------
function summaryRows(b) {
  const t = tableById(b.tableId);
  return [
    ['Дата', b.date ? fmtDate(b.date) : '—'],
    ['Время', b.time || '—'],
    ['Гости', `${b.guests} ${plural(b.guests, 'гость', 'гостя', 'гостей')}`],
    ['Зал', t ? HALLS[t.hall].name : '—'],
    ['Столик', t ? `№${t.num}, ${seatsText(t.seats)}` : 'не выбран'],
    ['Зона', t ? ZONES[t.zone] : '—'],
  ];
}
const dl = (rows) => `<dl class="sum">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;

function renderSummary() {
  const dep = depositOf(state.guests);
  $('#summary-body').innerHTML = dl(summaryRows(state)) +
    (dep ? `<p class="deposit">Депозит ${DEPOSIT} BYN с человека: ${dep} BYN. Засчитывается в счёт.</p>` : '');
}

// ---------- Навигация по шагам ----------
function go(n, focus = true) {
  state.step = n;
  $$('.step').forEach((p) => { p.hidden = Number(p.dataset.step) !== n; });
  $$('.steps li').forEach((li) => {
    const i = Number(li.dataset.i);
    li.classList.toggle('on', i === n); li.classList.toggle('done', i < n);
    if (i === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  if (n === 2) renderStep2();
  if (!focus) return;
  const h = $(`.step[data-step="${n}"] h2`);
  h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true });
  h.scrollIntoView({ behavior: 'auto', block: 'start' });
}

// ---------- Мои брони, успех, отмена, .ics ----------
function renderMine() {
  const mine = getBookings().filter((b) => b.date >= todayStr());
  $('#mine').hidden = !mine.length;
  $('#mine-list').innerHTML = mine.map((b) => `<li><span>${fmtDate(b.date)}, ${b.time}, столик ${tableById(b.tableId)?.num ?? '?'}, ${b.guests} ${plural(b.guests, 'гость', 'гостя', 'гостей')}</span><button type="button" class="link-btn" data-cancel="${b.id}">Отменить</button></li>`).join('');
}

function cancelBooking(id) {
  save(KEY, getBookings().filter((b) => b.id !== id));
  renderMine();
  if (state.step === 2) renderStep2();
}

function icsFor(b) {
  // Минск = UTC+3 круглый год, поэтому переводим в UTC и календарь покажет верное время в любом поясе.
  const [y, mo, d] = b.date.split('-').map(Number);
  const s = new Date(Date.UTC(y, mo - 1, d, 0, toMin(b.time) - 180));
  const e = new Date(s.getTime() + BOOKING_MIN * 60000);
  const f = (x) => x.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const t = tableById(b.tableId);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hmel i Myata//Booking demo//RU', 'BEGIN:VEVENT',
    `UID:${b.id}@hmel-i-myata.example`, `DTSTAMP:${stamp}`, `DTSTART:${f(s)}`, `DTEND:${f(e)}`,
    'SUMMARY:Ужин в «Хмель и Мята»', 'LOCATION:Минск\\, ул. Октябрьская\\, 16',
    `DESCRIPTION:Бронь ${b.id}\\, столик ${t.num}\\, гостей ${b.guests}. Столик держим 15 минут.`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

function showDone(b) {
  $$('.step').forEach((p) => { p.hidden = true; });
  $('.steps').hidden = true;
  const done = $('#done');
  done.hidden = false;
  done.innerHTML = `<p class="eyebrow">Бронь принята</p><h2 tabindex="-1">Номер брони ${b.id}</h2>
${dl(summaryRows(b))}
<p class="lead">Ждём вас! Столик держим 15 минут.</p>
<div class="btn-row"><button type="button" class="btn" id="ics">Добавить в календарь</button><button type="button" class="btn btn--ghost" id="cancel-b">Отменить бронь</button><a class="btn btn--ghost" href="booking.html">Забронировать ещё</a></div>
<p class="demo">Демо-режим: бронь никуда не отправляется</p>`;
  $('h2', done).focus();
  $('#ics').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([icsFor(b)], { type: 'text/calendar;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${b.id}.ics` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('#cancel-b').addEventListener('click', () => {
    cancelBooking(b.id);
    done.innerHTML = '<h2 tabindex="-1">Бронь отменена</h2><p>Столик снова свободен. Можно выбрать другое время.</p><a class="btn" href="booking.html">Забронировать снова</a>';
    $('h2', done).focus();
  });
}

// ---------- Форма ----------
function fieldError(input, msg) {
  const err = $(`#${input.id}-err`);
  err.textContent = msg;
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  return !msg;
}

function initForm() {
  const form = $('#form'), name = $('#f-name'), phone = $('#f-phone'), wish = $('#f-wish'), consent = $('#f-consent');
  maskPhone(phone);
  const updateCount = () => { $('#wish-count').textContent = `${wish.value.length} / ${WISH_MAX}`; };
  wish.addEventListener('input', updateCount);
  $('#chips').addEventListener('click', (e) => {
    const c = e.target.closest('[data-chip]');
    if (!c) return;
    const add = c.dataset.chip;
    if (wish.value.toLowerCase().includes(add)) return;
    const next = wish.value ? `${wish.value.replace(/[.,\s]+$/, '')}, ${add}` : add;
    wish.value = next.slice(0, WISH_MAX);
    updateCount();
  });
  name.addEventListener('blur', () => fieldError(name, validateName(name.value)));
  phone.addEventListener('blur', () => { if (phone.value) fieldError(phone, validatePhone(phone.value)); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if ($('#submit').disabled) return;
    const ok = [
      fieldError(name, validateName(name.value)),
      fieldError(phone, validatePhone(phone.value)),
      fieldError(wish, validateWish(wish.value)),
      (() => { const m = validateConsent(consent.checked); $('#f-consent-err').textContent = m; consent.setAttribute('aria-invalid', m ? 'true' : 'false'); return !m; })(),
    ];
    if (!ok.every(Boolean)) { form.querySelector('[aria-invalid="true"]').focus(); return; }
    const btn = $('#submit');
    btn.disabled = true; btn.textContent = 'Отправляем…';
    setTimeout(() => {
      const t = tableById(state.tableId);
      if (!t || tableStatus(t, ctx()) !== 'free') {
        btn.disabled = false; btn.textContent = 'Забронировать';
        state.tableId = null; go(2); say('Этот столик уже занят. Выберите другой.');
        return;
      }
      const b = {
        id: `HM-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        date: state.date, time: state.time, guests: state.guests, tableId: t.id, hall: t.hall,
        occasion: state.occasion, name: name.value.trim(), phone: phone.value, wish: wish.value.trim(),
      };
      save(KEY, [...getBookings(), b]);
      btn.disabled = false; btn.textContent = 'Забронировать';
      showDone(b);
    }, 1000);
  });
}

// ---------- Старт ----------
function init() {
  mountLayout();
  const first = slotsFor(todayStr()).length ? todayStr() : (() => { const d = minskNow(); d.setDate(d.getDate() + 1); return todayStr(d); })();
  state.date = first;
  floor = mountFloor($('#floor'), { onSelect: selectTable });

  $('#occasion').innerHTML = OCCASIONS.map((o) => `<option>${o}</option>`).join('');
  $('#occasion').addEventListener('change', (e) => { state.occasion = e.target.value; });
  renderCal();
  $('#cal').addEventListener('click', (e) => {
    const b = e.target.closest('.cal__day');
    if (!b || b.disabled) return;
    state.date = b.dataset.date;
    onParamsChange('изменилась дата');
  });
  $('#slots').addEventListener('click', (e) => {
    const b = e.target.closest('.slot');
    if (!b) return;
    state.time = b.dataset.time;
    $$('#slots .slot').forEach((s) => s.setAttribute('aria-pressed', s === b));
    onParamsChange('изменилось время');
  });
  $('#g-minus').addEventListener('click', () => { state.guests = Math.max(1, state.guests - 1); onParamsChange('изменилось число гостей'); });
  $('#g-plus').addEventListener('click', () => { state.guests = Math.min(12, state.guests + 1); onParamsChange('изменилось число гостей'); });
  $('#next1').addEventListener('click', () => go(2));

  $('#halls').addEventListener('click', (e) => {
    const b = e.target.closest('[data-hall]');
    if (!b) return;
    if (b.getAttribute('aria-disabled') === 'true') { say('Веранда работает с мая по сентябрь и сейчас закрыта.'); return; }
    state.hall = b.dataset.hall;
    renderStep2();
    $(`[data-hall="${state.hall}"]`).focus();
  });
  $('#auto').addEventListener('click', () => {
    const c = ctx();
    const order = [...TABLES.filter((t) => t.hall === state.hall), ...TABLES.filter((t) => t.hall !== state.hall)];
    const pick = autoPick(order, c);
    if (!pick) { say('Подходящих столиков на это время нет. Попробуйте другое время.'); return; }
    selectTable(pick, 'free');
  });
  $('#tlist').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (b) selectTable(tableById(b.dataset.id), 'free');
  });
  $('#back2').addEventListener('click', () => go(1));
  $('#next2').addEventListener('click', () => go(3));
  $('#back3').addEventListener('click', () => go(2));
  $('#mine-list').addEventListener('click', (e) => { const id = e.target.closest('[data-cancel]')?.dataset.cancel; if (id) cancelBooking(id); });

  initForm();
  onParamsChange('');
  renderMine();
  go(1, false);
}

init();
