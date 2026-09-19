'use client';

import { postUpload } from '@/lib/upload-client';
import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Upload-and-preview control. Writes the resulting URL into a hidden input so
 * it posts with the surrounding form like any other field.
 */
export function ImagePicker({
  name,
  value,
  label,
  hint,
  folder = 'general',
  square = false,
  maxSize = 1200,
  aspect = 'square',
  onChange,
}: {
  name: string;
  value: string;
  label?: string;
  hint?: string;
  folder?: string;
  square?: boolean;
  maxSize?: number;
  aspect?: 'square' | 'wide';
  onChange?: (url: string) => void;
}) {
  const [url, setUrl] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const update = (next: string) => {
    setUrl(next);
    onChange?.(next);
  };

  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      fd.append('maxSize', String(maxSize));
      if (square) fd.append('square', '1');

      const res = await postUpload(fd);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'That image could not be uploaded.');
        return;
      }
      update(body.url);
    } catch {
      setError('The upload failed. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {label && <span className="label">{label}</span>}
      <input type="hidden" name={name} value={url} />

      <div
        className={cn(
          'relative overflow-hidden rounded-xl border',
          url ? 'border-slate-200' : 'border-dashed border-slate-300',
          aspect === 'square' ? 'aspect-square w-32' : 'aspect-[16/9] w-full max-w-sm'
        )}
      >
        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => update('')}
              className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-rose-600 shadow-card transition hover:bg-white"
              aria-label="Remove the image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-ink-muted transition hover:bg-brand-50/40 hover:text-brand-700"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5" strokeWidth={1.7} />
                <span className="text-xs font-medium">Upload</span>
              </>
            )}
          </button>
        )}
      </div>

      {url && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="mt-1.5 text-xs font-medium text-brand-700 hover:underline"
        >
          Replace the image
        </button>
      )}

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
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
