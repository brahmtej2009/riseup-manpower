'use server';

import { revalidatePath } from 'next/cache';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { guard, audit, formStr, type ActionResult } from '@/lib/admin-actions';
import { pruneAnalytics } from '@/lib/analytics';

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

export async function checkForUpdates(): Promise<ActionResult<{ output: string }>> {
  const g = await guard('system.update');
  if (!g.ok) return g;

  const result = await runScript('update.mjs', ['--check']);
  await audit(g.user, 'system.update_check', 'system', '', result.ok ? 'checked' : 'check failed');

  return { ok: true, message: 'Check complete.', data: { output: result.output } };
}

export async function runUpdateNow(formData: FormData): Promise<ActionResult<{ output: string }>> {
  const g = await guard('system.update');
  if (!g.ok) return g;

  if (formStr(formData, 'confirm', 20) !== 'UPDATE') {
    return { ok: false, error: 'Type UPDATE to confirm.' };
  }

  await audit(g.user, 'system.update_start', 'system', '', 'Update started from the admin panel');

  // The script itself backs up first and rolls everything back on failure.
  const result = await runScript('update.mjs', ['--yes']);

  await audit(
    g.user,
    result.ok ? 'system.update_success' : 'system.update_failed',
    'system',
    '',
    result.output.slice(-400)
  );

  revalidatePath('/admin/system');

  return result.ok
    ? { ok: true, message: 'Update applied. Restart the site for it to take effect.', data: { output: result.output } }
    : {
        ok: false,
        error:
          'The update failed and was rolled back automatically. The site is still on the previous working version.',
      };
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
