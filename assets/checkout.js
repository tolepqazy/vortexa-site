/*
 * Vortexa v7 — оформление заказа (checkout.html, kk/checkout.html).
 * Без регистрации. Состав — из VX.cart. Если покупатель вошёл — подставляем его данные и адреса.
 * После оформления: VX.orders.create (он сам шлёт событие order:created), корзина очищается,
 * переход на order.html?no=VX-…
 * Здесь же — маска телефона +7, её использует и track.html: window.VXForm.
 */
(() => {
  'use strict';
  const VX = window.VX;
  if (!VX) return;
  const kk = VX.lang === 'kk';
  const t = (ru, kz) => (kk ? kz : ru);

  /* ---------- Маска телефона: +7 700 000 00 00 ---------- */
  // Сколько ведущих цифр — не номер, а код страны или «8» в начале
  function leadDrop(raw) {
    const d = raw.replace(/\D/g, '');
    let n = 0;
    if (/^\s*\+/.test(raw)) n = d.length ? 1 : 0;           // «+7 …»
    else if (d.length === 11 && /^[78]/.test(d)) n = 1;     // 8 701 … или 7 701 …
    const rest = d.slice(n);
    // Номера Казахстана после +7 начинаются с 7: «8» в начале или лишняя «7» — это код, а не номер
    if (/^8/.test(rest) || (rest.length > 10 && /^7/.test(rest))) n++;
    return n;
  }
  function phoneDigits(value) {
    const raw = String(value || '');
    return raw.replace(/\D/g, '').slice(leadDrop(raw)).slice(0, 10);
  }
  function phoneFormat(d) {
    let s = '+7 ' + d.slice(0, 3);
    if (d.length > 3) s += ' ' + d.slice(3, 6);
    if (d.length > 6) s += ' ' + d.slice(6, 8);
    if (d.length > 8) s += ' ' + d.slice(8, 10);
    return s;
  }
  function maskPhone(input) {
    if (!input || input.dataset.masked) return;
    input.dataset.masked = '1';
    input.addEventListener('focus', () => { if (!input.value) input.value = '+7 '; });
    input.addEventListener('blur', () => { if (!phoneDigits(input.value)) input.value = ''; });
    input.addEventListener('input', event => {
      const raw = input.value;
      const pos = input.selectionStart == null ? raw.length : input.selectionStart;
      let d = phoneDigits(raw);
      // Сколько цифр номера стоит до курсора
      let left = Math.min(d.length, Math.max(0, raw.slice(0, pos).replace(/\D/g, '').length - leadDrop(raw)));
      // Стёрли пробел — стираем и цифру перед ним
      if (event.inputType === 'deleteContentBackward' && input.dataset.prev && phoneDigits(input.dataset.prev) === d && left > 0) {
        d = d.slice(0, left - 1) + d.slice(left);
        left -= 1;
      }
      const out = d.length ? phoneFormat(d) : '+7 ';
      input.value = out;
      let caret = out.length;
      if (left < d.length) {
        caret = 3;
        for (let i = 3, seen = 0; i < out.length && seen < left; i++) {
          if (/\d/.test(out[i])) { seen++; caret = i + 1; }
        }
      }
      try { input.setSelectionRange(caret, caret); } catch (e) { /* поле без выделения */ }
      input.dataset.prev = out;
    });
    input.addEventListener('keydown', () => { input.dataset.prev = input.value; });
    if (input.value) input.value = phoneFormat(phoneDigits(input.value));
  }
  function phoneError(value) {
    const d = phoneDigits(value);
    if (!d.length) return t('Укажите телефон.', 'Телефонды жазыңыз.');
    if (d.length < 10) return t('Номер неполный: нужно 10 цифр после +7.', 'Нөмір толық емес: +7-ден кейін 10 цифр керек.');
    if (d[0] !== '7') return t('Номер в Казахстане начинается с +7 7…', 'Қазақстандағы нөмір +7 7… деп басталады.');
    return '';
  }
  // Поле с ошибкой: aria-invalid + текст под полем
  function setError(input, text) {
    if (!input) return;
    const box = document.getElementById(input.id + '-err');
    if (text) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    if (box) box.textContent = text || '';
  }
  window.VXForm = { maskPhone, phoneDigits, phoneFormat, phoneError, setError };

  /* ---------- Страница оформления ---------- */
  const page = document.querySelector('[data-checkout-page]');
  if (!page) return;
  const $ = s => page.querySelector(s);
  const form = $('#co-form');
  const f = {
    name: $('#co-name'), phone: $('#co-phone'), city: $('#co-city'), cityOther: $('#co-city-other'),
    address: $('#co-address'), comment: $('#co-comment'), agree: $('#co-agree')
  };
  const ALMATY = 'Алматы';
  const OTHER = '__other';
  // Города: значение — русское название (его видят сотрудники), подпись — на языке страницы
  const CITIES = [
    ['Алматы', 'Алматы'], ['Астана', 'Астана'], ['Шымкент', 'Шымкент'], ['Караганда', 'Қарағанды'], ['Актобе', 'Ақтөбе'],
    ['Тараз', 'Тараз'], ['Павлодар', 'Павлодар'], ['Усть-Каменогорск', 'Өскемен'], ['Семей', 'Семей'], ['Атырау', 'Атырау'],
    ['Костанай', 'Қостанай'], ['Кызылорда', 'Қызылорда'], ['Уральск', 'Орал'], ['Петропавловск', 'Петропавл'], ['Актау', 'Ақтау'],
    ['Туркестан', 'Түркістан'], ['Кокшетау', 'Көкшетау'], ['Талдыкорган', 'Талдықорған'], ['Темиртау', 'Теміртау'],
    ['Экибастуз', 'Екібастұз'], ['Жезказган', 'Жезқазған'], ['Конаев', 'Қонаев']
  ];
  let placing = false;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  function goods(n) {
    if (kk) return n + ' тауар';
    let w = 'товаров';
    if (n % 10 === 1 && n % 100 !== 11) w = 'товар';
    else if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) w = 'товара';
    return n + ' ' + w;
  }
  const clean = s => String(s || '').replace(/^\[|\]$/g, '').trim();

  /* Город */
  function fillCities() {
    const first = el('option', '', t('Выберите город', 'Қаланы таңдаңыз'));
    first.value = '';
    const opts = CITIES.map(([ru, kz]) => { const o = el('option', '', kk ? kz : ru); o.value = ru; return o; });
    const other = el('option', '', t('Другой населённый пункт', 'Басқа елді мекен'));
    other.value = OTHER;
    f.city.replaceChildren(first, ...opts, other);
  }
  function setCity(name) {
    name = clean(name);
    if (!name) return;
    const known = CITIES.find(([ru, kz]) => ru.toLowerCase() === name.toLowerCase() || kz.toLowerCase() === name.toLowerCase());
    if (known) f.city.value = known[0];
    else { f.city.value = OTHER; f.cityOther.value = name; }
    syncCity();
  }
  function cityValue() { return f.city.value === OTHER ? f.cityOther.value.trim() : f.city.value; }

  /* Получение: самовывоз только в Алматы */
  const pickupRadio = form.querySelector('input[name="delivery"][value="pickup"]');
  const courierRadio = form.querySelector('input[name="delivery"][value="courier"]');
  const pickupNote = $('[data-co-pickup-note]');
  const pickupDefault = pickupNote.textContent;
  function delivery() { return pickupRadio.checked ? 'pickup' : 'courier'; }
  function syncCity() {
    $('[data-co-other]').hidden = f.city.value !== OTHER;
    const city = f.city.value;
    const onlyAlmaty = city && city !== ALMATY;
    pickupRadio.disabled = !!onlyAlmaty;
    pickupNote.textContent = onlyAlmaty ? t('[Только в Алматы]', '[Тек Алматыда]') : pickupDefault;
    if (onlyAlmaty && pickupRadio.checked) { courierRadio.checked = true; }
    syncDelivery();
  }
  // Цена доставки и срок — из VX.terms (город + сумма + способ)
  function syncShipping() {
    const total = VX.cart.total();
    const city = cityValue();
    const pick = delivery() === 'pickup';
    const label = VX.terms.deliveryLabel(city, total, pick ? 'pickup' : 'courier');
    const cost = VX.terms.deliveryPrice(city, total, pick ? 'pickup' : 'courier');
    const days = $('[data-co-courier-days]');
    const known = !!VX.terms.zoneOf(city);
    days.textContent = known ? VX.terms.deliveryDays(city, 'courier') + t(' до двери', ' есікке дейін') : VX.terms.text('shortDays') + t(' по Казахстану', ' Қазақстан бойынша');
    $('[data-co-courier-price]').textContent = VX.terms.deliveryLabel(city, total, 'courier');
    $('[data-co-ship]').textContent = label;
    $('[data-co-total]').textContent = VX.fmt(total + cost);
  }
  function syncDelivery() {
    const pick = delivery() === 'pickup';
    $('[data-co-courier]').hidden = pick;
    $('[data-co-pickup]').hidden = !pick;
    if (pick) setError(f.address, '');
    syncShipping();
    syncSave();
    progress();
  }

  /* Покупатель вошёл: данные и адреса */
  const user = VX.user.get();
  function savedAddresses() { return (VX.user.get() || {}).addresses || []; }
  function syncSave() {
    const box = $('[data-co-save-address]');
    if (!user || delivery() !== 'courier') { box.hidden = true; return; }
    const a = f.address.value.trim().toLowerCase();
    const city = cityValue().toLowerCase();
    const known = savedAddresses().some(x => clean(x.address).toLowerCase() === a && clean(x.city).toLowerCase() === city);
    box.hidden = !a || known;
  }
  function renderSaved() {
    const list = savedAddresses();
    const wrap = $('[data-co-saved]');
    wrap.hidden = !list.length;
    if (!list.length) return;
    const rows = list.map((a, i) => {
      const lab = el('label', 'radio');
      const r = el('input');
      r.type = 'radio'; r.name = 'saved'; r.value = a.id;
      if (i === 0) r.checked = true;
      const span = el('span', '', [clean(a.city), clean(a.address)].filter(Boolean).join(', '));
      if (a.comment) span.append(el('small', '', clean(a.comment)));
      lab.append(r, span);
      return lab;
    });
    const lab = el('label', 'radio');
    const r = el('input'); r.type = 'radio'; r.name = 'saved'; r.value = '';
    lab.append(r, el('span', '', t('Другой адрес', 'Басқа мекенжай')));
    rows.push(lab);
    $('[data-co-saved-list]').replaceChildren(...rows);
  }
  function useSaved(id) {
    const a = savedAddresses().find(x => x.id === id);
    if (!a) { f.address.value = ''; f.address.focus(); syncSave(); return; }
    setCity(a.city);
    f.address.value = clean(a.address);
    if (a.comment && !f.comment.value) f.comment.value = clean(a.comment);
    setError(f.address, ''); setError(f.city, '');
    syncSave();
    progress();
  }
  function prefill() {
    if (!user) return;
    $('[data-co-guest]').hidden = true;
    const note = $('[data-co-user]');
    note.hidden = false;
    note.textContent = t('Вы вошли по номеру ', 'Сіз мына нөмірмен кірдіңіз: ') + VX.phone(user.phone) + t('. Заказ появится в кабинете.', '. Тапсырыс кабинетте көрінеді.');
    if (user.name) f.name.value = clean(user.name);
    f.phone.value = phoneFormat(phoneDigits(user.phone));
    if (user.city) setCity(user.city);
    renderSaved();
    const first = savedAddresses()[0];
    if (first) useSaved(first.id);
  }

  /* Состав заказа */
  function renderItems() {
    const lines = VX.cart.lines();
    const count = VX.cart.count();
    const total = VX.cart.total();
    const has = lines.length > 0;
    $('#co-empty').hidden = has;
    form.hidden = !has;
    $('#co-head-side').hidden = !has;
    if (!has) return;
    $('[data-co-lead]').textContent = goods(count) + t(' на сумму ', ', сомасы ') + VX.fmt(total);
    $('[data-co-items]').replaceChildren(...lines.map(line => {
      const p = line.product;
      const li = el('li', 'co-item');
      const ph = el('span', 'co-item-photo');
      const img = el('img'); img.src = VX.asset(p.img); img.alt = ''; img.width = 96; img.height = 64; img.loading = 'lazy';
      ph.append(img);
      const txt = el('span', 'co-item-text');
      txt.append(el('span', '', p.name[VX.lang]), el('small', '', p.model + ', ' + line.qty + t(' шт.', ' дана')));
      li.append(ph, txt, el('span', 'co-item-sum', VX.fmt(line.sum)));
      return li;
    }));
    $('[data-co-items-label]').textContent = t('Товары, ', 'Тауарлар, ') + count + t(' шт.', ' дана');
    $('[data-co-subtotal]').textContent = VX.fmt(total);
    syncShipping();
  }

  /* Проверка */
  const checks = {
    name: () => {
      const v = f.name.value.trim();
      if (!v) return t('Укажите имя: так менеджер обратится к вам.', 'Атыңызды жазыңыз: менеджер сізге осылай хабарласады.');
      if ((v.match(/\p{L}/gu) || []).length < 2) return t('Имя слишком короткое.', 'Аты тым қысқа.');
      return '';
    },
    phone: () => phoneError(f.phone.value),
    city: () => (f.city.value ? '' : t('Выберите город из списка.', 'Тізімнен қаланы таңдаңыз.')),
    cityOther: () => (f.city.value === OTHER && f.cityOther.value.trim().length < 2 ? t('Напишите название населённого пункта.', 'Елді мекеннің атауын жазыңыз.') : ''),
    address: () => {
      if (delivery() !== 'courier') return '';
      const v = f.address.value.trim();
      if (!v) return t('Укажите улицу, дом и квартиру, если она есть.', 'Көшені, үйді және пәтерді (болса) жазыңыз.');
      if (v.length < 5 || !/\d/.test(v)) return t('Добавьте номер дома.', 'Үй нөмірін қосыңыз.');
      return '';
    },
    agree: () => (f.agree.checked ? '' : t('Отметьте согласие с офертой, без него заказ не оформить.', 'Офертамен келісіміңізді белгілеңіз, онсыз тапсырыс рәсімделмейді.'))
  };
  const labels = {
    name: t('Имя', 'Аты'), phone: t('Телефон', 'Телефон'), city: t('Город', 'Қала'), cityOther: t('Населённый пункт', 'Елді мекен'),
    address: t('Адрес', 'Мекенжай'), agree: t('Согласие с офертой', 'Офертамен келісім')
  };
  const touched = new Set();
  function check(key) { const msg = checks[key](); setError(f[key], msg); return msg; }

  // Номер раздела заливается графитом, когда раздел заполнен без ошибок
  function progress() {
    const ok = keys => keys.every(k => !checks[k]());
    page.querySelector('[data-part="contacts"]').classList.toggle('is-filled', ok(['name', 'phone', 'city', 'cityOther']));
    page.querySelector('[data-part="delivery"]').classList.toggle('is-filled', ok(['address']) && !!f.city.value);
    page.querySelector('[data-part="payment"]').classList.toggle('is-filled', true);
  }

  function showSummary(bad) {
    const box = $('#co-errors');
    if (!bad.length) { box.hidden = true; box.replaceChildren(); return; }
    const p = el('p', '', t('Проверьте поля:', 'Өрістерді тексеріңіз:'));
    const ul = el('ul');
    bad.forEach(k => {
      const li = el('li');
      const a = el('a', '', labels[k]);
      a.href = '#' + f[k].id;
      a.addEventListener('click', e => { e.preventDefault(); f[k].focus(); });
      li.append(a);
      ul.append(li);
    });
    const wrap = el('div');
    wrap.append(p, ul);
    box.replaceChildren(wrap);
    box.hidden = false;
  }

  // Сводка у кнопки живёт, пока есть ошибки
  function refreshSummary() {
    if ($('#co-errors').hidden) return;
    showSummary(['name', 'phone', 'city', 'cityOther', 'address', 'agree'].filter(k => checks[k]()));
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (placing) return;
    const order = ['name', 'phone', 'city', 'cityOther', 'address', 'agree'];
    order.forEach(k => touched.add(k));
    const bad = order.filter(k => check(k));
    showSummary(bad);
    if (bad.length) {
      const first = f[bad[0]];
      first.focus({ preventScroll: true });
      first.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    placing = true;
    const btn = form.querySelector('.co-submit');
    btn.disabled = true;
    $('[data-co-submit-text]').textContent = t('Оформляем…', 'Рәсімделуде…');
    const pick = delivery() === 'pickup';
    const city = cityValue();
    const address = pick ? '' : f.address.value.trim();
    const comment = f.comment.value.trim();
    const created = VX.orders.create({
      items: VX.cart.get(),
      customer: { name: f.name.value.trim(), phone: phoneFormat(phoneDigits(f.phone.value)), city, address, comment },
      delivery: pick ? 'pickup' : 'courier',
      payment: (form.querySelector('input[name="payment"]:checked') || {}).value || 'manager'
    });
    if (!created) {
      placing = false; btn.disabled = false;
      $('[data-co-submit-text]').textContent = t('Оформить заказ', 'Тапсырысты рәсімдеу');
      renderItems();
      return;
    }
    // Вошедший покупатель: имя и новый адрес — в кабинет
    if (user) {
      if (!user.name) VX.user.update({ name: f.name.value.trim(), city });
      const save = form.querySelector('[data-co-save-address] input');
      if (!pick && save && save.checked && !$('[data-co-save-address]').hidden) VX.user.addresses.add({ city, address, comment });
    }
    // Эта вкладка видела заказ целиком: на странице заказа покажем адрес без маски
    try { const k = 'vx-seen-orders'; const s = JSON.parse(sessionStorage.getItem(k) || '[]'); s.push(created.no); sessionStorage.setItem(k, JSON.stringify(s)); } catch (e) { /* без хранилища — адрес будет скрыт */ }
    VX.cart.clear();
    location.href = 'order.html?no=' + encodeURIComponent(created.no);
  });

  ['name', 'phone', 'cityOther', 'address'].forEach(k => {
    f[k].addEventListener('blur', () => { if (f[k].value.trim() && f[k].value.trim() !== '+7') touched.add(k); if (touched.has(k)) check(k); progress(); });
    f[k].addEventListener('input', () => { if (touched.has(k) || f[k].getAttribute('aria-invalid')) check(k); progress(); if (k === 'address') syncSave(); refreshSummary(); });
  });
  f.city.addEventListener('change', () => { syncCity(); touched.add('city'); check('city'); refreshSummary(); if (f.city.value === OTHER) f.cityOther.focus(); });
  f.agree.addEventListener('change', () => { check('agree'); refreshSummary(); });
  form.addEventListener('change', e => {
    if (e.target.name === 'delivery') syncDelivery();
    if (e.target.name === 'saved') useSaved(e.target.value);
  });

  maskPhone(f.phone);
  fillCities();
  // Город по умолчанию — из профиля, а если его нет — Алматы: цена доставки сразу считается
  f.city.value = ALMATY;
  syncCity();
  prefill();
  renderItems();
  progress();
  VX.on('cart:changed', () => { if (!placing) renderItems(); });
  VX.on('product:changed', () => { if (!placing) renderItems(); });
  window.addEventListener('pageshow', e => { if (e.persisted && !placing) renderItems(); });
})();
