-- 004_minimal_frontend.sql
--
-- The public site was cut back to only the pages the company asked for:
-- home, the two registration forms, announcements, team and contact.
--
-- The copy that was written to fill those removed sections is cleared here,
-- rather than left sitting in the settings screen where it would look like
-- something the company had written. The keys stay, so the company can put
-- their own words in later if they want to.

UPDATE settings SET value = '' WHERE key IN (
  'hero_eyebrow',
  'hero_subtitle',
  'short_description',
  'services_intro',
  'team_intro',
  'cta_text'
);

-- These sections no longer appear on the public site.
UPDATE settings SET value = '[]' WHERE key IN ('why_points', 'industries_list');

-- Headings that are still used, shortened.
UPDATE settings SET value = 'Announcements' WHERE key = 'announcements_heading';
UPDATE settings SET value = 'Our team'      WHERE key = 'team_heading';

INSERT OR IGNORE INTO settings (key, value, type, group_name, label, hint, sort_order) VALUES
('hero_note', '', 'text', 'home', 'Hero — small line under the buttons',
 'Optional. Left blank, nothing is shown.', 9);
