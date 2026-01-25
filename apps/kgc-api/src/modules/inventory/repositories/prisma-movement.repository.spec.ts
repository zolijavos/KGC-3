/**
 * Unit tests for PrismaMovementRepository
 * Story INV-S4: PrismaMovementRepository
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaMovementRepository } from './prisma-movement.repository';

// Mock Prisma Client
const mockPrismaClient = {
  stockMovement: {
    create: vi.fn(),
    createMany: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

describe('PrismaMovementRepository', () => {
  let repository: PrismaMovementRepository;
  const tenantId = 'tenant-123';
  const inventoryItemId = 'item-456';

  const mockInventoryItem = {
    warehouseId: 'wh-1',
    productId: 'prod-1',
    serialNumber: 'SN-123',
    batchNumber: null,
    unit: 'db',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaMovementRepository(mockPrismaClient as never);
  });

  // ============================================
  // CRUD TESTS
  // ============================================

  describe('create()', () => {
    it('should create a movement record', async () => {
      const movementData = {
        tenantId,
        inventoryItemId,
        warehouseId: 'wh-1',
        productId: 'prod-1',
        type: 'RECEIPT' as const,
        sourceModule: 'MANUAL' as const,
        quantityChange: 10,
        previousQuantity: 0,
        newQuantity: 10,
        unit: 'db',
        performedBy: 'user-1',
        performedAt: new Date(),
      };

      // Prisma returns Prisma MovementType (IN), which gets mapped to interface type (RECEIPT)
      mockPrismaClient.stockMovement.create.mockResolvedValue({
        id: 'mov-uuid-1',
        tenantId,
        inventoryItemId,
        type: 'IN', // Prisma type
        quantity: 10,
        reason: null,
        fromWarehouseId: null,
        toWarehouseId: null,
        fromLocationCode: null,
        toLocationCode: null,
        referenceType: null,
        referenceId: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        inventoryItem: mockInventoryItem,
      });

      const result = await repository.create(movementData);

      expect(result.id).toBe('mov-uuid-1');
      expect(result.type).toBe('RECEIPT'); // Mapped back to interface type
      expect(result.quantityChange).toBe(10);
    });

    it('should map previousLocationCode and newLocationCode', async () => {
      const movementData = {
        tenantId,
        inventoryItemId,
        warehouseId: 'wh-1',
        productId: 'prod-1',
        type: 'TRANSFER_IN' as const,
        sourceModule: 'TRANSFER' as const,
        quantityChange: 5,
        previousQuantity: 0,
        newQuantity: 5,
        unit: 'db',
        previousLocationCode: 'K1-P1-D1',
        newLocationCode: 'K2-P1-D1',
        performedBy: 'user-1',
        performedAt: new Date(),
      };

      // Prisma returns TRANSFER type for TRANSFER_IN interface type
      mockPrismaClient.stockMovement.create.mockResolvedValue({
        id: 'mov-uuid-2',
        tenantId,
        inventoryItemId,
        type: 'TRANSFER', // Prisma type
        quantity: 5,
        reason: null,
        fromWarehouseId: null,
        toWarehouseId: null,
        fromLocationCode: 'K1-P1-D1',
        toLocationCode: 'K2-P1-D1',
        referenceType: null,
        referenceId: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        inventoryItem: mockInventoryItem,
      });

      const result = await repository.create(movementData);

      expect(result.previousLocationCode).toBe('K1-P1-D1');
      expect(result.newLocationCode).toBe('K2-P1-D1');
    });
  });

  describe('createMany()', () => {
    it('should bulk create movements', async () => {
      mockPrismaClient.stockMovement.createMany.mockResolvedValue({ count: 5 });

      const movements = Array.from({ length: 5 }, (_, i) => ({
        tenantId,
        inventoryItemId: `item-${i}`,
        warehouseId: 'wh-1',
        productId: 'prod-1',
        type: 'RECEIPT' as const,
        sourceModule: 'MANUAL' as const,
        quantityChange: 1,
        previousQuantity: 0,
        newQuantity: 1,
        unit: 'db',
        performedBy: 'user-1',
        performedAt: new Date(),
      }));

      const count = await repository.createMany(movements);

      expect(count).toBe(5);
    });

    it('should return 0 for empty array', async () => {
      const count = await repository.createMany([]);

      expect(count).toBe(0);
      expect(mockPrismaClient.stockMovement.createMany).not.toHaveBeenCalled();
    });
  });

  describe('findById()', () => {
    it('should return movement when found', async () => {
      // Prisma returns OUT type for ISSUE interface type
      mockPrismaClient.stockMovement.findFirst.mockResolvedValue({
        id: 'mov-uuid-1',
        tenantId,
        inventoryItemId,
        type: 'OUT', // Prisma type
        quantity: -3,
        reason: 'Sold',
        fromWarehouseId: null,
        toWarehouseId: null,
        fromLocationCode: null,
        toLocationCode: null,
        referenceType: 'INVOICE',
        referenceId: 'inv-123',
        createdBy: 'user-1',
        createdAt: new Date(),
        inventoryItem: mockInventoryItem,
      });

      const result = await repository.findById('mov-uuid-1', tenantId);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('ISSUE'); // Mapped back to interface type
      expect(result?.referenceType).toBe('INVOICE');
    });

    it('should return null when not found', async () => {
      mockPrismaClient.stockMovement.findFirst.mockResolvedValue(null);

      const result = await repository.findById('non-existent', tenantId);

      expect(result).toBeNull();
    });
  });

  // ============================================
  // QUERY TESTS
  // ============================================

  describe('query()', () => {
    it('should filter by type', async () => {
      mockPrismaClient.stockMovement.findMany.mockResolvedValue([]);
      mockPrismaClient.stockMovement.count.mockResolvedValue(0);

      // Query with interface type RECEIPT, which maps to Prisma type IN
      await repository.query({ tenantId, type: 'RECEIPT' });

      expect(mockPrismaClient.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'IN' }), // Mapped to Prisma type
        })
      );
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date('2026-01-01');
      const dateTo = new Date('2026-01-31');

      mockPrismaClient.stockMovement.findMany.mockResolvedValue([]);
      mockPrismaClient.stockMovement.count.mockResolvedValue(0);

      await repository.query({ tenantId, dateFrom, dateTo });

      expect(mockPrismaClient.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: dateFrom, lte: dateTo },
          }),
        })
      );
    });

    it('should support pagination', async () => {
      mockPrismaClient.stockMovement.findMany.mockResolvedValue([]);
      mockPrismaClient.stockMovement.count.mockResolvedValue(100);

      const result = await repository.query({ tenantId, offset: 20, limit: 10 });

      expect(result.offset).toBe(20);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(100);
    });

    it('should filter by referenceId', async () => {
      mockPrismaClient.stockMovement.findMany.mockResolvedValue([]);
      mockPrismaClient.stockMovement.count.mockResolvedValue(0);

      await repository.query({ tenantId, referenceId: 'ref-123' });

      expect(mockPrismaClient.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ referenceId: 'ref-123' }),
        })
      );
    });
  });

  // ============================================
  // HISTORY/SUMMARY TESTS
  // ============================================

  describe('getHistory()', () => {
    it('should return movements in chronological order', async () => {
      // Use Prisma MovementType values in mock
      const movements = [
        {
          id: 'mov-1',
          tenantId,
          inventoryItemId,
          type: 'IN', // Prisma type
          quantity: 10,
          reason: null,
          fromWarehouseId: null,
          toWarehouseId: null,
          fromLocationCode: null,
          toLocationCode: null,
          referenceType: null,
          referenceId: null,
          createdBy: 'user-1',
          createdAt: new Date('2026-01-01'),
          inventoryItem: mockInventoryItem,
        },
        {
          id: 'mov-2',
          tenantId,
          inventoryItemId,
          type: 'OUT', // Prisma type
          quantity: -3,
          reason: null,
          fromWarehouseId: null,
          toWarehouseId: null,
          fromLocationCode: null,
          toLocationCode: null,
          referenceType: null,
          referenceId: null,
          createdBy: 'user-1',
          createdAt: new Date('2026-01-02'),
          inventoryItem: mockInventoryItem,
        },
      ];

      mockPrismaClient.stockMovement.findMany.mockResolvedValue(movements);

      const result = await repository.getHistory(inventoryItemId, tenantId);

      expect(result).toHaveLength(2);
      expect(mockPrismaClient.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        })
      );
    });

    it('should respect limit parameter', async () => {
      mockPrismaClient.stockMovement.findMany.mockResolvedValue([]);

      await repository.getHistory(inventoryItemId, tenantId, 10);

      expect(mockPrismaClient.stockMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });
  });

  describe('getSummary()', () => {
    it('should aggregate by movement type', async () => {
      // Using Prisma MovementType values: IN, OUT, TRANSFER, ADJUSTMENT, RESERVATION, RELEASE
      mockPrismaClient.stockMovement.findMany.mockResolvedValue([
        { type: 'IN', quantity: 100 }, // Receipt
        { type: 'IN', quantity: 50 }, // Receipt
        { type: 'OUT', quantity: 30 }, // Issue (positive = issue, negative = scrap)
        { type: 'TRANSFER', quantity: -20 }, // Transfer out (negative)
        { type: 'TRANSFER', quantity: 20 }, // Transfer in (positive)
        { type: 'ADJUSTMENT', quantity: 5 }, // Positive adjustment
        { type: 'ADJUSTMENT', quantity: -3 }, // Negative adjustment
        { type: 'OUT', quantity: -10 }, // Scrap (negative OUT)
        { type: 'RESERVATION', quantity: 15 }, // Reservation → issues
        { type: 'RELEASE', quantity: 8 }, // Release → receipts
      ]);

      const periodStart = new Date('2026-01-01');
      const periodEnd = new Date('2026-01-31');

      const result = await repository.getSummary(tenantId, 'wh-1', periodStart, periodEnd);

      // IN(100+50) + RELEASE(8) = 158
      expect(result.totalReceipts).toBe(158);
      // OUT positive(30) + RESERVATION(15) = 45
      expect(result.totalIssues).toBe(45);
      // TRANSFER negative = 20
      expect(result.totalTransfersOut).toBe(20);
      // TRANSFER positive = 20
      expect(result.totalTransfersIn).toBe(20);
      expect(result.positiveAdjustments).toBe(5);
      expect(result.negativeAdjustments).toBe(3);
      // OUT negative = 10
      expect(result.totalScrapped).toBe(10);
      // 158 + 20 + 5 - 45 - 20 - 3 - 10 = 105
      expect(result.netChange).toBe(105);
    });
  });

  describe('getLastMovement()', () => {
    it('should return most recent movement', async () => {
      // Use Prisma MovementType in mock
      mockPrismaClient.stockMovement.findFirst.mockResolvedValue({
        id: 'mov-latest',
        tenantId,
        inventoryItemId,
        type: 'OUT', // Prisma type
        quantity: -1,
        reason: null,
        fromWarehouseId: null,
        toWarehouseId: null,
        fromLocationCode: null,
        toLocationCode: null,
        referenceType: null,
        referenceId: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        inventoryItem: mockInventoryItem,
      });

      const result = await repository.getLastMovement(inventoryItemId, tenantId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('mov-latest');
      expect(mockPrismaClient.stockMovement.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should return null when no movements exist', async () => {
      mockPrismaClient.stockMovement.findFirst.mockResolvedValue(null);

      const result = await repository.getLastMovement(inventoryItemId, tenantId);

      expect(result).toBeNull();
    });
  });
});
