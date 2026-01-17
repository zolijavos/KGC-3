/**
 * CsvImportService - CSV import beszállítói termékekhez
 * Story 8-3: Beszállító Kapcsolat és Import
 */

import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  type CsvImportOptions,
  type CsvImportRow,
  type CsvRowValidationResult,
  type CsvImportResult,
  PriceChangeSource,
  DEFAULT_CURRENCY,
} from '../interfaces/supplier.interface';
import { ItemType, ItemStatus, ITEM_CODE_PREFIX } from '../interfaces/item.interface';

/**
 * Audit logger interface
 */
interface AuditLogger {
  log(entry: {
    action: string;
    tenantId: string;
    userId: string;
    entityType: string;
    entityId: string;
    details?: Record<string, unknown>;
  }): void | Promise<void>;
}

export class CsvImportService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLogger: AuditLogger
  ) {}

  /**
   * Import supplier items from CSV content
   */
  async importSupplierItems(
    tenantId: string,
    supplierId: string,
    csvContent: string,
    options: CsvImportOptions = {},
    userId: string
  ): Promise<CsvImportResult> {
    const skipHeader = options.skipHeader !== false;
    const updateExisting = options.updateExisting !== false;
    const createMissingItems = options.createMissingItems ?? false;

    const lines = csvContent.trim().split('\n');
    const dataLines = skipHeader ? lines.slice(1) : lines;

    const result: CsvImportResult = {
      success: true,
      totalRows: dataLines.length,
      importedCount: 0,
      updatedCount: 0,
      errorCount: 0,
      errors: [],
    };

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      if (!line || line.trim() === '') continue;

      const rowIndex = skipHeader ? i + 2 : i + 1; // 1-based, account for header

      try {
        const row = this.parseCsvRow(line);
        const validation = this.validateCsvRow(row, rowIndex);

        if (!validation.valid) {
          result.errors.push({ rowIndex, errors: validation.errors });
          result.errorCount++;
          continue;
        }

        await this.processRow(
          tenantId,
          supplierId,
          row,
          { updateExisting, createMissingItems, defaultCategoryId: options.defaultCategoryId },
          result
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ismeretlen hiba';
        result.errors.push({ rowIndex, errors: [message] });
        result.errorCount++;
      }
    }

    result.success = result.errorCount === 0;

    await this.auditLogger.log({
      action: 'CSV_IMPORT_COMPLETED',
      tenantId,
      userId,
      entityType: 'CsvImport',
      entityId: supplierId,
      details: {
        totalRows: result.totalRows,
        imported: result.importedCount,
        updated: result.updatedCount,
        errors: result.errorCount,
      },
    });

    return result;
  }

  /**
   * Parse a CSV row into object
   */
  private parseCsvRow(line: string): CsvImportRow {
    // Handle quoted values with commas
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return {
      supplierCode: values[0] ?? '',
      barcode: values[1] || undefined,
      name: values[2] ?? '',
      description: values[3] || undefined,
      costPrice: this.parsePrice(values[4] ?? ''),
      listPrice: values[5] ? this.parsePrice(values[5]) : undefined,
      categoryCode: values[6] || undefined,
      unit: values[7] || undefined,
    };
  }

  /**
   * Validate a CSV row
   */
  validateCsvRow(row: CsvImportRow, rowIndex: number): CsvRowValidationResult {
    const errors: string[] = [];

    if (!row.supplierCode || row.supplierCode.trim() === '') {
      errors.push('supplier_code nem lehet üres');
    }

    if (!row.name || row.name.trim() === '') {
      errors.push('name nem lehet üres');
    }

    if (isNaN(row.costPrice)) {
      errors.push('cost_price érvénytelen szám');
    } else if (row.costPrice < 0) {
      errors.push('cost_price nem lehet negatív');
    }

    if (row.listPrice !== undefined && isNaN(row.listPrice)) {
      errors.push('list_price érvénytelen szám');
    }

    return {
      valid: errors.length === 0,
      rowIndex,
      errors,
      data: errors.length === 0 ? row : undefined,
    };
  }

  /**
   * Parse price from string
   */
  parsePrice(value: string): number {
    if (!value || value.trim() === '') {
      return 0;
    }

    // Remove thousand separators and normalize decimal separator
    const normalized = value
      .replace(/\s/g, '') // Remove spaces
      .replace(/,/g, '.'); // Convert comma to dot

    return parseFloat(normalized);
  }

  /**
   * Process a single row
   */
  private async processRow(
    tenantId: string,
    supplierId: string,
    row: CsvImportRow,
    options: {
      updateExisting: boolean;
      createMissingItems: boolean;
      defaultCategoryId?: string | undefined;
    },
    result: CsvImportResult
  ): Promise<void> {
    // Find existing item by barcode or supplier code
    let item = null;

    if (row.barcode) {
      item = await this.prisma.item.findFirst({
        where: {
          tenantId,
          OR: [{ barcode: row.barcode }, { alternativeBarcodes: { has: row.barcode } }],
        },
      });
    }

    // If no item found and we should create missing items
    if (!item && options.createMissingItems) {
      // Find category if provided
      let categoryId: string | null = null;
      if (row.categoryCode) {
        const category = await this.prisma.category.findFirst({
          where: { tenantId, code: row.categoryCode },
        });
        if (category) {
          categoryId = category.id;
        }
      } else if (options.defaultCategoryId) {
        categoryId = options.defaultCategoryId;
      }

      // Generate item code
      const code = await this.generateItemCode(tenantId, ItemType.PRODUCT);

      item = await this.prisma.item.create({
        data: {
          tenantId,
          code,
          name: row.name,
          description: row.description ?? null,
          itemType: ItemType.PRODUCT,
          status: ItemStatus.ACTIVE,
          listPrice: row.listPrice ?? null,
          costPrice: row.costPrice,
          vatRate: 27, // Default Hungarian VAT
          unitOfMeasure: row.unit ?? 'db',
          barcode: row.barcode ?? null,
          alternativeBarcodes: [],
          categoryId,
        },
      });
      // Note: Item creation doesn't increment importedCount
      // Only supplier-item link creation/update counts as an import
    }

    if (!item) {
      throw new Error(`Cikk nem található és nem hozható létre (barcode: ${row.barcode ?? 'nincs'})`);
    }

    // Check if supplier-item link exists
    const existingLink = await this.prisma.supplierItem.findFirst({
      where: {
        tenantId,
        supplierId,
        itemId: item.id,
      },
    });

    if (existingLink) {
      if (options.updateExisting) {
        // Update existing link
        const existingPrice =
          existingLink.costPrice instanceof Decimal
            ? existingLink.costPrice.toNumber()
            : Number(existingLink.costPrice);

        const priceChanged = row.costPrice !== existingPrice;

        await this.prisma.supplierItem.update({
          where: { id: existingLink.id },
          data: {
            supplierCode: row.supplierCode,
            costPrice: row.costPrice,
          },
        });

        // Record price change if price changed
        if (priceChanged) {
          await this.prisma.supplierItemPriceHistory.create({
            data: {
              tenantId,
              supplierItemId: existingLink.id,
              costPrice: row.costPrice,
              currency: DEFAULT_CURRENCY,
              source: PriceChangeSource.CSV_IMPORT,
            },
          });
        }

        result.updatedCount++;
      }
    } else {
      // Create new supplier-item link
      const supplierItem = await this.prisma.supplierItem.create({
        data: {
          tenantId,
          supplierId,
          itemId: item.id,
          supplierCode: row.supplierCode,
          costPrice: row.costPrice,
          currency: DEFAULT_CURRENCY,
          isPrimary: false,
        },
      });

      // Record initial price
      await this.prisma.supplierItemPriceHistory.create({
        data: {
          tenantId,
          supplierItemId: supplierItem.id,
          costPrice: row.costPrice,
          currency: DEFAULT_CURRENCY,
          source: PriceChangeSource.CSV_IMPORT,
        },
      });

      result.importedCount++;
    }

    // Update item's cost price if this is the primary supplier or no current price
    const isPrimary = await this.checkIfPrimarySupplier(tenantId, item.id, supplierId);
    if (isPrimary || item.costPrice === null) {
      await this.prisma.item.update({
        where: { id: item.id },
        data: { costPrice: row.costPrice },
      });
    }
  }

  /**
   * Check if supplier is primary for item
   */
  private async checkIfPrimarySupplier(
    tenantId: string,
    itemId: string,
    supplierId: string
  ): Promise<boolean> {
    const primaryLink = await this.prisma.supplierItem.findFirst({
      where: {
        tenantId,
        itemId,
        isPrimary: true,
      },
    });

    return primaryLink?.supplierId === supplierId;
  }

  /**
   * Generate item code
   */
  private async generateItemCode(tenantId: string, itemType: ItemType): Promise<string> {
    const prefix = ITEM_CODE_PREFIX[itemType];
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Atomic sequence increment
    const sequence = await this.prisma.itemCodeSequence.upsert({
      where: {
        tenantId_prefix_date: {
          tenantId,
          prefix,
          date: dateStr,
        },
      },
      update: {
        sequence: { increment: 1 },
      },
      create: {
        tenantId,
        prefix,
        date: dateStr,
        sequence: 1,
      },
    });

    const seqNum = sequence.sequence.toString().padStart(4, '0');
    return `${prefix}-${dateStr}-${seqNum}`;
  }
}
