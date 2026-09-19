import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';

/**
 * The banner at the top of every inner page.
 *
 * Centred, on a soft band that follows the light or dark mode, so it sits
 * directly under the header without a seam and gives the page one clear
 * focal point instead of a block of text competing with the navigation.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  breadcrumbs = [],
  children,
  field,
  introField,
}: {
  /** Setting keys, so the heading can be edited straight from the preview. */
  field?: string;
  introField?: string;
  eyebrow?: string;
  title: string;
  intro?: string;
  breadcrumbs?: { href: string; label: string }[];
  children?: React.ReactNode;
}) {
  return (
    <section className="panel-band relative isolate overflow-hidden border-b border-line">
      <div className="dot-bg absolute inset-0 -z-10 opacity-60" aria-hidden />
      <div
        className="aurora -left-24 -top-32 h-72 w-72 bg-brand-600/25"
        aria-hidden
      />

      <div className="shell py-[clamp(2.5rem,6vw,4.5rem)] text-center">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center justify-center gap-1 text-sm text-ink-muted">
              <li>
                <Link href="/" className="transition hover:text-brand-600">
                  Home
                </Link>
              </li>
              {breadcrumbs.map((crumb, i) => (
                <li key={crumb.href} className="flex items-center gap-1">
                  <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                  {i === breadcrumbs.length - 1 ? (
                    <span className="max-w-[16rem] truncate font-medium text-panel sm:max-w-none">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link href={crumb.href} className="transition hover:text-brand-600">
                      {crumb.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <Reveal>
          {eyebrow && (
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              {eyebrow}
            </p>
          )}

          <h1 className="mx-auto max-w-3xl font-display text-[clamp(1.75rem,4vw,2.75rem)] font-bold uppercase leading-tight tracking-tight text-panel">
            <span data-field={field}>{title}</span>
          </h1>

          <span className="accent-rule mx-auto mt-5" aria-hidden />

          {intro && (
            <p data-field={introField} className="mx-auto mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-panel-soft">
              {intro}
            </p>
          )}

          {children && <div className="mt-7 flex justify-center">{children}</div>}
        </Reveal>
      </div>
    </section>
  );
}
