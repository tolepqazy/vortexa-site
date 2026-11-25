/*
 * Vortexa v7 — общая шапка, подвал, поиск и меню.
 * Вставляет разметку в <div data-shell="header"></div> и <div data-shell="footer"></div>.
 * Подключать после store.js: site.css → ui.css → store.js → shell.js → свой скрипт (все с defer).
 * Пути считаются от src этого скрипта, поэтому работают из корня, из kk/ и из staff/.
 * Наружу: window.VXShell = {open(name), close(name), notify(text, link)}.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  var src = script && script.getAttribute('src') || 'assets/shell.js';
  var root = src.replace(/assets\/shell\.js.*$/, '');           // путь к корню сайта: '', '../'
  var kk = document.documentElement.lang === 'kk';
  var staffArea = !kk && root !== '';                           // страницы в staff/ — только русский
  var base = kk ? '' : root;                                    // где лежат страницы этого языка
  var t = function (ru, kz) { return kk ? kz : ru; };
  var VX = window.VX || null;
  var here = (location.pathname.split('/').pop() || 'index.html');

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; });
  }

  var ICON = {
    search: '<circle cx="10.5" cy="10.5" r="6.6"/><path d="m15.5 15.5 4.8 4.8"/>',
    bag: '<path d="M4.5 7.5h15l.8 13h-16l.7-13Z"/><path d="M8.5 9V6a3.5 3.5 0 0 1 7 0v3"/>',
    user: '<circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20.2c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6"/>',
    menu: '<path d="M3.5 8h17M3.5 16h17"/>',
    close: '<path d="m5.5 5.5 13 13m0-13-13 13"/>',
    arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>'
  };
  function icon(name) {
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">' + ICON[name] + '</svg>';
  }

  var CATS = [
    ['kitchen', 'Кухня', 'Асүй'],
    ['climate', 'Климат', 'Климат'],
    ['cleaning', 'Уборка', 'Үй жинау'],
    ['beauty', 'Красота', 'Шаш күтімі'],
    ['clothes', 'Уход за одеждой', 'Киім күтімі']
  ];

  function page(file) { return base + file; }
  function cur(file) { return here === file ? ' aria-current="page"' : ''; }

  function navLinks(full) {
    var list = full ? CATS : CATS.slice(0, 4);
    return '<a href="' + page('index.html#catalog') + '">' + t('Каталог', 'Каталог') + '</a>' +
      list.map(function (c) { return '<a href="' + page('index.html?cat=' + c[0] + '#catalog') + '">' + esc(t(c[1], c[2])) + '</a>'; }).join('');
  }

  function altHref() {
    var file = here || 'index.html';
    return (kk ? '../' : 'kk/') + file + location.search + location.hash;
  }
  function locale() {
    if (staffArea) return '';
    var ru = kk ? '<a href="' + esc(altHref()) + '" hreflang="ru" lang="ru" data-locale aria-label="На русском языке">RU</a>' : '<span aria-current="true">RU</span>';
    var kz = kk ? '<span aria-current="true">ҚАЗ</span>' : '<a href="' + esc(altHref()) + '" hreflang="kk" lang="kk" data-locale aria-label="Қазақ тілінде">ҚАЗ</a>';
    return '<span class="locale">' + ru + '<span aria-hidden="true">/</span>' + kz + '</span>';
  }

  function logo(cls) {
    return '<a class="brand' + (cls ? ' ' + cls : '') + '" href="' + page('index.html') + '" aria-label="' + t('Vortexa — главная', 'Vortexa — басты бет') + '"><img src="' + root + 'assets/wordmark.svg" width="235" height="27" alt="Vortexa"></a>';
  }

  function header() {
    var user = VX && VX.user && VX.user.get();
    var acc = user ? t('Личный кабинет', 'Жеке кабинет') : t('Войти', 'Кіру');
    return '<a class="skip" href="#main">' + t('К содержанию', 'Мазмұнға өту') + '</a>' +
      '<header class="site-header"><div class="header-inner">' + logo() +
      '<nav class="main-nav" aria-label="' + t('Главное меню', 'Бас мәзір') + '">' + navLinks(false) + '</nav>' +
      '<div class="header-end">' + locale() + '<div class="header-tools">' +
      '<button type="button" class="icon-btn" data-open="search" aria-label="' + t('Поиск по каталогу', 'Каталогтан іздеу') + '" title="' + t('Поиск', 'Іздеу') + '">' + icon('search') + '</button>' +
      '<a class="icon-btn account-link' + (user ? ' is-in' : '') + '" href="' + page('account.html') + '" aria-label="' + acc + '" title="' + acc + '"' + cur('account.html') + '>' + icon('user') + '</a>' +
      '<a class="cart-link" href="' + page('cart.html') + '" aria-label="' + t('Корзина', 'Себет') + '" data-cart-link' + cur('cart.html') + '>' + icon('bag') + '<span class="cart-count" data-count hidden>0</span></a>' +
      '<button type="button" class="icon-btn menu-btn" data-open="menu" aria-label="' + t('Открыть меню', 'Мәзірді ашу') + '">' + icon('menu') + '</button>' +
      '</div></div></div></header>';
  }

  function footer() {
    var col = function (title, links) {
      return '<div class="foot-col"><h2>' + title + '</h2><ul>' + links.map(function (l) {
        return '<li><a href="' + l[0] + '">' + l[1] + '</a></li>';
      }).join('') + '</ul></div>';
    };
    var catalog = [[page('index.html#catalog'), t('Все модели', 'Барлық модельдер')]].concat(CATS.map(function (c) {
      return [page('index.html?cat=' + c[0] + '#catalog'), esc(t(c[1], c[2]))];
    })).concat([[page('compare.html'), t('Сравнить увлажнители', 'Ылғалдандырғыштарды салыстыру')]]);
    var buyers = [
      [page('delivery.html'), t('Доставка и оплата', 'Жеткізу және төлем')],
      [page('warranty.html'), t('Гарантия и сервис', 'Кепілдік және сервис')],
      [page('track.html'), t('Статус заказа', 'Тапсырыс күйі')],
      [page('support.html'), t('Поддержка', 'Қолдау')],
      [page('account.html'), t('Личный кабинет', 'Жеке кабинет')]
    ];
    var brand = [
      [page('about.html'), t('О бренде', 'Бренд туралы')],
      [page('contacts.html'), t('Контакты', 'Байланыс')],
      [page('offer.html'), t('Оферта', 'Оферта')],
      [page('privacy.html'), t('Политика данных', 'Деректер саясаты')]
    ];
    return '<footer class="footer"><div class="footer-inner">' +
      '<div class="footer-grid">' +
      col(t('Каталог', 'Каталог'), catalog) +
      col(t('Покупателям', 'Сатып алушыларға'), buyers) +
      col('Vortexa', brand) +
      '<div class="foot-col foot-contact"><h2>' + t('Связаться', 'Байланысу') + '</h2>' +
      '<p><a href="tel:+77000000000">[+7 700 000 00 00]</a></p>' +
      '<p class="foot-muted">' + t('[Ежедневно, 9:00–21:00]', '[Күн сайын, 9:00–21:00]') + '</p>' +
      '<p class="foot-muted">' + t('Казахстан, доставка [по всей стране]', 'Қазақстан, жеткізу [бүкіл ел бойынша]') + '</p></div>' +
      '</div>' + logo('foot-brand') +
      '<div class="footer-base"><span>© 2026 Vortexa</span>' + locale() +
      '<a class="staff-link" href="' + root + 'staff/index.html">' + t('Для сотрудников', 'Қызметкерлерге') + '</a></div>' +
      '</div></footer>';
  }

  function dialogs() {
    var close = '<button class="icon-btn" type="button" data-close aria-label="' + t('Закрыть', 'Жабу') + '">' + icon('close') + '</button>';
    var html = '';
    if (!document.getElementById('dialog-search')) {
      html += '<dialog class="search-dialog" id="dialog-search" aria-labelledby="search-title"><div class="dialog-head"><h2 id="search-title">' + t('Поиск по каталогу', 'Каталогтан іздеу') + '</h2>' + close + '</div>' +
        '<div class="search-line">' + icon('search') + '<input type="search" id="query" autocomplete="off" placeholder="' + t('Название или модель', 'Атауы немесе моделі') + '" aria-labelledby="search-title"></div>' +
        '<p id="search-status" class="search-status" aria-live="polite"></p><div id="search-results" class="search-results"></div></dialog>';
    }
    if (!document.getElementById('dialog-menu')) {
      html += '<dialog class="menu-dialog" id="dialog-menu" aria-labelledby="menutitle"><div class="dialog-head"><h2 id="menutitle">' + t('Меню', 'Мәзір') + '</h2>' + close + '</div><nav>' +
        navLinks(true) + '<a href="' + page('compare.html') + '">' + t('Сравнить увлажнители', 'Ылғалдандырғыштарды салыстыру') + '</a>' +
        '<a href="' + page('cart.html') + '">' + t('Корзина', 'Себет') + '</a><a href="' + page('account.html') + '">' + t('Личный кабинет', 'Жеке кабинет') + '</a>' +
        '<a href="' + page('track.html') + '">' + t('Статус заказа', 'Тапсырыс күйі') + '</a></nav>' + locale() + '</dialog>';
    }
    if (!document.getElementById('notice')) html += '<div class="toast" id="notice" role="status" aria-live="polite"></div>';
    return html;
  }

  /* ---------- Вставка ---------- */
  var headSlot = document.querySelector('[data-shell="header"]');
  var footSlot = document.querySelector('[data-shell="footer"]');
  if (headSlot) headSlot.outerHTML = header();
  if (footSlot) footSlot.outerHTML = footer();
  document.body.insertAdjacentHTML('beforeend', dialogs());

  /* ---------- Счётчик корзины ---------- */
  function renderCount(bump) {
    if (!VX) return;
    var n = VX.cart.count();
    Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (b) {
      b.hidden = !n;
      b.textContent = String(n);
      if (bump && n) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-cart-link]'), function (a) {
      a.setAttribute('aria-label', t('Корзина', 'Себет') + (n ? ', ' + n + t(' шт.', ' дана') : ''));
    });
  }
  renderCount(false);
  if (VX) VX.on('cart:changed', function () { renderCount(true); });
  window.addEventListener('pageshow', function () { renderCount(false); });

  /* ---------- Диалоги ---------- */
  function open(name) {
    var d = document.getElementById('dialog-' + name);
    if (!d || d.open || typeof d.showModal !== 'function') return;
    d.showModal();
    if (name === 'search') {
      var q = document.getElementById('query');
      q.value = '';
      renderSearch();
      q.focus();
    }
  }
  function close(name) {
    var d = document.getElementById('dialog-' + name);
    if (d && d.open) d.close();
  }
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open]');
    if (opener && opener.tagName === 'BUTTON') { open(opener.getAttribute('data-open')); return; }
    var closer = e.target.closest('[data-close]');
    if (closer) { var dl = closer.closest('dialog'); if (dl) dl.close(); return; }
    var menuLink = e.target.closest('#dialog-menu a');
    if (menuLink) menuLink.closest('dialog').close();
  });
  Array.prototype.forEach.call(document.querySelectorAll('dialog'), function (d) {
    d.addEventListener('click', function (e) {
      if (e.target !== d) return;
      var b = d.getBoundingClientRect();
      if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) d.close();
    });
  });
  document.addEventListener('keydown', function (e) {
    var typing = e.target.matches && e.target.matches('input,textarea,select,[contenteditable="true"]');
    if (((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      open('search');
    }
  });
  // Переключатель языка сохраняет фильтр каталога и якорь
  document.addEventListener('click', function (e) {
    var l = e.target.closest('a[data-locale]');
    if (l) l.setAttribute('href', altHref());
  }, true);

  /* ---------- Поиск ---------- */
  function normal(v) { return String(v).toLocaleLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ''); }
  function modelCount(n) {
    if (kk) return n + ' модель';
    var f = 'моделей';
    if (n % 10 === 1 && n % 100 !== 11) f = 'модель';
    else if ([2, 3, 4].indexOf(n % 10) !== -1 && [12, 13, 14].indexOf(n % 100) === -1) f = 'модели';
    return n + ' ' + f;
  }
  function renderSearch() {
    var input = document.getElementById('query');
    if (!input || !VX) return;
    var words = input.value.trim().split(/\s+/).map(normal).filter(Boolean);
    var lang = kk ? 'kk' : 'ru';
    var found = VX.catalog.visible().filter(function (p) {   // скрытые товары в поиске не показываем
      var text = normal([p.name.ru, p.name.kk, p.model, p.short.ru, p.short.kk, VX.catalog.categories[p.category].ru, VX.catalog.categories[p.category].kk].join(' '));
      return words.every(function (w) { return text.indexOf(w) !== -1; });
    });
    document.getElementById('search-status').textContent = found.length ? modelCount(found.length) :
      t('Ничего не найдено. Попробуйте часть названия.', 'Ештеңе табылмады. Атауының бір бөлігін енгізіп көріңіз.');
    document.getElementById('search-results').innerHTML = found.map(function (p) {
      return '<a class="search-row" href="' + page(p.url) + '"><span class="search-thumb"><img src="' + root + p.img + '" alt="" loading="lazy"></span>' +
        '<span class="search-text"><strong>' + esc(p.name[lang]) + '</strong><span class="model">' + esc(VX.catalog.categories[p.category][lang]) + '</span></span>' +
        '<span class="search-price price">' + p.priceLabel + '</span></a>';
    }).join('');
  }
  var qInput = document.getElementById('query');
  if (qInput) {
    qInput.addEventListener('input', renderSearch);
    qInput.addEventListener('keydown', function (e) {
      var first = document.querySelector('.search-row');
      if (e.key === 'Enter' && first) { e.preventDefault(); first.click(); }
      if (e.key === 'ArrowDown' && first) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- Короткое сообщение внизу экрана ---------- */
  var toastTimer;
  function notify(text, link) {
    var box = document.getElementById('notice');
    if (!box) return;
    box.innerHTML = '';
    box.appendChild(document.createTextNode(text));
    if (link) {
      var a = document.createElement('a');
      a.href = link.href; a.textContent = link.text;
      box.appendChild(a);
    }
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.classList.remove('show'); }, 3200);
  }

  window.VXShell = {open: open, close: close, notify: notify, root: root, base: base, page: page, icon: icon};
})();
