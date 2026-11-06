// Disney Movie Tracker: plain ES modules, no build step, so GitHub Pages can serve it as-is.
import { WatchedStore } from './store.js';
import { firebaseConfig, enableGoogleSignIn } from './firebase-config.js';

/* ------------------------------------------------------------------ constants */

const IMG = 'https://image.tmdb.org/t/p/';
const STUDIOS = [
  { name: 'Walt Disney Animation Studios', short: 'Disney Animation' },
  { name: 'Pixar', short: 'Pixar' },
  { name: 'DisneyToon Studios', short: 'DisneyToon' },
];
const ERAS = [
  { id: 'golden', name: 'The Golden Age', from: 1937, to: 1942 },
  { id: 'wartime', name: 'The Wartime Era', from: 1943, to: 1949 },
  { id: 'silver', name: 'The Silver Age', from: 1950, to: 1967 },
  { id: 'bronze', name: 'The Bronze Age', from: 1968, to: 1988 },
  { id: 'renaissance', name: 'The Disney Renaissance', from: 1989, to: 1999 },
  { id: 'post-renaissance', name: 'The Post-Renaissance', from: 2000, to: 2008 },
  { id: 'revival', name: 'The Revival Era', from: 2009, to: 2019 },
  { id: 'streaming', name: 'The Streaming Era', from: 2020, to: 9999 },
];
const RELEASE_TYPES = ['Theatrical', 'Direct-to-video', 'Direct-to-streaming', 'TV movie'];
const DEFAULT_BROWSE = { q: '', status: 'all', studio: '', era: '', type: '', sort: 'date-asc' };
const SUGGEST_PREFS_KEY = 'dmt:suggest-prefs';
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)');

