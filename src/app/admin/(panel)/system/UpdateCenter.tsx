'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  RefreshCw, Download, History, GitCommitHorizontal, CheckCircle2, ArrowUpCircle,
  ShieldCheck, Database, DatabaseBackup, X, AlertTriangle, Zap, ArrowRight,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import type { ActionResult } from '@/lib/admin-actions';
import type { GitInfo, HistoryEntry, Commit } from '@/lib/updates';
import { UpdateProgress } from './UpdateProgress';

export interface UpdateCenterProps {
  info: GitInfo;
  history: HistoryEntry[];
  auto: boolean;
  checkedAt: string | null;
  running: boolean;
  fetchInfo: () => Promise<ActionResult<{ info: GitInfo }>>;
  update: (fd: FormData) => Promise<ActionResult<{ output: string }>>;
  rollback: (fd: FormData) => Promise<ActionResult>;
  setAuto: (on: boolean) => Promise<ActionResult>;
}

/**
 * Everything about the website's version in one place: what is installed,
 * what is waiting, installing it, going back, and the automatic updater.
 */
export function UpdateCenter(props: UpdateCenterProps) {
  const [info, setInfo] = useState(props.info);
  const [checkedAt, setCheckedAt] = useState(props.checkedAt);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'update' | 'rollback' | null>(null);
  const [runningSince, setRunningSince] = useState<number | null>(props.running ? 1 : null);

  const last = props.history[0] ?? null;

  const check = async () => {
    setChecking(true);
    setError(null);
    const res = await props.fetchInfo();
    setChecking(false);
    if (res.ok && res.data) {
      setInfo(res.data.info);
      setCheckedAt(new Date().toISOString());
      if (res.data.info.error) setError(res.data.info.error);
    } else if (!res.ok) {
      setError(res.error ?? 'The check failed.');
    }
  };

  const start = async (kind: 'update' | 'rollback', fd: FormData) => {
    fd.set('confirm', 'yes');
    const res = kind === 'update' ? await props.update(fd) : await props.rollback(fd);
    setDialog(null);
    if (res.ok) setRunningSince(Date.now());
    else setError(res.error ?? 'It could not be started.');
  };

  if (runningSince !== null) {
    return (
      <section className="card overflow-hidden">
        <Header info={info} checkedAt={checkedAt} />
        <div className="p-5">
          <UpdateProgress since={runningSince} />
        </div>
      </section>
    );
  }

  const behind = info.ok ? info.behind : 0;

  return (
    <section className="card overflow-hidden">
      <Header info={info} checkedAt={checkedAt} />

      <div className="space-y-5 p-5">
        {error && (
          <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </p>
        )}

        {/* The three things that can be done. */}
        <div className="grid gap-3 sm:grid-cols-3">
          <ActionTile
            icon={RefreshCw}
            spin={checking}
            title="Check now"
            text="Asks the repository what is new"
            onClick={check}
            disabled={checking || !info.branch}
          />
          <ActionTile
            icon={ArrowUpCircle}
            title={behind ? `Install ${behind} update${behind === 1 ? '' : 's'}` : 'Update'}
            text={behind ? 'Backed up first, undone if it fails' : 'Nothing new to install'}
            onClick={() => setDialog('update')}
            disabled={!behind}
            tone="brand"
          />
          <ActionTile
            icon={History}
            title="Roll back"
            text={
              last
                ? `To ${last.from.slice(0, 7)}, ${last.fallback ? 'the previous version' : 'before the last update'}`
                : 'There is no earlier version'
            }
            onClick={() => setDialog('rollback')}
            disabled={!last}
            tone="rose"
          />
        </div>

        {/* What an update would install. */}
        {behind > 0 && (
          <div>
            <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-muted">
              Waiting to be installed
            </p>
            <CommitList commits={info.incoming} />
          </div>
        )}

        <AutoToggle initial={props.auto} setAuto={props.setAuto} />
      </div>

      <AnimatePresence>
        {dialog === 'update' && (
          <Dialog onClose={() => setDialog(null)}>
            <UpdateDialog info={info} onCancel={() => setDialog(null)} onConfirm={(fd) => start('update', fd)} />
          </Dialog>
        )}
        {dialog === 'rollback' && last && (
          <Dialog onClose={() => setDialog(null)}>
            <RollbackDialog
              last={last}
              current={info.current}
              onCancel={() => setDialog(null)}
              onConfirm={(fd) => start('rollback', fd)}
            />
          </Dialog>
        )}
      </AnimatePresence>
    </section>
  );
}

// ---------------------------------------------------------------------------

