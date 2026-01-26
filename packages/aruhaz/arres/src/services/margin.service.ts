/**
 * Margin Service - Story 23.2: Árrés Kalkuláció és Riport
 */

import { Inject } from '@nestjs/common';
import { GenerateMarginReportSchema } from '../dto/margin.dto';
import type {
  ICategoryMarginSummary,
  IMarginCalculation,
  IMarginReport,
  IMarginReportInput,
  IMarginService,
  IMarginTrendPoint,
  IProductMarginSummary,
} from '../interfaces/margin.interface';
import type { IProductPurchasePrice } from '../interfaces/purchase-price.interface';

/**
 * Product Repository interfész
 */
export interface IProductRepository {
  findById(id: string): Promise<IProductInfo | null>;
  findByIds(ids: string[]): Promise<IProductInfo[]>;
  findByCategoryId(categoryId: string): Promise<IProductInfo[]>;
  findAll(tenantId: string): Promise<IProductInfo[]>;
}

export interface IProductInfo {
  id: string;
  name: string;
  categoryId: string;
  sellingPrice: number;
}

/**
 * Category Repository interfész
 */
export interface ICategoryRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
}

/**
 * Sales Repository interfész (eladási adatok)
 */
export interface ISalesRepository {
  getSalesByProduct(
    productId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ quantitySold: number; revenue: number }>;
  getSalesByCategory(
    categoryId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Array<{ productId: string; quantitySold: number; revenue: number }>>;
  getSalesTrend(
    productId: string,
    periodStart: Date,
    periodEnd: Date,
    granularity: 'DAY' | 'WEEK' | 'MONTH'
  ): Promise<Array<{ date: Date; quantitySold: number; revenue: number }>>;
  getAllSalesByPeriod(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Array<{ productId: string; quantitySold: number; revenue: number }>>;
}

/**
 * Purchase Price Summary Repository interfész
 */
export interface IPurchasePriceSummaryRepository {
  findByProductId(productId: string): Promise<IProductPurchasePrice | null>;
  findByProductIds(productIds: string[]): Promise<IProductPurchasePrice[]>;
}

/**
 * Margin Report Repository interfész
 */
export interface IMarginReportRepository {
  create(report: IMarginReport): Promise<IMarginReport>;
  findById(id: string): Promise<IMarginReport | null>;
}

/**
 * Audit szolgáltatás interfész
 */
export interface IAuditService {
  log(
    event: string,
    entityType: string,
    entityId: string,
    data: Record<string, unknown>
  ): Promise<void>;
}

/**
 * Margin Service implementáció
 */
export class MarginService implements IMarginService {
  constructor(
    @Inject('PRODUCT_REPOSITORY')
    private readonly productRepository: IProductRepository,
    @Inject('CATEGORY_REPOSITORY')
    private readonly categoryRepository: ICategoryRepository,
    @Inject('SALES_REPOSITORY')
    private readonly salesRepository: ISalesRepository,
    @Inject('PURCHASE_PRICE_SUMMARY_REPOSITORY')
    private readonly purchasePriceRepository: IPurchasePriceSummaryRepository,
    @Inject('MARGIN_REPORT_REPOSITORY')
    private readonly reportRepository: IMarginReportRepository,
    @Inject('AUDIT_SERVICE')
    private readonly auditService: IAuditService
  ) {}

  /**
   * Árrés kalkuláció egy cikkre
   */
  async calculateMargin(productId: string): Promise<IMarginCalculation> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new Error('Termék nem található');
    }

    const purchasePrice = await this.purchasePriceRepository.findByProductId(productId);
    const avgPurchasePrice = purchasePrice?.weightedAveragePrice ?? 0;

    const marginAmount = product.sellingPrice - avgPurchasePrice;

    // Division by zero kezelése
    let marginPercent: number;
    if (product.sellingPrice === 0) {
      // Ha nincs eladási ár, árrés% nem értelmezhető
      marginPercent = avgPurchasePrice > 0 ? -100 : 0;
    } else if (avgPurchasePrice === 0) {
      // Ha nincs beszerzési ár, 100% árrés
      marginPercent = 100;
    } else {
      marginPercent = (marginAmount / product.sellingPrice) * 100;
    }

    const markupPercent = avgPurchasePrice > 0 ? (marginAmount / avgPurchasePrice) * 100 : 0;

    return {
      productId,
      purchasePrice: avgPurchasePrice,
      sellingPrice: product.sellingPrice,
      marginAmount,
      marginPercent,
      markupPercent,
      calculatedAt: new Date(),
    };
  }

