/**
 * @kgc/sales-pos - TransactionService
 * Epic 22: Story 22-1 - Sale Transaction Management
 */

import { Injectable } from '@nestjs/common';
import {
  AddItemDto,
  AddItemSchema,
  CreateTransactionDto,
  CreateTransactionSchema,
  SetCustomerDto,
  SetCustomerSchema,
  UpdateItemDto,
  UpdateItemSchema,
  VoidTransactionDto,
  VoidTransactionSchema,
} from '../dto/transaction.dto.js';
import { CashRegisterStatus, ISessionRepository } from '../interfaces/session.interface.js';
import {
  ISaleItem,
  ISaleItemRepository,
  ISaleTransaction,
  ITransactionCreateResult,
  ITransactionFilter,
  ITransactionRepository,
  PaymentStatus,
  SaleStatus,
} from '../interfaces/transaction.interface.js';

export interface IAuditService {
  log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

@Injectable()
export class TransactionService {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly saleItemRepository: ISaleItemRepository,
    private readonly sessionRepository: ISessionRepository,
    private readonly auditService: IAuditService
  ) {}

  /**
   * Create a new sale transaction
   * AC3: Transaction gets unique transactionNumber (ELADAS-YYYY-NNNN)
   */
  async createTransaction(
    input: CreateTransactionDto,
    tenantId: string,
    userId: string
  ): Promise<ITransactionCreateResult> {
    const validationResult = CreateTransactionSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Verify session exists and is open
    const session = await this.sessionRepository.findById(validInput.sessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new Error('Session not found');
    }
    if (session.status !== CashRegisterStatus.OPEN) {
      throw new Error('Session is not open');
    }

    // Generate transaction number: ELADAS-YYYY-NNNN
    const year = new Date().getFullYear();
    const sequence = await this.transactionRepository.getNextSequenceNumber(tenantId, year);
    const transactionNumber = `ELADAS-${year}-${String(sequence).padStart(4, '0')}`;

    const createData: Omit<ISaleTransaction, 'id' | 'createdAt'> = {
      tenantId,
      sessionId: validInput.sessionId,
      transactionNumber,
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 0,
      paymentStatus: PaymentStatus.PENDING,
      paidAmount: 0,
      changeAmount: 0,
      status: SaleStatus.IN_PROGRESS,
      createdBy: userId,
    };
    if (validInput.customerId !== undefined) {
      createData.customerId = validInput.customerId;
    }
    if (validInput.customerName !== undefined) {
      createData.customerName = validInput.customerName;
    }
    if (validInput.customerTaxNumber !== undefined) {
      createData.customerTaxNumber = validInput.customerTaxNumber;
    }

    const transaction = await this.transactionRepository.create(createData);

    await this.auditService.log({
      action: 'transaction_created',
      entityType: 'sale_transaction',
      entityId: transaction.id,
      userId,
      tenantId,
      metadata: {
        transactionNumber,
        sessionId: validInput.sessionId,
      },
    });

    return { transaction, transactionNumber };
  }

