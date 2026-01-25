/**
 * Cash Reconciliation Service - Story 22.3: Napi Pénztárzárás
 */

import { Inject } from '@nestjs/common';
import {
  VarianceType,
  type ICashReconciliationService,
  type ICashRegisterSession,
  type IDailyCashReport,
  type IDailyPaymentSummary,
  type ICashCountInput,
  type IOpenRegisterInput,
  type RegisterStatus,
} from '../interfaces/cash-reconciliation.interface';
import type { IPosTransaction, PaymentMethod } from '../interfaces/pos-transaction.interface';
import { OpenRegisterSchema, CashCountSchema, DocumentVarianceSchema } from '../dto/cash-reconciliation.dto';

/**
 * Session Repository interfész
 */
export interface ICashRegisterSessionRepository {
  create(session: ICashRegisterSession): Promise<ICashRegisterSession>;
  findById(id: string): Promise<ICashRegisterSession | null>;
  findByRegisterId(registerId: string): Promise<ICashRegisterSession | null>;
  findOpenByRegisterId(registerId: string): Promise<ICashRegisterSession | null>;
  update(id: string, data: Partial<ICashRegisterSession>): Promise<ICashRegisterSession>;
}

/**
 * Daily Report Repository interfész
 */
export interface IDailyReportRepository {
  create(report: IDailyCashReport): Promise<IDailyCashReport>;
  findById(id: string): Promise<IDailyCashReport | null>;
  findByRegisterAndDate(registerId: string, date: Date): Promise<IDailyCashReport | null>;
  findByRegisterAndMonth(registerId: string, year: number, month: number): Promise<IDailyCashReport[]>;
  update(id: string, data: Partial<IDailyCashReport>): Promise<IDailyCashReport>;
}

/**
 * POS Transaction Repository interfész
 */
export interface IPosTransactionQueryRepository {
  findByRegisterAndDateRange(
    registerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IPosTransaction[]>;
}

/**
 * Audit szolgáltatás interfész
 */
export interface IAuditService {
  log(event: string, entityType: string, entityId: string, data: Record<string, unknown>): Promise<void>;
}

/**
 * Cash Reconciliation Service implementáció
 */
export class CashReconciliationService implements ICashReconciliationService {
  constructor(
    @Inject('CASH_REGISTER_SESSION_REPOSITORY')
    private readonly sessionRepository: ICashRegisterSessionRepository,
    @Inject('DAILY_REPORT_REPOSITORY')
    private readonly reportRepository: IDailyReportRepository,
    @Inject('POS_TRANSACTION_QUERY_REPOSITORY')
    private readonly transactionRepository: IPosTransactionQueryRepository,
    @Inject('AUDIT_SERVICE')
    private readonly auditService: IAuditService
  ) {}

  /**
   * Pénztár nyitás
   */
  async openRegister(input: IOpenRegisterInput): Promise<ICashRegisterSession> {
    const validated = OpenRegisterSchema.parse(input);

    // Ellenőrzés: nincs-e már nyitva
    const existingSession = await this.sessionRepository.findOpenByRegisterId(validated.registerId);
    if (existingSession) {
      throw new Error('A pénztár már nyitva van');
    }

    const session: ICashRegisterSession = {
      id: crypto.randomUUID(),
      tenantId: validated.tenantId,
      locationId: validated.locationId,
      registerId: validated.registerId,
      status: 'OPEN' as RegisterStatus,
      openedByUserId: validated.userId,
      openingFloat: validated.openingFloat,
      openedAt: new Date(),
    };

    const created = await this.sessionRepository.create(session);

    await this.auditService.log(
      'REGISTER_OPENED',
      'CashRegisterSession',
      created.id,
      { registerId: validated.registerId, openingFloat: validated.openingFloat }
    );

    return created;
  }

  /**
   * Pénztár zárás kezdeményezése
   */
  async initiateClosing(registerId: string, userId: string): Promise<ICashRegisterSession> {
    const session = await this.sessionRepository.findOpenByRegisterId(registerId);
    if (!session) {
      throw new Error('Nincs nyitott pénztár session');
    }

    const updated = await this.sessionRepository.update(session.id, {
      status: 'CLOSING' as RegisterStatus,
      closedByUserId: userId,
    });

    await this.auditService.log(
      'REGISTER_CLOSING_INITIATED',
      'CashRegisterSession',
      session.id,
      { userId }
    );

    return updated;
  }

