'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Pointer-driven effects.
 *
 * All of it is held to two rules:
 *   - nothing happens unless there is a real mouse, checked with
 *     `(hover: hover) and (pointer: fine)`, so a phone never pays for it;
 *   - nothing happens if the visitor has asked for reduced motion.
 *
 * The movements are small on purpose. The point is that the page feels
 * responsive under the hand, not that it performs.
 */

function useFinePointer(): boolean {
  const reduce = useReducedMotion();
  const ref = useRef(false);

  useEffect(() => {
    ref.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }, []);

  return !reduce && ref.current;
}

/**
 * Tilts a card toward the cursor. The rotation is a couple of degrees at most,
 * which reads as the surface catching the light rather than as a toy.
 */
export function Tilt({
  children,
  className,
  strength = 6,
  lift = 6,
}: {
  children: ReactNode;
  className?: string;
  /** Maximum rotation in degrees. */
  strength?: number;
  /** How far the card rises, in pixels. */
  lift?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const enabled = useRef(false);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hovering = useMotionValue(0);

  const spring = { stiffness: 260, damping: 26, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [strength, -strength]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-strength, strength]), spring);
  const y = useSpring(useTransform(hovering, [0, 1], [0, -lift]), spring);

  useEffect(() => {
    enabled.current = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }, []);

  if (reduce) return <div className={className}>{children}</div>;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled.current || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };

  const reset = () => {
    px.set(0.5);
    py.set(0.5);
    hovering.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={cn('[transform-style:preserve-3d]', className)}
      style={{ rotateX, rotateY, y, perspective: 900 }}
      onPointerMove={onMove}
      onPointerEnter={() => enabled.current && hovering.set(1)}
      onPointerLeave={reset}
    >
      {children}
    </motion.div>
  );
}

/**
 * Moves an element gently against the pointer, for background layers.
 * A negative depth makes it drift with the cursor instead of away from it.
 */
export function Parallax({
  children,
  depth = 14,
  className,
}: {
  children: ReactNode;
  depth?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const spring = { stiffness: 60, damping: 20, mass: 0.8 };
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);

  useEffect(() => {
    if (reduce) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const onMove = (e: PointerEvent) => {
      // -1 to 1 across the viewport, so the drift is the same at any size.
      x.set(((e.clientX / window.innerWidth) * 2 - 1) * -depth);
      y.set(((e.clientY / window.innerHeight) * 2 - 1) * -depth);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [depth, reduce, x, y]);

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} style={{ x: sx, y: sy }}>
      {children}
    </motion.div>
  );
}

/**
 * One document-level listener that keeps --mx and --my up to date on whatever
 * is currently under the cursor and carries `data-sheen`. The highlight itself
 * is drawn in CSS, so adding it to something is a single attribute.
 */
export function PointerEffects() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;

    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const target = (e.target as Element | null)?.closest?.('[data-sheen]');
        if (!(target instanceof HTMLElement)) return;

        const r = target.getBoundingClientRect();
        target.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        target.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}

/** Lifts a small element slightly when it is pointed at. */
export function Lift({
  children,
  className,
  by = 4,
}: {
  children: ReactNode;
  className?: string;
  by?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      whileHover={{ y: -by }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}
