import Link from 'next/link';
import { Building2, ArrowLeft } from 'lucide-react';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getClientLogos } from '@/lib/content';
import { getSettings, num, bool, str } from '@/lib/settings';
import { PageTitle, Panel, EmptyState } from '@/components/admin/ui';
import { InfoNote } from '@/components/admin/interactive';
import { LogoMarquee } from '@/components/home/LogoMarquee';
import { LogoForm, LogoRow } from './LogoAdmin';
import { saveLogo, toggleLogo, moveLogo, deleteLogo } from './actions';

export const metadata = { title: 'Client logos' };

export default async function LogosAdminPage() {
  const user = await requirePermission('theme.view');
  const editable = can(user, 'theme.edit');
  const logos = getClientLogos(false);
  const s = getSettings();

  const height = Math.min(Math.max(num(s, 'logos_height', 72), 24), 140);
  const shown = logos.filter((l) => l.is_visible === 1);

  return (
    <>
      <PageTitle
        title="Client logos"
        subtitle="The row of logos that moves steadily across the home page."
        actions={
          <Link href="/admin/themes" className="btn-outline btn-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Themes
          </Link>
        }
      />

      {/* Exactly what the website shows, so there is no guessing. */}
      {shown.length > 0 && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-line">
          <p className="border-b border-line bg-surface-soft px-4 py-2 text-xs font-medium text-ink-muted">
            This is the row as it appears on the website.
          </p>
          <LogoMarquee
            logos={shown}
            height={height}
            speed={num(s, 'logos_speed', 38)}
            grayscale={bool(s, 'logos_grayscale', false)}
          />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {editable && (
          <div className="lg:col-span-1">
            <Panel title="Add a logo">
              <LogoForm save={saveLogo} />
            </Panel>

            <div className="mt-4">
              <InfoNote>
                Every logo is scaled to {height} pixels tall and keeps its own width, so a long
                wordmark and a square badge sit together evenly. The height, the speed and whether
                the logos are shown in grey are all set under Appearance on the Themes screen.
              </InfoNote>
            </div>
          </div>
        )}

        <div className={editable ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <Panel
            title="Logos, in the order they appear"
            description={
              logos.length
                ? `${logos.length} added, ${shown.length} shown in the row.`
                : undefined
            }
            bodyClassName=""
          >
            {logos.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No logos yet"
                description={
                  editable
                    ? 'Add the first logo on the left. The row only appears on the website once there is at least one.'
                    : 'No client logos have been added yet.'
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {logos.map((logo, index) => (
                  <LogoRow
                    key={logo.id}
                    logo={logo}
                    index={index}
                    total={logos.length}
                    editable={editable}
                    height={height}
                    save={saveLogo}
                    toggle={toggleLogo}
                    move={moveLogo}
                    remove={deleteLogo}
                  />
                ))}
              </ul>
            )}
          </Panel>

          {!bool(s, 'logos_show_home', true) && (
            <div className="mt-4">
              <InfoNote>
                The logo row is currently switched off on the home page. Turn it back on under
                Home page sections on the Themes screen. The heading is currently{' '}
                {str(s, 'logos_heading') ? `"${str(s, 'logos_heading')}"` : 'blank'}.
              </InfoNote>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
