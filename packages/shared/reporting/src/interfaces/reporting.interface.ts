/**
 * @kgc/reporting - Reporting Interfaces
 * Epic 27: Reporting Engine
 */

export enum WidgetType {
  COUNTER = 'COUNTER',
  CHART_BAR = 'CHART_BAR',
  CHART_LINE = 'CHART_LINE',
  CHART_PIE = 'CHART_PIE',
  TABLE = 'TABLE',
  TREND = 'TREND',
}

export enum ReportType {
  RENTAL_SUMMARY = 'RENTAL_SUMMARY',
  SERVICE_SUMMARY = 'SERVICE_SUMMARY',
  SALES_SUMMARY = 'SALES_SUMMARY',
  INVENTORY_STATUS = 'INVENTORY_STATUS',
  FINANCIAL_OVERVIEW = 'FINANCIAL_OVERVIEW',
  CUSTOMER_ACTIVITY = 'CUSTOMER_ACTIVITY',
  EQUIPMENT_UTILIZATION = 'EQUIPMENT_UTILIZATION',
}

export enum ReportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
  PDF = 'PDF',
  EXCEL = 'EXCEL',
}

export enum DateRange {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  THIS_WEEK = 'THIS_WEEK',
  LAST_WEEK = 'LAST_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  THIS_QUARTER = 'THIS_QUARTER',
  THIS_YEAR = 'THIS_YEAR',
  CUSTOM = 'CUSTOM',
}

export interface IWidgetConfig {
  id: string;
  tenantId: string;
  type: WidgetType;
  title: string;
  dataSource: string;
  refreshInterval?: number; // seconds
  position: { row: number; col: number; width: number; height: number };
  config?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWidgetData {
  widgetId: string;
  value?: number;
  previousValue?: number;
  changePercent?: number;
  trend?: 'up' | 'down' | 'stable';
  series?: IChartSeries[];
  tableData?: ITableRow[];
  generatedAt: Date;
}

export interface IChartSeries {
  name: string;
  data: { label: string; value: number }[];
  color?: string;
}

export interface ITableRow {
  [key: string]: string | number | boolean | null;
}

export interface IReportDefinition {
  id: string;
  tenantId: string;
  name: string;
  type: ReportType;
  description?: string;
  parameters: IReportParameter[];
  columns: IReportColumn[];
  isSystem: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReportParameter {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  required: boolean;
  defaultValue?: unknown;
  options?: { label: string; value: string }[];
}

export interface IReportColumn {
  field: string;
  header: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'percent';
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
}

export interface IReportResult {
  reportId: string;
  reportName: string;
  tenantId: string;
  parameters: Record<string, unknown>;
  columns: IReportColumn[];
  data: ITableRow[];
  summary?: Record<string, number>;
  generatedAt: Date;
  rowCount: number;
  executionTimeMs: number;
}

export interface ICrossReportResult extends Omit<IReportResult, 'tenantId'> {
  tenants: { id: string; name: string }[];
  dataByTenant: Record<string, ITableRow[]>;
  aggregatedData: ITableRow[];
}

export interface IScheduledReport {
  id: string;
  tenantId: string;
  reportId: string;
  name: string;
  schedule: string; // cron expression
  format: ReportFormat;
  recipients: string[];
  lastRun?: Date;
  nextRun: Date;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
