import { test, expect } from '@playwright/test';
import { PUBLIC_STATE } from './fixtures';

// Public pages — no auth required
test.use({ storageState: PUBLIC_STATE });

test.describe('Public pages', () => {
  test('homepage loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/PledgeOFF/i);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('pricing page loads with plan cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveURL(/pricing/);
    await expect(page.getByText(/founder/i).first()).toBeVisible();
  });

  test('blog page loads with articles', async ({ page }) => {
    await page.goto('/blog');
    await expect(page).toHaveURL(/blog/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('guest idea box saves the draft and routes through login', async ({ page }) => {
    await page.goto('/');
    const box = page.getByPlaceholder(/describe your product idea/i);
    await box.fill('A guest-drafted SaaS idea for tracking equipment maintenance schedules');
    // The box renders a button (the other Validate free CTAs are links)
    await page.getByRole('button', { name: /validate free/i }).click();

    // Logged-out visitor: middleware preserves the destination
    await page.waitForURL(/\/login\?.*next=%2Fideas%2Fnew/, { timeout: 10_000 });
    const draft = await page.evaluate(() => localStorage.getItem('po_guest_idea_draft'));
    expect(draft).toContain('guest-drafted SaaS idea');
  });

  test('/api/health returns ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
  });
});
