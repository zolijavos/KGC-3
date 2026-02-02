import type { APIRequestContext } from '@playwright/test';

/**
 * Test Seeding Factory
 * Sprint 0 Blocker #2: Multi-Tenant Test Fixtures
 *
 * Provides isolated tenant environments for parallel E2E test execution.
 * Uses the /api/v1/test/seed endpoint created in Sprint 0 Blocker #1.
 *
 * @example
 * import { TestSeedingFactory } from '@e2e/support/fixtures/factories';
 *
 * test('isolated test', async ({ request }) => {
 *   const seeding = new TestSeedingFactory(request, testInfo);
 *   const { tenant, users, partners } = await seeding.seed({
 *     users: [{ role: 'OPERATOR' }, { role: 'BOLTVEZETO' }],
 *     partners: [{ name: 'Test Partner' }],
 *   });
 *
 *   // Login as created user
 *   const operatorPassword = users.find(u => u.role === 'OPERATOR')?.password;
 *   // ... test with isolated data
 *
 *   // Auto-cleanup in fixture teardown
 * });
 */

// ===========================================
// Types
// ===========================================

export type UserRole =
  | 'OPERATOR'
  | 'TECHNIKUS'
  | 'BOLTVEZETO'
  | 'ACCOUNTANT'
  | 'PARTNER_OWNER'
  | 'CENTRAL_ADMIN'
  | 'DEVOPS_ADMIN'
  | 'SUPER_ADMIN';

export interface SeedUserRequest {
  email?: string;
  name?: string;
  role?: UserRole;
  password?: string;
}

export interface SeedPartnerRequest {
  name?: string;
  email?: string;
  phone?: string;
  taxNumber?: string;
}

export interface SeedInventoryItemRequest {
  sku?: string;
  name?: string;
  type?: 'PRODUCT' | 'RENTAL_EQUIPMENT' | 'PART' | 'CONSUMABLE';
  currentStock?: number;
  minStock?: number;
  price?: number;
}

export interface SeedTenantRequest {
  name?: string;
  slug?: string;
}

export interface TestSeedRequest {
  tenant?: SeedTenantRequest;
  users?: SeedUserRequest[];
  partners?: SeedPartnerRequest[];
  inventoryItems?: SeedInventoryItemRequest[];
}

export interface SeededUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string;
  password: string; // Plain text for test login
  token: string; // JWT token (generated server-side at seed time)
}

export interface SeededPartner {
  id: string;
  name: string;
  tenantId: string;
}

export interface SeededInventoryItem {
  id: string;
  sku: string;
  name: string;
  tenantId: string;
}

export interface SeededTenant {
  id: string;
  name: string;
  slug: string;
}

export interface TestSeedResponse {
  success: boolean;
  testRunId: string;
  createdAt: string;
  tenant?: SeededTenant;
  users: SeededUser[];
  partners: SeededPartner[];
  inventoryItems: SeededInventoryItem[];
}

export interface TestCleanupResponse {
  success: boolean;
  testRunId: string;
  deleted: {
    tenants: number;
    users: number;
    partners: number;
    inventoryItems: number;
  };
}

// ===========================================
// Factory Implementation
// ===========================================

export class TestSeedingFactory {
  private request: APIRequestContext;
  private testRunId: string;
  private seeded = false;
  private seedResponse?: TestSeedResponse;

  constructor(
    request: APIRequestContext,
    testInfo: { parallelIndex: number; testId: string; project: { name: string } }
  ) {
    this.request = request;
    // Generate unique testRunId based on worker, test, and timestamp
    this.testRunId = `e2e-${testInfo.parallelIndex}-${testInfo.testId.slice(0, 8)}-${Date.now()}`;
  }

  /**
   * Get the test run ID for this factory instance
   */
  get runId(): string {
    return this.testRunId;
  }

  /**
   * Get seeded data (after seed() is called)
   */
  get data(): TestSeedResponse | undefined {
    return this.seedResponse;
  }

