/**
 * @kgc/rental-checkout - DepositReportService
 * Story 16-5: Kaució könyvelés és riport
 *
 * Riport és aggregáció a kaució mozgásokról
 */

import { Injectable } from '@nestjs/common';
import { DepositStatus, IDeposit } from '../interfaces/deposit.interface';

/**
 * Kaució összesítő interfész
 */
export interface IDepositSummary {
  /** Összes kaució darab */
  totalCount: number;
  /** Összes kaució összeg (HUF) */
  totalAmount: number;
  /** Státusz szerinti bontás */
  byStatus: Record<DepositStatus, { count: number; amount: number }>;
  /** Generálás időpontja */
  generatedAt: Date;
}

/**
 * Kaució mozgás riport interfész
 */
export interface IDepositMovementReport {
  /** Időszak kezdete */
  from: Date;
  /** Időszak vége */
  to: Date;
  /** Felvételek */
  collections: IDeposit[];
  /** Visszaadások */
  releases: IDeposit[];
  /** Visszatartások */
  retentions: IDeposit[];
  /** Összesítés */
  summary: {
    collectedAmount: number;
    releasedAmount: number;
    retainedAmount: number;
    netChange: number;
  };
  /** Generálás időpontja */
  generatedAt: Date;
}

/**
 * Repository interface for report queries
 */
export interface IDepositReportRepository {
  findByTenant(tenantId: string): Promise<IDeposit[]>;
  findByDateRange(tenantId: string, from: Date, to: Date): Promise<IDeposit[]>;
  countByStatus(tenantId: string): Promise<Record<DepositStatus, number>>;
  sumByStatus(tenantId: string): Promise<Record<DepositStatus, number>>;
}

/**
 * Deposit Report Service
 *
 * Riportok és aggregációk generálása kaució adatokból.
 */
@Injectable()
export class DepositReportService {
  constructor(private readonly reportRepository: IDepositReportRepository) {}

  /**
   * Aktív kauciók összesítője
   *
   * @param tenantId - Tenant azonosító
   * @returns Kaució összesítő
   */
  async getSummary(tenantId: string): Promise<IDepositSummary> {
    const deposits = await this.reportRepository.findByTenant(tenantId);

    const byStatus = this.initializeStatusMap();

    let totalCount = 0;
    let totalAmount = 0;

    for (const deposit of deposits) {
      totalCount++;
      totalAmount += deposit.amount;

      const statusEntry = byStatus[deposit.status];
      if (statusEntry) {
        statusEntry.count++;
        statusEntry.amount += deposit.amount;
      }
    }

    return {
      totalCount,
      totalAmount,
      byStatus,
      generatedAt: new Date(),
    };
  }

  /**
   * Kaució mozgás riport időszakra
   *
   * @param tenantId - Tenant azonosító
   * @param from - Időszak kezdete
   * @param to - Időszak vége
   * @returns Mozgás riport
   */
  async getMovementReport(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<IDepositMovementReport> {
    const deposits = await this.reportRepository.findByDateRange(tenantId, from, to);

    const collections: IDeposit[] = [];
    const releases: IDeposit[] = [];
    const retentions: IDeposit[] = [];

    let collectedAmount = 0;
    let releasedAmount = 0;
    let retainedAmount = 0;

    for (const deposit of deposits) {
      switch (deposit.status) {
        case DepositStatus.COLLECTED:
        case DepositStatus.HELD:
          collections.push(deposit);
          collectedAmount += deposit.amount;
          break;
        case DepositStatus.RELEASED:
          releases.push(deposit);
          releasedAmount += deposit.amount;
          break;
        case DepositStatus.RETAINED:
        case DepositStatus.PARTIALLY_RETAINED:
          retentions.push(deposit);
          retainedAmount += deposit.amount;
          break;
      }
    }

    return {
      from,
      to,
      collections,
      releases,
      retentions,
      summary: {
        collectedAmount,
        releasedAmount,
        retainedAmount,
        netChange: collectedAmount - releasedAmount - retainedAmount,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Aktív (nem lezárt) kauciók listája
   *
   * @param tenantId - Tenant azonosító
   * @returns Aktív kauciók
   */
  async getActiveDeposits(tenantId: string): Promise<IDeposit[]> {
    const deposits = await this.reportRepository.findByTenant(tenantId);
    return deposits.filter(
      (d) => d.status === DepositStatus.COLLECTED || d.status === DepositStatus.HELD,
    );
  }

  /**
   * Export riport JSON formátumban
   *
   * @param tenantId - Tenant azonosító
   * @param from - Időszak kezdete
   * @param to - Időszak vége
   * @returns JSON export
   */
  async exportToJson(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<{
    summary: IDepositSummary;
    movements: IDepositMovementReport;
    exportedAt: Date;
    tenantId: string;
  }> {
    const [summary, movements] = await Promise.all([
      this.getSummary(tenantId),
      this.getMovementReport(tenantId, from, to),
    ]);

    return {
      summary,
      movements,
      exportedAt: new Date(),
      tenantId,
    };
  }

  /**
   * Státusz map inicializálás
   */
  private initializeStatusMap(): Record<DepositStatus, { count: number; amount: number }> {
    return {
      [DepositStatus.PENDING]: { count: 0, amount: 0 },
      [DepositStatus.PENDING_PAYMENT]: { count: 0, amount: 0 },
      [DepositStatus.COLLECTED]: { count: 0, amount: 0 },
      [DepositStatus.PAID]: { count: 0, amount: 0 },
      [DepositStatus.HELD]: { count: 0, amount: 0 },
      [DepositStatus.PENDING_SERVICE]: { count: 0, amount: 0 },
      [DepositStatus.RELEASED]: { count: 0, amount: 0 },
      [DepositStatus.REFUNDED]: { count: 0, amount: 0 },
      [DepositStatus.RETAINED]: { count: 0, amount: 0 },
      [DepositStatus.PARTIALLY_RETAINED]: { count: 0, amount: 0 },
      [DepositStatus.PARTIALLY_REFUNDED]: { count: 0, amount: 0 },
    };
  }
}
