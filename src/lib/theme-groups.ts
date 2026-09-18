/**
 * What the Themes screen owns.
 *
 * Everything about how the website looks lives on that one screen, and these
 * groups are therefore not editable from the Settings screen. Keeping the
 * list in one place means neither screen can end up offering the same field
 * twice, or dropping one between them.
 */

export const THEME_GROUPS: readonly string[] = ['theme', 'branding', 'home', 'stats'];

/** True if this settings group belongs to the Themes screen. */
export const isThemeGroup = (group: string): boolean => THEME_GROUPS.includes(group);

export type ThemeTabKey = 'appearance' | 'home' | 'figures' | 'addons';

export interface ThemeTab {
  key: ThemeTabKey;
  label: string;
  icon: string;
  description: string;
  /** Settings groups shown under this tab, in order. */
  groups: { group: string; title: string; hint?: string }[];
}

export const THEME_TABS: ThemeTab[] = [
  {
    key: 'appearance',
    label: 'Appearance',
    icon: 'Palette',
    description: 'Light and dark mode, the colours and the logo.',
    groups: [
      {
        group: 'theme',
        title: 'Light and dark mode',
        hint: 'Both versions of the website are always available. This decides which one a visitor sees first.',
      },
      {
        group: 'branding',
        title: 'Logo and colours',
        hint: 'The brand colour is used for buttons, links and highlights in both modes.',
      },
    ],
  },
  {
    key: 'home',
    label: 'Home page',
    icon: 'Home',
    description: 'The wording, the sections and the row add-ons.',
    groups: [
      {
        group: 'home',
        title: 'Home page content',
        hint: 'Anything left blank is simply not shown, rather than being filled in for you.',
      },
    ],
  },
  {
    key: 'figures',
    label: 'Figures',
    icon: 'BarChart3',
    description: 'The numbers shown under the heading.',
    groups: [
      {
        group: 'stats',
        title: 'Figures',
        hint: 'Each figure is counted from the database, or typed in by hand.',
      },
    ],
  },
  {
    key: 'addons',
    label: 'Row add-ons',
    icon: 'LayoutGrid',
    description: 'The photo gallery and the moving row of client logos.',
    groups: [],
  },
];

/**
 * The wording that can be changed by selecting it straight in the preview.
 *
 * The key is the `data-field` attribute placed on the element in the website
 * markup; the label is what the editor calls it. A field not in this list is
 * not editable from the preview, whatever the page markup claims.
 */
export const PREVIEW_FIELDS: Record<string, { label: string; multiline?: boolean }> = {
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
};

export const isPreviewField = (key: string): boolean =>
  Object.prototype.hasOwnProperty.call(PREVIEW_FIELDS, key);
