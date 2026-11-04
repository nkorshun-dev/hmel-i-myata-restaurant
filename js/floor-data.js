// Данные схемы зала. Чтобы добавить или сдвинуть столик, правьте массив TABLES:
// координаты (x, y) — центр столика в единицах viewBox зала.
export const HALLS = {
  main: { id: 'main', name: 'Основной зал', w: 800, h: 560 },
  veranda: { id: 'veranda', name: 'Веранда', w: 800, h: 420 },
};

export const ZONES = {
  window: 'у окна',
  sofa: 'диван',
  bar: 'у бара',
  quiet: 'тихая зона',
  fire: 'рядом с камином',
};

// shape: round | rect. Размеры задаются вместимостью (см. SIZES).
const T = (num, hall, seats, shape, zone, x, y) => ({ id: `t${num}`, num, hall, seats, shape, zone, x, y });

export const TABLES = [
  T(1, 'main', 2, 'round', 'window', 100, 90),
  T(2, 'main', 2, 'round', 'window', 230, 90),
  T(3, 'main', 4, 'rect', 'window', 380, 90),
  T(4, 'main', 4, 'rect', 'window', 540, 90),
  T(5, 'main', 2, 'round', 'window', 690, 90),
  T(6, 'main', 4, 'round', 'fire', 110, 215),
  T(7, 'main', 4, 'rect', 'sofa', 330, 220),
  T(8, 'main', 4, 'rect', 'sofa', 490, 220),
  T(9, 'main', 2, 'round', 'quiet', 690, 215),
  T(10, 'main', 4, 'round', 'fire', 110, 345),
  T(11, 'main', 2, 'round', 'fire', 235, 300),
  T(12, 'main', 8, 'rect', 'sofa', 410, 330),
  T(13, 'main', 6, 'rect', 'quiet', 690, 330),
  T(14, 'main', 6, 'round', 'sofa', 200, 456),
  T(15, 'main', 2, 'round', 'bar', 330, 425),
  T(16, 'main', 2, 'round', 'bar', 450, 425),
  T(17, 'main', 4, 'rect', 'bar', 570, 425),
  T(18, 'main', 2, 'round', 'bar', 690, 425),
  T(19, 'veranda', 2, 'round', 'window', 110, 90),
  T(20, 'veranda', 2, 'round', 'window', 250, 90),
  T(21, 'veranda', 4, 'rect', 'window', 400, 90),
  T(22, 'veranda', 4, 'rect', 'window', 560, 90),
  T(23, 'veranda', 2, 'round', 'window', 700, 90),
  T(24, 'veranda', 4, 'round', 'sofa', 160, 250),
  T(25, 'veranda', 6, 'rect', 'sofa', 370, 260),
  T(26, 'veranda', 8, 'rect', 'quiet', 610, 275),
];

// Размеры по вместимости: round -> радиус, rect -> ширина и высота.
export const SIZES = {
  round: { 2: { r: 22 }, 4: { r: 30 }, 6: { r: 42 }, 8: { r: 52 } },
  rect: { 2: { w: 50, h: 40 }, 4: { w: 80, h: 46 }, 6: { w: 120, h: 50 }, 8: { w: 160, h: 54 } },
};

// Декор: рисуется тонкими линиями под столиками.
export const DECOR = {
  main: {
    windows: [[40, 0, 120], [180, 0, 120], [320, 0, 120], [480, 0, 120], [630, 0, 120]],
    fireplace: { x: 0, y: 235, w: 34, h: 100 },
    bar: { x: 290, y: 480, w: 460, h: 46 },
    stools: 10,
    door: { x: 40, y: 560, w: 70 },
    plants: [[770, 40], [770, 520], [60, 520], [260, 150], [610, 150]],
    rugs: [{ x: 250, y: 160, w: 300, h: 240 }],
  },
  veranda: {
    windows: [[40, 0, 120], [180, 0, 120], [340, 0, 120], [500, 0, 120], [640, 0, 120]],
    fireplace: null,
    bar: null,
    stools: 0,
    door: { x: 360, y: 420, w: 80 },
    plants: [[30, 380], [770, 380], [770, 200], [260, 190], [500, 170]],
    rugs: [],
  },
};

export const tableById = (id) => TABLES.find((t) => t.id === id);
