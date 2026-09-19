-- 014_admin_ui_and_copyright.sql
--
-- Three things:
--   1. The footer shows a copyright range, starting from the year the
--      company wants to claim, not just the current year.
--   2. Settings can offer a fixed list of choices, so a field like the
--      corner style is a dropdown rather than a box you have to guess at.
--   3. The corner style becomes one of those dropdowns.
--
-- Nothing is deleted. Settings that are no longer shown anywhere on the site
-- are simply left alone rather than removed, so no wording a company typed
-- in is ever thrown away by an update.

-- --------------------------------------------------------------------------
-- A fixed list of choices for a setting
-- --------------------------------------------------------------------------
-- Stored as a JSON array of {value,label} pairs. Empty for every setting
-- that is free text, which is almost all of them.
ALTER TABLE settings ADD COLUMN options TEXT NOT NULL DEFAULT '';

UPDATE settings
   SET type = 'select',
       options = '[{"value":"rounded","label":"Rounded"},{"value":"square","label":"Square"}]',
       label = 'Corner style',
       hint = 'Rounded softens every card, button and photograph. Square keeps them sharp.'
 WHERE key = 'theme_corner_style';

-- Anything that was typed by hand before this became a dropdown, and is not
-- one of the two valid choices, falls back to the default.
UPDATE settings
   SET value = 'rounded'
 WHERE key = 'theme_corner_style' AND value NOT IN ('rounded', 'square');

-- --------------------------------------------------------------------------
-- Copyright line in the footer
-- --------------------------------------------------------------------------
INSERT OR IGNORE INTO settings (key, value, type, group_name, label, hint, sort_order, options) VALUES
('copyright_start_year', '2022', 'text', 'company', 'Copyright start year',
 'The first year in the footer line, for example 2022. The current year is added automatically. Leave it blank to show only the current year.', 9, '');
