/**
 * In-Memory Cross-Tenant Report Data Provider
 * Epic 27: Story 27-3 - Cross-Tenant Riportok
 *
 * Provides mock data for cross-tenant reports.
 * Will be replaced with real Prisma queries.
 */

import { ICrossReportDataProvider, ITableRow, ReportType } from '@kgc/reporting';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryCrossReportDataProvider implements ICrossReportDataProvider {
  async executeQueryForTenants(
    tenantIds: string[],
    reportType: ReportType,
    _startDate: Date,
    _endDate: Date
  ): Promise<Record<string, ITableRow[]>> {
    const result: Record<string, ITableRow[]> = {};

    for (const tenantId of tenantIds) {
      result[tenantId] = this.generateMockData(tenantId, reportType);
    }

    return result;
  }

  aggregateData(
    dataByTenant: Record<string, ITableRow[]>,
    aggregateBy: 'sum' | 'avg' | 'count' | 'min' | 'max',
    numericFields: string[]
  ): ITableRow[] {
    const tenantIds = Object.keys(dataByTenant);
    const aggregated: ITableRow[] = [];

    for (const tenantId of tenantIds) {
      const rows = dataByTenant[tenantId] ?? [];
      const aggregatedRow: ITableRow = { tenantId, tenantName: `Telephely ${tenantId.slice(-2)}` };

      for (const field of numericFields) {
        const values = rows.map(row => Number(row[field]) || 0);

        switch (aggregateBy) {
          case 'sum':
            aggregatedRow[field] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            aggregatedRow[field] =
              values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            break;
          case 'count':
            aggregatedRow[field] = values.length;
            break;
          case 'min':
            aggregatedRow[field] = values.length > 0 ? Math.min(...values) : 0;
            break;
          case 'max':
            aggregatedRow[field] = values.length > 0 ? Math.max(...values) : 0;
            break;
        }
      }

      aggregated.push(aggregatedRow);
    }

    return aggregated;
  }

  private generateMockData(tenantId: string, reportType: ReportType): ITableRow[] {
    const seed = tenantId.charCodeAt(tenantId.length - 1);

    const generators: Record<ReportType, () => ITableRow[]> = {
      [ReportType.RENTAL_SUMMARY]: () =>
        Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '',
          rentalCount: Math.floor((Math.random() * seed) % 30) + 5,
          totalRevenue: Math.floor((Math.random() * seed) % 500000) + 100000,
          avgDuration: Math.floor((Math.random() * seed) % 5) + 1,
          lateReturns: Math.floor((Math.random() * seed) % 5),
        })),

      [ReportType.SERVICE_SUMMARY]: () =>
        Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '',
          worksheetCount: Math.floor((Math.random() * seed) % 20) + 3,
          completedCount: Math.floor((Math.random() * seed) % 15) + 2,
          laborRevenue: Math.floor((Math.random() * seed) % 200000) + 50000,
          partsRevenue: Math.floor((Math.random() * seed) % 150000) + 30000,
        })),

      [ReportType.SALES_SUMMARY]: () =>
        Array.from({ length: 7 }, (_, i) => {
          const netTotal = Math.floor((Math.random() * seed) % 800000) + 200000;
          return {
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '',
            invoiceCount: Math.floor((Math.random() * seed) % 40) + 10,
            netTotal,
            vatTotal: Math.floor(netTotal * 0.27),
            grossTotal: Math.floor(netTotal * 1.27),
          };
        }),

      [ReportType.INVENTORY_STATUS]: () => [
        {
          currentStock: Math.floor((Math.random() * seed) % 1000) + 200,
          minStock: Math.floor((Math.random() * seed) % 100) + 50,
          stockValue: Math.floor((Math.random() * seed) % 10000000) + 2000000,
        },
      ],

      [ReportType.FINANCIAL_OVERVIEW]: () => [
        {
          income: Math.floor((Math.random() * seed) % 5000000) + 1000000,
          expense: Math.floor((Math.random() * seed) % 2000000) + 500000,
          profit: Math.floor((Math.random() * seed) % 3000000) + 500000,
          profitMargin: Math.floor((Math.random() * seed) % 40) + 30,
        },
      ],

      [ReportType.CUSTOMER_ACTIVITY]: () =>
        Array.from({ length: 10 }, () => ({
          rentalCount: Math.floor((Math.random() * seed) % 30) + 5,
          serviceCount: Math.floor((Math.random() * seed) % 15) + 2,
          totalSpent: Math.floor((Math.random() * seed) % 1000000) + 100000,
        })),

      [ReportType.EQUIPMENT_UTILIZATION]: () =>
        Array.from({ length: 15 }, () => ({
          totalDays: Math.floor((Math.random() * seed) % 25) + 5,
          utilizationRate: Math.floor((Math.random() * seed) % 40) + 50,
          revenue: Math.floor((Math.random() * seed) % 400000) + 80000,
        })),
    };

    const generator = generators[reportType];
    return generator ? generator() : [];
  }
}