function Header({ info, checkedAt }: { info: GitInfo; checkedAt: string | null }) {
  const behind = info.ok ? info.behind : 0;
  return (
    <div className="relative overflow-hidden border-b border-line bg-gradient-to-br from-brand-600/10 via-surface to-surface p-5">
      <div className="flex flex-wrap items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-glow">
          <GitCommitHorizontal className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-muted">
            Website version
          </p>
          {info.current ? (
            <>
              <p className="mt-0.5 truncate font-display text-lg font-semibold text-ink">
                {info.current.subject}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                <span className="font-mono">{info.current.hash}</span>
                {' · '}installed code from {timeAgo(info.current.date)}
                {info.branch && <> · branch {info.branch}</>}
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-ink-soft">{info.error ?? 'Not a git install.'}</p>
          )}
        </div>
        <span
          className={cn(
            'chip shrink-0',
            behind
              ? 'bg-amber-50 text-amber-800 ring-amber-600/20'
              : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
          )}
        >
          {behind ? (
            <>
              <ArrowUpCircle className="h-3.5 w-3.5" />
              {behind} update{behind === 1 ? '' : 's'} available
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Up to date
            </>
          )}
        </span>
      </div>
      <p className="mt-3 text-[0.6875rem] text-ink-muted">
        {checkedAt ? `Last checked ${timeAgo(checkedAt)}` : 'Not checked yet'}
      </p>
    </div>
  );
}

function ActionTile({
  icon: Icon,
  title,
  text,
  onClick,
  disabled,
  spin,
  tone = 'plain',
}: {
  icon: typeof RefreshCw;
  title: string;
  text: string;
  onClick: () => void;
  disabled?: boolean;
  spin?: boolean;
  tone?: 'plain' | 'brand' | 'rose';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group flex items-start gap-3 rounded-xl border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
        tone === 'brand' && !disabled
          ? 'border-brand-600 bg-brand-600 text-white shadow-glow hover:bg-brand-700'
          : tone === 'rose'
            ? 'border-line hover:border-rose-400 hover:bg-rose-50/60'
            : 'border-line hover:border-brand-500 hover:bg-brand-600/5'
      )}
    >
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
          tone === 'brand' && !disabled
            ? 'bg-white/15 text-white'
            : tone === 'rose'
              ? 'bg-rose-100 text-rose-600'
              : 'bg-brand-600/10 text-brand-600'
        )}
      >
        <Icon className={cn('h-[1.125rem] w-[1.125rem]', spin && 'animate-spin')} />
      </span>
      <span className="min-w-0">
        <span className={cn('block text-sm font-semibold', tone === 'brand' && !disabled ? 'text-white' : 'text-ink')}>
          {title}
        </span>
        <span
          className={cn(
            'mt-0.5 block text-xs leading-snug',
            tone === 'brand' && !disabled ? 'text-white/80' : 'text-ink-muted'
          )}
        >
          {text}
        </span>
      </span>
    </button>
  );
}

