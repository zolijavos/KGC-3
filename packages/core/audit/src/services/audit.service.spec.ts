import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuditEntry,
  AuditQueryOptions,
  AuditQueryResult,
  CreateAuditEntryInput,
  IAuditRepository,
} from '../interfaces/audit.interface';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let auditService: AuditService;
  let mockRepository: IAuditRepository;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const createMockEntry = (overrides: Partial<AuditEntry> = {}): AuditEntry => ({
    id: 'audit-001',
    tenantId: mockTenantId,
    userId: mockUserId,
    userEmail: 'test@example.com',
    userName: 'Test User',
    action: 'CREATE',
    entityType: 'RENTAL',
    entityId: 'rental-001',
    timestamp: new Date('2026-01-16T10:00:00Z'),
    createdAt: new Date('2026-01-16T10:00:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      createMany: vi.fn(),
      findById: vi.fn(),
      query: vi.fn(),
      findByEntity: vi.fn(),
      count: vi.fn(),
      deleteOlderThan: vi.fn(),
      archive: vi.fn(),
    };

    auditService = new AuditService(mockRepository);
  });

  describe('log()', () => {
    it('should create an audit entry', async () => {
      const input: CreateAuditEntryInput = {
        tenantId: mockTenantId,
        userId: mockUserId,
        action: 'CREATE',
        entityType: 'RENTAL',
        entityId: 'rental-001',
      };
      const expectedEntry = createMockEntry();

      vi.mocked(mockRepository.create).mockResolvedValue(expectedEntry);

      const result = await auditService.log(input);

      expect(result).toEqual(expectedEntry);
      expect(mockRepository.create).toHaveBeenCalledWith(input);
    });

    it('should include optional fields when provided', async () => {
      const input: CreateAuditEntryInput = {
        tenantId: mockTenantId,
        userId: mockUserId,
        action: 'UPDATE',
        entityType: 'RENTAL',
        entityId: 'rental-001',
        reason: 'Price adjustment',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        changes: {
          before: { price: 100 },
          after: { price: 120 },
          fields: ['price'],
        },
      };
      const expectedEntry = createMockEntry({
        action: 'UPDATE',
        reason: 'Price adjustment',
        ipAddress: '192.168.1.1',
        changes: input.changes,
      });

      vi.mocked(mockRepository.create).mockResolvedValue(expectedEntry);

      const result = await auditService.log(input);

      expect(result.reason).toBe('Price adjustment');
      expect(result.changes?.before).toEqual({ price: 100 });
      expect(result.changes?.after).toEqual({ price: 120 });
    });

    it('should handle metadata in audit entry', async () => {
      const input: CreateAuditEntryInput = {
        tenantId: mockTenantId,
        userId: mockUserId,
        action: 'OVERRIDE',
        entityType: 'RENTAL',
        entityId: 'rental-001',
        metadata: {
          originalPrice: 100,
          overrideApprovedBy: 'manager-001',
        },
      };
      const expectedEntry = createMockEntry({
        action: 'OVERRIDE',
        metadata: input.metadata,
      });

      vi.mocked(mockRepository.create).mockResolvedValue(expectedEntry);

      const result = await auditService.log(input);

      expect(result.metadata).toEqual({
        originalPrice: 100,
        overrideApprovedBy: 'manager-001',
      });
    });
  });

  describe('logBatch()', () => {
    it('should create multiple audit entries', async () => {
      const inputs: CreateAuditEntryInput[] = [
        {
          tenantId: mockTenantId,
          userId: mockUserId,
          action: 'CREATE',
          entityType: 'RENTAL',
          entityId: 'rental-001',
        },
        {
          tenantId: mockTenantId,
          userId: mockUserId,
          action: 'CREATE',
          entityType: 'PAYMENT',
          entityId: 'payment-001',
        },
      ];
      const expectedEntries = [
        createMockEntry({ id: 'audit-001' }),
        createMockEntry({ id: 'audit-002', entityType: 'PAYMENT', entityId: 'payment-001' }),
      ];

      vi.mocked(mockRepository.createMany).mockResolvedValue(expectedEntries);

      const result = await auditService.logBatch(inputs);

      expect(result).toHaveLength(2);
      expect(mockRepository.createMany).toHaveBeenCalledWith(inputs);
    });

    it('should handle empty batch', async () => {
      vi.mocked(mockRepository.createMany).mockResolvedValue([]);

      const result = await auditService.logBatch([]);

      expect(result).toHaveLength(0);
    });
  });

  describe('findById()', () => {
    it('should find audit entry by ID', async () => {
      const entry = createMockEntry();
      vi.mocked(mockRepository.findById).mockResolvedValue(entry);

      const result = await auditService.findById('audit-001', mockTenantId);

      expect(result).toEqual(entry);
      expect(mockRepository.findById).toHaveBeenCalledWith('audit-001', mockTenantId);
    });

    it('should return null when entry not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const result = await auditService.findById('non-existent', mockTenantId);

      expect(result).toBeNull();
    });
  });

  describe('query()', () => {
    it('should query audit entries with pagination', async () => {
      const options: AuditQueryOptions = {
        tenantId: mockTenantId,
        limit: 10,
        offset: 0,
      };
      const queryResult: AuditQueryResult = {
        entries: [createMockEntry()],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      vi.mocked(mockRepository.query).mockResolvedValue(queryResult);

      const result = await auditService.query(options);

      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by entity type', async () => {
      const options: AuditQueryOptions = {
        tenantId: mockTenantId,
        entityType: 'RENTAL',
        limit: 10,
        offset: 0,
      };
      const queryResult: AuditQueryResult = {
        entries: [createMockEntry()],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      vi.mocked(mockRepository.query).mockResolvedValue(queryResult);

      await auditService.query(options);

      expect(mockRepository.query).toHaveBeenCalledWith(options);
    });

    it('should filter by date range', async () => {
      const options: AuditQueryOptions = {
        tenantId: mockTenantId,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
        limit: 10,
        offset: 0,
      };
      const queryResult: AuditQueryResult = {
        entries: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      vi.mocked(mockRepository.query).mockResolvedValue(queryResult);

      await auditService.query(options);

      expect(mockRepository.query).toHaveBeenCalledWith(options);
    });

    it('should filter by user ID', async () => {
      const options: AuditQueryOptions = {
        tenantId: mockTenantId,
        userId: mockUserId,
        limit: 10,
        offset: 0,
      };
      const queryResult: AuditQueryResult = {
        entries: [createMockEntry()],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      vi.mocked(mockRepository.query).mockResolvedValue(queryResult);

      await auditService.query(options);

      expect(mockRepository.query).toHaveBeenCalledWith(options);
    });

    it('should filter by action type', async () => {
      const options: AuditQueryOptions = {
        tenantId: mockTenantId,
        action: 'DELETE',
        limit: 10,
        offset: 0,
      };
      const queryResult: AuditQueryResult = {
        entries: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      vi.mocked(mockRepository.query).mockResolvedValue(queryResult);

      await auditService.query(options);

      expect(mockRepository.query).toHaveBeenCalledWith(options);
    });
  });

  describe('getEntityHistory()', () => {
    it('should get all audit entries for an entity', async () => {
      const entries = [
        createMockEntry({ id: 'audit-001', action: 'CREATE' }),
        createMockEntry({ id: 'audit-002', action: 'UPDATE' }),
      ];

      vi.mocked(mockRepository.findByEntity).mockResolvedValue(entries);

      const result = await auditService.getEntityHistory('RENTAL', 'rental-001', mockTenantId);

      expect(result).toHaveLength(2);
      expect(mockRepository.findByEntity).toHaveBeenCalledWith(
        'RENTAL',
        'rental-001',
        mockTenantId
      );
    });

    it('should return empty array when no history exists', async () => {
      vi.mocked(mockRepository.findByEntity).mockResolvedValue([]);

      const result = await auditService.getEntityHistory('RENTAL', 'non-existent', mockTenantId);

      expect(result).toHaveLength(0);
    });
  });

  describe('count()', () => {
    it('should count audit entries', async () => {
      vi.mocked(mockRepository.count).mockResolvedValue(42);

      const result = await auditService.count({ tenantId: mockTenantId });

      expect(result).toBe(42);
    });

    it('should count with filters', async () => {
      vi.mocked(mockRepository.count).mockResolvedValue(10);

      const result = await auditService.count({
        tenantId: mockTenantId,
        entityType: 'RENTAL',
        action: 'CREATE',
      });

      expect(result).toBe(10);
      expect(mockRepository.count).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        entityType: 'RENTAL',
        action: 'CREATE',
      });
    });
  });

  describe('logRead()', () => {
    it('should create audit entry for READ action (GDPR Article 15)', async () => {
      const expectedEntry = createMockEntry({ action: 'READ' });
      vi.mocked(mockRepository.create).mockResolvedValue(expectedEntry);

      const result = await auditService.logRead({
        tenantId: mockTenantId,
        userId: mockUserId,
        entityType: 'PARTNER',
        entityId: 'partner-001',
        accessedFields: ['email', 'phone', 'address'],
        reason: 'Customer service inquiry',
      });

      expect(result.action).toBe('READ');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'READ',
          entityType: 'PARTNER',
          reason: 'Customer service inquiry',
          metadata: expect.objectContaining({
            accessedFields: ['email', 'phone', 'address'],
          }),
        })
      );
    });

    it('should log PII data access for GDPR compliance', async () => {
      const expectedEntry = createMockEntry({ action: 'READ' });
      vi.mocked(mockRepository.create).mockResolvedValue(expectedEntry);

      await auditService.logRead({
        tenantId: mockTenantId,
        userId: mockUserId,
        entityType: 'USER',
        entityId: 'user-001',
        accessedFields: ['taxId', 'bankAccount'],
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'READ',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
        })
      );
    });
  });

  describe('logCreate()', () => {
    it('should create audit entry for CREATE action', async () => {
      const expectedEntry = createMockEntry({ action: 'CREATE' });
      vi.mocked(mockRepository.create).mockResolvedValue(expectedEntry);

      const result = await auditService.logCreate({
        tenantId: mockTenantId,
        userId: mockUserId,
        entityType: 'RENTAL',
        entityId: 'rental-001',
        after: { price: 100, status: 'active' },
      });

      expect(result.action).toBe('CREATE');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          changes: { after: { price: 100, status: 'active' } },
        })
      );
    });
  });

  describe('logUpdate()', () => {
    it('should create audit entry for UPDATE action with before/after', async () => {
      const expectedEntry = createMockEntry({
        action: 'UPDATE',
        changes: {
          before: { price: 100 },
          after: { price: 120 },
          fields: ['price'],
        },
      });
      vi.mocked(mockRepository.create).mockResolvedValue(expectedEntry);

      const result = await auditService.logUpdate({
        tenantId: mockTenantId,
        userId: mockUserId,
        entityType: 'RENTAL',
        entityId: 'rental-001',
        before: { price: 100 },
        after: { price: 120 },
        reason: 'Price increase',
      });

      expect(result.action).toBe('UPDATE');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          reason: 'Price increase',
          changes: expect.objectContaining({
            before: { price: 100 },
            after: { price: 120 },
          }),
        })
      );
    });

    it('should compute changed fields automatically', async () => {
      const expectedEntry = createMockEntry({ action: 'UPDATE' });
      vi.mocked(mockRepository.create).mockResolvedValue(expectedEntry);

      await auditService.logUpdate({
        tenantId: mockTenantId,
        userId: mockUserId,
        entityType: 'RENTAL',
        entityId: 'rental-001',
        before: { price: 100, status: 'active', name: 'Test' },
        after: { price: 120, status: 'active', name: 'Updated' },
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: expect.objectContaining({
            fields: expect.arrayContaining(['price', 'name']),
          }),
        })
      );
    });
  });

  describe('logDelete()', () => {
    it('should create audit entry for DELETE action', async () => {
      const expectedEntry = createMockEntry({ action: 'DELETE' });
      vi.mocked(mockRepository.create).mockResolvedValue(expectedEntry);

      const result = await auditService.logDelete({
        tenantId: mockTenantId,
        userId: mockUserId,
        entityType: 'RENTAL',
        entityId: 'rental-001',
        before: { price: 100, status: 'active' },
        reason: 'User requested deletion',
      });

      expect(result.action).toBe('DELETE');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          reason: 'User requested deletion',
          changes: { before: { price: 100, status: 'active' } },
        })
      );
    });
  });

  describe('logOverride()', () => {
    it('should create audit entry for OVERRIDE action (FR70)', async () => {
      const expectedEntry = createMockEntry({ action: 'OVERRIDE' });
      vi.mocked(mockRepository.create).mockResolvedValue(expectedEntry);

      const result = await auditService.logOverride({
        tenantId: mockTenantId,
        userId: mockUserId,
        entityType: 'RENTAL',
        entityId: 'rental-001',
        before: { dailyRate: 100 },
        after: { dailyRate: 80 },
        reason: 'Manager discount approval',
        metadata: { approvedBy: 'manager-001' },
      });

      expect(result.action).toBe('OVERRIDE');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'OVERRIDE',
          reason: 'Manager discount approval',
          metadata: { approvedBy: 'manager-001' },
        })
      );
    });

    it('should require reason for OVERRIDE action', async () => {
      await expect(
        auditService.logOverride({
          tenantId: mockTenantId,
          userId: mockUserId,
          entityType: 'RENTAL',
          entityId: 'rental-001',
          before: { dailyRate: 100 },
          after: { dailyRate: 80 },
          reason: '', // Empty reason
        })
      ).rejects.toThrow('Reason is required for OVERRIDE action');
    });
  });

  describe('getUserActivity()', () => {
    it('should get user activity within date range', async () => {
      const queryResult: AuditQueryResult = {
        entries: [createMockEntry()],
        total: 1,
        limit: 100,
        offset: 0,
        hasMore: false,
      };
      vi.mocked(mockRepository.query).mockResolvedValue(queryResult);

      const result = await auditService.getUserActivity(
        mockUserId,
        mockTenantId,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          userId: mockUserId,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-31'),
        })
      );
      expect(result.entries).toHaveLength(1);
    });
  });
});
