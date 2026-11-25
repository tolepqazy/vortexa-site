/*
 * Vortexa v7 — «Заказ принят» и статус (order.html?no=VX-…) и поиск заказа (track.html).
 * Данные — VX.orders. Статус обновляется сам: событие order:status в этой вкладке
 * и событие storage, если менеджер сменил статус в кабинете сотрудников в другой вкладке.
 */
(() => {
  'use strict';
  const VX = window.VX;
  if (!VX) return;
  const kk = VX.lang === 'kk';
  const t = (ru, kz) => (kk ? kz : ru);
  const STEPS = ['new', 'confirmed', 'paid', 'shipped', 'delivered'];
  const SEEN = 'vx-seen-orders';
  const PHONE = '[+7\u00a0700\u00a0000\u00a000\u00a000]';
  const ARROW = '<svg class="arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15m-5-5 5 5-5 5"/></svg>';

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const link = (cls, href, text) => { const a = el('a', cls, text); a.href = href; return a; };
  const normNo = v => {
    const d = String(v || '').replace(/\D/g, '');
    return d.length === 6 ? 'VX-' + d : '';
  };
  // «Видела ли эта вкладка заказ целиком»: после оформления или поиска по номеру и телефону
  function seenList() { try { return JSON.parse(sessionStorage.getItem(SEEN) || '[]'); } catch (e) { return []; } }
  function markSeen(no) {
    try { const s = seenList(); if (!s.includes(no)) s.push(no); sessionStorage.setItem(SEEN, JSON.stringify(s)); } catch (e) { /* без хранилища */ }
  }
  function isOpen(o) {
    const u = VX.user.get();
    return seenList().includes(o.no) || (u && VX.digits(u.phone) === VX.digits(o.customer.phone));
  }
  // Дата «25 ноября в 15:14» / «25 қараша, 15:14» — VX.date (store.js)
  const when = (iso, withTime) => VX.date(iso, withTime);
  const maskPhone = p => {
    const d = VX.digits(p);
    return d.length === 10 ? '+7 ' + d.slice(0, 3) + ' *** ** ' + d.slice(8) : '';
  };
  // Подпись способа оплаты — общий словарь VX.paymentLabel (store.js)
  const payLabel = p => VX.payment(p);

  /* ===================== order.html ===================== */
  const orderPage = document.querySelector('[data-order-page]');
  if (orderPage) {
    const root = orderPage.querySelector('[data-od-root]');
    const crumb = orderPage.querySelector('[data-od-crumb]');
    const no = (new URLSearchParams(location.search).get('no') || '').trim().toUpperCase();

    function missing() {
      document.title = t('Заказ не найден — Vortexa', 'Тапсырыс табылмады — Vortexa');
      crumb.textContent = no || t('Заказ', 'Тапсырыс');
      const head = el('div', 'cart-head');
      head.append(el('h1', '', t('Заказ не найден', 'Тапсырыс табылмады')));
      const box = el('div', 'cart-empty');
      const empty = el('div', 'empty');
      empty.append(
        el('h2', '', no ? t('Номера ', '') + no + t(' нет в списке заказов', ' нөмірі тапсырыстар тізімінде жоқ') : t('В ссылке нет номера заказа', 'Сілтемеде тапсырыс нөмірі жоқ')),
        el('p', '', t('Номер выглядит так: VX- и шесть цифр. Проверьте ссылку или найдите заказ по номеру и телефону.',
          'Нөмір былай жазылады: VX- және алты цифр. Сілтемені тексеріңіз немесе тапсырысты нөмір мен телефон арқылы табыңыз.')),
        link('btn btn-secondary', 'track.html' + (normNo(no) ? '?no=' + normNo(no) : ''), t('Найти заказ', 'Тапсырысты табу'))
      );
      box.append(empty);
      root.replaceChildren(head, box);
    }

    function nextText(o) {
      const open = isOpen(o);
      const phone = open ? VX.phone(o.customer.phone) : maskPhone(o.customer.phone);
      const p = el('p');
      const strong = s => { const b = el('strong', '', s); return b; };
      switch (o.status) {
        case 'new':
          p.append(t('Менеджер позвонит на ', 'Менеджер '), strong(phone), t(' в течение ' + VX.terms.text('callback') + ' в рабочее время ' + VX.terms.text('hours') + '. Он подтвердит состав, согласует оплату и срок доставки.',
            ' нөміріне ' + VX.terms.text('callback') + ' ішінде жұмыс уақытында ' + VX.terms.text('hours') + ' қоңырау шалады. Ол құрамын растап, төлем мен жеткізу мерзімін келіседі.'));
          break;
        case 'confirmed':
          p.textContent = t('Менеджер подтвердил заказ. Следующий шаг: оплата, как договорились по телефону.', 'Менеджер тапсырысты растады. Келесі қадам: телефонда келіскендей төлем.');
          break;
        case 'paid':
          p.textContent = t('Оплата получена. Готовим заказ к отправке.', 'Төлем алынды. Тапсырысты жіберуге дайындап жатырмыз.');
          break;
        case 'shipped':
          p.textContent = o.delivery === 'pickup'
            ? t('Заказ ждёт в пункте выдачи [Алматы, адрес пункта выдачи]. Назовите номер заказа.', 'Тапсырыс беру пунктінде күтіп тұр [Алматы, беру пунктінің мекенжайы]. Тапсырыс нөмірін айтыңыз.')
            : t('Заказ передан в доставку. Курьер позвонит перед приездом.', 'Тапсырыс жеткізуге берілді. Курьер келер алдында қоңырау шалады.');
          break;
        case 'delivered':
          p.textContent = t('Заказ получен. Гарантия ' + VX.terms.text('warranty') + ' считается с даты получения.', 'Тапсырыс алынды. Кепілдік ' + VX.terms.text('warranty') + ' алған күннен басталады.');
          break;
        case 'cancelled':
          p.textContent = t('Если вы не отменяли заказ, позвоните ', 'Тапсырыстан бас тартпаған болсаңыз, қоңырау шалыңыз: ') + PHONE + '.';
          break;
      }
      return p;
    }

    function steps(o) {
      const wrap = el('section', 'od-track');
      wrap.setAttribute('aria-labelledby', 'od-track-title');
      const h = el('h2', 'section-title', t('Статус', 'Күйі'));
      h.id = 'od-track-title';
      wrap.append(h);
      const at = {};
      (o.history || []).forEach(x => { at[x.status] = x.at; });
      const cancelled = o.status === 'cancelled';
      if (cancelled) {
        const n = el('div', 'notice od-cancel');
        const s = el('span');
        s.append(el('strong', '', VX.status('cancelled')), ' ' + (at.cancelled ? when(at.cancelled, true) : '') + '. ' +
          t('Ниже видно, до какого шага дошёл заказ.', 'Төменде тапсырыс қай қадамға жеткені көрінеді.'));
        n.append(s);
        wrap.append(n);
      }
      // Текущий шаг — последний из пройденных
      let current = STEPS.indexOf(o.status);
      if (cancelled) current = Math.max(...STEPS.map((s, i) => (at[s] ? i : -1)));
      const ol = el('ol', 'od-steps' + (cancelled ? ' is-cancelled' : ''));
      STEPS.forEach((s, i) => {
        const li = el('li', 'od-step');
        if (i < current) li.classList.add('is-done');
        if (i === current && !cancelled) li.setAttribute('aria-current', 'step');
        li.append(el('span', 'od-step-mark'), el('span', 'od-step-name', VX.status(s)),
          el('span', 'od-step-date', at[s] ? when(at[s], true) : (i <= current || cancelled ? '' : t('впереди', 'алда'))));
        const sr = i < current || (i === current && !cancelled) ? t('пройден', 'өтті') : t('впереди', 'алда');
        li.setAttribute('aria-label', VX.status(s) + ', ' + (at[s] ? when(at[s], true) : sr));
        ol.append(li);
      });
      wrap.append(ol);
      return wrap;
    }

    function body(o) {
      const open = isOpen(o);
      const split = el('div', 'cart-layout od-body');
      const main = el('section', 'stack');
      main.setAttribute('aria-labelledby', 'od-items-title');
      const h = el('h2', 'section-title', t('Состав заказа', 'Тапсырыс құрамы'));
      h.id = 'od-items-title';
      const ul = el('ul', 'od-lines');
      o.items.forEach(it => {
        const p = VX.product(it.id);
        const li = el('li', 'od-line');
        const ph = el(p ? 'a' : 'span', 'cart-photo');
        if (p) { ph.href = p.url; ph.tabIndex = -1; ph.setAttribute('aria-hidden', 'true'); const img = el('img'); img.src = VX.asset(p.img); img.alt = ''; img.width = 160; img.height = 107; img.loading = 'lazy'; ph.append(img); }
        const info = el('div', 'cart-info');
        const name = (it.name && it.name[VX.lang]) || (p && p.name[VX.lang]) || it.id;
        info.append(el('span', 'cart-model', p ? VX.category(p.category) : ''), p ? link('cart-name', p.url, name) : el('span', 'cart-name', name),
          el('span', 'cart-each price', it.qty + t(' шт. × ', ' дана × ') + VX.fmt(it.price)));
        li.append(ph, info, el('span', 'od-line-sum', VX.fmt(it.price * it.qty)));
        ul.append(li);
      });
      main.append(h, ul);

      const aside = el('aside', 'cart-summary');
      aside.setAttribute('aria-labelledby', 'od-facts-title');
      const ah = el('h2', '', t('Получение и оплата', 'Алу және төлем'));
      ah.id = 'od-facts-title';
      const facts = el('dl', 'od-facts');
      const fact = (k, v) => { if (!v) return; const d = el('div'); d.append(el('dt', '', k), el('dd', '', v)); facts.append(d); };
      const c = o.customer || {};
      fact(t('Получатель', 'Алушы'), open ? [c.name, VX.phone(c.phone)].filter(Boolean).join(', ') : maskPhone(c.phone));
      if (o.delivery === 'pickup') fact(t('Получение', 'Алу'), t('Самовывоз, [Алматы, адрес пункта выдачи]', 'Өзі алып кету, [Алматы, беру пунктінің мекенжайы]'));
      else fact(t('Получение', 'Алу'), t('Курьер, ', 'Курьер, ') + VX.terms.deliveryDays(c.city, 'courier') + '. ' + [c.city, open ? c.address : ''].filter(Boolean).join(', '));
      if (open) fact(t('Комментарий', 'Түсініктеме'), c.comment);
      fact(t('Оплата', 'Төлем'), payLabel(o.payment));
      const count = o.items.reduce((s, i) => s + i.qty, 0);
      const sum = el('dl', 'summary');
      const row = (k, v, cls) => { const d = el('div', cls || ''); d.append(el('dt', '', k), el('dd', cls ? 'price' : '', v)); sum.append(d); };
      row(t('Товары, ', 'Тауарлар, ') + count + t(' шт.', ' дана'), VX.fmt(o.total));
      const ship = o.shipping != null ? o.shipping : VX.terms.deliveryPrice(c.city, o.total, o.delivery);
      row(t('Доставка', 'Жеткізу'), ship ? VX.fmt(ship) : VX.terms.text('free'));
      row(t('Итого', 'Барлығы'), VX.fmt(o.total + ship), 'summary-total');
      aside.append(ah, facts);
      if (!open) {
        const note = el('p', 'od-hidden-note', t('Имя и адрес скрыты: ссылку на заказ могут открыть другие. Чтобы увидеть их, ', 'Аты мен мекенжай жасырылған: сілтемені басқалар да ашуы мүмкін. Оларды көру үшін '));
        note.append(link('', 'track.html?no=' + o.no, t('найдите заказ по номеру и телефону', 'тапсырысты нөмір мен телефон арқылы табыңыз')), '.');
        aside.append(note);
      }
      const links = el('div', 'od-links');
      const u = VX.user.get();
      links.append(link('link-line', 'account.html#orders', u ? t('Мои заказы в кабинете', 'Кабинеттегі тапсырыстарым') : t('Войти в кабинет по номеру телефона', 'Телефон нөмірімен кабинетке кіру')),
        link('link-line', 'index.html#catalog', t('Продолжить покупки', 'Сатып алуды жалғастыру')));
      aside.append(sum, links);
      split.append(main, aside);
      return split;
    }

    function numberBlock(o) {
      const box = el('section', 'od-number on-dark');
      box.setAttribute('aria-label', t('Номер заказа', 'Тапсырыс нөмірі'));
      const left = el('div');
      left.append(el('p', 'od-number-label', t('Номер заказа', 'Тапсырыс нөмірі')), el('strong', 'od-no', o.no));
      const right = el('div', 'od-next');
      const keep = el('div', 'od-keep');
      const copy = el('button', 'btn-text', t('Скопировать ссылку', 'Сілтемені көшіру'));
      copy.type = 'button';
      const note = el('span', 'od-keep-note', t('Сохраните ссылку: по ней виден статус.', 'Сілтемені сақтаңыз: күйі сол арқылы көрінеді.'));
      copy.addEventListener('click', async () => {
        const url = location.href.split('#')[0];
        let done = false;
        try { await navigator.clipboard.writeText(url); done = true; } catch (e) { done = false; }
        if (done) { note.textContent = t('Ссылка скопирована.', 'Сілтеме көшірілді.'); return; }
        // Буфер обмена закрыт — показываем ссылку, чтобы скопировать вручную
        const field = el('input', 'input');
        field.readOnly = true; field.value = url;
        field.setAttribute('aria-label', t('Ссылка на заказ', 'Тапсырыс сілтемесі'));
        keep.replaceChildren(field);
        field.focus(); field.select();
      });
      keep.append(copy, note);
      right.append(nextText(o), keep);
      box.append(left, right);
      return box;
    }

    function render() {
      const o = no ? VX.orders.get(no) : null;
      if (!o) { missing(); return; }
      const titles = {
        new: t('Заказ принят', 'Тапсырыс қабылданды'),
        confirmed: t('Заказ подтверждён', 'Тапсырыс расталды'),
        paid: t('Заказ оплачен', 'Тапсырыс төленді'),
        shipped: t('Заказ в доставке', 'Тапсырыс жолда'),
        delivered: t('Заказ получен', 'Тапсырыс жеткізілді'),
        cancelled: t('Заказ отменён', 'Тапсырыстан бас тартылды')
      };
      const title = titles[o.status] || VX.status(o.status);
      document.title = o.no + ' — ' + title + ' — Vortexa';
      crumb.textContent = o.no;
      const head = el('div', 'od-head');
      head.append(el('h1', '', title), el('p', 'od-when', t('Оформлен ', 'Рәсімделді: ') + when(o.createdAt, true)));
      root.replaceChildren(head, numberBlock(o), steps(o), body(o));
    }

    render();
    VX.on('order:status', d => { if (d && d.no === no) render(); });
    window.addEventListener('storage', e => { if (e.key && /orders$/.test(e.key)) render(); });
    window.addEventListener('pageshow', e => { if (e.persisted) render(); });
  }

  /* ===================== track.html ===================== */
  const trackPage = document.querySelector('[data-track-page]');
  if (trackPage) {
    const F = window.VXForm;
    const form = trackPage.querySelector('#tr-form');
    const fNo = form.querySelector('#tr-no');
    const fPhone = form.querySelector('#tr-phone');
    const miss = form.querySelector('#tr-miss');
    const setError = F ? F.setError : () => {};
    if (F) F.maskPhone(fPhone);

    const qNo = new URLSearchParams(location.search).get('no');
    if (normNo(qNo)) fNo.value = normNo(qNo);
    const u = VX.user.get();
    if (u) {
      fPhone.value = F ? F.phoneFormat(F.phoneDigits(u.phone)) : u.phone;
      const mine = VX.user.orders();
      if (mine.length) {
        trackPage.querySelector('[data-tr-mine]').hidden = false;
        trackPage.querySelector('[data-tr-list]').replaceChildren(...mine.slice(0, 10).map(o => {
          const li = el('li', 'order-row');
          const a = el('div');
          a.append(link('', 'order.html?no=' + o.no, o.no), el('p', 'order-meta', when(o.createdAt) + ', ' + VX.fmt(o.total)));
          const s = el('span', 'status', VX.status(o.status));
          s.dataset.status = o.status;
          li.append(a, s);
          return li;
        }));
      }
    }

    const checkNo = () => {
      const v = fNo.value.trim();
      const msg = !v ? t('Укажите номер заказа.', 'Тапсырыс нөмірін жазыңыз.')
        : normNo(v) ? '' : t('Номер состоит из VX- и шести цифр, например VX-482913.', 'Нөмір VX- және алты цифрдан тұрады, мысалы VX-482913.');
      setError(fNo, msg);
      return msg;
    };
    const checkPhone = () => { const msg = F ? F.phoneError(fPhone.value) : ''; setError(fPhone, msg); return msg; };
    fNo.addEventListener('blur', () => { if (fNo.value.trim()) { checkNo(); if (normNo(fNo.value)) fNo.value = normNo(fNo.value); } });
    fNo.addEventListener('input', () => { miss.hidden = true; if (fNo.getAttribute('aria-invalid')) checkNo(); });
    fPhone.addEventListener('input', () => { miss.hidden = true; if (fPhone.getAttribute('aria-invalid')) checkPhone(); });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const a = checkNo();
      const b = checkPhone();
      if (a || b) { (a ? fNo : fPhone).focus(); return; }
      const no = normNo(fNo.value);
      fNo.value = no;
      const o = VX.orders.lookup(no, fPhone.value);
      if (!o) {
        // Не уточняем, что именно не совпало: так чужой заказ не подобрать по номеру
        miss.textContent = t('Заказ с таким номером и телефоном не найден. Проверьте цифры: телефон должен совпадать с указанным при оформлении. Если не получается, позвоните ',
          'Мұндай нөмір мен телефонға тапсырыс табылмады. Цифрларды тексеріңіз: телефон рәсімдеу кезінде көрсетілгенмен сәйкес болуы керек. Болмаса, қоңырау шалыңыз: ') + PHONE + '.';
        miss.hidden = false;
        return;
      }
      markSeen(o.no);
      location.href = 'order.html?no=' + encodeURIComponent(o.no);
    });
  }
})();
