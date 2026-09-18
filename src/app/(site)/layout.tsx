import { Suspense } from 'react';
import Link from 'next/link';
import { getSiteInfo } from '@/lib/settings';
import { getCurrentUser } from '@/lib/auth';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { Tracker } from '@/components/site/Tracker';
import { PointerEffects } from '@/components/ui/Pointer';
import { WhatsAppButton } from '@/components/site/WhatsAppButton';
import { MaintenanceScreen } from '@/components/site/MaintenanceScreen';
import { PageTransition } from '@/components/site/PageTransition';
import { JsonLd, organizationSchema, websiteSchema, faqSchema } from '@/lib/seo';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = getSiteInfo();

  // Maintenance mode hides the site from visitors, but staff who are signed
  // in still see it normally so they can check their work.
  if (site.maintenance) {
    const user = await getCurrentUser();
    if (!user) return <MaintenanceScreen site={site} />;
  }

  return (
    <>
      {/* Skip link - the first thing a keyboard or screen reader user meets. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]
                   focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-surface"
      >
        Skip to content
      </a>

      {site.maintenance && (
        <div className="relative z-[70] bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold text-ink">
          Maintenance mode is on - visitors cannot see the site.{' '}
          <Link href="/admin/settings?group=system" className="underline">
            Turn it off
          </Link>
        </div>
      )}

      {/* Facts about the company, for search engines and AI assistants. */}
      <JsonLd data={[organizationSchema(), websiteSchema(), faqSchema()]} />

      <Header site={site} />

      <main id="main" className="pt-header">
        <PageTransition>{children}</PageTransition>
      </main>

      <Footer site={site} />
      <PointerEffects />
      <WhatsAppButton site={site} />

      <Suspense fallback={null}>
        <Tracker />
      </Suspense>
    </>
  );
}
