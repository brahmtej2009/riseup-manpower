'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Monitor, Tablet, Smartphone, Sun, Moon, MousePointerClick, RotateCw,
  ExternalLink, X, Save, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResultBanner } from '@/components/admin/interactive';
import { PREVIEW_FIELDS } from '@/lib/theme-groups';
import type { ActionResult } from '@/lib/admin-actions';

type Device = 'desktop' | 'tablet' | 'phone';

const WIDTHS: Record<Device, number | null> = { desktop: null, tablet: 820, phone: 390 };

/** Styles injected into the preview while text picking is switched on. */
const EDIT_CSS = `
  [data-field]{
    outline:2px dashed rgb(24 119 217 / .55);
    outline-offset:3px;
    cursor:pointer;
    border-radius:4px;
    transition:outline-color .15s, background-color .15s;
  }
  [data-field]:hover{
    outline-style:solid;
    outline-color:rgb(24 119 217);
    background-color:rgb(24 119 217 / .08);
  }
  [data-ru-picked]{
    outline-style:solid;
    outline-color:rgb(24 119 217);
    background-color:rgb(24 119 217 / .14);
  }
`;

/**
 * The website, live, beside the controls.
 *
 * The preview is an ordinary page on this same site, so what is shown is what
 * a visitor gets - not a drawing of it. Because it is the same origin, the
 * wording on the page can be selected directly and edited here, and the page
 * reloads showing the change.
 */
