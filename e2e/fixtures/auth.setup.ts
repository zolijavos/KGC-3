import { test as setup, expect } from '@playwright/test';
import path from 'path';

/**
 * KGC ERP - Auth Setup
 * Bejelentkezési állapot előkészítése a tesztekhez
 */

const STORAGE_STATE_DIR = path.join(__dirname, '../.auth');

// Admin felhasználó bejelentkeztetése
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/auth/login');

  // Login form kitöltése
  await page.getByLabel('Email').fill('admin@kgc-test.hu');
  await page.getByLabel('Jelszó').fill('TestAdmin123!');
  await page.getByRole('button', { name: 'Bejelentkezés' }).click();

  // Várakozás a sikeres bejelentkezésre
  await expect(page).toHaveURL('/dashboard');

  // Session mentése
  await page.context().storageState({
    path: path.join(STORAGE_STATE_DIR, 'admin.json'),
  });
});

// Boltvezető felhasználó bejelentkeztetése
setup('authenticate as store_manager', async ({ page }) => {
  await page.goto('/auth/login');

  await page.getByLabel('Email').fill('boltvezeto@kgc-test.hu');
  await page.getByLabel('Jelszó').fill('TestManager123!');
  await page.getByRole('button', { name: 'Bejelentkezés' }).click();

  await expect(page).toHaveURL('/dashboard');

  await page.context().storageState({
    path: path.join(STORAGE_STATE_DIR, 'store_manager.json'),
  });
});

// Eladó felhasználó bejelentkeztetése
setup('authenticate as sales', async ({ page }) => {
  await page.goto('/auth/login');

  await page.getByLabel('Email').fill('elado@kgc-test.hu');
  await page.getByLabel('Jelszó').fill('TestSales123!');
  await page.getByRole('button', { name: 'Bejelentkezés' }).click();

  await expect(page).toHaveURL('/dashboard');

  await page.context().storageState({
    path: path.join(STORAGE_STATE_DIR, 'sales.json'),
  });
});
