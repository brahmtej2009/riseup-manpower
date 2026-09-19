-- ==========================================================================
-- 016: Wording on the inner pages, and automatic updates
--
-- The contact page and the two registration pages had their wording written
-- into the code. Like the menu and the footer in 015, each is now a setting
-- that falls back to its old wording when left empty, and is edited by
-- clicking it in the website editor.
--
-- Automatic updates are off until someone switches them on.
-- ==========================================================================

INSERT OR IGNORE INTO settings (key, value, type, group_name, label, hint, sort_order, options) VALUES
('contact_heading',            'Get in touch',                'text', 'wording', 'Contact page heading',        '', 20, ''),
('contact_label_office',       'Office',                      'text', 'wording', 'Contact: office label',       '', 21, ''),
('contact_label_phone',        'Phone',                       'text', 'wording', 'Contact: phone label',        '', 22, ''),
('contact_label_email',        'Email',                       'text', 'wording', 'Contact: email label',        '', 23, ''),
('contact_label_open',         'Open',                        'text', 'wording', 'Contact: hours label',        '', 24, ''),
('contact_employer_text',      'Send a staffing requirement', 'text', 'wording', 'Contact: employer card line', '', 25, ''),
('contact_candidate_text',     'Register as a candidate',     'text', 'wording', 'Contact: candidate card line','', 26, ''),
('contact_continue',           'Continue',                    'text', 'wording', 'Contact: card link',          '', 27, ''),
('register_employer_heading',  'Register as an employer',     'text', 'wording', 'Employer page heading',       '', 28, ''),
('register_candidate_heading', 'Register as a candidate',     'text', 'wording', 'Candidate page heading',      '', 29, '');

INSERT OR IGNORE INTO settings (key, value, type, group_name, label, hint, sort_order, options) VALUES
('sys_auto_update', '0', 'bool', 'system', 'Update automatically',
 'The server checks the repository by itself every 15 minutes and installs a newer version when there is one, with the same backup and automatic rollback as a manual update.', 30, '');
