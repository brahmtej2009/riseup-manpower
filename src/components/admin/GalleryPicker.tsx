'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A list of images, in order, stored as a JSON array in one setting.
 *
 * Used for the photographs that fade behind the hero. Order matters, so the
 * arrows move an image earlier or later in the rotation.
 */
export function GalleryPicker({
  name,
  value,
  label,
  hint,
  folder = 'hero',
  max = 8,
}: {
  name: string;
  value: string[];
  label?: string;
  hint?: string;
  folder?: string;
  max?: number;
}) {
  const [images, setImages] = useState<string[]>(value);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList) => {
    setError('');
    const room = max - images.length;
    if (room <= 0) {
      setError(`That is the maximum of ${max} photographs.`);
      return;
    }

    for (const file of Array.from(files).slice(0, room)) {
      setBusy((n) => n + 1);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder);
        fd.append('maxSize', '2200');

        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(body.error || 'That image could not be uploaded.');
        } else {
          setImages((prev) => [...prev, body.url as string]);
        }
      } catch {
        setError('The upload failed. Check your connection and try again.');
      } finally {
        setBusy((n) => n - 1);
      }
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  };

  return (
    <div>
      {label && <span className="label">{label}</span>}

      {/* The whole list posts as one JSON value, like any other setting. */}
      <input type="hidden" name={name} value={JSON.stringify(images)} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="group relative aspect-[16/10] overflow-hidden rounded-xl border border-slate-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />

            <span className="absolute left-1.5 top-1.5 rounded bg-navy-900/80 px-1.5 py-0.5 text-[0.625rem] font-bold text-white">
              {i + 1}
            </span>

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-navy-950/90 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label="Move earlier"
                  className="grid h-7 w-7 place-items-center rounded bg-white/90 text-ink disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === images.length - 1}
                  aria-label="Move later"
                  className="grid h-7 w-7 place-items-center rounded bg-white/90 text-ink disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </span>

              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, x) => x !== i))}
                aria-label="Remove this photograph"
                className="grid h-7 w-7 place-items-center rounded bg-white/90 text-rose-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {images.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy > 0}
            className={cn(
              'flex aspect-[16/10] flex-col items-center justify-center gap-1.5 rounded-xl',
              'border border-dashed border-slate-300 text-ink-muted transition',
              'hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700'
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
                <span className="text-xs font-medium">Add photographs</span>
              </>
            )}
          </button>
        )}
      </div>

      {hint && !error && <p className="help">{hint}</p>}
      {error && (
        <p className="error-text">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

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
