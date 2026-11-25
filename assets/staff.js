/*
 * Vortexa v7 — общий слой кабинета сотрудников (window.SX).
 * Подключать после store.js: site.css → ui.css → staff.css → store.js → staff.js → скрипт страницы (все с defer).
 * Делает: проверку входа и прав, шапку кабинета, меню слева (на телефоне — выпадающее), сообщения, копирование.
 * Данные — только store.js: роли и права (VX.staff.setRole / can), скрытие товара (VX.catalog.update {hidden}),
 * связь «заявка → заказ» (VX.leads.link, поле orderNo). Здесь — тонкие обёртки и каркас страниц.
 */
(function () {
  'use strict';
  var VX = window.VX;
  if (!VX) return;

  /* ---------- Права (spec/platform.md, 1.2 — упрощено для демо): из store.js ---------- */
  var PERMS = VX.staff.perms;
  var ROLE = VX.staff.roles;
  var SECTIONS = [
    {id: 'orders', file: 'orders.html', label: 'Заказы'},
    {id: 'leads', file: 'leads.html', label: 'Заявки'},
    {id: 'products', file: 'products.html', label: 'Товары и цены'},
    {id: 'reports', file: 'reports.html', label: 'Отчёты'},
    {id: 'team', file: 'team.html', label: 'Команда и права'},
    {id: 'log', file: 'log.html', label: 'Журнал'}
  ];

  /* ---------- Мелочи ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
    });
  }
  var ICON = {
    down: '<path d="m6 9 6 6 6-6"/>',
    back: '<path d="M20 12H5m5-5-5 5 5 5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.6"/><path d="m15.5 15.5 4.8 4.8"/>',
    arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>'
  };
  function icon(n) {
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + ICON[n] + '</svg>';
  }

  // Время — по Алматы (spec/platform.md, ОБЩ-03)
  var TZ = 'Asia/Almaty';
  var MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  function parts(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return null;
    try {
      var p = {};
      new Intl.DateTimeFormat('en-GB', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'})
        .formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
      return {y: +p.year, m: +p.month, d: +p.day, hh: p.hour, mm: p.minute, key: p.year + '-' + p.month + '-' + p.day};
    } catch (e) {
      return {y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), hh: String(d.getHours()).padStart(2, '0'), mm: String(d.getMinutes()).padStart(2, '0'), key: d.toISOString().slice(0, 10)};
    }
  }
  function dayKey(iso) { var p = parts(iso); return p ? p.key : ''; }
  function when(iso, opts) {
    var p = parts(iso); if (!p) return '';
    var today = parts(new Date().toISOString());
    var yest = parts(new Date(Date.now() - 864e5).toISOString());
    var day = p.key === today.key ? 'Сегодня' : p.key === yest.key ? 'Вчера' : p.d + ' ' + MON[p.m - 1] + (p.y !== today.y ? ' ' + p.y : '');
    if (opts && opts.lower && /^(Сегодня|Вчера)$/.test(day)) day = day.toLowerCase();
    if (opts && opts.dateOnly) return day;
    return day + ', ' + p.hh + ':' + p.mm;
  }
  function dayLabel(key) { var a = key.split('-'); return +a[2] + ' ' + MON[+a[1] - 1]; }

  // Телефон в списках — замаскирован (ДАН-03): [+7 7** *** ** 11]
  function maskPhone(phone) {
    var d = VX.digits(phone);
    if (d.length !== 10) return '[скрыт]';
    return '[+7 ' + d[0] + '** *** ** ' + d.slice(8) + ']';
  }
  function phoneText(phone) {
    var d = VX.digits(phone);
    return d.length === 10 ? '+7 ' + d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6, 8) + ' ' + d.slice(8) : String(phone || '');
  }
  function waText(phone) { var d = VX.digits(phone); return d.length === 10 ? 'wa.me/7' + d : ''; }
  function plural(n, one, few, many) {
    var a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  }

  /* ---------- Роли: store.js хранит смену роли, can() учитывает её ---------- */
  function staffList() { return VX.staff.list(); }
  function staffGet(id) { return VX.staff.get(id); }
  function me() { return VX.staff.current(); }
  function can(perm, who) { return VX.staff.can(perm, who); }
  function nameOf(id) {
    if (!id) return '';
    if (id === 'customer') return 'Покупатель';
    if (id === 'system') return 'Система';
    var s = staffGet(id);
    return s ? s.name : id;
  }

  /* ---------- Видимость заказов и заявок (РОЛ-01…03) ---------- */
  function isFree(o) { return !o.sellerId; }
  function seesOrder(o, who) {
    who = who || me();
    if (!who || !o) return false;
    if (who.role !== 'seller') return true;
    return o.sellerId === who.id || (isFree(o) && o.status === 'new');
  }
  // Продажник не видит имя, телефон и адрес свободного заказа, пока не возьмёт его себе
  function hidesCustomer(o, who) { who = who || me(); return !!who && who.role === 'seller' && isFree(o); }
  function visibleOrders() { return VX.orders.list().filter(function (o) { return seesOrder(o); }); }
  function seesLead(l, who) {
    who = who || me();
    if (!who) return false;
    if (who.role !== 'seller') return true;
    return l.sellerId === who.id || (!l.sellerId && l.status === 'new');
  }

  /* ---------- Заявки: подписи статусов и видов — из store.js ---------- */
  var LEAD_STATUS = {}, LEAD_KIND = {};
  Object.keys(VX.leads.statuses).forEach(function (k) { LEAD_STATUS[k] = VX.leads.statuses[k].ru; });
  Object.keys(VX.leads.kinds).forEach(function (k) { LEAD_KIND[k] = VX.leads.kinds[k].ru; });

  /* ---------- Журнал: человеческие подписи (store.js пишет по-русски; это — для записей прошлой версии) ---------- */
  function prettyWhat(what) {
    return String(what || '').replace(/^Заявка: (new|in-progress|done)$/, function (m, s) {
      return s === 'in-progress' ? 'Взял заявку в работу' : s === 'done' ? 'Закрыл заявку' : 'Вернул заявку в новые';
    });
  }
  function act(what, ref) { var m = me(); if (m) VX.log.add({who: m.id, what: what, ref: ref || ''}); }

  /* ---------- Сообщение внизу экрана ---------- */
  var toastBox, toastTimer;
  function toast(text, link) {
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.className = 'sx-toast';
      toastBox.setAttribute('role', 'status');
      toastBox.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastBox);
    }
    toastBox.innerHTML = esc(text) + (link ? '<a href="' + esc(link.href) + '">' + esc(link.text) + '</a>' : '');
    toastBox.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastBox.classList.remove('is-shown'); }, link ? 6000 : 3200);
  }

  /* ---------- Копирование: буфер обмена, а если песочница не даёт — выделить текст ---------- */
  function copy(text, input) {
    function fallback() {
      if (input) { input.focus(); input.select(); }
      toast('Номер выделен — нажмите ⌘C или Ctrl+C');
      return false;
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text).then(function () { toast('Скопировано: ' + text); return true; }, fallback);
      }
    } catch (e) { /* песочница */ }
    if (input) {
      input.focus(); input.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      if (ok) { toast('Скопировано: ' + text); return Promise.resolve(true); }
    }
    return Promise.resolve(fallback());
  }

  /* ---------- Каркас страницы ---------- */
  function counts(who) {
    var o = VX.orders.list().filter(function (x) { return seesOrder(x, who) && x.status === 'new'; }).length;
    var l = VX.leads.list().filter(function (x) { return seesLead(x, who) && x.status === 'new'; }).length;
    return {orders: o, leads: l};
  }
  function navLinks(who, here) {
    var c = counts(who);
    return SECTIONS.filter(function (s) { return can(s.id, who.id); }).map(function (s) {
      var n = c[s.id];
      return '<a href="' + s.file + '"' + (s.id === here ? ' aria-current="page"' : '') + '><span>' + s.label + '</span>' +
        (n ? '<span class="count" title="Новые">' + n + '</span>' : '') + '</a>';
    }).join('');
  }
  function firstAllowed(who) {
    var s = SECTIONS.filter(function (x) { return can(x.id, who.id); })[0];
    return s ? s.file : 'index.html';
  }

  function renderTop(who, here) {
    var cur = SECTIONS.filter(function (s) { return s.id === here; })[0];
    var top = document.querySelector('[data-sx="top"]');
    if (!top) return;
    top.className = 'sx-top';
    top.innerHTML =
      '<a class="sx-brand" href="orders.html" aria-label="Кабинет сотрудников Vortexa"><img src="../assets/wordmark.svg" alt="Vortexa" width="104" height="16"><span>Кабинет</span></a>' +
      '<div class="sx-top-end">' +
        '<div class="sx-who"><strong>' + esc(who.name) + '</strong><span>' + esc(who.roleLabel) + '</span></div>' +
        '<a class="sx-toplink" href="../index.html">На сайт</a>' +
        '<button class="sx-toplink" type="button" data-logout>Выйти</button>' +
        '<button class="sx-menu-btn" type="button" aria-expanded="false" aria-controls="sx-drop">' + esc(cur ? cur.label : 'Разделы') + icon('down') + '</button>' +
      '</div>';
    var drop = document.createElement('div');
    drop.className = 'sx-drop';
    drop.id = 'sx-drop';
    drop.innerHTML = '<nav aria-label="Разделы кабинета">' + navLinks(who, here) + '</nav>' +
      '<div class="sx-drop-foot"><p>' + esc(who.name) + ', ' + esc(who.roleLabel.toLowerCase()) + '</p>' +
      '<div class="sx-row"><a class="btn-text" href="../index.html">На сайт</a><button class="btn-text" type="button" data-logout>Выйти</button></div></div>';
    top.after(drop);
    var btn = top.querySelector('.sx-menu-btn');
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      drop.classList.toggle('is-open', open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drop.classList.contains('is-open')) { drop.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    });
  }
  function renderNav(who, here) {
    var nav = document.querySelector('[data-sx="nav"]');
    if (!nav) return;
    nav.className = 'sx-nav';
    nav.setAttribute('aria-label', 'Разделы кабинета');
    nav.innerHTML = navLinks(who, here) +
      '<div class="sx-nav-foot">Демо-кабинет. Данные хранятся в этом браузере.<br><button class="btn-text" type="button" data-reset>Сбросить демо-данные</button></div>';
  }
  function refreshNav() {
    var who = me(); if (!who) return;
    var here = document.body.getAttribute('data-section');
    document.querySelectorAll('.sx-nav, .sx-drop nav').forEach(function (n) {
      var foot = n.querySelector('.sx-nav-foot');
      n.innerHTML = navLinks(who, here);
      if (foot) n.appendChild(foot);
    });
  }

  function deny(main, who) {
    var to = firstAllowed(who);
    var label = (SECTIONS.filter(function (s) { return s.file === to; })[0] || {}).label || 'Вход';
    main.innerHTML = '<section class="sx-deny" aria-labelledby="deny-t"><h1 id="deny-t">Нет доступа к этому разделу</h1>' +
      '<p>Раздел открыт ролям: ' + esc(rolesFor(document.body.getAttribute('data-section'))) + '. Вы вошли как ' + esc(who.roleLabel.toLowerCase()) + '.</p>' +
      '<a class="btn btn-secondary btn-sm" href="' + to + '">Открыть «' + esc(label) + '»</a></section>';
  }
  function rolesFor(perm) {
    return Object.keys(PERMS).filter(function (r) { return PERMS[r].indexOf(perm) !== -1; }).map(function (r) { return ROLE[r].toLowerCase(); }).join(', ');
  }

  var state = {ok: false};
  function boot() {
    var body = document.body;
    body.classList.add('sx');
    if (body.getAttribute('data-sx-page') === 'login') { state.ok = true; return; }
    var who = me();
    if (!who) { location.replace('index.html'); return; }
    var here = body.getAttribute('data-section');
    renderTop(who, here);
    renderNav(who, here);
    document.addEventListener('click', function (e) {
      var out = e.target.closest('[data-logout]');
      if (out) { VX.staff.logout(); location.href = 'index.html'; return; }
      var reset = e.target.closest('[data-reset]');
      if (reset) {
        if (reset.getAttribute('data-armed') === '1') {
          var id = who.id;
          VX.reset(); VX.staff.login(id);
          location.reload();
        } else {
          reset.setAttribute('data-armed', '1');
          reset.textContent = 'Точно сбросить? Нажмите ещё раз';
          setTimeout(function () { reset.removeAttribute('data-armed'); reset.textContent = 'Сбросить демо-данные'; }, 4000);
        }
      }
    });
    ['order:created', 'order:status', 'order:assigned', 'lead:created', 'lead:status'].forEach(function (ev) { VX.on(ev, refreshNav); });
    var main = document.getElementById('main');
    if (here && !can(here)) { deny(main, who); state.ok = false; return; }
    state.ok = true;
  }

  window.SX = {
    ROLE: ROLE, PERMS: PERMS, SECTIONS: SECTIONS,
    ready: function () { return state.ok; },
    me: me, can: can, staff: staffList, staffGet: staffGet, nameOf: nameOf,
    isFree: isFree, seesOrder: seesOrder, hidesCustomer: hidesCustomer, visibleOrders: visibleOrders, seesLead: seesLead,
    LEAD_STATUS: LEAD_STATUS, LEAD_KIND: LEAD_KIND,
    prettyWhat: prettyWhat, act: act,
    esc: esc, icon: icon, when: when, dayKey: dayKey, dayLabel: dayLabel, plural: plural,
    maskPhone: maskPhone, phoneText: phoneText, waText: waText,
    toast: toast, copy: copy, refreshNav: refreshNav, firstAllowed: firstAllowed
  };
  boot();
})();
