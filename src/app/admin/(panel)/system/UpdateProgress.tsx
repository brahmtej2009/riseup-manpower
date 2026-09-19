'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Status {
  running: boolean;
  kind: 'update' | 'rollback';
  step: number;
  totalSteps: number;
  stage: string | null;
  status: string | null;
  restarting: boolean;
  error: string | null;
  log: string[];
  startedAt: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  starting: 'Starting',
  check: 'Checking for a newer version',
  backup: 'Backing up the database and files',
  checkpoint: 'Recording a rollback point',
  pull: 'Downloading the new code',
  install: 'Installing packages',
  migrate: 'Updating the database',
  build: 'Building the new version',
  verify: 'Verifying',
  finalise: 'Finishing',
  'rb-check': 'Checking what to go back to',
  'rb-backup': 'Backing up the database',
  'rb-code': 'Putting back the previous code',
  'rb-install': 'Installing packages',
  'rb-db': 'Sorting out the database',
  'rb-build': 'Building the previous version',
  'rb-verify': 'Verifying',
};

/**
 * Watches an update as it runs.
 *
 * The site restarts itself when the update finishes, so this deliberately
 * treats the server going quiet as part of the process rather than an error.
 * It keeps polling, and when the server answers again the new version is up.
 */
export function UpdateProgress({
  onFinished,
  since = 0,
}: {
  onFinished?: () => void;
  /** When this run was started, so a finished run from before it is ignored. */
  since?: number;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [done, setDone] = useState<'success' | 'failed' | null>(null);
  const logRef = useRef<HTMLPreElement>(null);
  const sawRunning = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/update-status', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data: Status = await res.json();

      setUnreachable(false);
      setStatus(data);
      if (data.running) sawRunning.current = true;

      // Finished only counts once the run has actually been seen, otherwise a
      // stale file from a previous update would look like this one ending.
      const thisRun =
        sawRunning.current || (!!data.startedAt && Date.parse(data.startedAt) >= since - 5000);
      if (!data.running && thisRun) {
        if (data.status === 'failed') setDone('failed');
        else if (data.status === 'success' || data.status === 'up-to-date') setDone('success');
      }
    } catch {
      // Expected while the site restarts itself at the end of an update.
      setUnreachable(true);
    }
  }, [since]);

  useEffect(() => {
    void poll();
    const t = setInterval(poll, 1500);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [status?.log]);

  useEffect(() => {
    if (done === 'success') onFinished?.();
  }, [done, onFinished]);

  const step = status?.step ?? 0;
  const total = status?.totalSteps ?? 9;
  const pct = done === 'success' ? 100 : Math.round((step / total) * 100);

  const rollback = status?.kind === 'rollback';
  const headline =
    done === 'failed'
      ? rollback
        ? 'The rollback failed; nothing was changed'
        : 'The update failed and was rolled back'
      : done === 'success'
        ? rollback
          ? 'Rolled back'
          : 'Update complete'
        : unreachable
          ? 'Restarting the site'
          : STAGE_LABELS[status?.stage ?? 'starting'] ?? 'Working';

  return (
    <div className="rounded-xl border border-line bg-surface p-4 text-left">
      <div className="flex items-center gap-2.5">
        {done === 'success' ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : done === 'failed' ? (
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
        ) : (
          <RefreshCw className="h-5 w-5 shrink-0 animate-spin text-brand-600" />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{headline}</p>
          <p className="text-xs text-ink-muted">
            {done
              ? done === 'success'
                ? rollback
                  ? 'The site is running the previous version.'
                  : 'The site is running the new version.'
                : 'The site is still on the version it was on before.'
              : unreachable
                ? 'The site is coming back up. This page will carry on by itself.'
                : `Step ${step} of ${total}`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-alt">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            done === 'failed' ? 'bg-rose-500' : done === 'success' ? 'bg-emerald-500' : 'bg-brand-600'
          )}
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>

      {done === 'failed' && status?.error && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs leading-relaxed text-rose-800">
          {status.error}
        </p>
      )}

      {/* Live log */}
      {(status?.log?.length ?? 0) > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-medium uppercase tracking-wider text-ink-muted">
            <Terminal className="h-3 w-3" />
            Log
          </p>
          <pre
            ref={logRef}
            className="max-h-64 overflow-auto rounded-lg bg-ink p-3 text-[0.6875rem] leading-relaxed text-slate-200"
          >
            {status!.log
              .map((l) => l.replace(/^\[[^\]]+\]\s*/, ''))
              .join('\n')}
          </pre>
        </div>
      )}

      {done === 'success' && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-primary btn-sm mt-3"
        >
          Reload the panel
        </button>
      )}
    </div>
  );
}
