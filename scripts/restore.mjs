#!/usr/bin/env node
// npm run restore -- <backup-name>
// npm run restore -- --latest
//
// The current database is backed up (label: pre-restore) before anything is
// overwritten, so a restore is itself reversible.

import readline from 'node:readline/promises';
import { loadEnv, ensureDirs, c, ok, fail, warn } from './lib/paths.mjs';
import { listBackups, restoreBackup } from './lib/backup-core.mjs';

loadEnv();
ensureDirs();

const args = process.argv.slice(2);
const yes = args.includes('--yes') || args.includes('-y');
const all = listBackups().filter((b) => b.valid);

if (!all.length) {
  fail('No valid backups found in data/backups.');
  process.exit(1);
}

let target = args.find((a) => !a.startsWith('-'));
if (args.includes('--latest')) target = all[0].name;

if (!target) {
  console.log(`${c.bold}Available backups:${c.reset}`);
  for (const b of all) {
    console.log(`  ${b.name}  ${c.dim}schema v${b.manifest?.schema_version ?? '?'}${c.reset}`);
  }
  console.log(`\nUsage: npm run restore -- <backup-name>   (or --latest)`);
  process.exit(0);
}

const chosen = all.find((b) => b.name === target);
if (!chosen) {
  fail(`Backup "${target}" not found.`);
  process.exit(1);
}

try {
  if (!yes) {
    warn(`This will REPLACE the live database and uploads with "${chosen.name}".`);
    warn('A backup of the current state will be taken first.');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question('Type RESTORE to continue: ')).trim();
    rl.close();
    if (answer !== 'RESTORE') {
      console.log('Cancelled. Nothing was changed.');
      process.exit(0);
    }
  }

  const res = restoreBackup(chosen.name);
  ok(`Restored from ${res.restored}`);
  if (res.safetyBackup) console.log(`      previous state saved as ${res.safetyBackup}`);
  console.log('      Restart the site for the change to take effect.');
  process.exit(0);
} catch (err) {
  fail(err.message);
  process.exit(1);
}
