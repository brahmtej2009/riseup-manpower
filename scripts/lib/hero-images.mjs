// Generates stand-in background images for the hero.
//
// These are drawn, not photographed. They exist so the site looks finished
// before the company has uploaded its own photographs, and they sit behind a
// dark overlay so they read as texture rather than as a picture of anything.
// The company replaces them from Settings > Home page.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SCENES = [
  { name: 'girders', from: '#0E2747', to: '#071528', accent: '#C9372C' },
  { name: 'floor', from: '#132F52', to: '#0A1B33', accent: '#E0A106' },
  { name: 'yard', from: '#0B2340', to: '#05101F', accent: '#2C6FA8' },
];

function scene({ from, to, accent }, seed) {
  // A deterministic pseudo-random so the same seed draws the same picture.
  let n = seed;
  const rand = () => {
    n = (n * 1103515245 + 12345) % 2147483648;
    return n / 2147483648;
  };

  const bars = Array.from({ length: 14 }, (_, i) => {
    const x = i * 140 + rand() * 60;
    const w = 18 + rand() * 46;
    const h = 300 + rand() * 780;
    const o = (0.05 + rand() * 0.12).toFixed(3);
    return `<rect x="${x.toFixed(0)}" y="${(1080 - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="#ffffff" fill-opacity="${o}"/>`;
  }).join('');

  const beams = Array.from({ length: 5 }, (_, i) => {
    const y = 120 + i * 190 + rand() * 60;
    const o = (0.04 + rand() * 0.06).toFixed(3);
    return `<rect x="0" y="${y.toFixed(0)}" width="1920" height="${(6 + rand() * 10).toFixed(0)}" fill="#ffffff" fill-opacity="${o}"/>`;
  }).join('');

  const glints = Array.from({ length: 26 }, () => {
    const cx = rand() * 1920;
    const cy = rand() * 1080;
    const r = 1.5 + rand() * 3.5;
    const o = (0.15 + rand() * 0.35).toFixed(2);
    return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(1)}" fill="${accent}" fill-opacity="${o}"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
  </linearGradient>
  <radialGradient id="pool" cx="0.3" cy="0.25" r="0.8">
    <stop offset="0" stop-color="${accent}" stop-opacity="0.22"/>
    <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1920" height="1080" fill="url(#bg)"/>
${bars}
${beams}
<rect width="1920" height="1080" fill="url(#pool)"/>
${glints}
<rect width="1920" height="1080" fill="url(#bg)" fill-opacity="0.25"/>
</svg>`;
}

/** Writes the images and returns their public paths. */
export function writeHeroImages(uploadDir) {
  fs.mkdirSync(uploadDir, { recursive: true });

  return SCENES.map((s, i) => {
    const filename = `hero-${s.name}-${crypto.randomBytes(4).toString('hex')}.svg`;
    fs.writeFileSync(path.join(uploadDir, filename), scene(s, i * 7919 + 13), 'utf8');
    return `/uploads/${filename}`;
  });
}
