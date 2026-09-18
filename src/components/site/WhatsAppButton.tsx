'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { whatsappLink } from '@/lib/utils';
import type { SiteInfo } from '@/lib/settings';
import { SocialIcon } from './SocialIcon';
import { trackEvent } from './Tracker';

/**
 * Floating WhatsApp button. Appears only after the visitor has scrolled a
 * little, so it never sits on top of the hero call-to-action buttons.
 */
export function WhatsAppButton({ site }: { site: SiteInfo }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 420);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!site.whatsapp) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.a
          href={whatsappLink(site.whatsapp, `Hello ${site.name}, I would like to enquire about `)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Message us on WhatsApp"
          onClick={() => trackEvent('whatsapp.click', { category: 'contact', label: 'floating' })}
          className="group fixed bottom-5 right-5 z-40 flex items-center gap-0 overflow-hidden
                     rounded-full bg-emerald-600 px-3.5 py-3.5 text-white shadow-lg
                     transition-colors hover:bg-emerald-500 sm:bottom-7 sm:right-7"
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        >
          <SocialIcon name="whatsapp" className="h-6 w-6 shrink-0" />
          <span
            className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold
                       transition-all duration-300 group-hover:max-w-[10rem] group-hover:pl-2.5"
          >
            Chat with us
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}
