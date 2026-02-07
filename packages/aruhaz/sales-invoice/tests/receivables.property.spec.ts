/**
 * @kgc/sales-invoice - ReceivablesService Property-Based Tests
 * Epic 41: Story 41-1 - Kintlévőség Aging Report
 *
 * Property-based tests for aging bucket calculations
 * YOLO Pipeline - Auto-generated
 */

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ReceivablesService,
  type AgingInvoice,
  type IReceivablesRepository,
} from '../src/services/receivables.service';

// Mock repository
class PropertyTestRepository implements IReceivablesRepository {
  private invoices: AgingInvoice[] = [];

  setInvoices(invoices: AgingInvoice[]): void {
    this.invoices = invoices;
  }

  async getUnpaidInvoices(tenantId: string): Promise<AgingInvoice[]> {
    return this.invoices.filter(inv => inv.tenantId === tenantId);
  }
}

// Arbitraries
const invoiceAmountArb = fc.integer({ min: 1, max: 10_000_000 });
const daysOverdueArb = fc.integer({ min: 0, max: 365 });

describe('ReceivablesService - Property-Based Tests', () => {
  let service: ReceivablesService;
  let repository: PropertyTestRepository;

  beforeEach(() => {
    repository = new PropertyTestRepository();
    service = new ReceivablesService(repository);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-07'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Aging Bucket Boundaries', () => {
    it('Property: Invoice with daysOverdue <= 30 goes to 0-30 bucket', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 30 }),
          invoiceAmountArb,
          async (daysOverdue, amount) => {
            const now = new Date('2026-02-07');
            const dueDate = new Date(now);
            dueDate.setDate(dueDate.getDate() - daysOverdue);

            const invoice: AgingInvoice = {
              id: `inv-${daysOverdue}`,
              tenantId: 'tenant-1',
              invoiceNumber: `SZ-${daysOverdue}`,
              partnerId: 'partner-1',
              partnerName: 'Test Partner',
              dueDate,
              balanceDue: amount,
              totalAmount: amount,
              status: 'OVERDUE',
            };

            repository.setInvoices([invoice]);
            const report = await service.getAgingReport('tenant-1');

            const bucket = report.buckets.find(b => b.label === '0-30');
            expect(bucket?.count).toBe(1);
            expect(bucket?.totalAmount).toBe(amount);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Invoice with 31 <= daysOverdue <= 60 goes to 31-60 bucket', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 31, max: 60 }),
          invoiceAmountArb,
          async (daysOverdue, amount) => {
            const now = new Date('2026-02-07');
            const dueDate = new Date(now);
            dueDate.setDate(dueDate.getDate() - daysOverdue);

            const invoice: AgingInvoice = {
              id: `inv-${daysOverdue}`,
              tenantId: 'tenant-1',
              invoiceNumber: `SZ-${daysOverdue}`,
              partnerId: 'partner-1',
              partnerName: 'Test Partner',
              dueDate,
              balanceDue: amount,
              totalAmount: amount,
              status: 'OVERDUE',
            };

            repository.setInvoices([invoice]);
            const report = await service.getAgingReport('tenant-1');

            const bucket = report.buckets.find(b => b.label === '31-60');
            expect(bucket?.count).toBe(1);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('Property: Invoice with 61 <= daysOverdue <= 90 goes to 61-90 bucket', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 61, max: 90 }),
          invoiceAmountArb,
          async (daysOverdue, amount) => {
            const now = new Date('2026-02-07');
            const dueDate = new Date(now);
            dueDate.setDate(dueDate.getDate() - daysOverdue);

            const invoice: AgingInvoice = {
              id: `inv-${daysOverdue}`,
              tenantId: 'tenant-1',
              invoiceNumber: `SZ-${daysOverdue}`,
              partnerId: 'partner-1',
              partnerName: 'Test Partner',
              dueDate,
              balanceDue: amount,
              totalAmount: amount,
              status: 'OVERDUE',
            };

            repository.setInvoices([invoice]);
            const report = await service.getAgingReport('tenant-1');

            const bucket = report.buckets.find(b => b.label === '61-90');
            expect(bucket?.count).toBe(1);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('Property: Invoice with daysOverdue > 90 goes to 90+ bucket', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 91, max: 365 }),
          invoiceAmountArb,
          async (daysOverdue, amount) => {
            const now = new Date('2026-02-07');
            const dueDate = new Date(now);
            dueDate.setDate(dueDate.getDate() - daysOverdue);

            const invoice: AgingInvoice = {
              id: `inv-${daysOverdue}`,
              tenantId: 'tenant-1',
              invoiceNumber: `SZ-${daysOverdue}`,
              partnerId: 'partner-1',
              partnerName: 'Test Partner',
              dueDate,
              balanceDue: amount,
              totalAmount: amount,
              status: 'OVERDUE',
            };

            repository.setInvoices([invoice]);
            const report = await service.getAgingReport('tenant-1');

            const bucket = report.buckets.find(b => b.label === '90+');
            expect(bucket?.count).toBe(1);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Total Calculations', () => {
    it('Property: Total receivables equals sum of all bucket amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              daysOverdue: daysOverdueArb,
              amount: invoiceAmountArb,
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async invoiceData => {
            const now = new Date('2026-02-07');

            const invoices: AgingInvoice[] = invoiceData.map((data, i) => {
              const dueDate = new Date(now);
              dueDate.setDate(dueDate.getDate() - data.daysOverdue);
              return {
                id: `inv-${i}`,
                tenantId: 'tenant-1',
                invoiceNumber: `SZ-${i}`,
                partnerId: `partner-${i}`,
                partnerName: `Partner ${i}`,
                dueDate,
                balanceDue: data.amount,
                totalAmount: data.amount,
                status: 'OVERDUE',
              };
            });

            repository.setInvoices(invoices);
            const report = await service.getAgingReport('tenant-1');

            const bucketSum = report.buckets.reduce((sum, b) => sum + b.totalAmount, 0);
            expect(report.totalReceivables).toBeCloseTo(bucketSum, 2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Top debtors list is sorted by totalDebt descending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              partnerId: fc.uuid(),
              amount: invoiceAmountArb,
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async partnerData => {
            const invoices: AgingInvoice[] = partnerData.map((data, i) => ({
              id: `inv-${i}`,
              tenantId: 'tenant-1',
              invoiceNumber: `SZ-${i}`,
              partnerId: data.partnerId,
              partnerName: `Partner ${data.partnerId.slice(0, 8)}`,
              dueDate: new Date('2026-01-15'),
              balanceDue: data.amount,
              totalAmount: data.amount,
              status: 'OVERDUE',
            }));

            repository.setInvoices(invoices);
            const report = await service.getAgingReport('tenant-1');

            // Verify sorted descending
            for (let i = 0; i < report.topDebtors.length - 1; i++) {
              const current = report.topDebtors[i];
              const next = report.topDebtors[i + 1];
              if (current && next) {
                expect(current.totalDebt).toBeGreaterThanOrEqual(next.totalDebt);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('Property: Top debtors limited to 5 entries', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 20 }), async partnerCount => {
          const invoices: AgingInvoice[] = Array.from({ length: partnerCount }, (_, i) => ({
            id: `inv-${i}`,
            tenantId: 'tenant-1',
            invoiceNumber: `SZ-${i}`,
            partnerId: `partner-${i}`,
            partnerName: `Partner ${i}`,
            dueDate: new Date('2026-01-15'),
            balanceDue: 100000 + i * 10000,
            totalAmount: 100000 + i * 10000,
            status: 'OVERDUE',
          }));

          repository.setInvoices(invoices);
          const report = await service.getAgingReport('tenant-1');

          expect(report.topDebtors.length).toBeLessThanOrEqual(5);
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('Bucket Invariants', () => {
    it('Property: All 4 buckets always present in report', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(invoiceAmountArb, { minLength: 0, maxLength: 10 }),
          async amounts => {
            const invoices: AgingInvoice[] = amounts.map((amount, i) => ({
              id: `inv-${i}`,
              tenantId: 'tenant-1',
              invoiceNumber: `SZ-${i}`,
              partnerId: 'partner-1',
              partnerName: 'Test Partner',
              dueDate: new Date('2026-01-15'),
              balanceDue: amount,
              totalAmount: amount,
              status: 'OVERDUE',
            }));

            repository.setInvoices(invoices);
            const report = await service.getAgingReport('tenant-1');

            expect(report.buckets).toHaveLength(4);
            expect(report.buckets.map(b => b.label)).toContain('0-30');
            expect(report.buckets.map(b => b.label)).toContain('31-60');
            expect(report.buckets.map(b => b.label)).toContain('61-90');
            expect(report.buckets.map(b => b.label)).toContain('90+');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property: Bucket count equals number of invoices in bucket', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              daysOverdue: daysOverdueArb,
              amount: invoiceAmountArb,
            }),
            { minLength: 1, maxLength: 15 }
          ),
          async invoiceData => {
            const now = new Date('2026-02-07');

            const invoices: AgingInvoice[] = invoiceData.map((data, i) => {
              const dueDate = new Date(now);
              dueDate.setDate(dueDate.getDate() - data.daysOverdue);
              return {
                id: `inv-${i}`,
                tenantId: 'tenant-1',
                invoiceNumber: `SZ-${i}`,
                partnerId: `partner-${i}`,
                partnerName: `Partner ${i}`,
                dueDate,
                balanceDue: data.amount,
                totalAmount: data.amount,
                status: 'OVERDUE',
              };
            });

            repository.setInvoices(invoices);
            const report = await service.getAgingReport('tenant-1');

            for (const bucket of report.buckets) {
              expect(bucket.count).toBe(bucket.invoices.length);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
