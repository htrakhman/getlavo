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
