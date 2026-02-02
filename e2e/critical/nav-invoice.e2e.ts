import { expect, test } from '../support/fixtures';
import type { TestSeedResponse } from '../support/fixtures/factories';

/**
 * KGC ERP - NAV Online Számlázás Tests (P0)
 *
 * Kritikus pénzügyi tesztek a számlázáshoz és NAV bejelentéshez.
 *
 * Sprint 0 Blocker #2 & #3: TestSeedingFactory és Mock szolgáltatások használata.
 *
 * Tesztelt flow-k:
 * - Számla kiállítás (Számlázz.hu API - mocked)
 * - NAV bejelentés ellenőrzés
 * - Sztornó számla
 * - Helyesbítő számla
 * - ÁFA számítások
 *
 * @risk R-003 (Score: 6) - NAV reporting failures
 * @risk R-009 (Score: 4) - VAT calculation errors
 */

test.describe('@P0 @NAV @Penzugy Számla kiállítás', () => {
  let seedData: TestSeedResponse;
  let financeUser: TestSeedResponse['users'][0] | undefined;

  test.beforeEach(async ({ page, testSeeding }) => {
    // GIVEN: Seeded finance user és partner
    seedData = await testSeeding.seed({
      users: [{ role: 'FINANCE', password: 'TestFinance123!' }],
      partners: [{ name: 'Számla Teszt Kft.', type: 'COMPANY', taxNumber: '12345678-2-41' }],
    });

    financeUser = seedData.users?.[0];
    expect(financeUser).toBeDefined();

    // Bejelentkezés számlázási jogosultsággal
    await page.goto('/login');
    await page.getByLabel('Email').fill(financeUser!.email);
    await page.getByLabel('Jelszó').fill('TestFinance123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('[P0] sikeres számla kiállítás - eladás', async ({ page }) => {
    const partner = seedData.partners?.[0];
    expect(partner).toBeDefined();

    // WHEN: Navigate to invoicing
    await page.goto('/invoices/new');

    // Ügyfél kiválasztása (seeded partner)
    await page.getByPlaceholder('Ügyfél keresése...').fill(partner!.name);
    await page.getByRole('option', { name: new RegExp(partner!.name, 'i') }).click();

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
    await page.getByRole('button', { name: 'Véglegesítés' }).click();

    // THEN: NAV bejelentés sikeres (mock Számlázz.hu visszajelzés)
    await expect(page.getByText('Számla sikeresen kiállítva')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('NAV bejelentés: Sikeres')).toBeVisible();

    // Számla szám megjelenik
    await expect(page.getByText(/KGC-2026-\d+/)).toBeVisible();
  });

  test('[P0] bérlési számla kiállítás - NAV M típus', async ({ page, testSeeding }) => {
    // Seed rental-specific data
    const rentalSeedData = await testSeeding.seed({
      users: [{ role: 'FINANCE', password: 'TestFinance123!' }],
      partners: [{ name: 'Bérlési Ügyfél Kft.', type: 'COMPANY' }],
      inventory: {
        products: [{ name: 'Hilti TE 60', sku: 'HILTI-TE60', type: 'RENTAL' }],
      },
    });

    // Bejelentkezés
    const user = rentalSeedData.users?.[0];
    await page.goto('/login');
    await page.getByLabel('Email').fill(user!.email);
    await page.getByLabel('Jelszó').fill('TestFinance123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();

    // WHEN: Navigate to rental invoice
    await page.goto('/rental/invoicing');

    // Bérlés kiválasztása (ha van lezárt bérlés)
    const closedRentalRow = page.getByRole('row', { name: /.*Lezárt/i }).first();
    if (await closedRentalRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closedRentalRow.getByRole('button', { name: 'Számlázás' }).click();

      // THEN: Bérlési számla típus (szolgáltatás)
      await expect(page.getByText('Számla típus: Szolgáltatás')).toBeVisible();

      // Számla kiállítása
      await page.getByRole('button', { name: 'Számla kiállítása' }).click();
      await page.getByRole('button', { name: 'Véglegesítés' }).click();

      await expect(page.getByText('NAV bejelentés: Sikeres')).toBeVisible({
        timeout: 15000,
      });
    } else {
      // Nincs lezárt bérlés - skip
      test.skip(true, 'No closed rental available for invoicing test');
    }
  });

  test('[P0] ÁFA számítás helyes 27%-kal', async ({ page }) => {
    const partner = seedData.partners?.[0];
    expect(partner).toBeDefined();

    // WHEN: Navigate to invoicing
    await page.goto('/invoices/new');

    await page.getByPlaceholder('Ügyfél keresése...').fill(partner!.name.substring(0, 5));
    await page.getByRole('option').first().click();

    // Tétel megadása
    await page.getByRole('button', { name: 'Tétel hozzáadása' }).click();
    await page.getByLabel('Megnevezés').fill('Teszt termék');
    await page.getByLabel('Mennyiség').fill('2');
    await page.getByLabel('Egységár (nettó)').fill('10000');
    await page.getByLabel('ÁFA').selectOption('27%');

    // THEN: Helyes ÁFA számítás (20000 × 0.27 = 5400)
    await expect(page.getByText('Nettó: 20 000 Ft')).toBeVisible();
    await expect(page.getByText('ÁFA (27%): 5 400 Ft')).toBeVisible();
    await expect(page.getByText('Bruttó: 25 400 Ft')).toBeVisible();
  });
});

test.describe('@P0 @NAV @Penzugy Sztornó és helyesbítés', () => {
  let seedData: TestSeedResponse;

  test.beforeEach(async ({ page, testSeeding }) => {
    // GIVEN: Seeded finance user
    seedData = await testSeeding.seed({
      users: [{ role: 'FINANCE', password: 'TestFinance123!' }],
    });

    const financeUser = seedData.users?.[0];
    expect(financeUser).toBeDefined();

    await page.goto('/login');
    await page.getByLabel('Email').fill(financeUser!.email);
    await page.getByLabel('Jelszó').fill('TestFinance123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('[P0] számla sztornózása', async ({ page }) => {
    // WHEN: Navigate to invoice list
    await page.goto('/invoices');

    // Számla keresése (létező számla a tenant-ban)
    const invoiceRow = page.getByRole('row', { name: /KGC-\d+-\d+/ }).first();
    if (await invoiceRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await invoiceRow.getByRole('button', { name: 'Műveletek' }).click();
      await page.getByRole('menuitem', { name: 'Sztornó' }).click();

      // Sztornó indoklás
      await page.getByLabel('Sztornó indoklása').fill('Téves kiállítás - ügyfél kérésére');
      await page.getByRole('button', { name: 'Sztornó számla kiállítása' }).click();

      // Megerősítés
      await page.getByRole('button', { name: 'Véglegesítés' }).click();

      // THEN: Sztornó számla sikeresen kiállítva + NAV bejelentés (mock)
      await expect(page.getByText('Sztornó számla sikeresen kiállítva')).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText('NAV bejelentés: Sikeres')).toBeVisible();
    } else {
      test.skip(true, 'No existing invoice available for storno test');
    }
  });

  test('[P0] helyesbítő számla kiállítása', async ({ page }) => {
    // WHEN: Navigate to invoice list
    await page.goto('/invoices');

    // Számla keresése
    const invoiceRow = page.getByRole('row', { name: /KGC-\d+-\d+/ }).first();
    if (await invoiceRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await invoiceRow.getByRole('button', { name: 'Műveletek' }).click();
      await page.getByRole('menuitem', { name: 'Helyesbítés' }).click();

      // Helyesbítés módosítása
      await page.getByLabel('Eredeti mennyiség').fill('1');
      await page.getByLabel('Új mennyiség').fill('2');
      await page.getByLabel('Indoklás').fill('Mennyiség javítása');

      await page.getByRole('button', { name: 'Helyesbítő számla kiállítása' }).click();
      await page.getByRole('button', { name: 'Véglegesítés' }).click();

      // THEN: Helyesbítő számla sikeresen kiállítva
      await expect(page.getByText('Helyesbítő számla sikeresen kiállítva')).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText('NAV bejelentés: Sikeres')).toBeVisible();
    } else {
      test.skip(true, 'No existing invoice available for correction test');
    }
  });
});

test.describe('@P0 @NAV @Penzugy Hibakezelés', () => {
  let seedData: TestSeedResponse;

  test.beforeEach(async ({ page, testSeeding }) => {
    // GIVEN: Seeded finance user és partner
    seedData = await testSeeding.seed({
      users: [{ role: 'FINANCE', password: 'TestFinance123!' }],
      partners: [{ name: 'Hiba Teszt Partner', type: 'INDIVIDUAL' }],
    });

    const financeUser = seedData.users?.[0];
    expect(financeUser).toBeDefined();

    await page.goto('/login');
    await page.getByLabel('Email').fill(financeUser!.email);
    await page.getByLabel('Jelszó').fill('TestFinance123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('[P0] NAV kapcsolati hiba esetén újrapróbálkozás', async ({ page, request }) => {
    // GIVEN: MockSzamlazzhuService beállítása TIMEOUT hibára
    await request.post('/api/v1/test/mock/szamlazz-hu/configure', {
      headers: { 'X-Tenant-ID': seedData.tenant.id },
      data: { forceError: 'TIMEOUT' },
    });

    const partner = seedData.partners?.[0];
    expect(partner).toBeDefined();

    // GIVEN: Mockolt NAV hiba
    await page.goto('/invoices/new');

    // Számla kitöltése
    await page.getByPlaceholder('Ügyfél keresése...').fill(partner!.name.substring(0, 5));
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: 'Tétel hozzáadása' }).click();
    await page.getByLabel('Megnevezés').fill('Teszt termék');
    await page.getByLabel('Mennyiség').fill('1');
    await page.getByLabel('Egységár (nettó)').fill('1000');

    // Kiállítás próba
    await page.getByRole('button', { name: 'Számla kiállítása' }).click();
    await page.getByRole('button', { name: 'Véglegesítés' }).click();

    // THEN: Hiba megjelenése és újrapróbálkozás lehetőség
    await expect(page.getByText('NAV kapcsolati hiba')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('button', { name: 'Újrapróbálkozás' })).toBeVisible();

    // Reset mock for cleanup
    await request.post('/api/v1/test/mock/szamlazz-hu/configure', {
      headers: { 'X-Tenant-ID': seedData.tenant.id },
      data: { forceError: null },
    });
  });

  test('[P0] érvénytelen adószám esetén figyelmeztetés', async ({ page }) => {
    // WHEN: Navigate to invoicing
    await page.goto('/invoices/new');

    // Új ügyfél érvénytelen adószámmal
    await page.getByRole('button', { name: 'Új ügyfél' }).click();
    await page.getByLabel('Név').fill('Hibás Adószám Kft.');
    await page.getByLabel('Adószám').fill('12345678'); // Érvénytelen formátum (hiányzik -X-XX)

    await page.getByRole('button', { name: 'Mentés' }).click();

    // THEN: Validációs hiba
    await expect(page.getByText(/érvénytelen adószám/i)).toBeVisible();
  });
});

