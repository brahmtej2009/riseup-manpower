'use server';

import { revalidatePath } from 'next/cache';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { guard, audit, formStr, type ActionResult } from '@/lib/admin-actions';
import { pruneAnalytics } from '@/lib/analytics';
import { db } from '@/lib/db';
import {
  gitInfo, readHistory, readAutoState, writeAutoState, startDetached, updateRunning,
  type GitInfo,
} from '@/lib/updates';

/**
 * Backups and updates are run as separate Node processes rather than inside
 * the web server, so a long job cannot block requests, and so a failing
 * update cannot take the running site down with it.
 */

const ROOT = process.cwd();

function runScript(script: string, args: string[] = []): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'scripts', script), ...args], {
      cwd: ROOT,
      env: process.env,
      // Detached from the request; output is collected below.
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    const collect = (chunk: Buffer) => {
      output += chunk.toString();
      if (output.length > 60_000) output = output.slice(-60_000);
    };

    child.stdout.on('data', collect);
    child.stderr.on('data', collect);

    // A hard ceiling so a hung script can never hold the request open.
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ ok: false, output: output + '\nTimed out after 10 minutes.' });
    }, 600_000);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, output: stripAnsi(output) });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, output: `Could not start the script: ${err.message}` });
    });
  });
}

function stripAnsi(value: string): string {
  // Remove terminal colour codes so the output reads cleanly in the browser.
  return value.replace(/\[[0-9;]*m/g, '');
}

export async function createBackupNow(): Promise<ActionResult> {
  const g = await guard('system.backup');
  if (!g.ok) return g;

  const result = await runScript('backup.mjs', ['--label', 'admin']);
  await audit(g.user, 'system.backup', 'system', '', result.ok ? 'Backup taken' : 'Backup failed');

  revalidatePath('/admin/system');

  return result.ok
    ? { ok: true, message: 'Backup created. The database and every uploaded file were copied.' }
    : { ok: false, error: `The backup failed.\n${result.output.slice(-500)}` };
}

export async function runUpdateNow(formData: FormData): Promise<ActionResult<{ output: string }>> {
  const g = await guard('system.update');
  if (!g.ok) return g;

  if (formStr(formData, 'confirm', 20) !== 'yes') {
    return { ok: false, error: 'The update was not confirmed.' };
  }
  if (updateRunning()) {
    return { ok: false, error: 'An update or a rollback is already running.' };
  }

  await audit(g.user, 'system.update_start', 'system', '', 'Update started from the admin panel');

  // Started and left to run, rather than awaited.
  //
  // An update takes minutes and finishes by restarting this very server, so
  // the request that starts it can never be answered - waiting on it is what
  // produced "an unexpected response was received from the server". The
  // script reports progress to a file instead, and the panel polls
  // /api/admin/update-status, straight through the restart.
  const started = startDetached('update.mjs', ['--yes']);

  if (!started.ok) {
    return { ok: false, error: `The update could not be started. ${started.error}` };
  }

  // A version installed by hand is fair game for the automatic updater again.
  const auto = readAutoState();
  if (auto.skip) writeAutoState({ ...auto, skip: undefined });

  return { ok: true, message: 'Update started.', data: { output: '' } };
}

/** Asks the repository what is new. Changes nothing. */
export async function fetchUpdateInfo(): Promise<ActionResult<{ info: GitInfo }>> {
  const g = await guard('system.update');
  if (!g.ok) return g;

  const info = gitInfo({ fetch: true });
  writeAutoState({
    ...readAutoState(),
    checked_at: new Date().toISOString(),
    behind: info.behind,
    remote: info.remote ?? undefined,
    error: info.error,
  });
  return { ok: true, data: { info } };
}

/** Switches the self-checking automatic updater on or off. */
export async function setAutoUpdate(on: boolean): Promise<ActionResult> {
  const g = await guard('system.update');
  if (!g.ok) return g;

  db.run("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'sys_auto_update'", [
    on ? '1' : '0',
  ]);
  await audit(g.user, 'system.auto_update', 'system', '', on ? 'switched on' : 'switched off');
  revalidatePath('/admin/system');
  revalidatePath('/admin');
  return {
    ok: true,
    message: on ? 'Automatic updates are on.' : 'Automatic updates are off.',
  };
}

/** Goes back to the version before the last update. */
export async function runRollback(formData: FormData): Promise<ActionResult> {
  const g = await guard('system.update');
  if (!g.ok) return g;

  if (formStr(formData, 'confirm', 20) !== 'yes') {
    return { ok: false, error: 'The rollback was not confirmed.' };
  }
  if (updateRunning()) {
    return { ok: false, error: 'An update or a rollback is already running.' };
  }

  const last = readHistory()[0];
  if (!last) return { ok: false, error: 'There is no earlier update to go back to.' };

  const restoreDb = formStr(formData, 'database', 20) === 'restore';
  if (restoreDb && !last.backupAvailable) {
    return { ok: false, error: 'The database backup from before that update is no longer on the server.' };
  }

  await audit(
    g.user, 'system.rollback', 'system', '',
    `to ${last.from.slice(0, 8)}, database ${restoreDb ? 'restored' : 'kept'}`
  );

  const started = startDetached('rollback.mjs', ['--yes', restoreDb ? '--restore-db' : '--keep-db']);
  return started.ok
    ? { ok: true, message: 'Rollback started.' }
    : { ok: false, error: `The rollback could not be started. ${started.error}` };
}

export async function pruneAnalyticsNow(): Promise<ActionResult> {
  const g = await guard('system.logs');
  if (!g.ok) return g;

  const removed = pruneAnalytics();
  await audit(g.user, 'system.prune_analytics', 'system', '', `${removed} row(s)`);

  revalidatePath('/admin/system');
  return {
    ok: true,
    message: removed > 0 ? `${removed} old records removed.` : 'Nothing was old enough to remove.',
  };
}

/**
 * Reads the log written by the last update attempt.
 *
 * A server action is directly callable the moment it exists, whether or not
 * any page has a button wired up to it yet - so this checks its own
 * permission the same as every other action here, rather than relying on
 * nothing reaching it today.
 */
export async function readUpdateLog(): Promise<string> {
  const g = await guard('system.logs');
  if (!g.ok) return '';

  try {
    const file = path.join(ROOT, 'data', 'logs', 'last-update.json');
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}
