import Link from 'next/link';
import {
  Eye, Users, MousePointerClick, Timer, TrendingDown, Radio, Repeat, Smartphone,
  Monitor, Tablet, Globe, Search, Share2, Link2, Megaphone, FileText,
} from 'lucide-react';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/auth';
import { cn, formatNumber, timeAgo } from '@/lib/utils';
import {
  getOverview, getSeries, getComparison, getTopPages, getTopReferrers, getSources,
  getDevices, getBrowsers, getOperatingSystems, getCampaigns, getTopEvents,
  getHourlyPattern, getFunnel, getLiveVisitors, getRecentActivity,
} from '@/lib/analytics';
import { getSettings, bool } from '@/lib/settings';
import { PageTitle, Panel, StatCard, BarList, EmptyState } from '@/components/admin/ui';
import { TrendChart, HourChart, Funnel } from '@/components/admin/Chart';

export const metadata = { title: 'Visitor statistics' };

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
];

const SOURCE_LABELS: Record<string, string> = {
  direct: 'Typed in or bookmarked',
  search: 'Search engines',
  social: 'Social media',
  referral: 'Other websites',
  campaign: 'Campaign links',
  internal: 'Within the site',
};

const PAGE_LABELS: Record<string, string> = {
  '/': 'Home page',
  '/about': 'About us',
  '/services': 'Services',
  '/team': 'Our team',
  '/contact': 'Contact',
  '/posts': 'Posts',
  '/register/employer': 'Employer registration',
  '/register/candidate': 'Candidate registration',
  '/privacy': 'Privacy policy',
  '/terms': 'Terms of use',
};

