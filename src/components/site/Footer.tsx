import Link from 'next/link';
import { Phone, Mail, MapPin, Clock, ArrowUpRight } from 'lucide-react';
import { telLink, whatsappLink } from '@/lib/utils';
import type { SiteInfo } from '@/lib/settings';
import { SocialIcon } from './SocialIcon';

export function Footer({ site }: { site: SiteInfo }) {
  const year = new Date().getFullYear();
  // "© 2022 - 2026" once a start year is set, just "© 2026" before that.
  const years = site.copyrightStartYear && site.copyrightStartYear < year
    ? `${site.copyrightStartYear} - ${year}`
    : String(year);

  return (
    <footer className="relative overflow-hidden border-t border-line bg-surface-soft text-ink-soft">
      <div className="dot-bg absolute inset-0 opacity-70" aria-hidden />
      <div
        className="glow -left-40 -top-40 h-96 w-96 bg-brand-600/[0.12]"
        aria-hidden
      />

      <div className="shell relative">
        <div className="grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-10 lg:gap-8 lg:py-14">
          {/* Identity */}
          <div className="lg:col-span-4">
            <Link href="/" className="mb-5 inline-flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg">
                {site.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={site.logoAlt || site.logo} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-brand-600 font-display text-lg font-bold text-white">{site.name.slice(0, 1)}</span>
                )}
              </span>
              <span>
                <span data-field="company_name" className="block font-display text-[1.0625rem] font-bold uppercase tracking-tight text-ink">
                  {site.name}
                </span>
                {site.tagline && (
                  <span data-field="tagline" className="block text-xs text-ink-muted">
                    {site.tagline}
                  </span>
                )}
              </span>
            </Link>

            {site.social.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {site.social.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    title={s.name}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface
                               text-ink-soft transition hover:border-brand-500/40 hover:bg-brand-600 hover:text-white"
                  >
                    <SocialIcon name={s.key} className="h-[1.125rem] w-[1.125rem]" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          <div className="lg:col-span-3">
            <h3 className="mb-4 text-[0.8125rem] font-semibold uppercase tracking-wider text-ink">
              <span data-field="footer_links_heading">{site.words.footer_links_heading}</span>
            </h3>
            <ul className="space-y-2.5 text-sm">
              {(
                [
                  ['/team', 'nav_team'],
                  ['/posts', 'nav_posts'],
                  ['/contact', 'nav_contact'],
                ] as const
              ).map(([href, key]) => (
                <li key={href}>
                  <Link href={href} className="transition hover:text-brand-600">
                    <span data-field={key}>{site.words[key]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>


          {/* Contact */}
          <div className="lg:col-span-3">
            <h3 className="mb-4 text-[0.8125rem] font-semibold uppercase tracking-wider text-ink">
              <span data-field="footer_contact_heading">{site.words.footer_contact_heading}</span>
            </h3>
            <ul className="space-y-3.5 text-sm">
              {site.address.length > 0 && (
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.2} />
                  <span className="leading-relaxed">{site.address.join(', ')}</span>
                </li>
              )}
              {site.phone && (
                <li className="flex gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.2} />
                  <span>
                    <a href={telLink(site.phone)} className="block transition hover:text-brand-600">
                      {site.phone}
                    </a>
                    {site.phone2 && (
                      <a href={telLink(site.phone2)} className="block transition hover:text-brand-600">
                        {site.phone2}
                      </a>
                    )}
                  </span>
                </li>
              )}
              {site.email && (
                <li className="flex gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.2} />
                  <span>
                    <a href={`mailto:${site.email}`} className="block break-all transition hover:text-brand-600">
                      {site.email}
                    </a>
                    {site.emailHr && (
                      <a href={`mailto:${site.emailHr}`} className="block break-all transition hover:text-brand-600">
                        {site.emailHr}
                      </a>
                    )}
                  </span>
                </li>
              )}
              {(site.workingDays || site.workingHours) && (
                <li className="flex gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.2} />
                  <span>
                    {site.workingDays && <span data-field="working_days">{site.workingDays}</span>}
                    {site.workingDays && site.workingHours && <br />}
                    {site.workingHours && <span data-field="working_hours">{site.workingHours}</span>}
                  </span>
                </li>
              )}
            </ul>

            {site.whatsapp && (
              <a
                href={whatsappLink(site.whatsapp, `Hello ${site.name}, I would like to enquire about`)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5
                           text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                <SocialIcon name="whatsapp" className="h-4 w-4" />
                <span data-field="footer_whatsapp">{site.words.footer_whatsapp}</span>
              </a>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-3 border-t border-line py-6 text-[0.8125rem] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {years} {site.legalName}. <span data-field="footer_rights">{site.words.footer_rights}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-ink-muted transition hover:text-brand-600"
            >
              <span data-field="footer_staff_login">{site.words.footer_staff_login}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {site.footerNote && (
          <p data-field="sys_footer_note" className="border-t border-line py-4 text-xs text-ink-muted">{site.footerNote}</p>
        )}
      </div>
    </footer>
  );
}
