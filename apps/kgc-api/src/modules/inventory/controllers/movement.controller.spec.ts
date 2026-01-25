/**
 * MovementController Unit Tests
 * Story 9-4: Készlet mozgás audit trail
 *
 * Note: Using direct instantiation instead of NestJS TestingModule
 * because the service has repository dependencies that complicate DI mocking.
 */

import type { MovementService } from '@kgc/inventory';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { MovementController } from './movement.controller';

type MockedMovementService = {
  [K in keyof MovementService]: Mock;
};

describe('MovementController', () => {
  let controller: MovementController;
  let mockMovementService: MockedMovementService;

  const mockRequest = {
    user: {
      id: 'user-123',
      tenantId: 'tenant-123',
      role: 'ADMIN',
    },
  };

  const mockMovement = {
    id: 'mov-1',
    tenantId: 'tenant-123',
    inventoryItemId: 'item-1',
    warehouseId: 'wh-1',
    productId: 'prod-1',
    type: 'RECEIPT' as const,
    sourceModule: 'MANUAL' as const,
    quantityChange: 10,
    previousQuantity: 0,
    newQuantity: 10,
    unit: 'db',
    performedBy: 'user-123',
    performedAt: new Date(),
    createdAt: new Date(),
  };

  const mockSummary = {
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-01-31'),
    totalReceipts: 100,
    totalIssues: 50,
    totalTransfersOut: 20,
    totalTransfersIn: 20,
    positiveAdjustments: 5,
    negativeAdjustments: 3,
    totalScrapped: 2,
    netChange: 50,
  };

  beforeEach(() => {
    mockMovementService = {
      queryMovements: vi.fn(),
      findById: vi.fn(),
      getHistory: vi.fn(),
      getSummary: vi.fn(),
      recordMovement: vi.fn(),
    } as unknown as MockedMovementService;

    // Direct instantiation with mock service
    controller = new MovementController(mockMovementService as unknown as MovementService);
  });

  describe('list', () => {
    it('should return list of movements', async () => {
      const queryResult = {
        movements: [mockMovement],
        total: 1,
        offset: 0,
        limit: 20,
      };
      mockMovementService.queryMovements.mockResolvedValue(queryResult);

      const result = await controller.list(mockRequest);

      expect(result).toEqual({ data: queryResult });
      expect(mockMovementService.queryMovements).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
      });
    });

    it('should pass filter parameters', async () => {
      const queryResult = { movements: [], total: 0, offset: 0, limit: 20 };
      mockMovementService.queryMovements.mockResolvedValue(queryResult);

      await controller.list(
        mockRequest,
        'item-1',
        'wh-1',
        'prod-1',
        'RECEIPT',
        'MANUAL',
        'ref-1',
        'SN123',
        'BN456',
        'user-123',
        '2026-01-01',
        '2026-01-31',
        'performedAt',
        'desc',
        '0',
        '50'
      );

      expect(mockMovementService.queryMovements).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        inventoryItemId: 'item-1',
        warehouseId: 'wh-1',
        productId: 'prod-1',
        type: 'RECEIPT',
        sourceModule: 'MANUAL',
        referenceId: 'ref-1',
        serialNumber: 'SN123',
        batchNumber: 'BN456',
        performedBy: 'user-123',
        dateFrom: new Date('2026-01-01'),
        dateTo: new Date('2026-01-31'),
        sortBy: 'performedAt',
        sortOrder: 'desc',
        offset: 0,
        limit: 50,
      });
    });
  });

  describe('findById', () => {
    it('should return movement by ID', async () => {
      mockMovementService.findById.mockResolvedValue(mockMovement);

      const result = await controller.findById(mockRequest, 'mov-1');

      expect(result).toEqual({ data: mockMovement });
    });

    it('should return error if not found', async () => {
      mockMovementService.findById.mockResolvedValue(null);

      const result = await controller.findById(mockRequest, 'invalid');

      expect(result).toEqual({
        error: { code: 'NOT_FOUND', message: 'Mozgás nem található' },
      });
    });
  });

  describe('getHistory', () => {
    it('should return movement history for item', async () => {
      const history = [mockMovement];
      mockMovementService.getHistory.mockResolvedValue(history);

      const result = await controller.getHistory(mockRequest, 'item-1');

      expect(result).toEqual({ data: history });
      expect(mockMovementService.getHistory).toHaveBeenCalledWith('item-1', 'tenant-123', 50);
    });

    it('should accept custom limit', async () => {
      mockMovementService.getHistory.mockResolvedValue([]);

      await controller.getHistory(mockRequest, 'item-1', '100');

      expect(mockMovementService.getHistory).toHaveBeenCalledWith('item-1', 'tenant-123', 100);
    });
  });

  describe('getSummary', () => {
    it('should return movement summary', async () => {
      mockMovementService.getSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSummary(mockRequest, 'wh-1', '2026-01-01', '2026-01-31');

      expect(result).toEqual({ data: mockSummary });
      expect(mockMovementService.getSummary).toHaveBeenCalledWith(
        'tenant-123',
        'wh-1',
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );
    });

    it('should return error if dates missing', async () => {
      const result = await controller.getSummary(mockRequest, 'wh-1');

      expect(result).toEqual({
        error: { code: 'VALIDATION_ERROR', message: 'periodStart és periodEnd kötelező' },
      });
    });

    it('should return error if start date after end date', async () => {
      const result = await controller.getSummary(mockRequest, 'wh-1', '2026-02-01', '2026-01-01');

      expect(result).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A kezdő dátum nem lehet később mint a záró dátum',
        },
      });
    });

    it('should return error for invalid date format', async () => {
      const result = await controller.getSummary(mockRequest, 'wh-1', 'invalid', 'invalid');

      expect(result).toEqual({
        error: { code: 'VALIDATION_ERROR', message: 'Érvénytelen dátum formátum' },
      });
    });
  });

  describe('create', () => {
    it('should record movement', async () => {
      mockMovementService.recordMovement.mockResolvedValue(mockMovement);

      const input = {
        inventoryItemId: 'item-1',
        warehouseId: 'wh-1',
        productId: 'prod-1',
        type: 'RECEIPT' as const,
        sourceModule: 'MANUAL' as const,
        quantityChange: 10,
        previousQuantity: 0,
        unit: 'db',
      };
      const result = await controller.create(mockRequest, input);

      expect(result).toEqual({ data: mockMovement });
      expect(mockMovementService.recordMovement).toHaveBeenCalledWith(
        'tenant-123',
        input,
        'user-123'
      );
    });

    it('should return error on validation failure', async () => {
      mockMovementService.recordMovement.mockRejectedValue(
        new Error('Negatív készletmódosításnál kötelező az indoklás megadása')
      );

      const input = {
        inventoryItemId: 'item-1',
        warehouseId: 'wh-1',
        productId: 'prod-1',
        type: 'ISSUE' as const,
        sourceModule: 'MANUAL' as const,
        quantityChange: -5,
        previousQuantity: 10,
        unit: 'db',
      };
      const result = await controller.create(mockRequest, input);

      expect(result).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Negatív készletmódosításnál kötelező az indoklás megadása',
        },
      });
    });
  });
});
