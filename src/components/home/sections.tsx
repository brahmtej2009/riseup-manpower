import Link from 'next/link';
import { ArrowRight, Check, Users, Briefcase } from 'lucide-react';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { TeamCard, PostCard, SERVICE_ICONS, serviceTone } from '@/components/cards';
import { SocialIcon } from '@/components/site/SocialIcon';
import { Tilt } from '@/components/ui/Pointer';
import { GalleryGrid } from './Gallery';
import { PostFeed } from '@/components/PostTile';
import { cn } from '@/lib/utils';
import type { TeamMember, Post, Service, GalleryPhoto } from '@/lib/content';
import type { SocialPost } from '@/lib/social';
import type { SiteInfo } from '@/lib/settings';

/** Heading used at the top of each section on the home page. */
export function SectionHeading({
  title,
  intro,
  align = 'left',
  action,
  field,
  introField,
}: {
  title: string;
  intro?: string;
  align?: 'left' | 'center';
  action?: { href: string; label: string; field?: string };
  /** Setting key, so the heading can be edited straight from the preview. */
  field?: string;
  introField?: string;
}) {
  return (
    <div
      className={cn(
        'mb-9 flex flex-col gap-4',
        align === 'center'
          ? 'items-center text-center'
          : 'sm:flex-row sm:items-end sm:justify-between'
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'flex flex-col items-center')}>
        <h2
          data-field={field}
          className="font-display text-[clamp(1.5rem,3vw,2.25rem)] font-bold uppercase leading-tight tracking-tight text-ink"
        >
          {title}
        </h2>
        <span className={cn('accent-rule mt-4', align === 'center' && 'mx-auto')} aria-hidden />
        {intro && (
          <p data-field={introField} className="mt-4 leading-relaxed text-ink-soft">
            {intro}
          </p>
        )}
      </div>

      {action && (
        <Link href={action.href} className="btn-outline btn-sm shrink-0 self-start sm:self-auto">
          <span data-field={action.field}>{action.label}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// What we do

/**
 * The services, laid out as a masonry.
 *
 * A plain grid forces every card to the height of the tallest one in its row,
 * which leaves ragged gaps under the short ones. CSS columns let each card be
 * exactly as tall as its own content and the next card start straight
 * underneath, so a service with two key points sits happily beside one with
 * five. `break-inside-avoid` is what stops a card being split down the middle
 * across two columns.
 */
export function ServicesSection({
  services,
  heading,
  intro,
}: {
  services: Service[];
  heading: string;
  intro?: string;
}) {
  if (!services.length) return null;

  return (
    <section className="section-tight relative isolate overflow-hidden border-t border-line bg-surface-page">
      <span className="aurora -right-32 top-10 h-80 w-80 bg-brand-600/[0.14]" aria-hidden />

      <div className="shell relative">
        <Reveal>
          <SectionHeading
            title={heading}
            intro={intro}
            align="center"
            field="services_heading"
            introField="services_intro"
          />
        </Reveal>

        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {services.map((service, i) => {
            const Icon = SERVICE_ICONS[service.icon] ?? Briefcase;
            const tone = serviceTone(i);

            return (
              <Reveal
                key={service.id}
                delay={Math.min(i, 7) * 0.05}
                className="mb-4 break-inside-avoid"
              >
                <Tilt strength={3} lift={4}>
                  <article
                    data-sheen="ink"
                    className="card group flex flex-col p-6 transition-all duration-300
                               hover:-translate-y-1 hover:border-brand-600/40 hover:shadow-lift"
                  >
                    <span
                      className={cn(
                        'mb-4 grid h-12 w-12 place-items-center rounded-2xl transition-colors duration-300',
                        tone.soft,
                        tone.solid
                      )}
                    >
                      <Icon className="h-[1.375rem] w-[1.375rem]" strokeWidth={2} />
                    </span>

                    <h3 className="font-display text-[1.0625rem] font-semibold leading-snug text-ink">
                      {service.title}
                    </h3>

                    {service.summary && (
                      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{service.summary}</p>
                    )}

                    {service.points.length > 0 && (
                      <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-[0.8125rem] text-ink-soft">
                        {service.points.map((point) => (
                          <li key={point} className="flex items-start gap-2">
                            <Check
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500"
                              strokeWidth={2.6}
                            />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                </Tilt>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function GallerySection({
  photos,
  heading,
  intro,
}: {
  photos: GalleryPhoto[];
  heading: string;
  intro?: string;
}) {
  if (!photos.length) return null;

  return (
    <section className="section-tight border-t border-line bg-surface-soft">
      <div className="shell">
        <Reveal>
          <SectionHeading
            title={heading}
            intro={intro}
            align="center"
            field="gallery_heading"
            introField="gallery_intro"
          />
        </Reveal>

        <GalleryGrid photos={photos} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function PostsSection({
  items,
  heading,
  square = true,
  showMeta = true,
  seeAll = 'See all',
}: {
  items: Post[];
  heading: string;
  seeAll?: string;
  /** Square feed tiles, or the wider notice cards. Set on the Themes screen. */
  square?: boolean;
  showMeta?: boolean;
}) {
  if (!items.length) return null;

  return (
    <section className="section-tight border-t border-line bg-surface-soft">
      <div className="shell">
        <Reveal>
          <SectionHeading
            title={heading}
            field="posts_heading"
            action={{ href: '/posts', label: seeAll, field: 'posts_see_all' }}
          />
        </Reveal>

        {square ? (
          <Reveal>
            <PostFeed items={items} showMeta={showMeta} />
          </Reveal>
        ) : (
          <RevealGroup className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <RevealItem key={a.id}>
                <PostCard item={a} />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function TeamSection({
  team,
  heading,
  intro,
  limit = 6,
  showAllLink = true,
  seeAll = 'See the team',
}: {
  seeAll?: string;
  team: TeamMember[];
  heading: string;
  intro?: string;
  limit?: number;
  showAllLink?: boolean;
}) {
  if (!team.length) return null;
  const shown = team.slice(0, limit);

  return (
    <section className="section-tight border-t border-line bg-surface-page">
      <div className="shell">
        <Reveal>
          <SectionHeading
            title={heading}
            intro={intro}
            field="team_heading"
            introField="team_intro"
            action={
              showAllLink && team.length > limit
                ? { href: '/team', label: seeAll, field: 'team_see_all' }
                : undefined
            }
          />
        </Reveal>

        {/*
          A real horizontal scroller on phones. The children must not shrink,
          which is what `shrink-0` on the item does - without it flexbox
          squeezes them all onto one screen and nothing scrolls.
        */}
        <RevealGroup
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2
                     sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0
                     lg:grid-cols-6"
          stagger={0.06}
        >
          {shown.map((m) => (
            <RevealItem key={m.id} className="w-[9.5rem] shrink-0 snap-start sm:w-auto">
              <TeamCard member={m} compact />
            </RevealItem>
          ))}
        </RevealGroup>

        {team.length > 1 && (
          <p className="mt-3 text-center text-xs text-ink-muted sm:hidden">Swipe to see more</p>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

/** The last thing on the home page: the two choices again, plainly. */
export function ClosingSection({ site, heading }: { site: SiteInfo; heading: string }) {
  return (
    <section className="panel-band relative isolate overflow-hidden border-t border-line">
      <div className="dot-bg absolute inset-0 -z-10 opacity-60" aria-hidden />
      <span className="aurora -left-24 bottom-[-6rem] h-72 w-72 bg-brand-600/20" aria-hidden />

      <div className="shell section-tight relative text-center">
        <Reveal>
          <h2
            data-field="cta_heading"
            className="mx-auto max-w-2xl font-display text-[clamp(1.5rem,3vw,2.25rem)] font-bold uppercase leading-tight tracking-tight text-panel"
          >
            {heading}
          </h2>
          <span className="accent-rule mx-auto mt-5" aria-hidden />

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register/employer"
              data-sheen
              className="group inline-flex min-h-[3.4rem] items-center justify-center gap-3 rounded-2xl bg-brand-600 px-8 text-sm font-bold uppercase tracking-wider text-white shadow-glow transition hover:bg-brand-700"
            >
              <Briefcase className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.2} />
              I need manpower
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/register/candidate"
              data-sheen="ink"
              className="inline-flex min-h-[3.4rem] items-center justify-center gap-3 rounded-2xl border-2 border-line-strong bg-surface px-8 text-sm font-bold uppercase tracking-wider text-ink transition hover:border-brand-600 hover:text-brand-600"
            >
              <Users className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.2} />
              I am looking for a job
            </Link>
          </div>

          {site.phone && (
            <p className="mt-7 text-sm text-ink-muted">
              Or call{' '}
              <a
                href={`tel:${site.phone.replace(/[^\d+]/g, '')}`}
                className="font-semibold text-ink hover:text-brand-600"
              >
                {site.phone}
              </a>
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function SocialSection({
  site,
  heading,
  posts = [],
}: {
  site: SiteInfo;
  heading: string;
  /**
   * The company's own recent posts. Shown as a strip beside the follow
   * buttons when the Instagram feed is not connected, so the section still
   * has something in it rather than being a bare row of icons.
   */
  posts?: Post[];
}) {
  if (!site.social.length && !posts.length) return null;

  const strip = posts.slice(0, 6);

  return (
    <section className="section-tight border-t border-line bg-surface-page">
      <div className="shell">
        <Reveal>
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <h2 data-field="social_heading" className="font-display text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold uppercase tracking-tight text-ink">
              {heading}
            </h2>
            <span className="accent-rule" aria-hidden />
          </div>
        </Reveal>

        {strip.length > 0 && (
          <RevealGroup
            className="mb-8 grid grid-cols-3 gap-2.5 sm:grid-cols-6"
            stagger={0.05}
          >
            {strip.map((post) => (
              <RevealItem key={post.id}>
                <Link
                  href={`/posts/${post.slug}`}
                  className="group relative block aspect-square overflow-hidden rounded-xl border border-line bg-surface-alt"
                  aria-label={post.title}
                >
                  {post.cover_path ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={post.cover_path}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center bg-[radial-gradient(ellipse_at_30%_20%,rgb(var(--brand-500)),rgb(var(--brand-800))_75%)] p-2 text-center text-[0.6875rem] font-semibold leading-tight text-white">
                      {post.title.slice(0, 40)}
                    </span>
                  )}
                  <span
                    className="absolute inset-0 bg-navy-950/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  />
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          {site.social.map((sn) => (
            <a
              key={sn.key}
              href={sn.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2.5 rounded-xl border border-line bg-surface
                         px-5 py-3 text-sm font-medium text-ink-soft transition-all duration-300
                         hover:-translate-y-0.5 hover:border-brand-600 hover:text-brand-600 hover:shadow-card"
            >
              <SocialIcon name={sn.key} className="h-5 w-5" />
              {sn.name}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

/** Recent posts pulled in from Instagram. Hidden entirely if none come back. */
export function SocialFeedSection({ posts, heading }: { posts: SocialPost[]; heading: string }) {
  if (!posts.length) return null;

  return (
    <section className="section-tight border-t border-line bg-surface-page">
      <div className="shell">
        <Reveal>
          <SectionHeading title={heading} field="social_feed_heading" />
        </Reveal>

        <RevealGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" stagger={0.05}>
          {posts.map((post) => (
            <RevealItem key={post.id}>
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block aspect-square overflow-hidden rounded-xl border border-line bg-surface-alt"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image}
                  alt={post.caption.slice(0, 120) || 'Social media post'}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {post.caption && (
                  <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-navy-950/90 to-transparent px-3 pb-2.5 pt-8 text-[0.6875rem] leading-snug text-white opacity-0 transition group-hover:opacity-100">
                    {post.caption}
                  </span>
                )}
              </a>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
