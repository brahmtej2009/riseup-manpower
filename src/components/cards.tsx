import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, Users, Sparkles, ShieldCheck, Factory, Wrench, Truck,
  Building2, FileCheck, Briefcase, HardHat, Warehouse, UtensilsCrossed, Stethoscope,
  ShoppingBag, Laptop, Calendar, Eye, Pin, Mail, Phone, Check,
  Wallet, ClipboardList, Headset, GraduationCap, PackageCheck, Plug, Hammer,
  Forklift, Bus, Boxes, ScrollText, UserCheck, Building, SprayCan,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn, formatDate, initials, truncate } from '@/lib/utils';
import type { Service, TeamMember, Post } from '@/lib/content';
import { SocialIcon } from './site/SocialIcon';
import { Tilt } from './ui/Pointer';

/** Icons selectable for a service in the admin panel. */
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  // Staffing
  Users, UserCheck, Briefcase, GraduationCap, Headset, ClipboardList,
  // Industrial and trades
  Factory, HardHat, Wrench, Hammer, Plug, Forklift, Warehouse, Boxes, PackageCheck,
  // Services
  Sparkles, SprayCan, ShieldCheck, Truck, Bus, UtensilsCrossed, Stethoscope,
  ShoppingBag, Laptop,
  // Office and compliance
  Building2, Building, FileCheck, ScrollText, Wallet,
};

export const SERVICE_ICON_NAMES = Object.keys(SERVICE_ICONS);

/**
 * The tints a service card can take.
 *
 * A grid of identical blue cards reads as a template. Each service is given
 * one of these instead, chosen by its position so the run of colour is even
 * and stays the same every time the page is drawn.
 *
 * The shades are deliberately mid-range rather than light or dark, so the same
 * class is legible on a white card and on a dark one. That avoids needing a
 * dark: variant here, which would otherwise also fire inside the admin panel
 * whenever the public site was left in dark mode.
 */
export const SERVICE_TONES = [
  { soft: 'bg-brand-600/12 text-brand-500', solid: 'group-hover:bg-brand-600 group-hover:text-white' },
  { soft: 'bg-teal-500/14 text-teal-500', solid: 'group-hover:bg-teal-600 group-hover:text-white' },
  { soft: 'bg-amber-500/16 text-amber-500', solid: 'group-hover:bg-amber-500 group-hover:text-ink' },
  { soft: 'bg-indigo-500/14 text-indigo-400', solid: 'group-hover:bg-indigo-500 group-hover:text-white' },
  { soft: 'bg-emerald-500/14 text-emerald-500', solid: 'group-hover:bg-emerald-600 group-hover:text-white' },
  { soft: 'bg-sky-500/14 text-sky-500', solid: 'group-hover:bg-sky-600 group-hover:text-white' },
] as const;

export const serviceTone = (index: number) => SERVICE_TONES[index % SERVICE_TONES.length];

// ---------------------------------------------------------------------------

export function ServiceCard({ service, detailed = false }: { service: Service; detailed?: boolean }) {
  const Icon = SERVICE_ICONS[service.icon] ?? Briefcase;

  return (
    <Tilt strength={4} lift={5} className="h-full">
    <article
      id={service.slug}
      className="card group relative flex h-full scroll-mt-28 flex-col p-6 transition-shadow duration-300 hover:shadow-lift"
      data-sheen="ink"
    >
      <span
        className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-brand-600/10 text-brand-700
                   transition-colors duration-300 group-hover:bg-brand-600 group-hover:text-white"
      >
        <Icon className="h-[1.375rem] w-[1.375rem]" strokeWidth={2} />
      </span>

      <h3 className="font-display text-lg font-semibold text-ink">{service.title}</h3>
      <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-ink-soft">
        {detailed && service.description ? service.description : service.summary}
      </p>

      {service.points.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
          {service.points.slice(0, detailed ? 8 : 3).map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-ink-soft">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.6} />
              {point}
            </li>
          ))}
        </ul>
      )}

      {!detailed && (
        <Link
          href={`/services#${service.slug}`}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700
                     transition-colors hover:text-brand-800"
        >
          Read more
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </article>
    </Tilt>
  );
}

// ---------------------------------------------------------------------------

