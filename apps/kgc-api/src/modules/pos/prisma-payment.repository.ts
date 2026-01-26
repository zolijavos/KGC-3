/**
 * @kgc/sales-pos - Prisma Payment Repository
 * Epic 22: Point of Sale - Story 22-2
 *
 * Implements IPaymentRepository for SalePayment entities.
 */

import {
  PaymentMethod as DomainPaymentMethod,
  IPaymentRepository,
  ISalePayment,
} from '@kgc/sales-pos';
import { Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma, PrismaClient } from '@prisma/client';

// ============================================
// Mapping helpers
// ============================================

function mapPaymentMethodToDomain(method: PaymentMethod): DomainPaymentMethod {
  switch (method) {
    case PaymentMethod.CASH:
      return DomainPaymentMethod.CASH;
    case PaymentMethod.CARD:
      return DomainPaymentMethod.CARD;
    case PaymentMethod.TRANSFER:
      return DomainPaymentMethod.TRANSFER;
    case PaymentMethod.VOUCHER:
      return DomainPaymentMethod.VOUCHER;
    case PaymentMethod.CREDIT:
      return DomainPaymentMethod.CREDIT;
  }
  // TypeScript exhaustive check
  throw new Error(`Unknown payment method: ${method as string}`);
}

function mapPaymentMethodToPrisma(method: DomainPaymentMethod): PaymentMethod {
  switch (method) {
    case DomainPaymentMethod.CASH:
      return PaymentMethod.CASH;
    case DomainPaymentMethod.CARD:
      return PaymentMethod.CARD;
    case DomainPaymentMethod.TRANSFER:
      return PaymentMethod.TRANSFER;
    case DomainPaymentMethod.VOUCHER:
      return PaymentMethod.VOUCHER;
    case DomainPaymentMethod.CREDIT:
      return PaymentMethod.CREDIT;
  }
  throw new Error(`Unknown payment method: ${method as string}`);
}

// ============================================
// Payment Repository
// ============================================

@Injectable()
export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ISalePayment | null> {
    const result = await this.prisma.salePayment.findUnique({
      where: { id },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findByTransaction(transactionId: string): Promise<ISalePayment[]> {
    const results = await this.prisma.salePayment.findMany({
      where: { transactionId },
      orderBy: { receivedAt: 'asc' },
    });

    return results.map(r => this.mapToDomain(r));
  }

  async create(data: Omit<ISalePayment, 'id' | 'receivedAt'>): Promise<ISalePayment> {
    const createData: Prisma.SalePaymentCreateInput = {
      tenantId: data.tenantId,
      transaction: { connect: { id: data.transactionId } },
      method: mapPaymentMethodToPrisma(data.method),
      amount: new Prisma.Decimal(data.amount),
    };

    // Optional card fields
    if (data.cardTransactionId !== undefined) {
      createData.cardTransactionId = data.cardTransactionId;
    }
    if (data.cardLastFour !== undefined) {
      createData.cardLastFour = data.cardLastFour;
    }
    if (data.cardBrand !== undefined) {
      createData.cardBrand = data.cardBrand;
    }

    // Optional transfer field
    if (data.transferReference !== undefined) {
      createData.transferReference = data.transferReference;
    }

    // Optional voucher field
    if (data.voucherCode !== undefined) {
      createData.voucherCode = data.voucherCode;
    }

    const result = await this.prisma.salePayment.create({
      data: createData,
    });

    return this.mapToDomain(result);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.salePayment.delete({
      where: { id },
    });
  }

  async deleteByTransaction(transactionId: string): Promise<void> {
    await this.prisma.salePayment.deleteMany({
      where: { transactionId },
    });
  }

  async sumByTransaction(transactionId: string): Promise<number> {
    const result = await this.prisma.salePayment.aggregate({
      where: { transactionId },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount ?? 0);
  }

  private mapToDomain(data: Prisma.SalePaymentGetPayload<object>): ISalePayment {
    const result: ISalePayment = {
      id: data.id,
      transactionId: data.transactionId,
      tenantId: data.tenantId,
      method: mapPaymentMethodToDomain(data.method),
      amount: Number(data.amount),
      receivedAt: data.receivedAt,
    };

    // Optional fields
    if (data.cardTransactionId != null) result.cardTransactionId = data.cardTransactionId;
    if (data.cardLastFour != null) result.cardLastFour = data.cardLastFour;
    if (data.cardBrand != null) result.cardBrand = data.cardBrand;
    if (data.transferReference != null) result.transferReference = data.transferReference;
    if (data.voucherCode != null) result.voucherCode = data.voucherCode;

    return result;
  }
}