  /**
   * Készpénz számolás rögzítése
   */
  async recordCashCount(sessionId: string, input: ICashCountInput): Promise<ICashRegisterSession> {
    const validated = CashCountSchema.parse({ sessionId, ...input });

    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error('Session nem található');
    }

    if (session.status !== 'CLOSING') {
      throw new Error('Készpénz számolás csak CLOSING státuszban lehetséges');
    }

    // Összegzés
    const denominationTotal = validated.denominations.reduce(
      (sum, d) => sum + d.denomination * d.count,
      0
    );
    const closingCash = denominationTotal + (validated.otherAmount ?? 0);

    // Elvárt készpénz kalkulálása
    const expectedCash = await this.calculateExpectedCash(sessionId);

    // Eltérés számítás
    const variance = closingCash - expectedCash;
    let varianceType: VarianceType = VarianceType.MATCH;
    if (variance < 0) {
      varianceType = VarianceType.SHORTAGE;
    } else if (variance > 0) {
      varianceType = VarianceType.OVERAGE;
    }

    const updated = await this.sessionRepository.update(sessionId, {
      closingCash,
      expectedCash,
      variance,
      varianceType,
    });

    await this.auditService.log(
      'CASH_COUNT_RECORDED',
      'CashRegisterSession',
      sessionId,
      { closingCash, expectedCash, variance, varianceType }
    );

    return updated;
  }

  /**
   * Eltérés dokumentálása
   */
  async documentVariance(sessionId: string, explanation: string): Promise<ICashRegisterSession> {
    DocumentVarianceSchema.parse({ sessionId, explanation });

    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error('Session nem található');
    }

    if (session.varianceType === VarianceType.MATCH) {
      throw new Error('Nincs eltérés a dokumentáláshoz');
    }

    const updated = await this.sessionRepository.update(sessionId, {
      varianceExplanation: explanation,
    });

    await this.auditService.log(
      'VARIANCE_DOCUMENTED',
      'CashRegisterSession',
      sessionId,
      { variance: session.variance, explanation }
    );

