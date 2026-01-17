/**
 * @kgc/inventory - MovementService TDD Tests
 * Story 9-4: Készlet mozgás audit trail
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovementService } from './movement.service';
import {
  InventoryMovement,
  IMovementRepository,
  MovementSummary,
} from '../interfaces/movement.interface';
import { CreateMovementInput } from '../dto/movement.dto';

// ============================================
// TEST DATA - Valid UUIDs
// ============================================

const TEST_IDS = {
  MOVEMENT_1: '11111111-1111-1111-1111-111111111111',
  MOVEMENT_2: '22222222-2222-2222-2222-222222222222',
  TENANT: '33333333-3333-3333-3333-333333333333',
  WAREHOUSE: '44444444-4444-4444-4444-444444444444',
  ITEM: '55555555-5555-5555-5555-555555555555',
  PRODUCT: '66666666-6666-6666-6666-666666666666',
  USER: '77777777-7777-7777-7777-777777777777',
  TRANSFER: '88888888-8888-8888-8888-888888888888',
};

// ============================================
// MOCK REPOSITORY
// ============================================

const createMockRepository = (): IMovementRepository => ({
  create: vi.fn(),
  createMany: vi.fn(),
  findById: vi.fn(),
  query: vi.fn(),
  getHistory: vi.fn(),
  getSummary: vi.fn(),
  getLastMovement: vi.fn(),
});

// ============================================
// TEST DATA FACTORY
// ============================================

const createTestMovement = (
  overrides: Partial<InventoryMovement> = {},
): InventoryMovement => ({
  id: TEST_IDS.MOVEMENT_1,
  tenantId: TEST_IDS.TENANT,
  inventoryItemId: TEST_IDS.ITEM,
  warehouseId: TEST_IDS.WAREHOUSE,
  productId: TEST_IDS.PRODUCT,
  type: 'RECEIPT',
  sourceModule: 'INVENTORY',
  quantityChange: 10,
  previousQuantity: 0,
  newQuantity: 10,
  unit: 'db',
  reason: 'Bevételezés',
  performedBy: TEST_IDS.USER,
  performedAt: new Date(),
  createdAt: new Date(),
  ...overrides,
});

// ============================================
// TEST SUITE
// ============================================

describe('MovementService', () => {
  let service: MovementService;
  let mockRepository: IMovementRepository;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new MovementService(mockRepository);
  });

  // ============================================
  // RECORD MOVEMENT TESTS
  // ============================================

  describe('recordMovement', () => {
    const validInput: CreateMovementInput = {
      inventoryItemId: TEST_IDS.ITEM,
      warehouseId: TEST_IDS.WAREHOUSE,
      productId: TEST_IDS.PRODUCT,
      type: 'RECEIPT',
      sourceModule: 'INVENTORY',
      quantityChange: 10,
      previousQuantity: 0,
      unit: 'db',
      reason: 'Bevételezés',
    };

    it('mozgás rögzítése sikeres', async () => {
      const expectedMovement = createTestMovement();
      vi.mocked(mockRepository.create).mockResolvedValue(expectedMovement);

      const result = await service.recordMovement(
        TEST_IDS.TENANT,
        validInput,
        TEST_IDS.USER,
      );

      expect(result).toEqual(expectedMovement);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TEST_IDS.TENANT,
          type: 'RECEIPT',
          quantityChange: 10,
          newQuantity: 10, // previousQuantity + quantityChange
          performedBy: TEST_IDS.USER,
        }),
      );
    });

    it('ISSUE típusú mozgás negatív változással', async () => {
      const issueInput: CreateMovementInput = {
        ...validInput,
        type: 'ISSUE',
        quantityChange: -5,
        previousQuantity: 10,
      };
      const expectedMovement = createTestMovement({
        type: 'ISSUE',
        quantityChange: -5,
        previousQuantity: 10,
        newQuantity: 5,
      });
      vi.mocked(mockRepository.create).mockResolvedValue(expectedMovement);

      const result = await service.recordMovement(
        TEST_IDS.TENANT,
        issueInput,
        TEST_IDS.USER,
      );

      expect(result.newQuantity).toBe(5);
    });

    it('referencia információk rögzítése', async () => {
      const inputWithRef: CreateMovementInput = {
        ...validInput,
        type: 'TRANSFER_OUT',
        referenceId: TEST_IDS.TRANSFER,
        referenceType: 'TRANSFER',
      };
      vi.mocked(mockRepository.create).mockResolvedValue(
        createTestMovement({ type: 'TRANSFER_OUT', referenceId: TEST_IDS.TRANSFER }),
      );

      await service.recordMovement(TEST_IDS.TENANT, inputWithRef, TEST_IDS.USER);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceId: TEST_IDS.TRANSFER,
          referenceType: 'TRANSFER',
        }),
      );
    });

    it('státusz változás rögzítése', async () => {
      const statusChangeInput: CreateMovementInput = {
        ...validInput,
        type: 'STATUS_CHANGE',
        quantityChange: 0,
        previousStatus: 'AVAILABLE',
        newStatus: 'RESERVED',
      };
      vi.mocked(mockRepository.create).mockResolvedValue(
        createTestMovement({
          type: 'STATUS_CHANGE',
          previousStatus: 'AVAILABLE',
          newStatus: 'RESERVED',
        }),
      );

      await service.recordMovement(TEST_IDS.TENANT, statusChangeInput, TEST_IDS.USER);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'STATUS_CHANGE',
          previousStatus: 'AVAILABLE',
          newStatus: 'RESERVED',
        }),
      );
    });

    it('érvénytelen input esetén hiba', async () => {
      const invalidInput = {
        ...validInput,
        inventoryItemId: 'invalid-uuid',
      };

      await expect(
        service.recordMovement(TEST_IDS.TENANT, invalidInput as CreateMovementInput, TEST_IDS.USER),
      ).rejects.toThrow();
    });
  });

  // ============================================
  // RECORD MANY MOVEMENTS TESTS
  // ============================================

  describe('recordManyMovements', () => {
    it('több mozgás rögzítése bulk', async () => {
      const movements = [
        {
          inventoryItemId: TEST_IDS.ITEM,
          warehouseId: TEST_IDS.WAREHOUSE,
          productId: TEST_IDS.PRODUCT,
          type: 'RECEIPT' as const,
          sourceModule: 'INVENTORY' as const,
          quantityChange: 10,
          previousQuantity: 0,
          unit: 'db',
        },
        {
          inventoryItemId: TEST_IDS.ITEM,
          warehouseId: TEST_IDS.WAREHOUSE,
          productId: TEST_IDS.PRODUCT,
          type: 'RECEIPT' as const,
          sourceModule: 'INVENTORY' as const,
          quantityChange: 5,
          previousQuantity: 10,
          unit: 'db',
        },
      ];
      vi.mocked(mockRepository.createMany).mockResolvedValue(2);

      const result = await service.recordManyMovements(
        TEST_IDS.TENANT,
        movements,
        TEST_IDS.USER,
      );

      expect(result).toBe(2);
      expect(mockRepository.createMany).toHaveBeenCalled();
    });
  });

  // ============================================
  // QUERY TESTS
  // ============================================

  describe('query', () => {
    it('mozgások lekérdezése szűrőkkel', async () => {
      const movements = [createTestMovement(), createTestMovement({ id: TEST_IDS.MOVEMENT_2 })];
      vi.mocked(mockRepository.query).mockResolvedValue({
        movements,
        total: 2,
        offset: 0,
        limit: 20,
      });

      const result = await service.query({
        tenantId: TEST_IDS.TENANT,
        warehouseId: TEST_IDS.WAREHOUSE,
      });

      expect(result.movements).toHaveLength(2);
    });

    it('típus szerinti szűrés', async () => {
      vi.mocked(mockRepository.query).mockResolvedValue({
        movements: [createTestMovement({ type: 'RECEIPT' })],
        total: 1,
        offset: 0,
        limit: 20,
      });

      await service.query({
        tenantId: TEST_IDS.TENANT,
        type: 'RECEIPT',
      });

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'RECEIPT' }),
      );
    });

    it('dátum szűrés', async () => {
      const dateFrom = new Date('2026-01-01');
      const dateTo = new Date('2026-01-31');

      vi.mocked(mockRepository.query).mockResolvedValue({
        movements: [],
        total: 0,
        offset: 0,
        limit: 20,
      });

      await service.query({
        tenantId: TEST_IDS.TENANT,
        dateFrom,
        dateTo,
      });

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({ dateFrom, dateTo }),
      );
    });
  });

  // ============================================
  // HISTORY TESTS
  // ============================================

  describe('getHistory', () => {
    it('készlet tétel előzményeinek lekérdezése', async () => {
      const movements = [
        createTestMovement({ performedAt: new Date('2026-01-15') }),
        createTestMovement({ id: TEST_IDS.MOVEMENT_2, performedAt: new Date('2026-01-10') }),
      ];
      vi.mocked(mockRepository.getHistory).mockResolvedValue(movements);

      const result = await service.getHistory(TEST_IDS.ITEM, TEST_IDS.TENANT);

      expect(result).toHaveLength(2);
      expect(mockRepository.getHistory).toHaveBeenCalledWith(
        TEST_IDS.ITEM,
        TEST_IDS.TENANT,
        undefined,
      );
    });

    it('limit paraméterrel', async () => {
      vi.mocked(mockRepository.getHistory).mockResolvedValue([createTestMovement()]);

      await service.getHistory(TEST_IDS.ITEM, TEST_IDS.TENANT, 10);

      expect(mockRepository.getHistory).toHaveBeenCalledWith(TEST_IDS.ITEM, TEST_IDS.TENANT, 10);
    });
  });

  // ============================================
  // SUMMARY TESTS
  // ============================================

  describe('getSummary', () => {
    it('mozgás összesítés időszakra', async () => {
      const summary: MovementSummary = {
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        totalReceipts: 100,
        totalIssues: 50,
        totalTransfersOut: 10,
        totalTransfersIn: 15,
        positiveAdjustments: 5,
        negativeAdjustments: 3,
        totalScrapped: 2,
        netChange: 55,
      };
      vi.mocked(mockRepository.getSummary).mockResolvedValue(summary);

      const result = await service.getSummary(
        TEST_IDS.TENANT,
        TEST_IDS.WAREHOUSE,
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(result.totalReceipts).toBe(100);
      expect(result.netChange).toBe(55);
    });

    it('összes raktár összesítése', async () => {
      vi.mocked(mockRepository.getSummary).mockResolvedValue({
        periodStart: new Date(),
        periodEnd: new Date(),
        totalReceipts: 200,
        totalIssues: 100,
        totalTransfersOut: 0,
        totalTransfersIn: 0,
        positiveAdjustments: 0,
        negativeAdjustments: 0,
        totalScrapped: 0,
        netChange: 100,
      });

      await service.getSummary(
        TEST_IDS.TENANT,
        undefined, // összes raktár
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(mockRepository.getSummary).toHaveBeenCalledWith(
        TEST_IDS.TENANT,
        undefined,
        expect.any(Date),
        expect.any(Date),
      );
    });
  });

  // ============================================
  // LAST MOVEMENT TESTS
  // ============================================

  describe('getLastMovement', () => {
    it('utolsó mozgás lekérdezése', async () => {
      const lastMovement = createTestMovement({ performedAt: new Date() });
      vi.mocked(mockRepository.getLastMovement).mockResolvedValue(lastMovement);

      const result = await service.getLastMovement(TEST_IDS.ITEM, TEST_IDS.TENANT);

      expect(result).toEqual(lastMovement);
    });

    it('nincs mozgás esetén null', async () => {
      vi.mocked(mockRepository.getLastMovement).mockResolvedValue(null);

      const result = await service.getLastMovement(TEST_IDS.ITEM, TEST_IDS.TENANT);

      expect(result).toBeNull();
    });
  });

  // ============================================
  // HELPER METHOD TESTS
  // ============================================

  describe('calculateNewQuantity', () => {
    it('helyes új mennyiség számítás', () => {
      expect(service.calculateNewQuantity(10, 5)).toBe(15);
      expect(service.calculateNewQuantity(10, -3)).toBe(7);
      expect(service.calculateNewQuantity(0, 10)).toBe(10);
    });
  });
});
