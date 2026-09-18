import 'server-only';
import crypto from 'node:crypto';
import { db } from './db';
import { getSettings, bool, num, list } from './settings';

/**
 * Visitor statistics, recorded by the site itself.
 *
 * Nothing that identifies a person is stored. The visitor hash is
 *     sha256(ip + user-agent + secret + today's date)
 * truncated to 16 characters. It groups a person's page views within one day
 * and cannot be reversed, cannot be matched to an IP address, and cannot be
 * followed from one day to the next.
 */

function dailySalt(): string {
  const day = new Date().toISOString().slice(0, 10);
  const secret = process.env.SESSION_SECRET || 'riseup-analytics-salt';
  return `${secret}:${day}`;
}

export function visitorHash(ip: string, ua: string): string {
  return crypto
    .createHash('sha256')
    .update(`${ip}|${ua}|${dailySalt()}`)
    .digest('hex')
    .slice(0, 16);
}

// --- user agent parsing ----------------------------------------------------

export function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const s = ua || '';
  const isTablet = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(s);
  const isMobile = !isTablet && /Mobi|Android|iPhone|iPod|Windows Phone|IEMobile|BlackBerry/i.test(s);

  let browser = 'Other';
  if (/Edg\//i.test(s)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(s)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(s)) browser = 'Samsung Internet';
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) browser = 'Chrome';
  else if (/CriOS/i.test(s)) browser = 'Chrome';
  else if (/Firefox\/|FxiOS/i.test(s)) browser = 'Firefox';
  else if (/Safari\//i.test(s) && !/Chrome/i.test(s)) browser = 'Safari';
  else if (/MSIE|Trident/i.test(s)) browser = 'Internet Explorer';

  let os = 'Other';
  if (/Windows NT/i.test(s)) os = 'Windows';
  else if (/Android/i.test(s)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(s)) os = 'iOS';
  else if (/Mac OS X/i.test(s)) os = 'macOS';
  else if (/Linux/i.test(s)) os = 'Linux';
  else if (/CrOS/i.test(s)) os = 'ChromeOS';

  return { device: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop', browser, os };
}

const SEARCH_HOSTS = /google\.|bing\.|duckduckgo\.|yahoo\.|yandex\.|baidu\.|ecosia\./i;
const SOCIAL_HOSTS =
  /facebook\.|fb\.|instagram\.|linkedin\.|lnkd\.in|twitter\.|x\.com|t\.co|youtube\.|youtu\.be|whatsapp|wa\.me|telegram|pinterest\.|reddit\./i;

export function classifyReferrer(
  referrer: string,
  campaign: string,
  siteHost: string
): { source: string; host: string } {
  if (campaign) return { source: 'campaign', host: campaign };
  if (!referrer) return { source: 'direct', host: '' };
  let host = '';
  try {
    host = new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return { source: 'direct', host: '' };
  }
  if (siteHost && host === siteHost.replace(/^www\./, '')) return { source: 'internal', host };
  if (SEARCH_HOSTS.test(host)) return { source: 'search', host };
  if (SOCIAL_HOSTS.test(host)) return { source: 'social', host };
  return { source: 'referral', host };
}

/** Bots are counted separately - they must not inflate the visitor figures. */
export function isBot(ua: string): boolean {
  return /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|postman|semrush|ahrefs|dataprovider|screaming frog/i.test(
    ua || ''
  );
}

// --- recording -------------------------------------------------------------

export interface TrackPayload {
  path: string;
  title?: string;
  referrer?: string;
  campaign?: string;
  sessionId?: string;
  screenW?: number;
  duration?: number;
}

export function analyticsEnabled(): boolean {
  return bool(getSettings(), 'analytics_enabled', true);
}

export function pathIgnored(path: string): boolean {
  const ignored = list(getSettings(), 'analytics_ignore_paths', ['/admin', '/api']);
  return ignored.some((p) => p && path.startsWith(p));
}

export function recordPageView(
  payload: TrackPayload,
  ip: string,
  ua: string,
  siteHost: string
): void {
  if (!analyticsEnabled() || isBot(ua)) return;
  const path = (payload.path || '/').slice(0, 300);
  if (pathIgnored(path)) return;

  const hash = visitorHash(ip, ua);
  const { device, browser, os } = parseUserAgent(ua);
  const { source, host } = classifyReferrer(payload.referrer || '', payload.campaign || '', siteHost);

  // "New" means not seen earlier today, which is all a daily hash can tell us.
  const seen = db.get<{ x: number }>(
    "SELECT 1 AS x FROM page_views WHERE visitor_hash = ? AND created_at > datetime('now', '-1 day') LIMIT 1",
    [hash]
  );

  db.run(
    `INSERT INTO page_views
       (visitor_hash, session_id, path, title, referrer, referrer_host, source, campaign,
        device, browser, os, screen_w, is_new)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      hash,
      (payload.sessionId || '').slice(0, 40),
      path,
      (payload.title || '').slice(0, 200),
      (payload.referrer || '').slice(0, 300),
      host.slice(0, 120),
      source,
      (payload.campaign || '').slice(0, 80),
      device,
      browser,
      os,
      payload.screenW && payload.screenW > 0 ? Math.min(payload.screenW, 10000) : null,
      seen ? 0 : 1,
    ]
  );
}

export function recordEvent(
  name: string,
  opts: { category?: string; label?: string; path?: string; value?: number; sessionId?: string },
  ip: string,
  ua: string
): void {
  if (!analyticsEnabled() || isBot(ua)) return;
  db.run(
    `INSERT INTO site_events (visitor_hash, session_id, name, category, label, path, value)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      visitorHash(ip, ua),
      (opts.sessionId || '').slice(0, 40),
      name.slice(0, 60),
      (opts.category || 'general').slice(0, 40),
      (opts.label || '').slice(0, 160),
      (opts.path || '').slice(0, 300),
      Number.isFinite(opts.value) ? Number(opts.value) : 1,
    ]
  );
}