  /**
   * Seed test data for this test run
   * Creates isolated tenant, users, and data for the test
   */
  async seed(config: TestSeedRequest = {}): Promise<TestSeedResponse> {
    if (this.seeded) {
      return this.seedResponse!;
    }

    const response = await this.request.post('/api/v1/test/seed', {
      data: {
        testRunId: this.testRunId,
        tenant: config.tenant ?? {
          name: `Test Tenant ${this.testRunId}`,
          slug: `test-${this.testRunId}`,
        },
        users: config.users ?? [{ role: 'OPERATOR' }],
        partners: config.partners,
        inventoryItems: config.inventoryItems,
      },
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Test seeding failed: ${response.status()} - ${error}`);
    }

    this.seedResponse = await response.json();
    this.seeded = true;

    // NOTE: Tokens are now generated server-side by the seed endpoint
    // No need to call login endpoint (avoids rate limiting issues)

    return this.seedResponse!;
  }

  /**
   * Quick seed - creates minimal test environment
   * Returns admin user credentials for quick login
   */
  async quickSeed(): Promise<{
    tenant: SeededTenant;
    adminUser: SeededUser;
    operatorUser: SeededUser;
  }> {
    const result = await this.seed({
      users: [{ role: 'OPERATOR', name: 'Test Operator' }],
    });

    const adminUser = result.users.find(u => u.role === 'SUPER_ADMIN');
    const operatorUser = result.users.find(u => u.role === 'OPERATOR');

    if (!adminUser || !operatorUser || !result.tenant) {
      throw new Error('Quick seed failed: missing required data');
    }

    return {
      tenant: result.tenant,
      adminUser,
      operatorUser,
    };
  }

  /**
   * Full seed - creates comprehensive test environment
   * Includes all roles, partners, and inventory
   */
  async fullSeed(): Promise<TestSeedResponse> {
    return this.seed({
      users: [
        { role: 'OPERATOR', name: 'Test Operator' },
        { role: 'TECHNIKUS', name: 'Test Technikus' },
        { role: 'BOLTVEZETO', name: 'Test Boltvezeto' },
        { role: 'ACCOUNTANT', name: 'Test Accountant' },
      ],
      partners: [
        { name: 'Test Individual Partner' },
        { name: 'Test Company Partner', taxNumber: '12345678-1-23' },
      ],
      inventoryItems: [
        { name: 'Test Product', type: 'PRODUCT', currentStock: 100 },
        { name: 'Test Rental Item', type: 'RENTAL_EQUIPMENT', currentStock: 5 },
      ],
    });
  }

  /**
   * Get user by role from seeded data
   */
  getUserByRole(role: UserRole): SeededUser | undefined {
    return this.seedResponse?.users.find(u => u.role === role);
  }

  /**
   * Get login credentials for a specific role
   */
  getCredentials(role: UserRole): { email: string; password: string } | undefined {
    const user = this.getUserByRole(role);
    if (!user) return undefined;
    return { email: user.email, password: user.password };
  }

  /**
   * Cleanup all seeded data for this test run
   */
  async cleanup(): Promise<TestCleanupResponse> {
    if (!this.seeded) {
      return {
        success: true,
        testRunId: this.testRunId,
        deleted: { tenants: 0, users: 0, partners: 0, inventoryItems: 0 },
      };
    }

    const response = await this.request.delete('/api/v1/test/cleanup', {
      data: { testRunId: this.testRunId },
    });

    if (!response.ok()) {
      const error = await response.text();
      console.warn(`Test cleanup failed: ${response.status()} - ${error}`);
      // Don't throw - cleanup failures shouldn't fail tests
      return {
        success: false,
        testRunId: this.testRunId,
        deleted: { tenants: 0, users: 0, partners: 0, inventoryItems: 0 },
      };
    }

    return response.json();
  }
}
