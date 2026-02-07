/**
 * Receivables Dashboard Controller Tests
 * Epic 41: Story 41-1 - Kintlévőség Aging Report
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgingReportData } from './dto/receivables-aging.dto';
import { ReceivablesDashboardController } from './receivables.controller';
import type { ReceivablesDashboardService } from './receivables.service';

describe('ReceivablesDashboardController', () => {
  let controller: ReceivablesDashboardController;
  let mockService: {
    getAgingReport: ReturnType<typeof vi.fn>;
  };

  const mockAgingReport: AgingReportData = {
    generatedAt: '2026-02-07T12:00:00.000Z',
    totalReceivables: 1878500,
    buckets: [
      { label: '0-30' as const, count: 2, totalAmount: 340000, invoices: [] },
      { label: '31-60' as const, count: 1, totalAmount: 128500, invoices: [] },
      { label: '61-90' as const, count: 1, totalAmount: 520000, invoices: [] },
      { label: '90+' as const, count: 1, totalAmount: 890000, invoices: [] },
    ],
    topDebtors: [
      {
        partnerId: 'partner-4',
        partnerName: 'Tóth Gépkölcsönző Zrt.',
        totalDebt: 890000,
        invoiceCount: 1,
        oldestDueDate: '2025-10-10T00:00:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    mockService = {
      getAgingReport: vi.fn().mockResolvedValue(mockAgingReport),
    };

    controller = new ReceivablesDashboardController(
      mockService as unknown as ReceivablesDashboardService
    );
  });

  describe('GET /dashboard/receivables/aging', () => {
    it('[P0] should return aging report with all buckets', async () => {
      const result = await controller.getAgingReport({});

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockAgingReport);
      expect(result.data.buckets).toHaveLength(4);
    });

    it('[P0] should call service with correct parameters', async () => {
      await controller.getAgingReport({ partnerId: 'partner-1' });

      expect(mockService.getAgingReport).toHaveBeenCalledWith('default-tenant', {
        partnerId: 'partner-1',
      });
    });

    it('[P1] should return totalReceivables sum', async () => {
      const result = await controller.getAgingReport({});

      expect(result.data.totalReceivables).toBe(1878500);
    });

    it('[P1] should return top debtors list', async () => {
      const result = await controller.getAgingReport({});

      expect(result.data.topDebtors).toHaveLength(1);
      expect(result.data.topDebtors[0]!.partnerName).toBe('Tóth Gépkölcsönző Zrt.');
    });

    it('[P1] should include generatedAt timestamp', async () => {
      const result = await controller.getAgingReport({});

      expect(result.data.generatedAt).toBe('2026-02-07T12:00:00.000Z');
    });

    it('[P1] should handle empty filters', async () => {
      await controller.getAgingReport({});

      expect(mockService.getAgingReport).toHaveBeenCalledWith('default-tenant', undefined);
    });
  });
});
