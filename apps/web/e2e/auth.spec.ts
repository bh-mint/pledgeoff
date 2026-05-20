import { test, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures';

test.describe('Auth — unauthenticated redirects', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('redirects /ideas to /login', async ({ page }) => {
    await page.goto('/ideas/new');
    await expect(page).toHaveURL(/login/);
  });

  test('login page renders email + password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });
});

test.describe('Auth — authenticated user', () => {
  test.use({ storageState: AUTH_FILE });

  test('authenticated user lands on dashboard after login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
    // No redirect to login
    await expect(page).not.toHaveURL(/login/);
  });

  test('authenticated user can access /ideas/new', async ({ page }) => {
    await page.goto('/ideas/new');
    await expect(page).not.toHaveURL(/login/);
  });
});
