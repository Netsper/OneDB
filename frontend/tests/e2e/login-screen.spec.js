import { test, expect } from '@playwright/test';

test('renders login screen with core controls', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/OneDB/i);
  await expect(page.getByTestId('login-brand')).toContainText('OneDB');
  await expect(page.getByTestId('saved-servers-title')).toBeVisible();
  await expect(page.getByTestId('login-host-input')).toBeVisible();
  await expect(page.getByTestId('login-user-input')).toBeVisible();
  await expect(page.getByTestId('login-pass-input')).toBeVisible();
  await expect(page.getByTestId('connect-button')).toBeVisible();
});