  /**
   * Batch árrés kalkuláció
   */
  async calculateMargins(productIds: string[]): Promise<Map<string, IMarginCalculation>> {
    const products = await this.productRepository.findByIds(productIds);
    const purchasePrices = await this.purchasePriceRepository.findByProductIds(productIds);

    const purchasePriceMap = new Map<string, IProductPurchasePrice>();
    for (const pp of purchasePrices) {
      purchasePriceMap.set(pp.productId, pp);
    }

    const result = new Map<string, IMarginCalculation>();

    for (const product of products) {
      const purchasePrice = purchasePriceMap.get(product.id);
      const avgPurchasePrice = purchasePrice?.weightedAveragePrice ?? 0;

      const marginAmount = product.sellingPrice - avgPurchasePrice;
      const marginPercent =
        avgPurchasePrice > 0 ? (marginAmount / product.sellingPrice) * 100 : 100;
      const markupPercent = avgPurchasePrice > 0 ? (marginAmount / avgPurchasePrice) * 100 : 0;

      result.set(product.id, {
        productId: product.id,
        purchasePrice: avgPurchasePrice,
        sellingPrice: product.sellingPrice,
        marginAmount,
        marginPercent,
        markupPercent,
        calculatedAt: new Date(),
      });
    }

    return result;
  }

  /**
   * Cikk árrés összesítő lekérdezése
   */
  async getProductMarginSummary(
    productId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<IProductMarginSummary> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new Error('Termék nem található');
    }

    const purchasePrice = await this.purchasePriceRepository.findByProductId(productId);
    const avgPurchasePrice = purchasePrice?.weightedAveragePrice ?? 0;

    const sales = await this.salesRepository.getSalesByProduct(productId, periodStart, periodEnd);

    const marginAmount = product.sellingPrice - avgPurchasePrice;
    const marginPercent = avgPurchasePrice > 0 ? (marginAmount / product.sellingPrice) * 100 : 100;

    const totalMargin = marginAmount * sales.quantitySold;

