import { defineConfig, devices } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Isolated local contract fixture. Never points at Supabase or a deployed application.
const password = process.env.E2E_PRIVATE_TEST_PASSWORD ?? randomUUID();
process.env.E2E_PRIVATE_TEST_PASSWORD = password;
export default defineConfig({
  testDir: './e2e/private-terminal',
  fullyParallel: false,
  workers: 1,
  expect: { timeout: 30_000 },
  timeout: 120_000,
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
  webServer: [
    { command: 'node e2e/private-terminal/auth-fixture.mjs', url: 'http://127.0.0.1:54325/health', reuseExistingServer: false, env: { E2E_PRIVATE_TEST_PASSWORD: password } },
    { command: 'pnpm exec next dev --hostname 127.0.0.1 --port 3100', url: 'http://127.0.0.1:3100/login', reuseExistingServer: false, timeout: 120_000, env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54325', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-fixture-anon',
      PRIVATE_TERMINAL_USER_ID: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', PRIVATE_TERMINAL_EMAIL: 'private@example.test',
      PRIVATE_TERMINAL_ORIGIN: 'http://127.0.0.1:3100', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '',
    } },
  ],
});
