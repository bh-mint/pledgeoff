import { test, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures';

test.use({ storageState: AUTH_FILE });

test.describe('Dashboard', () => {
  test('shows ideas table or empty state', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
    // Either shows ideas or the onboarding empty state — both are valid
    const hasIdeas = await page.getByRole('table').isVisible().catch(() => false);
    const hasEmpty = await page
      .getByText(/no cases on file|no idea|run your first survey/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasIdeas || hasEmpty).toBe(true);
  });

  test('new idea button is visible and clickable', async ({ page }) => {
    await page.goto('/dashboard');
    const btn = page
      .getByRole('link', { name: /run your first survey|signal verdict|new idea/i })
      .first();
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page).toHaveURL(/ideas/);
  });

  test('settings link is accessible', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).not.toHaveURL(/login/);
    // Settings renders no semantic heading — assert the settings shell instead
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('navigation', { name: /settings/i })).toBeVisible();
  });
});
