#!/usr/bin/env node
// Usage: node add-playlist.js <apple-music-url> [--month MAY] [--year 2026]

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const ROOT = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = argv.slice(2);
  const url = args.find(a => a.startsWith('http'));
  const monthFlag = args[args.indexOf('--month') + 1];
  const yearFlag  = args[args.indexOf('--year')  + 1];

  if (!url) {
    console.error('Usage: node add-playlist.js <apple-music-url> [--month MAY] [--year 2026]');
    process.exit(1);
  }

  const now   = new Date();
  const year  = yearFlag  ? yearFlag  : String(now.getFullYear());
  const month = monthFlag ? monthFlag.toUpperCase() : MONTHS[now.getMonth()];

  return { url, month, year };
}

function findCover(year, month) {
  const mm   = String(MONTHS.indexOf(month) + 1).padStart(2, '0');
  const base = `covers/${year}-${mm}`;
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    if (existsSync(resolve(ROOT, `${base}.${ext}`))) return `${base}.${ext}`;
  }
  return null;
}

function makeTitle(year, month) {
  const yy = year.slice(2);
  const mm = String(MONTHS.indexOf(month) + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

function makeId(year, month) {
  const mm = String(MONTHS.indexOf(month) + 1).padStart(2, '0');
  return `${year}-${mm}`;
}

const { url, month, year } = parseArgs(process.argv);
const id    = makeId(year, month);
const cover = findCover(year, month);
const title = makeTitle(year, month);

const entry = {
  id,
  month,
  year,
  title,
  appleUrl:   url,
  spotifyUrl: '',
  cover:      cover || `covers/${id}.png`,
  tracks:     []
};

const jsonPath   = resolve(ROOT, 'playlists.json');
const playlists  = JSON.parse(readFileSync(jsonPath, 'utf8'));

if (playlists.find(p => p.id === id)) {
  console.error(`Entry for ${id} already exists in playlists.json`);
  process.exit(1);
}

playlists.unshift(entry);
writeFileSync(jsonPath, JSON.stringify(playlists, null, 2) + '\n');

console.log(`✓ Added ${month} ${year} to playlists.json`);
if (!cover) console.log(`  ⚠ No cover found — drop a file at covers/${id}.png when ready`);
console.log(`  → Fill in the tracks array in playlists.json`);
