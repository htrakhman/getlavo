/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      {
        source: '/hoboken/waterfront/apartment-car-wash',
        destination: '/cities/hoboken',
        permanent: true,
      },
      {
        source: '/jersey-city/downtown/apartment-car-wash',
        destination: '/cities/jersey-city',
        permanent: true,
      },
      // Building portal sections retired in the 12 -> 7 nav consolidation.
      // These live here rather than as redirecting page.tsx files: the
      // building layout has a loading.tsx, so a redirect() thrown from the
      // page lands inside a Suspense boundary after the shell has already
      // streamed, leaving an empty page under the header.
      {
        source: '/building/broadcast',
        destination: '/building/announcements',
        permanent: true,
      },
      {
        source: '/building/comms',
        destination: '/building',
        permanent: true,
      },
      {
        source: '/building/insights',
        destination: '/building',
        permanent: true,
      },
      {
        source: '/building/garage-layout',
        destination: '/building/settings',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
};
export default nextConfig;
