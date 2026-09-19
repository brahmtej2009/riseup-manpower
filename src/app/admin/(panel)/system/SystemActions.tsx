'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HardDriveDownload, RefreshCw, Download, Trash2, AlertTriangle, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UpdateProgress } from './UpdateProgress';
import { Panel } from '@/components/admin/ui';
import { ResultBanner } from '@/components/admin/interactive';
import type { ActionResult } from '@/lib/admin-actions';

export function SystemActions({
  canBackup,
  canUpdate,
  canPrune,
  repoConfigured,
  backup,
  check,
  update,
  prune,
}: {
  canBackup: boolean;
  canUpdate: boolean;
  canPrune: boolean;
  repoConfigured: boolean;
  backup: () => Promise<ActionResult>;
  check: () => Promise<ActionResult<{ output: string }>>;
  update: (fd: FormData) => Promise<ActionResult<{ output: string }>>;
  prune: () => Promise<ActionResult>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok?: boolean; message?: string; error?: string } | null>(null);
  const [output, setOutput] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [updating, setUpdating] = useState(false);

  const run = async (name: string, fn: () => Promise<ActionResult<{ output: string }> | ActionResult>) => {
    setBusy(name);
    setResult(null);
    setOutput('');
    try {
      const res = await fn();
      setResult(res);
      if (res.ok && 'data' in res && res.data && 'output' in res.data) {
        setOutput(String(res.data.output ?? ''));
      }
    } catch (err) {
      setResult({ ok: false, error: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel title="Maintenance" description="These run on the server and are recorded in the activity log.">
      <ResultBanner result={result} />

      <div className="grid gap-3 sm:grid-cols-2">
        {canBackup && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run('backup', backup)}
            className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              {busy === 'backup' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700/30 border-t-emerald-700" />
              ) : (
                <HardDriveDownload className="h-[1.125rem] w-[1.125rem]" />
              )}
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">Take a backup now</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                Copies the database and every uploaded file to a timestamped folder.
              </span>
            </span>
          </button>
        )}

        {canUpdate && (
          <button
            type="button"
            disabled={!!busy || !repoConfigured}
            onClick={() => run('check', check)}
            className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600/10 text-brand-700">
              {busy === 'check' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-700/30 border-t-brand-700" />
              ) : (
                <RefreshCw className="h-[1.125rem] w-[1.125rem]" />
              )}
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">Check for an update</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                Looks at the repository. Changes nothing.
              </span>
            </span>
          </button>
        )}

        {canPrune && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => run('prune', prune)}
            className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-50"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-ink-soft">
              {busy === 'prune' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
              ) : (
                <Trash2 className="h-[1.125rem] w-[1.125rem]" />
              )}
            </span>
            <span>
              <span className="block text-sm font-semibold text-ink">Clear old visit records</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                Removes detailed rows past the retention window. Totals are kept.
              </span>
            </span>
          </button>
        )}
      </div>

      {!repoConfigured && canUpdate && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            No code repository has been set, so updates cannot run.{' '}
            <Link href="/admin/settings?group=system" className="font-semibold underline">
              Add the GitHub address in Settings
            </Link>
            .
          </span>
        </p>
      )}

      {output && (
        <div className="mt-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <Terminal className="h-3.5 w-3.5" />
            Output
          </p>
          <pre className="max-h-72 overflow-auto rounded-xl bg-ink p-4 text-[0.75rem] leading-relaxed text-slate-200">
            {output}
          </pre>
        </div>
      )}

      {/* Applying an update is deliberately behind a typed confirmation. */}
      {canUpdate && repoConfigured && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Apply an update
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-amber-900/90">
            The database is backed up first, migrations are applied without touching existing data,
            and if anything fails the code and the database are rolled back automatically. The site
            restarts itself when it is done.
          </p>

          {updating ? (
            <div className="mt-3">
              <UpdateProgress />
            </div>
          ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type UPDATE to confirm"
              className="field h-10 min-h-0 w-56 text-sm"
              autoComplete="off"
            />
            <button
              type="button"
              disabled={!!busy || updating || confirmText.trim().toUpperCase() !== 'UPDATE'}
              onClick={async () => {
                const fd = new FormData();
                fd.set('confirm', 'UPDATE');
                // The action only starts the update and returns; everything
                // after this point is watched by UpdateProgress.
                const res = await update(fd);
                if (res.ok) setUpdating(true);
                else setResult(res);
              }}
              className="btn btn-sm bg-amber-600 text-white hover:bg-amber-700"
            >
              <Download className="h-4 w-4" />
              Apply the update
            </button>
          </div>
          )}
        </div>
      )}
    </Panel>
  );
}
