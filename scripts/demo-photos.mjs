#!/usr/bin/env node
// npm run demo:photos - replace the drawn placeholder images with real
// photographs, so a demo install looks like a real website rather than a
// wireframe.
//
// These are PLACEHOLDERS. They come from free placeholder services and they
// are not pictures of this company, its sites or its staff. Replace them with
// the company's own photographs before the site goes live. Running this again
// fetches a fresh set.
//
// Sources, both free and needing no API key:
//   - loremflickr.com  real photographs, chosen by keyword, for the scenes
//   - randomuser.me    portrait photographs meant for exactly this purpose
//
// Everything is re-encoded through sharp on the way in, which strips whatever
// metadata came with the original and converts it to WebP, the same treatment
// an upload through the admin panel gets.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import Database from './lib/sqlite.mjs';
import { loadEnv, ensureDirs, DB_PATH, UPLOAD_DIR, c, ok, fail, warn } from './lib/paths.mjs';

loadEnv();
ensureDirs();

const db = Database(DB_PATH);
db.pragma('foreign_keys = ON');

/**
 * Photographs behind the heading on the home page.
 *
 * The first keyword in each set is deliberately a common one on its own,
 * because loremflickr answers 500 for a lot of multi-word combinations and the
 * fallback drops back to that first word.
 */
const HERO = [
  'workers,factory',
  'teamwork,office',
  'warehouse,logistics',
];

/**
 * The photo gallery: the work the company does and the people doing it, in
 * the manner of a company's own social feed rather than a stock brochure.
 */
const GALLERY = [
  ['teamwork,office', 'Our team at work'],
  ['meeting,business', 'Client briefing'],
  ['workers,factory', 'On the production floor'],
  ['warehouse,workers', 'Warehouse and despatch'],
  ['construction,workers', 'Site deployment'],
  ['engineer,industry', 'Skilled trades'],
  ['welding,metal', 'Fabrication and welding'],
  ['training,workshop', 'Training and induction'],
  ['safety,helmet', 'Safety induction'],
  ['truck,transport', 'Transport and drivers'],
  ['office,colleagues', 'Back office team'],
  ['handshake,business', 'A new placement'],
];

/** Portraits for the team. Pravatar serves proper 512px headshots. */
const PORTRAIT_IDS = [12, 5, 32, 45, 60, 23, 8, 15, 27, 36, 48, 52];

/**
 * Cover pictures for the posts, keyed by the category the post is filed
 * under. The posts are shown as a grid of square tiles, so a flat panel where
 * a picture should be is very obvious.
 */
const COVER_BY_CATEGORY = {
  Recruitment: 'factory,workers,hiring',
  Notice: 'office,building',
  'Company Update': 'team,office,workers',
  Guidance: 'documents,paperwork',
  Compliance: 'documents,office',
};
const COVER_FALLBACK = 'workers,industry';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchBuffer(url, { retries = 3 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
        headers: { 'User-Agent': 'riseup-demo-photos' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) throw new Error(`only ${buf.length} bytes back`);
      return buf;
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(600 * attempt);
    }
  }
}