const svg = (body, attrs = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') =>
  `<svg viewBox="0 0 24 24" ${attrs} aria-hidden="true" focusable="false">${body}</svg>`;
const ICON = {
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 'fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"'),
  play: svg('<path d="M8 5.6v12.8a1 1 0 0 0 1.5.86l10.2-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6z"/>', 'fill="currentColor"'),
  info: svg('<circle cx="12" cy="12" r="9.25"/><path d="M12 11v5.5M12 7.6v.01"/>'),
  dice: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><g fill="currentColor" stroke="none"><circle cx="8.5" cy="8.5" r="1.4"/><circle cx="15.5" cy="8.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="8.5" cy="15.5" r="1.4"/><circle cx="15.5" cy="15.5" r="1.4"/></g>'),
  user: svg('<circle cx="12" cy="8.5" r="3.75"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>', 'fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"'),
  chevL: svg('<path d="M15 5l-7 7 7 7"/>', 'fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"'),
  chevR: svg('<path d="M9 5l7 7-7 7"/>', 'fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"'),
  sparkle: svg('<path d="M12 2.5c.8 4.9 2.6 6.7 7.5 7.5-4.9.8-6.7 2.6-7.5 7.5-.8-4.9-2.6-6.7-7.5-7.5 4.9-.8 6.7-2.6 7.5-7.5z"/><path d="M19 16.5c.3 1.8 1 2.5 2.75 2.75-1.75.3-2.45 1-2.75 2.75-.3-1.75-1-2.45-2.75-2.75 1.75-.25 2.45-.95 2.75-2.75z"/>', 'fill="currentColor"'),
  download: svg('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
  upload: svg('<path d="M12 20V9M7 13.5l5-5 5 5M5 4h14"/>'),
  logout: svg('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>'),
  cloud: svg('<path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.75 4.75 0 0 0 7 18.5z"/>'),
  device: svg('<rect x="6" y="2.75" width="12" height="18.5" rx="2.5"/><path d="M11 18h2"/>'),
  google:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>',
};

/* ------------------------------------------------------------------ helpers */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pad = (n) => String(n).padStart(2, '0');
const NOW = new Date();
const TODAY = `${NOW.getFullYear()}-${pad(NOW.getMonth() + 1)}-${pad(NOW.getDate())}`;
const isUpcoming = (m) => !!m.releaseDate && m.releaseDate > TODAY;
const daysUntil = (date) => Math.ceil((new Date(`${date}T00:00:00`) - NOW) / 864e5);
const img = (path, size = 'w342') => (path ? `${IMG}${size}${path}` : '');
const studioShort = (name) => STUDIOS.find((s) => s.name === name)?.short || name;
const eraYears = (e) => `${e.from}–${e.to > 3000 ? 'today' : e.to}`;
// TMDB rating pulled towards the average when a movie has few votes, so a brand-new release
// with a handful of 10/10 votes doesn't top the charts.
const score = (m) => (m.rating ? (m.votes * m.rating + 400 * 6.8) / (m.votes + 400) : 0);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const norm = (s = '') =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const fmtRuntime = (min) => (!min ? '' : min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${pad(min % 60)}m`);
const fmtTotal = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};
const toDate = (v) => (typeof v === 'number' ? new Date(v) : new Date(`${v}T00:00:00`));
const fmtDate = (v) => (v ? toDate(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const fmtDayMonth = (v) => (v ? toDate(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fromHTML = (s) => {
  const t = document.createElement('template');
  t.innerHTML = s.trim();
  return t.content.firstElementChild;
};
const debounce = (fn, ms) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};
const readPref = (key, fallback) => {
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') };
  } catch {
    return { ...fallback };
  }
};
const writePref = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

/* ------------------------------------------------------------------ state */

const store = new WatchedStore({ resumeUser: !!firebaseConfig });
let cloud = null;
let cloudReady = Promise.resolve(null);
let stopCloudWatch = null;

const state = {
  movies: [],
  released: [],
  byId: new Map(),
  order: new Map(),
  rows: [],
  heroSlides: [],
  heroIndex: 0,
  view: 'home',
  browse: { ...DEFAULT_BROWSE },
};

const searchInput = $('#search');

async function init() {
  bindEvents();
  updateAccountButton();

  let data;
  try {
    const res = await fetch('data/movies.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    $('#main').innerHTML = `<div class="load-error"><h2>Couldn’t load the movie list</h2>
      <p>${esc(err.message)}. If you opened <code>index.html</code> straight from disk, start a local web server instead (see README).</p></div>`;
    return;
  }

  state.movies = data.movies;
  state.movies.forEach((m, i) => {
    state.byId.set(m.id, m);
    state.order.set(m.id, i);
    m._title = norm(m.title);
    m._text = norm([m.title, m.year, m.studio, m.collection?.name, ...m.genres, ...m.directors, ...m.cast.map((c) => c.name)].join(' '));
  });
  state.released = state.movies.filter((m) => !isUpcoming(m));

  fillBrowseSelects();
  renderHome();
  applyRoute({ scroll: false });
  store.addEventListener('change', onStoreChange);
  connectCloudIfConfigured();
}

/* ------------------------------------------------------------------ shared markup */

function metaHTML(m, { genres = true } = {}) {
  const parts = [
    m.rating ? `<span class="rating" title="TMDB user rating">★ ${m.rating.toFixed(1)}</span>` : '',
    m.certification ? `<span class="cert">${esc(m.certification)}</span>` : '',
    `<span>${m.year}</span>`,
    m.runtime ? `<span>${fmtRuntime(m.runtime)}</span>` : '',
    genres
      ? `<span>${esc(m.genres.filter((g) => g !== 'Animation' && g !== 'Family').slice(0, 2).join(', '))}</span>`
      : '',
  ];
  return parts.filter((p) => p && p !== '<span></span>').join('');
}

const titleArt = (m, tag = 'h2') =>
  m.logo
    ? `<${tag} class="title-art"><img class="title-logo" src="${img(m.logo, 'w500')}" alt="${esc(m.title)}"></${tag}>`
    : `<${tag} class="title-art title-text">${esc(m.title)}</${tag}>`;

const watchLabel = (on) => (on ? `${ICON.check}<span>Watched</span>` : `${ICON.plus}<span>Mark as watched</span>`);
const watchBtnHTML = (m) => {
  const on = store.has(m.id);
  return `<button class="btn btn-glass watch-btn${on ? ' is-on' : ''}" type="button" data-action="toggle" aria-pressed="${on}">${watchLabel(on)}</button>`;
};
function setWatchBtn(btn, on) {
  btn.classList.toggle('is-on', on);
  btn.setAttribute('aria-pressed', on);
  btn.innerHTML = watchLabel(on);
}

function cardHTML(m) {
  const on = store.has(m.id);
  const up = isUpcoming(m);
  return `<article class="card${on ? ' is-watched' : ''}${up ? ' is-upcoming' : ''}" data-id="${m.id}">
    <button class="card-open" type="button" data-action="open" aria-label="${esc(m.title)} (${m.year}), more info">
      <span class="card-fallback" aria-hidden="true">${esc(m.title)}</span>
      ${m.poster ? `<img src="${img(m.poster)}" alt="" loading="lazy" decoding="async">` : ''}
      ${up ? `<span class="card-tag">${fmtDayMonth(m.releaseDate)}</span>` : ''}
    </button>
    ${
      up
        ? ''
        : `<button class="card-check" type="button" data-action="toggle" aria-pressed="${on}" aria-label="${on ? 'Unmark' : 'Mark'} ${esc(m.title)} as watched" title="${on ? 'Watched (click to undo)' : 'Mark as watched'}">${ICON.check}</button>`
    }
    <div class="card-info" aria-hidden="true"><span class="card-title">${esc(m.title)}</span><span>${m.year}${m.runtime ? ` · ${fmtRuntime(m.runtime)}` : ''}</span></div>
  </article>`;
}

function syncCard(el, m) {
  const on = store.has(m.id);
  el.classList.toggle('is-watched', on);
  const btn = $('.card-check', el);
  if (!btn) return;
  btn.setAttribute('aria-pressed', on);
  btn.setAttribute('aria-label', `${on ? 'Unmark' : 'Mark'} ${m.title} as watched`);
  btn.title = on ? 'Watched (click to undo)' : 'Mark as watched';
}

/* ------------------------------------------------------------------ home: hero */

function pickHeroSlides() {
  const soon = state.movies.filter((m) => isUpcoming(m) && m.backdrop && daysUntil(m.releaseDate) <= 60).slice(0, 1);
  const unwatched = state.released.filter((m) => m.backdrop && m.logo && !store.has(m.id));
  const pool = unwatched.length >= 4 ? unwatched : state.released.filter((m) => m.backdrop);
  return [...soon, ...shuffle(pool).slice(0, 5 - soon.length)];
}

function renderHero() {
  const slides = (state.heroSlides = pickHeroSlides());
  $('#hero').innerHTML =
    slides.map(heroSlideHTML).join('') +
    `<div class="hero-dots">${slides
      .map((m, i) => `<button class="hero-dot" type="button" data-hero="${i}" aria-label="Show ${esc(m.title)}"></button>`)
      .join('')}</div>`;
  showHero(0);
  startHeroTimer();
}

function heroSlideHTML(m) {
  const up = isUpcoming(m);
  const kicker = up ? `Coming ${fmtDate(m.releaseDate)}` : `${studioShort(m.studio)} · ${m.releaseType === 'Theatrical' ? 'Feature film' : m.releaseType}`;
  const src = img(m.backdrop, 'w1280');
  const srcset = `${img(m.backdrop, 'w780')} 780w, ${src} 1280w, ${img(m.backdrop, 'original')} 1920w`;
  return `<div class="hero-slide" data-id="${m.id}">
    <img class="hero-bg" data-src="${src}" data-srcset="${srcset}" sizes="100vw" alt="">
    <div class="hero-shade"></div>
    <div class="hero-content">
      <p class="eyebrow">${up ? ICON.sparkle : ''}${esc(kicker)}</p>
      ${titleArt(m)}
      <p class="meta hero-meta">${metaHTML(m)}</p>
      <p class="hero-overview">${esc(m.overview)}</p>
      <div class="hero-actions">
        <button class="btn btn-light" type="button" data-action="open">${ICON.info}<span>More info</span></button>
        ${up ? (m.trailer ? `<button class="btn btn-glass" type="button" data-action="trailer">${ICON.play}<span>Trailer</span></button>` : '') : watchBtnHTML(m)}
      </div>
    </div>
  </div>`;
}

function showHero(i) {
  const slides = $$('.hero-slide');
  if (!slides.length) return;
  state.heroIndex = i;
  slides.forEach((s, j) => {
    const active = j === i;
    s.classList.toggle('is-active', active);
    s.inert = !active;
    s.setAttribute('aria-hidden', String(!active));
    // Load the visible slide and the next one; the rest load when their turn comes.
    if (active || j === (i + 1) % slides.length) {
      const bg = $('.hero-bg', s);
      if (!bg.getAttribute('src')) {
        bg.srcset = bg.dataset.srcset;
        bg.src = bg.dataset.src;
      }
    }
  });
  $$('.hero-dot').forEach((d, j) => d.classList.toggle('is-active', j === i));
}

let heroTimer = null;
function startHeroTimer() {
  stopHeroTimer();
  if (state.heroSlides.length < 2 || state.view !== 'home' || modal.el || document.hidden || REDUCED_MOTION.matches) return;
  heroTimer = setInterval(() => showHero((state.heroIndex + 1) % state.heroSlides.length), 9000);
}
function stopHeroTimer() {
  clearInterval(heroTimer);
  heroTimer = null;
}

/* ------------------------------------------------------------------ home: progress + rows */

function renderProgress() {
  const all = state.released;
  const seen = all.filter((m) => store.has(m.id));
  const total = all.reduce((s, m) => s + (m.runtime || 0), 0);
  const done = seen.reduce((s, m) => s + (m.runtime || 0), 0);
  const p = all.length ? (seen.length / all.length) * 100 : 0;
  const sub = seen.length
    ? `${fmtTotal(done)} watched · ${fmtTotal(total - done)} to go`
    : `${fmtTotal(total)} of animation to go. Tick a poster’s ✓ to start.`;

  $('#progress').innerHTML = `
    <div class="progress-main">
      <div class="ring${seen.length === all.length ? ' is-complete' : ''}" style="--p:${p.toFixed(1)}"><span>${Math.floor(p)}%</span></div>
      <div>
        <p class="progress-title"><strong>${seen.length}</strong> of ${all.length} movies watched</p>
        <p class="progress-sub">${sub}</p>
      </div>
    </div>
    <div class="progress-studios">
      ${STUDIOS.map((s) => {
        const list = all.filter((m) => m.studio === s.name);
        const n = list.filter((m) => store.has(m.id)).length;
        return `<a class="ps${n === list.length ? ' is-complete' : ''}" href="#/browse?studio=${encodeURIComponent(s.name)}">
          <span class="ps-name">${s.short}</span><span class="ps-num">${n}/${list.length}</span>
          <span class="ps-bar"><i style="width:${list.length ? (n / list.length) * 100 : 0}%"></i></span>
        </a>`;
      }).join('')}
    </div>`;
}

function rowDefs() {
  const R = state.released;
  const seen = (m) => store.has(m.id);
  const studioRow = (s) => ({
    key: `studio-${norm(s.short).replace(/ /g, '-')}`,
    title: s.name,
    showCount: true,
    items: () => R.filter((m) => m.studio === s.name),
    link: `#/browse?studio=${encodeURIComponent(s.name)}`,
  });
  const eraRow = (e) => ({
    key: `era-${e.id}`,
    title: e.name,
    sub: () => eraYears(e),
    showCount: true,
    items: () => R.filter((m) => m.year >= e.from && m.year <= e.to),
    link: `#/browse?era=${e.id}`,
  });
  const genreRow = (key, title, genre) => ({ key, title, items: () => R.filter((m) => m.genres.includes(genre)) });

  return [
    {
      key: 'up-next',
      dynamic: true,
      title: 'Up next',
      sub: (list) => `${plural(list.length, 'movie')} to go, in release order`,
      items: () => R.filter((m) => !seen(m)),
      link: '#/browse?status=unwatched',
    },
    {
      key: 'recent',
      dynamic: true,
      title: 'Recently watched',
      items: () => R.filter(seen).sort((a, b) => store.watchedAt(b.id) - store.watchedAt(a.id)),
      link: '#/browse?status=watched',
    },
    { key: 'soon', title: 'Coming soon', items: () => state.movies.filter(isUpcoming) },
    {
      key: 'top',
      title: 'Top 10 highest rated',
      ranked: true,
      items: () => R.filter((m) => m.rating).sort((a, b) => score(b) - score(a)).slice(0, 10),
    },
    studioRow(STUDIOS[0]),
    studioRow(STUDIOS[1]),
    {
      key: 'quick',
      dynamic: true,
      title: 'Short on time?',
      sub: () => 'Not watched yet and under 80 minutes',
      items: () => R.filter((m) => !seen(m) && m.runtime && m.runtime < 80).sort((a, b) => a.runtime - b.runtime),
    },
    studioRow(STUDIOS[2]),
    { key: 'new', title: 'New & recent', items: () => R.filter((m) => m.year >= 2019).reverse() },
    genreRow('fantasy', 'Magic & fairy tales', 'Fantasy'),
    ...ERAS.slice(0, 4).map(eraRow),
    genreRow('romance', 'Love stories', 'Romance'),
    ...ERAS.slice(4).map(eraRow),
    genreRow('scifi', 'Sci-fi & space adventures', 'Science Fiction'),
  ];
}

