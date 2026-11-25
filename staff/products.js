/* Кабинет: товары, цены, остатки, показ на витрине. Менеджер и директор.
 * Цена и остаток — VX.catalog.update (store.js сам пишет журнал, витрина обновляет [data-price]).
 * Скрытие — VX.catalog.update(id, {hidden}) (store.js пишет журнал; витрина убирает товар из каталога и поиска). */
(function () {
  'use strict';
  var VX = window.VX, SX = window.SX;
  if (!VX || !SX || !SX.ready()) return;
  var esc = SX.esc;
  var who = SX.me();
  var main = document.getElementById('main');
  var draft = {};        // id → {price, stock, on}
  var armed = false;     // второе нажатие после предупреждения о большой разнице цены
  var LIMIT = 0.30;      // spec/platform.md, решение 4: переспросить при отклонении больше [30] %

  main.innerHTML =
    '<div class="sx-head"><div><h1 class="sx-title">Товары и цены</h1>' +
      '<p class="sx-sub">Новая цена сразу видна на витрине. Скрытый товар пропадает из каталога и поиска, на его странице — «Нет в продаже».</p></div></div>' +
    '<div class="sx-table-wrap sx-desk"><table class="sx-table"><thead><tr>' +
      '<th scope="col">Товар</th><th scope="col">Категория</th><th scope="col" class="num">Цена, ₸</th><th scope="col" class="num">Остаток, шт.</th><th scope="col">На витрине</th>' +
    '</tr></thead><tbody id="rows"></tbody></table></div>' +
    '<ul class="sx-cards" id="cards"></ul>' +
    '<div class="sx-savebar" id="savebar" hidden><p id="dirty"></p>' +
      '<button class="btn-text" type="button" id="discard">Отменить</button>' +
      '<button class="sx-primary" type="button" id="save">Сохранить изменения</button></div>';

  function cur(p) {
    var d = draft[p.id] || {};
    return {price: 'price' in d ? d.price : p.price, stock: 'stock' in d ? d.stock : p.stock, on: 'on' in d ? d.on : !p.hidden};
  }
  function isDirty(p) {
    var c = cur(p);
    return c.price !== p.price || c.stock !== p.stock || c.on !== !p.hidden;
  }
  function jump(p) { var c = cur(p); return p.price ? Math.abs(c.price - p.price) / p.price : 0; }
  function warnText(p) {
    var c = cur(p);
    if (!(c.price > 0)) return 'Цена должна быть больше нуля.';
    if (jump(p) > LIMIT) return 'Цена меняется на ' + Math.round(jump(p) * 100) + ' %: было ' + VX.fmt(p.price) + ', станет ' + VX.fmt(c.price) + '. Проверьте нули.';
    return '';
  }

  function inputs(p, sfx) {
    var c = cur(p);
    return {
      price: '<label class="sr-only" for="pr-' + sfx + p.id + '">Цена ' + esc(p.model) + '</label><input class="input in-num" id="pr-' + sfx + p.id + '" data-id="' + p.id + '" data-f="price" type="number" inputmode="numeric" min="0" step="10" value="' + c.price + '">',
      stock: '<label class="sr-only" for="st-' + sfx + p.id + '">Остаток ' + esc(p.model) + '</label><input class="input in-num sm" id="st-' + sfx + p.id + '" data-id="' + p.id + '" data-f="stock" type="number" inputmode="numeric" min="0" step="1" value="' + c.stock + '">',
      on: '<label class="check" style="padding:0;min-height:40px;align-items:center"><input type="checkbox" data-id="' + p.id + '" data-f="on"' + (c.on ? ' checked' : '') + '><span>' + (c.on ? 'Показан' : 'Скрыт') + '</span></label>'
    };
  }
  function nameBlock(p) {
    var w = armed ? warnText(p) : (cur(p).price > 0 ? '' : 'Цена должна быть больше нуля.');
    return '<div class="sx-prod"><img class="sx-thumb" src="' + esc(VX.asset(p.img)) + '" alt="" width="44" height="44" loading="lazy">' +
      '<div class="sx-cell-2"><strong style="font-weight:500">' + esc(p.name.ru) + '</strong><small>' + esc(p.model) +
      (isDirty(p) ? '. Изменено' : '') + '</small>' + (w ? '<span class="sx-warn" role="alert">' + esc(w) + '</span>' : '') + '</div></div>';
  }

  function render(keepFocus) {
    var focusId = keepFocus && document.activeElement && document.activeElement.id;
    document.getElementById('rows').innerHTML = VX.products.map(function (p) {
      var i = inputs(p, 'd-');
      return '<tr class="' + (cur(p).on ? '' : 'is-off') + '"><td>' + nameBlock(p) + '</td><td>' + esc(VX.category(p.category)) + '</td>' +
        '<td class="num">' + i.price + '</td><td class="num">' + i.stock + '</td><td>' + i.on + '</td></tr>';
    }).join('');
    document.getElementById('cards').innerHTML = VX.products.map(function (p) {
      var i = inputs(p, 'm-');
      return '<li><div class="full">' + nameBlock(p) + '</div>' +
        '<div class="full"><div class="field-row" style="grid-template-columns:1fr 1fr;gap:.75rem">' +
          '<div class="field"><span class="field-hint">Цена, ₸</span>' + i.price + '</div><div class="field"><span class="field-hint">Остаток, шт.</span>' + i.stock + '</div></div></div>' +
        '<div class="full">' + i.on + '</div></li>';
    }).join('');
    var n = VX.products.filter(isDirty).length;
    var bar = document.getElementById('savebar');
    bar.hidden = !n;
    document.getElementById('dirty').textContent = n ? 'Изменено: ' + n + ' ' + SX.plural(n, 'товар', 'товара', 'товаров') + '. Не сохранено.' : '';
    document.getElementById('save').textContent = armed ? 'Сохранить всё равно' : 'Сохранить изменения';
    if (focusId) { var el = document.getElementById(focusId); if (el) el.focus(); }

  }

  main.addEventListener('change', function (e) {
    var el = e.target, id = el.getAttribute('data-id'), f = el.getAttribute('data-f');
    if (!id || !f) return;
    var d = draft[id] = draft[id] || {};
    if (f === 'on') d.on = el.checked;
    else d[f] = Math.max(0, Math.round(Number(el.value) || 0));
    armed = false;
    render(true);
  });
  document.getElementById('discard').addEventListener('click', function () { draft = {}; armed = false; render(); SX.toast('Изменения отменены'); });
  document.getElementById('save').addEventListener('click', function () {
    var changed = VX.products.filter(isDirty);
    if (!changed.length) return;
    if (changed.some(function (p) { return !(cur(p).price > 0); })) { armed = true; render(); return; }
    var risky = changed.filter(function (p) { return jump(p) > LIMIT; });
    if (risky.length && !armed) { armed = true; render(); return; }
    var first = null;
    changed.forEach(function (p) {
      var c = cur(p), data = {};
      if (c.price !== p.price || c.stock !== p.stock) { data.price = c.price; data.stock = c.stock; if (c.on) first = first || p; }
      if (c.on !== !p.hidden) data.hidden = !c.on;
      VX.catalog.update(p.id, data, who.id);
    });
    draft = {}; armed = false;
    render();
    SX.toast('Сохранено: ' + changed.length + ' ' + SX.plural(changed.length, 'товар', 'товара', 'товаров'),
      first ? {href: '../' + first.url, text: 'Открыть на витрине'} : null);
  });
  VX.on('product:changed', function () { if (!Object.keys(draft).length) render(); });
  render();
})();
