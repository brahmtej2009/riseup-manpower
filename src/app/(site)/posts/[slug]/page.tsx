import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Eye, User, ArrowLeft, ArrowRight, Pin, AlertTriangle, Tag } from 'lucide-react';
import {
  getPostBySlug,
  getAdjacentPosts,
  getPublishedPosts,
  incrementPostViews,
} from '@/lib/content';
import { getSiteInfo, getSettings, bool } from '@/lib/settings';
import { sanitizeHtml, htmlToText } from '@/lib/sanitize';
import { formatDate, parseJson } from '@/lib/utils';
import { PageHeader } from '@/components/site/PageHeader';
import { PostCard } from '@/components/cards';
import { PostFeed } from '@/components/PostTile';
import { FeedArticle } from '@/components/site/FeedArticle';
import { Reveal } from '@/components/ui/Reveal';
import { ShareRow } from '@/components/site/ShareRow';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = getPostBySlug(slug);
  if (!item) return { title: 'Post not found' };

  const description = item.excerpt || htmlToText(item.body_html, 160);

  return {
    title: item.title,
    description,
    openGraph: {
      type: 'article',
      title: item.title,
      description,
      publishedTime: item.published_at ?? item.created_at,
      images: item.cover_path ? [{ url: item.cover_path }] : undefined,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = getPostBySlug(slug);
  if (!item) notFound();

  incrementPostViews(item.id);

  const { prev, next } = getAdjacentPosts(slug);
  const related = getPublishedPosts(5).filter((a) => a.id !== item.id).slice(0, 4);
  const tags = parseJson<string[]>(item.tags, []);
  const site = getSiteInfo();

  // Sanitised again on the way out - the content in the database was cleaned
  // when it was saved, but this costs nothing and covers anything that got in
  // before a rule was tightened.
  const body = sanitizeHtml(item.body_html);

  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/posts/${item.slug}`;

  // The feed layout puts the picture beside the writing and gives the visitor
  // arrows to move straight to the post before or after this one.
  const s = getSettings();
  const square = bool(s, 'posts_square', true);

  const notice = (
    <>
      <PageHeader
        eyebrow={item.category}
        title={item.title}
        breadcrumbs={[
          { href: '/posts', label: 'Posts' },
          { href: `/posts/${item.slug}`, label: item.title },
        ]}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {formatDate(item.published_at || item.created_at)}
          </span>
          {item.author_name && (
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {item.author_name}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            {item.views} views
          </span>
          {item.pinned === 1 && (
            <span className="chip bg-surface-alt text-ink-soft ring-line-strong">
              <Pin className="h-3 w-3" strokeWidth={2.5} />
              Pinned
            </span>
          )}
        </div>
      </PageHeader>

      <article className="section-tight bg-surface">
        <div className="shell">
          <div className="mx-auto max-w-3xl">
            {item.urgent === 1 && (
              <Reveal className="mb-7">
                <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" strokeWidth={2.2} />
                  <p className="text-sm font-medium text-rose-900">
                    This is an urgent notice. Please act on it quickly, or call the office if anything
                    is unclear.
                  </p>
                </div>
              </Reveal>
            )}

            {item.cover_path && (
              <Reveal className="mb-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.cover_path}
                  alt=""
                  className="w-full rounded-2xl border border-line shadow-card"
                />
              </Reveal>
            )}

            {item.excerpt && (
              <Reveal>
                <p className="mb-8 border-l-4 border-brand-600 pl-5 text-lg font-medium leading-relaxed text-ink">
                  {item.excerpt}
                </p>
              </Reveal>
            )}

            <Reveal>
              <div className="prose-ru" dangerouslySetInnerHTML={{ __html: body }} />
            </Reveal>

            {tags.length > 0 && (
              <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-line pt-6">
                <Tag className="h-4 w-4 text-ink-muted" />
                {tags.map((tag) => (
                  <span key={tag} className="chip bg-surface-alt text-ink-soft ring-line">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <ShareRow url={shareUrl} title={item.title} />

            {/* Previous / next */}
            {(prev || next) && (
              <nav className="mt-10 grid gap-4 border-t border-line pt-8 sm:grid-cols-2">
                {prev ? (
                  <Link
                    href={`/posts/${prev.slug}`}
                    className="card-hover group flex flex-col gap-1 p-5"
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Newer
                    </span>
                    <span className="font-semibold leading-snug text-ink transition-colors group-hover:text-brand-700">
                      {prev.title}
                    </span>
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link
                    href={`/posts/${next.slug}`}
                    className="card-hover group flex flex-col items-end gap-1 p-5 text-right"
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                      Older
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-semibold leading-snug text-ink transition-colors group-hover:text-brand-700">
                      {next.title}
                    </span>
                  </Link>
                )}
              </nav>
            )}
          </div>

        </div>
      </article>
    </>
  );

  // Shown under either layout.
  const closing = (
    <>
      {/* One clear call to action, centred, after the notice has been read. */}
      <section className="panel-band border-y border-line py-[clamp(2.5rem,6vw,4rem)] text-center">
        <div className="shell mx-auto max-w-2xl">
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-panel">
            Interested in this?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-panel-soft">
            Register with us and our team will get in touch.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register/candidate"
              data-sheen
              className="inline-flex min-h-[3.25rem] items-center justify-center bg-brand-600 px-7 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-brand-700"
            >
              Register as a candidate
            </Link>
            <Link
              href="/register/employer"
              data-sheen
              className="inline-flex min-h-[3.25rem] items-center justify-center border-2 border-brand-600/40 px-7 text-sm font-bold uppercase tracking-wider text-panel transition hover:border-brand-600 hover:bg-brand-600 hover:text-white"
            >
              I need manpower
            </Link>
          </div>
          {site.phone && (
            <p className="mt-6 text-sm text-ink-muted">
              Or call{' '}
              <a
                href={`tel:${site.phone.replace(/[^\d+]/g, '')}`}
                className="font-semibold text-panel hover:underline"
              >
                {site.phone}
              </a>
            </p>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="section-tight bg-surface">
          <div className="shell">
            <h2 className="mb-8 text-center font-display text-xl font-bold uppercase tracking-tight">
              More posts
            </h2>
            {square ? (
              <PostFeed items={related} />
            ) : (
              <div className="grid gap-5 md:grid-cols-3">
                {related.map((r) => (
                  <PostCard key={r.id} item={r} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );

  if (square) {
    return (
      <>
        <FeedArticle
          item={item}
          body={body}
          tags={tags}
          prev={prev}
          next={next}
          shareUrl={shareUrl}
        />
        {closing}
      </>
    );
  }

  return (
    <>
      {notice}
      {closing}
    </>
  );
}
