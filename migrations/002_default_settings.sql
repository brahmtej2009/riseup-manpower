-- 002_default_settings.sql
--
-- Seeds the settings table with every configurable value on the site.
-- INSERT OR IGNORE means an update can add NEW settings in a later migration
-- without ever overwriting a value the company has already customised.

INSERT OR IGNORE INTO settings (key, value, type, group_name, label, hint, sort_order) VALUES

-- BRANDING -------------------------------------------------------------------
('logo_path',        '',            'image',  'branding', 'Square logo',        'Square image, at least 256x256. Shown in the header and footer.', 1),
('logo_alt_path',    '',            'image',  'branding', 'Logo for dark areas','Optional. Used on dark backgrounds if the main logo is not readable there.', 2),
('favicon_path',     '',            'image',  'branding', 'Favicon',            'Small square icon shown on the browser tab.', 3),
('brand_color',      '#1552F0',     'color',  'branding', 'Primary colour',     'Buttons, links and highlights.', 4),
('accent_color',     '#F59E0B',     'color',  'branding', 'Accent colour',      'Used sparingly for emphasis.', 5),

-- COMPANY --------------------------------------------------------------------
('company_name',     'Rise Up Manpower', 'text', 'company', 'Company name', '', 1),
('company_legal_name','Rise Up Manpower Services', 'text', 'company', 'Legal name', 'Used in the footer and on documents.', 2),
('tagline',          'Manpower recruitment and contract staffing', 'text', 'company', 'Tagline', 'One line, shown under the company name.', 3),
('short_description','We supply verified skilled, semi-skilled and unskilled manpower to industries across India, and place candidates in steady employment.', 'textarea', 'company', 'Short description', 'Used on the home page and in search results.', 4),
('about_html',       '<p>Rise Up Manpower is a manpower recruitment and contract staffing firm. We work with manufacturing units, construction companies, warehouses, hotels and facility management companies to supply staff on contract and on a permanent basis.</p><p>Every candidate we send is document-verified and reference-checked. We handle the paperwork, the compliance and the follow-up, so that the client gets people who turn up and stay.</p>', 'html', 'company', 'About the company', 'Shown on the About page.', 5),
('founded_year',     '2015',        'number', 'company', 'Year established', 'Used to calculate the years-in-operation figure.', 6),
('license_no',       '',            'text',   'company', 'Licence number', 'Labour licence / recruitment licence number, if any.', 7),
('gst_no',           '',            'text',   'company', 'GST number', '', 8),
('cin_no',           '',            'text',   'company', 'CIN / registration number', '', 9),

-- CONTACT --------------------------------------------------------------------
('phone_primary',    '+91 00000 00000', 'text', 'contact', 'Phone (primary)', '', 1),
('phone_secondary',  '',            'text',   'contact', 'Phone (secondary)', '', 2),
('whatsapp_number',  '',            'text',   'contact', 'WhatsApp number', 'Digits with country code, no spaces. e.g. 919876543210', 3),
('email_primary',    'info@riseupmanpower.com', 'text', 'contact', 'Email (primary)', '', 4),
('email_hr',         '',            'text',   'contact', 'Email (HR / careers)', '', 5),
('address_line1',    '',            'text',   'contact', 'Address line 1', '', 6),
('address_line2',    '',            'text',   'contact', 'Address line 2', '', 7),
('address_city',     '',            'text',   'contact', 'City', '', 8),
('address_state',    '',            'text',   'contact', 'State', '', 9),
('address_pincode',  '',            'text',   'contact', 'PIN code', '', 10),
('address_country',  'India',       'text',   'contact', 'Country', '', 11),
('map_embed',        '',            'textarea','contact','Google Maps embed', 'Paste the full <iframe> embed code from Google Maps.', 12),
('working_days',     'Monday to Saturday', 'text', 'contact', 'Working days', '', 13),
('working_hours',    '9:30 AM to 6:30 PM', 'text', 'contact', 'Working hours', '', 14),

