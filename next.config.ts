import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Anchor module resolution/tracing to this project. Without it Turbopack may
  // walk up to a lockfile in a parent directory (e.g. the user's home) and try to
  // treat that directory as the root.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
