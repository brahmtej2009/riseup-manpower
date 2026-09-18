'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THEME_KEY } from '@/lib/theme';

export type Mode = 'light' | 'dark';

/**
 * The light / dark switch.
 *
 * The mode itself is applied by the small script in the root layout, before
 * the page is painted, so there is never a flash of the wrong colours. This
 * button only changes it afterwards and remembers the choice on the visitor's
 * own device. Nothing is sent to the server and no cookie is set.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setMode(current === 'dark' ? 'dark' : 'light');
  }, []);

  const flip = () => {
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private browsing - the choice simply is not remembered */
    }
    setMode(next);
  };

  const dark = mode === 'dark';

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={dark ? 'Switch to the light version' : 'Switch to the dark version'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={cn(
        'relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line',
        'text-ink-soft transition-colors hover:border-brand-600 hover:text-brand-600',
        className
      )}
    >
      {/* Both icons are rendered and cross-faded, so the button never jumps. */}
      <Sun
        className={cn(
          'absolute h-[1.15rem] w-[1.15rem] transition-all duration-300',
          dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'
        )}
        strokeWidth={2.1}
      />
      <Moon
        className={cn(
          'absolute h-[1.15rem] w-[1.15rem] transition-all duration-300',
          dark ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
        )}
        strokeWidth={2.1}
      />
    </button>
  );
}
