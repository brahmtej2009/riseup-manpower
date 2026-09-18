'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, X, ExternalLink, ShieldCheck } from 'lucide-react';

/**
 * Opens a resume (or any stored document) for review without ever leaving
 * the admin panel.
 *
 * A PDF renders inline, inside an iframe that is both sandboxed itself and
 * pointed at a file the server already serves under its own restrictive
 * Content-Security-Policy - so even a resume crafted to carry something
 * unwanted has nowhere to run it. A Word document cannot be rendered by the
 * browser at all, so it still opens in a new tab; that tab is exactly as
 * sandboxed by the server as the inline view is, the only difference is
 * Word documents need Word (or a viewer) to actually display.
 */
export function DocumentViewer({ path, label = 'Open the resume' }: { path: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const isPdf = path.toLowerCase().endsWith('.pdf');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!isPdf) {
    // Word documents have no in-browser renderer. The link still goes
    // through the same sandboxed, extension-locked serving route as the
    // inline PDF view - opening in a new tab does not weaken that.
    return (
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-32 w-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-ink-soft transition hover:border-brand-400 hover:bg-brand-600/[0.06] hover:text-brand-700"
      >
        <FileText className="h-7 w-7" strokeWidth={1.6} />
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[0.625rem] text-ink-muted">Opens in a new tab - Word cannot be shown inline</span>
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-32 w-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-ink-soft transition hover:border-brand-400 hover:bg-brand-600/[0.06] hover:text-brand-700"
      >
        <FileText className="h-7 w-7" strokeWidth={1.6} />
        <span className="text-xs font-medium">{label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[80] bg-ink/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed inset-3 z-[81] flex flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl sm:inset-8"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              role="dialog"
              aria-modal="true"
              aria-label="Resume"
            >
              <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  Viewed in a sandboxed frame - nothing in this file can run
                </span>
                <a
                  href={path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft transition hover:text-brand-600"
                >
                  Open in a new tab
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-surface-alt hover:text-ink"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* allow-same-origin only, and only because the file is served
                  from this app's own origin under its own strict CSP - no
                  script or form permission is ever granted to the frame. */}
              <iframe
                src={path}
                title="Resume"
                className="min-h-0 flex-1"
                sandbox="allow-same-origin"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
