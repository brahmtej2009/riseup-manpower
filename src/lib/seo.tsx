import 'server-only';
import { db } from './db';
import { getSettings, getSiteInfo, getStats, str, list } from './settings';
import { htmlToText } from './sanitize';

/**
 * Structured data.
 *
 * Two audiences read this, and they want the same thing: facts, stated
 * plainly, in a format they can lift without guessing.
 *
 *   - Search engines use it for rich results (address, phone, hours, FAQs).
 *   - AI assistants use it when somebody asks "who does staffing in Pune" and
 *     the assistant needs a name, a service list and a way to get in touch.
 *
 * Everything here comes from the settings the company has actually filled in.
 * Nothing is invented, and empty fields are left out rather than guessed at.
 */

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function absolute(path: string): string {
  if (!path) return '';
  return path.startsWith('http') ? path : `${siteUrl()}${path}`;
}

/** Splits the "question / answer / blank line" format used in Settings. */
export function parseFaq(raw: string[]): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const question = raw[i]?.trim();
    const answer = raw[i + 1]?.trim();
    if (question && answer) out.push({ question, answer });
  }
  return out;
}

export function organizationSchema(): Record<string, unknown> {
  const s = getSettings();
  const site = getSiteInfo();
  const base = siteUrl();

  const address: Record<string, string> = {};
  if (str(s, 'address_line1')) {
    address.streetAddress = [str(s, 'address_line1'), str(s, 'address_line2')]
      .filter(Boolean)
      .join(', ');
  }
  if (str(s, 'address_city')) address.addressLocality = str(s, 'address_city');
  if (str(s, 'address_state')) address.addressRegion = str(s, 'address_state');
  if (str(s, 'address_pincode')) address.postalCode = str(s, 'address_pincode');
  address.addressCountry = str(s, 'address_country', 'India');

  const phones = [str(s, 'phone_primary'), str(s, 'phone_secondary')].filter(Boolean);
  const socials = site.social.map((x) => x.url).filter(Boolean);
  const founded = str(s, 'seo_founded_year') || str(s, 'founded_year');

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'EmploymentAgency',
    '@id': `${base}/#organization`,
    name: site.name,
    legalName: site.legalName,
    url: base,
    description: str(s, 'seo_description', site.description),
  };

  if (site.logo) schema.logo = absolute(site.logo);
  if (site.logo) schema.image = absolute(site.logo);
  if (founded) schema.foundingDate = founded;
  if (Object.keys(address).length > 1) schema.address = { '@type': 'PostalAddress', ...address };
  if (phones.length) schema.telephone = phones;
  if (site.email) schema.email = site.email;
  if (socials.length) schema.sameAs = socials;

  const areas = list(s, 'seo_areas_served', ['India']);
  if (areas.length) {
    schema.areaServed = areas.map((name) => ({ '@type': 'Place', name }));
  }

  if (site.workingDays || site.workingHours) {
    schema.openingHours = [site.workingDays, site.workingHours].filter(Boolean).join(' ');
  }

  // The services the company actually offers, from the database.
  const services = db.all<{ title: string; summary: string }>(
    'SELECT title, summary FROM services WHERE is_visible = 1 ORDER BY sort_order LIMIT 20'
  );
  if (services.length) {
    schema.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: 'Staffing and recruitment services',
      itemListElement: services.map((svc) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: svc.title, description: svc.summary || undefined },
      })),
    };
  }

  // Figures, only the ones that are real.
  const stats = getStats();
  const placed = stats.find((x) => x.key === 'placed');
  if (placed && placed.value > 0) {
    schema.numberOfEmployees = undefined; // deliberately not claimed
    schema.knowsAbout = [
      'manpower recruitment',
      'contract staffing',
      'candidate placement',
      ...services.map((svc) => svc.title.toLowerCase()),
    ];
  }

  return schema;
}

export function websiteSchema(): Record<string, unknown> {
  const site = getSiteInfo();
  const base = siteUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    url: base,
    name: site.name,
    publisher: { '@id': `${base}/#organization` },
    inLanguage: 'en-IN',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${base}/posts?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function faqSchema(): Record<string, unknown> | null {
  const faqs = parseFaq(list(getSettings(), 'seo_faq'));
  if (!faqs.length) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]): Record<string, unknown> {
  const base = siteUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${base}${item.path}`,
    })),
  };
}

export function postSchema(a: {
  slug: string;
  title: string;
  excerpt: string;
  body_html: string;
  cover_path: string | null;
  published_at: string | null;
  updated_at: string;
  author_name: string;
}): Record<string, unknown> {
  const site = getSiteInfo();
  const base = siteUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: a.title,
    description: a.excerpt || htmlToText(a.body_html, 200),
    image: a.cover_path ? [absolute(a.cover_path)] : undefined,
    datePublished: a.published_at ?? undefined,
    dateModified: a.updated_at,
    author: { '@type': 'Organization', name: a.author_name || site.name },
    publisher: { '@id': `${base}/#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${base}/posts/${a.slug}` },
  };
}

/** Renders one or more schema objects as a script tag. */
export function JsonLd({ data }: { data: (Record<string, unknown> | null)[] }) {
  const clean = data.filter(Boolean);
  if (!clean.length) return null;

  return (
    <script
      type="application/ld+json"
      // JSON.stringify escapes everything; the < is closed off so the tag
      // cannot be broken out of by any value from the database.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(clean.length === 1 ? clean[0] : clean).replace(/</g, '\\u003c'),
      }}
    />
  );
}
