import 'server-only';
import { cache } from 'react';
import { db } from './db';

export interface SettingRow {
  key: string;
  value: string;
  type: string;
  group_name: string;
  label: string;
  hint: string;
  sort_order: number;
  /** JSON array of {value,label} for a 'select', empty for everything else. */
  options: string;
}

export interface SettingChoice {
  value: string;
  label: string;
}

/** The choices behind a 'select' setting. Empty if it is not one. */
export function choices(row: Pick<SettingRow, 'options'>): SettingChoice[] {
  if (!row.options) return [];
  try {
    const parsed = JSON.parse(row.options);
    return Array.isArray(parsed)
      ? parsed
          .filter((o) => o && typeof o.value === 'string')
          .map((o) => ({ value: String(o.value), label: String(o.label ?? o.value) }))
      : [];
  } catch {
    return [];
  }
}

/**
 * All settings as a plain map. Memoised per request, so a page that reads
 * thirty settings still only hits the database once.
 */
export const getSettings = cache((): Record<string, string> => {
  const rows = db.all<{ key: string; value: string }>('SELECT key, value FROM settings');
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value ?? '';
  return out;
});

export const getSettingRows = cache((): SettingRow[] =>
  db.all<SettingRow>(
    'SELECT key, value, type, group_name, label, hint, sort_order, options FROM settings ORDER BY group_name, sort_order, key'
  )
);

export function setSetting(key: string, value: string): void {
  db.run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, value]
  );
}

export function setSettings(values: Record<string, string>): void {
  db.tx(() => {
    for (const [k, v] of Object.entries(values)) setSetting(k, v);
  });
}

// --- typed readers ---------------------------------------------------------

export function str(s: Record<string, string>, key: string, fallback = ''): string {
  const v = s[key];
  return v === undefined || v === '' ? fallback : v;
}

export function bool(s: Record<string, string>, key: string, fallback = false): boolean {
  const v = s[key];
  if (v === undefined || v === '') return fallback;
  return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
}

export function num(s: Record<string, string>, key: string, fallback = 0): number {
  const n = Number(s[key]);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Reads a JSON setting. Also accepts a plain newline-separated list, because
 * the settings screen lets staff type one item per line rather than JSON.
 */
export function list(s: Record<string, string>, key: string, fallback: string[] = []): string[] {
  const raw = s[key];
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    /* not JSON - fall through to line splitting */
  }
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines : fallback;
}

// --- derived site-wide values ---------------------------------------------

export interface SiteInfo {
  name: string;
  legalName: string;
  tagline: string;
  description: string;
  logo: string;
  logoAlt: string;
  favicon: string;
  brandColor: string;
  accentColor: string;
  phone: string;
  phone2: string;
  whatsapp: string;
  email: string;
  emailHr: string;
  address: string[];
  addressOneLine: string;
  mapEmbed: string;
  workingDays: string;
  workingHours: string;
  social: { name: string; url: string; key: string }[];
  maintenance: boolean;
  maintenanceText: string;
  footerNote: string;
  /** First year in the footer copyright line. 0 means show only this year. */
  copyrightStartYear: number;
  /** Menu, button and footer wording, each with its old text as the default. */
  words: Record<WordKey, string>;
}

export const WORD_DEFAULTS = {
  nav_home: 'Home',
  nav_team: 'Our Team',
  nav_posts: 'Posts',
  nav_contact: 'Contact',
  header_cta: 'Hire Staff',
  menu_cta_candidate: 'Find a Job',
  posts_see_all: 'See all',
  team_see_all: 'See the team',
  footer_links_heading: 'Company',
  footer_contact_heading: 'Get in touch',
  footer_whatsapp: 'Message on WhatsApp',
  footer_rights: 'All rights reserved.',
  footer_staff_login: 'Staff login',
  contact_heading: 'Get in touch',
  contact_label_office: 'Office',
  contact_label_phone: 'Phone',
  contact_label_email: 'Email',
  contact_label_open: 'Open',
  contact_employer_text: 'Send a staffing requirement',
  contact_candidate_text: 'Register as a candidate',
  contact_continue: 'Continue',
  register_employer_heading: 'Register as an employer',
  register_candidate_heading: 'Register as a candidate',
} as const;

export type WordKey = keyof typeof WORD_DEFAULTS;

