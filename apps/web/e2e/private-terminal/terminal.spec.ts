import { test, expect } from '@playwright/test';

// These tests exercise real app HTTP boundaries with a local Auth contract fixture.
// They do not replace validation against a separately provisioned Supabase dev project.
test('anonymous users see only login; legacy and financial routes are inaccessible', async ({ page, request }) => {
  for (const path of ['/terminal/overview', '/terminal/portfolio', '/profile/bashui', '/v/example', '/ideas/new', '/auth/callback']) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()['location']).toContain('/login');
    expect(await response.text()).not.toContain('24,982');
  }
  for (const path of ['/api/health', '/api/v1/ideas', '/api/v1/public/last-validated', '/api/v1/webhooks/stripe', '/api/v1/cron/process-outbox']) {
    expect((await request.get(path)).status()).toBe(401);
  }
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByRole('link', { name: /sign up|register/i })).toHaveCount(0);
  await page.screenshot({ path: '/tmp/pledgeoff-login-desktop.png', fullPage: true, caret: 'initial' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/pledgeoff-login-mobile.png', fullPage: true, caret: 'initial' });
});

test('private login, all demo sections, HttpOnly session, retirement and logout', async ({ page, context }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('bashui');
  await page.getByLabel('Password').fill(process.env.E2E_PRIVATE_TEST_PASSWORD!);
  const loginResponse = page.waitForResponse((r) => r.url().endsWith('/api/terminal/login'));
  await page.getByRole('button', { name: 'Enter workspace' }).click();
  expect((await loginResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/terminal\/overview$/, { timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page.getByText('All balances, prices and activity are simulated.', { exact: false })).toBeVisible();
  const cookies = (await context.cookies()).filter((c) => c.name.startsWith('sb-'));
  expect(cookies.length).toBeGreaterThan(0);
  expect(cookies.every((c) => c.httpOnly && c.sameSite === 'Lax')).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain('sb-');
  await page.screenshot({ path: '/tmp/pledgeoff-overview-desktop.png', fullPage: true, caret: 'initial' });
  for (const section of ['Markets', 'Strategies', 'Activity', 'Portfolio', 'History', 'Settings', 'Overview']) {
    await page.getByRole('navigation', { name: 'Workspace' }).getByRole('link', { name: section, exact: section !== 'Activity' }).click();
    await expect(page.getByRole('heading', { name: section, exact: true })).toBeVisible();
  }
  expect((await context.request.get('/api/v1/ideas')).status()).toBe(410);
  expect((await context.request.get('/profile/bashui')).status()).toBe(410);
  const csrf = await context.request.post('/api/terminal/logout', { headers: { origin: 'https://attacker.test' } });
  expect(csrf.status()).toBe(403);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/pledgeoff-overview-mobile.png', fullPage: true, caret: 'initial' });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/terminal/portfolio');
  await expect(page).toHaveURL(/\/login$/);
  expect((await context.cookies()).filter((c) => c.name.startsWith('sb-'))).toHaveLength(0);
});
