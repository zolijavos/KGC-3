import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Story 35-1: RBAC Dashboard Layout Engine
 * Tests role-based layout rendering, widget lazy loading, and layout switching
 */

test.describe('Dashboard - Role-Based Layouts', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard page
    await page.goto('/dashboard');
  });

  test('OPERATOR role renders Scanner Focus layout', async ({ page }) => {
    // Mock auth to return OPERATOR role
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-operator',
          name: 'Test Operator',
          role: 'OPERATOR',
        }),
      });
    });

    await page.reload();

    // Wait for dashboard to load
    await page.waitForSelector('[data-layout="scanner-focus"]');

    // Verify scanner focus layout is rendered
    const layout = page.locator('[data-layout="scanner-focus"]');
    await expect(layout).toBeVisible();

    // Verify single column layout (max-w-2xl class)
    await expect(layout.locator('.grid-cols-1')).toBeVisible();

    // Verify role-appropriate widgets are rendered
    await expect(page.locator('text=Üdvözöljük')).toBeVisible();
  });

  test('STORE_MANAGER role renders Dashboard First layout', async ({ page }) => {
    // Mock auth to return STORE_MANAGER role
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-store-manager',
          name: 'Test Store Manager',
          role: 'STORE_MANAGER',
        }),
      });
    });

    await page.reload();

    // Wait for dashboard to load
    await page.waitForSelector('[data-layout="dashboard-first"]');

    // Verify dashboard first layout is rendered
    const layout = page.locator('[data-layout="dashboard-first"]');
    await expect(layout).toBeVisible();

    // Verify responsive grid layout (md:grid-cols-2 lg:grid-cols-3)
    await expect(layout.locator('.md\\:grid-cols-2')).toBeVisible();
    await expect(layout.locator('.lg\\:grid-cols-3')).toBeVisible();

    // Verify role-appropriate widgets are rendered
    await expect(page.locator('text=Üdvözöljük')).toBeVisible();
  });

  test('ADMIN role renders Dashboard First layout', async ({ page }) => {
    // Mock auth to return ADMIN role
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-admin',
          name: 'Test Admin',
          role: 'ADMIN',
        }),
      });
    });

    await page.reload();

    // Wait for dashboard to load
    await page.waitForSelector('[data-layout="dashboard-first"]');

    // Verify dashboard first layout is rendered
    const layout = page.locator('[data-layout="dashboard-first"]');
    await expect(layout).toBeVisible();

    // Verify ADMIN sees all widgets (including admin-only widgets if any)
    await expect(page.locator('text=Üdvözöljük')).toBeVisible();
  });

  test('Widget lazy loading shows skeleton then content', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Initially, skeleton loaders should be visible
    const skeletons = page.locator('[class*="animate-pulse"]');
    await expect(skeletons.first()).toBeVisible();

    // Wait for widgets to lazy load
    await page.waitForSelector('text=Üdvözöljük', { timeout: 5000 });

    // After loading, skeletons should be replaced with actual widgets
    await expect(page.locator('text=Üdvözöljük')).toBeVisible();
  });

  test('Layout switches when user role changes', async ({ page }) => {
    // Start with OPERATOR role
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user',
          name: 'Test User',
          role: 'OPERATOR',
        }),
      });
    });

    await page.reload();
    await page.waitForSelector('[data-layout="scanner-focus"]');

    // Verify scanner focus layout
    await expect(page.locator('[data-layout="scanner-focus"]')).toBeVisible();

    // Simulate role change to STORE_MANAGER
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user',
          name: 'Test User',
          role: 'STORE_MANAGER',
        }),
      });
    });

    // Trigger re-authentication (e.g., page reload or manual refresh)
    await page.reload();
    await page.waitForSelector('[data-layout="dashboard-first"]');

    // Verify dashboard first layout
    await expect(page.locator('[data-layout="dashboard-first"]')).toBeVisible();

    // Scanner focus layout should no longer be visible
    await expect(page.locator('[data-layout="scanner-focus"]')).not.toBeVisible();
  });

  test('Dashboard shows loading state when authentication is pending', async ({ page }) => {
    // Simulate slow auth response
    await page.route('**/api/auth/me', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user',
          name: 'Test User',
          role: 'OPERATOR',
        }),
      });
    });

    await page.goto('/dashboard');

    // Verify loading state is shown
    await expect(page.locator('text=Betöltés')).toBeVisible();

    // Wait for dashboard to load
    await page.waitForSelector('[data-layout="scanner-focus"]', { timeout: 5000 });

    // Verify loading state is no longer visible
    await expect(page.locator('text=Betöltés')).not.toBeVisible();
  });
});
