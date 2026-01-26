/**
 * @kgc/sales-pos - Prisma Session Repository
 * Epic 22: Point of Sale - Story 22-1
 *
 * Implements ISessionRepository for CashRegisterSession entity.
 */

import {
  CashRegisterStatus as DomainCashRegisterStatus,
  ICashRegisterSession,
  ISessionRepository,
} from '@kgc/sales-pos';
import { Injectable } from '@nestjs/common';
import { CashRegisterStatus, Prisma, PrismaClient } from '@prisma/client';

// ============================================
// Mapping helpers
// ============================================

function mapStatusToDomain(status: CashRegisterStatus): DomainCashRegisterStatus {
  switch (status) {
    case CashRegisterStatus.OPEN:
      return DomainCashRegisterStatus.OPEN;
    case CashRegisterStatus.SUSPENDED:
      return DomainCashRegisterStatus.SUSPENDED;
    case CashRegisterStatus.CLOSED:
      return DomainCashRegisterStatus.CLOSED;
  }
}

function mapStatusToPrisma(status: DomainCashRegisterStatus): CashRegisterStatus {
  switch (status) {
    case DomainCashRegisterStatus.OPEN:
      return CashRegisterStatus.OPEN;
    case DomainCashRegisterStatus.SUSPENDED:
      return CashRegisterStatus.SUSPENDED;
    case DomainCashRegisterStatus.CLOSED:
      return CashRegisterStatus.CLOSED;
  }
  // TypeScript exhaustive check - this should never be reached
  throw new Error(`Unknown status: ${status as string}`);
}

// ============================================
// Session Repository
// ============================================

@Injectable()
export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ICashRegisterSession | null> {
    const result = await this.prisma.cashRegisterSession.findUnique({
      where: { id },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findBySessionNumber(sessionNumber: string): Promise<ICashRegisterSession | null> {
    const result = await this.prisma.cashRegisterSession.findFirst({
      where: { sessionNumber },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findCurrentByLocation(locationId: string): Promise<ICashRegisterSession | null> {
    const result = await this.prisma.cashRegisterSession.findFirst({
      where: {
        locationId,
        status: CashRegisterStatus.OPEN,
      },
      orderBy: { openedAt: 'desc' },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async create(
    data: Omit<ICashRegisterSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ICashRegisterSession> {
    const result = await this.prisma.cashRegisterSession.create({
      data: {
        tenantId: data.tenantId,
        locationId: data.locationId,
        sessionNumber: data.sessionNumber,
        openedAt: data.openedAt,
        openingBalance: new Prisma.Decimal(data.openingBalance),
        status: mapStatusToPrisma(data.status),
        openedBy: data.openedBy,
      },
    });

    return this.mapToDomain(result);
  }

  async update(id: string, data: Partial<ICashRegisterSession>): Promise<ICashRegisterSession> {
    const updateData: Prisma.CashRegisterSessionUpdateInput = {};

    if (data.status !== undefined) updateData.status = mapStatusToPrisma(data.status);
    if (data.closedAt !== undefined) updateData.closedAt = data.closedAt;
    if (data.closedBy !== undefined) updateData.closedBy = data.closedBy;
    if (data.closingBalance !== undefined)
      updateData.closingBalance = new Prisma.Decimal(data.closingBalance);
    if (data.expectedBalance !== undefined)
      updateData.expectedBalance = new Prisma.Decimal(data.expectedBalance);
    if (data.variance !== undefined) updateData.variance = new Prisma.Decimal(data.variance);
    if (data.varianceNote !== undefined) updateData.varianceNote = data.varianceNote;

    const result = await this.prisma.cashRegisterSession.update({
      where: { id },
      data: updateData,
    });

    return this.mapToDomain(result);
  }

  async getNextSequenceNumber(tenantId: string, year: number): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const result = await this.prisma.cashRegisterSession.aggregate({
      where: {
        tenantId,
        createdAt: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
      _max: {
        sessionNumber: true,
      },
    });

    // Extract sequence from sessionNumber format: KASSZA-YYYY-NNNN
    const maxSessionNumber = result._max.sessionNumber;
    if (!maxSessionNumber) {
      return 1;
    }

    const match = maxSessionNumber.match(/KASSZA-\d{4}-(\d+)$/);
    if (!match?.[1]) {
      return 1;
    }

    return parseInt(match[1], 10) + 1;
  }

  private mapToDomain(data: Prisma.CashRegisterSessionGetPayload<object>): ICashRegisterSession {
    const result: ICashRegisterSession = {
      id: data.id,
      tenantId: data.tenantId,
      locationId: data.locationId,
      sessionNumber: data.sessionNumber,
      openedAt: data.openedAt,
      openingBalance: Number(data.openingBalance),
      status: mapStatusToDomain(data.status),
      openedBy: data.openedBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    if (data.closedAt != null) result.closedAt = data.closedAt;
    if (data.closedBy != null) result.closedBy = data.closedBy;
    if (data.closingBalance != null) result.closingBalance = Number(data.closingBalance);
    if (data.expectedBalance != null) result.expectedBalance = Number(data.expectedBalance);
    if (data.variance != null) result.variance = Number(data.variance);
    if (data.varianceNote != null) result.varianceNote = data.varianceNote;

    return result;
  }
}
