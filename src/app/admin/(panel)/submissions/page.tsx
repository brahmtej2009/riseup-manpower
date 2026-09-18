import Link from 'next/link';
import { Inbox, Download, Building2, Users, ChevronRight } from 'lucide-react';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { formatDate, timeAgo, cn } from '@/lib/utils';
import {
  PageTitle, Panel, StatusBadge, EmptyState, SearchBox, Pagination,
} from '@/components/admin/ui';
import { BulkForm } from '@/components/admin/BulkForm';
import { BulkSelect, SelectAll } from '@/components/admin/interactive';
import { bulkSubmissionAction } from './actions';

export const metadata = { title: 'New submissions' };

const PER_PAGE = 25;

interface Row {
  id: number;
  ref: string;
  type: 'employer' | 'candidate';
  status: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  headline: string;
  created_at: string;
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; q?: string; page?: string }>;
}) {
  const user = await requirePermission('submissions.view');
  const params = await searchParams;

  const type = params.type === 'employer' || params.type === 'candidate' ? params.type : 'all';
  const status = params.status ?? 'pending';
  const query = (params.q ?? '').trim();
  const page = Math.max(1, Number(params.page) || 1);

  // Filters are assembled as parameterised fragments - never string-interpolated.
  const where: string[] = [];
  const args: unknown[] = [];

  if (type !== 'all') {
    where.push('type = ?');
    args.push(type);
  }
  if (status === 'pending') where.push("status IN ('new','reviewing')");
  else if (status !== 'all') {
    where.push('status = ?');
    args.push(status);
  }
  if (query) {
    where.push('(name LIKE ? OR email LIKE ? OR phone LIKE ? OR headline LIKE ? OR ref LIKE ? OR city LIKE ?)');
    const like = `%${query}%`;
    args.push(like, like, like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.scalar<number>(`SELECT COUNT(*) AS n FROM submissions ${whereSql}`, args) ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.min(page, pages);

  const rows = db.all<Row>(
    `SELECT id, ref, type, status, name, email, phone, city, state, headline, created_at
       FROM submissions ${whereSql}
      ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END, id DESC
      LIMIT ? OFFSET ?`,
    [...args, PER_PAGE, (safePage - 1) * PER_PAGE]
  );

  const counts = {
    all: db.scalar<number>('SELECT COUNT(*) AS n FROM submissions') ?? 0,
    employer: db.scalar<number>("SELECT COUNT(*) AS n FROM submissions WHERE type = 'employer'") ?? 0,
    candidate: db.scalar<number>("SELECT COUNT(*) AS n FROM submissions WHERE type = 'candidate'") ?? 0,
  };

  const link = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = { type, status, q: query, page: safePage, ...next };
    if (merged.type && merged.type !== 'all') sp.set('type', String(merged.type));
    if (merged.status && merged.status !== 'pending') sp.set('status', String(merged.status));
    if (merged.q) sp.set('q', String(merged.q));
    if (merged.page && Number(merged.page) > 1) sp.set('page', String(merged.page));
    const qs = sp.toString();
    return qs ? `/admin/submissions?${qs}` : '/admin/submissions';
  };

  const STATUSES = [
    ['pending', 'Awaiting review'],
    ['new', 'New'],
    ['reviewing', 'Reviewing'],
    ['approved', 'Approved'],
    ['rejected', 'Rejected'],
    ['all', 'All'],
  ] as const;

  return (
    <>
      <PageTitle
        title="New submissions"
        subtitle="Forms filled in on the website. Approve one to turn it into a contact."
        actions={
          can(user, 'submissions.export') && (
            <a
              href={`/admin/submissions/export?${new URLSearchParams({ type, status, q: query }).toString()}`}
              className="btn-outline btn-sm"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          )
        }
      />

      {/* The two things a reviewer is ever choosing between, as two buttons.
          "All" stays available underneath, but it is not the main choice. */}
      <div className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { key: 'employer', label: 'Employers', count: counts.employer, icon: Building2 },
            { key: 'candidate', label: 'Candidates', count: counts.candidate, icon: Users },
          ].map((tab) => (
            <Link
              key={tab.key}
              href={link({ type: tab.key, page: 1 })}
              className={cn(
                'flex items-center gap-4 rounded-2xl border p-5 transition',
                type === tab.key
                  ? 'border-brand-600 bg-brand-600 text-white shadow-[0_8px_24px_-12px_rgb(var(--brand-600)/0.9)]'
                  : 'border-slate-200 bg-white text-ink hover:border-brand-300 hover:bg-brand-50/40'
              )}
            >
              <span
                className={cn(
                  'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
                  type === tab.key ? 'bg-white/20 text-white' : 'bg-brand-600/10 text-brand-700'
                )}
              >
                <tab.icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base font-semibold">{tab.label}</span>
                <span
                  className={cn(
                    'block text-sm',
                    type === tab.key ? 'text-white/75' : 'text-ink-muted'
                  )}
                >
                  {tab.count} submission{tab.count === 1 ? '' : 's'}
                </span>
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-3 text-center">
          <Link
            href={link({ type: 'all', page: 1 })}
            className={cn(
              'text-sm font-medium transition',
              type === 'all' ? 'text-brand-700 underline' : 'text-ink-muted hover:text-ink'
            )}
          >
            Show both together ({counts.all})
          </Link>
        </div>
      </div>

      <Panel
        bodyClassName=""
        actions={
          <>
            <div className="flex flex-wrap gap-1">
              {STATUSES.map(([key, label]) => (
                <Link
                  key={key}
                  href={link({ status: key, page: 1 })}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
                    status === key ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-slate-100'
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
            <SearchBox
              action="/admin/submissions"
              placeholder="Name, phone, company…"
              defaultValue={query}
              hidden={{ type: type !== 'all' ? type : undefined, status: status !== 'pending' ? status : undefined }}
              className="w-full sm:w-60"
            />
          </>
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={query ? 'Nothing matches that search' : 'Nothing waiting'}
            description={
              query
                ? 'Try a different name, phone number or reference.'
                : 'New registrations from the website will appear here for review.'
            }
            action={
              query ? (
                <Link href="/admin/submissions" className="btn-outline btn-sm">
                  Clear the search
                </Link>
              ) : undefined
            }
          />
        ) : (
          <BulkForm
            action={bulkSubmissionAction}
            canApprove={can(user, 'submissions.approve')}
            canReject={can(user, 'submissions.reject')}
            canDelete={can(user, 'submissions.delete')}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th className="w-10 px-5 py-2.5">
                      <SelectAll target="ids" />
                    </th>
                    <th className="px-3 py-2.5 font-medium">Who</th>
                    <th className="hidden px-3 py-2.5 font-medium md:table-cell">Contact</th>
                    <th className="hidden px-3 py-2.5 font-medium lg:table-cell">Location</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Received</th>
                    <th className="w-10 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <BulkSelect name="ids" value={row.id} />
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/admin/submissions/${row.id}`} className="flex items-start gap-2.5">
                          <span
                            className={cn(
                              'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                              row.type === 'employer'
                                ? 'bg-brand-600/10 text-brand-700'
                                : 'bg-emerald-100 text-emerald-700'
                            )}
                          >
                            {row.type === 'employer' ? (
                              <Building2 className="h-4 w-4" />
                            ) : (
                              <Users className="h-4 w-4" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink">
                              {row.headline || row.name}
                            </span>
                            <span className="block truncate text-xs text-ink-muted">
                              {row.name} · {row.ref}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="hidden px-3 py-3 md:table-cell">
                        <span className="block text-ink">{row.phone}</span>
                        <span className="block truncate text-xs text-ink-muted">{row.email}</span>
                      </td>
                      <td className="hidden px-3 py-3 text-ink-soft lg:table-cell">
                        {[row.city, row.state].filter(Boolean).join(', ') || '-'}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="hidden px-3 py-3 sm:table-cell">
                        <span className="block text-ink-soft">{formatDate(row.created_at)}</span>
                        <span className="block text-xs text-ink-muted">{timeAgo(row.created_at)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/admin/submissions/${row.id}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
                          aria-label="Open"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BulkForm>
        )}

        <Pagination page={safePage} pages={pages} build={(p) => link({ page: p })} />
      </Panel>
    </>
  );
}
