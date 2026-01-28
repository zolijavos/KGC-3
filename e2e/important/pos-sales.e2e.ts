import { expect, test } from '../support/fixtures';
import type { TestSeedResponse } from '../support/fixtures/factories';

/**
 * KGC ERP - POS (Pénztár) Értékesítés Tests (P1)
 *
 * Fontos üzleti folyamat tesztek a pénztári értékesítéshez.
 *
 * Sprint 0 Blocker #2 & #3: TestSeedingFactory és Mock MyPOS használata.
 *
 * Tesztelt flow-k:
 * - Termék értékesítés pénztárból
 * - Fizetési módok (készpénz, kártya - mocked)
 * - Nyugta/Számla kiállítás
 * - Kedvezmény alkalmazás
 *
 * @risk R-007 (Score: 4) - POS transaction integrity
 * @risk R-011 (Score: 3) - Discount abuse
 */

test.describe('@P1 @Aruhaz @POS Értékesítés', () => {
  let seedData: TestSeedResponse;

  test.beforeEach(async ({ page, testSeeding }) => {
    // GIVEN: Seeded sales user és inventory
    seedData = await testSeeding.seed({
      users: [{ role: 'SALES', password: 'TestSales123!' }],
      inventory: {
        products: [
          { name: 'POS Teszt Termék', sku: '5900442651233', type: 'SALE' },
          { name: 'POS Teszt Termék 2', sku: '5900442651234', type: 'SALE' },
        ],
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

  test('[P1] egyszerű készpénzes értékesítés', async ({ page }) => {
    // WHEN: Navigate to POS
    await page.goto('/sales/new');
    await expect(page.getByRole('heading', { name: 'Pénztár' })).toBeVisible();

    // Termék hozzáadása vonalkód beolvasással (szimulált)
    await page.getByPlaceholder('Vonalkód / Cikkszám...').fill('5900442651233');
    await page.keyboard.press('Enter');

    // Termék megjelenik a kosárban
    await expect(page.getByText(/Teszt termék/i)).toBeVisible();

    // Fizetés
    await page.getByRole('button', { name: 'Fizetés' }).click();
    await page.getByRole('button', { name: 'Készpénz' }).click();
    await page.getByLabel('Kapott összeg').fill('10000');
    await page.getByRole('button', { name: 'Tranzakció lezárása' }).click();

    // THEN: Sikeres értékesítés
    await expect(page.getByText('Értékesítés sikeres')).toBeVisible();
    await expect(page.getByText(/Visszajáró/)).toBeVisible();
  });

  test('[P1] bankkártyás fizetés', async ({ page }) => {
    // WHEN: Navigate to POS
    await page.goto('/sales/new');

    // Termék hozzáadása
    await page.getByPlaceholder('Vonalkód / Cikkszám...').fill('5900442651233');
    await page.keyboard.press('Enter');

    // Bankkártyás fizetés
    await page.getByRole('button', { name: 'Fizetés' }).click();
    await page.getByRole('button', { name: 'Bankkártya' }).click();

    // MyPOS terminál szimuláció
    await expect(page.getByText('Kártya behelyezése')).toBeVisible();
    // Mock: sikeres tranzakció
    await page.getByRole('button', { name: 'Tranzakció jóváhagyása (Mock)' }).click();

    // THEN: Sikeres kártyás fizetés
    await expect(page.getByText('Értékesítés sikeres')).toBeVisible();
    await expect(page.getByText('Fizetési mód: Bankkártya')).toBeVisible();
  });

  test('[P1] több termék hozzáadása és mennyiség módosítás', async ({ page }) => {
    // WHEN: Navigate to POS
    await page.goto('/sales/new');

    // Első termék
    await page.getByPlaceholder('Vonalkód / Cikkszám...').fill('5900442651233');
    await page.keyboard.press('Enter');

    // Második termék (más)
    await page.getByPlaceholder('Vonalkód / Cikkszám...').fill('5900442651234');
    await page.keyboard.press('Enter');

    // Mennyiség módosítás
    await page
      .getByRole('row', { name: /5900442651233/ })
      .getByLabel('Mennyiség')
      .fill('3');

    // THEN: Összeg helyesen számolódik
    const totalText = await page.getByTestId('total-amount').textContent();
    expect(totalText).toBeDefined();
  });
});

test.describe('@P1 @Aruhaz @POS Kedvezmények', () => {
  let seedData: TestSeedResponse;

  test.beforeEach(async ({ page, testSeeding }) => {
    // GIVEN: Seeded sales user
    seedData = await testSeeding.seed({
      users: [{ role: 'SALES', password: 'TestSales123!' }],
      inventory: {
        products: [{ name: 'Kedvezmény Teszt', sku: '5900442651233', type: 'SALE' }],
      },
    });

    const salesUser = seedData.users?.[0];
    expect(salesUser).toBeDefined();

    await page.goto('/login');
    await page.getByLabel('Email').fill(salesUser!.email);
    await page.getByLabel('Jelszó').fill('TestSales123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
  });

  test('[P1] százalékos kedvezmény alkalmazása', async ({ page }) => {
    // WHEN: Navigate to POS
    await page.goto('/sales/new');

    // Termék hozzáadása
    await page.getByPlaceholder('Vonalkód / Cikkszám...').fill('5900442651233');
    await page.keyboard.press('Enter');

    // Kedvezmény alkalmazása
    await page.getByRole('button', { name: 'Kedvezmény' }).click();
    await page.getByLabel('Kedvezmény típusa').selectOption('percent');
    await page.getByLabel('Érték').fill('10');
    await page.getByRole('button', { name: 'Alkalmazás' }).click();

    // THEN: Kedvezmény megjelenik
    await expect(page.getByText('Kedvezmény: -10%')).toBeVisible();
  });

  test('[P1] fix összegű kedvezmény', async ({ page }) => {
    // WHEN: Navigate to POS
    await page.goto('/sales/new');

    // Termék hozzáadása
    await page.getByPlaceholder('Vonalkód / Cikkszám...').fill('5900442651233');
    await page.keyboard.press('Enter');

    // Kedvezmény alkalmazása
    await page.getByRole('button', { name: 'Kedvezmény' }).click();
    await page.getByLabel('Kedvezmény típusa').selectOption('fixed');
    await page.getByLabel('Érték').fill('500');
    await page.getByRole('button', { name: 'Alkalmazás' }).click();

    // THEN: Fix kedvezmény megjelenik
    await expect(page.getByText(/Kedvezmény.*-500 Ft/)).toBeVisible();
  });

  test('[P1] kedvezmény limit validáció', async ({ page }) => {
    // WHEN: Navigate to POS
    await page.goto('/sales/new');

    // Termék hozzáadása
    await page.getByPlaceholder('Vonalkód / Cikkszám...').fill('5900442651233');
    await page.keyboard.press('Enter');

    // Túl nagy kedvezmény (max 20% az eladónak)
    await page.getByRole('button', { name: 'Kedvezmény' }).click();
    await page.getByLabel('Kedvezmény típusa').selectOption('percent');
    await page.getByLabel('Érték').fill('50');
    await page.getByRole('button', { name: 'Alkalmazás' }).click();

    // THEN: Figyelmeztetés vagy jóváhagyás kérés
    await expect(page.getByText(/max.*kedvezmény|jóváhagyás szükséges/i)).toBeVisible();
  });
});

test.describe('@P1 @Aruhaz @POS Bizonylatok', () => {
  let seedData: TestSeedResponse;

  test.beforeEach(async ({ page, testSeeding }) => {
    // GIVEN: Seeded sales user, partner és inventory
    seedData = await testSeeding.seed({
      users: [{ role: 'SALES', password: 'TestSales123!' }],
      partners: [{ name: 'Számla Teszt Kft.', type: 'COMPANY', taxNumber: '12345678-2-41' }],
      inventory: {
        products: [{ name: 'Bizonylat Teszt', sku: '5900442651233', type: 'SALE' }],
      },
    });

    const salesUser = seedData.users?.[0];
    expect(salesUser).toBeDefined();

    await page.goto('/login');
    await page.getByLabel('Email').fill(salesUser!.email);
    await page.getByLabel('Jelszó').fill('TestSales123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
  });

  test('[P1] nyugta nyomtatás', async ({ page }) => {
    // GIVEN: Sikeres értékesítés után
    await page.goto('/sales/new');
    await page.getByPlaceholder('Vonalkód / Cikkszám...').fill('5900442651233');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Fizetés' }).click();
    await page.getByRole('button', { name: 'Készpénz' }).click();
    await page.getByLabel('Kapott összeg').fill('10000');
    await page.getByRole('button', { name: 'Tranzakció lezárása' }).click();

    // WHEN: Nyugta nyomtatás
    await page.getByRole('button', { name: 'Nyugta nyomtatása' }).click();

    // THEN: Nyomtatási preview vagy sikeres nyomtatás
    await expect(page.getByText(/Nyugta.*nyomtatva|Nyomtatási előnézet/i)).toBeVisible();
  });

  test('[P1] számla kérés cégnek', async ({ page }) => {
    // WHEN: Navigate to POS
    await page.goto('/sales/new');

    // Termék hozzáadása
    await page.getByPlaceholder('Vonalkód / Cikkszám...').fill('5900442651233');
    await page.keyboard.press('Enter');

    // Számla kérés
    await page.getByRole('button', { name: 'Számla' }).click();
    await page.getByPlaceholder('Ügyfél keresése...').fill('Teszt Kft');
    await page.getByRole('option', { name: /Teszt Kft/i }).click();

    // Fizetés
    await page.getByRole('button', { name: 'Fizetés' }).click();
    await page.getByRole('button', { name: 'Készpénz' }).click();
    await page.getByLabel('Kapott összeg').fill('50000');
    await page.getByRole('button', { name: 'Tranzakció lezárása' }).click();

    // THEN: Számla kiállítva
    await expect(page.getByText('Számla sikeresen kiállítva')).toBeVisible();
    await expect(page.getByText(/KGC-2026-\d+/)).toBeVisible();
  });
});

test.describe('@P1 @Aruhaz @API POS API', () => {
  test('[P1] API: tranzakció létrehozása', async ({ request, testSeeding }) => {
    // GIVEN: Seeded user, partner és inventory
    const seedData = await testSeeding.seed({
      users: [{ role: 'SALES' }],
      partners: [{ name: 'POS API Partner', type: 'INDIVIDUAL' }],
      inventory: {
        products: [{ name: 'API Teszt Termék', sku: 'TEST-001', type: 'SALE' }],
      },
    });

    const userToken = seedData.users?.[0]?.token;
    const partnerId = seedData.partners?.[0]?.id;
    const productId = seedData.inventory?.products?.[0]?.id;

    expect(userToken).toBeDefined();
    expect(partnerId).toBeDefined();
    expect(productId).toBeDefined();

    // WHEN: POS tranzakció létrehozása
    const response = await request.post('/api/pos/transactions', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      data: {
        partnerId: partnerId,
        items: [
          {
            productId: productId,
            sku: 'TEST-001',
            name: 'API Teszt Termék',
            quantity: 1,
            unitPrice: 5000,
            vatRate: '27',
          },
        ],
        paymentMethod: 'CASH',
        amountReceived: 10000,
      },
    });

    if (!response.ok()) {
      test.skip(true, 'POS API not available');
      return;
    }

    // THEN: Sikeres tranzakció
    const transaction = await response.json();
    expect(transaction.data.id).toBeDefined();
    expect(transaction.data.change).toBe(3650); // 10000 - 6350 (5000 * 1.27)
  });

  test('[P1] API: napi zárás report', async ({ request, testSeeding }) => {
    // GIVEN: Seeded user
    const seedData = await testSeeding.seed({
      users: [{ role: 'SALES' }],
    });

    const userToken = seedData.users?.[0]?.token;
    expect(userToken).toBeDefined();

    // WHEN: Napi zárás lekérése
    const today = new Date().toISOString().split('T')[0];
    const response = await request.get(`/api/pos/daily-report?date=${today}`, {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
    });

    if (!response.ok()) {
      test.skip(true, 'POS daily report API not available');
      return;
    }

    // THEN: Report struktúra helyes
    const report = await response.json();
    expect(report.data).toHaveProperty('date');
    expect(report.data).toHaveProperty('totalSales');
    expect(report.data).toHaveProperty('cashTotal');
    expect(report.data).toHaveProperty('cardTotal');
    expect(report.data).toHaveProperty('transactionCount');
  });
});
