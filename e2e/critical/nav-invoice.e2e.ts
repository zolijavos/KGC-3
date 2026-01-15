import { test, expect } from '@playwright/test';

/**
 * P0 - Kritikus: NAV Online Számlázás
 *
 * Tesztelt flow-k:
 * - Számla kiállítás (Számlázz.hu API)
 * - NAV bejelentés ellenőrzés
 * - Sztornó számla
 * - Helyesbítő számla
 */

test.describe('NAV Online Számlázás', () => {
  test.beforeEach(async ({ page }) => {
    // Bejelentkezés számlázási jogosultsággal
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill('penzugy@kgc-test.hu');
    await page.getByLabel('Jelszó').fill('TestFinance123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test.describe('Számla kiállítás', () => {
    test('sikeres számla kiállítás - eladás', async ({ page }) => {
      // Navigate to invoicing
      await page.goto('/penzugy/szamla/uj');

      // Ügyfél kiválasztása
      await page.getByPlaceholder('Ügyfél keresése...').fill('Teszt Kft');
      await page.getByRole('option', { name: /Teszt Kft/i }).click();

      // Tétel hozzáadása
      await page.getByRole('button', { name: 'Tétel hozzáadása' }).click();
      await page.getByLabel('Megnevezés').fill('Fűnyíró - Makita PLM4110');
      await page.getByLabel('Mennyiség').fill('1');
      await page.getByLabel('Egységár (nettó)').fill('89000');
      await page.getByLabel('ÁFA').selectOption('27%');

      // Összegzés ellenőrzése
      await expect(page.getByText('Nettó: 89 000 Ft')).toBeVisible();
      await expect(page.getByText('ÁFA (27%): 24 030 Ft')).toBeVisible();
      await expect(page.getByText('Bruttó: 113 030 Ft')).toBeVisible();

      // Fizetési mód
      await page.getByLabel('Fizetési mód').selectOption('Bankkártya');

      // Számla kiállítása
      await page.getByRole('button', { name: 'Számla kiállítása' }).click();

      // Megerősítő dialog
      await page.getByRole('button', { name: 'Véglegesítés' }).click();

      // NAV bejelentés ellenőrzése
      await expect(page.getByText('Számla sikeresen kiállítva')).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('NAV bejelentés: Sikeres')).toBeVisible();

      // Számla szám megjelenik
      await expect(page.getByText(/KGC-2026-\d+/)).toBeVisible();
    });

    test('bérlési számla kiállítás - NAV M típus', async ({ page }) => {
      // Navigate to rental invoice
      await page.goto('/berles/szamlazas');

      // Bérlés kiválasztása
      await page.getByRole('row', { name: /Teszt.*Lezárt/i }).first().getByRole('button', { name: 'Számlázás' }).click();

      // Bérlési számla típus ellenőrzése
      await expect(page.getByText('Számla típus: Szolgáltatás')).toBeVisible();

      // Számla kiállítása
      await page.getByRole('button', { name: 'Számla kiállítása' }).click();
      await page.getByRole('button', { name: 'Véglegesítés' }).click();

      await expect(page.getByText('NAV bejelentés: Sikeres')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Sztornó és helyesbítés', () => {
    test('számla sztornózása', async ({ page }) => {
      // Navigate to invoice list
      await page.goto('/penzugy/szamlak');

      // Számla keresése
      await page.getByPlaceholder('Számla keresése...').fill('KGC-2026-');
      await page.getByRole('row', { name: /KGC-2026-\d+/ }).first().getByRole('button', { name: 'Műveletek' }).click();
      await page.getByRole('menuitem', { name: 'Sztornó' }).click();

      // Sztornó indoklás
      await page.getByLabel('Sztornó indoklása').fill('Téves kiállítás - ügyfél kérésére');
      await page.getByRole('button', { name: 'Sztornó számla kiállítása' }).click();

      // Megerősítés
      await page.getByRole('button', { name: 'Véglegesítés' }).click();

      await expect(page.getByText('Sztornó számla sikeresen kiállítva')).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('NAV bejelentés: Sikeres')).toBeVisible();
    });
  });

  test.describe('Hibakezelés', () => {
    test('NAV kapcsolati hiba esetén újrapróbálkozás', async ({ page }) => {
      // Ez a teszt mockolt NAV hibát szimulál
      await page.goto('/penzugy/szamla/uj?_mock_nav_error=timeout');

      // Számla kitöltése (gyors)
      await page.getByPlaceholder('Ügyfél keresése...').fill('Teszt');
      await page.getByRole('option').first().click();
      await page.getByRole('button', { name: 'Tétel hozzáadása' }).click();
      await page.getByLabel('Megnevezés').fill('Teszt termék');
      await page.getByLabel('Mennyiség').fill('1');
      await page.getByLabel('Egységár (nettó)').fill('1000');

      // Kiállítás próba
      await page.getByRole('button', { name: 'Számla kiállítása' }).click();
      await page.getByRole('button', { name: 'Véglegesítés' }).click();

      // Hiba megjelenése
      await expect(page.getByText('NAV kapcsolati hiba')).toBeVisible({ timeout: 20000 });

      // Újrapróbálkozás gomb
      await expect(page.getByRole('button', { name: 'Újrapróbálkozás' })).toBeVisible();
    });
  });
});
