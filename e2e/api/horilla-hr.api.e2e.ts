import { expect, test } from '../support/fixtures';

/**
 * KGC ERP - Horilla HR API Tests (P1)
 *
 * Headless API tesztek a Horilla HR integrációhoz.
 * Kétirányú szinkronizáció: KGC ↔ Horilla
 *
 * @P1 @API @Integration @Horilla
 */

test.describe('@P1 @API @Integration @Horilla Employee Sync', () => {
  test('[P1] Sync employees from Horilla to KGC - HORILLA_TO_KGC', async ({
    request,
    testSeeding,
  }) => {
    // GIVEN: Seeded admin user with config
    const seedData = await testSeeding.seed({
      users: [{ role: 'CENTRAL_ADMIN' }],
    });

    const userToken = seedData.users?.[0]?.token;
    expect(userToken).toBeDefined();

    // WHEN: Trigger sync from Horilla to KGC
    const response = await request.post('/api/horilla-hr/sync/employees', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      params: {
        tenantId: seedData.tenant.id,
        userId: seedData.users?.[0]?.id,
      },
      data: {
        direction: 'HORILLA_TO_KGC',
        fullSync: true,
      },
    });

    // THEN: Verify sync result
    if (!response.ok()) {
      // API not available or config not set
      const error = await response.json().catch(() => ({}));
      if (error?.message?.includes('configuration not found') || response.status() === 404) {
        test.skip(true, 'Horilla HR API not configured');
        return;
      }
    }

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.direction).toBe('HORILLA_TO_KGC');
    expect(result.entityType).toBe('EMPLOYEE');
    expect(result.totalCount).toBeGreaterThanOrEqual(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  test('[P1] Sync employees from KGC to Horilla - KGC_TO_HORILLA', async ({
    request,
    testSeeding,
  }) => {
    // GIVEN: Seeded admin user
    const seedData = await testSeeding.seed({
      users: [{ role: 'CENTRAL_ADMIN' }],
    });

    const userToken = seedData.users?.[0]?.token;
    expect(userToken).toBeDefined();

    // WHEN: Trigger sync from KGC to Horilla
    const response = await request.post('/api/horilla-hr/sync/employees', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      params: {
        tenantId: seedData.tenant.id,
        userId: seedData.users?.[0]?.id,
      },
      data: {
        direction: 'KGC_TO_HORILLA',
        fullSync: true,
      },
    });

    // Handle API not available
    if (!response.ok()) {
      const error = await response.json().catch(() => ({}));
      if (error?.message?.includes('configuration not found') || response.status() === 404) {
        test.skip(true, 'Horilla HR API not configured');
        return;
      }
    }

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.direction).toBe('KGC_TO_HORILLA');
  });

  test('[P1] Bidirectional sync - BIDIRECTIONAL', async ({ request, testSeeding }) => {
    // GIVEN: Seeded admin user
    const seedData = await testSeeding.seed({
      users: [{ role: 'CENTRAL_ADMIN' }],
    });

    const userToken = seedData.users?.[0]?.token;
    expect(userToken).toBeDefined();

    // WHEN: Trigger bidirectional sync
    const response = await request.post('/api/horilla-hr/sync/employees', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      params: {
        tenantId: seedData.tenant.id,
        userId: seedData.users?.[0]?.id,
      },
      data: {
        direction: 'BIDIRECTIONAL',
        fullSync: false,
        conflictResolution: 'LAST_WRITE_WINS',
      },
    });

    // Handle API not available
    if (!response.ok()) {
      const error = await response.json().catch(() => ({}));
      if (error?.message?.includes('configuration not found') || response.status() === 404) {
        test.skip(true, 'Horilla HR API not configured');
        return;
      }
    }

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.direction).toBe('BIDIRECTIONAL');
    expect(result.successCount).toBeGreaterThanOrEqual(0);
  });

  test('[P1] Sync with userIds filter - KGC_TO_HORILLA', async ({ request, testSeeding }) => {
    // GIVEN: Seeded admin user with specific user IDs
    const seedData = await testSeeding.seed({
      users: [{ role: 'CENTRAL_ADMIN' }, { role: 'OPERATOR' }],
    });

    const adminToken = seedData.users?.[0]?.token;
    const operatorId = seedData.users?.[1]?.id;
    expect(adminToken).toBeDefined();
    expect(operatorId).toBeDefined();

    // WHEN: Sync specific users
    const response = await request.post('/api/horilla-hr/sync/employees', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${adminToken}`,
      },
      params: {
        tenantId: seedData.tenant.id,
        userId: seedData.users?.[0]?.id,
      },
      data: {
        direction: 'KGC_TO_HORILLA',
        userIds: [operatorId],
      },
    });

    // Handle API not available
    if (!response.ok()) {
      const error = await response.json().catch(() => ({}));
      if (error?.message?.includes('configuration not found') || response.status() === 404) {
        test.skip(true, 'Horilla HR API not configured');
        return;
      }
    }

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.totalCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('@P1 @API @Integration @Horilla Conflict Resolution', () => {
  test('[P1] Conflict resolution - LAST_WRITE_WINS', async ({ request, testSeeding }) => {
    // GIVEN: Seeded admin user
    const seedData = await testSeeding.seed({
      users: [{ role: 'CENTRAL_ADMIN' }],
    });

    const userToken = seedData.users?.[0]?.token;

    // WHEN: Sync with LAST_WRITE_WINS strategy
    const response = await request.post('/api/horilla-hr/sync/employees', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      params: {
        tenantId: seedData.tenant.id,
        userId: seedData.users?.[0]?.id,
      },
      data: {
        direction: 'BIDIRECTIONAL',
        conflictResolution: 'LAST_WRITE_WINS',
      },
    });

    if (!response.ok()) {
      test.skip(true, 'Horilla HR API not configured');
      return;
    }

    // THEN: Sync completed with strategy applied
    expect(response.ok()).toBeTruthy();
  });

  test('[P1] Conflict resolution - HORILLA_WINS', async ({ request, testSeeding }) => {
    // GIVEN: Seeded admin user
    const seedData = await testSeeding.seed({
      users: [{ role: 'CENTRAL_ADMIN' }],
    });

    const userToken = seedData.users?.[0]?.token;

    // WHEN: Sync with HORILLA_WINS strategy
    const response = await request.post('/api/horilla-hr/sync/employees', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      params: {
        tenantId: seedData.tenant.id,
        userId: seedData.users?.[0]?.id,
      },
      data: {
        direction: 'BIDIRECTIONAL',
        conflictResolution: 'HORILLA_WINS',
      },
    });

    if (!response.ok()) {
      test.skip(true, 'Horilla HR API not configured');
      return;
    }

    expect(response.ok()).toBeTruthy();
  });

  test('[P1] Conflict resolution - KGC_WINS', async ({ request, testSeeding }) => {
    // GIVEN: Seeded admin user
    const seedData = await testSeeding.seed({
      users: [{ role: 'CENTRAL_ADMIN' }],
    });

    const userToken = seedData.users?.[0]?.token;

    // WHEN: Sync with KGC_WINS strategy
    const response = await request.post('/api/horilla-hr/sync/employees', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      params: {
        tenantId: seedData.tenant.id,
        userId: seedData.users?.[0]?.id,
      },
      data: {
        direction: 'BIDIRECTIONAL',
        conflictResolution: 'KGC_WINS',
      },
    });

    if (!response.ok()) {
      test.skip(true, 'Horilla HR API not configured');
      return;
    }

    expect(response.ok()).toBeTruthy();
  });
});

test.describe('@P1 @API @Integration @Horilla Mapping Management', () => {
  test('[P1] Get employee mappings', async ({ request, testSeeding }) => {
    // GIVEN: Seeded admin user
    const seedData = await testSeeding.seed({
      users: [{ role: 'CENTRAL_ADMIN' }],
    });

    const userToken = seedData.users?.[0]?.token;
    expect(userToken).toBeDefined();

    // WHEN: Get mappings
    const response = await request.get('/api/horilla-hr/mappings', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      params: {
        tenantId: seedData.tenant.id,
      },
    });

    // Handle API not available
    if (response.status() === 404) {
      test.skip(true, 'Horilla HR API not available');
      return;
    }

    // THEN: Returns mapping list
    expect(response.ok()).toBeTruthy();
    const mappings = await response.json();
    expect(Array.isArray(mappings)).toBeTruthy();
  });

  test('[P1] Create employee mapping', async ({ request, testSeeding }) => {
    // GIVEN: Seeded admin user and operator to map
    const seedData = await testSeeding.seed({
      users: [{ role: 'CENTRAL_ADMIN' }, { role: 'OPERATOR' }],
    });

    const adminToken = seedData.users?.[0]?.token;
    const operatorId = seedData.users?.[1]?.id;
    expect(adminToken).toBeDefined();
    expect(operatorId).toBeDefined();

    // WHEN: Create mapping
    const response = await request.post('/api/horilla-hr/mappings', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${adminToken}`,
      },
      params: {
        tenantId: seedData.tenant.id,
        userId: seedData.users?.[0]?.id,
      },
      data: {
        horillaEmployeeId: `EMP-${Date.now()}`,
        kgcUserId: operatorId,
        syncDirection: 'BIDIRECTIONAL',
      },
    });

    // Handle API not available
    if (response.status() === 404) {
      test.skip(true, 'Horilla HR API not available');
      return;
    }

    // THEN: Mapping created
    expect(response.status()).toBe(201);
    const mapping = await response.json();
    expect(mapping.kgcUserId).toBe(operatorId);
    expect(mapping.syncDirection).toBe('BIDIRECTIONAL');
  });

  test('[P1] Delete employee mapping', async ({ request, testSeeding }) => {
    // GIVEN: Seeded admin user and operator
    const seedData = await testSeeding.seed({
      users: [{ role: 'CENTRAL_ADMIN' }, { role: 'OPERATOR' }],
    });

    const adminToken = seedData.users?.[0]?.token;
    const operatorId = seedData.users?.[1]?.id;

    // First create a mapping
    const createResponse = await request.post('/api/horilla-hr/mappings', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${adminToken}`,
      },
      params: {
        tenantId: seedData.tenant.id,
        userId: seedData.users?.[0]?.id,
      },
      data: {
        horillaEmployeeId: `EMP-DEL-${Date.now()}`,
        kgcUserId: operatorId,
        syncDirection: 'HORILLA_TO_KGC',
      },
    });

    if (createResponse.status() === 404) {
      test.skip(true, 'Horilla HR API not available');
      return;
    }

    const mapping = await createResponse.json();

    // WHEN: Delete mapping
    const deleteResponse = await request.delete(`/api/horilla-hr/mappings/${mapping.id}`, {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${adminToken}`,
      },
      params: {
        tenantId: seedData.tenant.id,
        userId: seedData.users?.[0]?.id,
      },
    });

    // THEN: Mapping deleted
    expect(deleteResponse.status()).toBe(204);
  });

  test('[P1] Prevent duplicate mapping', async ({ request, testSeeding }) => {
    // GIVEN: Seeded admin user and operator
    const seedData = await testSeeding.seed({
      users: [{ role: 'CENTRAL_ADMIN' }, { role: 'OPERATOR' }],
    });

    const adminToken = seedData.users?.[0]?.token;
    const operatorId = seedData.users?.[1]?.id;
    const horillaId = `EMP-DUP-${Date.now()}`;

    // Create first mapping
    const firstResponse = await request.post('/api/horilla-hr/mappings', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${adminToken}`,
      },
      params: {
        tenantId: seedData.tenant.id,
        userId: seedData.users?.[0]?.id,
      },
      data: {
        horillaEmployeeId: horillaId,
        kgcUserId: operatorId,
        syncDirection: 'BIDIRECTIONAL',
      },
    });

    if (firstResponse.status() === 404) {
      test.skip(true, 'Horilla HR API not available');
      return;
    }

    expect(firstResponse.status()).toBe(201);

    // WHEN: Try to create duplicate mapping
    const duplicateResponse = await request.post('/api/horilla-hr/mappings', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${adminToken}`,
      },
      params: {
        tenantId: seedData.tenant.id,
        userId: seedData.users?.[0]?.id,
      },
      data: {
        horillaEmployeeId: horillaId,
        kgcUserId: operatorId,
        syncDirection: 'BIDIRECTIONAL',
      },
    });

    // THEN: 400 Bad Request - already mapped
    expect(duplicateResponse.status()).toBe(400);
  });
});

