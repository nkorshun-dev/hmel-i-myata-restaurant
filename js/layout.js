// Общие шапка и футер для всех страниц.
import { $, openModal } from './ui.js';
import { CONTACTS } from './content-data.js';

const NAV = [
  ['Меню', 'menu.html', 'menu'],
  ['Бронь', 'booking.html', 'booking'],
  ['Банкеты', 'index.html#banquets', ''],
  ['О нас', 'index.html#about', ''],
  ['Контакты', 'index.html#contacts', ''],
];

const LOGO = '<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="none" stroke="#7fc8a9" stroke-width="1.5"/><path d="M10 22c0-7 3-11 6-14 3 3 6 7 6 14-3-2-9-2-12 0z" fill="#d9a441"/><path d="M16 9v14" stroke="#141210" stroke-width="1.4"/></svg>';

const PRIVACY = `<h2>Политика конфиденциальности</h2>
<p>Это демонстрационный сайт вымышленного ресторана, созданный для портфолио. Данные из форм никуда не отправляются.</p>
<p>Бронь сохраняется только в локальном хранилище вашего браузера (localStorage), чтобы столик оставался занятым после перезагрузки страницы. Её можно отменить на странице брони или очистить данные сайта в настройках браузера.</p>
<p>Сайт не использует cookies для аналитики и рекламы, не собирает персональные данные и не передаёт их третьим лицам. Фото загружаются с Unsplash, шрифты с Google Fonts, карта с OpenStreetMap: эти сервисы видят ваш IP-адрес как при открытии любого сайта.</p>`;

export function mountLayout() {
  const page = document.body.dataset.page || '';
  const links = NAV.map(([t, h, id]) => `<a href="${h}"${id && id === page ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  $('#site-header').innerHTML = `<a class="skip" href="#main">К содержимому</a>
<div class="header__in">
<a class="logo" href="index.html" aria-label="Хмель и Мята, на главную">${LOGO}<span>Хмель и Мята</span></a>
<nav class="nav" id="nav" aria-label="Основная навигация">${links}</nav>
<span class="header__tel demo-link" aria-label="Телефон ${CONTACTS.phone} (в демо не активно)" title="Демо-проект: ссылка не активна">${CONTACTS.phone}</span>
<a class="btn btn--sm header__cta" href="booking.html">Забронировать</a>
<button class="burger" type="button" aria-expanded="false" aria-controls="nav" aria-label="Открыть меню"><span></span><span></span><span></span></button>
</div>`;

  $('#site-footer').innerHTML = `<div class="wrap footer__in">
<div><a class="logo" href="index.html">${LOGO}<span>Хмель и Мята</span></a><p class="muted">Современная белорусская кухня и крафтовое пиво. ${CONTACTS.address}</p></div>
<div><p class="footer__h">Разделы</p>${links}</div>
<div><p class="footer__h">Связь</p><span class="demo-link" aria-label="Телефон ${CONTACTS.phone} (в демо не активно)" title="Демо-проект: ссылка не активна">${CONTACTS.phone}</span><span class="demo-link" aria-label="Телефон ${CONTACTS.phone2} (в демо не активно)" title="Демо-проект: ссылка не активна">${CONTACTS.phone2}</span><span class="demo-link" aria-label="Instagram (в демо не активно)" title="Демо-проект: ссылка не активна">Instagram ${CONTACTS.instagram}</span></div>
</div>
<div class="wrap footer__bottom"><button class="link-btn" type="button" id="privacy-open">Политика конфиденциальности</button><span>Демо-проект для портфолио. Бизнес вымышленный</span></div>`;

  const burger = $('.burger'), nav = $('#nav');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !nav.classList.contains('open') || document.querySelector('.modal')) return;
    burger.click(); burger.focus();
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } });
  $('#privacy-open').addEventListener('click', () => openModal({ html: PRIVACY, label: 'Политика конфиденциальности' }));
}