function CommitList({ commits }: { commits: Commit[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
      {commits.map((c) => (
        <li key={c.hash} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
          <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />
          <span className="min-w-0 flex-1 truncate text-ink">{c.subject}</span>
          <span className="shrink-0 font-mono text-[0.6875rem] text-ink-muted">{c.hash}</span>
          <span className="hidden shrink-0 text-[0.6875rem] text-ink-muted sm:inline">{timeAgo(c.date)}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------

/** The automatic updater's switch. Also used on the dashboard. */
export function AutoToggle({
  initial,
  setAuto,
  compact = false,
}: {
  initial: boolean;
  setAuto: (on: boolean) => Promise<ActionResult>;
  compact?: boolean;
}) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();

  const flip = () => {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const res = await setAuto(next);
      if (!res.ok) setOn(!next);
    });
  };

  return (
    <div className={cn('flex items-center gap-3', !compact && 'rounded-xl border border-line bg-surface-soft p-3.5')}>
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
          on ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-alt text-ink-muted'
        )}
      >
        <Zap className="h-[1.125rem] w-[1.125rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">Update automatically</span>
        <span className="block text-xs text-ink-muted">
          {on
            ? 'Checks every 15 minutes and installs new versions by itself.'
            : 'Off. Updates wait for someone to install them.'}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Update automatically"
        disabled={pending}
        onClick={flip}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60',
          on ? 'bg-emerald-500' : 'bg-line-strong'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            on ? 'left-[1.375rem]' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Dialog({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[70] bg-ink/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-0 z-[71] grid place-items-center p-4"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-alt hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
          {children}
        </div>
      </motion.div>
    </>
  );
}

function UpdateDialog({
  info,
  onCancel,
  onConfirm,
}: {
  info: GitInfo;
  onCancel: () => void;
  onConfirm: (fd: FormData) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="p-6">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600/10 text-brand-600">
          <Download className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-display text-xl font-semibold text-ink">
          Install {info.behind} update{info.behind === 1 ? '' : 's'}?
        </h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          The site keeps running while the new version is prepared, then restarts for a few seconds.
        </p>

        <div className="mt-4 max-h-48 overflow-y-auto">
          <CommitList commits={info.incoming} />
        </div>

        <ul className="mt-4 space-y-1.5 text-xs text-ink-soft">
          {[
            'The database and uploaded files are backed up first.',
            'If anything fails, the code and the database are put back automatically.',
            'You can roll back to this version afterwards.',
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-600" />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end gap-2 border-t border-line bg-surface-soft px-6 py-4">
        <button type="button" onClick={onCancel} className="btn-outline btn-sm">
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onConfirm(new FormData());
          }}
          className="btn-primary btn-sm"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <ArrowUpCircle className="h-4 w-4" />
          )}
          Update now
        </button>
      </div>
    </>
  );
}

function RollbackDialog({
  last,
  current,
  onCancel,
  onConfirm,
}: {
  last: HistoryEntry;
  current: Commit | null;
  onCancel: () => void;
  onConfirm: (fd: FormData) => Promise<void>;
}) {
  const [database, setDatabase] = useState<'keep' | 'restore'>('keep');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);

  const options = [
    {
      key: 'keep' as const,
      icon: Database,
      title: 'Keep the current database',
      text: 'Everything entered since the update stays. Recommended.',
      disabled: false,
      reason: '',
    },
    {
      key: 'restore' as const,
      icon: DatabaseBackup,
      title: 'Restore the database from before the update',
      text: last.finished_at
        ? `Goes back to how it was on ${new Date(last.finished_at).toLocaleString()}. Anything entered since is lost. Uploaded files are not touched.`
        : 'Anything entered since is lost. Uploaded files are not touched.',
      disabled: !last.backupAvailable,
      reason: last.fallback
        ? 'No update is recorded for this version, so there is no backup to match it.'
        : last.backup
          ? 'That backup has since been removed from the server.'
          : 'No backup was recorded for that update.',
    },
  ];

  return (
    <>
      <div className="p-6">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-600">
          <History className="h-6 w-6" />
        </span>
        <h2 className="mt-4 font-display text-xl font-semibold text-ink">
          {last.fallback ? 'Go back to the previous version?' : 'Roll back the last update?'}
        </h2>

        <div className="mt-3 flex items-center gap-2 font-mono text-xs">
          <span className="rounded-md bg-surface-alt px-2 py-1 text-ink-soft">{current?.hash ?? last.to.slice(0, 7)}</span>
          <ArrowRight className="h-3.5 w-3.5 text-ink-muted" />
          <span className="rounded-md bg-rose-100 px-2 py-1 text-rose-700">{last.from.slice(0, 7)}</span>
        </div>

        <p className="mb-2 mt-5 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-muted">
          Database
        </p>
        <div className="space-y-2">
          {options.map((o) => (
            <label
              key={o.key}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3.5 transition',
                o.disabled
                  ? 'cursor-not-allowed border-line bg-surface-alt opacity-60'
                  : database === o.key
                    ? 'cursor-pointer border-brand-600 bg-brand-600/5 ring-1 ring-brand-600'
                    : 'cursor-pointer border-line hover:border-brand-400'
              )}
            >
              <input
                type="radio"
                name="database"
                value={o.key}
                checked={database === o.key}
                disabled={o.disabled}
                onChange={() => setDatabase(o.key)}
                className="sr-only"
              />
              <o.icon className={cn('mt-0.5 h-5 w-5 shrink-0', database === o.key ? 'text-brand-600' : 'text-ink-muted')} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{o.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                  {o.disabled ? (
                    <span className="inline-flex items-center gap-1 text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      {o.reason}
                    </span>
                  ) : (
                    o.text
                  )}
                </span>
              </span>
            </label>
          ))}
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line-strong text-rose-600 focus:ring-rose-600"
          />
          I understand the site goes back to the previous version and restarts. The current
          database is backed up first either way.
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-line bg-surface-soft px-6 py-4">
        <button type="button" onClick={onCancel} className="btn-outline btn-sm">
          Cancel
        </button>
        <button
          type="button"
          disabled={!understood || busy}
          onClick={async () => {
            setBusy(true);
            const fd = new FormData();
            fd.set('database', database);
            await onConfirm(fd);
          }}
          className="btn btn-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <History className="h-4 w-4" />
          )}
          Roll back
        </button>
      </div>
    </>
  );
}

/** A small summary for the dashboard. */
export function UpdateSummary({
  info,
  auto,
  setAuto,
}: {
  info: GitInfo;
  auto: boolean;
  setAuto: (on: boolean) => Promise<ActionResult>;
}) {
  const behind = info.ok ? info.behind : 0;
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-ink">Website updates</h2>
        <Link
          href="/admin/system"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
        >
          Open
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm">
        {behind ? (
          <ArrowUpCircle className="h-4 w-4 shrink-0 text-amber-600" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        )}
        <span className="min-w-0 truncate text-ink-soft">
          {behind
            ? `${behind} update${behind === 1 ? '' : 's'} ready to install`
            : info.current
              ? `Up to date · ${info.current.hash}`
              : 'Version unknown'}
        </span>
      </div>
      <div className="mt-4 border-t border-line pt-4">
        <AutoToggle initial={auto} setAuto={setAuto} compact />
      </div>
    </section>
  );
}
