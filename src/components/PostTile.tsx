import Link from 'next/link';
import { Eye, Pin, Images } from 'lucide-react';
import { cn, formatDate, truncate } from '@/lib/utils';
import type { Post } from '@/lib/content';

/**
 * One post as a square tile.
 *
 * This is the feed layout: the picture does the talking, the title only
 * appears when the tile is pointed at, and everything else waits until the
 * post is opened. A post with no cover picture still gets a
 * proper tile rather than an empty box, because a hole in a grid of squares
 * is far more obvious than a hole in a column of cards.
 */
export function PostTile({
  item,
  showMeta = true,
}: {
  item: Post;
  showMeta?: boolean;
}) {
  const date = item.published_at || item.created_at;

  return (
    <Link
      href={`/posts/${item.slug}`}
      className="group relative block aspect-square overflow-hidden rounded-xl border border-line bg-surface-alt"
      aria-label={item.title}
    >
      {item.cover_path ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.cover_path}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
          <span
            className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/10 to-transparent
                       opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden
          />
        </>
      ) : (
        /* No picture: the title is set as the tile itself. */
        <span className="relative grid h-full w-full place-items-center bg-[radial-gradient(ellipse_at_30%_20%,rgb(var(--brand-500)),rgb(var(--brand-800))_75%)] p-5">
          <span className="dot-bg absolute inset-0 opacity-50" aria-hidden />
          <span className="relative text-center font-display text-[0.9375rem] font-bold leading-snug text-white">
            {truncate(item.title, 68)}
          </span>
        </span>
      )}

      {/* Badges */}
      {(item.urgent === 1 || item.pinned === 1) && (
        <span className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {item.urgent === 1 && (
            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-white">
              Urgent
            </span>
          )}
          {item.pinned === 1 && (
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/95 text-ink">
              <Pin className="h-3 w-3" strokeWidth={2.5} />
            </span>
          )}
        </span>
      )}

      {item.cover_path && (
        <span className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-lg bg-black/35 text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
          <Images className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
      )}

      {/* Title slides up out of the shading on hover. */}
      {item.cover_path && (
        <span className="absolute inset-x-0 bottom-0 translate-y-2 p-3.5 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="block text-sm font-semibold leading-snug text-white">
            {truncate(item.title, 72)}
          </span>
          {showMeta && (
            <span className="mt-1 flex items-center gap-3 text-[0.6875rem] text-white/75">
              <span>{formatDate(date)}</span>
              {item.views > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {item.views}
                </span>
              )}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

/** The square feed grid. */
export function PostFeed({
  items,
  showMeta = true,
  className,
}: {
  items: Post[];
  showMeta?: boolean;
  className?: string;
}) {
  if (!items.length) return null;

  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:gap-4', className)}>
      {items.map((item) => (
        <PostTile key={item.id} item={item} showMeta={showMeta} />
      ))}
    </div>
  );
}
