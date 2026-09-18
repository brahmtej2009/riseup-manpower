import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import { getTeam } from '@/lib/content';
import { getSettings, str } from '@/lib/settings';
import { PageHeader } from '@/components/site/PageHeader';
import { TeamCard } from '@/components/cards';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Our team',
  description: 'The people behind Rise Up Manpower, and who to speak to about what.',
};

export default function TeamPage() {
  const s = getSettings();
  const team = getTeam();

  return (
    <>
      <PageHeader
        title={str(s, 'team_heading', 'Our team')}
        intro={str(s, 'team_intro')}
        breadcrumbs={[{ href: '/team', label: 'Our team' }]}
      />

      <section className="section-tight bg-surface">
        <div className="shell">
          {team.length === 0 ? (
            <div className="card grid place-items-center px-6 py-16 text-center">
              <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-surface-alt text-ink-muted">
                <Users className="h-6 w-6" />
              </span>
              <h2 className="font-display text-lg font-semibold">No team members yet</h2>
              <p className="mt-2 max-w-sm text-ink-soft">
                Team members added from the admin panel appear here automatically.
              </p>
            </div>
          ) : (
            <RevealGroup
              className="mx-auto grid max-w-5xl gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              stagger={0.06}
            >
              {team.map((member) => (
                <RevealItem key={member.id}>
                  <TeamCard member={member} />
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </div>
      </section>

    </>
  );
}
