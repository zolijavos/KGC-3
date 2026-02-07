import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IBlacklistRepository } from '../interfaces/blacklist.interface';
import { ILoyaltyCardRepository, LoyaltyCard } from '../interfaces/loyalty-card.interface';
import { IPartnerRepository, Partner } from '../interfaces/partner.interface';
import { PartnerSearchService } from './partner-search.service';

describe('PartnerSearchService', () => {
  let service: PartnerSearchService;
  let mockPartnerRepository: IPartnerRepository;
  let mockBlacklistRepository: IBlacklistRepository;
  let mockLoyaltyCardRepository: ILoyaltyCardRepository;

  const mockTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440001';

  const mockPartners: Partner[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      tenantId: mockTenantId,
      type: 'INDIVIDUAL',
      status: 'ACTIVE',
      name: 'Kovács János',
      email: 'kovacs.janos@example.com',
      phone: '+36301234567',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: mockUserId,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      tenantId: mockTenantId,
      type: 'COMPANY',
      status: 'ACTIVE',
      name: 'Kovács Kft.',
      email: 'info@kovacs.hu',
      phone: '+3612345678',
      taxNumber: '12345678-1-42',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: mockUserId,
    },
  ];

  const mockLoyaltyCard: LoyaltyCard = {
    id: '550e8400-e29b-41d4-a716-446655440004',
    partnerId: mockPartners[0]!.id,
    tenantId: mockTenantId,
    cardNumber: 'KGC-2026-00001234',
    qrCode: 'kgc:loyalty:...',
    type: 'STANDARD',
    status: 'ACTIVE',
    issuedAt: new Date(),
    points: 100,
    lifetimePoints: 500,
    usageCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: mockUserId,
  };

  beforeEach(() => {
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

    mockBlacklistRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByPartner: vi.fn(),
      findActiveByPartner: vi.fn(),
      resolve: vi.fn(),
      isBlocked: vi.fn(),
    };

    mockLoyaltyCardRepository = {
      issue: vi.fn(),
      findById: vi.fn(),
      findByCardNumber: vi.fn(),
      findByQrCode: vi.fn(),
      findByPartner: vi.fn(),
      update: vi.fn(),
      setStatus: vi.fn(),
      savePointTransaction: vi.fn(),
      getPointTransactions: vi.fn(),
      logUsage: vi.fn(),
      cardNumberExists: vi.fn(),
      findActiveByPartner: vi.fn(),
    };

    service = new PartnerSearchService(
      mockPartnerRepository,
      mockBlacklistRepository,
      mockLoyaltyCardRepository
    );
  });

  describe('search()', () => {
    it('should search partners by name', async () => {
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: mockPartners,
        total: 2,
        page: 1,
        limit: 20,
        hasMore: false,
      });
      vi.mocked(mockBlacklistRepository.isBlocked).mockResolvedValue(false);
      vi.mocked(mockBlacklistRepository.findActiveByPartner).mockResolvedValue([]);

      const result = await service.search({
        tenantId: mockTenantId,
        query: 'Kovács',
      });

      expect(result.results).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('should return empty results for no match', async () => {
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
      });

      const result = await service.search({
        tenantId: mockTenantId,
        query: 'NonExistent',
      });

      expect(result.results).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('should include warning status in results', async () => {
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: [mockPartners[0]!],
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      });
      vi.mocked(mockBlacklistRepository.isBlocked).mockResolvedValue(true);
      vi.mocked(mockBlacklistRepository.findActiveByPartner).mockResolvedValue([
        {
          id: '1',
          partnerId: mockPartners[0]!.id,
          tenantId: mockTenantId,
          reason: 'PAYMENT_DEFAULT',
          description: 'Tartozás',
          severity: 'BLOCKED',
          status: 'ACTIVE',
          createdAt: new Date(),
          createdBy: mockUserId,
        },
      ]);

      const result = await service.search({
        tenantId: mockTenantId,
        query: 'Kovács János',
      });

      expect(result.results[0]?.isBlocked).toBe(true);
      expect(result.results[0]?.hasWarnings).toBe(true);
    });
  });

  describe('identify()', () => {
    it('should identify partner by phone', async () => {
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: [mockPartners[0]!],
        total: 1,
        page: 1,
        limit: 1,
        hasMore: false,
      });
      vi.mocked(mockBlacklistRepository.findActiveByPartner).mockResolvedValue([]);

      const result = await service.identify({
        tenantId: mockTenantId,
        identifier: '+36301234567',
        operatorId: mockUserId,
      });

      expect(result.found).toBe(true);
      expect(result.partner?.name).toBe('Kovács János');
      expect(result.identifiedBy).toBe('PHONE');
    });

    it('should identify partner by email', async () => {
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: [mockPartners[0]!],
        total: 1,
        page: 1,
        limit: 1,
        hasMore: false,
      });
      vi.mocked(mockBlacklistRepository.findActiveByPartner).mockResolvedValue([]);

      const result = await service.identify({
        tenantId: mockTenantId,
        identifier: 'kovacs.janos@example.com',
        operatorId: mockUserId,
      });

      expect(result.found).toBe(true);
      expect(result.identifiedBy).toBe('EMAIL');
    });

    it('should identify partner by loyalty card', async () => {
      vi.mocked(mockLoyaltyCardRepository.findByCardNumber).mockResolvedValue(mockLoyaltyCard);
      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartners[0]!);
      vi.mocked(mockBlacklistRepository.findActiveByPartner).mockResolvedValue([]);

      const result = await service.identify({
        tenantId: mockTenantId,
        identifier: 'KGC-2026-00001234',
        operatorId: mockUserId,
      });

      expect(result.found).toBe(true);
      expect(result.identifiedBy).toBe('LOYALTY_CARD');
    });

    it('should return not found for unknown identifier', async () => {
      vi.mocked(mockLoyaltyCardRepository.findByCardNumber).mockResolvedValue(null);
      vi.mocked(mockLoyaltyCardRepository.findByQrCode).mockResolvedValue(null);
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 1,
        hasMore: false,
      });

      const result = await service.identify({
        tenantId: mockTenantId,
        identifier: 'unknown',
        operatorId: mockUserId,
      });

      expect(result.found).toBe(false);
    });

    it('should include warnings in result', async () => {
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: [mockPartners[0]!],
        total: 1,
        page: 1,
        limit: 1,
        hasMore: false,
      });
      vi.mocked(mockBlacklistRepository.findActiveByPartner).mockResolvedValue([
        {
          id: '1',
          partnerId: mockPartners[0]!.id,
          tenantId: mockTenantId,
          reason: 'PAYMENT_DEFAULT',
          description: 'Fizetési késedelem',
          severity: 'WARNING',
          status: 'ACTIVE',
          createdAt: new Date(),
          createdBy: mockUserId,
        },
      ]);

      const result = await service.identify({
        tenantId: mockTenantId,
        identifier: '+36301234567',
        operatorId: mockUserId,
      });

      expect(result.hasWarnings).toBe(true);
      expect(result.warnings).toContain('Fizetési késedelem');
    });
  });

  describe('tax number validation (H2 fix)', () => {
    it('should identify partner by Hungarian tax number', async () => {
      const companyPartner = mockPartners[1]!;
      vi.mocked(mockLoyaltyCardRepository.findByCardNumber).mockResolvedValue(null);
      vi.mocked(mockLoyaltyCardRepository.findByQrCode).mockResolvedValue(null);
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: [companyPartner],
        total: 1,
        page: 1,
        limit: 1,
        hasMore: false,
      });
      vi.mocked(mockBlacklistRepository.findActiveByPartner).mockResolvedValue([]);

      const result = await service.identify({
        tenantId: mockTenantId,
        identifier: '12345678-1-42', // Hungarian format
        operatorId: mockUserId,
      });

      expect(result.found).toBe(true);
      expect(result.identifiedBy).toBe('TAX_NUMBER');
    });

    it('should identify partner by Ukrainian company tax number (8 digits)', async () => {
      const ukrainianCompany: Partner = {
        ...mockPartners[1]!,
        taxNumber: '12345678', // Ukrainian EDRPOU format
      };
      vi.mocked(mockLoyaltyCardRepository.findByCardNumber).mockResolvedValue(null);
      vi.mocked(mockLoyaltyCardRepository.findByQrCode).mockResolvedValue(null);
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: [ukrainianCompany],
        total: 1,
        page: 1,
        limit: 1,
        hasMore: false,
      });
      vi.mocked(mockBlacklistRepository.findActiveByPartner).mockResolvedValue([]);

      const result = await service.identify({
        tenantId: mockTenantId,
        identifier: '12345678',
        operatorId: mockUserId,
      });

      expect(result.found).toBe(true);
      expect(result.identifiedBy).toBe('TAX_NUMBER');
    });

    it('should identify partner by Ukrainian individual tax number (10 digits)', async () => {
      const ukrainianIndividual: Partner = {
        ...mockPartners[0]!,
        taxNumber: '1234567890', // Ukrainian IPN format
      };
      vi.mocked(mockLoyaltyCardRepository.findByCardNumber).mockResolvedValue(null);
      vi.mocked(mockLoyaltyCardRepository.findByQrCode).mockResolvedValue(null);
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: [ukrainianIndividual],
        total: 1,
        page: 1,
        limit: 1,
        hasMore: false,
      });
      vi.mocked(mockBlacklistRepository.findActiveByPartner).mockResolvedValue([]);

      const result = await service.identify({
        tenantId: mockTenantId,
        identifier: '1234567890',
        operatorId: mockUserId,
      });

      expect(result.found).toBe(true);
      expect(result.identifiedBy).toBe('TAX_NUMBER');
    });
  });

  describe('validation edge cases (M1, M2 fixes)', () => {
    it('should not identify by email with single-char TLD', async () => {
      vi.mocked(mockLoyaltyCardRepository.findByCardNumber).mockResolvedValue(null);
      vi.mocked(mockLoyaltyCardRepository.findByQrCode).mockResolvedValue(null);
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 1,
        hasMore: false,
      });

      // Invalid email with single-char TLD should not match email pattern
      const result = await service.identify({
        tenantId: mockTenantId,
        identifier: 'test@example.a', // Invalid: TLD too short
        operatorId: mockUserId,
      });

      expect(result.found).toBe(false);
    });

    it('should not identify phone with only special characters', async () => {
      vi.mocked(mockLoyaltyCardRepository.findByCardNumber).mockResolvedValue(null);
      vi.mocked(mockLoyaltyCardRepository.findByQrCode).mockResolvedValue(null);
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 1,
        hasMore: false,
      });

      // Invalid phone with only dashes/spaces should not match
      const result = await service.identify({
        tenantId: mockTenantId,
        identifier: '--- ---', // Invalid: no digits
        operatorId: mockUserId,
      });

      expect(result.found).toBe(false);
    });

    it('should not identify phone with fewer than 6 digits', async () => {
      vi.mocked(mockLoyaltyCardRepository.findByCardNumber).mockResolvedValue(null);
      vi.mocked(mockLoyaltyCardRepository.findByQrCode).mockResolvedValue(null);
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 1,
        hasMore: false,
      });

      const result = await service.identify({
        tenantId: mockTenantId,
        identifier: '12345', // Only 5 digits
        operatorId: mockUserId,
      });

      expect(result.found).toBe(false);
    });
  });

  describe('loyalty card usage logging (H4 fix)', () => {
    it('should log loyalty card usage on successful identify', async () => {
      vi.mocked(mockLoyaltyCardRepository.findByCardNumber).mockResolvedValue(mockLoyaltyCard);
      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartners[0]!);
      vi.mocked(mockBlacklistRepository.findActiveByPartner).mockResolvedValue([]);

      await service.identify({
        tenantId: mockTenantId,
        identifier: 'KGC-2026-00001234',
        operatorId: mockUserId,
      });

      expect(mockLoyaltyCardRepository.logUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          cardId: mockLoyaltyCard.id,
          tenantId: mockTenantId,
          action: 'SCAN',
          operatorId: mockUserId,
          successful: true,
        })
      );
    });

    it('should log QR code usage on successful identify', async () => {
      vi.mocked(mockLoyaltyCardRepository.findByCardNumber).mockResolvedValue(null);
      vi.mocked(mockLoyaltyCardRepository.findByQrCode).mockResolvedValue(mockLoyaltyCard);
      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartners[0]!);
      vi.mocked(mockBlacklistRepository.findActiveByPartner).mockResolvedValue([]);

      await service.identify({
        tenantId: mockTenantId,
        identifier: 'kgc:loyalty:...',
        operatorId: mockUserId,
      });

      expect(mockLoyaltyCardRepository.logUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          cardId: mockLoyaltyCard.id,
          action: 'SCAN',
          successful: true,
        })
      );
    });
  });

  describe('autocomplete()', () => {
    it('should return autocomplete suggestions', async () => {
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: mockPartners,
        total: 2,
        page: 1,
        limit: 5,
        hasMore: false,
      });
      vi.mocked(mockBlacklistRepository.isBlocked).mockResolvedValue(false);
      vi.mocked(mockBlacklistRepository.findActiveByPartner).mockResolvedValue([]);

      const results = await service.autocomplete(mockTenantId, 'Kov', 5);

      expect(results.length).toBeGreaterThan(0);
    });

    it('should limit results', async () => {
      vi.mocked(mockPartnerRepository.query).mockResolvedValue({
        items: [mockPartners[0]!],
        total: 1,
        page: 1,
        limit: 3,
        hasMore: false,
      });
      vi.mocked(mockBlacklistRepository.isBlocked).mockResolvedValue(false);
      vi.mocked(mockBlacklistRepository.findActiveByPartner).mockResolvedValue([]);

      const results = await service.autocomplete(mockTenantId, 'Kov', 3);

      expect(results.length).toBeLessThanOrEqual(3);
    });
  });
});
