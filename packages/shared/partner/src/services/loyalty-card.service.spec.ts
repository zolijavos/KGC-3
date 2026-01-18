import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdjustPointsInput,
  ILoyaltyCardRepository,
  IssueLoyaltyCardInput,
  LoyaltyCard,
  ReplaceCardInput,
} from '../interfaces/loyalty-card.interface';
import { IPartnerRepository, Partner } from '../interfaces/partner.interface';
import { LoyaltyCardService } from './loyalty-card.service';

describe('LoyaltyCardService', () => {
  let service: LoyaltyCardService;
  let mockCardRepository: ILoyaltyCardRepository;
  let mockPartnerRepository: IPartnerRepository;

  const mockTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440001';
  const mockPartnerId = '550e8400-e29b-41d4-a716-446655440002';
  const mockCardId = '550e8400-e29b-41d4-a716-446655440003';

  const mockPartner: Partner = {
    id: mockPartnerId,
    tenantId: mockTenantId,
    type: 'INDIVIDUAL',
    status: 'ACTIVE',
    name: 'Kovács János',
    email: 'kovacs.janos@example.com',
    phone: '+36301234567',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: mockUserId,
  };

  const mockCard: LoyaltyCard = {
    id: mockCardId,
    partnerId: mockPartnerId,
    tenantId: mockTenantId,
    cardNumber: 'KGC-2026-00001234',
    qrCode: 'kgc:loyalty:550e8400-e29b-41d4-a716-446655440003',
    type: 'STANDARD',
    status: 'ACTIVE',
    issuedAt: new Date('2026-01-01'),
    points: 100,
    lifetimePoints: 500,
    usageCount: 10,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: mockUserId,
  };

  beforeEach(() => {
    mockCardRepository = {
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

    service = new LoyaltyCardService(mockCardRepository, mockPartnerRepository);
  });

  describe('issueCard()', () => {
    it('should issue a new loyalty card', async () => {
      const input: IssueLoyaltyCardInput = {
        partnerId: mockPartnerId,
        tenantId: mockTenantId,
        createdBy: mockUserId,
      };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartner);
      vi.mocked(mockCardRepository.findActiveByPartner).mockResolvedValue(null);
      vi.mocked(mockCardRepository.cardNumberExists).mockResolvedValue(false);
      vi.mocked(mockCardRepository.issue).mockResolvedValue(mockCard);

      const result = await service.issueCard(input);

      expect(result).toEqual(mockCard);
      expect(mockCardRepository.issue).toHaveBeenCalled();
    });

    it('should throw error when partner not found', async () => {
      const input: IssueLoyaltyCardInput = {
        partnerId: 'non-existent',
        tenantId: mockTenantId,
        createdBy: mockUserId,
      };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(null);

      await expect(service.issueCard(input)).rejects.toThrow('Partner not found');
    });

    it('should throw error when partner already has active card', async () => {
      const input: IssueLoyaltyCardInput = {
        partnerId: mockPartnerId,
        tenantId: mockTenantId,
        createdBy: mockUserId,
      };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartner);
      vi.mocked(mockCardRepository.findActiveByPartner).mockResolvedValue(mockCard);

      await expect(service.issueCard(input)).rejects.toThrow(
        'Partner már rendelkezik aktív törzsvendég kártyával'
      );
    });

    it('should issue card with initial points', async () => {
      const input: IssueLoyaltyCardInput = {
        partnerId: mockPartnerId,
        tenantId: mockTenantId,
        initialPoints: 50,
        createdBy: mockUserId,
      };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartner);
      vi.mocked(mockCardRepository.findActiveByPartner).mockResolvedValue(null);
      vi.mocked(mockCardRepository.cardNumberExists).mockResolvedValue(false);
      vi.mocked(mockCardRepository.issue).mockResolvedValue({ ...mockCard, points: 50 });

      const result = await service.issueCard(input);

      expect(result.points).toBe(50);
    });
  });

  describe('scanCard()', () => {
    it('should find card by card number and return lookup result', async () => {
      vi.mocked(mockCardRepository.findByCardNumber).mockResolvedValue(mockCard);
      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartner);
      vi.mocked(mockCardRepository.logUsage).mockResolvedValue({
        id: '123',
        cardId: mockCardId,
        tenantId: mockTenantId,
        usedAt: new Date(),
        action: 'SCAN',
        operatorId: mockUserId,
        successful: true,
      });

      const result = await service.scanCard({
        code: 'KGC-2026-00001234',
        tenantId: mockTenantId,
        operatorId: mockUserId,
      });

      expect(result.found).toBe(true);
      expect(result.card).toEqual(mockCard);
      expect(result.partner?.name).toBe('Kovács János');
      expect(result.greeting).toContain('Kovács');
    });

    it('should find card by QR code', async () => {
      vi.mocked(mockCardRepository.findByCardNumber).mockResolvedValue(null);
      vi.mocked(mockCardRepository.findByQrCode).mockResolvedValue(mockCard);
      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartner);
      vi.mocked(mockCardRepository.logUsage).mockResolvedValue({
        id: '123',
        cardId: mockCardId,
        tenantId: mockTenantId,
        usedAt: new Date(),
        action: 'SCAN',
        operatorId: mockUserId,
        successful: true,
      });

      const result = await service.scanCard({
        code: 'kgc:loyalty:550e8400-e29b-41d4-a716-446655440003',
        tenantId: mockTenantId,
        operatorId: mockUserId,
      });

      expect(result.found).toBe(true);
    });

    it('should return not found for non-existent card', async () => {
      vi.mocked(mockCardRepository.findByCardNumber).mockResolvedValue(null);
      vi.mocked(mockCardRepository.findByQrCode).mockResolvedValue(null);

      const result = await service.scanCard({
        code: 'INVALID-CODE',
        tenantId: mockTenantId,
        operatorId: mockUserId,
      });

      expect(result.found).toBe(false);
      expect(result.card).toBeUndefined();
    });

    it('should return warning for blocked card', async () => {
      const blockedCard = { ...mockCard, status: 'BLOCKED' as const };
      vi.mocked(mockCardRepository.findByCardNumber).mockResolvedValue(blockedCard);
      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartner);
      vi.mocked(mockCardRepository.logUsage).mockResolvedValue({
        id: '123',
        cardId: mockCardId,
        tenantId: mockTenantId,
        usedAt: new Date(),
        action: 'SCAN',
        operatorId: mockUserId,
        successful: false,
        failureReason: 'BLOCKED',
      });

      const result = await service.scanCard({
        code: 'KGC-2026-00001234',
        tenantId: mockTenantId,
        operatorId: mockUserId,
      });

      expect(result.warnings).toContain('Kártya blokkolva');
    });
  });

  describe('adjustPoints()', () => {
    it('should add points to card', async () => {
      const input: AdjustPointsInput = {
        cardId: mockCardId,
        tenantId: mockTenantId,
        points: 50,
        type: 'EARN',
        description: 'Bérlés utáni pont jóváírás',
        createdBy: mockUserId,
      };

      vi.mocked(mockCardRepository.findById).mockResolvedValue(mockCard);
      vi.mocked(mockCardRepository.savePointTransaction).mockResolvedValue({
        id: '123',
        cardId: mockCardId,
        tenantId: mockTenantId,
        type: 'EARN',
        points: 50,
        balanceBefore: 100,
        balanceAfter: 150,
        description: 'Bérlés utáni pont jóváírás',
        createdAt: new Date(),
        createdBy: mockUserId,
      });
      vi.mocked(mockCardRepository.update).mockResolvedValue({
        ...mockCard,
        points: 150,
        lifetimePoints: 550,
      });

      const result = await service.adjustPoints(input);

      expect(result.points).toBe(150);
      expect(result.lifetimePoints).toBe(550);
    });

    it('should redeem points from card', async () => {
      const input: AdjustPointsInput = {
        cardId: mockCardId,
        tenantId: mockTenantId,
        points: -30,
        type: 'REDEEM',
        description: 'Kedvezmény beváltás',
        createdBy: mockUserId,
      };

      vi.mocked(mockCardRepository.findById).mockResolvedValue(mockCard);
      vi.mocked(mockCardRepository.savePointTransaction).mockResolvedValue({
        id: '123',
        cardId: mockCardId,
        tenantId: mockTenantId,
        type: 'REDEEM',
        points: -30,
        balanceBefore: 100,
        balanceAfter: 70,
        description: 'Kedvezmény beváltás',
        createdAt: new Date(),
        createdBy: mockUserId,
      });
      vi.mocked(mockCardRepository.update).mockResolvedValue({ ...mockCard, points: 70 });

      const result = await service.adjustPoints(input);

      expect(result.points).toBe(70);
    });

    it('should throw error when not enough points to redeem', async () => {
      const input: AdjustPointsInput = {
        cardId: mockCardId,
        tenantId: mockTenantId,
        points: -200, // More than available
        type: 'REDEEM',
        description: 'Kedvezmény beváltás',
        createdBy: mockUserId,
      };

      vi.mocked(mockCardRepository.findById).mockResolvedValue(mockCard); // 100 points

      await expect(service.adjustPoints(input)).rejects.toThrow(
        'Nincs elegendő pont a beváltáshoz'
      );
    });

    it('should throw error for inactive card', async () => {
      const blockedCard = { ...mockCard, status: 'BLOCKED' as const };
      vi.mocked(mockCardRepository.findById).mockResolvedValue(blockedCard);

      await expect(
        service.adjustPoints({
          cardId: mockCardId,
          tenantId: mockTenantId,
          points: 50,
          type: 'EARN',
          description: 'Test',
          createdBy: mockUserId,
        })
      ).rejects.toThrow('Kártya nem aktív');
    });
  });

  describe('replaceCard()', () => {
    it('should replace lost card and transfer points', async () => {
      const input: ReplaceCardInput = {
        oldCardId: mockCardId,
        tenantId: mockTenantId,
        reason: 'LOST',
        transferPoints: true,
        createdBy: mockUserId,
      };

      const newCard: LoyaltyCard = {
        ...mockCard,
        id: '550e8400-e29b-41d4-a716-446655440099',
        cardNumber: 'KGC-2026-00001235',
        replacesId: mockCardId,
      };

      vi.mocked(mockCardRepository.findById).mockResolvedValue(mockCard);
      vi.mocked(mockCardRepository.cardNumberExists).mockResolvedValue(false);
      vi.mocked(mockCardRepository.setStatus).mockResolvedValue({
        ...mockCard,
        status: 'REPLACED',
        replacedById: newCard.id,
      });
      vi.mocked(mockCardRepository.issue).mockResolvedValue(newCard);

      const result = await service.replaceCard(input);

      expect(result.replacesId).toBe(mockCardId);
      expect(result.points).toBe(mockCard.points);
    });

    it('should upgrade card type on replacement', async () => {
      const input: ReplaceCardInput = {
        oldCardId: mockCardId,
        tenantId: mockTenantId,
        reason: 'UPGRADE',
        newType: 'GOLD',
        transferPoints: true,
        createdBy: mockUserId,
      };

      const upgradedCard: LoyaltyCard = {
        ...mockCard,
        id: '550e8400-e29b-41d4-a716-446655440099',
        type: 'GOLD',
        replacesId: mockCardId,
      };

      vi.mocked(mockCardRepository.findById).mockResolvedValue(mockCard);
      vi.mocked(mockCardRepository.cardNumberExists).mockResolvedValue(false);
      vi.mocked(mockCardRepository.setStatus).mockResolvedValue({
        ...mockCard,
        status: 'REPLACED',
      });
      vi.mocked(mockCardRepository.issue).mockResolvedValue(upgradedCard);

      const result = await service.replaceCard(input);

      expect(result.type).toBe('GOLD');
    });
  });

  describe('blockCard()', () => {
    it('should block active card', async () => {
      const blockedCard = { ...mockCard, status: 'BLOCKED' as const };
      vi.mocked(mockCardRepository.findById).mockResolvedValue(mockCard);
      vi.mocked(mockCardRepository.setStatus).mockResolvedValue(blockedCard);

      const result = await service.blockCard(mockCardId, mockTenantId);

      expect(result.status).toBe('BLOCKED');
    });

    it('should throw error when card not found', async () => {
      vi.mocked(mockCardRepository.findById).mockResolvedValue(null);

      await expect(service.blockCard('non-existent', mockTenantId)).rejects.toThrow(
        'Card not found'
      );
    });
  });

  describe('unblockCard()', () => {
    it('should unblock blocked card', async () => {
      const blockedCard = { ...mockCard, status: 'BLOCKED' as const };
      vi.mocked(mockCardRepository.findById).mockResolvedValue(blockedCard);
      vi.mocked(mockCardRepository.setStatus).mockResolvedValue(mockCard);

      const result = await service.unblockCard(mockCardId, mockTenantId);

      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('getPointHistory()', () => {
    it('should return point transaction history', async () => {
      const transactions = [
        {
          id: '1',
          cardId: mockCardId,
          tenantId: mockTenantId,
          type: 'EARN' as const,
          points: 50,
          balanceBefore: 50,
          balanceAfter: 100,
          description: 'Bérlés',
          createdAt: new Date(),
          createdBy: mockUserId,
        },
      ];

      vi.mocked(mockCardRepository.findById).mockResolvedValue(mockCard);
      vi.mocked(mockCardRepository.getPointTransactions).mockResolvedValue(transactions);

      const result = await service.getPointHistory(mockCardId, mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('EARN');
    });
  });

  describe('generateGreeting()', () => {
    it('should generate personalized greeting', () => {
      const greeting = service.generateGreeting(mockPartner);

      expect(greeting).toContain('Kovács');
      expect(greeting).toContain('Üdv');
    });

    it('should handle company partners', () => {
      const companyPartner: Partner = {
        ...mockPartner,
        type: 'COMPANY',
        name: 'Test Kft.',
      };

      const greeting = service.generateGreeting(companyPartner);

      expect(greeting).toContain('Test Kft.');
    });
  });
});
