/**
 * @kgc/reporting - ReportService
 * Epic 27: Story 27-2 - Reszletes Riportok
 */

import { Injectable } from '@nestjs/common';
import {
  IReportDefinition,
  IReportResult,
  IReportColumn,
  ITableRow,
  ReportType,
  ReportFormat,
  DateRange,
} from '../interfaces/reporting.interface';
import {
  GenerateReportDto,
  GenerateReportSchema,
} from '../dto/reporting.dto';

export interface IReportRepository {
  findById(id: string): Promise<IReportDefinition | null>;
  findByType(type: ReportType): Promise<IReportDefinition | null>;
  findByTenantId(tenantId: string): Promise<IReportDefinition[]>;
  findSystemReports(): Promise<IReportDefinition[]>;
}

export interface IReportDataProvider {
  executeQuery(
    tenantId: string,
    reportType: ReportType,
    parameters: Record<string, unknown>,
    startDate: Date,
    endDate: Date,
    limit: number,
    offset: number,
  ): Promise<{ data: ITableRow[]; totalCount: number }>;

  calculateSummary(
    tenantId: string,
    reportType: ReportType,
    parameters: Record<string, unknown>,
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, number>>;
}

export interface IReportExporter {
  exportToCsv(result: IReportResult): Promise<Buffer>;
  exportToPdf(result: IReportResult): Promise<Buffer>;
  exportToExcel(result: IReportResult): Promise<Buffer>;
}

export interface IAuditService {
  log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

@Injectable()
export class ReportService {
  private readonly reportColumns: Record<ReportType, IReportColumn[]> = {
    [ReportType.RENTAL_SUMMARY]: [
      { field: 'date', header: 'Dátum', type: 'date', sortable: true },
      { field: 'rentalCount', header: 'Bérlések száma', type: 'number', sortable: true },
      { field: 'totalRevenue', header: 'Bevétel', type: 'currency', sortable: true },
      { field: 'avgDuration', header: 'Átlag időtartam (nap)', type: 'number' },
      { field: 'lateReturns', header: 'Késedelmes visszaadás', type: 'number' },
    ],
    [ReportType.SERVICE_SUMMARY]: [
      { field: 'date', header: 'Dátum', type: 'date', sortable: true },
      { field: 'worksheetCount', header: 'Munkalapok száma', type: 'number', sortable: true },
      { field: 'completedCount', header: 'Lezárt', type: 'number' },
      { field: 'laborRevenue', header: 'Munkadíj bevétel', type: 'currency', sortable: true },
      { field: 'partsRevenue', header: 'Alkatrész bevétel', type: 'currency' },
    ],
    [ReportType.SALES_SUMMARY]: [
      { field: 'date', header: 'Dátum', type: 'date', sortable: true },
      { field: 'invoiceCount', header: 'Számlák száma', type: 'number', sortable: true },
      { field: 'netTotal', header: 'Nettó összeg', type: 'currency', sortable: true },
      { field: 'vatTotal', header: 'ÁFA', type: 'currency' },
      { field: 'grossTotal', header: 'Bruttó összeg', type: 'currency', sortable: true },
    ],
    [ReportType.INVENTORY_STATUS]: [
      { field: 'productCode', header: 'Cikkszám', type: 'string', sortable: true, filterable: true },
      { field: 'productName', header: 'Megnevezés', type: 'string', sortable: true, filterable: true },
      { field: 'currentStock', header: 'Aktuális készlet', type: 'number', sortable: true },
      { field: 'minStock', header: 'Minimum készlet', type: 'number' },
      { field: 'stockValue', header: 'Készletérték', type: 'currency', sortable: true },
    ],
    [ReportType.FINANCIAL_OVERVIEW]: [
      { field: 'category', header: 'Kategória', type: 'string' },
      { field: 'income', header: 'Bevétel', type: 'currency', sortable: true },
      { field: 'expense', header: 'Kiadás', type: 'currency' },
      { field: 'profit', header: 'Eredmény', type: 'currency', sortable: true },
      { field: 'profitMargin', header: 'Profit margin', type: 'percent' },
    ],
    [ReportType.CUSTOMER_ACTIVITY]: [
      { field: 'customerName', header: 'Ügyfél', type: 'string', sortable: true, filterable: true },
      { field: 'rentalCount', header: 'Bérlések', type: 'number', sortable: true },
      { field: 'serviceCount', header: 'Szervizek', type: 'number' },
      { field: 'totalSpent', header: 'Összes költés', type: 'currency', sortable: true },
      { field: 'lastActivity', header: 'Utolsó aktivitás', type: 'date', sortable: true },
    ],
    [ReportType.EQUIPMENT_UTILIZATION]: [
      { field: 'equipmentCode', header: 'Gépkód', type: 'string', sortable: true, filterable: true },
      { field: 'equipmentName', header: 'Megnevezés', type: 'string', filterable: true },
      { field: 'totalDays', header: 'Kiadott napok', type: 'number', sortable: true },
      { field: 'utilizationRate', header: 'Kihasználtság', type: 'percent', sortable: true },
      { field: 'revenue', header: 'Bevétel', type: 'currency', sortable: true },
    ],
  };

  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly dataProvider: IReportDataProvider,
    private readonly exporter: IReportExporter,
    private readonly auditService: IAuditService,
  ) {}