-- STATISTICS -----------------------------------------------------------------
('stats_employers_auto',  '1', 'bool',   'stats', 'Employers served — count automatically', 'Counts approved employer contacts.', 1),
('stats_employers_value', '0', 'number', 'stats', 'Employers served — manual figure', 'Used only when the automatic count is switched off.', 2),
('stats_employers_label', 'Employers served', 'text', 'stats', 'Employers served — label', '', 3),
('stats_placed_auto',     '1', 'bool',   'stats', 'Candidates placed — count automatically', 'Counts candidate contacts marked as placed.', 4),
('stats_placed_value',    '0', 'number', 'stats', 'Candidates placed — manual figure', '', 5),
('stats_placed_label',    'Candidates placed', 'text', 'stats', 'Candidates placed — label', '', 6),
('stats_years_auto',      '1', 'bool',   'stats', 'Years in operation — calculate automatically', 'Calculated from the year established.', 7),
('stats_years_value',     '0', 'number', 'stats', 'Years in operation — manual figure', '', 8),
('stats_years_label',     'Years in operation', 'text', 'stats', 'Years in operation — label', '', 9),
('stats_industries_auto', '0', 'bool',   'stats', 'Industries covered — count automatically', 'Counts distinct industries across employer contacts.', 10),
('stats_industries_value','12','number', 'stats', 'Industries covered — manual figure', '', 11),
('stats_industries_label','Industries covered', 'text', 'stats', 'Industries covered — label', '', 12),
('stats_show',            '1', 'bool',   'stats', 'Show the statistics row', '', 13),

-- HOME PAGE ------------------------------------------------------------------
('hero_eyebrow',     'Recruitment & contract staffing', 'text', 'home', 'Hero — small line above the heading', '', 1),
('hero_title',       'The right people,', 'text', 'home', 'Hero — heading', '', 2),
('hero_title_accent','on the day you need them', 'text', 'home', 'Hero — highlighted part of the heading', 'Shown in the brand colour, on its own line.', 3),
('hero_subtitle',    'We supply verified manpower to factories, sites, warehouses and offices — and we place candidates in steady, documented employment.', 'textarea', 'home', 'Hero — sub-heading', '', 4),
('hero_cta_employer','I need manpower', 'text', 'home', 'Hero — employer button', '', 5),
('hero_cta_candidate','I am looking for a job', 'text', 'home', 'Hero — candidate button', '', 6),
('hero_cta_announcements','Announcements', 'text', 'home', 'Hero — announcements button', '', 7),
('hero_image',       '',            'image',  'home', 'Hero — image', 'Optional. A photograph shown beside the heading.', 8),
('services_heading', 'What we do',  'text',   'home', 'Services — heading', '', 10),
('services_intro',   'Staffing support for industries that need people who are verified, documented and ready to start.', 'textarea', 'home', 'Services — intro', '', 11),
('industries_heading','Industries we serve', 'text', 'home', 'Industries — heading', '', 12),
('industries_list',  '["Manufacturing","Construction","Logistics & Warehousing","Hospitality","Facility Management","Healthcare","Retail","Office & Back-office"]', 'json', 'home', 'Industries — list', 'One industry per line.', 13),
('process_heading',  'How it works', 'text',  'home', 'Process — heading', '', 14),
('team_heading',     'Our team',    'text',   'home', 'Team — heading', '', 15),
('team_intro',       'The people you will be dealing with.', 'textarea', 'home', 'Team — intro', '', 16),
('team_show_home',   '1',           'bool',   'home', 'Show the team row on the home page', '', 17),
('announcements_heading','Announcements & notices', 'text', 'home', 'Announcements — heading', '', 18),
('why_heading',      'Why companies stay with us', 'text', 'home', 'Why choose us — heading', '', 19),
('why_points',       '["Every candidate is document-verified before we send them","Replacement provided free within the agreed period","Compliance, ESI, PF and wage records handled end to end","Requirements confirmed within 24 hours","One point of contact for the whole account"]', 'json', 'home', 'Why choose us — points', 'One point per line.', 20),
('cta_heading',      'Tell us what you need', 'text', 'home', 'Closing section — heading', '', 21),
('cta_text',         'Send us your requirement and we will come back with candidates and rates.', 'textarea', 'home', 'Closing section — text', '', 22),

-- SOCIAL ---------------------------------------------------------------------
('social_facebook',  '',            'text',   'social', 'Facebook page URL', '', 1),
('social_instagram', '',            'text',   'social', 'Instagram profile URL', '', 2),
('social_linkedin',  '',            'text',   'social', 'LinkedIn page URL', '', 3),
('social_youtube',   '',            'text',   'social', 'YouTube channel URL', '', 4),
('social_twitter',   '',            'text',   'social', 'X / Twitter URL', '', 5),
('social_show',      '1',           'bool',   'social', 'Show the social media section', '', 6),
('social_heading',   'Follow us',   'text',   'social', 'Social section — heading', '', 7),
('social_embed',     '',            'textarea','social', 'Instagram / Facebook feed embed', 'Optional. Paste an embed code from Instagram or Facebook to show a live feed.', 8),

