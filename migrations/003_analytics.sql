-- 003_analytics.sql
--
-- Built-in visitor analytics.
--
-- Privacy note: no IP address and no user agent string is ever stored. A
-- visitor is identified by a hash of (IP + user agent + a salt that changes
-- every day), which is enough to count the same person twice in a day but
-- cannot be reversed, and cannot be joined up across days. No cookie is set
-- for tracking, so no consent banner is required.

CREATE TABLE page_views (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_hash  TEXT    NOT NULL,          -- daily-rotating, irreversible
  session_id    TEXT    NOT NULL DEFAULT '',
  path          TEXT    NOT NULL,
  title         TEXT    NOT NULL DEFAULT '',
  referrer      TEXT    NOT NULL DEFAULT '',
  referrer_host TEXT    NOT NULL DEFAULT '',
  source        TEXT    NOT NULL DEFAULT 'direct',  -- direct|search|social|referral|campaign
  campaign      TEXT    NOT NULL DEFAULT '',        -- utm_campaign / utm_source
  device        TEXT    NOT NULL DEFAULT 'desktop', -- desktop|mobile|tablet
  browser       TEXT    NOT NULL DEFAULT '',
  os            TEXT    NOT NULL DEFAULT '',
  screen_w      INTEGER,
  -- Seconds spent on the page, sent when the visitor leaves.
  duration      INTEGER NOT NULL DEFAULT 0,
  is_new        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_pv_created ON page_views(created_at DESC);
CREATE INDEX idx_pv_path ON page_views(path, created_at DESC);
CREATE INDEX idx_pv_visitor ON page_views(visitor_hash, created_at DESC);
CREATE INDEX idx_pv_session ON page_views(session_id);

-- Interactions worth counting: button clicks, form steps, downloads.
CREATE TABLE site_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_hash TEXT    NOT NULL DEFAULT '',
  session_id   TEXT    NOT NULL DEFAULT '',
  name         TEXT    NOT NULL,           -- e.g. cta.employer, form.submit
  category     TEXT    NOT NULL DEFAULT 'general',
  label        TEXT    NOT NULL DEFAULT '',
  path         TEXT    NOT NULL DEFAULT '',
  value        INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_ev_created ON site_events(created_at DESC);
CREATE INDEX idx_ev_name ON site_events(name, created_at DESC);
CREATE INDEX idx_ev_session ON site_events(session_id);

-- One row per day, filled in by a rollup so the dashboard stays fast even
-- after years of traffic. Raw rows older than the retention window are
-- deleted; these totals are kept for ever.
CREATE TABLE analytics_daily (
  day            TEXT PRIMARY KEY,          -- YYYY-MM-DD
  visitors       INTEGER NOT NULL DEFAULT 0,
  new_visitors   INTEGER NOT NULL DEFAULT 0,
  sessions       INTEGER NOT NULL DEFAULT 0,
  page_views     INTEGER NOT NULL DEFAULT 0,
  events         INTEGER NOT NULL DEFAULT 0,
  form_starts    INTEGER NOT NULL DEFAULT 0,
  submissions    INTEGER NOT NULL DEFAULT 0,
  messages       INTEGER NOT NULL DEFAULT 0,
  avg_duration   INTEGER NOT NULL DEFAULT 0,
  bounce_pct     INTEGER NOT NULL DEFAULT 0,
  mobile_pct     INTEGER NOT NULL DEFAULT 0,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (key, value, type, group_name, label, hint, sort_order) VALUES
('analytics_enabled',    '1',  'bool',   'analytics', 'Record visitor statistics', 'Counts visits and interactions on the website. No personal data and no cookies are used.', 1),
('analytics_retention',  '180','number', 'analytics', 'Keep detailed records for (days)', 'Daily totals are kept for ever. Detailed rows older than this are removed.', 2),
('analytics_ignore_admin','1', 'bool',   'analytics', 'Do not count your own staff', 'Visits from a signed-in admin are ignored.', 3),
('analytics_ignore_paths','["/admin","/api"]', 'json', 'analytics', 'Paths to ignore', 'One per line.', 4);
