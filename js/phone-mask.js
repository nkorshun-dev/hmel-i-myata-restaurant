// Маска +375 (XX) XXX-XX-XX.
export function formatPhone(raw) {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('375')) d = d.slice(3);
  else if (d.startsWith('80')) d = d.slice(2);
  else if ('375'.startsWith(d)) d = ''; // стёрли префикс
  d = d.slice(0, 9);
  let out = '+375';
  if (d.length) out += ' (' + d.slice(0, 2);
  if (d.length >= 2) out += ') ' + d.slice(2, 5);
  if (d.length > 5) out += '-' + d.slice(5, 7);
  if (d.length > 7) out += '-' + d.slice(7, 9);
  return out;
}

export function maskPhone(input) {
  input.addEventListener('focus', () => { if (!input.value) input.value = '+375 ('; });
  input.addEventListener('blur', () => { if (input.value.replace(/\D/g, '').length <= 3) input.value = ''; });
  // Вставка целого номера (80… или +375…) заменяет поле, иначе префикс «+375 (» склеился бы с ним.
  input.addEventListener('paste', (e) => {
    const t = e.clipboardData?.getData('text') || '';
    if (!/^(375|80)/.test(t.replace(/\D/g, ''))) return;
    e.preventDefault();
    input.value = formatPhone(t);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  input.addEventListener('input', (e) => {
    const caret = input.selectionStart ?? input.value.length;
    const digitsBefore = input.value.slice(0, caret).replace(/\D/g, '').length;
    let v = formatPhone(input.value);
    // Backspace не должен упираться в разделители маски.
    if (e.inputType === 'deleteContentBackward') v = v.replace(/[^\d]+$/, '');
    const atEnd = caret >= input.value.length;
    input.value = v;
    if (atEnd) return;
    // Правка в середине: возвращаем курсор после того же числа цифр (префикс 375 считаем).
    let seen = 0, pos = 0;
    const want = Math.max(digitsBefore, 3);
    while (pos < v.length && seen < want) { if (/\d/.test(v[pos])) seen++; pos++; }
    input.setSelectionRange(pos, pos);
  });
}
