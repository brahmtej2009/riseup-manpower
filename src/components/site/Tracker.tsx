'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Records a page view, and how long the visitor stayed.
 *
 * Uses sendBeacon so leaving the page still reports reliably, and falls back
 * to fetch with keepalive. Nothing is stored in the browser except a session
 * id in sessionStorage, which is cleared when the tab is closed.
 */

const SESSION_KEY = 'ru_sid';

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Private browsing with storage blocked - the visit is still counted,
    // it just cannot be grouped into a session.
    return '';
  }
}

function send(body: Record<string, unknown>, beacon = false): void {
  const payload = JSON.stringify(body);
  try {
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
      return;
    }
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* tracking must never break the page */
  }
}

/** Fire an interaction event from anywhere on the site. */
export function trackEvent(
  name: string,
  opts: { category?: string; label?: string; value?: number } = {}
): void {
  if (typeof window === 'undefined') return;
  send({
    type: 'event',
    name,
    category: opts.category,
    label: opts.label,
    value: opts.value,
    path: window.location.pathname,
    sessionId: sessionId(),
  });
}

export function Tracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const enteredAt = useRef(Date.now());
  const lastPath = useRef<string>('');

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    if (lastPath.current === pathname) return;

    // Report time spent on the page being left behind.
    if (lastPath.current) {
      send(
        {
          type: 'duration',
          path: lastPath.current,
          seconds: Math.round((Date.now() - enteredAt.current) / 1000),
          sessionId: sessionId(),
        },
        true
      );
    }

    lastPath.current = pathname;
    enteredAt.current = Date.now();

    const campaign =
      searchParams.get('utm_campaign') || searchParams.get('utm_source') || searchParams.get('ref') || '';

    send({
      type: 'view',
      path: pathname,
      title: document.title,
      referrer: document.referrer,
      campaign,
      screenW: window.innerWidth,
      sessionId: sessionId(),
    });
  }, [pathname, searchParams]);

  // Report the final page when the tab is closed or hidden.
  useEffect(() => {
    const report = () => {
      if (!lastPath.current) return;
      send(
        {
          type: 'duration',
          path: lastPath.current,
          seconds: Math.round((Date.now() - enteredAt.current) / 1000),
          sessionId: sessionId(),
        },
        true
      );
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') report();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', report);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', report);
    };
  }, []);

  return null;
}