/** Records how long a page was open, when the visitor leaves it. */
export function recordDuration(sessionId: string, path: string, seconds: number): void {
  if (!analyticsEnabled() || !sessionId || seconds <= 0) return;
  db.run(
    `UPDATE page_views SET duration = ?
      WHERE id = (SELECT id FROM page_views
                   WHERE session_id = ? AND path = ?
                   ORDER BY id DESC LIMIT 1)`,
    [Math.min(Math.round(seconds), 3600), sessionId, path]
  );
}

// --- reporting -------------------------------------------------------------

export interface Overview {
  visitors: number;
  pageViews: number;
  sessions: number;
  newVisitors: number;
  events: number;
  avgDuration: number;
  bounceRate: number;
  viewsPerSession: number;
}

function since(days: number): string {
  return `-${Math.max(1, days)} days`;
}

export function getOverview(days = 30): Overview {
  const p = [since(days)];
  const row = db.get<{
    visitors: number;
    page_views: number;
    sessions: number;
    new_visitors: number;
    avg_duration: number;
  }>(
    `SELECT COUNT(DISTINCT visitor_hash) AS visitors,
            COUNT(*) AS page_views,
            COUNT(DISTINCT NULLIF(session_id, '')) AS sessions,
            COALESCE(SUM(is_new), 0) AS new_visitors,
            COALESCE(AVG(NULLIF(duration, 0)), 0) AS avg_duration
       FROM page_views WHERE created_at > datetime('now', ?)`,
    p
  );

  const events =
    db.scalar<number>(
      "SELECT COUNT(*) AS n FROM site_events WHERE created_at > datetime('now', ?)",
      p
    ) ?? 0;

  // A bounce is a session with exactly one page view.
  const bounce = db.get<{ single: number; total: number }>(
    `SELECT
        COALESCE(SUM(CASE WHEN views = 1 THEN 1 ELSE 0 END), 0) AS single,
        COUNT(*) AS total
       FROM (SELECT session_id, COUNT(*) AS views
               FROM page_views
              WHERE created_at > datetime('now', ?) AND session_id != ''
              GROUP BY session_id)`,
    p
  );

  const sessions = row?.sessions ?? 0;
  return {
    visitors: row?.visitors ?? 0,
    pageViews: row?.page_views ?? 0,
    sessions,
    newVisitors: row?.new_visitors ?? 0,
    events,
    avgDuration: Math.round(row?.avg_duration ?? 0),
    bounceRate: bounce && bounce.total > 0 ? Math.round((bounce.single / bounce.total) * 100) : 0,
    viewsPerSession: sessions > 0 ? Math.round(((row?.page_views ?? 0) / sessions) * 10) / 10 : 0,
  };
}