export function TeamCard({ member, compact = false }: { member: TeamMember; compact?: boolean }) {
  return (
    <Tilt strength={5} lift={6}>
    <article className={cn('group text-center', compact ? 'w-full' : '')}>
      <div
        className="pan-frame relative mx-auto mb-4 aspect-square w-full max-w-[13rem] overflow-hidden
                   rounded-2xl border border-line bg-surface-alt shadow-card transition-shadow
                   duration-300 group-hover:shadow-lift"
      >
        {member.photo_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.photo_path}
            alt={member.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-600 to-brand-800 font-display text-3xl font-bold text-white">
            {initials(member.name)}
          </span>
        )}

        {/* The role rises over the photograph while it is pointed at. */}
        {member.designation && (
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t
                       from-navy-950/95 to-transparent px-3 pb-2.5 pt-8 text-[0.6875rem] font-medium
                       uppercase tracking-wider text-white transition-transform duration-300
                       group-hover:translate-y-0"
          >
            {member.designation}
          </span>
        )}
      </div>

      <h3 className="font-display text-[0.9375rem] font-semibold leading-snug text-ink sm:text-base">
        {member.name}
      </h3>
      {member.designation && (
        <p className="mt-0.5 text-[0.8125rem] font-medium text-brand-700">{member.designation}</p>
      )}
      {!compact && member.bio && (
        <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-ink-muted">
          {member.bio}
        </p>
      )}

      {!compact && (member.email || member.phone || member.linkedin) && (
        <div className="mt-3 flex justify-center gap-2">
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              aria-label={`Email ${member.name}`}
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted transition hover:border-brand-300 hover:text-brand-700"
            >
              <Mail className="h-4 w-4" />
            </a>
          )}
          {member.phone && (
            <a
              href={`tel:${member.phone.replace(/[^\d+]/g, '')}`}
              aria-label={`Call ${member.name}`}
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted transition hover:border-brand-300 hover:text-brand-700"
            >
              <Phone className="h-4 w-4" />
            </a>
          )}
          {member.linkedin && (
            <a
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${member.name} on LinkedIn`}
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-ink-muted transition hover:border-brand-300 hover:text-brand-700"
            >
              <SocialIcon name="linkedin" className="h-4 w-4" />
            </a>
          )}
        </div>
      )}
    </article>
    </Tilt>
  );
}

// ---------------------------------------------------------------------------

export function PostCard({
  item,
  featured = false,
}: {
  item: Post;
  featured?: boolean;
}) {
  return (
    <Tilt strength={featured ? 2 : 4} lift={5} className="h-full">
    <article
      className={cn(
        'card group flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-lift',
        featured && 'sm:flex-row'
      )}
    >
      <Link
        href={`/posts/${item.slug}`}
        className={cn(
          'pan-frame relative block shrink-0 bg-surface-alt',
          featured ? 'sm:w-[45%]' : ''
        )}
      >
        {item.cover_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.cover_path}
            alt=""
            loading="lazy"
            className={cn(
              'w-full object-cover',
              featured ? 'h-52 sm:h-full sm:min-h-[15rem]' : 'aspect-[16/9]'
            )}
          />
        ) : (
          <span
            className={cn(
              'grid w-full place-items-center bg-gradient-to-br from-brand-600 to-brand-800',
              featured ? 'h-52 sm:h-full sm:min-h-[15rem]' : 'aspect-[16/9]'
            )}
          >
            <span className="dot-bg absolute inset-0 opacity-60" aria-hidden />
            <span className="relative px-6 text-center font-display text-lg font-bold text-white/90">
              {truncate(item.title, 52)}
            </span>
          </span>
        )}

        {(item.urgent === 1 || item.pinned === 1) && (
          <span className="absolute left-3 top-3 flex gap-1.5">
            {item.urgent === 1 && (
              <span className="chip bg-rose-600 text-white ring-rose-700/30">Urgent</span>
            )}
            {item.pinned === 1 && (
              <span className="chip bg-surface/95 text-ink ring-line">
                <Pin className="h-3 w-3" strokeWidth={2.5} />
                Pinned
              </span>
            )}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="chip bg-brand-50 text-brand-700 ring-brand-600/15">{item.category}</span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(item.published_at || item.created_at)}
          </span>
          {item.views > 0 && (
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {item.views}
            </span>
          )}
        </div>

        <h3
          className={cn(
            'font-display font-semibold leading-snug text-ink transition-colors group-hover:text-brand-700',
            featured ? 'text-xl sm:text-2xl' : 'text-[1.0625rem]'
          )}
        >
          <Link href={`/posts/${item.slug}`}>{item.title}</Link>
        </h3>

        {item.excerpt && (
          <p className="mt-2 flex-1 text-[0.9375rem] leading-relaxed text-ink-soft">
            {truncate(item.excerpt, featured ? 220 : 140)}
          </p>
        )}

        <Link
          href={`/posts/${item.slug}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          Read the full notice
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </article>
    </Tilt>
  );
}
