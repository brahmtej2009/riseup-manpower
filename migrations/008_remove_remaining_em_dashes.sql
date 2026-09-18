-- 008_remove_remaining_em_dashes.sql
--
-- Migration 005 replaced em dashes across the settings, announcements,
-- services and team biographies, but not every text column. The job
-- designations on the team page still carried them, and so did a few other
-- columns that had no content at the time.
--
-- The website must not contain an em dash anywhere, so this finishes the job.
-- The spaced form is replaced first, so "Head — Operations" becomes
-- "Head - Operations" rather than "Head  - Operations".

UPDATE team_members SET designation = replace(designation, ' — ', ' - ') WHERE designation LIKE '%—%';
UPDATE team_members SET designation = replace(designation, '—', '-')     WHERE designation LIKE '%—%';
UPDATE team_members SET name        = replace(name, '—', '-')            WHERE name LIKE '%—%';

UPDATE services SET points = replace(points, ' — ', ' - ') WHERE points LIKE '%—%';
UPDATE services SET points = replace(points, '—', '-')     WHERE points LIKE '%—%';

UPDATE announcements SET category = replace(category, '—', '-') WHERE category LIKE '%—%';
UPDATE announcements SET tags     = replace(tags, '—', '-')     WHERE tags LIKE '%—%';

UPDATE gallery_photos SET title   = replace(title, ' — ', ' - ')   WHERE title LIKE '%—%';
UPDATE gallery_photos SET title   = replace(title, '—', '-')       WHERE title LIKE '%—%';
UPDATE gallery_photos SET caption = replace(caption, ' — ', ' - ') WHERE caption LIKE '%—%';
UPDATE gallery_photos SET caption = replace(caption, '—', '-')     WHERE caption LIKE '%—%';

UPDATE client_logos SET name = replace(name, ' — ', ' - ') WHERE name LIKE '%—%';
UPDATE client_logos SET name = replace(name, '—', '-')     WHERE name LIKE '%—%';

-- Migration 002 wrote the statistics labels with em dashes in them, and 005
-- only cleaned the value, label and hint columns it knew about at the time.
UPDATE settings SET label = replace(label, ' — ', ' - ') WHERE label LIKE '%—%';
UPDATE settings SET label = replace(label, '—', '-')     WHERE label LIKE '%—%';
UPDATE settings SET hint  = replace(hint, ' — ', ' - ')  WHERE hint  LIKE '%—%';
UPDATE settings SET hint  = replace(hint, '—', '-')      WHERE hint  LIKE '%—%';
UPDATE settings SET value = replace(value, ' — ', ' - ') WHERE value LIKE '%—%';
UPDATE settings SET value = replace(value, '—', '-')     WHERE value LIKE '%—%';