export interface SeriesPoint {
  day: string;
  visitors: number;
  views: number;
  submissions: number;
}

export function getSeries(days = 30): SeriesPoint[] {
  const rows = db.all<{ day: string; visitors: number; views: number }>(
    `SELECT date(created_at) AS day,
            COUNT(DISTINCT visitor_hash) AS visitors,
            COUNT(*) AS views
       FROM page_views
      WHERE created_at > datetime('now', ?)
      GROUP BY day ORDER BY day`,
    [since(days)]
  );
  const subs = db.all<{ day: string; n: number }>(
    `SELECT date(created_at) AS day, COUNT(*) AS n
       FROM submissions WHERE created_at > datetime('now', ?)
      GROUP BY day`,
    [since(days)]
  );
  const subMap = new Map(subs.map((s) => [s.day, s.n]));

  // Fill in the days with no traffic so the chart has no gaps.
  const out: SeriesPoint[] = [];
  const byDay = new Map(rows.map((r) => [r.day, r]));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const r = byDay.get(d);
    out.push({
      day: d,
      visitors: r?.visitors ?? 0,
      views: r?.views ?? 0,
      submissions: subMap.get(d) ?? 0,
    });
  }
  return out;
}

export interface Breakdown {
  label: string;
  count: number;
  extra?: string;
}

function breakdown(column: string, days: number, limit: number, where = ''): Breakdown[] {
  return db
    .all<{ label: string; n: number }>(
      `SELECT ${column} AS label, COUNT(*) AS n
         FROM page_views
        WHERE created_at > datetime('now', ?) AND ${column} != '' ${where}
        GROUP BY ${column} ORDER BY n DESC LIMIT ${limit}`,
      [since(days)]
    )
    .map((r) => ({ label: r.label, count: r.n }));
}

export function getTopPages(days = 30, limit = 12): Breakdown[] {
  return db
    .all<{ label: string; n: number; avg: number }>(
      `SELECT path AS label, COUNT(*) AS n, COALESCE(AVG(NULLIF(duration,0)),0) AS avg
         FROM page_views WHERE created_at > datetime('now', ?)
        GROUP BY path ORDER BY n DESC LIMIT ${limit}`,
      [since(days)]
    )
    .map((r) => ({
      label: r.label,
      count: r.n,
      extra: r.avg > 0 ? `${Math.round(r.avg)}s avg` : undefined,
    }));
}

export const getTopReferrers = (days = 30, limit = 10) => breakdown('referrer_host', days, limit);
export const getSources = (days = 30) => breakdown('source', days, 8);
export const getDevices = (days = 30) => breakdown('device', days, 5);
export const getBrowsers = (days = 30) => breakdown('browser', days, 8);
export const getOperatingSystems = (days = 30) => breakdown('os', days, 8);
export const getCampaigns = (days = 30, limit = 10) => breakdown('campaign', days, limit);

export function getTopEvents(days = 30, limit = 15): Breakdown[] {
  return db
    .all<{ label: string; n: number }>(
      `SELECT name AS label, COUNT(*) AS n FROM site_events
        WHERE created_at > datetime('now', ?)
        GROUP BY name ORDER BY n DESC LIMIT ${limit}`,
      [since(days)]
    )
    .map((r) => ({ label: r.label, count: r.n }));
}

export function getHourlyPattern(days = 30): number[] {
  const rows = db.all<{ h: string; n: number }>(
    `SELECT strftime('%H', created_at) AS h, COUNT(*) AS n
       FROM page_views WHERE created_at > datetime('now', ?)
      GROUP BY h`,
    [since(days)]
  );
  const out = new Array(24).fill(0);
  for (const r of rows) out[Number(r.h)] = r.n;
  return out;
}

export interface FunnelStep {
  label: string;
  count: number;
  note: string;
}

