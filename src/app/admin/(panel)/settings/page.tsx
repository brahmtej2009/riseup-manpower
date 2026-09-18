import Link from 'next/link';
import {
  Palette, Building2, Phone, Share2, ClipboardList, Search, Mail, Server, Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettingRows } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { PageTitle, Panel } from '@/components/admin/ui';
import { InfoNote } from '@/components/admin/interactive';
import { SettingsForm } from './SettingsForm';
import { saveSettings, testEmailSettings, testSocialFeed } from './actions';

export const metadata = { title: 'Settings' };

const GROUPS: { key: string; label: string; icon: LucideIcon; description: string }[] = [
  { key: 'company', label: 'Company', icon: Building2, description: 'Name, tagline, the About text, licence and registration numbers.' },
  { key: 'contact', label: 'Contact details', icon: Phone, description: 'Phone numbers, email addresses, the office address and working hours.' },
  { key: 'social', label: 'Social media', icon: Share2, description: 'Links to the company accounts, and pulling recent posts in automatically.' },
  { key: 'forms', label: 'Form options', icon: ClipboardList, description: 'The lists that appear in the dropdowns on the registration forms.' },
  { key: 'seo', label: 'Search engines', icon: Search, description: 'Page titles, descriptions, the share image and analytics code.' },
  { key: 'email', label: 'Email alerts', icon: Mail, description: 'Get an email whenever a form or a message arrives.' },
  { key: 'analytics', label: 'Visitor statistics', icon: Activity, description: 'How visits are counted and for how long they are kept.' },
  { key: 'system', label: 'System', icon: Server, description: 'The code repository, backups and maintenance mode.' },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const user = await requirePermission('settings.view');
  const params = await searchParams;

  const group = GROUPS.some((g) => g.key === params.group) ? params.group! : 'company';
  const current = GROUPS.find((g) => g.key === group)!;
  const editable = can(user, 'settings.edit');

  const rows = getSettingRows().filter((r) => r.group_name === group);

  return (
    <>
      <PageTitle
        title="Settings"
        subtitle="The company details, the forms and how the website is run."
        actions={
          <Link href="/admin/themes" className="btn-outline btn-sm">
            <Palette className="h-4 w-4" />
            How the website looks
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-4">
        {/* Group navigation */}
        <nav className="lg:col-span-1">
          <div className="card overflow-hidden p-1.5 lg:sticky lg:top-24">
            {GROUPS.map((g) => (
              <Link
                key={g.key}
                href={`/admin/settings?group=${g.key}`}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  group === g.key
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-soft hover:bg-slate-50 hover:text-ink'
                )}
              >
                <g.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="truncate">{g.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="lg:col-span-3">
          <Panel title={current.label} description={current.description}>
            {!editable && (
              <div className="mb-5">
                <InfoNote>
                  You can see these settings but not change them. Ask an administrator for the
                  &ldquo;Settings: change&rdquo; permission.
                </InfoNote>
              </div>
            )}

            <SettingsForm
              group={group}
              rows={rows}
              editable={editable}
              save={saveSettings}
              testEmail={group === 'email' ? testEmailSettings : undefined}
              testFeed={group === 'social' ? testSocialFeed : undefined}
            />
          </Panel>

        </div>
      </div>
    </>
  );
}
