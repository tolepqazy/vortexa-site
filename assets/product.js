'use strict';

function enhanceSwitcher(group) {
  const tabList = group.querySelector('[data-tabs]');
  const tabs = Array.from(tabList.querySelectorAll('[data-tab]'));
  const panels = new Map(Array.from(group.querySelectorAll('[data-panel]'), panel => [panel.dataset.panel, panel]));
  const pins = Array.from(group.querySelectorAll('[data-pin]'));
  if (!tabs.length || tabs.some(tab => !panels.has(tab.dataset.tab))) return;

  function select(key, moveFocus) {
    if (!panels.has(key)) return;
    for (const tab of tabs) {
      const selected = tab.dataset.tab === key;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels.get(tab.dataset.tab).hidden = !selected;
      if (selected && moveFocus) tab.focus({ preventScroll: true });
    }
    pins.forEach(pin => pin.setAttribute('aria-pressed', String(pin.dataset.pin === key)));
  }

  tabList.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    const key = tab.dataset.tab;
    const panel = panels.get(key);
    tab.id = panel.id + '-tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    tab.addEventListener('click', () => select(key, false));
    tab.addEventListener('keydown', event => {
      let next;
      switch (event.key) {
        case 'ArrowRight': next = (index + 1) % tabs.length; break;
        case 'ArrowLeft': next = (index + tabs.length - 1) % tabs.length; break;
        case 'Home': next = 0; break;
        case 'End': next = tabs.length - 1; break;
        default: return;
      }
      event.preventDefault();
      select(tabs[next].dataset.tab, true);
    });
  });
  pins.forEach(pin => {
    pin.setAttribute('aria-controls', panels.get(pin.dataset.pin).id);
    pin.addEventListener('click', () => select(pin.dataset.pin, false));
  });
  group.classList.add('enhanced');
  select(group.dataset.initial || tabs[0].dataset.tab, false);
}

document.querySelectorAll('[data-switcher]').forEach(enhanceSwitcher);

const modelNav = document.querySelector('.model-nav');
if (modelNav) {
  const menu = modelNav.querySelector('.model-menu');
  const entries = Array.from(modelNav.querySelectorAll('a[href^="#"]'));
  const chapterIds = [...new Set(entries.map(link => link.hash.slice(1)))];
  const chapters = Array.from(document.querySelectorAll('.product-story section[id]')).filter(section => chapterIds.includes(section.id));
  let pending = false;
  let current = '';

  function updateLocation() {
    pending = false;
    const edge = modelNav.getBoundingClientRect().height + 45;
    let active = chapters[0];
    for (const section of chapters) {
      if (section.getBoundingClientRect().top > edge) break;
      active = section;
    }
    if (!active || active.id === current) return;
    current = active.id;
    entries.forEach(link => {
      if (link.hash === '#' + current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function onScroll() {
    if (!pending) {
      pending = true;
      requestAnimationFrame(updateLocation);
    }
  }

  modelNav.addEventListener('click', event => {
    if (event.target.closest('a') && menu.open) menu.open = false;
  });
  document.addEventListener('click', event => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('pageshow', onScroll);
  updateLocation();
}

const room = document.querySelector('[data-room]');
if (room) {
  const kk = document.documentElement.lang === 'kk';
  const t = (ru, kazakh) => kk ? kazakh : ru;
  const inputs = Array.from(room.querySelectorAll('[data-dimension]'));
  const areaText = room.querySelector('[data-area]');
  const note = room.querySelector('[data-area-note]');
  const number = new Intl.NumberFormat(kk ? 'kk-KZ' : 'ru-KZ', {maximumFractionDigits:4});

  function updateArea() {
    const sides = inputs.map(input => {
      const raw = input.value.trim();
      const value = /^(?:\d+(?:[.,]\d{0,2})?|[.,]\d{1,2})$/.test(raw) ? Number(raw.replace(',', '.')) : NaN;
      const valid = Number.isFinite(value) && value > 0;
      input.setAttribute('aria-invalid', String(!valid));
      return valid ? value : NaN;
    });
    if (sides.some(side => !Number.isFinite(side))) {
      areaText.textContent = '—';
      note.textContent = t('Введите длину и ширину больше нуля. Можно использовать до двух знаков после запятой.',
        'Нөлден үлкен ұзындық пен енді енгізіңіз. Үтірден кейін екі таңбаға дейін жазуға болады.');
      return;
    }
    const area = Math.round(sides[0] * 100) * Math.round(sides[1] * 100) / 10000;
    const formatted = number.formatToParts(area).map(part => {
      if (part.type === 'decimal') return ',';
      if (part.type === 'group') return ' ';
      return part.value;
    }).join('');
    areaText.textContent = formatted + ' м²';
    if (area < 25) {
      note.textContent = t('Комната меньше 25 м². Для этой модели заявлен диапазон от 25 до 40 м².',
        'Бөлме 25 м²-ден кіші. Бұл модельге көрсетілген аудан 25–40 м².');
    } else if (area > 40) {
      note.textContent = t('Комната больше 40 м². Это выше заявленного диапазона модели.',
        'Бөлме 40 м²-ден үлкен. Бұл модельге көрсетілген ауданнан жоғары.');
    } else {
      note.textContent = t('В пределах заявленного диапазона 25–40 м².', 'Көрсетілген 25–40 м² аралығына кіреді.');
    }
  }
  room.querySelector('.room-fields').hidden = false;
  inputs.forEach(input => input.addEventListener('input', updateArea));
  updateArea();
}

const quoteDetails = document.querySelector('#selection .quote-box');
if (quoteDetails) {
  function openPriceRequest() {
    quoteDetails.open = true;
  }
  document.querySelectorAll('a[href="#selection"]').forEach(link => link.addEventListener('click', openPriceRequest));
  if (location.hash === '#selection') openPriceRequest();
  window.addEventListener('hashchange', () => {
    if (location.hash === '#selection') openPriceRequest();
  });
}

// Характеристики — короткая таблица видна сразу, а не одна свёрнутая строка (аудит З8)
document.querySelectorAll('.spec-disclosure').forEach(d => { d.open = true; });
