/**
 * In-Memory Report Repository
 * Epic 27: Story 27-2 - Részletes Riportok
 */

import { IReportDefinition, IReportRepository, ReportType } from '@kgc/reporting';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryReportRepository implements IReportRepository {
  private reports: Map<string, IReportDefinition> = new Map();

  async findById(id: string): Promise<IReportDefinition | null> {
    return this.reports.get(id) ?? null;
  }

  async findByType(type: ReportType): Promise<IReportDefinition | null> {
    return Array.from(this.reports.values()).find(r => r.type === type) ?? null;
  }

  async findByTenantId(tenantId: string): Promise<IReportDefinition[]> {
    return Array.from(this.reports.values()).filter(r => r.tenantId === tenantId && !r.isSystem);
  }

  async findSystemReports(): Promise<IReportDefinition[]> {
    return Array.from(this.reports.values()).filter(r => r.isSystem);
  }

  // Test helper
  clear(): void {
    this.reports.clear();
  }
}
