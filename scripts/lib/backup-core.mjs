// Backup and restore of the live database + uploaded files.
//
// A backup is a folder under data/backups/ named
//     <timestamp>__<label>/
// containing:
//     riseup.db      a consistent snapshot taken through SQLite's own backup
//                    API (safe while the app is running)
//     uploads/       a copy of every uploaded file
//     manifest.json  schema version, counts, sizes and the git commit

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import Database from './sqlite.mjs';
import { BACKUP_DIR, DB_PATH, UPLOAD_DIR, ROOT } from './paths.mjs';
import { schemaVersion } from './migrator.mjs';

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

function currentCommit() {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let n = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) n += copyDir(s, d);
    else {
      fs.copyFileSync(s, d);
      n++;
    }
  }
  return n;
}

function dirSize(dir) {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return total;
}

function tableCounts(db) {
  const counts = {};
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all();
  for (const t of tables) {
    try {
      counts[t.name] = db.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get().n;
    } catch {
      counts[t.name] = -1;
    }
  }
  return counts;
}

/**
 * Take a backup. Accepts an open Database, or opens one itself.
 * Uses SQLite's online backup API so it is safe while the site is serving.
 */
export function createBackup(existingDb, { label = 'manual', includeUploads = true } = {}) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const name = `${stamp()}__${label}`;
  const dest = path.join(BACKUP_DIR, name);
  fs.mkdirSync(dest, { recursive: true });

  const db = existingDb ?? Database(DB_PATH, { readonly: true });
  const ownsDb = !existingDb;

  try {
    const target = path.join(dest, 'riseup.db');
    // VACUUM INTO produces a single clean file with no WAL sidecar, and is
    // transactionally consistent even under concurrent writes.
    db.prepare('VACUUM INTO ?').run(target);

    const manifest = {
      name,
      label,
      created_at: new Date().toISOString(),
      schema_version: schemaVersion(db),
      git_commit: currentCommit(),
      node_version: process.version,
      counts: tableCounts(db),
      db_bytes: fs.statSync(target).size,
      uploads_files: 0,
      uploads_bytes: 0,
    };

    if (includeUploads) {
      manifest.uploads_files = copyDir(UPLOAD_DIR, path.join(dest, 'uploads'));
      manifest.uploads_bytes = dirSize(path.join(dest, 'uploads'));
    }

    fs.writeFileSync(path.join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return { name, dir: dest, manifest };
  } catch (err) {
    // A half-written backup is worse than none - remove it.
    try {
      fs.rmSync(dest, { recursive: true, force: true });
    } catch {}
    throw err;
  } finally {
    if (ownsDb) db.close();
  }
}

export function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const dir = path.join(BACKUP_DIR, e.name);
      let manifest = null;
      try {
        manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
      } catch {}
      return { name: e.name, dir, manifest, valid: fs.existsSync(path.join(dir, 'riseup.db')) };
    })
    .sort((a, b) => b.name.localeCompare(a.name));
}

/** Delete the oldest backups beyond `keep`. Never removes the newest. */
export function pruneBackups(keep = 10) {
  const all = listBackups();
  const removed = [];
  for (const b of all.slice(Math.max(keep, 1))) {
    fs.rmSync(b.dir, { recursive: true, force: true });
    removed.push(b.name);
  }
  return removed;
}

/**
 * Restore a backup over the live data.
 * The current state is itself backed up first (label: pre-restore), so a
 * restore can always be undone.
 */
export function restoreBackup(backupName, { restoreUploads = true } = {}) {
  const src = path.join(BACKUP_DIR, backupName);
  const srcDb = path.join(src, 'riseup.db');
  if (!fs.existsSync(srcDb)) {
    throw new Error(`Backup "${backupName}" not found or has no database file.`);
  }

  // Verify the backup opens and has a schema before trusting it.
  const check = Database(srcDb, { readonly: true });
  try {
    const v = schemaVersion(check);
    if (v <= 0) throw new Error('Backup contains no applied migrations - refusing to restore.');
    check.pragma('integrity_check');
  } finally {
    check.close();
  }

  let safety = null;
  if (fs.existsSync(DB_PATH)) {
    safety = createBackup(null, { label: 'pre-restore' });
  }

  // Remove WAL sidecars so the restored file is authoritative.
  for (const suffix of ['', '-wal', '-shm']) {
    const p = DB_PATH + suffix;
    if (fs.existsSync(p)) fs.rmSync(p, { force: true });
  }
  fs.copyFileSync(srcDb, DB_PATH);

  if (restoreUploads && fs.existsSync(path.join(src, 'uploads'))) {
    fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
    copyDir(path.join(src, 'uploads'), UPLOAD_DIR);
  }

  return { restored: backupName, safetyBackup: safety?.name ?? null };
}
