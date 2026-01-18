/**
 * Smoke tests for newly added pages
 * - Chat
 * - Tenant Admin
 * - Feature Flags
 */
import { test, expect } from '@playwright/test';

test.describe('New Pages Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login first (mock for now since we use mock data)
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@kgc.hu');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('Chat page loads correctly', async ({ page }) => {
    await page.goto('/chat');

    // Check page title
    await expect(page.locator('h1')).toContainText('Chat');

    // Check sidebar with contacts exists
    await expect(page.locator('[class*="contacts"], [class*="chat-list"]').first()).toBeVisible();

    // Check main chat area exists
    await expect(page.locator('[class*="chat"], [class*="message"]').first()).toBeVisible();
  });

  test('Tenant Admin page loads correctly', async ({ page }) => {
    await page.goto('/tenant');

    // Check page title
    await expect(page.locator('h1')).toContainText('Tenant');

    // Check tabs exist
    await expect(page.locator('text=Cég adatok').or(page.locator('text=Alapadatok'))).toBeVisible();

    // Check form elements exist
    await expect(page.locator('input').first()).toBeVisible();
  });

  test('Feature Flags page loads correctly', async ({ page }) => {
    await page.goto('/feature-flags');

    // Check page title
    await expect(page.locator('h1')).toContainText('Feature Flags');

    // Check stats cards exist
    await expect(page.locator('text=Összes flag').or(page.locator('text=összes'))).toBeVisible();

    // Check search input exists
    await expect(page.locator('input[type="search"]')).toBeVisible();

    // Check toggle buttons exist
    await expect(page.locator('button[class*="rounded-full"]').first()).toBeVisible();
  });

  test('Navigation to new pages from sidebar', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to Chat via sidebar
    await page.click('text=Chat');
    await expect(page).toHaveURL('/chat');

    // Navigate back and to Feature Flags via Admin menu
    await page.goto('/dashboard');
    // Open Admin menu if collapsed
    const adminMenu = page.locator('text=Admin').or(page.locator('text=Adminisztráció'));
    if (await adminMenu.isVisible()) {
      await adminMenu.click();
    }
    await page.click('text=Feature Flags');
    await expect(page).toHaveURL('/feature-flags');
  });
});
