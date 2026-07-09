import { test as setup, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { AUTH_FILE, PUBLIC_STATE } from './fixtures';

const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? 'https://vayqlprmwtvwqfxdfygl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.E2E_SUPABASE_SERVICE_KEY ?? '';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://staging.pledgeoff.com';
const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e-test@pledgeoff.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'E2eTest!2026Pl3dge';

setup('authenticate test user', async ({ page }) => {
  if (!SUPABASE_SERVICE_KEY) throw new Error('E2E_SUPABASE_SERVICE_KEY is required');

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Create or reset the test user via admin API
  let testUserId: string | undefined;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  testUserId = created?.user?.id;
  if (createErr) {
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = users.find((u) => u.email === TEST_EMAIL);
    if (existing) {
      testUserId = existing.id;
      await admin.auth.admin.updateUserById(existing.id, {
        password: TEST_PASSWORD,
        email_confirm: true,
      });
    }
  }

  // Delete ideas from previous runs: the free plan allows 1 validation/month,
  // so the golden-path submit only passes on a clean slate (FKs cascade).
  if (testUserId) {
    const { error: deleteErr } = await admin.from('ideas').delete().eq('user_id', testUserId);
    if (deleteErr) throw new Error(`Failed to clean up e2e ideas: ${deleteErr.message}`);
  }

  // Staging can sit behind Vercel Authentication. A share URL (or the
  // automation-bypass headers from playwright.config.ts) sets the bypass
  // cookie on this context; PUBLIC_STATE hands that cookie to logged-out
  // specs without giving them an app session.
  const shareUrl = process.env.E2E_VERCEL_SHARE_URL;
  if (shareUrl) {
    await page.goto(shareUrl);
    await page.waitForLoadState('domcontentloaded');
  }

  // Dismiss the cookie-consent banner once so it can't intercept clicks in
  // any spec; the consent choice persists via storage state.
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('domcontentloaded');
  const acceptCookies = page.getByRole('button', { name: /accept all/i });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click();
  }
  await page.context().storageState({ path: PUBLIC_STATE });

  // Sign in via the UI login form (avoids magic-link redirect URL restrictions)
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 20_000 });
  await expect(page).toHaveURL(/dashboard/);

  await page.context().storageState({ path: AUTH_FILE });
  if (!fs.existsSync(AUTH_FILE)) throw new Error('Auth state was not saved.');
});
