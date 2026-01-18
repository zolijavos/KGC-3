/**
 * Purchase Price Service - Story 23.1: Beszerzési Ár Tracking
 */

import { Inject } from '@nestjs/common';
import type {
  IPurchasePriceService,
  IPurchasePriceRecord,
  IProductPurchasePrice,
  IPurchasePriceHistory,
  IRecordPurchasePriceInput,
  ISupplierPriceComparison,
  IPriceChangeAlert,
  PriceAveragingMethod,
} from '../interfaces/purchase-price.interface';
import { RecordPurchasePriceSchema } from '../dto/purchase-price.dto';

/**
 * Purchase Price Repository interfész
 */
export interface IPurchasePriceRepository {
  create(record: IPurchasePriceRecord): Promise<IPurchasePriceRecord>;
  findByProductId(productId: string): Promise<IPurchasePriceRecord[]>;
  findByProductIdAndDateRange(
    productId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<IPurchasePriceRecord[]>;
  findByProductIds(productIds: string[]): Promise<IPurchasePriceRecord[]>;
  findLatestByProductId(productId: string): Promise<IPurchasePriceRecord | null>;
  findBySupplierAndProduct(supplierId: string, productId: string): Promise<IPurchasePriceRecord[]>;
  findRecentPriceChanges(thresholdPercent: number, since: Date): Promise<IPriceChangeAlert[]>;
}

/**
 * Product Summary Repository interfész
 */
export interface IProductPurchasePriceSummaryRepository {
  findByProductId(productId: string): Promise<IProductPurchasePrice | null>;
  upsert(summary: IProductPurchasePrice): Promise<IProductPurchasePrice>;
  findByProductIds(productIds: string[]): Promise<IProductPurchasePrice[]>;
}

/**
 * Supplier Repository interfész
 */
export interface ISupplierRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
}

/**
 * Audit szolgáltatás interfész
 */
export interface IAuditService {
  log(event: string, entityType: string, entityId: string, data: Record<string, unknown>): Promise<void>;
}

/**
 * Purchase Price Service implementáció
 */
export class PurchasePriceService implements IPurchasePriceService {
  constructor(
    @Inject('PURCHASE_PRICE_REPOSITORY')
    private readonly repository: IPurchasePriceRepository,
    @Inject('PRODUCT_PURCHASE_PRICE_SUMMARY_REPOSITORY')
    private readonly summaryRepository: IProductPurchasePriceSummaryRepository,
    @Inject('SUPPLIER_REPOSITORY')
    private readonly supplierRepository: ISupplierRepository,
    @Inject('AUDIT_SERVICE')
    private readonly auditService: IAuditService
  ) {}

  /**
   * Beszerzési ár rögzítése bevételezéskor
   */
  async recordPurchasePrice(input: IRecordPurchasePriceInput): Promise<IPurchasePriceRecord> {
    const validated = RecordPurchasePriceSchema.parse(input);

    const record: IPurchasePriceRecord = {
      id: crypto.randomUUID(),
      tenantId: validated.tenantId,
      productId: validated.productId,
      supplierId: validated.supplierId,
      receiptId: validated.receiptId,
      unitPrice: validated.unitPrice,
      quantity: validated.quantity,
      currency: validated.currency,
      receiptDate: validated.receiptDate,
      createdAt: new Date(),
    };

    const created = await this.repository.create(record);

    // Summary frissítése
    await this.updateProductSummary(validated.productId);

    await this.auditService.log(
      'PURCHASE_PRICE_RECORDED',
      'PurchasePriceRecord',
      created.id,
      { productId: validated.productId, unitPrice: validated.unitPrice, quantity: validated.quantity }
    );

    return created;
  }

  /**
   * Cikk aktuális beszerzési ára
   */
  async getProductPurchasePrice(productId: string): Promise<IProductPurchasePrice | null> {
    return this.summaryRepository.findByProductId(productId);
  }

