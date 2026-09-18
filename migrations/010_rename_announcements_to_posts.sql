-- 010_rename_announcements_to_posts.sql
--
-- Announcements are renamed to posts throughout.
--
-- They were never only job notices: they are how a visitor sees what is going
-- on at the company, so "post" is the honest word for them. This renames the
-- table, the settings that drive them and the permissions that control them,
-- so nothing anywhere still calls them announcements.
--
-- No content changes. Every row, every published date and every view count is
-- carried across exactly as it was.

ALTER TABLE announcements RENAME TO posts;

-- The index moves with the table but keeps its old name, which would be
-- confusing to anyone reading the schema later.
DROP INDEX IF EXISTS idx_ann_public;
CREATE INDEX IF NOT EXISTS idx_posts_public
  ON posts (status, published_at DESC);

-- --------------------------------------------------------------------------
-- Settings keys
-- --------------------------------------------------------------------------
UPDATE settings SET key = 'posts_heading'     WHERE key = 'announcements_heading';
UPDATE settings SET key = 'posts_square'      WHERE key = 'announcements_square';
UPDATE settings SET key = 'posts_home_count'  WHERE key = 'announcements_home_count';
UPDATE settings SET key = 'posts_show_meta'   WHERE key = 'announcements_show_meta';
UPDATE settings SET key = 'hero_cta_posts'    WHERE key = 'hero_cta_announcements';

-- The wording shown beside those settings in the admin panel.
UPDATE settings SET
  label = replace(label, 'announcements', 'posts'),
  hint  = replace(hint,  'announcements', 'posts')
 WHERE label LIKE '%announcements%' OR hint LIKE '%announcements%';

UPDATE settings SET
  label = replace(label, 'Announcements', 'Posts'),
  hint  = replace(hint,  'Announcements', 'Posts')
 WHERE label LIKE '%Announcements%' OR hint LIKE '%Announcements%';

UPDATE settings SET
  label = replace(label, 'announcement', 'post'),
  hint  = replace(hint,  'announcement', 'post')
 WHERE label LIKE '%announcement%' OR hint LIKE '%announcement%';

-- The default heading, only if it was left as the one we shipped.
UPDATE settings SET value = 'Posts'
 WHERE key = 'posts_heading' AND value IN ('Announcements', 'Announcements & notices');

-- --------------------------------------------------------------------------
-- Permissions held by existing staff accounts
-- --------------------------------------------------------------------------
UPDATE users
   SET permissions = replace(permissions, 'announcements.', 'posts.')
 WHERE permissions LIKE '%announcements.%';
