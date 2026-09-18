import { Mail, CheckCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import {
  PageTitle, Panel, EmptyState, SearchBox, Pagination, TabLinks,
} from '@/components/admin/ui';
import { ActionForm } from '@/components/admin/BulkForm';
import { SubmitButton } from '@/components/admin/interactive';
import { MessageRow, type MessageRecord } from './MessageRow';
import {
  setMessageStatus, toggleImportant, saveMessageNote, deleteMessage, markAllRead,
} from './actions';

export const metadata = { title: 'Messages' };

const PER_PAGE = 20;

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string; open?: string }>;
}) {
  const user = await requirePermission('messages.view');
  const params = await searchParams;

  const status = params.status ?? 'all';
  const query = (params.q ?? '').trim();
  const page = Math.max(1, Number(params.page) || 1);
  const openId = Number(params.open) || 0;
  const manage = can(user, 'messages.manage');

  const where: string[] = [];
  const args: unknown[] = [];

  if (status === 'important') where.push('important = 1');
  else if (status !== 'all') {
    where.push('status = ?');
    args.push(status);
  }
  if (query) {
    where.push('(name LIKE ? OR email LIKE ? OR subject LIKE ? OR body LIKE ?)');
    const like = `%${query}%`;
    args.push(like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.scalar<number>(`SELECT COUNT(*) AS n FROM messages ${whereSql}`, args) ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.min(page, pages);

  const rows = db.all<MessageRecord>(
    `SELECT * FROM messages ${whereSql}
      ORDER BY important DESC, CASE status WHEN 'unread' THEN 0 ELSE 1 END, id DESC
      LIMIT ? OFFSET ?`,
    [...args, PER_PAGE, (safePage - 1) * PER_PAGE]
  );

  const counts = {
    all: db.scalar<number>('SELECT COUNT(*) AS n FROM messages') ?? 0,
    unread: db.scalar<number>("SELECT COUNT(*) AS n FROM messages WHERE status = 'unread'") ?? 0,
    important: db.scalar<number>('SELECT COUNT(*) AS n FROM messages WHERE important = 1') ?? 0,
    archived: db.scalar<number>("SELECT COUNT(*) AS n FROM messages WHERE status = 'archived'") ?? 0,
  };

  const link = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = { status, q: query, page: safePage, ...next };
    if (merged.status && merged.status !== 'all') sp.set('status', String(merged.status));
    if (merged.q) sp.set('q', String(merged.q));
    if (merged.page && Number(merged.page) > 1) sp.set('page', String(merged.page));
    const qs = sp.toString();
    return qs ? `/admin/messages?${qs}` : '/admin/messages';
  };

  return (
    <>
      <PageTitle
        title="Messages"
        subtitle="Enquiries sent through the Contact page on the website."
        actions={
          manage && counts.unread > 0 && (
            <ActionForm action={async () => { 'use server'; return markAllRead(); }}>
              <SubmitButton className="btn-outline btn-sm" icon={<CheckCheck className="h-4 w-4" />} pendingLabel="Working…">
                Mark all as read
              </SubmitButton>
            </ActionForm>
          )
        }
      />

      <TabLinks
        current={status}
        tabs={[
          { key: 'all', label: 'All', count: counts.all, href: link({ status: 'all', page: 1 }) },
          { key: 'unread', label: 'Unread', count: counts.unread, href: link({ status: 'unread', page: 1 }) },
          { key: 'important', label: 'Important', count: counts.important, href: link({ status: 'important', page: 1 }) },
          { key: 'archived', label: 'Archived', count: counts.archived, href: link({ status: 'archived', page: 1 }) },
        ]}
      />

      <Panel
        bodyClassName=""
        actions={
          <SearchBox
            action="/admin/messages"
            placeholder="Search messages…"
            defaultValue={query}
            hidden={{ status: status !== 'all' ? status : undefined }}
            className="w-full sm:w-64"
          />
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={Mail}
            title={query ? 'Nothing matches that search' : 'No messages'}
            description={
              query ? 'Try a different word.' : 'Messages sent from the Contact page arrive here.'
            }
          />
        ) : (
          <ul className="border-t border-slate-200">
            {rows.map((row) => (
              <MessageRow
                key={row.id}
                message={row}
                manage={manage}
                canDelete={can(user, 'messages.delete')}
                setStatus={setMessageStatus}
                toggleImportant={toggleImportant}
                saveNote={saveMessageNote}
                remove={deleteMessage}
              />
            ))}
          </ul>
        )}

        <Pagination page={safePage} pages={pages} build={(p) => link({ page: p })} />
      </Panel>
    </>
  );
}
