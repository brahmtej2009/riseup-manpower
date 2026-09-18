import Link from 'next/link';
import { Megaphone, Plus, Eye, Pin, AlertTriangle, Copy, ExternalLink, Pencil } from 'lucide-react';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { formatDate, timeAgo, truncate, cn } from '@/lib/utils';
import {
  PageTitle, Panel, StatusBadge, EmptyState, SearchBox, Pagination, TabLinks,
} from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/BulkForm';
import { SubmitButton } from '@/components/admin/interactive';
import { togglePublish, toggleFlag, duplicatePost } from './actions';

export const metadata = { title: 'Posts' };

const PER_PAGE = 20;

interface Row {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  cover_path: string | null;
  category: string;
  status: string;
  pinned: number;
  urgent: number;
  views: number;
  published_at: string | null;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const user = await requirePermission('posts.view');
  const params = await searchParams;

  const status = params.status ?? 'all';
  const query = (params.q ?? '').trim();
  const page = Math.max(1, Number(params.page) || 1);

  const where: string[] = [];
  const args: unknown[] = [];

  if (status !== 'all') {
    where.push('status = ?');
    args.push(status);
  }
  if (query) {
    where.push('(title LIKE ? OR excerpt LIKE ? OR category LIKE ?)');
    const like = `%${query}%`;
    args.push(like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.scalar<number>(`SELECT COUNT(*) AS n FROM posts ${whereSql}`, args) ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.min(page, pages);

  const rows = db.all<Row>(
    `SELECT id, slug, title, excerpt, cover_path, category, status, pinned, urgent, views,
            published_at, author_name, created_at, updated_at
       FROM posts ${whereSql}
      ORDER BY pinned DESC, COALESCE(published_at, created_at) DESC
      LIMIT ? OFFSET ?`,
    [...args, PER_PAGE, (safePage - 1) * PER_PAGE]
  );

  const counts = {
    all: db.scalar<number>('SELECT COUNT(*) AS n FROM posts') ?? 0,
    published: db.scalar<number>("SELECT COUNT(*) AS n FROM posts WHERE status = 'published'") ?? 0,
    draft: db.scalar<number>("SELECT COUNT(*) AS n FROM posts WHERE status = 'draft'") ?? 0,
  };

  const link = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = { status, q: query, page: safePage, ...next };
    if (merged.status && merged.status !== 'all') sp.set('status', String(merged.status));
    if (merged.q) sp.set('q', String(merged.q));
    if (merged.page && Number(merged.page) > 1) sp.set('page', String(merged.page));
    const qs = sp.toString();
    return qs ? `/admin/posts?${qs}` : '/admin/posts';
  };

  return (
    <>
      <PageTitle
        title="Posts"
        subtitle="Notices, openings and updates shown on the website."
        actions={
          can(user, 'posts.create') && (
            <Link href="/admin/posts/new" className="btn-primary btn-sm">
              <Plus className="h-4 w-4" />
              Write a post
            </Link>
          )
        }
      />

      <TabLinks
        current={status}
        tabs={[
          { key: 'all', label: 'All', count: counts.all, href: link({ status: 'all', page: 1 }) },
          { key: 'published', label: 'Live on the site', count: counts.published, href: link({ status: 'published', page: 1 }) },
          { key: 'draft', label: 'Drafts', count: counts.draft, href: link({ status: 'draft', page: 1 }) },
        ]}
      />

      <Panel
        bodyClassName=""
        actions={
          <SearchBox
            action="/admin/posts"
            placeholder="Search by title…"
            defaultValue={query}
            hidden={{ status: status !== 'all' ? status : undefined }}
            className="w-full sm:w-64"
          />
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={query ? 'Nothing matches that search' : 'No posts yet'}
            description={
              query
                ? 'Try a different word.'
                : 'Posts appear on the home page and on the posts page.'
            }
            action={
              can(user, 'posts.create') && (
                <Link href="/admin/posts/new" className="btn-primary btn-sm">
                  <Plus className="h-4 w-4" />
                  Write the first one
                </Link>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                <Link
                  href={`/admin/posts/${row.id}`}
                  className="block h-20 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-16 sm:w-28"
                >
                  {row.cover_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.cover_path} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-600 to-brand-800 text-white">
                      <Megaphone className="h-5 w-5" />
                    </span>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={row.status} />
                    <span className="chip bg-slate-100 text-ink-soft ring-slate-200">{row.category}</span>
                    {row.pinned === 1 && (
                      <span className="chip bg-amber-50 text-amber-800 ring-amber-600/20">
                        <Pin className="h-3 w-3" strokeWidth={2.5} />
                        Pinned
                      </span>
                    )}
                    {row.urgent === 1 && (
                      <span className="chip bg-rose-50 text-rose-700 ring-rose-600/20">
                        <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
                        Urgent
                      </span>
                    )}
                  </div>

                  <Link href={`/admin/posts/${row.id}`} className="group block">
                    <p className="font-display text-[0.9375rem] font-semibold leading-snug text-ink transition group-hover:text-brand-700">
                      {row.title}
                    </p>
                  </Link>

                  {row.excerpt && (
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                      {truncate(row.excerpt, 150)}
                    </p>
                  )}

                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                    <span>{row.author_name || 'Unknown'}</span>
                    <span>·</span>
                    <span>
                      {row.status === 'published' && row.published_at
                        ? `Published ${formatDate(row.published_at)}`
                        : `Updated ${timeAgo(row.updated_at)}`}
                    </span>
                    {row.views > 0 && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {row.views}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {row.status === 'published' && (
                    <a
                      href={`/posts/${row.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View on the website"
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}

                  {can(user, 'posts.edit') && (
                    <>
                      <ActionForm action={toggleFlag} hidden={{ id: row.id, flag: 'pinned' }}>
                        <SubmitButton
                          pendingLabel=""
                          title={row.pinned ? 'Unpin' : 'Pin to the top'}
                          className={cn(
                            'grid h-8 w-8 place-items-center rounded-lg transition',
                            row.pinned
                              ? 'bg-amber-100 text-amber-700'
                              : 'text-ink-muted hover:bg-slate-100 hover:text-ink'
                          )}
                        >
                          <Pin className="h-4 w-4" />
                        </SubmitButton>
                      </ActionForm>

                      <Link
                        href={`/admin/posts/${row.id}`}
                        title="Edit"
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </>
                  )}

                  {can(user, 'posts.create') && (
                    <ActionForm action={duplicatePost} hidden={{ id: row.id }}>
                      <SubmitButton
                        pendingLabel=""
                        title="Make a copy"
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
                      >
                        <Copy className="h-4 w-4" />
                      </SubmitButton>
                    </ActionForm>
                  )}

                  {can(user, 'posts.publish') && (
                    <ActionForm action={togglePublish} hidden={{ id: row.id }}>
                      <SubmitButton
                        pendingLabel="…"
                        className={cn(
                          'btn btn-sm',
                          row.status === 'published'
                            ? 'btn-outline'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        )}
                      >
                        {row.status === 'published' ? 'Unpublish' : 'Publish'}
                      </SubmitButton>
                    </ActionForm>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <Pagination page={safePage} pages={pages} build={(p) => link({ page: p })} />
      </Panel>
    </>
  );
}
