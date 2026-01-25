/**
 * @kgc/reporting - CrossTenantReportService
 * Epic 27: Story 27-3 - Cross-Tenant Riportok
 */

import { Injectable } from '@nestjs/common';
import {
  ICrossReportResult,
  IReportColumn,
  ITableRow,
  ReportType,
  DateRange,
} from '../interfaces/reporting.interface';
import {
  CrossTenantReportDto,
  CrossTenantReportSchema,
} from '../dto/reporting.dto';

export interface ITenantRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
  findByIds(ids: string[]): Promise<{ id: string; name: string }[]>;
}

export interface ICrossReportDataProvider {
  executeQueryForTenants(
    tenantIds: string[],
    reportType: ReportType,
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, ITableRow[]>>;

  aggregateData(
    dataByTenant: Record<string, ITableRow[]>,
    aggregateBy: 'sum' | 'avg' | 'count' | 'min' | 'max',
    numericFields: string[],
  ): ITableRow[];
}

export interface IAuthorizationService {
  canAccessTenant(userId: string, tenantId: string): Promise<boolean>;
  getAccessibleTenants(userId: string): Promise<string[]>;
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
export class CrossTenantReportService {
  private readonly numericFieldsByType: Record<ReportType, string[]> = {
    [ReportType.RENTAL_SUMMARY]: ['rentalCount', 'totalRevenue', 'avgDuration', 'lateReturns'],
    [ReportType.SERVICE_SUMMARY]: ['worksheetCount', 'completedCount', 'laborRevenue', 'partsRevenue'],
    [ReportType.SALES_SUMMARY]: ['invoiceCount', 'netTotal', 'vatTotal', 'grossTotal'],
    [ReportType.INVENTORY_STATUS]: ['currentStock', 'minStock', 'stockValue'],
    [ReportType.FINANCIAL_OVERVIEW]: ['income', 'expense', 'profit', 'profitMargin'],
    [ReportType.CUSTOMER_ACTIVITY]: ['rentalCount', 'serviceCount', 'totalSpent'],
    [ReportType.EQUIPMENT_UTILIZATION]: ['totalDays', 'utilizationRate', 'revenue'],
  };

  constructor(
    private readonly tenantRepository: ITenantRepository,
    private readonly dataProvider: ICrossReportDataProvider,
    private readonly authService: IAuthorizationService,
    private readonly auditService: IAuditService,
  ) {}

  async generateCrossReport(
    input: CrossTenantReportDto,
    userId: string,
    userTenantId: string,
  ): Promise<ICrossReportResult> {
    const startTime = Date.now();

    const validationResult = CrossTenantReportSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Verify user has access to all requested tenants
    const accessibleTenants = await this.authService.getAccessibleTenants(userId);
    const unauthorizedTenants = validInput.tenantIds.filter(
      (id) => !accessibleTenants.includes(id),
    );

    if (unauthorizedTenants.length > 0) {
      throw new Error(
        `Access denied to tenants: ${unauthorizedTenants.join(', ')}`,
      );
    }

    // Get tenant information
    const tenants = await this.tenantRepository.findByIds(validInput.tenantIds);
    if (tenants.length !== validInput.tenantIds.length) {
      const foundIds = tenants.map((t) => t.id);
      const missingIds = validInput.tenantIds.filter((id) => !foundIds.includes(id));
      throw new Error(`Tenants not found: ${missingIds.join(', ')}`);
    }

    const { startDate, endDate } = this.calculateDateRange(
      validInput.dateRange,
      validInput.startDate,
      validInput.endDate,
    );

    const reportType = validInput.reportType as ReportType;

    // Execute queries for all tenants
    const dataByTenant = await this.dataProvider.executeQueryForTenants(
      validInput.tenantIds,
      reportType,
      startDate,
      endDate,
    );

    // Aggregate data
    const numericFields = this.numericFieldsByType[reportType] || [];
    const aggregatedData = this.dataProvider.aggregateData(
      dataByTenant,
      validInput.aggregateBy,
      numericFields,
    );

    const executionTimeMs = Date.now() - startTime;

    const result: ICrossReportResult = {
      reportId: reportType,
      reportName: this.getReportName(reportType),
      tenants,
      parameters: {
        dateRange: validInput.dateRange,
        startDate,
        endDate,
        aggregateBy: validInput.aggregateBy,
      },
      columns: this.getReportColumns(reportType),
      data: aggregatedData,
      dataByTenant,
      aggregatedData,
      generatedAt: new Date(),
      rowCount: aggregatedData.length,
      executionTimeMs,
    };

    await this.auditService.log({
      action: 'cross_tenant_report_generated',
      entityType: 'cross_report',
      entityId: reportType,
      userId,
      tenantId: userTenantId,
      metadata: {
        reportType,
        tenantCount: validInput.tenantIds.length,
        tenantIds: validInput.tenantIds,
        dateRange: validInput.dateRange,
        aggregateBy: validInput.aggregateBy,
        executionTimeMs,
      },
    });

    return result;
  }

