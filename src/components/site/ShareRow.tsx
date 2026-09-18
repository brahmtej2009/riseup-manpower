'use client';

import { useState } from 'react';
import { Link2, Check, Share2 } from 'lucide-react';
import { SocialIcon } from './SocialIcon';
import { trackEvent } from './Tracker';

/** Share buttons under a post. */
export function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const href = url || (typeof window !== 'undefined' ? window.location.href : '');
  const encodedUrl = encodeURIComponent(href);
  const encodedTitle = encodeURIComponent(title);

  const targets = [
    { key: 'whatsapp', name: 'WhatsApp', href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { key: 'facebook', name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { key: 'linkedin', name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { key: 'twitter', name: 'X', href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      trackEvent('share.copy', { category: 'share', label: title });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft">
        <Share2 className="h-4 w-4" />
        Share
      </span>

      {targets.map((t) => (
        <a
          key={t.key}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${t.name}`}
          title={`Share on ${t.name}`}
          onClick={() => trackEvent('share.click', { category: 'share', label: t.name })}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-muted transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          <SocialIcon name={t.key} className="h-4 w-4" />
        </a>
      ))}

      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink-muted transition hover:border-brand-300 hover:text-brand-700"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-emerald-600" />
            Copied
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4" />
            Copy link
          </>
        )}
      </button>
    </div>
  );
}
