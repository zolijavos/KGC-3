/**
 * Variance Service - Story 24.3: Leltár Eltérés és Korrekció
 */

import { Inject } from '@nestjs/common';
import type {
  IVarianceService,
  IVarianceDetail,
  IVarianceSummary,
  IStockAdjustment,
  VarianceReasonCategory,
  VarianceType,
  AdjustmentStatus,
} from '../interfaces/variance.interface';
import type { IStockCountItem, IStockCount } from '../interfaces/stock-count.interface';
import { DocumentVarianceReasonSchema } from '../dto/variance.dto';

/**
 * Stock Count Item Repository interfész
 */
export interface IStockCountItemRepository {
  findById(id: string): Promise<IStockCountItem | null>;
  findByStockCountId(stockCountId: string): Promise<IStockCountItem[]>;
  update(id: string, data: Partial<IStockCountItem>): Promise<IStockCountItem>;
}

/**
 * Stock Adjustment Repository interfész
 */
export interface IStockAdjustmentRepository {
  create(adjustment: IStockAdjustment): Promise<IStockAdjustment>;
  findById(id: string): Promise<IStockAdjustment | null>;
  findByStockCountId(stockCountId: string): Promise<IStockAdjustment[]>;
  update(id: string, data: Partial<IStockAdjustment>): Promise<IStockAdjustment>;
  generateAdjustmentNumber(tenantId: string): Promise<string>;
}

/**
 * Stock Count Repository interfész
 */
export interface IStockCountRepository {
  findById(id: string): Promise<IStockCount | null>;
  update(id: string, data: Partial<IStockCount>): Promise<IStockCount>;
}

/**
 * Inventory Service interfész (készlet módosítás)
 */
export interface IInventoryService {
  adjustStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    reason: string,
    reference: string
  ): Promise<void>;
}

/**
 * Product Repository interfész
 */
export interface IProductRepository {
  findById(id: string): Promise<{ id: string; name: string; unitPrice: number } | null>;
}

/**
 * Audit szolgáltatás interfész
 */
export interface IAuditService {
  log(event: string, entityType: string, entityId: string, data: Record<string, unknown>): Promise<void>;
}

/**
 * Extended stock count item with variance details
 */
interface IStockCountItemWithDetails extends IStockCountItem {
  unitPrice?: number | undefined;
  reasonCategory?: VarianceReasonCategory | undefined;
  reasonDescription?: string | undefined;
  adjustmentStatus?: AdjustmentStatus | undefined;
}

/**
 * Variance Service implementáció
 */
export class VarianceService implements IVarianceService {
  constructor(
    @Inject('STOCK_COUNT_ITEM_REPOSITORY')
    private readonly itemRepository: IStockCountItemRepository,
    @Inject('STOCK_ADJUSTMENT_REPOSITORY')
    private readonly adjustmentRepository: IStockAdjustmentRepository,
    @Inject('STOCK_COUNT_REPOSITORY')
    private readonly stockCountRepository: IStockCountRepository,
    @Inject('INVENTORY_SERVICE')
    private readonly inventoryService: IInventoryService,
    @Inject('PRODUCT_REPOSITORY')
    private readonly productRepository: IProductRepository,
    @Inject('AUDIT_SERVICE')
    private readonly auditService: IAuditService
  ) {}

  /**
   * Eltérések lekérdezése
   */
  async getVariances(stockCountId: string): Promise<IVarianceDetail[]> {
    const items = await this.itemRepository.findByStockCountId(stockCountId);

    const varianceItems = items.filter(
      (item) => item.countedQuantity !== undefined && item.variance !== undefined && item.variance !== 0
    );

    const details: IVarianceDetail[] = [];

    for (const item of varianceItems) {
      const product = await this.productRepository.findById(item.productId);
      const unitPrice = product?.unitPrice ?? 0;
      const variance = item.variance ?? 0;

      let varianceType: VarianceType = 'MATCH';
      if (variance < 0) {
        varianceType = 'SHORTAGE';
      } else if (variance > 0) {
        varianceType = 'OVERAGE';
      }

      const itemWithDetails = item as IStockCountItemWithDetails;

      details.push({
        itemId: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        locationCode: item.locationCode,
        bookQuantity: item.bookQuantity,
        countedQuantity: item.countedQuantity ?? 0,
        variance,
        varianceType,
        unitPrice,
        varianceValue: variance * unitPrice,
        reasonCategory: itemWithDetails.reasonCategory,
        reasonDescription: itemWithDetails.reasonDescription,
        adjustmentStatus: itemWithDetails.adjustmentStatus ?? ('PENDING' as AdjustmentStatus),
      });
    }

    return details;
  }