  async getAccessibleTenantsList(userId: string): Promise<{ id: string; name: string }[]> {
    const accessibleIds = await this.authService.getAccessibleTenants(userId);
    return this.tenantRepository.findByIds(accessibleIds);
  }

  async compareTenants(
    tenantIds: string[],
    reportType: ReportType,
    dateRange: string,
    userId: string,
    userTenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    tenants: { id: string; name: string }[];
    comparison: Record<string, Record<string, number>>;
  }> {
    // Verify access
    const accessibleTenants = await this.authService.getAccessibleTenants(userId);
    const unauthorizedTenants = tenantIds.filter(
      (id) => !accessibleTenants.includes(id),
    );

    if (unauthorizedTenants.length > 0) {
      throw new Error(`Access denied to tenants: ${unauthorizedTenants.join(', ')}`);
    }

    const tenants = await this.tenantRepository.findByIds(tenantIds);
    const { startDate: start, endDate: end } = this.calculateDateRange(
      dateRange,
      startDate,
      endDate,
    );

    const dataByTenant = await this.dataProvider.executeQueryForTenants(
      tenantIds,
      reportType,
      start,
      end,
    );

    const numericFields = this.numericFieldsByType[reportType] || [];
    const comparison: Record<string, Record<string, number>> = {};

    for (const [tenantId, rows] of Object.entries(dataByTenant)) {
      comparison[tenantId] = {};
      for (const field of numericFields) {
        const values = rows.map((row) => Number(row[field]) || 0);
        comparison[tenantId][field] = values.reduce((sum, val) => sum + val, 0);
      }
    }

    await this.auditService.log({
      action: 'tenant_comparison_generated',
      entityType: 'tenant_comparison',
      entityId: reportType,
      userId,
      tenantId: userTenantId,
      metadata: {
        reportType,
        tenantIds,
        dateRange,
      },
    });

    return { tenants, comparison };
  }

  private getReportName(type: ReportType): string {
    const names: Record<ReportType, string> = {
      [ReportType.RENTAL_SUMMARY]: 'Bérlés összesítő (Cross-tenant)',
      [ReportType.SERVICE_SUMMARY]: 'Szerviz összesítő (Cross-tenant)',
      [ReportType.SALES_SUMMARY]: 'Értékesítés összesítő (Cross-tenant)',
      [ReportType.INVENTORY_STATUS]: 'Készlet állapot (Cross-tenant)',
      [ReportType.FINANCIAL_OVERVIEW]: 'Pénzügyi áttekintés (Cross-tenant)',
      [ReportType.CUSTOMER_ACTIVITY]: 'Ügyfél aktivitás (Cross-tenant)',
      [ReportType.EQUIPMENT_UTILIZATION]: 'Gép kihasználtság (Cross-tenant)',
    };
    return names[type] || `${type} (Cross-tenant)`;
  }

  private getReportColumns(type: ReportType): IReportColumn[] {
    const columnDefs: Record<ReportType, IReportColumn[]> = {
      [ReportType.RENTAL_SUMMARY]: [
        { field: 'tenantName', header: 'Telephely', type: 'string' },
        { field: 'rentalCount', header: 'Bérlések', type: 'number' },
        { field: 'totalRevenue', header: 'Bevétel', type: 'currency' },
      ],
      [ReportType.SERVICE_SUMMARY]: [
        { field: 'tenantName', header: 'Telephely', type: 'string' },
        { field: 'worksheetCount', header: 'Munkalapok', type: 'number' },
        { field: 'laborRevenue', header: 'Munkadíj', type: 'currency' },
      ],
      [ReportType.SALES_SUMMARY]: [
        { field: 'tenantName', header: 'Telephely', type: 'string' },
        { field: 'invoiceCount', header: 'Számlák', type: 'number' },
        { field: 'grossTotal', header: 'Bruttó', type: 'currency' },
      ],
      [ReportType.INVENTORY_STATUS]: [
        { field: 'tenantName', header: 'Telephely', type: 'string' },
        { field: 'currentStock', header: 'Készlet', type: 'number' },
        { field: 'stockValue', header: 'Érték', type: 'currency' },
      ],
      [ReportType.FINANCIAL_OVERVIEW]: [
        { field: 'tenantName', header: 'Telephely', type: 'string' },
        { field: 'income', header: 'Bevétel', type: 'currency' },
        { field: 'profit', header: 'Eredmény', type: 'currency' },
      ],
      [ReportType.CUSTOMER_ACTIVITY]: [
        { field: 'tenantName', header: 'Telephely', type: 'string' },
        { field: 'rentalCount', header: 'Bérlések', type: 'number' },
        { field: 'totalSpent', header: 'Összköltés', type: 'currency' },
      ],
      [ReportType.EQUIPMENT_UTILIZATION]: [
        { field: 'tenantName', header: 'Telephely', type: 'string' },
        { field: 'totalDays', header: 'Kiadott napok', type: 'number' },
        { field: 'revenue', header: 'Bevétel', type: 'currency' },
      ],
    };
    return columnDefs[type] || [];
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
