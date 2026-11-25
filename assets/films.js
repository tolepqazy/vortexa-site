'use strict';

(() => {
  const root = document.body.dataset.root;
  const labels = document.documentElement.lang === 'kk'
    ? {play: 'Бейнені ойнату', pause: 'Кідірту', replay: 'Қайта көру', watch: 'Бейне көру'}
    : {play: 'Воспроизвести видео', pause: 'Пауза', replay: 'Посмотреть ещё раз', watch: 'Смотреть видео'};
  const products = new Map(JSON.parse(document.querySelector('#products-data').textContent).map(p => [p.id, p]));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const base = root + 'assets/films/';
  const featureBase = root + 'assets/features/';
  const lang = document.documentElement.lang;
  const dialog = document.querySelector('#dialog-film');
  const screen = dialog.querySelector('[data-dialog-video]');

  class InlineFilm {
    constructor(frame) {
      this.frame = frame;
      this.video = frame.querySelector('video');
      this.toggle = frame.querySelector('[data-film-toggle]');
      this.ratio = 0;
      this.manual = false;
      this.stopped = false;
      this.blocked = false;
      this.revision = 0;
      this.seekAfterLoad = null;
      this.chapters = Array.from(frame.closest('.mechanism-film')?.querySelectorAll('[data-film-seek]') || []);
      this.toggle.hidden = false;
      this.toggle.addEventListener('click', () => {
        const play = this.video.paused || this.video.ended;
        if (this.video.ended) this.video.currentTime = 0;
        this.stopped = !play;
        this.manual = play;
        this.blocked = false;
        if (play) {
          for (const other of players) if (other !== this) other.manual = false;
          this.ratio = Math.max(.35, this.ratio);
        }
        sync();
      });
      for (const event of ['play', 'pause', 'ended', 'error']) this.video.addEventListener(event, () => this.updateControls());
      if (this.chapters.length) {
        this.video.addEventListener('loadedmetadata', () => {
          if (this.seekAfterLoad !== null) this.video.currentTime = this.seekAfterLoad;
          this.seekAfterLoad = null;
          this.updateChapter();
        });
        for (const event of ['timeupdate', 'seeked']) this.video.addEventListener(event, () => this.updateChapter());
        for (const chapter of this.chapters) chapter.addEventListener('click', event => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          this.playFrom(Number(chapter.dataset.filmSeek));
        });
        this.updateChapter();
      }
      this.updateControls();
    }

    updateChapter() {
      const moment = Math.min(this.chapters.length - 1, Math.floor(this.video.currentTime / 3));
      this.chapters.forEach((chapter, index) => {
        if (index === moment) chapter.setAttribute('aria-current', 'step');
        else chapter.removeAttribute('aria-current');
      });
    }

    playFrom(seconds) {
      if (this.video.readyState >= 1) this.video.currentTime = seconds;
      else this.seekAfterLoad = seconds;
      this.stopped = this.blocked = false;
      this.manual = true;
      for (const other of players) if (other !== this) other.manual = false;
      if (this.ratio < .35) this.frame.scrollIntoView({block: 'center', behavior: 'instant'});
      this.ratio = Math.max(.35, this.ratio);
      sync();
    }

    updateControls() {
      const playing = !this.video.paused && !this.video.ended;
      const label = playing ? labels.pause : (this.video.ended ? labels.replay : labels.play);
      this.frame.classList.toggle('is-playing', playing);
      this.toggle.setAttribute('aria-label', label);
      this.toggle.title = label;
    }

    play() {
      const v = this.video;
      if (!v.getAttribute('src')) v.src = v.dataset.file;
      if (!v.paused) return;
      const request = this.revision;
      v.play().catch(error => {
        if (request === this.revision && error.name !== 'AbortError') {
          this.blocked = true;
          this.manual = false;
          this.updateControls();
        }
      });
    }

    replace(slug, name) {
      this.revision++;
      this.manual = this.blocked = false;
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.poster = base + slug + '.webp';
      this.video.dataset.file = base + slug + '.mp4';
      this.video.load();
      this.video.setAttribute('aria-label', name);
      this.frame.dataset.player = slug;
      const expand = this.frame.querySelector('[data-film-link]');
      expand.href = this.video.dataset.file;
      expand.dataset.filmLink = slug;
      expand.setAttribute('aria-label', labels.watch + ' · ' + products.get(slug).model);
      expand.title = expand.getAttribute('aria-label');
      this.updateControls();
    }
  }

  const players = Array.from(document.querySelectorAll('[data-player]'), el => new InlineFilm(el));
  const byFrame = new Map(players.map(p => [p.frame, p]));
  function sync() {
    const limited = reduced.matches || connection?.saveData;
    let selected;
    if (!document.hidden && !document.querySelector('dialog[open]')) {
      for (const p of players) {
        if (p.ratio < .35 || p.stopped || p.blocked || p.video.ended || (limited && !p.manual)) continue;
        if (!selected || (p.manual !== selected.manual ? p.manual : p.ratio > selected.ratio)) selected = p;
      }
    }
    for (const p of players) if (p !== selected && !p.video.paused) p.video.pause();
    selected?.play();
  }
  function modelURL(slug) {
    const link = document.querySelector('.product-card a[href^="p-' + slug + '.html"]');
    return link ? link.href : 'p-' + slug + '.html';
  }

  const editions = Array.from(dialog.querySelectorAll('[data-edition]'));
  let dialogProduct;
  let dialogKind;
  function showEdition(kind, seconds = 0) {
    dialogKind = kind;
    const {id, model, name, featureTitle} = dialogProduct;
    const feature = kind === 'feature';
    const file = feature ? featureBase + id + '-' + lang + '.mp4' : base + id + '.mp4';
    screen.poster = (feature ? featureBase : base) + id + '.webp';
    screen.setAttribute('aria-label', (feature ? featureTitle : name) + ' · ' + model);
    for (const button of editions) button.setAttribute('aria-pressed', String(button.dataset.edition === kind));
    dialog.querySelector('[data-dialog-download]').href = file;
    screen.src = file;
    if (seconds > 0) screen.currentTime = seconds;
    screen.play().catch(() => {}); // Native controls remain available if autoplay is restricted.
  }
  for (const button of editions) button.addEventListener('click', () => {
    if (dialogProduct && dialogKind !== button.dataset.edition) showEdition(button.dataset.edition);
  });

  const feature = document.querySelector('[data-feature]');
  if (feature) {
    const featured = byFrame.get(feature.querySelector('[data-player]'));
    const choices = Array.from(feature.querySelectorAll('[data-feature-choice]'));
    const scenes = JSON.parse(feature.querySelector('[data-feature-scenes]').textContent);
    feature.querySelector('.feature-selector').hidden = false;
    for (const choice of choices) {
      choice.addEventListener('click', () => {
        const slug = choice.dataset.featureChoice;
        if (slug === featured.frame.dataset.player) return;
        const scene = scenes[slug];
        featured.replace(slug, scene.name + ' ' + scene.model);
        for (const el of feature.querySelectorAll('[data-feature-text]')) el.textContent = scene[el.dataset.featureText];
        const productLink = feature.querySelector('[data-feature-product]');
        productLink.textContent = scene.action;
        productLink.href = modelURL(slug);
        // «Купить» на обложке покупает модель, которая сейчас показана
        feature.querySelector('[data-buy]')?.setAttribute('data-buy', slug);
        const buyStatus = feature.querySelector('[data-buy-status]');
        if (buyStatus) buyStatus.replaceChildren();
        for (const item of choices) item.setAttribute('aria-pressed', String(item === choice));
        sync();
      });
    }
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-film-link]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || typeof dialog.showModal !== 'function') return;
    const product = products.get(link.dataset.filmLink);
    if (!product) return;
    event.preventDefault();
    dialogProduct = product;
    dialog.querySelector('[data-dialog-model]').textContent = product.model;
    dialog.querySelector('#film-title').textContent = product.name;
    const model = dialog.querySelector('[data-dialog-product]');
    model.href = modelURL(product.id);
    model.hidden = document.body.dataset.page === 'p-' + product.id + '.html';
    dialog.querySelector('[data-edition="feature"]').textContent = product.featureTitle;
    const inline = link.closest('[data-player]')?.querySelector('video');
    const start = inline && !inline.ended ? inline.currentTime : 0;
    dialog.showModal();
    sync();
    showEdition(link.dataset.filmKind || 'overview', start);
  });
  dialog.addEventListener('close', () => {
    screen.pause();
    screen.removeAttribute('src');
    screen.load();
    dialogProduct = null;
    sync();
  });

  const dialogs = new MutationObserver(sync);
  for (const other of document.querySelectorAll('dialog')) dialogs.observe(other, {attributes: true, attributeFilter: ['open']});
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const p = byFrame.get(entry.target);
        p.ratio = entry.intersectionRatio;
        if (p.ratio < .35) p.manual = false;
      }
      sync();
    }, {threshold: [0, .35, .55, .75, .95, 1]});
    for (const p of players) observer.observe(p.frame);
  } else {
    for (const p of players) p.blocked = true;
  }
  reduced.addEventListener('change', () => {for (const p of players) p.manual = false; sync();});
  connection?.addEventListener?.('change', sync);
  document.addEventListener('visibilitychange', () => {if (document.hidden) screen.pause(); sync();});
  window.addEventListener('pageshow', sync);
  window.addEventListener('pagehide', () => {for (const p of players) p.video.pause(); screen.pause();});
})();
