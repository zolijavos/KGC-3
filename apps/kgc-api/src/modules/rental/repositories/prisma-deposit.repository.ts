/**
 * Prisma Deposit Repository
 * Implements IDepositRepository for PostgreSQL persistence
 * Epic 16: Kaució kezelés
 */

import type { IDeposit, IDepositAuditRecord } from '@kgc/rental-checkout';
import {
  CreateDepositInput,
  DepositPaymentMethod,
  DepositQuery,
  DepositQueryResult,
  DepositRetention,
  DepositRetentionReason,
  DepositStatistics,
  DepositStatus,
  IDepositRepository,
  RetainDepositInput,
  UpdateDepositInput,
} from '@kgc/rental-checkout';
import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  Deposit as PrismaDeposit,
  DepositStatus as PrismaDepositStatus,
  DepositType as PrismaDepositType,
} from '@prisma/client';

@Injectable()
export class PrismaDepositRepository implements IDepositRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  private toDepositDomain(deposit: PrismaDeposit): IDeposit {
    const paymentMethodMap: Record<PrismaDepositType, DepositPaymentMethod> = {
      CASH: DepositPaymentMethod.CASH,
      CARD: DepositPaymentMethod.CARD,
      BANK_TRANSFER: DepositPaymentMethod.BANK_TRANSFER,
      PRE_AUTH: DepositPaymentMethod.MYPOS_PREAUTH,
    };

    const statusMap: Record<PrismaDepositStatus, DepositStatus> = {
      PENDING: DepositStatus.PENDING,
      RECEIVED: DepositStatus.COLLECTED,
      HELD: DepositStatus.HELD,
      RELEASED: DepositStatus.RELEASED,
      RETAINED: DepositStatus.RETAINED,
      PARTIAL: DepositStatus.PARTIALLY_RETAINED,
    };

    const result: IDeposit = {
      id: deposit.id,
      tenantId: deposit.tenantId,
      rentalId: deposit.rentalId,
      partnerId: '', // Needs to be joined from rental
      amount: Number(deposit.amount),
      status: this.getStatusFromMap(statusMap, deposit.status),
      paymentMethod: this.getPaymentMethodFromMap(paymentMethodMap, deposit.type),
      createdAt: deposit.receivedAt,
      updatedAt: deposit.receivedAt,
      createdBy: deposit.receivedBy,
    };

    if (deposit.myposTransactionId) {
      result.myposTransactionId = deposit.myposTransactionId;
    }

