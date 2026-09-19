#!/usr/bin/env node
// npm run rollback -- --keep-db      go back to the version before the last update,
//                                    keeping the database as it is now
// npm run rollback -- --restore-db   the same, and put back the database backup
//                                    taken just before that update
// Add --yes to skip the confirmation prompt (the admin panel does).
//
// What this guarantees:
//   1. The current database is backed up before anything is touched, so a
//      rollback can itself be undone.
//   2. If any step fails, the code, the packages and the database are put back
//      exactly as they were before the rollback started.
//   3. Uploaded files are never touched. Only the database file is restored.
//   4. The version rolled back from is not reinstalled by the automatic
//      updater. A newer one will be, and a manual update still can.

import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync, spawn } from 'node:child_process';
import readline from 'node:readline/promises';
import Database from './lib/sqlite.mjs';
import { loadEnv, ensureDirs, ROOT, DB_PATH, LOG_DIR, BACKUP_DIR, c, ok, fail, warn, step } from './lib/paths.mjs';
import { createBackup, restoreBackup } from './lib/backup-core.mjs';
import { schemaVersion } from './lib/migrator.mjs';
import { builtSince, discardSlot } from './lib/build-slot.mjs';

loadEnv();
ensureDirs();

const args = process.argv.slice(2);
const RESTORE_DB = args.includes('--restore-db');
const ASSUME_YES = args.includes('--yes') || args.includes('-y');

// Turbopack builds several times faster. It is still new in this version of
// Next, so if it ever fails, the long-standing webpack build runs instead.
const BUILD = 'npx next build --turbopack || npx next build';

const TOTAL_STEPS = 7;
const startedAt = new Date();
const logFile = path.join(LOG_DIR, `rollback-${startedAt.toISOString().replace(/[:.]/g, '-')}.log`);
const progressFile = path.join(LOG_DIR, 'update-progress.json');
const historyFile = path.join(LOG_DIR, 'update-history.json');
const logLines = [];
let currentStep = 0;
let currentStage = 'starting';

function writeProgress(extra = {}) {
  try {
    fs.writeFileSync(
      progressFile,
      JSON.stringify(
        {
          running: true,
          kind: 'rollback',
          pid: process.pid,
          step: currentStep,
          total_steps: TOTAL_STEPS,
          stage: currentStage,
          started_at: startedAt.toISOString(),
          updated_at: new Date().toISOString(),
          log: logLines.slice(-400),
          ...extra,
        },
        null,
        2
      )
    );
  } catch {}
}

function record(line) {
  logLines.push(`[${new Date().toISOString()}] ${line}`);
  try {
    fs.writeFileSync(logFile, logLines.join('\n') + '\n');
  } catch {}
  writeProgress();
}

