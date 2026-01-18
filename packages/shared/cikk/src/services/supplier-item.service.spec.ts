/**
 * SupplierItemService unit tests
 * Story 8-3: Beszállító Kapcsolat és Import
 */

import { Decimal } from '@prisma/client/runtime/library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PriceChangeSource } from '../interfaces/supplier.interface';
import { SupplierItemService } from './supplier-item.service';

// Mock Prisma client
const mockPrismaSupplierItem = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
};

const mockPrismaSupplierItemPriceHistory = {
  create: vi.fn(),
};

const mockPrismaSupplier = {
  findFirst: vi.fn(),
};

const mockPrismaItem = {
  findFirst: vi.fn(),
};

const mockPrisma = {
  supplierItem: mockPrismaSupplierItem,
  supplierItemPriceHistory: mockPrismaSupplierItemPriceHistory,
  supplier: mockPrismaSupplier,
  item: mockPrismaItem,
  $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) => callback(mockPrisma)),
};

// Mock audit logger
const mockAuditLogger = {
  log: vi.fn(),
};

describe('SupplierItemService', () => {
  let service: SupplierItemService;
  const tenantId = 'tenant-123';
  const userId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SupplierItemService(mockPrisma as never, mockAuditLogger as never);
  });

  describe('linkItemToSupplier', () => {
    it('should create supplier-item link with valid input', async () => {
      const input = {
        supplierId: 'supplier-123',
        itemId: 'item-456',
        supplierCode: 'MA-12345',
        costPrice: 45000,
        currency: 'HUF' as const,
        leadTimeDays: 5,
        minOrderQty: 10,
        isPrimary: true,
      };

      mockPrismaSupplier.findFirst.mockResolvedValue({ id: 'supplier-123', tenantId });
      mockPrismaItem.findFirst.mockResolvedValue({ id: 'item-456', tenantId });
      mockPrismaSupplierItem.findFirst.mockResolvedValue(null);
      mockPrismaSupplierItem.create.mockResolvedValue({
        id: 'si-uuid',
        tenantId,
        ...input,
        costPrice: new Decimal(45000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaSupplierItemPriceHistory.create.mockResolvedValue({});

      const result = await service.linkItemToSupplier(tenantId, input, userId);

      expect(result.id).toBe('si-uuid');
      expect(result.supplierCode).toBe('MA-12345');
      expect(mockPrismaSupplierItem.create).toHaveBeenCalled();
      expect(mockPrismaSupplierItemPriceHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          costPrice: 45000,
          source: PriceChangeSource.MANUAL,
        }),
      });
    });

    it('should throw error if supplier not found', async () => {
      mockPrismaSupplier.findFirst.mockResolvedValue(null);

      await expect(
        service.linkItemToSupplier(
          tenantId,
          {
            supplierId: 'non-existent',
            itemId: 'item-456',
            supplierCode: 'MA-123',
            costPrice: 1000,
          },
          userId
        )
      ).rejects.toThrow('Beszállító nem található');
    });

    it('should throw error if item not found', async () => {
      mockPrismaSupplier.findFirst.mockResolvedValue({ id: 'supplier-123', tenantId });
      mockPrismaItem.findFirst.mockResolvedValue(null);

      await expect(
        service.linkItemToSupplier(
          tenantId,
          {
            supplierId: 'supplier-123',
            itemId: 'non-existent',
            supplierCode: 'MA-123',
            costPrice: 1000,
          },
          userId
        )
      ).rejects.toThrow('Cikk nem található');
    });

    it('should throw error if link already exists', async () => {
      mockPrismaSupplier.findFirst.mockResolvedValue({ id: 'supplier-123', tenantId });
      mockPrismaItem.findFirst.mockResolvedValue({ id: 'item-456', tenantId });
      mockPrismaSupplierItem.findFirst.mockResolvedValue({ id: 'existing-link' });

      await expect(
        service.linkItemToSupplier(
          tenantId,
          {
            supplierId: 'supplier-123',
            itemId: 'item-456',
            supplierCode: 'MA-123',
            costPrice: 1000,
          },
          userId
        )
      ).rejects.toThrow('Cikk-beszállító kapcsolat már létezik');
    });

    it('should clear other primary flags when setting isPrimary', async () => {
      const input = {
        supplierId: 'supplier-123',
        itemId: 'item-456',
        supplierCode: 'MA-123',
        costPrice: 1000,
        isPrimary: true,
      };

      mockPrismaSupplier.findFirst.mockResolvedValue({ id: 'supplier-123', tenantId });
      mockPrismaItem.findFirst.mockResolvedValue({ id: 'item-456', tenantId });
      mockPrismaSupplierItem.findFirst.mockResolvedValue(null);
      mockPrismaSupplierItem.create.mockResolvedValue({
        id: 'si-uuid',
        tenantId,
        ...input,
        costPrice: new Decimal(1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaSupplierItemPriceHistory.create.mockResolvedValue({});

      await service.linkItemToSupplier(tenantId, input, userId);

      expect(mockPrismaSupplierItem.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          itemId: 'item-456',
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    });

    it('should reject empty supplierCode', async () => {
      const input = {
        supplierId: 'supplier-123',
        itemId: 'item-456',
        supplierCode: '  ',
        costPrice: 1000,
      };

      await expect(service.linkItemToSupplier(tenantId, input, userId)).rejects.toThrow(
        'A beszállítói cikkszám kötelező'
      );
    });

    it('should reject negative costPrice', async () => {
      const input = {
        supplierId: 'supplier-123',
        itemId: 'item-456',
        supplierCode: 'MA-123',
        costPrice: -100,
      };

      await expect(service.linkItemToSupplier(tenantId, input, userId)).rejects.toThrow(
        'A beszerzési ár nem lehet negatív'
      );
    });

    it('should reject negative leadTimeDays', async () => {
      const input = {
        supplierId: 'supplier-123',
        itemId: 'item-456',
        supplierCode: 'MA-123',
        costPrice: 1000,
        leadTimeDays: -5,
      };

      await expect(service.linkItemToSupplier(tenantId, input, userId)).rejects.toThrow(
        'A szállítási idő nem lehet negatív'
      );
    });

    it('should reject zero minOrderQty', async () => {
      const input = {
        supplierId: 'supplier-123',
        itemId: 'item-456',
        supplierCode: 'MA-123',
        costPrice: 1000,
        minOrderQty: 0,
      };

      await expect(service.linkItemToSupplier(tenantId, input, userId)).rejects.toThrow(
        'A minimum rendelési mennyiség legalább 1 kell legyen'
      );
    });
  });

  describe('updateSupplierItem', () => {
    it('should update supplier item fields', async () => {
      const existing = {
        id: 'si-123',
        tenantId,
        supplierId: 'supplier-123',
        itemId: 'item-456',
        supplierCode: 'MA-123',
        costPrice: new Decimal(1000),
        currency: 'HUF',
        isPrimary: false,
      };

      mockPrismaSupplierItem.findFirst.mockResolvedValue(existing);
      mockPrismaSupplierItem.update.mockResolvedValue({
        ...existing,
        costPrice: new Decimal(1500),
        leadTimeDays: 3,
      });
      mockPrismaSupplierItemPriceHistory.create.mockResolvedValue({});

      await service.updateSupplierItem(
        'si-123',
        tenantId,
        { costPrice: 1500, leadTimeDays: 3 },
        userId
      );

      expect(mockPrismaSupplierItem.update).toHaveBeenCalled();
      expect(mockPrismaSupplierItemPriceHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          costPrice: 1500,
          source: PriceChangeSource.MANUAL,
        }),
      });
    });

    it('should not create price history if price unchanged', async () => {
      const existing = {
        id: 'si-123',
        tenantId,
        costPrice: new Decimal(1000),
        currency: 'HUF',
      };

      mockPrismaSupplierItem.findFirst.mockResolvedValue(existing);
      mockPrismaSupplierItem.update.mockResolvedValue({
        ...existing,
        leadTimeDays: 3,
      });

      await service.updateSupplierItem('si-123', tenantId, { leadTimeDays: 3 }, userId);

      expect(mockPrismaSupplierItemPriceHistory.create).not.toHaveBeenCalled();
    });

    it('should reject invalid UUID format in update', async () => {
      await expect(
        service.updateSupplierItem('invalid-id', tenantId, { costPrice: 1500 }, userId)
      ).rejects.toThrow('Érvénytelen kapcsolat ID formátum');
    });

    it('should reject empty supplierCode in update', async () => {
      await expect(
        service.updateSupplierItem(
          '550e8400-e29b-41d4-a716-446655440000',
          tenantId,
          { supplierCode: '  ' },
          userId
        )
      ).rejects.toThrow('A beszállítói cikkszám nem lehet üres');
    });

    it('should reject negative costPrice in update', async () => {
      await expect(
        service.updateSupplierItem(
          '550e8400-e29b-41d4-a716-446655440000',
          tenantId,
          { costPrice: -500 },
          userId
        )
      ).rejects.toThrow('A beszerzési ár nem lehet negatív');
    });
  });

  describe('unlinkItemFromSupplier', () => {
    it('should delete the supplier-item link', async () => {
      mockPrismaSupplierItem.findFirst.mockResolvedValue({
        id: 'si-123',
        tenantId,
        supplierId: 'supplier-123',
        itemId: 'item-456',
      });
      mockPrismaSupplierItem.delete.mockResolvedValue({});

      await service.unlinkItemFromSupplier('si-123', tenantId, userId);

      expect(mockPrismaSupplierItem.delete).toHaveBeenCalledWith({
        where: { id: 'si-123' },
      });
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUPPLIER_ITEM_UNLINKED',
        })
      );
    });

    it('should throw error if link not found', async () => {
      mockPrismaSupplierItem.findFirst.mockResolvedValue(null);

      await expect(
        service.unlinkItemFromSupplier('non-existent', tenantId, userId)
      ).rejects.toThrow('Cikk-beszállító kapcsolat nem található');
    });
  });

  describe('getSupplierItems', () => {
    it('should return items for a supplier', async () => {
      const items = [
        { id: 'si-1', supplierCode: 'MA-001', costPrice: new Decimal(1000) },
        { id: 'si-2', supplierCode: 'MA-002', costPrice: new Decimal(2000) },
      ];

      mockPrismaSupplierItem.findMany.mockResolvedValue(items);

      const result = await service.getSupplierItems('supplier-123', tenantId);

      expect(result).toHaveLength(2);
      expect(mockPrismaSupplierItem.findMany).toHaveBeenCalledWith({
        where: {
          supplierId: 'supplier-123',
          tenantId,
        },
        include: {
          item: {
            select: { id: true, code: true, name: true, barcode: true },
          },
        },
        orderBy: { supplierCode: 'asc' },
      });
    });
  });

  describe('getItemSuppliers', () => {
    it('should return suppliers for an item', async () => {
      const suppliers = [
        { id: 'si-1', supplierId: 'sup-1', costPrice: new Decimal(1000), isPrimary: true },
        { id: 'si-2', supplierId: 'sup-2', costPrice: new Decimal(1200), isPrimary: false },
      ];

      mockPrismaSupplierItem.findMany.mockResolvedValue(suppliers);

      const result = await service.getItemSuppliers('item-456', tenantId);

      expect(result).toHaveLength(2);
      expect(mockPrismaSupplierItem.findMany).toHaveBeenCalledWith({
        where: {
          itemId: 'item-456',
          tenantId,
        },
        include: {
          supplier: true,
        },
        orderBy: [{ isPrimary: 'desc' }, { costPrice: 'asc' }],
      });
    });
  });

  describe('setPrimarySupplier', () => {
    it('should set a supplier-item as primary and clear others', async () => {
      const existing = {
        id: 'si-123',
        tenantId,
        itemId: 'item-456',
        isPrimary: false,
      };

      mockPrismaSupplierItem.findFirst.mockResolvedValue(existing);
      mockPrismaSupplierItem.update.mockResolvedValue({ ...existing, isPrimary: true });

      const result = await service.setPrimarySupplier('si-123', tenantId, userId);

      expect(result.isPrimary).toBe(true);
      expect(mockPrismaSupplierItem.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          itemId: 'item-456',
          isPrimary: true,
          NOT: { id: 'si-123' },
        },
        data: { isPrimary: false },
      });
    });

    it('should throw error if supplier-item not found', async () => {
      mockPrismaSupplierItem.findFirst.mockResolvedValue(null);

      await expect(service.setPrimarySupplier('non-existent', tenantId, userId)).rejects.toThrow(
        'Cikk-beszállító kapcsolat nem található'
      );
    });
  });
});
