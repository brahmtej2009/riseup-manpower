'use client';

import { useState } from 'react';
import { Plus, Save, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionForm } from '@/components/admin/BulkForm';
import { SubmitButton, ConfirmForm } from '@/components/admin/interactive';
import { ImagePicker } from '@/components/admin/ImagePicker';
import type { ActionResult } from '@/lib/admin-actions';
import type { ClientLogo } from '@/lib/content';

/** The form used both to add a logo and to edit one already in the row. */
export function LogoForm({
  logo,
  save,
  onDone,
}: {
  logo?: ClientLogo;
  save: (fd: FormData) => Promise<ActionResult>;
  onDone?: () => void;
}) {
  // Held in state so the Save button can be disabled until an image is chosen.
  const [path, setPath] = useState(logo?.path ?? '');

  return (
    <ActionForm
      action={async (fd) => {
        const result = await save(fd);
        if (result.ok && !logo) setPath('');
        if (result.ok) onDone?.();
        return result;
      }}
      hidden={logo ? { id: logo.id } : {}}
      className="space-y-4"
    >
      <div>
        <ImagePicker
          name="path"
          value={path}
          onChange={setPath}
          label="Logo image"
          hint="A PNG with a transparent background works best. It is scaled to the row height automatically, whatever shape it is."
          folder="logos"
          aspect="wide"
          maxSize={600}
        />
      </div>

      <div>
        <label className="label" htmlFor={`l-name-${logo?.id ?? 'new'}`}>
          Company name
        </label>
        <input
          id={`l-name-${logo?.id ?? 'new'}`}
          name="name"
          required
          maxLength={120}
          defaultValue={logo?.name ?? ''}
          className="field"
          placeholder="The name on the logo"
        />
        <p className="help">Read out in place of the logo by a screen reader.</p>
      </div>

      <div>
        <label className="label" htmlFor={`l-url-${logo?.id ?? 'new'}`}>
          Website address
        </label>
        <input
          id={`l-url-${logo?.id ?? 'new'}`}
          name="url"
          type="url"
          maxLength={300}
          defaultValue={logo?.url ?? ''}
          className="field"
          placeholder="https://example.com"
        />
        <p className="help">Optional. Leave it blank and the logo is not a link.</p>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          name="is_visible"
          defaultChecked={logo ? logo.is_visible === 1 : true}
          className="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-brand-600"
        />
        Show in the row
      </label>

      <SubmitButton
        className="btn-primary w-full"
        disabled={!path}
        icon={logo ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        pendingLabel={logo ? 'Saving…' : 'Adding…'}
      >
        {logo ? 'Save this logo' : 'Add the logo'}
      </SubmitButton>
    </ActionForm>
  );
}

/** One logo in the list. Editing opens in place rather than in a dialog. */
export function LogoRow({
  logo,
  index,
  total,
  editable,
  height,
  save,
  toggle,
  move,
  remove,
}: {
  logo: ClientLogo;
  index: number;
  total: number;
  editable: boolean;
  height: number;
  save: (fd: FormData) => Promise<ActionResult>;
  toggle: (fd: FormData) => Promise<ActionResult>;
  move: (fd: FormData) => Promise<ActionResult>;
  remove: (fd: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Shown at exactly the size it will have on the website - no frame
            around it, so a transparent logo floats free here just as it will
            in the moving row rather than sitting inside a boxed swatch. */}
        <span
          className="flex w-40 shrink-0 items-center justify-center px-3 py-3"
          style={{ minHeight: `${height + 24}px` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo.path}
            alt={logo.name}
            style={{ height: `${height}px` }}
            className={cn('w-auto max-w-full object-contain', !logo.is_visible && 'opacity-30 grayscale')}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{logo.name}</span>
          {logo.url ? (
            <a
              href={logo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
            >
              {logo.url.replace(/^https?:\/\//, '').slice(0, 44)}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="mt-0.5 block text-xs text-ink-muted">Not a link</span>
          )}
          {!logo.is_visible && (
            <span className="mt-1 inline-block text-xs font-medium text-amber-700">
              Hidden from the row
            </span>
          )}
        </span>

        {editable && (
          <span className="flex shrink-0 items-center gap-1.5">
            <MiniForm
              action={move}
              hidden={{ id: logo.id, direction: 'up' }}
              disabled={index === 0}
              label="Move earlier"
            >
              <ChevronUp className="h-4 w-4" />
            </MiniForm>
            <MiniForm
              action={move}
              hidden={{ id: logo.id, direction: 'down' }}
              disabled={index === total - 1}
              label="Move later"
            >
              <ChevronDown className="h-4 w-4" />
            </MiniForm>
            <MiniForm
              action={toggle}
              hidden={{ id: logo.id }}
              label={logo.is_visible ? 'Hide from the row' : 'Show in the row'}
            >
              {logo.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </MiniForm>

            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="btn-outline btn-sm"
              aria-expanded={editing}
            >
              {editing ? 'Close' : 'Edit'}
            </button>

            <ConfirmForm
              action={remove}
              hidden={{ id: logo.id }}
              title={`Remove ${logo.name}?`}
              message="The logo is taken out of the row straight away. The image file stays in the media library."
              confirmLabel="Remove"
              trigger={
                <button
                  type="button"
                  title="Remove this logo"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-line text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              }
            />
          </span>
        )}
      </div>

      {editing && editable && (
        <div className="mt-4 rounded-xl border border-line bg-surface-soft p-4">
          <LogoForm logo={logo} save={save} onDone={() => setEditing(false)} />
        </div>
      )}
    </li>
  );
}

function MiniForm({
  action,
  hidden,
  children,
  label,
  disabled,
}: {
  action: (fd: FormData) => Promise<ActionResult>;
  hidden: Record<string, string | number>;
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <form
      action={async (fd) => {
        await action(fd);
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={String(v)} />
      ))}
      <button
        type="submit"
        disabled={disabled}
        title={label}
        aria-label={label}
        className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-soft transition hover:border-brand-600 hover:text-brand-600 disabled:opacity-30"
      >
        {children}
      </button>
    </form>
  );
}
