import { expect, test as setup } from '@playwright/test';
import path from 'path';

/**
 * KGC ERP - Auth Setup
 * Bejelentkezési állapot előkészítése a tesztekhez
 */

// Setup tests need longer timeout (login can be slow)
setup.setTimeout(30000);

const STORAGE_STATE_DIR = path.join(__dirname, '../.auth');

// Admin felhasználó bejelentkeztetése
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');

  // Wait for form to be fully loaded and hydrated
  await page.waitForSelector('input[name="email"]', { state: 'visible' });
  await page.waitForTimeout(500); // Wait for React hydration

  // Login form kitöltése
  await page.getByLabel('E-mail cím').fill('admin@kgc.hu');
  await page.getByLabel('Jelszó').fill('admin123');

  // Click and wait for navigation
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 15000 }),
    page.getByRole('button', { name: 'Bejelentkezés' }).click(),
  ]);

  // Session mentése
  await page.context().storageState({
    path: path.join(STORAGE_STATE_DIR, 'admin.json'),
  });
});

// Boltvezető felhasználó bejelentkeztetése
setup('authenticate as store_manager', async ({ page }) => {
  await page.goto('/login');

  // Wait for form to be fully loaded and hydrated
  await page.waitForSelector('input[name="email"]', { state: 'visible' });
  await page.waitForTimeout(500); // Wait for React hydration

  await page.getByLabel('E-mail cím').fill('operator@kgc.hu');
  await page.getByLabel('Jelszó').fill('operator123');

  // Click and wait for navigation
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 15000 }),
    page.getByRole('button', { name: 'Bejelentkezés' }).click(),
  ]);

  await page.context().storageState({
    path: path.join(STORAGE_STATE_DIR, 'store_manager.json'),
  });
});

// Eladó felhasználó bejelentkeztetése
setup.skip('authenticate as sales', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('E-mail cím').fill('elado@kgc-test.hu');
  await page.getByLabel('Jelszó').fill('TestSales123!');
  await page.getByRole('button', { name: 'Bejelentkezés' }).click();

  await expect(page).toHaveURL('/dashboard');

  await page.context().storageState({
    path: path.join(STORAGE_STATE_DIR, 'sales.json'),
  });
});
