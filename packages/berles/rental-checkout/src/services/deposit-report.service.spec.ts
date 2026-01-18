/**
 * @kgc/rental-checkout - DepositReportService Unit Tests
 * Story 16-5: Kaució könyvelés és riport
 *
 * Tradicionális tesztelés (implementáció után)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DepositPaymentMethod, DepositStatus, IDeposit } from '../interfaces/deposit.interface';
import { DepositReportService } from './deposit-report.service';

// Mock repository
const mockReportRepository = {
  findByTenant: vi.fn(),
  findByDateRange: vi.fn(),
  countByStatus: vi.fn(),
  sumByStatus: vi.fn(),
};

describe('DepositReportService', () => {
  let service: DepositReportService;

  const mockTenantId = '550e8400-e29b-41d4-a716-446655440000';

  const createMockDeposit = (
    status: DepositStatus,
    amount: number,
    id: string = crypto.randomUUID()
  ): IDeposit => ({
    id,
    tenantId: mockTenantId,
    rentalId: 'rental-1',
    partnerId: 'partner-1',
    amount,
    status,
    paymentMethod: DepositPaymentMethod.CASH,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DepositReportService(mockReportRepository as any);
  });

  describe('getSummary()', () => {
    it('should return summary with total count and amount', async () => {
      // Arrange
      const mockDeposits = [
        createMockDeposit(DepositStatus.COLLECTED, 50000),
        createMockDeposit(DepositStatus.COLLECTED, 30000),
        createMockDeposit(DepositStatus.RELEASED, 20000),
      ];
      mockReportRepository.findByTenant.mockResolvedValue(mockDeposits);

      // Act
      const result = await service.getSummary(mockTenantId);

      // Assert
      expect(result.totalCount).toBe(3);
      expect(result.totalAmount).toBe(100000);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should group deposits by status', async () => {
      // Arrange
      const mockDeposits = [
        createMockDeposit(DepositStatus.COLLECTED, 50000),
        createMockDeposit(DepositStatus.COLLECTED, 30000),
        createMockDeposit(DepositStatus.RELEASED, 20000),
        createMockDeposit(DepositStatus.RETAINED, 15000),
      ];
      mockReportRepository.findByTenant.mockResolvedValue(mockDeposits);

      // Act
      const result = await service.getSummary(mockTenantId);

      // Assert
      expect(result.byStatus[DepositStatus.COLLECTED].count).toBe(2);
      expect(result.byStatus[DepositStatus.COLLECTED].amount).toBe(80000);
      expect(result.byStatus[DepositStatus.RELEASED].count).toBe(1);
      expect(result.byStatus[DepositStatus.RELEASED].amount).toBe(20000);
      expect(result.byStatus[DepositStatus.RETAINED].count).toBe(1);
      expect(result.byStatus[DepositStatus.RETAINED].amount).toBe(15000);
    });

    it('should return zero for empty deposits', async () => {
      // Arrange
      mockReportRepository.findByTenant.mockResolvedValue([]);

      // Act
      const result = await service.getSummary(mockTenantId);

      // Assert
      expect(result.totalCount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });
  });

  describe('getMovementReport()', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-01-31');

    it('should return movement report with categorized deposits', async () => {
      // Arrange
      const mockDeposits = [
        createMockDeposit(DepositStatus.COLLECTED, 50000),
        createMockDeposit(DepositStatus.RELEASED, 30000),
        createMockDeposit(DepositStatus.RETAINED, 20000),
      ];
      mockReportRepository.findByDateRange.mockResolvedValue(mockDeposits);

      // Act
      const result = await service.getMovementReport(mockTenantId, from, to);

      // Assert
      expect(result.collections).toHaveLength(1);
      expect(result.releases).toHaveLength(1);
      expect(result.retentions).toHaveLength(1);
    });

    it('should calculate summary amounts correctly', async () => {
      // Arrange
      const mockDeposits = [
        createMockDeposit(DepositStatus.COLLECTED, 100000),
        createMockDeposit(DepositStatus.HELD, 50000),
        createMockDeposit(DepositStatus.RELEASED, 80000),
        createMockDeposit(DepositStatus.RETAINED, 30000),
      ];
      mockReportRepository.findByDateRange.mockResolvedValue(mockDeposits);

      // Act
      const result = await service.getMovementReport(mockTenantId, from, to);

      // Assert
      expect(result.summary.collectedAmount).toBe(150000); // 100000 + 50000
      expect(result.summary.releasedAmount).toBe(80000);
      expect(result.summary.retainedAmount).toBe(30000);
      expect(result.summary.netChange).toBe(40000); // 150000 - 80000 - 30000
    });

    it('should include date range in report', async () => {
      // Arrange
      mockReportRepository.findByDateRange.mockResolvedValue([]);

      // Act
      const result = await service.getMovementReport(mockTenantId, from, to);

      // Assert
      expect(result.from).toEqual(from);
      expect(result.to).toEqual(to);
    });
  });

  describe('getActiveDeposits()', () => {
    it('should return only COLLECTED and HELD deposits', async () => {
      // Arrange
      const mockDeposits = [
        createMockDeposit(DepositStatus.COLLECTED, 50000, 'deposit-1'),
        createMockDeposit(DepositStatus.HELD, 30000, 'deposit-2'),
        createMockDeposit(DepositStatus.RELEASED, 20000, 'deposit-3'),
        createMockDeposit(DepositStatus.RETAINED, 15000, 'deposit-4'),
      ];
      mockReportRepository.findByTenant.mockResolvedValue(mockDeposits);

      // Act
      const result = await service.getActiveDeposits(mockTenantId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map(d => d.id)).toEqual(['deposit-1', 'deposit-2']);
    });

    it('should return empty array when no active deposits', async () => {
      // Arrange
      const mockDeposits = [
        createMockDeposit(DepositStatus.RELEASED, 50000),
        createMockDeposit(DepositStatus.RETAINED, 30000),
      ];
      mockReportRepository.findByTenant.mockResolvedValue(mockDeposits);

      // Act
      const result = await service.getActiveDeposits(mockTenantId);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('exportToJson()', () => {
    it('should return combined export with summary and movements', async () => {
      // Arrange
      const from = new Date('2026-01-01');
      const to = new Date('2026-01-31');
      const mockDeposits = [
        createMockDeposit(DepositStatus.COLLECTED, 50000),
        createMockDeposit(DepositStatus.RELEASED, 30000),
      ];
      mockReportRepository.findByTenant.mockResolvedValue(mockDeposits);
      mockReportRepository.findByDateRange.mockResolvedValue(mockDeposits);

      // Act
      const result = await service.exportToJson(mockTenantId, from, to);

      // Assert
      expect(result.summary).toBeDefined();
      expect(result.movements).toBeDefined();
      expect(result.exportedAt).toBeInstanceOf(Date);
      expect(result.tenantId).toBe(mockTenantId);
    });

    it('should include tenant isolation', async () => {
      // Arrange
      const from = new Date('2026-01-01');
      const to = new Date('2026-01-31');
      mockReportRepository.findByTenant.mockResolvedValue([]);
      mockReportRepository.findByDateRange.mockResolvedValue([]);

      // Act
      await service.exportToJson(mockTenantId, from, to);

      // Assert
      expect(mockReportRepository.findByTenant).toHaveBeenCalledWith(mockTenantId);
      expect(mockReportRepository.findByDateRange).toHaveBeenCalledWith(mockTenantId, from, to);
    });
  });
});
