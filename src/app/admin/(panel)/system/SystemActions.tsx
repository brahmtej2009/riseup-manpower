'use client';

import { useState } from 'react';
import { HardDriveDownload, Trash2, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/admin/ui';
import { ResultBanner } from '@/components/admin/interactive';
import type { ActionResult } from '@/lib/admin-actions';

export function SystemActions({
  canBackup,
  canPrune,
  backup,
  prune,
}: {
  canBackup: boolean;
  canPrune: boolean;
  backup: () => Promise<ActionResult>;
  prune: () => Promise<ActionResult>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok?: boolean; message?: string; error?: string } | null>(null);
  const [output, setOutput] = useState('');

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
    <Panel title="Maintenance" description="Recorded in the activity log.">
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

    </Panel>
  );
}