function renderHome() {
  state.rows = rowDefs();
  $('#rows').innerHTML = state.rows
    .map(
      (r) => `<section class="row" data-row="${r.key}" aria-label="${esc(r.title)}">
      <header class="row-head">
        <h2>${esc(r.title)}</h2>
        <span class="row-sub"></span>
        ${r.link ? `<a class="row-link" href="${r.link}">See all ${ICON.chevR}</a>` : ''}
      </header>
      <div class="row-viewport at-start">
        <button class="row-arrow prev" type="button" data-dir="-1" tabindex="-1" aria-label="Scroll left">${ICON.chevL}</button>
        <div class="row-track${r.ranked ? ' is-ranked' : ''}"></div>
        <button class="row-arrow next" type="button" data-dir="1" tabindex="-1" aria-label="Scroll right">${ICON.chevR}</button>
      </div>
    </section>`,
    )
    .join('');
  state.rows.forEach((r) => fillRow(r));
  renderHero();
  renderProgress();
}

function fillRow(r, keepScroll = false) {
  const section = $(`.row[data-row="${r.key}"]`);
  const track = $('.row-track', section);
  const x = track.scrollLeft;
  r.list = r.items();
  section.hidden = !r.list.length;
  track.innerHTML = r.list
    .map((m, i) => (r.ranked ? `<div class="ranked"><span class="rank-num" aria-hidden="true">${i + 1}</span>${cardHTML(m)}</div>` : cardHTML(m)))
    .join('');
  if (keepScroll) track.scrollLeft = x;
  updateRowSub(r);
  updateArrows(track);
}

function updateRowSub(r) {
  const el = $(`.row[data-row="${r.key}"] .row-sub`);
  const parts = [];
  if (r.sub) parts.push(r.sub(r.list));
  let complete = false;
  if (r.showCount) {
    const n = r.list.filter((m) => store.has(m.id)).length;
    complete = n === r.list.length && n > 0;
    parts.push(complete ? '✓ All watched' : `${n} of ${r.list.length} watched`);
  }
  el.textContent = parts.join(' · ');
  el.classList.toggle('is-complete', complete);
}

function updateArrows(track) {
  const vp = track.parentElement;
  vp.classList.toggle('at-start', track.scrollLeft <= 4);
  vp.classList.toggle('at-end', track.scrollLeft + track.clientWidth >= track.scrollWidth - 4);
}

/* ------------------------------------------------------------------ browse */

const SORTS = {
  'date-asc': (a, b) => state.order.get(a.id) - state.order.get(b.id),
  'date-desc': (a, b) => state.order.get(b.id) - state.order.get(a.id),
  title: (a, b) => sortTitle(a).localeCompare(sortTitle(b)),
  runtime: (a, b) => (a.runtime || 999) - (b.runtime || 999),
  rating: (a, b) => score(b) - score(a),
  recent: (a, b) => (store.watchedAt(b.id) || 0) - (store.watchedAt(a.id) || 0) || SORTS['date-asc'](a, b),
};
const sortTitle = (m) => m._title.replace(/^(the|a|an) /, '');
const defaultSort = (status) => (status === 'watched' ? 'recent' : 'date-asc');

