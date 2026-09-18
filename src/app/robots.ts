import type { MetadataRoute } from 'next';
import { getSettings, bool } from '@/lib/settings';
import { siteUrl } from '@/lib/seo';

/**
 * robots.txt
 *
 * AI assistants are treated as a first-class audience here, not as something
 * to block. When somebody asks an assistant to recommend a staffing firm, the
 * assistant can only mention this company if it was allowed to read the site.
 * The company can still turn that off from Settings.
 */

const AI_CRAWLERS = [
  'GPTBot',            // ChatGPT training
  'OAI-SearchBot',     // ChatGPT search
  'ChatGPT-User',      // ChatGPT browsing on a user's behalf
  'ClaudeBot',         // Claude training
  'Claude-User',       // Claude browsing on a user's behalf
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',   // Gemini / AI Overviews
  'Applebot-Extended',
  'meta-externalagent',
  'Bingbot',
  'DuckAssistBot',
  'cohere-ai',
  'YouBot',
];

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  const allowAi = bool(getSettings(), 'seo_allow_ai_crawlers', true);

  const disallow = ['/admin', '/admin/', '/api/'];

  const rules: MetadataRoute.Robots['rules'] = [
    { userAgent: '*', allow: '/', disallow },
  ];

  for (const bot of AI_CRAWLERS) {
    rules.push(
      allowAi
        ? { userAgent: bot, allow: '/', disallow }
        : { userAgent: bot, disallow: '/' }
    );
  }

  return {
    rules,
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
