import { expect, test } from '@playwright/test';

test('dashboard loads correctly', async ({ page }) => {
  await page.goto('http://localhost:3100');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Take screenshot
  await page.screenshot({ path: 'dashboard-screenshot.png', fullPage: true });

  // Check title
  await expect(page).toHaveTitle(/KGC-3 Dashboard/);

  // Check that main content loads
  const root = page.locator('#root');
  await expect(root).not.toBeEmpty();

  // Check for sidebar
  const sidebar = page.locator('aside');

  // Check for header with title
  const header = page.locator('header');
  await expect(header).toBeVisible();

  console.log('Dashboard loaded successfully!');
});
