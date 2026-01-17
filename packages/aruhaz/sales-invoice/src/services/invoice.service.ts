/**
 * Invoice Service
 * Story 10-1: Számla CRUD
 * @package @kgc/sales-invoice
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import type {
  IInvoice,
  IInvoiceItem,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceFilterOptions,
  PaginationOptions,
  PaginatedResult,
} from '../interfaces/invoice.interface';
import { calculateItemAmount, calculateInvoiceTotals } from './invoice-calculator';
import { validateTransition, canTransition, InvoiceStatus } from './invoice-status';
import { getVatPercentage } from './vat-calculator';

/**
 * Invoice Repository Interface
 */
export interface IInvoiceRepository {
  findById(id: string): Promise<IInvoice | null>;
  findByNumber(tenantId: string, invoiceNumber: string): Promise<IInvoice | null>;
  findMany(filter: InvoiceFilterOptions, pagination: PaginationOptions): Promise<PaginatedResult<IInvoice>>;
  create(invoice: Omit<IInvoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<IInvoice>;
  update(id: string, data: Partial<IInvoice>): Promise<IInvoice>;
  delete(id: string): Promise<void>;
  getNextSequenceNumber(tenantId: string, prefix: string, year: number): Promise<number>;
}

/**
 * Invoice Service
 */
@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly repository: IInvoiceRepository) {}

  /**
   * Számla létrehozása
   */
  async create(input: CreateInvoiceInput): Promise<IInvoice> {
    this.logger.log(`Creating invoice for tenant: ${input.tenantId}`);

    // Input validation
    if (!input.items || input.items.length === 0) {
      throw new BadRequestException('Invoice must have at least one item');
    }

    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new BadRequestException(`Item quantity must be positive: ${item.description}`);
      }
      if (item.unitPriceNet < 0) {
        throw new BadRequestException(`Item unit price cannot be negative: ${item.description}`);
      }
    }

    // Számla sorszám generálás
    const now = new Date();
    const year = (input.invoiceDate ?? now).getFullYear();
    const prefix = this.getPrefix(input.type ?? 'STANDARD');
    const sequenceNumber = await this.repository.getNextSequenceNumber(input.tenantId, prefix, year);
    const invoiceNumber = this.formatInvoiceNumber(prefix, year, sequenceNumber);

    // Tételek kalkulálása
    const items: IInvoiceItem[] = input.items.map((item, index) => {
      const calcInput: {
        quantity: number;
        unitPriceNet: number;
        vatRate: string;
        discount?: { type: 'percent'; value: number };
      } = {
        quantity: item.quantity,
        unitPriceNet: item.unitPriceNet,
        vatRate: item.vatRate,
      };
      if (item.discountPercent !== undefined) {
        calcInput.discount = { type: 'percent', value: item.discountPercent };
      }
      const amounts = calculateItemAmount(calcInput);

      const invoiceItem: IInvoiceItem = {
        lineNumber: index + 1,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPriceNet: item.unitPriceNet,
        vatRate: item.vatRate,
        vatPercentage: getVatPercentage(item.vatRate),
        netAmount: amounts.netAmount,
        vatAmount: amounts.vatAmount,
        grossAmount: amounts.grossAmount,
      };
      if (item.discountPercent !== undefined) {
        invoiceItem.discountPercent = item.discountPercent;
        invoiceItem.discountAmount = (item.quantity * item.unitPriceNet * item.discountPercent) / 100;
      }
      if (item.productId !== undefined) {
        invoiceItem.productId = item.productId;
      }
      if (item.rentalItemId !== undefined) {
        invoiceItem.rentalItemId = item.rentalItemId;
      }
      if (item.serviceItemId !== undefined) {
        invoiceItem.serviceItemId = item.serviceItemId;
      }
      return invoiceItem;
    });

    // Összesítők
    const totals = calculateInvoiceTotals(
      items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPriceNet: i.unitPriceNet,
        vatRate: i.vatRate,
      })),
    );

    const invoiceData: Omit<IInvoice, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId: input.tenantId,
      invoiceNumber,
      prefix,
      sequenceNumber,
      type: input.type ?? 'STANDARD',
      status: 'DRAFT',
      partnerId: input.partnerId,
      partnerName: input.partnerName,
      partnerAddress: input.partnerAddress,
      invoiceDate: input.invoiceDate ?? now,
      fulfillmentDate: input.fulfillmentDate ?? now,
      dueDate: input.dueDate ?? this.calculateDueDate(input.paymentMethod, now),
      paymentMethod: input.paymentMethod,
      netAmount: totals.netAmount,
      vatAmount: totals.vatAmount,
      grossAmount: totals.grossAmount,
      paidAmount: 0,
      currency: 'HUF',
      isConfidential: input.isConfidential ?? false,
      visibleToRoles: input.visibleToRoles ?? [],
      items,
      createdBy: input.createdBy,
    };
    if (input.partnerTaxNumber !== undefined) {
      invoiceData.partnerTaxNumber = input.partnerTaxNumber;
    }
    if (input.rentalId !== undefined) {
      invoiceData.rentalId = input.rentalId;
    }
    if (input.serviceOrderId !== undefined) {
      invoiceData.serviceOrderId = input.serviceOrderId;
    }
    if (input.quotationId !== undefined) {
      invoiceData.quotationId = input.quotationId;
    }
    if (input.paymentReference !== undefined) {
      invoiceData.paymentReference = input.paymentReference;
    }
    if (input.notes !== undefined) {
      invoiceData.notes = input.notes;
    }
    if (input.internalNotes !== undefined) {
      invoiceData.internalNotes = input.internalNotes;
    }
    const invoice = await this.repository.create(invoiceData);

    this.logger.log(`Invoice created: ${invoice.invoiceNumber}`);
    return invoice;
  }

  /**
   * Számla lekérése ID alapján
   */
  async findById(id: string): Promise<IInvoice> {
    const invoice = await this.repository.findById(id);

    if (!invoice) {
      throw new NotFoundException(`Invoice not found: ${id}`);
    }

    return invoice;
  }

  /**
   * Számla lekérése számlaszám alapján
   */
  async findByNumber(tenantId: string, invoiceNumber: string): Promise<IInvoice> {
    const invoice = await this.repository.findByNumber(tenantId, invoiceNumber);

    if (!invoice) {
      throw new NotFoundException(`Invoice not found: ${invoiceNumber}`);
    }

    return invoice;
  }

  /**
   * Számlák listázása
   */
  async findMany(
    filter: InvoiceFilterOptions,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<IInvoice>> {
    return this.repository.findMany(filter, pagination);
  }

  /**
   * Számla frissítése
   */
  async update(id: string, input: UpdateInvoiceInput): Promise<IInvoice> {
    const invoice = await this.findById(id);

    // DRAFT státuszban lehet módosítani
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT invoices can be updated');
    }

    return this.repository.update(id, {
      ...input,
      updatedBy: input.updatedBy,
    });
  }

  /**
   * Számla törlése (csak DRAFT státuszban)
   */
  async delete(id: string): Promise<void> {
    const invoice = await this.findById(id);

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT invoices can be deleted');
    }

    await this.repository.delete(id);
    this.logger.log(`Invoice deleted: ${invoice.invoiceNumber}`);
  }

  /**
   * Státusz váltás
   */
  async changeStatus(
    id: string,
    newStatus: InvoiceStatus,
    userId: string,
    reason?: string,
  ): Promise<IInvoice> {
    const invoice = await this.findById(id);

    validateTransition(invoice.status, newStatus);

    const updateData: Partial<IInvoice> = {
      status: newStatus,
      updatedBy: userId,
    };

    // Speciális kezelés bizonyos státuszoknál
    if (newStatus === 'PAID') {
      updateData.paidAt = new Date();
      updateData.paidAmount = invoice.grossAmount;
    }

    if (newStatus === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = userId;
      if (reason !== undefined) {
        updateData.cancellationReason = reason;
      }
    }

    return this.repository.update(id, updateData);
  }

  /**
   * Számla kiállítása (DRAFT -> ISSUED)
   */
  async issue(id: string, userId: string): Promise<IInvoice> {
    return this.changeStatus(id, 'ISSUED', userId);
  }

  /**
   * Számla sztornózása
   */
  async cancel(id: string, userId: string, reason: string): Promise<IInvoice> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Cancellation reason is required');
    }

    return this.changeStatus(id, 'CANCELLED', userId, reason);
  }

  /**
   * Fizetés rögzítése
   */
  async recordPayment(
    id: string,
    amount: number,
    userId: string,
    reference?: string,
  ): Promise<IInvoice> {
    // Validate payment amount
    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be positive');
    }

    const invoice = await this.findById(id);

    if (!canTransition(invoice.status, 'PAID') && !canTransition(invoice.status, 'PARTIALLY_PAID')) {
      throw new BadRequestException(`Cannot record payment for invoice in status: ${invoice.status}`);
    }

    const newPaidAmount = invoice.paidAmount + amount;
    const isPaidInFull = newPaidAmount >= invoice.grossAmount;

    const newStatus: InvoiceStatus = isPaidInFull ? 'PAID' : 'PARTIALLY_PAID';

    const updateData: Partial<IInvoice> = {
      paidAmount: newPaidAmount,
      status: newStatus,
      updatedBy: userId,
    };
    if (isPaidInFull) {
      updateData.paidAt = new Date();
    }
    const newReference = reference ?? invoice.paymentReference;
    if (newReference !== undefined) {
      updateData.paymentReference = newReference;
    }
    return this.repository.update(id, updateData);
  }

  // Private helpers

  private getPrefix(type: string): string {
    const prefixes: Record<string, string> = {
      STANDARD: 'KGC',
      PROFORMA: 'PRO',
      CORRECTION: 'KOR',
      STORNO: 'STO',
      ADVANCE: 'ELO',
      FINAL: 'VEG',
    };
    return prefixes[type] ?? 'KGC';
  }

  private formatInvoiceNumber(prefix: string, year: number, sequence: number): string {
    return `${prefix}-${year}-${sequence.toString().padStart(5, '0')}`;
  }

  private calculateDueDate(paymentMethod: string, invoiceDate: Date): Date {
    const dueDate = new Date(invoiceDate);

    if (paymentMethod === 'TRANSFER') {
      dueDate.setDate(dueDate.getDate() + 8); // 8 nap átutalásra
    }
    // Készpénz/kártya: azonnali

    return dueDate;
  }
}
