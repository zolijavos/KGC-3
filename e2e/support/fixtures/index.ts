import { test as base, expect, type APIRequestContext } from '@playwright/test';
import {
  BergepFactory,
  PartnerFactory,
  TestSeedingFactory,
  type TestSeedResponse,
} from './factories';

/**
 * KGC ERP - Extended Playwright Fixtures
 *
 * Párhuzamos futtatáshoz optimalizált fixture-ök auto-cleanup-pal.
 *
 * YOLO MODE: TEST_YOLO=true környezeti változóval
 * - Gyorsabb timeout-ok
 * - Nincs retry
 * - Folytatás hibánál
 *
 * @example
 * import { test, expect } from '@e2e/support/fixtures';
 *
 * test('parallel safe test', async ({ partnerFactory, bergepFactory }) => {
 *   const partner = await partnerFactory.create();
 *   const bergep = await bergepFactory.createAvailable();
 *   // ... test logic - cleanup automatikus
 * });
 */

// ===========================================
// Fixture Types
// ===========================================

export interface KgcFixtures {
  // Data Factories (auto-cleanup)
  partnerFactory: PartnerFactory;
  bergepFactory: BergepFactory;

  // Test Seeding Factory - isolated tenant per test (Sprint 0 Blocker #2)
  testSeeding: TestSeedingFactory;

  // Seeded data from testSeeding.quickSeed() - ready to use
  seededData: TestSeedResponse;

  // API Request with tenant context
  apiRequest: APIRequestContext;

  // Tenant isolation for parallel runs
  testTenantId: string;

  // YOLO mode flag
  isYoloMode: boolean;
}

// ===========================================
// Extended Test with KGC Fixtures
// ===========================================

export const test = base.extend<KgcFixtures>({
  // YOLO mode detection
  isYoloMode: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const isYolo = process.env.TEST_YOLO === 'true' || process.env.YOLO === '1';
      await use(isYolo);
    },
    { scope: 'test' },
  ],

  // Unique tenant ID per parallel worker for isolation
  testTenantId: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, testInfo) => {
      // Generate unique tenant ID based on worker + test
      const workerId = testInfo.parallelIndex;
      const testHash = testInfo.testId.slice(0, 8);
      const tenantId = `test-tenant-${workerId}-${testHash}`;
      await use(tenantId);
    },
    { scope: 'test' },
  ],

  // API Request context (uses base request)
  apiRequest: [
    async ({ request }, use) => {
      await use(request);
    },
    { scope: 'test' },
  ],

  // Partner Factory with auto-cleanup
  partnerFactory: [
    async ({ apiRequest, testTenantId }, use) => {
      const factory = new PartnerFactory(apiRequest, testTenantId);

      await use(factory);

      // Auto-cleanup after test
      await factory.cleanup();
    },
    { scope: 'test' },
  ],

  // Bergep Factory with auto-cleanup
  bergepFactory: [
    async ({ apiRequest, testTenantId }, use) => {
      const factory = new BergepFactory(apiRequest, testTenantId);

      await use(factory);

      // Auto-cleanup after test
      await factory.cleanup();
    },
    { scope: 'test' },
  ],

  // Test Seeding Factory - provides isolated tenant per test (Sprint 0 Blocker #2)
  testSeeding: [
    async ({ request }, use, testInfo) => {
      const factory = new TestSeedingFactory(request, {
        parallelIndex: testInfo.parallelIndex,
        testId: testInfo.testId,
        project: testInfo.project,
      });

      await use(factory);

      // Auto-cleanup after test
      await factory.cleanup();
    },
    { scope: 'test' },
  ],

  // Pre-seeded data - quickSeed() called automatically
  seededData: [
    async ({ testSeeding }, use) => {
      // Automatically seed a minimal test environment
      const data = await testSeeding.seed({
        users: [{ role: 'OPERATOR' }],
      });

      await use(data);
    },
    { scope: 'test' },
  ],
});

// ===========================================
// YOLO Mode Configuration
// ===========================================

/**
 * YOLO test - faster, no retries, continues on failure
 * Usage: yoloTest('fast test', async ({ page }) => { ... });
 */
export const yoloTest = test.extend({
  // Override default timeout for YOLO mode
  page: async ({ page }, use) => {
    // Shorter timeouts in YOLO mode
    page.setDefaultTimeout(5000);
    page.setDefaultNavigationTimeout(10000);
    await use(page);
  },
});

// Re-export expect for convenience
export { expect };

// ===========================================
// Parallel Execution Helpers
// ===========================================

/**
 * Generate unique test data prefix for parallel isolation
 */
export function uniquePrefix(testInfo: { parallelIndex: number; testId: string }): string {
  return `w${testInfo.parallelIndex}-${testInfo.testId.slice(0, 6)}`;
}

/**
 * Wait helper that respects YOLO mode (shorter waits)
 */
export async function smartWait(ms: number, isYolo: boolean): Promise<void> {
  const actualMs = isYolo ? Math.min(ms, 1000) : ms;
  await new Promise(resolve => setTimeout(resolve, actualMs));
}

// ===========================================
// Test Annotations
// ===========================================

/**
 * Mark test as parallelizable (default in Playwright)
 */
export const parallel = test;

/**
 * Mark test as serial (runs alone)
 */
export const serial = test.describe.configure({ mode: 'serial' });
