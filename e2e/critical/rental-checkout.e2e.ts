import { test, expect } from '@playwright/test';

/**
 * P0 - Kritikus: Bérlés Checkout Flow
 *
 * Tesztelt flow-k:
 * - Teljes bérlési checkout folyamat
 * - Kaució kezelés (MyPOS)
 * - Szerződés generálás
 * - Készlet foglalás
 */

test.describe('Bérlés Checkout', () => {
  test.beforeEach(async ({ page }) => {
    // Bejelentkezés eladóként
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill('elado@kgc-test.hu');
    await page.getByLabel('Jelszó').fill('TestSales123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test.describe('Checkout Wizard', () => {
    test('teljes bérlési folyamat - új ügyfél', async ({ page }) => {
      // 1. Navigate to rental
      await page.goto('/berles/uj');
      await expect(page.getByRole('heading', { name: 'Új bérlés' })).toBeVisible();

      // 2. Ügyfél kiválasztása / létrehozása
      await page.getByRole('button', { name: 'Új ügyfél' }).click();
      await page.getByLabel('Név').fill('Teszt Béla');
      await page.getByLabel('Telefon').fill('+36301234567');
      await page.getByLabel('Email').fill('teszt.bela@example.com');
      await page.getByLabel('Személyi igazolvány').fill('123456AB');
      await page.getByRole('button', { name: 'Mentés' }).click();

      // Várakozás az ügyfél létrehozására
      await expect(page.getByText('Teszt Béla')).toBeVisible();

      // 3. Termék kiválasztása
      await page.getByRole('button', { name: 'Tovább' }).click();
      await page.getByPlaceholder('Termék keresése...').fill('fúrógép');
      await page.getByRole('row', { name: /Makita.*fúrógép/i }).getByRole('button', { name: 'Hozzáadás' }).click();

      // 4. Bérlési időszak
      await page.getByRole('button', { name: 'Tovább' }).click();
      await page.getByLabel('Kezdő dátum').fill('2026-01-20');
      await page.getByLabel('Befejező dátum').fill('2026-01-22');

      // 5. Kaució (MyPOS mock)
      await page.getByRole('button', { name: 'Tovább' }).click();
      await expect(page.getByText('Kaució összege')).toBeVisible();
      await page.getByRole('button', { name: 'Kaució foglalás' }).click();

      // Mock MyPOS response
      await expect(page.getByText('Kaució sikeresen lefoglalva')).toBeVisible({ timeout: 10000 });

      // 6. Összegzés és véglegesítés
      await page.getByRole('button', { name: 'Tovább' }).click();
      await expect(page.getByText('Bérlés összegzése')).toBeVisible();
      await expect(page.getByText('Teszt Béla')).toBeVisible();
      await expect(page.getByText(/fúrógép/i)).toBeVisible();

      // Szerződés elfogadása
      await page.getByLabel('Elfogadom a bérlési feltételeket').check();
      await page.getByRole('button', { name: 'Bérlés véglegesítése' }).click();

      // 7. Sikeres befejezés
      await expect(page.getByText('Bérlés sikeresen létrehozva')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Szerződés nyomtatása' })).toBeVisible();
    });

    test('készlethiány esetén figyelmeztetés', async ({ page }) => {
      await page.goto('/berles/uj');

      // Ügyfél kiválasztása (meglévő)
      await page.getByPlaceholder('Ügyfél keresése...').fill('Teszt');
      await page.getByRole('option', { name: /Teszt/i }).first().click();

      // Termék kiválasztása - nincs készleten
      await page.getByRole('button', { name: 'Tovább' }).click();
      await page.getByPlaceholder('Termék keresése...').fill('ritka-gep');

      // Ellenőrzés, hogy a "Nincs készleten" felirat megjelenik
      await expect(page.getByText('Nincs készleten')).toBeVisible();
    });
  });

  test.describe('Kaució kezelés', () => {
    test('kaució visszatérítés sikeres visszahozásnál', async ({ page }) => {
      // Navigate to active rental
      await page.goto('/berles/aktiv');

      // Select a rental to return
      await page.getByRole('row', { name: /Teszt.*fúrógép/i }).getByRole('button', { name: 'Visszavétel' }).click();

      // Check equipment condition
      await page.getByLabel('Állapot ellenőrzés').check();
      await page.getByLabel('Sérülésmentes').check();

      // Process deposit return
      await page.getByRole('button', { name: 'Kaució visszatérítés' }).click();

      await expect(page.getByText('Kaució visszatérítés sikeres')).toBeVisible({ timeout: 10000 });
    });
  });
});