  /**
   * Eltérés ok dokumentálása
   */
  async documentVarianceReason(
    itemId: string,
    category: VarianceReasonCategory,
    description: string
  ): Promise<IVarianceDetail> {
    DocumentVarianceReasonSchema.parse({ itemId, category, description });

    const item = await this.itemRepository.findById(itemId);
    if (!item) {
      throw new Error('Tétel nem található');
    }

    if (item.variance === undefined || item.variance === 0) {
      throw new Error('Nincs eltérés a dokumentáláshoz');
    }

    // Update with reason (stored in notes for simplicity)
    const updatedItem = await this.itemRepository.update(itemId, {
      notes: `${item.notes ?? ''}\nOk: ${category} - ${description}`,
    });

    const product = await this.productRepository.findById(item.productId);
    const unitPrice = product?.unitPrice ?? 0;
    const variance = item.variance;

    let varianceType: VarianceType = 'MATCH';
    if (variance < 0) {
      varianceType = 'SHORTAGE';
    } else if (variance > 0) {
      varianceType = 'OVERAGE';
    }

    await this.auditService.log(
      'VARIANCE_REASON_DOCUMENTED',
      'StockCountItem',
      itemId,
      { category, description }
    );

    return {
      itemId: updatedItem.id,
      productId: updatedItem.productId,
      productName: updatedItem.productName,
      sku: updatedItem.sku,
      locationCode: updatedItem.locationCode,
      bookQuantity: updatedItem.bookQuantity,
      countedQuantity: updatedItem.countedQuantity ?? 0,
      variance,
      varianceType,
      unitPrice,
      varianceValue: variance * unitPrice,
      reasonCategory: category,
      reasonDescription: description,
      adjustmentStatus: 'PENDING' as AdjustmentStatus,
    };
  }

  /**
   * Eltérés összesítő
   */
  async getVarianceSummary(stockCountId: string): Promise<IVarianceSummary> {
    const variances = await this.getVariances(stockCountId);

    const shortageItems = variances.filter((v) => v.varianceType === 'SHORTAGE');
    const overageItems = variances.filter((v) => v.varianceType === 'OVERAGE');

    const totalShortageValue = shortageItems.reduce((sum, v) => sum + Math.abs(v.varianceValue), 0);
    const totalOverageValue = overageItems.reduce((sum, v) => sum + v.varianceValue, 0);

    // Group by reason
    const byReason = new Map<VarianceReasonCategory, { count: number; value: number }>();
    for (const v of variances) {
      const reason = v.reasonCategory ?? ('UNKNOWN' as VarianceReasonCategory);
      const existing = byReason.get(reason) ?? { count: 0, value: 0 };
      byReason.set(reason, {
        count: existing.count + 1,
        value: existing.value + Math.abs(v.varianceValue),
      });
    }

    const byReasonArray: Array<{ reason: VarianceReasonCategory; count: number; value: number }> = [];
    byReason.forEach((val, reason) => {
      byReasonArray.push({ reason, count: val.count, value: val.value });
    });

    return {
      stockCountId,
      totalVarianceItems: variances.length,
      shortageItems: shortageItems.length,
      overageItems: overageItems.length,
      totalShortageValue,
      totalOverageValue,
      netVarianceValue: totalOverageValue - totalShortageValue,
      byReason: byReasonArray,
    };
  }

  /**
   * Korrekció létrehozása
   */
  async createAdjustment(stockCountId: string, userId: string): Promise<IStockAdjustment> {
    const stockCount = await this.stockCountRepository.findById(stockCountId);
    if (!stockCount) {
      throw new Error('Leltár nem található');
    }

    const variances = await this.getVariances(stockCountId);
    const totalVarianceValue = variances.reduce((sum, v) => sum + v.varianceValue, 0);

    const adjustmentNumber = await this.adjustmentRepository.generateAdjustmentNumber(stockCount.tenantId);

    const adjustment: IStockAdjustment = {
      id: crypto.randomUUID(),
      tenantId: stockCount.tenantId,
      stockCountId,
      adjustmentNumber,
      status: 'PENDING' as AdjustmentStatus,
      itemCount: variances.length,
      totalVarianceValue,
      createdByUserId: userId,
      createdAt: new Date(),
    };

    const created = await this.adjustmentRepository.create(adjustment);

    // Update stock count status
    await this.stockCountRepository.update(stockCountId, {
      status: 'PENDING_ADJUSTMENT',
      updatedAt: new Date(),
    });

    await this.auditService.log(
      'ADJUSTMENT_CREATED',
      'StockAdjustment',
      created.id,
      { itemCount: variances.length, totalVarianceValue }
    );

    return created;
  }

