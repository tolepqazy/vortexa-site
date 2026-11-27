/*
 * Vortexa v7 — общий слой движения (пара к motion.css). Подключается последним в <head> БЕЗ defer на всех страницах
 * (до первой отрисовки ставит класс .mo и перехватчик перехода); остальное запускает на DOMContentLoaded, после store.js и shell.js.
 * Без библиотек: IntersectionObserver для появления, requestAnimationFrame для прокрутки.
 * Контент без JS виден всегда: скрываются только блоки ниже первого экрана и только после того, как этот скрипт
 * поставил класс .mo на <html>. prefers-reduced-motion: reduce — ничего не скрывается и не двигается.
 * Слушает события VX (cart:changed, order:status, lead:status); чужой код не меняет.
 */
(function () {
  'use strict';

  var doc = document;
  var html = doc.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false, addEventListener: function () {} };
  var reduced = mq.matches;
  var VX = null;                                   // store.js подключён с defer — берём VX при запуске (DOMContentLoaded)

  // Переход между страницами: если браузер отменил переход (например, в режиме эмуляции телефона),
  // его промисы отклоняются — гасим это, чтобы в консоли не было ошибок. Слушатель ставится до первой отрисовки,
  // поэтому motion.js подключается без defer, последним в <head>.
  window.addEventListener('pagereveal', function (e) {
    var vt = e.viewTransition;
    if (!vt) return;
    if (reduced) { try { vt.skipTransition(); } catch (x) {} }
    ['ready', 'finished', 'updateCallbackDone'].forEach(function (k) { if (vt[k] && vt[k].catch) vt[k].catch(function () {}); });
  });
  window.addEventListener('pageswap', function (e) {
    var vt = e.viewTransition;
    if (vt) ['ready', 'finished', 'updateCallbackDone'].forEach(function (k) { if (vt[k] && vt[k].catch) vt[k].catch(function () {}); });
  });
  var all = function (sel, rootEl) { return Array.prototype.slice.call((rootEl || doc).querySelectorAll(sel)); };
  var now = function () { return window.performance ? performance.now() : Date.now(); };
  var raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (f) { return setTimeout(f, 16); };
  var hasIO = 'IntersectionObserver' in window;

  if (!reduced) html.classList.add('mo');
  if (mq.addEventListener) mq.addEventListener('change', function (e) {
    reduced = e.matches;
    html.classList.toggle('mo', !reduced);
    if (reduced) revealAll();
  });

  /* ================= Появление блоков при прокрутке ================= */
  // Одиночные блоки: заголовки разделов и короткие связки текста
  var RISE = [
    '.catalog-heading', '.more-row', '.block-title', '.info-head', '.chapter-heading', '.pd-heading', '.pd-lead',
    '.guide-intro', '.chooser-intro', '.spec-intro', '.mechanism-inner > header', '.intake-copy',
    '.band .wrap > *', '.photo-thought > :not(figure)', '.trio-note', '.compare-feature > div', '.compare-next',
    '.cmp-pair', '.field-intro', '.source-note', '.links', '.fs-copy'
  ];
  // Группы: дети появляются лесенкой
  var GROUPS = [
    '.product-grid', '.block-grid', '.vx-facts', '.film-chapters', '.question-list', '.guide-entries', '.vacuum-lines',
    '.tiles', '.results', '.model-index', '.support-grid', '.kit-list', '.contact-list', '.field-shots'
  ];
  // Крупные фото: раскрытие маской
  var MASK = [
    '.wide-photo', '.photo-thought figure', '.construction-plane', '.daily-chapter figure', '.intake-study figure',
    '.compare-feature figure', '.styling-chapter figure', '.magnet-chapter figure', '.mechanism-picture', '.trio figure', '.fs-story .fs-shot'
  ];
  var SKIP = '.cinema-hero, .product-cinema, .site-header, .footer, dialog, .model-nav, .buybar, .sx-top, .sx-nav';

  var io = null;
  var pending = [];

  function hiddenNow(el) {
    if (el.closest(SKIP)) return true;
    if (el.closest('[hidden]')) return true;
    var d = el.closest('details');
    if (d && !d.open && !el.matches('details')) return true;
    return !el.getClientRects().length;
  }

  function mark(el, kind) {
    if (el.hasAttribute('data-mo') || el.classList.contains('mo-in')) return;
    if (el.parentElement && el.parentElement.closest('[data-mo]')) return;   // вложенные не двигаем дважды
    if (el.querySelector('[data-mo]')) return;
    if (hiddenNow(el)) return;
    var r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92) return;          // уже на экране — не трогаем, никакого мигания
    el.setAttribute('data-mo', kind);
    pending.push(el);
    io.observe(el);
  }

  function finish(el, delay) {
    setTimeout(function () {
      el.removeAttribute('data-mo');
      el.style.removeProperty('--mo-d');
    }, delay + 1300);
  }

  function reveal(el, delay) {
    if (!el.hasAttribute('data-mo')) return;
    if (io) io.unobserve(el);
    if (delay) el.style.setProperty('--mo-d', delay + 'ms');
    el.classList.add('mo-in');
    finish(el, delay || 0);
  }

  function revealAll(scope) {
    all('[data-mo]', scope).forEach(function (el) { reveal(el, 0); });
  }

  function setupReveal() {
    if (!hasIO || reduced || !doc.querySelector('main')) return;
    // Страницы-инструменты (корзина, оформление, кабинеты) — без появления при прокрутке: работа важнее
    if (doc.querySelector('.co-main, .acc-app, .cart-layout, .sx-main, .sx-app') && !doc.querySelector('.product-grid')) return;
    io = new IntersectionObserver(function (entries) {
      var step = 0;
      entries.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; });
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var inGroup = e.target.hasAttribute('data-mo-g');
        reveal(e.target, inGroup ? Math.min(step++, 5) * 70 : 0);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

    MASK.forEach(function (sel) { all('main ' + sel).forEach(function (el) { if (el.querySelector('img, video')) mark(el, 'mask'); }); });
    RISE.forEach(function (sel) { all('main ' + sel).forEach(function (el) { mark(el, 'rise'); }); });
    GROUPS.forEach(function (sel) {
      all('main ' + sel).forEach(function (group) {
        if (group.closest('[data-mo]')) return;
        Array.prototype.forEach.call(group.children, function (child) {
          if (child.matches('script, template, .mo-ind')) return;
          child.setAttribute('data-mo-g', '');
          mark(child, 'rise');
        });
      });
    });

    // Фильтры каталога и «Показать ещё» показывают карточки своей анимацией — наша не мешает
    doc.addEventListener('click', function (e) {
      if (e.target.closest('[data-filter], #show-more')) revealAll(doc.querySelector('#product-grid'));
    }, true);
    window.addEventListener('beforeprint', function () { revealAll(); });
    // Переход по якорю далеко вниз: всё, что выше, уже пролистано — показываем сразу
    window.addEventListener('hashchange', function () {
      pending.forEach(function (el) { if (el.getBoundingClientRect().bottom < 0) reveal(el, 0); });
    });
  }

  /* ================= Фото: параллакс и «дыхание» первого кадра ================= */
  var parallax = [];
  function setupPhotos() {
    if (reduced) return;
    var vh = window.innerHeight, vw = window.innerWidth;
    var figures = all('main figure, main .wide-photo').filter(function (f) {
      var img = f.querySelector(':scope > img');
      if (!img || f.closest('.product-card, .card-plate, .acc-dev, .search-row, .tiles, .results, ' + SKIP)) return false;
      var r = f.getBoundingClientRect();
      return r.width >= vw * 0.45 && r.height >= vh * 0.32;
    });
    // Один неподвижный кадр первого экрана — медленное «дыхание»
    var first = figures.filter(function (f) { var r = f.getBoundingClientRect(); return r.top < vh * 0.7 && r.bottom > 0; })[0];
    if (first) first.classList.add('mo-breathe');
    // Остальные крупные — лёгкий параллакс, не больше четырёх на странице
    figures.filter(function (f) { return f !== first; }).slice(0, 4).forEach(function (f) {
      f.classList.add('mo-par');
      parallax.push({ fig: f, img: f.querySelector(':scope > img'), on: false });
    });
    if (!parallax.length) return;
    if (hasIO) {
      var pio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          parallax.forEach(function (p) { if (p.fig === e.target) p.on = e.isIntersecting; });
        });
        requestTick();
      }, { rootMargin: '10% 0px' });
      parallax.forEach(function (p) { pio.observe(p.fig); });
    } else parallax.forEach(function (p) { p.on = true; });
  }
  function updateParallax() {
    var vh = window.innerHeight;
    parallax.forEach(function (p) {
      if (!p.on) return;
      var r = p.fig.getBoundingClientRect();
      var k = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);   // -1 … 1
      k = Math.max(-1, Math.min(1, k));
      p.img.style.translate = '0 ' + (k * -3).toFixed(2) + '%';
    });
  }

  /* ================= Шапка: прячется вниз, возвращается вверх ================= */
  var head = null, headH = 72, lastY = 0, away = false, floating = false, shifted = [];
  function setupHeader() {
    head = doc.querySelector('.site-header');
    if (!head || reduced) return;
    if (doc.querySelector('main > .model-nav')) return;         // у товара своя липкая строка модели — шапка уходит вместе со страницей
    html.classList.add('mo-head');
    headH = head.offsetHeight || 72;
    lastY = window.scrollY;
    // Липкие колонки и оглавления сдвигаются вниз, пока шапка видна, чтобы она их не закрывала
    shifted = all('.cart-summary, .toc, main .model-nav, .model-jump, .field-intro').map(function (el) {
      el.classList.add('mo-shift');
      return { el: el, top: null, shift: 0 };
    });
    head.addEventListener('focusin', function () { setAway(false); });
  }
  function setAway(v) {
    if (!head || away === v) return;
    away = v;
    head.classList.toggle('mo-away', v);
  }
  function updateHeader() {
    if (!head || !html.classList.contains('mo-head')) return;
    var y = Math.max(0, window.scrollY);
    var dy = y - lastY;
    lastY = y;
    var f = y > headH;
    if (f !== floating) { floating = f; head.classList.toggle('mo-float', f); }
    if (!f) setAway(false);
    else if (doc.querySelector('dialog[open]')) { /* при открытом меню шапку не трогаем */ }
    else if (dy > 3 && y > headH * 2) setAway(true);
    else if (dy < -6 && dy > -240) setAway(false);              // плавная прокрутка вверх; прыжок по якорю шапку не возвращает
    var shown = f && !away;
    shifted.forEach(function (s) {
      var cs = getComputedStyle(s.el);
      if (cs.position !== 'sticky') { if (s.shift) { s.shift = 0; s.el.style.translate = ''; } return; }
      if (s.top === null) s.top = parseFloat(cs.top) || 0;
      var stuck = s.el.getBoundingClientRect().top - s.shift <= s.top + 1;
      var want = shown && stuck ? headH : 0;
      if (want !== s.shift) { s.shift = want; s.el.style.translate = want ? '0 ' + want + 'px' : ''; }
    });
  }

  /* ================= Главы товара: полоса прогресса ================= */
  var progress = null, story = null;
  function setupProgress() {
    var nav = doc.querySelector('main > .model-nav');
    story = doc.querySelector('.product-story');
    if (!nav || !story || reduced) return;
    progress = doc.createElement('span');
    progress.className = 'mo-progress';
    progress.setAttribute('aria-hidden', 'true');
    nav.appendChild(progress);
  }
  function updateProgress() {
    if (!progress) return;
    var r = story.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    var p = total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0;
    progress.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  }

  /* ================= Один кадр на прокрутку ================= */
  var ticking = false;
  function requestTick() {
    if (ticking) return;
    ticking = true;
    raf(function () {
      ticking = false;
      updateHeader();
      updateProgress();
      updateParallax();
    });
  }

  /* ================= Вкладки и фильтры: линия переезжает ================= */
  var TABS = '.filters, .tabs, .gallery-options, .feature-selector';
  var ACTIVE = '[aria-pressed="true"], [aria-selected="true"], [aria-current="page"], [aria-current="true"]';
  function setupTabs() {
    if (reduced) return;
    all(TABS).forEach(function (box) {
      var ind = doc.createElement('span');
      ind.className = 'mo-ind mo-no-anim';
      ind.setAttribute('aria-hidden', 'true');
      var color = null;
      function place() {
        var items = all(':scope > a, :scope > button', box).filter(function (b) { return !b.hidden; });
        var act = items.filter(function (b) { return b.matches(ACTIVE); })[0];
        if (!act || !act.offsetWidth) { ind.style.opacity = '0'; return; }
        if (!color) {
          color = getComputedStyle(act).borderBottomColor;
          if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') color = 'currentColor';
          ind.style.background = color;
          box.classList.add('mo-tabs');
          box.appendChild(ind);
        }
        ind.style.opacity = '';
        var y = act.offsetTop + act.offsetHeight - 2;
        ind.style.transform = 'translate(' + act.offsetLeft + 'px,' + y + 'px) scaleX(' + act.offsetWidth + ')';
        ind.style.top = '0';
        ind.style.bottom = 'auto';
        box.classList.add('mo-ind-ready');
      }
      place();
      raf(function () { raf(function () { ind.classList.remove('mo-no-anim'); }); });
      if ('MutationObserver' in window) {
        new MutationObserver(function () { place(); }).observe(box, { subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-selected', 'aria-current', 'hidden'] });
      }
      if ('ResizeObserver' in window) {
        new ResizeObserver(function () {
          ind.classList.add('mo-no-anim'); place();
          raf(function () { ind.classList.remove('mo-no-anim'); });
        }).observe(box);
      }
      if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(place);
    });
  }

  /* ================= Цифры досчитывают ================= */
  var NUM = /\d[\d\u00a0\u202f ]*(?:,\d+)?/g;
  var FIG = '\u2007';
  function parseNum(text) {
    var m = text.match(NUM);
    if (!m || m.length !== 1) return null;
    var raw = m[0].replace(/[\s\u00a0\u202f]+$/, '');
    var at = text.indexOf(raw);
    var dec = (raw.split(',')[1] || '').length;
    var gm = raw.match(/\d([\u00a0\u202f ])\d/);
    var value = parseFloat(raw.replace(/[^\d,]/g, '').replace(',', '.'));
    if (!isFinite(value) || value <= 0) return null;
    // Слово после числа («4 режима», «2 насадки») на промежуточных цифрах читается с ошибкой — такие не считаем.
    // Считаем, когда после числа единица измерения: «об/мин», «Вт», «л», «м²», «%», «₸».
    var unit = text.slice(at + raw.length).replace(/^[\s\u00a0]+/, '');
    if (unit && !/^(\]|%|₸|[^\s\d]{1,3}(\s|$|\]|\.)|\S+\/\S+)/.test(unit)) return null;
    return { pre: text.slice(0, at), post: text.slice(at + raw.length), raw: raw, dec: dec, group: gm ? gm[1] : '', value: value };
  }
  function fmtNum(v, n) {
    var s = v.toFixed(n.dec).split('.');
    var int = s[0];
    if (n.group) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, n.group);
    var out = int + (n.dec ? ',' + s[1] : '');
    while (out.length < n.raw.length) out = FIG + out;            // ширина как у итогового числа — ничего не прыгает
    return out;
  }
  function countUp(el, delay) {
    if (el.dataset.moCounted) return;
    el.dataset.moCounted = '1';
    if (reduced) return;
    var text = el.textContent;
    var n = parseNum(text);
    if (!n) return;
    el.classList.add('mo-count');
    var dur = 900, start = null;
    setTimeout(function () {
      function frame(t) {
        if (start === null) start = t;
        var k = Math.min(1, (t - start) / dur);
        var e = 1 - Math.pow(1 - k, 3);
        if (k < 1) {
          el.textContent = n.pre + fmtNum(n.value * e, n) + n.post;
          raf(frame);
        } else el.textContent = text;                              // в конце — ровно исходный текст
      }
      raf(frame);
    }, delay || 0);
  }
  function watchCount(sel) {
    var els = all(sel).filter(function (el) { return !el.dataset.moCounted && parseNum(el.textContent); });
    if (!els.length || reduced) return;
    if (!hasIO) return;
    var cio = new IntersectionObserver(function (entries) {
      var i = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        countUp(e.target, 120 + (i++) * 80);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { cio.observe(el); });
  }

  /* ================= «Купить»: галочка на секунду ================= */
  var lastBuy = null, lastBuyAt = 0;
  function setupBuy() {
    doc.addEventListener('click', function (e) {
      var b = e.target.closest('[data-buy]');
      if (b) { lastBuy = b; lastBuyAt = now(); }
    }, true);
    if (VX && VX.on) VX.on('cart:changed', function () {
      var b = lastBuy;
      if (!b || now() - lastBuyAt > 600 || reduced) return;
      lastBuy = null;
      b.classList.remove('mo-added');
      void b.offsetWidth;
      b.classList.add('mo-added');
      clearTimeout(b._moT);
      b._moT = setTimeout(function () { b.classList.remove('mo-added'); }, 1400);
    });
  }

  /* ================= Обложка главной: смена ролика растворением ================= */
  function setupFeature() {
    var feature = doc.querySelector('[data-feature]');
    if (!feature) return;
    feature.addEventListener('click', function (e) {
      var c = e.target.closest('[data-feature-choice]');
      if (!c || reduced) return;
      setTimeout(function () {
        var media = feature.querySelector('.feature-media');
        var texts = all('[data-feature-text], .feature-actions', feature);
        [media].concat(texts).forEach(function (el, i) {
          if (!el) return;
          var cls = el === media ? 'mo-swap' : 'mo-swap-text';
          el.classList.remove(cls);
          void el.offsetWidth;
          if (el !== media) el.style.animationDelay = Math.min(i - 1, 4) * 50 + 'ms';
          el.classList.add(cls);
        });
      }, 0);
    });
  }

  /* ================= Сообщения на странице ================= */
  function setupPop() {
    if (!('MutationObserver' in window)) return;
    all('.quote-status, [data-mo-pop]').forEach(function (el) {
      new MutationObserver(function () {
        if (reduced || !el.textContent.trim()) return;
        el.classList.remove('mo-pop'); void el.offsetWidth; el.classList.add('mo-pop');
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  /* ================= Кабинет сотрудников ================= */
  function setupStaff() {
    var isStaff = /\/staff\//.test(location.pathname) || doc.querySelector('.sx-top, .sx-main');
    if (!isStaff) return;
    var drawn = false, counted = false;
    function scan() {
      if (!drawn) {
        var line = doc.querySelector('#chart path.line, .sx-chart path.line');
        if (line && line.getTotalLength && !reduced) {
          drawn = true;
          var len = line.getTotalLength();
          var svg = line.ownerSVGElement;
          if (svg) svg.classList.add('mo-chart-dots');
          if (line.animate && len) {
            line.style.strokeDasharray = len;
            var a = line.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 1000, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
            a.onfinish = function () { line.style.strokeDasharray = ''; };
          }
        }
      }
      if (!counted && doc.querySelector('.sx-fig dd')) {
        counted = true;
        watchCount('.sx-fig dd');
      }
    }
    scan();
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(function () { scan(); if (drawn && counted) mo.disconnect(); });
      mo.observe(doc.body, { childList: true, subtree: true });
      setTimeout(function () { mo.disconnect(); }, 8000);
    }
    // Смена статуса — строка коротко подсвечивается
    function flash(sel) {
      setTimeout(function () {
        raf(function () {
          all(sel).forEach(function (el) {
            el.classList.remove('mo-flash'); void el.offsetWidth; el.classList.add('mo-flash');
            setTimeout(function () { el.classList.remove('mo-flash'); }, 1200);
          });
        });
      }, 0);
    }
    function badge() {
      setTimeout(function () {
        raf(function () {
          all('main .status').slice(0, 1).forEach(function (el) {
            el.classList.remove('mo-flash-badge'); void el.offsetWidth; el.classList.add('mo-flash-badge');
          });
        });
      }, 0);
    }
    if (VX && VX.on && !reduced) {
      VX.on('lead:status', function (d) {
        if (d && d.id) flash('tr[data-id="' + cssEsc(d.id) + '"], li[data-id="' + cssEsc(d.id) + '"]');
      });
      VX.on('order:status', function (d) {
        if (!d || !d.no) return;
        flash('tr[data-href*="' + cssEsc(d.no) + '"], li[data-no="' + cssEsc(d.no) + '"]');
        if (/\/staff\/order\.html/.test(location.pathname)) badge();
      });
    }
  }
  function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

  /* ================= Запуск ================= */
  function init() {
    VX = window.VX || null;
    setupHeader();
    setupProgress();
    setupPhotos();
    setupReveal();
    setupTabs();
    setupBuy();
    setupFeature();
    setupPop();
    setupStaff();
    watchCount('.vx-facts dd');
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', function () { if (head) headH = head.offsetHeight || headH; requestTick(); }, { passive: true });
    requestTick();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
