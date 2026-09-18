import { NextRequest, NextResponse } from 'next/server';
import { recordPageView, recordEvent, recordDuration } from '@/lib/analytics';
import { clientIp, userAgent, rateLimit } from '@/lib/server-utils';
import { getCurrentUser } from '@/lib/auth';
import { getSettings, bool } from '@/lib/settings';

/**
 * Receives visitor statistics from the browser.
 *
 * Always answers 204, whatever happens - a failure here must never show an
 * error to a visitor or block the page. Nothing sent by the browser is
 * trusted beyond being stored as a bounded string.
 */

export const dynamic = 'force-dynamic';

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(req: NextRequest) {
  try {
    const ip = await clientIp();
    const ua = await userAgent();

    // A single visitor cannot record more than 120 hits in 10 minutes.
    const limit = rateLimit('track', ip, 120, 10);
    if (!limit.allowed) return noContent();

    // Staff browsing their own site should not appear in the figures.
    if (bool(getSettings(), 'analytics_ignore_admin', true)) {
      const user = await getCurrentUser();
      if (user) return noContent();
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return noContent();

    const siteHost = req.headers.get('host') ?? '';
    const type = String(body.type ?? '');

    if (type === 'view') {
      recordPageView(
        {
          path: String(body.path ?? '/'),
          title: String(body.title ?? ''),
          referrer: String(body.referrer ?? ''),
          campaign: String(body.campaign ?? ''),
          sessionId: String(body.sessionId ?? ''),
          screenW: Number(body.screenW) || undefined,
        },
        ip,
        ua,
        siteHost
      );
    } else if (type === 'event') {
      const name = String(body.name ?? '').trim();
      if (name) {
        recordEvent(
          name,
          {
            category: String(body.category ?? 'general'),
            label: String(body.label ?? ''),
            path: String(body.path ?? ''),
            value: Number(body.value) || 1,
            sessionId: String(body.sessionId ?? ''),
          },
          ip,
          ua
        );
      }
    } else if (type === 'duration') {
      recordDuration(
        String(body.sessionId ?? ''),
        String(body.path ?? ''),
        Number(body.seconds) || 0
      );
    }
  } catch {
    /* statistics are never worth an error page */
  }
  return noContent();
}
