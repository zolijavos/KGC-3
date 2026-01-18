/**
 * Margin Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarginService } from './margin.service';
import type {
  IProductRepository,
  ICategoryRepository,
  ISalesRepository,
  IPurchasePriceSummaryRepository,
  IMarginReportRepository,
  IAuditService,
  IProductInfo,
} from './margin.service';
import type { IProductPurchasePrice } from '../interfaces/purchase-price.interface';
import type { IMarginReport } from '../interfaces/margin.interface';

// Valid UUIDs for testing
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440002';
const PRODUCT_ID_2 = '550e8400-e29b-41d4-a716-446655440003';
const CATEGORY_ID = '550e8400-e29b-41d4-a716-446655440004';
const SUPPLIER_ID = '550e8400-e29b-41d4-a716-446655440005';
const REPORT_ID = '550e8400-e29b-41d4-a716-446655440006';

describe('MarginService', () => {
  let service: MarginService;
  let mockProductRepository: IProductRepository;
  let mockCategoryRepository: ICategoryRepository;
  let mockSalesRepository: ISalesRepository;
  let mockPurchasePriceRepository: IPurchasePriceSummaryRepository;
  let mockReportRepository: IMarginReportRepository;
  let mockAuditService: IAuditService;

  const mockProduct: IProductInfo = {
    id: PRODUCT_ID,
    name: 'Test Product',
    categoryId: CATEGORY_ID,
    sellingPrice: 1500,
  };

  const mockPurchasePrice: IProductPurchasePrice = {
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

  const mockReport: IMarginReport = {
    id: REPORT_ID,
    tenantId: TENANT_ID,
    periodStart: new Date('2026-01-01'),
    periodEnd: new Date('2026-01-31'),
    totalRevenue: 150000,
    totalCost: 96000,
    totalMargin: 54000,
    averageMarginPercent: 36,
    productSummaries: [],
    categorySummaries: [],
    generatedAt: new Date(),
  };

  beforeEach(() => {
    mockProductRepository = {
      findById: vi.fn().mockResolvedValue(mockProduct),
      findByIds: vi.fn().mockResolvedValue([mockProduct]),
      findByCategoryId: vi.fn().mockResolvedValue([mockProduct]),
    };

    mockCategoryRepository = {
      findById: vi.fn().mockResolvedValue({ id: CATEGORY_ID, name: 'Test Category' }),
    };

    mockSalesRepository = {
      getSalesByProduct: vi.fn().mockResolvedValue({ quantitySold: 100, revenue: 150000 }),
      getSalesByCategory: vi.fn().mockResolvedValue([
        { productId: PRODUCT_ID, quantitySold: 100, revenue: 150000 },
      ]),
      getSalesTrend: vi.fn().mockResolvedValue([
        { date: new Date('2026-01-01'), quantitySold: 10, revenue: 15000 },
        { date: new Date('2026-01-08'), quantitySold: 15, revenue: 22500 },
      ]),
    };

    mockPurchasePriceRepository = {
      findByProductId: vi.fn().mockResolvedValue(mockPurchasePrice),
      findByProductIds: vi.fn().mockResolvedValue([mockPurchasePrice]),
    };

    mockReportRepository = {
      create: vi.fn().mockResolvedValue(mockReport),
      findById: vi.fn().mockResolvedValue(mockReport),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new MarginService(
      mockProductRepository as unknown as IProductRepository,
      mockCategoryRepository as unknown as ICategoryRepository,
      mockSalesRepository as unknown as ISalesRepository,
      mockPurchasePriceRepository as unknown as IPurchasePriceSummaryRepository,
      mockReportRepository as unknown as IMarginReportRepository,
      mockAuditService as unknown as IAuditService
    );
  });

  describe('calculateMargin', () => {
    it('should calculate margin for product', async () => {
      const result = await service.calculateMargin(PRODUCT_ID);

      expect(result.productId).toBe(PRODUCT_ID);
      expect(result.purchasePrice).toBe(960); // weightedAveragePrice
      expect(result.sellingPrice).toBe(1500);
      expect(result.marginAmount).toBe(540); // 1500 - 960
      expect(result.marginPercent).toBe(36); // 540/1500 * 100
      expect(result.markupPercent).toBeCloseTo(56.25, 1); // 540/960 * 100
    });

    it('should throw error for unknown product', async () => {
      mockProductRepository.findById = vi.fn().mockResolvedValue(null);
      const unknownId = '550e8400-e29b-41d4-a716-446655449999';

      await expect(service.calculateMargin(unknownId)).rejects.toThrow('Termék nem található');
    });

    it('should handle product with no purchase history', async () => {
      mockPurchasePriceRepository.findByProductId = vi.fn().mockResolvedValue(null);

      const result = await service.calculateMargin(PRODUCT_ID);

      expect(result.purchasePrice).toBe(0);
      expect(result.marginPercent).toBe(100); // All selling price is margin
    });
  });

  describe('calculateMargins', () => {
    it('should calculate margins for multiple products', async () => {
      const result = await service.calculateMargins([PRODUCT_ID, PRODUCT_ID_2]);

      expect(result instanceof Map).toBe(true);
      expect(result.has(PRODUCT_ID)).toBe(true);
    });
  });

  describe('getProductMarginSummary', () => {
    it('should return product margin summary', async () => {
      const result = await service.getProductMarginSummary(
        PRODUCT_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.productId).toBe(PRODUCT_ID);
      expect(result.productName).toBe('Test Product');
      expect(result.quantitySold).toBe(100);
      expect(result.revenue).toBe(150000);
      expect(result.totalMargin).toBe(54000); // (1500-960) * 100
    });

    it('should throw error for unknown product', async () => {
      mockProductRepository.findById = vi.fn().mockResolvedValue(null);
      const unknownId = '550e8400-e29b-41d4-a716-446655449999';

      await expect(
        service.getProductMarginSummary(unknownId, new Date(), new Date())
      ).rejects.toThrow('Termék nem található');
    });
  });

  describe('getCategoryMarginSummary', () => {
    it('should return category margin summary', async () => {
      const result = await service.getCategoryMarginSummary(
        CATEGORY_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.categoryId).toBe(CATEGORY_ID);
      expect(result.categoryName).toBe('Test Category');
      expect(result.productCount).toBe(1);
    });

    it('should throw error for unknown category', async () => {
      mockCategoryRepository.findById = vi.fn().mockResolvedValue(null);
      const unknownId = '550e8400-e29b-41d4-a716-446655449999';

      await expect(
        service.getCategoryMarginSummary(unknownId, new Date(), new Date())
      ).rejects.toThrow('Kategória nem található');
    });
  });

  describe('generateMarginReport', () => {
    it('should generate margin report', async () => {
      const input = {
        tenantId: TENANT_ID,
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        groupBy: 'PRODUCT' as const,
      };

      const result = await service.generateMarginReport(input);

      expect(result).toBeDefined();
      expect(mockReportRepository.create).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'MARGIN_REPORT_GENERATED',
        'MarginReport',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should throw error for invalid date range', async () => {
      const input = {
        tenantId: TENANT_ID,
        periodStart: new Date('2026-01-31'),
        periodEnd: new Date('2026-01-01'), // Invalid: end before start
        groupBy: 'PRODUCT' as const,
      };

      await expect(service.generateMarginReport(input)).rejects.toThrow();
    });
  });

  describe('exportMarginReport', () => {
    it('should export report as CSV', async () => {
      const result = await service.exportMarginReport(REPORT_ID, 'CSV');

      expect(result instanceof Buffer).toBe(true);
    });

    it('should throw error for unknown report', async () => {
      mockReportRepository.findById = vi.fn().mockResolvedValue(null);
      const unknownId = '550e8400-e29b-41d4-a716-446655449999';

      await expect(service.exportMarginReport(unknownId, 'CSV')).rejects.toThrow(
        'Riport nem található'
      );
    });

    it('should throw error for unsupported format', async () => {
      await expect(service.exportMarginReport(REPORT_ID, 'XLSX')).rejects.toThrow(
        'XLSX export még nincs implementálva'
      );
    });
  });

  describe('getMarginTrend', () => {
    it('should return margin trend', async () => {
      const result = await service.getMarginTrend(
        PRODUCT_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        'WEEK'
      );

      expect(result).toHaveLength(2);
      expect(result[0]?.marginPercent).toBeDefined();
      expect(result[0]?.marginAmount).toBeDefined();
    });

    it('should throw error for unknown product', async () => {
      mockProductRepository.findById = vi.fn().mockResolvedValue(null);
      const unknownId = '550e8400-e29b-41d4-a716-446655449999';

      await expect(
        service.getMarginTrend(unknownId, new Date(), new Date(), 'DAY')
      ).rejects.toThrow('Termék nem található');
    });
  });

  describe('getTopProfitableProducts', () => {
    it('should return empty array (placeholder)', async () => {
      const result = await service.getTopProfitableProducts(10, new Date(), new Date());

      expect(result).toEqual([]);
    });
  });

  describe('getLowMarginProducts', () => {
    it('should return empty array (placeholder)', async () => {
      const result = await service.getLowMarginProducts(10, new Date(), new Date());

      expect(result).toEqual([]);
    });
  });
});
