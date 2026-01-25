/**
 * @kgc/rental-checkout - Deposit Repository
 * Epic 16: Kaució kezelés
 *
 * Repository interface and InMemory implementation for Deposit entity.
 */

import { Injectable } from '@nestjs/common';
import type {
  DepositPaymentMethod,
  DepositRetentionReason,
  IDeposit,
  IDepositAuditRecord,
} from '../interfaces/deposit.interface';
import { DepositStatus } from '../interfaces/deposit.interface';

// ============================================
// REPOSITORY TOKEN
// ============================================

export const DEPOSIT_REPOSITORY = Symbol('DEPOSIT_REPOSITORY');

// ============================================
// QUERY INTERFACE
// ============================================

export interface DepositQuery {
  tenantId: string;
  rentalId?: string;
  partnerId?: string;
  status?: DepositStatus;
  paymentMethod?: DepositPaymentMethod;
  createdFrom?: Date;
  createdTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  offset?: number;
  limit?: number;
}

export interface DepositQueryResult {
  deposits: IDeposit[];
  total: number;
  offset: number;
  limit: number;
}

// ============================================
// CREATE INPUT
// ============================================

export interface CreateDepositInput {
  rentalId: string;
  partnerId: string;
  amount: number;
  paymentMethod: DepositPaymentMethod;
  myposTransactionId?: string;
  notes?: string;
}

// ============================================
// UPDATE INPUT
// ============================================

export interface UpdateDepositInput {
  status?: DepositStatus;
  myposTransactionId?: string;
}

// ============================================
// RETENTION INPUT
// ============================================

export interface RetainDepositInput {
  depositId: string;
  reason: DepositRetentionReason;
  retainedAmount: number;
  description: string;
  attachments?: string[];
}

// ============================================
// REPOSITORY INTERFACE
// ============================================

export interface IDepositRepository {
  /**
   * Query deposits with filters and pagination
   */
  query(params: DepositQuery): Promise<DepositQueryResult>;

  /**
   * Find deposit by ID
   */
  findById(id: string, tenantId: string): Promise<IDeposit | null>;

  /**
   * Find deposit by rental ID
   */
  findByRentalId(rentalId: string, tenantId: string): Promise<IDeposit | null>;

  /**
   * Create new deposit
   */
  create(tenantId: string, data: CreateDepositInput, createdBy: string): Promise<IDeposit>;

  /**
   * Update deposit status
   */
  update(id: string, tenantId: string, data: UpdateDepositInput): Promise<IDeposit>;

  /**
   * Collect deposit (mark as collected)
   */
  collect(id: string, tenantId: string, collectedBy: string): Promise<IDeposit>;

  /**
   * Hold deposit (MyPOS pre-auth)
   */
  hold(id: string, tenantId: string, myposTransactionId: string): Promise<IDeposit>;

  /**
   * Release deposit (return to customer)
   */
  release(id: string, tenantId: string, releasedBy: string): Promise<IDeposit>;

  /**
   * Retain deposit (full or partial)
   */
  retain(tenantId: string, data: RetainDepositInput, retainedBy: string): Promise<IDeposit>;

  /**
   * Get deposits by partner
   */
  getByPartnerId(partnerId: string, tenantId: string): Promise<IDeposit[]>;

  /**
   * Get pending deposits
   */
  getPendingDeposits(tenantId: string): Promise<IDeposit[]>;

  /**
   * Get held deposits (for MyPOS reconciliation)
   */
  getHeldDeposits(tenantId: string): Promise<IDeposit[]>;

  /**
   * Get deposit statistics
   */
  getStatistics(tenantId: string): Promise<DepositStatistics>;

  /**
   * Count deposits by status
   */
  countByStatus(tenantId: string): Promise<Record<DepositStatus, number>>;

  /**
   * Get audit records for deposit
   */
  getAuditRecords(depositId: string): Promise<IDepositAuditRecord[]>;

  /**
   * Add audit record
   */
  addAuditRecord(record: Omit<IDepositAuditRecord, 'timestamp'>): Promise<IDepositAuditRecord>;

  /**
   * Calculate total held amount for tenant
   */
  getTotalHeldAmount(tenantId: string): Promise<number>;

  /**
   * Get retention details for a deposit
   */
  getRetentionDetails(depositId: string, tenantId: string): Promise<DepositRetention | null>;

  /**
   * Clear all data (for testing)
   */
  clear(): void;
}

// ============================================
// STATISTICS INTERFACE
// ============================================

export interface DepositStatistics {
  totalDeposits: number;
  pendingCount: number;
  collectedCount: number;
  heldCount: number;
  releasedCount: number;
  retainedCount: number;
  totalAmount: number;
  totalHeldAmount: number;
  totalRetainedAmount: number;
  byPaymentMethod: Record<DepositPaymentMethod, { count: number; amount: number }>;
}

// ============================================
// RETENTION RECORD
// ============================================

export interface DepositRetention {
  depositId: string;
  reason: DepositRetentionReason;
  retainedAmount: number;
  description: string;
  attachments: string[];
  retainedBy: string;
  retainedAt: Date;
}

