import type { Metadata } from 'next';
import { Phone, Mail, Clock } from 'lucide-react';
import { getSettings, getSiteInfo, str, list } from '@/lib/settings';
import { telLink } from '@/lib/utils';
import { PageHeader } from '@/components/site/PageHeader';
import { EmployerForm } from '@/components/forms/EmployerForm';
import { Reveal } from '@/components/ui/Reveal';

export const metadata: Metadata = {
  title: 'Register as an employer',
  description: 'Send us your manpower requirement and our team will contact you.',
};

export default function EmployerRegisterPage() {
  const s = getSettings();
  const site = getSiteInfo();

  return (
    <>
      <PageHeader
        title={site.words.register_employer_heading}
        field="register_employer_heading"
        breadcrumbs={[{ href: '/register/employer', label: 'For employers' }]}
      />

      <section className="section-tight bg-surface-soft">
        <div className="shell">
          <div className="mx-auto max-w-3xl">
            <EmployerForm
              options={{
                industries: list(s, 'opt_industries'),
                states: list(s, 'opt_states'),
                jobCategories: list(s, 'opt_job_categories'),
                skillLevels: list(s, 'opt_skill_levels'),
                shifts: list(s, 'opt_shifts'),
                urgency: list(s, 'opt_urgency'),
                note: str(s, 'form_employer_note'),
                successMessage: str(
                  s,
                  'form_success_message',
                  'Thank you. Your details have been received and our team will contact you.'
                ),
              }}
            />
          </div>

          {/* Kept below the form rather than beside it, so the form has the
              whole width and the page has one thing to look at. */}
          <Reveal className="mx-auto mt-8 max-w-3xl">
            <div className="card flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-center sm:gap-8 sm:text-left">
              <p className="font-display text-base font-semibold text-ink">
                Would you rather call?
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
                {site.phone && (
                  <a
                    href={telLink(site.phone)}
                    className="inline-flex items-center gap-2 font-medium text-ink transition hover:text-brand-700"
                  >
                    <Phone className="h-4 w-4 text-brand-600" strokeWidth={2.2} />
                    {site.phone}
                  </a>
                )}
                {(site.email) && (
                  <a
                    href={`mailto:${site.email}`}
                    className="inline-flex items-center gap-2 break-all text-ink transition hover:text-brand-700"
                  >
                    <Mail className="h-4 w-4 text-brand-600" strokeWidth={2.2} />
                    {site.email}
                  </a>
                )}
                {(site.workingDays || site.workingHours) && (
                  <span className="inline-flex items-center gap-2 text-ink-muted">
                    <Clock className="h-4 w-4 text-brand-600" strokeWidth={2.2} />
                    {[site.workingDays, site.workingHours].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
