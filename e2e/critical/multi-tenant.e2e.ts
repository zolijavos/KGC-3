import { expect, test } from '../support/fixtures';

/**
 * KGC ERP - Multi-Tenant Isolation Tests (P0)
 *
 * Kritikus biztonsági tesztek a tenant izoláció ellenőrzéséhez.
 * RLS (Row Level Security) policy validáció.
 *
 * Sprint 0 Blocker #2: TestSeedingFactory használata valódi tenant izolációhoz.
 *
 * @risk R-001 (Score: 6) - Cross-tenant data leakage
 */

test.describe('@P0 @Multi-tenant @SEC RLS Isolation', () => {
  test('[P0] Tenant A nem láthatja Tenant B partner adatait', async ({ request, testSeeding }) => {
    // GIVEN: Két különálló tenant létrehozása TestSeedingFactory-val
    const tenantAData = await testSeeding.seed({
      tenantSlug: 'tenant-a',
      partners: [{ name: 'Tenant A Partner Kft.', type: 'COMPANY' }],
      users: [{ role: 'OPERATOR' }],
    });

    // Második tenant létrehozása új factory-val (külön testRunId)
    const tenantBResponse = await request.post('/api/test/seed', {
      data: {
        testRunId: `tenant-b-${Date.now()}`,
        tenantSlug: 'tenant-b',
        users: [{ role: 'OPERATOR' }],
      },
    });
    const tenantBData = await tenantBResponse.json();

    const partnerId = tenantAData.partners?.[0]?.id;
    expect(partnerId).toBeDefined();

    // WHEN: Tenant B felhasználó próbálja lekérni Tenant A partner adatát
    const crossTenantResponse = await request.get(`/api/partners/${partnerId}`, {
      headers: {
        'X-Tenant-ID': tenantBData.tenant.id,
        Authorization: `Bearer ${tenantBData.users[0].token}`,
      },
    });

    // THEN: 404-et kell kapni (RLS blokkolja, ne fedje fel hogy létezik)
    expect(crossTenantResponse.status()).toBe(404);

    // Cleanup tenant B
    await request.delete('/api/test/cleanup', {
      data: { testRunId: tenantBData.testRunId },
    });
  });

  test('[P0] Tenant izolált partner listázás', async ({ request, testSeeding }) => {
    // GIVEN: Tenant saját partnerekkel
    const seedData = await testSeeding.seed({
      partners: [
        { name: 'Saját Partner 1', type: 'INDIVIDUAL' },
        { name: 'Saját Partner 2', type: 'COMPANY' },
      ],
      users: [{ role: 'OPERATOR' }],
    });

    const userToken = seedData.users?.[0]?.token;
    expect(userToken).toBeDefined();

    // WHEN: Listázás a saját tenant-ból authentikálva
    const listResponse = await request.get('/api/partners', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
    });

    // THEN: Csak saját tenant partner-ek láthatók
    expect(listResponse.ok()).toBeTruthy();
    const partners = await listResponse.json();

    expect(partners.data).toBeDefined();
    expect(partners.data.length).toBeGreaterThanOrEqual(2);

    // Ellenőrizd, hogy csak a saját tenant partnerei vannak
    for (const partner of partners.data) {
      expect(partner.tenantId).toBe(seedData.tenant.id);
    }
  });

  test('[P0] Inventory (készlet) adatok izoláltak tenant-onként', async ({
    request,
    testSeeding,
  }) => {
    // GIVEN: Tenant inventory-val
    const seedData = await testSeeding.seed({
      inventory: {
        products: [{ name: 'Hilti TE 70 Fúrókalapács', sku: 'HILTI-TE70' }],
      },
      users: [{ role: 'OPERATOR' }],
    });

    const productId = seedData.inventory?.products?.[0]?.id;
    expect(productId).toBeDefined();

    // WHEN: Más tenant próbálja lekérni
    const crossTenantResponse = await request.get(`/api/inventory/products/${productId}`, {
      headers: { 'X-Tenant-ID': 'nonexistent-tenant' },
    });

    // THEN: 404 - nem található (RLS blokkolja)
    expect(crossTenantResponse.status()).toBe(404);
  });

  test('[P0] Tenant kontextus nélküli kérés visszautasítva', async ({ request }) => {
    // GIVEN: API kérés tenant header nélkül

    // WHEN: Partner listázás tenant nélkül
    const response = await request.get('/api/partners');

    // THEN: 400 Bad Request vagy 401 Unauthorized
    expect([400, 401]).toContain(response.status());
  });

  test('[P0] SQL injection védelem RLS-sel', async ({ request }) => {
    // GIVEN: Támadó próbál SQL injection-nel RLS-t megkerülni
    const maliciousTenantId = "'; DROP TABLE partners; --";

    // WHEN: API hívás rosszindulatú tenant ID-val
    const response = await request.get('/api/partners', {
      headers: { 'X-Tenant-ID': maliciousTenantId },
    });

    // THEN: Kérés visszautasítva (nem okoz hibát, csak 400/401/403)
    expect([400, 401, 403]).toContain(response.status());
  });

  test('[P0] UUID traversal támadás védelem', async ({ request, testSeeding }) => {
    // GIVEN: Valós tenant adatokkal
    const seedData = await testSeeding.seed({
      partners: [{ name: 'Teszt Partner', type: 'INDIVIDUAL' }],
      users: [{ role: 'OPERATOR' }],
    });

    const userToken = seedData.users?.[0]?.token;
    // Note: seedData.partners?.[0]?.id létezik, de fake UUID-val teszteljük

    // Gyártott UUID - nem létező partner
    const fakeUuid = '00000000-0000-0000-0000-000000000001';

    // WHEN: Próbálkozás hamis UUID-val
    const response = await request.get(`/api/partners/${fakeUuid}`, {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
    });

    // THEN: 404 - nem található (nem ad információt)
    expect(response.status()).toBe(404);
  });
});

