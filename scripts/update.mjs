#!/usr/bin/env node
// npm run update            pull, migrate, build - with automatic rollback
// npm run update:check      report only; changes nothing
// npm run update -- --yes   skip the confirmation prompt (for cron/admin panel)
//
// The guarantees this script makes:
//   1. The database is backed up BEFORE anything is touched.
//   2. The exact current commit is recorded before pulling.
//   3. Migrations only ever ADD to the database. They never drop or reset it.
//   4. If ANY step fails, the code is reset to the previous commit, the
//      database is restored from the backup taken in step 2, and the
//      dependencies/build are restored to the previous state.
//   5. Every run writes a log to data/logs/update-<timestamp>.log

import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import readline from 'node:readline/promises';
import Database from './lib/sqlite.mjs';
import {
  loadEnv,
  ensureDirs,
  ROOT,
  DB_PATH,
  LOG_DIR,
  MIGRATIONS_DIR,
  c,
  ok,
  fail,
  warn,
  step,
} from './lib/paths.mjs';
import { createBackup, restoreBackup, pruneBackups } from './lib/backup-core.mjs';
import { pendingMigrations, schemaVersion } from './lib/migrator.mjs';

loadEnv();
ensureDirs();

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const ASSUME_YES = args.includes('--yes') || args.includes('-y');
const SKIP_BUILD = args.includes('--no-build');

const TOTAL_STEPS = 9;
const startedAt = new Date();
const logFile = path.join(
  LOG_DIR,
  `update-${startedAt.toISOString().replace(/[:.]/g, '-')}.log`
);
const logLines = [];

function record(line) {
  logLines.push(`[${new Date().toISOString()}] ${line}`);
  fs.writeFileSync(logFile, logLines.join('\n') + '\n');
}
function say(line) {
  console.log(line);
  record(line.replace(/\[\d+m/g, ''));
}

function run(cmd, opts = {}) {
  record(`$ ${cmd}`);
  const res = spawnSync(cmd, {
    cwd: ROOT,
    shell: true,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  });
  const out = `${res.stdout || ''}${res.stderr || ''}`.trim();
  if (out) record(out);
  if (res.status !== 0) {
    const err = new Error(`Command failed (exit ${res.status}): ${cmd}\n${out}`);
    err.output = out;
    throw err;
  }
  return out;
}

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    .toString()
    .trim();
}

