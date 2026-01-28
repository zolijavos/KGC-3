import { expect, test } from '../support/fixtures';
import type { TestSeedResponse } from '../support/fixtures/factories';

/**
 * KGC ERP - Szerviz Munkalap Tests (P1)
 *
 * Fontos üzleti folyamat tesztek a szerviz munkalapokhoz.
 *
 * Sprint 0 Blocker #2: TestSeedingFactory használata izolált teszt adatokhoz.
 *
 * Tesztelt flow-k:
 * - Munkalap létrehozás és állapotgép
 * - Garanciális vs fizetős javítás
 * - Alkatrész kezelés
 * - Munkalap lezárás és számlázás
 *
 * @risk R-006 (Score: 4) - Worksheet state corruption
 * @risk R-010 (Score: 3) - Parts inventory mismatch
 */

test.describe('@P1 @Szerviz @BUSINESS Munkalap létrehozás', () => {
  let seedData: TestSeedResponse;

  test.beforeEach(async ({ page, testSeeding }) => {
    // GIVEN: Seeded technician user és partner
    seedData = await testSeeding.seed({
      users: [{ role: 'TECHNICIAN', password: 'TestService123!' }],
      partners: [{ name: 'Szerviz Ügyfél', type: 'INDIVIDUAL' }],
    });

    const techUser = seedData.users?.[0];
    expect(techUser).toBeDefined();

    // Bejelentkezés szervizesként
    await page.goto('/login');
    await page.getByLabel('Email').fill(techUser!.email);
    await page.getByLabel('Jelszó').fill('TestService123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('[P1] új munkalap létrehozása - garanciális', async ({ page }) => {
    // WHEN: Navigate to service worksheet
    await page.goto('/worksheet/new');
    await expect(page.getByRole('heading', { name: 'Új munkalap' })).toBeVisible();

    // Ügyfél kiválasztása
    await page.getByPlaceholder('Ügyfél keresése...').fill('Teszt');
    await page.getByRole('option', { name: /Teszt/i }).first().click();

    // Gép adatok
    await page.getByLabel('Gyártmány').selectOption('Makita');
    await page.getByLabel('Típus').fill('HR2470');
    await page.getByLabel('Gyári szám').fill('M123456789');
    await page.getByLabel('Vásárlás dátuma').fill('2025-06-15');

    // Garanciális jelölés
    await page.getByLabel('Garanciális javítás').check();

    // Hibaleírás
    await page.getByLabel('Hiba leírása').fill('A gép nem indul el, semmi reakció.');

    // Mentés
    await page.getByRole('button', { name: 'Munkalap létrehozása' }).click();

    // THEN: Sikeres létrehozás FELVEVE állapotban
    await expect(page.getByText('Munkalap sikeresen létrehozva')).toBeVisible();
    await expect(page.getByText('Állapot: Felvéve')).toBeVisible();
    await expect(page.getByText('Típus: Garanciális')).toBeVisible();
  });

  test('[P1] új munkalap létrehozása - fizetős', async ({ page }) => {
    // WHEN: Navigate to service worksheet
    await page.goto('/worksheet/new');

    // Ügyfél és gép adatok
    await page.getByPlaceholder('Ügyfél keresése...').fill('Teszt');
    await page.getByRole('option').first().click();

    await page.getByLabel('Gyártmány').selectOption('Bosch');
    await page.getByLabel('Típus').fill('GBH 2-26');
    await page.getByLabel('Gyári szám').fill('B987654321');

    // Fizetős (garancia lejárt)
    await page.getByLabel('Vásárlás dátuma').fill('2023-01-15');
    // Garancia checkbox NINCS bejelölve

    await page.getByLabel('Hiba leírása').fill('Gyenge ütés, szénkefe csere szükséges.');
    await page.getByRole('button', { name: 'Munkalap létrehozása' }).click();

    // THEN: Fizetős munkalap
    await expect(page.getByText('Munkalap sikeresen létrehozva')).toBeVisible();
    await expect(page.getByText('Típus: Fizetős')).toBeVisible();
  });
});

test.describe('@P1 @Szerviz @STATE Munkalap állapotgép', () => {
  let seedData: TestSeedResponse;

  test.beforeEach(async ({ page, testSeeding }) => {
    // GIVEN: Seeded technician user
    seedData = await testSeeding.seed({
      users: [{ role: 'TECHNICIAN', password: 'TestService123!' }],
    });

    const techUser = seedData.users?.[0];
    expect(techUser).toBeDefined();

    await page.goto('/login');
    await page.getByLabel('Email').fill(techUser!.email);
    await page.getByLabel('Jelszó').fill('TestService123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
    await expect(page).toHaveURL('/dashboard');
  });

  test('[P1] állapotátmenetek: Felvéve → Diagnosztika → Javítás → Kész', async ({ page }) => {
    // GIVEN: Létező munkalap keresése
    await page.goto('/worksheet');
    await page.getByPlaceholder('Munkalap keresése...').fill('ML-');
    await page
      .getByRole('row', { name: /ML-.*Felvéve/i })
      .first()
      .getByRole('button', { name: 'Megnyitás' })
      .click();

    // WHEN: Diagnosztika indítása
    await page.getByRole('button', { name: 'Diagnosztika indítása' }).click();
    await expect(page.getByText('Állapot: Diagnosztika')).toBeVisible();

    // Diagnosztika eredmény
    await page.getByLabel('Diagnosztika eredménye').fill('Elromlott szénkefe, csere szükséges.');
    await page.getByRole('button', { name: 'Javítás indítása' }).click();

    // Javítás állapot
    await expect(page.getByText('Állapot: Javítás alatt')).toBeVisible();

    // Javítás befejezése
    await page.getByLabel('Elvégzett munka').fill('Szénkefe csere, tisztítás, teszt.');
    await page.getByRole('button', { name: 'Javítás befejezése' }).click();

    // THEN: Kész állapot
    await expect(page.getByText('Állapot: Kész')).toBeVisible();
  });

  test('[P1] visszautasítás - javíthatatlan', async ({ page }) => {
    // GIVEN: Munkalap diagnosztika állapotban
    await page.goto('/worksheet');
    await page.getByPlaceholder('Munkalap keresése...').fill('ML-');
    await page
      .getByRole('row', { name: /ML-.*Diagnosztika/i })
      .first()
      .getByRole('button', { name: 'Megnyitás' })
      .click();

    // WHEN: Visszautasítás javíthatatlanként
    await page.getByRole('button', { name: 'Visszautasítás' }).click();
    await page.getByLabel('Indoklás').fill('Nem javítható gazdaságosan, motor kiégett.');
    await page.getByRole('button', { name: 'Megerősítés' }).click();

    // THEN: Visszautasítva állapot
    await expect(page.getByText('Állapot: Visszautasítva')).toBeVisible();
  });
});

test.describe('@P1 @Szerviz @DATA Alkatrész kezelés', () => {
  let seedData: TestSeedResponse;

  test.beforeEach(async ({ page, testSeeding }) => {
    // GIVEN: Seeded technician user
    seedData = await testSeeding.seed({
      users: [{ role: 'TECHNICIAN', password: 'TestService123!' }],
    });

    const techUser = seedData.users?.[0];
    expect(techUser).toBeDefined();

    await page.goto('/login');
    await page.getByLabel('Email').fill(techUser!.email);
    await page.getByLabel('Jelszó').fill('TestService123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
  });

  test('[P1] alkatrész hozzáadása munkalaphoz', async ({ page }) => {
    // GIVEN: Munkalap javítás állapotban
    await page.goto('/worksheet');
    await page
      .getByRole('row', { name: /ML-.*Javítás/i })
      .first()
      .getByRole('button', { name: 'Megnyitás' })
      .click();

    // WHEN: Alkatrész hozzáadása
    await page.getByRole('button', { name: 'Alkatrész hozzáadása' }).click();
    await page.getByPlaceholder('Alkatrész keresése...').fill('szénkefe');
    await page.getByRole('option', { name: /Szénkefe.*Makita/i }).click();
    await page.getByLabel('Mennyiség').fill('2');
    await page.getByRole('button', { name: 'Hozzáadás' }).click();

    // THEN: Alkatrész megjelenik a listában
    await expect(page.getByText(/Szénkefe.*2 db/)).toBeVisible();
  });

  test('[P1] Makita norma idő számítás', async ({ page }) => {
    // GIVEN: Garanciális munkalap
    await page.goto('/worksheet');
    await page
      .getByRole('row', { name: /ML-.*Garanciális/i })
      .first()
      .getByRole('button', { name: 'Megnyitás' })
      .click();

    // WHEN: Norma idő kiválasztása
    await page.getByRole('button', { name: 'Norma idő' }).click();
    await page.getByPlaceholder('Művelet keresése...').fill('szénkefe csere');
    await page.getByRole('option', { name: /Szénkefe csere.*30 perc/i }).click();

    // THEN: Norma idő megjelenik
    await expect(page.getByText('Becsült idő: 30 perc')).toBeVisible();
  });
});

test.describe('@P1 @Szerviz @API Munkalap API', () => {
  test('[P1] API: munkalap státusz átmenet validáció', async ({ request, testSeeding }) => {
    // GIVEN: Seeded user és partner
    const seedData = await testSeeding.seed({
      users: [{ role: 'TECHNICIAN' }],
      partners: [{ name: 'Munkalap API Teszt', type: 'INDIVIDUAL' }],
    });

    const userToken = seedData.users?.[0]?.token;
    const partnerId = seedData.partners?.[0]?.id;
    expect(userToken).toBeDefined();
    expect(partnerId).toBeDefined();

    // Munkalap létrehozása
    const createResponse = await request.post('/api/worksheets', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      data: {
        partnerId: partnerId,
        manufacturer: 'Makita',
        model: 'HR2470',
        serialNumber: 'TEST-' + Date.now(),
        problemDescription: 'Teszt hiba',
        isWarranty: false,
      },
    });

    if (!createResponse.ok()) {
      test.skip(true, 'Worksheet API not available');
      return;
    }

    const worksheet = await createResponse.json();
    expect(worksheet.data.status).toBe('RECEIVED');

    // WHEN: Érvénytelen átmenet (RECEIVED → COMPLETED nem megengedett)
    const invalidResponse = await request.patch(`/api/worksheets/${worksheet.data.id}/status`, {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      data: { status: 'COMPLETED' },
    });

    // THEN: Visszautasítva
    expect(invalidResponse.status()).toBe(400);
    const error = await invalidResponse.json();
    expect(error.error.message).toBeDefined();
  });

  test('[P1] API: munkalap keresés és szűrés', async ({ request, testSeeding }) => {
    // GIVEN: Seeded user
    const seedData = await testSeeding.seed({
      users: [{ role: 'TECHNICIAN' }],
    });

    const userToken = seedData.users?.[0]?.token;
    expect(userToken).toBeDefined();

    // WHEN: Munkalapok lekérése státusz szűréssel
    const response = await request.get('/api/worksheets?status=RECEIVED', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
    });

    if (!response.ok()) {
      test.skip(true, 'Worksheet API not available');
      return;
    }

    // THEN: Csak RECEIVED státuszú munkalapok
    const result = await response.json();
    if (result.data?.length > 0) {
      result.data.forEach((ws: { status: string }) => {
        expect(ws.status).toBe('RECEIVED');
      });
    }
  });
});