-- FORM OPTIONS ---------------------------------------------------------------
('opt_job_categories','["Factory / Production Worker","Helper / Unskilled Labour","Machine Operator","Welder / Fitter","Electrician","Plumber","Carpenter","Mason","Driver (LMV)","Driver (HMV)","Security Guard","Housekeeping Staff","Cook / Kitchen Staff","Waiter / Steward","Warehouse / Packing Staff","Loader / Unloader","Store Keeper","Data Entry Operator","Office Assistant","Accountant","Receptionist","Sales Executive","Supervisor","Site Engineer","Nurse / Ward Boy","Technician","Tailor / Garment Worker","Other"]', 'json', 'forms', 'Job categories', 'Used in both registration forms. One per line.', 1),
('opt_industries',   '["Manufacturing","Construction & Infrastructure","Logistics & Warehousing","Hospitality & Hotels","Facility Management","Healthcare","Retail","Food Processing","Textile & Garments","Automobile","Pharmaceutical","IT & Offices","Education","Agriculture","Other"]', 'json', 'forms', 'Industries', 'Shown to employers. One per line.', 2),
('opt_states',       '["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman & Nicobar Islands","Chandigarh","Dadra & Nagar Haveli and Daman & Diu","Jammu & Kashmir","Ladakh","Lakshadweep","Puducherry"]', 'json', 'forms', 'States', 'One per line.', 3),
('opt_skill_levels', '["Unskilled","Semi-skilled","Skilled","Highly skilled / Technical","Supervisory","Managerial"]', 'json', 'forms', 'Skill levels', '', 4),
('opt_shifts',       '["General shift","Day shift","Night shift","Rotational shifts","12 hour duty","Flexible"]', 'json', 'forms', 'Shift types', '', 5),
('opt_qualifications','["Below 10th","10th pass","12th pass","ITI","Diploma","Graduate","Post Graduate","Other"]', 'json', 'forms', 'Qualifications', '', 6),
('opt_urgency',      '["Immediately","Within a week","Within 15 days","Within a month","Planning ahead"]', 'json', 'forms', 'Requirement urgency', '', 7),
('opt_availability', '["Immediate","Within 15 days","Within 30 days","Serving notice period","Only after a specific date"]', 'json', 'forms', 'Candidate availability', '', 8),
('opt_languages',    '["Hindi","English","Bengali","Marathi","Telugu","Tamil","Gujarati","Kannada","Malayalam","Punjabi","Odia","Assamese","Urdu"]', 'json', 'forms', 'Languages', '', 9),
('form_employer_note','', 'textarea', 'forms', 'Note shown on the employer form', '', 10),
('form_candidate_note','No registration fee is charged at any stage.', 'textarea', 'forms', 'Note shown on the candidate form', '', 11),
('form_success_message','Thank you. Your details have been received. Our team will contact you within 1-2 working days.', 'textarea', 'forms', 'Message shown after a form is submitted', '', 12),

-- SEO ------------------------------------------------------------------------
('seo_title',        'Rise Up Manpower — Recruitment & Contract Staffing', 'text', 'seo', 'Site title', 'Shown on the browser tab and in search results.', 1),
('seo_description',  'Manpower recruitment and contract staffing. Verified skilled, semi-skilled and unskilled workers supplied to industry, and candidate placement across India.', 'textarea', 'seo', 'Site description', 'Around 150-160 characters.', 2),
('seo_keywords',     'manpower agency, contract staffing, labour supply, recruitment agency, housekeeping staff, security guards, factory workers', 'textarea', 'seo', 'Keywords', '', 3),
('seo_og_image',     '',            'image',  'seo', 'Share image', 'Shown when the site is shared on WhatsApp or Facebook. 1200x630.', 4),
('seo_analytics',    '',            'textarea','seo', 'Analytics code', 'Pasted into the page head. Google Analytics, Search Console verification, etc.', 5),

