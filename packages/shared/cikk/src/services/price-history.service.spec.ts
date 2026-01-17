/**
 * PriceHistoryService unit tests
 * Story 8-3: Beszállító Kapcsolat és Import
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PriceHistoryService } from './price-history.service';
import { PriceChangeSource } from '../interfaces/supplier.interface';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma client
const mockPrismaSupplierItemPriceHistory = {
  create: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
};

const mockPrismaSupplierItem = {
  findFirst: vi.fn(),
  update: vi.fn(),
};

const mockPrisma = {
  supplierItemPriceHistory: mockPrismaSupplierItemPriceHistory,
  supplierItem: mockPrismaSupplierItem,
  $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) => callback(mockPrisma)),
};

describe('PriceHistoryService', () => {
  let service: PriceHistoryService;
  const tenantId = 'tenant-123';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PriceHistoryService(mockPrisma as never);
  });

  describe('recordPriceChange', () => {
    it('should record a price change in history', async () => {
      const supplierItemId = 'si-123';
      const newPrice = 55000;
      const currency = 'HUF';

      mockPrismaSupplierItem.findFirst.mockResolvedValue({
        id: supplierItemId,
        tenantId,
        costPrice: new Decimal(45000),
        currency: 'HUF',
      });

      mockPrismaSupplierItem.update.mockResolvedValue({
        id: supplierItemId,
        costPrice: new Decimal(newPrice),
      });

      mockPrismaSupplierItemPriceHistory.create.mockResolvedValue({
        id: 'history-uuid',
        tenantId,
        supplierItemId,
        costPrice: new Decimal(newPrice),
        currency,
        source: PriceChangeSource.MANUAL,
        effectiveFrom: new Date(),
        createdAt: new Date(),
      });

      await service.recordPriceChange(supplierItemId, newPrice, PriceChangeSource.MANUAL, tenantId);

      expect(mockPrismaSupplierItem.update).toHaveBeenCalledWith({
        where: { id: supplierItemId },
        data: { costPrice: newPrice },
      });

      expect(mockPrismaSupplierItemPriceHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          supplierItemId,
          costPrice: newPrice,
          source: PriceChangeSource.MANUAL,
        }),
      });
    });

    it('should throw error if supplier-item not found', async () => {
      mockPrismaSupplierItem.findFirst.mockResolvedValue(null);

      await expect(
        service.recordPriceChange('non-existent', 1000, PriceChangeSource.MANUAL, tenantId)
      ).rejects.toThrow('Cikk-beszállító kapcsolat nem található');
    });

    it('should record price change from CSV import', async () => {
      mockPrismaSupplierItem.findFirst.mockResolvedValue({
        id: 'si-123',
        tenantId,
        costPrice: new Decimal(1000),
        currency: 'HUF',
      });
      mockPrismaSupplierItem.update.mockResolvedValue({});
      mockPrismaSupplierItemPriceHistory.create.mockResolvedValue({});

      await service.recordPriceChange('si-123', 1500, PriceChangeSource.CSV_IMPORT, tenantId);

      expect(mockPrismaSupplierItemPriceHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: PriceChangeSource.CSV_IMPORT,
        }),
      });
    });

    it('should record price change from API sync', async () => {
      mockPrismaSupplierItem.findFirst.mockResolvedValue({
        id: 'si-123',
        tenantId,
        costPrice: new Decimal(1000),
        currency: 'HUF',
      });
      mockPrismaSupplierItem.update.mockResolvedValue({});
      mockPrismaSupplierItemPriceHistory.create.mockResolvedValue({});

      await service.recordPriceChange('si-123', 1500, PriceChangeSource.API_SYNC, tenantId);

      expect(mockPrismaSupplierItemPriceHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: PriceChangeSource.API_SYNC,
        }),
      });
    });
  });

  describe('getPriceHistory', () => {
    it('should return price history for supplier-item', async () => {
      const history = [
        {
          id: 'h-1',
          costPrice: new Decimal(55000),
          effectiveFrom: new Date('2026-01-15'),
          source: PriceChangeSource.MANUAL,
        },
        {
          id: 'h-2',
          costPrice: new Decimal(50000),
          effectiveFrom: new Date('2026-01-01'),
          source: PriceChangeSource.CSV_IMPORT,
        },
        {
          id: 'h-3',
          costPrice: new Decimal(45000),
          effectiveFrom: new Date('2025-12-01'),
          source: PriceChangeSource.MANUAL,
        },
      ];

      mockPrismaSupplierItemPriceHistory.findMany.mockResolvedValue(history);

      const result = await service.getPriceHistory('si-123', tenantId);

      expect(result).toHaveLength(3);
      expect(mockPrismaSupplierItemPriceHistory.findMany).toHaveBeenCalledWith({
        where: {
          supplierItemId: 'si-123',
          tenantId,
        },
        orderBy: { effectiveFrom: 'desc' },
      });
    });

    it('should filter by date range', async () => {
      mockPrismaSupplierItemPriceHistory.findMany.mockResolvedValue([]);

      const dateFrom = new Date('2026-01-01');
      const dateTo = new Date('2026-01-31');

      await service.getPriceHistory('si-123', tenantId, { from: dateFrom, to: dateTo });

      expect(mockPrismaSupplierItemPriceHistory.findMany).toHaveBeenCalledWith({
        where: {
          supplierItemId: 'si-123',
          tenantId,
          effectiveFrom: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        orderBy: { effectiveFrom: 'desc' },
      });
    });

    it('should return empty array for no history', async () => {
      mockPrismaSupplierItemPriceHistory.findMany.mockResolvedValue([]);

      const result = await service.getPriceHistory('si-123', tenantId);

      expect(result).toEqual([]);
    });
  });

  describe('getCurrentPrice', () => {
    it('should return current price from supplier-item', async () => {
      mockPrismaSupplierItem.findFirst.mockResolvedValue({
        id: 'si-123',
        tenantId,
        costPrice: new Decimal(55000),
        currency: 'HUF',
      });

      const result = await service.getCurrentPrice('si-123', tenantId);

      expect(result).toBe(55000);
    });

    it('should throw error if supplier-item not found', async () => {
      mockPrismaSupplierItem.findFirst.mockResolvedValue(null);

      await expect(service.getCurrentPrice('non-existent', tenantId)).rejects.toThrow(
        'Cikk-beszállító kapcsolat nem található'
      );
    });
  });
});