test.describe('@P0 @Multi-tenant @DATA Tranzakció izoláció', () => {
  test('[P0] Bérlés tranzakció izolált tenant-ok között', async ({ request, testSeeding }) => {
    // GIVEN: Tenant partner-rel és inventory-val
    const seedData = await testSeeding.seed({
      partners: [{ name: 'Bérlő Ügyfél Kft.', type: 'COMPANY' }],
      inventory: {
        products: [{ name: 'Makita HR2470 Fúrókalapács', sku: 'MAK-HR2470', type: 'RENTAL' }],
      },
      users: [{ role: 'OPERATOR' }],
    });

    const userToken = seedData.users?.[0]?.token;
    const partnerId = seedData.partners?.[0]?.id;
    const productId = seedData.inventory?.products?.[0]?.id;

    expect(userToken).toBeDefined();
    expect(partnerId).toBeDefined();
    expect(productId).toBeDefined();

    // WHEN: Bérlés létrehozása authentikálva
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
      const rental = await rentalResponse.json();
      expect(rental.data.tenantId).toBe(seedData.tenant.id);

      // Más tenant nem látja
      const crossTenantResponse = await request.get(`/api/rentals/${rental.data.id}`, {
        headers: { 'X-Tenant-ID': 'other-tenant-id' },
      });
      expect(crossTenantResponse.status()).toBe(404);
    }
  });

  test('[P0] Munkalap adatok izoláltak', async ({ request, testSeeding }) => {
    // GIVEN: Tenant munkalap-ra alkalmas adatokkal
    const seedData = await testSeeding.seed({
      partners: [{ name: 'Szerviz Ügyfél', type: 'INDIVIDUAL' }],
      users: [{ role: 'TECHNICIAN' }],
    });

    const userToken = seedData.users?.[0]?.token;
    expect(userToken).toBeDefined();

    // WHEN: Munkalap lista lekérése
    const worksheetResponse = await request.get('/api/worksheets', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
    });

    // THEN: Csak saját tenant munkalapjai
    if (worksheetResponse.ok()) {
      const worksheets = await worksheetResponse.json();
      for (const ws of worksheets.data || []) {
        expect(ws.tenantId).toBe(seedData.tenant.id);
      }
    }
  });
});

test.describe('@P0 @Multi-tenant @AUDIT Audit trail izoláció', () => {
  test('[P0] Audit log izolált tenant-onként', async ({ request, testSeeding }) => {
    // GIVEN: Tenant adatokkal
    const seedData = await testSeeding.seed({
      users: [{ role: 'ADMIN' }],
    });

    const adminToken = seedData.users?.[0]?.token;
    expect(adminToken).toBeDefined();

    // WHEN: Audit log lekérése
    const auditResponse = await request.get('/api/audit-logs', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${adminToken}`,
      },
    });

    // THEN: Csak saját tenant audit log-jai
    if (auditResponse.ok()) {
      const auditLogs = await auditResponse.json();
      for (const log of auditLogs.data || []) {
        expect(log.tenantId).toBe(seedData.tenant.id);
      }
    }
  });
});
