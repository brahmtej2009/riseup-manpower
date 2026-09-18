/**
 * Whether the admin session cookie should carry the Secure flag.
 *
 * This matters more than it looks. A browser throws away a Secure cookie
 * unless the page was served over HTTPS, and localhost is the one exception
 * browsers make. So hard-coding Secure in production gives a site that works
 * perfectly on localhost and then silently refuses to stay signed in the
 * moment it is opened over plain HTTP on a LAN address, a Tailscale IP or any
 * other machine: the sign-in succeeds, the browser drops the cookie, and the
 * very next request bounces straight back to the login page.
 *
 * So the flag follows how the request actually arrived. The rule is kept here,
 * on its own and free of any framework, so it can be read and checked without
 * starting a server.
 *
 * The cookie stays HttpOnly and SameSite=Lax whichever way this comes out, and
 * the middleware still refuses cross-site posts, so the Secure flag is not the
 * only thing protecting the session.
 */

export interface CookieSecurityInput {
  /** SESSION_COOKIE_SECURE from .env, if the company set it. */
  override?: string;
  /** x-forwarded-proto, set by any reverse proxy that terminates TLS. */
  forwardedProto?: string | null;
  /** The host the browser asked for, proxied host preferred. */
  host?: string | null;
  /** NEXT_PUBLIC_SITE_URL from .env. */
  siteUrl?: string;
}

export function decideCookieSecurity({
  override,
  forwardedProto,
  host,
  siteUrl,
}: CookieSecurityInput): boolean {
  // 1. An explicit setting always wins.
  const explicit = (override ?? '').trim().toLowerCase();
  if (explicit === 'true' || explicit === '1') return true;
  if (explicit === 'false' || explicit === '0') return false;

  // 2. A proxy that terminated TLS tells us directly.
  const proto = (forwardedProto ?? '').split(',')[0].trim().toLowerCase();
  if (proto) return proto === 'https';

  // 3. No proxy header. Only trust the configured address when the request
  //    really did come in on that exact host, otherwise a site configured as
  //    https://example.com would break every LAN and Tailscale sign-in.
  if (siteUrl) {
    try {
      const url = new URL(siteUrl);
      const asked = (host ?? '').trim().toLowerCase();
      if (url.protocol === 'https:' && asked && asked === url.host.toLowerCase()) return true;
    } catch {
      /* a malformed value in .env must never stop anyone signing in */
    }
  }

  // 4. The request came in over plain HTTP. Marking the cookie Secure here
  //    would mean nobody could sign in at all.
  return false;
}
