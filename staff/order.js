/* Кабинет: карточка заказа. Каждое действие пишется в журнал (store.js пишет статус, назначение, заметку; остальное — SX.act). */
(function () {
  'use strict';
  var VX = window.VX, SX = window.SX;
  if (!VX || !SX || !SX.ready()) return;
  var esc = SX.esc;
  var who = SX.me();
  var canAssign = who.role !== 'seller';
  var main = document.getElementById('main');
  var no = (new URLSearchParams(location.search).get('no') || '').trim().toUpperCase();
  var DELIVERY = {courier: 'Курьер', pickup: 'Самовывоз'};
  var phoneShown = false;
  var confirmCancel = false;

  var back = '<a class="sx-back" href="orders.html">' + SX.icon('back') + 'Все заказы</a>';

  function notFound() {
    // Один и тот же ответ для чужого и несуществующего номера (РОЛ-02)
    main.innerHTML = back + '<section class="sx-deny"><h1>Заказ не найден или нет доступа</h1>' +
      '<p>Проверьте номер. Продажнику видны только свои заказы и новые свободные.</p>' +
      '<a class="btn btn-secondary btn-sm" href="orders.html">К списку заказов</a></section>';
    document.title = 'Заказ не найден — кабинет Vortexa';
  }

  function next(status) {
    var flow = ['new', 'confirmed', 'paid', 'shipped', 'delivered'];
    var i = flow.indexOf(status);
    return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
  }
  var NEXT_LABEL = {confirmed: 'Подтвердить заказ', paid: 'Отметить оплату', shipped: 'Передать в доставку', delivered: 'Отметить доставку'};

  function render() {
    var o = VX.orders.get(no);
    if (!o || !SX.seesOrder(o)) { notFound(); return; }
    document.title = o.no + ' — кабинет Vortexa';
    var hidden = SX.hidesCustomer(o);
    var c = o.customer;
    var nx = next(o.status);
    var sellers = SX.staff().filter(function (s) { return s.role === 'seller'; });

    var lines = o.items.map(function (i) {
      var name = (i.name && i.name.ru) || i.id;
      return '<tr><td>' + esc(name) + '<small>' + esc(i.model) + '</small></td><td class="num">' + i.qty + ' шт.</td>' +
        '<td class="num unit">' + VX.fmt(i.price) + '</td><td class="num">' + VX.fmt(i.price * i.qty) + '</td></tr>';
    }).join('');
    var count = o.items.reduce(function (s, i) { return s + i.qty; }, 0);

    var phoneRow;
    if (hidden) phoneRow = '<span class="sx-masked">Скрыт до «Взять себе»</span>';
    else if (!phoneShown) phoneRow = '<span class="sx-masked">' + esc(SX.maskPhone(c.phone)) + '</span> <button class="btn-text" type="button" id="show-phone">Показать номер</button>';
    else phoneRow = esc(c.phone);

    var contact = (!hidden && phoneShown) ? '<div class="sx-contact" id="contact">' +
      '<div class="sx-copy"><span>Позвонить</span><input readonly id="ph-call" value="' + esc(SX.phoneText(c.phone)) + '" aria-label="Номер для звонка">' +
        '<button class="btn btn-quiet btn-sm" type="button" data-copy="ph-call" data-kind="звонка">Скопировать</button></div>' +
      '<div class="sx-copy"><span>WhatsApp</span><input readonly id="ph-wa" value="' + esc(SX.waText(c.phone)) + '" aria-label="Ссылка WhatsApp">' +
        '<button class="btn btn-quiet btn-sm" type="button" data-copy="ph-wa" data-kind="WhatsApp">Скопировать</button></div>' +
      '</div>' : '';

    var buyer = '<dl class="sx-kv">' +
      '<dt>Имя</dt><dd>' + (hidden ? '<span class="sx-masked">Скрыто до «Взять себе»</span>' : esc(c.name || '—')) + '</dd>' +
      '<dt>Телефон</dt><dd>' + phoneRow + '</dd>' +
      '<dt>Город</dt><dd>' + esc(c.city || '—') + '</dd>' +
      '<dt>Адрес</dt><dd>' + (hidden ? '<span class="sx-masked">Скрыт</span>' : esc(c.address || '—')) + '</dd>' +
      '<dt>Получение</dt><dd>' + esc(DELIVERY[o.delivery] || o.delivery) + '</dd>' +
      '<dt>Оплата</dt><dd>' + esc(VX.payment(o.payment, 'ru')) + '</dd>' +
      (c.comment && !hidden ? '<dt>Комментарий</dt><dd>' + esc(c.comment) + '</dd>' : '') +
      '</dl>';

    var notes = (o.notes || []).slice().reverse().map(function (n) {
      return '<li>' + esc(n.text) + '<small>' + esc(SX.nameOf(n.by)) + ', ' + esc(SX.when(n.at)) + '</small></li>';
    }).join('');

    // Статус: одно главное действие — следующий шаг (золото)
    var statusPanel;
    if (hidden) {
      statusPanel = '<p class="sx-sub" style="margin:0 0 .75rem">Заказ свободный. Возьмите его себе — откроются имя, телефон и адрес, можно будет менять статус.</p>' +
        '<button class="sx-primary" type="button" id="take">Взять себе</button>';
    } else {
      var others = VX.statuses.filter(function (s) { return s !== o.status && s !== nx; });
      statusPanel = '<div class="sx-actions">' +
        (nx ? '<button class="sx-primary" type="button" id="next" data-to="' + nx + '">' + esc(NEXT_LABEL[nx]) + '</button>' : '<p class="sx-sub" style="margin:0">' + (o.status === 'delivered' ? 'Заказ доставлен. Работа по нему закончена.' : 'Заказ отменён.') + '</p>') +
        '<div class="sx-row"><label class="sr-only" for="to">Другой статус</label><select class="select" id="to"><option value="">Другой статус…</option>' +
          others.map(function (s) { return '<option value="' + s + '">' + esc(VX.status(s)) + '</option>'; }).join('') + '</select>' +
          '<button class="btn btn-quiet btn-sm" type="button" id="set">Сменить</button></div>' +
        '<div class="sx-confirm" id="cancel-confirm"' + (confirmCancel ? '' : ' hidden') + '><span>Отменить заказ ' + esc(o.no) + '? Покупатель увидит статус «Отменён».</span>' +
          '<div class="sx-row"><button class="btn btn-secondary btn-sm" type="button" id="cancel-yes">Да, отменить</button><button class="btn-text" type="button" id="cancel-no">Не отменять</button></div></div>' +
        '</div>';
    }

    var sellerPanel;
    if (canAssign) {
      sellerPanel = '<div class="sx-row"><label class="sr-only" for="assign">Продажник</label><select class="select" id="assign">' +
        '<option value="">Не назначен</option>' +
        sellers.map(function (s) { return '<option value="' + esc(s.id) + '"' + (o.sellerId === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') +
        (o.sellerId && !sellers.some(function (s) { return s.id === o.sellerId; }) ? '<option value="' + esc(o.sellerId) + '" selected>' + esc(SX.nameOf(o.sellerId)) + '</option>' : '') +
        '</select><button class="btn btn-quiet btn-sm" type="button" id="do-assign">Назначить</button></div>';
    } else {
      sellerPanel = '<p>' + (o.sellerId ? esc(SX.nameOf(o.sellerId)) + (o.sellerId === who.id ? ' (вы)' : '') : '<span class="muted">Не назначен</span>') + '</p>';
    }

    var history = o.history.slice().reverse().map(function (h) {
      return '<li><span>' + esc(VX.status(h.status)) + '</span><time datetime="' + esc(h.at) + '">' + esc(SX.when(h.at)) + '</time>' +
        '<span class="who">' + esc(SX.nameOf(h.by)) + '</span></li>';
    }).join('');

    main.innerHTML = back +
      '<div class="sx-head"><div><h1 class="sx-title">Заказ ' + esc(o.no) + '</h1>' +
        '<p class="sx-sub">Создан ' + esc(SX.when(o.createdAt, {lower: true})) + '. ' + count + ' ' + SX.plural(count, 'товар', 'товара', 'товаров') + ' на ' + VX.fmt(o.total) + '.</p></div>' +
        '<span class="status" data-status="' + o.status + '">' + esc(VX.status(o.status)) + '</span></div>' +
      '<div class="sx-grid"><div class="sx-g-main">' +
        '<section class="sx-panel" aria-labelledby="h-items"><h2 class="sx-h2" id="h-items">Состав</h2>' +
          '<div class="sx-lines-wrap"><table class="sx-lines"><tbody>' + lines + '</tbody>' +
          '<tfoot><tr><td colspan="2">Итого</td><td class="unit"></td><td class="num">' + VX.fmt(o.total) + '</td></tr></tfoot></table></div></section>' +
        '<section class="sx-panel" aria-labelledby="h-buyer"><h2 class="sx-h2" id="h-buyer">Покупатель и доставка</h2>' + buyer + contact + '</section>' +
        '<section class="sx-panel" aria-labelledby="h-notes"><h2 class="sx-h2" id="h-notes">Заметки</h2>' +
          (notes ? '<ul class="sx-notes">' + notes + '</ul>' : '<p class="sx-sub" style="margin:0 0 .75rem">Заметок нет. Их видят только сотрудники.</p>') +
          (hidden ? '' : '<form id="note-form" class="field" novalidate><label for="note">Новая заметка</label>' +
            '<textarea class="textarea" id="note" rows="3" placeholder="Например: перезвонить после 18:00"></textarea>' +
            '<p class="field-error" id="note-err"></p>' +
            '<div><button class="btn btn-secondary btn-sm" type="submit">Добавить заметку</button></div></form>') +
        '</section>' +
      '</div><aside class="sx-aside sx-g-act">' +
        '<section class="sx-panel" aria-labelledby="h-status"><h2 class="sx-h2" id="h-status">Статус</h2>' + statusPanel + '</section>' +
        '<section class="sx-panel" aria-labelledby="h-seller"><h2 class="sx-h2" id="h-seller">Продажник</h2>' + sellerPanel + '</section>' +
        '</aside><aside class="sx-aside sx-g-hist" aria-label="История"><section class="sx-panel" aria-labelledby="h-hist"><h2 class="sx-h2" id="h-hist">История статусов</h2><ol class="sx-history">' + history + '</ol></section>' +
      '</aside></div>';
  }

  main.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    var o = VX.orders.get(no);
    if (!o || !SX.seesOrder(o)) { notFound(); return; }
    if (t.id === 'show-phone') {
      phoneShown = true;
      SX.act('Открыл телефон покупателя', o.no);
      render();
      var f = document.getElementById('ph-call'); if (f) f.focus();
    } else if (t.hasAttribute('data-copy')) {
      var input = document.getElementById(t.getAttribute('data-copy'));
      SX.copy(input.value, input);
      SX.act('Скопировал номер для ' + t.getAttribute('data-kind'), o.no);
    } else if (t.id === 'take') {
      VX.orders.assign(o.no, who.id, who.id);
      SX.toast('Заказ ваш. Контакты открыты.');
      render();
    } else if (t.id === 'next') {
      var to = t.getAttribute('data-to');
      VX.orders.setStatus(o.no, to, who.id);
      SX.toast('Статус: ' + VX.status(to));
      render();
    } else if (t.id === 'set') {
      var sel = document.getElementById('to');
      if (!sel.value) { sel.focus(); return; }
      if (sel.value === 'cancelled') { confirmCancel = true; render(); document.getElementById('cancel-yes').focus(); return; }
      VX.orders.setStatus(o.no, sel.value, who.id);
      SX.toast('Статус: ' + VX.status(sel.value));
      render();
    } else if (t.id === 'cancel-yes') {
      confirmCancel = false;
      VX.orders.setStatus(o.no, 'cancelled', who.id);
      SX.toast('Заказ отменён');
      render();
    } else if (t.id === 'cancel-no') {
      confirmCancel = false; render();
    } else if (t.id === 'do-assign') {
      var a = document.getElementById('assign').value || null;
      if ((o.sellerId || null) === a) { SX.toast('Продажник не изменился'); return; }
      VX.orders.assign(o.no, a, who.id);
      SX.toast(a ? 'Назначен: ' + SX.nameOf(a) : 'Продажник снят');
      render();
    }
  });
  main.addEventListener('submit', function (e) {
    if (e.target.id !== 'note-form') return;
    e.preventDefault();
    var ta = document.getElementById('note');
    var text = ta.value.trim();
    if (!text) { ta.setAttribute('aria-invalid', 'true'); document.getElementById('note-err').textContent = 'Напишите текст заметки.'; ta.focus(); return; }
    VX.orders.note(no, text, who.id);
    SX.toast('Заметка добавлена');
    render();
  });

  if (!no) { notFound(); return; }
  render();
})();
