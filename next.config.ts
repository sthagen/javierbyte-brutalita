import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The fonts are a stable, hotlinkable URL that always serves the latest
        // build, so they are worth caching — but they must revalidate or a font
        // update never reaches anyone. Next serves public/ with max-age=0.
        source: '/font/:file*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
