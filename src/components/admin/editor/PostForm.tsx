'use client';

import { postUpload } from '@/lib/upload-client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Save, Send, Eye, EyeOff, ImagePlus, X, Loader2, Check, AlertCircle, Pin,
  AlertTriangle, ArrowLeft, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichEditor } from './RichEditor';
import type { ActionResult } from '@/lib/admin-actions';

export interface PostDraft {
  id?: number;
  title: string;
  excerpt: string;
  body_html: string;
  cover_path: string;
  category: string;
  tags: string;
  status: 'draft' | 'published';
  pinned: boolean;
  urgent: boolean;
  published_at: string;
  slug?: string;
}

const CATEGORIES = ['General', 'Recruitment', 'Notice', 'Company Update', 'Compliance', 'Guidance', 'Event'];

export function PostForm({
  initial,
  canPublish,
  save,
}: {
  initial: PostDraft;
  canPublish: boolean;
  save: (formData: FormData) => Promise<ActionResult<{ id: number }>>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<PostDraft>(initial);
  const [result, setResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const idRef = useRef<number | undefined>(initial.id);

  const set = <K extends keyof PostDraft>(key: K, value: PostDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  const buildFormData = (status?: 'draft' | 'published') => {
    const fd = new FormData();
    if (idRef.current) fd.set('id', String(idRef.current));
    fd.set('title', draft.title);
    fd.set('excerpt', draft.excerpt);
    fd.set('body_html', draft.body_html);
    fd.set('cover_path', draft.cover_path);
    fd.set('category', draft.category);
    fd.set('tags', draft.tags);
    fd.set('status', status ?? draft.status);
    fd.set('published_at', draft.published_at);
    if (draft.pinned) fd.set('pinned', 'on');
    if (draft.urgent) fd.set('urgent', 'on');
    return fd;
  };

  const submit = (status?: 'draft' | 'published', silent = false) => {
    if (!draft.title.trim()) {
      setResult({ ok: false, error: 'Give the post a title before saving.' });
      return;
    }

    startTransition(async () => {
      const res = await save(buildFormData(status));

      if (res.ok) {
        setDirty(false);
        setSavedAt(new Date());
        if (!silent) setResult({ ok: true, message: res.message });
        if (status) setDraft((d) => ({ ...d, status }));

        // A brand new post becomes an edit once it has an id.
        if ('data' in res && res.data?.id && !idRef.current) {
          idRef.current = res.data.id;
          router.replace(`/admin/posts/${res.data.id}`);
        }
      } else {
        setResult({ ok: false, error: res.error });
      }
    });
  };

  /**
   * Auto-save, so nothing is lost if the browser closes.
   * Only once the post exists, otherwise typing a title would create
   * a string of half-finished drafts.
   */
  useEffect(() => {
    if (!dirty || !idRef.current || pending) return;
    const t = setTimeout(() => submit(undefined, true), 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, dirty]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const uploadCover = async (file: File) => {
    setUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'covers');
      fd.append('maxSize', '1600');
      const res = await postUpload(fd);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ ok: false, error: body.error || 'The cover image could not be uploaded.' });
        return;
      }
      set('cover_path', body.url);
    } finally {
      setUploadingCover(false);
    }
  };

  return (
    <>
      {/* Sticky action bar */}
      <div className="sticky top-16 z-20 -mx-4 mb-5 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/posts"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Posts
          </Link>

          <span className="flex items-center gap-2 text-xs text-ink-muted">
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : dirty ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </>
            ) : savedAt ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                Saved at {savedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
              </>
            ) : null}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              className="btn-ghost btn-sm"
            >
              {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {preview ? 'Back to editing' : 'Preview'}
            </button>

            <button
              type="button"
              onClick={() => submit('draft')}
              disabled={pending}
              className="btn-outline btn-sm"
            >
              <Save className="h-4 w-4" />
              Save draft
            </button>

            {canPublish && (
              <button
                type="button"
                onClick={() => submit('published')}
                disabled={pending}
                className="btn-primary btn-sm"
              >
                <Send className="h-4 w-4" />
                {draft.status === 'published' ? 'Update the live page' : 'Publish'}
              </button>
            )}
          </div>
        </div>
      </div>

      {result && (
        <div
          role="alert"
          className={cn(
            'mb-5 flex items-start gap-2.5 rounded-xl border p-3.5 text-sm',
            result.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          )}
        >
          {result.ok ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{result.ok ? result.message : result.error}</span>
          <button type="button" onClick={() => setResult(null)} aria-label="Dismiss">
            <X className="h-4 w-4 opacity-50" />
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <div className="card p-5">
            <label className="label" htmlFor="a-title">
              Title
            </label>
            <input
              id="a-title"
              value={draft.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Walk-in interview for 120 production operators"
              className="field font-display text-lg font-semibold"
              maxLength={200}
            />

            <label className="label mt-4" htmlFor="a-excerpt">
              Short summary
            </label>
            <textarea
              id="a-excerpt"
              value={draft.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="One or two lines, shown on the cards and in search results. Left blank, it is taken from the start of the post."
              className="field text-sm"
            />
          </div>

          {preview ? (
            <div className="card p-6 sm:p-8">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-ink-muted">
                This is how it will look on the website
              </p>
              <h1 className="font-display text-3xl font-bold leading-tight text-ink">
                {draft.title || 'Untitled post'}
              </h1>
              {draft.excerpt && (
                <p className="mt-4 border-l-4 border-brand-600 pl-4 text-lg font-medium text-ink">
                  {draft.excerpt}
                </p>
              )}
              {draft.cover_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.cover_path}
                  alt=""
                  className="mt-6 w-full rounded-xl border border-slate-200"
                />
              )}
              <div
                className="prose-ru mt-6"
                dangerouslySetInnerHTML={{ __html: draft.body_html || '<p>Nothing written yet.</p>' }}
              />
            </div>
          ) : (
            <RichEditor value={draft.body_html} onChange={(html) => set('body_html', html)} />
          )}
        </div>

        {/* Settings sidebar */}
        <aside className="space-y-5 lg:col-span-4">
          <div className="card p-5">
            <h2 className="mb-4 font-display text-[0.9375rem] font-semibold">Cover image</h2>

            {draft.cover_path ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.cover_path}
                  alt=""
                  className="aspect-[16/9] w-full rounded-xl border border-slate-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => set('cover_path', '')}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-rose-600 shadow-card transition hover:bg-white"
                  aria-label="Remove the cover image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                disabled={uploadingCover}
                className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-ink-muted transition hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700"
              >
                {uploadingCover ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-6 w-6" strokeWidth={1.6} />
                    <span className="text-sm font-medium">Choose a cover image</span>
                    <span className="text-xs">Best at 1200 × 630</span>
                  </>
                )}
              </button>
            )}

            <p className="help">
              If you do not pick one, the first image inside the post is used.
            </p>

            <input
              ref={coverInput}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadCover(f);
                e.target.value = '';
              }}
            />
          </div>

          <div className="card space-y-4 p-5">
            <h2 className="font-display text-[0.9375rem] font-semibold">Publishing</h2>

            <div>
              <label className="label" htmlFor="a-category">Category</label>
              <select
                id="a-category"
                value={draft.category}
                onChange={(e) => set('category', e.target.value)}
                className="field"
              >
                {[...new Set([draft.category, ...CATEGORIES])].filter(Boolean).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="a-tags">Tags</label>
              <input
                id="a-tags"
                value={draft.tags}
                onChange={(e) => set('tags', e.target.value)}
                placeholder="walk-in, pune, factory"
                className="field"
              />
              <p className="help">Separate with commas.</p>
            </div>

            {canPublish && (
              <div>
                <label className="label" htmlFor="a-date">
                  <Clock className="mr-1 inline h-3.5 w-3.5" />
                  Publish date
                </label>
                <input
                  id="a-date"
                  type="datetime-local"
                  value={draft.published_at}
                  onChange={(e) => set('published_at', e.target.value)}
                  className="field"
                />
                <p className="help">
                  Leave blank to publish immediately. A future date holds it back until then.
                </p>
              </div>
            )}

            <div className="space-y-2 border-t border-slate-100 pt-4">
              <Toggle
                checked={draft.pinned}
                onChange={(v) => set('pinned', v)}
                icon={Pin}
                label="Pin to the top"
                hint="Keeps it above every other post."
              />
              <Toggle
                checked={draft.urgent}
                onChange={(v) => set('urgent', v)}
                icon={AlertTriangle}
                label="Mark as urgent"
                hint="Shows a red badge on the card and the page."
                tone="rose"
              />
            </div>
          </div>

          {draft.status === 'published' && draft.slug && (
            <a
              href={`/posts/${draft.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline btn-sm w-full"
            >
              <Eye className="h-4 w-4" />
              View it on the website
            </a>
          )}
        </aside>
      </div>
    </>
  );
}

function Toggle({
  checked,
  onChange,
  icon: Icon,
  label,
  hint,
  tone = 'brand',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ElementType;
  label: string;
  hint: string;
  tone?: 'brand' | 'rose';
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition',
        checked
          ? tone === 'rose'
            ? 'border-rose-300 bg-rose-50'
            : 'border-brand-300 bg-brand-50/70'
          : 'border-slate-200 hover:bg-slate-50'
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition',
          checked
            ? tone === 'rose'
              ? 'border-rose-600 bg-rose-600 text-white'
              : 'border-brand-600 bg-brand-600 text-white'
            : 'border-slate-300 bg-white'
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3.5} />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span>
      </span>
    </label>
  );
}