    return result;
  }

  private getStatusFromMap(
    map: Record<PrismaDepositStatus, DepositStatus>,
    status: PrismaDepositStatus
  ): DepositStatus {
    const result = map[status];
    if (!result) throw new Error(`Ismeretlen kaució státusz: ${status}`);
    return result;
  }

  private getPaymentMethodFromMap(
    map: Record<PrismaDepositType, DepositPaymentMethod>,
    type: PrismaDepositType
  ): DepositPaymentMethod {
    const result = map[type];
    if (!result) throw new Error(`Ismeretlen fizetési mód: ${type}`);
    return result;
  }

  private mapStatusToPrisma(status: DepositStatus): PrismaDepositStatus {
    const statusMap: Record<DepositStatus, PrismaDepositStatus> = {
      [DepositStatus.PENDING]: 'PENDING',
      [DepositStatus.COLLECTED]: 'RECEIVED',
      [DepositStatus.HELD]: 'HELD',
      [DepositStatus.RELEASED]: 'RELEASED',
      [DepositStatus.RETAINED]: 'RETAINED',
      [DepositStatus.PARTIALLY_RETAINED]: 'PARTIAL',
    };
    const result = statusMap[status];
    if (!result) throw new Error(`Ismeretlen kaució státusz: ${status}`);
    return result;
  }

  private mapPaymentMethodToPrisma(method: DepositPaymentMethod): PrismaDepositType {
    const methodMap: Record<DepositPaymentMethod, PrismaDepositType> = {
      [DepositPaymentMethod.CASH]: 'CASH',
      [DepositPaymentMethod.CARD]: 'CARD',
      [DepositPaymentMethod.BANK_TRANSFER]: 'BANK_TRANSFER',
      [DepositPaymentMethod.MYPOS_PREAUTH]: 'PRE_AUTH',
    };
    const result = methodMap[method];
    if (!result) throw new Error(`Ismeretlen fizetési mód: ${method}`);
    return result;
  }

  clear(): void {
    // No-op for Prisma
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async query(params: DepositQuery): Promise<DepositQueryResult> {
    const where: Prisma.DepositWhereInput = {
      tenantId: params.tenantId,
    };

    if (params.rentalId) {
      where.rentalId = params.rentalId;
    }
    if (params.status) {
      where.status = this.mapStatusToPrisma(params.status);
    }
    if (params.paymentMethod) {
      where.type = this.mapPaymentMethodToPrisma(params.paymentMethod);
    }
    if (params.createdFrom) {
      where.receivedAt = { gte: params.createdFrom };
    }
    if (params.createdTo) {
      where.receivedAt = { ...(where.receivedAt as object), lte: params.createdTo };
    }
    if (params.minAmount !== undefined) {
      where.amount = { gte: params.minAmount };
    }
    if (params.maxAmount !== undefined) {
      where.amount = { ...(where.amount as object), lte: params.maxAmount };
    }

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;

    const [deposits, total] = await Promise.all([
      this.prisma.deposit.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.deposit.count({ where }),
    ]);

    return {
      deposits: deposits.map(d => this.toDepositDomain(d)),
      total,
      offset,
      limit,
    };
  }

  async findById(id: string, tenantId: string): Promise<IDeposit | null> {
    const deposit = await this.prisma.deposit.findFirst({
      where: { id, tenantId },
    });
    return deposit ? this.toDepositDomain(deposit) : null;
  }

  async findByRentalId(rentalId: string, tenantId: string): Promise<IDeposit | null> {
    const deposit = await this.prisma.deposit.findFirst({
      where: { rentalId, tenantId },
    });
    return deposit ? this.toDepositDomain(deposit) : null;
  }

  // ============================================
  // CREATE / UPDATE
  // ============================================

  async create(tenantId: string, data: CreateDepositInput, createdBy: string): Promise<IDeposit> {
    // Check if deposit already exists for rental
    const existing = await this.findByRentalId(data.rentalId, tenantId);
    if (existing) {
      throw new Error(`Kaució már létezik ehhez a bérléshez: ${data.rentalId}`);
    }

    // H2 FIX: Validate amount is positive
    if (data.amount <= 0) {
      throw new Error('A kaució összegnek pozitívnak kell lennie');
    }

    const deposit = await this.prisma.deposit.create({
      data: {
        tenantId,
        rentalId: data.rentalId,
        type: this.mapPaymentMethodToPrisma(data.paymentMethod),
        status: 'PENDING',
        amount: data.amount,
        myposTransactionId: data.myposTransactionId ?? null,
        notes: data.notes ?? null,
        receivedBy: createdBy,
      },
    });

    // Add transaction record
    await this.prisma.depositTransaction.create({
      data: {
        depositId: deposit.id,
        transactionType: 'RECEIVE',
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        reference: data.myposTransactionId ?? null,
        notes: data.notes ?? null,
        processedBy: createdBy,
      },
    });

    return this.toDepositDomain(deposit);
  }

  async update(id: string, tenantId: string, data: UpdateDepositInput): Promise<IDeposit> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Kaució nem található');
    }

    const updateData: Prisma.DepositUpdateManyMutationInput = {};

    if (data.status !== undefined) {
      updateData.status = this.mapStatusToPrisma(data.status);
    }
    if (data.myposTransactionId !== undefined) {
      updateData.myposTransactionId = data.myposTransactionId;
    }

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    const result = await this.prisma.deposit.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (result.count === 0) {
      throw new Error('Kaució frissítése sikertelen');
    }

    // M3 FIX: Explicit null check instead of non-null assertion
    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Kaució nem található frissítés után');
    }
    return updated;
  }

  // ============================================
  // STATUS TRANSITIONS
  // ============================================

  async collect(id: string, tenantId: string, collectedBy: string): Promise<IDeposit> {
    const deposit = await this.findById(id, tenantId);
    if (!deposit) {
      throw new Error('Kaució nem található');
    }

    if (deposit.status !== DepositStatus.PENDING) {
      throw new Error(`A kaució nem várakozó állapotban van: ${deposit.status}`);
    }

    await this.prisma.deposit.updateMany({
      where: { id, tenantId },
      data: { status: 'RECEIVED' },
    });

    await this.addTransactionRecord(id, 'COLLECT', deposit.amount, collectedBy);

    // M3 FIX: Explicit null check
    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Kaució nem található frissítés után');
    }
    return updated;
  }

  async hold(id: string, tenantId: string, myposTransactionId: string): Promise<IDeposit> {
    const deposit = await this.findById(id, tenantId);
    if (!deposit) {
      throw new Error('Kaució nem található');
    }

    if (deposit.status !== DepositStatus.PENDING && deposit.status !== DepositStatus.COLLECTED) {
      throw new Error(`A kaució nem tartható vissza ebben az állapotban: ${deposit.status}`);
    }

    await this.prisma.deposit.updateMany({
      where: { id, tenantId },
      data: {
        status: 'HELD',
        myposTransactionId,
      },
    });

    await this.addTransactionRecord(
      id,
      'HOLD',
      deposit.amount,
      deposit.createdBy,
      myposTransactionId
    );

    // M3 FIX: Explicit null check
    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Kaució nem található frissítés után');
    }
    return updated;
  }

  async release(id: string, tenantId: string, releasedBy: string): Promise<IDeposit> {
    const deposit = await this.findById(id, tenantId);
    if (!deposit) {
      throw new Error('Kaució nem található');
    }

    if (deposit.status !== DepositStatus.COLLECTED && deposit.status !== DepositStatus.HELD) {
      throw new Error(`A kaució nem adható vissza ebben az állapotban: ${deposit.status}`);
    }

    await this.prisma.deposit.updateMany({
      where: { id, tenantId },
      data: {
        status: 'RELEASED',
        returnedAmount: deposit.amount,
        returnedAt: new Date(),
        returnedBy: releasedBy,
      },
    });

    await this.addTransactionRecord(id, 'RELEASE', deposit.amount, releasedBy);

    // M3 FIX: Explicit null check
    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Kaució nem található frissítés után');
    }
    return updated;
  }

  async retain(tenantId: string, data: RetainDepositInput, retainedBy: string): Promise<IDeposit> {
    const deposit = await this.findById(data.depositId, tenantId);
    if (!deposit) {
      throw new Error('Kaució nem található');
    }

    if (deposit.status !== DepositStatus.COLLECTED && deposit.status !== DepositStatus.HELD) {
      throw new Error(`A kaució nem tartható vissza ebben az állapotban: ${deposit.status}`);
    }

    // M2 FIX: Validate retainedAmount is not negative
    if (data.retainedAmount < 0) {
      throw new Error('A visszatartott összeg nem lehet negatív');
    }
    if (data.retainedAmount > deposit.amount) {
      throw new Error('A visszatartott összeg nem lehet nagyobb a kaució összegénél');
    }

    const isPartial = data.retainedAmount < deposit.amount;
    const newStatus: PrismaDepositStatus = isPartial ? 'PARTIAL' : 'RETAINED';
    const returnedAmount = deposit.amount - data.retainedAmount;

    await this.prisma.deposit.updateMany({
      where: { id: data.depositId, tenantId },
      data: {
        status: newStatus,
        retainedAmount: data.retainedAmount,
        returnedAmount: returnedAmount > 0 ? returnedAmount : null,
        retentionReason: `${data.reason}: ${data.description}`,
        returnedAt: new Date(),
        returnedBy: retainedBy,
      },
    });

    await this.addTransactionRecord(data.depositId, 'RETAIN', data.retainedAmount, retainedBy);

    // M3 FIX: Explicit null check
    const updated = await this.findById(data.depositId, tenantId);
    if (!updated) {
      throw new Error('Kaució nem található frissítés után');
    }
    return updated;
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async getByPartnerId(partnerId: string, tenantId: string): Promise<IDeposit[]> {
    const deposits = await this.prisma.deposit.findMany({
      where: {
        tenantId,
        rental: { partnerId },
      },
      orderBy: { receivedAt: 'desc' },
    });
    return deposits.map(d => this.toDepositDomain(d));
  }

  async getPendingDeposits(tenantId: string): Promise<IDeposit[]> {
    const deposits = await this.prisma.deposit.findMany({
      where: { tenantId, status: 'PENDING' },
      orderBy: { receivedAt: 'desc' },
    });
    return deposits.map(d => this.toDepositDomain(d));
  }

  async getHeldDeposits(tenantId: string): Promise<IDeposit[]> {
    const deposits = await this.prisma.deposit.findMany({
      where: { tenantId, status: 'HELD' },
      orderBy: { receivedAt: 'desc' },
    });
    return deposits.map(d => this.toDepositDomain(d));
  }

  async getStatistics(tenantId: string): Promise<DepositStatistics> {
    const [counts, totals, byMethod] = await Promise.all([
      this.prisma.deposit.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
        _sum: { amount: true },
      }),
      this.prisma.deposit.aggregate({
        where: { tenantId },
        _sum: { amount: true, retainedAmount: true },
        _count: true,
      }),
      this.prisma.deposit.groupBy({
        by: ['type'],
        where: { tenantId },
        _count: { type: true },
        _sum: { amount: true },
      }),
    ]);

    let pendingCount = 0;
    let collectedCount = 0;
    let heldCount = 0;
    let releasedCount = 0;
    let retainedCount = 0;
    let totalHeld = 0;
    let totalRetained = 0;

    for (const { status, _count, _sum } of counts) {
      if (status === 'PENDING') pendingCount = _count.status;
      if (status === 'RECEIVED') collectedCount = _count.status;
      if (status === 'HELD') {
        heldCount = _count.status;
        totalHeld = Number(_sum.amount ?? 0);
      }
      if (status === 'RELEASED') releasedCount = _count.status;
      if (status === 'RETAINED' || status === 'PARTIAL') {
        retainedCount += _count.status;
      }
    }

    totalRetained = Number(totals._sum.retainedAmount ?? 0);

    const byPaymentMethod: Record<DepositPaymentMethod, { count: number; amount: number }> = {
      [DepositPaymentMethod.CASH]: { count: 0, amount: 0 },
      [DepositPaymentMethod.CARD]: { count: 0, amount: 0 },
      [DepositPaymentMethod.MYPOS_PREAUTH]: { count: 0, amount: 0 },
      [DepositPaymentMethod.BANK_TRANSFER]: { count: 0, amount: 0 },
    };

    for (const { type, _count, _sum } of byMethod) {
      const methodMap: Record<PrismaDepositType, DepositPaymentMethod> = {
        CASH: DepositPaymentMethod.CASH,
        CARD: DepositPaymentMethod.CARD,
        BANK_TRANSFER: DepositPaymentMethod.BANK_TRANSFER,
        PRE_AUTH: DepositPaymentMethod.MYPOS_PREAUTH,
      };
      const method = methodMap[type];
      if (method) {
        byPaymentMethod[method] = {
          count: _count.type,
          amount: Number(_sum.amount ?? 0),
        };
      }
    }

    return {
      totalDeposits: totals._count,
      pendingCount,
      collectedCount,
      heldCount,
      releasedCount,
      retainedCount,
      totalAmount: Number(totals._sum.amount ?? 0),
      totalHeldAmount: totalHeld,
      totalRetainedAmount: totalRetained,
      byPaymentMethod,
    };
  }

  async countByStatus(tenantId: string): Promise<Record<DepositStatus, number>> {
    const counts = await this.prisma.deposit.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    });

    let pendingCount = 0;
    let collectedCount = 0;
    let heldCount = 0;
    let releasedCount = 0;
    let retainedCount = 0;
    let partiallyRetainedCount = 0;

    for (const { status, _count } of counts) {
      if (status === 'PENDING') pendingCount = _count.status;
      else if (status === 'RECEIVED') collectedCount = _count.status;
      else if (status === 'HELD') heldCount = _count.status;
      else if (status === 'RELEASED') releasedCount = _count.status;
      else if (status === 'RETAINED') retainedCount = _count.status;
      else if (status === 'PARTIAL') partiallyRetainedCount = _count.status;
    }

    return {
      [DepositStatus.PENDING]: pendingCount,
      [DepositStatus.COLLECTED]: collectedCount,
      [DepositStatus.HELD]: heldCount,
      [DepositStatus.RELEASED]: releasedCount,
      [DepositStatus.RETAINED]: retainedCount,
      [DepositStatus.PARTIALLY_RETAINED]: partiallyRetainedCount,
    } as Record<DepositStatus, number>;
  }

  // ============================================
  // AUDIT RECORDS
  // ============================================

  async getAuditRecords(depositId: string): Promise<IDepositAuditRecord[]> {
    const transactions = await this.prisma.depositTransaction.findMany({
      where: { depositId },
      orderBy: { processedAt: 'desc' },
    });

    return transactions.map(t => {
      const record: IDepositAuditRecord = {
        depositId: t.depositId,
        action: t.transactionType.toLowerCase() as
          | 'created'
          | 'collected'
          | 'held'
          | 'released'
          | 'retained',
        newStatus: this.mapActionToStatus(t.transactionType),
        amount: Number(t.amount),
        userId: t.processedBy,
        timestamp: t.processedAt,
      };
      if (t.notes !== null) {
        record.notes = t.notes;
      }
      return record;
    });
  }

  async addAuditRecord(
    record: Omit<IDepositAuditRecord, 'timestamp'>
  ): Promise<IDepositAuditRecord> {
    const transaction = await this.prisma.depositTransaction.create({
      data: {
        depositId: record.depositId,
        transactionType: record.action.toUpperCase(),
        amount: record.amount ?? 0,
        paymentMethod: 'system',
        notes: record.notes ?? null,
        processedBy: record.userId,
      },
    });

    const result: IDepositAuditRecord = {
      depositId: record.depositId,
      action: record.action,
      newStatus: record.newStatus,
      userId: record.userId,
      timestamp: transaction.processedAt,
    };
    if (record.previousStatus !== undefined) {
      result.previousStatus = record.previousStatus;
    }
    if (record.amount !== undefined) {
      result.amount = record.amount;
    }
    if (record.notes !== undefined) {
      result.notes = record.notes;
    }
    return result;
  }

  async getTotalHeldAmount(tenantId: string): Promise<number> {
    const result = await this.prisma.deposit.aggregate({
      where: { tenantId, status: 'HELD' },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  async getRetentionDetails(depositId: string, tenantId: string): Promise<DepositRetention | null> {
    const deposit = await this.prisma.deposit.findFirst({
      where: { id: depositId, tenantId, status: { in: ['RETAINED', 'PARTIAL'] } },
    });

    if (!deposit || !deposit.retentionReason) {
      return null;
    }

    // Parse retention reason (format: "reason: description")
    const [reasonStr, ...descParts] = deposit.retentionReason.split(': ');

    // Map stored reason to enum
    const reasonMap: Record<string, DepositRetentionReason> = {
      DAMAGE: DepositRetentionReason.EQUIPMENT_DAMAGE,
      EQUIPMENT_DAMAGE: DepositRetentionReason.EQUIPMENT_DAMAGE,
      MISSING: DepositRetentionReason.EQUIPMENT_LOST,
      EQUIPMENT_LOST: DepositRetentionReason.EQUIPMENT_LOST,
      LATE_FEE: DepositRetentionReason.LATE_FEE,
      CLEANING_FEE: DepositRetentionReason.CLEANING_FEE,
      OTHER: DepositRetentionReason.OTHER,
    };

    return {
      depositId: deposit.id,
      reason: reasonMap[reasonStr ?? ''] ?? DepositRetentionReason.OTHER,
      retainedAmount: Number(deposit.retainedAmount ?? 0),
      description: descParts.join(': '),
      attachments: [],
      retainedBy: deposit.returnedBy ?? '',
      retainedAt: deposit.returnedAt ?? new Date(),
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private mapActionToStatus(action: string): DepositStatus {
    const actionStatusMap: Record<string, DepositStatus> = {
      RECEIVE: DepositStatus.PENDING,
      COLLECT: DepositStatus.COLLECTED,
      HOLD: DepositStatus.HELD,
      RELEASE: DepositStatus.RELEASED,
      RETAIN: DepositStatus.RETAINED,
      CREATED: DepositStatus.PENDING,
      COLLECTED: DepositStatus.COLLECTED,
      HELD: DepositStatus.HELD,
      RELEASED: DepositStatus.RELEASED,
      RETAINED: DepositStatus.RETAINED,
    };
    return actionStatusMap[action.toUpperCase()] ?? DepositStatus.PENDING;
  }

  private async addTransactionRecord(
    depositId: string,
    type: string,
    amount: number,
    processedBy: string,
    reference?: string
  ): Promise<void> {
    await this.prisma.depositTransaction.create({
      data: {
        depositId,
        transactionType: type,
        amount,
        paymentMethod: 'system',
        reference: reference ?? null,
        processedBy,
      },
    });
  }
}
