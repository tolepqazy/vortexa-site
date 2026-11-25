/*
 * Vortexa v7 — поведение витрины: каталог на главной, фото, «Купить», плашки покупки.
 * Данные и корзина — window.VX (store.js). Шапка, поиск, меню, сообщения — window.VXShell (shell.js).
 */
(() => {
  'use strict';

  const VX = window.VX;
  const shell = window.VXShell || { open() {}, notify() {} };
  const kk = document.documentElement.lang === 'kk';
  const t = (ru, kz) => kk ? kz : ru;
  const find = selector => document.querySelector(selector);
  const all = selector => Array.from(document.querySelectorAll(selector));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function modelCount(n) {
    if (kk) return n + ' модель';
    let form = 'моделей';
    if (n % 10 === 1 && n % 100 !== 11) form = 'модель';
    else if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) form = 'модели';
    return n + ' ' + form;
  }

  /* ---------- Цены: подтягиваем из каталога VX (менеджер мог поменять) ---------- */
  function renderPrices() {
    if (!VX) return;
    all('[data-price]').forEach(node => {
      const p = VX.product(node.dataset.price);
      if (p && node.textContent !== p.priceLabel) node.textContent = p.priceLabel;
    });
  }
  renderPrices();

  /* ---------- Скрытые товары: сотрудник убрал модель с витрины (VX.catalog.update {hidden}) ----------
   * [data-product="id"] — карточка или ссылка на модель: скрывается; с data-product-mode="mark" — остаётся,
   * а цена меняется на «Нет в продаже» (сравнение). «Купить» скрытой модели заменяется надписью «Нет в продаже». */
  const isOff = id => !!(VX && VX.catalog.isHidden(id));
  const OFF_TEXT = t('Нет в продаже', 'Сатылымда жоқ');
  function buyLabel(button) {
    const p = VX?.product(button.dataset.buy);
    if (p) button.setAttribute('aria-label', t('Купить: ', 'Сатып алу: ') + p.name[kk ? 'kk' : 'ru'] + ' ' + p.model);
  }
  function applyAvailability() {
    if (!VX) return;
    all('[data-product]').forEach(node => {
      const off = isOff(node.dataset.product);
      if (node.dataset.productMode === 'mark') {
        node.classList.toggle('is-off', off);
        node.querySelectorAll('[data-price]').forEach(price => { if (off) price.textContent = OFF_TEXT; });
      } else if (!node.closest('#product-grid')) node.hidden = off;
    });
    all('[data-buy]').forEach(button => {
      const off = isOff(button.dataset.buy);
      buyLabel(button);
      if (button.closest('[data-buybar]') || button.closest('.model-nav')) return;   // плашки решает updateBars
      button.hidden = off;
      let note = button.parentElement.querySelector('.buy-off');
      if (off && !note) {
        note = document.createElement('p');
        note.className = 'buy-off';
        note.textContent = OFF_TEXT;
        button.after(note);
      }
      if (note) note.hidden = !off;
      const panel = button.closest('[data-buy-main]');
      panel?.querySelector('.terms')?.toggleAttribute('hidden', off);
    });
    // Обложка главной: скрытую модель нельзя выбрать; если показана она — переключиться на первую доступную
    const choices = all('[data-feature-choice]');
    choices.forEach(c => { c.hidden = isOff(c.dataset.featureChoice); });
  }
  applyAvailability();
  VX?.on('product:changed', () => { renderPrices(); applyAvailability(); setCatalog(false); updateBars(); });
  // «Купить» на обложке меняет модель (films.js) — подпись для программ чтения с экрана и наличие следуют за ней
  if (VX && 'MutationObserver' in window) {
    new MutationObserver(applyAvailability).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-buy'] });
  }
  document.addEventListener('DOMContentLoaded', () => {
    const current = find('[data-feature] [data-buy-main] [data-buy]');
    if (!current || !isOff(current.dataset.buy)) return;
    all('[data-feature-choice]').find(c => !c.hidden)?.click();
  });

  /* ---------- «Купить» ---------- */
  function confirmInline(button, id) {
    const panel = button.closest('[data-buy-main]');
    const status = panel?.querySelector('[data-buy-status]');
    const qty = VX.cart.qty(id);
    if (status) {
      status.replaceChildren();
      const text = document.createElement('span');
      text.textContent = t('Добавлено. В корзине ', 'Қосылды. Себетте ') + qty + t(' шт.', ' дана.');
      const link = document.createElement('a');
      link.href = 'cart.html';
      link.className = 'link-line';
      link.textContent = t('Перейти в корзину', 'Себетке өту');
      status.append(text, document.createTextNode(' '), link);
      status.classList.remove('is-new');
      void status.offsetWidth;
      status.classList.add('is-new');
      return true;
    }
    return false;
  }

  document.addEventListener('click', event => {
    const buy = event.target.closest('[data-buy]');
    if (buy && VX) {
      const id = buy.dataset.buy;
      if (isOff(id)) { shell.notify(OFF_TEXT); return; }
      if (VX.cart.qty(id) >= VX.cart.max) {
        shell.notify(t('В корзине уже 99 шт. этой модели', 'Себетте бұл модельден 99 дана бар'));
        return;
      }
      VX.cart.add(id, 1);
      const inBar = buy.closest('[data-buybar]');
      const inNav = buy.closest('.model-nav');
      if (inBar) {
        buy.hidden = true;
        inBar.querySelector('.buybar-go').hidden = false;
        shell.notify(t('Добавлено в корзину', 'Себетке қосылды'), { href: 'cart.html', text: t('Открыть', 'Ашу') });
      } else if (inNav || !confirmInline(buy, id)) {
        shell.notify(t('Добавлено в корзину', 'Себетке қосылды'), { href: 'cart.html', text: t('Открыть', 'Ашу') });
      }
      return;
    }
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-zoom')) {
      const img = find('#zoom-img');
      img.src = button.dataset.zoom;
      img.alt = button.dataset.zoomLabel || '';
      find('#zoom-title').textContent = button.dataset.zoomLabel || '';
      shell.open('zoom');
    } else if (button.hasAttribute('data-gallery')) {
      const selected = button.dataset.gallery;
      all('[data-gallery]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
      all('[data-gallery-view]').forEach(view => { view.hidden = view.dataset.galleryView !== selected; });
    } else if (button.hasAttribute('data-filter')) {
      if (button.getAttribute('aria-pressed') !== 'true') setCatalog(true, button.dataset.filter, false);
    } else if (button.id === 'show-more') {
      const nextCard = shownCards().find(card => card.hidden);
      setCatalog(true, 'all', true);
      nextCard?.querySelector('a')?.focus({ preventScroll: true });
    }
  });

  /* ---------- Плашки покупки: в строке модели (компьютер) и снизу (телефон) ----------
   * Появляются, только когда ни одна основная кнопка «Купить» не видна — золото на экране одно. */
  const mains = all('[data-buy-main]');
  const nav = find('.model-nav');
  const bar = find('[data-buybar]');
  let updateBars = () => {};
  if (mains.length && (nav || bar) && 'IntersectionObserver' in window) {
    const visible = new Set();
    const cover = find('#overview');
    let pastCover = false;
    const update = updateBars = () => {
      // Скрытая модель: плашек с «Купить» нет вовсе
      const show = visible.size === 0 && pastCover && !isOff(mains[0].querySelector('[data-buy]').dataset.buy);
      nav?.classList.toggle('show-buy', show);
      if (bar) {
        bar.classList.toggle('is-shown', show);
        if (show) bar.removeAttribute('inert'); else bar.setAttribute('inert', '');
        if (!show) {
          bar.querySelector('[data-buy]').hidden = false;
          bar.querySelector('.buybar-go').hidden = true;
        }
      }
    };
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.target === cover) pastCover = !e.isIntersecting && e.boundingClientRect.top < 0;
        else if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target);
      }
      update();
    }, { threshold: 0 });
    mains.forEach(m => io.observe(m.querySelector('[data-buy]')));
    if (cover) io.observe(cover); else pastCover = true;
  }

  /* ---------- Каталог на главной ---------- */
  const filterButtons = all('[data-filter]');
  const catalogCards = all('#product-grid .product-card');
  const shownCards = () => catalogCards.filter(card => !isOff(card.dataset.product));
  const initialLimit = 6;

  function setCatalog(push, category, expanded) {
    if (!filterButtons.length) return;
    const current = new URL(location.href);
    category = category || current.searchParams.get('cat') || 'all';
    if (!filterButtons.some(button => button.dataset.filter === category)) category = 'all';
    if (expanded === undefined) expanded = current.searchParams.get('all') === '1';
    if (push) {
      if (category === 'all') current.searchParams.delete('cat');
      else current.searchParams.set('cat', category);
      if (expanded) current.searchParams.set('all', '1');
      else current.searchParams.delete('all');
      current.hash = 'catalog';
      try { history.pushState(null, '', current.href); } catch { /* превью может запрещать history */ }
    }
    filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    const matches = shownCards().filter(card => category === 'all' || category === card.dataset.cat);
    const limit = category === 'all' && !expanded ? initialLimit : matches.length;
    catalogCards.forEach(card => {
      const show = matches.includes(card) && matches.indexOf(card) < limit;
      if (show && card.hidden && !reduced.matches) {
        card.classList.remove('is-entering');
        void card.offsetWidth;
        card.classList.add('is-entering');
      }
      card.hidden = !show;
    });
    find('#result-count').textContent = modelCount(matches.length);
    const more = find('#show-more');
    more.hidden = matches.length <= limit;
    more.textContent = t('Показать ещё ', 'Тағы ') + modelCount(Math.max(0, matches.length - limit)) + t('', ' көрсету');
  }
  window.addEventListener('popstate', () => setCatalog(false));
  setCatalog(false);

  /* ---------- Вопрос продавцу: копирование текста ---------- */
  const quoteButton = find('[data-copy-quote]');
  if (quoteButton) {
    quoteButton.hidden = false;
    quoteButton.addEventListener('click', async () => {
      const field = find('#quote-text');
      const status = find('.quote-status');
      let copied = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(field.value);
          copied = true;
        }
      } catch { /* текст остаётся выделенным */ }
      if (!copied) {
        field.focus({ preventScroll: true });
        field.select();
        try { copied = document.execCommand('copy'); } catch { /* ручное копирование */ }
      }
      status.textContent = copied
        ? t('Текст скопирован.', 'Мәтін көшірілді.')
        : t('Текст выделен. Используйте команду «Копировать».', 'Мәтін белгіленді. «Көшіру» пәрменін қолданыңыз.');
    });
  }
})();
