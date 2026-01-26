/**
 * In-Memory Report Data Provider
 * Epic 27: Story 27-2 - Részletes Riportok
 *
 * Provides mock data for detailed reports.
 * Will be replaced with real Prisma queries.
 */

import { IReportDataProvider, ITableRow, ReportType } from '@kgc/reporting';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryReportDataProvider implements IReportDataProvider {
  async executeQuery(
    _tenantId: string,
    reportType: ReportType,
    _parameters: Record<string, unknown>,
    startDate: Date,
    endDate: Date,
    limit: number,
    offset: number
  ): Promise<{ data: ITableRow[]; totalCount: number }> {
    const generators: Record<ReportType, () => ITableRow[]> = {
      [ReportType.RENTAL_SUMMARY]: () =>
        this.generateDailyData(startDate, endDate, () => ({
          rentalCount: Math.floor(Math.random() * 20) + 5,
          totalRevenue: Math.floor(Math.random() * 300000) + 50000,
          avgDuration: Math.floor(Math.random() * 5) + 1,
          lateReturns: Math.floor(Math.random() * 3),
        })),

      [ReportType.SERVICE_SUMMARY]: () =>
        this.generateDailyData(startDate, endDate, () => ({
          worksheetCount: Math.floor(Math.random() * 15) + 3,
          completedCount: Math.floor(Math.random() * 10) + 2,
          laborRevenue: Math.floor(Math.random() * 150000) + 30000,
          partsRevenue: Math.floor(Math.random() * 100000) + 20000,
        })),

      [ReportType.SALES_SUMMARY]: () =>
        this.generateDailyData(startDate, endDate, () => {
          const netTotal = Math.floor(Math.random() * 500000) + 100000;
          const vatTotal = Math.floor(netTotal * 0.27);
          return {
            invoiceCount: Math.floor(Math.random() * 30) + 10,
            netTotal,
            vatTotal,
            grossTotal: netTotal + vatTotal,
          };
        }),

      [ReportType.INVENTORY_STATUS]: () =>
        Array.from({ length: 50 }, (_, i) => ({
          productCode: `PRD-${String(i + 1).padStart(4, '0')}`,
          productName: `Termék ${i + 1}`,
          currentStock: Math.floor(Math.random() * 100) + 5,
          minStock: Math.floor(Math.random() * 20) + 5,
          stockValue: Math.floor(Math.random() * 500000) + 10000,
        })),

      [ReportType.FINANCIAL_OVERVIEW]: () => [
        { category: 'Bérlés', income: 2500000, expense: 500000, profit: 2000000, profitMargin: 80 },
        {
          category: 'Szerviz',
          income: 1800000,
          expense: 800000,
          profit: 1000000,
          profitMargin: 55,
        },
        { category: 'Eladás', income: 3200000, expense: 2400000, profit: 800000, profitMargin: 25 },
        {
          category: 'Alkatrész',
          income: 900000,
          expense: 600000,
          profit: 300000,
          profitMargin: 33,
        },
      ],

      [ReportType.CUSTOMER_ACTIVITY]: () =>
        Array.from({ length: 30 }, (_, i) => ({
          customerName: `Ügyfél ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) || ''}`,
          rentalCount: Math.floor(Math.random() * 20) + 1,
          serviceCount: Math.floor(Math.random() * 10),
          totalSpent: Math.floor(Math.random() * 1000000) + 50000,
          lastActivity: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })),

      [ReportType.EQUIPMENT_UTILIZATION]: () =>
        Array.from({ length: 25 }, (_, i) => ({
          equipmentCode: `EQ-${String(i + 1).padStart(3, '0')}`,
          equipmentName: `Bérgép ${i + 1}`,
          totalDays: Math.floor(Math.random() * 25) + 5,
          utilizationRate: Math.floor(Math.random() * 40) + 60,
          revenue: Math.floor(Math.random() * 300000) + 50000,
        })),
    };

    const generator = generators[reportType];
    const allData = generator ? generator() : [];
    const totalCount = allData.length;
    const data = allData.slice(offset, offset + limit);

    return { data, totalCount };
  }

  async calculateSummary(
    _tenantId: string,
    reportType: ReportType,
    _parameters: Record<string, unknown>,
    _startDate: Date,
    _endDate: Date
  ): Promise<Record<string, number>> {
    const summaries: Record<ReportType, Record<string, number>> = {
      [ReportType.RENTAL_SUMMARY]: {
        totalRentals: 345,
        totalRevenue: 8500000,
        avgDuration: 3.2,
        lateReturns: 12,
      },
      [ReportType.SERVICE_SUMMARY]: {
        totalWorksheets: 189,
        completedCount: 165,
        totalLaborRevenue: 4200000,
        totalPartsRevenue: 2800000,
      },
      [ReportType.SALES_SUMMARY]: {
        totalInvoices: 456,
        totalNetAmount: 12500000,
        totalVatAmount: 3375000,
        totalGrossAmount: 15875000,
      },
      [ReportType.INVENTORY_STATUS]: {
        totalProducts: 1250,
        totalStockValue: 45000000,
        lowStockItems: 23,
        outOfStockItems: 5,
      },
      [ReportType.FINANCIAL_OVERVIEW]: {
        totalIncome: 8400000,
        totalExpense: 4300000,
        totalProfit: 4100000,
        avgProfitMargin: 48.8,
      },
      [ReportType.CUSTOMER_ACTIVITY]: {
        totalCustomers: 320,
        activeCustomers: 185,
        totalRentals: 890,
        totalRevenue: 25000000,
      },
      [ReportType.EQUIPMENT_UTILIZATION]: {
        totalEquipment: 150,
        avgUtilization: 72.5,
        totalRevenue: 6800000,
        idleEquipment: 18,
      },
    };

    return summaries[reportType] ?? {};
  }

  private generateDailyData(
    startDate: Date,
    endDate: Date,
    generator: () => Record<string, number>
  ): ITableRow[] {
    const data: ITableRow[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      data.push({
        date: current.toISOString().split('T')[0] ?? '',
        ...generator(),
      });
      current.setDate(current.getDate() + 1);
    }

    return data;
  }
}
