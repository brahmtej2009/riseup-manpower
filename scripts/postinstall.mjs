// Runs after `npm install`.
//
//  1. Creates the runtime folders (data/ is gitignored, so it is never in the repo).
//  2. Creates .env on a first install, with a freshly generated SESSION_SECRET.
//
// Generating the secret here means the site works immediately after install,
// while still being a strong random value unique to this server. It is written
// only if .env does not already exist, so an update never overwrites it - and
// overwriting it would sign every administrator out.

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const dir of ['data', 'data/uploads', 'data/backups', 'data/logs']) {
  try {
    mkdirSync(path.join(ROOT, dir), { recursive: true });
  } catch {
    /* already there */
  }
}

const envPath = path.join(ROOT, '.env');
const examplePath = path.join(ROOT, '.env.example');

if (!existsSync(envPath) && existsSync(examplePath)) {
  try {
    const secret = randomBytes(48).toString('hex');
    const contents = readFileSync(examplePath, 'utf8').replace(
      /^SESSION_SECRET=.*$/m,
      `SESSION_SECRET=${secret}`
    );
    writeFileSync(envPath, contents, { mode: 0o600 });

    console.log('');
    console.log('  Created .env with a new SESSION_SECRET for this server.');
    console.log('  Next:  npm run migrate   then   npm run seed');
    console.log('');
  } catch (err) {
    console.warn(`  Could not create .env automatically: ${err.message}`);
    console.warn('  Copy .env.example to .env and set SESSION_SECRET before going live.');
  }
}
