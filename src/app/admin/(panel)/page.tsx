import Link from 'next/link';
import {
  Inbox, Users, Building2, Mail, Megaphone, Eye, UserPlus, ArrowRight,
  Activity, CheckCircle2, Clock, Plus, Radio,
} from 'lucide-react';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { formatNumber, timeAgo, truncate } from '@/lib/utils';
import { getOverview, getSeries, getComparison, getLiveVisitors } from '@/lib/analytics';
import { PageTitle, StatCard, Panel, StatusBadge, EmptyState } from '@/components/admin/ui';
import { TrendChart } from '@/components/admin/Chart';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requirePermission('dashboard.view');

  const count = (sql: string, params: unknown[] = []) => db.scalar<number>(sql, params) ?? 0;

  const pendingSubs = count("SELECT COUNT(*) AS n FROM submissions WHERE status IN ('new','reviewing')");
  const newToday = count("SELECT COUNT(*) AS n FROM submissions WHERE date(created_at) = date('now')");
  const employers = count("SELECT COUNT(*) AS n FROM contacts WHERE type = 'employer'");
  const candidates = count("SELECT COUNT(*) AS n FROM contacts WHERE type = 'candidate'");
  const placed = count("SELECT COUNT(*) AS n FROM contacts WHERE type = 'candidate' AND status = 'placed'");
  const unread = count("SELECT COUNT(*) AS n FROM messages WHERE status = 'unread'");
  const published = count("SELECT COUNT(*) AS n FROM posts WHERE status = 'published'");
  const drafts = count("SELECT COUNT(*) AS n FROM posts WHERE status = 'draft'");

  const overview = getOverview(30);
  const series = getSeries(30);
  const comparison = getComparison(30);
  const live = getLiveVisitors();

  const recentSubs = db.all<{
    id: number; ref: string; type: string; status: string; name: string;
    headline: string; city: string; created_at: string;
  }>(
    `SELECT id, ref, type, status, name, headline, city, created_at
       FROM submissions ORDER BY id DESC LIMIT 7`
  );

  const recentMessages = db.all<{
    id: number; name: string; subject: string; status: string; created_at: string;
  }>('SELECT id, name, subject, status, created_at FROM messages ORDER BY id DESC LIMIT 5');

  const activity = can(user, 'system.logs')
    ? db.all<{ id: number; user_name: string; action: string; detail: string; created_at: string }>(
        `SELECT id, user_name, action, detail, created_at FROM audit_log
          WHERE action NOT IN ('login.failed') ORDER BY id DESC LIMIT 8`
      )
    : [];

  const firstName = (user.full_name || user.username).split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageTitle
        title={`${greeting}, ${firstName}`}
        subtitle="Here is what is happening across the website and the office."
        actions={
          <>
            {live > 0 && (
              <span className="chip bg-emerald-50 text-emerald-700 ring-emerald-600/20">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                {live} on the site now
              </span>
            )}
            {can(user, 'posts.create') && (
              <Link href="/admin/posts/new" className="btn-primary btn-sm">
                <Plus className="h-4 w-4" />
                New post
              </Link>
            )}
          </>
        }
      />

      {/* Headline figures */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Waiting for review"
          value={pendingSubs}
          icon={Inbox}
          tone={pendingSubs > 0 ? 'amber' : 'default'}
          href={can(user, 'submissions.view') ? '/admin/submissions' : undefined}
          hint={newToday > 0 ? `${newToday} today` : 'nothing new today'}
        />
        <StatCard
          label="Employer contacts"
          value={employers}
          icon={Building2}
          tone="brand"
          href={can(user, 'contacts.view') ? '/admin/contacts/employers' : undefined}
        />
        <StatCard
          label="Candidate contacts"
          value={candidates}
          icon={Users}
          tone="brand"
          href={can(user, 'contacts.view') ? '/admin/contacts/candidates' : undefined}
          hint={`${placed} placed`}
        />
        <StatCard
          label="Unread messages"
          value={unread}
          icon={Mail}
          tone={unread > 0 ? 'rose' : 'default'}
          href={can(user, 'messages.view') ? '/admin/messages' : undefined}
        />
      </div>

      {/* Traffic */}
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Website traffic - last 30 days"
          description={`${formatNumber(overview.visitors)} visitors, ${formatNumber(overview.pageViews)} page views`}
          actions={
            <Link href="/admin/analytics" className="btn-outline btn-sm">
              Full statistics
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <TrendChart data={series} />
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <StatCard
            label="Visitors (30 days)"
            value={overview.visitors}
            icon={Eye}
            tone="brand"
            change={comparison.visitors}
            hint="vs previous 30 days"
          />
          <StatCard
            label="Submissions (30 days)"
            value={series.reduce((sum, d) => sum + d.submissions, 0)}
            icon={UserPlus}
            tone="emerald"
            change={comparison.subs}
            hint="vs previous 30 days"
          />
          <StatCard
            label="Posts live"
            value={published}
            icon={Megaphone}
            href={can(user, 'posts.view') ? '/admin/posts' : undefined}
            hint={drafts > 0 ? `${drafts} in draft` : undefined}
          />
        </div>
      </div>

      {/* Lists */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Latest submissions"
          description="Everything filled in on the website, newest first"
          bodyClassName=""
          actions={
            can(user, 'submissions.view') && (
              <Link href="/admin/submissions" className="btn-ghost btn-sm">
                See all
                <ArrowRight className="h-4 w-4" />
              </Link>
            )
          }
        >
          {recentSubs.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No submissions yet"
              description="Registrations filled in on the website will appear here."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentSubs.map((s) => (
                <li key={s.id}>
                  <Link
                    href={can(user, 'submissions.view') ? `/admin/submissions/${s.id}` : '#'}
                    className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50"
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        s.type === 'employer'
                          ? 'bg-brand-600/10 text-brand-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {s.type === 'employer' ? (
                        <Building2 className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {s.headline || s.name}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">
                        {s.name}
                        {s.city ? ` · ${s.city}` : ''} · {s.ref}
                      </span>
                    </span>

                    <span className="hidden shrink-0 sm:block">
                      <StatusBadge status={s.status} />
                    </span>
                    <span className="shrink-0 text-xs text-ink-muted">{timeAgo(s.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel
            title="Recent messages"
            bodyClassName=""
            actions={
              can(user, 'messages.view') && (
                <Link href="/admin/messages" className="btn-ghost btn-sm">
                  Inbox
                </Link>
              )
            }
          >
            {recentMessages.length === 0 ? (
              <EmptyState icon={Mail} title="No messages" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentMessages.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={can(user, 'messages.view') ? `/admin/messages?open=${m.id}` : '#'}
                      className="block px-5 py-3 transition hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2">
                        {m.status === 'unread' && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                        )}
                        <span className="truncate text-sm font-medium text-ink">{m.name}</span>
                        <span className="ml-auto shrink-0 text-[0.6875rem] text-ink-muted">
                          {timeAgo(m.created_at)}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-muted">
                        {truncate(m.subject, 48)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {activity.length > 0 && (
            <Panel title="Recent activity" bodyClassName="">
              <ul className="divide-y divide-slate-100">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-2.5 px-5 py-2.5">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-100 text-ink-muted">
                      {a.action.includes('approve') ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : a.action.includes('login') ? (
                        <Clock className="h-3.5 w-3.5" />
                      ) : (
                        <Activity className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-ink">
                        <span className="font-medium">{a.user_name}</span>{' '}
                        <span className="text-ink-muted">{a.action.replace(/\./g, ' ')}</span>
                      </span>
                      <span className="block text-[0.6875rem] text-ink-muted">
                        {timeAgo(a.created_at)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
