import { NextResponse, type NextRequest } from 'next/server';
import { isSameOrigin } from '@/lib/same-origin';

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

  if (!SAFE_METHODS.has(req.method) && !isSameOrigin(req)) {
    return new NextResponse(
      JSON.stringify({ error: 'Request blocked: it did not come from this website.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
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
    // Everything except Next's own assets, the favicon, and the upload route.
    //
    // Next copies the body of every request that passes through middleware,
    // and cuts it off at 10 MB. A large photo arriving cut off made uploads
    // hang, so uploads skip the middleware and the route makes the same
    // same-site check itself.
    '/((?!_next/static|_next/image|favicon.ico|api/admin/upload).*)',
  ],
};
