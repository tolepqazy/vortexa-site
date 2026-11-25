/* Кабинет: вход — выбор демо-сотрудника. */
(function () {
  'use strict';
  var VX = window.VX, SX = window.SX;
  if (!VX || !SX) return;
  var WHAT = {
    director: 'Все разделы: заказы, заявки, товары, отчёты, команда, журнал',
    manager: 'Все заказы и заявки, назначает продажников, цены и остатки',
    seller: 'Свои заказы и новые свободные, заявки'
  };
  var cur = SX.me();
  var list = SX.staff();
  var checked = cur ? cur.id : list[0].id;
  document.getElementById('people').innerHTML = list.map(function (s) {
    return '<li><label><input type="radio" name="who" value="' + SX.esc(s.id) + '"' + (s.id === checked ? ' checked' : '') + '>' +
      '<strong>' + SX.esc(s.name) + '</strong><span class="role">' + SX.esc(s.roleLabel) + '</span>' +
      '<small>' + SX.esc(WHAT[s.role]) + '</small></label></li>';
  }).join('');
  // Сводка справа: что сейчас в демо-данных и кто какой ролью может войти
  (function () {
    var orders = VX.orders.list();
    var leads = VX.leads.list();
    var news = orders.filter(function (o) { return o.status === 'new'; }).length;
    var freshLeads = leads.filter(function (l) { return l.status === 'new'; }).length;
    var busyLeads = leads.filter(function (l) { return l.status === 'in-progress'; }).length;
    function rows(pairs) {
      return pairs.map(function (r) { return '<div><dt>' + SX.esc(r[0]) + '</dt><dd>' + SX.esc(r[1]) + '</dd></div>'; }).join('');
    }
    document.getElementById('sx-side-now').innerHTML = rows([
      ['Новых заказов', String(news)], ['Новых заявок', String(freshLeads)], ['Заявок в работе', String(busyLeads)]
    ]);
    var byRole = {};
    list.forEach(function (s) { (byRole[s.role] = byRole[s.role] || {label: s.roleLabel, names: []}).names.push(s.name); });
    document.getElementById('sx-side-roles').innerHTML = ['director', 'manager', 'seller'].filter(function (r) { return byRole[r]; }).map(function (r) {
      return '<div><dt>' + SX.esc(byRole[r].label) + '</dt><dd>' + SX.esc(byRole[r].names.join(', ')) + '<small>' + SX.esc(WHAT[r]) + '</small></dd></div>';
    }).join('');
    document.getElementById('sx-side').hidden = false;
  })();
  if (cur) {
    var a = document.getElementById('already');
    a.hidden = false;
    a.innerHTML = 'Вы уже вошли как ' + SX.esc(cur.name) + '. <a href="' + SX.firstAllowed(cur) + '">Продолжить</a>';
  }
  document.getElementById('login').addEventListener('submit', function (e) {
    e.preventDefault();
    var pick = this.querySelector('input[name="who"]:checked');
    if (!pick) return;
    if (cur && cur.id !== pick.value) VX.staff.logout();
    if (!cur || cur.id !== pick.value) VX.staff.login(pick.value);
    location.href = 'orders.html';
  });
})();
