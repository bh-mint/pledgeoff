import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  transpilePackages: [
    '@pledgeoff/core',
    '@pledgeoff/adapters',
    '@pledgeoff/contracts',
    '@pledgeoff/observability',
    '@pledgeoff/eventbus',
  ],
};

export default withSentryConfig(nextConfig, {
  silent: true,
});
