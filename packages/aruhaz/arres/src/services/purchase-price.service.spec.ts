/**
 * Purchase Price Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PurchasePriceService } from './purchase-price.service';
import type {
  IPurchasePriceRepository,
  IProductPurchasePriceSummaryRepository,
  ISupplierRepository,
  IAuditService,
} from './purchase-price.service';
import type { IPurchasePriceRecord, IProductPurchasePrice } from '../interfaces/purchase-price.interface';

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
  });
});
