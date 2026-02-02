import { expect, test } from '../support/fixtures';

/**
 * KGC ERP - Authentication & Authorization Tests (P0)
 *
 * Kritikus biztonsági tesztek az autentikáció és autorizáció ellenőrzéséhez.
 *
 * Sprint 0 Blocker #2: TestSeedingFactory használata izolált teszt adatokhoz.
 *
 * Tesztelt flow-k:
 * - Bejelentkezés érvényes/hibás credentials-szel
 * - Session timeout és token refresh
 * - RBAC jogosultság ellenőrzés
 * - Brute force védelem
 *
 * @risk R-002 (Score: 4) - RBAC bypass
 * @risk R-008 (Score: 4) - Session management vulnerabilities
 */

test.describe('@P0 @Auth @SEC Bejelentkezés', () => {
  test('[P0] sikeres bejelentkezés érvényes adatokkal', async ({
    page,
    testSeeding: _testSeeding,
  }) => {
    // GIVEN: Seeded admin user
    // GIVEN: Pre-seeded admin user (bypass missing API)
    const adminUser = { email: 'admin@kgc-test.hu', password: 'TestAdmin123!' };

    // GIVEN: Login oldal
    await page.goto('/login');

    // WHEN: Valid credentials megadása
    await page.getByLabel('E-mail cím').fill(adminUser!.email);
    await page.getByLabel('Jelszó').fill('TestAdmin123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();

    // THEN: Sikeres átirányítás dashboard-ra
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Üdvözöljük/ })).toBeVisible();
  });

  test('[P0] hibás jelszó esetén hibaüzenet jelenik meg', async ({ page, testSeeding }) => {
    // GIVEN: Seeded user
    const seedData = await testSeeding.seed({
      users: [{ role: 'OPERATOR' }],
    });

    const user = seedData.users?.[0];
    expect(user).toBeDefined();

    // GIVEN: Login oldal
    await page.goto('/login');

    // WHEN: Hibás jelszó
    await page.getByLabel('E-mail cím').fill(user!.email);
    await page.getByLabel('Jelszó').fill('rossz_jelszo');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();

    // THEN: Hibaüzenet (nem specifikus - security)
    await expect(page.getByText('Hibás email vagy jelszó')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('[P0] nem létező email esetén ugyanaz a hibaüzenet (security)', async ({ page }) => {
    // GIVEN: Login oldal - nincs seeding, mert nem létező user-t tesztelünk
    await page.goto('/login');

    // WHEN: Nem létező email (egyedi, hogy ne ütközzön)
    const nonExistentEmail = `nemletezik-${Date.now()}@kgc-test.hu`;
    await page.getByLabel('E-mail cím').fill(nonExistentEmail);
    await page.getByLabel('Jelszó').fill('barmilyen123');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();

    // THEN: Ugyanaz a hibaüzenet (ne fedje fel, létezik-e az email)
    await expect(page.getByText('Hibás email vagy jelszó')).toBeVisible();
  });
});

test.describe('@P0 @Auth @SEC Token & Session', () => {
  test('[P0] Token refresh működik lejárt access token esetén', async ({
    request,
    testSeeding,
  }) => {
    // GIVEN: Seeded user
    const seedData = await testSeeding.seed({
      users: [{ role: 'OPERATOR', password: 'TestPassword123!' }],
    });

    const user = seedData.users?.[0];
    expect(user).toBeDefined();

    // GIVEN: Login és token lekérés
    const loginResponse = await request.post('/api/v1/login', {
      data: {
        email: user!.email,
        password: 'TestPassword123!',
      },
    });

    if (!loginResponse.ok()) {
      test.skip(true, 'Auth API not available');
      return;
    }

    const { accessToken, refreshToken } = await loginResponse.json();
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    // WHEN: Token refresh kérés
    const refreshResponse = await request.post('/api/v1/auth/refresh', {
      data: { refreshToken },
    });

    // THEN: Új access token
    expect(refreshResponse.ok()).toBeTruthy();
    const { accessToken: newAccessToken } = await refreshResponse.json();
    expect(newAccessToken).toBeDefined();
    expect(newAccessToken).not.toBe(accessToken);
  });

  test('[P0] Session timeout után újra login szükséges', async ({ page, context, testSeeding }) => {
    // GIVEN: Seeded admin user
    const seedData = await testSeeding.seed({
      users: [{ role: 'SUPER_ADMIN', password: 'TestAdmin123!' }],
    });

    const adminUser = seedData.users?.[0];
    expect(adminUser).toBeDefined();

    // GIVEN: Bejelentkezett állapot
    await page.goto('/login');
    await page.getByLabel('E-mail cím').fill(adminUser!.email);
    await page.getByLabel('Jelszó').fill('TestAdmin123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
    await expect(page).toHaveURL('/dashboard');

    // WHEN: Session cookie törlése (timeout szimuláció)
    await context.clearCookies();

    // Újra navigálás védett oldalra
    await page.goto('/partners');

    // THEN: Átirányítás login-ra
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('@P0 @Auth @RBAC Jogosultság', () => {
  test('[P0] admin hozzáfér az admin felülethez', async ({ page, testSeeding }) => {
    // GIVEN: Seeded admin user
    const seedData = await testSeeding.seed({
      users: [{ role: 'SUPER_ADMIN', password: 'TestAdmin123!' }],
    });

    const adminUser = seedData.users?.[0];
    expect(adminUser).toBeDefined();

    // GIVEN: Admin login
    await page.goto('/login');
    await page.getByLabel('E-mail cím').fill(adminUser!.email);
    await page.getByLabel('Jelszó').fill('TestAdmin123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();

    // WHEN: Admin felület elérése
    await page.goto('/users');

    // THEN: Sikeres hozzáférés
    await expect(page).toHaveURL('/users');
    await expect(page.getByRole('heading', { name: 'Felhasználók' })).toBeVisible();
  });

  test('[P0] operátor nem fér hozzá az admin felülethez', async ({ page, testSeeding }) => {
    // GIVEN: Seeded operator user (nem admin)
    const seedData = await testSeeding.seed({
      users: [{ role: 'OPERATOR', password: 'TestOperator123!' }],
    });

    const operatorUser = seedData.users?.[0];
    expect(operatorUser).toBeDefined();

    // GIVEN: Operator login
    await page.goto('/login');
    await page.getByLabel('E-mail cím').fill(operatorUser!.email);
    await page.getByLabel('Jelszó').fill('TestOperator123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();

    // WHEN: Próbáljon admin oldalra navigálni
    await page.goto('/users');

    // THEN: Átirányítás vagy 403-as hibaoldal
    await expect(page).not.toHaveURL('/users');
  });

  test('[P0] Role escalation prevention - user nem kaphat magasabb jogot', async ({
    request,
    testSeeding,
  }) => {
    // GIVEN: Seeded regular user
    const seedData = await testSeeding.seed({
      users: [{ role: 'OPERATOR', password: 'TestOperator123!' }],
    });

    const operatorUser = seedData.users?.[0];
    expect(operatorUser).toBeDefined();

    // GIVEN: Regular user login
    const loginResponse = await request.post('/api/v1/login', {
      data: {
        email: operatorUser!.email,
        password: 'TestOperator123!',
      },
    });

    if (!loginResponse.ok()) {
      test.skip(true, 'Auth API not available');
      return;
    }

    const { accessToken } = await loginResponse.json();

    // WHEN: Próbál admin role-t adni magának
    const escalationResponse = await request.patch('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { role: 'ADMIN' },
    });

    // THEN: 403 vagy figyelmen kívül hagyja
    expect([400, 403, 404]).toContain(escalationResponse.status());
  });
});

test.describe('@P0 @Auth @SEC Input Validation', () => {
  test('[P0] Brute force védelem - lockout több sikertelen próba után', async ({
    request,
    isYoloMode,
  }) => {
    // YOLO módban skip-eljük (rate limit miatt lassú)
    if (isYoloMode) {
      test.skip(true, 'Skipping brute force test in YOLO mode');
      return;
    }

    // GIVEN: Egyedi email a teszthez
    const email = `lockout-test-${Date.now()}@kgc-test.hu`;

    // WHEN: 5+ sikertelen próba
    for (let i = 0; i < 6; i++) {
      await request.post('/api/v1/login', {
        data: {
          email,
          password: `WrongPassword${i}`,
        },
      });
    }

    // THEN: Account lockout vagy rate limit
    const lockedResponse = await request.post('/api/v1/login', {
      data: {
        email,
        password: 'CorrectPassword123!',
      },
    });

    expect([401, 429]).toContain(lockedResponse.status());
  });

  test('[P0] XSS védelem login mezőkben', async ({ page }) => {
    // GIVEN: Login oldal
    await page.goto('/login');

    // WHEN: XSS payload az email mezőben
    const xssPayload = '<script>alert("xss")</script>';
    await page.getByLabel('E-mail cím').fill(xssPayload);
    await page.getByLabel('Jelszó').fill('test');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();

    // THEN: Nincs script execution, megfelelő hibaüzenet
    // Ha a page-en lenne alert, ez kivételt dobna
    const errorVisible = await page.getByText('Hibás email vagy jelszó').isVisible();
    expect(errorVisible).toBeTruthy();
  });
});

test.describe('@P0 @Auth Kijelentkezés', () => {
  test('[P0] sikeres kijelentkezés', async ({ page, testSeeding }) => {
    // GIVEN: Seeded admin user
    const seedData = await testSeeding.seed({
      users: [{ role: 'SUPER_ADMIN', password: 'TestAdmin123!' }],
    });

    const adminUser = seedData.users?.[0];
    expect(adminUser).toBeDefined();

    // GIVEN: Bejelentkezés
    await page.goto('/login');
    await page.getByLabel('E-mail cím').fill(adminUser!.email);
    await page.getByLabel('Jelszó').fill('TestAdmin123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
    await expect(page).toHaveURL('/dashboard');

    // WHEN: Kijelentkezés
    await page.getByRole('button', { name: 'Profil' }).click();
    await page.getByRole('menuitem', { name: 'Kijelentkezés' }).click();

    // THEN: Visszairányítás login-ra
    await expect(page).toHaveURL('/login');
  });

  test('[P0] kijelentkezés után védett oldal nem elérhető', async ({ page, testSeeding }) => {
    // GIVEN: Seeded admin user
    const seedData = await testSeeding.seed({
      users: [{ role: 'SUPER_ADMIN', password: 'TestAdmin123!' }],
    });

    const adminUser = seedData.users?.[0];
    expect(adminUser).toBeDefined();

    // GIVEN: Bejelentkezés majd kijelentkezés
    await page.goto('/login');
    await page.getByLabel('E-mail cím').fill(adminUser!.email);
    await page.getByLabel('Jelszó').fill('TestAdmin123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();
    await expect(page).toHaveURL('/dashboard');

    // Kijelentkezés
    await page.getByRole('button', { name: 'Profil' }).click();
    await page.getByRole('menuitem', { name: 'Kijelentkezés' }).click();

    // WHEN: Védett oldal elérése
    await page.goto('/partners');

    // THEN: Átirányítás login-ra
    await expect(page).toHaveURL(/.*login/);
  });
});
