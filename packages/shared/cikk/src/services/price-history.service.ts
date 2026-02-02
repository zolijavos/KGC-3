/**
 * PriceHistoryService - Ár history kezelése
 * Story 8-3: Beszállító Kapcsolat és Import
 */

import { Decimal } from '@prisma/client/runtime/library';
import { type PriceHistory, PriceChangeSource } from '../interfaces/supplier.interface';
import type { PrismaClient } from '../prisma';

/**
 * Date range filter
 */
interface DateRangeFilter {
  from?: Date | undefined;
  to?: Date | undefined;
}

export class PriceHistoryService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Record a price change and update current price
   */
  async recordPriceChange(
    supplierItemId: string,
    newPrice: number,
    source: PriceChangeSource,
    tenantId: string
  ): Promise<void> {
    // Verify supplier-item exists
    const supplierItem = await this.prisma.supplierItem.findFirst({
      where: { id: supplierItemId, tenantId },
    });

    if (!supplierItem) {
      throw new Error('Cikk-beszállító kapcsolat nem található');
    }

    // Update current price on supplier-item
    await this.prisma.supplierItem.update({
      where: { id: supplierItemId },
      data: { costPrice: newPrice },
    });

    // Create history record
    await this.prisma.supplierItemPriceHistory.create({
      data: {
        tenantId,
        supplierItemId,
        costPrice: newPrice,
        currency: supplierItem.currency,
        source,
        effectiveFrom: new Date(),
      },
    });
  }

  /**
   * Get price history for a supplier-item
   */
  async getPriceHistory(
    supplierItemId: string,
    tenantId: string,
    dateRange?: DateRangeFilter
  ): Promise<PriceHistory[]> {
    const where: Record<string, unknown> = {
      supplierItemId,
      tenantId,
    };

    if (dateRange?.from || dateRange?.to) {
      const effectiveFromFilter: Record<string, Date> = {};
      if (dateRange.from) effectiveFromFilter['gte'] = dateRange.from;
      if (dateRange.to) effectiveFromFilter['lte'] = dateRange.to;
      where['effectiveFrom'] = effectiveFromFilter;
    }

    const history = await this.prisma.supplierItemPriceHistory.findMany({
      where,
      orderBy: { effectiveFrom: 'desc' },
    });

    return history as PriceHistory[];
  }

  /**
   * Get current price for a supplier-item
   */
  async getCurrentPrice(supplierItemId: string, tenantId: string): Promise<number> {
    const supplierItem = await this.prisma.supplierItem.findFirst({
      where: { id: supplierItemId, tenantId },
    });

    if (!supplierItem) {
      throw new Error('Cikk-beszállító kapcsolat nem található');
    }

    const price = supplierItem.costPrice;
    return price instanceof Decimal ? price.toNumber() : Number(price);
  }

  /**
   * Get the latest price history entry
   */
  async getLatestPriceRecord(
    supplierItemId: string,
    tenantId: string
  ): Promise<PriceHistory | null> {
    const record = await this.prisma.supplierItemPriceHistory.findFirst({
      where: { supplierItemId, tenantId },
      orderBy: { effectiveFrom: 'desc' },
    });

    return record as PriceHistory | null;
  }

  /**
   * Calculate price change percentage between two dates
   */
  async calculatePriceChangePercent(
    supplierItemId: string,
    tenantId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<number | null> {
    const [fromRecord, toRecord] = await Promise.all([
      this.prisma.supplierItemPriceHistory.findFirst({
        where: {
          supplierItemId,
          tenantId,
          effectiveFrom: { lte: fromDate },
        },
        orderBy: { effectiveFrom: 'desc' },
      }),
      this.prisma.supplierItemPriceHistory.findFirst({
        where: {
          supplierItemId,
          tenantId,
          effectiveFrom: { lte: toDate },
        },
        orderBy: { effectiveFrom: 'desc' },
      }),
    ]);

    if (!fromRecord || !toRecord) {
      return null;
    }

    const fromPrice =
      fromRecord.costPrice instanceof Decimal
        ? fromRecord.costPrice.toNumber()
        : Number(fromRecord.costPrice);

    const toPrice =
      toRecord.costPrice instanceof Decimal
        ? toRecord.costPrice.toNumber()
        : Number(toRecord.costPrice);

    if (fromPrice === 0) {
      return null;
    }

    return ((toPrice - fromPrice) / fromPrice) * 100;
  }
}
