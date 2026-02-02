/**
 * Smoke tests for newly added pages
 * - Chat
 * - Tenant Admin
 * - Feature Flags
 */
import { expect, test } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_DIR = path.join(__dirname, '../.auth');

test.describe('New Pages Smoke Tests', () => {
  // Use stored admin auth state
  test.use({ storageState: path.join(STORAGE_STATE_DIR, 'admin.json') });

  test('Chat page loads correctly', async ({ page }) => {
    await page.goto('/chat');

    // Check page title
    await expect(page.locator('h1')).toContainText('Chat');

    // Check sidebar with chat list exists (w-80 class)
    await expect(page.locator('.w-80').first()).toBeVisible();

    // Check message input exists
    await expect(page.locator('input[placeholder="Írj üzenetet..."]')).toBeVisible();
  });

  test('Tenant Admin page loads correctly', async ({ page }) => {
    await page.goto('/tenant');

    // Check page has loaded (URL is correct)
    await expect(page).toHaveURL('/tenant');

    // Check heading exists
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Check form elements exist
    await expect(page.locator('input').first()).toBeVisible({ timeout: 10000 });
  });

  test('Feature Flags page loads correctly', async ({ page }) => {
    await page.goto('/feature-flags');

    // Check page title
    await expect(page.locator('h1')).toContainText('Feature Flags');

    // Check search input exists
    await expect(
      page.locator('input[type="search"], input[placeholder*="Keresés"]').first()
    ).toBeVisible();

    // Check some content loaded
    await expect(page.locator('button').first()).toBeVisible();
  });

  test('Direct navigation to all new pages works', async ({ page }) => {
    // Test direct navigation to all new pages
    await page.goto('/chat');
    await expect(page).toHaveURL('/chat');
    await expect(page.locator('h1')).toContainText('Chat');

    await page.goto('/tenant');
    await expect(page).toHaveURL('/tenant');

    await page.goto('/feature-flags');
    await expect(page).toHaveURL('/feature-flags');
    await expect(page.locator('h1')).toContainText('Feature Flags');
  });
});
