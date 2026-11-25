/*
 * Vortexa v7 — служебные страницы: формы заявок, «Скопировать», поиск, переходы в поддержке.
 * Подключать последним: site.css → ui.css → info.css; store.js → shell.js → info.js (все с defer).
 * Без alert/confirm/prompt и window.open; формы — preventDefault и подтверждение на странице.
 */
(function () {
  'use strict';
  var VX = window.VX || null;
  var kk = document.documentElement.lang === 'kk';
  var t = function (ru, kz) { return kk ? kz : ru; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; });
  }

  /* ---------- Цены из каталога (менеджер мог поменять) ---------- */
  function prices() {
    if (!VX) return;
    $$('[data-price]').forEach(function (n) {
      var p = VX.product(n.getAttribute('data-price'));
      if (p) n.textContent = p.priceLabel;
    });
  }
  prices();
  if (VX) VX.on('product:changed', prices);

  /* ---------- «Скопировать»: tel:/mailto: в песочнице ненадёжны ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-200px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function selectValue(btn) {
    var dd = btn.closest('.contact-row') && btn.closest('.contact-row').querySelector('dd');
    if (!dd || !window.getSelection) return;
    var range = document.createRange();
    range.selectNodeContents(dd.firstChild || dd);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var label = btn.textContent;
    copyText(btn.getAttribute('data-copy')).then(function (ok) {
      if (!ok) selectValue(btn);
      btn.textContent = ok ? t('Скопировано', 'Көшірілді') : t('Выделено', 'Белгіленді');
      btn.classList.toggle('is-done', ok);
      if (window.VXShell) VXShell.notify(ok ? t('Скопировано', 'Көшірілді') : t('Скопируйте выделенный текст', 'Белгіленген мәтінді көшіріңіз'));
      clearTimeout(btn._timer);
      btn._timer = setTimeout(function () { btn.textContent = label; btn.classList.remove('is-done'); }, 2200);
    });
  });

  /* ---------- Формы заявок → VX.leads.create (сам шлёт событие lead:created) ---------- */
  function digits(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length === 11 && (d[0] === '7' || d[0] === '8')) d = d.slice(1);
    return d;
  }
  function phoneFmt(d) { return '+7 ' + d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6, 8) + ' ' + d.slice(8, 10); }
  function setError(el, text) {
    var box = document.getElementById(el.id + '-err');
    if (text) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    if (box) box.textContent = text || '';
  }
  function setupLead(form) {
    var kind = form.getAttribute('data-lead');
    var done = document.getElementById(form.getAttribute('data-done'));
    var f = form.elements;
    // Подставить модель из адреса: warranty.html?product=vacuum-a7
    var pre = new URLSearchParams(location.search).get('product');
    if (pre && f.product && VX && VX.product(pre)) f.product.value = pre;

    $$('input, textarea, select', form).forEach(function (el) {
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid')) setError(el, ''); });
      el.addEventListener('change', function () { if (el.getAttribute('aria-invalid')) setError(el, ''); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = [];
      var name = f.name.value.trim();
      var phone = digits(f.phone.value);
      var msg = f.message.value.trim();
      if (f.product && f.product.required && !f.product.value) { setError(f.product, t('Выберите модель.', 'Модельді таңдаңыз.')); bad.push(f.product); }
      if (!msg) { setError(f.message, kind === 'service' ? t('Опишите, что случилось.', 'Не болғанын жазыңыз.') : t('Напишите вопрос.', 'Сұрағыңызды жазыңыз.')); bad.push(f.message); }
      if (!name) { setError(f.name, t('Как к вам обращаться?', 'Сізге қалай жүгінейік?')); bad.push(f.name); }
      if (phone.length !== 10) { setError(f.phone, t('Введите 10 цифр после +7.', '+7-ден кейін 10 цифр енгізіңіз.')); bad.push(f.phone); }
      if (!f.consent.checked) { setError(f.consent, t('Отметьте согласие, без него заявку не отправить.', 'Келісімді белгілеңіз, онсыз өтінім жіберілмейді.')); bad.push(f.consent); }
      if (bad.length) { bad[0].focus(); return; }
      if (!VX) return;

      // Вид заявки, согласие, номер заказа и язык — отдельные поля заявки (store.js), текст покупателя — как есть
      var lead = VX.leads.create({
        kind: kind === 'service' ? 'service' : 'question',
        name: name, phone: phoneFmt(phone), product: f.product ? f.product.value : '', message: msg,
        orderRef: f.order ? f.order.value.trim().toUpperCase() : '', consent: true, lang: VX.lang
      });

      $('[data-lead-no]', done).textContent = lead.id;
      form.hidden = true;
      done.hidden = false;
      done.focus();
    });

    if (done) {
      $('[data-lead-again]', done).addEventListener('click', function () {
        form.reset();
        $$('[aria-invalid]', form).forEach(function (el) { setError(el, ''); });
        done.hidden = true;
        form.hidden = false;
        (f.product && f.product.required ? f.product : f.message).focus();
      });
    }
  }
  $$('form[data-lead]').forEach(setupLead);

  /* ---------- Поиск по каталогу: search.html?q= ---------- */
  function normal(v) { return String(v).toLocaleLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ''); }
  function count(n) {
    if (kk) return n + ' модель';
    var w = 'моделей';
    if (n % 10 === 1 && n % 100 !== 11) w = 'модель';
    else if ([2, 3, 4].indexOf(n % 10) !== -1 && [12, 13, 14].indexOf(n % 100) === -1) w = 'модели';
    return n + ' ' + w;
  }
  function find(q) {
    var words = q.trim().split(/\s+/).map(normal).filter(Boolean);
    var shown = VX.catalog.visible();   // скрытые сотрудниками товары в поиске не показываем
    if (!words.length) return shown;
    return shown.filter(function (p) {
      var c = VX.catalog.categories[p.category] || {};
      var text = normal([p.name.ru, p.name.kk, p.model, p.short.ru, p.short.kk, c.ru, c.kk].join(' '));
      return words.every(function (w) { return text.indexOf(w) !== -1; });
    });
  }
  var searchForm = $('[data-search-page]');
  if (searchForm && VX) {
    var input = searchForm.elements.q;
    var list = $('#search-list'), meta = $('#search-meta'), hints = $('#search-hints');
    var lang = kk ? 'kk' : 'ru';
    var render = function () {
      var q = input.value;
      var found = find(q);
      if (!q.trim()) meta.textContent = t('Все модели: ', 'Барлық модельдер: ') + count(found.length);
      else if (found.length) meta.textContent = t('По запросу «', '«') + q.trim() + t('»: ', '» бойынша: ') + count(found.length);
      else meta.textContent = t('По запросу «', '«') + q.trim() + t('» ничего не нашлось.', '» бойынша ештеңе табылмады.');
      hints.hidden = !!found.length;
      list.hidden = !found.length;
      list.innerHTML = found.map(function (p) {
        return '<li><a class="result" href="' + esc(p.url) + '"><img src="' + esc(VX.asset(p.img)) + '" width="720" height="480" alt="" loading="lazy" decoding="async">' +
          '<span class="result-text"><strong>' + esc(p.name[lang]) + '</strong><span>' + esc(VX.category(p.category)) + '</span></span>' +
          '<span class="price result-price">' + esc(p.priceLabel) + '</span></a></li>';
      }).join('');
      document.title = (q.trim() ? q.trim() + ' — ' : '') + t('Поиск — Vortexa', 'Іздеу — Vortexa');
    };
    var syncUrl = function () {
      var q = input.value.trim();
      try { history.replaceState(null, '', location.pathname + (q ? '?q=' + encodeURIComponent(q) : '')); } catch (e) { /* песочница */ }
    };
    input.value = new URLSearchParams(location.search).get('q') || '';
    render();
    input.addEventListener('input', function () { render(); syncUrl(); });
    searchForm.addEventListener('submit', function (e) { e.preventDefault(); render(); syncUrl(); });
    if (!input.value) input.focus();
  }

  /* ---------- Поддержка: переход к модели и раскрытие вопроса по якорю ---------- */
  var jump = $('[data-jump]');
  if (jump) {
    jump.addEventListener('change', function () {
      if (!jump.value) return;
      var target = document.getElementById(jump.value);
      if (target) { target.scrollIntoView({block: 'start'}); try { history.replaceState(null, '', '#' + jump.value); } catch (e) {} }
    });
  }
  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS') el.open = true;
    if (jump && VX && VX.product(id)) jump.value = id;
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);

  /* ---------- Документы: оглавление на телефоне свёрнуто ---------- */
  var toc = $('.toc details');
  if (toc && window.matchMedia && window.matchMedia('(max-width: 960px)').matches) toc.open = false;
  $$('.toc a').forEach(function (a) {
    a.addEventListener('click', function () { if (toc && window.matchMedia('(max-width: 960px)').matches) toc.open = false; });
  });
})();
