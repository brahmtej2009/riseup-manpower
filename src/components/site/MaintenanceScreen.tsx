import { Phone, Mail, Wrench } from 'lucide-react';
import { telLink } from '@/lib/utils';
import type { SiteInfo } from '@/lib/settings';

/** Shown to visitors while maintenance mode is switched on in Settings. */
export function MaintenanceScreen({ site }: { site: SiteInfo }) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface-soft px-5 py-16">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto mb-6 grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-brand-600 text-white">
          {site.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={site.logo} alt="" className="h-full w-full object-cover" />
          ) : (
            <Wrench className="h-7 w-7" />
          )}
        </span>

        <h1 className="font-display text-2xl font-bold text-ink">{site.name}</h1>
        <p className="mt-3 leading-relaxed text-ink-soft">
          {site.maintenanceText || 'We are carrying out scheduled maintenance. Please check back shortly.'}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {site.phone && (
            <a href={telLink(site.phone)} className="btn-primary btn-sm">
              <Phone className="h-4 w-4" />
              {site.phone}
            </a>
          )}
          {site.email && (
            <a href={`mailto:${site.email}`} className="btn-outline btn-sm">
              <Mail className="h-4 w-4" />
              Email us
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
