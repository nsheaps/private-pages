import { test, expect } from '@playwright/test';

test.describe('Private Pages App', () => {
  test('shows loading screen on initial load', async ({ page }) => {
    await page.goto('/');
    // Should show loading state while config is being fetched
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('shows config error when no config is available', async ({ page }) => {
    await page.goto('/');
    // Wait for config fetch to fail (no config.json served by dev server)
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Configuration Error')).toBeVisible();
  });

  test('shows login screen with URL param config', async ({ page }) => {
    await page.goto('/?repo=org/repo&client_id=Iv1.test');
    await expect(
      page.getByText('Sign in with GitHub to view private repository content.'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('login button is present', async ({ page }) => {
    await page.goto('/?repo=org/repo&client_id=Iv1.test');
    await expect(
      page.getByRole('button', { name: 'Sign in with GitHub' }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('retry button on config error reloads config', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Configuration Error')).toBeVisible({
      timeout: 10000,
    });
    const retryButton = page.getByRole('button', { name: 'Try again' });
    await expect(retryButton).toBeVisible();
    await retryButton.click();
    // Should show loading state again briefly
    await expect(page.locator('[role="status"], [role="alert"]')).toBeVisible();
  });
});
