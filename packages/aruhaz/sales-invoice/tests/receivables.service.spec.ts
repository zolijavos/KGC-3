/**
 * @kgc/sales-invoice - ReceivablesService Unit Tests
 * Epic 41: Story 41-1 - Kintlévőség Aging Report
 *
 * TDD Tests for aging report functionality.
 * ADR-052: Kintlévőség Rendszerezés
 *
 * AGING BUCKETS:
 * - 0-30 nap: Friss kintlévőség
 * - 31-60 nap: Figyelmeztetés
 * - 61-90 nap: Kritikus
 * - 90+ nap: Veszélyes
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AgingInvoice,
  IReceivablesRepository,
  ReceivablesAgingFilters,
} from '../src/services/receivables.service';
import { ReceivablesService } from '../src/services/receivables.service';

// Mock repository implementation
class MockReceivablesRepository implements IReceivablesRepository {
  private invoices: AgingInvoice[] = [];

  setInvoices(invoices: AgingInvoice[]): void {
    this.invoices = invoices;
  }

  async getUnpaidInvoices(
    tenantId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filters?: ReceivablesAgingFilters
  ): Promise<AgingInvoice[]> {
    return this.invoices.filter(inv => inv.tenantId === tenantId);
  }
}

describe('ReceivablesService', () => {
  let service: ReceivablesService;
  let mockRepository: MockReceivablesRepository;

  beforeEach(() => {
    mockRepository = new MockReceivablesRepository();
    service = new ReceivablesService(mockRepository);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-07'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getAgingReport', () => {
    it('should return empty report when no invoices exist', async () => {
      mockRepository.setInvoices([]);

      const report = await service.getAgingReport('tenant-1');

      expect(report.totalReceivables).toBe(0);
      expect(report.buckets).toHaveLength(4);
      expect(report.buckets.every(b => b.count === 0)).toBe(true);
      expect(report.buckets.every(b => b.totalAmount === 0)).toBe(true);
      expect(report.topDebtors).toHaveLength(0);
    });

    it('should categorize invoice into 0-30 bucket when due date is within 30 days', async () => {
      const invoice: AgingInvoice = {
        id: 'inv-1',
        tenantId: 'tenant-1',
        invoiceNumber: 'SZ-2026-001',
        partnerId: 'partner-1',
        partnerName: 'Test Partner Kft.',
        dueDate: new Date('2026-02-01'), // 6 days ago
        balanceDue: 100000,
        totalAmount: 100000,
        status: 'SENT',
      };
      mockRepository.setInvoices([invoice]);

      const report = await service.getAgingReport('tenant-1');

      const bucket0_30 = report.buckets.find(b => b.label === '0-30');
      expect(bucket0_30).toBeDefined();
      expect(bucket0_30!.count).toBe(1);
      expect(bucket0_30!.totalAmount).toBe(100000);
      expect(bucket0_30!.invoices).toHaveLength(1);
    });

    it('should categorize invoice into 31-60 bucket when due date is 31-60 days ago', async () => {
      const invoice: AgingInvoice = {
        id: 'inv-2',
        tenantId: 'tenant-1',
        invoiceNumber: 'SZ-2026-002',
        partnerId: 'partner-2',
        partnerName: 'Late Payer Kft.',
        dueDate: new Date('2026-01-01'), // 37 days ago
        balanceDue: 250000,
        totalAmount: 250000,
        status: 'OVERDUE',
      };
      mockRepository.setInvoices([invoice]);

      const report = await service.getAgingReport('tenant-1');

      const bucket31_60 = report.buckets.find(b => b.label === '31-60');
      expect(bucket31_60).toBeDefined();
      expect(bucket31_60!.count).toBe(1);
      expect(bucket31_60!.totalAmount).toBe(250000);
    });

    it('should categorize invoice into 61-90 bucket when due date is 61-90 days ago', async () => {
      const invoice: AgingInvoice = {
        id: 'inv-3',
        tenantId: 'tenant-1',
        invoiceNumber: 'SZ-2026-003',
        partnerId: 'partner-3',
        partnerName: 'Critical Partner Bt.',
        dueDate: new Date('2025-11-30'), // 69 days ago
        balanceDue: 500000,
        totalAmount: 500000,
        status: 'OVERDUE',
      };
      mockRepository.setInvoices([invoice]);

      const report = await service.getAgingReport('tenant-1');

      const bucket61_90 = report.buckets.find(b => b.label === '61-90');
      expect(bucket61_90).toBeDefined();
      expect(bucket61_90!.count).toBe(1);
      expect(bucket61_90!.totalAmount).toBe(500000);
    });

    it('should categorize invoice into 90+ bucket when due date is over 90 days ago', async () => {
      const invoice: AgingInvoice = {
        id: 'inv-4',
        tenantId: 'tenant-1',
        invoiceNumber: 'SZ-2025-100',
        partnerId: 'partner-4',
        partnerName: 'Dangerous Debtor Zrt.',
        dueDate: new Date('2025-10-01'), // 129 days ago
        balanceDue: 1000000,
        totalAmount: 1000000,
        status: 'OVERDUE',
      };
      mockRepository.setInvoices([invoice]);

      const report = await service.getAgingReport('tenant-1');

      const bucket90plus = report.buckets.find(b => b.label === '90+');
      expect(bucket90plus).toBeDefined();
      expect(bucket90plus!.count).toBe(1);
      expect(bucket90plus!.totalAmount).toBe(1000000);
    });

    it('should calculate totalReceivables as sum of all bucket amounts', async () => {
      mockRepository.setInvoices([
        createInvoice('inv-1', 'tenant-1', new Date('2026-02-01'), 100000), // 0-30
        createInvoice('inv-2', 'tenant-1', new Date('2026-01-01'), 200000), // 31-60
        createInvoice('inv-3', 'tenant-1', new Date('2025-11-20'), 300000), // 61-90
        createInvoice('inv-4', 'tenant-1', new Date('2025-09-01'), 400000), // 90+
      ]);

      const report = await service.getAgingReport('tenant-1');

      expect(report.totalReceivables).toBe(1000000);
    });

    it('should return top 5 debtors sorted by total debt descending', async () => {
      const invoices: AgingInvoice[] = [
        createInvoice('inv-1', 'tenant-1', new Date('2026-01-01'), 100000, 'p1', 'Partner A'),
        createInvoice('inv-2', 'tenant-1', new Date('2026-01-01'), 500000, 'p2', 'Partner B'),
        createInvoice('inv-3', 'tenant-1', new Date('2026-01-01'), 300000, 'p3', 'Partner C'),
        createInvoice('inv-4', 'tenant-1', new Date('2026-01-01'), 200000, 'p1', 'Partner A'), // Same partner
        createInvoice('inv-5', 'tenant-1', new Date('2026-01-01'), 400000, 'p4', 'Partner D'),
        createInvoice('inv-6', 'tenant-1', new Date('2026-01-01'), 50000, 'p5', 'Partner E'),
        createInvoice('inv-7', 'tenant-1', new Date('2026-01-01'), 25000, 'p6', 'Partner F'),
      ];
      mockRepository.setInvoices(invoices);

      const report = await service.getAgingReport('tenant-1');

      expect(report.topDebtors).toHaveLength(5);
      expect(report.topDebtors[0]!.partnerId).toBe('p2'); // 500000
      expect(report.topDebtors[0]!.totalDebt).toBe(500000);
      expect(report.topDebtors[1]!.partnerId).toBe('p4'); // 400000
      expect(report.topDebtors[2]!.partnerId).toBe('p1'); // 100000 + 200000 = 300000
      expect(report.topDebtors[2]!.totalDebt).toBe(300000);
      expect(report.topDebtors[3]!.partnerId).toBe('p3'); // 300000
      expect(report.topDebtors[4]!.partnerId).toBe('p5'); // 50000
    });

    it('should aggregate multiple invoices for same partner in topDebtors', async () => {
      const invoices: AgingInvoice[] = [
        createInvoice('inv-1', 'tenant-1', new Date('2026-01-01'), 100000, 'p1', 'Partner A'),
        createInvoice('inv-2', 'tenant-1', new Date('2026-01-01'), 150000, 'p1', 'Partner A'),
        createInvoice('inv-3', 'tenant-1', new Date('2026-01-01'), 250000, 'p1', 'Partner A'),
      ];
      mockRepository.setInvoices(invoices);

      const report = await service.getAgingReport('tenant-1');

      expect(report.topDebtors).toHaveLength(1);
      expect(report.topDebtors[0]!.partnerId).toBe('p1');
      expect(report.topDebtors[0]!.partnerName).toBe('Partner A');
      expect(report.topDebtors[0]!.totalDebt).toBe(500000);
      expect(report.topDebtors[0]!.invoiceCount).toBe(3);
    });

    it('should filter by partnerId when provided', async () => {
      const invoices: AgingInvoice[] = [
        createInvoice('inv-1', 'tenant-1', new Date('2026-01-01'), 100000, 'p1', 'Partner A'),
        createInvoice('inv-2', 'tenant-1', new Date('2026-01-01'), 200000, 'p2', 'Partner B'),
        createInvoice('inv-3', 'tenant-1', new Date('2026-01-01'), 300000, 'p1', 'Partner A'),
      ];
      mockRepository.setInvoices(invoices);

      // Filter by partner
      const report = await service.getAgingReport('tenant-1', { partnerId: 'p1' });

      expect(report.totalReceivables).toBe(400000); // Only p1 invoices
    });

    it('should set generatedAt to current timestamp', async () => {
      mockRepository.setInvoices([]);
      const now = new Date('2026-02-07');

      const report = await service.getAgingReport('tenant-1');

      expect(report.generatedAt.getTime()).toBe(now.getTime());
    });

    it('should return all 4 buckets even when some are empty', async () => {
      mockRepository.setInvoices([
        createInvoice('inv-1', 'tenant-1', new Date('2025-10-01'), 100000), // Only 90+
      ]);

      const report = await service.getAgingReport('tenant-1');

      expect(report.buckets).toHaveLength(4);
      const labels = report.buckets.map(b => b.label);
      expect(labels).toContain('0-30');
      expect(labels).toContain('31-60');
      expect(labels).toContain('61-90');
      expect(labels).toContain('90+');
    });

    it('should handle floating point amounts correctly', async () => {
      mockRepository.setInvoices([
        createInvoice('inv-1', 'tenant-1', new Date('2026-02-01'), 99999.99),
        createInvoice('inv-2', 'tenant-1', new Date('2026-02-01'), 0.01),
      ]);

      const report = await service.getAgingReport('tenant-1');

      expect(report.totalReceivables).toBe(100000);
    });
  });

  describe('calculateDaysOverdue', () => {
    it('should return 0 for future due date', async () => {
      const invoice = createInvoice('inv-1', 'tenant-1', new Date('2026-02-10'), 100000);
      mockRepository.setInvoices([invoice]);

      const report = await service.getAgingReport('tenant-1');

      // Future invoice goes to 0-30 bucket
      const bucket0_30 = report.buckets.find(b => b.label === '0-30');
      expect(bucket0_30!.count).toBe(1);
    });

    it('should handle exact bucket boundaries correctly (30, 60, 90 days)', async () => {
      mockRepository.setInvoices([
        createInvoice('inv-30', 'tenant-1', new Date('2026-01-08'), 100000), // Exactly 30 days
        createInvoice('inv-31', 'tenant-1', new Date('2026-01-07'), 100000), // Exactly 31 days
        createInvoice('inv-60', 'tenant-1', new Date('2025-12-09'), 100000), // Exactly 60 days
        createInvoice('inv-61', 'tenant-1', new Date('2025-12-08'), 100000), // Exactly 61 days
        createInvoice('inv-90', 'tenant-1', new Date('2025-11-09'), 100000), // Exactly 90 days
        createInvoice('inv-91', 'tenant-1', new Date('2025-11-08'), 100000), // Exactly 91 days
      ]);

      const report = await service.getAgingReport('tenant-1');

      const bucket0_30 = report.buckets.find(b => b.label === '0-30');
      const bucket31_60 = report.buckets.find(b => b.label === '31-60');
      const bucket61_90 = report.buckets.find(b => b.label === '61-90');
      const bucket90plus = report.buckets.find(b => b.label === '90+');

      expect(bucket0_30!.count).toBe(1); // 30 days
      expect(bucket31_60!.count).toBe(2); // 31, 60 days
      expect(bucket61_90!.count).toBe(2); // 61, 90 days
      expect(bucket90plus!.count).toBe(1); // 91 days
    });
  });
});

// Helper function to create test invoices
function createInvoice(
  id: string,
  tenantId: string,
  dueDate: Date,
  balanceDue: number,
  partnerId = 'partner-default',
  partnerName = 'Default Partner'
): AgingInvoice {
  return {
    id,
    tenantId,
    invoiceNumber: `SZ-${id}`,
    partnerId,
    partnerName,
    dueDate,
    balanceDue,
    totalAmount: balanceDue,
    status: dueDate < new Date() ? 'OVERDUE' : 'SENT',
  };
}
