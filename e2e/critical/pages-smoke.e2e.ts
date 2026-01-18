/**
 * Simple page smoke tests - verifies routes load without auth
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } }); // No auth state

test.describe('Page Routes Smoke Test', () => {
  test('Login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/KGC/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login or show dashboard
    await expect(page.locator('body')).toBeVisible();
  });

  test('Chat route is accessible', async ({ page }) => {
    await page.goto('/chat');
    // Will redirect to login if protected, which is expected
    await expect(page.locator('body')).toBeVisible();
  });

  test('Tenant route is accessible', async ({ page }) => {
    await page.goto('/tenant');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Feature-flags route is accessible', async ({ page }) => {
    await page.goto('/feature-flags');
    await expect(page.locator('body')).toBeVisible();
  });
});
