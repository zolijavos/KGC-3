/**
 * Margin Service Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IMarginReport } from '../interfaces/margin.interface';
import type { IProductPurchasePrice } from '../interfaces/purchase-price.interface';
import type {
  IAuditService,
  ICategoryRepository,
  IMarginReportRepository,
  IProductInfo,
  IProductRepository,
  IPurchasePriceSummaryRepository,
  ISalesRepository,
} from './margin.service';
import { MarginService } from './margin.service';

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
      findAll: vi.fn().mockResolvedValue([mockProduct]),
    };

    mockCategoryRepository = {
      findById: vi.fn().mockResolvedValue({ id: CATEGORY_ID, name: 'Test Category' }),
    };

    mockSalesRepository = {
      getSalesByProduct: vi.fn().mockResolvedValue({ quantitySold: 100, revenue: 150000 }),
      getSalesByCategory: vi
        .fn()
        .mockResolvedValue([{ productId: PRODUCT_ID, quantitySold: 100, revenue: 150000 }]),
      getSalesTrend: vi.fn().mockResolvedValue([
        { date: new Date('2026-01-01'), quantitySold: 10, revenue: 15000 },
        { date: new Date('2026-01-08'), quantitySold: 15, revenue: 22500 },
      ]),
      getAllSalesByPeriod: vi
        .fn()
        .mockResolvedValue([{ productId: PRODUCT_ID, quantitySold: 100, revenue: 150000 }]),
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
    it('should return top profitable products sorted by margin', async () => {
      const products = [
        { ...mockProduct, id: PRODUCT_ID, sellingPrice: 2000 },
        { ...mockProduct, id: PRODUCT_ID_2, sellingPrice: 1500 },
      ];
      const purchasePrices = [
        { ...mockPurchasePrice, productId: PRODUCT_ID, weightedAveragePrice: 1000 },
        { ...mockPurchasePrice, productId: PRODUCT_ID_2, weightedAveragePrice: 1200 },
      ];
      const sales = [
        { productId: PRODUCT_ID, quantitySold: 100, revenue: 200000 },
        { productId: PRODUCT_ID_2, quantitySold: 50, revenue: 75000 },
      ];

      mockProductRepository.findAll = vi.fn().mockResolvedValue(products);
      mockPurchasePriceRepository.findByProductIds = vi.fn().mockResolvedValue(purchasePrices);
      mockSalesRepository.getAllSalesByPeriod = vi.fn().mockResolvedValue(sales);

      const result = await service.getTopProfitableProducts(
        10,
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        TENANT_ID
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      // First product should have higher total margin
      expect(result[0]?.totalMargin).toBeGreaterThan(result[1]?.totalMargin ?? 0);
    });

    it('should limit results to requested count', async () => {
      const products = Array.from({ length: 10 }, (_, i) => ({
        ...mockProduct,
        id: `product-${i}`,
        sellingPrice: 1500 + i * 100,
      }));
      const sales = products.map(p => ({
        productId: p.id,
        quantitySold: 10,
        revenue: p.sellingPrice * 10,
      }));

      mockProductRepository.findAll = vi.fn().mockResolvedValue(products);
      mockSalesRepository.getAllSalesByPeriod = vi.fn().mockResolvedValue(sales);

      const result = await service.getTopProfitableProducts(
        5,
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        TENANT_ID
      );

      expect(result.length).toBe(5);
    });

    it('should return empty array for no products', async () => {
      mockProductRepository.findAll = vi.fn().mockResolvedValue([]);

      const result = await service.getTopProfitableProducts(10, new Date(), new Date(), TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should return empty array when no tenantId provided', async () => {
      const result = await service.getTopProfitableProducts(10, new Date(), new Date());

      expect(result).toEqual([]);
    });

    it('should exclude products with no sales', async () => {
      mockSalesRepository.getAllSalesByPeriod = vi.fn().mockResolvedValue([]);

      const result = await service.getTopProfitableProducts(
        10,
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        TENANT_ID
      );

      expect(result.length).toBe(0);
    });
  });

  describe('getLowMarginProducts', () => {
    it('should return products below margin threshold', async () => {
      // Mock product with low margin (36% which is above 10% threshold)
      const result = await service.getLowMarginProducts(
        50,
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        TENANT_ID
      );

      expect(Array.isArray(result)).toBe(true);
      // Product has 36% margin, so should be included when threshold is 50%
      expect(result.length).toBe(1);
    });

    it('should filter by threshold percentage', async () => {
      // Set threshold high enough to include test product
      const result = await service.getLowMarginProducts(
        50,
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        TENANT_ID
      );

      for (const product of result) {
        expect(product.marginPercent).toBeLessThan(50);
      }
    });

    it('should return empty array when all products above threshold', async () => {
      // Set threshold to 0 (impossible for any product to be below)
      const result = await service.getLowMarginProducts(0, new Date(), new Date(), TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should return empty array when no tenantId provided', async () => {
      const result = await service.getLowMarginProducts(50, new Date(), new Date());

      expect(result).toEqual([]);
    });

    it('should sort by margin percent ascending (worst first)', async () => {
      const products = [
        { ...mockProduct, id: PRODUCT_ID, sellingPrice: 1100 }, // 100 margin = 9% margin
        { ...mockProduct, id: PRODUCT_ID_2, sellingPrice: 1500 }, // 540 margin = 36% margin
      ];
      const purchasePrices = [
        { ...mockPurchasePrice, productId: PRODUCT_ID, weightedAveragePrice: 1000 },
        { ...mockPurchasePrice, productId: PRODUCT_ID_2, weightedAveragePrice: 960 },
      ];

      mockProductRepository.findAll = vi.fn().mockResolvedValue(products);
      mockPurchasePriceRepository.findByProductIds = vi.fn().mockResolvedValue(purchasePrices);
      mockSalesRepository.getAllSalesByPeriod = vi.fn().mockResolvedValue([]);

      const result = await service.getLowMarginProducts(
        50,
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        TENANT_ID
      );

      expect(result.length).toBe(2);
      expect(result[0]?.marginPercent).toBeLessThan(result[1]?.marginPercent ?? 100);
    });

    it('should include negative margin products', async () => {
      const products = [
        { ...mockProduct, id: PRODUCT_ID, sellingPrice: 800 }, // Negative margin
      ];
      const purchasePrices = [
        { ...mockPurchasePrice, productId: PRODUCT_ID, weightedAveragePrice: 1000 },
      ];

      mockProductRepository.findAll = vi.fn().mockResolvedValue(products);
      mockPurchasePriceRepository.findByProductIds = vi.fn().mockResolvedValue(purchasePrices);
      mockSalesRepository.getAllSalesByPeriod = vi.fn().mockResolvedValue([]);

      const result = await service.getLowMarginProducts(
        50,
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        TENANT_ID
      );

      expect(result.length).toBe(1);
      expect(result[0]?.marginPercent).toBeLessThan(0);
    });
  });

  describe('calculateMargin - edge cases', () => {
    it('should handle zero selling price', async () => {
      mockProductRepository.findById = vi.fn().mockResolvedValue({
        ...mockProduct,
        sellingPrice: 0,
      });

      const result = await service.calculateMargin(PRODUCT_ID);

      expect(result.marginAmount).toBe(-960);
      // Zero selling price with purchase cost = -100% margin
      expect(result.marginPercent).toBe(-100);
    });

    it('should handle equal prices (zero margin)', async () => {
      mockProductRepository.findById = vi.fn().mockResolvedValue({
        ...mockProduct,
        sellingPrice: 960,
      });

      const result = await service.calculateMargin(PRODUCT_ID);

      expect(result.marginAmount).toBe(0);
      expect(result.marginPercent).toBe(0);
      expect(result.markupPercent).toBe(0);
    });

    it('should handle negative margin (loss)', async () => {
      mockProductRepository.findById = vi.fn().mockResolvedValue({
        ...mockProduct,
        sellingPrice: 800,
      });

      const result = await service.calculateMargin(PRODUCT_ID);

      expect(result.marginAmount).toBe(-160);
      expect(result.marginPercent).toBeLessThan(0);
    });

    it('should handle very high margin', async () => {
      mockPurchasePriceRepository.findByProductId = vi.fn().mockResolvedValue({
        ...mockPurchasePrice,
        weightedAveragePrice: 100,
      });

      const result = await service.calculateMargin(PRODUCT_ID);

      expect(result.marginAmount).toBe(1400);
      expect(result.marginPercent).toBeCloseTo(93.33, 1);
    });
  });

  describe('calculateMargins - edge cases', () => {
    it('should handle empty product list', async () => {
      mockProductRepository.findByIds = vi.fn().mockResolvedValue([]);

      const result = await service.calculateMargins([]);

      expect(result.size).toBe(0);
    });

    it('should handle products without purchase prices', async () => {
      mockPurchasePriceRepository.findByProductIds = vi.fn().mockResolvedValue([]);

      const result = await service.calculateMargins([PRODUCT_ID]);

      expect(result.has(PRODUCT_ID)).toBe(true);
      expect(result.get(PRODUCT_ID)?.purchasePrice).toBe(0);
    });

    it('should handle mixed products with and without prices', async () => {
      mockProductRepository.findByIds = vi
        .fn()
        .mockResolvedValue([mockProduct, { ...mockProduct, id: PRODUCT_ID_2 }]);
      mockPurchasePriceRepository.findByProductIds = vi.fn().mockResolvedValue([mockPurchasePrice]);

      const result = await service.calculateMargins([PRODUCT_ID, PRODUCT_ID_2]);

      expect(result.size).toBe(2);
      expect(result.get(PRODUCT_ID)?.purchasePrice).toBe(960);
      expect(result.get(PRODUCT_ID_2)?.purchasePrice).toBe(0);
    });
  });

  describe('getProductMarginSummary - edge cases', () => {
    it('should handle zero sales', async () => {
      mockSalesRepository.getSalesByProduct = vi.fn().mockResolvedValue({
        quantitySold: 0,
        revenue: 0,
      });

      const result = await service.getProductMarginSummary(
        PRODUCT_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.quantitySold).toBe(0);
      expect(result.totalMargin).toBe(0);
    });

    it('should handle high volume sales', async () => {
      mockSalesRepository.getSalesByProduct = vi.fn().mockResolvedValue({
        quantitySold: 10000,
        revenue: 15000000,
      });

      const result = await service.getProductMarginSummary(
        PRODUCT_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.quantitySold).toBe(10000);
      expect(result.totalMargin).toBe(5400000);
    });
  });

  describe('getCategoryMarginSummary - edge cases', () => {
    it('should handle empty category', async () => {
      mockProductRepository.findByCategoryId = vi.fn().mockResolvedValue([]);
      mockSalesRepository.getSalesByCategory = vi.fn().mockResolvedValue([]);

      const result = await service.getCategoryMarginSummary(
        CATEGORY_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.productCount).toBe(0);
      expect(result.totalMargin).toBe(0);
      expect(result.averageMarginPercent).toBe(0);
    });

    it('should handle category with products but no sales', async () => {
      mockSalesRepository.getSalesByCategory = vi.fn().mockResolvedValue([]);

      const result = await service.getCategoryMarginSummary(
        CATEGORY_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result.totalRevenue).toBe(0);
      expect(result.totalMargin).toBe(0);
    });
  });

  describe('generateMarginReport - edge cases', () => {
    it('should validate tenant ID format', async () => {
      const input = {
        tenantId: 'invalid-uuid',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        groupBy: 'PRODUCT' as const,
      };

      await expect(service.generateMarginReport(input)).rejects.toThrow();
    });

    it('should generate report with category grouping', async () => {
      const input = {
        tenantId: TENANT_ID,
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        groupBy: 'CATEGORY' as const,
      };

      const result = await service.generateMarginReport(input);

      expect(result).toBeDefined();
    });

    it('should handle single day period', async () => {
      const date = new Date('2026-01-15');
      const input = {
        tenantId: TENANT_ID,
        periodStart: date,
        periodEnd: date,
        groupBy: 'PRODUCT' as const,
      };

      // Mock returns the dates from input
      mockReportRepository.create = vi.fn().mockImplementation(report => Promise.resolve(report));

      const result = await service.generateMarginReport(input);

      expect(result.periodStart).toEqual(date);
      expect(result.periodEnd).toEqual(date);
    });
  });

  describe('exportMarginReport - formats', () => {
    it('should export valid CSV content', async () => {
      const result = await service.exportMarginReport(REPORT_ID, 'CSV');
      const content = result.toString('utf-8');

      expect(content).toContain('Cikk;Beszerzési ár;Eladási ár');
    });

    it('should throw error for PDF format', async () => {
      await expect(service.exportMarginReport(REPORT_ID, 'PDF')).rejects.toThrow(
        'PDF export még nincs implementálva'
      );
    });
  });

  describe('getMarginTrend - edge cases', () => {
    it('should handle DAY granularity', async () => {
      const result = await service.getMarginTrend(
        PRODUCT_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        'DAY'
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle MONTH granularity', async () => {
      const result = await service.getMarginTrend(
        PRODUCT_ID,
        new Date('2026-01-01'),
        new Date('2026-12-31'),
        'MONTH'
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty sales trend', async () => {
      mockSalesRepository.getSalesTrend = vi.fn().mockResolvedValue([]);

      const result = await service.getMarginTrend(
        PRODUCT_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        'WEEK'
      );

      expect(result).toHaveLength(0);
    });

    it('should calculate margin correctly for each period', async () => {
      mockSalesRepository.getSalesTrend = vi
        .fn()
        .mockResolvedValue([{ date: new Date('2026-01-01'), quantitySold: 10, revenue: 15000 }]);

      const result = await service.getMarginTrend(
        PRODUCT_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        'DAY'
      );

      expect(result[0]?.marginPercent).toBeDefined();
      expect(result[0]?.marginAmount).toBe(15000 - 960 * 10);
    });
  });
});
