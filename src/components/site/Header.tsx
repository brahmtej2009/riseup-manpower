'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { Menu, X, Phone, ChevronRight, ArrowRight } from 'lucide-react';
import { cn, telLink } from '@/lib/utils';
import { trackEvent } from './Tracker';
import { ThemeToggle } from './Theme';
import type { SiteInfo } from '@/lib/settings';

const NAV = [
  { href: '/', key: 'nav_home' },
  { href: '/team', key: 'nav_team' },
  { href: '/posts', key: 'nav_posts' },
  { href: '/contact', key: 'nav_contact' },
] as const;

/**
 * Header.
 *
 * Reads its colours from the theme variables, so the same markup is a light
 * header on the light version of the site and a dark one on the dark version.
 * It publishes its own rendered height as --header-h so that the hero can
 * size itself to exactly the space left over, at any screen size.
 */
export function Header({
  site,
  showThemeToggle = true,
}: {
  site: SiteInfo;
  showThemeToggle?: boolean;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const headerRef = useRef<HTMLElement>(null);

  // How far down the page the visitor is, drawn as a thin line.
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled((was) => (was ? y > 30 : y > 60));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener('resize', apply);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [scrolled]);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const logo = (size: string) => (
    <span className={cn('grid shrink-0 place-items-center overflow-hidden rounded-lg', size)}>
      {site.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={site.logo} alt={site.name} className="h-full w-full object-contain" />
      ) : (
        <span className="grid h-full w-full place-items-center bg-brand-600 font-display text-lg font-bold text-white">
          {site.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          'fixed inset-x-0 top-0 z-50 border-b transition-all duration-300',
          scrolled
            ? 'border-line bg-surface/85 shadow-card backdrop-blur-xl'
            : 'border-transparent bg-surface-page'
        )}
      >
        <div
          className={cn(
            'shell flex items-center justify-between gap-4 transition-all duration-300',
            scrolled ? 'h-[4.25rem]' : 'h-[4.75rem] lg:h-[5.5rem]'
          )}
        >
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={site.name}>
            {logo(scrolled ? 'h-10 w-10 lg:h-11 lg:w-11' : 'h-11 w-11 lg:h-14 lg:w-14')}
            <span
              data-field="company_name"
              className={cn(
                'truncate font-display font-bold uppercase tracking-tight text-ink transition-all duration-300',
                scrolled ? 'text-[0.9375rem] lg:text-base' : 'text-base lg:text-lg'
              )}
            >
              {site.name}
            </span>
          </Link>

          <nav className="hidden items-center lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative px-4 py-2 text-[0.8125rem] font-semibold uppercase tracking-wider transition-colors',
                  isActive(item.href) ? 'text-ink' : 'underline-grow text-ink-muted hover:text-ink'
                )}
              >
                <span data-field={item.key}>{site.words[item.key]}</span>
                {isActive(item.href) && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-4 -bottom-px h-0.5 bg-brand-600"
                    transition={
                      reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }
                    }
                  />
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {site.phone && (
              <a
                href={telLink(site.phone)}
                className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft transition hover:text-brand-600 xl:inline-flex"
                onClick={() => trackEvent('phone.click', { category: 'contact', label: 'header' })}
              >
                <Phone className="h-4 w-4 text-brand-600" strokeWidth={2.3} />
                {site.phone}
              </a>
            )}

            {showThemeToggle && <ThemeToggle />}

            <Link
              href="/register/employer"
              data-sheen
              className="group hidden items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-[0.8125rem] font-bold uppercase tracking-wider text-white shadow-glow transition hover:bg-brand-700 sm:inline-flex"
              onClick={() => trackEvent('cta.employer', { category: 'cta', label: 'header' })}
            >
              <span data-field="header_cta">{site.words.header_cta}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-line text-ink transition hover:border-brand-600 hover:text-brand-600 lg:hidden"
              aria-label="Open menu"
              aria-expanded={open}
            >
              <Menu className="h-5 w-5" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Reading position. Only meaningful once the page is long enough. */}
        <motion.span
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brand-600"
          style={{ scaleX: reduce ? 0 : progress }}
          aria-hidden
        />
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 right-0 z-[61] flex w-[min(21rem,86vw)] flex-col border-l border-line bg-surface shadow-2xl lg:hidden"
              initial={reduce ? { opacity: 0 } : { x: '100%' }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: '100%' }}
              transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.32 }}
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <span className="flex items-center gap-2.5">
                  {logo('h-10 w-10')}
                  <span className="font-display text-[0.9375rem] font-bold uppercase text-ink">
                    {site.name}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-alt hover:text-ink"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" strokeWidth={2.2} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-2">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center justify-between border-b border-line px-5 py-4 text-sm font-semibold uppercase tracking-wider transition',
                      isActive(item.href)
                        ? 'bg-brand-600/10 text-brand-600'
                        : 'text-ink-soft hover:bg-surface-alt hover:text-ink'
                    )}
                  >
                    <span data-field={item.key}>{site.words[item.key]}</span>
                    <ChevronRight className="h-4 w-4 opacity-40" />
                  </Link>
                ))}
              </nav>

              <div className="space-y-2.5 border-t border-line p-5">
                <Link
                  href="/register/employer"
                  className="btn w-full bg-brand-600 text-white hover:bg-brand-700"
                >
                  <span data-field="header_cta">{site.words.header_cta}</span>
                </Link>
                <Link href="/register/candidate" className="btn-outline w-full">
                  <span data-field="menu_cta_candidate">{site.words.menu_cta_candidate}</span>
                </Link>
                {site.phone && (
                  <a
                    href={telLink(site.phone)}
                    className="flex items-center justify-center gap-2 pt-2 text-sm font-semibold text-ink-soft"
                  >
                    <Phone className="h-4 w-4 text-brand-600" strokeWidth={2.3} />
                    {site.phone}
                  </a>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
