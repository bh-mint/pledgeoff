import { test, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures';

test.use({ storageState: AUTH_FILE });

test.describe('Dashboard', () => {
  test('shows ideas table or empty state', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
    // Either shows ideas or the empty state — both are valid
    const hasIdeas = await page.getByRole('table').isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/no idea|start|validate/i).isVisible().catch(() => false);
    expect(hasIdeas || hasEmpty).toBe(true);
  });

  test('new idea button is visible and clickable', async ({ page }) => {
    await page.goto('/dashboard');
    const btn = page.getByRole('link', { name: /new idea|validate|add/i }).first();
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page).toHaveURL(/ideas/);
  });

  test('settings link is accessible', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByRole('heading')).toBeVisible();
  });
});
