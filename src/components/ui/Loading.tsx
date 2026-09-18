/**
 * The loading state shown while a page is being fetched.
 *
 * Deliberately quiet: a brand-coloured bar that sweeps across the top, and a
 * soft pulse where the content will be. No spinner in the middle of the page,
 * because on a fast connection it would appear and vanish as a flicker.
 *
 * Pure CSS, so it costs nothing and shows even before any JavaScript has run.
 */
export function PageLoading() {
  return (
    <div className="shell py-[clamp(2.5rem,6vw,4.5rem)]" role="status" aria-label="Loading">
      {/* The sweeping bar, pinned under the header. */}
      <span
        className="fixed inset-x-0 top-[var(--header-h)] z-40 block h-0.5 overflow-hidden bg-brand-600/15"
        aria-hidden
      >
        <span className="loading-sweep block h-full w-1/3 bg-brand-600" />
      </span>

      <div className="mx-auto max-w-3xl space-y-4">
        <span className="skeleton block h-7 w-2/5 rounded-lg" />
        <span className="skeleton block h-11 w-4/5 rounded-xl" />
        <span className="skeleton block h-11 w-3/5 rounded-xl" />
        <div className="grid gap-4 pt-6 sm:grid-cols-3">
          <span className="skeleton block h-28 rounded-2xl" />
          <span className="skeleton block h-28 rounded-2xl" />
          <span className="skeleton block h-28 rounded-2xl" />
        </div>
      </div>

      <span className="sr-only">Loading</span>
    </div>
  );
}