export const getSiteInfo = cache((): SiteInfo => {
  const s = getSettings();

  const address = [
    str(s, 'address_line1'),
    str(s, 'address_line2'),
    [str(s, 'address_city'), str(s, 'address_state'), str(s, 'address_pincode')]
      .filter(Boolean)
      .join(', '),
    str(s, 'address_country'),
  ].filter(Boolean);

  const socialDefs: [string, string][] = [
    ['social_facebook', 'Facebook'],
    ['social_instagram', 'Instagram'],
    ['social_linkedin', 'LinkedIn'],
    ['social_youtube', 'YouTube'],
    ['social_twitter', 'X'],
  ];

  return {
    name: str(s, 'company_name', 'Rise Up Manpower'),
    legalName: str(s, 'company_legal_name', str(s, 'company_name', 'Rise Up Manpower')),
    tagline: str(s, 'tagline'),
    description: str(s, 'short_description'),
    logo: str(s, 'logo_path'),
    logoAlt: str(s, 'logo_alt_path') || str(s, 'logo_path'),
    favicon: str(s, 'favicon_path'),
    brandColor: str(s, 'brand_color', '#1552F0'),
    accentColor: str(s, 'accent_color', '#F59E0B'),
    phone: str(s, 'phone_primary'),
    phone2: str(s, 'phone_secondary'),
    whatsapp: str(s, 'whatsapp_number').replace(/[^0-9]/g, ''),
    email: str(s, 'email_primary'),
    emailHr: str(s, 'email_hr'),
    address,
    addressOneLine: address.join(', '),
    mapEmbed: str(s, 'map_embed'),
    workingDays: str(s, 'working_days'),
    workingHours: str(s, 'working_hours'),
    social: socialDefs
      .filter(([k]) => str(s, k))
      .map(([k, name]) => ({ key: k.replace('social_', ''), name, url: str(s, k) })),
    maintenance: bool(s, 'sys_maintenance'),
    maintenanceText: str(s, 'sys_maintenance_text'),
    footerNote: str(s, 'sys_footer_note'),
    copyrightStartYear: (() => {
      const y = num(s, 'copyright_start_year', 0);
      const thisYear = new Date().getFullYear();
      // A year that is not a sensible four-digit past year is ignored, so a
      // typo in the settings screen can never produce "© 20 - 2026".
      return y >= 1900 && y <= thisYear ? y : 0;
    })(),
    words: Object.fromEntries(
      Object.entries(WORD_DEFAULTS).map(([k, d]) => [k, str(s, k, d)])
    ) as Record<WordKey, string>,
  };
});

// --- headline statistics ---------------------------------------------------

export interface Stat {
  key: string;
  label: string;
  value: number;
  auto: boolean;
  suffix: string;
}

/**
 * The figures on the hero. Each one is counted from the database by default,
 * and can be overridden with a fixed number from Settings.
 */
export const getStats = cache((): Stat[] => {
  const s = getSettings();

  const autoEmployers =
    db.scalar<number>("SELECT COUNT(*) AS n FROM contacts WHERE type = 'employer'") ?? 0;
  const autoPlaced =
    db.scalar<number>(
      "SELECT COUNT(*) AS n FROM contacts WHERE type = 'candidate' AND (status = 'placed' OR placed_at IS NOT NULL)"
    ) ?? 0;
  const founded = num(s, 'founded_year', 0);
  const autoYears = founded > 1900 ? Math.max(1, new Date().getFullYear() - founded) : 0;
  const autoIndustries =
    db.scalar<number>(
      `SELECT COUNT(DISTINCT json_extract(data, '$.industry')) AS n
         FROM contacts WHERE type = 'employer' AND json_extract(data, '$.industry') IS NOT NULL`
    ) ?? 0;

  const build = (key: string, auto: number, suffix = '+'): Stat => {
    const isAuto = bool(s, `stats_${key}_auto`, true);
    const manual = num(s, `stats_${key}_value`, 0);

    // A figure set to count automatically falls back to the figure typed in
    // by hand while the count is still zero. Without this, a new install
    // shows a lopsided row: the counted figures disappear until the first
    // contacts are approved, leaving two figures where there should be four.
    // The fallback is whatever the company entered itself, and the real count
    // takes over the moment there is one.
    const value = isAuto ? (auto > 0 ? auto : manual) : manual;

    return {
      key,
      label: str(s, `stats_${key}_label`, key),
      value,
      auto: isAuto,
      suffix,
    };
  };

  return [
    build('employers', autoEmployers),
    build('placed', autoPlaced),
    build('years', autoYears),
    build('industries', autoIndustries),
  ].filter((stat) => stat.value > 0);
});