  /**
   * Cikk beszerzési ár history
   */
  async getPurchasePriceHistory(
    productId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<IPurchasePriceHistory> {
    const records = await this.repository.findByProductIdAndDateRange(productId, dateFrom, dateTo);

    // Ár trend számítás
    let priceTrend = 0;
    let averagePriceChange = 0;

    if (records.length >= 2) {
      const sortedRecords = [...records].sort(
        (a, b) => a.receiptDate.getTime() - b.receiptDate.getTime()
      );

      const firstPrice = sortedRecords[0]?.unitPrice ?? 0;
      const lastPrice = sortedRecords[sortedRecords.length - 1]?.unitPrice ?? 0;

      if (firstPrice > 0) {
        priceTrend = ((lastPrice - firstPrice) / firstPrice) * 100;
      }

      // Átlagos ár változás számítás
      let totalChange = 0;
      for (let i = 1; i < sortedRecords.length; i++) {
        const prev = sortedRecords[i - 1];
        const curr = sortedRecords[i];
        if (prev && curr && prev.unitPrice > 0) {
          totalChange += ((curr.unitPrice - prev.unitPrice) / prev.unitPrice) * 100;
        }
      }
      averagePriceChange = totalChange / (sortedRecords.length - 1);
    }

    return {
      productId,
      records,
      priceTrend,
      averagePriceChange,
    };
  }

  /**
   * Aktuális beszerzési ár adott metódussal
   */
  async getCurrentPrice(
    productId: string,
    method: PriceAveragingMethod
  ): Promise<number> {
    const summary = await this.summaryRepository.findByProductId(productId);
    if (!summary) {
      return 0;
    }

    switch (method) {
      case 'LAST':
        return summary.lastPrice;
      case 'MOVING_AVERAGE':
      case 'WEIGHTED_AVERAGE':
        return summary.weightedAveragePrice;
      case 'FIFO':
        // FIFO-hoz a records-ból kellene számolni, egyszerűsítve átlagot adunk
        return summary.averagePrice;
      default:
        return summary.lastPrice;
    }
  }

  /**
   * Beszállító árak összehasonlítása
   */
  async compareSupplierPrices(productId: string): Promise<ISupplierPriceComparison[]> {
    const records = await this.repository.findByProductId(productId);

    // Csoportosítás beszállító szerint
    const supplierMap = new Map<string, IPurchasePriceRecord[]>();
    for (const record of records) {
      const existing = supplierMap.get(record.supplierId) ?? [];
      existing.push(record);
      supplierMap.set(record.supplierId, existing);
    }

    const comparisons: ISupplierPriceComparison[] = [];

    for (const [supplierId, supplierRecords] of supplierMap) {
      const supplier = await this.supplierRepository.findById(supplierId);
      const sortedRecords = [...supplierRecords].sort(
        (a, b) => b.receiptDate.getTime() - a.receiptDate.getTime()
      );

      const lastRecord = sortedRecords[0];
      const totalPrice = supplierRecords.reduce((sum, r) => sum + r.unitPrice, 0);
      const averagePrice = totalPrice / supplierRecords.length;

      comparisons.push({
        supplierId,
        supplierName: supplier?.name ?? 'Ismeretlen',
        lastPrice: lastRecord?.unitPrice ?? 0,
        averagePrice,
        lastPurchaseDate: lastRecord?.receiptDate ?? new Date(),
        purchaseCount: supplierRecords.length,
      });
    }

    // Rendezés ár szerint
    return comparisons.sort((a, b) => a.lastPrice - b.lastPrice);
  }

  /**
   * Batch beszerzési ár lekérdezés
   */
  async getProductPurchasePrices(productIds: string[]): Promise<Map<string, IProductPurchasePrice>> {
    const summaries = await this.summaryRepository.findByProductIds(productIds);
    const result = new Map<string, IProductPurchasePrice>();

    for (const summary of summaries) {
      result.set(summary.productId, summary);
    }

    return result;
  }

  /**
   * Ár változás riasztások
   */
  async getPriceChangeAlerts(thresholdPercent: number): Promise<IPriceChangeAlert[]> {
    const since = new Date();
    since.setDate(since.getDate() - 30); // Utolsó 30 nap

    return this.repository.findRecentPriceChanges(thresholdPercent, since);
  }

  /**
   * Summary frissítése
   */
  private async updateProductSummary(productId: string): Promise<void> {
    const records = await this.repository.findByProductId(productId);

    if (records.length === 0) {
      return;
    }

    const sortedRecords = [...records].sort(
      (a, b) => b.receiptDate.getTime() - a.receiptDate.getTime()
    );

    const lastRecord = sortedRecords[0];
    if (!lastRecord) {
      return;
    }

    // Átlag számítás
    const totalPrice = records.reduce((sum, r) => sum + r.unitPrice, 0);
    const averagePrice = totalPrice / records.length;

    // Súlyozott átlag számítás
    const totalWeightedPrice = records.reduce((sum, r) => sum + r.unitPrice * r.quantity, 0);
    const totalQuantity = records.reduce((sum, r) => sum + r.quantity, 0);
    const weightedAveragePrice = totalQuantity > 0 ? totalWeightedPrice / totalQuantity : 0;

    // Min/max
    const prices = records.map((r) => r.unitPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const summary: IProductPurchasePrice = {
      productId,
      lastPrice: lastRecord.unitPrice,
      averagePrice,
      weightedAveragePrice,
      minPrice,
      maxPrice,
      lastSupplierId: lastRecord.supplierId,
      lastReceiptDate: lastRecord.receiptDate,
      totalQuantityReceived: totalQuantity,
      purchaseCount: records.length,
    };

    await this.summaryRepository.upsert(summary);
  }
}