function fillBrowseSelects() {
  $('#f-studio').innerHTML = `<option value="">All studios</option>${STUDIOS.map((s) => `<option value="${esc(s.name)}">${esc(s.name)}</option>`).join('')}`;
  $('#f-era').innerHTML = `<option value="">All eras</option>${ERAS.map((e) => `<option value="${e.id}">${esc(e.name)} (${eraYears(e)})</option>`).join('')}`;
  $('#f-type').innerHTML = `<option value="">All release types</option>${RELEASE_TYPES.map((t) => `<option>${t}</option>`).join('')}`;
}

function browseList() {
  const { q, status, studio, era, type, sort } = state.browse;
  const nq = norm(q);
  const compact = nq.replace(/ /g, '');
  const e = ERAS.find((x) => x.id === era);
  const list = state.movies.filter(
    (m) =>
      (!studio || m.studio === studio) &&
      (!type || m.releaseType === type) &&
      (!e || (m.year >= e.from && m.year <= e.to)) &&
      (status === 'all' || (!isUpcoming(m) && (status === 'watched') === store.has(m.id))) &&
      (!nq || m._text.includes(nq) || m._text.replace(/ /g, '').includes(compact)),
  );
  const cmp = SORTS[sort] || SORTS['date-asc'];
  // When searching, titles that match come before matches on cast or director.
  const titleHit = (m) => (nq && !m._title.includes(nq) ? 1 : 0);
  return list.sort((a, b) => titleHit(a) - titleHit(b) || cmp(a, b));
}

const gridCards = new Map();
function gridCard(m) {
  let el = gridCards.get(m.id);
  if (!el) {
    el = fromHTML(cardHTML(m));
    gridCards.set(m.id, el);
  } else syncCard(el, m);
  return el;
}

function renderGrid() {
  const list = browseList();
  $('#grid').replaceChildren(...list.map(gridCard));
  const b = state.browse;
  const empty = $('#grid-empty');
  empty.hidden = list.length > 0;
  if (!list.length) {
    empty.textContent = b.q
      ? `No movies match “${b.q}”.`
      : b.status === 'watched' && !store.size
        ? 'You haven’t marked any movies as watched yet. Tap the ✓ on a poster to start.'
        : 'No movies match these filters.';
  }
  $('#browse-title').textContent = b.q
    ? `Results for “${b.q}”`
    : { all: 'All movies', watched: 'Watched', unwatched: 'Not watched yet' }[b.status];
  updateBrowseCount(list);
  $('#clear-search').hidden = !b.q;
}

