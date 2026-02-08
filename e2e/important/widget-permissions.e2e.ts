import { expect, test } from '@playwright/test';

/**
 * Widget Permissions E2E Tests (Story 45-1)
 *
 * Tests for admin widget permission management functionality.
 *
 * Prerequisites:
 * - User must be logged in as ADMIN
 * - Dashboard module must be running
 */

test.describe('Widget Permissions Admin (Story 45-1)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to widget permissions page
    // TODO: Add proper auth when integrated
    await page.goto('/settings/dashboard/permissions');
  });

  test.describe('AC1 & AC3: Permission Matrix Display', () => {
    test('should display widget permission matrix on page load', async ({ page }) => {
      // Wait for page to load
      await page.waitForSelector('h1:has-text("Dashboard Widget Jogosultságok")');

      // Check for table headers
      await expect(page.locator('th:has-text("Widget")')).toBeVisible();
      await expect(page.locator('th:has-text("Operátor")')).toBeVisible();
      await expect(page.locator('th:has-text("Boltvezető")')).toBeVisible();
      await expect(page.locator('th:has-text("Admin")')).toBeVisible();
    });

    test('should display widgets grouped by category', async ({ page }) => {
      // Check for category headers
      await expect(page.locator('text=Pénzügy')).toBeVisible();
      await expect(page.locator('text=Készlet')).toBeVisible();
      await expect(page.locator('text=Szerviz')).toBeVisible();
      await expect(page.locator('text=Partner')).toBeVisible();
    });

    test('should display widget names in each category', async ({ page }) => {
      // Check for specific widgets
      await expect(page.locator('text=Bevétel KPI')).toBeVisible();
      await expect(page.locator('text=Készlet összesítő')).toBeVisible();
      await expect(page.locator('text=Munkalap összesítő')).toBeVisible();
    });

    test('should have disabled Admin checkboxes (always checked)', async ({ page }) => {
      // All Admin checkboxes should be checked and disabled
      const adminCheckboxes = page.locator('[aria-label*="Admin (mindig aktív)"]');
      const count = await adminCheckboxes.count();
      expect(count).toBeGreaterThan(0);

      // Check first Admin checkbox is disabled
      await expect(adminCheckboxes.first()).toBeDisabled();
      await expect(adminCheckboxes.first()).toBeChecked();
    });
  });

  test.describe('AC4: Permission Modification', () => {
    test('should enable Save button when checkbox is toggled', async ({ page }) => {
      // Save button should be disabled initially
      const saveButton = page.locator('button:has-text("Mentés")');
      await expect(saveButton).toBeDisabled();

      // Click on an OPERATOR checkbox (first editable one)
      const operatorCheckbox = page.locator('[aria-label*="Operátor"]').first();
      await operatorCheckbox.click();

      // Save button should now be enabled
      await expect(saveButton).toBeEnabled();
    });

    test('should show pending change indicator on toggled checkbox', async ({ page }) => {
      // Toggle a checkbox
      const operatorCheckbox = page.locator('[aria-label*="Operátor"]').first();
      await operatorCheckbox.click();

      // Checkbox should have visual indicator (ring class)
      await expect(operatorCheckbox).toHaveClass(/ring-2/);
    });

    test('should show pending changes count', async ({ page }) => {
      // Toggle two checkboxes
      const operatorCheckboxes = page.locator('[aria-label*="Operátor"]');
      await operatorCheckboxes.nth(0).click();
      await operatorCheckboxes.nth(1).click();

      // Should show count
      await expect(page.locator('text=2 módosítás mentésre vár')).toBeVisible();
    });

    test('should cancel pending changes with Cancel button', async ({ page }) => {
      // Toggle a checkbox
      const operatorCheckbox = page.locator('[aria-label*="Operátor"]').first();
      const initialState = await operatorCheckbox.isChecked();
      await operatorCheckbox.click();

      // Click Cancel
      await page.click('button:has-text("Mégse")');

      // Checkbox should return to initial state
      const finalState = await operatorCheckbox.isChecked();
      expect(finalState).toBe(initialState);
    });

    test('should save permissions and show success message', async ({ page }) => {
      // Toggle a checkbox
      await page.locator('[aria-label*="Operátor"]').first().click();

      // Click Save
      await page.click('button:has-text("Mentés")');

      // Should show success message
      await expect(page.locator('text=sikeresen mentve')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('AC2: Reset to Defaults', () => {
    test('should show confirmation dialog on Reset click', async ({ page }) => {
      // Mock the confirm dialog
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('visszaállítod');
        await dialog.dismiss();
      });

      // Click Reset button
      await page.click('button:has-text("Visszaállítás alapértelmezettre")');
    });

    test('should reset permissions when confirmed', async ({ page }) => {
      // Mock the confirm dialog to accept
      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      // Click Reset button
      await page.click('button:has-text("Visszaállítás alapértelmezettre")');

      // Should show success message
      await expect(page.locator('text=visszaállítva')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should show error state on API failure', async ({ page }) => {
      // Intercept API and return error
      await page.route('**/dashboard/permissions/admin', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      // Reload page
      await page.reload();

      // Should show error message
      await expect(page.locator('text=Hiba történt')).toBeVisible({ timeout: 5000 });
    });

    test('should have retry button on error', async ({ page }) => {
      // Intercept API and return error
      await page.route('**/dashboard/permissions/admin', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      // Reload page
      await page.reload();

      // Should have retry button
      await expect(page.locator('button:has-text("Újrapróbálás")')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper aria labels on checkboxes', async ({ page }) => {
      // Check that checkboxes have aria-labels
      const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]');
      const count = await checkboxes.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const ariaLabel = await checkboxes.nth(i).getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Tab to first interactive element
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should focus on a checkbox or button
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
    });
  });
});

test.describe('AC5: Dashboard Widget Visibility', () => {
  test('should load permissions from API on Dashboard page', async ({ page }) => {
    // Intercept permission API
    let apiCalled = false;
    await page.route('**/dashboard/permissions/role/*', route => {
      apiCalled = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            widgets: ['welcome-card', 'stock-summary', 'notification-panel'],
          },
        }),
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');

    // API should have been called
    expect(apiCalled).toBe(true);
  });
});

test.describe('AC6: Fallback on API Failure', () => {
  test('should use fallback permissions when API fails', async ({ page }) => {
    // Intercept permission API to fail
    await page.route('**/dashboard/permissions/role/*', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'API Error' }),
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Dashboard should still load (using fallback)
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
  });
});
