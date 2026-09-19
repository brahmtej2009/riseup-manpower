'use client';

import { postUpload } from '@/lib/upload-client';
import { useRef, useState } from 'react';
import {
  ImagePlus, Loader2, AlertCircle, ChevronUp, ChevronDown, Eye, EyeOff,
  Trash2, Save, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResultBanner, SubmitButton, ConfirmForm } from '@/components/admin/interactive';
import { ActionForm } from '@/components/admin/BulkForm';
import type { ActionResult } from '@/lib/admin-actions';
import type { GalleryPhoto } from '@/lib/content';

/**
 * Adds photographs to the gallery.
 *
 * Files are uploaded one at a time so a slow connection shows progress rather
 * than appearing to hang, and the whole set is then saved in one go.
 */
export function AddPhotos({
  add,
}: {
  add: (fd: FormData) => Promise<ActionResult>;
}) {
  const [queued, setQueued] = useState<string[]>([]);
  const [busy, setBusy] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ActionResult | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList) => {
    setError('');
    setResult(null);

    for (const file of Array.from(files).slice(0, 40)) {
      setBusy((n) => n + 1);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'gallery');
        fd.append('maxSize', '2200');

        const res = await postUpload(fd);
        const body = await res.json().catch(() => ({}));

        if (!res.ok) setError(body.error || 'That image could not be uploaded.');
        else setQueued((prev) => [...prev, body.url as string]);
      } catch {
        setError('The upload failed. Check your connection and try again.');
      } finally {
        setBusy((n) => n - 1);
      }
    }
  };

  const save = async () => {
    if (!queued.length) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('paths', JSON.stringify(queued));
    const out = await add(fd);
    setResult(out);
    if (out.ok) setQueued([]);
    setSaving(false);
  };

  return (
    <div>
      <ResultBanner result={result} />

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {queued.map((url) => (
          <span
            key={url}
            className="relative block aspect-[4/3] overflow-hidden rounded-xl border border-line"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-lg bg-emerald-600 text-white">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
          </span>
        ))}

        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy > 0}
          className={cn(
            'flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-xl',
            'border border-dashed border-line-strong text-ink-muted transition',
            'hover:border-brand-600 hover:bg-brand-600/[0.06] hover:text-brand-600'
          )}
        >
          {busy > 0 ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs font-medium">Uploading {busy}</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-5 w-5" strokeWidth={1.7} />
              <span className="text-xs font-medium">Choose photographs</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="error-text">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <p className="help">
        Several at once is fine. Each one is resized and optimised automatically.
      </p>

      <button
        type="button"
        onClick={save}
        disabled={!queued.length || saving || busy > 0}
        className="btn-primary mt-4 w-full"
      >
        {saving ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
            Adding…
          </>
        ) : (
          <>
            <ImagePlus className="h-4 w-4" />
            {queued.length
              ? `Add ${queued.length} to the gallery`
              : 'Add to the gallery'}
          </>
        )}
      </button>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) void upload(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/** One photograph in the list, with its title and caption. */
export function PhotoRow({
  photo,
  index,
  total,
  editable,
  canDelete,
  save,
  toggle,
  move,
  remove,
}: {
  photo: GalleryPhoto;
  index: number;
  total: number;
  editable: boolean;
  canDelete: boolean;
  save: (fd: FormData) => Promise<ActionResult>;
  toggle: (fd: FormData) => Promise<ActionResult>;
  move: (fd: FormData) => Promise<ActionResult>;
  remove: (fd: FormData) => Promise<void>;
}) {
  return (
    <li className="flex flex-col gap-4 p-5 sm:flex-row">
      <span className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl border border-line sm:w-40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.path}
          alt={photo.title || ''}
          className={cn('h-full w-full object-cover', !photo.is_visible && 'opacity-40 grayscale')}
        />
        <span className="absolute left-1.5 top-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[0.625rem] font-bold text-white">
          {index + 1}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <ActionForm action={save} hidden={{ id: photo.id }} className="space-y-3">
          <fieldset disabled={!editable} className="space-y-3">
            <div>
              <label className="label text-xs" htmlFor={`g-title-${photo.id}`}>
                Title
              </label>
              <input
                id={`g-title-${photo.id}`}
                name="title"
                defaultValue={photo.title}
                maxLength={140}
                placeholder="Optional. Shown over the photograph."
                className="field h-10 min-h-0 text-sm"
              />
            </div>

            <div>
              <label className="label text-xs" htmlFor={`g-caption-${photo.id}`}>
                Caption
              </label>
              <textarea
                id={`g-caption-${photo.id}`}
                name="caption"
                defaultValue={photo.caption}
                rows={2}
                maxLength={400}
                placeholder="Optional. Shown when the photograph is opened full size."
                className="field text-sm"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="is_visible"
                defaultChecked={photo.is_visible === 1}
                className="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-brand-600"
              />
              Show on the website
            </label>
          </fieldset>

          {editable && (
            <div className="flex flex-wrap items-center gap-2">
              <SubmitButton className="btn-primary btn-sm" icon={<Save className="h-3.5 w-3.5" />}>
                Save
              </SubmitButton>
            </div>
          )}
        </ActionForm>
      </div>

      {editable && (
        <div className="flex shrink-0 flex-row gap-1.5 sm:flex-col">
          <MiniForm action={move} hidden={{ id: photo.id, direction: 'up' }} disabled={index === 0} label="Move up">
            <ChevronUp className="h-4 w-4" />
          </MiniForm>
          <MiniForm
            action={move}
            hidden={{ id: photo.id, direction: 'down' }}
            disabled={index === total - 1}
            label="Move down"
          >
            <ChevronDown className="h-4 w-4" />
          </MiniForm>
          <MiniForm
            action={toggle}
            hidden={{ id: photo.id }}
            label={photo.is_visible ? 'Hide from the website' : 'Show on the website'}
          >
            {photo.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </MiniForm>

          {canDelete && (
            <ConfirmForm
              action={remove}
              hidden={{ id: photo.id }}
              title="Remove this photograph?"
              message="It is taken off the website straight away. The file itself stays in the media library unless you delete it there."
              confirmLabel="Remove"
              trigger={
                <button
                  type="button"
                  title="Remove from the gallery"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-line text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
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

/** A one-button form, used for the reorder and visibility controls. */
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
