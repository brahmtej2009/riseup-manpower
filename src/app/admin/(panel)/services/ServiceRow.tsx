'use client';

import { useState } from 'react';
import { Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Save, Pencil, X, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionForm, ConfirmForm } from '@/components/admin/BulkForm';
import { SubmitButton } from '@/components/admin/interactive';
import { SERVICE_ICONS } from '@/components/cards';
import type { Service } from '@/lib/content';
import type { ActionResult } from '@/lib/admin-actions';

/** One service in the admin list; expands into an edit form in place. */
export function ServiceRow({
  service,
  index,
  total,
  editable,
  canDelete,
  icons,
  save,
  remove,
  toggle,
  move,
}: {
  service: Service;
  index: number;
  total: number;
  editable: boolean;
  canDelete: boolean;
  icons: string[];
  save: (fd: FormData) => Promise<ActionResult>;
  remove: (fd: FormData) => Promise<ActionResult>;
  toggle: (fd: FormData) => Promise<ActionResult>;
  move: (fd: FormData) => Promise<ActionResult>;
}) {
  const [editing, setEditing] = useState(false);
  const Icon = SERVICE_ICONS[service.icon] ?? Briefcase;

  if (editing) {
    return (
      <li className="bg-slate-50/70 p-5">
        <ActionForm action={save} hidden={{ id: service.id }} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Title</label>
              <input name="title" defaultValue={service.title} required className="field" />
            </div>
            <div>
              <label className="label">Icon</label>
              <select name="icon" defaultValue={service.icon} className="field">
                {icons.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Short summary</label>
            <textarea
              name="summary"
              defaultValue={service.summary}
              rows={2}
              maxLength={300}
              className="field text-sm"
            />
          </div>

          <div>
            <label className="label">Full description</label>
            <textarea
              name="description"
              defaultValue={service.description}
              rows={3}
              maxLength={2000}
              className="field text-sm"
            />
          </div>

          <div>
            <label className="label">Key points</label>
            <textarea
              name="points"
              defaultValue={service.points.join('\n')}
              rows={4}
              className="field text-sm"
            />
            <p className="help">One per line.</p>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="is_visible"
              defaultChecked={service.is_visible === 1}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            />
            Show on the website
          </label>

          <div className="flex gap-2">
            <SubmitButton className="btn-primary btn-sm" icon={<Save className="h-4 w-4" />}>
              Save changes
            </SubmitButton>
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost btn-sm">
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </ActionForm>
      </li>
    );
  }

  return (
    <li className={cn('flex items-start gap-4 p-4', service.is_visible === 0 && 'opacity-55')}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600/10 text-brand-700">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
          {service.title}
          {service.is_visible === 0 && (
            <span className="chip bg-slate-100 text-ink-muted ring-slate-200">Hidden</span>
          )}
        </p>
        {service.summary && (
          <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{service.summary}</p>
        )}
        {service.points.length > 0 && (
          <p className="mt-1 text-xs text-ink-muted">
            {service.points.length} key point{service.points.length === 1 ? '' : 's'} · anchor: #{service.slug}
          </p>
        )}
      </div>

      {editable && (
        <div className="flex shrink-0 items-center gap-1">
          <ActionForm action={move} hidden={{ id: service.id, direction: 'up' }}>
            <SubmitButton
              pendingLabel=""
              title="Move up"
              disabled={index === 0}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink disabled:opacity-25"
            >
              <ChevronUp className="h-4 w-4" />
            </SubmitButton>
          </ActionForm>

          <ActionForm action={move} hidden={{ id: service.id, direction: 'down' }}>
            <SubmitButton
              pendingLabel=""
              title="Move down"
              disabled={index === total - 1}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink disabled:opacity-25"
            >
              <ChevronDown className="h-4 w-4" />
            </SubmitButton>
          </ActionForm>

          <ActionForm action={toggle} hidden={{ id: service.id }}>
            <SubmitButton
              pendingLabel=""
              title={service.is_visible ? 'Hide from the website' : 'Show on the website'}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
            >
              {service.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </SubmitButton>
          </ActionForm>

          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Edit"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
          >
            <Pencil className="h-4 w-4" />
          </button>

          {canDelete && (
            <ConfirmForm
              action={async (fd) => {
                await remove(fd);
              }}
              hidden={{ id: service.id }}
              title={`Remove "${service.title}"?`}
              message="The service is removed from the website permanently."
              confirmLabel="Remove"
              trigger={
                <button
                  type="button"
                  title="Remove"
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              }
            />
          )}
        </div>
      )}
    </li>
  );
}
