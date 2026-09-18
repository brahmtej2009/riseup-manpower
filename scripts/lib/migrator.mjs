// Versioned migration runner.
//
// Rules this enforces:
//   * Each migration file runs exactly once, ever, and is recorded.
//   * Each migration runs inside a transaction - a failure rolls it back
//     completely, leaving the database exactly as it was.
//   * Files are applied in numeric order (001, 002, ...).
//   * A checksum is stored. If a migration file is edited after it has been
//     applied, the runner refuses to continue rather than silently drifting.
//   * The runner never drops or recreates the database.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MIGRATION_FILE = /^(\d{3,})_([A-Za-z0-9_\-]+)\.sql$/;

export function ensureMigrationTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      checksum   TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now')),
      duration_ms INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export function readMigrationFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => MIGRATION_FILE.test(f))
    .map((f) => {
      const m = f.match(MIGRATION_FILE);
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      return {
        version: parseInt(m[1], 10),
        name: m[2],
        file: f,
        sql,
        checksum: crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16),
      };
    })
    .sort((a, b) => a.version - b.version);
}

export function appliedMigrations(db) {
  ensureMigrationTable(db);
  const rows = db.prepare('SELECT version, name, checksum FROM _migrations ORDER BY version').all();
  return new Map(rows.map((r) => [r.version, r]));
}

export function pendingMigrations(db, dir) {
  const applied = appliedMigrations(db);
  return readMigrationFiles(dir).filter((m) => !applied.has(m.version));
}

/**
 * Apply every pending migration.
 * @returns {{applied: Array, skipped: number}}
 * @throws if a migration fails or a previously applied file has been modified.
 */
export function runMigrations(db, dir, logger = console.log) {
  ensureMigrationTable(db);

  const files = readMigrationFiles(dir);
  const applied = appliedMigrations(db);

  // Integrity check before touching anything.
  for (const f of files) {
    const prev = applied.get(f.version);
    if (prev && prev.checksum !== f.checksum) {
      throw new Error(
        `Migration ${f.file} has changed since it was applied ` +
          `(recorded ${prev.checksum}, file is now ${f.checksum}).\n` +
          `Migrations are append-only. Revert the edit and add a new migration instead.`
      );
    }
  }

  const pending = files.filter((f) => !applied.has(f.version));
  if (pending.length === 0) {
    logger(`Database is up to date (${applied.size} migration(s) applied).`);
    return { applied: [], skipped: applied.size };
  }

  const done = [];
  for (const m of pending) {
    const started = Date.now();
    // better-sqlite3 cannot nest transactions, and some DDL in SQLite is only
    // safe outside one; an explicit BEGIN/COMMIT keeps control here.
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      const ms = Date.now() - started;
      db.prepare(
        'INSERT INTO _migrations (version, name, checksum, duration_ms) VALUES (?, ?, ?, ?)'
      ).run(m.version, m.name, m.checksum, ms);
      db.exec('COMMIT');
      logger(`  applied ${m.file} (${ms}ms)`);
      done.push(m.file);
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        /* transaction already aborted */
      }
      throw new Error(`Migration ${m.file} failed and was rolled back:\n${err.message}`);
    }
  }
  return { applied: done, skipped: applied.size };
}

export function schemaVersion(db) {
  ensureMigrationTable(db);
  const row = db.prepare('SELECT MAX(version) AS v FROM _migrations').get();
  return row?.v ?? 0;
}
