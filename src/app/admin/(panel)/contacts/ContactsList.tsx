import Link from 'next/link';
import { Users, Download, ChevronRight, Phone, Mail, StickyNote } from 'lucide-react';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { formatDate, timeAgo, parseJson, cn, initials } from '@/lib/utils';
import {
  PageTitle, Panel, StatusBadge, EmptyState, SearchBox, Pagination,
} from '@/components/admin/ui';
import { BulkForm } from '@/components/admin/BulkForm';
import { BulkSelect, SelectAll } from '@/components/admin/interactive';
import { bulkContactAction } from './actions';

const PER_PAGE = 25;

interface Row {
  id: number;
  ref: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  headline: string;
  tags: string;
  photo_path: string | null;
  created_at: string;
  note_count: number;
}

/** Shared by the employer and candidate contact screens. */
export async function ContactsList({
  type,
  searchParams,
}: {
  type: 'employer' | 'candidate';
  searchParams: { status?: string; q?: string; page?: string; tag?: string };
}) {
  const user = await requirePermission('contacts.view');

  const base = `/admin/contacts/${type === 'employer' ? 'employers' : 'candidates'}`;
  const status = searchParams.status ?? 'all';
  const query = (searchParams.q ?? '').trim();
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where = ['type = ?'];
  const args: unknown[] = [type];

  if (status !== 'all') {
    where.push('status = ?');
    args.push(status);
  }
  if (query) {
    where.push('(name LIKE ? OR email LIKE ? OR phone LIKE ? OR headline LIKE ? OR ref LIKE ? OR city LIKE ?)');
    const like = `%${query}%`;
    args.push(like, like, like, like, like, like);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const total = db.scalar<number>(`SELECT COUNT(*) AS n FROM contacts ${whereSql}`, args) ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.min(page, pages);

  const rows = db.all<Row>(
    `SELECT c.id, c.ref, c.status, c.name, c.email, c.phone, c.city, c.state, c.headline,
            c.tags, c.photo_path, c.created_at,
            (SELECT COUNT(*) FROM contact_notes n WHERE n.contact_id = c.id) AS note_count
       FROM contacts c ${whereSql.replace('WHERE type', 'WHERE c.type')}
      ORDER BY c.id DESC LIMIT ? OFFSET ?`,
    [...args, PER_PAGE, (safePage - 1) * PER_PAGE]
  );

  const statusCounts = db.all<{ status: string; n: number }>(
    'SELECT status, COUNT(*) AS n FROM contacts WHERE type = ? GROUP BY status',
    [type]
  );
  const countFor = (s: string) =>
    s === 'all'
      ? statusCounts.reduce((sum, r) => sum + r.n, 0)
      : statusCounts.find((r) => r.status === s)?.n ?? 0;

  const link = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = { status, q: query, page: safePage, ...next };
    if (merged.status && merged.status !== 'all') sp.set('status', String(merged.status));
    if (merged.q) sp.set('q', String(merged.q));
    if (merged.page && Number(merged.page) > 1) sp.set('page', String(merged.page));
    const qs = sp.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const STATUSES = ['all', 'new', 'in_progress', 'placed', 'on_hold', 'closed'] as const;
  const LABELS: Record<string, string> = {
    all: 'All',
    new: 'New',
    in_progress: 'In progress',
    placed: type === 'employer' ? 'Fulfilled' : 'Placed',
    on_hold: 'On hold',
    closed: 'Closed',
  };

  return (
    <>
      <PageTitle
        title={type === 'employer' ? 'Employer contacts' : 'Candidate contacts'}
        subtitle={
          type === 'employer'
            ? 'Companies whose requirements have been approved and taken on.'
            : 'Candidates whose registrations have been approved and verified.'
        }
        actions={
          can(user, 'contacts.export') && (
            <a
              href={`/admin/contacts/export?${new URLSearchParams({ type, status, q: query }).toString()}`}
              className="btn-outline btn-sm"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          )
        }
      />

      <Panel
        bodyClassName=""
        actions={
          <>
            <div className="flex flex-wrap gap-1">
              {STATUSES.map((key) => (
                <Link
                  key={key}
                  href={link({ status: key, page: 1 })}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-xs font-medium transition',
                    status === key ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-slate-100'
                  )}
                >
                  {LABELS[key]}
                  <span className="ml-1 opacity-60">{countFor(key)}</span>
                </Link>
              ))}
            </div>
            <SearchBox
              action={base}
              placeholder="Name, phone, company…"
              defaultValue={query}
              hidden={{ status: status !== 'all' ? status : undefined }}
              className="w-full sm:w-60"
            />
          </>
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={query ? 'Nothing matches that search' : 'No contacts yet'}
            description={
              query
                ? 'Try a different name, phone number or reference.'
                : 'Approve a submission and it will appear here as a contact.'
            }
            action={
              <Link href="/admin/submissions" className="btn-outline btn-sm">
                Go to submissions
              </Link>
            }
          />
        ) : (
          <BulkForm
            action={bulkContactAction}
            canDelete={can(user, 'contacts.delete')}
            labels={{ approve: '', reject: '', delete: 'Delete selected' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-ink-muted">
                    <th className="w-10 px-5 py-2.5">
                      <SelectAll target="ids" />
                    </th>
                    <th className="px-3 py-2.5 font-medium">
                      {type === 'employer' ? 'Company' : 'Candidate'}
                    </th>
                    <th className="hidden px-3 py-2.5 font-medium md:table-cell">Contact</th>
                    <th className="hidden px-3 py-2.5 font-medium lg:table-cell">Location</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Added</th>
                    <th className="w-10 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const tags = parseJson<string[]>(row.tags, []);
                    return (
                      <tr key={row.id} className="transition hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <BulkSelect name="ids" value={row.id} />
                        </td>
                        <td className="px-3 py-3">
                          <Link href={`/admin/contacts/${row.id}`} className="flex items-start gap-2.5">
                            {row.photo_path ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={row.photo_path}
                                alt=""
                                className="mt-0.5 h-8 w-8 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600/10 text-[0.6875rem] font-bold text-brand-700">
                                {initials(row.headline || row.name)}
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate font-medium text-ink">
                                  {row.headline || row.name}
                                </span>
                                {row.note_count > 0 && (
                                  <span
                                    className="inline-flex shrink-0 items-center gap-0.5 text-[0.6875rem] text-ink-muted"
                                    title={`${row.note_count} private note(s)`}
                                  >
                                    <StickyNote className="h-3 w-3" />
                                    {row.note_count}
                                  </span>
                                )}
                              </span>
                              <span className="block truncate text-xs text-ink-muted">
                                {row.name} · {row.ref}
                              </span>
                              {tags.length > 0 && (
                                <span className="mt-1 flex flex-wrap gap-1">
                                  {tags.slice(0, 3).map((t) => (
                                    <span
                                      key={t}
                                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.625rem] font-medium text-ink-soft"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </span>
                          </Link>
                        </td>
                        <td className="hidden px-3 py-3 md:table-cell">
                          {row.phone && (
                            <span className="flex items-center gap-1.5 text-ink">
                              <Phone className="h-3 w-3 text-ink-muted" />
                              {row.phone}
                            </span>
                          )}
                          {row.email && (
                            <span className="flex items-center gap-1.5 truncate text-xs text-ink-muted">
                              <Mail className="h-3 w-3" />
                              {row.email}
                            </span>
                          )}
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
                            href={`/admin/contacts/${row.id}`}
                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-slate-100 hover:text-ink"
                            aria-label="Open"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
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