  /**
   * Korrekció jóváhagyása
   */
  async approveAdjustment(adjustmentId: string, userId: string): Promise<IStockAdjustment> {
    const adjustment = await this.adjustmentRepository.findById(adjustmentId);
    if (!adjustment) {
      throw new Error('Korrekció nem található');
    }

    if (adjustment.status !== 'PENDING') {
      throw new Error('Csak PENDING státuszú korrekció hagyható jóvá');
    }

    const updated = await this.adjustmentRepository.update(adjustmentId, {
      status: 'APPROVED' as AdjustmentStatus,
      approvedByUserId: userId,
      approvedAt: new Date(),
    });

    await this.auditService.log(
      'ADJUSTMENT_APPROVED',
      'StockAdjustment',
      adjustmentId,
      { userId }
    );

    return updated;
  }

  /**
   * Korrekció elutasítása
   */
  async rejectAdjustment(
    adjustmentId: string,
    userId: string,
    reason: string
  ): Promise<IStockAdjustment> {
    const adjustment = await this.adjustmentRepository.findById(adjustmentId);
    if (!adjustment) {
      throw new Error('Korrekció nem található');
    }

    if (adjustment.status !== 'PENDING') {
      throw new Error('Csak PENDING státuszú korrekció utasítható el');
    }

    const updated = await this.adjustmentRepository.update(adjustmentId, {
      status: 'REJECTED' as AdjustmentStatus,
      rejectionReason: reason,
    });

    await this.auditService.log(
      'ADJUSTMENT_REJECTED',
      'StockAdjustment',
      adjustmentId,
      { userId, reason }
    );

    return updated;
  }

  /**
   * Korrekció végrehajtása
   */
  async applyAdjustment(adjustmentId: string, userId: string): Promise<IStockAdjustment> {
    const adjustment = await this.adjustmentRepository.findById(adjustmentId);
    if (!adjustment) {
      throw new Error('Korrekció nem található');
    }

    if (adjustment.status !== 'APPROVED') {
      throw new Error('Csak APPROVED státuszú korrekció hajtható végre');
    }

    const stockCount = await this.stockCountRepository.findById(adjustment.stockCountId);
    if (!stockCount) {
      throw new Error('Leltár nem található');
    }

    // Get variances and apply inventory adjustments
    const variances = await this.getVariances(adjustment.stockCountId);

    for (const variance of variances) {
      await this.inventoryService.adjustStock(
        variance.productId,
        stockCount.warehouseId,
        variance.variance,
        `Leltár korrekció: ${adjustment.adjustmentNumber}`,
        adjustmentId
      );
    }

    const updated = await this.adjustmentRepository.update(adjustmentId, {
      status: 'APPLIED' as AdjustmentStatus,
      appliedByUserId: userId,
      appliedAt: new Date(),
    });

    await this.auditService.log(
      'ADJUSTMENT_APPLIED',
      'StockAdjustment',
      adjustmentId,
      { userId, itemCount: variances.length }
    );

    return updated;
  }

  /**
   * Korrekció lekérdezése
   */
  async getAdjustment(adjustmentId: string): Promise<IStockAdjustment | null> {
    return this.adjustmentRepository.findById(adjustmentId);
  }

  /**
   * Leltár lezárása
   */
  async completeStockCount(stockCountId: string, userId: string): Promise<void> {
    const stockCount = await this.stockCountRepository.findById(stockCountId);
    if (!stockCount) {
      throw new Error('Leltár nem található');
    }

    // Check if all adjustments are applied
    const adjustments = await this.adjustmentRepository.findByStockCountId(stockCountId);
    const pendingAdjustments = adjustments.filter((a) => a.status !== 'APPLIED' && a.status !== 'REJECTED');

    if (pendingAdjustments.length > 0) {
      throw new Error('Vannak még végrehajtásra váró korrekciók');
    }

    await this.stockCountRepository.update(stockCountId, {
      status: 'COMPLETED',
      stockFrozen: false,
      actualEndDate: new Date(),
      updatedAt: new Date(),
    });

    await this.auditService.log(
      'STOCK_COUNT_COMPLETED',
      'StockCount',
      stockCountId,
      { userId }
    );
  }

  /**
   * Eltérés export
   */
  async exportVariances(stockCountId: string, format: 'CSV' | 'XLSX'): Promise<Buffer> {
    const variances = await this.getVariances(stockCountId);

    if (format === 'CSV') {
      const lines: string[] = [
        'Cikkszám;Cikknév;Helykód;Könyv szerinti;Számlált;Eltérés;Eltérés érték;Ok',
      ];

      for (const v of variances) {
        lines.push(
          `${v.sku};${v.productName};${v.locationCode};${v.bookQuantity};${v.countedQuantity};${v.variance};${v.varianceValue};${v.reasonCategory ?? ''}`
        );
      }

      return Buffer.from(lines.join('\n'), 'utf-8');
    }

    throw new Error(`${format} export még nincs implementálva`);
  }
}
