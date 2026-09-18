import type { Metadata, Viewport } from 'next';
import './globals.css';
import { getSettings, getSiteInfo, str, bool } from '@/lib/settings';
import { themeScript } from '@/lib/theme';

/**
 * Root layout. Everything here applies to both the public site and the admin
 * panel, so it stays deliberately thin - the two have their own layouts.
 */

// System font stacks. No web font is fetched, which means no render-blocking
// request, no layout shift, and - importantly for the update system - no
// build step that can fail because a font CDN was unreachable.
const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", ' +
  '"Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';
const DISPLAY =
  '"Segoe UI Variable Display", "Segoe UI", ui-sans-serif, system-ui, -apple-system, ' +
  'Roboto, "Helvetica Neue", Arial, sans-serif';

export async function generateMetadata(): Promise<Metadata> {
  const s = getSettings();
  const site = getSiteInfo();
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const title = str(s, 'seo_title', `${site.name} - ${site.tagline}`);
  const description = str(s, 'seo_description', site.description);
  const ogImage = str(s, 'seo_og_image') || site.logo;

  return {
    metadataBase: new URL(base),
    title: { default: title, template: `%s | ${site.name}` },
    description,
    keywords: str(s, 'seo_keywords')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
    applicationName: site.name,
    // One square logo upload covers the header, the footer and the browser
    // tab icon. A separate favicon is only used if the company sets one.
    icons: (() => {
      const icon = site.favicon || site.logo;
      return icon ? { icon, shortcut: icon, apple: icon } : undefined;
    })(),
    openGraph: {
      type: 'website',
      siteName: site.name,
      title,
      description,
      url: base,
      locale: 'en_IN',
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#090d17' },
  ],
};

/** Turns "#1552F0" into "21 82 240" for the CSS variables. */
function hexToRgbTriplet(hex: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}`;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const s = getSettings();
  const site = getSiteInfo();

  // The brand colour chosen in Settings overrides the palette at runtime.
  const brand = hexToRgbTriplet(site.brandColor);
  const accent = hexToRgbTriplet(site.accentColor);
  // The chosen colour drives the button, and a darker version drives its
  // hover state, so a custom brand colour still looks deliberate.
  const darker = (() => {
    if (!brand) return null;
    const [r, g, b] = brand.split(' ').map(Number);
    const dim = (n: number) => Math.max(0, Math.round(n * 0.82));
    return `${dim(r)} ${dim(g)} ${dim(b)}`;
  })();

  const overrides = [
    brand && `--brand-600:${brand};--brand-500:${brand};`,
    darker && `--brand-700:${darker};`,
    accent && `--accent-500:${accent};`,
  ]
    .filter(Boolean)
    .join('');

  const analytics = str(s, 'seo_analytics');

  // Light or dark is decided before the first paint, so the page never
  // flashes the wrong colours on the way in.
  const theme = themeScript({
    defaultDark: bool(s, 'theme_dark_default', false),
    followDevice: bool(s, 'theme_follow_device', true),
    corners: str(s, 'theme_corner_style', 'rounded'),
  });

  return (
    <html
      lang="en-IN"
      data-theme={bool(s, 'theme_dark_default', false) ? 'dark' : 'light'}
      suppressHydrationWarning
      style={{ ['--font-sans' as string]: SANS, ['--font-display' as string]: DISPLAY }}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: theme }} />
        {overrides && (
          <style dangerouslySetInnerHTML={{ __html: `:root{${overrides}}` }} />
        )}
        {/* Analytics / verification snippet from Settings, if the company adds one. */}
        {analytics && <div dangerouslySetInnerHTML={{ __html: analytics }} />}
      </head>
      <body>{children}</body>
    </html>
  );
}
