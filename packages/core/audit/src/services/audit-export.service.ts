import { Injectable } from '@nestjs/common';
import { AuditService } from './audit.service';
import {
  AuditEntry,
  AuditQueryOptions,
  AuditQueryResult,
  AuditEntityType,
} from '../interfaces/audit.interface';

/**
 * Export format types
 */
export type ExportFormat = 'json' | 'csv';

/**
 * Export result
 */
export interface ExportResult {
  format: ExportFormat;
  data: string;
  filename: string;
  mimeType: string;
}

/**
 * Aggregation grouping options
 */
export type AggregationGroupBy = 'action' | 'entityType' | 'userId' | 'date';

/**
 * Aggregation query options
 */
export interface AggregationOptions {
  tenantId: string;
  groupBy: AggregationGroupBy;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Aggregation result
 */
export interface AggregationResult {
  groupBy: AggregationGroupBy;
  aggregations: Record<string, number>;
  total: number;
}

/**
 * Search options
 */
export interface SearchOptions {
  tenantId: string;
  searchTerm: string;
  entityType?: AuditEntityType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * Daily summary options
 */
export interface DailySummaryOptions {
  tenantId: string;
  date: Date;
}

/**
 * Daily summary result
 */
export interface DailySummary {
  date: string;
  totalActions: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  uniqueUsers: number;
}

/**
 * Entity history options
 */
export interface EntityHistoryOptions {
  tenantId: string;
  entityType: AuditEntityType;
  entityId: string;
}

/**
 * Entity history result
 */
export interface EntityHistoryResult {
  entityType: AuditEntityType;
  entityId: string;
  history: AuditEntry[];
}

/**
 * Audit Export Service - Query and Export functionality
 * FR71: Audit napló lekérdezés és export
 */
@Injectable()
export class AuditExportService {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Export audit entries to JSON format
   */
  async exportToJson(options: AuditQueryOptions): Promise<ExportResult> {
    const result = await this.auditService.query(options);

    const exportData = {
      entries: result.entries,
      total: result.total,
      exportedAt: new Date().toISOString(),
      metadata: {
        tenantId: options.tenantId,
        filters: {
          entityType: options.entityType,
          action: options.action,
          userId: options.userId,
          startDate: options.startDate?.toISOString(),
          endDate: options.endDate?.toISOString(),
        },
      },
    };

    return {
      format: 'json',
      data: JSON.stringify(exportData, null, 2),
      filename: `audit-export-${Date.now()}.json`,
      mimeType: 'application/json',
    };
  }

  /**
   * Export audit entries to CSV format
   */
  async exportToCsv(options: AuditQueryOptions): Promise<ExportResult> {
    const result = await this.auditService.query(options);

    const headers = [
      'id',
      'timestamp',
      'action',
      'entityType',
      'entityId',
      'userId',
      'userName',
      'userEmail',
      'reason',
      'ipAddress',
    ];

    const rows = result.entries.map((entry) =>
      headers.map((header) => {
        const value = entry[header as keyof AuditEntry];
        if (value === undefined || value === null) {
          return '';
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        const stringValue = String(value);
        // Escape commas and quotes in CSV
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
    );

    const csvData = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    return {
      format: 'csv',
      data: csvData,
      filename: `audit-export-${Date.now()}.csv`,
      mimeType: 'text/csv',
    };
  }

  /**
   * Get aggregations grouped by specified field
   */
  async getAggregations(options: AggregationOptions): Promise<AggregationResult> {
    const queryOptions: AuditQueryOptions = {
      tenantId: options.tenantId,
      limit: 10000, // Get all for aggregation
      offset: 0,
    };
    if (options.startDate !== undefined) {
      queryOptions.startDate = options.startDate;
    }
    if (options.endDate !== undefined) {
      queryOptions.endDate = options.endDate;
    }
    const queryResult = await this.auditService.query(queryOptions);

    const aggregations: Record<string, number> = {};

    for (const entry of queryResult.entries) {
      let key: string;

      switch (options.groupBy) {
        case 'action':
          key = entry.action;
          break;
        case 'entityType':
          key = entry.entityType;
          break;
        case 'userId':
          key = entry.userId;
          break;
        case 'date':
          key = entry.timestamp.toISOString().split('T')[0] ?? 'unknown';
          break;
        default:
          key = 'unknown';
      }

      aggregations[key] = (aggregations[key] ?? 0) + 1;
    }

    return {
      groupBy: options.groupBy,
      aggregations,
      total: queryResult.total,
    };
  }

  /**
   * Search audit entries by text
   */
  async search(options: SearchOptions): Promise<AuditQueryResult> {
    const queryOptions: AuditQueryOptions = {
      tenantId: options.tenantId,
      limit: options.limit ?? 100,
      offset: 0,
    };
    if (options.entityType !== undefined) {
      queryOptions.entityType = options.entityType;
    }
    if (options.startDate !== undefined) {
      queryOptions.startDate = options.startDate;
    }
    if (options.endDate !== undefined) {
      queryOptions.endDate = options.endDate;
    }
    const queryResult = await this.auditService.query(queryOptions);

    const searchLower = options.searchTerm.toLowerCase();

    // Filter entries that match the search term in relevant fields
    const filteredEntries = queryResult.entries.filter((entry) => {
      const searchableFields = [
        entry.reason,
        entry.userName,
        entry.userEmail,
        entry.entityId,
        entry.userId,
      ];

      return searchableFields.some(
        (field) => field && field.toLowerCase().includes(searchLower)
      );
    });

    return {
      entries: filteredEntries,
      total: filteredEntries.length,
      limit: options.limit ?? 100,
      offset: 0,
      hasMore: false,
    };
  }

  /**
   * Get daily summary for a specific date
   */
  async getDailySummary(options: DailySummaryOptions): Promise<DailySummary> {
    const startOfDay = new Date(options.date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(options.date);
    endOfDay.setHours(23, 59, 59, 999);

    const queryResult = await this.auditService.query({
      tenantId: options.tenantId,
      startDate: startOfDay,
      endDate: endOfDay,
      limit: 10000,
      offset: 0,
    });

    const byAction: Record<string, number> = {};
    const byEntityType: Record<string, number> = {};
    const uniqueUserIds = new Set<string>();

    for (const entry of queryResult.entries) {
      byAction[entry.action] = (byAction[entry.action] ?? 0) + 1;
      byEntityType[entry.entityType] = (byEntityType[entry.entityType] ?? 0) + 1;
      uniqueUserIds.add(entry.userId);
    }

    const dateStr = options.date.toISOString().split('T')[0];
    if (dateStr === undefined) {
      throw new Error('Invalid date format');
    }

    return {
      date: dateStr,
      totalActions: queryResult.total,
      byAction,
      byEntityType,
      uniqueUsers: uniqueUserIds.size,
    };
  }

  /**
   * Get complete history for a specific entity
   */
  async getEntityHistory(options: EntityHistoryOptions): Promise<EntityHistoryResult> {
    const queryResult = await this.auditService.query({
      tenantId: options.tenantId,
      entityType: options.entityType,
      entityId: options.entityId,
      limit: 1000,
      offset: 0,
      orderBy: 'timestamp',
      orderDirection: 'asc',
    });

    return {
      entityType: options.entityType,
      entityId: options.entityId,
      history: queryResult.entries,
    };
  }
}
