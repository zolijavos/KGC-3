/**
 * Storno Service
 * Story 10-5: Sztornó Számla
 * @package @kgc/sales-invoice
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import type { IInvoice, IInvoiceItem, InvoiceType } from '../interfaces/invoice.interface';
import type { InvoiceStatus } from './invoice-status';

/**
 * Sztornó tétel input
 */
export interface PartialStornoItem {
  lineNumber: number;
  quantity: number;
}

/**
 * Repository interface for Storno operations
 */
export interface IStornoRepository {
  findById(id: string): Promise<IInvoice | null>;
  create(invoice: Omit<IInvoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<IInvoice>;
  update(id: string, data: Partial<IInvoice>): Promise<IInvoice>;
  getNextSequenceNumber(tenantId: string, prefix: string, year: number): Promise<number>;
}

// Sztornózható státuszok
const STORNABLE_STATUSES: InvoiceStatus[] = [
  'ISSUED',
  'SENT',
  'PAID',
  'PARTIALLY_PAID',
  'OVERDUE',
];

// Nem sztornózható típusok
const NON_STORNABLE_TYPES: InvoiceType[] = ['STORNO', 'PROFORMA'];

/**
 * Storno Service
 */
@Injectable()
export class StornoService {
  private readonly logger = new Logger(StornoService.name);

  constructor(private readonly repository: IStornoRepository) {}

  /**
   * Ellenőrzi, hogy a számla sztornózható-e
   */
  canStorno(status: InvoiceStatus, type: InvoiceType): boolean {
    if (NON_STORNABLE_TYPES.includes(type)) {
      return false;
    }
    return STORNABLE_STATUSES.includes(status);
  }

  /**
   * Teljes sztornó számla létrehozása
   */
  async createStorno(
    originalInvoiceId: string,
    userId: string,
    reason: string,
  ): Promise<IInvoice> {
    // Validációk
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Cancellation reason is required');
    }

    const original = await this.repository.findById(originalInvoiceId);
    if (!original) {
      throw new NotFoundException(`Invoice not found: ${originalInvoiceId}`);
    }

    if (!this.canStorno(original.status, original.type)) {
      throw new BadRequestException(
        `Cannot create storno for invoice with status ${original.status} and type ${original.type}`,
      );
    }

    this.logger.log(`Creating storno for invoice: ${original.invoiceNumber}`);

    const now = new Date();
    const year = now.getFullYear();
    const sequenceNumber = await this.repository.getNextSequenceNumber(original.tenantId, 'STO', year);
    const invoiceNumber = `STO-${year}-${sequenceNumber.toString().padStart(5, '0')}`;

    // Tételek negatív értékekkel
    const stornoItems: IInvoiceItem[] = original.items.map((item, index) => {
      const stornoItem: IInvoiceItem = {
        lineNumber: index + 1,
        description: item.description,
        quantity: -item.quantity,
        unit: item.unit,
        unitPriceNet: item.unitPriceNet,
        vatRate: item.vatRate,
        vatPercentage: item.vatPercentage,
        netAmount: -item.netAmount,
        vatAmount: -item.vatAmount,
        grossAmount: -item.grossAmount,
      };
      if (item.discountPercent !== undefined) {
        stornoItem.discountPercent = item.discountPercent;
      }
      if (item.discountAmount !== undefined) {
        stornoItem.discountAmount = -item.discountAmount;
      }
      if (item.productId !== undefined) {
        stornoItem.productId = item.productId;
      }
      if (item.rentalItemId !== undefined) {
        stornoItem.rentalItemId = item.rentalItemId;
      }
      if (item.serviceItemId !== undefined) {
        stornoItem.serviceItemId = item.serviceItemId;
      }
      return stornoItem;
    });

    const stornoData: Omit<IInvoice, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId: original.tenantId,
      invoiceNumber,
      prefix: 'STO',
      sequenceNumber,
      type: 'STORNO',
      status: 'DRAFT',
      partnerId: original.partnerId,
      partnerName: original.partnerName,
      partnerAddress: original.partnerAddress,
      referencedInvoiceId: original.id,
      invoiceDate: now,
      fulfillmentDate: now,
      dueDate: now,
      paymentMethod: original.paymentMethod,
      netAmount: -original.netAmount,
      vatAmount: -original.vatAmount,
      grossAmount: -original.grossAmount,
      paidAmount: 0,
      currency: original.currency,
      notes: `Sztornó számla: ${original.invoiceNumber}. Indoklás: ${reason.trim()}`,
      isConfidential: original.isConfidential,
      visibleToRoles: original.visibleToRoles,
      items: stornoItems,
      createdBy: userId,
    };
    if (original.partnerTaxNumber !== undefined) {
      stornoData.partnerTaxNumber = original.partnerTaxNumber;
    }
    const storno = await this.repository.create(stornoData);

