/**
 * What the Themes editor owns, and how it is laid out.
 *
 * The editor is organised the way someone actually thinks about a website:
 * first which page, then which section of that page. It is deliberately not
 * organised by which settings group a value happens to live in, because that
 * is a detail of how the database is arranged, not anything a person editing
 * their own website should have to know about.
 */

export const THEME_GROUPS: readonly string[] = ['theme', 'branding', 'home', 'stats'];

/** True if this settings group belongs to the Themes editor. */
export const isThemeGroup = (group: string): boolean => THEME_GROUPS.includes(group);

export interface ThemeSection {
  key: string;
  label: string;
  icon: string;
  /** Settings shown as controls. Wording edited in the preview is not here. */
  keys: string[];
  /** A list managed on its own screen, such as the photographs or the logos. */
  manage?: { href: string; label: string };
  /** One short line. Anything longer belongs behind the information button. */
  note?: string;
}

export interface ThemePage {
  key: string;
  label: string;
  icon: string;
  /** What the preview shows while this page is being edited. */
  path: string;
  sections: ThemeSection[];
}

export const THEME_PAGES: ThemePage[] = [
  {
    key: 'home',
    label: 'Home page',
    icon: 'Home',
    path: '/',
    sections: [
      {
        key: 'hero',
        label: 'Top of the page',
        icon: 'LayoutTemplate',
        keys: ['hero_gallery', 'hero_rotating_words', 'hero_overlay'],
      },
      {
        key: 'figures',
        label: 'Figures',
        icon: 'BarChart3',
        keys: [
          'stats_show',
          'stats_employers_auto', 'stats_employers_value',
          'stats_placed_auto', 'stats_placed_value',
          'stats_years_auto', 'stats_years_value',
          'stats_industries_auto', 'stats_industries_value',
        ],
        note:
          'A figure of zero is left off the website rather than shown as nothing. ' +
          'Employers served and candidates placed are counted from approved contacts, ' +
          'so they stay hidden until there are some. Type a figure in beside them to ' +
          'show that instead until the real count catches up.',
      },
      {
        key: 'services',
        label: 'What we do',
        icon: 'Briefcase',
        keys: ['services_show_home'],
        manage: { href: '/admin/services', label: 'Edit the services' },
      },
      {
        key: 'posts',
        label: 'Posts',
        icon: 'Megaphone',
        keys: ['posts_square', 'posts_home_count', 'posts_show_meta'],
        manage: { href: '/admin/posts', label: 'Write a post' },
      },
      {
        key: 'gallery',
        label: 'Photo gallery',
        icon: 'Images',
        keys: ['gallery_show_home', 'gallery_limit'],
        manage: { href: '/admin/gallery', label: 'Add photographs' },
      },
      {
        key: 'logos',
        label: 'Client logos',
        icon: 'Building2',
        keys: ['logos_show_home', 'logos_height', 'logos_speed', 'logos_grayscale'],
        manage: { href: '/admin/themes/logos', label: 'Add logos' },
        note: 'The row stays hidden until at least one logo is added.',
      },
      {
        key: 'team',
        label: 'Our team',
        icon: 'UserSquare2',
        keys: ['team_show_home'],
        manage: { href: '/admin/team', label: 'Edit the team' },
      },
    ],
  },
  {
    key: 'site',
    label: 'Whole site',
    icon: 'Globe',
    path: '/',
    sections: [
      {
        key: 'brand',
        label: 'Logo and colours',
        icon: 'Palette',
        keys: ['logo_path', 'logo_alt_path', 'favicon_path', 'brand_color', 'accent_color'],
      },
      {
        key: 'mode',
        label: 'Light and dark',
        icon: 'SunMoon',
        keys: ['theme_dark_default', 'theme_follow_device', 'theme_toggle_show'],
      },
      {
        key: 'style',
        label: 'Style',
        icon: 'Shapes',
        keys: ['theme_corner_style'],
      },
      {
        key: 'footer',
        label: 'Footer',
        icon: 'PanelBottom',
        keys: ['copyright_start_year'],
      },
    ],
  },
];

/**
 * Every settings key the editor is allowed to write.
 *
 * The save action checks against this rather than against a settings group,
 * because a section mixes keys from several groups, and because a posted form
 * must never be able to reach a key this screen does not show.
 */
export const EDITABLE_KEYS: readonly string[] = THEME_PAGES.flatMap((p) =>
  p.sections.flatMap((s) => s.keys)
);

export const isEditableKey = (key: string): boolean => EDITABLE_KEYS.includes(key);

/**
 * The wording that is changed by selecting it in the preview instead.
 *
 * These deliberately have no box in the side panel: a heading is edited by
 * clicking the heading. The key is the `data-field` attribute on the element
 * in the website markup.
 */
export const PREVIEW_FIELDS: Record<
  string,
  { label: string; multiline?: boolean; /** Goes back to its default when emptied. */ fallback?: boolean }
> = {
  company_name: { label: 'Company name' },
  tagline: { label: 'Tagline' },
  hero_title: { label: 'Heading' },
  hero_title_accent: { label: 'Heading, second line' },
  hero_subtitle: { label: 'Sub-heading', multiline: true },
  hero_note: { label: 'Small line under the buttons' },
  hero_cta_employer: { label: 'Employer button' },
  hero_cta_candidate: { label: 'Candidate button' },
  services_heading: { label: 'What we do, heading' },
  services_intro: { label: 'What we do, intro', multiline: true },
  posts_heading: { label: 'Posts heading' },
  gallery_heading: { label: 'Gallery heading' },
  gallery_intro: { label: 'Gallery intro', multiline: true },
  logos_heading: { label: 'Client logos heading' },
  team_heading: { label: 'Our team heading' },
  team_intro: { label: 'Our team intro', multiline: true },
  cta_heading: { label: 'Closing heading' },
  social_heading: { label: 'Follow us heading' },
  social_feed_heading: { label: 'Latest posts heading' },
  stats_employers_label: { label: 'Figure label', fallback: true },
  stats_placed_label: { label: 'Figure label', fallback: true },
  stats_years_label: { label: 'Figure label', fallback: true },
  stats_industries_label: { label: 'Figure label', fallback: true },
  nav_home: { label: 'Menu item', fallback: true },
  nav_team: { label: 'Menu item', fallback: true },
  nav_posts: { label: 'Menu item', fallback: true },
  nav_contact: { label: 'Menu item', fallback: true },
  header_cta: { label: 'Header button', fallback: true },
  menu_cta_candidate: { label: 'Mobile menu job button', fallback: true },
  posts_see_all: { label: 'Posts link', fallback: true },
  team_see_all: { label: 'Team link', fallback: true },
  footer_links_heading: { label: 'Footer links heading', fallback: true },
  footer_contact_heading: { label: 'Footer contact heading', fallback: true },
  footer_whatsapp: { label: 'WhatsApp button', fallback: true },
  footer_rights: { label: 'Copyright wording', fallback: true },
  footer_staff_login: { label: 'Staff login link', fallback: true },
  working_days: { label: 'Working days' },
  working_hours: { label: 'Working hours' },
  sys_footer_note: { label: 'Footer note', multiline: true },
};

export const isPreviewField = (key: string): boolean =>
  Object.prototype.hasOwnProperty.call(PREVIEW_FIELDS, key);
