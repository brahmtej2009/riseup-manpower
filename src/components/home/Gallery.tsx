'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import type { GalleryPhoto } from '@/lib/content';

/**
 * The photo gallery.
 *
 * A staggered grid rather than a plain one, so a set of ordinary photographs
 * still reads as a considered arrangement. Selecting a photograph opens it
 * full size, with the arrow keys and Escape working as expected.
 */
export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<number | null>(null);

  const step = useCallback(
    (by: number) => setOpen((i) => (i === null ? null : (i + by + photos.length) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, step]);

  if (!photos.length) return null;

  const current = open === null ? null : photos[open];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, i) => (
          <motion.button
            key={photo.id}
            type="button"
            onClick={() => setOpen(i)}
            // Reduced motion still animates, instantly: the server always
            // renders the starting opacity of zero, so leaving the animation
            // out would leave the photographs invisible. See Reveal.tsx.
            initial={{ opacity: 0, y: 18 }}
            animate={reduce ? { opacity: 1, y: 0 } : undefined}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={reduce ? undefined : { once: true, margin: '-60px' }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.5, delay: Math.min(i, 8) * 0.05, ease: [0.16, 1, 0.3, 1] }
            }
            className="pan-frame group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-surface-alt"
            aria-label={photo.title || `Open photograph ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.path}
              alt={photo.title || ''}
              loading="lazy"
              className="h-full w-full object-cover"
            />

            <span
              className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/10 to-transparent
                         opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />

            <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-ink opacity-0 transition duration-300 group-hover:opacity-100">
              <Expand className="h-4 w-4" strokeWidth={2.2} />
            </span>

            {photo.title && (
              <span className="absolute inset-x-0 bottom-0 translate-y-2 px-3.5 pb-3 text-left text-sm font-semibold leading-snug text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                {photo.title}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Full size */}
      <AnimatePresence>
        {current && (
          <motion.div
            className="fixed inset-0 z-[80] flex flex-col bg-navy-950/95 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={current.title || 'Photograph'}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 text-white sm:px-6">
              <p className="min-w-0 truncate text-sm font-medium">
                {current.title || `${(open ?? 0) + 1} of ${photos.length}`}
              </p>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/20 transition hover:bg-white/10"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              className="relative flex flex-1 items-center justify-center px-4 pb-4 sm:px-16"
              onClick={(e) => e.target === e.currentTarget && setOpen(null)}
            >
              <motion.img
                key={current.id}
                src={current.path}
                alt={current.title || ''}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={reduce ? { duration: 0 } : { duration: 0.3 }}
                className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
              />

              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/25 sm:left-4"
                    aria-label="Previous photograph"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/25 sm:right-4"
                    aria-label="Next photograph"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {current.caption && (
              <p className="px-6 pb-6 text-center text-sm leading-relaxed text-slate-300">
                {current.caption}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
