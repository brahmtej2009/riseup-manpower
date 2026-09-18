#!/usr/bin/env node
// npm run migrate - apply any pending database migrations.
//
// Safe to run repeatedly. Takes a checkpoint backup first so that even a
// catastrophic failure can be undone.

import Database from './lib/sqlite.mjs';
import { loadEnv, ensureDirs, DB_PATH, MIGRATIONS_DIR, c, ok, fail, warn } from './lib/paths.mjs';
import { runMigrations, pendingMigrations, schemaVersion } from './lib/migrator.mjs';
import { createBackup } from './lib/backup-core.mjs';

loadEnv();
ensureDirs();

const args = process.argv.slice(2);
const statusOnly = args.includes('--status');
const skipBackup = args.includes('--no-backup');

const db = Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

try {
  const pending = pendingMigrations(db, MIGRATIONS_DIR);

  if (statusOnly) {
    console.log(`Schema version : ${schemaVersion(db)}`);
    console.log(`Pending        : ${pending.length}`);
    for (const p of pending) console.log(`  - ${p.file}`);
    db.close();
    process.exit(0);
  }

  if (pending.length === 0) {
    ok(`Database up to date (schema version ${schemaVersion(db)}).`);
    db.close();
    process.exit(0);
  }

  console.log(`${c.bold}Applying ${pending.length} migration(s)${c.reset}`);

  // A checkpoint backup before any schema change. Cheap insurance.
  if (!skipBackup && schemaVersion(db) > 0) {
    db.pragma('wal_checkpoint(TRUNCATE)');
    const b = createBackup(db, { label: 'pre-migrate' });
    ok(`Checkpoint backup: ${b.name}`);
  }

  const result = runMigrations(db, MIGRATIONS_DIR, (m) => console.log(m));
  ok(`Done. Schema version is now ${schemaVersion(db)}.`);
  db.close();
  process.exit(0);
} catch (err) {
  fail(err.message);
  warn('No changes were committed. The database is unchanged.');
  try {
    db.close();
  } catch {}
  process.exit(1);
}
