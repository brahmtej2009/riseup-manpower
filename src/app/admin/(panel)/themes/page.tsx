import Link from 'next/link';
import {
  Palette, Home, BarChart3, LayoutGrid, Images, Building2, ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettingRows, getSettings, str, bool, num } from '@/lib/settings';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { THEME_TABS, PREVIEW_FIELDS, type ThemeTabKey } from '@/lib/theme-groups';
import { InfoNote } from '@/components/admin/interactive';
import { SettingsForm } from '../settings/SettingsForm';
import { ThemePreview } from './ThemePreview';
import { saveThemeSettings, savePreviewField } from './actions';

export const metadata = { title: 'Themes' };

const TAB_ICONS: Record<string, LucideIcon> = { Palette, Home, BarChart3, LayoutGrid };

export default async function ThemesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requirePermission('theme.view');
  const params = await searchParams;
  const editable = can(user, 'theme.edit');

  const tab: ThemeTabKey = THEME_TABS.some((t) => t.key === params.tab)
    ? (params.tab as ThemeTabKey)
    : 'appearance';
  const current = THEME_TABS.find((t) => t.key === tab)!;

  const s = getSettings();
  const rows = getSettingRows();

  // Only the wording that can be edited straight from the preview.
  const previewValues: Record<string, string> = {};
  for (const key of Object.keys(PREVIEW_FIELDS)) previewValues[key] = str(s, key);

  const photoCount = db.scalar<number>('SELECT COUNT(*) AS n FROM gallery_photos') ?? 0;
  const logoCount = db.scalar<number>('SELECT COUNT(*) AS n FROM client_logos') ?? 0;

  const darkFirst = bool(s, 'theme_dark_default', false);

  return (
    /* An editor layout: a rail of controls on the left, the website filling
       everything else. The page owns the whole window rather than sitting in
       the usual padded card, which is why the shell drops its header height
       and its padding for this one screen. */
    <div className="flex h-[calc(100vh-3rem)] flex-col lg:flex-row">
      {/* ------------------------------------------------------- left rail */}
      <aside className="flex w-full shrink-0 flex-col border-b border-line bg-surface lg:h-full lg:w-[21rem] lg:border-b-0 lg:border-r">
        {/* Tabs */}
        <nav className="flex shrink-0 gap-1 border-b border-line p-2">
          {THEME_TABS.map((t) => {
            const Icon = TAB_ICONS[t.icon] ?? Palette;
            return (
              <Link
                key={t.key}
                href={`/admin/themes?tab=${t.key}`}
                title={t.description}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[0.6875rem] font-medium transition',
                  tab === t.key
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-muted hover:bg-surface-soft hover:text-ink'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="truncate">{t.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* The controls for the chosen tab, scrolling on their own. */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
          {!editable && (
            <InfoNote>
              You can look at these but not change them. Ask an administrator for the
              &ldquo;Themes &amp; appearance: change&rdquo; permission.
            </InfoNote>
          )}

          {current.groups.map((g) => (
            <section key={g.group}>
              <h2 className="mb-1 text-[0.8125rem] font-semibold text-ink">{g.title}</h2>
              {g.hint && <p className="mb-3 text-xs leading-relaxed text-ink-muted">{g.hint}</p>}
              <SettingsForm
                group={g.group}
                rows={rows.filter((r) => r.group_name === g.group)}
                editable={editable}
                save={saveThemeSettings}
              />
            </section>
          ))}

          {tab === 'appearance' && (
            <InfoNote>
              The website opens in {darkFirst ? 'dark' : 'light'} mode.{' '}
              {bool(s, 'theme_follow_device', true)
                ? 'A visitor whose device is set to dark mode sees the dark version first.'
                : 'The device setting is ignored.'}{' '}
              {bool(s, 'theme_toggle_show', true)
                ? 'Either way they can switch in the header, and their choice is remembered.'
                : 'The switch in the header is hidden.'}
            </InfoNote>
          )}

          {tab === 'figures' && (
            <InfoNote>
              A figure set to count automatically is worked out from the database. Switch one off to
              type it in by hand. A figure of zero is left off the website rather than shown.
            </InfoNote>
          )}

          {tab === 'addons' && (
            <>
              <AddonCard
                href="/admin/gallery"
                icon={Images}
                title="Photo gallery"
                count={photoCount}
                countLabel={photoCount === 1 ? 'photograph' : 'photographs'}
                shown={bool(s, 'gallery_show_home', true)}
                description="A grid on the home page, opening full size when selected."
              />

              <AddonCard
                href="/admin/themes/logos"
                icon={Building2}
                title="Client logos"
                count={logoCount}
                countLabel={logoCount === 1 ? 'logo' : 'logos'}
                shown={bool(s, 'logos_show_home', false)}
                description={`A row that moves steadily across the page. Every logo is scaled to ${num(
                  s,
                  'logos_height',
                  72
                )} pixels tall, however many you add.`}
              />

              <InfoNote>
                Whether each appears on the home page, and the heading above it, are set under Home
                page.
              </InfoNote>
            </>
          )}
        </div>
      </aside>

      {/* --------------------------------------------------------- preview */}
      <div className="min-h-0 min-w-0 flex-1 bg-surface-alt">
        <ThemePreview values={previewValues} editable={editable} save={savePreviewField} />
      </div>
    </div>
  );
}

/** A link through to one of the screens that manages a row add-on. */
function AddonCard({
  href,
  icon: Icon,
  title,
  count,
  countLabel,
  shown,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  count: number;
  countLabel: string;
  shown: boolean;
  description: string;
}) {
  return (
    <Link href={href} className="card-hover group flex items-start gap-4 p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-600/10 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-display text-[0.9375rem] font-semibold text-ink">{title}</span>
          <span
            className={cn(
              'chip',
              shown
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                : 'bg-amber-50 text-amber-700 ring-amber-600/20'
            )}
          >
            {shown ? 'On the home page' : 'Switched off'}
          </span>
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-ink-soft">{description}</span>
        <span className="mt-2 block text-xs font-medium text-ink-muted">
          {count} {countLabel}
        </span>
      </span>

      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
