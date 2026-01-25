/**
 * Prisma Counter Session Repository
 * Epic 24: Leltár - Story 24-2
 */

import type { ICounterSession, ICounterSessionRepository } from '@kgc/leltar';
import { Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export class PrismaCounterSessionRepository implements ICounterSessionRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  async create(session: ICounterSession): Promise<ICounterSession> {
    const result = await this.prisma.counterSession.create({
      data: {
        id: session.id,
        stockCountId: session.stockCountId,
        userId: session.userId,
        userName: session.userName,
        isActive: session.isActive,
        assignedZone: session.assignedZone ?? null,
        itemsCounted: session.itemsCounted,
        startedAt: session.startedAt,
        lastActivityAt: session.lastActivityAt,
        endedAt: session.endedAt ?? null,
      },
    });

    return this.mapToDomain(result);
  }

  async findById(id: string): Promise<ICounterSession | null> {
    const result = await this.prisma.counterSession.findUnique({
      where: { id },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findActiveByStockCountId(stockCountId: string): Promise<ICounterSession[]> {
    const results = await this.prisma.counterSession.findMany({
      where: {
        stockCountId,
        isActive: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    return results.map(r => this.mapToDomain(r));
  }

  async findByUserId(stockCountId: string, userId: string): Promise<ICounterSession | null> {
    const result = await this.prisma.counterSession.findFirst({
      where: {
        stockCountId,
        userId,
        isActive: true,
      },
    });

    return result ? this.mapToDomain(result) : null;
  }

  async update(id: string, data: Partial<ICounterSession>): Promise<ICounterSession> {
    // Build update data without undefined values
    const updateData: Record<string, unknown> = {};
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.itemsCounted !== undefined) updateData.itemsCounted = data.itemsCounted;
    if (data.lastActivityAt !== undefined) updateData.lastActivityAt = data.lastActivityAt;
    if (data.endedAt !== undefined) updateData.endedAt = data.endedAt;

    const result = await this.prisma.counterSession.update({
      where: { id },
      data: updateData,
    });

    return this.mapToDomain(result);
  }

  async incrementItemsCounted(id: string): Promise<ICounterSession> {
    const result = await this.prisma.counterSession.update({
      where: { id },
      data: {
        itemsCounted: { increment: 1 },
        lastActivityAt: new Date(),
      },
    });

    return this.mapToDomain(result);
  }

  private mapToDomain(prismaRecord: {
    id: string;
    stockCountId: string;
    userId: string;
    userName: string;
    isActive: boolean;
    assignedZone: string | null;
    itemsCounted: number;
    startedAt: Date;
    lastActivityAt: Date;
    endedAt: Date | null;
  }): ICounterSession {
    return {
      id: prismaRecord.id,
      stockCountId: prismaRecord.stockCountId,
      userId: prismaRecord.userId,
      userName: prismaRecord.userName,
      isActive: prismaRecord.isActive,
      assignedZone: prismaRecord.assignedZone ?? undefined,
      itemsCounted: prismaRecord.itemsCounted,
      startedAt: prismaRecord.startedAt,
      lastActivityAt: prismaRecord.lastActivityAt,
      endedAt: prismaRecord.endedAt ?? undefined,
    };
  }
}
