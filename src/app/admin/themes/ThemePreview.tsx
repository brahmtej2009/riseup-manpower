'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Monitor, Tablet, Smartphone, Sun, Moon, MousePointerClick, RotateCw,
  ExternalLink, Undo2, Check, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PREVIEW_FIELDS } from '@/lib/theme-groups';
import type { ActionResult } from '@/lib/admin-actions';

type Device = 'desktop' | 'tablet' | 'phone';

const WIDTHS: Record<Device, number | null> = { desktop: null, tablet: 820, phone: 390 };

/**
 * Styles injected into the preview while editing is switched on.
 *
 * Red rather than the brand blue, because half of what can be edited sits on
 * blue buttons, where a blue outline simply disappears.
 */
const EDIT_CSS = `
  [data-ru-edit]{
    outline:2px dashed rgb(239 68 68 / .8);
    outline-offset:3px;
    border-radius:3px;
    cursor:text;
    caret-color:rgb(239 68 68);
    transition:outline-color .15s, background-color .15s;
  }
  [data-ru-edit]:hover{ outline-style:solid; background-color:rgb(239 68 68 / .08); }
  [data-ru-edit]:focus{ outline:2px solid rgb(239 68 68); background-color:rgb(239 68 68 / .12); }
  [data-ru-dirty]{ outline-style:solid; box-shadow:0 0 0 5px rgb(239 68 68 / .18); }
  [data-ru-edit]:empty::before{ content:'(empty)'; opacity:.45; font-style:italic; }
`;

