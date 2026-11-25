/* Кабинет: журнал действий сотрудников. Директор. Только чтение — записи не меняются и не удаляются (ДАН-09). */
(function () {
  'use strict';
  var VX = window.VX, SX = window.SX;
  if (!VX || !SX || !SX.ready()) return;
  var esc = SX.esc;
  var main = document.getElementById('main');
  var st = {who: '', q: '', limit: 60};

  main.innerHTML =
    '<div class="sx-head"><div><h1 class="sx-title">Журнал</h1><p class="sx-sub">Кто, что и когда сделал в кабинете. Записи нельзя изменить или удалить.</p></div></div>' +
    '<div class="sx-bar">' +
      '<label class="sx-search"><span class="sr-only">Поиск по журналу</span>' + SX.icon('search') + '<input class="input" type="search" id="q" placeholder="Номер заказа или действие" autocomplete="off"></label>' +
      '<label class="sr-only" for="who">Сотрудник</label><select class="select" id="who" style="width:auto"><option value="">Все сотрудники</option>' +
        SX.staff().map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>'; }).join('') + '</select>' +
      '<p class="sx-result" id="result" aria-live="polite"></p></div>' +
    '<div class="sx-table-wrap sx-desk"><table class="sx-table"><thead><tr><th scope="col">Когда</th><th scope="col">Кто</th><th scope="col">Действие</th><th scope="col">Объект</th></tr></thead><tbody id="rows"></tbody></table></div>' +
    '<ul class="sx-cards" id="cards"></ul><div id="more"></div>';

  function ref(r) {
    if (!r) return '<span class="muted">—</span>';
    if (/^VX-\d+$/.test(r)) return '<a class="row-link" href="order.html?no=' + encodeURIComponent(r) + '">Заказ ' + esc(r) + '</a>';
    if (/^L-/.test(r)) return '<a class="row-link" href="leads.html">Заявка ' + esc(r) + '</a>';
    var p = VX.product(r);
    if (p) return '<a class="row-link" href="../' + esc(p.url) + '">' + esc(p.name.ru + ' ' + p.model) + '</a>';
    var s = SX.staffGet(r);
    if (s) return '<a class="row-link" href="team.html">' + esc(s.name) + '</a>';
    return esc(r);
  }
  function whoCell(e) {
    var s = SX.staffGet(e.who);
    return '<span class="sx-cell-2"><span>' + esc(s ? s.name : e.whoName) + '</span>' + (s ? '<small>' + esc(s.roleLabel) + '</small>' : '') + '</span>';
  }
  function render() {
    var q = st.q.trim().toLowerCase();
    var list = VX.log.list(st.who ? {who: st.who} : null).filter(function (e) {
      return !q || (SX.prettyWhat(e.what) + ' ' + e.ref + ' ' + e.whoName).toLowerCase().indexOf(q) !== -1;
    });
    var shown = list.slice(0, st.limit);
    document.getElementById('result').textContent = list.length + ' ' + SX.plural(list.length, 'запись', 'записи', 'записей');
    document.getElementById('rows').innerHTML = shown.map(function (e) {
      return '<tr><td class="nowrap"><time datetime="' + esc(e.at) + '">' + esc(SX.when(e.at)) + '</time></td><td>' + whoCell(e) + '</td>' +
        '<td>' + esc(SX.prettyWhat(e.what)) + '</td><td>' + ref(e.ref) + '</td></tr>';
    }).join('');
    document.getElementById('cards').innerHTML = shown.map(function (e) {
      return '<li><div>' + esc(SX.prettyWhat(e.what)) + '</div><div class="r muted" style="font-size:.8125rem">' + esc(SX.when(e.at)) + '</div>' +
        '<div class="meta">' + esc(e.whoName) + (e.ref ? '. ' : '') + (e.ref ? ref(e.ref) : '') + '</div></li>';
    }).join('');
    document.getElementById('more').innerHTML = (list.length > shown.length ? '<p style="margin-top:1rem"><button class="btn btn-quiet btn-sm" type="button" id="more-btn">Показать ещё ' + Math.min(60, list.length - shown.length) + '</button></p>' : '') +
      (list.length ? '' : '<div class="sx-empty"><strong>Записей нет</strong>Измените поиск или выберите другого сотрудника.</div>');
  }
  var t;
  document.getElementById('q').addEventListener('input', function (e) { clearTimeout(t); t = setTimeout(function () { st.q = e.target.value; st.limit = 60; render(); }, 120); });
  document.getElementById('who').addEventListener('change', function (e) { st.who = e.target.value; st.limit = 60; render(); });
  main.addEventListener('click', function (e) { if (e.target.id === 'more-btn') { st.limit += 60; render(); } });
  VX.on('log:added', render);
  render();
})();