    return {
      productId,
      productName: product.name,
      categoryId: product.categoryId,
      averagePurchasePrice: avgPurchasePrice,
      currentSellingPrice: product.sellingPrice,
      marginAmount,
      marginPercent,
      quantitySold: sales.quantitySold,
      totalMargin,
      revenue: sales.revenue,
    };
  }

  /**
   * Kategória árrés összesítő
   */
  async getCategoryMarginSummary(
    categoryId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ICategoryMarginSummary> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new Error('Kategória nem található');
    }

    const products = await this.productRepository.findByCategoryId(categoryId);
    const productIds = products.map(p => p.id);

    const purchasePrices = await this.purchasePriceRepository.findByProductIds(productIds);
    const purchasePriceMap = new Map<string, IProductPurchasePrice>();
    for (const pp of purchasePrices) {
      purchasePriceMap.set(pp.productId, pp);
    }

    const categorySales = await this.salesRepository.getSalesByCategory(
      categoryId,
      periodStart,
      periodEnd
    );

    let totalMargin = 0;
    let totalRevenue = 0;
    let totalCost = 0;

    for (const sale of categorySales) {
      const product = products.find(p => p.id === sale.productId);
      const purchasePrice = purchasePriceMap.get(sale.productId);

      if (product && purchasePrice) {
        const cost = purchasePrice.weightedAveragePrice * sale.quantitySold;
        const margin = sale.revenue - cost;

        totalCost += cost;
        totalRevenue += sale.revenue;
        totalMargin += margin;
      }
    }

    const averageMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    return {
      categoryId,
      categoryName: category.name,
      productCount: products.length,
      averageMarginPercent,
      totalMargin,
      totalRevenue,
      totalCost,
    };
  }

  /**
   * Árrés riport generálása
   */
  async generateMarginReport(input: IMarginReportInput): Promise<IMarginReport> {
    const validated = GenerateMarginReportSchema.parse(input);

    const productSummaries: IProductMarginSummary[] = [];
    const categorySummaries: ICategoryMarginSummary[] = [];

    // TODO: Implement full report generation with category/location filters
    // For now, return empty report structure

    let totalRevenue = 0;
    let totalCost = 0;
    let totalMargin = 0;

    for (const summary of productSummaries) {
      totalRevenue += summary.revenue;
      totalMargin += summary.totalMargin;
      totalCost += summary.averagePurchasePrice * summary.quantitySold;
    }

    const averageMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    const report: IMarginReport = {
      id: crypto.randomUUID(),
      tenantId: validated.tenantId,
      periodStart: validated.periodStart,
      periodEnd: validated.periodEnd,
      totalRevenue,
      totalCost,
      totalMargin,
      averageMarginPercent,
      productSummaries,
      categorySummaries,
      generatedAt: new Date(),
    };

    const created = await this.reportRepository.create(report);

    await this.auditService.log('MARGIN_REPORT_GENERATED', 'MarginReport', created.id, {
      periodStart: validated.periodStart,
      periodEnd: validated.periodEnd,
    });

    return created;
  }

  /**
   * Árrés riport exportálása
   */
  async exportMarginReport(reportId: string, format: 'CSV' | 'XLSX' | 'PDF'): Promise<Buffer> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Riport nem található');
    }

    // CSV export implementáció
    if (format === 'CSV') {
      const lines: string[] = [
        'Cikk;Beszerzési ár;Eladási ár;Árrés;Árrés %;Eladott mennyiség;Összes árrés',
      ];

      for (const summary of report.productSummaries) {
        lines.push(
          `${summary.productName};${summary.averagePurchasePrice};${summary.currentSellingPrice};${summary.marginAmount};${summary.marginPercent.toFixed(2)};${summary.quantitySold};${summary.totalMargin}`
        );
      }

      return Buffer.from(lines.join('\n'), 'utf-8');
    }

    // XLSX és PDF export - placeholder
    throw new Error(`${format} export még nincs implementálva`);
  }

  /**
   * Top N legjövedelmezőbb cikk
   * @param limit - Visszaadott termékek maximális száma
   * @param periodStart - Periódus kezdete
   * @param periodEnd - Periódus vége
   * @param tenantId - Tenant azonosító (kötelező a multi-tenant működéshez)
   */
  async getTopProfitableProducts(
    limit: number,
    periodStart: Date,
    periodEnd: Date,
    tenantId?: string
  ): Promise<IProductMarginSummary[]> {
    // Tenant ID szükséges a multi-tenant működéshez
    // Alapértelmezetten üres tömböt adunk vissza ha nincs megadva
    if (!tenantId) {
      return [];
    }

    // Összes termék lekérése
    const products = await this.productRepository.findAll(tenantId);
    if (products.length === 0) {
      return [];
    }

    const productIds = products.map(p => p.id);

    // Beszerzési árak és eladások lekérése
    const purchasePrices = await this.purchasePriceRepository.findByProductIds(productIds);
    const purchasePriceMap = new Map<string, IProductPurchasePrice>();
    for (const pp of purchasePrices) {
      purchasePriceMap.set(pp.productId, pp);
    }

    const allSales = await this.salesRepository.getAllSalesByPeriod(
      tenantId,
      periodStart,
      periodEnd
    );
    const salesMap = new Map<string, { quantitySold: number; revenue: number }>();
    for (const sale of allSales) {
      salesMap.set(sale.productId, { quantitySold: sale.quantitySold, revenue: sale.revenue });
    }

    // Margin summary kalkuláció minden termékre
    const summaries: IProductMarginSummary[] = [];

    for (const product of products) {
      const purchasePrice = purchasePriceMap.get(product.id);
      const sales = salesMap.get(product.id);

      if (!sales || sales.quantitySold === 0) {
        continue; // Nincs eladás, kihagyjuk
      }

      const avgPurchasePrice = purchasePrice?.weightedAveragePrice ?? 0;
      const marginAmount = product.sellingPrice - avgPurchasePrice;
      const marginPercent =
        avgPurchasePrice > 0 ? (marginAmount / product.sellingPrice) * 100 : 100;
      const totalMargin = marginAmount * sales.quantitySold;

      summaries.push({
        productId: product.id,
        productName: product.name,
        categoryId: product.categoryId,
        averagePurchasePrice: avgPurchasePrice,
        currentSellingPrice: product.sellingPrice,
        marginAmount,
        marginPercent,
        quantitySold: sales.quantitySold,
        totalMargin,
        revenue: sales.revenue,
      });
    }

    // Rendezés totalMargin szerint csökkenő sorrendben
    summaries.sort((a, b) => b.totalMargin - a.totalMargin);

    // Limitálás
    return summaries.slice(0, limit);
  }

  /**
   * Legalacsonyabb árrésű cikkek
   */
  async getLowMarginProducts(
    thresholdPercent: number,
    periodStart: Date,
    periodEnd: Date,
    tenantId?: string
  ): Promise<IProductMarginSummary[]> {
    // Ha nincs tenantId, üres tömböt adunk vissza (biztonságos default)
    if (!tenantId) {
      return [];
    }

    // Összes termék lekérése
    const products = await this.productRepository.findAll(tenantId);
    if (products.length === 0) {
      return [];
    }

    const productIds = products.map(p => p.id);

    // Beszerzési árak és eladások lekérése
    const purchasePrices = await this.purchasePriceRepository.findByProductIds(productIds);
    const purchasePriceMap = new Map<string, IProductPurchasePrice>();
    for (const pp of purchasePrices) {
      purchasePriceMap.set(pp.productId, pp);
    }

    const allSales = await this.salesRepository.getAllSalesByPeriod(
      tenantId,
      periodStart,
      periodEnd
    );
    const salesMap = new Map<string, { quantitySold: number; revenue: number }>();
    for (const sale of allSales) {
      salesMap.set(sale.productId, { quantitySold: sale.quantitySold, revenue: sale.revenue });
    }

    // Margin summary kalkuláció és szűrés
    const lowMarginProducts: IProductMarginSummary[] = [];

    for (const product of products) {
      const purchasePrice = purchasePriceMap.get(product.id);
      const sales = salesMap.get(product.id);

      const avgPurchasePrice = purchasePrice?.weightedAveragePrice ?? 0;
      const marginAmount = product.sellingPrice - avgPurchasePrice;
      const marginPercent =
        product.sellingPrice > 0 ? (marginAmount / product.sellingPrice) * 100 : 0;

      // Csak alacsony árrésű termékek
      if (marginPercent >= thresholdPercent) {
        continue;
      }

      const quantitySold = sales?.quantitySold ?? 0;
      const revenue = sales?.revenue ?? 0;
      const totalMargin = marginAmount * quantitySold;

      lowMarginProducts.push({
        productId: product.id,
        productName: product.name,
        categoryId: product.categoryId,
        averagePurchasePrice: avgPurchasePrice,
        currentSellingPrice: product.sellingPrice,
        marginAmount,
        marginPercent,
        quantitySold,
        totalMargin,
        revenue,
      });
    }

    // Rendezés marginPercent szerint növekvő sorrendben (legrosszabbak elöl)
    lowMarginProducts.sort((a, b) => a.marginPercent - b.marginPercent);

    return lowMarginProducts;
  }

  /**
   * Árrés trend elemzés
   */
  async getMarginTrend(
    productId: string,
    periodStart: Date,
    periodEnd: Date,
    granularity: 'DAY' | 'WEEK' | 'MONTH'
  ): Promise<IMarginTrendPoint[]> {
    const product = await this.productRepository.findById(productId);
    if (!product) {
      throw new Error('Termék nem található');
    }

    const purchasePrice = await this.purchasePriceRepository.findByProductId(productId);
    const avgPurchasePrice = purchasePrice?.weightedAveragePrice ?? 0;

    const salesTrend = await this.salesRepository.getSalesTrend(
      productId,
      periodStart,
      periodEnd,
      granularity
    );

    return salesTrend.map(point => {
      const cost = avgPurchasePrice * point.quantitySold;
      const marginAmount = point.revenue - cost;
      const marginPercent = point.revenue > 0 ? (marginAmount / point.revenue) * 100 : 0;

      return {
        date: point.date,
        marginPercent,
        marginAmount,
        revenue: point.revenue,
        quantitySold: point.quantitySold,
      };
    });
  }
}