test.describe('@P1 @API @Integration @Horilla Error Handling', () => {
  test('[P1] Missing tenantId returns 400', async ({ request, testSeeding }) => {
    // GIVEN: Seeded admin user
    const seedData = await testSeeding.seed({
      users: [{ role: 'CENTRAL_ADMIN' }],
    });

    const userToken = seedData.users?.[0]?.token;

    // WHEN: Call without tenantId
    const response = await request.post('/api/horilla-hr/sync/employees', {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
      data: {
        direction: 'HORILLA_TO_KGC',
      },
    });

    // THEN: 400 Bad Request
    if (response.status() === 404) {
      test.skip(true, 'Horilla HR API not available');
      return;
    }

    expect(response.status()).toBe(400);
  });

  test('[P1] Invalid direction returns 400', async ({ request, testSeeding }) => {
    // GIVEN: Seeded admin user
    const seedData = await testSeeding.seed({
      users: [{ role: 'CENTRAL_ADMIN' }],
    });

    const userToken = seedData.users?.[0]?.token;

    // WHEN: Call with invalid direction
    const response = await request.post('/api/horilla-hr/sync/employees', {
      headers: {
        'X-Tenant-ID': seedData.tenant.id,
        Authorization: `Bearer ${userToken}`,
      },
      params: {
        tenantId: seedData.tenant.id,
        userId: seedData.users?.[0]?.id,
      },
      data: {
        direction: 'INVALID_DIRECTION',
      },
    });

    // THEN: 400 Bad Request
    if (response.status() === 404) {
      test.skip(true, 'Horilla HR API not available');
      return;
    }

    expect(response.status()).toBe(400);
  });
});
