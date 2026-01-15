import { test, expect } from '@playwright/test';

/**
 * P0 - Kritikus: Authentikáció tesztek
 *
 * Tesztelt flow-k:
 * - Bejelentkezés érvényes credentials-szel
 * - Hibás jelszó kezelése
 * - Session timeout
 * - Jogosultság ellenőrzés
 */

test.describe('Authentikáció', () => {
  test.describe('Bejelentkezés', () => {
    test('sikeres bejelentkezés érvényes adatokkal', async ({ page }) => {
      await page.goto('/auth/login');

      await page.getByLabel('Email').fill('admin@kgc-test.hu');
      await page.getByLabel('Jelszó').fill('TestAdmin123!');
      await page.getByRole('button', { name: 'Bejelentkezés' }).click();

      await expect(page).toHaveURL('/dashboard');
      await expect(page.getByRole('heading', { name: 'Vezérlőpult' })).toBeVisible();
    });

    test('hibás jelszó esetén hibaüzenet jelenik meg', async ({ page }) => {
      await page.goto('/auth/login');

      await page.getByLabel('Email').fill('admin@kgc-test.hu');
      await page.getByLabel('Jelszó').fill('rossz_jelszo');
      await page.getByRole('button', { name: 'Bejelentkezés' }).click();

      await expect(page.getByText('Hibás email vagy jelszó')).toBeVisible();
      await expect(page).toHaveURL('/auth/login');
    });

    test('nem létező email esetén hibaüzenet jelenik meg', async ({ page }) => {
      await page.goto('/auth/login');

      await page.getByLabel('Email').fill('nemletezik@kgc-test.hu');
      await page.getByLabel('Jelszó').fill('barmilyen123');
      await page.getByRole('button', { name: 'Bejelentkezés' }).click();

      await expect(page.getByText('Hibás email vagy jelszó')).toBeVisible();
    });
  });

  test.describe('Jogosultság', () => {
    test('admin hozzáfér az admin felülethez', async ({ page }) => {
      // Használjuk az előre mentett admin session-t
      await page.goto('/admin/users');
      await expect(page).toHaveURL('/admin/users');
      await expect(page.getByRole('heading', { name: 'Felhasználók' })).toBeVisible();
    });

    test('eladó nem fér hozzá az admin felülethez', async ({ page }) => {
      // Login as sales user
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill('elado@kgc-test.hu');
      await page.getByLabel('Jelszó').fill('TestSales123!');
      await page.getByRole('button', { name: 'Bejelentkezés' }).click();

      // Próbáljon admin oldalra navigálni
      await page.goto('/admin/users');

      // Átirányítás vagy 403-as hibaoldal
      await expect(page).not.toHaveURL('/admin/users');
    });
  });

  test.describe('Kijelentkezés', () => {
    test('sikeres kijelentkezés', async ({ page }) => {
      // Bejelentkezés
      await page.goto('/auth/login');
      await page.getByLabel('Email').fill('admin@kgc-test.hu');
      await page.getByLabel('Jelszó').fill('TestAdmin123!');
      await page.getByRole('button', { name: 'Bejelentkezés' }).click();
      await expect(page).toHaveURL('/dashboard');

      // Kijelentkezés
      await page.getByRole('button', { name: 'Profil' }).click();
      await page.getByRole('menuitem', { name: 'Kijelentkezés' }).click();

      // Ellenőrzés
      await expect(page).toHaveURL('/auth/login');
    });
  });
});