    this.logger.log(`Storno created: ${storno.invoiceNumber} for ${original.invoiceNumber}`);
    return storno;
  }

  /**
   * Részleges sztornó számla létrehozása
   */
  async createPartialStorno(
    originalInvoiceId: string,
    userId: string,
    reason: string,
    itemsToStorno: PartialStornoItem[],
  ): Promise<IInvoice> {
    // Validációk
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Cancellation reason is required');
    }

    if (!itemsToStorno || itemsToStorno.length === 0) {
      throw new BadRequestException('At least one item is required for partial storno');
    }

    const original = await this.repository.findById(originalInvoiceId);
    if (!original) {
      throw new NotFoundException(`Invoice not found: ${originalInvoiceId}`);
    }

    if (!this.canStorno(original.status, original.type)) {
      throw new BadRequestException(
        `Cannot create storno for invoice with status ${original.status} and type ${original.type}`,
      );
    }

    // Mennyiségek validálása
    for (const stornoItem of itemsToStorno) {
      const originalItem = original.items.find((i) => i.lineNumber === stornoItem.lineNumber);
      if (!originalItem) {
        throw new BadRequestException(`Item with lineNumber ${stornoItem.lineNumber} not found`);
      }
      if (stornoItem.quantity > originalItem.quantity) {
        throw new BadRequestException(
          `Storno quantity (${stornoItem.quantity}) exceeds original quantity (${originalItem.quantity}) for item ${stornoItem.lineNumber}`,
        );
      }
    }

    this.logger.log(`Creating partial storno for invoice: ${original.invoiceNumber}`);

    const now = new Date();
    const year = now.getFullYear();
    const sequenceNumber = await this.repository.getNextSequenceNumber(original.tenantId, 'STO', year);
    const invoiceNumber = `STO-${year}-${sequenceNumber.toString().padStart(5, '0')}`;

    // Részleges tételek
    const stornoItems: IInvoiceItem[] = [];
    let totalNetAmount = 0;
    let totalVatAmount = 0;
    let totalGrossAmount = 0;

    for (const stornoItem of itemsToStorno) {
      const originalItem = original.items.find((i) => i.lineNumber === stornoItem.lineNumber);
      // This should never be undefined due to earlier validation, but TypeScript needs explicit check
      if (!originalItem) {
        throw new BadRequestException(`Item with lineNumber ${stornoItem.lineNumber} not found`);
      }
      const ratio = stornoItem.quantity / originalItem.quantity;

      const itemNetAmount = Math.round(originalItem.netAmount * ratio);
      const itemVatAmount = Math.round(originalItem.vatAmount * ratio);
      const itemGrossAmount = Math.round(originalItem.grossAmount * ratio);

      const newStornoItem: IInvoiceItem = {
        lineNumber: stornoItems.length + 1,
        description: originalItem.description,
        quantity: -stornoItem.quantity,
        unit: originalItem.unit,
        unitPriceNet: originalItem.unitPriceNet,
        vatRate: originalItem.vatRate,
        vatPercentage: originalItem.vatPercentage,
        netAmount: -itemNetAmount,
        vatAmount: -itemVatAmount,
        grossAmount: -itemGrossAmount,
      };
      if (originalItem.productId !== undefined) {
        newStornoItem.productId = originalItem.productId;
      }
      if (originalItem.rentalItemId !== undefined) {
        newStornoItem.rentalItemId = originalItem.rentalItemId;
      }
      if (originalItem.serviceItemId !== undefined) {
        newStornoItem.serviceItemId = originalItem.serviceItemId;
      }
      stornoItems.push(newStornoItem);

      totalNetAmount += itemNetAmount;
      totalVatAmount += itemVatAmount;
      totalGrossAmount += itemGrossAmount;
    }

    const partialStornoData: Omit<IInvoice, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId: original.tenantId,
      invoiceNumber,
      prefix: 'STO',
      sequenceNumber,
      type: 'STORNO',
      status: 'DRAFT',
      partnerId: original.partnerId,
      partnerName: original.partnerName,
      partnerAddress: original.partnerAddress,
      referencedInvoiceId: original.id,
      invoiceDate: now,
      fulfillmentDate: now,
      dueDate: now,
      paymentMethod: original.paymentMethod,
      netAmount: -totalNetAmount,
      vatAmount: -totalVatAmount,
      grossAmount: -totalGrossAmount,
      paidAmount: 0,
      currency: original.currency,
      notes: `Részleges sztornó számla: ${original.invoiceNumber}. Indoklás: ${reason.trim()}`,
      isConfidential: original.isConfidential,
      visibleToRoles: original.visibleToRoles,
      items: stornoItems,
      createdBy: userId,
    };
    if (original.partnerTaxNumber !== undefined) {
      partialStornoData.partnerTaxNumber = original.partnerTaxNumber;
    }
    const storno = await this.repository.create(partialStornoData);

    this.logger.log(`Partial storno created: ${storno.invoiceNumber} for ${original.invoiceNumber}`);
    return storno;
  }
}
