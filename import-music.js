#!/usr/bin/env node
// Usage: node import-music.js
// Reads every playlist named like 2604 (YYMM) from the Music app and merges it into playlists.json.
// Keeps existing appleUrl/spotifyUrl/cover; tracks and durations are refreshed from Music.

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const ROOT = dirname(fileURLToPath(import.meta.url));

// JXA: runs inside the Music app, returns [{ name, tracks: [{ title, artist, time }] }]
const jxa = `
const music = Application('Music');
const out = [];
for (const pl of music.userPlaylists()) {
  const name = pl.name();
  if (!/^\\d{4}$/.test(name)) continue;
  const ts = pl.tracks;
  const titles = ts.name(), artists = ts.artist(), times = ts.time();
  out.push({ name, tracks: titles.map((t, i) => ({ title: t, artist: artists[i], time: times[i] })) });
}
JSON.stringify(out);
`;

const found = JSON.parse(execFileSync('osascript', ['-l', 'JavaScript', '-e', jxa], { maxBuffer: 64 << 20 }).toString());

const findCover = id => {
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) if (existsSync(resolve(ROOT, `covers/${id}.${ext}`))) return `covers/${id}.${ext}`;
  return '';
};

const jsonPath = resolve(ROOT, 'playlists.json');
const playlists = JSON.parse(readFileSync(jsonPath, 'utf8'));
let added = 0, updated = 0;

for (const { name, tracks } of found) {
  const mm = Number(name.slice(2));
  if (mm < 1 || mm > 12) continue;
  const year = `20${name.slice(0, 2)}`;
  const id = `${year}-${name.slice(2)}`;
  const list = tracks.map((t, i) => ({ n: i + 1, title: t.title, artist: t.artist, time: t.time }));
  const existing = playlists.find(p => p.id === id);
  if (existing) { existing.tracks = list; updated++; continue; }
  playlists.push({ id, month: MONTHS[mm - 1], year, title: name, appleUrl: '', spotifyUrl: '', cover: findCover(id), tracks: list });
  added++;
}

playlists.sort((a, b) => b.id.localeCompare(a.id));
writeFileSync(jsonPath, JSON.stringify(playlists, null, 2) + '\n');
console.log(`✓ ${found.length} playlists in Music · ${added} added · ${updated} updated`);
