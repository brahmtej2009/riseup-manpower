import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';

/**
 * Everything the admin panel and the automatic updater need to know about
 * the code on this server: which version it is on, what is waiting in the
 * repository, what has been installed before, and whether an update is
 * running right now.
 *
 * The actual work (backing up, pulling, building, rolling back) is done by
 * the scripts in /scripts, started as separate processes, because they end by
 * restarting this very server.
 */

const ROOT = process.cwd();
const LOG_DIR = path.join(ROOT, 'data', 'logs');
const BACKUP_DIR = process.env.BACKUP_DIR
  ? path.resolve(ROOT, process.env.BACKUP_DIR)
  : path.join(ROOT, 'data', 'backups');

export interface Commit {
  hash: string;
  subject: string;
  date: string;
}

export interface GitInfo {
  ok: boolean;
  error?: string;
  branch: string;
  current: Commit | null;
  remote: string | null;
  behind: number;
  ahead: number;
  /** What an update would install, newest first. */
  incoming: Commit[];
}

export interface HistoryEntry {
  from: string;
  to: string;
  backup: string | null;
  schema_from?: number;
  schema_to?: number;
  finished_at: string;
  /** False when the backup taken before the update has since been removed. */
  backupAvailable: boolean;
  /** No update is recorded; this is simply the previous version in git. */
  fallback?: boolean;
}

function git(args: string[], timeout = 20_000): string {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(LOG_DIR, file), 'utf8')) as T;
  } catch {
    return null;
  }
}

function writeJson(file: string, value: unknown) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.writeFileSync(path.join(LOG_DIR, file), JSON.stringify(value, null, 2));
  } catch {
    /* state files are a convenience; never a reason to fail */
  }
}

function parseLog(out: string): Commit[] {
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, date, ...rest] = line.split('\t');
      return { hash, date, subject: rest.join('\t') };
    });
}

/** Reads the state of the code, optionally asking the repository first. */
export function gitInfo({ fetch = false } = {}): GitInfo {
  const empty: GitInfo = {
    ok: false, branch: '', current: null, remote: null, behind: 0, ahead: 0, incoming: [],
  };

  try {
    git(['rev-parse', '--is-inside-work-tree']);
  } catch {
    return { ...empty, error: 'This copy of the site was not installed with git.' };
  }

  const branch = process.env.UPDATE_BRANCH || git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'main';

  try {
    if (fetch) git(['fetch', '--prune', 'origin'], 60_000);
  } catch (e) {
    return { ...empty, branch, error: `Could not reach the repository. ${(e as Error).message.split('\n')[0]}` };
  }

  try {
    const current = parseLog(git(['log', '-1', '--format=%h%x09%cI%x09%s', 'HEAD']))[0] ?? null;
    const remote = git(['rev-parse', `origin/${branch}`]);
    const behind = Number(git(['rev-list', '--count', `HEAD..origin/${branch}`])) || 0;
    const ahead = Number(git(['rev-list', '--count', `origin/${branch}..HEAD`])) || 0;
    const incoming = behind
      ? parseLog(git(['log', '--format=%h%x09%cI%x09%s', '-n', '30', `HEAD..origin/${branch}`]))
      : [];
    return { ok: true, branch, current, remote, behind, ahead, incoming };
  } catch (e) {
    return { ...empty, branch, error: (e as Error).message.split('\n')[0] };
  }
}

/** True while an update or a rollback is running. */
export function updateRunning(): boolean {
  const p = readJson<{ running?: boolean; pid?: number }>('update-progress.json');
  if (!p?.running || typeof p.pid !== 'number') return false;
  try {
    process.kill(p.pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Updates installed on this server, newest first. Kept in step with the
 * reader in scripts/rollback.mjs.
 *
 * After a rollback the server runs older code, and an update started from
 * there uses that older update script, which may not write the history. It
 * always writes last-update.json, so an update found there and missing from
 * the history is added. With nothing recorded at all, the version before this
 * one in git is offered, so there is always somewhere to go back to.
 */
export function readHistory(): HistoryEntry[] {
  const file = readJson<Omit<HistoryEntry, 'backupAvailable'>[]>('update-history.json');
  const raw = Array.isArray(file) ? file : [];

  const last = readJson<Record<string, unknown>>('last-update.json');
  if (last?.status === 'success' && last.from && last.to) {
    const from = String(last.from);
    const to = String(last.to);
    const finished = String(last.finished_at ?? '');
    const known = raw.some((h) => h.from === from && h.to === to);
    const newest = raw[raw.length - 1];
    if (!known && (!newest || finished > String(newest.finished_at ?? ''))) {
      raw.push({
        from,
        to,
        backup: last.backup ? String(last.backup) : null,
        schema_from: Number(last.schema_from) || undefined,
        schema_to: Number(last.schema_to) || undefined,
        finished_at: finished,
      });
    }
  }

  if (!raw.length) {
    try {
      raw.push({ from: git(['rev-parse', 'HEAD~1']), to: git(['rev-parse', 'HEAD']), backup: null, finished_at: '', fallback: true });
    } catch {
      /* a single commit: nothing earlier exists */
    }
  }

  return raw
    .map((h) => ({
      ...h,
      backupAvailable:
        !!h.backup && fs.existsSync(path.join(BACKUP_DIR, h.backup, 'riseup.db')),
    }))
    .reverse();
}

export interface AutoState {
  checked_at?: string;
  behind?: number;
  remote?: string;
  error?: string;
  /** A version that was rolled back from, which must not be reinstalled by itself. */
  skip?: string;
  started_at?: string;
  started_for?: string;
}

export const readAutoState = () => readJson<AutoState>('auto-update.json') ?? {};
export const writeAutoState = (s: AutoState) => writeJson('auto-update.json', s);

/**
 * Starts one of the scripts and leaves it running.
 *
 * Detached and with its handles released, so that when the script restarts
 * the server at the end, it is not killed along with it.
 */
export function startDetached(
  script: string,
  args: string[] = []
): { ok: true } | { ok: false; error: string } {
  try {
    const child = spawn(process.execPath, [path.join(ROOT, 'scripts', script), ...args], {
      cwd: ROOT,
      env: process.env,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * One round of the automatic updater, run on a timer by the server itself.
 *
 * Installs a newer version only when: automatic updates are switched on,
 * nothing is running already, the new version is not one that was rolled back
 * from, and it is not one that already failed to install. Anything else waits
 * for a person.
 */
export function autoUpdateTick(enabled: boolean) {
  if (!enabled || updateRunning()) return;

  const state = readAutoState();

  // A just-started update has not written its progress file yet.
  if (state.started_at && Date.now() - Date.parse(state.started_at) < 10 * 60_000) return;

  const info = gitInfo({ fetch: true });
  const next: AutoState = {
    ...state,
    checked_at: new Date().toISOString(),
    behind: info.behind,
    remote: info.remote ?? undefined,
    error: info.error,
  };

  const last = readJson<{ status?: string; target?: string }>('last-update.json');
  const alreadyFailed = last?.status === 'failed' && last.target === info.remote;

  if (info.ok && info.behind > 0 && info.remote && info.remote !== state.skip && !alreadyFailed) {
    const started = startDetached('update.mjs', ['--yes', '--auto']);
    if (started.ok) {
      next.started_at = new Date().toISOString();
      next.started_for = info.remote;
    } else {
      next.error = started.error;
    }
  }

  writeAutoState(next);
}
