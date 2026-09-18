import { NextResponse, type NextRequest } from 'next/server';

/**
 * Runs before every request.
 *
 * Two jobs:
 *   1. Nothing under /admin may ever be cached or indexed.
 *   2. State-changing requests must come from this site. Combined with the
 *      SameSite=Lax session cookie, this closes off cross-site request
 *      forgery without needing a token in every form.
 *
 * Authentication itself is NOT done here - middleware runs on the edge
 * runtime where the database is not available. Each admin page and API route
 * calls requireUser()/apiUser(), which is the check that actually matters.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!SAFE_METHODS.has(req.method)) {
    const origin = req.headers.get('origin');
    if (origin) {
      let originHost = '';
      try {
        originHost = new URL(origin).host;
      } catch {
        originHost = '';
      }

      // Behind a reverse proxy the Host header may have been rewritten to
      // whatever the proxy talks to internally, while the browser still sends
      // the public address as the Origin. Both are accepted, so the site keeps
      // working on a domain, a LAN address or a Tailscale IP, and a genuine
      // cross-site post is still refused.
      const allowed = new Set(
        [
          req.headers.get('x-forwarded-host'),
          req.headers.get('host'),
          process.env.NEXT_PUBLIC_SITE_URL,
        ]
          .flatMap((value) => (value ? value.split(',') : []))
          .map((value) => {
            const trimmed = value.trim();
            if (!trimmed) return '';
            try {
              // Accepts a bare host as well as a full address from .env.
              return trimmed.includes('://') ? new URL(trimmed).host : trimmed;
            } catch {
              return '';
            }
          })
          .filter(Boolean)
      );

      if (!originHost || !allowed.has(originHost)) {
        return new NextResponse(
          JSON.stringify({ error: 'Request blocked: it did not come from this website.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  const res = NextResponse.next();

  if (pathname.startsWith('/admin')) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  }

  return res;
}

export const config = {
  matcher: [
    // Everything except Next's own assets and the favicon.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