function say(line) {
  console.log(line);
  record(line.replace(/\[\d+m/g, ''));
}

function stage(n, message, key) {
  currentStep = n;
  currentStage = key;
  step(n, TOTAL_STEPS, message);
  record(`stage: ${key}`);
}

function run(cmd) {
  record(`$ ${cmd}`);
  const res = spawnSync(cmd, { cwd: ROOT, shell: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const out = `${res.stdout || ''}${res.stderr || ''}`.trim();
  if (out) record(out);
  if (res.status !== 0) throw new Error(`Command failed (exit ${res.status}): ${cmd}\n${out.slice(-2000)}`);
  return out;
}

const git = (cmd) =>
  execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
};

/**
 * The installed updates, oldest first. Kept in step with the admin panel's
 * reader in src/lib/updates.ts.
 *
 * After a rollback the server runs older code, and an update started from
 * there uses that older update script, which may not write this history. It
 * always writes last-update.json, so an update found there and missing here
 * is added. With nothing recorded at all, the version before this one in git
 * is offered, so there is always somewhere to go back to.
 */
function readHistory() {
  const raw = readJson(historyFile, []);
  const list = Array.isArray(raw) ? raw : [];

  const last = readJson(path.join(LOG_DIR, 'last-update.json'), null);
  if (last?.status === 'success' && last.from && last.to) {
    const known = list.some((h) => h.from === last.from && h.to === last.to);
    const newest = list[list.length - 1];
    if (!known && (!newest || String(last.finished_at ?? '') > String(newest.finished_at ?? ''))) {
      list.push({ from: last.from, to: last.to, backup: last.backup ?? null, finished_at: last.finished_at ?? '' });
    }
  }

  if (!list.length) {
    try {
      list.push({ from: git('rev-parse HEAD~1'), to: git('rev-parse HEAD'), backup: null, finished_at: '', fallback: true });
    } catch {
      /* a single commit: nothing earlier exists */
    }
  }
  return list;
}

function restartSite() {
  const name = process.env.PM2_APP_NAME || process.env.name || process.env.pm_id;
  if (!name) {
    say('  Not running under pm2 - restart the site yourself to serve the previous build.');
    return false;
  }
  try {
    say(`  Restarting the site (pm2 ${name})...`);
    spawn('pm2', ['restart', String(name), '--update-env'], {
      cwd: ROOT,
      detached: true,
      stdio: 'ignore',
      shell: true,
    }).unref();
    return true;
  } catch (e) {
    warn(`Could not restart automatically: ${e.message}`);
    return false;
  }
}

async function main() {
  say(`${c.bold}Rise Up Manpower - roll back the last update${c.reset}`);
  say(`Log: ${logFile}`);

  // -- 1 ----------------------------------------------------------------- check
  stage(1, 'Checking what to go back to', 'rb-check');

  const history = readHistory();
  const entry = history[history.length - 1];
  if (!entry) throw new Error('There is no earlier update recorded on this server to go back to.');

  const here = git('rev-parse HEAD');
  say(`  now at      : ${here.slice(0, 8)}`);
  say(`  going to    : ${String(entry.from).slice(0, 8)} (the version before the update of ${entry.finished_at || 'unknown date'})`);
  say(`  database    : ${RESTORE_DB ? `restore ${entry.backup}` : 'keep as it is'}`);

  try {
    if (git(`cat-file -t ${entry.from}`) !== 'commit') throw new Error();
  } catch {
    throw new Error(`The previous version (${String(entry.from).slice(0, 8)}) is no longer in this copy's history.`);
  }

  if (RESTORE_DB && !(entry.backup && fs.existsSync(path.join(BACKUP_DIR, entry.backup, 'riseup.db')))) {
    throw new Error('The database backup from before that update is no longer on the server.');
  }

  const dirty = git('status --porcelain');
  if (dirty) throw new Error(`There are uncommitted edits on the server. Nothing was changed.\n${dirty}`);

  if (!ASSUME_YES) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const a = (await rl.question('\nRoll back now? (yes/no): ')).trim().toLowerCase();
    rl.close();
    if (a !== 'yes' && a !== 'y') {
      say('Cancelled. Nothing was changed.');
      writeProgress({ running: false, status: 'cancelled' });
      process.exit(0);
    }
  }

  // -- 2 ---------------------------------------------------------------- backup
  stage(2, 'Backing up the database as it is now', 'rb-backup');
  const safety = createBackup(null, { label: 'pre-rollback', includeUploads: false });
  ok(`Backup: ${safety.name}`);

  const lockBefore = fs.existsSync(path.join(ROOT, 'package-lock.json'))
    ? fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8')
    : null;
  let reached = 'rb-backup';
  let dbRestored = false;
  let buildStart = 0;

  try {
    // -- 3 --------------------------------------------------------------- code
    reached = 'rb-code';
    stage(3, 'Putting back the previous code', 'rb-code');
    run(`git reset --hard ${entry.from}`);
    ok(`Code is at ${String(entry.from).slice(0, 8)}`);

    // -- 4 ----------------------------------------------------------- packages
    reached = 'rb-install';
    stage(4, 'Installing the packages it needs', 'rb-install');
    const lockAfter = fs.existsSync(path.join(ROOT, 'package-lock.json'))
      ? fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8')
      : null;
    if (lockAfter !== lockBefore) {
      run('npm ci --no-audit --no-fund || npm install --no-audit --no-fund');
      ok('Packages installed.');
    } else {
      ok('No package changes - skipped.');
    }

    // -- 5 ----------------------------------------------------------- database
    reached = 'rb-db';
    stage(5, RESTORE_DB ? 'Restoring the database backup' : 'Keeping the current database', 'rb-db');
    if (RESTORE_DB) {
      restoreBackup(entry.backup, { restoreUploads: false });
      dbRestored = true;
      ok(`Database restored from ${entry.backup}. Uploaded files were left as they are.`);
    } else {
      // Migrations only ever add, so the older code runs on the newer
      // database; it simply ignores what it does not know about.
      ok('Database kept as it is.');
    }

    // -- 6 -------------------------------------------------------------- build
    reached = 'rb-build';
    stage(6, 'Building the previous version', 'rb-build');
    // `next build` directly: `npm run build` would migrate first, and the
    // database is deliberately left exactly as chosen above.
    buildStart = Date.now() - 1000;
    run(BUILD);
    ok('Build succeeded.');

    // -- 7 ------------------------------------------------------------- verify
    reached = 'rb-verify';
    stage(7, 'Verifying', 'rb-verify');
    const dbv = Database(DB_PATH, { readonly: true });
    const integrity = dbv.pragma('integrity_check', { simple: true });
    const schema = schemaVersion(dbv);
    dbv.close();
    if (integrity !== 'ok') throw new Error(`Database integrity check failed: ${integrity}`);
    if (!builtSince(buildStart, ROOT)) throw new Error('Build output is missing.');
    ok(`Integrity ok, schema v${schema}.`);

    // The rolled-back update comes off the history, so a second rollback
    // goes one further back, and the automatic updater is told not to put
    // this version straight back.
    fs.writeFileSync(historyFile, JSON.stringify(history.slice(0, -1), null, 2));
    let remote = entry.to;
    try {
      remote = git(`rev-parse origin/${process.env.UPDATE_BRANCH || 'main'}`);
    } catch {}
    const auto = readJson(path.join(LOG_DIR, 'auto-update.json'), {});
    fs.writeFileSync(path.join(LOG_DIR, 'auto-update.json'), JSON.stringify({ ...auto, skip: remote }, null, 2));

    fs.writeFileSync(
      path.join(LOG_DIR, 'last-update.json'),
      JSON.stringify(
        {
          status: 'rolled-back',
          from: here,
          to: entry.from,
          database: RESTORE_DB ? `restored from ${entry.backup}` : 'kept',
          backup: safety.name,
          started_at: startedAt.toISOString(),
          finished_at: new Date().toISOString(),
          log: path.basename(logFile),
        },
        null,
        2
      )
    );

    say('');
    ok(`${c.bold}Rolled back.${c.reset} ${here.slice(0, 8)} -> ${String(entry.from).slice(0, 8)}`);

    const restarting = !!(process.env.PM2_APP_NAME || process.env.pm_id || process.env.name);
    writeProgress({ running: false, status: 'success', restarting, finished_at: new Date().toISOString() });
    restartSite();
    process.exit(0);
  } catch (err) {
    say('');
    fail(`Rollback failed during "${reached}": ${err.message}`);
    say(`${c.yellow}Putting everything back as it was...${c.reset}`);

    try {
      run(`git reset --hard ${here}`);
      ok(`Code back at ${here.slice(0, 8)}`);
    } catch (e) {
      fail(`Could not reset the code: ${e.message}`);
    }
    if (dbRestored) {
      try {
        restoreBackup(safety.name, { restoreUploads: false });
        ok('Database put back.');
      } catch (e) {
        fail(`Could not put the database back. Restore it with:  npm run restore -- ${safety.name}`);
      }
    }
    if (['rb-install', 'rb-db', 'rb-build', 'rb-verify'].includes(reached)) {
      try {
        run('npm install --no-audit --no-fund');
      } catch {
        warn('Could not reinstall packages - run "npm install" by hand.');
      }
      // The build being served was never touched; only the new one goes.
      const fresh = buildStart ? builtSince(buildStart, ROOT) : null;
      if (fresh) discardSlot(fresh, ROOT);
      ok('The current build is still in place.');
    }

    writeProgress({ running: false, status: 'failed', error: err.message, finished_at: new Date().toISOString() });
    process.exit(1);
  }
}

main().catch((e) => {
  fail(e.message);
  record(`FATAL ${e.message}`);
  writeProgress({ running: false, status: 'failed', error: e.message, finished_at: new Date().toISOString() });
  process.exit(1);
});
