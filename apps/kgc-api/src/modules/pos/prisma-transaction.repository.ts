/**
 * @kgc/sales-pos - Prisma Transaction Repository
 * Epic 22: Point of Sale - Story 22-1
 *
 * Implements ITransactionRepository and ISaleItemRepository for SaleTransaction and SaleItem entities.
 */

import {
  PaymentStatus as DomainPaymentStatus,
  SaleStatus as DomainSaleStatus,
  ISaleItem,
  ISaleItemRepository,
  ISaleTransaction,
  ITransactionRepository,
} from '@kgc/sales-pos';
import { Injectable } from '@nestjs/common';
import { PaymentStatusPOS, Prisma, PrismaClient, SaleStatus } from '@prisma/client';

// ============================================
// Mapping helpers
// ============================================

function mapSaleStatusToDomain(status: SaleStatus): DomainSaleStatus {
  switch (status) {
    case SaleStatus.IN_PROGRESS:
      return DomainSaleStatus.IN_PROGRESS;
    case SaleStatus.PENDING_PAYMENT:
      return DomainSaleStatus.PENDING_PAYMENT;
    case SaleStatus.COMPLETED:
      return DomainSaleStatus.COMPLETED;
    case SaleStatus.VOIDED:
      return DomainSaleStatus.VOIDED;
  }
  // TypeScript exhaustive check - this should never be reached
  throw new Error(`Unknown sale status: ${status as string}`);
}

function mapSaleStatusToPrisma(status: DomainSaleStatus): SaleStatus {
  switch (status) {
    case DomainSaleStatus.IN_PROGRESS:
      return SaleStatus.IN_PROGRESS;
    case DomainSaleStatus.PENDING_PAYMENT:
      return SaleStatus.PENDING_PAYMENT;
    case DomainSaleStatus.COMPLETED:
      return SaleStatus.COMPLETED;
    case DomainSaleStatus.VOIDED:
      return SaleStatus.VOIDED;
  }
  throw new Error(`Unknown sale status: ${status as string}`);
}

function mapPaymentStatusToDomain(status: PaymentStatusPOS): DomainPaymentStatus {
  switch (status) {
    case PaymentStatusPOS.PENDING:
      return DomainPaymentStatus.PENDING;
    case PaymentStatusPOS.PARTIAL:
      return DomainPaymentStatus.PARTIAL;
    case PaymentStatusPOS.PAID:
      return DomainPaymentStatus.PAID;
    case PaymentStatusPOS.REFUNDED:
      return DomainPaymentStatus.REFUNDED;
  }
  // TypeScript exhaustive check - this should never be reached
  throw new Error(`Unknown payment status: ${status as string}`);
}

function mapPaymentStatusToPrisma(status: DomainPaymentStatus): PaymentStatusPOS {
  switch (status) {
    case DomainPaymentStatus.PENDING:
      return PaymentStatusPOS.PENDING;
    case DomainPaymentStatus.PARTIAL:
      return PaymentStatusPOS.PARTIAL;
    case DomainPaymentStatus.PAID:
      return PaymentStatusPOS.PAID;
    case DomainPaymentStatus.REFUNDED:
      return PaymentStatusPOS.REFUNDED;
  }
  throw new Error(`Unknown payment status: ${status as string}`);
}

// ============================================
// Transaction Repository
// ============================================

