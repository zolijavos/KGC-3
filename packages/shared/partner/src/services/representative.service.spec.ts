import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPartnerRepository, Partner } from '../interfaces/partner.interface';
import {
  CreateRepresentativeInput,
  IRepresentativeRepository,
  Representative,
  UpdateRepresentativeInput,
} from '../interfaces/representative.interface';
import { RepresentativeService } from './representative.service';

describe('RepresentativeService', () => {
  let service: RepresentativeService;
  let mockRepRepository: IRepresentativeRepository;
  let mockPartnerRepository: IPartnerRepository;

  const mockTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440001';
  const mockCompanyPartnerId = '550e8400-e29b-41d4-a716-446655440002';
  const mockRepresentativeId = '550e8400-e29b-41d4-a716-446655440003';

  const mockCompanyPartner: Partner = {
    id: mockCompanyPartnerId,
    tenantId: mockTenantId,
    type: 'COMPANY',
    status: 'ACTIVE',
    name: 'Test Kft.',
    taxNumber: '12345678-1-42',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: mockUserId,
  };

  const mockIndividualPartner: Partner = {
    id: '550e8400-e29b-41d4-a716-446655440004',
    tenantId: mockTenantId,
    type: 'INDIVIDUAL',
    status: 'ACTIVE',
    name: 'Kovács János',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: mockUserId,
  };

  const mockRepresentative: Representative = {
    id: mockRepresentativeId,
    partnerId: mockCompanyPartnerId,
    tenantId: mockTenantId,
    name: 'Nagy Péter',
    email: 'nagy.peter@test.hu',
    phone: '+36209876543',
    position: 'Ügyvezető',
    authorizationType: 'BOTH',
    isPrimary: true,
    validFrom: new Date('2026-01-01'),
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: mockUserId,
  };

  beforeEach(() => {
    mockRepRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      revoke: vi.fn(),
      findByPartner: vi.fn(),
      findPrimary: vi.fn(),
      count: vi.fn(),
      clearPrimaryFlag: vi.fn(),
    };

    mockPartnerRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      hardDelete: vi.fn(),
      query: vi.fn(),
      findDuplicates: vi.fn(),
      count: vi.fn(),
    };

    service = new RepresentativeService(mockRepRepository, mockPartnerRepository);
  });

  describe('create()', () => {
    it('should create a representative for company partner', async () => {
      const input: CreateRepresentativeInput = {
        partnerId: mockCompanyPartnerId,
        tenantId: mockTenantId,
        name: 'Nagy Péter',
        email: 'nagy.peter@test.hu',
        authorizationType: 'BOTH',
        isPrimary: true,
        createdBy: mockUserId,
      };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockCompanyPartner);
      vi.mocked(mockRepRepository.findPrimary).mockResolvedValue(null);
      vi.mocked(mockRepRepository.create).mockResolvedValue(mockRepresentative);

      const result = await service.create(input);

      expect(result).toEqual(mockRepresentative);
      expect(mockRepRepository.create).toHaveBeenCalledWith(expect.objectContaining(input));
    });

    it('should throw error when partner is INDIVIDUAL', async () => {
      const input: CreateRepresentativeInput = {
        partnerId: mockIndividualPartner.id,
        tenantId: mockTenantId,
        name: 'Meghatalmazott',
        authorizationType: 'RENTAL',
        createdBy: mockUserId,
      };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockIndividualPartner);

      await expect(service.create(input)).rejects.toThrow(
        'Meghatalmazott csak cég típusú partnerhez adható'
      );
    });

    it('should throw error when partner not found', async () => {
      const input: CreateRepresentativeInput = {
        partnerId: 'non-existent',
        tenantId: mockTenantId,
        name: 'Meghatalmazott',
        authorizationType: 'RENTAL',
        createdBy: mockUserId,
      };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(null);

      await expect(service.create(input)).rejects.toThrow('Partner not found');
    });

    it('should clear existing primary when setting new primary', async () => {
      const input: CreateRepresentativeInput = {
        partnerId: mockCompanyPartnerId,
        tenantId: mockTenantId,
        name: 'Új Elsődleges',
        authorizationType: 'BOTH',
        isPrimary: true,
        createdBy: mockUserId,
      };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockCompanyPartner);
      vi.mocked(mockRepRepository.findPrimary).mockResolvedValue(mockRepresentative);
      vi.mocked(mockRepRepository.clearPrimaryFlag).mockResolvedValue();
      vi.mocked(mockRepRepository.create).mockResolvedValue({
        ...mockRepresentative,
        id: '550e8400-e29b-41d4-a716-446655440005',
        name: 'Új Elsődleges',
      });

      await service.create(input);

      expect(mockRepRepository.clearPrimaryFlag).toHaveBeenCalledWith(
        mockCompanyPartnerId,
        mockTenantId
      );
    });

    it('should validate name length', async () => {
      const input: CreateRepresentativeInput = {
        partnerId: mockCompanyPartnerId,
        tenantId: mockTenantId,
        name: 'A', // Too short
        authorizationType: 'RENTAL',
        createdBy: mockUserId,
      };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockCompanyPartner);

      await expect(service.create(input)).rejects.toThrow('Név minimum 2 karakter');
    });

    it('should set default validFrom to now', async () => {
      const input: CreateRepresentativeInput = {
        partnerId: mockCompanyPartnerId,
        tenantId: mockTenantId,
        name: 'Meghatalmazott',
        authorizationType: 'RENTAL',
        createdBy: mockUserId,
      };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockCompanyPartner);
      vi.mocked(mockRepRepository.findPrimary).mockResolvedValue(null);
      vi.mocked(mockRepRepository.create).mockResolvedValue(mockRepresentative);

      await service.create(input);

      expect(mockRepRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          validFrom: expect.any(Date),
        })
      );
    });
  });

  describe('findById()', () => {
    it('should return representative by ID', async () => {
      vi.mocked(mockRepRepository.findById).mockResolvedValue(mockRepresentative);

      const result = await service.findById(
        mockRepresentativeId,
        mockCompanyPartnerId,
        mockTenantId
      );

      expect(result).toEqual(mockRepresentative);
    });

    it('should return null for non-existent representative', async () => {
      vi.mocked(mockRepRepository.findById).mockResolvedValue(null);

      const result = await service.findById('non-existent', mockCompanyPartnerId, mockTenantId);

      expect(result).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update representative details', async () => {
      const input: UpdateRepresentativeInput = {
        name: 'Nagy Péter Gábor',
        phone: '+36701234567',
        updatedBy: mockUserId,
      };

      const updatedRep = {
        ...mockRepresentative,
        name: 'Nagy Péter Gábor',
        phone: '+36701234567',
      };

      vi.mocked(mockRepRepository.findById).mockResolvedValue(mockRepresentative);
      vi.mocked(mockRepRepository.update).mockResolvedValue(updatedRep);

      const result = await service.update(
        mockRepresentativeId,
        mockCompanyPartnerId,
        mockTenantId,
        input
      );

      expect(result.name).toBe('Nagy Péter Gábor');
    });

    it('should throw error when representative not found', async () => {
      vi.mocked(mockRepRepository.findById).mockResolvedValue(null);

      await expect(
        service.update('non-existent', mockCompanyPartnerId, mockTenantId, {
          updatedBy: mockUserId,
        })
      ).rejects.toThrow('Representative not found');
    });

    it('should not allow updating revoked representative', async () => {
      const revokedRep = { ...mockRepresentative, status: 'REVOKED' as const };

      vi.mocked(mockRepRepository.findById).mockResolvedValue(revokedRep);

      await expect(
        service.update(mockRepresentativeId, mockCompanyPartnerId, mockTenantId, {
          updatedBy: mockUserId,
        })
      ).rejects.toThrow('Cannot update revoked representative');
    });

    it('should not allow updating expired representative', async () => {
      const expiredRep = { ...mockRepresentative, status: 'EXPIRED' as const };

      vi.mocked(mockRepRepository.findById).mockResolvedValue(expiredRep);

      await expect(
        service.update(mockRepresentativeId, mockCompanyPartnerId, mockTenantId, {
          updatedBy: mockUserId,
        })
      ).rejects.toThrow('Cannot update expired representative');
    });
  });

  describe('revoke()', () => {
    it('should revoke representative', async () => {
      const revokedRep = {
        ...mockRepresentative,
        status: 'REVOKED' as const,
        revokedAt: new Date(),
        revokedBy: mockUserId,
        revokeReason: 'Kilépett a cégtől',
      };

      vi.mocked(mockRepRepository.findById).mockResolvedValue(mockRepresentative);
      vi.mocked(mockRepRepository.revoke).mockResolvedValue(revokedRep);

      const result = await service.revoke(
        mockRepresentativeId,
        mockCompanyPartnerId,
        mockTenantId,
        { revokedBy: mockUserId, revokeReason: 'Kilépett a cégtől' }
      );

      expect(result.status).toBe('REVOKED');
      expect(result.revokeReason).toBe('Kilépett a cégtől');
    });

    it('should throw error when already revoked', async () => {
      const revokedRep = { ...mockRepresentative, status: 'REVOKED' as const };

      vi.mocked(mockRepRepository.findById).mockResolvedValue(revokedRep);

      await expect(
        service.revoke(mockRepresentativeId, mockCompanyPartnerId, mockTenantId, {
          revokedBy: mockUserId,
          revokeReason: 'Kilépett a cégtől',
        })
      ).rejects.toThrow('Representative is already revoked');
    });
  });

  describe('findByPartner()', () => {
    it('should return all representatives for partner', async () => {
      vi.mocked(mockRepRepository.findByPartner).mockResolvedValue([mockRepresentative]);

      const result = await service.findByPartner({
        partnerId: mockCompanyPartnerId,
        tenantId: mockTenantId,
      });

      expect(result).toHaveLength(1);
    });

    it('should filter by authorization type', async () => {
      vi.mocked(mockRepRepository.findByPartner).mockResolvedValue([mockRepresentative]);

      await service.findByPartner({
        partnerId: mockCompanyPartnerId,
        tenantId: mockTenantId,
        authorizationType: 'RENTAL',
      });

      expect(mockRepRepository.findByPartner).toHaveBeenCalledWith(
        expect.objectContaining({ authorizationType: 'RENTAL' })
      );
    });
  });

  describe('checkAuthorization()', () => {
    it('should return authorized for valid representative with correct type', async () => {
      vi.mocked(mockRepRepository.findById).mockResolvedValue(mockRepresentative);

      const result = await service.checkAuthorization({
        partnerId: mockCompanyPartnerId,
        tenantId: mockTenantId,
        representativeId: mockRepresentativeId,
        requiredType: 'RENTAL',
      });

      expect(result.isAuthorized).toBe(true);
      expect(result.representative).toEqual(mockRepresentative);
    });

    it('should return authorized when representative has BOTH and required is RENTAL', async () => {
      vi.mocked(mockRepRepository.findById).mockResolvedValue(mockRepresentative); // BOTH

      const result = await service.checkAuthorization({
        partnerId: mockCompanyPartnerId,
        tenantId: mockTenantId,
        representativeId: mockRepresentativeId,
        requiredType: 'RENTAL',
      });

      expect(result.isAuthorized).toBe(true);
    });

    it('should return not authorized for revoked representative', async () => {
      const revokedRep = { ...mockRepresentative, status: 'REVOKED' as const };
      vi.mocked(mockRepRepository.findById).mockResolvedValue(revokedRep);

      const result = await service.checkAuthorization({
        partnerId: mockCompanyPartnerId,
        tenantId: mockTenantId,
        representativeId: mockRepresentativeId,
        requiredType: 'RENTAL',
      });

      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('REVOKED');
    });

    it('should return not authorized for expired representative', async () => {
      const expiredRep = {
        ...mockRepresentative,
        validTo: new Date('2025-01-01'), // Past date
        status: 'EXPIRED' as const,
      };
      vi.mocked(mockRepRepository.findById).mockResolvedValue(expiredRep);

      const result = await service.checkAuthorization({
        partnerId: mockCompanyPartnerId,
        tenantId: mockTenantId,
        representativeId: mockRepresentativeId,
        requiredType: 'RENTAL',
      });

      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('EXPIRED');
    });

    it('should return not authorized for wrong type', async () => {
      const rentalOnlyRep = { ...mockRepresentative, authorizationType: 'RENTAL' as const };
      vi.mocked(mockRepRepository.findById).mockResolvedValue(rentalOnlyRep);

      const result = await service.checkAuthorization({
        partnerId: mockCompanyPartnerId,
        tenantId: mockTenantId,
        representativeId: mockRepresentativeId,
        requiredType: 'SERVICE',
      });

      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('WRONG_TYPE');
    });

    it('should return not authorized when representative not found', async () => {
      vi.mocked(mockRepRepository.findById).mockResolvedValue(null);

      const result = await service.checkAuthorization({
        partnerId: mockCompanyPartnerId,
        tenantId: mockTenantId,
        representativeId: 'non-existent',
        requiredType: 'RENTAL',
      });

      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('NOT_FOUND');
    });

    it('should return not authorized when validity has not started yet', async () => {
      const futureRep = {
        ...mockRepresentative,
        validFrom: new Date('2099-01-01'),
      };
      vi.mocked(mockRepRepository.findById).mockResolvedValue(futureRep);

      const result = await service.checkAuthorization({
        partnerId: mockCompanyPartnerId,
        tenantId: mockTenantId,
        representativeId: mockRepresentativeId,
        requiredType: 'RENTAL',
        checkDate: new Date('2026-01-16'),
      });

      expect(result.isAuthorized).toBe(false);
      expect(result.reason).toBe('NOT_YET_VALID');
    });
  });

  describe('findPrimary()', () => {
    it('should return primary representative', async () => {
      vi.mocked(mockRepRepository.findPrimary).mockResolvedValue(mockRepresentative);

      const result = await service.findPrimary(mockCompanyPartnerId, mockTenantId);

      expect(result).toEqual(mockRepresentative);
      expect(result?.isPrimary).toBe(true);
    });

    it('should return null when no primary exists', async () => {
      vi.mocked(mockRepRepository.findPrimary).mockResolvedValue(null);

      const result = await service.findPrimary(mockCompanyPartnerId, mockTenantId);

      expect(result).toBeNull();
    });
  });

  describe('count()', () => {
    it('should count all representatives', async () => {
      vi.mocked(mockRepRepository.count).mockResolvedValue(5);

      const result = await service.count(mockCompanyPartnerId, mockTenantId);

      expect(result).toBe(5);
    });

    it('should count by status', async () => {
      vi.mocked(mockRepRepository.count).mockResolvedValue(3);

      const result = await service.count(mockCompanyPartnerId, mockTenantId, { status: 'ACTIVE' });

      expect(result).toBe(3);
    });
  });
});
