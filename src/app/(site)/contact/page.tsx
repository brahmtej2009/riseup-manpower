import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Phone, Mail, Clock, ArrowRight, Briefcase, UserRound } from 'lucide-react';
import { getSiteInfo } from '@/lib/settings';
import { telLink, whatsappLink } from '@/lib/utils';
import { PageHeader } from '@/components/site/PageHeader';
import { ContactForm } from '@/components/forms/ContactForm';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { SocialIcon } from '@/components/site/SocialIcon';
import { Tilt } from '@/components/ui/Pointer';

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'Office address, phone numbers and email.',
};

export default function ContactPage() {
  const site = getSiteInfo();

  const details = [
    site.address.length > 0 && {
      icon: MapPin,
      label: 'Office',
      lines: [site.address.join(', ')],
    },
    site.phone && {
      icon: Phone,
      label: 'Phone',
      lines: [site.phone, site.phone2].filter(Boolean) as string[],
      hrefs: [telLink(site.phone), site.phone2 ? telLink(site.phone2) : ''],
    },
    site.email && {
      icon: Mail,
      label: 'Email',
      lines: [site.email, site.emailHr].filter(Boolean) as string[],
      hrefs: [`mailto:${site.email}`, site.emailHr ? `mailto:${site.emailHr}` : ''],
    },
    (site.workingDays || site.workingHours) && {
      icon: Clock,
      label: 'Open',
      lines: [site.workingDays, site.workingHours].filter(Boolean) as string[],
    },
  ].filter(Boolean) as {
    icon: typeof MapPin;
    label: string;
    lines: string[];
    hrefs?: string[];
  }[];

  return (
    <>
      <PageHeader title="Get in touch" breadcrumbs={[{ href: '/contact', label: 'Contact' }]} />

      {/* The form and the contact details side by side, so a visitor sees
          both without scrolling. The form leads, because sending a message is
          what most people came to do. */}
      <section className="section-tight bg-surface-soft">
        <div className="shell">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-8">
            {/* -------------------------------------------------- the form */}
            <Reveal>
              <ContactForm />
            </Reveal>

            {/* ------------------------------------------- how to reach us */}
            <div className="flex flex-col gap-4">
              <RevealGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1" stagger={0.06}>
                {details.map((item) => (
                  <RevealItem key={item.label}>
                    <div className="card flex h-full items-start gap-3.5 p-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600/10 text-brand-600">
                        <item.icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.15em] text-ink-muted">
                          {item.label}
                        </span>
                        <span className="mt-1 block space-y-0.5 text-[0.9375rem] leading-relaxed text-ink">
                          {item.lines.map((line, i) =>
                            item.hrefs?.[i] ? (
                              <a
                                key={line}
                                href={item.hrefs[i]}
                                className="block break-words font-medium transition hover:text-brand-600"
                              >
                                {line}
                              </a>
                            ) : (
                              <span key={line} className="block break-words">
                                {line}
                              </span>
                            )
                          )}
                        </span>
                      </span>
                    </div>
                  </RevealItem>
                ))}
              </RevealGroup>

              {site.whatsapp && (
                <Reveal>
                  <a
                    href={whatsappLink(
                      site.whatsapp,
                      `Hello ${site.name}, I would like to enquire about `
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-sheen
                    className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-emerald-500"
                  >
                    <SocialIcon name="whatsapp" className="h-5 w-5" />
                    Message on WhatsApp
                  </a>
                </Reveal>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Where to go instead, if a form is the wrong thing. */}
      <section className="section-tight border-t border-line bg-surface">
        <div className="shell">
          <RevealGroup className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2" stagger={0.08}>
            {[
              {
                href: '/register/employer',
                icon: Briefcase,
                title: 'I need manpower',
                text: 'Send a staffing requirement',
              },
              {
                href: '/register/candidate',
                icon: UserRound,
                title: 'I am looking for a job',
                text: 'Register as a candidate',
              },
            ].map((item) => (
              <RevealItem key={item.href}>
                <Tilt strength={4} lift={5}>
                  <Link
                    href={item.href}
                    data-sheen="ink"
                    className="card group flex h-full flex-col items-center gap-3 p-7 text-center transition-shadow duration-300 hover:shadow-lift"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600/10 text-brand-700 transition-colors duration-300 group-hover:bg-brand-600 group-hover:text-white">
                      <item.icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="font-display text-base font-semibold text-ink">
                      {item.title}
                    </span>
                    <span className="text-sm text-ink-soft">{item.text}</span>
                    <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                      Continue
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </Tilt>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {site.mapEmbed && (
        <section className="border-t border-line">
          <div
            className="[&_iframe]:block [&_iframe]:h-[24rem] [&_iframe]:w-full [&_iframe]:border-0"
            // The embed code is entered by an administrator in Settings.
            dangerouslySetInnerHTML={{ __html: site.mapEmbed }}
          />
        </section>
      )}
    </>
  );
}
