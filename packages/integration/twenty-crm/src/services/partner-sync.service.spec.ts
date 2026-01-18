import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PartnerSyncService,
  IPartnerMappingRepository,
  IKgcPartnerService,
  ITwentyCrmClient,
  IAuditService,
} from './partner-sync.service';
import { IPartnerMapping, SyncStatus, SyncDirection, EntityType } from '../interfaces/twenty-crm.interface';

const mockMappingRepository: IPartnerMappingRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByKgcPartnerId: vi.fn(),
  findByCrmPartnerId: vi.fn(),
  findByTenantId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockKgcPartnerService: IKgcPartnerService = {
  findById: vi.fn(),
  findByTenantId: vi.fn(),
  findModifiedSince: vi.fn(),
  updateFromCrm: vi.fn(),
};

const mockCrmClient: ITwentyCrmClient = {
  createPartner: vi.fn(),
  updatePartner: vi.fn(),
  getPartner: vi.fn(),
  getPartners: vi.fn(),
  deletePartner: vi.fn(),
  createContact: vi.fn(),
  getContactsByPartner: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('PartnerSyncService', () => {
  let service: PartnerSyncService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';
  const mockKgcPartnerId = '00000000-0000-0000-0000-000000000001';
  const mockCrmPartnerId = 'crm-partner-1';
  const mockMappingId = '00000000-0000-0000-0000-000000000002';

  const mockMapping: IPartnerMapping = {
    id: mockMappingId,
    tenantId: mockTenantId,
    kgcPartnerId: mockKgcPartnerId,
    crmPartnerId: mockCrmPartnerId,
    syncStatus: SyncStatus.COMPLETED,
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockKgcPartner = {
    id: mockKgcPartnerId,
    type: 'COMPANY' as const,
    name: 'Test Partner Kft.',
    email: 'test@partner.hu',
    phone: '+36301234567',
    taxNumber: '12345678-2-42',
    updatedAt: new Date(),
  };

  const mockCrmPartner = {
    id: mockCrmPartnerId,
    type: 'COMPANY' as const,
    name: 'Test Partner Kft.',
    email: 'test@partner.hu',
    phone: '+36301234567',
    taxNumber: '12345678-2-42',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PartnerSyncService(
      mockMappingRepository,
      mockKgcPartnerService,
      mockCrmClient,
      mockAuditService,
    );
  });

  describe('syncPartners', () => {
    it('should sync partners from KGC to CRM', async () => {
      (mockKgcPartnerService.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([mockKgcPartner]);
      (mockMappingRepository.findByKgcPartnerId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockKgcPartnerService.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcPartner);
      (mockCrmClient.createPartner as ReturnType<typeof vi.fn>).mockResolvedValue(mockCrmPartner);
      (mockMappingRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);
      (mockCrmClient.getContactsByPartner as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.syncPartners(
        { direction: 'KGC_TO_CRM', includeContacts: false },
        mockTenantId,
        mockUserId,
      );

      expect(result.direction).toBe(SyncDirection.KGC_TO_CRM);
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(mockCrmClient.createPartner).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'partner_sync_completed' }),
      );
    });

    it('should update existing CRM partner when mapping exists', async () => {
      (mockKgcPartnerService.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([mockKgcPartner]);
      (mockMappingRepository.findByKgcPartnerId as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);
      (mockKgcPartnerService.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcPartner);
      (mockCrmClient.updatePartner as ReturnType<typeof vi.fn>).mockResolvedValue(mockCrmPartner);
      (mockMappingRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      const result = await service.syncPartners(
        { direction: 'KGC_TO_CRM', includeContacts: false },
        mockTenantId,
        mockUserId,
      );

      expect(result.successCount).toBe(1);
      expect(mockCrmClient.updatePartner).toHaveBeenCalled();
      expect(mockCrmClient.createPartner).not.toHaveBeenCalled();
    });

    it('should sync specific partners when IDs provided', async () => {
      const partnerId2 = '00000000-0000-0000-0000-000000000003';
      (mockMappingRepository.findByKgcPartnerId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockKgcPartnerService.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcPartner);
      (mockCrmClient.createPartner as ReturnType<typeof vi.fn>).mockResolvedValue(mockCrmPartner);
      (mockMappingRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      const result = await service.syncPartners(
        {
          direction: 'KGC_TO_CRM',
          partnerIds: [mockKgcPartnerId, partnerId2],
          includeContacts: false,
        },
        mockTenantId,
        mockUserId,
      );

      expect(result.totalCount).toBe(2);
    });

    it('should handle sync errors gracefully', async () => {
      (mockKgcPartnerService.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([mockKgcPartner]);
      (mockMappingRepository.findByKgcPartnerId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockKgcPartnerService.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.syncPartners(
        { direction: 'KGC_TO_CRM', includeContacts: false },
        mockTenantId,
        mockUserId,
      );

      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.entityType).toBe(EntityType.PARTNER);
    });
  });

  describe('createMapping', () => {
    it('should create partner mapping', async () => {
      (mockMappingRepository.findByKgcPartnerId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockKgcPartnerService.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockKgcPartner);
      (mockCrmClient.getPartner as ReturnType<typeof vi.fn>).mockResolvedValue(mockCrmPartner);
      (mockMappingRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      const result = await service.createMapping(
        { kgcPartnerId: mockKgcPartnerId, crmPartnerId: mockCrmPartnerId },
        mockTenantId,
        mockUserId,
      );

      expect(result.kgcPartnerId).toBe(mockKgcPartnerId);
      expect(result.crmPartnerId).toBe(mockCrmPartnerId);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'partner_mapping_created' }),
      );
    });

    it('should throw error if mapping already exists', async () => {
      (mockMappingRepository.findByKgcPartnerId as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      await expect(
        service.createMapping(
          { kgcPartnerId: mockKgcPartnerId, crmPartnerId: mockCrmPartnerId },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('Partner mapping already exists');
    });

    it('should throw error if KGC partner not found', async () => {
      (mockMappingRepository.findByKgcPartnerId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockKgcPartnerService.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.createMapping(
          { kgcPartnerId: mockKgcPartnerId, crmPartnerId: mockCrmPartnerId },
          mockTenantId,
          mockUserId,
        ),
      ).rejects.toThrow('KGC partner not found');
    });
  });

  describe('autoLinkByEmail', () => {
    it('should auto-link partners by email', async () => {
      (mockKgcPartnerService.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([mockKgcPartner]);
      (mockCrmClient.getPartners as ReturnType<typeof vi.fn>).mockResolvedValue([mockCrmPartner]);
      (mockMappingRepository.findByKgcPartnerId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockMappingRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      const result = await service.autoLinkByEmail(mockTenantId, mockUserId);

      expect(result.linked).toBe(1);
      expect(result.skipped).toBe(0);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'partner_auto_link_completed' }),
      );
    });

    it('should skip partners without email', async () => {
      const partnerWithoutEmail = { ...mockKgcPartner, email: undefined };
      (mockKgcPartnerService.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([partnerWithoutEmail]);
      (mockCrmClient.getPartners as ReturnType<typeof vi.fn>).mockResolvedValue([mockCrmPartner]);

      const result = await service.autoLinkByEmail(mockTenantId, mockUserId);

      expect(result.linked).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should skip already mapped partners', async () => {
      (mockKgcPartnerService.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([mockKgcPartner]);
      (mockCrmClient.getPartners as ReturnType<typeof vi.fn>).mockResolvedValue([mockCrmPartner]);
      (mockMappingRepository.findByKgcPartnerId as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      const result = await service.autoLinkByEmail(mockTenantId, mockUserId);

      expect(result.linked).toBe(0);
      expect(result.skipped).toBe(1);
    });
  });

  describe('deleteMapping', () => {
    it('should delete mapping successfully', async () => {
      (mockMappingRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      await service.deleteMapping(mockMappingId, mockTenantId, mockUserId);

      expect(mockMappingRepository.delete).toHaveBeenCalledWith(mockMappingId);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'partner_mapping_deleted' }),
      );
    });

    it('should throw error on tenant mismatch', async () => {
      (mockMappingRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(mockMapping);

      await expect(
        service.deleteMapping(mockMappingId, 'other-tenant', mockUserId),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('getMappings', () => {
    it('should return all mappings for tenant', async () => {
      (mockMappingRepository.findByTenantId as ReturnType<typeof vi.fn>).mockResolvedValue([mockMapping]);

      const result = await service.getMappings(mockTenantId);

      expect(result).toHaveLength(1);
    });
  });
});