@Injectable()
export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ISaleTransaction | null> {
    const result = await this.prisma.saleTransaction.findUnique({
      where: { id },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findByTransactionNumber(transactionNumber: string): Promise<ISaleTransaction | null> {
    const result = await this.prisma.saleTransaction.findFirst({
      where: { transactionNumber },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findBySession(sessionId: string): Promise<ISaleTransaction[]> {
    const results = await this.prisma.saleTransaction.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });

    return results.map(r => this.mapToDomain(r));
  }

  async create(data: Omit<ISaleTransaction, 'id' | 'createdAt'>): Promise<ISaleTransaction> {
    const createData: Prisma.SaleTransactionCreateInput = {
      tenantId: data.tenantId,
      session: { connect: { id: data.sessionId } },
      transactionNumber: data.transactionNumber,
      subtotal: new Prisma.Decimal(data.subtotal),
      taxAmount: new Prisma.Decimal(data.taxAmount),
      discountAmount: new Prisma.Decimal(data.discountAmount),
      total: new Prisma.Decimal(data.total),
      paymentStatus: mapPaymentStatusToPrisma(data.paymentStatus),
      paidAmount: new Prisma.Decimal(data.paidAmount),
      changeAmount: new Prisma.Decimal(data.changeAmount),
      status: mapSaleStatusToPrisma(data.status),
      createdBy: data.createdBy,
    };

    if (data.customerId !== undefined) createData.customer = { connect: { id: data.customerId } };
    if (data.customerName !== undefined) createData.customerName = data.customerName;
    if (data.customerTaxNumber !== undefined) createData.customerTaxNumber = data.customerTaxNumber;

    const result = await this.prisma.saleTransaction.create({
      data: createData,
    });

    return this.mapToDomain(result);
  }

  async update(id: string, data: Partial<ISaleTransaction>): Promise<ISaleTransaction> {
    const updateData: Prisma.SaleTransactionUpdateInput = {};

    if (data.subtotal !== undefined) updateData.subtotal = new Prisma.Decimal(data.subtotal);
    if (data.taxAmount !== undefined) updateData.taxAmount = new Prisma.Decimal(data.taxAmount);
    if (data.discountAmount !== undefined)
      updateData.discountAmount = new Prisma.Decimal(data.discountAmount);
    if (data.total !== undefined) updateData.total = new Prisma.Decimal(data.total);
    if (data.paymentStatus !== undefined)
      updateData.paymentStatus = mapPaymentStatusToPrisma(data.paymentStatus);
    if (data.paidAmount !== undefined) updateData.paidAmount = new Prisma.Decimal(data.paidAmount);
    if (data.changeAmount !== undefined)
      updateData.changeAmount = new Prisma.Decimal(data.changeAmount);
    if (data.status !== undefined) updateData.status = mapSaleStatusToPrisma(data.status);
    if (data.customerId !== undefined) updateData.customer = { connect: { id: data.customerId } };
    if (data.customerName !== undefined) updateData.customerName = data.customerName;
    if (data.customerTaxNumber !== undefined) updateData.customerTaxNumber = data.customerTaxNumber;
    if (data.voidedAt !== undefined) updateData.voidedAt = data.voidedAt;
    if (data.voidedBy !== undefined) updateData.voidedBy = data.voidedBy;
    if (data.voidReason !== undefined) updateData.voidReason = data.voidReason;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;

    const result = await this.prisma.saleTransaction.update({
      where: { id },
      data: updateData,
    });

    return this.mapToDomain(result);
  }

  async getNextSequenceNumber(tenantId: string, year: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const result = await this.prisma.saleTransaction.aggregate({
      where: {
        tenantId,
        createdAt: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
      _max: {
        transactionNumber: true,
      },
    });

    // Extract sequence from transactionNumber format: ELADAS-YYYY-NNNN
    const maxTransactionNumber = result._max.transactionNumber;
    if (!maxTransactionNumber) {
      return 1;
    }

    const match = maxTransactionNumber.match(/ELADAS-\d{4}-(\d+)$/);
    if (!match?.[1]) {
      return 1;
    }

    return parseInt(match[1], 10) + 1;
  }

  private mapToDomain(data: Prisma.SaleTransactionGetPayload<object>): ISaleTransaction {
    const result: ISaleTransaction = {
      id: data.id,
      tenantId: data.tenantId,
      sessionId: data.sessionId,
      transactionNumber: data.transactionNumber,
      subtotal: Number(data.subtotal),
      taxAmount: Number(data.taxAmount),
      discountAmount: Number(data.discountAmount),
      total: Number(data.total),
      paymentStatus: mapPaymentStatusToDomain(data.paymentStatus),
      paidAmount: Number(data.paidAmount),
      changeAmount: Number(data.changeAmount),
      status: mapSaleStatusToDomain(data.status),
      createdBy: data.createdBy,
      createdAt: data.createdAt,
    };

    if (data.customerId != null) result.customerId = data.customerId;
    if (data.customerName != null) result.customerName = data.customerName;
    if (data.customerTaxNumber != null) result.customerTaxNumber = data.customerTaxNumber;
    if (data.invoiceId != null) result.invoiceId = data.invoiceId;
    if (data.receiptNumber != null) result.receiptNumber = data.receiptNumber;
    if (data.voidedAt != null) result.voidedAt = data.voidedAt;
    if (data.voidedBy != null) result.voidedBy = data.voidedBy;
    if (data.voidReason != null) result.voidReason = data.voidReason;
    if (data.completedAt != null) result.completedAt = data.completedAt;

    return result;
  }
}

// ============================================
// Sale Item Repository
// ============================================

@Injectable()
export class PrismaSaleItemRepository implements ISaleItemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ISaleItem | null> {
    const result = await this.prisma.saleItem.findUnique({
      where: { id },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findByTransaction(transactionId: string): Promise<ISaleItem[]> {
    const results = await this.prisma.saleItem.findMany({
      where: { transactionId },
      orderBy: { id: 'asc' },
    });

    return results.map(r => this.mapToDomain(r));
  }

  async create(data: Omit<ISaleItem, 'id'>): Promise<ISaleItem> {
    const createData: Prisma.SaleItemCreateInput = {
      tenantId: data.tenantId,
      transaction: { connect: { id: data.transactionId } },
      product: { connect: { id: data.productId } },
      productCode: data.productCode,
      productName: data.productName,
      quantity: new Prisma.Decimal(data.quantity),
      unitPrice: new Prisma.Decimal(data.unitPrice),
      taxRate: new Prisma.Decimal(data.taxRate),
      discountPercent: new Prisma.Decimal(data.discountPercent),
      lineSubtotal: new Prisma.Decimal(data.lineSubtotal),
      lineTax: new Prisma.Decimal(data.lineTax),
      lineTotal: new Prisma.Decimal(data.lineTotal),
      inventoryDeducted: data.inventoryDeducted,
    };

    if (data.warehouseId !== undefined) {
      createData.warehouse = { connect: { id: data.warehouseId } };
    }

    const result = await this.prisma.saleItem.create({
      data: createData,
    });

    return this.mapToDomain(result);
  }

  async update(id: string, data: Partial<ISaleItem>): Promise<ISaleItem> {
    const updateData: Prisma.SaleItemUpdateInput = {};

    if (data.quantity !== undefined) updateData.quantity = new Prisma.Decimal(data.quantity);
    if (data.discountPercent !== undefined)
      updateData.discountPercent = new Prisma.Decimal(data.discountPercent);
    if (data.lineSubtotal !== undefined)
      updateData.lineSubtotal = new Prisma.Decimal(data.lineSubtotal);
    if (data.lineTax !== undefined) updateData.lineTax = new Prisma.Decimal(data.lineTax);
    if (data.lineTotal !== undefined) updateData.lineTotal = new Prisma.Decimal(data.lineTotal);
    if (data.inventoryDeducted !== undefined) updateData.inventoryDeducted = data.inventoryDeducted;

    const result = await this.prisma.saleItem.update({
      where: { id },
      data: updateData,
    });

    return this.mapToDomain(result);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.saleItem.delete({
      where: { id },
    });
  }

  async deleteByTransaction(transactionId: string): Promise<void> {
    await this.prisma.saleItem.deleteMany({
      where: { transactionId },
    });
  }

  private mapToDomain(data: Prisma.SaleItemGetPayload<object>): ISaleItem {
    const result: ISaleItem = {
      id: data.id,
      transactionId: data.transactionId,
      tenantId: data.tenantId,
      productId: data.productId,
      productCode: data.productCode,
      productName: data.productName,
      quantity: Number(data.quantity),
      unitPrice: Number(data.unitPrice),
      taxRate: Number(data.taxRate),
      discountPercent: Number(data.discountPercent),
      lineSubtotal: Number(data.lineSubtotal),
      lineTax: Number(data.lineTax),
      lineTotal: Number(data.lineTotal),
      inventoryDeducted: data.inventoryDeducted,
    };

    if (data.warehouseId != null) result.warehouseId = data.warehouseId;

    return result;
  }
}
