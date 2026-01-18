/**
 * @kgc/reporting - Reporting Engine Module
 * Epic 27: Reporting Engine
 */

// Module
export { ReportingModule } from './reporting.module';

// Services
export {
  DashboardWidgetService,
  IWidgetRepository,
  IDataSourceProvider,
  IAuditService as IWidgetAuditService,
} from './services/dashboard-widget.service';

export {
  ReportService,
  IReportRepository,
  IReportDataProvider,
  IReportExporter,
  IAuditService as IReportAuditService,
} from './services/report.service';

export {
  CrossTenantReportService,
  ITenantRepository,
  ICrossReportDataProvider,
  IAuthorizationService,
  IAuditService as ICrossReportAuditService,
} from './services/cross-tenant-report.service';

// Interfaces
export {
  WidgetType,
  ReportType,
  ReportFormat,
  DateRange,
  IWidgetConfig,
  IWidgetData,
  IChartSeries,
  ITableRow,
  IReportDefinition,
  IReportParameter,
  IReportColumn,
  IReportResult,
  ICrossReportResult,
  IScheduledReport,
} from './interfaces/reporting.interface';

// DTOs
export {
  WidgetTypeEnum,
  ReportTypeEnum,
  ReportFormatEnum,
  DateRangeEnum,
  WidgetPositionSchema,
  CreateWidgetSchema,
  UpdateWidgetSchema,
  GetWidgetDataSchema,
  GenerateReportSchema,
  CrossTenantReportSchema,
  ScheduleReportSchema,
  CreateWidgetDto,
  UpdateWidgetDto,
  GetWidgetDataDto,
  GenerateReportDto,
  CrossTenantReportDto,
  ScheduleReportDto,
} from './dto/reporting.dto';
