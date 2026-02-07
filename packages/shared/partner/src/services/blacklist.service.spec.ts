import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BlacklistEntry,
  CreateBlacklistInput,
  IBlacklistRepository,
} from '../interfaces/blacklist.interface';
import { IPartnerRepository, Partner } from '../interfaces/partner.interface';
import { BlacklistService } from './blacklist.service';

describe('BlacklistService', () => {
  let service: BlacklistService;
  let mockRepository: IBlacklistRepository;
  let mockPartnerRepository: IPartnerRepository;

  const mockTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440001';
  const mockPartnerId = '550e8400-e29b-41d4-a716-446655440002';

  const mockPartner: Partner = {
    id: mockPartnerId,
    tenantId: mockTenantId,
    type: 'INDIVIDUAL',
    status: 'ACTIVE',
    name: 'Kovács János',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: mockUserId,
  };

  const mockBlacklistEntry: BlacklistEntry = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    partnerId: mockPartnerId,
    tenantId: mockTenantId,
    reason: 'PAYMENT_DEFAULT',
    description: 'Fizetési késedelem - 30 napon túli',
    severity: 'WARNING',
    status: 'ACTIVE',
    amount: 150000,
    createdAt: new Date(),
    createdBy: mockUserId,
  };

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByPartner: vi.fn(),
      findActiveByPartner: vi.fn(),
      resolve: vi.fn(),
      isBlocked: vi.fn(),
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

    service = new BlacklistService(mockRepository, mockPartnerRepository);
  });

  describe('addToBlacklist()', () => {
    it('should add partner to blacklist with warning', async () => {
      const input: CreateBlacklistInput = {
        partnerId: mockPartnerId,
        tenantId: mockTenantId,
        reason: 'PAYMENT_DEFAULT',
        description: 'Fizetési késedelem',
        severity: 'WARNING',
        amount: 150000,
        createdBy: mockUserId,
      };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartner);
      vi.mocked(mockRepository.create).mockResolvedValue(mockBlacklistEntry);

      const result = await service.addToBlacklist(input);

      expect(result.reason).toBe('PAYMENT_DEFAULT');
      expect(result.severity).toBe('WARNING');
    });

    it('should throw error when partner not found', async () => {
      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(null);

      await expect(
        service.addToBlacklist({
          partnerId: 'non-existent',
          tenantId: mockTenantId,
          reason: 'PAYMENT_DEFAULT',
          description: 'Fizetési késedelem - teszt leírás',
          severity: 'WARNING',
          createdBy: mockUserId,
        })
      ).rejects.toThrow('Partner not found');
    });

    it('should throw error when description is too short', async () => {
      await expect(
        service.addToBlacklist({
          partnerId: mockPartnerId,
          tenantId: mockTenantId,
          reason: 'PAYMENT_DEFAULT',
          description: 'Short',
          severity: 'WARNING',
          createdBy: mockUserId,
        })
      ).rejects.toThrow('Leírás minimum 10 karakter');
    });

    it('should throw error when description is too long', async () => {
      await expect(
        service.addToBlacklist({
          partnerId: mockPartnerId,
          tenantId: mockTenantId,
          reason: 'PAYMENT_DEFAULT',
          description: 'A'.repeat(501),
          severity: 'WARNING',
          createdBy: mockUserId,
        })
      ).rejects.toThrow('Leírás maximum 500 karakter');
    });

    it('should sanitize HTML tags from description (M5 XSS fix)', async () => {
      const inputWithHtml: CreateBlacklistInput = {
        partnerId: mockPartnerId,
        tenantId: mockTenantId,
        reason: 'PAYMENT_DEFAULT',
        description: 'Fizetési <script>alert("xss")</script> késedelem',
        severity: 'WARNING',
        createdBy: mockUserId,
      };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartner);
      vi.mocked(mockRepository.create).mockImplementation(async input => ({
        ...mockBlacklistEntry,
        description: input.description,
      }));

      await service.addToBlacklist(inputWithHtml);

      // Verify sanitized description was passed to repository
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Fizetési alert("xss") késedelem',
        })
      );
    });

    it('should strip all HTML tags from description', async () => {
      const inputWithTags: CreateBlacklistInput = {
        partnerId: mockPartnerId,
        tenantId: mockTenantId,
        reason: 'DAMAGE_UNREPORTED',
        description: '<b>Bold</b> and <a href="test">link</a> and <img src="x">',
        severity: 'WARNING',
        createdBy: mockUserId,
      };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartner);
      vi.mocked(mockRepository.create).mockImplementation(async input => ({
        ...mockBlacklistEntry,
        description: input.description,
      }));

      await service.addToBlacklist(inputWithTags);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Bold and link and',
        })
      );
    });

    it('should update partner status to BLACKLISTED when blocked', async () => {
      const blockedInput: CreateBlacklistInput = {
        partnerId: mockPartnerId,
        tenantId: mockTenantId,
        reason: 'FRAUD_ATTEMPT',
        description: 'Csalási kísérlet',
        severity: 'BLOCKED',
        createdBy: mockUserId,
      };

      const blockedEntry = { ...mockBlacklistEntry, severity: 'BLOCKED' as const };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartner);
      vi.mocked(mockRepository.create).mockResolvedValue(blockedEntry);
      vi.mocked(mockPartnerRepository.update).mockResolvedValue({
        ...mockPartner,
        status: 'BLACKLISTED',
      });

      const result = await service.addToBlacklist(blockedInput);

      expect(result.severity).toBe('BLOCKED');
      expect(mockPartnerRepository.update).toHaveBeenCalledWith(
        mockPartnerId,
        mockTenantId,
        expect.objectContaining({ status: 'BLACKLISTED' })
      );
    });
  });

  describe('resolveEntry()', () => {
    it('should resolve blacklist entry', async () => {
      const resolvedEntry = {
        ...mockBlacklistEntry,
        status: 'RESOLVED' as const,
        resolvedAt: new Date(),
        resolvedBy: mockUserId,
        resolveNote: 'Tartozás rendezve',
      };

      vi.mocked(mockRepository.findById).mockResolvedValue(mockBlacklistEntry);
      vi.mocked(mockRepository.resolve).mockResolvedValue(resolvedEntry);
      vi.mocked(mockRepository.findActiveByPartner).mockResolvedValue([]);
      vi.mocked(mockPartnerRepository.findById).mockResolvedValue({
        ...mockPartner,
        status: 'BLACKLISTED',
      });
      vi.mocked(mockPartnerRepository.update).mockResolvedValue({
        ...mockPartner,
        status: 'ACTIVE',
      });

      const result = await service.resolveEntry(mockBlacklistEntry.id, mockTenantId, {
        resolvedBy: mockUserId,
        resolveNote: 'Tartozás rendezve',
      });

      expect(result.status).toBe('RESOLVED');
    });
  });

  describe('getWarnings()', () => {
    it('should return active warnings for partner', async () => {
      vi.mocked(mockRepository.findActiveByPartner).mockResolvedValue([mockBlacklistEntry]);
      vi.mocked(mockRepository.isBlocked).mockResolvedValue(false);

      const result = await service.getWarnings(mockPartnerId, mockTenantId);

      expect(result.hasActiveWarnings).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.totalDebt).toBe(150000);
    });

    it('should indicate blocked status', async () => {
      const blockedEntry = { ...mockBlacklistEntry, severity: 'BLOCKED' as const };
      vi.mocked(mockRepository.findActiveByPartner).mockResolvedValue([blockedEntry]);
      vi.mocked(mockRepository.isBlocked).mockResolvedValue(true);

      const result = await service.getWarnings(mockPartnerId, mockTenantId);

      expect(result.isBlocked).toBe(true);
    });

    it('should return empty warnings when no entries', async () => {
      vi.mocked(mockRepository.findActiveByPartner).mockResolvedValue([]);
      vi.mocked(mockRepository.isBlocked).mockResolvedValue(false);

      const result = await service.getWarnings(mockPartnerId, mockTenantId);

      expect(result.hasActiveWarnings).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('isBlocked()', () => {
    it('should return true when partner is blocked', async () => {
      vi.mocked(mockRepository.isBlocked).mockResolvedValue(true);

      const result = await service.isBlocked(mockPartnerId, mockTenantId);

      expect(result).toBe(true);
    });

    it('should return false when partner is not blocked', async () => {
      vi.mocked(mockRepository.isBlocked).mockResolvedValue(false);

      const result = await service.isBlocked(mockPartnerId, mockTenantId);

      expect(result).toBe(false);
    });
  });

  describe('getHistory()', () => {
    it('should return full blacklist history', async () => {
      const resolvedEntry = { ...mockBlacklistEntry, status: 'RESOLVED' as const };
      vi.mocked(mockRepository.findByPartner).mockResolvedValue([
        mockBlacklistEntry,
        resolvedEntry,
      ]);

      const result = await service.getHistory(mockPartnerId, mockTenantId);

      expect(result).toHaveLength(2);
    });
  });
});
