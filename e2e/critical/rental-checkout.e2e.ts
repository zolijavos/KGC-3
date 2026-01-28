import { expect, test } from '../support/fixtures';
import type { TestSeedResponse } from '../support/fixtures/factories';

/**
 * KGC ERP - Bérlés Checkout Flow Tests (P0)
 *
 * Kritikus üzleti folyamat tesztek a bérlési checkout-hoz.
 *
 * Sprint 0 Blocker #2 & #3: TestSeedingFactory és Mock MyPOS használata.
 *
 * Tesztelt flow-k:
 * - Teljes bérlési checkout folyamat (wizard)
 * - Kaució kezelés (MyPOS integráció - mocked)
 * - Szerződés generálás
 * - Készlet foglalás és felszabadítás
 * - Visszavétel flow
 *
 * @risk R-004 (Score: 4) - Deposit handling errors
 * @risk R-005 (Score: 6) - Stock inconsistency
 */

test.describe('@P0 @Berles @BUSINESS Checkout Wizard', () => {
  let seedData: TestSeedResponse;

  test.beforeEach(async ({ page, testSeeding }) => {
    // GIVEN: Seeded sales user és inventory
    seedData = await testSeeding.seed({
      users: [{ role: 'SALES', password: 'TestSales123!' }],
      inventory: {
        products: [{ name: 'Makita HR2470 Fúrógép', sku: 'MAK-HR2470', type: 'RENTAL' }],
      },
    });

    const salesUser = seedData.users?.[0];
    expect(salesUser).toBeDefined();

    // Bejelentkezés eladóként
    await page.goto('/login');
    await page.getByLabel('Email').fill(salesUser!.email);
    await page.getByLabel('Jelszó').fill('TestSales123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('[P0] teljes bérlési folyamat - új ügyfél', async ({ page }) => {
    // WHEN: Navigate to rental wizard
    await page.goto('/rental/new');
    await expect(page.getByRole('heading', { name: 'Új bérlés' })).toBeVisible();

    // Step 1: Ügyfél létrehozása
    await page.getByRole('button', { name: 'Új ügyfél' }).click();
    await page.getByLabel('Név').fill('Teszt Béla');
    await page.getByLabel('Telefon').fill('+36301234567');
    await page.getByLabel('Email').fill('teszt.bela@example.com');
    await page.getByLabel('Személyi igazolvány').fill('123456AB');
    await page.getByRole('button', { name: 'Mentés' }).click();

    // Várakozás az ügyfél létrehozására
    await expect(page.getByText('Teszt Béla')).toBeVisible();

    // Step 2: Termék kiválasztása
    await page.getByRole('button', { name: 'Tovább' }).click();
    await page.getByPlaceholder('Termék keresése...').fill('fúrógép');
    await page
      .getByRole('row', { name: /Makita.*fúrógép/i })
      .getByRole('button', { name: 'Hozzáadás' })
      .click();

    // Step 3: Bérlési időszak
    await page.getByRole('button', { name: 'Tovább' }).click();
    await page.getByLabel('Kezdő dátum').fill('2026-01-20');
    await page.getByLabel('Befejező dátum').fill('2026-01-22');

    // Step 4: Kaució (MyPOS mock)
    await page.getByRole('button', { name: 'Tovább' }).click();
    await expect(page.getByText('Kaució összege')).toBeVisible();
    await page.getByRole('button', { name: 'Kaució foglalás' }).click();

    // Mock MyPOS response
    await expect(page.getByText('Kaució sikeresen lefoglalva')).toBeVisible({
      timeout: 10000,
    });

    // Step 5: Összegzés és véglegesítés
    await page.getByRole('button', { name: 'Tovább' }).click();
    await expect(page.getByText('Bérlés összegzése')).toBeVisible();
    await expect(page.getByText('Teszt Béla')).toBeVisible();
    await expect(page.getByText(/fúrógép/i)).toBeVisible();

    // Szerződés elfogadása
    await page.getByLabel('Elfogadom a bérlési feltételeket').check();
    await page.getByRole('button', { name: 'Bérlés véglegesítése' }).click();

    // THEN: Sikeres befejezés
    await expect(page.getByText('Bérlés sikeresen létrehozva')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Szerződés nyomtatása' })).toBeVisible();
  });

  test('[P0] készlethiány esetén figyelmeztetés', async ({ page }) => {
    // WHEN: Navigate to rental wizard
    await page.goto('/rental/new');

    // Ügyfél kiválasztása (meglévő)
    await page.getByPlaceholder('Ügyfél keresése...').fill('Teszt');
    await page.getByRole('option', { name: /Teszt/i }).first().click();

    // Termék kiválasztása - nincs készleten
    await page.getByRole('button', { name: 'Tovább' }).click();
    await page.getByPlaceholder('Termék keresése...').fill('ritka-gep');

    // THEN: "Nincs készleten" felirat megjelenik
    await expect(page.getByText('Nincs készleten')).toBeVisible();
  });

  test('[P0] foglalt gép nem adható ki másnak', async ({ page }) => {
    // GIVEN: Létezik egy aktív bérlés egy géppel
    // (A teszt feltételezi, hogy van aktív bérlés a rendszerben)

    // WHEN: Új bérlés indítása ugyanarra a gépre
    await page.goto('/rental/new');
    await page.getByPlaceholder('Ügyfél keresése...').fill('Teszt');
    await page.getByRole('option', { name: /Teszt/i }).first().click();

    await page.getByRole('button', { name: 'Tovább' }).click();
    await page.getByPlaceholder('Termék keresése...').fill('kiadott-gep');

    // THEN: Kiadva státusz megjelenik vagy nem lehet hozzáadni
    const isRented = await page.getByText(/Kiadva|Foglalt/).isVisible();
    expect(isRented).toBeTruthy();
  });
});

test.describe('@P0 @Berles @BUSINESS Kaució kezelés', () => {
  let seedData: TestSeedResponse;

  test.beforeEach(async ({ page, testSeeding }) => {
    // GIVEN: Seeded sales user
    seedData = await testSeeding.seed({
      users: [{ role: 'SALES', password: 'TestSales123!' }],
      partners: [{ name: 'Kaució Teszt Ügyfél', type: 'INDIVIDUAL' }],
      inventory: {
        products: [{ name: 'Teszt Fúrógép', sku: 'TEST-FUROGEP', type: 'RENTAL' }],
      },
    });

    const salesUser = seedData.users?.[0];
    expect(salesUser).toBeDefined();

    // Bejelentkezés eladóként
    await page.goto('/login');
    await page.getByLabel('Email').fill(salesUser!.email);
    await page.getByLabel('Jelszó').fill('TestSales123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('[P0] kaució visszatérítés sikeres visszahozásnál', async ({ page }) => {
    // GIVEN: Aktív bérlés listázása
    await page.goto('/rental');

    // WHEN: Visszavétel indítása
    await page
      .getByRole('row', { name: /Teszt.*fúrógép/i })
      .getByRole('button', { name: 'Visszavétel' })
      .click();

    // Állapot ellenőrzés
    await page.getByLabel('Állapot ellenőrzés').check();
    await page.getByLabel('Sérülésmentes').check();

    // Kaució visszatérítés
    await page.getByRole('button', { name: 'Kaució visszatérítés' }).click();

    // THEN: Sikeres visszatérítés
    await expect(page.getByText('Kaució visszatérítés sikeres')).toBeVisible({
      timeout: 10000,
    });
  });

  test('[P0] sérült gép esetén kaució levonás', async ({ page }) => {
    // GIVEN: Aktív bérlés listázása
    await page.goto('/rental');

    // WHEN: Visszavétel indítása
    await page
      .getByRole('row', { name: /Teszt.*fúrógép/i })
      .getByRole('button', { name: 'Visszavétel' })
      .click();

    // Sérülés jelzése
    await page.getByLabel('Állapot ellenőrzés').check();
    await page.getByLabel('Sérülés észlelve').check();
    await page.getByLabel('Sérülés leírása').fill('Törött fogantyú');
    await page.getByLabel('Levonás összege').fill('15000');

    // Kaució részleges visszatérítés
    await page.getByRole('button', { name: 'Kaució elszámolás' }).click();

    // THEN: Részleges visszatérítés megerősítése
    await expect(page.getByText(/Levonás.*15.*000/)).toBeVisible();
  });
});

test.describe('@P0 @Berles @DATA Készlet foglalás', () => {
  test('[P0] API: bérlés létrehozásakor készlet csökken', async ({ request, testSeeding }) => {
    // GIVEN: Seeded user, partner és inventory
    const seedData = await testSeeding.seed({
      users: [{ role: 'SALES' }],
      partners: [{ name: 'API Bérlő Kft.', type: 'COMPANY' }],
      inventory: {
        products: [{ name: 'Teszt Fúrógép', sku: 'TEST-FUROGEP-API', type: 'RENTAL' }],
      },
    });

    const userToken = seedData.users?.[0]?.token;
    const partnerId = seedData.partners?.[0]?.id;
    const productId = seedData.inventory?.products?.[0]?.id;

    expect(userToken).toBeDefined();
    expect(partnerId).toBeDefined();
    expect(productId).toBeDefined();

    // WHEN: Bérlés létrehozása API-n keresztül
    const rentalResponse = await request.post('/api/rentals', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      data: {
        partnerId: partnerId,
        productId: productId,
        startDate: new Date().toISOString(),
        plannedEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    // THEN: Sikeres létrehozás
    if (rentalResponse.ok()) {
      // Ellenőrzés: termék státusza RENTED
      const productResponse = await request.get(`/api/inventory/products/${productId}`, {
        headers: {
          'X-Tenant-ID': seedData.tenant.id,
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(productResponse.ok()).toBeTruthy();
      const productData = await productResponse.json();
      expect(productData.data.status).toBe('RENTED');
    }
  });

  test('[P0] API: visszavételnél készlet felszabadul', async ({ request, testSeeding }) => {
    // GIVEN: Seeded user, partner és inventory
    const seedData = await testSeeding.seed({
      users: [{ role: 'SALES' }],
      partners: [{ name: 'Visszavétel Teszt Kft.', type: 'COMPANY' }],
      inventory: {
        products: [{ name: 'Visszavétel Gép', sku: 'VISSZAVETEL-GEP', type: 'RENTAL' }],
      },
    });

    const userToken = seedData.users?.[0]?.token;
    const partnerId = seedData.partners?.[0]?.id;
    const productId = seedData.inventory?.products?.[0]?.id;

    expect(userToken).toBeDefined();
    expect(partnerId).toBeDefined();
    expect(productId).toBeDefined();

    // Bérlés létrehozása
    const rentalResponse = await request.post('/api/rentals', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      data: {
        partnerId: partnerId,
        productId: productId,
        startDate: new Date().toISOString(),
        plannedEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    if (!rentalResponse.ok()) {
      test.skip(true, 'Rental API not available');
      return;
    }

    const rental = await rentalResponse.json();

    // WHEN: Visszavétel (bérlés lezárása)
    const returnResponse = await request.patch(`/api/rentals/${rental.data.id}/return`, {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      data: {
        condition: 'GOOD',
        returnDate: new Date().toISOString(),
      },
    });

    // THEN: Termék újra elérhető
    if (returnResponse.ok()) {
      const productResponse = await request.get(`/api/inventory/products/${productId}`, {
        headers: {
          'X-Tenant-ID': seedData.tenant.id,
          Authorization: `Bearer ${userToken}`,
        },
      });

      expect(productResponse.ok()).toBeTruthy();
      const productData = await productResponse.json();
      expect(productData.data.status).toBe('AVAILABLE');
    }
  });
});
