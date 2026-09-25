/**
 * Shown while an admin page is being fetched.
 *
 * Just the shapes of the page to come. No sweeping bar across the top: in a
 * panel that is mostly navigated in quick hops, a bar appearing and vanishing
 * over the header reads as a glitch rather than as progress.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="mb-6 space-y-2">
        <span className="skeleton block h-7 w-56 rounded-lg" />
        <span className="skeleton block h-4 w-80 rounded" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="skeleton block h-24 rounded-2xl" />
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <span className="skeleton block h-72 rounded-2xl lg:col-span-2" />
        <span className="skeleton block h-72 rounded-2xl" />
      </div>

      <span className="sr-only">Loading</span>
    </div>
  );
}