/** Visits through to a completed form - where people drop off. */
export function getFunnel(days = 30): FunnelStep[] {
  const p = [since(days)];
  const visitors =
    db.scalar<number>(
      "SELECT COUNT(DISTINCT visitor_hash) AS n FROM page_views WHERE created_at > datetime('now', ?)",
      p
    ) ?? 0;
  const reachedForm =
    db.scalar<number>(
      `SELECT COUNT(DISTINCT visitor_hash) AS n FROM page_views
        WHERE created_at > datetime('now', ?) AND path LIKE '/register%'`,
      p
    ) ?? 0;
  const started =
    db.scalar<number>(
      `SELECT COUNT(DISTINCT visitor_hash) AS n FROM site_events
        WHERE created_at > datetime('now', ?) AND name = 'form.start'`,
      p
    ) ?? 0;
  const submitted =
    db.scalar<number>("SELECT COUNT(*) AS n FROM submissions WHERE created_at > datetime('now', ?)", p) ?? 0;
  const approved =
    db.scalar<number>(
      "SELECT COUNT(*) AS n FROM submissions WHERE created_at > datetime('now', ?) AND status = 'approved'",
      p
    ) ?? 0;

  return [
    { label: 'Visited the website', count: visitors, note: 'unique visitors' },
    { label: 'Opened a registration form', count: reachedForm, note: 'reached /register' },
    { label: 'Started filling it in', count: started, note: 'typed in the first field' },
    { label: 'Submitted the form', count: submitted, note: 'complete submissions' },
    { label: 'Approved into contacts', count: approved, note: 'reviewed and approved' },
  ];
}

export function getLiveVisitors(): number {
  return (
    db.scalar<number>(
      "SELECT COUNT(DISTINCT visitor_hash) AS n FROM page_views WHERE created_at > datetime('now', '-5 minutes')"
    ) ?? 0
  );
}

export function getRecentActivity(limit = 20) {
  return db.all<{
    path: string;
    device: string;
    browser: string;
    source: string;
    referrer_host: string;
    created_at: string;
  }>(
    `SELECT path, device, browser, source, referrer_host, created_at
       FROM page_views ORDER BY id DESC LIMIT ${limit}`
  );
}

/** Compares a window against the one before it, for the "vs last period" line. */
export function getComparison(days = 30): { visitors: number; views: number; subs: number } {
  const cur = db.get<{ v: number; p: number }>(
    `SELECT COUNT(DISTINCT visitor_hash) AS v, COUNT(*) AS p FROM page_views
      WHERE created_at > datetime('now', ?)`,
    [since(days)]
  );
  const prev = db.get<{ v: number; p: number }>(
    `SELECT COUNT(DISTINCT visitor_hash) AS v, COUNT(*) AS p FROM page_views
      WHERE created_at > datetime('now', ?) AND created_at <= datetime('now', ?)`,
    [since(days * 2), since(days)]
  );
  const curSubs =
    db.scalar<number>("SELECT COUNT(*) AS n FROM submissions WHERE created_at > datetime('now', ?)", [
      since(days),
    ]) ?? 0;
  const prevSubs =
    db.scalar<number>(
      "SELECT COUNT(*) AS n FROM submissions WHERE created_at > datetime('now', ?) AND created_at <= datetime('now', ?)",
      [since(days * 2), since(days)]
    ) ?? 0;

  const pct = (now: number, before: number) =>
    before === 0 ? (now > 0 ? 100 : 0) : Math.round(((now - before) / before) * 100);

  return {
    visitors: pct(cur?.v ?? 0, prev?.v ?? 0),
    views: pct(cur?.p ?? 0, prev?.p ?? 0),
    subs: pct(curSubs, prevSubs),
  };
}

/** Removes detailed rows past the retention window. Daily totals are kept. */
export function pruneAnalytics(): number {
  const days = num(getSettings(), 'analytics_retention', 180);
  if (days <= 0) return 0;
  const a = db.run("DELETE FROM page_views WHERE created_at < datetime('now', ?)", [since(days)]);
  const b = db.run("DELETE FROM site_events WHERE created_at < datetime('now', ?)", [since(days)]);
  return a.changes + b.changes;
}
