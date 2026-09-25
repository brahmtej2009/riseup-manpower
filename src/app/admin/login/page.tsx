import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getSiteInfo } from '@/lib/settings';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Staff sign in',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect('/admin');

  const { next } = await searchParams;
  const site = getSiteInfo();

  return (
    <div className="grid min-h-[var(--admin-vh)] lg:grid-cols-2">
      {/* Form */}
      <div className="flex flex-col justify-center px-5 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to the website
          </Link>

          <div className="mb-8">
            <span className="mb-5 grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-brand-600 text-white">
              {site.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={site.logo} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-lg font-bold">{site.name.slice(0, 1)}</span>
              )}
            </span>
            <h1 className="font-display text-2xl font-bold text-ink">Staff sign in</h1>
            <p className="mt-2 text-sm text-ink-soft">
              This area is for {site.name} staff only.
            </p>
          </div>

          <LoginForm next={next} />

          <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
            <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-emerald-600" />
            Sign-in attempts are recorded. After six wrong passwords the account is locked for
            fifteen minutes.
          </p>
        </div>
      </div>

      {/* Panel */}
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="dot-bg absolute inset-0 opacity-60" aria-hidden />
        <div className="glow -right-20 top-10 h-96 w-96 bg-brand-600/30" aria-hidden />
        <div className="glow -left-20 bottom-0 h-80 w-80 bg-accent-500/15" aria-hidden />

        <div className="relative flex h-full flex-col justify-between p-14">
          <p className="font-display text-lg font-bold text-white">{site.name}</p>

          <div>
            <p className="font-display text-3xl font-bold leading-tight text-white">
              Everything the website shows,
              <br />
              managed from one place.
            </p>
            <ul className="mt-8 space-y-3 text-slate-400">
              {[
                'Review and approve new registrations',
                'Keep private notes against every contact',
                'Publish posts with photos',
                'Control exactly what each staff member can do',
              ].map((line) => (
                <li key={line} className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-slate-600">
            © {new Date().getFullYear()} {site.legalName}
          </p>
        </div>
      </div>
    </div>
  );
}
