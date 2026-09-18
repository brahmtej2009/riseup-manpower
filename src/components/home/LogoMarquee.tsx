import { cn } from '@/lib/utils';
import type { ClientLogo } from '@/lib/content';

/**
 * The row of client logos that slides steadily to the left.
 *
 * Every logo is given the same height and keeps its own width, so a long
 * wordmark and a square badge sit together evenly however they were supplied.
 * The track holds the list twice and the animation resets at -50%, which is
 * exactly one copy, so the loop has no visible seam.
 *
 * It is plain CSS, not JavaScript, which means it also costs nothing on a
 * phone and stops entirely for a visitor who has asked for reduced motion.
 */
export function LogoMarquee({
  logos,
  heading,
  height = 72,
  speed = 38,
  grayscale = false,
}: {
  logos: ClientLogo[];
  heading?: string;
  height?: number;
  speed?: number;
  grayscale?: boolean;
}) {
  if (!logos.length) return null;

  const logoHeight = Math.min(Math.max(height, 24), 140);
  const pace = Math.min(Math.max(speed, 10), 120);

  // A short list would leave a gap before the loop comes round again, so the
  // list is repeated until there is comfortably more than one screen of it.
  // A long list is never trimmed: however many logos are added, all of them
  // appear, and the row simply takes longer to come round.
  const MINIMUM = 10;
  const filled: ClientLogo[] = [];
  while (filled.length < MINIMUM) filled.push(...logos);

  // The animation always covers the same distance in track-widths, so a fixed
  // duration would make a long row race past and a short one crawl. Scaling it
  // by how much is actually in the row keeps the speed on screen identical
  // whether there are three logos or fifty.
  const duration = Math.round(pace * (filled.length / MINIMUM));

  const item = (logo: ClientLogo, key: string, hidden = false) => {
    const image = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo.path}
        alt={logo.name}
        loading="lazy"
        className={cn(
          'logo-fit transition duration-300',
          grayscale && 'opacity-70 grayscale group-hover/logo:opacity-100 group-hover/logo:grayscale-0'
        )}
      />
    );

    return (
      <span
        key={key}
        aria-hidden={hidden || undefined}
        className="group/logo flex shrink-0 items-center justify-center px-[clamp(1.25rem,3vw,2.75rem)]"
      >
        {logo.url ? (
          <a
            href={logo.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            title={logo.name}
            className="flex items-center"
          >
            {image}
          </a>
        ) : (
          image
        )}
      </span>
    );
  };

  return (
    <section className="border-y border-line bg-surface-soft py-[clamp(1.5rem,3vw,2.5rem)]">
      {heading && (
        <p
          data-field="logos_heading"
          className="shell mb-[clamp(1rem,2vw,1.5rem)] text-center text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-muted"
        >
          {heading}
        </p>
      )}

      <div
        className="marquee-paused mask-fade-x overflow-hidden"
        style={
          {
            '--logo-h': `${logoHeight}px`,
            '--marquee-duration': `${duration}s`,
          } as React.CSSProperties
        }
      >
        <div className="marquee items-center">
          {filled.map((logo, i) => item(logo, `a-${i}`))}
          {/* The same list again, so the reset is invisible. */}
          {filled.map((logo, i) => item(logo, `b-${i}`, true))}
        </div>
      </div>
    </section>
  );
}