    return updated;
  }

  /**
   * Pénztár zárás véglegesítése
   */
  async completeClosing(sessionId: string): Promise<IDailyCashReport> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error('Session nem található');
    }

    if (session.status !== 'CLOSING') {
      throw new Error('Csak CLOSING státuszú session zárható le');
    }

    if (session.closingCash === undefined) {
      throw new Error('Készpénz számolás szükséges a zárás előtt');
    }

    // Eltérés dokumentálás kötelező ha nem egyezik
    if (session.varianceType !== VarianceType.MATCH && !session.varianceExplanation) {
      throw new Error('Eltérés dokumentálása kötelező');
    }

    // Session lezárása
    await this.sessionRepository.update(sessionId, {
      status: 'CLOSED' as RegisterStatus,
      closedAt: new Date(),
    });

    // Napi riport generálása
    const report = await this.generateDailyReport(session.registerId, session.openedAt);

    await this.auditService.log(
      'REGISTER_CLOSED',
      'CashRegisterSession',
      sessionId,
      { reportId: report.id }
    );

    return report;
  }

  /**
   * Napi riport generálása
   */
  async generateDailyReport(registerId: string, date: Date): Promise<IDailyCashReport> {
    const session = await this.sessionRepository.findByRegisterId(registerId);
    if (!session) {
      throw new Error('Nincs session a megadott pénztárhoz');
    }

    // Napi tranzakciók lekérdezése
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await this.transactionRepository.findByRegisterAndDateRange(
      registerId,
      startOfDay,
      endOfDay
    );

    // Összesítések
    const completedTransactions = transactions.filter((t) => t.status === 'COMPLETED');
    const cancelledTransactions = transactions.filter((t) => t.status === 'CANCELLED');
    const refundedTransactions = transactions.filter(
      (t) => t.status === 'REFUNDED' || t.status === 'PARTIALLY_REFUNDED'
    );

    const netSales = completedTransactions.reduce((sum, t) => sum + t.netTotal, 0);
    const vatAmount = completedTransactions.reduce((sum, t) => sum + t.vatTotal, 0);
    const grossSales = completedTransactions.reduce((sum, t) => sum + t.grossTotal, 0);

    // Fizetési mód bontás
    const paymentSummary = this.calculatePaymentSummary(completedTransactions);

    // Visszáruk és törölt tranzakciók
    const refundsTotal = refundedTransactions.reduce((sum, t) => sum + t.grossTotal, 0);
    const cancelledTotal = cancelledTransactions.reduce((sum, t) => sum + t.grossTotal, 0);

    const report: IDailyCashReport = {
      id: crypto.randomUUID(),
      tenantId: session.tenantId,
      locationId: session.locationId,
      registerId,
      reportDate: date,
      session,
      transactionCount: completedTransactions.length,
      netSales,
      vatAmount,
      grossSales,
      paymentSummary,
      refundsTotal,
      refundsCount: refundedTransactions.length,
      cancelledTotal,
      cancelledCount: cancelledTransactions.length,
      cashVariance: session.variance ?? 0,
      varianceType: session.varianceType ?? VarianceType.MATCH,
      createdAt: new Date(),
    };

    const created = await this.reportRepository.create(report);

    await this.auditService.log(
      'DAILY_REPORT_GENERATED',
      'DailyCashReport',
      created.id,
      { grossSales, transactionCount: completedTransactions.length }
    );

    return created;
  }

  /**
   * Aktuális session lekérdezése
   */
  async getCurrentSession(registerId: string): Promise<ICashRegisterSession | null> {
    return this.sessionRepository.findOpenByRegisterId(registerId);
  }

  /**
   * Elvárt készpénz kalkulálása
   */
  async calculateExpectedCash(sessionId: string): Promise<number> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error('Session nem található');
    }

    // Napi tranzakciók lekérdezése
    const transactions = await this.transactionRepository.findByRegisterAndDateRange(
      session.registerId,
      session.openedAt,
      new Date()
    );

    // Készpénzes fizetések összege
    const cashPayments = transactions
      .filter((t) => t.status === 'COMPLETED')
      .flatMap((t) => t.payments)
      .filter((p) => p.method === 'CASH')
      .reduce((sum, p) => sum + p.amount, 0);

    // Elvárt = nyitó + készpénzes bevétel - visszajáró
    const totalChange = transactions
      .filter((t) => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.changeAmount, 0);

    return session.openingFloat + cashPayments - totalChange;
  }

  /**
   * Riport jóváhagyása
   */
  async approveReport(reportId: string, userId: string): Promise<IDailyCashReport> {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Riport nem található');
    }

    if (report.approvedByUserId) {
      throw new Error('Riport már jóváhagyva');
    }

    const updated = await this.reportRepository.update(reportId, {
      approvedByUserId: userId,
      approvedAt: new Date(),
    });

    await this.auditService.log(
      'DAILY_REPORT_APPROVED',
      'DailyCashReport',
      reportId,
      { userId }
    );

    return updated;
  }

  /**
   * Havi összesítő
   */
  async getMonthlySummary(
    registerId: string,
    year: number,
    month: number
  ): Promise<{
    totalSales: number;
    totalTransactions: number;
    totalVariance: number;
    dailyReports: IDailyCashReport[];
  }> {
    const dailyReports = await this.reportRepository.findByRegisterAndMonth(
      registerId,
      year,
      month
    );

    const totalSales = dailyReports.reduce((sum, r) => sum + r.grossSales, 0);
    const totalTransactions = dailyReports.reduce((sum, r) => sum + r.transactionCount, 0);
    const totalVariance = dailyReports.reduce((sum, r) => sum + r.cashVariance, 0);

    return {
      totalSales,
      totalTransactions,
      totalVariance,
      dailyReports,
    };
  }

  /**
   * Fizetési mód szerinti összesítés
   */
  private calculatePaymentSummary(transactions: IPosTransaction[]): IDailyPaymentSummary[] {
    const paymentMap = new Map<PaymentMethod, { count: number; total: number }>();

    for (const transaction of transactions) {
      for (const payment of transaction.payments) {
        const existing = paymentMap.get(payment.method) ?? { count: 0, total: 0 };
        paymentMap.set(payment.method, {
          count: existing.count + 1,
          total: existing.total + payment.amount,
        });
      }
    }

    const result: IDailyPaymentSummary[] = [];
    paymentMap.forEach((value, method) => {
      result.push({
        method,
        transactionCount: value.count,
        totalAmount: value.total,
      });
    });

    return result;
  }
}