function updateBrowseCount(list = browseList()) {
  const n = list.filter((m) => store.has(m.id)).length;
  const minutes = list.reduce((s, m) => s + (m.runtime || 0), 0);
  $('#browse-count').textContent = [
    plural(list.length, 'movie'),
    state.browse.status === 'all' && list.length ? `${n} watched` : '',
    minutes ? fmtTotal(minutes) : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function syncBrowseControls() {
  const b = state.browse;
  $$('[data-action="status"]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.value === b.status)));
  $('#f-studio').value = b.studio;
  $('#f-era').value = b.era;
  $('#f-type').value = b.type;
  $('#f-sort').value = b.sort;
  if (searchInput.value !== b.q) searchInput.value = b.q;
}

function browseHash() {
  const b = state.browse;
  const p = new URLSearchParams();
  if (b.q) p.set('q', b.q);
  if (b.status !== 'all') p.set('status', b.status);
  if (b.studio) p.set('studio', b.studio);
  if (b.era) p.set('era', b.era);
  if (b.type) p.set('type', b.type);
  if (b.sort !== defaultSort(b.status)) p.set('sort', b.sort);
  const qs = p.toString();
  return `#/browse${qs ? `?${qs}` : ''}`;
}

function updateBrowse() {
  history.replaceState(history.state, '', browseHash());
  syncBrowseControls();
  renderGrid();
  updateNav();
}

function setStatus(status) {
  const b = state.browse;
  if (b.sort === defaultSort(b.status)) b.sort = defaultSort(status);
  b.status = status;
  updateBrowse();
}

function clearSearch() {
  state.browse.q = '';
  searchInput.value = '';
  if (state.view === 'browse') updateBrowse();
}

/* ------------------------------------------------------------------ routing */

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const i = raw.indexOf('?');
  return { path: i < 0 ? raw : raw.slice(0, i), params: new URLSearchParams(i < 0 ? '' : raw.slice(i + 1)) };
}

function applyRoute({ scroll = true } = {}) {
  if (!state.movies.length) return;
  if (modal.el) teardownModal();
  const { path, params } = parseHash();
  state.view = path === 'browse' ? 'browse' : 'home';
  document.body.dataset.view = state.view;
  $('#view-home').hidden = state.view !== 'home';
  $('#view-browse').hidden = state.view !== 'browse';

  if (state.view === 'browse') {
    const status = ['watched', 'unwatched'].includes(params.get('status')) ? params.get('status') : 'all';
    state.browse = {
      q: params.get('q') || '',
      status,
      studio: STUDIOS.some((s) => s.name === params.get('studio')) ? params.get('studio') : '',
      era: ERAS.some((e) => e.id === params.get('era')) ? params.get('era') : '',
      type: RELEASE_TYPES.includes(params.get('type')) ? params.get('type') : '',
      sort: params.get('sort') in SORTS ? params.get('sort') : defaultSort(status),
    };
    syncBrowseControls();
    renderGrid();
    stopHeroTimer();
  } else {
    state.browse = { ...DEFAULT_BROWSE };
    searchInput.value = '';
    $$('.row-track').forEach(updateArrows);
    startHeroTimer();
  }
  updateNav();
  if (scroll) window.scrollTo({ top: 0 });
}

function updateNav() {
  const current = state.view === 'home' ? 'home' : state.browse.status === 'watched' && !state.browse.q ? 'watched' : 'browse';
  $$('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === current;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/* ------------------------------------------------------------------ watched state */

function toggleWatched(id, sourceEl) {
  const m = state.byId.get(id);
  if (!m || isUpcoming(m)) return;
  const before = store.watchedAt(id);
  const on = !before;
  store.set(id, on);

  if (on && sourceEl && !REDUCED_MOTION.matches) {
    sourceEl.classList.remove('pop');
    void sourceEl.offsetWidth;
    sourceEl.classList.add('pop');
  }
  toast(on ? `${ICON.check}<span><b>${esc(m.title)}</b> marked as watched</span>` : `<span><b>${esc(m.title)}</b> removed from watched</span>`, {
    action: 'Undo',
    onAction: () => store.set(id, !on, before || undefined),
  });
  if (on) celebrate(m);
}

function celebrate(m) {
  const R = state.released;
  const groups = [
    { label: 'every movie on the list', list: R },
    ...STUDIOS.map((s) => ({ label: `every ${s.short} movie`, list: R.filter((x) => x.studio === s.name) })),
    ...ERAS.map((e) => ({ label: `all of ${e.name}`, list: R.filter((x) => x.year >= e.from && x.year <= e.to) })),
  ];
  const done = groups.find((g) => g.list.includes(m) && g.list.every((x) => store.has(x.id)));
  if (done) toast(`<span>🎉 You’ve watched ${done.label}!</span>`, { timeout: 7000 });
}

function onStoreChange(e) {
  const id = e.detail.id;
  const cards = id ? $$(`.card[data-id="${CSS.escape(id)}"]`) : $$('.card[data-id]');
  cards.forEach((el) => syncCard(el, state.byId.get(el.dataset.id)));
  $$('.watch-btn').forEach((btn) => {
    const bid = btn.closest('[data-id]')?.dataset.id;
    if (bid && (!id || bid === id)) setWatchBtn(btn, store.has(bid));
  });

  if (modal.kind === 'details' && (!id || modal.id === id)) updateWatchedNote();
  if (modal.kind === 'suggest') updateSuggestCount();

  state.rows.forEach((r) => (r.dynamic ? fillRow(r, true) : r.showCount && updateRowSub(r)));
  renderProgress();

  if (state.view === 'browse') {
    const { status, sort } = state.browse;
    if (!id || status !== 'all' || sort === 'recent') renderGrid();
    else updateBrowseCount();
  }
}

/* ------------------------------------------------------------------ modal */

const modal = { el: null, kind: null, id: null, lastFocus: null };

function openModal(kind, content, label) {
  if (!modal.el) {
    modal.lastFocus = document.activeElement;
    modal.el = fromHTML(`<div class="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" tabindex="-1">
        <button class="modal-close" type="button" aria-label="Close">${ICON.close}</button>
        <div class="modal-content"></div>
      </div>
    </div>`);
    document.body.append(modal.el);
    document.body.classList.add('modal-open');
    history.pushState({ modal: true }, ''); // so the phone's back button closes the dialog
    stopHeroTimer();
  }
  const dialog = $('.modal', modal.el);
  dialog.className = `modal modal-${kind}`;
  dialog.setAttribute('aria-label', label);
  $('.modal-content', modal.el).innerHTML = content;
  modal.el.scrollTop = 0;
  modal.kind = kind;
  modal.id = null;
  dialog.focus({ preventScroll: true });
}

function closeModal() {
  if (!modal.el) return;
  if (history.state?.modal) {
    history.back(); // popstate tears the dialog down
    setTimeout(() => modal.el && teardownModal(), 400);
  } else teardownModal();
}

function teardownModal() {
  if (!modal.el) return;
  spinToken++;
  modal.el.remove();
  modal.el = null;
  modal.kind = null;
  modal.id = null;
  document.body.classList.remove('modal-open');
  modal.lastFocus?.focus?.({ preventScroll: true });
  startHeroTimer();
}

/* ------------------------------------------------------------------ details */

function related(m) {
  const sections = [];
  let exclude = new Set([m.id]);
  if (m.collection) {
    const list = state.movies.filter((x) => x.id !== m.id && x.collection?.id === m.collection.id);
    if (list.length) {
      const name = m.collection.name.replace(/\s*\([^)]*\)/g, '').replace(/\s*Collection$/i, '').trim();
      sections.push({ title: `More from ${name}`, list });
      list.forEach((x) => exclude.add(x.id));
    }
  }
  const similar = state.released
    .filter((x) => !exclude.has(x.id) && x.studio === m.studio)
    .map((x) => ({ x, score: Math.abs(x.year - m.year) - x.genres.filter((g) => m.genres.includes(g)).length * 2 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)
    .map((s) => s.x)
    .sort(SORTS['date-asc']);
  if (similar.length) sections.push({ title: 'More like this', list: similar });
  return sections;
}

function detailsHTML(m) {
  const up = isUpcoming(m);
  const on = store.has(m.id);
  const fact = (label, value) => (value ? `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>` : '');
  const voices = m.cast
    .slice(0, 5)
    .map((c) => {
      const role = c.character.replace(/\s*\((voice|singing voice)\)/gi, '').trim();
      return role ? `${c.name} (${role})` : c.name;
    })
    .join(', ');

  return `<article class="details" data-id="${m.id}">
    <div class="details-hero">
      ${m.backdrop ? `<img class="details-bg" src="${img(m.backdrop, 'w1280')}" alt="">` : ''}
      <div class="details-shade"></div>
      <div class="details-hero-content">
        ${titleArt(m)}
        <div class="details-actions">
          ${up ? `<span class="pill pill-gold">${ICON.sparkle} In cinemas ${fmtDate(m.releaseDate)}</span>` : watchBtnHTML(m)}
          ${m.trailer ? `<button class="btn btn-glass" type="button" data-action="trailer">${ICON.play}<span>Trailer</span></button>` : ''}
        </div>
      </div>
    </div>
    <div class="details-body">
      <div class="details-main">
        <p class="meta">${metaHTML(m, { genres: false })}<span>${esc(studioShort(m.studio))}</span></p>
        <p class="watched-note"${on ? '' : ' hidden'}>${ICON.check}<span>${on ? `You watched this on ${fmtDate(store.watchedAt(m.id))}` : ''}</span></p>
        ${m.tagline ? `<p class="tagline">${esc(m.tagline)}</p>` : ''}
        <p class="overview">${esc(m.overview || 'No synopsis available yet.')}</p>
      </div>
      <dl class="facts">
        ${fact('Studio', m.studio)}
        ${fact('Release', [m.releaseType, fmtDate(m.releaseDate)].filter(Boolean).join(' · '))}
        ${fact('Genres', m.genres.filter((g) => g !== 'Animation').join(', '))}
        ${fact(m.directors.length > 1 ? 'Directors' : 'Director', m.directors.join(', '))}
        ${fact('Voices', voices)}
      </dl>
    </div>
    ${related(m)
      .map((s) => `<section class="details-section"><h3>${esc(s.title)}</h3><div class="mini-grid">${s.list.map(cardHTML).join('')}</div></section>`)
      .join('')}
    <p class="details-source">Movie info: <a href="https://www.themoviedb.org/movie/${m.tmdbId}" target="_blank" rel="noopener">TMDB</a></p>
  </article>`;
}

function openDetails(id, { trailer = false } = {}) {
  const m = state.byId.get(id);
  if (!m) return;
  openModal('details', detailsHTML(m), m.title);
  modal.id = id;
  if (trailer) playTrailer(m);
}

function playTrailer(m) {
  const hero = modal.el && $('.details-hero', modal.el);
  if (!hero || !m.trailer || hero.classList.contains('is-playing')) return;
  hero.classList.add('is-playing');
  hero.insertAdjacentHTML(
    'beforeend',
    `<iframe class="details-trailer" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(m.trailer)}?autoplay=1&rel=0&playsinline=1"
      title="${esc(m.title)} trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`,
  );
}

function updateWatchedNote() {
  const note = modal.el && $('.watched-note', modal.el);
  if (!note) return;
  const ts = store.watchedAt(modal.id);
  note.hidden = !ts;
  $('span', note).textContent = ts ? `You watched this on ${fmtDate(ts)}` : '';
}

/* ------------------------------------------------------------------ suggest */

const suggestPrefs = readPref(SUGGEST_PREFS_KEY, { time: 0, studio: '', extras: true });
const recentPicks = [];
let spinToken = 0;

function suggestPool() {
  const { time, studio, extras } = suggestPrefs;
  return state.released.filter(
    (m) =>
      !store.has(m.id) &&
      (!time || (m.runtime && m.runtime <= time)) &&
      (!studio || m.studio === studio) &&
      (extras || m.releaseType === 'Theatrical' || m.releaseType === 'Direct-to-streaming'),
  );
}

function optGroup(key, label, options) {
  return `<div class="opt"><span class="opt-label">${label}</span><div class="chips">${options
    .map(
      ([value, text]) =>
        `<button class="chip" type="button" data-action="suggest-opt" data-key="${key}" data-value="${esc(String(value))}" aria-pressed="${String(suggestPrefs[key]) === String(value)}">${text}</button>`,
    )
    .join('')}</div></div>`;
}

function openSuggest() {
  if (!state.movies.length) return;
  openModal(
    'suggest',
    `<div class="suggest">
      <header>
        <p class="eyebrow">${ICON.sparkle}Movie night</p>
        <h2>What should I watch?</h2>
      </header>
      <div class="suggest-stage">
        <button class="suggest-poster" type="button" data-action="open" aria-label="More info"><img alt=""></button>
        <div class="suggest-info" aria-live="polite"></div>
      </div>
      <div class="suggest-filters">
        ${optGroup('time', 'Time', [[0, 'Any length'], [80, 'Under 80 min'], [100, 'Under 100 min'], [120, 'Under 2 hours']])}
        ${optGroup('studio', 'Studio', [['', 'All'], ...STUDIOS.map((s) => [s.name, s.short])])}
        ${optGroup('extras', 'Include', [[true, 'Everything'], [false, 'Skip direct-to-video']])}
        <p class="suggest-count"></p>
      </div>
    </div>`,
    'Suggest a movie',
  );
  spin();
}

function setSuggestOpt(btn) {
  const { key, value } = btn.dataset;
  suggestPrefs[key] = key === 'time' ? Number(value) : key === 'extras' ? value === 'true' : value;
  writePref(SUGGEST_PREFS_KEY, suggestPrefs);
  $$(`[data-action="suggest-opt"][data-key="${key}"]`, modal.el).forEach((c) => c.setAttribute('aria-pressed', String(c === btn)));
  spin();
}

function updateSuggestCount(pool = suggestPool()) {
  const el = modal.el && $('.suggest-count', modal.el);
  if (el) el.textContent = pool.length ? `${plural(pool.length, 'unwatched movie')} match${pool.length === 1 ? 'es' : ''}` : '';
}

function spin() {
  if (modal.kind !== 'suggest') return;
  const token = ++spinToken;
  const root = modal.el;
  const stage = $('.suggest-stage', root);
  const poster = $('.suggest-poster', root);
  const posterImg = $('img', poster);
  const info = $('.suggest-info', root);
  const pool = suggestPool();
  updateSuggestCount(pool);
  delete poster.dataset.id;

  if (!pool.length) {
    const allDone = state.released.every((m) => store.has(m.id));
    stage.classList.remove('is-spinning', 'is-landed');
    stage.classList.add('is-empty');
    info.innerHTML = allDone
      ? '<h3>You’ve watched them all! 🏆</h3><p class="muted">Every single movie on the list. Time for a rewatch?</p>'
      : '<h3>Nothing left with these filters</h3><p class="muted">You’ve watched every movie that matches. Try another length or studio.</p>';
    return;
  }
  stage.classList.remove('is-empty');

  const fresh = pool.filter((m) => !recentPicks.includes(m.id));
  const pick = pickRandom(fresh.length ? fresh : pool);
  recentPicks.push(pick.id);
  if (recentPicks.length > 10) recentPicks.shift();

  const others = shuffle(state.released.filter((m) => m !== pick && m.poster));
  const frames = REDUCED_MOTION.matches ? [] : others.slice(0, 14);
  [...frames, pick].forEach((m) => {
    new Image().src = img(m.poster);
  });

  stage.classList.remove('is-landed');
  stage.classList.add('is-spinning');
  info.innerHTML = '<p class="suggest-shuffling">Shuffling the vault…</p>';

  let i = 0;
  const land = () => {
    if (token !== spinToken) return;
    posterImg.src = img(pick.poster);
    posterImg.alt = pick.title;
    poster.dataset.id = pick.id;
    poster.setAttribute('aria-label', `${pick.title}, more info`);
    stage.classList.remove('is-spinning');
    void stage.offsetWidth;
    stage.classList.add('is-landed');
    info.innerHTML = `<div class="suggest-result" data-id="${pick.id}">
      <p class="eyebrow">${esc(studioShort(pick.studio))} · ${pick.year}</p>
      <h3>${esc(pick.title)}</h3>
      <p class="meta">${metaHTML(pick)}</p>
      <p class="overview">${esc(pick.overview)}</p>
      <div class="suggest-actions">
        <button class="btn btn-light" type="button" data-action="open">${ICON.info}<span>More info</span></button>
        ${watchBtnHTML(pick)}
        <button class="btn btn-magic" type="button" data-action="spin">${ICON.dice}<span>Another one</span></button>
      </div>
    </div>`;
  };
  const step = () => {
    if (token !== spinToken) return;
    if (i >= frames.length) return land();
    posterImg.src = img(frames[i].poster);
    i++;
    setTimeout(step, 45 + i * i * 1.1); // slows down like a wheel of fortune
  };
  step();
}

/* ------------------------------------------------------------------ accounts */

function connectCloudIfConfigured() {
  if (!firebaseConfig) return;
  cloudReady = import('./cloud.js')
    .then(({ connectCloud }) => connectCloud(firebaseConfig))
    .then((c) => {
      cloud = c;
      c.onUser(onUser);
      return c;
    })
    .catch((err) => {
      console.error('Could not start Firebase', err);
      toast('<span>Couldn’t reach the sync service. Your list is saved in this browser for now.</span>');
      return null;
    });
}

function onUser(user) {
  stopCloudWatch?.();
  stopCloudWatch = null;
  if (!user) {
    store.useGuest();
    updateAccountButton();
    return;
  }
  const moved = store.useUser(user, {
    set: (id, ts) => cloud.setWatched(user.uid, id, ts).catch(syncError),
    merge: (map) => cloud.mergeWatched(user.uid, map).catch(syncError),
  });
  stopCloudWatch = cloud.watch(user.uid, (map) => store.applyRemote(map), syncError);
  if (moved) toast(`<span>Added ${plural(moved, 'movie')} from this device to your account.</span>`);
  updateAccountButton();
}

function syncError(err) {
  console.error('Sync error', err);
  toast(
    err?.code === 'permission-denied'
      ? '<span>Sync was refused. Check the Firestore rules (see README).</span>'
      : '<span>Sync problem. Your changes are kept on this device.</span>',
  );
}

function updateAccountButton() {
  const btn = $('#account-btn');
  const u = store.user || store.cachedUser;
  if (u) {
    const initial = (u.name || u.email || '?').trim().charAt(0).toUpperCase();
    btn.innerHTML = `<span class="avatar">${esc(initial)}</span>`;
    btn.setAttribute('aria-label', `Account: ${u.name || u.email}`);
  } else {
    btn.innerHTML = `<span class="avatar avatar-guest">${ICON.user}</span>${firebaseConfig ? '<span class="account-label">Sign in</span>' : ''}`;
    btn.setAttribute('aria-label', firebaseConfig ? 'Sign in or register' : 'Your progress');
  }
}

function statsLine() {
  const seen = state.released.filter((m) => store.has(m.id));
  return `${plural(seen.length, 'movie')} watched · ${fmtTotal(seen.reduce((s, m) => s + (m.runtime || 0), 0))}`;
}

const backupButtons = () => `<div class="account-actions">
  <button class="btn btn-glass" type="button" data-action="export">${ICON.download}<span>Export list</span></button>
  <button class="btn btn-glass" type="button" data-action="import">${ICON.upload}<span>Import list</span></button>
</div>`;

function openAccount() {
  if (store.user) {
    const u = store.user;
    openModal(
      'account',
      `<div class="account">
        <div class="account-head">
          <span class="avatar avatar-lg">${esc((u.name || u.email || '?').charAt(0).toUpperCase())}</span>
          <div><h2>${esc(u.name || 'Your account')}</h2><p class="muted">${esc(u.email)}</p></div>
        </div>
        <p class="account-note">${ICON.cloud}<span>Your watched list syncs to every device where you’re signed in.</span></p>
        <p class="account-stats">${statsLine()}</p>
        ${backupButtons()}
        <button class="btn btn-ghost btn-block" type="button" data-action="sign-out">${ICON.logout}<span>Sign out</span></button>
      </div>`,
      'Your account',
    );
  } else if (firebaseConfig) {
    openAuth('signin');
  } else {
    openModal(
      'account',
      `<div class="account">
        <h2>Your progress</h2>
        <p class="account-note">${ICON.device}<span>Your watched list is saved in this browser on this device. Export it to keep a backup or move it to another device.</span></p>
        <p class="account-stats">${statsLine()}</p>
        ${backupButtons()}
      </div>`,
      'Your progress',
    );
  }
}

function openAuth(mode, email = '') {
  const register = mode === 'register';
  const guestCount = store.user ? 0 : state.released.filter((m) => store.has(m.id)).length;
  openModal(
    'auth',
    `<div class="auth">
      <h2>${register ? 'Create your account' : 'Welcome back'}</h2>
      <p class="muted">${register ? 'Register to keep your watched list on all your devices.' : 'Sign in to sync your watched list across devices.'}</p>
      <div class="segmented" role="tablist">
        <button type="button" role="tab" data-action="auth-tab" data-mode="signin" aria-selected="${!register}">Sign in</button>
        <button type="button" role="tab" data-action="auth-tab" data-mode="register" aria-selected="${register}">Register</button>
      </div>
      <form class="auth-form" data-mode="${mode}" novalidate>
        ${register ? '<label class="field"><span>Name</span><input name="name" autocomplete="name" maxlength="60" placeholder="What should we call you?"></label>' : ''}
        <label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" required value="${esc(email)}"></label>
        <label class="field"><span>Password</span><input name="password" type="password" required minlength="6" autocomplete="${register ? 'new-password' : 'current-password'}"${register ? ' placeholder="At least 6 characters"' : ''}></label>
        <p class="form-msg" role="alert"></p>
        <button class="btn btn-primary btn-block" type="submit"><span>${register ? 'Create account' : 'Sign in'}</span></button>
        ${register ? '' : '<button class="link-btn" type="button" data-action="reset-password">Forgot your password?</button>'}
      </form>
      ${
        enableGoogleSignIn
          ? `<div class="divider"><span>or</span></div>
             <button class="btn btn-google btn-block" type="button" data-action="google">${ICON.google}<span>Continue with Google</span></button>`
          : ''
      }
      ${guestCount ? `<p class="auth-hint">The ${plural(guestCount, 'movie')} you’ve marked on this device will be added to your account.</p>` : ''}
    </div>`,
    register ? 'Register' : 'Sign in',
  );
  const form = $('.auth-form', modal.el);
  form.addEventListener('submit', onAuthSubmit);
  $(register ? '[name=name]' : email ? '[name=password]' : '[name=email]', form).focus();
}

const AUTH_ERRORS = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-login-credentials': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'There’s no account with this email yet. Register instead?',
  'auth/email-already-in-use': 'There’s already an account with this email. Try signing in.',
  'auth/weak-password': 'Choose a password of at least 6 characters.',
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/missing-email': 'Enter your email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
  'auth/unauthorized-domain': 'This website address isn’t allowed in Firebase yet (Authentication → Settings → Authorized domains).',
  'auth/operation-not-allowed': 'This sign-in method isn’t switched on in Firebase.',
  unavailable: 'Accounts aren’t available right now. Try again later.',
};
const authError = (err) => AUTH_ERRORS[err?.code] || `Something went wrong (${err?.code || err?.message || 'unknown error'}).`;

function setFormMsg(form, text, ok = false) {
  const el = $('.form-msg', form);
  el.textContent = text;
  el.classList.toggle('is-ok', ok);
}

async function onAuthSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const register = form.dataset.mode === 'register';
  const data = Object.fromEntries(new FormData(form));
  const email = (data.email || '').trim();
  const name = (data.name || '').trim();
  if (!email) return setFormMsg(form, AUTH_ERRORS['auth/missing-email']);
  if (!data.password) return setFormMsg(form, AUTH_ERRORS['auth/missing-password']);

  const btn = $('[type=submit]', form);
  btn.disabled = true;
  setFormMsg(form, '');
  try {
    const c = await cloudReady;
    if (!c) throw { code: 'unavailable' };
    if (register) {
      await c.register(name, email, data.password);
      store.updateUser({ name });
      updateAccountButton();
    } else {
      await c.signIn(email, data.password);
    }
    closeModal();
    toast(`<span>${register ? `Welcome${name ? `, ${esc(name)}` : ''}! Your account is ready.` : 'Signed in. Your list is synced.'}</span>`);
  } catch (err) {
    setFormMsg(form, authError(err));
    btn.disabled = false;
  }
}

async function resetPassword() {
  const form = $('.auth-form', modal.el);
  const email = $('[name=email]', form).value.trim();
  if (!email) return setFormMsg(form, 'Enter your email above first, then click “Forgot your password?” again.');
  try {
    const c = await cloudReady;
    if (!c) throw { code: 'unavailable' };
    await c.resetPassword(email);
    setFormMsg(form, `If there’s an account for ${email}, a reset link is on its way. Check your inbox.`, true);
  } catch (err) {
    setFormMsg(form, authError(err));
  }
}

async function signInWithGoogle() {
  try {
    const c = await cloudReady;
    if (!c) throw { code: 'unavailable' };
    await c.signInWithGoogle();
    closeModal();
    toast('<span>Signed in. Your list is synced.</span>');
  } catch (err) {
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') return;
    const form = modal.el && $('.auth-form', modal.el);
    if (form) setFormMsg(form, authError(err));
  }
}

async function signOut() {
  await cloud?.signOut();
  closeModal();
  toast('<span>Signed out. Your list is safe in your account.</span>');
}

function exportList() {
  const watched = Object.entries(store.toJSON())
    .filter(([id]) => state.byId.has(id))
    .sort((a, b) => a[1] - b[1])
    .map(([id, ts]) => ({ id, title: state.byId.get(id).title, watchedAt: new Date(ts).toISOString() }));
  const blob = new Blob([JSON.stringify({ app: 'disney-movie-tracker', version: 1, exportedAt: new Date().toISOString(), watched }, null, 2)], {
    type: 'application/json',
  });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `disney-movies-watched-${TODAY}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function importList() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
  input.addEventListener('change', async () => {
    try {
      const data = JSON.parse(await input.files[0].text());
      const entries = Array.isArray(data.watched) ? data.watched : Object.entries(data.watched || {}).map(([id, watchedAt]) => ({ id, watchedAt }));
      const map = {};
      for (const e of entries) if (state.byId.has(e?.id)) map[e.id] = new Date(e.watchedAt).getTime() || Date.now();
      const n = store.merge(map);
      toast(`<span>${n ? `Imported ${plural(n, 'movie')}.` : 'Nothing new to import.'}</span>`);
      if (modal.kind === 'account') $('.account-stats', modal.el).textContent = statsLine();
    } catch {
      toast('<span>That file couldn’t be read. Pick a file exported from this site.</span>');
    }
  });
  input.click();
}

/* ------------------------------------------------------------------ toasts */

function toast(message, { action, onAction, timeout = 4500 } = {}) {
  const root = $('#toasts');
  const el = fromHTML(`<div class="toast">${message}${action ? `<button class="toast-action" type="button">${esc(action)}</button>` : ''}</div>`);
  const dismiss = () => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 250);
  };
  if (action) {
    $('.toast-action', el).addEventListener('click', () => {
      onAction?.();
      dismiss();
    });
  }
  root.append(el);
  while (root.children.length > 3) root.firstElementChild.remove();
  setTimeout(dismiss, timeout);
}

/* ------------------------------------------------------------------ events */

function bindEvents() {
  document.addEventListener('click', onClick);
  window.addEventListener('hashchange', () => applyRoute());
  window.addEventListener('popstate', () => {
    if (modal.el && !history.state?.modal) teardownModal();
  });

  const topbar = $('#topbar');
  const onScroll = () => topbar.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  document.addEventListener(
    'scroll',
    (e) => {
      if (e.target.classList?.contains('row-track')) updateArrows(e.target);
    },
    { capture: true, passive: true },
  );
  window.addEventListener('resize', debounce(() => $$('.row-track').forEach(updateArrows), 150));

  // Broken image: show the title text that sits behind the poster, or swap a logo for text.
  document.addEventListener(
    'error',
    (e) => {
      const el = e.target;
      if (el.tagName !== 'IMG') return;
      if (el.classList.contains('title-logo')) {
        const h = el.parentElement;
        h.classList.add('title-text');
        h.textContent = el.alt;
      } else el.classList.add('is-broken');
    },
    true,
  );

  const hero = $('#hero');
  hero.addEventListener('mouseenter', stopHeroTimer);
  hero.addEventListener('mouseleave', startHeroTimer);
  hero.addEventListener('focusin', stopHeroTimer);
  document.addEventListener('visibilitychange', () => (document.hidden ? stopHeroTimer() : startHeroTimer()));

  searchInput.addEventListener('input', () => {
    if (state.view !== 'browse') {
      state.browse = { ...DEFAULT_BROWSE, q: searchInput.value };
      location.hash = browseHash();
    } else {
      state.browse.q = searchInput.value;
      updateBrowse();
    }
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearSearch();
      searchInput.blur();
    }
  });

  $$('[data-filter]').forEach((sel) =>
    sel.addEventListener('change', () => {
      state.browse[sel.dataset.filter] = sel.value;
      updateBrowse();
    }),
  );

  document.addEventListener('keydown', onKey);
}

function onClick(e) {
  const t = e.target;

  if (modal.el && (t === modal.el || t.closest('.modal-close'))) return closeModal();

  const arrow = t.closest('.row-arrow');
  if (arrow) {
    const track = $('.row-track', arrow.parentElement);
    track.scrollBy({ left: Number(arrow.dataset.dir) * track.clientWidth * 0.85, behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth' });
    return;
  }

  const dot = t.closest('[data-hero]');
  if (dot) {
    showHero(Number(dot.dataset.hero));
    return;
  }

  const el = t.closest('[data-action]');
  if (!el) return;
  const id = el.closest('[data-id]')?.dataset.id;

  switch (el.dataset.action) {
    case 'open':
      if (id) openDetails(id);
      break;
    case 'toggle':
      toggleWatched(id, el);
      break;
    case 'trailer':
      if (modal.kind === 'details' && modal.id === id) playTrailer(state.byId.get(id));
      else openDetails(id, { trailer: true });
      break;
    case 'suggest':
      openSuggest();
      break;
    case 'spin':
      spin();
      break;
    case 'suggest-opt':
      setSuggestOpt(el);
      break;
    case 'status':
      setStatus(el.dataset.value);
      break;
    case 'clear-search':
      clearSearch();
      break;
    case 'account':
      openAccount();
      break;
    case 'auth-tab':
      openAuth(el.dataset.mode, $('[name=email]', modal.el)?.value || '');
      break;
    case 'reset-password':
      resetPassword();
      break;
    case 'google':
      signInWithGoogle();
      break;
    case 'sign-out':
      signOut();
      break;
    case 'export':
      exportList();
      break;
    case 'import':
      importList();
      break;
  }
}

function onKey(e) {
  const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
  if (!modal.el) {
    if (e.key === '/' && !typing) {
      e.preventDefault();
      searchInput.focus();
    }
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    closeModal();
  } else if (e.key === 'Tab') {
    // Keep keyboard focus inside the dialog.
    const focusable = $$('button, a[href], input, select, iframe', modal.el).filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

init();