  async generateReport(
    input: GenerateReportDto,
    tenantId: string,
    userId: string,
  ): Promise<IReportResult | Buffer> {
    const startTime = Date.now();

    const validationResult = GenerateReportSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    const { startDate, endDate } = this.calculateDateRange(
      validInput.dateRange,
      validInput.startDate,
      validInput.endDate,
    );

    const reportType = validInput.reportType as ReportType;
    const columns = this.reportColumns[reportType];
    if (!columns) {
      throw new Error(`Unknown report type: ${reportType}`);
    }

    const { data, totalCount } = await this.dataProvider.executeQuery(
      tenantId,
      reportType,
      validInput.parameters || {},
      startDate,
      endDate,
      validInput.limit,
      validInput.offset,
    );

    const summary = await this.dataProvider.calculateSummary(
      tenantId,
      reportType,
      validInput.parameters || {},
      startDate,
      endDate,
    );

    const executionTimeMs = Date.now() - startTime;

    const result: IReportResult = {
      reportId: reportType,
      reportName: this.getReportName(reportType),
      tenantId,
      parameters: {
        dateRange: validInput.dateRange,
        startDate,
        endDate,
        ...validInput.parameters,
      },
      columns,
      data,
      summary,
      generatedAt: new Date(),
      rowCount: totalCount,
      executionTimeMs,
    };

    await this.auditService.log({
      action: 'report_generated',
      entityType: 'report',
      entityId: reportType,
      userId,
      tenantId,
      metadata: {
        reportType,
        dateRange: validInput.dateRange,
        rowCount: totalCount,
        executionTimeMs,
        format: validInput.format,
      },
    });

    // Export if format is not JSON
    if (validInput.format !== ReportFormat.JSON) {
      return this.exportReport(result, validInput.format as ReportFormat);
    }

    return result;
  }

  async getAvailableReports(tenantId: string): Promise<IReportDefinition[]> {
    const [systemReports, tenantReports] = await Promise.all([
      this.reportRepository.findSystemReports(),
      this.reportRepository.findByTenantId(tenantId),
    ]);

    return [...systemReports, ...tenantReports];
  }

  async getReportDefinition(reportType: ReportType): Promise<IReportDefinition | null> {
    const report = await this.reportRepository.findByType(reportType);
    if (!report) {
      // Return built-in definition
      const columns = this.reportColumns[reportType];
      if (!columns) {
        return null;
      }

      return {
        id: reportType,
        tenantId: 'system',
        name: this.getReportName(reportType),
        type: reportType,
        parameters: [
          {
            name: 'dateRange',
            label: 'Időszak',
            type: 'select',
            required: true,
            defaultValue: 'THIS_MONTH',
            options: [
              { label: 'Ma', value: 'TODAY' },
              { label: 'Tegnap', value: 'YESTERDAY' },
              { label: 'Ez a hét', value: 'THIS_WEEK' },
              { label: 'Múlt hét', value: 'LAST_WEEK' },
              { label: 'Ez a hónap', value: 'THIS_MONTH' },
              { label: 'Múlt hónap', value: 'LAST_MONTH' },
              { label: 'Ez a negyedév', value: 'THIS_QUARTER' },
              { label: 'Ez az év', value: 'THIS_YEAR' },
              { label: 'Egyéni', value: 'CUSTOM' },
            ],
          },
        ],
        columns,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return report;
  }

  private async exportReport(result: IReportResult, format: ReportFormat): Promise<Buffer> {
    switch (format) {
      case ReportFormat.CSV:
        return this.exporter.exportToCsv(result);
      case ReportFormat.PDF:
        return this.exporter.exportToPdf(result);
      case ReportFormat.EXCEL:
        return this.exporter.exportToExcel(result);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private getReportName(type: ReportType): string {
    const names: Record<ReportType, string> = {
      [ReportType.RENTAL_SUMMARY]: 'Bérlés összesítő',
      [ReportType.SERVICE_SUMMARY]: 'Szerviz összesítő',
      [ReportType.SALES_SUMMARY]: 'Értékesítés összesítő',
      [ReportType.INVENTORY_STATUS]: 'Készlet állapot',
      [ReportType.FINANCIAL_OVERVIEW]: 'Pénzügyi áttekintés',
      [ReportType.CUSTOMER_ACTIVITY]: 'Ügyfél aktivitás',
      [ReportType.EQUIPMENT_UTILIZATION]: 'Gép kihasználtság',
    };
    return names[type] || type;
  }

  private calculateDateRange(
    range: string,
    customStart?: Date,
    customEnd?: Date,
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (range) {
      case DateRange.TODAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case DateRange.YESTERDAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case DateRange.THIS_WEEK:
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startDate = new Date(now.getFullYear(), now.getMonth(), diff);
        break;
      case DateRange.LAST_WEEK:
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setDate(now.getDate() - now.getDay());
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        startDate = lastWeekStart;
        endDate = lastWeekEnd;
        break;
      case DateRange.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case DateRange.LAST_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case DateRange.THIS_QUARTER:
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case DateRange.THIS_YEAR:
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case DateRange.CUSTOM:
        if (!customStart || !customEnd) {
          throw new Error('Custom date range requires startDate and endDate');
        }
        startDate = customStart;
        endDate = customEnd;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { startDate, endDate };
  }
}
