/**
 * Reporting Module - API Module for Epic 27: Reporting Engine
 *
 * Provides REST API endpoints for:
 * - Story 27-1: Dashboard Widgets (KPI cards, charts, tables)
 * - Story 27-2: Detailed Reports (rental, service, sales, inventory)
 * - Story 27-3: Cross-Tenant Reports (holding, franchise)
 */

// Module
export {
  AUDIT_SERVICE,
  AUTHORIZATION_SERVICE,
  CROSS_REPORT_DATA_PROVIDER,
  DATA_SOURCE_PROVIDER,
  REPORT_DATA_PROVIDER,
  REPORT_EXPORTER,
  REPORT_REPOSITORY,
  ReportingModule,
  TENANT_REPOSITORY,
  WIDGET_REPOSITORY,
} from './reporting.module';
export type { ReportingModuleOptions } from './reporting.module';

// Controllers
export { DashboardController } from './controllers/dashboard.controller';
export { ReportsController } from './controllers/reports.controller';

// Repositories
export { InMemoryAuthorizationService } from './repositories/in-memory-authorization.service';
export { InMemoryCrossReportDataProvider } from './repositories/in-memory-cross-report-data.provider';
export { InMemoryDataSourceProvider } from './repositories/in-memory-data-source.provider';
export { InMemoryReportDataProvider } from './repositories/in-memory-report-data.provider';
export { InMemoryReportRepository } from './repositories/in-memory-report.repository';
export { InMemoryTenantRepository } from './repositories/in-memory-tenant.repository';
export { InMemoryWidgetRepository } from './repositories/in-memory-widget.repository';

// Services
export { AuditLoggerService } from './services/audit-logger.service';
export { ReportExporterService } from './services/report-exporter.service';
