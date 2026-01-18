/**
 * @kgc/reporting - Reporting Module
 * Epic 27: Reporting Engine
 */

import { Module } from '@nestjs/common';
import { DashboardWidgetService } from './services/dashboard-widget.service';
import { ReportService } from './services/report.service';
import { CrossTenantReportService } from './services/cross-tenant-report.service';

@Module({
  providers: [DashboardWidgetService, ReportService, CrossTenantReportService],
  exports: [DashboardWidgetService, ReportService, CrossTenantReportService],
})
export class ReportingModule {}
