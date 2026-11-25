/* Кабинет: список заказов. Продажник видит свои и новые свободные; менеджер и директор — все. */
(function () {
  'use strict';
  var VX = window.VX, SX = window.SX;
  if (!VX || !SX || !SX.ready()) return;
  var esc = SX.esc;
  var who = SX.me();
  var isSeller = who.role === 'seller';
  var main = document.getElementById('main');

  var st = {status: '', q: '', dir: 'desc', seller: ''};
  try { var saved = JSON.parse(sessionStorage.getItem('sx.orders') || 'null'); if (saved) st = Object.assign(st, saved); } catch (e) {}
  function remember() { try { sessionStorage.setItem('sx.orders', JSON.stringify(st)); } catch (e) {} }

  var sellers = SX.staff().filter(function (s) { return s.role === 'seller'; });

  main.innerHTML =
    '<div class="sx-head"><div><h1 class="sx-title">Заказы</h1><p class="sx-sub" id="sub"></p></div></div>' +
    '<div class="sx-filter" role="group" aria-label="Статус" id="statuses"></div>' +
    '<div class="sx-bar">' +
      '<label class="sx-search"><span class="sr-only">Поиск</span>' + SX.icon('search') +
        '<input class="input" type="search" id="q" placeholder="' + (isSeller ? 'Номер, телефон или имя' : 'Номер, телефон или имя') + '" autocomplete="off"></label>' +
      (isSeller ? '' : '<label class="sr-only" for="seller">Продажник</label><select class="select" id="seller" style="width:auto">' +
        '<option value="">Все продажники</option><option value="none">Не назначен</option>' +
        sellers.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>'; }).join('') + '</select>') +
      '<button class="sx-sort" type="button" id="sort">' + SX.icon('down') + '<span></span></button>' +
      '<p class="sx-result" id="result" aria-live="polite"></p>' +
    '</div>' +
    '<div class="sx-table-wrap sx-desk"><table class="sx-table"><thead><tr>' +
      '<th scope="col">Номер</th><th scope="col">Дата</th><th scope="col">Покупатель</th><th scope="col">Город</th>' +
      '<th scope="col" class="num">Сумма</th><th scope="col">Статус</th><th scope="col">Продажник</th></tr></thead><tbody id="rows"></tbody></table></div>' +
    '<ul class="sx-cards sx-cards-link" id="cards"></ul>' +
    '<div id="empty"></div>';

  var qEl = document.getElementById('q');
  qEl.value = st.q;
  var sellerEl = document.getElementById('seller');
  if (sellerEl) sellerEl.value = st.seller;

  function base() { return SX.visibleOrders(); }
  function matches(o) {
    if (!st.q) return true;
    var q = st.q.toLowerCase().trim();
    var qd = q.replace(/\D/g, '');
    if (o.no.toLowerCase().indexOf(q) !== -1 || (qd.length >= 3 && o.no.replace(/\D/g, '').indexOf(qd) !== -1)) return true;
    if (SX.hidesCustomer(o)) return false;   // свободный заказ продажник ищет только по номеру
    if (qd.length >= 3 && VX.digits(o.customer.phone).indexOf(qd) !== -1) return true;
    return o.customer.name.toLowerCase().indexOf(q) !== -1;
  }
  function bySeller(o) {
    if (!st.seller) return true;
    if (st.seller === 'none') return !o.sellerId;
    return o.sellerId === st.seller;
  }

  function renderStatuses(list) {
    var c = {};
    list.forEach(function (o) { c[o.status] = (c[o.status] || 0) + 1; });
    var items = [['', 'Все', list.length]].concat(VX.statuses.map(function (s) { return [s, VX.status(s), c[s] || 0]; }));
    document.getElementById('statuses').innerHTML = items.map(function (it) {
      return '<button type="button" data-status="' + it[0] + '" aria-pressed="' + (st.status === it[0]) + '">' + esc(it[1]) +
        ' <span class="count">' + it[2] + '</span></button>';
    }).join('');
  }

  function buyerCell(o) {
    if (SX.hidesCustomer(o)) return '<span class="sx-free">Свободный заказ</span>';
    return '<span class="sx-cell-2"><span>' + esc(o.customer.name || '—') + '</span><small class="sx-masked">' + esc(SX.maskPhone(o.customer.phone)) + '</small></span>';
  }
  function sellerName(o) { return o.sellerId ? esc(SX.nameOf(o.sellerId)) : '<span class="muted">Не назначен</span>'; }
  function dot(o) { return o.status === 'new' ? '<span class="sx-dot" title="Новый" aria-label="Новый"></span>' : '<span class="sx-dot-space" aria-hidden="true"></span>'; }

  function render() {
    var all = base().filter(bySeller);
    renderStatuses(all.filter(matches));
    var list = all.filter(matches).filter(function (o) { return !st.status || o.status === st.status; });
    list.sort(function (a, b) { return (a.createdAt < b.createdAt ? 1 : -1) * (st.dir === 'desc' ? 1 : -1); });

    var mine = isSeller ? base().filter(function (o) { return o.sellerId === who.id; }).length : 0;
    var free = base().filter(function (o) { return SX.isFree(o) && o.status === 'new'; }).length;
    document.getElementById('sub').textContent = isSeller
      ? 'Ваши заказы: ' + mine + '. Свободных новых: ' + free + ' — откройте и нажмите «Взять себе».'
      : 'Все заказы магазина. Без продажника: ' + base().filter(function (o) { return !o.sellerId; }).length + '.';

    document.querySelector('#sort span').textContent = st.dir === 'desc' ? 'Сначала новые' : 'Сначала старые';
    document.getElementById('sort').setAttribute('data-dir', st.dir);
    document.getElementById('result').textContent = list.length + ' ' + SX.plural(list.length, 'заказ', 'заказа', 'заказов');

    document.getElementById('rows').innerHTML = list.map(function (o) {
      var href = 'order.html?no=' + encodeURIComponent(o.no);
      return '<tr data-href="' + href + '">' +
        '<td class="nowrap">' + dot(o) + '<a class="row-link" href="' + href + '">' + esc(o.no) + '</a></td>' +
        '<td class="nowrap"><time datetime="' + esc(o.createdAt) + '">' + esc(SX.when(o.createdAt)) + '</time></td>' +
        '<td>' + buyerCell(o) + '</td>' +
        '<td>' + esc(o.customer.city || '—') + '</td>' +
        '<td class="num">' + VX.fmt(o.total) + '</td>' +
        '<td><span class="status" data-status="' + o.status + '">' + esc(VX.status(o.status)) + '</span></td>' +
        '<td>' + sellerName(o) + '</td></tr>';
    }).join('');
    document.getElementById('cards').innerHTML = list.map(function (o) {
      var href = 'order.html?no=' + encodeURIComponent(o.no);
      var name = SX.hidesCustomer(o) ? '<span class="sx-free">Свободный заказ</span>' : esc(o.customer.name || '—');
      return '<li><div>' + dot(o) + '<a class="row-link" href="' + href + '">' + esc(o.no) + '</a></div>' +
        '<div class="r"><span class="status" data-status="' + o.status + '">' + esc(VX.status(o.status)) + '</span></div>' +
        '<div>' + name + '</div><div class="r price">' + VX.fmt(o.total) + '</div>' +
        '<div class="meta">' + esc(SX.when(o.createdAt)) + ', ' + esc(o.customer.city || '—') + '. Продажник: ' + (o.sellerId ? esc(SX.nameOf(o.sellerId)) : 'не назначен') + '</div></li>';
    }).join('');
    var empty = document.getElementById('empty');
    empty.innerHTML = list.length ? '' : '<div class="sx-empty"><strong>Ничего не найдено</strong>' +
      (st.q || st.status || st.seller ? 'Измените поиск или фильтр. <button class="btn-text" type="button" id="clear">Сбросить фильтры</button>' : 'Заказов пока нет.') + '</div>';
    remember();
  }

  document.getElementById('statuses').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-status]'); if (!b) return;
    st.status = b.getAttribute('data-status'); render();
  });
  var t;
  qEl.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.q = qEl.value; render(); }, 120); });
  if (sellerEl) sellerEl.addEventListener('change', function () { st.seller = sellerEl.value; render(); });
  document.getElementById('sort').addEventListener('click', function () { st.dir = st.dir === 'desc' ? 'asc' : 'desc'; render(); });
  main.addEventListener('click', function (e) {
    if (e.target.id === 'clear') { st = {status: '', q: '', dir: st.dir, seller: ''}; qEl.value = ''; if (sellerEl) sellerEl.value = ''; render(); return; }
    var tr = e.target.closest('tr[data-href]');
    if (tr && !e.target.closest('a, button')) location.href = tr.getAttribute('data-href');
  });
  ['order:created', 'order:status', 'order:assigned'].forEach(function (ev) { VX.on(ev, render); });
  render();
})();
