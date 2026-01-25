/**
 * Shared Mock Prisma Client Factory for Inventory Repository Tests
 * TEA Review Recommendation: P2 - Extract mock factory for DRY
 */

import { vi, type Mock } from 'vitest';

export interface MockPrismaClient {
  warehouse: {
    create: Mock;
    findFirst: Mock;
    findMany: Mock;
    count: Mock;
    update: Mock;
    updateMany: Mock;
  };
  inventoryTransfer: {
    create: Mock;
    findFirst: Mock;
    findMany: Mock;
    count: Mock;
    update: Mock;
  };
  inventoryItem: {
    create: Mock;
    findFirst: Mock;
    findMany: Mock;
    count: Mock;
    update: Mock;
    updateMany: Mock;
  };
  stockLocation: {
    create: Mock;
    createMany: Mock;
    findFirst: Mock;
    findMany: Mock;
    count: Mock;
    update: Mock;
    updateMany: Mock;
  };
  locationStructure: {
    create: Mock;
    findFirst: Mock;
    update: Mock;
  };
  stockMovement: {
    create: Mock;
    createMany: Mock;
    findFirst: Mock;
    findMany: Mock;
    count: Mock;
  };
  stockLevelSetting: {
    create: Mock;
    findFirst: Mock;
    findMany: Mock;
    count: Mock;
    update: Mock;
    delete: Mock;
  };
  stockAlert: {
    create: Mock;
    findFirst: Mock;
    findMany: Mock;
    count: Mock;
    update: Mock;
    updateMany: Mock;
  };
  $transaction: Mock;
  $queryRaw: Mock;
}

/**
 * Create a mock Prisma client with all models mocked.
 * The $transaction mock executes the callback with the mock client.
 */
export const createMockPrismaClient = (): MockPrismaClient => {
  const mockClient: MockPrismaClient = {
    warehouse: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    inventoryTransfer: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    inventoryItem: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    stockLocation: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    locationStructure: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    stockLevelSetting: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    stockAlert: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    // $transaction executes callback with mock client for atomic operations
    $transaction: vi.fn(async (callback: (tx: MockPrismaClient) => Promise<unknown>) => {
      return callback(mockClient);
    }),
    // $queryRaw for raw SQL queries (CR-2 fix)
    $queryRaw: vi.fn(),
  };

  return mockClient;
};

/**
 * Helper to reset all mocks on a mock Prisma client.
 * Call this in beforeEach() for test isolation.
 */
export const resetMockPrismaClient = (mockClient: MockPrismaClient): void => {
  Object.values(mockClient).forEach(model => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach(method => {
        if (typeof method === 'function' && 'mockClear' in method) {
          (method as Mock).mockClear();
        }
      });
    } else if (typeof model === 'function' && 'mockClear' in model) {
      (model as Mock).mockClear();
    }
  });
};
