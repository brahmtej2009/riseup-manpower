import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';

/** Generated from the database, so new posts appear automatically. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/team`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/posts`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/register/employer`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/register/candidate`, changeFrequency: 'monthly', priority: 0.9 },
  ];

  let posts: MetadataRoute.Sitemap = [];
  try {
    posts = db
      .all<{ slug: string; updated_at: string }>(
        `SELECT slug, updated_at FROM posts
          WHERE status = 'published' AND (published_at IS NULL OR published_at <= datetime('now'))
          ORDER BY COALESCE(published_at, created_at) DESC LIMIT 1000`
      )
      .map((a) => ({
        url: `${base}/posts/${a.slug}`,
        lastModified: new Date(a.updated_at.replace(' ', 'T') + 'Z'),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));
  } catch {
    // A sitemap is never worth failing a build over.
  }

  return [...staticPages, ...posts];
}
