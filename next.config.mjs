/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // better-sqlite3 and sharp are native modules; they must not be bundled.
  serverExternalPackages: ['better-sqlite3', 'sharp'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // The announcements section was renamed to posts. Anything already linking
  // to the old address keeps working.
  async redirects() {
    return [
      { source: '/announcements', destination: '/posts', permanent: true },
      { source: '/announcements/:slug', destination: '/posts/:slug', permanent: true },
      { source: '/admin/announcements', destination: '/admin/posts', permanent: false },
      { source: '/admin/announcements/:path*', destination: '/admin/posts/:path*', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Admin pages must never be cached by a proxy or the browser.
        source: '/admin/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
