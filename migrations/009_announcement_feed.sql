-- 009_announcement_feed.sql
--
-- Announcements are not only job notices. They are how a visitor sees what is
-- going on at the company, much like a social feed. So the same announcements
-- can now be shown either as the notice cards they were, or as a grid of
-- square tiles that reads like a feed.
--
-- Nothing is lost by switching: it is the same content, laid out differently,
-- and the company can change its mind at any time.

INSERT OR IGNORE INTO settings (key, value, type, group_name, label, hint, sort_order) VALUES
('announcements_square', '1', 'bool', 'home', 'Show announcements as square tiles',
 'On, they appear as a grid of squares like a social feed, and opening one shows the picture beside the full text. Off, they appear as the wider notice cards with a summary under each.', 20),
('announcements_home_count', '6', 'number', 'home', 'How many announcements on the home page',
 'Six fits the square grid neatly. Three suits the wider cards.', 21),
('announcements_show_meta', '1', 'bool', 'home', 'Show the date and view count',
 'Turn this off for a cleaner feed.', 22);

-- The heading described them as notices only.
UPDATE settings SET hint = 'Shown above the announcements on the home page.'
 WHERE key = 'announcements_heading';
