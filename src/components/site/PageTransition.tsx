'use client';

import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * The move from one page to the next.
 *
 * A short rise and fade, keyed on the address, so a new page settles in rather
 * than appearing all at once. Deliberately quick: anything longer than about a
 * third of a second stops feeling like polish and starts feeling like waiting.
 *
 * There is no exit animation on purpose. Next renders the next page before the
 * old one leaves, and animating both together makes navigation feel slower
 * than it is.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
