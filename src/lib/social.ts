import 'server-only';
import { getSettings, str, num, bool } from './settings';

/**
 * Recent social posts, pulled in through the Instagram Graph API.
 *
 * Notes for whoever maintains this:
 *   - Instagram no longer allows anonymous feed reading. A post can only be
 *     fetched with an access token issued by a Meta app that is connected to
 *     the company's Instagram *business* or *creator* account.
 *   - The token goes in Settings > Social media. Until it is filled in, the
 *     section simply does not appear. Nothing breaks, and nothing is faked.
 *   - Results are cached for an hour, so the page never waits on Instagram
 *     and the rate limit is never a problem.
 */

export interface SocialPost {
  id: string;
  caption: string;
  image: string;
  permalink: string;
  type: string;
  timestamp: string;
}

interface InstagramMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
}

const ONE_HOUR = 3600;

export async function getSocialPosts(): Promise<SocialPost[]> {
  const s = getSettings();

  if (!bool(s, 'social_feed_enabled', false)) return [];

  const token = str(s, 'social_instagram_token');
  if (!token) return [];

  const limit = Math.min(Math.max(num(s, 'social_feed_count', 6), 1), 12);
  const userId = str(s, 'social_instagram_user_id') || 'me';

  const url =
    `https://graph.instagram.com/${encodeURIComponent(userId)}/media` +
    `?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp` +
    `&limit=${limit}&access_token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, {
      // Next caches the response, so Instagram is called at most once an hour
      // however many people are on the site.
      next: { revalidate: ONE_HOUR, tags: ['social-feed'] },
    });

    if (!res.ok) {
      console.error(`[social] Instagram returned ${res.status}. Check the access token.`);
      return [];
    }

    const body = (await res.json()) as { data?: InstagramMedia[] };
    if (!Array.isArray(body.data)) return [];

    return body.data
      .map((item): SocialPost => ({
        id: String(item.id),
        caption: String(item.caption ?? '').slice(0, 300),
        // A video has no media_url worth showing, so its thumbnail is used.
        image: String(item.thumbnail_url || item.media_url || ''),
        permalink: String(item.permalink ?? ''),
        type: String(item.media_type ?? 'IMAGE'),
        timestamp: String(item.timestamp ?? ''),
      }))
      .filter((p) => p.image && p.permalink)
      .slice(0, limit);
  } catch (err) {
    // A social feed is never worth failing a page render over.
    console.error('[social] could not fetch posts:', (err as Error).message);
    return [];
  }
}

/** Used by the Settings screen to tell the admin whether the token works. */
export async function testSocialFeed(): Promise<{ ok: boolean; message: string }> {
  const s = getSettings();
  const token = str(s, 'social_instagram_token');

  if (!token) {
    return { ok: false, message: 'No access token has been entered yet.' };
  }

  const userId = str(s, 'social_instagram_user_id') || 'me';

  try {
    const res = await fetch(
      `https://graph.instagram.com/${encodeURIComponent(userId)}/media` +
        `?fields=id&limit=1&access_token=${encodeURIComponent(token)}`,
      { cache: 'no-store' }
    );
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const reason = body?.error?.message ? String(body.error.message) : `HTTP ${res.status}`;
      return { ok: false, message: `Instagram refused the request: ${reason}` };
    }

    const count = Array.isArray(body?.data) ? body.data.length : 0;
    return {
      ok: true,
      message: count > 0
        ? 'Connected. Posts will appear on the home page within the hour.'
        : 'Connected, but the account has no posts yet.',
    };
  } catch (err) {
    return { ok: false, message: `Could not reach Instagram: ${(err as Error).message}` };
  }
}
