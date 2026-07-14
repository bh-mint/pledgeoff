import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/@:username', destination: '/profile/:username' }];
  },
  async redirects() {
    return [
      { source: '/launch', destination: '/', permanent: true },
      { source: '/settings/api', destination: '/settings/developer', permanent: true },
    ];
  },
  transpilePackages: [
    '@pledgeoff/core',
    '@pledgeoff/adapters',
    '@pledgeoff/contracts',
    '@pledgeoff/observability',
    '@pledgeoff/eventbus',
  ],
  // sharp native binary must be included explicitly for Vercel deployments
  outputFileTracingIncludes: {
    '/api/v1/profile/avatar': ['./node_modules/sharp/**/*'],
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
});
