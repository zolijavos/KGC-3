/**
 * Prisma Stock Adjustment Repository
 * Epic 24: Leltár - Story 24-3
 */

import type { IStockAdjustment, IStockAdjustmentRepository } from '@kgc/leltar';
import { Inject } from '@nestjs/common';
import { AdjustmentStatus, PrismaClient } from '@prisma/client';

export class PrismaStockAdjustmentRepository implements IStockAdjustmentRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  async create(adjustment: IStockAdjustment): Promise<IStockAdjustment> {
    const result = await this.prisma.stockAdjustment.create({
      data: {
        id: adjustment.id,
        tenantId: adjustment.tenantId,
        stockCountId: adjustment.stockCountId,
        adjustmentNumber: adjustment.adjustmentNumber,
        status: adjustment.status as AdjustmentStatus,
        itemCount: adjustment.itemCount,
        totalVarianceValue: adjustment.totalVarianceValue,
        createdByUserId: adjustment.createdByUserId,
        approvedByUserId: adjustment.approvedByUserId ?? null,
        appliedByUserId: adjustment.appliedByUserId ?? null,
        createdAt: adjustment.createdAt,
        approvedAt: adjustment.approvedAt ?? null,
        appliedAt: adjustment.appliedAt ?? null,
        rejectionReason: adjustment.rejectionReason ?? null,
      },
    });

    return this.mapToDomain(result);
  }

  async findById(id: string): Promise<IStockAdjustment | null> {
    const result = await this.prisma.stockAdjustment.findUnique({
      where: { id },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findByStockCountId(stockCountId: string): Promise<IStockAdjustment[]> {
    const results = await this.prisma.stockAdjustment.findMany({
      where: { stockCountId },
      orderBy: { createdAt: 'desc' },
    });

    return results.map(r => this.mapToDomain(r));
  }

  async update(id: string, data: Partial<IStockAdjustment>): Promise<IStockAdjustment> {
    // Build update data without undefined values
    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status as AdjustmentStatus;
    if (data.approvedByUserId !== undefined) updateData.approvedByUserId = data.approvedByUserId;
    if (data.appliedByUserId !== undefined) updateData.appliedByUserId = data.appliedByUserId;
    if (data.approvedAt !== undefined) updateData.approvedAt = data.approvedAt;
    if (data.appliedAt !== undefined) updateData.appliedAt = data.appliedAt;
    if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason;

    const result = await this.prisma.stockAdjustment.update({
      where: { id },
      data: updateData,
    });

    return this.mapToDomain(result);
  }

  async generateAdjustmentNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');

    // Find last adjustment number for this tenant this month
    const lastAdjustment = await this.prisma.stockAdjustment.findFirst({
      where: {
        tenantId,
        adjustmentNumber: {
          startsWith: `KOR-${year}${month}`,
        },
      },
      orderBy: { adjustmentNumber: 'desc' },
    });

    let sequence = 1;
    if (lastAdjustment) {
      const lastSeq = lastAdjustment.adjustmentNumber.split('-')[2];
      if (lastSeq) {
        sequence = parseInt(lastSeq, 10) + 1;
      }
    }

    return `KOR-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  private mapToDomain(prismaRecord: {
    id: string;
    tenantId: string;
    stockCountId: string;
    adjustmentNumber: string;
    status: AdjustmentStatus;
    itemCount: number;
    totalVarianceValue: unknown;
    createdByUserId: string;
    approvedByUserId: string | null;
    appliedByUserId: string | null;
    createdAt: Date;
    approvedAt: Date | null;
    appliedAt: Date | null;
    rejectionReason: string | null;
  }): IStockAdjustment {
    return {
      id: prismaRecord.id,
      tenantId: prismaRecord.tenantId,
      stockCountId: prismaRecord.stockCountId,
      adjustmentNumber: prismaRecord.adjustmentNumber,
      status: prismaRecord.status as IStockAdjustment['status'],
      itemCount: prismaRecord.itemCount,
      totalVarianceValue: Number(prismaRecord.totalVarianceValue),
      createdByUserId: prismaRecord.createdByUserId,
      approvedByUserId: prismaRecord.approvedByUserId ?? undefined,
      appliedByUserId: prismaRecord.appliedByUserId ?? undefined,
      createdAt: prismaRecord.createdAt,
      approvedAt: prismaRecord.approvedAt ?? undefined,
      appliedAt: prismaRecord.appliedAt ?? undefined,
      rejectionReason: prismaRecord.rejectionReason ?? undefined,
    };
  }
}
