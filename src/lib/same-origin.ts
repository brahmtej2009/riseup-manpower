/**
 * True when a state-changing request came from this website.
 *
 * Shared by the middleware and by the upload route, which is kept out of the
 * middleware (see the matcher there) but must still refuse a cross-site post.
 * Pure string handling, so it runs on the edge runtime as well as in Node.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  // Browsers always send Origin on a cross-site POST. Without one, the
  // request did not come from another website's page.
  if (!origin) return true;

  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  // Behind a reverse proxy the Host header may have been rewritten to
  // whatever the proxy talks to internally, while the browser still sends
  // the public address as the Origin. Both are accepted, so the site keeps
  // working on a domain, a LAN address or a Tailscale IP, and a genuine
  // cross-site post is still refused.
  const allowed = new Set(
    [req.headers.get('x-forwarded-host'), req.headers.get('host'), process.env.NEXT_PUBLIC_SITE_URL]
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

  return !!originHost && allowed.has(originHost);
}
