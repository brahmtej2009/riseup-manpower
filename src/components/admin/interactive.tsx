'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, X, AlertCircle, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Submit button that shows a spinner while its form is running. */
export function SubmitButton({
  children,
  className = 'btn-primary',
  pendingLabel = 'Saving…',
  icon,
  disabled,
  name,
  value,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  /**
   * An already-rendered element, not a component. A server component cannot
   * hand a component across to a client component, so callers pass
   * `icon={<Save className="h-4 w-4" />}`.
   */
  icon?: React.ReactNode;
  disabled?: boolean;
  name?: string;
  value?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      title={title}
      disabled={pending || disabled}
      className={className}
    >
      {pending ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
          {pendingLabel}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}

/**
 * A form that asks for confirmation before it runs.
 * Used for anything that deletes or cannot easily be undone.
 */
export function ConfirmForm({
  action,
  title,
  message,
  confirmLabel = 'Delete',
  confirmWord,
  trigger,
  tone = 'danger',
  hidden = {},
}: {
  action: (formData: FormData) => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  /** If set, the exact word must be typed before the button becomes active. */
  confirmWord?: string;
  trigger: React.ReactNode;
  tone?: 'danger' | 'warning';
  hidden?: Record<string, string | number>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) setTyped('');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const ready = !confirmWord || typed.trim().toUpperCase() === confirmWord.toUpperCase();

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[70] bg-ink/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed inset-0 z-[71] grid place-items-center p-4"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.target === e.currentTarget && setOpen(false)}
            >
              <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-lift">
                <div className="flex items-start gap-4 p-6">
                  <span
                    className={cn(
                      'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
                      tone === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{message}</p>

                    {confirmWord && (
                      <div className="mt-4">
                        <label className="label text-xs">
                          Type <span className="font-bold text-ink">{confirmWord}</span> to confirm
                        </label>
                        <input
                          type="text"
                          value={typed}
                          onChange={(e) => setTyped(e.target.value)}
                          className="field h-10 min-h-0 text-sm"
                          autoComplete="off"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
                  <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm">
                    Cancel
                  </button>
                  <form ref={formRef} action={action}>
                    {Object.entries(hidden).map(([k, v]) => (
                      <input key={k} type="hidden" name={k} value={String(v)} />
                    ))}
                    <SubmitButton
                      className={cn(
                        'btn btn-sm text-white',
                        tone === 'danger'
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-amber-600 hover:bg-amber-700'
                      )}
                      pendingLabel="Working…"
                      disabled={!ready}
                    >
                      {confirmLabel}
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/** Inline feedback shown after a server action returns. */
export function ResultBanner({
  result,
  className,
}: {
  result?: { ok?: boolean; message?: string; error?: string } | null;
  className?: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    if (result?.ok && result?.message) {
      const t = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(t);
    }
  }, [result]);

  if (!result || !visible) return null;
  if (!result.error && !result.message) return null;

  const ok = result.ok;
  const Icon = ok ? Check : AlertCircle;

  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'mb-5 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm',
        ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800',
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="flex-1">{ok ? result.message : result.error}</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="shrink-0 opacity-50 transition hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-ink-soft">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
      <span>{children}</span>
    </div>
  );
}

/** Select-all / row tick-boxes for bulk actions. */
export function BulkSelect({ name, value }: { name: string; value: number | string }) {
  return (
    <input
      type="checkbox"
      name={name}
      value={String(value)}
      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
      aria-label="Select row"
    />
  );
}

export function SelectAll({ target }: { target: string }) {
  return (
    <input
      type="checkbox"
      onChange={(e) => {
        const form = (e.target as HTMLInputElement).form;
        if (!form) return;
        form
          .querySelectorAll<HTMLInputElement>(`input[name="${target}"]`)
          .forEach((box) => (box.checked = e.target.checked));
      }}
      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
      aria-label="Select all"
    />
  );
}
