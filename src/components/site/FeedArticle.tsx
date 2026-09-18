import Link from 'next/link';
import {
  Calendar, Eye, User, ChevronLeft, ChevronRight, Pin, AlertTriangle, Tag, ArrowLeft,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Reveal } from '@/components/ui/Reveal';
import { ShareRow } from '@/components/site/ShareRow';
import type { Post } from '@/lib/content';

/**
 * A post in the feed layout: the picture on the left, everything
 * written about it on the right.
 *
 * The arrows move to the post before or after this one, so a visitor
 * can work through the feed without going back to the grid each time. On a
 * phone the two halves stack, picture first, which is the same order.
 */
export function FeedArticle({
  item,
  body,
  tags,
  prev,
  next,
  shareUrl,
}: {
  item: Post;
  body: string;
  tags: string[];
  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
  shareUrl: string;
}) {
  const date = item.published_at || item.created_at;

  return (
    <article className="border-b border-line bg-surface-page">
      <div className="shell py-[clamp(1.5rem,3.5vh,2.75rem)]">
        {/* Back to the grid, kept small. */}
        <Link
          href="/posts"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" />
          All posts
        </Link>

        <div
          className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card
                     lg:h-[calc(100svh-var(--header-h)-9rem)] lg:min-h-[30rem]"
        >
          <div className="grid h-full lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            {/* ------------------------------------------------ picture */}
            <div className="relative flex min-h-0 items-center justify-center bg-navy-950 p-2 sm:p-3">
              {item.cover_path ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.cover_path}
                  alt=""
                  className="max-h-[58vh] w-auto max-w-full rounded-lg object-contain lg:max-h-full lg:h-auto"
                />
              ) : (
                <div className="grid aspect-square w-full place-items-center bg-[radial-gradient(ellipse_at_30%_20%,rgb(var(--brand-500)),rgb(var(--brand-800))_75%)] p-8 lg:aspect-auto lg:h-full">
                  <span className="dot-bg absolute inset-0 opacity-50" aria-hidden />
                  <span className="relative text-center font-display text-xl font-bold leading-snug text-white">
                    {item.title}
                  </span>
                </div>
              )}

              {/* Straight to the post either side of this one. */}
              {prev && (
                <Link
                  href={`/posts/${prev.slug}`}
                  title={prev.title}
                  aria-label={`Previous: ${prev.title}`}
                  className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/65"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              )}
              {next && (
                <Link
                  href={`/posts/${next.slug}`}
                  title={next.title}
                  aria-label={`Next: ${next.title}`}
                  className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/65"
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              )}
            </div>

            {/* ------------------------------------------------ the writing */}
            <div className="flex min-h-0 flex-col">
              <header className="shrink-0 border-b border-line px-5 py-3.5 sm:px-6">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="chip bg-brand-600/10 text-brand-600 ring-brand-600/20">
                    {item.category}
                  </span>
                  {item.urgent === 1 && (
                    <span className="chip bg-brand-600 text-white ring-brand-700/30">Urgent</span>
                  )}
                  {item.pinned === 1 && (
                    <span className="chip bg-surface-alt text-ink-soft ring-line-strong">
                      <Pin className="h-3 w-3" strokeWidth={2.5} />
                      Pinned
                    </span>
                  )}
                </div>

                <h1 className="font-display text-[clamp(1.125rem,1.7vw,1.4rem)] font-bold leading-snug tracking-tight text-ink">
                  {item.title}
                </h1>

                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                  <span>{formatDate(date)}</span>
                  {item.author_name && (
                    <>
                      <span aria-hidden>&middot;</span>
                      <span>{item.author_name}</span>
                    </>
                  )}
                  <span aria-hidden>&middot;</span>
                  <span>{item.views} views</span>
                </p>
              </header>

              {/* The caption and the full text, scrolling on their own on a
                  large screen so the picture stays put beside them. */}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                {item.urgent === 1 && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5">
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
                      strokeWidth={2.2}
                    />
                    <p className="text-[0.8125rem] font-medium text-rose-900">
                      This is an urgent notice. Please act on it quickly, or call the office if
                      anything is unclear.
                    </p>
                  </div>
                )}

                {item.excerpt && (
                  <p className="mb-5 border-l-4 border-brand-600 pl-4 text-[1.125rem] font-medium leading-relaxed text-ink">
                    {item.excerpt}
                  </p>
                )}

                <div
                  className="prose-ru text-[1.0625rem] leading-[1.8]"
                  dangerouslySetInnerHTML={{ __html: body }}
                />

                {tags.length > 0 && (
                  <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-line pt-5">
                    <Tag className="h-4 w-4 text-ink-muted" />
                    {tags.map((tag) => (
                      <span key={tag} className="chip bg-surface-alt text-ink-soft ring-line">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <footer className="shrink-0 border-t border-line px-5 py-3 sm:px-6">
                <ShareRow url={shareUrl} title={item.title} />
              </footer>
            </div>
          </div>
        </div>

        {/* The same two steps again, under the card, where a phone can reach
            them without the arrows sitting over the picture. */}
        {(prev || next) && (
          <Reveal className="mt-4 grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link
                href={`/posts/${prev.slug}`}
                className="card-hover group flex items-center gap-3 p-4"
              >
                <ChevronLeft className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:-translate-x-0.5" />
                <span className="min-w-0">
                  <span className="block text-[0.6875rem] uppercase tracking-wider text-ink-muted">
                    Previous
                  </span>
                  <span className="block truncate text-sm font-semibold text-ink">{prev.title}</span>
                </span>
              </Link>
            ) : (
              <span />
            )}

            {next && (
              <Link
                href={`/posts/${next.slug}`}
                className="card-hover group flex items-center justify-end gap-3 p-4 text-right"
              >
                <span className="min-w-0">
                  <span className="block text-[0.6875rem] uppercase tracking-wider text-ink-muted">
                    Next
                  </span>
                  <span className="block truncate text-sm font-semibold text-ink">{next.title}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </Reveal>
        )}
      </div>
    </article>
  );
}
