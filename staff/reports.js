/* Кабинет: отчёты директора. Один график (выручка по дням, inline SVG), остальное — списки с тонкими полосками.
 * Сутки — по Алматы. Выручка — заказы без отменённых. Все суммы получены из условных цен, поэтому в [скобках]. */
(function () {
  'use strict';
  var VX = window.VX, SX = window.SX;
  if (!VX || !SX || !SX.ready()) return;
  var esc = SX.esc;
  var main = document.getElementById('main');
  var days = 7;
  try { days = +sessionStorage.getItem('sx.reports.days') || 7; } catch (e) {}
  if (days !== 7 && days !== 30) days = 7;

  main.innerHTML =
    '<div class="sx-head"><div><h1 class="sx-title">Отчёты</h1><p class="sx-sub" id="sub"></p></div>' +
      '<div class="sx-seg" role="group" aria-label="Период"><button type="button" data-days="7">7 дней</button><button type="button" data-days="30">30 дней</button></div></div>' +
    '<div id="body"></div>';

  function keys(n) {
    var out = [], seen = {};
    for (var i = n - 1; i >= 0; i--) {
      var k = SX.dayKey(new Date(Date.now() - i * 864e5).toISOString());
      if (!seen[k]) { seen[k] = 1; out.push(k); }
    }
    return out;
  }
  function short(n) {
    if (n >= 1e6) return (Math.round(n / 1e5) / 10).toString().replace('.', ',') + ' млн';
    if (n >= 1e3) return Math.round(n / 1e3) + ' тыс';
    return String(n);
  }
  function pct(a, b) { return b ? Math.round(a / b * 100) + ' %' : '—'; }

  function rank(rows, opts) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; }).concat([0]));
    if (!rows.length) return '<p class="sx-empty">Нет данных за период.</p>';
    return '<ul class="sx-rank">' + rows.map(function (r) {
      var w = max ? Math.max(r.v ? 1.5 : 0, r.v / max * 100) : 0;
      return '<li><span class="name">' + esc(r.name) + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '</span>' +
        '<span class="val">' + r.label + (r.extra ? '<small>' + esc(r.extra) + '</small>' : '') + '</span>' +
        '<span class="bar" aria-hidden="true"><i class="' + (r.muted ? 'is-muted' : '') + '" style="width:' + w.toFixed(1) + '%"></i></span></li>';
    }).join('') + '</ul>' + (opts && opts.note ? '<p class="sx-sub" style="font-size:.8125rem;margin-top:.5rem">' + esc(opts.note) + '</p>' : '');
  }

  function chart(series) {
    // Ширина рисунка = ширине колонки, чтобы подписи осей были настоящего размера и на телефоне
    var W = Math.round(Math.max(300, (document.getElementById('main').clientWidth || 880) - 2 * parseFloat(getComputedStyle(document.getElementById('main')).paddingLeft || 0)));
    var H = W < 600 ? 200 : 260, L = 48, R = 28, T = 12, B = 28;
    var max = Math.max.apply(null, series.map(function (d) { return d.v; }).concat([1]));
    var step = Math.pow(10, Math.floor(Math.log10(max)));
    var nice = [1, 2, 2.5, 5, 10].map(function (m) { return m * step; }).filter(function (s) { return max / s <= 4; })[0] || step * 10;
    var top = Math.ceil(max / nice) * nice;
    var x = function (i) { return L + (series.length === 1 ? 0 : i * (W - L - R) / (series.length - 1)); };
    var y = function (v) { return T + (H - T - B) * (1 - v / top); };
    var grid = '', ax = '';
    for (var g = 0; g <= top + 1e-9; g += nice) {
      grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(g).toFixed(1) + '" y2="' + y(g).toFixed(1) + '"/>';
      ax += '<text x="' + (L - 8) + '" y="' + (y(g) + 4).toFixed(1) + '" text-anchor="end">' + short(g) + '</text>';
    }
    var slots = Math.max(3, Math.floor((W - L - R) / 64));
    var every = series.length > slots ? Math.ceil(series.length / slots) : 1;
    series.forEach(function (d, i) {
      if ((series.length - 1 - i) % every === 0) ax += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(SX.dayLabel(d.k)) + '</text>';
    });
    var path = series.map(function (d, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(d.v).toFixed(1); }).join(' ');
    var pts = series.length <= 10 ? series.map(function (d, i) { return '<circle class="pt" r="4" cx="' + x(i).toFixed(1) + '" cy="' + y(d.v).toFixed(1) + '"/>'; }).join('') : '';
    var bw = (W - L - R) / Math.max(1, series.length - 1);
    var hits = series.map(function (d, i) {
      return '<rect class="hit" data-i="' + i + '" x="' + (x(i) - bw / 2).toFixed(1) + '" y="' + T + '" width="' + bw.toFixed(1) + '" height="' + (H - T - B) + '"/>';
    }).join('');
    return '<div class="sx-chart" id="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Выручка по дням за период">' +
      '<g class="grid">' + grid + '</g><g class="axis">' + ax + '</g>' +
      '<line class="cross" id="cross" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" visibility="hidden"/>' +
      '<path class="line" d="' + path + '"/>' + pts +
      '<circle class="pt" id="hover-pt" r="5" cx="0" cy="0" visibility="hidden"/>' + hits + '</svg>' +
      '<div class="sx-tip" id="tip" hidden></div></div>';
  }

  function render() {
    document.querySelectorAll('[data-days]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-days') === days)); });
    var ks = keys(days), inPeriod = {};
    ks.forEach(function (k) { inPeriod[k] = 1; });
    var orders = VX.orders.list().filter(function (o) { return inPeriod[SX.dayKey(o.createdAt)]; });
    var live = orders.filter(function (o) { return o.status !== 'cancelled'; });
    var paid = orders.filter(function (o) { return ['paid', 'shipped', 'delivered'].indexOf(o.status) !== -1; });
    var sum = function (l) { return l.reduce(function (s, o) { return s + o.total; }, 0); };
    var revenue = sum(live);
    var leads = VX.leads.list().filter(function (l) { return inPeriod[SX.dayKey(l.at)]; });
    var converted = leads.filter(function (l) { return !!l.orderNo; }).length;

    document.getElementById('sub').textContent = 'С ' + SX.dayLabel(ks[0]) + ' по ' + SX.dayLabel(ks[ks.length - 1]) + ', время Алматы. Выручка — заказы без отменённых.';

    var byDay = ks.map(function (k) {
      var l = live.filter(function (o) { return SX.dayKey(o.createdAt) === k; });
      return {k: k, v: sum(l), n: l.length};
    });

    // По статусам
    var statusRows = VX.statuses.map(function (s) {
      var l = orders.filter(function (o) { return o.status === s; });
      return {name: VX.status(s), v: l.length, label: String(l.length), extra: VX.fmt(sum(l)), muted: s === 'cancelled'};
    });
    // По товарам: выручка и штуки, без отменённых
    var prod = {};
    live.forEach(function (o) { o.items.forEach(function (i) {
      var r = prod[i.id] = prod[i.id] || {qty: 0, sum: 0};
      r.qty += i.qty; r.sum += i.qty * i.price;
    }); });
    var prodRows = Object.keys(prod).map(function (id) {
      var p = VX.product(id);
      return {name: p ? p.name.ru : id, sub: p ? p.model : '', v: prod[id].sum, label: VX.fmt(prod[id].sum), extra: prod[id].qty + ' шт.'};
    }).sort(function (a, b) { return b.v - a.v; });
    // По продажникам
    var sellerIds = {};
    orders.forEach(function (o) { sellerIds[o.sellerId || ''] = 1; });
    SX.staff().filter(function (s) { return s.role === 'seller'; }).forEach(function (s) { sellerIds[s.id] = 1; });
    var sellerRows = Object.keys(sellerIds).map(function (id) {
      var all = orders.filter(function (o) { return (o.sellerId || '') === id; });
      var l = all.filter(function (o) { return o.status !== 'cancelled'; });
      return {name: id ? SX.nameOf(id) : 'Не назначен', v: sum(l), label: VX.fmt(sum(l)),
        extra: all.length + ' ' + SX.plural(all.length, 'заказ', 'заказа', 'заказов'), muted: !id};
    }).sort(function (a, b) { return b.v - a.v; });
    // Заявки
    var lc = {'new': 0, 'in-progress': 0, done: 0};
    leads.forEach(function (l) { lc[l.status] = (lc[l.status] || 0) + 1; });
    var leadRows = [
      {name: 'Новые', v: lc['new'], label: String(lc['new'])},
      {name: 'В работе', v: lc['in-progress'], label: String(lc['in-progress'])},
      {name: 'Закрыты без заказа', v: lc.done - converted, label: String(lc.done - converted), muted: true},
      {name: 'Переведены в заказ', v: converted, label: String(converted)}
    ];

    var table = '<details style="margin-top:.75rem"><summary class="btn-text" style="cursor:pointer">Показать по дням таблицей</summary>' +
      '<div class="sx-table-wrap" style="margin-top:.5rem"><table class="sx-table"><thead><tr><th scope="col">День</th><th scope="col" class="num">Заказов</th><th scope="col" class="num">Выручка</th></tr></thead><tbody>' +
      byDay.slice().reverse().map(function (d) { return '<tr><td>' + esc(SX.dayLabel(d.k)) + '</td><td class="num">' + d.n + '</td><td class="num">' + VX.fmt(d.v) + '</td></tr>'; }).join('') +
      '</tbody></table></div></details>';

    document.getElementById('body').innerHTML =
      '<dl class="sx-figs">' +
        '<div class="sx-fig"><dt>Выручка</dt><dd class="price">' + VX.fmt(revenue) + '</dd><small>Оплачено ' + VX.fmt(sum(paid)) + '</small></div>' +
        '<div class="sx-fig"><dt>Заказы</dt><dd>' + orders.length + '</dd><small>Отменено ' + (orders.length - live.length) + '</small></div>' +
        '<div class="sx-fig"><dt>Средний чек</dt><dd class="price">' + VX.fmt(live.length ? revenue / live.length : 0) + '</dd><small>Без отменённых</small></div>' +
        '<div class="sx-fig"><dt>Заявки → заказ</dt><dd>' + pct(converted, leads.length) + '</dd><small>' + converted + ' из ' + leads.length + ' ' + SX.plural(leads.length, 'заявки', 'заявок', 'заявок') + '</small></div>' +
      '</dl>' +
      '<section class="sx-section" aria-labelledby="h-chart"><h2 class="sx-h2" id="h-chart">Выручка по дням</h2>' + chart(byDay) + table + '</section>' +
      '<div class="sx-cols sx-section">' +
        '<section aria-labelledby="h-st"><h2 class="sx-h2" id="h-st">По статусам</h2>' + rank(statusRows) + '</section>' +
        '<section aria-labelledby="h-pr"><h2 class="sx-h2" id="h-pr">По товарам</h2>' + rank(prodRows, {note: 'Выручка без отменённых заказов.'}) + '</section>' +
        '<section aria-labelledby="h-se"><h2 class="sx-h2" id="h-se">По продажникам</h2>' + rank(sellerRows) + '</section>' +
        '<section aria-labelledby="h-le"><h2 class="sx-h2" id="h-le">Заявки</h2>' + rank(leadRows, {note: 'Поступили за период: ' + leads.length + '.'}) + '</section>' +
      '</div>';
    wire(byDay);
  }

  function wire(series) {
    var box = document.getElementById('chart'); if (!box) return;
    var svg = box.querySelector('svg'), tip = document.getElementById('tip');
    var cross = document.getElementById('cross'), pt = document.getElementById('hover-pt');
    function show(i) {
      var r = svg.querySelector('rect[data-i="' + i + '"]');
      var cx = +r.getAttribute('x') + +r.getAttribute('width') / 2;
      var d = series[i];
      var path = svg.querySelector('.line').getAttribute('d').split(/[ML]/).filter(Boolean)[i].trim().split(' ');
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
      pt.setAttribute('cx', path[0]); pt.setAttribute('cy', path[1]); pt.setAttribute('visibility', 'visible');
      var k = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
      tip.innerHTML = '<span>' + esc(SX.dayLabel(d.k)) + '</span>' + VX.fmt(d.v) + ', ' + d.n + ' ' + SX.plural(d.n, 'заказ', 'заказа', 'заказов');
      tip.hidden = false;
      var left = Math.min(Math.max(+path[0] * k, 70), box.clientWidth - 70);
      tip.style.left = left + 'px'; tip.style.top = (+path[1] * k) + 'px';
    }
    function hide() { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); pt.setAttribute('visibility', 'hidden'); }
    svg.addEventListener('pointermove', function (e) { var r = e.target.closest('rect[data-i]'); if (r) show(+r.getAttribute('data-i')); });
    svg.addEventListener('pointerleave', hide);
  }

  main.addEventListener('click', function (e) {
    var b = e.target.closest('[data-days]'); if (!b) return;
    days = +b.getAttribute('data-days');
    try { sessionStorage.setItem('sx.reports.days', String(days)); } catch (er) {}
    render();
  });
  var lastW = window.innerWidth, rt;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth; clearTimeout(rt); rt = setTimeout(render, 150);
  });
  render();
})();
