/* Кабинет: заявки с сайта (VX.leads). Взять в работу, перевести в заказ, закрыть. */
(function () {
  'use strict';
  var VX = window.VX, SX = window.SX;
  if (!VX || !SX || !SX.ready()) return;
  var esc = SX.esc;
  var who = SX.me();
  var isSeller = who.role === 'seller';
  var main = document.getElementById('main');
  var st = {status: ''};
  var openForm = null;   // id заявки, для которой раскрыта форма «в заказ»
  var CITIES = ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Павлодар', 'Другой город'];

  main.innerHTML =
    '<div class="sx-head"><div><h1 class="sx-title">Заявки</h1><p class="sx-sub" id="sub"></p></div></div>' +
    '<div class="sx-filter" role="group" aria-label="Статус заявки" id="statuses"></div>' +
    '<div class="sx-table-wrap sx-desk"><table class="sx-table"><thead><tr>' +
      '<th scope="col">Поступила</th><th scope="col">Покупатель</th><th scope="col">Товар</th><th scope="col">Вопрос</th>' +
      '<th scope="col">Статус</th><th scope="col">Ответственный</th><th scope="col"><span class="sr-only">Действия</span></th></tr></thead><tbody id="rows"></tbody></table></div>' +
    '<ul class="sx-cards" id="cards"></ul><div id="empty"></div>';

  function visible() { return VX.leads.list().filter(function (l) { return SX.seesLead(l); }); }
  function hides(l) { return isSeller && !l.sellerId; }
  function mineOrBoss(l) { return !isSeller || l.sellerId === who.id; }
  // Вид заявки и номер заказа, который назвал покупатель, — отдельные поля заявки (store.js)
  function question(l) {
    var head = (SX.LEAD_KIND[l.kind] || 'Вопрос') + (l.orderRef ? ', заказ ' + l.orderRef : '') + (l.lang === 'kk' ? ', казахская версия сайта' : '');
    return '<span class="sx-lead-kind">' + esc(head) + ':</span> ' + esc(l.message || '—');
  }
  function productName(id) { var p = VX.product(id); return p ? p.name.ru + ' ' + p.model : ''; }

  function statusText(l) {
    if (l.status === 'done') {
      var no = l.orderNo;
      return no ? 'В заказе <a class="row-link" href="order.html?no=' + encodeURIComponent(no) + '">' + esc(no) + '</a>' : 'Закрыта';
    }
    return (l.status === 'new' ? '<span class="sx-dot" aria-hidden="true"></span>' : '') + esc(SX.LEAD_STATUS[l.status] || l.status);
  }
  function actions(l) {
    if (l.status === 'new') return '<button class="btn btn-quiet btn-sm" type="button" data-take="' + esc(l.id) + '">Взять в работу</button>';
    if (l.status === 'in-progress' && mineOrBoss(l)) {
      return '<div class="sx-row"><button class="btn btn-secondary btn-sm" type="button" data-convert="' + esc(l.id) + '" aria-expanded="' + (openForm === l.id) + '">Перевести в заказ</button>' +
        '<button class="btn-text" type="button" data-close="' + esc(l.id) + '">Закрыть</button></div>';
    }
    return '';
  }
  function person(l) {
    if (hides(l)) return '<span class="sx-free">Скрыто до «Взять»</span>';
    return '<span class="sx-cell-2"><span>' + esc(l.name || '—') + '</span><small class="sx-masked">' + esc(SX.maskPhone(l.phone)) + '</small></span>';
  }
  function form(l) {
    return '<form class="sx-inline-form" data-form="' + esc(l.id) + '" novalidate>' +
      '<p class="sx-h2">Заказ из заявки ' + esc(l.name || '') + '</p>' +
      '<div class="field-row">' +
        '<div class="field"><label for="f-prod-' + l.id + '">Товар</label><select class="select" id="f-prod-' + l.id + '" name="product">' +
          '<option value="">Выберите товар</option>' +
          VX.products.map(function (p) { return '<option value="' + p.id + '"' + (p.id === l.product ? ' selected' : '') + '>' + esc(p.name.ru + ' ' + p.model) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label for="f-qty-' + l.id + '">Количество</label><input class="input" id="f-qty-' + l.id + '" name="qty" type="number" min="1" max="99" value="1" inputmode="numeric"></div>' +
        '<div class="field"><label for="f-city-' + l.id + '">Город</label><select class="select" id="f-city-' + l.id + '" name="city">' +
          CITIES.map(function (c) { return '<option>[' + c + ']</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="f-addr-' + l.id + '">Адрес</label><input class="input" id="f-addr-' + l.id + '" name="address" placeholder="Улица, дом, квартира"></div>' +
      '</div><p class="field-error" data-err></p>' +
      '<div class="form-actions"><button class="sx-primary" type="submit">Создать заказ</button><button class="btn-text" type="button" data-cancel>Отмена</button></div></form>';
  }

  function render() {
    var all = visible();
    var c = {};
    all.forEach(function (l) { c[l.status] = (c[l.status] || 0) + 1; });
    document.getElementById('statuses').innerHTML = [['', 'Все', all.length], ['new', 'Новые', c['new'] || 0], ['in-progress', 'В работе', c['in-progress'] || 0], ['done', 'Закрытые', c.done || 0]]
      .map(function (it) { return '<button type="button" data-status="' + it[0] + '" aria-pressed="' + (st.status === it[0]) + '">' + it[1] + ' <span class="count">' + it[2] + '</span></button>'; }).join('');
    document.getElementById('sub').textContent = isSeller
      ? 'Ваши заявки и новые свободные. Имя и телефон свободной заявки откроются, когда возьмёте её в работу.'
      : 'Вопросы и запросы с сайта. Ответственный — тот, кто взял заявку в работу.';
    var list = all.filter(function (l) { return !st.status || l.status === st.status; });

    document.getElementById('rows').innerHTML = list.map(function (l) {
      var row = '<tr data-id="' + esc(l.id) + '">' +
        '<td class="nowrap"><time datetime="' + esc(l.at) + '">' + esc(SX.when(l.at)) + '</time></td>' +
        '<td>' + person(l) + '</td>' +
        '<td>' + (l.product ? esc(productName(l.product)) : '<span class="muted">Не указан</span>') + '</td>' +
        '<td style="max-width:22rem">' + question(l) + '</td>' +
        '<td class="nowrap">' + statusText(l) + '</td>' +
        '<td>' + (l.sellerId ? esc(SX.nameOf(l.sellerId)) : '<span class="muted">Нет</span>') + '</td>' +
        '<td class="nowrap">' + actions(l) + '</td></tr>';
      if (openForm === l.id) row += '<tr class="sx-form-row"><td colspan="7">' + form(l) + '</td></tr>';
      return row;
    }).join('');
    document.getElementById('cards').innerHTML = list.map(function (l) {
      return '<li data-id="' + esc(l.id) + '"><div>' + (hides(l) ? '<span class="sx-free">Свободная заявка</span>' : esc(l.name || '—')) + '</div>' +
        '<div class="r">' + statusText(l) + '</div>' +
        '<div class="full">' + question(l) + '</div>' +
        '<div class="meta">' + esc(SX.when(l.at)) + '. ' + (l.product ? esc(productName(l.product)) : 'Товар не указан') + '. Ответственный: ' + (l.sellerId ? esc(SX.nameOf(l.sellerId)) : 'нет') + '</div>' +
        (actions(l) ? '<div class="full">' + actions(l) + '</div>' : '') +
        (openForm === l.id ? '<div class="full">' + form(l) + '</div>' : '') + '</li>';
    }).join('');
    // На странице два вида (таблица и карточки) — поля формы с одинаковыми id: оставляем форму только в видимом
    var mobile = window.matchMedia('(max-width: 760px)').matches;
    document.querySelectorAll((mobile ? '#rows' : '#cards') + ' .sx-inline-form').forEach(function (f) { f.remove(); });
    document.getElementById('empty').innerHTML = list.length ? '' : '<div class="sx-empty"><strong>Заявок нет</strong>' +
      (st.status ? 'В этом статусе пусто.' : 'Новые заявки с сайта появятся здесь.') + '</div>';
  }

  main.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-status') && b.closest('#statuses')) { st.status = b.getAttribute('data-status'); render(); return; }
    var id;
    if ((id = b.getAttribute('data-take'))) {
      VX.leads.setStatus(id, 'in-progress', who.id);
      SX.toast('Заявка в работе');
      render(); SX.refreshNav();
    } else if ((id = b.getAttribute('data-convert'))) {
      openForm = openForm === id ? null : id;
      render();
      var f = document.querySelector('[data-form="' + id + '"] select'); if (f) f.focus();
    } else if ((id = b.getAttribute('data-close'))) {
      VX.leads.setStatus(id, 'done', who.id);
      SX.toast('Заявка закрыта без заказа');
      render();
    } else if (b.hasAttribute('data-cancel')) {
      openForm = null; render();
    }
  });
  main.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-form]'); if (!f) return;
    e.preventDefault();
    var lead = VX.leads.list().filter(function (l) { return l.id === f.getAttribute('data-form'); })[0];
    if (!lead || !SX.seesLead(lead)) return;
    var err = f.querySelector('[data-err]');
    var prod = f.product.value, qty = Math.max(1, Math.min(99, parseInt(f.qty.value, 10) || 0));
    if (!prod) { err.textContent = 'Выберите товар — без него заказ не создать.'; f.product.setAttribute('aria-invalid', 'true'); f.product.focus(); return; }
    if (!f.address.value.trim()) { err.textContent = 'Укажите адрес доставки.'; f.address.setAttribute('aria-invalid', 'true'); f.address.focus(); return; }
    var owner = SX.staffGet(lead.sellerId);
    var order = VX.orders.create({
      items: [{id: prod, qty: qty}],
      customer: {name: lead.name, phone: lead.phone, city: f.city.value, address: f.address.value.trim(), comment: lead.message},
      delivery: 'courier', payment: 'cash', by: who.id, lang: 'ru',
      sellerId: owner && owner.role === 'seller' ? owner.id : (isSeller ? who.id : null)
    });
    if (!order) { err.textContent = 'Заказ не создан. Проверьте товар и количество.'; return; }
    VX.leads.link(lead.id, order.no, who.id);
    SX.act('Создал заказ из заявки ' + lead.id, order.no);
    VX.leads.setStatus(lead.id, 'done', who.id);
    location.href = 'order.html?no=' + encodeURIComponent(order.no);
  });
  VX.on('lead:created', render);
  render();
})();
