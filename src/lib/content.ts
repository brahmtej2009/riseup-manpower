import 'server-only';
import { cache } from 'react';
import { db } from './db';
import { parseJson } from './utils';

/** Read models for the public website. */

export interface Service {
  id: number;
  slug: string;
  title: string;
  summary: string;
  description: string;
  icon: string;
  points: string[];
  sort_order: number;
  is_visible: number;
}

export const getServices = cache((onlyVisible = true): Service[] =>
  db
    .all<Omit<Service, 'points'> & { points: string }>(
      `SELECT * FROM services ${onlyVisible ? 'WHERE is_visible = 1' : ''}
       ORDER BY sort_order, id`
    )
    .map((s) => ({ ...s, points: parseJson<string[]>(s.points, []) }))
);

export interface TeamMember {
  id: number;
  name: string;
  designation: string;
  bio: string;
  photo_path: string | null;
  email: string;
  phone: string;
  linkedin: string;
  sort_order: number;
  is_visible: number;
}

export const getTeam = cache((onlyVisible = true): TeamMember[] =>
  db.all<TeamMember>(
    `SELECT * FROM team_members ${onlyVisible ? 'WHERE is_visible = 1' : ''}
     ORDER BY sort_order, id`
  )
);

export interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body_html: string;
  cover_path: string | null;
  category: string;
  tags: string;
  status: string;
  pinned: number;
  urgent: number;
  views: number;
  published_at: string | null;
  author_name: string;
  created_at: string;
  updated_at: string;
}

const PUBLISHED = `status = 'published' AND (published_at IS NULL OR published_at <= datetime('now'))`;

export const getPublishedPosts = cache(
  (limit = 20, offset = 0, category?: string, search?: string): Post[] => {
    const where = [PUBLISHED];
    const params: unknown[] = [];

    if (category && category !== 'all') {
      where.push('category = ?');
      params.push(category);
    }
    if (search) {
      where.push('(title LIKE ? OR excerpt LIKE ? OR body_html LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    params.push(limit, offset);
    return db.all<Post>(
      `SELECT * FROM posts WHERE ${where.join(' AND ')}
        ORDER BY pinned DESC, COALESCE(published_at, created_at) DESC
        LIMIT ? OFFSET ?`,
      params
    );
  }
);

export const countPublishedPosts = cache((category?: string, search?: string): number => {
  const where = [PUBLISHED];
  const params: unknown[] = [];
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  if (search) {
    where.push('(title LIKE ? OR excerpt LIKE ? OR body_html LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q);
  }
  return db.scalar<number>(`SELECT COUNT(*) AS n FROM posts WHERE ${where.join(' AND ')}`, params) ?? 0;
});

export const getPostBySlug = cache((slug: string): Post | undefined =>
  db.get<Post>(`SELECT * FROM posts WHERE slug = ? AND ${PUBLISHED}`, [slug])
);

export const getPostCategories = cache((): { category: string; count: number }[] =>
  db.all<{ category: string; count: number }>(
    `SELECT category, COUNT(*) AS count FROM posts
      WHERE ${PUBLISHED} GROUP BY category ORDER BY count DESC`
  )
);

export const getAdjacentPosts = cache((slug: string) => {
  const current = db.get<{ published_at: string; created_at: string }>(
    'SELECT published_at, created_at FROM posts WHERE slug = ?',
    [slug]
  );
  if (!current) return { prev: undefined, next: undefined };
  const at = current.published_at || current.created_at;

  return {
    prev: db.get<{ slug: string; title: string }>(
      `SELECT slug, title FROM posts
        WHERE ${PUBLISHED} AND COALESCE(published_at, created_at) > ?
        ORDER BY COALESCE(published_at, created_at) ASC LIMIT 1`,
      [at]
    ),
    next: db.get<{ slug: string; title: string }>(
      `SELECT slug, title FROM posts
        WHERE ${PUBLISHED} AND COALESCE(published_at, created_at) < ?
        ORDER BY COALESCE(published_at, created_at) DESC LIMIT 1`,
      [at]
    ),
  };
});

/** Counted once per view; not worth a transaction. */
export function incrementPostViews(id: number): void {
  db.run('UPDATE posts SET views = views + 1 WHERE id = ?', [id]);
}

// --- photo gallery ---------------------------------------------------------

export interface GalleryPhoto {
  id: number;
  path: string;
  title: string;
  caption: string;
  sort_order: number;
  is_visible: number;
}

export const getGalleryPhotos = cache((onlyVisible = true, limit = 0): GalleryPhoto[] =>
  db.all<GalleryPhoto>(
    `SELECT id, path, title, caption, sort_order, is_visible FROM gallery_photos
      ${onlyVisible ? 'WHERE is_visible = 1' : ''}
      ORDER BY sort_order, id ${limit > 0 ? 'LIMIT ?' : ''}`,
    limit > 0 ? [limit] : []
  )
);

// --- client logos ----------------------------------------------------------

export interface ClientLogo {
  id: number;
  name: string;
  path: string;
  url: string;
  sort_order: number;
  is_visible: number;
}

export const getClientLogos = cache((onlyVisible = true): ClientLogo[] =>
  db.all<ClientLogo>(
    `SELECT id, name, path, url, sort_order, is_visible FROM client_logos
      ${onlyVisible ? 'WHERE is_visible = 1' : ''}
      ORDER BY sort_order, id`
  )
);
