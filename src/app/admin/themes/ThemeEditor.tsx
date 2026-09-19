'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Home, Globe, LayoutTemplate, BarChart3, Briefcase, Megaphone,
  Images, Building2, UserSquare2, Palette, SunMoon, Shapes, PanelBottom,
  ChevronRight, ArrowUpRight, Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubmitButton } from '@/components/admin/interactive';
import { ActionForm } from '@/components/admin/BulkForm';
import { THEME_PAGES, PREVIEW_FIELDS } from '@/lib/theme-groups';
import type { SettingRow } from '@/lib/settings';
import type { ActionResult } from '@/lib/admin-actions';
import { FieldControl } from './FieldControl';
import { ThemePreview } from './ThemePreview';

const ICONS: Record<string, LucideIcon> = {
  Home, Globe, LayoutTemplate, BarChart3, Briefcase, Megaphone,
  Images, Building2, UserSquare2, Palette, SunMoon, Shapes, PanelBottom,
};

/**
 * The website editor.
 *
 * One page at a time, one section at a time, with the live site filling
 * everything that is left. Wording is changed by selecting it in the preview,
 * so the side panel only carries the things that cannot be clicked: switches,
 * numbers, pictures and colours.
 */
export function ThemeEditor({
  rows,
  previewValues,
  editable,
  save,
  savePreview,
  counts,
}: {
  rows: SettingRow[];
  previewValues: Record<string, string>;
  editable: boolean;
  save: (fd: FormData) => Promise<ActionResult>;
  savePreview: (fd: FormData) => Promise<ActionResult>;
  counts: { photos: number; logos: number };
}) {
  const [pageKey, setPageKey] = useState(THEME_PAGES[0].key);
  const [openSection, setOpenSection] = useState<string | null>(THEME_PAGES[0].sections[0].key);

  // The rail is dragged to whatever width suits the screen, and the choice is
  // kept so it is not reset on every visit.
  const [railWidth, setRailWidth] = useState(288);
  const dragging = useRef(false);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem('ru-theme-rail'));
      if (saved >= 200 && saved <= 560) setRailWidth(saved);
    } catch {
      /* private browsing; the default width is fine */
    }
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      // The pointer is in real screen pixels, the layout is in the panel's
      // zoomed space, so the reading has to be converted back.
      const zoom = Number(
        getComputedStyle(document.documentElement).getPropertyValue('--admin-zoom') || 0.7
      ) || 0.7;
      const next = Math.min(Math.max(e.clientX / zoom, 200), 560);
      setRailWidth(next);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.userSelect = '';
      try {
        localStorage.setItem('ru-theme-rail', String(Math.round(railWidth)));
      } catch {
        /* nothing to do */
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [railWidth]);

  // Bumped whenever something is saved, so the preview reloads and shows it.
  const [previewVersion, setPreviewVersion] = useState(0);
  const refreshPreview = useCallback(() => setPreviewVersion((v) => v + 1), []);

  const page = THEME_PAGES.find((p) => p.key === pageKey) ?? THEME_PAGES[0];
  const byKey = new Map(rows.map((r) => [r.key, r]));

  return (
    <div className="flex h-[var(--admin-vh)] flex-col bg-surface-alt">
      {/* ------------------------------------------------------------ top bar */}
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-3 py-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.8125rem] font-medium text-ink-soft transition hover:bg-surface-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Admin
        </Link>

        <span className="h-5 w-px bg-line" aria-hidden />

        {/* Which page is being edited. */}
        <nav className="flex gap-1">
          {THEME_PAGES.map((p) => {
            const Icon = ICONS[p.icon] ?? Home;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setPageKey(p.key);
                  setOpenSection(p.sections[0]?.key ?? null);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-medium transition',
                  pageKey === p.key
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-soft hover:bg-surface-soft hover:text-ink'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {p.label}
              </button>
            );
          })}
        </nav>

        <span className="ml-auto text-[0.75rem] text-ink-muted">
          Changes are live as soon as they are saved
        </span>
      </header>

      {/* --------------------------------------------------------- the editor */}
      <div className="flex min-h-0 flex-1">
        {/* -------------------------------------------------------- left rail */}
        <aside
          className="flex shrink-0 flex-col border-r border-line bg-surface"
          style={{ width: `${railWidth}px` }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
            {page.sections.map((section) => {
              const Icon = ICONS[section.icon] ?? LayoutTemplate;
              const isOpen = openSection === section.key;
              const sectionRows = section.keys
                .map((k) => byKey.get(k))
                .filter((r): r is SettingRow => !!r);

              const manageCount =
                section.key === 'gallery' ? counts.photos
                : section.key === 'logos' ? counts.logos
                : null;

              return (
                <div key={section.key} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    onClick={() => setOpenSection(isOpen ? null : section.key)}
                    aria-expanded={isOpen}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition',
                      isOpen ? 'text-brand-600' : 'text-ink hover:bg-surface-soft'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    <span className="flex-1 truncate text-[0.8125rem] font-medium">
                      {section.label}
                    </span>
                    {manageCount !== null && (
                      <span className="text-[0.6875rem] tabular-nums text-ink-muted">
                        {manageCount}
                      </span>
                    )}
                    <ChevronRight
                      className={cn('h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform', isOpen && 'rotate-90')}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-2.5 pb-4">
                      {section.note && (
                        <p className="mb-3 text-[0.6875rem] leading-relaxed text-ink-muted">
                          {section.note}
                        </p>
                      )}

                      {section.manage && (
                        <Link
                          href={section.manage.href}
                          className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[0.75rem] font-medium text-ink-soft transition hover:border-brand-600 hover:text-brand-600"
                        >
                          {section.manage.label}
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      )}

                      {sectionRows.length > 0 ? (
                        <ActionForm
                          action={async (fd) => {
                            const res = await save(fd);
                            if (res.ok) refreshPreview();
                            return res;
                          }}
                          hidden={{ __keys: section.keys.join(',') }}
                          className="space-y-3"
                        >
                          {/* Tells the save action which of these are tick
                              boxes, since an unticked box posts nothing. */}
                          {sectionRows
                            .filter((r) => r.type === 'bool')
                            .map((r) => (
                              <input key={r.key} type="hidden" name={`__bool_${r.key}`} value="1" />
                            ))}

                          <fieldset disabled={!editable} className="space-y-3">
                            {sectionRows.map((row) => (
                              <FieldControl key={row.key} row={row} />
                            ))}
                          </fieldset>

                          {editable && (
                            <SubmitButton
                              className="btn-primary btn-sm w-full"
                              icon={<Check className="h-3.5 w-3.5" />}
                            >
                              Save
                            </SubmitButton>
                          )}
                        </ActionForm>
                      ) : (
                        !section.manage && (
                          <p className="text-[0.75rem] text-ink-muted">
                            Everything in this section is edited by selecting it in the preview.
                          </p>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="shrink-0 border-t border-line px-3 py-2.5 text-[0.6875rem] leading-relaxed text-ink-muted">
            Headings and button labels are changed by selecting them in the preview.
          </p>
        </aside>

        {/* The drag handle. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Drag to resize the panel"
          onMouseDown={() => {
            dragging.current = true;
            document.body.style.userSelect = 'none';
          }}
          onDoubleClick={() => setRailWidth(288)}
          title="Drag to resize, double click to reset"
          className="group relative w-1 shrink-0 cursor-col-resize bg-line transition-colors hover:bg-brand-600"
        >
          <span className="absolute inset-y-0 -left-1 -right-1" aria-hidden />
        </div>

        {/* --------------------------------------------------------- preview */}
        <div className="min-w-0 flex-1">
          <ThemePreview
            values={previewValues}
            editable={editable}
            save={savePreview}
            path={page.path}
            version={previewVersion}
          />
        </div>
      </div>
    </div>
  );
}

/** Used by the page to decide which wording the preview may edit. */
export const previewFieldKeys = Object.keys(PREVIEW_FIELDS);
