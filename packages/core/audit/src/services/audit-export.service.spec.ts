import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditExportService } from './audit-export.service';
import { AuditService } from './audit.service';
import { AuditEntry, AuditQueryResult } from '../interfaces/audit.interface';

describe('AuditExportService', () => {
  let exportService: AuditExportService;
  let mockAuditService: Partial<AuditService>;

  const mockTenantId = 'tenant-123';

  const createMockEntry = (overrides: Partial<AuditEntry> = {}): AuditEntry => ({
    id: 'audit-001',
    tenantId: mockTenantId,
    userId: 'user-456',
    userEmail: 'test@example.com',
    userName: 'Test User',
    action: 'CREATE',
    entityType: 'RENTAL',
    entityId: 'rental-001',
    timestamp: new Date('2026-01-16T10:00:00Z'),
    createdAt: new Date('2026-01-16T10:00:00Z'),
    ...overrides,
  });

  const createMockQueryResult = (entries: AuditEntry[]): AuditQueryResult => ({
    entries,
    total: entries.length,
    limit: 100,
    offset: 0,
    hasMore: false,
  });

  beforeEach(() => {
    mockAuditService = {
      query: vi.fn(),
      count: vi.fn(),
    };

    exportService = new AuditExportService(mockAuditService as AuditService);
  });

  describe('exportToJson()', () => {
    it('should export audit entries to JSON format', async () => {
      const entries = [createMockEntry(), createMockEntry({ id: 'audit-002' })];
      vi.mocked(mockAuditService.query).mockResolvedValue(createMockQueryResult(entries));

      const result = await exportService.exportToJson({
        tenantId: mockTenantId,
        limit: 100,
        offset: 0,
      });

      expect(result.format).toBe('json');
      expect(result.data).toBeDefined();
      const parsed = JSON.parse(result.data);
      expect(parsed.entries).toHaveLength(2);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.total).toBe(2);
    });

    it('should include metadata in JSON export', async () => {
      const entries = [createMockEntry()];
      vi.mocked(mockAuditService.query).mockResolvedValue(createMockQueryResult(entries));

      const result = await exportService.exportToJson({
        tenantId: mockTenantId,
        limit: 100,
        offset: 0,
      });

      const parsed = JSON.parse(result.data);
      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.tenantId).toBe(mockTenantId);
    });
  });

  describe('exportToCsv()', () => {
    it('should export audit entries to CSV format', async () => {
      const entries = [
        createMockEntry({ id: 'audit-001', action: 'CREATE' }),
        createMockEntry({ id: 'audit-002', action: 'UPDATE' }),
      ];
      vi.mocked(mockAuditService.query).mockResolvedValue(createMockQueryResult(entries));

      const result = await exportService.exportToCsv({
        tenantId: mockTenantId,
        limit: 100,
        offset: 0,
      });

      expect(result.format).toBe('csv');
      expect(result.data).toContain('id,');
      expect(result.data).toContain('audit-001');
      expect(result.data).toContain('audit-002');
    });

    it('should include header row in CSV', async () => {
      const entries = [createMockEntry()];
      vi.mocked(mockAuditService.query).mockResolvedValue(createMockQueryResult(entries));

      const result = await exportService.exportToCsv({
        tenantId: mockTenantId,
        limit: 100,
        offset: 0,
      });

      const lines = result.data.split('\n');
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('action');
      expect(lines[0]).toContain('entityType');
    });

    it('should handle entries with commas in values', async () => {
      const entries = [
        createMockEntry({
          reason: 'Price update, discount applied',
        }),
      ];
      vi.mocked(mockAuditService.query).mockResolvedValue(createMockQueryResult(entries));

      const result = await exportService.exportToCsv({
        tenantId: mockTenantId,
        limit: 100,
        offset: 0,
      });

      // CSV should properly escape commas
      expect(result.data).toContain('"Price update, discount applied"');
    });
  });

  describe('getAggregations()', () => {
    it('should return aggregation by action type', async () => {
      const entries = [
        createMockEntry({ action: 'CREATE' }),
        createMockEntry({ action: 'CREATE' }),
        createMockEntry({ action: 'UPDATE' }),
        createMockEntry({ action: 'DELETE' }),
      ];
      vi.mocked(mockAuditService.query).mockResolvedValue(createMockQueryResult(entries));

      const result = await exportService.getAggregations({
        tenantId: mockTenantId,
        groupBy: 'action',
      });

      expect(result.groupBy).toBe('action');
      expect(result.aggregations).toBeDefined();
      expect(result.aggregations.CREATE).toBe(2);
      expect(result.aggregations.UPDATE).toBe(1);
      expect(result.aggregations.DELETE).toBe(1);
    });

    it('should return aggregation by entity type', async () => {
      const entries = [
        createMockEntry({ entityType: 'RENTAL' }),
        createMockEntry({ entityType: 'RENTAL' }),
        createMockEntry({ entityType: 'INVOICE' }),
      ];
      vi.mocked(mockAuditService.query).mockResolvedValue(createMockQueryResult(entries));

      const result = await exportService.getAggregations({
        tenantId: mockTenantId,
        groupBy: 'entityType',
      });

      expect(result.aggregations.RENTAL).toBe(2);
      expect(result.aggregations.INVOICE).toBe(1);
    });

    it('should return aggregation by user', async () => {
      const entries = [
        createMockEntry({ userId: 'user-1' }),
        createMockEntry({ userId: 'user-1' }),
        createMockEntry({ userId: 'user-2' }),
      ];
      vi.mocked(mockAuditService.query).mockResolvedValue(createMockQueryResult(entries));

      const result = await exportService.getAggregations({
        tenantId: mockTenantId,
        groupBy: 'userId',
      });

      expect(result.aggregations['user-1']).toBe(2);
      expect(result.aggregations['user-2']).toBe(1);
    });

    it('should return daily aggregation', async () => {
      const entries = [
        createMockEntry({ timestamp: new Date('2026-01-15T10:00:00Z') }),
        createMockEntry({ timestamp: new Date('2026-01-15T14:00:00Z') }),
        createMockEntry({ timestamp: new Date('2026-01-16T10:00:00Z') }),
      ];
      vi.mocked(mockAuditService.query).mockResolvedValue(createMockQueryResult(entries));

      const result = await exportService.getAggregations({
        tenantId: mockTenantId,
        groupBy: 'date',
      });

      expect(result.aggregations['2026-01-15']).toBe(2);
      expect(result.aggregations['2026-01-16']).toBe(1);
    });
  });

  describe('search()', () => {
    it('should search in audit entries', async () => {
      const entries = [
        createMockEntry({ reason: 'Price adjustment for VIP customer' }),
        createMockEntry({ reason: 'Regular transaction' }),
      ];
      vi.mocked(mockAuditService.query).mockResolvedValue(createMockQueryResult(entries));

      const result = await exportService.search({
        tenantId: mockTenantId,
        searchTerm: 'VIP',
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]?.reason).toContain('VIP');
    });

    it('should search case-insensitively', async () => {
      const entries = [
        createMockEntry({ reason: 'VIP customer discount' }),
      ];
      vi.mocked(mockAuditService.query).mockResolvedValue(createMockQueryResult(entries));

      const result = await exportService.search({
        tenantId: mockTenantId,
        searchTerm: 'vip',
      });

      expect(result.entries).toHaveLength(1);
    });

    it('should search in multiple fields', async () => {
      const entries = [
        createMockEntry({ userName: 'Admin User', reason: 'Regular' }),
        createMockEntry({ userName: 'Regular User', reason: 'Admin action' }),
      ];
      vi.mocked(mockAuditService.query).mockResolvedValue(createMockQueryResult(entries));

      const result = await exportService.search({
        tenantId: mockTenantId,
        searchTerm: 'Admin',
      });

      expect(result.entries).toHaveLength(2);
    });
  });

  describe('getDailySummary()', () => {
    it('should return daily summary for a date range', async () => {
      const entries = [
        createMockEntry({ action: 'CREATE', timestamp: new Date('2026-01-15T10:00:00Z') }),
        createMockEntry({ action: 'UPDATE', timestamp: new Date('2026-01-15T14:00:00Z') }),
      ];
      vi.mocked(mockAuditService.query).mockResolvedValue(createMockQueryResult(entries));

      const result = await exportService.getDailySummary({
        tenantId: mockTenantId,
        date: new Date('2026-01-15'),
      });

      expect(result.date).toBe('2026-01-15');
      expect(result.totalActions).toBe(2);
      expect(result.byAction.CREATE).toBe(1);
      expect(result.byAction.UPDATE).toBe(1);
    });
  });

  describe('getEntityHistory()', () => {
    it('should return complete history for an entity', async () => {
      const entries = [
        createMockEntry({ action: 'CREATE', timestamp: new Date('2026-01-14T10:00:00Z') }),
        createMockEntry({ action: 'UPDATE', timestamp: new Date('2026-01-15T10:00:00Z') }),
        createMockEntry({ action: 'UPDATE', timestamp: new Date('2026-01-16T10:00:00Z') }),
      ];
      vi.mocked(mockAuditService.query).mockResolvedValue(createMockQueryResult(entries));

      const result = await exportService.getEntityHistory({
        tenantId: mockTenantId,
        entityType: 'RENTAL',
        entityId: 'rental-001',
      });

      expect(result.entityType).toBe('RENTAL');
      expect(result.entityId).toBe('rental-001');
      expect(result.history).toHaveLength(3);
    });
  });
});
