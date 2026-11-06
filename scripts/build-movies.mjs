#!/usr/bin/env node
// Builds data/movies.json from disney_movies.txt, enriched with TMDB data
// (poster, backdrop, title logo, synopsis, genres, rating, director, voice cast, trailer).
//
// Usage:
//   node scripts/build-movies.mjs                 regenerate data/movies.json
//   node scripts/build-movies.mjs --write-source  also rewrite disney_movies.txt: fill in TMDB IDs,
//                                                 correct year/runtime from TMDB, sort by release date
//
// Needs a TMDB "API Read Access Token" (TMDB_TOKEN) or v3 API key (TMDB_API_KEY),
// either in the environment or in a local .env file (which is git-ignored).
//
// Adding a movie: add a line to disney_movies.txt (Year, Movie, Studio and Release type are enough),
// run with --write-source, check the report, commit.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'disney_movies.txt');
const OUTPUT = path.join(ROOT, 'data', 'movies.json');
const WRITE_SOURCE = process.argv.includes('--write-source');

await loadDotEnv(path.join(ROOT, '.env'));
const TOKEN = process.env.TMDB_TOKEN;
const API_KEY = process.env.TMDB_API_KEY;
if (!TOKEN && !API_KEY) {
  console.error('Missing TMDB_TOKEN or TMDB_API_KEY. Put one in .env (see README).');
  process.exit(1);
}

// ---------- source file ----------

const raw = (await readFile(SOURCE, 'utf8')).replace(/^﻿/, '');
const [headerLine, ...lines] = raw.split(/\r?\n/).filter((l) => l.trim());
const header = headerLine.split('\t').map((h) => h.trim().toLowerCase());
const col = (name) => header.findIndex((h) => h.startsWith(name));
const C = {
  year: col('year'),
  title: col('movie'),
  minutes: col('duration in minutes'),
  studio: col('studio'),
  type: col('release type'),
  tmdb: col('tmdb'),
};

const rows = lines.map((line, i) => {
  const c = line.split('\t').map((s) => s.trim());
  return {
    line: i + 2,
    year: Number(c[C.year]),
    title: c[C.title],
    minutes: Number(c[C.minutes]) || null,
    studio: c[C.studio],
    releaseType: c[C.type],
    tmdbId: C.tmdb >= 0 ? Number(c[C.tmdb]) || null : null,
  };
});

// ---------- TMDB ----------

async function tmdb(endpoint, params = {}) {
  const url = new URL('https://api.themoviedb.org/3' + endpoint);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers = { accept: 'application/json' };
  if (TOKEN) headers.authorization = `Bearer ${TOKEN}`;
  else url.searchParams.set('api_key', API_KEY);

  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      continue;
    }
    throw new Error(`TMDB ${res.status} for ${endpoint}: ${await res.text()}`);
  }
}

const norm = (s = '') =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/½/g, ' half ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

async function findTmdbId(row) {
  let best = null;
  for (const params of [{ query: row.title, year: row.year }, { query: row.title }]) {
    const { results = [] } = await tmdb('/search/movie', { ...params, include_adult: 'false', language: 'en-US' });
    for (const r of results) {
      const y = Number((r.release_date || '').slice(0, 4));
      let score = 0;
      if (norm(r.title) === norm(row.title) || norm(r.original_title) === norm(row.title)) score += 4;
      if (r.genre_ids?.includes(16)) score += 3; // Animation
      if (y === row.year) score += 2;
      else if (Math.abs(y - row.year) === 1) score += 1;
      score += Math.min(r.popularity || 0, 100) / 1000; // tie-breaker
      if (!best || score > best.score) best = { score, result: r };
    }
    if (best && best.score >= 8) break;
  }
  return best ? { id: best.result.id, score: best.score, match: best.result } : null;
}

