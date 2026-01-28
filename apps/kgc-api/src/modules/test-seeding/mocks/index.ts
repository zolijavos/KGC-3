/**
 * Mock External Services
 * Sprint 0 Blocker #3: Mock External Services
 *
 * Exports all mock service implementations for E2E testing.
 * These mocks provide predictable responses without making actual API calls.
 *
 * @example
 * // In test setup
 * import { MockSzamlazzhuService, MockMyPosService, MockTwentyCrmService } from '@kgc-api/test-seeding';
 *
 * // Create mock instances
 * const szamlazz = new MockSzamlazzhuService({ forceError: null });
 * const mypos = new MockMyPosService({ responseDelay: 50 });
 * const twentyCrm = new MockTwentyCrmService();
 *
 * // Configure error scenarios
 * szamlazz.configure({ forceError: 'NAV' });
 * mypos.configure({ forceError: 'DECLINED' });
 *
 * // Reset between tests
 * szamlazz.reset();
 * mypos.reset();
 * twentyCrm.reset();
 */

// Számlázz.hu / NAV Online Invoice Mock
export {
  MockSzamlazzhuService,
  type MockInvoice,
  type MockInvoiceResult,
  type MockSzamlazzhuConfig,
} from './szamlazz-hu.mock';

// Twenty CRM Mock
export {
  MockTwentyCrmService,
  type MockTwentyCrmCompany,
  type MockTwentyCrmConfig,
  type MockTwentyCrmOpportunity,
  type MockTwentyCrmPerson,
} from './twenty-crm.mock';

// MyPos Payment Gateway Mock
export {
  MockMyPosService,
  type DepositStatus,
  type MockDepositRequest,
  type MockDepositResult,
  type MockMyPosConfig,
  type MockPaymentRequest,
  type MockPaymentResult,
  type MockRefundRequest,
  type MockRefundResult,
  type PaymentStatus,
} from './mypos.mock';