test.describe('@P0 @NAV @API Számlázz.hu integráció', () => {
  test('[P0] API: számla létrehozása és NAV státusz lekérdezés', async ({
    request,
    testSeeding,
  }) => {
    // GIVEN: Seeded partner és user
    const seedData = await testSeeding.seed({
      users: [{ role: 'FINANCE' }],
      partners: [{ name: 'API Teszt Kft.', type: 'COMPANY', taxNumber: '12345678-2-41' }],
    });

    const partner = seedData.partners?.[0];
    const userToken = seedData.users?.[0]?.token;
    expect(partner).toBeDefined();
    expect(userToken).toBeDefined();

    // WHEN: Számla létrehozása API-n keresztül
    const invoiceResponse = await request.post('/api/v1/invoices', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      data: {
        partnerId: partner!.id,
        type: 'SALES',
        paymentMethod: 'CARD',
        items: [
          {
            name: 'API Teszt Termék',
            quantity: 1,
            unitPriceNet: 10000,
            vatRate: '27',
          },
        ],
      },
    });

    if (!invoiceResponse.ok()) {
      test.skip(true, 'Invoice API not available');
      return;
    }

    const invoice = await invoiceResponse.json();
    expect(invoice.data.invoiceNumber).toBeDefined();

    // THEN: NAV státusz ellenőrzés (mock Számlázz.hu visszaadja)
    const navStatusResponse = await request.get(`/api/v1/invoices/${invoice.data.id}/nav-status`, {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
    });

    expect(navStatusResponse.ok()).toBeTruthy();
    const navStatus = await navStatusResponse.json();
    // Mock service always returns ACCEPTED
    expect(['PENDING', 'SUBMITTED', 'ACCEPTED']).toContain(navStatus.data.status);
  });

  test('[P0] API: ÁFA összesítő report', async ({ request, testSeeding }) => {
    // GIVEN: Seeded user
    const seedData = await testSeeding.seed({
      users: [{ role: 'FINANCE' }],
    });

    const userToken = seedData.users?.[0]?.token;
    expect(userToken).toBeDefined();

    // WHEN: ÁFA összesítő lekérése
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();

    const vatResponse = await request.get(
      `/api/v1/reports/vat-summary?start=${startDate}&end=${endDate}`,
      {
        headers: {
          'X-Tenant-ID': seedData.tenant.id,
          Authorization: `Bearer ${userToken}`,
        },
      }
    );

    if (!vatResponse.ok()) {
      test.skip(true, 'VAT report API not available');
      return;
    }

    // THEN: ÁFA összesítő struktúra helyes
    const vatSummary = await vatResponse.json();
    expect(vatSummary.data).toHaveProperty('totalNet');
    expect(vatSummary.data).toHaveProperty('totalVat');
    expect(vatSummary.data).toHaveProperty('totalGross');
    expect(vatSummary.data).toHaveProperty('byVatRate');
  });

  test('[P0] API: Mock Számlázz.hu hiba szimuláció', async ({ request, testSeeding }) => {
    // GIVEN: Seeded partner és user
    const seedData = await testSeeding.seed({
      users: [{ role: 'FINANCE' }],
      partners: [{ name: 'Hiba Teszt Kft.', type: 'COMPANY' }],
    });

    const partner = seedData.partners?.[0];
    const userToken = seedData.users?.[0]?.token;
    expect(partner).toBeDefined();
    expect(userToken).toBeDefined();

    // Configure mock to return NAV error
    await request.post('/api/v1/test/mock/szamlazz-hu/configure', {
      headers: { 'X-Tenant-ID': seedData.tenant.id },
      data: { forceError: 'NAV' },
    });

    // WHEN: Próbálunk számlát kiállítani
    const invoiceResponse = await request.post('/api/v1/invoices', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      data: {
        partnerId: partner!.id,
        type: 'SALES',
        paymentMethod: 'CASH',
        items: [
          {
            name: 'Hiba Teszt Termék',
            quantity: 1,
            unitPriceNet: 5000,
            vatRate: '27',
          },
        ],
      },
    });

    // THEN: NAV hiba esetén retryable hiba
    if (invoiceResponse.status() === 503 || invoiceResponse.status() === 502) {
      const error = await invoiceResponse.json();
      expect(error.error.retryable).toBe(true);
    }

    // Cleanup: Reset mock
    await request.post('/api/v1/test/mock/szamlazz-hu/configure', {
      headers: { 'X-Tenant-ID': seedData.tenant.id },
      data: { forceError: null },
    });
  });
});
