-- ==========================================================================
-- 015: Every piece of wording on the website can be edited in the preview
--
-- The menu, the header buttons and the footer used to be written into the
-- code. They are settings now, so they can be changed by selecting them in
-- the website editor like the headings already could. Each one falls back to
-- its old wording when it is left empty, so nothing on the site can go blank.
--
-- Kept in their own group, "wording", which the Settings screen does not
-- list: they are only ever changed from the website editor.
-- ==========================================================================

INSERT OR IGNORE INTO settings (key, value, type, group_name, label, hint, sort_order, options) VALUES
('nav_home',            'Home',                'text', 'wording', 'Menu: Home',              '', 1,  ''),
('nav_team',            'Our Team',            'text', 'wording', 'Menu: Our team',          '', 2,  ''),
('nav_posts',           'Posts',               'text', 'wording', 'Menu: Posts',             '', 3,  ''),
('nav_contact',         'Contact',             'text', 'wording', 'Menu: Contact',           '', 4,  ''),
('header_cta',          'Hire Staff',          'text', 'wording', 'Header button',           '', 5,  ''),
('menu_cta_candidate',  'Find a Job',          'text', 'wording', 'Mobile menu job button',  '', 6,  ''),
('posts_see_all',       'See all',             'text', 'wording', 'Posts link',              '', 7,  ''),
('team_see_all',        'See the team',        'text', 'wording', 'Team link',               '', 8,  ''),
('footer_links_heading','Company',             'text', 'wording', 'Footer links heading',    '', 9,  ''),
('footer_contact_heading','Get in touch',      'text', 'wording', 'Footer contact heading',  '', 10, ''),
('footer_whatsapp',     'Message on WhatsApp', 'text', 'wording', 'WhatsApp button',         '', 11, ''),
('footer_rights',       'All rights reserved.','text', 'wording', 'Copyright wording',       '', 12, ''),
('footer_staff_login',  'Staff login',         'text', 'wording', 'Staff login link',        '', 13, '');
