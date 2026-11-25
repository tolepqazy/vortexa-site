/*
 * Vortexa v7 — общий модуль данных (window.VX).
 * Ствол: каталог, корзина, заказы, покупатель, сотрудники, журнал, заявки, события.
 * Ствол не знает о ветках; страницы слушают события через VX.on(...).
 * Данные — в localStorage; если он недоступен — в памяти вкладки (и в window.name,
 * чтобы корзина пережила переход между страницами). Внешних библиотек нет.
 * Описание API с примерами — design/v7/FOUNDATION.md.
 */
(function () {
  'use strict';
  if (window.VX) return;

  /* ---------- Каталог: единственное место, где живут цены ----------
   * Блок между метками CATALOG читает и генератор (build/site.py) — держите его валидным JSON. */
  var CATALOG = /*CATALOG*/[
    {"id": "dryer-hcd1002", "model": "HCD1002-CE", "category": "beauty", "price": 39990, "stock": 14,
     "name": {"ru": "Фен для волос", "kk": "Шаш кептіргіш"},
     "short": {"ru": "1600 Вт · магнитные насадки", "kk": "1600 Вт · магнитті саптамалар"}},
    {"id": "kettle-kegs5803", "model": "KEGS5803D-GS", "category": "kitchen", "price": 17990, "stock": 22,
     "name": {"ru": "Стеклянный чайник", "kk": "Шыны шәйнек"},
     "short": {"ru": "1,7 л · 2200 Вт", "kk": "1,7 л · 2200 Вт"}},
    {"id": "blender-hb003b", "model": "HB003B", "category": "kitchen", "price": 34990, "stock": 9,
     "name": {"ru": "Стационарный блендер", "kk": "Стационарлық блендер"},
     "short": {"ru": "Чаша 2 л · 4 программы", "kk": "2 л құмыра · 4 бағдарлама"}},
    {"id": "pump-mkn-csq818", "model": "MKN-CSQ818", "category": "kitchen", "price": 6990, "stock": 40,
     "name": {"ru": "Помпа для воды", "kk": "Су сорғысы"},
     "short": {"ru": "6 порций · USB Type-C", "kk": "6 мөлшер · USB Type-C"}},
    {"id": "vacuum-a7", "model": "A7", "category": "cleaning", "price": 59990, "stock": 7,
     "name": {"ru": "Беспроводной пылесос", "kk": "Сымсыз шаңсорғыш"},
     "short": {"ru": "350 Вт · съёмный аккумулятор", "kk": "350 Вт · алынбалы аккумулятор"}},
    {"id": "car-vacuum-a2", "model": "A2", "category": "cleaning", "price": 16990, "stock": 18,
     "name": {"ru": "Автомобильный пылесос", "kk": "Көлік шаңсорғышы"},
     "short": {"ru": "120 Вт · всасывание и выдув", "kk": "120 Вт · сору және үрлеу"}},
    {"id": "humidifier-t2215", "model": "T-2215-ZN LCD", "category": "climate", "price": 24990, "stock": 11,
     "name": {"ru": "Увлажнитель с доливом сверху", "kk": "Үстінен су құйылатын ылғалдандырғыш"},
     "short": {"ru": "Бак на 4 л · до 280 мл/ч", "kk": "4 литрлік су ыдысы · 280 мл/сағ дейін"}},
    {"id": "humidifier-t606", "model": "T-606", "category": "climate", "price": 19990, "stock": 13,
     "name": {"ru": "Увлажнитель с аромаотсеком", "kk": "Хош иіс бөлімі бар ылғалдандырғыш"},
     "short": {"ru": "Бак на 4 л · отсек для аромамасел", "kk": "4 литрлік су ыдысы · хош иісті май бөлігі"}},
    {"id": "fan-ss056", "model": "SS-056", "category": "climate", "price": 9990, "stock": 25,
     "name": {"ru": "Складной вентилятор", "kk": "Жиналмалы желдеткіш"},
     "short": {"ru": "3 скорости · USB Type-C", "kk": "3 жылдамдық · USB Type-C"}},
    {"id": "clothes-dryer-cpcd2", "model": "C-PCD-2", "category": "clothes", "price": 22990, "stock": 6,
     "name": {"ru": "Сушилка для одежды", "kk": "Киім кептіргіш"},
     "short": {"ru": "Тёплый воздух · поворотный таймер", "kk": "Жылы ауа · бұрамалы таймер"}},
    {"id": "lint-ar008", "model": "AR-008", "category": "clothes", "price": 8990, "stock": 30,
     "name": {"ru": "Машинка от катышков", "kk": "Түйіршік тазалағыш"},
     "short": {"ru": "6 лезвий · до 90 минут работы", "kk": "6 пышақ · 90 минутқа дейін"}}
  ]/*END CATALOG*/;

  var CATEGORIES = {
    kitchen: {ru: 'Кухня', kk: 'Асүй'},
    climate: {ru: 'Климат', kk: 'Климат'},
    cleaning: {ru: 'Уборка', kk: 'Үй жинау'},
    beauty: {ru: 'Красота', kk: 'Шаш күтімі'},
    clothes: {ru: 'Уход за одеждой', kk: 'Киім күтімі'}
  };

  var STATUSES = ['new', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled'];
  var STATUS_LABEL = {
    new: {ru: 'Новый', kk: 'Жаңа'},
    confirmed: {ru: 'Подтверждён', kk: 'Расталды'},
    paid: {ru: 'Оплачен', kk: 'Төленді'},
    shipped: {ru: 'Передан в доставку', kk: 'Жеткізуге берілді'},
    delivered: {ru: 'Доставлен', kk: 'Жеткізілді'},
    cancelled: {ru: 'Отменён', kk: 'Бас тартылды'}
  };

  // Способ оплаты в заказе: подпись для покупателя и кабинета сотрудников. VX.payment('manager')
  var PAYMENT_LABEL = {
    manager: {ru: 'Согласует менеджер', kk: 'Менеджер келіседі'},
    cash: {ru: 'Наличными при получении', kk: 'Алған кезде қолма-қол'},
    card: {ru: 'Картой при получении', kk: 'Алған кезде картамен'},
    kaspi: {ru: 'Kaspi', kk: 'Kaspi'},
    transfer: {ru: 'Переводом', kk: 'Аударыммен'}
  };
  // Заявки: вид и статус (подписи для кабинета и журнала)
  var LEAD_KIND_LABEL = {
    service: {ru: 'Сервис', kk: 'Сервис'},
    question: {ru: 'Вопрос', kk: 'Сұрақ'},
    order: {ru: 'Заказ', kk: 'Тапсырыс'}
  };
  var LEAD_STATUS_LABEL = {
    'new': {ru: 'Новая', kk: 'Жаңа'},
    'in-progress': {ru: 'В работе', kk: 'Жұмыста'},
    done: {ru: 'Закрыта', kk: 'Жабылды'}
  };
  // Что пишется в журнал при смене статуса заявки
  var LEAD_STATUS_LOG = {'new': 'Вернул заявку в новые', 'in-progress': 'Взял заявку в работу', done: 'Закрыл заявку'};

  var STAFF = [
    {id: 'director', name: '[Айгерим С.]', role: 'director'},
    {id: 'manager', name: '[Данияр К.]', role: 'manager'},
    {id: 'seller-aliya', name: '[Алия Т.]', role: 'seller'},
    {id: 'seller-erlan', name: '[Ерлан Б.]', role: 'seller'}
  ];
  var ROLE_LABEL = {director: 'Директор', manager: 'Менеджер', seller: 'Продажник'};
  // Что может каждая роль. Страницы кабинета проверяют VX.staff.can('…').
  var PERMS = {
    director: ['orders', 'leads', 'products', 'reports', 'team', 'log'],
    manager: ['orders', 'leads', 'products'],
    seller: ['orders', 'leads']
  };

  var DEMO_CODE = '0000';
  var MAX_QTY = 99;
  var PREFIX = 'vx.v1.';

  /* ---------- Хранилище с запасным вариантом ---------- */
  var ls = null;
  try {
    ls = window.localStorage;
    ls.setItem(PREFIX + 'probe', '1');
    ls.removeItem(PREFIX + 'probe');
  } catch (e) { ls = null; }

  var WN = 'vx-store:';
  var mem = (function () {
    if (ls) return {};
    try { if (String(window.name).indexOf(WN) === 0) return JSON.parse(window.name.slice(WN.length)) || {}; } catch (e) {}
    return {};
  })();

  function read(key, fallback) {
    try {
      var raw = ls ? ls.getItem(PREFIX + key) : (key in mem ? JSON.stringify(mem[key]) : null);
      if (raw == null) return clone(fallback);
      var value = JSON.parse(raw);
      return value == null ? clone(fallback) : value;
    } catch (e) { return clone(fallback); }
  }
  function write(key, value) {
    if (ls) {
      try { ls.setItem(PREFIX + key, JSON.stringify(value)); return; } catch (e) { ls = null; }
    }
    mem[key] = clone(value);
    try { window.name = WN + JSON.stringify(mem); } catch (e) { /* только память */ }
  }
  function remove(key) {
    if (ls) { try { ls.removeItem(PREFIX + key); } catch (e) {} }
    delete mem[key];
  }
  function clone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }

  /* ---------- Язык и пути ---------- */
  var lang = document.documentElement.lang === 'kk' ? 'kk' : 'ru';
  // Путь до корня сайта берём из src этого скрипта: "../assets/store.js" → "../".
  var root = (function () {
    var s = document.currentScript && document.currentScript.getAttribute('src');
    if (s && /assets\/store\.js/.test(s)) return s.replace(/assets\/store\.js.*$/, '');
    var b = document.body && document.body.getAttribute('data-root');
    return b || '';
  })();
  function t(ru, kk) { return lang === 'kk' ? kk : ru; }
  // Ссылка на страницу сайта с учётом языка: VX.href('cart.html') → 'cart.html' или '../kk/cart.html' из staff/.
  function href(file, opts) {
    var l = (opts && opts.lang) || lang;
    return root + (l === 'kk' ? 'kk/' : '') + file;
  }

  /* ---------- События ---------- */
  var listeners = {};
  function on(name, fn) {
    (listeners[name] = listeners[name] || []).push(fn);
    return function off() { listeners[name] = (listeners[name] || []).filter(function (f) { return f !== fn; }); };
  }
  function emit(name, data) {
    (listeners[name] || []).slice().forEach(function (fn) {
      try { fn(data); } catch (e) { if (window.console) console.error(e); }
    });
    try { document.dispatchEvent(new CustomEvent('vx:' + name, {detail: data})); } catch (e) {}
  }

  /* ---------- Формат ---------- */
  var NB = ' ';
  function num(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  }
  // Цена придумана — поэтому всегда в квадратных скобках.
  function fmt(n) { return '[' + num(n) + NB + '₸]'; }
  function digits(phone) { return String(phone || '').replace(/\D/g, '').slice(-10); }
  function phoneFmt(phone) {
    var d = digits(phone);
    if (d.length !== 10) return String(phone || '');
    return '+7 ' + d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6, 8) + ' ' + d.slice(8);
  }
  // Месяцы пишем сами: в Chrome локаль kk-KZ даёт «2026 M11 25» вместо названия месяца.
  var MONTHS = {
    ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    kk: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
  };
  function toDate(v) {
    if (v instanceof Date) return v;
    // '2026-11-20' — день без времени: читаем как местный, иначе на западе от UTC он съедет на день назад
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v);
  }
  // VX.date(iso) → «25 ноября» / «25 қараша»; год — если не текущий или {year: true};
  // время — VX.date(iso, true) или {time: true}: «25 ноября в 14:30» / «25 қараша, 14:30».
  function dateFmt(iso, opts) {
    var d = toDate(iso);
    if (isNaN(d)) return '';
    if (typeof opts !== 'object' || !opts) opts = {time: !!opts};
    var l = opts.lang || lang;
    var year = opts.year || d.getFullYear() !== new Date().getFullYear();
    var day = d.getDate() + ' ' + MONTHS[l][d.getMonth()];
    var s = l === 'kk' ? (year ? d.getFullYear() + ' ж. ' : '') + day : day + (year ? ' ' + d.getFullYear() : '');
    if (opts.time) s += (l === 'kk' ? ', ' : ' в ') + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return s;
  }
  function now() { return new Date().toISOString(); }
  function uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---------- Каталог ---------- */
  var products = CATALOG.map(function (p) {
    return {
      id: p.id, model: p.model, category: p.category,
      name: p.name, short: p.short,
      price: p.price, priceLabel: fmt(p.price), stock: p.stock,
      img: 'assets/media/' + p.id + '-main-sm.webp',
      url: 'p-' + p.id + '.html'
    };
  });
  function applyOverrides() {
    var over = read('catalog', {});
    products.forEach(function (p) {
      var base = CATALOG.filter(function (c) { return c.id === p.id; })[0];
      var o = over[p.id] || {};
      p.price = typeof o.price === 'number' ? o.price : base.price;
      p.stock = typeof o.stock === 'number' ? o.stock : base.stock;
      p.hidden = !!o.hidden;
      p.priceLabel = fmt(p.price);
    });
  }
  applyOverrides();
  function product(id) { for (var i = 0; i < products.length; i++) if (products[i].id === id) return products[i]; return null; }
  // Скрытый товар не показывается на витрине (каталог, поиск, подборки) и не кладётся в корзину.
  function isHidden(id) { var p = product(id); return !!(p && p.hidden); }
  var catalog = {
    get: product,
    categories: CATEGORIES,
    // Товары витрины — без скрытых. VX.products — все, для кабинета сотрудников.
    visible: function () { return products.filter(function (p) { return !p.hidden; }); },
    isHidden: isHidden,
    // Менеджер и директор меняют цену, остаток и показ на витрине:
    // VX.catalog.update('vacuum-a7', {price: 57990, stock: 5, hidden: false}, 'manager')
    update: function (id, data, by) {
      if (!product(id)) return null;
      data = data || {};
      var over = read('catalog', {});
      var o = over[id] || {};
      var wasHidden = !!o.hidden;
      var money = false;
      if (typeof data.price === 'number' && data.price >= 0) { o.price = Math.round(data.price); money = true; }
      if (typeof data.stock === 'number' && data.stock >= 0) { o.stock = Math.round(data.stock); money = true; }
      if (typeof data.hidden === 'boolean') { if (data.hidden) o.hidden = true; else delete o.hidden; }
      over[id] = o;
      write('catalog', over);
      applyOverrides();
      if (by && money) log.add({who: by, what: 'Изменил товар: цена ' + fmt(product(id).price) + ', остаток ' + product(id).stock, ref: id});
      if (by && wasHidden !== !!o.hidden) log.add({who: by, what: o.hidden ? 'Скрыл товар с витрины' : 'Вернул товар на витрину', ref: id});
      emit('product:changed', product(id));
      return product(id);
    },
    reset: function () { remove('catalog'); applyOverrides(); emit('product:changed', null); }
  };

  /* ---------- Корзина ---------- */
  function cartRead() {
    var raw = read('cart', []);
    if (!Array.isArray(raw)) return [];
    return raw.filter(function (i) { return i && product(i.id) && i.qty >= 1; })
      .map(function (i) { return {id: i.id, qty: Math.min(MAX_QTY, Math.floor(i.qty))}; });
  }
  function cartSave(items) {
    write('cart', items);
    emit('cart:changed', {items: clone(items), count: cart.count(), total: cart.total()});
  }
  var cart = {
    max: MAX_QTY,
    get: cartRead,
    add: function (id, qty) {
      if (!product(id) || isHidden(id)) return cartRead();
      qty = Math.max(1, Math.floor(qty == null ? 1 : qty));
      var items = cartRead();
      var row = items.filter(function (i) { return i.id === id; })[0];
      if (row) row.qty = Math.min(MAX_QTY, row.qty + qty); else items.push({id: id, qty: Math.min(MAX_QTY, qty)});
      cartSave(items);
      return items;
    },
    set: function (id, qty) {
      qty = Math.floor(Number(qty) || 0);
      if (qty <= 0) return cart.remove(id);
      var items = cartRead();
      var row = items.filter(function (i) { return i.id === id; })[0];
      if (row) row.qty = Math.min(MAX_QTY, qty); else if (product(id)) items.push({id: id, qty: Math.min(MAX_QTY, qty)});
      cartSave(items);
      return items;
    },
    remove: function (id) {
      var items = cartRead().filter(function (i) { return i.id !== id; });
      cartSave(items);
      return items;
    },
    clear: function () { cartSave([]); return []; },
    count: function () { return cartRead().reduce(function (s, i) { return s + i.qty; }, 0); },
    total: function () { return cartRead().reduce(function (s, i) { return s + i.qty * product(i.id).price; }, 0); },
    qty: function (id) { var r = cartRead().filter(function (i) { return i.id === id; })[0]; return r ? r.qty : 0; },
    // Для отрисовки: [{id, qty, product, sum}]
    lines: function () {
      return cartRead().map(function (i) { var p = product(i.id); return {id: i.id, qty: i.qty, product: p, sum: p.price * i.qty}; });
    }
  };

  /* ---------- Журнал ---------- */
  var log = {
    add: function (entry) {
      var list = read('log', []);
      var staffer = entry && entry.who ? staffById(entry.who) : null;
      var item = {
        id: uid('LOG-'), at: now(),
        who: entry && entry.who || 'system',
        whoName: staffer ? staffer.name : (entry && entry.whoName) || (entry && entry.who) || 'Система',
        what: entry && entry.what || '', ref: entry && entry.ref || ''
      };
      list.unshift(item);
      write('log', list.slice(0, 500));
      emit('log:added', item);
      return item;
    },
    list: function (filter) {
      var list = read('log', []);
      if (filter && filter.who) list = list.filter(function (i) { return i.who === filter.who; });
      if (filter && filter.ref) list = list.filter(function (i) { return i.ref === filter.ref; });
      return list;
    }
  };

  /* ---------- Заказы ---------- */
  function ordersRead() { var o = read('orders', []); return Array.isArray(o) ? o : []; }
  function ordersSave(list) { write('orders', list); }
  function newOrderNo(list) {
    var taken = {};
    list.forEach(function (o) { taken[o.no] = 1; });
    var no;
    do { no = 'VX-' + String(Math.floor(100000 + Math.random() * 900000)); } while (taken[no]);
    return no;
  }
  function normItems(items) {
    return (items || []).filter(function (i) { return i && product(i.id) && i.qty >= 1; }).map(function (i) {
      var p = product(i.id);
      return {id: i.id, model: p.model, name: clone(p.name), qty: Math.min(MAX_QTY, Math.floor(i.qty)),
        price: typeof i.price === 'number' ? i.price : p.price};
    });
  }
  var orders = {
    statuses: STATUSES.slice(),
    create: function (data) {
      data = data || {};
      var list = ordersRead();
      var items = normItems(data.items || cart.get());
      if (!items.length) return null;
      var c = data.customer || {};
      var at = data.createdAt || now();
      var by = data.by || 'customer';
      var order = {
        no: newOrderNo(list),
        createdAt: at,
        status: 'new',
        items: items,
        total: items.reduce(function (s, i) { return s + i.price * i.qty; }, 0),
        shipping: 0,
        customer: {name: c.name || '', phone: c.phone || '', city: c.city || '', address: c.address || '', comment: c.comment || ''},
        delivery: data.delivery || 'courier',
        payment: data.payment || 'cash',
        sellerId: data.sellerId || null,
        notes: [],
        history: [{status: 'new', at: at, by: by}],
        lang: data.lang || lang
      };
      order.shipping = terms.deliveryPrice(order.customer.city, order.total, order.delivery);
      list.unshift(order);
      ordersSave(list);
      emit('order:created', clone(order));
      return clone(order);
    },
    get: function (no) {
      no = String(no || '').trim().toUpperCase();
      return clone(ordersRead().filter(function (o) { return o.no === no; })[0] || null);
    },
    // Поиск для страницы «Статус заказа»: номер + телефон должны совпасть.
    lookup: function (no, phone) {
      var o = orders.get(no);
      return o && digits(o.customer.phone) === digits(phone) ? o : null;
    },
    // filter: {status, sellerId, phone, from, to, q} или функция
    list: function (filter) {
      var list = ordersRead();
      if (typeof filter === 'function') list = list.filter(filter);
      else if (filter) {
        if (filter.status) list = list.filter(function (o) { return o.status === filter.status; });
        if (filter.sellerId !== undefined) list = list.filter(function (o) { return o.sellerId === filter.sellerId; });
        if (filter.phone) list = list.filter(function (o) { return digits(o.customer.phone) === digits(filter.phone); });
        if (filter.from) list = list.filter(function (o) { return o.createdAt >= filter.from; });
        if (filter.to) list = list.filter(function (o) { return o.createdAt <= filter.to; });
        if (filter.q) {
          var q = String(filter.q).toLowerCase();
          list = list.filter(function (o) {
            return (o.no + ' ' + o.customer.name + ' ' + o.customer.phone + ' ' + o.customer.city).toLowerCase().indexOf(q) !== -1;
          });
        }
      }
      return list.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }).map(clone);
    },
    setStatus: function (no, status, by) {
      if (STATUSES.indexOf(status) === -1) return null;
      var list = ordersRead();
      var o = list.filter(function (x) { return x.no === String(no).toUpperCase(); })[0];
      if (!o || o.status === status) return o ? clone(o) : null;
      var from = o.status;
      o.status = status;
      o.history.push({status: status, at: now(), by: by || 'system'});
      ordersSave(list);
      if (by && by !== 'customer') log.add({who: by, what: 'Статус заказа: ' + STATUS_LABEL[from].ru + ' → ' + STATUS_LABEL[status].ru, ref: o.no});
      emit('order:status', {no: o.no, from: from, status: status, by: by});
      return clone(o);
    },
    assign: function (no, sellerId, by) {
      var list = ordersRead();
      var o = list.filter(function (x) { return x.no === String(no).toUpperCase(); })[0];
      if (!o) return null;
      o.sellerId = sellerId || null;
      ordersSave(list);
      var s = staffById(sellerId);
      log.add({who: by || (staff.current() || {}).id || 'system', what: 'Назначил продавца: ' + (s ? s.name : '—'), ref: o.no});
      emit('order:assigned', {no: o.no, sellerId: o.sellerId});
      return clone(o);
    },
    note: function (no, text, by) {
      var list = ordersRead();
      var o = list.filter(function (x) { return x.no === String(no).toUpperCase(); })[0];
      if (!o || !text) return null;
      var n = {text: String(text), at: now(), by: by || 'system'};
      o.notes.push(n);
      ordersSave(list);
      log.add({who: by || 'system', what: 'Комментарий к заказу', ref: o.no});
      emit('order:note', {no: o.no, note: n});
      return clone(o);
    }
  };

  /* ---------- Покупатель ---------- */
  function usersRead() {
    var users = read('users', {});
    Object.keys(users).forEach(function (k) { normUser(users[k]); });
    return users;
  }
  function currentKey() { return read('session', null); }
  // Адрес по частям: {id, city, street, house, flat, comment, main, address}.
  // address — строка целиком («ул. Абая, 10, кв. 5»): её читают оформление заказа и старые записи.
  function addressLine(a) {
    if (!a.street) return a.address || '';
    return a.street + (a.house ? ', ' + a.house : '') + (a.flat ? ', ' + t('кв. ', 'пәтер ') + a.flat : '');
  }
  function normAddress(a) {
    a = a || {};
    var s = function (v) { return typeof v === 'string' ? v.trim() : (v == null ? '' : String(v)); };
    var item = {id: a.id || uid('A-'), city: s(a.city), street: s(a.street), house: s(a.house), flat: s(a.flat),
      comment: s(a.comment), main: !!a.main, address: s(a.address)};
    item.address = addressLine(item);
    return item;
  }
  // Старые записи (адрес одной строкой, без языка и рассылки) дополняем на лету. Основной адрес всегда один и стоит первым.
  function normUser(u) {
    if (!u) return u;
    if (!Array.isArray(u.addresses)) u.addresses = [];
    if (!Array.isArray(u.devices)) u.devices = [];
    if (u.lang !== 'ru' && u.lang !== 'kk') u.lang = '';
    u.news = !!u.news;
    if (!Array.isArray(u.dismissed)) u.dismissed = [];
    var list = u.addresses.map(normAddress);
    var main = list.filter(function (a) { return a.main; })[0] || list[0];
    list.forEach(function (a) { a.main = a === main; });
    u.addresses = main ? [main].concat(list.filter(function (a) { return a !== main; })) : [];
    return u;
  }
  function userSave(users, key) {
    normUser(users[key]);
    write('users', users);
    emit('user:updated', clone(users[key]));
    return users[key];
  }
  var user = {
    demoCode: DEMO_CODE,
    checkCode: function (code) { return String(code || '').trim() === DEMO_CODE; },
    get: function () {
      var key = currentKey();
      if (!key) return null;
      return clone(usersRead()[key] || null);
    },
    // Демо-вход: телефон → код из SMS всегда [0000]. Код проверяйте через VX.user.checkCode(code).
    login: function (phone) {
      var key = digits(phone);
      if (key.length !== 10) return null;
      var users = usersRead();
      var fresh = !users[key];
      if (fresh) users[key] = normUser({phone: phoneFmt(key), name: '', email: '', city: '', lang: lang, news: false, createdAt: now(), addresses: [], devices: []});
      write('users', users);
      write('session', key);
      if (fresh) emit('user:registered', clone(users[key]));
      emit('user:login', clone(users[key]));
      return clone(users[key]);
    },
    logout: function () { remove('session'); emit('user:logout', null); },
    // VX.user.update({name, email, city, lang: 'ru'|'kk', news: true|false, dismissed: [...]})
    // news — согласие на рассылку; dismissed — скрытые подсказки кабинета.
    update: function (data) {
      var key = currentKey();
      if (!key) return null;
      var users = usersRead();
      var u = users[key];
      data = data || {};
      ['name', 'email', 'city'].forEach(function (f) { if (typeof data[f] === 'string') u[f] = data[f].trim(); });
      if (data.lang === 'ru' || data.lang === 'kk') u.lang = data.lang;
      if (typeof data.news === 'boolean') u.news = data.news;
      if (Array.isArray(data.dismissed)) u.dismissed = data.dismissed.map(String);
      return clone(userSave(users, key));
    },
    orders: function () { var u = user.get(); return u ? orders.list({phone: u.phone}) : []; },
    addresses: {
      // Основной адрес — первым, у него main: true
      get: function () { var u = user.get(); return u ? u.addresses : []; },
      main: function () { return user.addresses.get()[0] || null; },
      // {city, street, house, flat, comment, main} или по-старому {city, address, comment}. Первый адрес становится основным.
      add: function (a) {
        var key = currentKey(); if (!key) return null;
        var users = usersRead();
        var item = normAddress(Object.assign({}, a, {id: null}));
        if (item.main) users[key].addresses.forEach(function (x) { x.main = false; });
        users[key].addresses.push(item);
        userSave(users, key);
        return clone(item);
      },
      setMain: function (id) {
        var key = currentKey(); if (!key) return [];
        var users = usersRead();
        if (!users[key].addresses.some(function (a) { return a.id === id; })) return clone(users[key].addresses);
        users[key].addresses.forEach(function (a) { a.main = a.id === id; });
        return clone(userSave(users, key).addresses);
      },
      remove: function (id) {
        var key = currentKey(); if (!key) return [];
        var users = usersRead();
        users[key].addresses = users[key].addresses.filter(function (a) { return a.id !== id; });
        return clone(userSave(users, key).addresses);
      }
    },
    devices: {
      get: function () { var u = user.get(); return u ? u.devices : []; },
      // {id: 'vacuum-a7', serial: '[A7-000123]', date: '2026-11-20'} → гарантия до date + 12 мес.
      add: function (d) {
        var key = currentKey(); if (!key || !d || !product(d.id)) return null;
        var users = usersRead();
        var date = d.date || now().slice(0, 10);
        var until = new Date(date); until.setMonth(until.getMonth() + 12);
        var item = {uid: uid('D-'), id: d.id, serial: d.serial || '', date: date, warrantyUntil: isNaN(until) ? '' : until.toISOString().slice(0, 10)};
        users[key].devices.push(item);
        write('users', users);
        emit('user:updated', clone(users[key]));
        return item;
      },
      remove: function (uidValue) {
        var key = currentKey(); if (!key) return [];
        var users = usersRead();
        users[key].devices = users[key].devices.filter(function (d) { return d.uid !== uidValue; });
        write('users', users);
        return users[key].devices;
      }
    }
  };

  /* ---------- Сотрудники ---------- */
  function staffById(id) { for (var i = 0; i < STAFF.length; i++) if (STAFF[i].id === id) return STAFF[i]; return null; }
  // Роль можно сменить (демо): поверх базовой из STAFF лежит {id: role} под ключом roles.
  function roleOf(s) { var r = read('roles', {})[s.id]; return PERMS[r] ? r : s.role; }
  function staffView(s) {
    var role = roleOf(s);
    return {id: s.id, name: s.name, role: role, baseRole: s.role, roleLabel: ROLE_LABEL[role]};
  }
  var staff = {
    roles: ROLE_LABEL,
    perms: PERMS,
    list: function () { return STAFF.map(staffView); },
    get: function (id) { var s = staffById(id); return s ? staffView(s) : null; },
    // VX.staff.setRole('seller-erlan', 'manager', 'director') — только у кого есть право team; свою роль сменить нельзя.
    setRole: function (id, role, by) {
      var s = staffById(id);
      by = by || (staff.current() || {}).id;
      if (!s || !PERMS[role] || !by || by === id || !staff.can('team', by)) return null;
      var from = roleOf(s);
      if (from === role) return staff.get(id);
      var map = read('roles', {});
      if (role === s.role) delete map[id]; else map[id] = role;
      write('roles', map);
      log.add({who: by, what: 'Сменил роль: ' + s.name + ' ' + ROLE_LABEL[from] + ' → ' + ROLE_LABEL[role], ref: id});
      emit('staff:role', {id: id, from: from, role: role, by: by});
      return staff.get(id);
    },
    login: function (id) {
      var s = staffById(id); if (!s) return null;
      write('staff', id);
      log.add({who: id, what: 'Вход в кабинет'});
      emit('staff:login', staff.get(id));
      return staff.get(id);
    },
    current: function () { var id = read('staff', null); return id ? staff.get(id) : null; },
    logout: function () {
      var c = staff.current();
      if (c) log.add({who: c.id, what: 'Выход из кабинета'});
      remove('staff');
      emit('staff:logout', null);
    },
    // VX.staff.can('reports') — есть ли у текущего сотрудника доступ к разделу
    can: function (perm, who) {
      var s = who ? staff.get(who) : staff.current();
      return !!s && PERMS[s.role].indexOf(perm) !== -1;
    }
  };

  /* ---------- Заявки ---------- */
  // Заявка: {id, at, kind: 'service'|'question'|'order', name, phone, product, message, consent, orderRef, orderNo, lang, status, sellerId}
  // orderRef — номер заказа, который покупатель указал сам (сервис по заказу); orderNo — заказ, созданный из заявки в кабинете.
  function leadsRead() {
    var list = read('leads', []);
    if (!Array.isArray(list)) return [];
    list.forEach(function (l) {
      if (!LEAD_KIND_LABEL[l.kind]) l.kind = 'question';
      l.consent = !!l.consent; l.orderRef = l.orderRef || ''; l.orderNo = l.orderNo || ''; l.lang = l.lang || 'ru';
    });
    return list;
  }
  var leads = {
    kinds: LEAD_KIND_LABEL,
    statuses: LEAD_STATUS_LABEL,
    create: function (data) {
      data = data || {};
      var list = leadsRead();
      var item = {id: 'L-' + String(Math.floor(1000 + Math.random() * 9000)) + String(list.length + 1),
        at: data.at || now(), kind: LEAD_KIND_LABEL[data.kind] ? data.kind : 'question',
        name: data.name || '', phone: data.phone || '', product: data.product || '',
        message: data.message || '', consent: !!data.consent, orderRef: data.orderRef || '', orderNo: data.orderNo || '',
        lang: data.lang || lang, status: data.status || 'new', sellerId: data.sellerId || null};
      list.unshift(item);
      write('leads', list);
      emit('lead:created', clone(item));
      return clone(item);
    },
    get: function (id) { return clone(leadsRead().filter(function (l) { return l.id === id; })[0] || null); },
    list: function (filter) {
      var list = leadsRead();
      if (filter && filter.status) list = list.filter(function (l) { return l.status === filter.status; });
      if (filter && filter.kind) list = list.filter(function (l) { return l.kind === filter.kind; });
      return list.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    },
    // 'new' → 'in-progress' → 'done'
    setStatus: function (id, status, by) {
      if (!LEAD_STATUS_LABEL[status]) return null;
      var list = leadsRead();
      var l = list.filter(function (x) { return x.id === id; })[0];
      if (!l) return null;
      l.status = status;
      if (by) l.sellerId = l.sellerId || by;
      write('leads', list);
      if (by) log.add({who: by, what: LEAD_STATUS_LOG[status], ref: id});
      emit('lead:status', {id: id, status: status});
      return clone(l);
    },
    // Заявка стала заказом: VX.leads.link('L-…', 'VX-123456', 'manager')
    link: function (id, orderNo, by) {
      var list = leadsRead();
      var l = list.filter(function (x) { return x.id === id; })[0];
      if (!l || !orderNo) return null;
      l.orderNo = String(orderNo).toUpperCase();
      write('leads', list);
      log.add({who: by || 'system', what: 'Заявка переведена в заказ ' + l.orderNo, ref: id});
      emit('lead:linked', {id: id, orderNo: l.orderNo});
      return clone(l);
    }
  };

  /* ---------- Демо-данные ---------- */
  function seed(force) {
    if (!force && read('seeded', false)) return false;
    var day = 864e5;
    var t0 = Date.now();
    var people = [
      ['[Асель М.]', '[+7 701 000 00 11]', '[Алматы]', '[ул. Абая, 10, кв. 5]'],
      ['[Нуржан Е.]', '[+7 702 000 00 12]', '[Астана]', '[пр. Мангилик Ел, 25]'],
      ['[Мария П.]', '[+7 705 000 00 13]', '[Алматы]', '[мкр. Самал-2, 33]'],
      ['[Бауыржан К.]', '[+7 707 000 00 14]', '[Шымкент]', '[ул. Тауке хана, 4]'],
      ['[Динара С.]', '[+7 708 000 00 15]', '[Караганда]', '[ул. Ерубаева, 18]'],
      ['[Олег В.]', '[+7 747 000 00 16]', '[Алматы]', '[ул. Розыбакиева, 77]'],
      ['[Жанна Т.]', '[+7 771 000 00 17]', '[Астана]', '[ул. Сыганак, 9]'],
      ['[Руслан А.]', '[+7 775 000 00 18]', '[Актобе]', '[пр. Абилкайыр хана, 50]'],
      ['[Камила Р.]', '[+7 776 000 00 19]', '[Алматы]', '[ул. Жандосова, 2]'],
      ['[Ербол Ж.]', '[+7 778 000 00 20]', '[Павлодар]', '[ул. Торайгырова, 61]']
    ];
    var plan = [
      [0.2, 'new', null, [['kettle-kegs5803', 1]]],
      [0.6, 'new', null, [['dryer-hcd1002', 1], ['lint-ar008', 1]]],
      [1.3, 'confirmed', 'seller-aliya', [['vacuum-a7', 1]]],
      [2.4, 'confirmed', 'seller-erlan', [['humidifier-t2215', 2]]],
      [3.5, 'paid', 'seller-aliya', [['blender-hb003b', 1], ['pump-mkn-csq818', 2]]],
      [5.1, 'paid', 'seller-erlan', [['fan-ss056', 3]]],
      [6.8, 'shipped', 'seller-aliya', [['car-vacuum-a2', 1]]],
      [8.9, 'delivered', 'seller-erlan', [['clothes-dryer-cpcd2', 1], ['lint-ar008', 2]]],
      [11.2, 'delivered', 'seller-aliya', [['humidifier-t606', 1]]],
      [13.4, 'cancelled', 'seller-erlan', [['dryer-hcd1002', 1]]]
    ];
    var list = [];
    plan.forEach(function (row, i) {
      var created = new Date(t0 - row[0] * day).toISOString();
      var items = normItems(row[3].map(function (x) { return {id: x[0], qty: x[1]}; }));
      var flow = row[1] === 'cancelled' ? ['new', 'cancelled'] : STATUSES.slice(0, STATUSES.indexOf(row[1]) + 1);
      var history = flow.map(function (s, k) {
        return {status: s, at: new Date(Date.parse(created) + k * 0.4 * day * Math.min(1, row[0] / 3 + 0.2)).toISOString(), by: k === 0 ? 'customer' : (row[2] || 'manager')};
      });
      var p = people[i];
      list.push({
        no: newOrderNo(list), createdAt: created, status: row[1], items: items,
        total: items.reduce(function (s, it) { return s + it.price * it.qty; }, 0),
        customer: {name: p[0], phone: p[1], city: p[2], address: p[3], comment: ''},
        delivery: i % 3 === 2 ? 'pickup' : 'courier', payment: i % 2 ? 'card' : 'cash',
        sellerId: row[2], notes: [], history: history, lang: 'ru', demo: true
      });
    });
    ordersSave(list.concat(force ? [] : ordersRead().filter(function (o) { return !o.demo; })));
    var demoLeads = [
      {at: new Date(t0 - 0.1 * day).toISOString(), name: '[Гульнара Б.]', phone: '[+7 701 000 00 31]', product: 'humidifier-t2215', kind: 'question', consent: true, message: '[Подойдёт ли для детской 18 м²?]'},
      {at: new Date(t0 - 1.7 * day).toISOString(), name: '[Тимур Н.]', phone: '[+7 705 000 00 32]', product: 'vacuum-a7', kind: 'question', consent: true, message: '[Есть ли запасной аккумулятор?]', status: 'in-progress', sellerId: 'seller-aliya'},
      {at: new Date(t0 - 4.2 * day).toISOString(), name: '[Сауле К.]', phone: '[+7 707 000 00 33]', product: 'dryer-hcd1002', kind: 'order', consent: true, message: '[Хочу купить в подарок, нужна коробка]', status: 'done', sellerId: 'seller-erlan'},
      {at: new Date(t0 - 9.6 * day).toISOString(), name: '[Артём Л.]', phone: '[+7 777 000 00 34]', product: '', kind: 'order', consent: true, message: '[Оптовая закупка для офиса]'}
    ];
    write('leads', []);
    demoLeads.forEach(function (l) { leads.create(Object.assign({lang: 'ru'}, l)); });
    write('seeded', true);
    return true;
  }
  // Полный сброс демо: VX.reset() — очищает всё и заново кладёт демо-данные.
  function reset() {
    ['cart', 'orders', 'users', 'session', 'staff', 'log', 'leads', 'catalog', 'roles', 'seeded'].forEach(remove);
    applyOverrides();
    seed(true);
    emit('cart:changed', {items: [], count: 0, total: 0});
  }

  /* ---------- Перенос данных из обходов прошлой версии (один раз) ----------
   * 1) Кабинет покупателя держал основной адрес, язык и рассылку под ключом vx.v1.account — переносим в users.
   * 2) Кабинет сотрудников хранил смену роли, скрытие товара и связь «заявка → заказ» записями журнала — переносим в данные. */
  function migrate() {
    var old = read('account', null);
    if (old && typeof old === 'object') {
      var users = usersRead();
      Object.keys(old).forEach(function (k) {
        var u = users[k], p = old[k] || {};
        if (!u) return;
        if ((p.lang === 'ru' || p.lang === 'kk') && !u.lang) u.lang = p.lang;
        if (typeof p.news === 'boolean') u.news = u.news || p.news;
        if (Array.isArray(p.dismissed) && !u.dismissed.length) u.dismissed = p.dismissed.slice();
        if (p.primary && u.addresses.some(function (a) { return a.id === p.primary; })) u.addresses.forEach(function (a) { a.main = a.id === p.primary; });
        normUser(u);
      });
      write('users', users);
      remove('account');
    }
    if (read('migrated', 0) >= 1) return;
    var entries = log.list().slice().reverse();   // от старых к новым — побеждает последняя запись
    var roles = read('roles', {}), over = read('catalog', {}), leadList = leadsRead(), byLabel = {};
    Object.keys(ROLE_LABEL).forEach(function (r) { byLabel[ROLE_LABEL[r]] = r; });
    entries.forEach(function (e) {
      var what = String(e.what || '');
      if (what.indexOf('Сменил роль: ') === 0 && staffById(e.ref)) {
        var to = byLabel[what.split('→').pop().trim()];
        if (to) { if (to === staffById(e.ref).role) delete roles[e.ref]; else roles[e.ref] = to; }
      } else if ((what === 'Скрыл товар с витрины' || what === 'Вернул товар на витрину') && product(e.ref)) {
        over[e.ref] = over[e.ref] || {};
        if (what[0] === 'С') over[e.ref].hidden = true; else delete over[e.ref].hidden;
      } else if (what.indexOf('Заявка переведена в заказ ') === 0) {
        leadList.forEach(function (l) { if (l.id === e.ref && !l.orderNo) l.orderNo = what.split(' ').pop(); });
      }
    });
    write('roles', roles);
    write('catalog', over);
    write('leads', leadList);
    write('migrated', 1);
    applyOverrides();
  }

  // Изменения из другой вкладки
  window.addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf(PREFIX) !== 0) return;
    var key = e.key.slice(PREFIX.length);
    if (key === 'cart') emit('cart:changed', {items: cart.get(), count: cart.count(), total: cart.total()});
    if (key === 'catalog') { applyOverrides(); emit('product:changed', null); }
  });

  /* ---------- Условия: доставка, самовывоз, звонок, гарантия, возврат — ОДНО место ----------
   * Все значения придуманы, поэтому в [квадратных скобках]. Страницы берут их отсюда:
   *   - элементы с data-term="ключ" заполняются скриптом при загрузке (VX.terms.apply), текст в разметке — запасной;
   *   - checkout.js (цена доставки по городу и сумме), order.js (звонок, срок, строка «Доставка»), cart.js;
   *   - генератор (build/site.py: строка условий под «Купить», строка «Доставка» в корзине) пишет те же значения
   *     как запасной текст с data-term.
   * Страницы, где значения повторены текстом (меняя условия, поправьте и их):
   *   delivery.html, contacts.html, support.html, warranty.html, about.html, account.html, offer.html (+ копии в kk/),
   *   checkout.html (+ kk), build/site.py (terms(), cart()).
   * Ключи data-term: callback, hours, warranty, returnDays, refundDays, freeFrom, shortDays, pickupHours,
   *   pickupStorage, pickupReady, и по городам: zone.almaty.days / zone.almaty.price (almaty, astana, shymkent, big, other). */
  var ZONES = {
    almaty:   {days: ['[1–2 дня]', '[1–2 күн]'], price: 1500, cities: ['Алматы']},
    astana:   {days: ['[2–3 дня]', '[2–3 күн]'], price: 2000, cities: ['Астана']},
    shymkent: {days: ['[2–3 дня]', '[2–3 күн]'], price: 2000, cities: ['Шымкент']},
    big:      {days: ['[2–4 дня]', '[2–4 күн]'], price: 2500, cities: ['Караганда', 'Актобе', 'Атырау', 'Павлодар']},
    other:    {days: ['[4–7 дней]', '[4–7 күн]'], price: 3000, cities: []}
  };
  var TERM_TEXT = {
    callback:      ['[15 минут]', '[15 минут]'],
    hours:         ['[9:00–21:00]', '[9:00–21:00]'],
    warranty:      ['[12 месяцев]', '[12 ай]'],
    returnDays:    ['[14 дней]', '[14 күн]'],
    refundDays:    ['[10 дней]', '[10 күн]'],
    shortDays:     ['[1–7 дней]', '[1–7 күн]'],           // «Купить»: от самой быстрой зоны до самой долгой
    pickupHours:   ['[Пн–Сб, 10:00–19:00]', '[Дс–Сб, 10:00–19:00]'],
    pickupStorage: ['[3 дня]', '[3 күн]'],
    pickupReady:   ['[на следующий день]', '[келесі күні]'],
    pickupFree:    ['[бесплатно]', '[тегін]'],
    free:          ['[бесплатно]', '[тегін]'],
    cityFirst:     ['[зависит от города]', '[қалаға байланысты]']
  };
  var FREE_FROM = 50000;
  function zoneOf(city) {
    var c = String(city || '').trim().toLowerCase();
    if (!c) return null;
    for (var k in ZONES) {
      if (ZONES[k].cities.some(function (x) { return x.toLowerCase() === c; })) return k;
    }
    return 'other';
  }
  var terms = {
    zones: ZONES,
    freeFromAmount: FREE_FROM,
    zoneOf: zoneOf,
    // Цена доставки: число (0 — бесплатно). Самовывоз и сумма от порога — 0. Город не выбран — 0.
    deliveryPrice: function (city, total, method) {
      if (method === 'pickup') return 0;
      var z = zoneOf(city);
      if (!z || Number(total) >= FREE_FROM) return 0;
      return ZONES[z].price;
    },
    // Срок по городу (текст в скобках) или пусто
    deliveryDays: function (city, method, l) {
      var i = (l || lang) === 'kk' ? 1 : 0;
      if (method === 'pickup') return TERM_TEXT.pickupReady[i];
      var z = zoneOf(city);
      return z ? ZONES[z].days[i] : TERM_TEXT.shortDays[i];
    },
    // Подпись цены: «[бесплатно]», «[1 500 ₸]» или, если город ещё не выбран, «[зависит от города]»
    deliveryLabel: function (city, total, method, l) {
      var i = (l || lang) === 'kk' ? 1 : 0;
      if (method !== 'pickup' && !zoneOf(city)) return TERM_TEXT.cityFirst[i];
      var p = terms.deliveryPrice(city, total, method);
      return p ? fmt(p) : TERM_TEXT.free[i];
    },
    text: function (key, l) {
      var i = (l || lang) === 'kk' ? 1 : 0;
      var m = /^zone\.(\w+)\.(days|price)$/.exec(key);
      if (m && ZONES[m[1]]) return m[2] === 'days' ? ZONES[m[1]].days[i] : fmt(ZONES[m[1]].price);
      if (key === 'freeFrom') return fmt(FREE_FROM);
      return TERM_TEXT[key] ? TERM_TEXT[key][i] : '';
    },
    // Подставить значения в элементы data-term внутри root (по умолчанию — вся страница)
    apply: function (rootEl) {
      var nodes = (rootEl || document).querySelectorAll('[data-term]');
      for (var n = 0; n < nodes.length; n++) {
        var v = terms.text(nodes[n].getAttribute('data-term'));
        if (v) nodes[n].textContent = v;
      }
    }
  };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { terms.apply(); });
    else terms.apply();
  }

  window.VX = {
    version: '1.1',
    terms: terms,
    lang: lang,
    root: root,
    t: t,
    href: href,
    asset: function (path) { return root + path; },
    products: products,              // все товары (кабинет сотрудников); витрине — VX.catalog.visible()
    product: product,
    catalog: catalog,
    months: MONTHS,
    category: function (key) { return CATEGORIES[key] ? CATEGORIES[key][lang] : key; },
    fmt: fmt,
    num: num,
    phone: phoneFmt,
    digits: digits,
    date: dateFmt,
    cart: cart,
    orders: orders,
    statuses: STATUSES.slice(),
    statusLabel: STATUS_LABEL,
    status: function (s, l) { return STATUS_LABEL[s] ? STATUS_LABEL[s][l || lang] : s; },
    paymentLabel: PAYMENT_LABEL,
    payment: function (p, l) { return PAYMENT_LABEL[p] ? PAYMENT_LABEL[p][l || lang] : (p || ''); },
    user: user,
    staff: staff,
    log: log,
    leads: leads,
    on: on,
    emit: emit,
    seed: seed,
    reset: reset,
    storage: ls ? 'localStorage' : 'memory'
  };

  seed();
  migrate();
})();