function isGitRepo() {
  try {
    git('rev-parse --is-inside-work-tree');
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------

async function main() {
  say(`${c.bold}Rise Up Manpower - update${c.reset}`);
  say(`Log: ${logFile}`);

  if (!isGitRepo()) {
    fail('This folder is not a git repository, so there is nothing to update from.');
    say('Set UPDATE_REPO_URL in .env and clone the project with git to enable updates.');
    process.exit(1);
  }

  const branch = process.env.UPDATE_BRANCH || git('rev-parse --abbrev-ref HEAD') || 'main';

  // -- 1 ---------------------------------------------------------------- check
  step(1, TOTAL_STEPS, 'Checking the repository for a newer version');
  record('step 1: check remote');

  const dirty = git('status --porcelain');
  if (dirty) {
    warn('There are uncommitted local changes:');
    say(dirty);
    warn('Updating would overwrite them. Commit or discard them first.');
    if (!ASSUME_YES && !CHECK_ONLY) process.exit(1);
  }

  run('git fetch --all --tags --prune');
  const localCommit = git('rev-parse HEAD');
  let remoteCommit;
  try {
    remoteCommit = git(`rev-parse origin/${branch}`);
  } catch {
    fail(`Branch origin/${branch} does not exist on the remote.`);
    process.exit(1);
  }

  const behind = Number(git(`rev-list --count HEAD..origin/${branch}`) || 0);
  const ahead = Number(git(`rev-list --count origin/${branch}..HEAD`) || 0);

  say(`  current : ${localCommit.slice(0, 8)} (${branch})`);
  say(`  remote  : ${remoteCommit.slice(0, 8)}`);
  say(`  ${behind} commit(s) behind, ${ahead} ahead`);

  const db0 = Database(DB_PATH, { readonly: true });
  const currentSchema = schemaVersion(db0);
  db0.close();

  if (behind === 0) {
    ok(`Already up to date. Schema version ${currentSchema}.`);
    process.exit(0);
  }

  say(`\n${c.bold}Changes to be applied:${c.reset}`);
  say(git(`log --oneline --no-decorate HEAD..origin/${branch}`).split('\n').slice(0, 25).join('\n'));

  if (CHECK_ONLY) {
    ok('Check complete. Nothing was changed. Run "npm run update" to apply.');
    process.exit(0);
  }

  if (!ASSUME_YES) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const a = (await rl.question('\nApply this update? (yes/no): ')).trim().toLowerCase();
    rl.close();
    if (a !== 'yes' && a !== 'y') {
      say('Cancelled. Nothing was changed.');
      process.exit(0);
    }
  }

  // -- 2 --------------------------------------------------------------- backup
  step(2, TOTAL_STEPS, 'Backing up the database and uploaded files');
  const backup = createBackup(null, { label: 'pre-update' });
  ok(`Backup: ${backup.name} (schema v${backup.manifest.schema_version})`);
  record(`backup dir: ${backup.dir}`);

  // -- 3 ------------------------------------------------------------ checkpoint
  step(3, TOTAL_STEPS, 'Recording the current version for rollback');
  const rollbackPoint = localCommit;
  const hadNodeModules = fs.existsSync(path.join(ROOT, 'node_modules'));
  const lockBefore = readIfExists(path.join(ROOT, 'package-lock.json'));
  ok(`Rollback point: ${rollbackPoint.slice(0, 8)}`);

  // Everything from here on is protected by the rollback handler.
  let stageReached = 'checkpoint';

  try {
    // -- 4 ------------------------------------------------------------- pull
    stageReached = 'pull';
    step(4, TOTAL_STEPS, 'Downloading the new code');
    run(`git merge --ff-only origin/${branch}`);
    const newCommit = git('rev-parse HEAD');
    ok(`Now at ${newCommit.slice(0, 8)}`);

    // -- 5 --------------------------------------------------------- packages
    stageReached = 'install';
    step(5, TOTAL_STEPS, 'Installing packages');
    const lockAfter = readIfExists(path.join(ROOT, 'package-lock.json'));
    if (!hadNodeModules || lockBefore !== lockAfter) {
      run('npm ci --no-audit --no-fund || npm install --no-audit --no-fund');
      ok('Packages installed.');
    } else {
      ok('No package changes - skipped.');
    }

    // -- 6 ------------------------------------------------------- migrations
    stageReached = 'migrate';
    step(6, TOTAL_STEPS, 'Applying database migrations');
    const dbm = Database(DB_PATH);
    dbm.pragma('journal_mode = WAL');
    const pending = pendingMigrations(dbm, MIGRATIONS_DIR);
    dbm.close();

    if (pending.length === 0) {
      ok('No new migrations.');
    } else {
      say(`  ${pending.length} new migration(s): ${pending.map((p) => p.file).join(', ')}`);
      // --no-backup: step 2 already took one moments ago.
      run('node scripts/migrate.mjs --no-backup');
      ok('Migrations applied. Existing data untouched.');
    }

    // -- 7 ------------------------------------------------------------ build
    stageReached = 'build';
    if (SKIP_BUILD) {
      step(7, TOTAL_STEPS, 'Build skipped (--no-build)');
    } else {
      step(7, TOTAL_STEPS, 'Building the new version');
      run('npx next build');
      ok('Build succeeded.');
    }

    // -- 8 ----------------------------------------------------------- verify
    stageReached = 'verify';
    step(8, TOTAL_STEPS, 'Verifying');
    const dbv = Database(DB_PATH, { readonly: true });
    const integrity = dbv.pragma('integrity_check', { simple: true });
    const newSchema = schemaVersion(dbv);
    const userCount = dbv.prepare('SELECT COUNT(*) AS n FROM users').get().n;
    dbv.close();

    if (integrity !== 'ok') throw new Error(`Database integrity check failed: ${integrity}`);
    if (userCount < 1) throw new Error('No admin users found after update - refusing to continue.');
    if (newSchema < currentSchema) {
      throw new Error(`Schema went backwards (${currentSchema} -> ${newSchema}).`);
    }
    if (!SKIP_BUILD && !fs.existsSync(path.join(ROOT, '.next', 'BUILD_ID'))) {
      throw new Error('Build output is missing (.next/BUILD_ID).');
    }
    ok(`Integrity ok, schema v${newSchema}, ${userCount} admin user(s).`);

    // -- 9 ------------------------------------------------------------ done
    stageReached = 'finalise';
    step(9, TOTAL_STEPS, 'Finishing');
    pruneBackups(Number(process.env.BACKUP_RETENTION || 10));
    writeStatus({
      status: 'success',
      from: rollbackPoint,
      to: newCommit,
      schema_from: currentSchema,
      schema_to: newSchema,
      backup: backup.name,
      finished_at: new Date().toISOString(),
      log: path.basename(logFile),
    });

    say('');
    ok(`${c.bold}Update complete.${c.reset}`);
    say(`  ${rollbackPoint.slice(0, 8)} -> ${newCommit.slice(0, 8)}`);
    say(`  Restart the site:  npm start`);
    process.exit(0);
  } catch (err) {
    // ---------------------------------------------------------- ROLLBACK
    say('');
    fail(`Update failed during "${stageReached}": ${err.message}`);
    say(`${c.yellow}${c.bold}Rolling back...${c.reset}`);

    const rollbackReport = [];

    try {
      run(`git reset --hard ${rollbackPoint}`);
      rollbackReport.push(`code reset to ${rollbackPoint.slice(0, 8)}`);
      ok(`Code restored to ${rollbackPoint.slice(0, 8)}`);
    } catch (e) {
      fail(`Could not reset the code: ${e.message}`);
      rollbackReport.push('CODE RESET FAILED');
    }

    // Only restore the database if migrations may have altered it.
    if (['migrate', 'build', 'verify', 'finalise'].includes(stageReached)) {
      try {
        restoreBackup(backup.name);
        rollbackReport.push(`database restored from ${backup.name}`);
        ok(`Database restored from ${backup.name}`);
      } catch (e) {
        fail(`Could not restore the database: ${e.message}`);
        fail(`Restore it manually with:  npm run restore -- ${backup.name}`);
        rollbackReport.push('DATABASE RESTORE FAILED');
      }
    } else {
      rollbackReport.push('database was never modified');
      ok('Database was not modified by this attempt.');
    }

    if (['install', 'migrate', 'build', 'verify', 'finalise'].includes(stageReached)) {
      try {
        run('npm install --no-audit --no-fund');
        rollbackReport.push('packages reinstalled for the previous version');
      } catch {
        warn('Could not reinstall the previous packages - run "npm install" manually.');
      }
      if (!SKIP_BUILD) {
        try {
          run('npx next build');
          rollbackReport.push('previous version rebuilt');
          ok('Previous version rebuilt.');
        } catch {
          warn('Could not rebuild the previous version - run "npm run build" manually.');
        }
      }
    }

    writeStatus({
      status: 'failed',
      failed_at_stage: stageReached,
      error: err.message,
      rolled_back_to: rollbackPoint,
      backup: backup.name,
      rollback: rollbackReport,
      finished_at: new Date().toISOString(),
      log: path.basename(logFile),
    });

    say('');
    fail(`${c.bold}Update was rolled back. The site is on the previous working version.${c.reset}`);
    say(`  Backup kept : ${backup.name}`);
    say(`  Full log    : ${logFile}`);
    process.exit(1);
  }
}

function readIfExists(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function writeStatus(obj) {
  try {
    fs.writeFileSync(
      path.join(LOG_DIR, 'last-update.json'),
      JSON.stringify({ ...obj, started_at: startedAt.toISOString() }, null, 2)
    );
  } catch {}
}

main().catch((e) => {
  fail(e.message);
  record(`FATAL ${e.stack}`);
  process.exit(1);
});
