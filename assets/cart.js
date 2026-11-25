/*
 * Vortexa v7 — страница корзины (cart.html, kk/cart.html).
 * Список строится из VX.cart. Изменения из других вкладок приходят событием cart:changed.
 */
(() => {
  'use strict';
  const VX = window.VX;
  const page = document.querySelector('[data-cart-page]');
  if (!VX || !page) return;
  const kk = VX.lang === 'kk';
  const t = (ru, kz) => kk ? kz : ru;
  const $ = s => page.querySelector(s);
  const list = $('#cart-items');
  const undo = $('#cart-undo');
  let lastRemoved = null;
  let undoTimer;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const pieces = n => n + t(' шт.', ' дана');
  function goods(n) {
    if (kk) return n + ' тауар';
    let f = 'товаров';
    if (n % 10 === 1 && n % 100 !== 11) f = 'товар';
    else if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) f = 'товара';
    return n + ' ' + f;
  }

  function row(line) {
    const p = line.product;
    const li = el('li', 'cart-line');
    li.dataset.id = p.id;
    const photo = el('a', 'cart-photo');
    photo.href = p.url;
    photo.tabIndex = -1;
    photo.setAttribute('aria-hidden', 'true');
    const img = el('img');
    img.src = VX.asset(p.img);
    img.alt = '';
    img.width = 160; img.height = 107;
    photo.append(img);

    const info = el('div', 'cart-info');
    const model = el('span', 'cart-model', VX.category(p.category));   // код модели покупателю не показываем
    const name = el('a', 'cart-name', p.name[VX.lang]);
    name.href = p.url;
    const each = el('span', 'cart-each price', VX.fmt(p.price) + t(' за шт.', ' / дана'));
    info.append(model, name, each);

    const qty = el('div', 'qty');
    qty.setAttribute('role', 'group');
    qty.setAttribute('aria-label', t('Количество', 'Саны') + ': ' + p.name[VX.lang]);
    const less = el('button', '', '−');
    less.type = 'button';
    less.dataset.act = 'less';
    less.setAttribute('aria-label', t('Уменьшить количество', 'Санын азайту'));
    less.disabled = line.qty <= 1;
    const out = el('output', '', String(line.qty));
    out.setAttribute('aria-live', 'polite');
    out.setAttribute('aria-label', t('Количество', 'Саны'));
    const more = el('button', '', '+');
    more.type = 'button';
    more.dataset.act = 'more';
    more.setAttribute('aria-label', t('Увеличить количество', 'Санын көбейту'));
    more.disabled = line.qty >= VX.cart.max;
    qty.append(less, out, more);

    const sum = el('p', 'cart-sum price', VX.fmt(line.sum));
    const remove = el('button', 'cart-remove link-line', t('Удалить', 'Жою'));
    remove.type = 'button';
    remove.dataset.act = 'remove';
    remove.setAttribute('aria-label', t('Удалить из корзины: ', 'Себеттен жою: ') + p.name[VX.lang]);

    const side = el('div', 'cart-side');
    side.append(qty, sum, remove);
    li.append(photo, info, side);
    return li;
  }

  function render() {
    const lines = VX.cart.lines();
    const count = VX.cart.count();
    $('#cart-empty').hidden = lines.length > 0;
    $('#cart-filled').hidden = lines.length === 0;
    $('[data-cart-lead]').textContent = lines.length ? goods(count) + t(' на сумму ', ', сомасы ') + VX.fmt(VX.cart.total()) : '';
    if (!lines.length) { list.replaceChildren(); return; }
    // Сохраняем фокус на той же кнопке после перерисовки
    const active = document.activeElement;
    const focusKey = active && active.closest('.cart-line') ? [active.closest('.cart-line').dataset.id, active.dataset.act] : null;
    list.replaceChildren(...lines.map(row));
    $('[data-cart-items-label]').textContent = t('Товары, ', 'Тауарлар, ') + pieces(count);
    $('[data-cart-subtotal]').textContent = VX.fmt(VX.cart.total());
    $('[data-cart-total]').textContent = VX.fmt(VX.cart.total());
    if (focusKey) {
      const again = list.querySelector('.cart-line[data-id="' + focusKey[0] + '"] [data-act="' + focusKey[1] + '"]:not(:disabled)')
        || list.querySelector('.cart-line[data-id="' + focusKey[0] + '"] [data-act]:not(:disabled)');
      again?.focus({ preventScroll: true });
    }
  }

  function showUndo(line) {
    lastRemoved = line;
    undo.replaceChildren();
    undo.append(el('span', '', t('Удалено: ', 'Жойылды: ') + line.product.name[VX.lang] + '.'));
    const back = el('button', 'link-line', t('Вернуть', 'Қайтару'));
    back.type = 'button';
    back.dataset.act = 'undo';
    undo.append(back);
    undo.hidden = false;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => { undo.hidden = true; lastRemoved = null; }, 8000);
  }

  page.addEventListener('click', event => {
    const b = event.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'undo') {
      if (lastRemoved) VX.cart.set(lastRemoved.id, lastRemoved.qty);
      undo.hidden = true;
      lastRemoved = null;
      return;
    }
    const id = b.closest('.cart-line').dataset.id;
    const qty = VX.cart.qty(id);
    if (b.dataset.act === 'less') VX.cart.set(id, qty - 1);
    if (b.dataset.act === 'more') VX.cart.set(id, qty + 1);
    if (b.dataset.act === 'remove') {
      const line = VX.cart.lines().find(l => l.id === id);
      VX.cart.remove(id);
      if (line) showUndo(line);
      (list.querySelector('[data-act="remove"]') || $('#cart-empty a'))?.focus({ preventScroll: true });
    }
  });

  VX.on('cart:changed', render);
  VX.on('product:changed', render);
  window.addEventListener('pageshow', render);
  render();
})();
