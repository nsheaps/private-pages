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

  test('shows login wizard with URL param config', async ({ page }) => {
    await page.goto('/?repo=org/repo&client_id=Iv1.test');
    await expect(
      page.getByText("Choose how you'd like to connect to your repository."),
    ).toBeVisible({ timeout: 10000 });
  });

  test('login wizard shows available methods', async ({ page }) => {
    await page.goto('/?repo=org/repo&client_id=Iv1.test');
    await expect(
      page.getByTestId('wizard-choose-method'),
    ).toBeVisible({ timeout: 10000 });
    // PAT and Direct URL are always available
    await expect(page.getByTestId('wizard-option-pat-input')).toBeVisible();
    await expect(page.getByTestId('wizard-option-direct-url')).toBeVisible();
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
