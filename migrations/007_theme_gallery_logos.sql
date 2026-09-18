-- 007_theme_gallery_logos.sql
--
-- Three things:
--   1. A light and a dark mode for the public website, chosen by the company
--      and switchable by the visitor.
--   2. A photo gallery managed from the admin panel.
--   3. A moving row of client logos, also managed from the admin panel.

-- --------------------------------------------------------------------------
-- Photo gallery
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_photos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  path        TEXT    NOT NULL,
  title       TEXT    NOT NULL DEFAULT '',
  caption     TEXT    NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_visible  INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gallery_order ON gallery_photos (is_visible, sort_order);

-- --------------------------------------------------------------------------
-- Client logos
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_logos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  path        TEXT    NOT NULL,
  url         TEXT    NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_visible  INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logos_order ON client_logos (is_visible, sort_order);

-- --------------------------------------------------------------------------
-- Settings
-- --------------------------------------------------------------------------
INSERT OR IGNORE INTO settings (key, value, type, group_name, label, hint, sort_order) VALUES
-- APPEARANCE ---------------------------------------------------------------
('theme_dark_default', '0', 'bool', 'theme', 'Open the website in dark mode',
 'Off means visitors arrive on the light version. Either way they can switch, and their choice is remembered on their own device.', 0),
('theme_toggle_show', '1', 'bool', 'theme', 'Show the light and dark switch',
 'Puts a small sun and moon button in the header. Turn it off to lock the website to the mode chosen above.', 1),
('theme_follow_device', '1', 'bool', 'theme', 'Follow the visitor device setting',
 'A phone or computer set to dark mode opens the website in dark mode. The setting above is used when the device has no preference.', 2),
('theme_corner_style', 'rounded', 'text', 'theme', 'Corner style',
 'Type rounded for soft corners, or square for straight ones.', 3),

-- HOME SECTIONS ------------------------------------------------------------
('services_show_home', '1', 'bool', 'home', 'Show What we do on the home page',
 'The services are managed on the Services screen.', 12),
('gallery_show_home', '1', 'bool', 'home', 'Show the photo gallery on the home page',
 'The photographs are managed on the Photo gallery screen.', 30),
('gallery_heading', 'Gallery', 'text', 'home', 'Gallery heading', '', 31),
('gallery_intro', '', 'textarea', 'home', 'Gallery intro', 'Optional. Left blank, nothing is shown.', 32),
('gallery_limit', '8', 'number', 'home', 'How many photographs on the home page',
 'The rest are still kept, they simply are not shown on the home page.', 33),

('logos_show_home', '1', 'bool', 'home', 'Show the moving row of client logos',
 'The logos are managed on the Client logos screen.', 40),
('logos_heading', 'Companies we have worked with', 'text', 'home', 'Client logos heading',
 'Left blank, the row is shown without a heading.', 41),
('logos_height', '40', 'number', 'home', 'Logo height in pixels',
 'Every logo is scaled to this height and keeps its own width, so a wide logo and a square one sit together evenly. Between 20 and 90.', 42),
('logos_speed', '38', 'number', 'home', 'Seconds for one full pass',
 'Higher is slower. Between 10 and 120.', 43),
('logos_grayscale', '1', 'bool', 'home', 'Show the logos in grey',
 'They return to full colour when a visitor points at them.', 44);

-- The heading was already there but had no switch of its own.
UPDATE settings SET sort_order = 10 WHERE key = 'services_heading';
UPDATE settings SET sort_order = 11 WHERE key = 'services_intro';
