/**
 * Reporting Module - NestJS Module for Reporting Engine
 * Epic 27: Reporting Engine
 *
 * Provides:
 * - Dashboard widgets (KPI cards, charts, tables) - Story 27-1
 * - Detailed reports (rental, service, sales, inventory) - Story 27-2
 * - Cross-tenant reports (holding, franchise) - Story 27-3
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Package imports
import { CrossTenantReportService, DashboardWidgetService, ReportService } from '@kgc/reporting';

// Controllers
import { DashboardController } from './controllers/dashboard.controller';
import { ReportsController } from './controllers/reports.controller';

// Repositories
import { InMemoryAuthorizationService } from './repositories/in-memory-authorization.service';
import { InMemoryCrossReportDataProvider } from './repositories/in-memory-cross-report-data.provider';
import { InMemoryDataSourceProvider } from './repositories/in-memory-data-source.provider';
import { InMemoryReportDataProvider } from './repositories/in-memory-report-data.provider';
import { InMemoryReportRepository } from './repositories/in-memory-report.repository';
import { InMemoryTenantRepository } from './repositories/in-memory-tenant.repository';
import { InMemoryWidgetRepository } from './repositories/in-memory-widget.repository';
import { AuditLoggerService } from './services/audit-logger.service';
import { ReportExporterService } from './services/report-exporter.service';

export const WIDGET_REPOSITORY = Symbol('WIDGET_REPOSITORY');
export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');
export const DATA_SOURCE_PROVIDER = Symbol('DATA_SOURCE_PROVIDER');
export const REPORT_DATA_PROVIDER = Symbol('REPORT_DATA_PROVIDER');
export const CROSS_REPORT_DATA_PROVIDER = Symbol('CROSS_REPORT_DATA_PROVIDER');
export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');
export const AUTHORIZATION_SERVICE = Symbol('AUTHORIZATION_SERVICE');
export const REPORT_EXPORTER = Symbol('REPORT_EXPORTER');
export const AUDIT_SERVICE = Symbol('AUDIT_SERVICE');

export interface ReportingModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class ReportingModule {
  static forRoot(options: ReportingModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Repositories (InMemory for now, will be replaced with Prisma)
      {
        provide: WIDGET_REPOSITORY,
        useClass: InMemoryWidgetRepository,
      },
      {
        provide: REPORT_REPOSITORY,
        useClass: InMemoryReportRepository,
      },
      {
        provide: DATA_SOURCE_PROVIDER,
        useClass: InMemoryDataSourceProvider,
      },
      {
        provide: REPORT_DATA_PROVIDER,
        useClass: InMemoryReportDataProvider,
      },
      {
        provide: CROSS_REPORT_DATA_PROVIDER,
        useClass: InMemoryCrossReportDataProvider,
      },
      {
        provide: TENANT_REPOSITORY,
        useClass: InMemoryTenantRepository,
      },
      {
        provide: AUTHORIZATION_SERVICE,
        useClass: InMemoryAuthorizationService,
      },
      {
        provide: REPORT_EXPORTER,
        useClass: ReportExporterService,
      },
      {
        provide: AUDIT_SERVICE,
        useClass: AuditLoggerService,
      },

      // Services from @kgc/reporting package
      {
        provide: DashboardWidgetService,
        useFactory: (
          widgetRepo: InMemoryWidgetRepository,
          dataSource: InMemoryDataSourceProvider,
          auditService: AuditLoggerService
        ) => new DashboardWidgetService(widgetRepo, dataSource, auditService),
        inject: [WIDGET_REPOSITORY, DATA_SOURCE_PROVIDER, AUDIT_SERVICE],
      },
      {
        provide: ReportService,
        useFactory: (
          reportRepo: InMemoryReportRepository,
          dataProvider: InMemoryReportDataProvider,
          exporter: ReportExporterService,
          auditService: AuditLoggerService
        ) => new ReportService(reportRepo, dataProvider, exporter, auditService),
        inject: [REPORT_REPOSITORY, REPORT_DATA_PROVIDER, REPORT_EXPORTER, AUDIT_SERVICE],
      },
      {
        provide: CrossTenantReportService,
        useFactory: (
          tenantRepo: InMemoryTenantRepository,
          dataProvider: InMemoryCrossReportDataProvider,
          authService: InMemoryAuthorizationService,
          auditService: AuditLoggerService
        ) => new CrossTenantReportService(tenantRepo, dataProvider, authService, auditService),
        inject: [
          TENANT_REPOSITORY,
          CROSS_REPORT_DATA_PROVIDER,
          AUTHORIZATION_SERVICE,
          AUDIT_SERVICE,
        ],
      },

      // Export repository classes for direct injection
      InMemoryWidgetRepository,
      InMemoryReportRepository,
      InMemoryDataSourceProvider,
      InMemoryReportDataProvider,
      InMemoryCrossReportDataProvider,
      InMemoryTenantRepository,
      InMemoryAuthorizationService,
      ReportExporterService,
      AuditLoggerService,
    ];

    return {
      module: ReportingModule,
      controllers: [DashboardController, ReportsController],
      providers,
      exports: [
        DashboardWidgetService,
        ReportService,
        CrossTenantReportService,
        WIDGET_REPOSITORY,
        REPORT_REPOSITORY,
      ],
    };
  }
}
