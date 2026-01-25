/**
 * Unit tests for PrismaWarehouseRepository
 * Story INV-S2: PrismaWarehouseRepository
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaWarehouseRepository } from './prisma-warehouse.repository';

// Mock Prisma Client
const mockPrismaClient = {
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
    findMany: vi.fn(),
    count: vi.fn(),
  },
  // CR-5: Add $transaction mock for warehouse create atomicity
  $transaction: vi.fn(async (callback: (tx: typeof mockPrismaClient) => Promise<unknown>) => {
    return callback(mockPrismaClient);
  }),
};

describe('PrismaWarehouseRepository', () => {
  let repository: PrismaWarehouseRepository;
  const tenantId = 'tenant-123';

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaWarehouseRepository(mockPrismaClient as never);
  });

  // ============================================
  // WAREHOUSE CRUD TESTS
  // ============================================

  describe('create()', () => {
    it('should create a warehouse with all fields', async () => {
      const warehouseData = {
        tenantId,
        code: 'WH-001',
        name: 'Main Warehouse',
        type: 'MAIN' as const,
        status: 'ACTIVE' as const,
        address: '123 Main St',
        city: 'Budapest',
        postalCode: '1234',
        contactName: 'John Doe',
        contactPhone: '+36-1-234-5678',
        contactEmail: 'john@example.com',
        isDefault: true,
        isDeleted: false,
      };

      const mockCreated = {
        id: 'wh-uuid-1',
        ...warehouseData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.warehouse.findFirst.mockResolvedValue(null); // No duplicate
      mockPrismaClient.warehouse.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaClient.warehouse.create.mockResolvedValue(mockCreated);

      const result = await repository.create(warehouseData);

      expect(result.id).toBe('wh-uuid-1');
      expect(result.code).toBe('WH-001');
      expect(result.name).toBe('Main Warehouse');
      expect(result.type).toBe('MAIN');
      expect(result.city).toBe('Budapest');
      expect(mockPrismaClient.warehouse.create).toHaveBeenCalled();
    });

    it('should clear other defaults when creating default warehouse', async () => {
      const warehouseData = {
        tenantId,
        code: 'WH-002',
        name: 'New Default',
        type: 'BRANCH' as const,
        status: 'ACTIVE' as const,
        isDefault: true,
        isDeleted: false,
      };

      mockPrismaClient.warehouse.findFirst.mockResolvedValue(null); // No duplicate
      mockPrismaClient.warehouse.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaClient.warehouse.create.mockResolvedValue({
        id: 'wh-uuid-2',
        ...warehouseData,
        address: null,
        city: null,
        postalCode: null,
        contactName: null,
        contactPhone: null,
        contactEmail: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await repository.create(warehouseData);

      expect(mockPrismaClient.warehouse.updateMany).toHaveBeenCalledWith({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    });

    it('should throw error on duplicate code within tenant', async () => {
      const warehouseData = {
        tenantId,
        code: 'WH-001',
        name: 'Duplicate Warehouse',
        type: 'BRANCH' as const,
        status: 'ACTIVE' as const,
        isDefault: false,
        isDeleted: false,
      };

      mockPrismaClient.warehouse.findFirst.mockResolvedValue({
        id: 'existing-wh',
        code: 'WH-001',
        tenantId,
      });

      await expect(repository.create(warehouseData)).rejects.toThrow(
        'Warehouse with code WH-001 already exists'
      );
    });
  });

  describe('findById()', () => {
    it('should return warehouse when found', async () => {
      const mockWarehouse = {
        id: 'wh-uuid-1',
        tenantId,
        code: 'WH-001',
        name: 'Main Warehouse',
        type: 'MAIN',
        status: 'ACTIVE',
        address: null,
        city: null,
        postalCode: null,
        contactName: null,
        contactPhone: null,
        contactEmail: null,
        isDefault: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.warehouse.findFirst.mockResolvedValue(mockWarehouse);

      const result = await repository.findById('wh-uuid-1', tenantId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('wh-uuid-1');
      expect(result?.code).toBe('WH-001');
    });

    it('should return null when not found', async () => {
      mockPrismaClient.warehouse.findFirst.mockResolvedValue(null);

      const result = await repository.findById('non-existent', tenantId);

      expect(result).toBeNull();
    });
  });

  describe('findByCode()', () => {
    it('should find warehouse by unique code', async () => {
      mockPrismaClient.warehouse.findFirst.mockResolvedValue({
        id: 'wh-uuid-1',
        tenantId,
        code: 'WH-001',
        name: 'Main Warehouse',
        type: 'MAIN',
        status: 'ACTIVE',
        address: null,
        city: null,
        postalCode: null,
        contactName: null,
        contactPhone: null,
        contactEmail: null,
        isDefault: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.findByCode('WH-001', tenantId);

      expect(result).not.toBeNull();
      expect(result?.code).toBe('WH-001');
    });
  });

  describe('findDefault()', () => {
    it('should return default warehouse', async () => {
      mockPrismaClient.warehouse.findFirst.mockResolvedValue({
        id: 'wh-uuid-1',
        tenantId,
        code: 'WH-001',
        name: 'Default Warehouse',
        type: 'MAIN',
        status: 'ACTIVE',
        address: null,
        city: null,
        postalCode: null,
        contactName: null,
        contactPhone: null,
        contactEmail: null,
        isDefault: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.findDefault(tenantId);

      expect(result).not.toBeNull();
      expect(result?.isDefault).toBe(true);
      expect(mockPrismaClient.warehouse.findFirst).toHaveBeenCalledWith({
        where: { tenantId, isDefault: true, isDeleted: false },
      });
    });
  });

  describe('query()', () => {
    it('should filter by type', async () => {
      mockPrismaClient.warehouse.findMany.mockResolvedValue([]);
      mockPrismaClient.warehouse.count.mockResolvedValue(0);

      await repository.query({ tenantId, type: 'BRANCH' });

      expect(mockPrismaClient.warehouse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'BRANCH' }),
        })
      );
    });

    it('should filter by multiple types', async () => {
      mockPrismaClient.warehouse.findMany.mockResolvedValue([]);
      mockPrismaClient.warehouse.count.mockResolvedValue(0);

      await repository.query({ tenantId, type: ['MAIN', 'BRANCH'] });

      expect(mockPrismaClient.warehouse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: { in: ['MAIN', 'BRANCH'] } }),
        })
      );
    });

    it('should filter by status', async () => {
      mockPrismaClient.warehouse.findMany.mockResolvedValue([]);
      mockPrismaClient.warehouse.count.mockResolvedValue(0);

      await repository.query({ tenantId, status: 'ACTIVE' });

      expect(mockPrismaClient.warehouse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        })
      );
    });

    it('should support pagination', async () => {
      mockPrismaClient.warehouse.findMany.mockResolvedValue([]);
      mockPrismaClient.warehouse.count.mockResolvedValue(100);

      const result = await repository.query({ tenantId, offset: 20, limit: 10 });

      expect(result.offset).toBe(20);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(100);
      expect(mockPrismaClient.warehouse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      );
    });

    it('should support search by name/code', async () => {
      mockPrismaClient.warehouse.findMany.mockResolvedValue([]);
      mockPrismaClient.warehouse.count.mockResolvedValue(0);

      await repository.query({ tenantId, search: 'main' });

      expect(mockPrismaClient.warehouse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: { contains: 'main', mode: 'insensitive' } }),
            ]),
          }),
        })
      );
    });
  });

  describe('update()', () => {
    it('should update allowed fields', async () => {
      mockPrismaClient.warehouse.findFirst.mockResolvedValue({
        id: 'wh-uuid-1',
        tenantId,
        isDeleted: false,
      });
      mockPrismaClient.warehouse.update.mockResolvedValue({
        id: 'wh-uuid-1',
        tenantId,
        code: 'WH-001',
        name: 'Updated Name',
        type: 'MAIN',
        status: 'ACTIVE',
        address: null,
        city: 'New City',
        postalCode: null,
        contactName: null,
        contactPhone: null,
        contactEmail: null,
        isDefault: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await repository.update('wh-uuid-1', tenantId, {
        name: 'Updated Name',
        city: 'New City',
      });

      expect(result.name).toBe('Updated Name');
      expect(result.city).toBe('New City');
    });

    it('should clear other defaults when setting new default', async () => {
      mockPrismaClient.warehouse.findFirst.mockResolvedValue({
        id: 'wh-uuid-2',
        tenantId,
        isDeleted: false,
      });
      mockPrismaClient.warehouse.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaClient.warehouse.update.mockResolvedValue({
        id: 'wh-uuid-2',
        tenantId,
        code: 'WH-002',
        name: 'New Default',
        type: 'BRANCH',
        status: 'ACTIVE',
        address: null,
        city: null,
        postalCode: null,
        contactName: null,
        contactPhone: null,
        contactEmail: null,
        isDefault: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await repository.update('wh-uuid-2', tenantId, { isDefault: true });

      expect(mockPrismaClient.warehouse.updateMany).toHaveBeenCalledWith({
        where: { tenantId, isDefault: true, id: { not: 'wh-uuid-2' } },
        data: { isDefault: false },
      });
    });

    it('should throw error when warehouse not found', async () => {
      mockPrismaClient.warehouse.findFirst.mockResolvedValue(null);

      await expect(
        repository.update('non-existent', tenantId, { name: 'New Name' })
      ).rejects.toThrow('Warehouse not found: non-existent');
    });
  });

  describe('delete()', () => {
    it('should soft delete warehouse when no inventory items', async () => {
      mockPrismaClient.warehouse.findFirst.mockResolvedValue({
        id: 'wh-uuid-1',
        tenantId,
        isDeleted: false,
      });
      mockPrismaClient.inventoryItem.count.mockResolvedValue(0);
      mockPrismaClient.warehouse.update.mockResolvedValue({});

      await repository.delete('wh-uuid-1', tenantId);

      expect(mockPrismaClient.warehouse.update).toHaveBeenCalledWith({
        where: { id: 'wh-uuid-1' },
        data: expect.objectContaining({
          isDeleted: true,
          isActive: false,
        }),
      });
    });

    it('should throw error when warehouse has inventory items', async () => {
      mockPrismaClient.warehouse.findFirst.mockResolvedValue({
        id: 'wh-uuid-1',
        tenantId,
        isDeleted: false,
      });
      mockPrismaClient.inventoryItem.count.mockResolvedValue(5);

      await expect(repository.delete('wh-uuid-1', tenantId)).rejects.toThrow(
        'Cannot delete warehouse with inventory items'
      );
    });

    it('should throw error when warehouse not found', async () => {
      mockPrismaClient.warehouse.findFirst.mockResolvedValue(null);

      await expect(repository.delete('non-existent', tenantId)).rejects.toThrow(
        'Warehouse not found: non-existent'
      );
    });
  });

  // ============================================
  // TRANSFER TESTS
  // ============================================

  describe('createTransfer()', () => {
    it('should create transfer with items', async () => {
      const transferData = {
        tenantId,
        transferCode: 'TR-001',
        sourceWarehouseId: 'wh-1',
        targetWarehouseId: 'wh-2',
        status: 'PENDING' as const,
        initiatedBy: 'user-1',
        initiatedAt: new Date(),
        items: [
          { inventoryItemId: 'item-1', quantity: 5, unit: 'db' },
          { inventoryItemId: 'item-2', quantity: 10, unit: 'db', serialNumber: 'SN-123' },
        ],
      };

      mockPrismaClient.inventoryTransfer.create.mockResolvedValue({
        id: 'tr-uuid-1',
        ...transferData,
        reason: null,
        completedBy: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: 'ti-1',
            inventoryItemId: 'item-1',
            quantity: 5,
            unit: 'db',
            serialNumber: null,
            note: null,
            transferId: 'tr-uuid-1',
          },
          {
            id: 'ti-2',
            inventoryItemId: 'item-2',
            quantity: 10,
            unit: 'db',
            serialNumber: 'SN-123',
            note: null,
            transferId: 'tr-uuid-1',
          },
        ],
      });

      const result = await repository.createTransfer(transferData);

      expect(result.id).toBe('tr-uuid-1');
      expect(result.transferCode).toBe('TR-001');
      expect(result.items).toHaveLength(2);
    });
  });

  describe('findTransferById()', () => {
    it('should return transfer with items', async () => {
      mockPrismaClient.inventoryTransfer.findFirst.mockResolvedValue({
        id: 'tr-uuid-1',
        tenantId,
        transferCode: 'TR-001',
        sourceWarehouseId: 'wh-1',
        targetWarehouseId: 'wh-2',
        status: 'PENDING',
        reason: null,
        initiatedBy: 'user-1',
        initiatedAt: new Date(),
        completedBy: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      });

      const result = await repository.findTransferById('tr-uuid-1', tenantId);

      expect(result).not.toBeNull();
      expect(result?.transferCode).toBe('TR-001');
    });
  });

  describe('queryTransfers()', () => {
    it('should filter by status', async () => {
      mockPrismaClient.inventoryTransfer.findMany.mockResolvedValue([]);
      mockPrismaClient.inventoryTransfer.count.mockResolvedValue(0);

      await repository.queryTransfers({ tenantId, status: 'PENDING' });

      expect(mockPrismaClient.inventoryTransfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        })
      );
    });

    it('should filter by date range', async () => {
      const dateFrom = new Date('2026-01-01');
      const dateTo = new Date('2026-01-31');

      mockPrismaClient.inventoryTransfer.findMany.mockResolvedValue([]);
      mockPrismaClient.inventoryTransfer.count.mockResolvedValue(0);

      await repository.queryTransfers({ tenantId, dateFrom, dateTo });

      expect(mockPrismaClient.inventoryTransfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            initiatedAt: { gte: dateFrom, lte: dateTo },
          }),
        })
      );
    });
  });

  describe('updateTransfer()', () => {
    it('should update transfer status', async () => {
      mockPrismaClient.inventoryTransfer.findFirst.mockResolvedValue({
        id: 'tr-uuid-1',
        tenantId,
        status: 'PENDING', // Valid to transition to IN_TRANSIT
        items: [],
      });
      mockPrismaClient.inventoryTransfer.update.mockResolvedValue({
        id: 'tr-uuid-1',
        tenantId,
        transferCode: 'TR-001',
        sourceWarehouseId: 'wh-1',
        targetWarehouseId: 'wh-2',
        status: 'IN_TRANSIT',
        reason: null,
        initiatedBy: 'user-1',
        initiatedAt: new Date(),
        completedBy: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      });

      const result = await repository.updateTransfer('tr-uuid-1', tenantId, {
        status: 'IN_TRANSIT',
      });

      expect(result.status).toBe('IN_TRANSIT');
    });

    it('should set completedAt when status is COMPLETED', async () => {
      mockPrismaClient.inventoryTransfer.findFirst.mockResolvedValue({
        id: 'tr-uuid-1',
        tenantId,
        status: 'IN_TRANSIT', // Must be IN_TRANSIT to transition to COMPLETED
        items: [],
      });
      mockPrismaClient.inventoryTransfer.update.mockResolvedValue({
        id: 'tr-uuid-1',
        tenantId,
        transferCode: 'TR-001',
        sourceWarehouseId: 'wh-1',
        targetWarehouseId: 'wh-2',
        status: 'COMPLETED',
        reason: null,
        initiatedBy: 'user-1',
        initiatedAt: new Date(),
        completedBy: 'user-2',
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      });

      await repository.updateTransfer('tr-uuid-1', tenantId, {
        status: 'COMPLETED',
        completedBy: 'user-2',
      });

      expect(mockPrismaClient.inventoryTransfer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            completedBy: 'user-2',
          }),
        })
      );
    });

    it('should throw error on invalid status transition', async () => {
      mockPrismaClient.inventoryTransfer.findFirst.mockResolvedValue({
        id: 'tr-uuid-1',
        tenantId,
        status: 'COMPLETED', // Cannot transition from COMPLETED
        items: [],
      });

      await expect(
        repository.updateTransfer('tr-uuid-1', tenantId, { status: 'PENDING' })
      ).rejects.toThrow('Invalid status transition: COMPLETED → PENDING');
    });

    it('should allow valid PENDING to IN_TRANSIT transition', async () => {
      mockPrismaClient.inventoryTransfer.findFirst.mockResolvedValue({
        id: 'tr-uuid-1',
        tenantId,
        status: 'PENDING',
        items: [],
      });
      mockPrismaClient.inventoryTransfer.update.mockResolvedValue({
        id: 'tr-uuid-1',
        tenantId,
        transferCode: 'TR-001',
        sourceWarehouseId: 'wh-1',
        targetWarehouseId: 'wh-2',
        status: 'IN_TRANSIT',
        reason: null,
        initiatedBy: 'user-1',
        initiatedAt: new Date(),
        completedBy: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      });

      const result = await repository.updateTransfer('tr-uuid-1', tenantId, {
        status: 'IN_TRANSIT',
      });

      expect(result.status).toBe('IN_TRANSIT');
    });
  });

  // ============================================
  // CROSS-WAREHOUSE TESTS
  // ============================================

  describe('getCrossWarehouseStock()', () => {
    it('should aggregate stock across warehouses', async () => {
      // CR-6: Include product relation for productName
      mockPrismaClient.inventoryItem.findMany.mockResolvedValue([
        {
          productId: 'prod-1',
          warehouseId: 'wh-1',
          quantity: 10,
          status: 'AVAILABLE',
          unit: 'db',
          warehouse: { id: 'wh-1', name: 'Warehouse 1', code: 'WH-1' },
          product: { name: 'Test Product' },
        },
        {
          productId: 'prod-1',
          warehouseId: 'wh-2',
          quantity: 5,
          status: 'AVAILABLE',
          unit: 'db',
          warehouse: { id: 'wh-2', name: 'Warehouse 2', code: 'WH-2' },
          product: { name: 'Test Product' },
        },
        {
          productId: 'prod-1',
          warehouseId: 'wh-1',
          quantity: 3,
          status: 'RESERVED',
          unit: 'db',
          warehouse: { id: 'wh-1', name: 'Warehouse 1', code: 'WH-1' },
          product: { name: 'Test Product' },
        },
      ]);

      const result = await repository.getCrossWarehouseStock(tenantId);

      expect(result).toHaveLength(1);
      expect(result[0]?.productId).toBe('prod-1');
      expect(result[0]?.totalQuantity).toBe(18);
      expect(result[0]?.warehouseBreakdown).toHaveLength(2);
    });

    it('should filter by productIds', async () => {
      mockPrismaClient.inventoryItem.findMany.mockResolvedValue([]);

      await repository.getCrossWarehouseStock(tenantId, ['prod-1', 'prod-2']);

      expect(mockPrismaClient.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId: { in: ['prod-1', 'prod-2'] },
          }),
        })
      );
    });
  });

  describe('hasInventoryItems()', () => {
    it('should return true when items exist', async () => {
      mockPrismaClient.inventoryItem.count.mockResolvedValue(5);

      const result = await repository.hasInventoryItems('wh-uuid-1', tenantId);

      expect(result).toBe(true);
    });

    it('should return false when no items exist', async () => {
      mockPrismaClient.inventoryItem.count.mockResolvedValue(0);

      const result = await repository.hasInventoryItems('wh-uuid-1', tenantId);

      expect(result).toBe(false);
    });
  });
});
