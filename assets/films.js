'use strict';

// Ролики без кнопок (владелец 25.11.2026: «убери везде кнопки, плей пауза… и кнопка полноэкранного режима не нужна»).
// Ролик играет сам: без звука, по кругу, внутри страницы. На экране — играет, ушёл с экрана — пауза (бережём телефон).
// «Уменьшить движение» или режим экономии трафика — не запускаем сами, остаётся первый кадр (постер).
(() => {
  const root = document.body.dataset.root;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const base = root + 'assets/films/';
  const VISIBLE = .35;

  class InlineFilm {
    constructor(frame) {
      this.frame = frame;
      this.video = frame.querySelector('video');
      this.video.muted = true;
      this.video.loop = true;
      this.video.playsInline = true;
      this.ratio = 0;
      this.manual = false;     // нажали на момент ролика в списке — играет даже при «уменьшить движение»
      this.revision = 0;
      this.seekAfterLoad = null;
      this.chapters = Array.from(frame.closest('.mechanism-film')?.querySelectorAll('[data-film-seek]') || []);
      for (const event of ['play', 'pause']) this.video.addEventListener(event, () => this.frame.classList.toggle('is-playing', !this.video.paused));
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
    }

    updateChapter() {
      const moment = Math.min(this.chapters.length - 1, Math.floor(this.video.currentTime / 3));
      this.chapters.forEach((chapter, index) => {
        if (index === moment) chapter.setAttribute('aria-current', 'step');
        else chapter.removeAttribute('aria-current');
      });
    }

    playFrom(seconds) {
      this.load();
      if (this.video.readyState >= 1) this.video.currentTime = seconds;
      else this.seekAfterLoad = seconds;
      this.manual = true;
      if (this.ratio < VISIBLE) this.frame.scrollIntoView({block: 'center', behavior: 'instant'});
      this.ratio = Math.max(VISIBLE, this.ratio);
      sync();
    }

    load() {
      if (!this.video.getAttribute('src')) this.video.src = this.video.dataset.file;
    }

    play() {
      this.load();
      if (!this.video.paused) return;
      this.video.play().catch(() => {});   // браузер не дал запустить — остаётся постер
    }

    replace(slug, name) {
      this.revision++;
      this.manual = false;
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.poster = base + slug + '.webp';
      this.video.dataset.file = base + slug + '.mp4';
      this.video.load();
      this.video.setAttribute('aria-label', name);
      this.frame.dataset.player = slug;
    }
  }

  const players = Array.from(document.querySelectorAll('[data-player]'), el => new InlineFilm(el));
  const byFrame = new Map(players.map(p => [p.frame, p]));
  function sync() {
    const limited = reduced.matches || connection?.saveData;
    const paused = document.hidden || !!document.querySelector('dialog[open]');
    for (const p of players) {
      const run = !paused && p.ratio >= VISIBLE && (!limited || p.manual);
      if (run) p.play();
      else if (!p.video.paused) p.video.pause();
    }
  }
  function modelURL(slug) {
    const link = document.querySelector('.product-card a[href^="p-' + slug + '.html"]');
    return link ? link.href : 'p-' + slug + '.html';
  }

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
        featured.replace(slug, scene.name);
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

  const dialogs = new MutationObserver(sync);
  for (const other of document.querySelectorAll('dialog')) dialogs.observe(other, {attributes: true, attributeFilter: ['open']});
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const p = byFrame.get(entry.target);
        p.ratio = entry.intersectionRatio;
        if (p.ratio < VISIBLE) p.manual = false;
      }
      sync();
    }, {threshold: [0, VISIBLE, .55, .75, 1]});
    for (const p of players) observer.observe(p.frame);
  }
  reduced.addEventListener('change', () => {for (const p of players) p.manual = false; sync();});
  connection?.addEventListener?.('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pageshow', sync);
  window.addEventListener('pagehide', () => {for (const p of players) p.video.pause();});
})();
