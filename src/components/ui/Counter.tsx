'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import { formatNumber } from '@/lib/utils';

/**
 * Counts up to a number when it scrolls into view.
 *
 * The real figure is what is rendered to begin with, and the count-up is only
 * an embellishment on top. That way the figure is right even when the count
 * never runs: with JavaScript switched off, with reduced motion, in a
 * background tab where the browser gives out no animation frames, or if the
 * element is never reported as on screen. Showing "0 years in operation"
 * because an animation did not start is far worse than not animating.
 */

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function Counter({
  value,
  duration = 1500,
  suffix = '',
  className,
}: {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const [counting, setCounting] = useState(false);

  // Decided before the browser paints, so the figure never flashes.
  useIsomorphicLayoutEffect(() => {
    if (reduce || value <= 0 || document.hidden) return;
    setDisplay(0);
    setCounting(true);
  }, [reduce, value]);

  useEffect(() => {
    if (!counting) return;

    // If it is never reported as on screen, the figure is simply shown.
    if (!inView) {
      const giveUp = setTimeout(() => {
        setCounting(false);
        setDisplay(value);
      }, 2500);
      return () => clearTimeout(giveUp);
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // easeOutExpo - fast at first, gentle at the end.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(Math.round(eased * value));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [counting, inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {formatNumber(display)}
      {suffix}
    </span>
  );
}
