import 'server-only';
import { headers } from 'next/headers';
import { db } from './db';

/** Caller IP, as far as it can be trusted behind a proxy. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    h.get('x-real-ip') ||
    h.get('cf-connecting-ip') ||
    'unknown'
  );
}

export async function userAgent(): Promise<string> {
  return (await headers()).get('user-agent')?.slice(0, 300) ?? '';
}

/**
 * A simple fixed-window rate limiter kept in the database, so it survives a
 * restart and works the same whether the site runs one process or several.
 * Public forms only - the admin panel is already behind a login.
 */
export function rateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowMinutes: number
): { allowed: boolean; remaining: number; retryAfterMinutes: number } {
  const row = db.get<{ count: number; window_start: string; expired: number }>(
    `SELECT count, window_start,
            CASE WHEN window_start < datetime('now', '-${windowMinutes} minutes') THEN 1 ELSE 0 END AS expired
       FROM rate_limits WHERE bucket = ? AND identifier = ?`,
    [bucket, identifier]
  );

  if (!row || row.expired) {
    db.run(
      `INSERT INTO rate_limits (bucket, identifier, count, window_start)
       VALUES (?, ?, 1, datetime('now'))
       ON CONFLICT(bucket, identifier)
       DO UPDATE SET count = 1, window_start = datetime('now')`,
      [bucket, identifier]
    );
    return { allowed: true, remaining: limit - 1, retryAfterMinutes: 0 };
  }

  if (row.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMinutes: windowMinutes };
  }

  db.run(
    'UPDATE rate_limits SET count = count + 1 WHERE bucket = ? AND identifier = ?',
    [bucket, identifier]
  );
  return { allowed: true, remaining: limit - row.count - 1, retryAfterMinutes: 0 };
}

/**
 * Generates the next reference number, e.g. EMP-2609-0042.
 * The counter is per prefix and per month, and is derived from the table so
 * it cannot drift out of step with the data.
 */
export function nextRef(table: 'submissions' | 'contacts', prefix: string): string {
  const d = new Date();
  const ym = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const like = `${prefix}-${ym}-%`;

  const last = db.get<{ ref: string }>(
    `SELECT ref FROM ${table} WHERE ref LIKE ? ORDER BY ref DESC LIMIT 1`,
    [like]
  );

  let n = 1;
  if (last?.ref) {
    const tail = Number(last.ref.split('-').pop());
    if (Number.isFinite(tail)) n = tail + 1;
  }

  // Extremely unlikely, but two requests landing in the same millisecond must
  // not produce the same reference.
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = `${prefix}-${ym}-${String(n + attempt).padStart(4, '0')}`;
    const exists = db.get(`SELECT 1 AS x FROM ${table} WHERE ref = ?`, [candidate]);
    if (!exists) return candidate;
  }
  return `${prefix}-${ym}-${Date.now().toString().slice(-6)}`;
}

/** Ensures a slug is unique in the posts table. */
export function uniqueSlug(base: string, ignoreId?: number): string {
  const clean = base || 'post';
  for (let i = 0; i < 200; i++) {
    const candidate = i === 0 ? clean : `${clean}-${i + 1}`;
    const row = db.get<{ id: number }>('SELECT id FROM posts WHERE slug = ?', [candidate]);
    if (!row || row.id === ignoreId) return candidate;
  }
  return `${clean}-${Date.now().toString().slice(-5)}`;
}