/** Stores a buffer as WebP and records it in the media library. */
async function store(buf, { name, folder, width, height, square = false, alt = '' }) {
  const pipeline = square
    ? sharp(buf).resize(width, width, { fit: 'cover', position: 'attention' })
    : sharp(buf).resize(width, height, { fit: 'cover', position: 'attention' });

  const out = await pipeline.webp({ quality: 82, effort: 4 }).toBuffer();
  const meta = await sharp(out).metadata();

  const filename = `${name}-${crypto.randomBytes(4).toString('hex')}.webp`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), out);

  const publicPath = `/uploads/${filename}`;
  db.prepare(
    `INSERT INTO media (filename, original_name, path, mime, size, width, height, alt, folder)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(filename, `${name}.webp`, publicPath, 'image/webp', out.length, meta.width, meta.height, alt, folder);

  return publicPath;
}

/** Removes a placeholder that is being replaced, file and media row together. */
function discard(publicPath) {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const filename = publicPath.replace('/uploads/', '');
  if (filename.includes('/') || filename.includes('..')) return;
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, filename));
  } catch {
    /* already gone */
  }
  db.prepare('DELETE FROM media WHERE path = ?').run(publicPath);
}

const flickr = (keywords, w, h) =>
  `https://loremflickr.com/${w}/${h}/${keywords}?lock=${crypto.randomInt(1, 100000)}`;

/**
 * Fetches one scene photograph.
 *
 * loremflickr occasionally answers 500 for a keyword pair that has nothing
 * behind it, so this falls back to the first keyword on its own and then to
 * picsum, which always has something. A missing picture would leave a hole in
 * the page, which is worse than a less apt one.
 */
async function fetchPhoto(keywords, w, h) {
  const first = keywords.split(',')[0];
  const attempts = [
    flickr(keywords, w, h),
    flickr(first, w, h),
    `https://picsum.photos/${w}/${h}?random=${crypto.randomInt(1, 100000)}`,
  ];

  for (const [i, url] of attempts.entries()) {
    try {
      return await fetchBuffer(url, { retries: 2 });
    } catch (err) {
      if (i === attempts.length - 1) throw err;
      warn(`  ${keywords}: ${err.message}, trying another source`);
    }
  }
}

/** Removes any hero or gallery placeholder no longer pointed at by anything. */
function sweepOrphans() {
  const referenced = new Set();
  const heroRow = db.prepare("SELECT value FROM settings WHERE key = 'hero_gallery'").get();
  try {
    JSON.parse(heroRow?.value || '[]').forEach((p) => referenced.add(p));
  } catch {
    /* nothing referenced */
  }
  db.prepare('SELECT path FROM gallery_photos').all().forEach((r) => referenced.add(r.path));
  db.prepare('SELECT photo_path AS path FROM team_members WHERE photo_path IS NOT NULL')
    .all()
    .forEach((r) => referenced.add(r.path));
  db.prepare('SELECT cover_path AS path FROM posts WHERE cover_path IS NOT NULL')
    .all()
    .forEach((r) => referenced.add(r.path));

  let removed = 0;
  for (const row of db
    .prepare("SELECT path FROM media WHERE folder IN ('hero', 'gallery', 'team', 'covers')")
    .all()) {
    if (!referenced.has(row.path)) {
      discard(row.path);
      removed += 1;
    }
  }
  if (removed > 0) console.log(`  cleared ${removed} unused placeholder(s) from an earlier run`);
}

/**
 * Clears every placeholder picture, leaving only the logo and the favicon,
 * which are branding rather than photographs.
 */
function wipeAll() {
  const keep = new Set(
    db
      .prepare("SELECT value FROM settings WHERE key IN ('logo_path', 'logo_alt_path', 'favicon_path')")
      .all()
      .map((r) => r.value)
      .filter(Boolean)
  );

  let removed = 0;
  for (const row of db.prepare('SELECT path FROM media').all()) {
    if (keep.has(row.path)) continue;
    discard(row.path);
    removed += 1;
  }

  db.prepare('DELETE FROM gallery_photos').run();
  db.prepare("UPDATE settings SET value = '[]' WHERE key = 'hero_gallery'").run();
  db.prepare('UPDATE team_members SET photo_path = NULL').run();
  db.prepare('UPDATE posts SET cover_path = NULL').run();

  ok(`Cleared ${removed} old picture(s). The logo was kept.`);
}

async function main() {
  console.log(`${c.bold}Fetching placeholder photographs${c.reset}`);
  console.log('These are not this company\'s own photographs. Replace them before going live.\n');

  // ---------------------------------------------------------------- hero
  const oldHero = (() => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'hero_gallery'").get();
    try {
      const parsed = JSON.parse(row?.value || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const heroPaths = [];
  for (const [i, keywords] of HERO.entries()) {
    const buf = await fetchPhoto(keywords, 1600, 1100);
    heroPaths.push(await store(buf, {
      name: 'hero',
      folder: 'hero',
      width: 1600,
      height: 1100,
      alt: '',
    }));
    console.log(`  hero ${i + 1}/${HERO.length}  ${keywords}`);
  }
  db.prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'hero_gallery'")
    .run(JSON.stringify(heroPaths));
  oldHero.forEach(discard);
  ok(`Hero: ${heroPaths.length} photographs.`);

  // ------------------------------------------------------------- gallery
  db.prepare('SELECT path FROM gallery_photos').all().forEach((r) => discard(r.path));
  db.prepare('DELETE FROM gallery_photos').run();

  const insPhoto = db.prepare(
    'INSERT INTO gallery_photos (path, title, sort_order, is_visible) VALUES (?, ?, ?, 1)'
  );
  for (const [i, [keywords, title]] of GALLERY.entries()) {
    const buf = await fetchPhoto(keywords, 1400, 1050);
    const p = await store(buf, {
      name: 'gallery',
      folder: 'gallery',
      width: 1400,
      height: 1050,
      alt: title,
    });
    insPhoto.run(p, title, i + 1);
    console.log(`  gallery ${i + 1}/${GALLERY.length}  ${title}`);
  }
  ok(`Gallery: ${GALLERY.length} photographs.`);

  // ---------------------------------------------------------------- team
  const team = db.prepare('SELECT id, name, photo_path FROM team_members ORDER BY sort_order, id').all();

  if (team.length > 0) {
    // Pravatar serves a proper 512px headshot, unlike the 128px thumbnails
    // that had to be upscaled before. Portraits are assigned in list order;
    // nobody's appearance is inferred from their name, so swap any that do
    // not suit in Admin > Our team.
    const setPhoto = db.prepare(
      "UPDATE team_members SET photo_path = ?, updated_at = datetime('now') WHERE id = ?"
    );

    for (const [i, member] of team.entries()) {
      const id = PORTRAIT_IDS[i % PORTRAIT_IDS.length];
      const buf = await fetchBuffer(`https://i.pravatar.cc/512?img=${id}`);
      const p = await store(buf, {
        name: 'team',
        folder: 'team',
        width: 512,
        square: true,
        alt: member.name,
      });
      discard(member.photo_path);
      setPhoto.run(p, member.id);
      console.log(`  staff ${i + 1}/${team.length}  ${member.name}`);
    }
    ok(`Team: ${team.length} portraits.`);
  }

  // -------------------------------------------------------------- posts
  const posts = db.prepare('SELECT id, title, category, cover_path FROM posts ORDER BY id').all();

  if (posts.length > 0) {
    const setCover = db.prepare(
      "UPDATE posts SET cover_path = ?, updated_at = datetime('now') WHERE id = ?"
    );

    for (const [i, post] of posts.entries()) {
      const keywords = COVER_BY_CATEGORY[post.category] ?? COVER_FALLBACK;
      const buf = await fetchPhoto(keywords, 1200, 1200);
      const cover = await store(buf, {
        name: 'cover',
        folder: 'covers',
        width: 1200,
        square: true,
        alt: post.title,
      });
      discard(post.cover_path);
      setCover.run(cover, post.id);
      console.log(`  post ${i + 1}/${posts.length}  ${post.category}`);
    }
    ok(`Posts: ${posts.length} cover pictures.`);
  }

  db.close();
  console.log(
    `\n${c.bold}Done.${c.reset} Replace these with the company's own photographs from ` +
      'Admin > Themes, Admin > Photo gallery and Admin > Our team before going live.'
  );
}

main().catch((err) => {
  fail(err.message);
  warn('Nothing further was changed. Run it again to retry.');
  try {
    db.close();
  } catch {}
  process.exit(1);
});
