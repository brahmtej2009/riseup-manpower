#!/usr/bin/env node
// npm run demo:logos - fills the moving row of client logos with placeholder
// wordmarks, so the row can be seen working before real client logos exist.
//
// The names are deliberately the well-known FICTIONAL placeholder companies
// (Acme, Contoso, Northwind and so on). Nothing here claims that this company
// has worked with anybody. Replace them with real logos in
// Admin > Themes > Row add-ons > Client logos.
//
// Their widths vary a lot on purpose: that is what shows the row doing its job,
// scaling every logo to one height while each keeps its own width.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import Database from './lib/sqlite.mjs';
import { loadEnv, ensureDirs, DB_PATH, UPLOAD_DIR, c, ok, fail } from './lib/paths.mjs';

loadEnv();
ensureDirs();

const db = Database(DB_PATH);

// name, the mark's letters, and a colour, chosen to look like a real logo set.
const COMPANIES = [
  ['Acme Industries', 'A', '#2563eb'],
  ['Contoso Manufacturing', 'C', '#0f766e'],
  ['Northwind Logistics', 'N', '#b45309'],
  ['Fabrikam Steel', 'F', '#4338ca'],
  ['Globex Automotive', 'G', '#be123c'],
  ['Initech Systems', 'I', '#0891b2'],
  ['Litware Foods', 'L', '#15803d'],
  ['Proseware Textiles', 'P', '#7c3aed'],
];

/** A wordmark: a rounded square with an initial, then the company name. */
function wordmarkSvg(name, letter, colour) {
  const H = 160;                       // drawn large, scaled down when shown
  const mark = 120;
  const fontSize = 62;
  // Rough advance width per character for a bold sans face.
  const textWidth = Math.round(name.length * fontSize * 0.545);
  const W = mark + 34 + textWidth + 40;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect x="20" y="${(H - mark) / 2}" width="${mark}" height="${mark}" rx="26" fill="${colour}"/>
  <text x="${20 + mark / 2}" y="${H / 2}" font-family="Segoe UI, Arial, sans-serif"
        font-size="68" font-weight="700" fill="#ffffff"
        text-anchor="middle" dominant-baseline="central">${letter}</text>
  <text x="${mark + 34}" y="${H / 2}" font-family="Segoe UI, Arial, sans-serif"
        font-size="${fontSize}" font-weight="700" fill="#1f2937"
        dominant-baseline="central">${name}</text>
</svg>`;
}

async function main() {
  console.log(`${c.bold}Adding placeholder client logos${c.reset}`);
  console.log('These are fictional companies. Replace them with real client logos.\n');

  // Clear whatever is there, files and rows together.
  for (const row of db.prepare('SELECT path FROM client_logos').all()) {
    const filename = row.path.replace('/uploads/', '');
    if (!filename.includes('/') && !filename.includes('..')) {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, filename));
      } catch {
        /* already gone */
      }
    }
    db.prepare('DELETE FROM media WHERE path = ?').run(row.path);
  }
  db.prepare('DELETE FROM client_logos').run();

  const insert = db.prepare(
    "INSERT INTO client_logos (name, path, url, sort_order, is_visible) VALUES (?, ?, '', ?, 1)"
  );

  for (const [i, [name, letter, colour]] of COMPANIES.entries()) {
    // Rendered to a transparent PNG so it sits on either the light or the
    // dark version of the site, then stored as WebP like any upload.
    const png = await sharp(Buffer.from(wordmarkSvg(name, letter, colour)), { density: 200 })
      .resize({ height: 160, withoutEnlargement: false })
      .webp({ quality: 92, alphaQuality: 100 })
      .toBuffer();

    const meta = await sharp(png).metadata();
    const filename = `logo-${crypto.randomBytes(4).toString('hex')}.webp`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), png);
    const publicPath = `/uploads/${filename}`;

    db.prepare(
      `INSERT INTO media (filename, original_name, path, mime, size, width, height, alt, folder)
       VALUES (?, ?, ?, 'image/webp', ?, ?, ?, ?, 'logos')`
    ).run(filename, `${name}.webp`, publicPath, png.length, meta.width, meta.height, name);

    insert.run(name, publicPath, i + 1);
    console.log(`  ${i + 1}/${COMPANIES.length}  ${name}  (${meta.width}x${meta.height})`);
  }

  ok(`${COMPANIES.length} placeholder logos added. The row is now visible on the home page.`);
  db.close();
}

main().catch((err) => {
  fail(err.message);
  try {
    db.close();
  } catch {}
  process.exit(1);
});
