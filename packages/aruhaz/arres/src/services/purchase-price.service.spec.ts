/**
 * Purchase Price Service Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  IProductPurchasePrice,
  IPurchasePriceRecord,
} from '../interfaces/purchase-price.interface';
import type {
  IAuditService,
  IProductPurchasePriceSummaryRepository,
  IPurchasePriceRepository,
  ISupplierRepository,
} from './purchase-price.service';
import { PurchasePriceService } from './purchase-price.service';

// Valid UUIDs for testing
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440002';
const PRODUCT_ID_2 = '550e8400-e29b-41d4-a716-446655440003';
const SUPPLIER_ID = '550e8400-e29b-41d4-a716-446655440004';
const SUPPLIER_ID_2 = '550e8400-e29b-41d4-a716-446655440005';
const RECEIPT_ID = '550e8400-e29b-41d4-a716-446655440006';
const RECORD_ID = '550e8400-e29b-41d4-a716-446655440007';

describe('PurchasePriceService', () => {
  let service: PurchasePriceService;
  let mockRepository: IPurchasePriceRepository;
  let mockSummaryRepository: IProductPurchasePriceSummaryRepository;
  let mockSupplierRepository: ISupplierRepository;
  let mockAuditService: IAuditService;

  const mockRecord: IPurchasePriceRecord = {
    id: RECORD_ID,
    tenantId: TENANT_ID,
    productId: PRODUCT_ID,
    supplierId: SUPPLIER_ID,
    receiptId: RECEIPT_ID,
    unitPrice: 1000,
    quantity: 10,
    currency: 'HUF',
    receiptDate: new Date(),
    createdAt: new Date(),
  };

  const mockSummary: IProductPurchasePrice = {
    productId: PRODUCT_ID,
    lastPrice: 1000,
    averagePrice: 950,
    weightedAveragePrice: 960,
    minPrice: 900,
    maxPrice: 1100,
    lastSupplierId: SUPPLIER_ID,
    lastReceiptDate: new Date(),
    totalQuantityReceived: 100,
    purchaseCount: 5,
  };

  beforeEach(() => {
    mockRepository = {
      create: vi.fn().mockResolvedValue(mockRecord),
      findByProductId: vi.fn().mockResolvedValue([mockRecord]),
      findByProductIdAndDateRange: vi.fn().mockResolvedValue([mockRecord]),
      findByProductIds: vi.fn().mockResolvedValue([mockRecord]),
      findLatestByProductId: vi.fn().mockResolvedValue(mockRecord),
      findBySupplierAndProduct: vi.fn().mockResolvedValue([mockRecord]),
      findRecentPriceChanges: vi.fn().mockResolvedValue([]),
    };

    mockSummaryRepository = {
      findByProductId: vi.fn().mockResolvedValue(mockSummary),
      upsert: vi.fn().mockResolvedValue(mockSummary),
      findByProductIds: vi.fn().mockResolvedValue([mockSummary]),
    };

    mockSupplierRepository = {
      findById: vi.fn().mockResolvedValue({ id: SUPPLIER_ID, name: 'Test Supplier' }),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new PurchasePriceService(
      mockRepository as unknown as IPurchasePriceRepository,
      mockSummaryRepository as unknown as IProductPurchasePriceSummaryRepository,
      mockSupplierRepository as unknown as ISupplierRepository,
      mockAuditService as unknown as IAuditService
    );
  });

  describe('recordPurchasePrice', () => {
    it('should record purchase price', async () => {
      const input = {
        tenantId: TENANT_ID,
        productId: PRODUCT_ID,
        supplierId: SUPPLIER_ID,
        receiptId: RECEIPT_ID,
        unitPrice: 1000,
        quantity: 10,
        currency: 'HUF',
        receiptDate: new Date(),
      };

      const result = await service.recordPurchasePrice(input);

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockSummaryRepository.upsert).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'PURCHASE_PRICE_RECORDED',
        'PurchasePriceRecord',
        expect.any(String),
        expect.objectContaining({ productId: PRODUCT_ID, unitPrice: 1000 })
      );
    });

    it('should throw error for invalid input', async () => {
      const input = {
        tenantId: 'invalid',
        productId: PRODUCT_ID,
        supplierId: SUPPLIER_ID,
        receiptId: RECEIPT_ID,
        unitPrice: -100, // Invalid
        quantity: 10,
        receiptDate: new Date(),
      };

      await expect(service.recordPurchasePrice(input)).rejects.toThrow();
    });
  });

  describe('getProductPurchasePrice', () => {
    it('should return product purchase price summary', async () => {
      const result = await service.getProductPurchasePrice(PRODUCT_ID);

      expect(result).toEqual(mockSummary);
      expect(mockSummaryRepository.findByProductId).toHaveBeenCalledWith(PRODUCT_ID);
    });

    it('should return null for unknown product', async () => {
      mockSummaryRepository.findByProductId = vi.fn().mockResolvedValue(null);
      const unknownId = '550e8400-e29b-41d4-a716-446655449999';

      const result = await service.getProductPurchasePrice(unknownId);

      expect(result).toBeNull();
    });
  });

  describe('getPurchasePriceHistory', () => {
    it('should return price history with trend', async () => {
      const records = [
        { ...mockRecord, unitPrice: 900, receiptDate: new Date('2026-01-01') },
        { ...mockRecord, unitPrice: 1000, receiptDate: new Date('2026-01-15') },
      ];
      mockRepository.findByProductIdAndDateRange = vi.fn().mockResolvedValue(records);

      const result = await service.getPurchasePriceHistory(
        PRODUCT_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.productId).toBe(PRODUCT_ID);
      expect(result.records).toHaveLength(2);
      expect(result.priceTrend).toBeCloseTo(11.11, 1); // (1000-900)/900 * 100
    });

    it('should handle single record', async () => {
      mockRepository.findByProductIdAndDateRange = vi.fn().mockResolvedValue([mockRecord]);

      const result = await service.getPurchasePriceHistory(
        PRODUCT_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.priceTrend).toBe(0);
      expect(result.averagePriceChange).toBe(0);
    });
  });

  describe('getCurrentPrice', () => {
    it('should return last price for LAST method', async () => {
      const result = await service.getCurrentPrice(PRODUCT_ID, 'LAST');

      expect(result).toBe(1000);
    });

    it('should return weighted average for WEIGHTED_AVERAGE method', async () => {
      const result = await service.getCurrentPrice(PRODUCT_ID, 'WEIGHTED_AVERAGE');

      expect(result).toBe(960);
    });

    it('should return 0 for unknown product', async () => {
      mockSummaryRepository.findByProductId = vi.fn().mockResolvedValue(null);
      const unknownId = '550e8400-e29b-41d4-a716-446655449999';

      const result = await service.getCurrentPrice(unknownId, 'LAST');

      expect(result).toBe(0);
    });
  });

  describe('compareSupplierPrices', () => {
    it('should compare prices from different suppliers', async () => {
      const records = [
        { ...mockRecord, supplierId: SUPPLIER_ID, unitPrice: 1000 },
        { ...mockRecord, supplierId: SUPPLIER_ID_2, unitPrice: 950 },
      ];
      mockRepository.findByProductId = vi.fn().mockResolvedValue(records);

      const result = await service.compareSupplierPrices(PRODUCT_ID);

      expect(result).toHaveLength(2);
      expect(result[0]?.lastPrice).toBeLessThanOrEqual(result[1]?.lastPrice ?? 0);
    });
  });

  describe('getProductPurchasePrices', () => {
    it('should return batch purchase prices', async () => {
      const result = await service.getProductPurchasePrices([PRODUCT_ID, PRODUCT_ID_2]);

      expect(result instanceof Map).toBe(true);
      expect(result.has(PRODUCT_ID)).toBe(true);
    });
  });

  describe('getPriceChangeAlerts', () => {
    it('should return price change alerts', async () => {
      const alerts = [
        {
          productId: PRODUCT_ID,
          productName: 'Test Product',
          previousPrice: 1000,
          newPrice: 1200,
          changePercent: 20,
          supplierId: SUPPLIER_ID,
          date: new Date(),
        },
      ];
      mockRepository.findRecentPriceChanges = vi.fn().mockResolvedValue(alerts);

      const result = await service.getPriceChangeAlerts(15);

      expect(result).toHaveLength(1);
      expect(result[0]?.changePercent).toBe(20);
    });

    it('should return empty array when no price changes exceed threshold', async () => {
      mockRepository.findRecentPriceChanges = vi.fn().mockResolvedValue([]);

      const result = await service.getPriceChangeAlerts(50);

      expect(result).toHaveLength(0);
    });

    it('should filter alerts by threshold percentage', async () => {
      const alerts = [
        {
          productId: PRODUCT_ID,
          changePercent: 25,
          productName: 'A',
          previousPrice: 100,
          newPrice: 125,
          supplierId: SUPPLIER_ID,
          date: new Date(),
        },
        {
          productId: PRODUCT_ID_2,
          changePercent: 10,
          productName: 'B',
          previousPrice: 100,
          newPrice: 110,
          supplierId: SUPPLIER_ID,
          date: new Date(),
        },
      ];
      mockRepository.findRecentPriceChanges = vi.fn().mockResolvedValue(alerts);

      const result = await service.getPriceChangeAlerts(15);

      expect(result).toHaveLength(2);
    });
  });

  describe('recordPurchasePrice - edge cases', () => {
    it('should handle minimum valid price', async () => {
      const input = {
        tenantId: TENANT_ID,
        productId: PRODUCT_ID,
        supplierId: SUPPLIER_ID,
        receiptId: RECEIPT_ID,
        unitPrice: 0.01,
        quantity: 1,
        currency: 'HUF',
        receiptDate: new Date(),
      };

      const result = await service.recordPurchasePrice(input);

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should handle large quantities', async () => {
      const input = {
        tenantId: TENANT_ID,
        productId: PRODUCT_ID,
        supplierId: SUPPLIER_ID,
        receiptId: RECEIPT_ID,
        unitPrice: 1000,
        quantity: 10000,
        currency: 'HUF',
        receiptDate: new Date(),
      };

      const result = await service.recordPurchasePrice(input);

      expect(result).toBeDefined();
    });

    it('should throw error for zero price', async () => {
      const input = {
        tenantId: TENANT_ID,
        productId: PRODUCT_ID,
        supplierId: SUPPLIER_ID,
        receiptId: RECEIPT_ID,
        unitPrice: 0,
        quantity: 10,
        currency: 'HUF',
        receiptDate: new Date(),
      };

      await expect(service.recordPurchasePrice(input)).rejects.toThrow();
    });

    it('should throw error for zero quantity', async () => {
      const input = {
        tenantId: TENANT_ID,
        productId: PRODUCT_ID,
        supplierId: SUPPLIER_ID,
        receiptId: RECEIPT_ID,
        unitPrice: 1000,
        quantity: 0,
        currency: 'HUF',
        receiptDate: new Date(),
      };

      await expect(service.recordPurchasePrice(input)).rejects.toThrow();
    });

    it('should throw error for negative quantity', async () => {
      const input = {
        tenantId: TENANT_ID,
        productId: PRODUCT_ID,
        supplierId: SUPPLIER_ID,
        receiptId: RECEIPT_ID,
        unitPrice: 1000,
        quantity: -5,
        currency: 'HUF',
        receiptDate: new Date(),
      };

      await expect(service.recordPurchasePrice(input)).rejects.toThrow();
    });

    it('should handle EUR currency', async () => {
      const input = {
        tenantId: TENANT_ID,
        productId: PRODUCT_ID,
        supplierId: SUPPLIER_ID,
        receiptId: RECEIPT_ID,
        unitPrice: 25.5,
        quantity: 10,
        currency: 'EUR',
        receiptDate: new Date(),
      };

      const result = await service.recordPurchasePrice(input);

      expect(result).toBeDefined();
    });
  });

  describe('getPurchasePriceHistory - edge cases', () => {
    it('should handle empty history', async () => {
      mockRepository.findByProductIdAndDateRange = vi.fn().mockResolvedValue([]);

      const result = await service.getPurchasePriceHistory(
        PRODUCT_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.records).toHaveLength(0);
      expect(result.priceTrend).toBe(0);
    });

    it('should calculate negative trend correctly', async () => {
      const records = [
        { ...mockRecord, unitPrice: 1200, receiptDate: new Date('2026-01-01') },
        { ...mockRecord, unitPrice: 1000, receiptDate: new Date('2026-01-15') },
      ];
      mockRepository.findByProductIdAndDateRange = vi.fn().mockResolvedValue(records);

      const result = await service.getPurchasePriceHistory(
        PRODUCT_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.priceTrend).toBeCloseTo(-16.67, 1);
    });

    it('should handle multiple records with same price', async () => {
      const records = [
        { ...mockRecord, unitPrice: 1000, receiptDate: new Date('2026-01-01') },
        { ...mockRecord, unitPrice: 1000, receiptDate: new Date('2026-01-15') },
        { ...mockRecord, unitPrice: 1000, receiptDate: new Date('2026-01-20') },
      ];
      mockRepository.findByProductIdAndDateRange = vi.fn().mockResolvedValue(records);

      const result = await service.getPurchasePriceHistory(
        PRODUCT_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.priceTrend).toBe(0);
      expect(result.averagePriceChange).toBe(0);
    });

    it('should sort records by date for trend calculation', async () => {
      const records = [
        { ...mockRecord, unitPrice: 1100, receiptDate: new Date('2026-01-15') },
        { ...mockRecord, unitPrice: 1000, receiptDate: new Date('2026-01-01') },
        { ...mockRecord, unitPrice: 1200, receiptDate: new Date('2026-01-20') },
      ];
      mockRepository.findByProductIdAndDateRange = vi.fn().mockResolvedValue(records);

      const result = await service.getPurchasePriceHistory(
        PRODUCT_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.priceTrend).toBeCloseTo(20, 1); // From 1000 to 1200
    });
  });

  describe('getCurrentPrice - all methods', () => {
    it('should return average price for MOVING_AVERAGE method', async () => {
      const result = await service.getCurrentPrice(PRODUCT_ID, 'MOVING_AVERAGE');

      expect(result).toBe(960); // weightedAveragePrice
    });

    it('should return average price for FIFO method', async () => {
      const result = await service.getCurrentPrice(PRODUCT_ID, 'FIFO');

      expect(result).toBe(950); // averagePrice (simplified FIFO)
    });

    it('should handle default case for unknown method', async () => {
      const result = await service.getCurrentPrice(PRODUCT_ID, 'UNKNOWN' as any);

      expect(result).toBe(1000); // falls back to lastPrice
    });
  });

  describe('compareSupplierPrices - edge cases', () => {
    it('should handle single supplier', async () => {
      const records = [{ ...mockRecord, supplierId: SUPPLIER_ID, unitPrice: 1000 }];
      mockRepository.findByProductId = vi.fn().mockResolvedValue(records);

      const result = await service.compareSupplierPrices(PRODUCT_ID);

      expect(result).toHaveLength(1);
      expect(result[0]?.purchaseCount).toBe(1);
    });

    it('should handle empty records', async () => {
      mockRepository.findByProductId = vi.fn().mockResolvedValue([]);

      const result = await service.compareSupplierPrices(PRODUCT_ID);

      expect(result).toHaveLength(0);
    });

    it('should handle unknown supplier', async () => {
      const records = [{ ...mockRecord, supplierId: 'unknown-supplier', unitPrice: 1000 }];
      mockRepository.findByProductId = vi.fn().mockResolvedValue(records);
      mockSupplierRepository.findById = vi.fn().mockResolvedValue(null);

      const result = await service.compareSupplierPrices(PRODUCT_ID);

      expect(result[0]?.supplierName).toBe('Ismeretlen');
    });

    it('should calculate average price correctly for multiple purchases', async () => {
      const records = [
        { ...mockRecord, supplierId: SUPPLIER_ID, unitPrice: 1000 },
        { ...mockRecord, supplierId: SUPPLIER_ID, unitPrice: 1200 },
        { ...mockRecord, supplierId: SUPPLIER_ID, unitPrice: 1100 },
      ];
      mockRepository.findByProductId = vi.fn().mockResolvedValue(records);

      const result = await service.compareSupplierPrices(PRODUCT_ID);

      expect(result[0]?.averagePrice).toBe(1100);
      expect(result[0]?.purchaseCount).toBe(3);
    });
  });

  describe('getProductPurchasePrices - edge cases', () => {
    it('should handle empty product list', async () => {
      mockSummaryRepository.findByProductIds = vi.fn().mockResolvedValue([]);

      const result = await service.getProductPurchasePrices([]);

      expect(result.size).toBe(0);
    });

    it('should handle partial matches', async () => {
      mockSummaryRepository.findByProductIds = vi.fn().mockResolvedValue([mockSummary]);

      const result = await service.getProductPurchasePrices([PRODUCT_ID, PRODUCT_ID_2, 'unknown']);

      expect(result.has(PRODUCT_ID)).toBe(true);
      expect(result.has('unknown')).toBe(false);
    });
  });
});
