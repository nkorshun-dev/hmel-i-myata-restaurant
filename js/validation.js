// Валидаторы возвращают текст ошибки или '' если всё хорошо.
const OPERATORS = ['25', '29', '33', '44', '17'];

export function validateName(v) {
  const s = v.trim();
  if (s.length < 2) return 'Введите имя, не короче двух букв';
  if (s.length > 60) return 'Имя слишком длинное';
  if (!/^[\p{L}\s'.-]+$/u.test(s)) return 'Имя может содержать только буквы';
  return '';
}

export function validatePhone(v) {
  const d = v.replace(/\D/g, '');
  const local = d.startsWith('375') ? d.slice(3) : d;
  if (local.length !== 9 || !OPERATORS.includes(local.slice(0, 2))) return 'Введите номер в формате +375 (29) 123-45-67';
  return '';
}

export const WISH_MAX = 300;
export const validateWish = (v) => (v.length > WISH_MAX ? `Не больше ${WISH_MAX} символов` : '');
export const validateConsent = (ok) => (ok ? '' : 'Нужно согласие на обработку данных');