-- EMAIL ----------------------------------------------------------------------
('mail_enabled',     '0',           'bool',   'email', 'Send email notifications', 'Turn on after the SMTP details below are filled in.', 1),
('mail_host',        '',            'text',   'email', 'SMTP host', 'e.g. smtp.gmail.com', 2),
('mail_port',        '587',         'number', 'email', 'SMTP port', '587 for TLS, 465 for SSL.', 3),
('mail_user',        '',            'text',   'email', 'SMTP username', '', 4),
('mail_pass',        '',            'password','email','SMTP password', 'Stored in the database. Use an app password, not your main password.', 5),
('mail_from',        '',            'text',   'email', 'Send from address', '', 6),
('mail_notify_to',   '',            'text',   'email', 'Notify these addresses', 'Comma separated. Alerts for new submissions and messages.', 7),

-- SYSTEM ---------------------------------------------------------------------
('sys_repo_url',     '',            'text',   'system', 'Code repository (GitHub)', 'Used by the update system.', 1),
('sys_update_branch','main',        'text',   'system', 'Update branch', '', 2),
('sys_backup_retention','10',       'number', 'system', 'Backups to keep', 'Older backups are removed automatically.', 3),
('sys_maintenance',  '0',           'bool',   'system', 'Maintenance mode', 'Shows a holding page to visitors. The admin panel stays available.', 4),
('sys_maintenance_text','We are carrying out scheduled maintenance. Please check back shortly.', 'textarea', 'system', 'Maintenance message', '', 5),
('sys_footer_note',  '',            'textarea','system', 'Extra footer line', 'Optional. Shown at the very bottom of every page.', 6);


-- Default services so a fresh installation is not empty.
INSERT OR IGNORE INTO services (slug, title, summary, description, icon, points, sort_order) VALUES
('contract-staffing', 'Contract Staffing',
 'Workers on our rolls, deployed at your site, with all compliance handled.',
 'We employ the staff, run their payroll, maintain statutory records and deploy them at your premises. You get the manpower without adding to your own headcount or compliance burden.',
 'Users',
 '["Staff on our payroll","PF, ESI and wage registers maintained","Monthly invoicing","Replacement on request"]', 1),

('housekeeping', 'Housekeeping & Facility Staff',
 'Trained housekeeping teams for offices, plants, hospitals and hotels.',
 'Supervised housekeeping teams with defined duty rosters, uniforms and material planning. Deployed for single shifts or round the clock.',
 'Sparkles',
 '["Uniformed and supervised","Shift-wise deployment","Material and consumables planning"]', 2),

('security-personnel', 'Security Personnel',
 'Verified guards and supervisors for premises, sites and warehouses.',
 'Police-verified security guards, gunmen and supervisors, with documented rosters and periodic checks.',
 'ShieldCheck',
 '["Police verification on record","Day and night shifts","Supervisor rounds"]', 3),

('industrial-labour', 'Industrial & Factory Labour',
 'Helpers, operators, fitters and packers for production floors.',
 'Skilled, semi-skilled and unskilled manpower for production lines, packing halls, loading bays and stores. Bulk requirements handled.',
 'Factory',
 '["Bulk requirements","Skill-tested workers","Quick mobilisation"]', 4),

('skilled-trades', 'Skilled Trades',
 'Welders, electricians, fitters, masons, carpenters and technicians.',
 'Trade-tested skilled workers with certificates and experience verified before deployment.',
 'Wrench',
 '["Trade test before deployment","Certificates verified","Site-ready"]', 5),

('drivers', 'Drivers & Transport Staff',
 'LMV and HMV drivers with valid licences and clean records.',
 'Commercial and personal drivers, loaders and transport supervisors. Licence and antecedents checked.',
 'Truck',
 '["Licence verified","Driving test conducted","Background checked"]', 6),

('office-staff', 'Office & Back-office Staff',
 'Receptionists, data entry operators, accountants and assistants.',
 'Office support staff for administration, accounts, front desk and back-office processing.',
 'Building2',
 '["Interviewed and screened","Computer proficiency tested","Permanent or contract"]', 7),

('payroll-compliance', 'Payroll & Compliance',
 'Payroll processing and statutory compliance for your existing staff.',
 'We take over payroll processing, PF and ESI filings, wage registers and statutory returns for staff already on your rolls.',
 'FileCheck',
 '["Monthly payroll processing","PF and ESI filings","Statutory registers","Audit support"]', 8);
