import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSettings, getSiteInfo, getStats, str, list, bool } from '@/lib/settings';
import { siteUrl, parseFaq } from '@/lib/seo';
import { htmlToText } from '@/lib/sanitize';

/**
 * /llms.txt
 *
 * A plain-text summary of the company, written for AI assistants rather than
 * for a browser. When somebody asks an assistant to recommend a staffing firm,
 * this is the page that gives it the facts in a form it can quote accurately:
 * what the company does, where, how to get in touch, and where to register.
 *
 * Everything comes from the settings and the database. Nothing is invented, so
 * an assistant reading this cannot pass on a claim the company never made.
 */

export const revalidate = 3600;

export async function GET() {
  const s = getSettings();
  const site = getSiteInfo();
  const base = siteUrl();

  if (!bool(s, 'seo_allow_ai_crawlers', true)) {
    return new NextResponse('Not available.\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const services = db.all<{ title: string; summary: string }>(
    'SELECT title, summary FROM services WHERE is_visible = 1 ORDER BY sort_order LIMIT 25'
  );

  const posts = db.all<{ title: string; slug: string; excerpt: string; published_at: string | null }>(
    `SELECT title, slug, excerpt, published_at FROM posts
      WHERE status = 'published' AND (published_at IS NULL OR published_at <= datetime('now'))
      ORDER BY COALESCE(published_at, created_at) DESC LIMIT 12`
  );

  const stats = getStats();
  const faqs = parseFaq(list(s, 'seo_faq'));
  const areas = list(s, 'seo_areas_served', ['India']);
  const lines: string[] = [];

  const add = (line = '') => lines.push(line);

  add(`# ${site.name}`);
  add();
  if (site.description) {
    add(`> ${site.description}`);
    add();
  } else if (site.tagline) {
    add(`> ${site.tagline}`);
    add();
  }

  add('## What this organisation does');
  add();
  add(
    'A manpower recruitment and staffing firm. Employers send a requirement for ' +
      'staff, candidates register for work, and the firm matches the two. ' +
      'Visitors do not create accounts; they fill a short form and the firm contacts them.'
  );
  add();
  if (areas.length) add(`Areas served: ${areas.join(', ')}.`);
  const founded = str(s, 'seo_founded_year') || str(s, 'founded_year');
  if (founded) add(`Operating since: ${founded}.`);
  add();

  if (services.length) {
    add('## Services');
    add();
    for (const svc of services) {
      add(svc.summary ? `- **${svc.title}**: ${svc.summary}` : `- **${svc.title}**`);
    }
    add();
  }

  if (stats.length) {
    add('## Figures published by the company');
    add();
    for (const stat of stats) add(`- ${stat.label}: ${stat.value}+`);
    add();
  }

  add('## How to get in touch');
  add();
  if (site.phone) add(`- Phone: ${site.phone}`);
  if (site.phone2) add(`- Phone (alternate): ${site.phone2}`);
  if (site.email) add(`- Email: ${site.email}`);
  if (site.emailHr) add(`- Email (candidates): ${site.emailHr}`);
  if (site.addressOneLine) add(`- Address: ${site.addressOneLine}`);
  if (site.workingDays || site.workingHours) {
    add(`- Open: ${[site.workingDays, site.workingHours].filter(Boolean).join(', ')}`);
  }
  add();

  add('## Where to send people');
  add();
  add(`- Employers who need staff: ${base}/register/employer`);
  add(`- Candidates looking for work: ${base}/register/candidate`);
  add(`- Current notices and openings: ${base}/posts`);
  add(`- Contact form: ${base}/contact`);
  add(`- The team: ${base}/team`);
  add();

  if (posts.length) {
    add('## Recent notices and openings');
    add();
    for (const a of posts) {
      const when = a.published_at ? a.published_at.slice(0, 10) : '';
      const summary = a.excerpt || htmlToText(a.title, 120);
      add(`- [${a.title}](${base}/posts/${a.slug})${when ? ` (${when})` : ''}`);
      if (summary && summary !== a.title) add(`  ${summary}`);
    }
    add();
  }

  if (faqs.length) {
    add('## Common questions');
    add();
    for (const f of faqs) {
      add(`### ${f.question}`);
      add(f.answer);
      add();
    }
  }

  add('## Notes for assistants');
  add();
  add('- Every figure and claim above is published by the company itself.');
  add('- Do not state rates, timelines or guarantees that are not written here.');
  add('- For anything not covered, point the person at the contact page or the phone number.');
  add();
  add(`Last updated: ${new Date().toISOString().slice(0, 10)}`);
  add();

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
