/*
 * Vortexa v7 — личный кабинет покупателя (account.html, kk/account.html).
 * Вкладки через #hash: #orders, #addresses, #devices, #profile. Без входа — форма входа,
 * после входа открывается вкладка из адреса.
 * Данные — VX.user / VX.orders (store.js): основной адрес (main), язык (lang), согласие на рассылку (news)
 * и скрытые подсказки (dismissed) хранятся в записи покупателя.
 */
(() => {
  'use strict';
  const VX = window.VX;
  const page = document.querySelector('[data-account]');
  if (!VX || !page) return;
  const kk = VX.lang === 'kk';
  const t = (ru, kz) => kk ? kz : ru;
  const $ = s => page.querySelector(s);
  const TABS = ['orders', 'addresses', 'devices', 'profile'];

  /* ---------- Настройки покупателя: язык, рассылка, скрытые подсказки — в VX.user ---------- */
  function prefs() {
    const u = VX.user.get();
    return u ? { lang: u.lang || VX.lang, news: !!u.news, dismissed: u.dismissed || [] } : null;
  }

  /* ---------- Мелочи ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function plural(n, one, few, many) {
    if (n % 10 === 1 && n % 100 !== 11) return one;
    if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return few;
    return many;
  }
  const goods = n => kk ? n + ' тауар' : n + ' ' + plural(n, 'товар', 'товара', 'товаров');
  // Даты — VX.date (store.js): свои названия месяцев на обоих языках
  const dayMonth = iso => VX.date(iso);
  const fullDate = iso => VX.date(iso, { year: true });
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const isoDay = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const parseDay = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const arrow = '<svg class="arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15m-5-5 5 5-5 5"/></svg>';

  function setError(input, text) {
    const err = document.getElementById(input.id + '-err');
    if (err) err.textContent = text || '';
    if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }

  // Значок входа в шапке: точка, когда покупатель вошёл (шапку рисует shell.js один раз при загрузке).
  function syncHeader() {
    const u = VX.user.get();
    const label = u ? t('Личный кабинет', 'Жеке кабинет') : t('Войти', 'Кіру');
    document.querySelectorAll('.account-link').forEach(a => {
      a.classList.toggle('is-in', !!u);
      a.setAttribute('aria-label', label);
      a.setAttribute('title', label);
    });
  }

  /* ---------- Вход ---------- */
  const formPhone = $('#form-phone');
  const formCode = $('#form-code');
  const phoneInput = $('#login-phone');
  const codeInput = $('#login-code');
  const resendBtn = $('[data-act="resend"]');
  let pendingPhone = '';
  let prevDigits = '';
  let resendTimer;
  let justRegistered = false;

  function phoneDigits(value) {
    let d = String(value).replace(/\D/g, '');
    if (/^\s*\+7/.test(value)) d = d.slice(1);
    else if (d.length === 11 && /^[78]/.test(d)) d = d.slice(1);
    // Привычка набирать номер с 8: коды операторов Казахстана начинаются с 7, поэтому 8 первой цифрой отбрасываем.
    if (d[0] === '8') d = d.slice(1);
    return d.slice(0, 10);
  }
  function phoneMask(d) {
    if (!d) return '';
    let s = '+7 ' + d.slice(0, 3);
    if (d.length > 3) s += ' ' + d.slice(3, 6);
    if (d.length > 6) s += ' ' + d.slice(6, 8);
    if (d.length > 8) s += ' ' + d.slice(8, 10);
    return s;
  }
  phoneInput.addEventListener('focus', () => { if (!phoneInput.value) phoneInput.value = '+7 '; });
  phoneInput.addEventListener('blur', () => { if (phoneInput.value.trim() === '+7') phoneInput.value = ''; });
  phoneInput.addEventListener('input', e => {
    let d = phoneDigits(phoneInput.value);
    // Стёрли пробел — стираем и цифру перед ним, иначе маска вернёт пробел обратно.
    if (e.inputType === 'deleteContentBackward' && d === prevDigits) d = d.slice(0, -1);
    prevDigits = d;
    phoneInput.value = d ? phoneMask(d) : '+7 ';
    setError(phoneInput, '');
  });

  function startResendTimer() {
    let left = 30;
    clearInterval(resendTimer);
    resendBtn.disabled = true;
    const tick = () => {
      resendBtn.textContent = t('Отправить код ещё раз через ' + left + ' с', 'Кодты ' + left + ' с кейін қайта жіберу');
      if (left-- <= 0) {
        clearInterval(resendTimer);
        resendBtn.disabled = false;
        resendBtn.textContent = t('Отправить код ещё раз', 'Кодты қайта жіберу');
      }
    };
    tick();
    resendTimer = setInterval(tick, 1000);
  }

  function showPhoneStep() {
    clearInterval(resendTimer);
    formCode.hidden = true;
    formPhone.hidden = false;
    codeInput.value = '';
    setError(codeInput, '');
  }

  formPhone.addEventListener('submit', e => {
    e.preventDefault();
    const d = phoneDigits(phoneInput.value);
    if (d.length !== 10) {
      setError(phoneInput, d.length ? t('Не хватает цифр: нужно 10 после +7.', '+7-ден кейін 10 цифр керек.') : t('Введите номер телефона.', 'Телефон нөмірін енгізіңіз.'));
      phoneInput.focus();
      return;
    }
    pendingPhone = phoneMask(d);
    $('[data-sent-phone]').textContent = pendingPhone;
    formPhone.hidden = true;
    formCode.hidden = false;
    startResendTimer();
    codeInput.focus();
  });

  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 4);
    setError(codeInput, '');
  });

  formCode.addEventListener('submit', e => {
    e.preventDefault();
    const code = codeInput.value.trim();
    if (code.length !== 4) {
      setError(codeInput, t('Введите 4 цифры из SMS.', 'SMS-тегі 4 цифрды енгізіңіз.'));
      codeInput.focus();
      return;
    }
    if (!VX.user.checkCode(code)) {
      setError(codeInput, t('Код не подходит. Проверьте цифры и введите ещё раз.', 'Код сәйкес келмейді. Цифрларды тексеріп, қайта енгізіңіз.'));
      codeInput.select();
      return;
    }
    // Первый вход по номеру = регистрация: store.js сам шлёт событие user:registered.
    justRegistered = false;
    const off = VX.on('user:registered', () => { justRegistered = true; });
    const u = VX.user.login(pendingPhone);
    off();
    if (!u) { setError(codeInput, t('Не получилось войти. Попробуйте ещё раз.', 'Кіру мүмкін болмады. Қайта көріңіз.')); return; }
    clearInterval(resendTimer);
    route(true);
  });

  page.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'change-phone') { showPhoneStep(); phoneInput.focus(); }
    if (act === 'resend') { startResendTimer(); codeInput.focus(); }
    if (act === 'logout') {
      VX.user.logout();
      phoneInput.value = '';
      prevDigits = '';
      showPhoneStep();
      route();
      $('#login-title').setAttribute('tabindex', '-1');
      $('#login-title').focus();
    }
  });

  /* ---------- Вкладки ---------- */
  function currentTab() {
    const h = location.hash.replace('#', '');
    return TABS.includes(h) ? h : 'orders';
  }
  function route(afterLogin) {
    const u = VX.user.get();
    syncHeader();
    $('#acc-login').hidden = !!u;
    $('#acc-app').hidden = !u;
    if (!u) {
      document.title = t('Вход — Vortexa', 'Кіру — Vortexa');
      return;
    }
    renderHead(u);
    const tab = currentTab();
    TABS.forEach(name => {
      const a = $('#tab-' + name);
      const on = name === tab;
      a.setAttribute('aria-selected', on ? 'true' : 'false');
      a.tabIndex = on ? 0 : -1;
      $('#panel-' + name).hidden = !on;
    });
    document.title = $('#tab-' + tab).textContent + ' — ' + t('Личный кабинет', 'Жеке кабинет') + ' — Vortexa';
    ({ orders: renderOrders, addresses: renderAddresses, devices: renderDevices, profile: renderProfile })[tab]();
    if (afterLogin) {
      const w = $('#acc-welcome');
      w.hidden = !justRegistered;
      if (justRegistered) {
        w.textContent = t('Кабинет создан на номер ' + u.phone + '. Добавьте адрес доставки и технику, чтобы видеть срок гарантии.',
          'Кабинет ' + u.phone + ' нөміріне ашылды. Жеткізу мекенжайы мен техниканы қосыңыз, сонда кепілдік мерзімі көрінеді.');
      }
      $('#acc-title').focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }
  window.addEventListener('hashchange', () => {
    if (!VX.user.get()) return;
    $('#acc-welcome').hidden = true;
    route();
  });
  // Стрелки влево-вправо по вкладкам
  $('.acc-tabs').addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    let i = TABS.indexOf(currentTab());
    if (e.key === 'ArrowLeft') i = (i + TABS.length - 1) % TABS.length;
    if (e.key === 'ArrowRight') i = (i + 1) % TABS.length;
    if (e.key === 'Home') i = 0;
    if (e.key === 'End') i = TABS.length - 1;
    location.hash = TABS[i];
    $('#tab-' + TABS[i]).focus();
  });

  function renderHead(u) {
    $('#acc-title').textContent = u.name || t('Личный кабинет', 'Жеке кабинет');
    $('[data-user-phone]').textContent = u.phone;
  }

  /* ---------- Заказы ---------- */
  function renderOrders() {
    const u = VX.user.get();
    const list = VX.orders.list({ phone: u.phone });
    $('#orders-empty').hidden = list.length > 0;
    $('#orders-list').hidden = !list.length;
    $('[data-orders-lead]').hidden = !list.length;
    $('[data-orders-empty-text]').textContent = t('Здесь появятся заказы, оформленные на номер ' + u.phone + '.', u.phone + ' нөмірімен рәсімделген тапсырыстар осында шығады.');
    if (!list.length) { $('#orders-list').replaceChildren(); return; }
    $('[data-orders-lead]').textContent = t('Заказы на номер ' + u.phone + ', новые сверху.', u.phone + ' нөміріндегі тапсырыстар, жаңалары жоғарыда.');
    $('#orders-list').innerHTML = list.map(o => {
      const count = o.items.reduce((s, i) => s + i.qty, 0);
      const shown = o.items.slice(0, 4);
      const thumbs = shown.map(i => {
        const p = VX.product(i.id);
        const name = (i.name && i.name[VX.lang]) || (p && p.name[VX.lang]) || i.model;
        return '<li class="acc-thumb">' + (p ? '<img src="' + esc(VX.asset(p.img)) + '" width="96" height="64" alt="' + esc(name + ' ' + i.model) + '" loading="lazy" decoding="async">' : '') +
          (i.qty > 1 ? '<span class="acc-thumb-qty" aria-label="' + esc(i.qty + t(' шт.', ' дана')) + '">×' + i.qty + '</span>' : '') + '</li>';
      }).join('') + (o.items.length > 4 ? '<li class="acc-thumb acc-thumb-more">+' + (o.items.length - 4) + '</li>' : '');
      return '<li class="acc-order">' +
        '<div class="acc-order-top">' +
          '<a class="acc-order-no" href="' + esc('order.html?no=' + encodeURIComponent(o.no)) + '">' + t('Заказ ', 'Тапсырыс ') + esc(o.no) + '</a>' +
          '<span class="status" data-status="' + esc(o.status) + '">' + esc(VX.status(o.status)) + '</span>' +
        '</div>' +
        '<p class="acc-order-meta">' + esc(dayMonth(o.createdAt)) + ', ' + esc(goods(count)) + '</p>' +
        '<ul class="acc-thumbs" aria-label="' + t('Состав заказа', 'Тапсырыс құрамы') + '">' + thumbs + '</ul>' +
        '<p class="acc-order-sum price">' + esc(VX.fmt(o.total)) + '</p>' +
      '</li>';
    }).join('');
  }

  /* ---------- Адреса ---------- */
  let addrUndoTimer;
  // Основной адрес отмечен в store.js (main: true) и всегда стоит первым
  function primaryId(list) { const m = list.find(a => a.main); return m ? m.id : (list[0] && list[0].id); }
  function renderAddresses() {
    const list = VX.user.addresses.get();
    const main = primaryId(list);
    const sorted = list;
    $('#addr-empty').hidden = list.length > 0;
    $('#addr-list').hidden = !list.length;
    $('#addr-list').innerHTML = sorted.map(a => {
      const isMain = a.id === main;
      return '<li class="acc-addr" data-id="' + esc(a.id) + '">' +
        '<div class="acc-addr-text">' +
          '<p class="acc-addr-line">' + esc(a.city) + ', ' + esc(a.address) + '</p>' +
          (a.comment ? '<p class="acc-addr-note">' + esc(a.comment) + '</p>' : '') +
          (isMain ? '<p class="acc-main-mark">' + t('Основной адрес', 'Негізгі мекенжай') + '</p>' : '') +
        '</div>' +
        '<div class="acc-row-acts">' +
          (isMain ? '' : '<button class="btn-text" type="button" data-addr="main">' + t('Сделать основным', 'Негізгі ету') + '</button>') +
          '<button class="btn-text acc-del" type="button" data-addr="remove" aria-label="' + esc(t('Удалить адрес: ', 'Мекенжайды жою: ') + a.city + ', ' + a.address) + '">' + t('Удалить', 'Жою') + '</button>' +
        '</div>' +
      '</li>';
    }).join('');
  }
  $('#addr-list').addEventListener('click', e => {
    const b = e.target.closest('[data-addr]');
    if (!b) return;
    const id = b.closest('.acc-addr').dataset.id;
    const list = VX.user.addresses.get();
    const a = list.find(x => x.id === id);
    if (!a) return;
    if (b.dataset.addr === 'main') {
      VX.user.addresses.setMain(id);
      renderAddresses();
      $('#addr-list .acc-addr [data-addr="remove"]')?.focus({ preventScroll: true });
      return;
    }
    const wasMain = primaryId(list) === id;
    VX.user.addresses.remove(id);
    renderAddresses();
    showUndo($('#addr-undo'), t('Адрес удалён: ', 'Мекенжай жойылды: ') + a.city + ', ' + a.address + '.', () => {
      VX.user.addresses.add({ city: a.city, street: a.street, house: a.house, flat: a.flat, address: a.address, comment: a.comment, main: wasMain });
      renderAddresses();
    }, timer => { clearTimeout(addrUndoTimer); addrUndoTimer = timer; });
  });

  $('#form-address').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.currentTarget;
    const need = [['addr-city', t('Укажите город.', 'Қаланы көрсетіңіз.')], ['addr-street', t('Укажите улицу или микрорайон.', 'Көшені немесе шағынауданды көрсетіңіз.')], ['addr-house', t('Укажите номер дома.', 'Үй нөмірін көрсетіңіз.')]];
    let first = null;
    need.forEach(([id, msg]) => {
      const input = f.querySelector('#' + id);
      const bad = !input.value.trim();
      setError(input, bad ? msg : '');
      if (bad && !first) first = input;
    });
    if (first) { first.focus(); return; }
    const v = id => f.querySelector('#' + id).value.trim();
    // Первый адрес store.js сам делает основным
    VX.user.addresses.add({ city: v('addr-city'), street: v('addr-street'), house: v('addr-house'), flat: v('addr-flat'), comment: v('addr-comment') });
    f.reset();
    renderAddresses();
    window.VXShell && VXShell.notify(t('Адрес добавлен', 'Мекенжай қосылды'));
  });
  $('#form-address').addEventListener('input', e => { if (e.target.id) setError(e.target, ''); });

  /* ---------- Уведомление с «Вернуть» ---------- */
  function showUndo(box, text, onUndo, keepTimer) {
    box.replaceChildren();
    const span = document.createElement('span');
    span.textContent = text;
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'link-line';
    back.textContent = t('Вернуть', 'Қайтару');
    back.addEventListener('click', () => { box.hidden = true; onUndo(); }, { once: true });
    box.append(span, back);
    box.hidden = false;
    back.focus({ preventScroll: true });
    keepTimer(setTimeout(() => { box.hidden = true; }, 8000));
  }

  /* ---------- Мои товары и гарантия ---------- */
  let devUndoTimer;
  const modelSelect = $('#dev-model');
  const dateInput = $('#dev-date');
  (function fillModels() {
    const groups = {};
    VX.products.forEach(p => { (groups[p.category] = groups[p.category] || []).push(p); });
    modelSelect.innerHTML = '<option value="">' + t('Выберите модель', 'Модельді таңдаңыз') + '</option>' +
      Object.keys(groups).map(c => '<optgroup label="' + esc(VX.category(c)) + '">' +
        groups[c].map(p => '<option value="' + esc(p.id) + '">' + esc(p.name[VX.lang] + ' ' + p.model) + '</option>').join('') + '</optgroup>').join('');
  })();

  function warranty(d) {
    const until = parseDay(d.warrantyUntil);
    const now = today();
    const start = parseDay(d.date);
    const total = Math.max(1, until - start);
    const share = Math.min(1, Math.max(0, (now - start) / total));
    if (until < now) return { until, share: 1, left: t('Гарантия закончилась', 'Кепілдік мерзімі аяқталды'), over: true };
    let months = (until.getFullYear() - now.getFullYear()) * 12 + until.getMonth() - now.getMonth();
    if (new Date(now.getFullYear(), now.getMonth() + months, now.getDate()) > until) months--;
    let left;
    if (months >= 1) left = kk ? months + ' ай' : months + ' ' + plural(months, 'месяц', 'месяца', 'месяцев');
    else {
      const days = Math.round((until - now) / 864e5);
      left = kk ? days + ' күн' : days + ' ' + plural(days, 'день', 'дня', 'дней');
    }
    return { until, share, left: t('Осталось ', 'Қалды: ') + '[' + left + ']', over: false };
  }

  function offers() {
    const have = new Set(VX.user.devices.get().map(d => d.id));
    const dismissed = new Set(prefs().dismissed || []);
    const out = [];
    VX.orders.list({ phone: VX.user.get().phone }).filter(o => o.status === 'delivered').forEach(o => {
      const at = (o.history.filter(h => h.status === 'delivered').pop() || {}).at || o.createdAt;
      o.items.forEach(i => {
        const key = o.no + ':' + i.id;
        if (have.has(i.id) || dismissed.has(key) || out.some(x => x.id === i.id) || !VX.product(i.id)) return;
        out.push({ id: i.id, no: o.no, date: isoDay(new Date(at)), key });
      });
    });
    return out;
  }

  function renderDevices() {
    dateInput.max = isoDay(today());
    const list = VX.user.devices.get();
    const off = offers();
    $('#dev-offer').hidden = !off.length;
    $('#dev-offer-list').innerHTML = off.map(o => {
      const p = VX.product(o.id);
      return '<li class="acc-offer-row" data-id="' + esc(o.id) + '" data-date="' + esc(o.date) + '" data-key="' + esc(o.key) + '">' +
        '<img src="' + esc(VX.asset(p.img)) + '" width="96" height="64" alt="" loading="lazy" decoding="async">' +
        '<div class="acc-offer-text"><p class="acc-dev-name">' + esc(p.name[VX.lang]) + ' <span class="acc-model">' + esc(p.model) + '</span></p>' +
        '<p class="acc-offer-meta">' + t('Заказ ', 'Тапсырыс ') + esc(o.no) + t(', получен ', ', алынды: ') + esc(fullDate(o.date)) + '</p></div>' +
        '<button class="btn btn-quiet btn-sm" type="button" data-offer="add">' + t('Добавить', 'Қосу') + '</button>' +
      '</li>';
    }).join('');

    $('#dev-empty').hidden = list.length > 0;
    $('#dev-list').hidden = !list.length;
    const sorted = list.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    $('#dev-list').innerHTML = sorted.map(d => {
      const p = VX.product(d.id);
      if (!p) return '';
      const w = warranty(d);
      return '<li class="acc-dev' + (w.over ? ' is-over' : '') + '" data-uid="' + esc(d.uid) + '">' +
        '<a class="acc-dev-photo" href="' + esc(p.url) + '" tabindex="-1" aria-hidden="true"><img src="' + esc(VX.asset(p.img)) + '" width="160" height="107" alt="" loading="lazy" decoding="async"></a>' +
        '<div class="acc-dev-info">' +
          '<span class="acc-model">' + esc(p.model) + '</span>' +
          '<a class="acc-dev-name" href="' + esc(p.url) + '">' + esc(p.name[VX.lang]) + '</a>' +
          '<dl class="acc-dev-facts">' +
            '<div><dt>' + t('Серийный номер', 'Сериялық нөмір') + '</dt><dd>' + (d.serial ? esc(d.serial) : '<span class="muted">' + t('не указан', 'көрсетілмеген') + '</span>') + '</dd></div>' +
            '<div><dt>' + t('Дата покупки', 'Сатып алған күн') + '</dt><dd>' + esc(fullDate(d.date)) + '</dd></div>' +
          '</dl>' +
          '<div class="acc-dev-links">' +
            '<a class="link-line" href="' + esc('support.html#' + p.id) + '">' + t('Инструкция', 'Нұсқаулық') + '</a>' +
            '<a class="link-line" href="warranty.html">' + t('Обратиться в сервис', 'Сервиске жүгіну') + '</a>' +
          '</div>' +
        '</div>' +
        '<div class="acc-warranty">' +
          '<p class="acc-w-until">' + t('Гарантия до', 'Кепілдік мерзімі') + '<strong>[' + esc(fullDate(w.until)) + ']' + t('', ' дейін') + '</strong></p>' +
          '<div class="acc-w-bar" role="img" aria-label="' + esc(t('Прошло ', 'Өтті: ') + Math.round(w.share * 100) + t('% срока гарантии', '% кепілдік мерзімі')) + '"><span style="width:' + (w.share * 100).toFixed(1) + '%"></span></div>' +
          '<p class="acc-w-left">' + esc(w.left) + '</p>' +
          '<button class="btn-text acc-del" type="button" data-dev="remove" aria-label="' + esc(t('Убрать из списка: ', 'Тізімнен алып тастау: ') + p.name[VX.lang] + ' ' + p.model) + '">' + t('Убрать из списка', 'Тізімнен алып тастау') + '</button>' +
        '</div>' +
      '</li>';
    }).join('');
  }

  $('#dev-offer-list').addEventListener('click', e => {
    const b = e.target.closest('[data-offer]');
    if (!b) return;
    const row = b.closest('.acc-offer-row');
    const added = VX.user.devices.add({ id: row.dataset.id, serial: '', date: row.dataset.date });
    renderDevices();
    if (added) {
      const p = VX.product(added.id);
      window.VXShell && VXShell.notify(t('Добавлено: ', 'Қосылды: ') + p.name[VX.lang] + ' ' + p.model);
      ($('#dev-offer-list [data-offer]') || $('#dev-list .acc-dev-name'))?.focus({ preventScroll: true });
    }
  });

  $('#dev-list').addEventListener('click', e => {
    const b = e.target.closest('[data-dev="remove"]');
    if (!b) return;
    const uid = b.closest('.acc-dev').dataset.uid;
    const d = VX.user.devices.get().find(x => x.uid === uid);
    if (!d) return;
    VX.user.devices.remove(uid);
    renderDevices();
    const p = VX.product(d.id);
    showUndo($('#dev-undo'), t('Убрано: ', 'Алынды: ') + p.name[VX.lang] + ' ' + p.model + '.', () => {
      VX.user.devices.add({ id: d.id, serial: d.serial, date: d.date });
      renderDevices();
    }, timer => { clearTimeout(devUndoTimer); devUndoTimer = timer; });
  });

  $('#form-device').addEventListener('submit', e => {
    e.preventDefault();
    const serialInput = $('#dev-serial');
    const serial = serialInput.value.trim().toUpperCase();
    const errs = [
      [modelSelect, modelSelect.value ? '' : t('Выберите модель.', 'Модельді таңдаңыз.')],
      [serialInput, serial.length >= 4 ? '' : t('Введите серийный номер: не меньше 4 знаков.', 'Сериялық нөмірді енгізіңіз: кемінде 4 таңба.')],
      [dateInput, !dateInput.value ? t('Укажите дату покупки.', 'Сатып алған күнді көрсетіңіз.') : (dateInput.value > isoDay(today()) ? t('Дата покупки не может быть позже сегодняшней.', 'Сатып алған күн бүгіннен кейін болмайды.') : '')]
    ];
    errs.forEach(([input, msg]) => setError(input, msg));
    const bad = errs.find(x => x[1]);
    if (bad) { bad[0].focus(); return; }
    const added = VX.user.devices.add({ id: modelSelect.value, serial, date: dateInput.value });
    e.currentTarget.reset();
    renderDevices();
    if (added) {
      const p = VX.product(added.id);
      window.VXShell && VXShell.notify(t('Зарегистрировано: ', 'Тіркелді: ') + p.name[VX.lang] + ' ' + p.model);
    }
  });
  $('#form-device').addEventListener('input', e => { if (e.target.id) setError(e.target, ''); });
  $('#form-device').addEventListener('change', e => { if (e.target.id) setError(e.target, ''); });

  /* ---------- Профиль ---------- */
  const formProfile = $('#form-profile');
  function renderProfile() {
    const u = VX.user.get();
    const pr = prefs();
    formProfile.querySelector('#pf-name').value = u.name || '';
    formProfile.querySelector('#pf-phone').value = u.phone;
    formProfile.querySelector('#pf-email').value = u.email || '';
    formProfile.querySelectorAll('input[name="lang"]').forEach(r => { r.checked = r.value === pr.lang; });
    formProfile.querySelector('#pf-news').checked = !!pr.news;
    setError(formProfile.querySelector('#pf-email'), '');
  }
  formProfile.addEventListener('submit', e => {
    e.preventDefault();
    const email = formProfile.querySelector('#pf-email');
    const news = formProfile.querySelector('#pf-news').checked;
    const mail = email.value.trim();
    let msg = '';
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) msg = t('Проверьте почту: нужен адрес вида name@mail.kz.', 'Поштаны тексеріңіз: name@mail.kz сияқты мекенжай керек.');
    else if (!mail && news) msg = t('Чтобы получать письма, укажите почту.', 'Хат алу үшін поштаны көрсетіңіз.');
    setError(email, msg);
    if (msg) { email.focus(); return; }
    const lang = (formProfile.querySelector('input[name="lang"]:checked') || {}).value || VX.lang;
    const u = VX.user.update({ name: formProfile.querySelector('#pf-name').value, email: mail, lang, news });
    renderHead(u);
    const box = $('#pf-saved');
    box.replaceChildren(document.createTextNode(t('Сохранено.', 'Сақталды.')));
    if (lang !== VX.lang) {
      const a = document.createElement('a');
      a.href = VX.href('account.html#profile', { lang });
      a.textContent = lang === 'kk' ? 'Кабинетті қазақша ашу' : 'Открыть кабинет на русском';
      a.lang = lang;
      box.append(' ', a);
    }
    box.hidden = false;
  });
  formProfile.addEventListener('input', e => {
    $('#pf-saved').hidden = true;
    if (e.target.id === 'pf-email') setError(e.target, '');
  });

  /* ---------- Старт ---------- */
  window.addEventListener('pageshow', () => route());
  route();
})();