/**
 * The website, live, beside the controls.
 *
 * The preview is an ordinary page of this same site, so what is shown is what
 * a visitor gets. With editing switched on, every piece of wording that can be
 * changed is outlined and is typed into right where it sits on the page. The
 * edits are held here until they are saved, and survive moving between pages
 * of the preview, so several pages can be changed and saved in one go.
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
  /** Which page of the website to show first. */
  path?: string;
  /** Bumped by the editor after a save, to pull the change into the preview. */
  version?: number;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);

  const [device, setDevice] = useState<Device>('desktop');
  const [dark, setDark] = useState(false);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [currentPath, setCurrentPath] = useState(path);

  // The saved values, and the edits made on top of them but not yet saved.
  const [current, setCurrent] = useState(values);
  const [pending, setPending] = useState<Record<string, string>>({});
  const dirtyCount = Object.keys(pending).length;

  // The listeners inside the frame are attached once per page load and
  // outlive any one render, so they read through refs.
  const editingRef = useRef(false);
  const currentRef = useRef(values);
  editingRef.current = editing && editable;
  currentRef.current = current;

  // The size the frame is given, in its own (unzoomed) pixels. Measured
  // rather than worked out in CSS, because browsers disagree on how a
  // percentage size combines with `zoom`.
  const [box, setBox] = useState({ w: 1200, h: 800 });
  const boxRef = useRef(box);
  boxRef.current = box;

  const doc = () => {
    try {
      return frame.current?.contentDocument ?? null;
    } catch {
      return null;
    }
  };

  /** Applies the mode, the edit outlines and any unsaved edits to the page. */
  const paint = useCallback(() => {
    const d = doc();
    if (!d?.documentElement) return;

    d.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

    const on = editing && editable;
    let style = d.getElementById('ru-edit-style');
    if (on && !style) {
      style = d.createElement('style');
      style.id = 'ru-edit-style';
      style.textContent = EDIT_CSS;
      d.head.appendChild(style);
    } else if (!on && style) {
      style.remove();
    }

    d.querySelectorAll<HTMLElement>('[data-field]').forEach((el) => {
      const key = el.dataset.field ?? '';
      if (!PREVIEW_FIELDS[key]) return;

      if (on) {
        el.setAttribute('contenteditable', 'plaintext-only');
        el.setAttribute('spellcheck', 'true');
        el.setAttribute('data-ru-edit', '');
      } else {
        el.removeAttribute('contenteditable');
        el.removeAttribute('data-ru-edit');
      }

      if (key in pending) {
        // Only written when different, so the caret is not thrown about in
        // the element that is being typed into.
        if (el.textContent !== pending[key]) el.textContent = pending[key];
        el.setAttribute('data-ru-dirty', '');
      } else {
        el.removeAttribute('data-ru-dirty');
      }
    });
  }, [dark, editing, editable, pending]);

  /** Wires up the frame each time a page loads in it. */
  const onLoad = useCallback(() => {
    const d = doc();
    const w = frame.current?.contentWindow;
    if (!d || !w) return;

    setReady(true);
    setCurrentPath(w.location.pathname);

    // Clicking editable wording places the caret instead of following the
    // link or button it sits in. Anything else behaves normally, so the
    // preview can still be browsed to other pages while editing.
    d.addEventListener(
      'click',
      (e) => {
        if (!editingRef.current) return;
        const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-ru-edit]');
        if (!el) return;
        e.preventDefault();
        e.stopPropagation();
        el.focus();
      },
      true
    );

    d.addEventListener(
      'keydown',
      (e) => {
        const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-ru-edit]');
        if (!el) return;
        const multiline = PREVIEW_FIELDS[el.dataset.field ?? '']?.multiline;
        if (e.key === 'Enter' && !multiline) {
          e.preventDefault();
          el.blur();
        }
        if (e.key === 'Escape') el.blur();
        // Space and arrows must type, not scroll or toggle what is underneath.
        e.stopPropagation();
      },
      true
    );

    d.addEventListener(
      'input',
      (e) => {
        const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-ru-edit]');
        const key = el?.dataset.field;
        if (!el || !key) return;

        let value = el.innerText.replace(/ /g, ' ');
        if (!PREVIEW_FIELDS[key]?.multiline) value = value.replace(/\s*\n\s*/g, ' ');

        // The same wording can appear twice (the menu in the header and the
        // footer); both copies follow the one being typed into.
        d.querySelectorAll<HTMLElement>(`[data-field="${CSS.escape(key)}"]`).forEach((other) => {
          if (other !== el && other.textContent !== value) other.textContent = value;
        });

        setPending((prev) => {
          const next = { ...prev };
          if (value === (currentRef.current[key] ?? '')) delete next[key];
          else next[key] = value;
          return next;
        });
      },
      true
    );
  }, []);

  useEffect(() => {
    if (ready) paint();
  }, [ready, paint]);

  const reload = useCallback(() => {
    const w = frame.current?.contentWindow;
    const here = w?.location.pathname || currentPath;
    setReady(false);
    // Re-assigning the source is the only reliable reload across browsers.
    if (frame.current) frame.current.src = `${here}?preview=${Date.now()}`;
  }, [currentPath]);

  // Switching page in the editor's top bar.
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    setReady(false);
    if (frame.current) frame.current.src = path;
  }, [path]);

  // A save elsewhere in the editor bumps `version`; the preview follows.
  const firstVersion = useRef(true);
  useEffect(() => {
    if (firstVersion.current) {
      firstVersion.current = false;
      return;
    }
    reload();
    // Only a change of version should reload, not a new reload function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  // Leaving the page with unsaved wording asks first.
  useEffect(() => {
    if (!dirtyCount) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirtyCount]);

  // Keeps the frame exactly the size of the space around it. Both rectangles
  // are measured in the same screen pixels, so their ratio is the correction
  // whatever the zoom is.
  useEffect(() => {
    const outer = area.current;
    const inner = shell.current;
    if (!outer || !inner) return;
    const fit = () => {
      const o = outer.getBoundingClientRect();
      const i = inner.getBoundingClientRect();
      if (!o.width || !o.height || !i.width || !i.height) return;
      // A chosen device keeps its own width; only full width follows the space.
      const w =
        WIDTHS[device] === null ? Math.floor((boxRef.current.w * o.width) / i.width) : boxRef.current.w;
      const h = Math.floor((boxRef.current.h * o.height) / i.height);
      if (w !== boxRef.current.w || h !== boxRef.current.h) setBox({ w, h });
    };
    const ro = new ResizeObserver(() => fit());
    ro.observe(outer);
    fit();
    return () => ro.disconnect();
  }, [device]);

  const saveAll = async () => {
    setSaving(true);
    setNotice(null);
    const saved: Record<string, string> = {};
    let error = '';

    for (const [key, value] of Object.entries(pending)) {
      const fd = new FormData();
      fd.append('key', key);
      fd.append('value', value);
      const res = await save(fd);
      if (res.ok) saved[key] = value;
      else error ||= res.error ?? 'Something could not be saved.';
    }

    setCurrent((prev) => ({ ...prev, ...saved }));
    setPending((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(saved)) delete next[k];
      return next;
    });
    setSaving(false);
    setNotice(error ? { ok: false, text: error } : { ok: true, text: 'Saved. The website is updated.' });
    if (!error) reload();
  };

  const revert = () => {
    setPending({});
    setNotice(null);
    reload();
  };

  const toggleEditing = () => {
    if (editing && dirtyCount && !window.confirm('Discard the changes that have not been saved?')) {
      return;
    }
    if (editing && dirtyCount) revert();
    setEditing((v) => !v);
    setNotice(null);
  };

  // A saved notice clears itself.
  useEffect(() => {
    if (!notice?.ok) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const width = WIDTHS[device];

  return (
    <div className="flex h-full flex-col">
      {/* One row of controls, whatever is happening, so the preview below it
          never changes size. */}
      <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-line bg-surface px-2.5">
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
            onClick={toggleEditing}
            aria-pressed={editing}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[0.75rem] font-semibold transition',
              editing
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'border border-line bg-surface text-ink-soft hover:border-rose-500 hover:text-rose-600'
            )}
          >
            <MousePointerClick className="h-4 w-4" />
            {editing ? 'Editing text' : 'Edit text'}
          </button>
        )}

        <span className="hidden min-w-0 truncate font-mono text-[0.6875rem] text-ink-muted md:inline">
          {currentPath}
        </span>

        <span className="ml-auto flex items-center gap-1.5">
          {notice && (
            <span
              className={cn(
                'inline-flex max-w-[22rem] items-center gap-1 truncate text-[0.75rem] font-medium',
                notice.ok ? 'text-emerald-600' : 'text-rose-600'
              )}
              title={notice.text}
            >
              {notice.ok ? <Check className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
              {notice.text}
            </span>
          )}

          {editing && !dirtyCount && !notice && (
            <span className="text-[0.75rem] text-ink-muted">Click any red outline to type</span>
          )}

          {editing && dirtyCount > 0 && (
            <>
              <button
                type="button"
                onClick={revert}
                disabled={saving}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[0.75rem] font-medium text-ink-soft transition hover:border-ink hover:text-ink disabled:opacity-50"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Revert
              </button>
              <button
                type="button"
                onClick={saveAll}
                disabled={saving}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-[0.75rem] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Save {dirtyCount} change{dirtyCount === 1 ? '' : 's'}
              </button>
            </>
          )}

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
            href={currentPath}
            target="_blank"
            rel="noopener noreferrer"
            title="Open this page in a new tab"
            aria-label="Open this page in a new tab"
            className="grid h-7 w-7 place-items-center rounded-lg border border-line text-ink-soft transition hover:border-brand-600 hover:text-brand-600"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </span>
      </div>

      {/* The website itself. On full width there is no frame or padding at
          all, and the frame cancels the panel's zoom, so the site is judged at
          its true size. A chosen device width gets a border, because there
          the edge of the screen is the thing being looked at. */}
      <div ref={area} className="min-h-0 flex-1 overflow-hidden bg-surface-alt">
        <div
          ref={shell}
          className={cn(
            'admin-unzoom mx-auto overflow-hidden bg-surface',
            width !== null && 'border border-line shadow-card'
          )}
          style={{
            // Measured to fill the space exactly, see the effect above.
            width: width ? `${width}px` : `${box.w}px`,
            height: `${box.h}px`,
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
