import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    '@pledgeoff/core',
    '@pledgeoff/adapters',
    '@pledgeoff/contracts',
    '@pledgeoff/observability',
    '@pledgeoff/eventbus',
  ],
};

export default nextConfig;
