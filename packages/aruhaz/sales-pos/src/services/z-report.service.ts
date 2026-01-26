/**
 * @kgc/sales-pos - ZReportService
 * Epic 22: Story 22-3 - Napi pénztárzárás
 */

import { Injectable } from '@nestjs/common';
import {
  ApproveVarianceDto,
  ApproveVarianceSchema,
  RejectVarianceDto,
  RejectVarianceSchema,
} from '../dto/z-report.dto.js';
import { IPaymentRepository, PaymentMethod } from '../interfaces/payment.interface.js';
import {
  CashRegisterStatus,
  ICashRegisterSession,
  ISessionRepository,
} from '../interfaces/session.interface.js';
import {
  ISaleTransaction,
  ITransactionRepository,
  PaymentStatus,
  SaleStatus,
} from '../interfaces/transaction.interface.js';
import {
  ICompanyInfo,
  IPaymentMethodBreakdown,
  IPdfGeneratorService,
  IZReport,
} from '../interfaces/z-report.interface.js';
import { IAuditService } from './session.service.js';

@Injectable()
export class ZReportService {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly transactionRepository: ITransactionRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly auditService: IAuditService,
    private readonly pdfGenerator?: IPdfGeneratorService
  ) {}

  /**
   * Generate Z-report for a session
   * AC1, AC2: Session summary with all totals
   */
  async generateZReport(sessionId: string, tenantId: string): Promise<IZReport> {
    const session = await this.getSession(sessionId, tenantId);

    // Get all transactions for this session (single query, reused)
    const transactions = await this.transactionRepository.findBySession(sessionId);

    // Calculate totals
    const { totalSales, totalRefunds, totalTax, completedCount, voidedCount } =
      this.calculateTransactionTotals(transactions);

    // Calculate payment breakdown (pass transactions to avoid duplicate query)
    const paymentBreakdown = await this.calculatePaymentBreakdown(transactions);

    // Calculate expected balance
    const cashPayments = paymentBreakdown.find(p => p.method === PaymentMethod.CASH);
    const cashTotal = cashPayments?.total ?? 0;
    const expectedBalance = session.openingBalance + cashTotal;

    const report: IZReport = {
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
      locationId: session.locationId,
      tenantId: session.tenantId,

      openedAt: session.openedAt,
      closedAt: session.closedAt ?? new Date(),
      generatedAt: new Date(),

      openingBalance: session.openingBalance,
      expectedBalance,
      closingBalance: session.closingBalance ?? 0,
      variance: session.variance ?? 0,

      totalSales,
      totalRefunds,
      netSales: totalSales - totalRefunds,
      totalTax,

      paymentBreakdown,

      transactionCount: transactions.length,
      completedCount,
      voidedCount,

      openedBy: session.openedBy,
      closedBy: session.closedBy ?? session.openedBy,
    };

    if (session.varianceNote !== undefined) {
      report.varianceNote = session.varianceNote;
    }

    await this.auditService.log({
      action: 'z_report_generated',
      entityType: 'cash_register_session',
      entityId: sessionId,
      userId: session.closedBy ?? session.openedBy,
      tenantId,
      metadata: {
        sessionNumber: session.sessionNumber,
        totalSales,
        transactionCount: transactions.length,
      },
    });

    return report;
  }

  /**
   * Export Z-report to JSON
   * AC2: JSON export
   */
  async exportToJson(sessionId: string, tenantId: string): Promise<string> {
    const report = await this.generateZReport(sessionId, tenantId);
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export Z-report to PDF (STUB)
   * AC3: PDF generation
   */
  async exportToPdf(
    sessionId: string,
    tenantId: string,
    companyInfo: ICompanyInfo
  ): Promise<Buffer> {
    const report = await this.generateZReport(sessionId, tenantId);

    if (this.pdfGenerator) {
      return this.pdfGenerator.generateZReport(report, companyInfo);
    }

    // STUB: Return simple text-based "PDF" for now
    const content = this.generateTextReport(report, companyInfo);
    return Buffer.from(content, 'utf-8');
  }

  /**
   * Approve variance and close session
   * AC4: Variance approval workflow
   */
  async approveVariance(
    sessionId: string,
    input: ApproveVarianceDto,
    tenantId: string,
    userId: string
  ): Promise<ICashRegisterSession> {
    const validationResult = ApproveVarianceSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const session = await this.getSession(sessionId, tenantId);

    if (session.status !== CashRegisterStatus.PENDING_APPROVAL) {
      throw new Error('Session is not pending approval');
    }

    const updateData: Partial<ICashRegisterSession> = {
      status: CashRegisterStatus.CLOSED,
      approvedBy: userId,
      approvedAt: new Date(),
    };

    if (validationResult.data.approverNote !== undefined) {
      updateData.approverNote = validationResult.data.approverNote;
    }

    const updatedSession = await this.sessionRepository.update(sessionId, updateData);

    await this.auditService.log({
      action: 'variance_approved',
      entityType: 'cash_register_session',
      entityId: sessionId,
      userId,
      tenantId,
      metadata: {
        sessionNumber: session.sessionNumber,
        variance: session.variance,
        approverNote: validationResult.data.approverNote,
      },
    });

    return updatedSession;
  }

  /**
   * Reject variance and reopen session
   * AC4: Variance rejection
   */
  async rejectVariance(
    sessionId: string,
    input: RejectVarianceDto,
    tenantId: string,
    userId: string
  ): Promise<ICashRegisterSession> {
    const validationResult = RejectVarianceSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const session = await this.getSession(sessionId, tenantId);

    if (session.status !== CashRegisterStatus.PENDING_APPROVAL) {
      throw new Error('Session is not pending approval');
    }

    // Reopen session for recounting - use nullish partial update
    // Note: Repository implementation should handle clearing these fields
    const reopenData: Partial<ICashRegisterSession> = {
      status: CashRegisterStatus.OPEN,
    };
    // Clear optional fields by setting them on the update data
    // The repository should interpret these as "clear/unset" operations
    Object.assign(reopenData, {
      closingBalance: null,
      variance: null,
      varianceNote: null,
      closedAt: null,
      closedBy: null,
    });
    const updatedSession = await this.sessionRepository.update(sessionId, reopenData);

    await this.auditService.log({
      action: 'variance_rejected',
      entityType: 'cash_register_session',
      entityId: sessionId,
      userId,
      tenantId,
      metadata: {
        sessionNumber: session.sessionNumber,
        variance: session.variance,
        rejectionReason: validationResult.data.reason,
      },
    });

    return updatedSession;
  }

  /**
   * Get Z-report data (without generating new)
   */
  async getZReport(sessionId: string, tenantId: string): Promise<IZReport> {
    return this.generateZReport(sessionId, tenantId);
  }

  /**
   * Get session with tenant validation
   */
  private async getSession(sessionId: string, tenantId: string): Promise<ICashRegisterSession> {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    return session;
  }

  /**
   * Calculate transaction totals
   */
  private calculateTransactionTotals(transactions: ISaleTransaction[]): {
    totalSales: number;
    totalRefunds: number;
    totalTax: number;
    completedCount: number;
    voidedCount: number;
  } {
    let totalSales = 0;
    let totalRefunds = 0;
    let totalTax = 0;
    let completedCount = 0;
    let voidedCount = 0;

    for (const txn of transactions) {
      if (txn.status === SaleStatus.COMPLETED && txn.paymentStatus === PaymentStatus.PAID) {
        totalSales += txn.total;
        totalTax += txn.taxAmount;
        completedCount++;
      } else if (txn.status === SaleStatus.VOIDED) {
        voidedCount++;
      }

      // Refunds tracked separately if implemented
      if (txn.paymentStatus === PaymentStatus.REFUNDED) {
        totalRefunds += txn.total;
      }
    }

    return { totalSales, totalRefunds, totalTax, completedCount, voidedCount };
  }

  /**
   * Calculate payment method breakdown
   * @param transactions - Pre-loaded transactions to avoid duplicate query
   */
  private async calculatePaymentBreakdown(
    transactions: ISaleTransaction[]
  ): Promise<IPaymentMethodBreakdown[]> {
    const breakdown: Map<PaymentMethod, { count: number; total: number }> = new Map();

    // Initialize all payment methods
    for (const method of Object.values(PaymentMethod)) {
      breakdown.set(method, { count: 0, total: 0 });
    }

    // Sum up payments for each transaction
    for (const txn of transactions) {
      if (txn.status === SaleStatus.COMPLETED) {
        const payments = await this.paymentRepository.findByTransaction(txn.id);

        for (const payment of payments) {
          const current = breakdown.get(payment.method) ?? { count: 0, total: 0 };
          current.count++;
          current.total += payment.amount;
          breakdown.set(payment.method, current);
        }
      }
    }

    // Convert to array, filter out zero counts
    return Array.from(breakdown.entries())
      .filter(([, data]) => data.count > 0)
      .map(([method, data]) => ({
        method,
        count: data.count,
        total: data.total,
      }));
  }

  /**
   * Generate simple text report (STUB for PDF)
   */
  private generateTextReport(report: IZReport, companyInfo: ICompanyInfo): string {
    const separator = '='.repeat(50);
    const divider = '-'.repeat(50);

    const lines: string[] = [
      separator,
      `           ${companyInfo.name}`,
      `           ${companyInfo.address}`,
      `           Adószám: ${companyInfo.taxNumber}`,
      separator,
      '',
      `Z-REPORT - ${report.sessionNumber}`,
      `Generálva: ${report.generatedAt.toISOString()}`,
      '',
      divider,
      'ÖSSZESÍTŐ',
      divider,
      `Nyitó egyenleg:        ${this.formatCurrency(report.openingBalance)}`,
      `Napi bevétel:          ${this.formatCurrency(report.totalSales)}`,
      `Visszatérítések:       ${this.formatCurrency(report.totalRefunds)}`,
      `Nettó bevétel:         ${this.formatCurrency(report.netSales)}`,
      `ÁFA összesen:          ${this.formatCurrency(report.totalTax)}`,
      '',
      `Várt egyenleg:         ${this.formatCurrency(report.expectedBalance)}`,
      `Záró egyenleg:         ${this.formatCurrency(report.closingBalance)}`,
      `Eltérés:               ${this.formatCurrency(report.variance)}`,
    ];

    if (report.varianceNote) {
      lines.push(`Megjegyzés:            ${report.varianceNote}`);
    }

    lines.push('', divider, 'FIZETÉSI MÓDOK', divider);

    for (const pm of report.paymentBreakdown) {
      lines.push(`${pm.method.padEnd(20)} ${pm.count} db    ${this.formatCurrency(pm.total)}`);
    }

    lines.push(
      '',
      divider,
      'TRANZAKCIÓK',
      divider,
      `Összes tranzakció:     ${report.transactionCount}`,
      `Befejezett:            ${report.completedCount}`,
      `Sztornózott:           ${report.voidedCount}`,
      '',
      separator,
      `Nyitotta: ${report.openedBy}`,
      `Zárta: ${report.closedBy}`,
      separator
    );

    return lines.join('\n');
  }

  /**
   * Format currency (HUF)
   */
  private formatCurrency(amount: number): string {
    return `${amount.toLocaleString('hu-HU')} Ft`;
  }
}
