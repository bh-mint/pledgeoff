import { test, expect } from '@playwright/test';

// Public pages — no auth required
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Public pages', () => {
  test('homepage loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/PledgeOFF/i);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('pricing page loads with plan cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveURL(/pricing/);
    await expect(page.getByText(/pro/i).first()).toBeVisible();
  });

  test('blog page loads with articles', async ({ page }) => {
    await page.goto('/blog');
    await expect(page).toHaveURL(/blog/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('/api/health returns ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
  });
});
