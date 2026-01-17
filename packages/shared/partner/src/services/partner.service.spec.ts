import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PartnerService } from './partner.service';
import {
  IPartnerRepository,
  Partner,
  PartnerType,
  CreatePartnerInput,
  UpdatePartnerInput,
  PartnerQueryOptions,
  PartnerQueryResult,
} from '../interfaces/partner.interface';

describe('PartnerService', () => {
  let service: PartnerService;
  let mockRepository: IPartnerRepository;

  const mockTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440001';
  const mockPartnerId = '550e8400-e29b-41d4-a716-446655440002';

  const mockIndividualPartner: Partner = {
    id: mockPartnerId,
    tenantId: mockTenantId,
    type: 'INDIVIDUAL',
    status: 'ACTIVE',
    name: 'Kovács János',
    email: 'kovacs.janos@example.com',
    phone: '+36301234567',
    address: {
      street: 'Petőfi utca 10',
      city: 'Budapest',
      postalCode: '1051',
      country: 'Magyarország',
    },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: mockUserId,
  };

  const mockCompanyPartner: Partner = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    tenantId: mockTenantId,
    type: 'COMPANY',
    status: 'ACTIVE',
    name: 'Test Kft.',
    email: 'info@test.hu',
    phone: '+3612345678',
    taxNumber: '12345678-1-42',
    registrationNumber: '01-09-123456',
    contactPersons: [
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Nagy Péter',
        email: 'nagy.peter@test.hu',
        phone: '+36209876543',
        position: 'Ügyvezető',
        isPrimary: true,
      },
    ],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: mockUserId,
  };

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      hardDelete: vi.fn(),
      query: vi.fn(),
      findDuplicates: vi.fn(),
      count: vi.fn(),
    };

    service = new PartnerService(mockRepository);
  });

  describe('create()', () => {
    it('should create an individual partner', async () => {
      const input: CreatePartnerInput = {
        tenantId: mockTenantId,
        type: 'INDIVIDUAL',
        name: 'Kovács János',
        email: 'kovacs.janos@example.com',
        phone: '+36301234567',
        createdBy: mockUserId,
      };

      vi.mocked(mockRepository.findDuplicates).mockResolvedValue([]);
      vi.mocked(mockRepository.create).mockResolvedValue(mockIndividualPartner);

      const result = await service.create(input);

      expect(result.partner).toEqual(mockIndividualPartner);
      expect(result.duplicateWarnings).toHaveLength(0);
      expect(mockRepository.create).toHaveBeenCalledWith(input);
    });

    it('should create a company partner', async () => {
      const input: CreatePartnerInput = {
        tenantId: mockTenantId,
        type: 'COMPANY',
        name: 'Test Kft.',
        email: 'info@test.hu',
        taxNumber: '12345678-1-42',
        registrationNumber: '01-09-123456',
        contactPersons: [
          {
            name: 'Nagy Péter',
            email: 'nagy.peter@test.hu',
            isPrimary: true,
          },
        ],
        createdBy: mockUserId,
      };

      vi.mocked(mockRepository.findDuplicates).mockResolvedValue([]);
      vi.mocked(mockRepository.create).mockResolvedValue(mockCompanyPartner);

      const result = await service.create(input);

      expect(result.partner).toEqual(mockCompanyPartner);
      expect(result.partner.type).toBe('COMPANY');
      expect(result.partner.taxNumber).toBe('12345678-1-42');
    });

    it('should return duplicate warnings for existing email', async () => {
      const input: CreatePartnerInput = {
        tenantId: mockTenantId,
        type: 'INDIVIDUAL',
        name: 'Szabó Anna',
        email: 'kovacs.janos@example.com', // Existing email
        createdBy: mockUserId,
      };

      vi.mocked(mockRepository.findDuplicates).mockResolvedValue([mockIndividualPartner]);
      vi.mocked(mockRepository.create).mockResolvedValue({
        ...mockIndividualPartner,
        id: '550e8400-e29b-41d4-a716-446655440005',
        name: 'Szabó Anna',
      });

      const result = await service.create(input);

      expect(result.duplicateWarnings).toHaveLength(1);
      expect(result.duplicateWarnings[0]).toEqual({
        field: 'email',
        value: 'kovacs.janos@example.com',
        existingPartnerId: mockPartnerId,
        existingPartnerName: 'Kovács János',
      });
    });

    it('should return duplicate warnings for existing phone', async () => {
      const input: CreatePartnerInput = {
        tenantId: mockTenantId,
        type: 'INDIVIDUAL',
        name: 'Szabó Anna',
        phone: '+36301234567', // Existing phone
        createdBy: mockUserId,
      };

      vi.mocked(mockRepository.findDuplicates).mockResolvedValue([mockIndividualPartner]);
      vi.mocked(mockRepository.create).mockResolvedValue({
        ...mockIndividualPartner,
        id: '550e8400-e29b-41d4-a716-446655440006',
        name: 'Szabó Anna',
      });

      const result = await service.create(input);

      expect(result.duplicateWarnings).toHaveLength(1);
      expect(result.duplicateWarnings[0]?.field).toBe('phone');
    });

    it('should throw error when company has no tax number', async () => {
      const input: CreatePartnerInput = {
        tenantId: mockTenantId,
        type: 'COMPANY',
        name: 'Bad Company Kft.',
        createdBy: mockUserId,
      };

      await expect(service.create(input)).rejects.toThrow(
        'Cég típusú partner esetén az adószám megadása kötelező'
      );
    });

    it('should validate name length', async () => {
      const input: CreatePartnerInput = {
        tenantId: mockTenantId,
        type: 'INDIVIDUAL',
        name: 'A', // Too short
        createdBy: mockUserId,
      };

      await expect(service.create(input)).rejects.toThrow('Név minimum 2 karakter');
    });
  });

  describe('findById()', () => {
    it('should return partner by ID', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockIndividualPartner);

      const result = await service.findById(mockPartnerId, mockTenantId);

      expect(result).toEqual(mockIndividualPartner);
      expect(mockRepository.findById).toHaveBeenCalledWith(mockPartnerId, mockTenantId);
    });

    it('should return null for non-existent partner', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      const result = await service.findById('non-existent', mockTenantId);

      expect(result).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update partner details', async () => {
      const input: UpdatePartnerInput = {
        name: 'Kovács János Gábor',
        phone: '+36709999999',
        updatedBy: mockUserId,
      };

      const updatedPartner = {
        ...mockIndividualPartner,
        name: 'Kovács János Gábor',
        phone: '+36709999999',
        updatedAt: new Date(),
        updatedBy: mockUserId,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockIndividualPartner);
      vi.mocked(mockRepository.update).mockResolvedValue(updatedPartner);

      const result = await service.update(mockPartnerId, mockTenantId, input);

      expect(result.name).toBe('Kovács János Gábor');
      expect(result.phone).toBe('+36709999999');
    });

    it('should throw error when partner not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(
        service.update('non-existent', mockTenantId, { updatedBy: mockUserId })
      ).rejects.toThrow('Partner not found');
    });

    it('should not allow updating deleted partner', async () => {
      const deletedPartner = {
        ...mockIndividualPartner,
        status: 'DELETED' as const,
        deletedAt: new Date(),
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(deletedPartner);

      await expect(
        service.update(mockPartnerId, mockTenantId, { updatedBy: mockUserId })
      ).rejects.toThrow('Cannot update deleted partner');
    });
  });

  describe('delete()', () => {
    it('should soft delete partner', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockIndividualPartner);
      vi.mocked(mockRepository.delete).mockResolvedValue();

      await service.delete(mockPartnerId, mockTenantId, mockUserId);

      expect(mockRepository.delete).toHaveBeenCalledWith(mockPartnerId, mockTenantId, mockUserId);
    });

    it('should throw error when partner not found', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null);

      await expect(service.delete('non-existent', mockTenantId, mockUserId)).rejects.toThrow(
        'Partner not found'
      );
    });
  });

  describe('hardDelete()', () => {
    it('should permanently delete partner (GDPR)', async () => {
      const deletedPartner = {
        ...mockIndividualPartner,
        status: 'DELETED' as const,
        deletedAt: new Date(),
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(deletedPartner);
      vi.mocked(mockRepository.hardDelete).mockResolvedValue();

      await service.hardDelete(mockPartnerId, mockTenantId);

      expect(mockRepository.hardDelete).toHaveBeenCalledWith(mockPartnerId, mockTenantId);
    });

    it('should throw error when partner is not soft-deleted first', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(mockIndividualPartner);

      await expect(service.hardDelete(mockPartnerId, mockTenantId)).rejects.toThrow(
        'Partner must be soft-deleted before hard delete'
      );
    });
  });

  describe('query()', () => {
    it('should query partners with default options', async () => {
      const queryResult: PartnerQueryResult = {
        items: [mockIndividualPartner, mockCompanyPartner],
        total: 2,
        page: 1,
        limit: 20,
        hasMore: false,
      };

      vi.mocked(mockRepository.query).mockResolvedValue(queryResult);

      const result = await service.query({ tenantId: mockTenantId });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by type', async () => {
      const queryResult: PartnerQueryResult = {
        items: [mockIndividualPartner],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      };

      vi.mocked(mockRepository.query).mockResolvedValue(queryResult);

      const result = await service.query({ tenantId: mockTenantId, type: 'INDIVIDUAL' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.type).toBe('INDIVIDUAL');
    });

    it('should search by name', async () => {
      const queryResult: PartnerQueryResult = {
        items: [mockIndividualPartner],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      };

      vi.mocked(mockRepository.query).mockResolvedValue(queryResult);

      const result = await service.query({ tenantId: mockTenantId, search: 'Kovács' });

      expect(result.items).toHaveLength(1);
      expect(mockRepository.query).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Kovács' })
      );
    });

    it('should paginate results', async () => {
      const queryResult: PartnerQueryResult = {
        items: [mockIndividualPartner],
        total: 50,
        page: 2,
        limit: 10,
        hasMore: true,
      };

      vi.mocked(mockRepository.query).mockResolvedValue(queryResult);

      const result = await service.query({ tenantId: mockTenantId, page: 2, limit: 10 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('count()', () => {
    it('should count all partners', async () => {
      vi.mocked(mockRepository.count).mockResolvedValue(42);

      const result = await service.count(mockTenantId);

      expect(result).toBe(42);
    });

    it('should count partners by status', async () => {
      vi.mocked(mockRepository.count).mockResolvedValue(10);

      const result = await service.count(mockTenantId, { status: 'ACTIVE' });

      expect(result).toBe(10);
      expect(mockRepository.count).toHaveBeenCalledWith(mockTenantId, { status: 'ACTIVE' });
    });
  });

  describe('findDuplicates()', () => {
    it('should find partners with matching email', async () => {
      vi.mocked(mockRepository.findDuplicates).mockResolvedValue([mockIndividualPartner]);

      const result = await service.findDuplicates(mockTenantId, {
        email: 'kovacs.janos@example.com',
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.email).toBe('kovacs.janos@example.com');
    });

    it('should find partners with matching phone', async () => {
      vi.mocked(mockRepository.findDuplicates).mockResolvedValue([mockIndividualPartner]);

      const result = await service.findDuplicates(mockTenantId, { phone: '+36301234567' });

      expect(result).toHaveLength(1);
    });

    it('should find companies with matching tax number', async () => {
      vi.mocked(mockRepository.findDuplicates).mockResolvedValue([mockCompanyPartner]);

      const result = await service.findDuplicates(mockTenantId, { taxNumber: '12345678-1-42' });

      expect(result).toHaveLength(1);
      expect(result[0]?.taxNumber).toBe('12345678-1-42');
    });
  });

  describe('setStatus()', () => {
    it('should change partner status', async () => {
      const inactivePartner = {
        ...mockIndividualPartner,
        status: 'INACTIVE' as const,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockIndividualPartner);
      vi.mocked(mockRepository.update).mockResolvedValue(inactivePartner);

      const result = await service.setStatus(mockPartnerId, mockTenantId, 'INACTIVE', mockUserId);

      expect(result.status).toBe('INACTIVE');
    });

    it('should not allow changing deleted partner status', async () => {
      const deletedPartner = {
        ...mockIndividualPartner,
        status: 'DELETED' as const,
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(deletedPartner);

      await expect(
        service.setStatus(mockPartnerId, mockTenantId, 'ACTIVE', mockUserId)
      ).rejects.toThrow('Cannot change status of deleted partner');
    });
  });
});