const byVotes = (a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count || b.width - a.width;

function pickBackdrop(d) {
  const textless = (d.images?.backdrops || []).filter((b) => b.iso_639_1 === null).sort(byVotes);
  return textless[0]?.file_path || d.backdrop_path || null;
}

function pickLogo(d) {
  const logos = (d.images?.logos || []).filter((l) => l.iso_639_1 === 'en').sort(byVotes);
  return (logos.find((l) => l.file_path.endsWith('.png')) || logos[0])?.file_path || null;
}

function pickTrailer(d) {
  const vids = (d.videos?.results || []).filter((v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
  const rank = (v) =>
    (v.type === 'Trailer' ? 4 : 0) + (v.official ? 2 : 0) + (v.iso_639_1 === 'en' ? 1 : 0) + (/official trailer/i.test(v.name) ? 1 : 0);
  return vids.sort((a, b) => rank(b) - rank(a))[0]?.key || null;
}

function pickCertification(d) {
  const us = (d.release_dates?.results || []).find((r) => r.iso_3166_1 === 'US');
  return us?.release_dates.map((r) => r.certification).find(Boolean) || null;
}

const slugify = (s) => norm(s).replace(/ /g, '-');

async function buildMovie(row) {
  let tmdbId = row.tmdbId;
  let search = null;
  if (!tmdbId) {
    search = await findTmdbId(row);
    tmdbId = search?.id ?? null;
  }
  if (!tmdbId) return { row, movie: base(row), search };

  const d = await tmdb(`/movie/${tmdbId}`, {
    language: 'en-US',
    append_to_response: 'credits,videos,images,release_dates',
    include_image_language: 'en,null',
  });

  const movie = {
    ...base(row),
    tmdbId,
    tmdbTitle: d.title,
    releaseDate: d.release_date || null,
    tmdbYear: d.release_date ? Number(d.release_date.slice(0, 4)) : null,
    tmdbRuntime: d.runtime || null,
    overview: d.overview || '',
    tagline: d.tagline || '',
    genres: (d.genres || []).map((g) => g.name),
    rating: d.vote_count >= 20 ? Math.round(d.vote_average * 10) / 10 : null,
    votes: d.vote_count || 0,
    certification: pickCertification(d),
    poster: d.poster_path || null,
    backdrop: pickBackdrop(d),
    logo: pickLogo(d),
    trailer: pickTrailer(d),
    directors: (d.credits?.crew || []).filter((c) => c.job === 'Director').map((c) => c.name),
    cast: (d.credits?.cast || []).slice(0, 6).map((c) => ({ name: c.name, character: c.character })),
    collection: d.belongs_to_collection ? { id: d.belongs_to_collection.id, name: d.belongs_to_collection.name } : null,
  };
  return { row, movie, search };
}

function base(row) {
  return {
    id: slugify(row.title),
    title: row.title,
    year: row.year,
    runtime: row.minutes,
    studio: row.studio,
    releaseType: row.releaseType,
  };
}

async function mapPool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

// ---------- run ----------

console.log(`Fetching ${rows.length} movies from TMDB…`);
const results = await mapPool(rows, 6, buildMovie);

// Year: the source file wins (TMDB often lists the general release instead of the premiere,
// e.g. Snow White 1937 -> 1938), differences are only reported. Runtime: TMDB wins when it has one.
const report = { notFound: [], weakMatch: [], titleDiffers: [], yearDiffers: [], runtimeChanged: [] };
for (const { row, movie, search } of results) {
  if (!movie.tmdbId) {
    report.notFound.push(row.title);
    continue;
  }
  if (search && search.score < 8) {
    report.weakMatch.push(`${row.title} (${row.year}) -> "${search.match.title}" ${search.match.release_date} [score ${search.score.toFixed(2)}]`);
  }
  if (norm(movie.tmdbTitle) !== norm(row.title)) report.titleDiffers.push(`${row.title} -> TMDB: "${movie.tmdbTitle}"`);
  if (movie.tmdbYear && movie.tmdbYear !== row.year) report.yearDiffers.push(`${row.title}: ${row.year} (TMDB: ${movie.releaseDate})`);
  if (movie.tmdbRuntime && movie.tmdbRuntime !== row.minutes) {
    report.runtimeChanged.push(`${row.title}: ${row.minutes ?? '?'} -> ${movie.tmdbRuntime} min`);
  }
}

const movies = results.map(({ movie }) => {
  const { tmdbTitle, tmdbYear, tmdbRuntime, ...m } = movie;
  return { ...m, runtime: tmdbRuntime || m.runtime };
});
movies.sort(
  (a, b) =>
    a.year - b.year ||
    (a.releaseDate || '').localeCompare(b.releaseDate || '') ||
    a.title.localeCompare(b.title),
);

const ids = new Set();
for (const m of movies) {
  if (ids.has(m.id)) m.id = `${m.id}-${m.year}`;
  ids.add(m.id);
}

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, JSON.stringify({ generatedAt: new Date().toISOString(), count: movies.length, movies }, null, 1) + '\n');
console.log(`Wrote ${movies.length} movies to ${path.relative(ROOT, OUTPUT)}`);

if (WRITE_SOURCE) {
  const fmt = (min) => (!min ? '' : min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m` : `${min}m`);
  const totalHours = (movies.reduce((s, m) => s + (m.runtime || 0), 0) / 60).toFixed(1).replace('.', ',');
  const out = [
    ['Year', 'Movie', 'Duration', `Duration in minutes (${totalHours})`, 'Studio', 'Release type', 'TMDB ID'].join('\t'),
    ...movies.map((m) => [m.year, m.title, fmt(m.runtime), m.runtime ?? '', m.studio, m.releaseType, m.tmdbId ?? ''].join('\t')),
  ];
  await writeFile(SOURCE, out.join('\n') + '\n');
  console.log(`Updated ${path.relative(ROOT, SOURCE)}`);
}

for (const [label, list] of Object.entries(report)) {
  if (!list.length) continue;
  console.log(`\n${label} (${list.length}):`);
  for (const item of list) console.log(`  - ${item}`);
}

async function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const line of (await readFile(file, 'utf8')).split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