const EVENT_LABELS: Record<string, string> = {
  'cta.employer': 'Clicked "I need manpower"',
  'cta.candidate': 'Clicked "I am looking for a job"',
  'cta.posts': 'Clicked "Posts"',
  'cta.post': 'Clicked the hero post',
  'form.start': 'Started filling in a form',
  'form.submit': 'Submitted a form',
  'whatsapp.click': 'Opened WhatsApp',
  'social.click': 'Clicked a social media link',
  'share.click': 'Shared a post',
  'share.copy': 'Copied a post link',
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requirePermission('dashboard.view');
  const params = await searchParams;

  const days = RANGES.some((r) => r.days === Number(params.days)) ? Number(params.days) : 30;

  const settings = getSettings();
  const enabled = bool(settings, 'analytics_enabled', true);

  const overview = getOverview(days);
  const comparison = getComparison(days);
  const series = getSeries(Math.min(days, 90));
  const live = getLiveVisitors();
  const funnel = getFunnel(days);
  const hours = getHourlyPattern(days);

  const topPages = getTopPages(days, 12);
  const referrers = getTopReferrers(days, 10);
  const sources = getSources(days);
  const devices = getDevices(days);
  const browsers = getBrowsers(days);
  const systems = getOperatingSystems(days);
  const campaigns = getCampaigns(days, 8);
  const events = getTopEvents(days, 15);
  const recent = getRecentActivity(15);

  // The posts people actually read.
  const topPosts = db.all<{ title: string; slug: string; views: number }>(
    "SELECT title, slug, views FROM posts WHERE status = 'published' AND views > 0 ORDER BY views DESC LIMIT 8"
  );

  const totalViews = db.scalar<number>('SELECT COUNT(*) AS n FROM page_views') ?? 0;
  const mins = Math.floor(overview.avgDuration / 60);
  const secs = overview.avgDuration % 60;

  return (
    <>
      <PageTitle
        title="Visitor statistics"
        subtitle="Recorded by the website itself. No third-party tracker, no cookies, no personal data."
        actions={
          <>
            {live > 0 && (
              <span className="chip bg-emerald-50 text-emerald-700 ring-emerald-600/20">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                {live} on the site now
              </span>
            )}
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
              {RANGES.map((r) => (
                <Link
                  key={r.days}
                  href={`/admin/analytics?days=${r.days}`}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                    days === r.days ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-slate-100'
                  )}
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </>
        }
      />

      {!enabled && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Visitor statistics are switched off in Settings, so nothing new is being recorded. The
          figures below are historical.{' '}
          <Link href="/admin/settings?group=analytics" className="font-semibold underline">
            Turn it back on
          </Link>
        </div>
      )}

      {totalViews === 0 ? (
        <Panel>
          <EmptyState
            icon={Eye}
            title="No visits recorded yet"
            description="As soon as people start visiting the website, their visits, the pages they read and the buttons they click will be counted here."
          />
        </Panel>
      ) : (
        <>
          {/* Headline figures */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Unique visitors" value={overview.visitors} icon={Users} tone="brand"
              change={comparison.visitors} hint="vs previous period" />
            <StatCard label="Page views" value={overview.pageViews} icon={Eye} tone="brand"
              change={comparison.views} hint="vs previous period" />
            <StatCard label="Visits (sessions)" value={overview.sessions} icon={Repeat}
              hint={`${overview.viewsPerSession} pages per visit`} />
            <StatCard label="Interactions" value={overview.events} icon={MousePointerClick} tone="emerald"
              hint="buttons, links and forms" />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="New visitors" value={overview.newVisitors} icon={Users}
              hint={overview.pageViews > 0
                ? `${Math.round((overview.newVisitors / Math.max(overview.pageViews, 1)) * 100)}% of views`
                : undefined} />
            <StatCard
              label="Average time on a page"
              value={overview.avgDuration > 0 ? (mins > 0 ? `${mins}m ${secs}s` : `${secs}s`) : '-'}
              icon={Timer}
            />
            <StatCard label="Left after one page" value={`${overview.bounceRate}%`} icon={TrendingDown}
              tone={overview.bounceRate > 70 ? 'amber' : 'default'} hint="bounce rate" />
            <StatCard label="Form submissions" value={series.reduce((s, d) => s + d.submissions, 0)}
              icon={FileText} tone="emerald" change={comparison.subs} hint="vs previous period" />
          </div>

          {/* Trend */}
          <div className="mt-5">
            <Panel title={`Traffic over the last ${Math.min(days, 90)} days`}>
              <TrendChart data={series} height={240} />
            </Panel>
          </div>

          {/* Funnel + hours */}
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel
              title="From a visit to a contact"
              description="Where people drop off between arriving and being approved."
            >
              <Funnel steps={funnel} />
            </Panel>

            <div className="space-y-5">
              <Panel title="Busiest time of day" description="When people are on the website.">
                <HourChart hours={hours} />
              </Panel>

              <Panel title="How they found the site">
                <BarList
                  items={sources}
                  formatLabel={(l) => SOURCE_LABELS[l] ?? l}
                  emptyText="No referrer information yet."
                />
              </Panel>
            </div>
          </div>

          {/* Pages and referrers */}
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel title="Most visited pages" description="Including time spent on each.">
              <BarList items={topPages} formatLabel={(l) => PAGE_LABELS[l] ?? l} />
            </Panel>

            <Panel title="Websites sending visitors" description="Where the link was clicked from.">
              <BarList
                items={referrers}
                emptyText="Nobody has arrived from another website yet."
              />
            </Panel>
          </div>

          {/* Interactions */}
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel
              title="What people click"
              description="Buttons, links and form steps across the website."
            >
              <BarList
                items={events}
                formatLabel={(l) => EVENT_LABELS[l] ?? l.replace(/\./g, ' ')}
                emptyText="No interactions recorded yet."
              />
            </Panel>

            <Panel title="Most read posts">
              {topPosts.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-muted">
                  No post has been read yet.
                </p>
              ) : (
                <BarList
                  items={topPosts.map((a) => ({ label: a.title, count: a.views }))}
                />
              )}
            </Panel>
          </div>

          {/* Devices */}
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <Panel title="Devices">
              <BarList
                items={devices}
                formatLabel={(l) => ({ mobile: 'Phone', desktop: 'Computer', tablet: 'Tablet' }[l] ?? l)}
              />
              <div className="mt-4 flex items-center justify-around border-t border-slate-100 pt-4 text-xs text-ink-muted">
                {[
                  [Smartphone, 'mobile', 'Phone'],
                  [Monitor, 'desktop', 'Computer'],
                  [Tablet, 'tablet', 'Tablet'],
                ].map(([Icon, key, label]) => {
                  const count = devices.find((d) => d.label === key)?.count ?? 0;
                  const total = devices.reduce((s, d) => s + d.count, 0) || 1;
                  const IconComp = Icon as React.ElementType;
                  return (
                    <span key={key as string} className="flex flex-col items-center gap-1">
                      <IconComp className="h-4 w-4" />
                      <span className="font-semibold text-ink">
                        {Math.round((count / total) * 100)}%
                      </span>
                      <span>{label as string}</span>
                    </span>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Browsers">
              <BarList items={browsers} />
            </Panel>

            <Panel title="Operating systems">
              <BarList items={systems} />
            </Panel>
          </div>

          {/* Campaigns + live */}
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel
              title="Campaign links"
              description="Visits from links carrying ?utm_source= or ?ref="
            >
              <BarList
                items={campaigns}
                emptyText="No campaign links have been used yet. Add ?ref=whatsapp to a link you share and it will be counted here."
              />
            </Panel>

            <Panel title="Latest page views" description="The most recent activity on the website.">
              {recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-muted">Nothing yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {recent.map((r, i) => (
                    <li key={i} className="flex items-center gap-3 py-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-ink-muted">
                        {r.source === 'search' ? (
                          <Search className="h-3.5 w-3.5" />
                        ) : r.source === 'social' ? (
                          <Share2 className="h-3.5 w-3.5" />
                        ) : r.source === 'referral' ? (
                          <Link2 className="h-3.5 w-3.5" />
                        ) : (
                          <Globe className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ink">
                          {PAGE_LABELS[r.path] ?? r.path}
                        </span>
                        <span className="block truncate text-xs capitalize text-ink-muted">
                          {r.device} · {r.browser}
                          {r.referrer_host ? ` · from ${r.referrer_host}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-muted">{timeAgo(r.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <p className="mt-6 text-center text-xs text-ink-muted">
            {formatNumber(totalViews)} page views recorded in total since the site went live.
          </p>
        </>
      )}
    </>
  );
}
