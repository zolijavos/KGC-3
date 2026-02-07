/**
 * Receivables Dashboard Service
 * Epic 41: Story 41-1 - Kintlévőség Aging Report
 *
 * Service for receivables aging report dashboard.
 * Interfaces with @kgc/sales-invoice ReceivablesService.
 */

import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { AgingReportData } from './dto/receivables-aging.dto';

/**
 * In-Memory Receivables Repository for MVP
 *
 * TODO: Replace with PrismaReceivablesRepository when ready
 */
class InMemoryReceivablesRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_prisma: PrismaClient) {
    // Prisma will be used in PrismaReceivablesRepository
  }

  async getUnpaidInvoices(
    tenantId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _filters?: { partnerId?: string }
  ): Promise<
    {
      id: string;
      tenantId: string;
      invoiceNumber: string;
      partnerId: string;
      partnerName: string;
      dueDate: Date;
      balanceDue: number;
      totalAmount: number;
      status: string;
    }[]
  > {
    // TODO: Replace with actual Prisma query when Invoice model connected
    // For now, return mock data for demo purposes

    // Mock data for development/demo
    const now = new Date();

    return [
      {
        id: 'inv-1',
        tenantId,
        invoiceNumber: 'SZ-2026-0001',
        partnerId: 'partner-1',
        partnerName: 'Kovács Építőipari Kft.',
        dueDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        balanceDue: 245000,
        totalAmount: 245000,
        status: 'SENT',
      },
      {
        id: 'inv-2',
        tenantId,
        invoiceNumber: 'SZ-2026-0002',
        partnerId: 'partner-2',
        partnerName: 'Nagy Ferenc e.v.',
        dueDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        balanceDue: 128500,
        totalAmount: 128500,
        status: 'OVERDUE',
      },
      {
        id: 'inv-3',
        tenantId,
        invoiceNumber: 'SZ-2026-0003',
        partnerId: 'partner-3',
        partnerName: 'Szabó és Társa Bt.',
        dueDate: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000), // 75 days ago
        balanceDue: 520000,
        totalAmount: 520000,
        status: 'OVERDUE',
      },
      {
        id: 'inv-4',
        tenantId,
        invoiceNumber: 'SZ-2025-0150',
        partnerId: 'partner-4',
        partnerName: 'Tóth Gépkölcsönző Zrt.',
        dueDate: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
        balanceDue: 890000,
        totalAmount: 890000,
        status: 'OVERDUE',
      },
      {
        id: 'inv-5',
        tenantId,
        invoiceNumber: 'SZ-2026-0004',
        partnerId: 'partner-1',
        partnerName: 'Kovács Építőipari Kft.',
        dueDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        balanceDue: 95000,
        totalAmount: 95000,
        status: 'SENT',
      },
    ];
  }
}

@Injectable()
export class ReceivablesDashboardService {
  private readonly repository: InMemoryReceivablesRepository;

  constructor(@Inject('PRISMA_CLIENT') prisma: PrismaClient) {
    this.repository = new InMemoryReceivablesRepository(prisma);
  }

  /**
   * Get aging report
   * @param tenantId Tenant ID (ADR-001)
   * @param filters Optional filters
   */
  async getAgingReport(
    tenantId: string,
    filters?: { partnerId?: string }
  ): Promise<AgingReportData> {
    // Get unpaid invoices
    let invoices = await this.repository.getUnpaidInvoices(tenantId, filters);

    // Filter by partner if specified
    if (filters?.partnerId) {
      invoices = invoices.filter(inv => inv.partnerId === filters.partnerId);
    }

    const now = new Date();

    // Initialize buckets
    const buckets: AgingReportData['buckets'] = [
      { label: '0-30', count: 0, totalAmount: 0, invoices: [] },
      { label: '31-60', count: 0, totalAmount: 0, invoices: [] },
      { label: '61-90', count: 0, totalAmount: 0, invoices: [] },
      { label: '90+', count: 0, totalAmount: 0, invoices: [] },
    ];

    // Categorize invoices into buckets
    for (const invoice of invoices) {
      const daysOverdue = Math.max(
        0,
        Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      let bucketLabel: '0-30' | '31-60' | '61-90' | '90+';
      if (daysOverdue <= 30) bucketLabel = '0-30';
      else if (daysOverdue <= 60) bucketLabel = '31-60';
      else if (daysOverdue <= 90) bucketLabel = '61-90';
      else bucketLabel = '90+';

      const bucket = buckets.find(b => b.label === bucketLabel);
      if (bucket) {
        bucket.count++;
        bucket.totalAmount += invoice.balanceDue;
        bucket.invoices?.push({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          partnerId: invoice.partnerId,
          partnerName: invoice.partnerName,
          dueDate: invoice.dueDate.toISOString(),
          balanceDue: invoice.balanceDue,
          daysOverdue,
        });
      }
    }

    // Round bucket amounts to avoid floating point issues
    for (const bucket of buckets) {
      bucket.totalAmount = Math.round(bucket.totalAmount * 100) / 100;
    }

    // Calculate total
    const totalReceivables =
      Math.round(buckets.reduce((sum, b) => sum + b.totalAmount, 0) * 100) / 100;

    // Aggregate top debtors
    const partnerMap = new Map<
      string,
      {
        partnerId: string;
        partnerName: string;
        totalDebt: number;
        invoiceCount: number;
        oldestDueDate: Date;
      }
    >();

    for (const invoice of invoices) {
      const existing = partnerMap.get(invoice.partnerId);
      if (existing) {
        existing.totalDebt += invoice.balanceDue;
        existing.invoiceCount++;
        if (invoice.dueDate < existing.oldestDueDate) {
          existing.oldestDueDate = invoice.dueDate;
        }
      } else {
        partnerMap.set(invoice.partnerId, {
          partnerId: invoice.partnerId,
          partnerName: invoice.partnerName,
          totalDebt: invoice.balanceDue,
          invoiceCount: 1,
          oldestDueDate: invoice.dueDate,
        });
      }
    }

    const topDebtors = Array.from(partnerMap.values())
      .sort((a, b) => b.totalDebt - a.totalDebt)
      .slice(0, 5)
      .map(d => ({
        partnerId: d.partnerId,
        partnerName: d.partnerName,
        totalDebt: d.totalDebt,
        invoiceCount: d.invoiceCount,
        oldestDueDate: d.oldestDueDate.toISOString(),
      }));

    return {
      generatedAt: now.toISOString(),
      totalReceivables,
      buckets,
      topDebtors,
    };
  }
}