  /**
   * Get transaction by ID with tenant check
   */
  async getTransactionById(transactionId: string, tenantId: string): Promise<ISaleTransaction> {
    const transaction = await this.transactionRepository.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    if (transaction.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    return transaction;
  }

  /**
   * Get all transactions for tenant with optional filters
   */
  async getTransactions(
    tenantId: string,
    filter?: ITransactionFilter
  ): Promise<ISaleTransaction[]> {
    return this.transactionRepository.findAll(tenantId, filter);
  }

  /**
   * Get transaction items
   */
  async getTransactionItems(transactionId: string, tenantId: string): Promise<ISaleItem[]> {
    await this.getTransactionById(transactionId, tenantId);
    return this.saleItemRepository.findByTransaction(transactionId);
  }

  /**
   * Add item to transaction
   * AC2: Item visible with name, quantity, unit price, line total
   */
  async addItem(transactionId: string, input: AddItemDto, tenantId: string): Promise<ISaleItem> {
    const validationResult = AddItemSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;
    const transaction = await this.getTransactionById(transactionId, tenantId);

    if (transaction.status === SaleStatus.COMPLETED || transaction.status === SaleStatus.VOIDED) {
      throw new Error('Cannot modify completed or voided transaction');
    }

    // Calculate line totals
    const discountPercent = validInput.discountPercent ?? 0;
    const { lineSubtotal, lineTax, lineTotal } = this.calculateLineItem(
      validInput.quantity,
      validInput.unitPrice,
      validInput.taxRate,
      discountPercent
    );

    const saleItemData: Omit<ISaleItem, 'id'> = {
      transactionId,
      tenantId,
      productId: validInput.productId,
      productCode: validInput.productCode,
      productName: validInput.productName,
      quantity: validInput.quantity,
      unitPrice: validInput.unitPrice,
      taxRate: validInput.taxRate,
      discountPercent,
      lineSubtotal,
      lineTax,
      lineTotal,
      inventoryDeducted: false,
    };
    if (validInput.warehouseId !== undefined) {
      saleItemData.warehouseId = validInput.warehouseId;
    }

    const saleItem = await this.saleItemRepository.create(saleItemData);

    // Recalculate transaction totals
    await this.recalculateTransactionTotals(transactionId);

    return saleItem;
  }

  /**
   * Update item quantity or discount
   * AC2: Quantity modifiable
   */
  async updateItem(
    transactionId: string,
    itemId: string,
    input: UpdateItemDto,
    tenantId: string
  ): Promise<ISaleItem> {
    const validationResult = UpdateItemSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const transaction = await this.getTransactionById(transactionId, tenantId);

    if (transaction.status === SaleStatus.COMPLETED || transaction.status === SaleStatus.VOIDED) {
      throw new Error('Cannot modify completed or voided transaction');
    }

    const item = await this.saleItemRepository.findById(itemId);
    if (!item || item.transactionId !== transactionId) {
      throw new Error('Item not found');
    }

    const quantity = input.quantity ?? item.quantity;
    const discountPercent = input.discountPercent ?? item.discountPercent;

    const { lineSubtotal, lineTax, lineTotal } = this.calculateLineItem(
      quantity,
      item.unitPrice,
      item.taxRate,
      discountPercent
    );

    const updatedItem = await this.saleItemRepository.update(itemId, {
      quantity,
      discountPercent,
      lineSubtotal,
      lineTax,
      lineTotal,
    });

    // Recalculate transaction totals
    await this.recalculateTransactionTotals(transactionId);

    return updatedItem;
  }

  /**
   * Remove item from transaction
   * AC2: Item can be deleted from cart
   */
  async removeItem(transactionId: string, itemId: string, tenantId: string): Promise<void> {
    const transaction = await this.getTransactionById(transactionId, tenantId);

    if (transaction.status === SaleStatus.COMPLETED || transaction.status === SaleStatus.VOIDED) {
      throw new Error('Cannot modify completed or voided transaction');
    }

    const item = await this.saleItemRepository.findById(itemId);
    if (!item || item.transactionId !== transactionId) {
      throw new Error('Item not found');
    }

    await this.saleItemRepository.delete(itemId);

    // Recalculate transaction totals
    await this.recalculateTransactionTotals(transactionId);
  }

  /**
   * Set or update customer on transaction
   * AC4: Customer optionally assignable
   */
  async setCustomer(
    transactionId: string,
    input: SetCustomerDto,
    tenantId: string
  ): Promise<ISaleTransaction> {
    const validationResult = SetCustomerSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const transaction = await this.getTransactionById(transactionId, tenantId);

    if (transaction.status === SaleStatus.COMPLETED || transaction.status === SaleStatus.VOIDED) {
      throw new Error('Cannot modify completed or voided transaction');
    }

    const updateData: Partial<ISaleTransaction> = {};
    if (input.customerId !== undefined) {
      updateData.customerId = input.customerId;
    }
    if (input.customerName !== undefined) {
      updateData.customerName = input.customerName;
    }
    if (input.customerTaxNumber !== undefined) {
      updateData.customerTaxNumber = input.customerTaxNumber;
    }

    return this.transactionRepository.update(transactionId, updateData);
  }

  /**
   * Complete transaction - move to PENDING_PAYMENT status
   * AC3: Cart → Transaction conversion, status: IN_PROGRESS → PENDING_PAYMENT
   */
  async completeTransaction(transactionId: string, tenantId: string): Promise<ISaleTransaction> {
    const transaction = await this.getTransactionById(transactionId, tenantId);

    if (transaction.status !== SaleStatus.IN_PROGRESS) {
      throw new Error('Can only complete in-progress transactions');
    }

    // Verify transaction has items
    const items = await this.saleItemRepository.findByTransaction(transactionId);
    if (items.length === 0) {
      throw new Error('Cannot complete transaction with no items');
    }

    return this.transactionRepository.update(transactionId, {
      status: SaleStatus.PENDING_PAYMENT,
    });
  }

  /**
   * Void transaction
   * AC5: IN_PROGRESS or PENDING_PAYMENT can be voided
   */
  async voidTransaction(
    transactionId: string,
    input: VoidTransactionDto,
    tenantId: string,
    userId: string
  ): Promise<ISaleTransaction> {
    const validationResult = VoidTransactionSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;
    const transaction = await this.getTransactionById(transactionId, tenantId);

    if (transaction.status === SaleStatus.COMPLETED || transaction.status === SaleStatus.VOIDED) {
      throw new Error('Cannot void completed or already voided transaction');
    }

    const updatedTransaction = await this.transactionRepository.update(transactionId, {
      status: SaleStatus.VOIDED,
      voidedAt: new Date(),
      voidedBy: userId,
      voidReason: validInput.reason,
    });

    await this.auditService.log({
      action: 'transaction_voided',
      entityType: 'sale_transaction',
      entityId: transactionId,
      userId,
      tenantId,
      metadata: {
        transactionNumber: transaction.transactionNumber,
        reason: validInput.reason,
      },
    });

    return updatedTransaction;
  }

  /**
   * Calculate line item totals
   * Formula:
   * - lineSubtotal = quantity * unitPrice * (1 - discountPercent/100)
   * - lineTax = lineSubtotal * (taxRate/100)
   * - lineTotal = lineSubtotal + lineTax
   */
  private calculateLineItem(
    quantity: number,
    unitPrice: number,
    taxRate: number,
    discountPercent: number
  ): { lineSubtotal: number; lineTax: number; lineTotal: number } {
    const grossAmount = quantity * unitPrice;
    const discountMultiplier = 1 - discountPercent / 100;
    const lineSubtotal = grossAmount * discountMultiplier;
    const lineTax = lineSubtotal * (taxRate / 100);
    const lineTotal = lineSubtotal + lineTax;

    return {
      lineSubtotal: Math.round(lineSubtotal),
      lineTax: Math.round(lineTax),
      lineTotal: Math.round(lineTotal),
    };
  }

  /**
   * Recalculate transaction totals from items
   */
  private async recalculateTransactionTotals(transactionId: string): Promise<void> {
    const items = await this.saleItemRepository.findByTransaction(transactionId);

    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    for (const item of items) {
      subtotal += item.lineSubtotal;
      taxAmount += item.lineTax;

      // Calculate original price without discount
      const originalPrice = item.quantity * item.unitPrice;
      discountAmount += originalPrice - item.lineSubtotal;
    }

    await this.transactionRepository.update(transactionId, {
      subtotal: Math.round(subtotal),
      taxAmount: Math.round(taxAmount),
      discountAmount: Math.round(discountAmount),
      total: Math.round(subtotal + taxAmount),
    });
  }
}
