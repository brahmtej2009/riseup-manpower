'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, UserRound, Briefcase, Phone, Check } from 'lucide-react';
import { Counter } from '@/components/ui/Counter';
import { Parallax } from '@/components/ui/Pointer';
import { trackEvent } from '@/components/site/Tracker';
import { cn, telLink } from '@/lib/utils';
import type { Stat } from '@/lib/settings';

export interface HeroContent {
  title: string;
  titleAccent: string;
  subtitle: string;
  note: string;
  ctaEmployer: string;
  ctaCandidate: string;
  ctaPosts: string;
  gallery: string[];
  rotatingWords: string[];
  overlay: number;
}

const EASE = [0.16, 1, 0.3, 1] as const;
const SLIDE_MS = 6000;
const WORD_MS = 2400;

/**
 * The first screen.
 *
 * Two columns: everything a visitor needs in order to act on the left, one
 * large photograph on the right. The words sit on the page background rather
 * than on top of the photograph, which is what keeps the site light.
 *
 * The left column is filled with things the company has actually entered - the
 * headline, the two choices, what it offers, the figures and the phone number.
 * Nothing here is written to fill space, so a company that has entered less
 * gets a shorter column rather than a paragraph nobody asked for.
 */
export function Hero({
  content,
  stats,
  services = [],
  phone,
}: {
  content: HeroContent;
  stats: Stat[];
  /** Service titles, taken from the Services screen. */
  services?: string[];
  phone?: string;
}) {
  const reduce = useReducedMotion();
  const [slide, setSlide] = useState(0);
  const [word, setWord] = useState(0);

  const gallery = content.gallery.filter(Boolean);
  const words = content.rotatingWords.filter(Boolean);
  const shownServices = services.filter(Boolean).slice(0, 4);

  useEffect(() => {
    if (gallery.length < 2 || reduce) return;
    const t = setInterval(() => setSlide((i) => (i + 1) % gallery.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [gallery.length, reduce]);

  useEffect(() => {
    if (words.length < 2 || reduce) return;
    const t = setInterval(() => setWord((i) => (i + 1) % words.length), WORD_MS);
    return () => clearInterval(t);
  }, [words.length, reduce]);

  // The same properties either way. Reduced motion only makes it instant:
  // dropping the animation entirely would leave the server's opacity of zero
  // in place on the visitor's screen. See Reveal.tsx.
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 22, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: reduce ? { duration: 0 } : { duration: 0.8, delay, ease: EASE },
  });

  return (
    <section className="relative isolate flex flex-col overflow-hidden bg-surface-page lg:min-h-hero">
      <div className="absolute inset-0 -z-20 overflow-hidden" aria-hidden>
        <span className="aurora -left-40 -top-44 h-[24rem] w-[24rem] bg-brand-600/[0.14]" />
      </div>

      <div
        className="shell grid flex-1 grid-cols-1 items-center gap-[clamp(1.75rem,4vw,3rem)]
                   py-[clamp(1.25rem,3vh,2rem)]
                   lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)] lg:items-center"
      >
        {/* ------------------------------------------------ left: the offer */}
        <div className="flex min-w-0 flex-col justify-center">
          <motion.h1
            {...rise(0)}
            className="font-display font-bold uppercase leading-[1.06] tracking-tight text-ink"
            style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)' }}
          >
            <span data-field="hero_title">{content.title}</span>
            {words.length > 0 && (
              <>
                {' '}
                <span className="relative inline-block align-bottom">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={word}
                      className="inline-block gradient-text"
                      initial={reduce ? {} : { opacity: 0, y: '0.35em' }}
                      animate={reduce ? {} : { opacity: 1, y: 0 }}
                      exit={reduce ? {} : { opacity: 0, y: '-0.35em' }}
                      transition={{ duration: 0.4, ease: EASE }}
                    >
                      {words[word]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </>
            )}
            {content.titleAccent && (
              <span data-field="hero_title_accent" className="block gradient-text">
                {content.titleAccent}
              </span>
            )}
          </motion.h1>

          {content.subtitle && (
            <motion.p
              {...rise(0.1)}
              data-field="hero_subtitle"
              className="mt-3.5 max-w-lg text-[clamp(0.875rem,1vw,1rem)] leading-relaxed text-ink-soft"
            >
              {content.subtitle}
            </motion.p>
          )}

          {/* The two choices. */}
          <motion.div {...rise(0.18)} className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/register/employer"
              onClick={() => trackEvent('cta.employer', { category: 'cta', label: 'hero' })}
              data-sheen
              className="group inline-flex min-h-[2.875rem] items-center justify-center gap-2.5 rounded-xl
                         bg-brand-600 px-6 text-[0.8125rem] font-bold uppercase tracking-wider text-white
                         shadow-glow transition hover:bg-brand-700"
            >
              <Briefcase className="h-4 w-4" strokeWidth={2.2} />
              <span data-field="hero_cta_employer">{content.ctaEmployer}</span>
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                strokeWidth={2.4}
              />
            </Link>

            <Link
              href="/register/candidate"
              onClick={() => trackEvent('cta.candidate', { category: 'cta', label: 'hero' })}
              data-sheen="ink"
              className="group inline-flex min-h-[2.875rem] items-center justify-center gap-2.5 rounded-xl
                         border border-line-strong bg-surface px-6 text-[0.8125rem] font-bold uppercase
                         tracking-wider text-ink transition hover:border-brand-600 hover:text-brand-600"
            >
              <UserRound className="h-4 w-4" strokeWidth={2.2} />
              <span data-field="hero_cta_candidate">{content.ctaCandidate}</span>
            </Link>
          </motion.div>

          {/* What the company offers, taken from the Services screen rather
              than written here. */}
          {shownServices.length > 0 && (
            <motion.ul
              {...rise(0.26)}
              className="mt-5 grid gap-x-5 gap-y-1.5 text-[0.8125rem] text-ink-soft sm:grid-cols-2"
            >
              {shownServices.map((title) => (
                <li key={title} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" strokeWidth={2.8} />
                  <span className="truncate">{title}</span>
                </li>
              ))}
            </motion.ul>
          )}

          {/* The figures, in the same column so the hero reads as one block. */}
          {stats.length > 0 && (
            <motion.dl
              {...rise(0.32)}
              className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-line pt-5 sm:grid-cols-4"
            >
              {stats.map((stat) => (
                <div key={stat.key}>
                  <dd className="font-display text-[clamp(1.25rem,1.9vw,1.6rem)] font-bold leading-none tracking-tight text-ink">
                    <Counter value={stat.value} suffix={stat.suffix} />
                  </dd>
                  <dt className="mt-1.5 text-[0.6875rem] uppercase tracking-wider text-ink-muted">
                    <span data-field={`stats_${stat.key}_label`}>{stat.label}</span>
                  </dt>
                </div>
              ))}
            </motion.dl>
          )}

          {(phone || content.note) && (
            <motion.div
              {...rise(0.38)}
              className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem] text-ink-muted"
            >
              {phone && (
                <a
                  href={telLink(phone)}
                  onClick={() => trackEvent('phone.click', { category: 'contact', label: 'hero' })}
                  className="inline-flex items-center gap-1.5 font-semibold text-ink transition hover:text-brand-600"
                >
                  <Phone className="h-3.5 w-3.5 text-brand-600" strokeWidth={2.4} />
                  {phone}
                </a>
              )}
              {content.note && <span data-field="hero_note">{content.note}</span>}
            </motion.div>
          )}
        </div>

        {/* ------------------------------------------------ right: one picture */}
        <motion.div
          {...(reduce
            ? {}
            : {
                initial: { opacity: 0, scale: 0.97 },
                animate: { opacity: 1, scale: 1 },
                transition: { duration: 0.85, delay: 0.12, ease: EASE },
              })}
          className="relative mx-auto flex w-full min-w-0 max-w-[32rem] flex-col justify-center lg:max-w-none"
        >
          <Parallax depth={10}>
            <div className="relative">
              <div
                className="pan-frame relative aspect-[4/3] overflow-hidden rounded-2xl border border-line
                           bg-surface-alt shadow-lift sm:aspect-[16/10]
                           lg:aspect-auto lg:h-[clamp(20rem,58vh,34rem)]"
              >
                {gallery.length > 0 ? (
                  <AnimatePresence initial={false}>
                    <motion.div
                      key={slide}
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${gallery[slide]})` }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, scale: reduce ? 1 : 1.08 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        opacity: { duration: 1.1, ease: 'easeInOut' },
                        scale: { duration: SLIDE_MS / 1000 + 2, ease: 'linear' },
                      }}
                    />
                  </AnimatePresence>
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgb(var(--brand-500)),rgb(var(--brand-800))_75%)]" />
                )}

                <div
                  className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-navy-950/60 to-transparent"
                  aria-hidden
                />

                {gallery.length > 1 && (
                  <div className="absolute inset-x-0 bottom-3.5 flex justify-center gap-1.5">
                    {gallery.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSlide(i)}
                        aria-label={`Show photograph ${i + 1}`}
                        className={cn(
                          'h-1.5 rounded-full transition-all duration-300',
                          i === slide ? 'w-7 bg-white' : 'w-3.5 bg-white/40 hover:bg-white/70'
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Parallax>
        </motion.div>
      </div>
    </section>
  );
}
