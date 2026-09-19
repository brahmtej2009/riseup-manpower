import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getPublishedPosts,
  countPublishedPosts,
  getPostCategories,
} from '@/lib/content';
import { getSettings, str, bool } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/site/PageHeader';
import { PostCard } from '@/components/cards';
import { PostFeed } from '@/components/PostTile';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';


export const metadata: Metadata = {
  title: 'Posts',
  description:
    'Job openings, walk-in interviews, notices and company updates from Rise Up Manpower.',
};

const PER_PAGE_CARDS = 9;
const PER_PAGE_FEED = 12;

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const category = params.category ?? 'all';
  const query = (params.q ?? '').trim();

  const s = getSettings();

  // The same posts, laid out either as a feed of squares or as the
  // wider notice cards. Chosen on the Themes screen.
  const square = bool(s, 'posts_square', true);
  const perPage = square ? PER_PAGE_FEED : PER_PAGE_CARDS;

  const items = getPublishedPosts(perPage, (page - 1) * perPage, category, query);
  const total = countPublishedPosts(category, query);
  const categories = getPostCategories();
  const pages = Math.max(1, Math.ceil(total / perPage));

  // Preserves the current filters when moving between pages.
  const linkTo = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { category, q: query, page, ...next };
    if (merged.category && merged.category !== 'all') sp.set('category', String(merged.category));
    if (merged.q) sp.set('q', String(merged.q));
    if (merged.page && Number(merged.page) > 1) sp.set('page', String(merged.page));
    const qs = sp.toString();
    return qs ? `/posts?${qs}` : '/posts';
  };

  return (
    <>
      <PageHeader
        title={str(s, 'posts_heading', 'Posts')}
        field="posts_heading"
        breadcrumbs={[{ href: '/posts', label: 'Posts' }]}
      />

      <section className="section-tight bg-surface-soft">
        <div className="shell">
          {/* Filters */}
          <Reveal className="mb-10 flex flex-col items-center gap-5">
            <form action="/posts" className="relative w-full max-w-md">
              {category !== 'all' && <input type="hidden" name="category" value={category} />}
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search posts"
                className="field h-12 pl-11 text-center"
                aria-label="Search posts"
              />
            </form>

            <div className="no-scrollbar -mx-1 flex max-w-full justify-start gap-2 overflow-x-auto px-1 pb-1 sm:justify-center">
              <Link
                href={linkTo({ category: 'all', page: 1 })}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition',
                  category === 'all'
                    ? 'bg-brand-600 text-white shadow-[0_4px_14px_-6px_rgb(var(--brand-600)/0.9)]'
                    : 'border border-line bg-surface text-ink-soft hover:border-line-strong'
                )}
              >
                All
                <span className="ml-1.5 opacity-60">{countPublishedPosts()}</span>
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.category}
                  href={linkTo({ category: c.category, page: 1 })}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition',
                    category === c.category
                      ? 'bg-brand-600 text-white shadow-[0_4px_14px_-6px_rgb(var(--brand-600)/0.9)]'
                      : 'border border-line bg-surface text-ink-soft hover:border-line-strong'
                  )}
                >
                  {c.category}
                  <span className="ml-1.5 opacity-60">{c.count}</span>
                </Link>
              ))}
            </div>
          </Reveal>

          {items.length === 0 ? (
            <Reveal>
              <div className="card grid place-items-center px-6 py-16 text-center">
                <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-surface-alt text-ink-muted">
                  <Megaphone className="h-6 w-6" />
                </span>
                <h2 className="font-display text-lg font-semibold">Nothing found</h2>
                <p className="mt-2 max-w-sm text-ink-soft">
                  {query || category !== 'all'
                    ? 'No post matches that search. Try a different word, or clear the filters.'
                    : 'There are no posts at the moment. Please check back soon.'}
                </p>
                {(query || category !== 'all') && (
                  <Link href="/posts" className="btn-outline btn-sm mt-5">
                    Clear filters
                  </Link>
                )}
              </div>
            </Reveal>
          ) : (
            <>
              {square ? (
                <Reveal>
                  <PostFeed
                    items={items}
                    showMeta={bool(s, 'posts_show_meta', true)}
                  />
                </Reveal>
              ) : (
                <>
                  {/* The newest item gets a wider card on the first page. */}
                  {page === 1 && items.length > 2 && (
                    <Reveal className="mb-5">
                      <PostCard item={items[0]} featured />
                    </Reveal>
                  )}

                  <RevealGroup className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {(page === 1 && items.length > 2 ? items.slice(1) : items).map((a) => (
                      <RevealItem key={a.id}>
                        <PostCard item={a} />
                      </RevealItem>
                    ))}
                  </RevealGroup>
                </>
              )}
            </>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
              <Link
                href={linkTo({ page: page - 1 })}
                aria-disabled={page === 1}
                className={cn('btn-outline btn-sm', page === 1 && 'pointer-events-none opacity-40')}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>

              <div className="flex gap-1">
                {Array.from({ length: pages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1)
                  .map((p, i, arr) => (
                    <span key={p} className="flex items-center gap-1">
                      {i > 0 && arr[i - 1] !== p - 1 && (
                        <span className="px-1 text-ink-muted">…</span>
                      )}
                      <Link
                        href={linkTo({ page: p })}
                        aria-current={p === page ? 'page' : undefined}
                        className={cn(
                          'grid h-9 w-9 place-items-center rounded-lg text-sm font-medium transition',
                          p === page
                            ? 'bg-brand-600 text-white'
                            : 'border border-line bg-surface text-ink-soft hover:border-line-strong'
                        )}
                      >
                        {p}
                      </Link>
                    </span>
                  ))}
              </div>

              <Link
                href={linkTo({ page: page + 1 })}
                aria-disabled={page === pages}
                className={cn('btn-outline btn-sm', page === pages && 'pointer-events-none opacity-40')}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
