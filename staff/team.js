/* Кабинет: команда и права. Директор. Смена роли — VX.staff.setRole (store.js хранит роль, пишет журнал; can() сразу учитывает новую роль). */
(function () {
  'use strict';
  var VX = window.VX, SX = window.SX;
  if (!VX || !SX || !SX.ready()) return;
  var esc = SX.esc;
  var who = SX.me();
  var main = document.getElementById('main');
  var LABEL = {orders: 'Заказы', leads: 'Заявки', products: 'Товары и цены', reports: 'Отчёты', team: 'Команда', log: 'Журнал'};

  // Матрица — по spec/platform.md, таблица 1.2, в объёме демо-кабинета
  var MATRIX = [
    ['Заказы и заявки', 'Все, с контактами', 'Все, с контактами', 'Свои и новые свободные. Контакты свободных скрыты до «Взять себе»'],
    ['Смена статуса, заметки', 'Да', 'Да', 'В своих заказах'],
    ['Назначить продажника', 'Да', 'Да', 'Только себя: «Взять себе»'],
    ['Полный телефон покупателя', 'По кнопке «Показать», пишется в журнал', 'По кнопке «Показать», пишется в журнал', 'Только в своих заказах'],
    ['Товары, цены, остатки', 'Смотреть и менять', 'Смотреть и менять', 'Нет. Текущие цены — на витрине'],
    ['Отчёты', 'Все', 'Нет', 'Нет'],
    ['Сотрудники и роли', 'Смотреть, менять роли', 'Нет', 'Нет'],
    ['Журнал действий', 'Весь', 'Нет', 'История статусов своих заказов в карточке']
  ];

  function render() {
    var list = SX.staff();
    var rows = list.map(function (s) {
      var self = s.id === who.id;
      var ctl = self
        ? '<span class="muted">' + esc(s.roleLabel) + '. Свою роль сменить нельзя</span>'
        : '<div class="sx-row"><label class="sr-only" for="role-' + s.id + '">Роль ' + esc(s.name) + '</label><select class="select" id="role-' + s.id + '" data-id="' + s.id + '" style="max-width:12rem">' +
          Object.keys(SX.ROLE).map(function (r) { return '<option value="' + r + '"' + (r === s.role ? ' selected' : '') + '>' + SX.ROLE[r] + '</option>'; }).join('') +
          '</select><button class="btn btn-quiet btn-sm" type="button" data-apply="' + s.id + '">Сменить роль</button></div>';
      var perms = SX.PERMS[s.role].map(function (p) { return LABEL[p]; }).join(', ');
      return {s: s, ctl: ctl, perms: perms, changed: s.role !== s.baseRole};
    });
    main.innerHTML =
      '<div class="sx-head"><div><h1 class="sx-title">Команда и права</h1><p class="sx-sub">Демо: смена роли сразу меняет разделы сотрудника в кабинете и пишется в журнал.</p></div></div>' +
      '<section class="sx-section" aria-labelledby="h-team"><h2 class="sx-h2" id="h-team">Сотрудники</h2>' +
        '<div class="sx-table-wrap sx-desk"><table class="sx-table"><thead><tr><th scope="col">Сотрудник</th><th scope="col">Роль</th><th scope="col">Разделы</th></tr></thead><tbody>' +
        rows.map(function (r) {
          return '<tr><td><span class="sx-cell-2"><span>' + esc(r.s.name) + (r.s.id === who.id ? ' (вы)' : '') + '</span>' +
            (r.changed ? '<small>Было: ' + esc(SX.ROLE[r.s.baseRole].toLowerCase()) + '</small>' : '') + '</span></td><td>' + r.ctl + '</td><td>' + esc(r.perms) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<ul class="sx-cards">' + rows.map(function (r) {
          return '<li><div>' + esc(r.s.name) + (r.s.id === who.id ? ' (вы)' : '') + '</div><div class="r">' + esc(r.s.roleLabel) + '</div>' +
            '<div class="meta">Разделы: ' + esc(r.perms) + '</div>' + (r.s.id === who.id ? '' : '<div class="full">' + r.ctl.replace(/id="role-/, 'id="mrole-').replace(/for="role-/, 'for="mrole-') + '</div>') + '</li>';
        }).join('') + '</ul></section>' +
      '<section class="sx-section" aria-labelledby="h-matrix"><h2 class="sx-h2" id="h-matrix">Что может каждая роль</h2>' +
        '<div class="sx-table-wrap"><table class="sx-table sx-matrix"><thead><tr><th scope="col">Раздел</th><th scope="col">Директор</th><th scope="col">Менеджер</th><th scope="col">Продажник</th></tr></thead><tbody>' +
        MATRIX.map(function (m) {
          return '<tr><th scope="row" style="font-weight:500">' + esc(m[0]) + '</th>' + m.slice(1).map(function (c) { return '<td class="' + (c.indexOf('Нет') === 0 ? 'none' : '') + '">' + esc(c) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>' +
        '<p class="sx-sub" style="font-size:.8125rem;margin-top:.75rem">Просмотр. По спеке платформы менеджер ещё смотрит отчёты и список сотрудников — в демо эти разделы открыты только директору.</p>' +
      '</section>';
  }

  main.addEventListener('click', function (e) {
    var b = e.target.closest('[data-apply]'); if (!b) return;
    var id = b.getAttribute('data-apply');
    var sel = b.parentNode.querySelector('select');
    var before = SX.staffGet(id);
    if (!before || sel.value === before.role) { SX.toast('Роль не изменилась'); return; }
    var after = VX.staff.setRole(id, sel.value, who.id);
    if (after) SX.toast(after.name + ': ' + before.roleLabel.toLowerCase() + ' → ' + after.roleLabel.toLowerCase(), {href: 'log.html', text: 'Журнал'});
    render();
  });
  render();
})();
