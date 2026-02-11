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
      [DepositStatus.PENDING_PAYMENT]: 'PENDING',
      [DepositStatus.COLLECTED]: 'RECEIVED',
      [DepositStatus.PAID]: 'RECEIVED',
      [DepositStatus.HELD]: 'HELD',
      [DepositStatus.PENDING_SERVICE]: 'HELD',
      [DepositStatus.RELEASED]: 'RELEASED',
      [DepositStatus.REFUNDED]: 'RELEASED',
      [DepositStatus.RETAINED]: 'RETAINED',
      [DepositStatus.PARTIALLY_RETAINED]: 'PARTIAL',
      [DepositStatus.PARTIALLY_REFUNDED]: 'PARTIAL',
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
      [DepositPaymentMethod.MYPOS_SALE]: 'CARD', // Story 36-3: SALE uses CARD type
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
      [DepositPaymentMethod.MYPOS_SALE]: { count: 0, amount: 0 },
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
      [DepositStatus.PENDING_PAYMENT]: pendingCount,
      [DepositStatus.COLLECTED]: collectedCount,
      [DepositStatus.PAID]: collectedCount,
      [DepositStatus.HELD]: heldCount,
      [DepositStatus.PENDING_SERVICE]: heldCount,
      [DepositStatus.RELEASED]: releasedCount,
      [DepositStatus.REFUNDED]: releasedCount,
      [DepositStatus.RETAINED]: retainedCount,
      [DepositStatus.PARTIALLY_RETAINED]: partiallyRetainedCount,
      [DepositStatus.PARTIALLY_REFUNDED]: partiallyRetainedCount,
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

  // ============================================
  // ACCOUNTING & REPORTING (Epic 16-5)
  // ============================================

  /**
   * Get deposit accounting summary for a period
   * Used for month-end closing and financial reports
   * @param tenantId Tenant ID
   * @param startDate Start of period
   * @param endDate End of period
   * @param locationId Optional location filter
   */
  async getAccountingSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    locationId?: string
  ): Promise<{
    period: { start: Date; end: Date };
    received: { count: number; amount: number };
    released: { count: number; amount: number };
    retained: { count: number; amount: number };
    partiallyRetained: { count: number; retained: number; released: number };
    outstanding: { count: number; amount: number };
    byPaymentMethod: Record<string, { received: number; released: number; retained: number }>;
    byRetentionReason: Record<string, { count: number; amount: number }>;
    netChange: number;
  }> {
    // Build base filter
    const baseWhere: Prisma.DepositWhereInput = {
      tenantId,
    };

    if (locationId) {
      baseWhere.rental = { warehouseId: locationId };
    }

    // Get deposits received in period
    const receivedDeposits = await this.prisma.deposit.findMany({
      where: {
        ...baseWhere,
        receivedAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        type: true,
        amount: true,
      },
    });

    // Get deposits released/retained in period
    const settledDeposits = await this.prisma.deposit.findMany({
      where: {
        ...baseWhere,
        returnedAt: { gte: startDate, lte: endDate },
        status: { in: ['RELEASED', 'RETAINED', 'PARTIAL'] },
      },
      select: {
        id: true,
        type: true,
        status: true,
        amount: true,
        retainedAmount: true,
        returnedAmount: true,
        retentionReason: true,
      },
    });

    // Get outstanding deposits at end of period
    const outstandingDeposits = await this.prisma.deposit.aggregate({
      where: {
        ...baseWhere,
        status: { in: ['PENDING', 'RECEIVED', 'HELD'] },
        receivedAt: { lte: endDate },
      },
      _count: true,
      _sum: { amount: true },
    });

    // Calculate totals
    let receivedCount = receivedDeposits.length;
    let receivedAmount = 0;
    const byPaymentMethod: Record<
      string,
      { received: number; released: number; retained: number }
    > = {};

    for (const d of receivedDeposits) {
      const amount = Number(d.amount);
      receivedAmount += amount;

      const method = d.type;
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = { received: 0, released: 0, retained: 0 };
      }
      byPaymentMethod[method].received += amount;
    }

    let releasedCount = 0;
    let releasedAmount = 0;
    let retainedCount = 0;
    let retainedAmount = 0;
    let partialCount = 0;
    let partialRetained = 0;
    let partialReleased = 0;
    const byRetentionReason: Record<string, { count: number; amount: number }> = {};

    for (const d of settledDeposits) {
      const method = d.type;
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = { received: 0, released: 0, retained: 0 };
      }

      if (d.status === 'RELEASED') {
        releasedCount++;
        const amount = Number(d.amount);
        releasedAmount += amount;
        byPaymentMethod[method].released += amount;
      } else if (d.status === 'RETAINED') {
        retainedCount++;
        const amount = Number(d.retainedAmount ?? d.amount);
        retainedAmount += amount;
        byPaymentMethod[method].retained += amount;

        // Track by retention reason
        const reason = d.retentionReason?.split(':')[0] ?? 'OTHER';
        if (!byRetentionReason[reason]) {
          byRetentionReason[reason] = { count: 0, amount: 0 };
        }
        byRetentionReason[reason].count++;
        byRetentionReason[reason].amount += amount;
      } else if (d.status === 'PARTIAL') {
        partialCount++;
        const retained = Number(d.retainedAmount ?? 0);
        const released = Number(d.returnedAmount ?? 0);
        partialRetained += retained;
        partialReleased += released;
        byPaymentMethod[method].retained += retained;
        byPaymentMethod[method].released += released;

        // Track by retention reason
        const reason = d.retentionReason?.split(':')[0] ?? 'OTHER';
        if (!byRetentionReason[reason]) {
          byRetentionReason[reason] = { count: 0, amount: 0 };
        }
        byRetentionReason[reason].count++;
        byRetentionReason[reason].amount += retained;
      }
    }

    // Net change = received - (released + partial released)
    const totalReleased = releasedAmount + partialReleased;
    const netChange = receivedAmount - totalReleased;

    return {
      period: { start: startDate, end: endDate },
      received: { count: receivedCount, amount: receivedAmount },
      released: { count: releasedCount, amount: releasedAmount },
      retained: { count: retainedCount, amount: retainedAmount },
      partiallyRetained: {
        count: partialCount,
        retained: partialRetained,
        released: partialReleased,
      },
      outstanding: {
        count: outstandingDeposits._count,
        amount: Number(outstandingDeposits._sum.amount ?? 0),
      },
      byPaymentMethod,
      byRetentionReason,
      netChange,
    };
  }

  /**
   * Get daily deposit movement report
   * @param tenantId Tenant ID
   * @param date Date to report on
   * @param locationId Optional location filter
   */
  async getDailyReport(
    tenantId: string,
    date: Date,
    locationId?: string
  ): Promise<{
    date: Date;
    openingBalance: { count: number; amount: number };
    received: Array<{
      depositId: string;
      rentalCode: string;
      amount: number;
      method: string;
      receivedAt: Date;
    }>;
    released: Array<{ depositId: string; rentalCode: string; amount: number; releasedAt: Date }>;
    retained: Array<{
      depositId: string;
      rentalCode: string;
      amount: number;
      reason: string;
      retainedAt: Date;
    }>;
    closingBalance: { count: number; amount: number };
    cashMovement: { in: number; out: number; net: number };
    cardMovement: { in: number; out: number; net: number };
  }> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const baseWhere: Prisma.DepositWhereInput = { tenantId };
    if (locationId) {
      baseWhere.rental = { warehouseId: locationId };
    }

    // Opening balance (deposits active at start of day)
    const openingBalance = await this.prisma.deposit.aggregate({
      where: {
        ...baseWhere,
        receivedAt: { lt: dayStart },
        OR: [
          { status: { in: ['PENDING', 'RECEIVED', 'HELD'] } },
          { returnedAt: { gte: dayStart } },
        ],
      },
      _count: true,
      _sum: { amount: true },
    });

    // Deposits received today
    const receivedToday = await this.prisma.deposit.findMany({
      where: {
        ...baseWhere,
        receivedAt: { gte: dayStart, lte: dayEnd },
      },
      include: { rental: { select: { rentalCode: true } } },
    });

    // Deposits released today
    const releasedToday = await this.prisma.deposit.findMany({
      where: {
        ...baseWhere,
        returnedAt: { gte: dayStart, lte: dayEnd },
        status: 'RELEASED',
      },
      include: { rental: { select: { rentalCode: true } } },
    });

    // Deposits retained today
    const retainedToday = await this.prisma.deposit.findMany({
      where: {
        ...baseWhere,
        returnedAt: { gte: dayStart, lte: dayEnd },
        status: { in: ['RETAINED', 'PARTIAL'] },
      },
      include: { rental: { select: { rentalCode: true } } },
    });

    // Closing balance
    const closingBalance = await this.prisma.deposit.aggregate({
      where: {
        ...baseWhere,
        receivedAt: { lte: dayEnd },
        status: { in: ['PENDING', 'RECEIVED', 'HELD'] },
      },
      _count: true,
      _sum: { amount: true },
    });

    // Calculate cash and card movements
    let cashIn = 0;
    let cashOut = 0;
    let cardIn = 0;
    let cardOut = 0;

    for (const d of receivedToday) {
      const amount = Number(d.amount);
      if (d.type === 'CASH') cashIn += amount;
      if (d.type === 'CARD') cardIn += amount;
    }

    for (const d of releasedToday) {
      const amount = Number(d.amount);
      if (d.type === 'CASH') cashOut += amount;
      if (d.type === 'CARD') cardOut += amount;
    }

    // For partial returns, only the returned portion is an out
    for (const d of retainedToday) {
      if (d.status === 'PARTIAL') {
        const returned = Number(d.returnedAmount ?? 0);
        if (d.type === 'CASH') cashOut += returned;
        if (d.type === 'CARD') cardOut += returned;
      }
      // Full retentions don't have cash out (money kept)
    }

    return {
      date,
      openingBalance: {
        count: openingBalance._count,
        amount: Number(openingBalance._sum.amount ?? 0),
      },
      received: receivedToday.map(d => ({
        depositId: d.id,
        rentalCode: d.rental?.rentalCode ?? '',
        amount: Number(d.amount),
        method: d.type,
        receivedAt: d.receivedAt,
      })),
      released: releasedToday.map(d => ({
        depositId: d.id,
        rentalCode: d.rental?.rentalCode ?? '',
        amount: Number(d.amount),
        releasedAt: d.returnedAt ?? new Date(),
      })),
      retained: retainedToday.map(d => ({
        depositId: d.id,
        rentalCode: d.rental?.rentalCode ?? '',
        amount: Number(d.retainedAmount ?? d.amount),
        reason: d.retentionReason ?? 'N/A',
        retainedAt: d.returnedAt ?? new Date(),
      })),
      closingBalance: {
        count: closingBalance._count,
        amount: Number(closingBalance._sum.amount ?? 0),
      },
      cashMovement: { in: cashIn, out: cashOut, net: cashIn - cashOut },
      cardMovement: { in: cardIn, out: cardOut, net: cardIn - cardOut },
    };
  }

  /**
   * Reconcile deposits with returned rentals
   * Finds discrepancies between deposit and rental records
   * @param tenantId Tenant ID
   * @param startDate Start of period
   * @param endDate End of period
   */
  async reconcileDeposits(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    matched: number;
    missingDeposit: Array<{ rentalId: string; rentalCode: string; expectedAmount: number }>;
    missingReturn: Array<{
      depositId: string;
      rentalCode: string;
      depositAmount: number;
      daysHeld: number;
    }>;
    amountMismatch: Array<{
      rentalId: string;
      rentalCode: string;
      expectedAmount: number;
      actualAmount: number;
    }>;
  }> {
    // Get returned rentals in period
    const returnedRentals = await this.prisma.rental.findMany({
      where: {
        tenantId,
        returnedAt: { gte: startDate, lte: endDate },
        status: 'RETURNED',
      },
      select: {
        id: true,
        rentalCode: true,
        depositRequired: true,
        depositReturned: true,
        depositRetained: true,
      },
    });

    // Get deposits for these rentals
    const rentalIds = returnedRentals.map(r => r.id);
    const deposits = await this.prisma.deposit.findMany({
      where: {
        tenantId,
        rentalId: { in: rentalIds },
      },
    });

    const depositByRentalId = new Map(deposits.map(d => [d.rentalId, d]));

    let matched = 0;
    const missingDeposit: Array<{ rentalId: string; rentalCode: string; expectedAmount: number }> =
      [];
    const amountMismatch: Array<{
      rentalId: string;
      rentalCode: string;
      expectedAmount: number;
      actualAmount: number;
    }> = [];

    for (const rental of returnedRentals) {
      const deposit = depositByRentalId.get(rental.id);
      const expectedAmount = Number(rental.depositRequired);

      if (!deposit && expectedAmount > 0) {
        // Rental required deposit but none found
        missingDeposit.push({
          rentalId: rental.id,
          rentalCode: rental.rentalCode,
          expectedAmount,
        });
      } else if (deposit) {
        const actualAmount = Number(deposit.amount);
        if (actualAmount !== expectedAmount) {
          // Amount mismatch
          amountMismatch.push({
            rentalId: rental.id,
            rentalCode: rental.rentalCode,
            expectedAmount,
            actualAmount,
          });
        } else {
          matched++;
        }
      } else {
        // No deposit required and none exists - OK
        matched++;
      }
    }

    // Find deposits held too long (rental returned but deposit not settled)
    const now = new Date();
    const overdueDeposits = await this.prisma.deposit.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'RECEIVED', 'HELD'] },
        rental: {
          returnedAt: { lt: startDate }, // Rental returned before period
        },
      },
      include: {
        rental: { select: { rentalCode: true, returnedAt: true } },
      },
    });

    const missingReturn = overdueDeposits.map(d => ({
      depositId: d.id,
      rentalCode: d.rental?.rentalCode ?? '',
      depositAmount: Number(d.amount),
      daysHeld: Math.floor((now.getTime() - d.receivedAt.getTime()) / (1000 * 60 * 60 * 24)),
    }));

    return {
      matched,
      missingDeposit,
      missingReturn,
      amountMismatch,
    };
  }

  /**
   * Get deposit aging report
   * Shows deposits by how long they've been held
   * @param tenantId Tenant ID
   * @param asOfDate Date to calculate aging from
   */
  async getAgingReport(
    tenantId: string,
    asOfDate: Date
  ): Promise<{
    asOfDate: Date;
    current: { count: number; amount: number }; // 0-7 days
    week1: { count: number; amount: number }; // 8-14 days
    week2: { count: number; amount: number }; // 15-21 days
    week3: { count: number; amount: number }; // 22-28 days
    over28Days: { count: number; amount: number };
    total: { count: number; amount: number };
    details: Array<{
      depositId: string;
      rentalCode: string;
      amount: number;
      daysHeld: number;
      bucket: 'current' | 'week1' | 'week2' | 'week3' | 'over28';
    }>;
  }> {
    const activeDeposits = await this.prisma.deposit.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'RECEIVED', 'HELD'] },
        receivedAt: { lte: asOfDate },
      },
      include: {
        rental: { select: { rentalCode: true } },
      },
    });

    const buckets = {
      current: { count: 0, amount: 0 },
      week1: { count: 0, amount: 0 },
      week2: { count: 0, amount: 0 },
      week3: { count: 0, amount: 0 },
      over28Days: { count: 0, amount: 0 },
    };

    const details: Array<{
      depositId: string;
      rentalCode: string;
      amount: number;
      daysHeld: number;
      bucket: 'current' | 'week1' | 'week2' | 'week3' | 'over28';
    }> = [];

    for (const d of activeDeposits) {
      const daysHeld = Math.floor(
        (asOfDate.getTime() - d.receivedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const amount = Number(d.amount);

      let bucket: 'current' | 'week1' | 'week2' | 'week3' | 'over28';
      if (daysHeld <= 7) {
        bucket = 'current';
        buckets.current.count++;
        buckets.current.amount += amount;
      } else if (daysHeld <= 14) {
        bucket = 'week1';
        buckets.week1.count++;
        buckets.week1.amount += amount;
      } else if (daysHeld <= 21) {
        bucket = 'week2';
        buckets.week2.count++;
        buckets.week2.amount += amount;
      } else if (daysHeld <= 28) {
        bucket = 'week3';
        buckets.week3.count++;
        buckets.week3.amount += amount;
      } else {
        bucket = 'over28';
        buckets.over28Days.count++;
        buckets.over28Days.amount += amount;
      }

      details.push({
        depositId: d.id,
        rentalCode: d.rental?.rentalCode ?? '',
        amount,
        daysHeld,
        bucket,
      });
    }

    // Sort details by days held descending
    details.sort((a, b) => b.daysHeld - a.daysHeld);

    const totalCount =
      buckets.current.count +
      buckets.week1.count +
      buckets.week2.count +
      buckets.week3.count +
      buckets.over28Days.count;
    const totalAmount =
      buckets.current.amount +
      buckets.week1.amount +
      buckets.week2.amount +
      buckets.week3.amount +
      buckets.over28Days.amount;

    return {
      asOfDate,
      current: buckets.current,
      week1: buckets.week1,
      week2: buckets.week2,
      week3: buckets.week3,
      over28Days: buckets.over28Days,
      total: { count: totalCount, amount: totalAmount },
      details: details.slice(0, 100), // Limit to top 100
    };
  }
}
