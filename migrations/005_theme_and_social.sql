-- 005_theme_and_social.sql
--
-- A proper visual identity (deep navy + red) instead of the default blue,
-- a photo gallery behind the hero, and settings for pulling social posts in
-- through an API.

-- New brand colours. INSERT OR IGNORE cannot update, so these are explicit
-- UPDATEs, guarded so a company that already chose its own colour keeps it.
UPDATE settings SET value = '#C9372C' WHERE key = 'brand_color' AND value = '#1552F0';
UPDATE settings SET value = '#E0A106' WHERE key = 'accent_color' AND value = '#F59E0B';

INSERT OR IGNORE INTO settings (key, value, type, group_name, label, hint, sort_order) VALUES
-- HERO ----------------------------------------------------------------------
('hero_gallery', '[]', 'gallery', 'home', 'Hero background photos',
 'Photographs that fade behind the heading on the home page. Add two or more and they rotate slowly.', 0),
('hero_rotating_words', '[]', 'json', 'home', 'Rotating words in the heading',
 'Optional. One word or phrase per line. They swap one after another inside the heading. Leave empty for a plain heading.', 3),
('hero_overlay', '62', 'number', 'home', 'Darkness over the photos (0-90)',
 'How dark the layer over the background photos is, so the heading stays readable.', 8),

-- SOCIAL FEED ---------------------------------------------------------------
('social_feed_enabled', '0', 'bool', 'social', 'Show recent posts on the website',
 'Pulls the latest posts in automatically. Needs the access token below.', 10),
('social_feed_count', '6', 'number', 'social', 'How many posts to show', '', 11),
('social_instagram_token', '', 'password', 'social', 'Instagram access token',
 'From a Meta / Facebook developer app connected to the Instagram business account. Posts are fetched and cached hourly.', 12),
('social_instagram_user_id', '', 'text', 'social', 'Instagram business account ID',
 'Optional. Only needed for some token types.', 13),
('social_feed_heading', 'Latest posts', 'text', 'social', 'Posts section heading', '', 14),

-- SEO / AI ASSISTANTS -------------------------------------------------------
('seo_allow_ai_crawlers', '1', 'bool', 'seo', 'Let AI assistants read the site',
 'Allows ChatGPT, Claude, Perplexity, Gemini and similar to read the public pages so they can recommend the company. Recommended.', 6),
('seo_founded_year', '', 'text', 'seo', 'Year founded (for search engines)',
 'Left blank, the year from the Company settings is used.', 7),
('seo_areas_served', '["India"]', 'json', 'seo', 'Areas served',
 'Cities, districts or states the company covers. Used by search engines and AI assistants. One per line.', 8),
('seo_faq', '[]', 'json', 'seo', 'Common questions and answers',
 'Format: question, then the answer on the next line, then a blank line. These appear in search results and are what AI assistants quote.', 9);

-- The header shows the logo, so the tagline beside it was redundant.
UPDATE settings SET hint = 'Shown in the footer and in search results, not in the header.'
 WHERE key = 'tagline';

-- Remove em dashes from every stored setting value and hint.
UPDATE settings SET value = replace(value, ' — ', ' - ') WHERE value LIKE '%—%';
UPDATE settings SET value = replace(value, '—', '-')     WHERE value LIKE '%—%';
UPDATE settings SET hint  = replace(hint,  ' — ', ' - ') WHERE hint  LIKE '%—%';
UPDATE settings SET hint  = replace(hint,  '—', '-')     WHERE hint  LIKE '%—%';
UPDATE settings SET label = replace(label, '—', '-')     WHERE label LIKE '%—%';

UPDATE announcements SET
  title     = replace(title, '—', '-'),
  excerpt   = replace(excerpt, '—', '-'),
  body_html = replace(body_html, '—', '-')
 WHERE title LIKE '%—%' OR excerpt LIKE '%—%' OR body_html LIKE '%—%';

UPDATE services SET
  title       = replace(title, '—', '-'),
  summary     = replace(summary, '—', '-'),
  description = replace(description, '—', '-')
 WHERE title LIKE '%—%' OR summary LIKE '%—%' OR description LIKE '%—%';

UPDATE team_members SET bio = replace(bio, '—', '-') WHERE bio LIKE '%—%';
