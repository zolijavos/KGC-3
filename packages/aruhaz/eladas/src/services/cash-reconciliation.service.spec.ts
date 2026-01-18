/**
 * Cash Reconciliation Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CashReconciliationService } from './cash-reconciliation.service';
import type {
  ICashRegisterSessionRepository,
  IDailyReportRepository,
  IPosTransactionQueryRepository,
  IAuditService,
} from './cash-reconciliation.service';
import type { ICashRegisterSession, IDailyCashReport } from '../interfaces/cash-reconciliation.interface';
import type { IPosTransaction } from '../interfaces/pos-transaction.interface';

// Valid UUIDs for testing
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const LOCATION_ID = '550e8400-e29b-41d4-a716-446655440002';
const REGISTER_ID = '550e8400-e29b-41d4-a716-446655440003';
const USER_ID = '550e8400-e29b-41d4-a716-446655440004';
const SESSION_ID = '550e8400-e29b-41d4-a716-446655440005';
const REPORT_ID = '550e8400-e29b-41d4-a716-446655440006';
const TRANSACTION_ID = '550e8400-e29b-41d4-a716-446655440007';
const PAYMENT_ID = '550e8400-e29b-41d4-a716-446655440008';
const MANAGER_ID = '550e8400-e29b-41d4-a716-446655440009';

describe('CashReconciliationService', () => {
  let service: CashReconciliationService;
  let mockSessionRepository: ICashRegisterSessionRepository;
  let mockReportRepository: IDailyReportRepository;
  let mockTransactionRepository: IPosTransactionQueryRepository;
  let mockAuditService: IAuditService;

  const mockSession: ICashRegisterSession = {
    id: SESSION_ID,
    tenantId: TENANT_ID,
    locationId: LOCATION_ID,
    registerId: REGISTER_ID,
    status: 'OPEN',
    openedByUserId: USER_ID,
    openingFloat: 50000,
    openedAt: new Date(),
  };

  const mockReport: IDailyCashReport = {
    id: REPORT_ID,
    tenantId: TENANT_ID,
    locationId: LOCATION_ID,
    registerId: REGISTER_ID,
    reportDate: new Date(),
    session: mockSession,
    transactionCount: 10,
    netSales: 100000,
    vatAmount: 27000,
    grossSales: 127000,
    paymentSummary: [],
    refundsTotal: 0,
    refundsCount: 0,
    cancelledTotal: 0,
    cancelledCount: 0,
    cashVariance: 0,
    varianceType: 'MATCH',
    createdAt: new Date(),
  };

  const mockTransaction: IPosTransaction = {
    id: TRANSACTION_ID,
    tenantId: TENANT_ID,
    locationId: LOCATION_ID,
    registerId: REGISTER_ID,
    transactionNumber: 'TX-001',
    operatorId: USER_ID,
    items: [],
    payments: [{ id: PAYMENT_ID, method: 'CASH', amount: 10000, paidAt: new Date() }],
    status: 'COMPLETED',
    netTotal: 7874,
    vatTotal: 2126,
    grossTotal: 10000,
    paidAmount: 10000,
    changeAmount: 0,
    navSubmitted: false,
    createdAt: new Date(),
    completedAt: new Date(),
  };

  beforeEach(() => {
    mockSessionRepository = {
      create: vi.fn().mockResolvedValue(mockSession),
      findById: vi.fn().mockResolvedValue(mockSession),
      findByRegisterId: vi.fn().mockResolvedValue(mockSession),
      findOpenByRegisterId: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockImplementation((id, data) => Promise.resolve({ ...mockSession, ...data })),
    };

    mockReportRepository = {
      create: vi.fn().mockResolvedValue(mockReport),
      findById: vi.fn().mockResolvedValue(mockReport),
      findByRegisterAndDate: vi.fn().mockResolvedValue(mockReport),
      findByRegisterAndMonth: vi.fn().mockResolvedValue([mockReport]),
      update: vi.fn().mockImplementation((id, data) => Promise.resolve({ ...mockReport, ...data })),
    };

    mockTransactionRepository = {
      findByRegisterAndDateRange: vi.fn().mockResolvedValue([mockTransaction]),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new CashReconciliationService(
      mockSessionRepository as unknown as ICashRegisterSessionRepository,
      mockReportRepository as unknown as IDailyReportRepository,
      mockTransactionRepository as unknown as IPosTransactionQueryRepository,
      mockAuditService as unknown as IAuditService
    );
  });

  describe('openRegister', () => {
    it('should open register with opening float', async () => {
      const input = {
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        registerId: REGISTER_ID,
        userId: USER_ID,
        openingFloat: 50000,
      };

      const result = await service.openRegister(input);

      expect(result.status).toBe('OPEN');
      expect(mockSessionRepository.create).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'REGISTER_OPENED',
        'CashRegisterSession',
        expect.any(String),
        expect.objectContaining({ openingFloat: 50000 })
      );
    });

    it('should throw error if register already open', async () => {
      mockSessionRepository.findOpenByRegisterId = vi.fn().mockResolvedValue(mockSession);

      const input = {
        tenantId: TENANT_ID,
        locationId: LOCATION_ID,
        registerId: REGISTER_ID,
        userId: USER_ID,
        openingFloat: 50000,
      };

      await expect(service.openRegister(input)).rejects.toThrow('A pénztár már nyitva van');
    });
  });

  describe('initiateClosing', () => {
    it('should initiate closing for open register', async () => {
      mockSessionRepository.findOpenByRegisterId = vi.fn().mockResolvedValue(mockSession);

      const result = await service.initiateClosing(REGISTER_ID, USER_ID);

      expect(result.status).toBe('CLOSING');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'REGISTER_CLOSING_INITIATED',
        'CashRegisterSession',
        SESSION_ID,
        { userId: USER_ID }
      );
    });

    it('should throw error if no open session', async () => {
      await expect(service.initiateClosing(REGISTER_ID, USER_ID)).rejects.toThrow('Nincs nyitott pénztár session');
    });
  });

  describe('recordCashCount', () => {
    it('should record cash count and calculate variance', async () => {
      const closingSession = { ...mockSession, status: 'CLOSING' as const };
      mockSessionRepository.findById = vi.fn().mockResolvedValue(closingSession);

      const input = {
        denominations: [
          { denomination: 10000, count: 5 },
          { denomination: 5000, count: 4 },
          { denomination: 1000, count: 10 },
        ],
        otherAmount: 500,
      };

      const result = await service.recordCashCount(SESSION_ID, input);

      // 10000*5 + 5000*4 + 1000*10 + 500 = 50000 + 20000 + 10000 + 500 = 80500
      expect(result.closingCash).toBe(80500);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'CASH_COUNT_RECORDED',
        'CashRegisterSession',
        SESSION_ID,
        expect.objectContaining({ closingCash: 80500 })
      );
    });

    it('should throw error if not in CLOSING status', async () => {
      const input = {
        denominations: [{ denomination: 10000, count: 5 }],
      };

      await expect(service.recordCashCount(SESSION_ID, input)).rejects.toThrow(
        'Készpénz számolás csak CLOSING státuszban lehetséges'
      );
    });
  });

  describe('documentVariance', () => {
    it('should document variance explanation', async () => {
      const sessionWithVariance = {
        ...mockSession,
        status: 'CLOSING' as const,
        variance: -1000,
        varianceType: 'SHORTAGE' as const,
      };
      mockSessionRepository.findById = vi.fn().mockResolvedValue(sessionWithVariance);

      const result = await service.documentVariance(SESSION_ID, 'Véletlen kiadás visszajáróból');

      expect(result.varianceExplanation).toBe('Véletlen kiadás visszajáróból');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'VARIANCE_DOCUMENTED',
        'CashRegisterSession',
        SESSION_ID,
        expect.objectContaining({ variance: -1000 })
      );
    });

    it('should throw error if no variance to document', async () => {
      const sessionNoVariance = {
        ...mockSession,
        varianceType: 'MATCH' as const,
      };
      mockSessionRepository.findById = vi.fn().mockResolvedValue(sessionNoVariance);

      await expect(
        service.documentVariance(SESSION_ID, 'Some explanation')
      ).rejects.toThrow('Nincs eltérés a dokumentáláshoz');
    });
  });

  describe('completeClosing', () => {
    it('should complete closing and generate report', async () => {
      const readySession = {
        ...mockSession,
        status: 'CLOSING' as const,
        closingCash: 60000,
        expectedCash: 60000,
        variance: 0,
        varianceType: 'MATCH' as const,
      };
      mockSessionRepository.findById = vi.fn().mockResolvedValue(readySession);

      const result = await service.completeClosing(SESSION_ID);

      expect(result).toBeDefined();
      expect(mockSessionRepository.update).toHaveBeenCalledWith(
        SESSION_ID,
        expect.objectContaining({ status: 'CLOSED' })
      );
      expect(mockReportRepository.create).toHaveBeenCalled();
    });

    it('should throw error if cash not counted', async () => {
      const closingSession = { ...mockSession, status: 'CLOSING' as const };
      mockSessionRepository.findById = vi.fn().mockResolvedValue(closingSession);

      await expect(service.completeClosing(SESSION_ID)).rejects.toThrow(
        'Készpénz számolás szükséges a zárás előtt'
      );
    });

    it('should throw error if variance not documented', async () => {
      const sessionWithUndocumentedVariance = {
        ...mockSession,
        status: 'CLOSING' as const,
        closingCash: 55000,
        expectedCash: 60000,
        variance: -5000,
        varianceType: 'SHORTAGE' as const,
      };
      mockSessionRepository.findById = vi.fn().mockResolvedValue(sessionWithUndocumentedVariance);

      await expect(service.completeClosing(SESSION_ID)).rejects.toThrow(
        'Eltérés dokumentálása kötelező'
      );
    });
  });

  describe('generateDailyReport', () => {
    it('should generate daily report with payment summary', async () => {
      const result = await service.generateDailyReport(REGISTER_ID, new Date());

      expect(result).toBeDefined();
      expect(mockTransactionRepository.findByRegisterAndDateRange).toHaveBeenCalled();
      expect(mockReportRepository.create).toHaveBeenCalled();
    });
  });

  describe('getCurrentSession', () => {
    it('should return current open session', async () => {
      mockSessionRepository.findOpenByRegisterId = vi.fn().mockResolvedValue(mockSession);

      const result = await service.getCurrentSession(REGISTER_ID);

      expect(result).toEqual(mockSession);
    });

    it('should return null if no open session', async () => {
      const result = await service.getCurrentSession(REGISTER_ID);

      expect(result).toBeNull();
    });
  });

  describe('calculateExpectedCash', () => {
    it('should calculate expected cash from transactions', async () => {
      const result = await service.calculateExpectedCash(SESSION_ID);

      // Opening float (50000) + cash payments (10000) - change (0) = 60000
      expect(result).toBe(60000);
    });
  });

  describe('approveReport', () => {
    it('should approve report', async () => {
      const result = await service.approveReport(REPORT_ID, MANAGER_ID);

      expect(result.approvedByUserId).toBe(MANAGER_ID);
      expect(result.approvedAt).toBeDefined();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'DAILY_REPORT_APPROVED',
        'DailyCashReport',
        REPORT_ID,
        { userId: MANAGER_ID }
      );
    });

    it('should throw error if already approved', async () => {
      const otherManagerId = '550e8400-e29b-41d4-a716-446655440099';
      const approvedReport = { ...mockReport, approvedByUserId: otherManagerId };
      mockReportRepository.findById = vi.fn().mockResolvedValue(approvedReport);

      await expect(service.approveReport(REPORT_ID, MANAGER_ID)).rejects.toThrow(
        'Riport már jóváhagyva'
      );
    });
  });

  describe('getMonthlySummary', () => {
    it('should return monthly summary', async () => {
      const result = await service.getMonthlySummary(REGISTER_ID, 2026, 1);

      expect(result.dailyReports).toHaveLength(1);
      expect(result.totalSales).toBe(127000);
      expect(result.totalTransactions).toBe(10);
    });
  });
});
