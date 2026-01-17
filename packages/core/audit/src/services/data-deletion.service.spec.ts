import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataDeletionService, DELETION_REQUEST_REPOSITORY } from './data-deletion.service';
import {
  IDeletionRequestRepository,
  DeletionRequest,
  CreateDeletionRequestInput,
  EntityDeletionConfig,
} from '../interfaces/data-deletion.interface';
import { AuditService } from './audit.service';

describe('DataDeletionService', () => {
  let deletionService: DataDeletionService;
  let mockRepository: IDeletionRequestRepository;
  let mockAuditService: Partial<AuditService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const createMockRequest = (overrides: Partial<DeletionRequest> = {}): DeletionRequest => ({
    id: 'deletion-001',
    tenantId: mockTenantId,
    requesterId: mockUserId,
    subjectId: 'subject-789',
    entityType: 'PARTNER',
    entityId: 'partner-001',
    reason: 'GDPR deletion request',
    strategy: 'CASCADE',
    status: 'PENDING',
    createdAt: new Date('2026-01-16T10:00:00Z'),
    deletionLog: [],
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      updateStatus: vi.fn(),
      query: vi.fn(),
    };

    mockAuditService = {
      log: vi.fn(),
    };

    deletionService = new DataDeletionService(
      mockRepository,
      mockAuditService as AuditService
    );
  });

  describe('registerEntity()', () => {
    it('should register entity deletion configuration', () => {
      const config: EntityDeletionConfig = {
        entityType: 'PARTNER',
        strategy: 'CASCADE',
        dependentEntities: [
          { entityType: 'RENTAL', foreignKey: 'partnerId', strategy: 'ANONYMIZE' },
        ],
      };

      deletionService.registerEntity(config);

      const registered = deletionService.getEntityConfig('PARTNER');
      expect(registered).toBeDefined();
      expect(registered?.strategy).toBe('CASCADE');
    });

    it('should overwrite existing configuration', () => {
      deletionService.registerEntity({
        entityType: 'PARTNER',
        strategy: 'CASCADE',
      });

      deletionService.registerEntity({
        entityType: 'PARTNER',
        strategy: 'ANONYMIZE',
      });

      const config = deletionService.getEntityConfig('PARTNER');
      expect(config?.strategy).toBe('ANONYMIZE');
    });
  });

  describe('createRequest()', () => {
    it('should create a deletion request', async () => {
      const input: CreateDeletionRequestInput = {
        tenantId: mockTenantId,
        requesterId: mockUserId,
        subjectId: 'subject-789',
        entityType: 'PARTNER',
        entityId: 'partner-001',
        reason: 'GDPR deletion request',
      };

      // Register entity config
      deletionService.registerEntity({
        entityType: 'PARTNER',
        strategy: 'CASCADE',
      });

      const expectedRequest = createMockRequest();
      vi.mocked(mockRepository.create).mockResolvedValue(expectedRequest);

      const result = await deletionService.createRequest(input);

      expect(result).toEqual(expectedRequest);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          requesterId: mockUserId,
          entityType: 'PARTNER',
          strategy: 'CASCADE',
        })
      );
    });

    it('should use custom strategy when provided', async () => {
      const input: CreateDeletionRequestInput = {
        tenantId: mockTenantId,
        requesterId: mockUserId,
        subjectId: 'subject-789',
        entityType: 'PARTNER',
        entityId: 'partner-001',
        reason: 'Keep financial records',
        strategy: 'ANONYMIZE',
      };

      deletionService.registerEntity({
        entityType: 'PARTNER',
        strategy: 'CASCADE',
      });

      const expectedRequest = createMockRequest({ strategy: 'ANONYMIZE' });
      vi.mocked(mockRepository.create).mockResolvedValue(expectedRequest);

      const result = await deletionService.createRequest(input);

      expect(result.strategy).toBe('ANONYMIZE');
    });

    it('should throw error for unregistered entity type', async () => {
      const input: CreateDeletionRequestInput = {
        tenantId: mockTenantId,
        requesterId: mockUserId,
        subjectId: 'subject-789',
        entityType: 'USER',
        entityId: 'user-001',
        reason: 'Test',
      };

      await expect(deletionService.createRequest(input)).rejects.toThrow(
        'No deletion configuration registered for entity type: USER'
      );
    });

    it('should log audit entry for deletion request creation', async () => {
      deletionService.registerEntity({
        entityType: 'PARTNER',
        strategy: 'CASCADE',
      });

      const expectedRequest = createMockRequest();
      vi.mocked(mockRepository.create).mockResolvedValue(expectedRequest);

      await deletionService.createRequest({
        tenantId: mockTenantId,
        requesterId: mockUserId,
        subjectId: 'subject-789',
        entityType: 'PARTNER',
        entityId: 'partner-001',
        reason: 'GDPR request',
      });

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          entityType: 'PARTNER',
        })
      );
    });
  });

  describe('getRequest()', () => {
    it('should return deletion request by ID', async () => {
      const request = createMockRequest();
      vi.mocked(mockRepository.findById).mockResolvedValue(request);

      const result = await deletionService.getRequest('deletion-001', mockTenantId);

      expect(result).toEqual(request);
      expect(mockRepository.findById).toHaveBeenCalledWith('deletion-001', mockTenantId);
    });

    it('should return null when request not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const result = await deletionService.getRequest('non-existent', mockTenantId);

      expect(result).toBeNull();
    });
  });

  describe('queryRequests()', () => {
    it('should query deletion requests with filters', async () => {
      const requests = [createMockRequest()];
      vi.mocked(mockRepository.query).mockResolvedValue(requests);

      const result = await deletionService.queryRequests({
        tenantId: mockTenantId,
        status: 'PENDING',
      });

      expect(result).toEqual(requests);
      expect(mockRepository.query).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        status: 'PENDING',
      });
    });
  });

  describe('cancelRequest()', () => {
    it('should cancel a pending deletion request', async () => {
      const request = createMockRequest({ status: 'PENDING' });
      vi.mocked(mockRepository.findById).mockResolvedValue(request);
      vi.mocked(mockRepository.updateStatus).mockResolvedValue(undefined);

      await deletionService.cancelRequest('deletion-001', mockTenantId, 'User cancelled');

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        'deletion-001',
        mockTenantId,
        'FAILED',
        expect.anything(),
        'Cancelled: User cancelled'
      );
    });

    it('should throw error when cancelling non-pending request', async () => {
      const request = createMockRequest({ status: 'PROCESSING' });
      vi.mocked(mockRepository.findById).mockResolvedValue(request);

      await expect(
        deletionService.cancelRequest('deletion-001', mockTenantId, 'Cancel')
      ).rejects.toThrow('Cannot cancel request in status: PROCESSING');
    });

    it('should throw error when request not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(
        deletionService.cancelRequest('non-existent', mockTenantId, 'Cancel')
      ).rejects.toThrow('Deletion request not found');
    });
  });

  describe('getDependentEntities()', () => {
    it('should return dependent entities based on config', async () => {
      deletionService.registerEntity({
        entityType: 'PARTNER',
        strategy: 'CASCADE',
        dependentEntities: [
          { entityType: 'RENTAL', foreignKey: 'partnerId', strategy: 'ANONYMIZE' },
          { entityType: 'INVOICE', foreignKey: 'partnerId', strategy: 'RETAIN' },
        ],
      });

      const result = await deletionService.getDependentEntities(
        'PARTNER',
        'partner-001',
        mockTenantId
      );

      // Returns the configured dependent entity types
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(
        expect.objectContaining({ entityType: 'RENTAL' })
      );
      expect(result).toContainEqual(
        expect.objectContaining({ entityType: 'INVOICE' })
      );
    });

    it('should return empty array for entity without dependencies', async () => {
      deletionService.registerEntity({
        entityType: 'CONFIG',
        strategy: 'CASCADE',
      });

      const result = await deletionService.getDependentEntities(
        'CONFIG',
        'config-001',
        mockTenantId
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('processRequest()', () => {
    it('should process a pending deletion request', async () => {
      const request = createMockRequest({ status: 'PENDING' });
      vi.mocked(mockRepository.findById).mockResolvedValue(request);
      vi.mocked(mockRepository.updateStatus).mockResolvedValue(undefined);

      deletionService.registerEntity({
        entityType: 'PARTNER',
        strategy: 'CASCADE',
      });

      const result = await deletionService.processRequest('deletion-001', mockTenantId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('COMPLETED');
      expect(mockRepository.updateStatus).toHaveBeenCalled();
    });

    it('should throw error when request not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(
        deletionService.processRequest('non-existent', mockTenantId)
      ).rejects.toThrow('Deletion request not found');
    });

    it('should throw error for already processed request', async () => {
      const request = createMockRequest({ status: 'COMPLETED' });
      vi.mocked(mockRepository.findById).mockResolvedValue(request);

      await expect(
        deletionService.processRequest('deletion-001', mockTenantId)
      ).rejects.toThrow('Request already processed');
    });
  });

  describe('anonymizeEntity()', () => {
    it('should anonymize specific entity fields', async () => {
      deletionService.registerEntity({
        entityType: 'PARTNER',
        strategy: 'ANONYMIZE',
        anonymizeFields: ['email', 'phone', 'address'],
      });

      const result = await deletionService.anonymizeEntity(
        'PARTNER',
        'partner-001',
        mockTenantId
      );

      expect(result.action).toBe('ANONYMIZED');
      expect(result.entityType).toBe('PARTNER');
      expect(result.entityId).toBe('partner-001');
    });

    it('should allow custom fields override', async () => {
      deletionService.registerEntity({
        entityType: 'PARTNER',
        strategy: 'ANONYMIZE',
        anonymizeFields: ['email', 'phone'],
      });

      const result = await deletionService.anonymizeEntity(
        'PARTNER',
        'partner-001',
        mockTenantId,
        ['email', 'phone', 'taxId'] // Custom fields
      );

      expect(result.action).toBe('ANONYMIZED');
    });
  });

  describe('retention period handling', () => {
    it('should respect retention period in configuration', async () => {
      deletionService.registerEntity({
        entityType: 'INVOICE',
        strategy: 'RETAIN',
        retentionDays: 365 * 7, // 7 years for financial records
      });

      const config = deletionService.getEntityConfig('INVOICE');

      expect(config?.retentionDays).toBe(365 * 7);
      expect(config?.strategy).toBe('RETAIN');
    });
  });
});
