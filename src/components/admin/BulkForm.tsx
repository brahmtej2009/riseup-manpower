'use client';

import { useActionState } from 'react';
import { Check, X, Trash2 } from 'lucide-react';
import type { ActionResult } from '@/lib/admin-actions';
import { ResultBanner, SubmitButton, ConfirmForm } from './interactive';

/**
 * Wraps a list in a form so rows can be ticked and acted on together.
 * The buttons only appear once something is selected - enforced by CSS on the
 * :has() selector, so no extra state is needed.
 */
export function BulkForm({
  action,
  children,
  canApprove,
  canReject,
  canDelete,
  labels = { approve: 'Approve selected', reject: 'Reject selected', delete: 'Delete selected' },
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  canApprove?: boolean;
  canReject?: boolean;
  canDelete?: boolean;
  labels?: { approve: string; reject: string; delete: string };
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    async (_prev, fd) => action(fd),
    null
  );

  return (
    <>
      <ResultBanner result={state} />

      <form action={formAction} id="bulk-form">
        {children}

        {(canApprove || canReject || canDelete) && (
          <div
            className="sticky bottom-4 z-20 mx-5 mb-5 hidden items-center gap-2 rounded-2xl border
                       border-slate-200 bg-white/95 p-3 shadow-lift backdrop-blur
                       [form:has(input[name='ids']:checked)_&]:flex"
          >
            <p className="ml-1.5 flex-1 text-sm font-medium text-ink">Apply to the selected rows</p>

            {canApprove && (
              <SubmitButton
                name="operation"
                value="approve"
                className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700"
                pendingLabel="Approving…"
                icon={<Check className="h-4 w-4" />}
              >
                {labels.approve}
              </SubmitButton>
            )}

            {canReject && (
              <SubmitButton
                name="operation"
                value="reject"
                className="btn-outline btn-sm"
                pendingLabel="Working…"
                icon={<X className="h-4 w-4" />}
              >
                {labels.reject}
              </SubmitButton>
            )}

            {canDelete && (
              <button
                type="submit"
                name="operation"
                value="delete"
                onClick={(e) => {
                  if (!confirm('Delete the selected rows permanently? This cannot be undone.')) {
                    e.preventDefault();
                  }
                }}
                className="btn btn-sm bg-rose-600 text-white hover:bg-rose-700"
              >
                <Trash2 className="h-4 w-4" />
                {labels.delete}
              </button>
            )}
          </div>
        )}
      </form>
    </>
  );
}

/** A single-action form with a result banner, for the detail screens. */
export function ActionForm({
  action,
  children,
  className,
  hidden = {},
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  hidden?: Record<string, string | number>;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    async (_prev, fd) => action(fd),
    null
  );

  return (
    <>
      <ResultBanner result={state} />
      <form action={formAction} className={className}>
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={String(v)} />
        ))}
        {children}
      </form>
    </>
  );
}

export { ConfirmForm };
