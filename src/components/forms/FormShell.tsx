'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Send, AlertCircle, Copy, Home } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Step indicator, navigation and the success screen, shared by both forms. */

export interface Step {
  id: string;
  title: string;
  description?: string;
}

export function StepProgress({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <div className="mb-8">
      {/* Compact bar on phones. */}
      <div className="sm:hidden">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-semibold text-ink">{steps[current].title}</p>
          <p className="text-xs text-ink-muted">
            Step {current + 1} of {steps.length}
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
          <motion.div
            className="h-full rounded-full bg-brand-600"
            initial={false}
            animate={{ width: `${((current + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* Full stepper from tablet up. */}
      <ol className="hidden sm:flex sm:items-center sm:justify-center">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={step.id} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.8125rem] font-semibold transition-all duration-300',
                    done && 'bg-brand-600 text-white',
                    active && 'bg-brand-600 text-white ring-4 ring-brand-600/15',
                    !done && !active && 'bg-surface-alt text-ink-muted'
                  )}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </span>
                <span
                  className={cn(
                    'hidden text-sm font-medium transition-colors lg:block',
                    active ? 'text-ink' : 'text-ink-muted'
                  )}
                >
                  {step.title}
                </span>
              </div>
              {i < steps.length - 1 && (
                <span className="mx-3 h-px flex-1 bg-surface-alt">
                  <motion.span
                    className="block h-px bg-brand-600"
                    initial={false}
                    animate={{ width: done ? '100%' : '0%' }}
                    transition={{ duration: 0.35 }}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function StepPanel({
  children,
  stepKey,
  direction,
}: {
  children: ReactNode;
  stepKey: string;
  direction: number;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? 28 : -28 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? -28 : 28 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function FormNav({
  current,
  total,
  onBack,
  onNext,
  submitting,
  submitLabel = 'Submit',
}: {
  current: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  submitting: boolean;
  submitLabel?: string;
}) {
  const isLast = current === total - 1;
  return (
    <div className="mt-9 flex items-center justify-between gap-3 border-t border-line pt-6">
      <button
        type="button"
        onClick={onBack}
        disabled={current === 0 || submitting}
        className="btn-ghost"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      <button type="button" onClick={onNext} disabled={submitting} className="btn-primary">
        {submitting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Sending…
          </>
        ) : isLast ? (
          <>
            <Send className="h-4 w-4" />
            {submitLabel}
          </>
        ) : (
          <>
            Continue
            <ChevronRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
    >
      <AlertCircle className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function SuccessScreen({
  reference,
  message,
  type,
}: {
  reference: string;
  message: string;
  type: 'employer' | 'candidate';
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked - the number is on screen anyway */
    }
  };

  return (
    <motion.div
      className="card mx-auto max-w-lg p-8 text-center sm:p-10"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.span
        className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 320, damping: 18 }}
      >
        <Check className="h-8 w-8" strokeWidth={3} />
      </motion.span>

      <h2 className="font-display text-2xl font-bold text-ink">Details received</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">{message}</p>

      <div className="mt-7 rounded-xl border border-line bg-surface-soft p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Your reference number
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <p className="font-display text-xl font-bold tracking-wide text-brand-700">{reference}</p>
          <button
            type="button"
            onClick={copy}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-surface hover:text-ink"
            aria-label="Copy reference number"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Please quote this number when you call or write to us.
        </p>
      </div>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary btn-sm">
          <Home className="h-4 w-4" />
          Back to home
        </Link>
        <Link href="/posts" className="btn-outline btn-sm">
          See posts
        </Link>
      </div>

      <p className="mt-6 text-xs text-ink-muted">
        {type === 'candidate'
          ? 'We never charge candidates a registration or placement fee.'
          : 'A member of our team will call you to confirm the requirement.'}
      </p>
    </motion.div>
  );
}
