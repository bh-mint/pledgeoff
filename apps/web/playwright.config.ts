import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://staging.pledgeoff.com';

// Staging previews sit behind Vercel Authentication. With a Protection Bypass
// for Automation secret (Vercel → Settings → Deployment Protection), these
// headers let the suite through; the set-bypass-cookie header makes the
// exemption stick for subsequent browser navigations.
const BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const bypassHeaders = BYPASS_SECRET
  ? {
      'x-vercel-protection-bypass': BYPASS_SECRET,
      'x-vercel-set-bypass-cookie': 'true',
    }
  : undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...(bypassHeaders ? { extraHTTPHeaders: bypassHeaders } : {}),
  },

  projects: [
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
