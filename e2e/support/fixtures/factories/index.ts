/**
 * KGC ERP - Test Data Factories
 *
 * Factory-k a teszt adatok generálásához és kezeléséhez.
 * Minden factory implementálja az auto-cleanup pattern-t.
 *
 * @example
 * import { PartnerFactory, BergepFactory } from '@e2e/support/fixtures/factories';
 *
 * test('example', async ({ request }) => {
 *   const partners = new PartnerFactory(request);
 *   const partner = await partners.create({ nev: 'Test Kft.' });
 *   // ... test logic ...
 *   await partners.cleanup(); // Automatikus a fixture-ökben
 * });
 */

export { BergepFactory, type BergepData, type CreatedBergep } from './bergep.factory';
export { PartnerFactory, type CreatedPartner, type PartnerData } from './partner.factory';
export {
  TestSeedingFactory,
  type SeededInventoryItem,
  type SeededPartner,
  type SeededTenant,
  type SeededUser,
  type TestSeedRequest,
  type TestSeedResponse,
  type UserRole,
} from './test-seeding.factory';

// Típus alias az egyszerűbb importáláshoz
export type FactoryCleanupFn = () => Promise<void>;

/**
 * Factory context - több factory kezelése egy tesztben
 */
export interface FactoryContext {
  cleanup: FactoryCleanupFn;
}

/**
 * Utility: Több factory cleanup egyszerre
 */
export async function cleanupAll(...cleanupFns: FactoryCleanupFn[]): Promise<void> {
  await Promise.all(cleanupFns.map(fn => fn()));
}