// ============================================
// IN-MEMORY IMPLEMENTATION
// ============================================

@Injectable()
export class InMemoryDepositRepository implements IDepositRepository {
  private deposits: Map<string, IDeposit> = new Map();
  private auditRecords: Map<string, IDepositAuditRecord[]> = new Map();
  private retentions: Map<string, DepositRetention> = new Map();

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.deposits.clear();
    this.auditRecords.clear();
    this.retentions.clear();
  }

  async query(params: DepositQuery): Promise<DepositQueryResult> {
    let results = Array.from(this.deposits.values()).filter(d => d.tenantId === params.tenantId);

    // Apply filters
    if (params.rentalId) {
      results = results.filter(d => d.rentalId === params.rentalId);
    }
    if (params.partnerId) {
      results = results.filter(d => d.partnerId === params.partnerId);
    }
    if (params.status) {
      results = results.filter(d => d.status === params.status);
    }
    if (params.paymentMethod) {
      results = results.filter(d => d.paymentMethod === params.paymentMethod);
    }
    if (params.createdFrom) {
      results = results.filter(d => d.createdAt >= params.createdFrom!);
    }
    if (params.createdTo) {
      results = results.filter(d => d.createdAt <= params.createdTo!);
    }
    if (params.minAmount !== undefined) {
      results = results.filter(d => d.amount >= params.minAmount!);
    }
    if (params.maxAmount !== undefined) {
      results = results.filter(d => d.amount <= params.maxAmount!);
    }

    // Sort by created date descending
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = results.length;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;
    results = results.slice(offset, offset + limit);

    return { deposits: results, total, offset, limit };
  }

  async findById(id: string, tenantId: string): Promise<IDeposit | null> {
    const deposit = this.deposits.get(id);
    if (!deposit || deposit.tenantId !== tenantId) return null;
    return deposit;
  }

  async findByRentalId(rentalId: string, tenantId: string): Promise<IDeposit | null> {
    return (
      Array.from(this.deposits.values()).find(
        d => d.rentalId === rentalId && d.tenantId === tenantId
      ) ?? null
    );
  }

  async create(tenantId: string, data: CreateDepositInput, createdBy: string): Promise<IDeposit> {
    // Check if deposit already exists for rental
    const existing = await this.findByRentalId(data.rentalId, tenantId);
    if (existing) {
      throw new Error(`Kaució már létezik ehhez a bérléshez: ${data.rentalId}`);
    }

    // Validate amount
    if (data.amount <= 0) {
      throw new Error('A kaució összegnek pozitívnak kell lennie');
    }

    const now = new Date();
    const id = crypto.randomUUID();

    const deposit: IDeposit = {
      id,
      tenantId,
      rentalId: data.rentalId,
      partnerId: data.partnerId,
      amount: data.amount,
      status: DepositStatus.PENDING,
      paymentMethod: data.paymentMethod,
      ...(data.myposTransactionId !== undefined && { myposTransactionId: data.myposTransactionId }),
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    this.deposits.set(id, deposit);
    this.auditRecords.set(id, []);

    // Add audit record
    await this.addAuditRecord({
      depositId: id,
      action: 'created',
      newStatus: DepositStatus.PENDING,
      amount: data.amount,
      userId: createdBy,
      ...(data.notes !== undefined && { notes: data.notes }),
    });

    return deposit;
  }

  async update(id: string, tenantId: string, data: UpdateDepositInput): Promise<IDeposit> {
    const deposit = await this.findById(id, tenantId);
    if (!deposit) {
      throw new Error('Kaució nem található');
    }

    const updated: IDeposit = {
      ...deposit,
      ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
      updatedAt: new Date(),
    };

    this.deposits.set(id, updated);
    return updated;
  }

  async collect(id: string, tenantId: string, collectedBy: string): Promise<IDeposit> {
    const deposit = await this.findById(id, tenantId);
    if (!deposit) {
      throw new Error('Kaució nem található');
    }

    if (deposit.status !== DepositStatus.PENDING) {
      throw new Error(`A kaució nem várakozó állapotban van: ${deposit.status}`);
    }

    const previousStatus = deposit.status;
    const updated = await this.update(id, tenantId, { status: DepositStatus.COLLECTED });

    await this.addAuditRecord({
      depositId: id,
      action: 'collected',
      previousStatus,
      newStatus: DepositStatus.COLLECTED,
      userId: collectedBy,
    });

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

    const previousStatus = deposit.status;
    const updated = await this.update(id, tenantId, {
      status: DepositStatus.HELD,
      myposTransactionId,
    });

    await this.addAuditRecord({
      depositId: id,
      action: 'held',
      previousStatus,
      newStatus: DepositStatus.HELD,
      userId: deposit.createdBy,
      notes: `MyPOS tranzakció: ${myposTransactionId}`,
    });

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

    const previousStatus = deposit.status;
    const updated = await this.update(id, tenantId, { status: DepositStatus.RELEASED });

    await this.addAuditRecord({
      depositId: id,
      action: 'released',
      previousStatus,
      newStatus: DepositStatus.RELEASED,
      amount: deposit.amount,
      userId: releasedBy,
    });

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

    if (data.retainedAmount > deposit.amount) {
      throw new Error('A visszatartott összeg nem lehet nagyobb a kaució összegénél');
    }

    const previousStatus = deposit.status;
    const newStatus: DepositStatus =
      data.retainedAmount === deposit.amount
        ? DepositStatus.RETAINED
        : DepositStatus.PARTIALLY_RETAINED;

    const updated = await this.update(data.depositId, tenantId, { status: newStatus });

    // Store retention details
    this.retentions.set(data.depositId, {
      depositId: data.depositId,
      reason: data.reason,
      retainedAmount: data.retainedAmount,
      description: data.description,
      attachments: data.attachments ?? [],
      retainedBy,
      retainedAt: new Date(),
    });

    await this.addAuditRecord({
      depositId: data.depositId,
      action: 'retained',
      previousStatus,
      newStatus,
      amount: data.retainedAmount,
      userId: retainedBy,
      notes: `${data.reason}: ${data.description}`,
    });

    return updated;
  }

  async getByPartnerId(partnerId: string, tenantId: string): Promise<IDeposit[]> {
    return Array.from(this.deposits.values())
      .filter(d => d.tenantId === tenantId && d.partnerId === partnerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPendingDeposits(tenantId: string): Promise<IDeposit[]> {
    return Array.from(this.deposits.values())
      .filter(d => d.tenantId === tenantId && d.status === DepositStatus.PENDING)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getHeldDeposits(tenantId: string): Promise<IDeposit[]> {
    return Array.from(this.deposits.values())
      .filter(d => d.tenantId === tenantId && d.status === DepositStatus.HELD)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getStatistics(tenantId: string): Promise<DepositStatistics> {
    const deposits = Array.from(this.deposits.values()).filter(d => d.tenantId === tenantId);

    const byPaymentMethod: Record<string, { count: number; amount: number }> = {
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      mypos_preauth: { count: 0, amount: 0 },
      bank_transfer: { count: 0, amount: 0 },
    };

    let pendingCount = 0;
    let collectedCount = 0;
    let heldCount = 0;
    let releasedCount = 0;
    let retainedCount = 0;
    let totalAmount = 0;
    let totalHeldAmount = 0;
    let totalRetainedAmount = 0;

    for (const d of deposits) {
      totalAmount += d.amount;

      const method = byPaymentMethod[d.paymentMethod];
      if (method) {
        method.count++;
        method.amount += d.amount;
      }

      switch (d.status) {
        case DepositStatus.PENDING:
          pendingCount++;
          break;
        case DepositStatus.COLLECTED:
          collectedCount++;
          break;
        case DepositStatus.HELD:
          heldCount++;
          totalHeldAmount += d.amount;
          break;
        case DepositStatus.RELEASED:
          releasedCount++;
          break;
        case DepositStatus.RETAINED:
        case DepositStatus.PARTIALLY_RETAINED: {
          retainedCount++;
          const retention = this.retentions.get(d.id);
          if (retention) {
            totalRetainedAmount += retention.retainedAmount;
          }
          break;
        }
      }
    }

    return {
      totalDeposits: deposits.length,
      pendingCount,
      collectedCount,
      heldCount,
      releasedCount,
      retainedCount,
      totalAmount,
      totalHeldAmount,
      totalRetainedAmount,
      byPaymentMethod: byPaymentMethod as Record<
        DepositPaymentMethod,
        { count: number; amount: number }
      >,
    };
  }

  async countByStatus(tenantId: string): Promise<Record<DepositStatus, number>> {
    const counts: Record<string, number> = {
      pending: 0,
      collected: 0,
      held: 0,
      released: 0,
      retained: 0,
      partially_retained: 0,
    };

    for (const deposit of this.deposits.values()) {
      if (deposit.tenantId === tenantId) {
        counts[deposit.status] = (counts[deposit.status] ?? 0) + 1;
      }
    }

    return counts as Record<DepositStatus, number>;
  }

  async getAuditRecords(depositId: string): Promise<IDepositAuditRecord[]> {
    return (this.auditRecords.get(depositId) ?? []).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async addAuditRecord(
    record: Omit<IDepositAuditRecord, 'timestamp'>
  ): Promise<IDepositAuditRecord> {
    const auditRecord: IDepositAuditRecord = {
      ...record,
      timestamp: new Date(),
    };

    const records = this.auditRecords.get(record.depositId) ?? [];
    records.push(auditRecord);
    this.auditRecords.set(record.depositId, records);

    return auditRecord;
  }

  async getTotalHeldAmount(tenantId: string): Promise<number> {
    return Array.from(this.deposits.values())
      .filter(d => d.tenantId === tenantId && d.status === DepositStatus.HELD)
      .reduce((sum, d) => sum + d.amount, 0);
  }

  async getRetentionDetails(depositId: string, tenantId: string): Promise<DepositRetention | null> {
    // Verify deposit exists and belongs to tenant
    const deposit = await this.findById(depositId, tenantId);
    if (!deposit) {
      return null;
    }
    return this.retentions.get(depositId) ?? null;
  }
}
