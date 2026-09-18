'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Inbox, Building2, Users, Megaphone, UserSquare2, Briefcase,
  Image as ImageIcon, Images, Palette, Mail, BarChart3, ShieldCheck, Settings, Server,
  Menu, X, LogOut, ExternalLink, ChevronDown, User as UserIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import { logoutAction } from '@/app/admin/(panel)/actions';

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, Inbox, Building2, Users, Megaphone, UserSquare2, Briefcase,
  Image: ImageIcon, Images, Palette, Mail, BarChart3, ShieldCheck, Settings, Server,
};

export interface NavItem {
  href?: string;
  label?: string;
  icon?: string;
  permission?: string;
  badge?: number;
  exact?: boolean;
  section?: string;
}

interface ShellUser {
  id: number;
  name: string;
  username: string;
  role: string;
  isSuper: boolean;
}

export function AdminShell({
  nav,
  user,
  site,
  children,
}: {
  nav: NavItem[];
  user: ShellUser;
  site: { name: string; logo: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    const close = () => setMenuOpen(false);
    if (menuOpen) {
      document.addEventListener('click', close);
      return () => document.removeEventListener('click', close);
    }
  }, [menuOpen]);

  const isActive = (item: NavItem) => {
    if (!item.href) return false;
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  };

  const current = nav.find((n) => isActive(n));

  /**
   * The Themes screen is an editor, not a list. It gets the whole window:
   * a slim bar instead of the usual header, and no padding around the content,
   * so the preview of the website is as large as the screen allows.
   */
  const focus = pathname === '/admin/themes';

  const navList = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {nav.map((item, i) =>
        item.section ? (
          <p
            key={`s-${i}`}
            className="px-3 pb-1.5 pt-5 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500"
          >
            {item.section}
          </p>
        ) : (
          <Link
            key={item.href}
            href={item.href!}
            className={cn(
              'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive(item)
                ? 'bg-brand-600 text-white shadow-[0_4px_14px_-6px_rgb(var(--brand-600)/0.9)]'
                : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
            )}
          >
            {(() => {
              const Icon = ICONS[item.icon ?? ''] ?? LayoutDashboard;
              return <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={2} />;
            })()}
            <span className="flex-1 truncate">{item.label}</span>
            {!!item.badge && item.badge > 0 && (
              <span
                className={cn(
                  'grid min-w-[1.375rem] place-items-center rounded-full px-1.5 py-0.5 text-[0.6875rem] font-bold',
                  isActive(item) ? 'bg-white/25 text-white' : 'bg-brand-600 text-white'
                )}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </Link>
        )
      )}
    </nav>
  );

  const brand = (
    <Link href="/admin" className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-brand-600 text-white">
        {site.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={site.logo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-sm font-bold">{site.name.slice(0, 1)}</span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-white">{site.name}</span>
        <span className="block text-[0.6875rem] text-slate-400">Admin panel</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar - desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[16.5rem] flex-col bg-ink lg:flex">
        {brand}
        {navList}
        <div className="border-t border-white/10 p-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            <ExternalLink className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
            View the website
          </Link>
        </div>
      </aside>

      {/* Sidebar - mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[16.5rem] flex-col bg-ink lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
            >
              <div className="flex items-center justify-between border-b border-white/10 pr-3">
                <div className="flex-1">{brand}</div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {navList}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="lg:pl-[16.5rem]">
        <header
          className={cn(
            'sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/85 backdrop-blur-xl',
            focus ? 'h-12 px-3 sm:px-4' : 'h-16 px-4 sm:px-6'
          )}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className={cn(
              'grid place-items-center rounded-xl border border-slate-200 text-ink lg:hidden',
              focus ? 'h-8 w-8' : 'h-10 w-10'
            )}
            aria-label="Open menu"
          >
            <Menu className={focus ? 'h-4 w-4' : 'h-5 w-5'} />
          </button>

          <p
            className={cn(
              'flex-1 truncate font-display font-semibold text-ink',
              focus ? 'text-[0.8125rem]' : 'text-base'
            )}
          >
            {current?.label ?? 'Admin'}
          </p>

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border border-slate-200 transition hover:bg-slate-50',
                focus ? 'p-1' : 'py-1.5 pl-1.5 pr-3'
              )}
            >
              <span
                className={cn(
                  'grid place-items-center rounded-lg bg-brand-600 font-bold text-white',
                  focus ? 'h-7 w-7 text-[0.625rem]' : 'h-8 w-8 text-xs'
                )}
              >
                {initials(user.name)}
              </span>
              <span className={cn('text-left', focus ? 'hidden' : 'hidden sm:block')}>
                <span className="block text-[0.8125rem] font-semibold leading-tight text-ink">
                  {user.name}
                </span>
                <span className="block text-[0.6875rem] leading-tight text-ink-muted">
                  {user.isSuper ? 'Super admin' : user.role.replace('_', ' ')}
                </span>
              </span>
              {!focus && <ChevronDown className="h-4 w-4 text-ink-muted" />}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift"
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-ink">{user.name}</p>
                    <p className="text-xs text-ink-muted">{user.username}</p>
                  </div>
                  <Link
                    href="/admin/account"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft transition hover:bg-slate-50"
                  >
                    <UserIcon className="h-4 w-4" />
                    My account
                  </Link>
                  <Link
                    href="/"
                    target="_blank"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft transition hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View the website
                  </Link>
                  <form action={logoutAction} className="border-t border-slate-100">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className={focus ? '' : 'p-4 sm:p-6 lg:p-8'}>{children}</main>
      </div>
    </div>
  );
}
