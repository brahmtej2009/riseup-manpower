-- 001_init.sql — base schema.
-- Migrations are append-only. Never edit a migration that has shipped;
-- add a new numbered file instead. Each file runs exactly once, inside a
-- transaction, and is recorded in _migrations.

-- ---------------------------------------------------------------------------
-- Admin users, sessions, permissions
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT    NOT NULL UNIQUE,
  email          TEXT,
  full_name      TEXT    NOT NULL DEFAULT '',
  password_hash  TEXT    NOT NULL,
  -- JSON array of permission keys. Ignored when is_super = 1.
  permissions    TEXT    NOT NULL DEFAULT '[]',
  role           TEXT    NOT NULL DEFAULT 'staff',
  is_super       INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  -- Brute-force protection.
  failed_logins  INTEGER NOT NULL DEFAULT 0,
  locked_until   TEXT,
  last_login_at  TEXT,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_username ON users(username);

CREATE TABLE sessions (
  id          TEXT    PRIMARY KEY,          -- random 32-byte hex
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip          TEXT,
  user_agent  TEXT,
  expires_at  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

-- ---------------------------------------------------------------------------
-- Public form submissions (the review queue)
-- ---------------------------------------------------------------------------
CREATE TABLE submissions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ref            TEXT    NOT NULL UNIQUE,   -- e.g. EMP-2609-0042
  type           TEXT    NOT NULL CHECK (type IN ('employer','candidate')),
  status         TEXT    NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new','reviewing','approved','rejected')),
  -- Denormalised columns so lists and search stay fast.
  name           TEXT    NOT NULL DEFAULT '',
  email          TEXT    NOT NULL DEFAULT '',
  phone          TEXT    NOT NULL DEFAULT '',
  city           TEXT    NOT NULL DEFAULT '',
  state          TEXT    NOT NULL DEFAULT '',
  headline       TEXT    NOT NULL DEFAULT '',  -- company name or job category
  -- Everything submitted, as JSON. Survives form changes without migrations.
  data           TEXT    NOT NULL DEFAULT '{}',
  resume_path    TEXT,
  photo_path     TEXT,
  ip             TEXT,
  user_agent     TEXT,
  review_note    TEXT,
  reviewed_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at    TEXT,
  contact_id     INTEGER,                   -- set once approved
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sub_type_status ON submissions(type, status, created_at DESC);
CREATE INDEX idx_sub_created ON submissions(created_at DESC);

-- ---------------------------------------------------------------------------
-- Approved contacts
-- ---------------------------------------------------------------------------
CREATE TABLE contacts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ref            TEXT    NOT NULL UNIQUE,
  type           TEXT    NOT NULL CHECK (type IN ('employer','candidate')),
  status         TEXT    NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new','in_progress','placed','on_hold','closed')),
  name           TEXT    NOT NULL DEFAULT '',
  email          TEXT    NOT NULL DEFAULT '',
  phone          TEXT    NOT NULL DEFAULT '',
  alt_phone      TEXT    NOT NULL DEFAULT '',
  city           TEXT    NOT NULL DEFAULT '',
  state          TEXT    NOT NULL DEFAULT '',
  headline       TEXT    NOT NULL DEFAULT '',
  data           TEXT    NOT NULL DEFAULT '{}',
  tags           TEXT    NOT NULL DEFAULT '[]',
  resume_path    TEXT,
  photo_path     TEXT,
  submission_id  INTEGER REFERENCES submissions(id) ON DELETE SET NULL,
  approved_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at    TEXT,
  -- Counts toward the public "placed" statistic when type = 'candidate'.
  placed_at      TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_contacts_type ON contacts(type, created_at DESC);
CREATE INDEX idx_contacts_status ON contacts(type, status);

-- Private internal notes on a contact. Never public.
CREATE TABLE contact_notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id  INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT    NOT NULL DEFAULT '',  -- kept if the user is deleted
  body        TEXT    NOT NULL,
  pinned      INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notes_contact ON contact_notes(contact_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------
CREATE TABLE announcements (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT    NOT NULL UNIQUE,
  title         TEXT    NOT NULL,
  excerpt       TEXT    NOT NULL DEFAULT '',
  body_html     TEXT    NOT NULL DEFAULT '',   -- sanitised on save
  cover_path    TEXT,
  category      TEXT    NOT NULL DEFAULT 'General',
  tags          TEXT    NOT NULL DEFAULT '[]',
  status        TEXT    NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','published')),
  pinned        INTEGER NOT NULL DEFAULT 0,
  urgent        INTEGER NOT NULL DEFAULT 0,
  views         INTEGER NOT NULL DEFAULT 0,
  published_at  TEXT,
  author_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_name   TEXT    NOT NULL DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_ann_public ON announcements(status, pinned DESC, published_at DESC);

-- ---------------------------------------------------------------------------
-- Contact-form messages
-- ---------------------------------------------------------------------------
CREATE TABLE messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  email       TEXT    NOT NULL DEFAULT '',
  phone       TEXT    NOT NULL DEFAULT '',
  subject     TEXT    NOT NULL DEFAULT '',
  body        TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'unread'
              CHECK (status IN ('unread','read','archived')),
  important   INTEGER NOT NULL DEFAULT 0,
  admin_note  TEXT    NOT NULL DEFAULT '',
  ip          TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_messages_status ON messages(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Team members shown on the public site
-- ---------------------------------------------------------------------------
CREATE TABLE team_members (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  designation  TEXT    NOT NULL DEFAULT '',
  bio          TEXT    NOT NULL DEFAULT '',
  photo_path   TEXT,
  email        TEXT    NOT NULL DEFAULT '',
  phone        TEXT    NOT NULL DEFAULT '',
  linkedin     TEXT    NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_visible   INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_team_order ON team_members(is_visible, sort_order);

-- ---------------------------------------------------------------------------
-- Services shown on the public site
-- ---------------------------------------------------------------------------
CREATE TABLE services (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT    NOT NULL UNIQUE,
  title        TEXT    NOT NULL,
  summary      TEXT    NOT NULL DEFAULT '',
  description  TEXT    NOT NULL DEFAULT '',
  icon         TEXT    NOT NULL DEFAULT 'Briefcase',
  points       TEXT    NOT NULL DEFAULT '[]',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_visible   INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Media library
-- ---------------------------------------------------------------------------
CREATE TABLE media (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  filename      TEXT    NOT NULL,
  original_name TEXT    NOT NULL DEFAULT '',
  path          TEXT    NOT NULL,           -- public URL path, e.g. /uploads/x.webp
  mime          TEXT    NOT NULL DEFAULT '',
  size          INTEGER NOT NULL DEFAULT 0,
  width         INTEGER,
  height        INTEGER,
  alt           TEXT    NOT NULL DEFAULT '',
  folder        TEXT    NOT NULL DEFAULT 'general',
  uploaded_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_media_created ON media(created_at DESC);

-- ---------------------------------------------------------------------------
-- Settings — every configurable value on the site
-- ---------------------------------------------------------------------------
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'text',  -- text|textarea|number|bool|json|image|color
  group_name  TEXT NOT NULL DEFAULT 'general',
  label       TEXT NOT NULL DEFAULT '',
  hint        TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name   TEXT    NOT NULL DEFAULT '',
  action      TEXT    NOT NULL,
  entity      TEXT    NOT NULL DEFAULT '',
  entity_id   TEXT    NOT NULL DEFAULT '',
  detail      TEXT    NOT NULL DEFAULT '',
  ip          TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ---------------------------------------------------------------------------
-- Rate limiting for public endpoints (keeps forms from being flooded)
-- ---------------------------------------------------------------------------
CREATE TABLE rate_limits (
  bucket      TEXT    NOT NULL,
  identifier  TEXT    NOT NULL,
  count       INTEGER NOT NULL DEFAULT 0,
  window_start TEXT   NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (bucket, identifier)
);
