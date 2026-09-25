'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Scroll-in animation used across the public site.
 *
 * Reduced motion does NOT swap in a plain element. The server always renders
 * the animated one (it cannot know the visitor's preference), and React keeps
 * the server's inline `opacity: 0` when the client renders something else -
 * which left the page invisible, and the figures reading zero, on any phone
 * with reduced motion switched on. So the same element is always rendered,
 * and reduced motion simply makes it appear at once.
 *
 * Deliberately restrained: a short fade with a small rise, once only, and
 * nothing at all for visitors who have asked for reduced motion. The point is
 * that the page feels alive, not that it performs.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

const offsets: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 18 },
  down: { x: 0, y: -18 },
  left: { x: 22, y: 0 },
  right: { x: -22, y: 0 },
  none: { x: 0, y: 0 },
};

export function Reveal({
  children,
  delay = 0,
  direction = 'up',
  duration = 0.55,
  className,
  once = true,
  as = 'div',
}: {
  children: ReactNode;
  delay?: number;
  direction?: Direction;
  duration?: number;
  className?: string;
  once?: boolean;
  as?: 'div' | 'section' | 'li' | 'article' | 'span';
}) {
  const reduce = useReducedMotion();
  const { x, y } = offsets[direction];
  const Tag = motion[as];

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, x, y }}
      animate={reduce ? { opacity: 1, x: 0, y: 0 } : undefined}
      whileInView={reduce ? undefined : { opacity: 1, x: 0, y: 0 }}
      viewport={reduce ? undefined : { once, margin: '-60px 0px -60px 0px' }}
      transition={reduce ? { duration: 0 } : { duration, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

/** Staggers direct children. Pair with <RevealItem>. */
export function RevealGroup({
  children,
  className,
  stagger = 0.07,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : stagger, delayChildren: reduce ? 0 : delay } },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      animate={reduce ? 'show' : undefined}
      whileInView={reduce ? undefined : 'show'}
      viewport={reduce ? undefined : { once: true, margin: '-60px 0px -60px 0px' }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article';
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: reduce ? { duration: 0 } : { duration: 0.5, ease: EASE } },
      }}
    >
      {children}
    </Tag>
  );
}