export function ThemePreview({
  values,
  editable,
  save,
  path = '/',
  version = 0,
}: {
  /** Current value of every field that can be edited from the preview. */
  values: Record<string, string>;
  editable: boolean;
  save: (fd: FormData) => Promise<ActionResult>;
  /** Which page of the website to show. */
  path?: string;
  /** Bumped by the editor after a save, to pull the change into the preview. */
  version?: number;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<Device>('desktop');
  const [dark, setDark] = useState(false);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [ready, setReady] = useState(false);

  // The saved values, kept here so the editor shows what was last written
  // without waiting for the page to be re-rendered by the server.
  const [current, setCurrent] = useState(values);

  // Remembered so the preview comes back to the same place after a reload.
  const scrollBack = useRef(0);

  // The click listener inside the frame is attached once per page load, so it
  // reads the current mode through a ref rather than a captured value.
  const pickingRef = useRef(false);
  useEffect(() => {
    pickingRef.current = picking && editable;
  }, [picking, editable]);

  // Read inside the frame's click listener, which outlives any one render.
  const currentRef = useRef(values);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const doc = () => {
    try {
      return frame.current?.contentDocument ?? null;
    } catch {
      return null;
    }
  };

  /** Applies the mode and the picking outlines to the page in the frame. */
  const paint = useCallback(() => {
    const d = doc();
    if (!d?.documentElement) return;

    d.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

    let style = d.getElementById('ru-edit-style') as HTMLStyleElement | null;
    if (picking && editable) {
      if (!style) {
        style = d.createElement('style');
        style.id = 'ru-edit-style';
        d.head.appendChild(style);
      }
      style.textContent = EDIT_CSS;
    } else if (style) {
      style.remove();
    }

    d.querySelectorAll('[data-ru-picked]').forEach((el) => el.removeAttribute('data-ru-picked'));
    if (picking && picked) {
      d.querySelector(`[data-field="${CSS.escape(picked)}"]`)?.setAttribute('data-ru-picked', '');
    }
  }, [dark, picking, picked, editable]);

  /** Wires up the frame once its page has loaded. */
  const onLoad = useCallback(() => {
    const d = doc();
    if (!d) return;

    setReady(true);
    paint();

    if (scrollBack.current) {
      frame.current?.contentWindow?.scrollTo(0, scrollBack.current);
      scrollBack.current = 0;
    }

    // Captured, so the click is intercepted before the page acts on it.
    d.addEventListener(
      'click',
      (e) => {
        if (!pickingRef.current) return;
        const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-field]');

        // Nothing in the preview should navigate while text is being picked.
        e.preventDefault();
        e.stopPropagation();

        const key = target?.dataset.field;
        if (!key || !PREVIEW_FIELDS[key]) return;

        setPicked(key);
        setDraft(currentRef.current[key] ?? '');
        setResult(null);
      },
      true
    );
  }, [paint]);

  useEffect(() => {
    if (ready) paint();
  }, [ready, paint]);

  // A save anywhere in the editor bumps `version`; the preview follows.
  const firstVersion = useRef(true);
  useEffect(() => {
    if (firstVersion.current) {
      firstVersion.current = false;
      return;
    }
    reload();
    // reload is stable for this purpose: it only reads refs and state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const reload = () => {
    scrollBack.current = frame.current?.contentWindow?.scrollY ?? 0;
    setReady(false);
    // Re-assigning the source is the only reliable reload across browsers.
    if (frame.current) frame.current.src = `${path}?preview=${Date.now()}`;
  };

  const commit = async () => {
    if (!picked) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('key', picked);
    fd.append('value', draft);
    const out = await save(fd);
    setResult(out);
    setSaving(false);
    if (out.ok) {
      setCurrent((prev) => ({ ...prev, [picked]: draft }));
      reload();
    }
  };

  const width = WIDTHS[device];
  const field = picked ? PREVIEW_FIELDS[picked] : null;

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-surface px-2.5 py-1.5">
        <span className="flex rounded-lg border border-line bg-surface-soft p-0.5">
          {(
            [
              ['desktop', Monitor, 'Full width'],
              ['tablet', Tablet, 'Tablet'],
              ['phone', Smartphone, 'Phone'],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setDevice(key)}
              title={label}
              aria-label={label}
              aria-pressed={device === key}
              className={cn(
                'grid h-7 w-8 place-items-center rounded-md transition',
                device === key ? 'bg-brand-600 text-white' : 'text-ink-muted hover:text-ink'
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </span>

        <button
          type="button"
          onClick={() => setDark((v) => !v)}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[0.75rem] font-medium text-ink-soft transition hover:border-brand-600 hover:text-brand-600"
        >
          {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          {dark ? 'Dark' : 'Light'}
        </button>

        {editable && (
          <button
            type="button"
            onClick={() => {
              setPicking((v) => !v);
              setPicked(null);
            }}
            aria-pressed={picking}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[0.75rem] font-semibold transition',
              picking
                ? 'bg-brand-600 text-white'
                : 'border border-line bg-surface text-ink-soft hover:border-brand-600 hover:text-brand-600'
            )}
          >
            <MousePointerClick className="h-4 w-4" />
            {picking ? 'Selecting' : 'Edit text'}
          </button>
        )}

        <span className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={reload}
            title="Reload the preview"
            aria-label="Reload the preview"
            className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink-soft transition hover:border-brand-600 hover:text-brand-600"
          >
            <RotateCw className={cn('h-4 w-4', !ready && 'animate-spin')} />
          </button>
          <a
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            title="Open the website in a new tab"
            aria-label="Open the website in a new tab"
            className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink-soft transition hover:border-brand-600 hover:text-brand-600"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </span>
      </div>

      {/* The editor for whichever piece of wording was selected. */}
      {picking && editable && (
        <div className="border-b border-line bg-surface px-4 py-3.5">
          <ResultBanner result={result} className="mb-3" />

          {!picked ? (
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              <MousePointerClick className="h-4 w-4 shrink-0 text-brand-600" />
              Select any outlined wording in the preview below to change it.
            </p>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="label mb-0 text-xs" htmlFor="preview-field">
                  {field?.label}
                </label>
                <button
                  type="button"
                  onClick={() => setPicked(null)}
                  className="inline-flex items-center gap-1 text-xs text-ink-muted transition hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                  Close
                </button>
              </div>

              {field?.multiline ? (
                <textarea
                  id="preview-field"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  className="field text-sm"
                />
              ) : (
                <input
                  id="preview-field"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="field h-10 min-h-0 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void commit();
                    }
                  }}
                />
              )}

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={commit}
                  disabled={saving || draft === (current[picked] ?? '')}
                  className="btn-primary btn-sm"
                >
                  {saving ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save to the website
                    </>
                  )}
                </button>
                {result?.ok && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <Check className="h-3.5 w-3.5" />
                    Live
                  </span>
                )}
                <span className="ml-auto text-xs text-ink-muted">
                  Leave it empty and nothing is shown.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* The website itself.
          On full width there is no frame, no padding and no border at all:
          anything around the edge eats into the width the site is given, and
          a site squeezed into a narrower box drops into its own tablet layout,
          which is not what it looks like to a visitor. The frame cancels the
          panel's 80% zoom so the site is always judged at its true size.
          A chosen device width does get a border, because there the edge of
          the screen is the thing being looked at. */}
      <div className="min-h-0 flex-1 overflow-hidden bg-surface-alt">
        <div
          className={cn(
            'admin-unzoom mx-auto overflow-hidden bg-surface',
            width !== null && 'border border-line shadow-card'
          )}
          style={{
            // The frame is zoomed back up by 1/zoom, so to end up painting at
            // exactly the space available its own width must be multiplied by
            // the zoom, not divided. Getting this backwards makes the frame
            // overflow and the site inside think the window is far narrower
            // than it is, which is what pushed it into its tablet layout.
            width: width ? `${width}px` : 'calc(100% * var(--admin-zoom, 0.8))',
            height: 'calc(100% * var(--admin-zoom, 0.8))',
          }}
        >
          <iframe
            ref={frame}
            src={path}
            title="Website preview"
            onLoad={onLoad}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
