/**
 * @kgc/sales-pos - ZReportService Tests
 * Epic 22: Story 22-3 - Napi pénztárzárás
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApproveVarianceDto, RejectVarianceDto } from '../dto/z-report.dto.js';
import {
  IPaymentRepository,
  ISalePayment,
  PaymentMethod,
} from '../interfaces/payment.interface.js';
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
import { ICompanyInfo, IPdfGeneratorService, IZReport } from '../interfaces/z-report.interface.js';
import { IAuditService } from './session.service.js';
import { ZReportService } from './z-report.service.js';

const mockSessionRepository: ISessionRepository = {
  findById: vi.fn(),
  findBySessionNumber: vi.fn(),
  findCurrentByLocation: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  getNextSequenceNumber: vi.fn(),
};

const mockTransactionRepository: ITransactionRepository = {
  findById: vi.fn(),
  findBySession: vi.fn(),
  findByTransactionNumber: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const mockPaymentRepository: IPaymentRepository = {
  findById: vi.fn(),
  findByTransaction: vi.fn(),
  create: vi.fn(),
  sumByTransaction: vi.fn(),
  deleteByTransaction: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

const mockPdfGenerator: IPdfGeneratorService = {
  generateZReport: vi.fn(),
};

describe('ZReportService', () => {
  let service: ZReportService;
  let serviceWithPdf: ZReportService;

  const mockTenantId = '00000000-0000-0000-0000-000000000300';
  const mockUserId = '00000000-0000-0000-0000-000000000301';
  const mockLocationId = '00000000-0000-0000-0000-000000000001';
  const mockSessionId = '00000000-0000-0000-0000-000000000302';

  const mockClosedSession: ICashRegisterSession = {
    id: mockSessionId,
    tenantId: mockTenantId,
    locationId: mockLocationId,
    sessionNumber: 'KASSZA-2026-0001',
    openedAt: new Date('2026-01-26T08:00:00Z'),
    closedAt: new Date('2026-01-26T18:00:00Z'),
    openingBalance: 50000,
    closingBalance: 185000,
    expectedBalance: 185000,
    variance: 0,
    status: CashRegisterStatus.CLOSED,
    openedBy: mockUserId,
    closedBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPendingSession: ICashRegisterSession = {
    ...mockClosedSession,
    status: CashRegisterStatus.PENDING_APPROVAL,
    closingBalance: 180000,
    variance: -5000,
    varianceNote: 'Hiány a kasszában',
  };

  const mockCompletedTransaction: ISaleTransaction = {
    id: '00000000-0000-0000-0000-000000000400',
    sessionId: mockSessionId,
    tenantId: mockTenantId,
    transactionNumber: 'TRX-2026-0001',
    status: SaleStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
    subtotal: 10000,
    taxAmount: 2700,
    total: 12700,
    paidAmount: 12700,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVoidedTransaction: ISaleTransaction = {
    id: '00000000-0000-0000-0000-000000000401',
    sessionId: mockSessionId,
    tenantId: mockTenantId,
    transactionNumber: 'TRX-2026-0002',
    status: SaleStatus.VOIDED,
    paymentStatus: PaymentStatus.UNPAID,
    subtotal: 5000,
    taxAmount: 1350,
    total: 6350,
    paidAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCashPayment: ISalePayment = {
    id: '00000000-0000-0000-0000-000000000500',
    transactionId: mockCompletedTransaction.id,
    tenantId: mockTenantId,
    method: PaymentMethod.CASH,
    amount: 10000,
    receivedAt: new Date(),
  };

  const mockCardPayment: ISalePayment = {
    id: '00000000-0000-0000-0000-000000000501',
    transactionId: mockCompletedTransaction.id,
    tenantId: mockTenantId,
    method: PaymentMethod.CARD,
    amount: 2700,
    receivedAt: new Date(),
    cardTransactionId: 'MYPOS-123',
    cardLastFour: '1234',
    cardBrand: 'VISA',
  };

  const mockCompanyInfo: ICompanyInfo = {
    name: 'Kisgépcentrum Kft.',
    address: '1234 Budapest, Teszt utca 1.',
    taxNumber: '12345678-2-42',
    phone: '+36 1 234 5678',
    email: 'info@kisgepcentrum.hu',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ZReportService(
      mockSessionRepository,
      mockTransactionRepository,
      mockPaymentRepository,
      mockAuditService
    );
    serviceWithPdf = new ZReportService(
      mockSessionRepository,
      mockTransactionRepository,
      mockPaymentRepository,
      mockAuditService,
      mockPdfGenerator
    );
  });

  describe('generateZReport()', () => {
    describe('happy path', () => {
      it('should generate Z-report with correct totals', async () => {
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockClosedSession
        );
        (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([
          mockCompletedTransaction,
          mockVoidedTransaction,
        ]);
        (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([
          mockCashPayment,
          mockCardPayment,
        ]);

        const report = await service.generateZReport(mockSessionId, mockTenantId);

        expect(report.sessionId).toBe(mockSessionId);
        expect(report.sessionNumber).toBe('KASSZA-2026-0001');
        expect(report.totalSales).toBe(12700);
        expect(report.totalTax).toBe(2700);
        expect(report.completedCount).toBe(1);
        expect(report.voidedCount).toBe(1);
        expect(report.transactionCount).toBe(2);
      });

      it('should calculate payment breakdown correctly', async () => {
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockClosedSession
        );
        (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([
          mockCompletedTransaction,
        ]);
        (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([
          mockCashPayment,
          mockCardPayment,
        ]);

        const report = await service.generateZReport(mockSessionId, mockTenantId);

        expect(report.paymentBreakdown).toHaveLength(2);
        const cashBreakdown = report.paymentBreakdown.find(p => p.method === PaymentMethod.CASH);
        const cardBreakdown = report.paymentBreakdown.find(p => p.method === PaymentMethod.CARD);
        expect(cashBreakdown?.total).toBe(10000);
        expect(cardBreakdown?.total).toBe(2700);
      });

      it('should calculate expected balance from opening + cash payments', async () => {
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockClosedSession
        );
        (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([
          mockCompletedTransaction,
        ]);
        (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([
          mockCashPayment,
        ]);

        const report = await service.generateZReport(mockSessionId, mockTenantId);

        // Expected = opening (50000) + cash payments (10000) = 60000
        expect(report.expectedBalance).toBe(60000);
      });

      it('should include variance note if present', async () => {
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockPendingSession
        );
        (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([]);
        (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const report = await service.generateZReport(mockSessionId, mockTenantId);

        expect(report.varianceNote).toBe('Hiány a kasszában');
        expect(report.variance).toBe(-5000);
      });

      it('should log audit event on report generation', async () => {
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockClosedSession
        );
        (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([]);
        (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        await service.generateZReport(mockSessionId, mockTenantId);

        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'z_report_generated',
            entityType: 'cash_register_session',
            entityId: mockSessionId,
          })
        );
      });
    });

    describe('error handling', () => {
      it('should throw if session not found', async () => {
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        await expect(service.generateZReport(mockSessionId, mockTenantId)).rejects.toThrow(
          'Session not found'
        );
      });

      it('should throw if tenant mismatch', async () => {
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockClosedSession
        );

        await expect(service.generateZReport(mockSessionId, 'wrong-tenant')).rejects.toThrow(
          'Access denied'
        );
      });
    });
  });

  describe('exportToJson()', () => {
    it('should export report as JSON string', async () => {
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockClosedSession
      );
      (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const json = await service.exportToJson(mockSessionId, mockTenantId);

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json) as IZReport;
      expect(parsed.sessionId).toBe(mockSessionId);
      expect(parsed.sessionNumber).toBe('KASSZA-2026-0001');
    });

    it('should include all report fields in JSON', async () => {
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockClosedSession
      );
      (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockCompletedTransaction,
      ]);
      (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockCashPayment,
      ]);

      const json = await service.exportToJson(mockSessionId, mockTenantId);
      const parsed = JSON.parse(json) as IZReport;

      expect(parsed).toHaveProperty('sessionId');
      expect(parsed).toHaveProperty('totalSales');
      expect(parsed).toHaveProperty('paymentBreakdown');
      expect(parsed).toHaveProperty('openedBy');
      expect(parsed).toHaveProperty('closedBy');
    });
  });

  describe('exportToPdf()', () => {
    it('should use PDF generator if available', async () => {
      const mockPdfBuffer = Buffer.from('mock pdf content');
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockClosedSession
      );
      (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPdfGenerator.generateZReport as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockPdfBuffer
      );

      const pdf = await serviceWithPdf.exportToPdf(mockSessionId, mockTenantId, mockCompanyInfo);

      expect(mockPdfGenerator.generateZReport).toHaveBeenCalled();
      expect(pdf).toBe(mockPdfBuffer);
    });

    it('should return text-based stub if no PDF generator', async () => {
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockClosedSession
      );
      (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const pdf = await service.exportToPdf(mockSessionId, mockTenantId, mockCompanyInfo);

      expect(Buffer.isBuffer(pdf)).toBe(true);
      const content = pdf.toString('utf-8');
      expect(content).toContain('Kisgépcentrum Kft.');
      expect(content).toContain('Z-REPORT');
      expect(content).toContain('KASSZA-2026-0001');
    });

    it('should include company info in text report', async () => {
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockClosedSession
      );
      (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const pdf = await service.exportToPdf(mockSessionId, mockTenantId, mockCompanyInfo);
      const content = pdf.toString('utf-8');

      expect(content).toContain(mockCompanyInfo.name);
      expect(content).toContain(mockCompanyInfo.address);
      expect(content).toContain(mockCompanyInfo.taxNumber);
    });
  });

  describe('approveVariance()', () => {
    describe('happy path', () => {
      it('should approve variance and close session', async () => {
        const approvedSession = {
          ...mockPendingSession,
          status: CashRegisterStatus.CLOSED,
          approvedBy: mockUserId,
          approvedAt: new Date(),
        };
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockPendingSession
        );
        (mockSessionRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(
          approvedSession
        );

        const dto: ApproveVarianceDto = {};
        const result = await service.approveVariance(mockSessionId, dto, mockTenantId, mockUserId);

        expect(result.status).toBe(CashRegisterStatus.CLOSED);
        expect(mockSessionRepository.update).toHaveBeenCalledWith(
          mockSessionId,
          expect.objectContaining({
            status: CashRegisterStatus.CLOSED,
            approvedBy: mockUserId,
          })
        );
      });

      it('should include approver note if provided', async () => {
        const approvedSession = {
          ...mockPendingSession,
          status: CashRegisterStatus.CLOSED,
          approvedBy: mockUserId,
          approverNote: 'Elfogadva, kis hiány',
        };
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockPendingSession
        );
        (mockSessionRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(
          approvedSession
        );

        const dto: ApproveVarianceDto = { approverNote: 'Elfogadva, kis hiány' };
        await service.approveVariance(mockSessionId, dto, mockTenantId, mockUserId);

        expect(mockSessionRepository.update).toHaveBeenCalledWith(
          mockSessionId,
          expect.objectContaining({
            approverNote: 'Elfogadva, kis hiány',
          })
        );
      });

      it('should log audit event on approval', async () => {
        const approvedSession = {
          ...mockPendingSession,
          status: CashRegisterStatus.CLOSED,
        };
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockPendingSession
        );
        (mockSessionRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(
          approvedSession
        );

        const dto: ApproveVarianceDto = {};
        await service.approveVariance(mockSessionId, dto, mockTenantId, mockUserId);

        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'variance_approved',
            entityType: 'cash_register_session',
            entityId: mockSessionId,
          })
        );
      });
    });

    describe('error handling', () => {
      it('should throw if session not pending approval', async () => {
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockClosedSession
        );

        const dto: ApproveVarianceDto = {};
        await expect(
          service.approveVariance(mockSessionId, dto, mockTenantId, mockUserId)
        ).rejects.toThrow('Session is not pending approval');
      });

      it('should throw on validation failure', async () => {
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockPendingSession
        );

        // Note exceeds 500 chars
        const dto = { approverNote: 'a'.repeat(501) } as ApproveVarianceDto;
        await expect(
          service.approveVariance(mockSessionId, dto, mockTenantId, mockUserId)
        ).rejects.toThrow('Validation failed');
      });
    });
  });

  describe('rejectVariance()', () => {
    describe('happy path', () => {
      it('should reject variance and reopen session', async () => {
        const reopenedSession = {
          ...mockPendingSession,
          status: CashRegisterStatus.OPEN,
          closingBalance: null,
          variance: null,
          varianceNote: null,
          closedAt: null,
          closedBy: null,
        };
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockPendingSession
        );
        (mockSessionRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(
          reopenedSession
        );

        const dto: RejectVarianceDto = { reason: 'Újraszámolás szükséges' };
        const result = await service.rejectVariance(mockSessionId, dto, mockTenantId, mockUserId);

        expect(result.status).toBe(CashRegisterStatus.OPEN);
        expect(mockSessionRepository.update).toHaveBeenCalledWith(
          mockSessionId,
          expect.objectContaining({
            status: CashRegisterStatus.OPEN,
            closingBalance: null,
            variance: null,
          })
        );
      });

      it('should log audit event with rejection reason', async () => {
        const reopenedSession = {
          ...mockPendingSession,
          status: CashRegisterStatus.OPEN,
        };
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockPendingSession
        );
        (mockSessionRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(
          reopenedSession
        );

        const dto: RejectVarianceDto = { reason: 'Újraszámolás szükséges' };
        await service.rejectVariance(mockSessionId, dto, mockTenantId, mockUserId);

        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'variance_rejected',
            metadata: expect.objectContaining({
              rejectionReason: 'Újraszámolás szükséges',
            }),
          })
        );
      });
    });

    describe('error handling', () => {
      it('should throw if session not pending approval', async () => {
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockClosedSession
        );

        const dto: RejectVarianceDto = { reason: 'Test' };
        await expect(
          service.rejectVariance(mockSessionId, dto, mockTenantId, mockUserId)
        ).rejects.toThrow('Session is not pending approval');
      });

      it('should throw if reason is empty', async () => {
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockPendingSession
        );

        const dto = { reason: '' } as RejectVarianceDto;
        await expect(
          service.rejectVariance(mockSessionId, dto, mockTenantId, mockUserId)
        ).rejects.toThrow('Validation failed');
      });

      it('should throw if reason exceeds max length', async () => {
        (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockPendingSession
        );

        const dto = { reason: 'a'.repeat(501) } as RejectVarianceDto;
        await expect(
          service.rejectVariance(mockSessionId, dto, mockTenantId, mockUserId)
        ).rejects.toThrow('Validation failed');
      });
    });
  });

  describe('getZReport()', () => {
    it('should return generated Z-report', async () => {
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockClosedSession
      );
      (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const report = await service.getZReport(mockSessionId, mockTenantId);

      expect(report.sessionId).toBe(mockSessionId);
    });
  });

  describe('edge cases', () => {
    it('should handle session with no transactions', async () => {
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockClosedSession
      );
      (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const report = await service.generateZReport(mockSessionId, mockTenantId);

      expect(report.totalSales).toBe(0);
      expect(report.totalRefunds).toBe(0);
      expect(report.transactionCount).toBe(0);
      expect(report.paymentBreakdown).toHaveLength(0);
    });

    it('should handle refunded transactions', async () => {
      const refundedTransaction: ISaleTransaction = {
        ...mockCompletedTransaction,
        paymentStatus: PaymentStatus.REFUNDED,
      };
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockClosedSession
      );
      (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([
        refundedTransaction,
      ]);
      (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const report = await service.generateZReport(mockSessionId, mockTenantId);

      expect(report.totalRefunds).toBe(12700);
    });

    it('should handle multiple payment methods', async () => {
      const transactions = [mockCompletedTransaction];
      const payments = [mockCashPayment, mockCardPayment];

      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockClosedSession
      );
      (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue(
        transactions
      );
      (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(
        payments
      );

      const report = await service.generateZReport(mockSessionId, mockTenantId);

      const methods = report.paymentBreakdown.map(p => p.method);
      expect(methods).toContain(PaymentMethod.CASH);
      expect(methods).toContain(PaymentMethod.CARD);
    });

    it('should handle session without closedAt using current date', async () => {
      const sessionWithoutClosedAt = {
        ...mockClosedSession,
        closedAt: undefined,
      };
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        sessionWithoutClosedAt
      );
      (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const report = await service.generateZReport(mockSessionId, mockTenantId);

      expect(report.closedAt).toBeDefined();
    });

    it('should handle session without closedBy using openedBy', async () => {
      const sessionWithoutClosedBy = {
        ...mockClosedSession,
        closedBy: undefined,
      };
      (mockSessionRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
        sessionWithoutClosedBy
      );
      (mockTransactionRepository.findBySession as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockPaymentRepository.findByTransaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const report = await service.generateZReport(mockSessionId, mockTenantId);

      expect(report.closedBy).toBe(mockUserId);
    });
  });
});
