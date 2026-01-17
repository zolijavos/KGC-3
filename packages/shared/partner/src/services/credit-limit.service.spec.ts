import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreditLimitService } from './credit-limit.service';
import {
  ICreditLimitRepository,
  CreditLimit,
  SetCreditLimitInput,
  ChargeInput,
  PaymentInput,
} from '../interfaces/credit-limit.interface';
import { IPartnerRepository, Partner } from '../interfaces/partner.interface';

describe('CreditLimitService', () => {
  let service: CreditLimitService;
  let mockRepository: ICreditLimitRepository;
  let mockPartnerRepository: IPartnerRepository;

  const mockTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440001';
  const mockPartnerId = '550e8400-e29b-41d4-a716-446655440002';

  const mockPartner: Partner = {
    id: mockPartnerId,
    tenantId: mockTenantId,
    type: 'COMPANY',
    status: 'ACTIVE',
    name: 'Test Kft.',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: mockUserId,
  };

  const mockCreditLimit: CreditLimit = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    partnerId: mockPartnerId,
    tenantId: mockTenantId,
    creditLimit: 500000,
    currentBalance: 100000,
    availableCredit: 400000,
    status: 'ACTIVE',
    warningThreshold: 80,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: mockUserId,
    approvedBy: mockUserId,
    approvedAt: new Date(),
  };

  beforeEach(() => {
    mockRepository = {
      upsert: vi.fn(),
      findByPartner: vi.fn(),
      update: vi.fn(),
      saveTransaction: vi.fn(),
      getTransactions: vi.fn(),
      setStatus: vi.fn(),
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

    service = new CreditLimitService(mockRepository, mockPartnerRepository);
  });

  describe('setCreditLimit()', () => {
    it('should set credit limit for partner', async () => {
      const input: SetCreditLimitInput = {
        partnerId: mockPartnerId,
        tenantId: mockTenantId,
        creditLimit: 500000,
        approvedBy: mockUserId,
      };

      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartner);
      vi.mocked(mockRepository.upsert).mockResolvedValue(mockCreditLimit);

      const result = await service.setCreditLimit(input);

      expect(result.creditLimit).toBe(500000);
      expect(result.status).toBe('ACTIVE');
    });

    it('should throw error when partner not found', async () => {
      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(null);

      await expect(
        service.setCreditLimit({
          partnerId: 'non-existent',
          tenantId: mockTenantId,
          creditLimit: 100000,
          approvedBy: mockUserId,
        })
      ).rejects.toThrow('Partner not found');
    });

    it('should validate credit limit is positive', async () => {
      vi.mocked(mockPartnerRepository.findById).mockResolvedValue(mockPartner);

      await expect(
        service.setCreditLimit({
          partnerId: mockPartnerId,
          tenantId: mockTenantId,
          creditLimit: -100000,
          approvedBy: mockUserId,
        })
      ).rejects.toThrow('Hitelkeret nem lehet negatív');
    });
  });

  describe('checkCredit()', () => {
    it('should allow charge within limit', async () => {
      vi.mocked(mockRepository.findByPartner).mockResolvedValue(mockCreditLimit);

      const result = await service.checkCredit(mockPartnerId, mockTenantId, 100000);

      expect(result.allowed).toBe(true);
      expect(result.availableCredit).toBe(400000);
      expect(result.newBalance).toBe(200000);
    });

    it('should deny charge exceeding limit', async () => {
      vi.mocked(mockRepository.findByPartner).mockResolvedValue(mockCreditLimit);

      const result = await service.checkCredit(mockPartnerId, mockTenantId, 500000);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('INSUFFICIENT');
    });

    it('should return warning when near limit', async () => {
      const nearLimitCredit = {
        ...mockCreditLimit,
        currentBalance: 420000,
        availableCredit: 80000,
      };
      vi.mocked(mockRepository.findByPartner).mockResolvedValue(nearLimitCredit);

      const result = await service.checkCredit(mockPartnerId, mockTenantId, 10000);

      expect(result.allowed).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning?.type).toBe('NEAR_LIMIT');
    });

    it('should deny when no credit limit exists', async () => {
      vi.mocked(mockRepository.findByPartner).mockResolvedValue(null);

      const result = await service.checkCredit(mockPartnerId, mockTenantId, 10000);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_CREDIT_LIMIT');
    });

    it('should deny when credit is suspended', async () => {
      const suspendedCredit = { ...mockCreditLimit, status: 'SUSPENDED' as const };
      vi.mocked(mockRepository.findByPartner).mockResolvedValue(suspendedCredit);

      const result = await service.checkCredit(mockPartnerId, mockTenantId, 10000);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('SUSPENDED');
    });
  });

  describe('charge()', () => {
    it('should charge partner and update balance', async () => {
      const input: ChargeInput = {
        partnerId: mockPartnerId,
        tenantId: mockTenantId,
        amount: 50000,
        description: 'Bérlési díj',
        createdBy: mockUserId,
      };

      vi.mocked(mockRepository.findByPartner).mockResolvedValue(mockCreditLimit);
      vi.mocked(mockRepository.saveTransaction).mockResolvedValue({
        id: '123',
        creditLimitId: mockCreditLimit.id,
        partnerId: mockPartnerId,
        tenantId: mockTenantId,
        type: 'CHARGE',
        amount: 50000,
        balanceBefore: 100000,
        balanceAfter: 150000,
        description: 'Bérlési díj',
        createdAt: new Date(),
        createdBy: mockUserId,
      });
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...mockCreditLimit,
        currentBalance: 150000,
        availableCredit: 350000,
      });

      const result = await service.charge(input);

      expect(result.currentBalance).toBe(150000);
    });

    it('should throw error when insufficient credit', async () => {
      vi.mocked(mockRepository.findByPartner).mockResolvedValue({
        ...mockCreditLimit,
        availableCredit: 10000,
      });

      await expect(
        service.charge({
          partnerId: mockPartnerId,
          tenantId: mockTenantId,
          amount: 50000,
          description: 'Test',
          createdBy: mockUserId,
        })
      ).rejects.toThrow('Nincs elegendő hitelkeret');
    });
  });

  describe('recordPayment()', () => {
    it('should record payment and reduce balance', async () => {
      const input: PaymentInput = {
        partnerId: mockPartnerId,
        tenantId: mockTenantId,
        amount: 30000,
        description: 'Befizetés',
        createdBy: mockUserId,
      };

      vi.mocked(mockRepository.findByPartner).mockResolvedValue(mockCreditLimit);
      vi.mocked(mockRepository.saveTransaction).mockResolvedValue({
        id: '123',
        creditLimitId: mockCreditLimit.id,
        partnerId: mockPartnerId,
        tenantId: mockTenantId,
        type: 'PAYMENT',
        amount: -30000,
        balanceBefore: 100000,
        balanceAfter: 70000,
        description: 'Befizetés',
        createdAt: new Date(),
        createdBy: mockUserId,
      });
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...mockCreditLimit,
        currentBalance: 70000,
        availableCredit: 430000,
      });

      const result = await service.recordPayment(input);

      expect(result.currentBalance).toBe(70000);
      expect(result.availableCredit).toBe(430000);
    });
  });

  describe('getCreditLimit()', () => {
    it('should return credit limit for partner', async () => {
      vi.mocked(mockRepository.findByPartner).mockResolvedValue(mockCreditLimit);

      const result = await service.getCreditLimit(mockPartnerId, mockTenantId);

      expect(result).toEqual(mockCreditLimit);
    });

    it('should return null when no credit limit', async () => {
      vi.mocked(mockRepository.findByPartner).mockResolvedValue(null);

      const result = await service.getCreditLimit(mockPartnerId, mockTenantId);

      expect(result).toBeNull();
    });
  });

  describe('suspendCredit()', () => {
    it('should suspend credit limit', async () => {
      vi.mocked(mockRepository.findByPartner).mockResolvedValue(mockCreditLimit);
      vi.mocked(mockRepository.setStatus).mockResolvedValue({
        ...mockCreditLimit,
        status: 'SUSPENDED',
      });

      const result = await service.suspendCredit(mockPartnerId, mockTenantId);

      expect(result.status).toBe('SUSPENDED');
    });
  });

  describe('reactivateCredit()', () => {
    it('should reactivate suspended credit', async () => {
      const suspendedCredit = { ...mockCreditLimit, status: 'SUSPENDED' as const };
      vi.mocked(mockRepository.findByPartner).mockResolvedValue(suspendedCredit);
      vi.mocked(mockRepository.setStatus).mockResolvedValue({
        ...suspendedCredit,
        status: 'ACTIVE',
      });

      const result = await service.reactivateCredit(mockPartnerId, mockTenantId);

      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('getTransactionHistory()', () => {
    it('should return transaction history', async () => {
      const transactions = [
        {
          id: '1',
          creditLimitId: mockCreditLimit.id,
          partnerId: mockPartnerId,
          tenantId: mockTenantId,
          type: 'CHARGE' as const,
          amount: 50000,
          balanceBefore: 50000,
          balanceAfter: 100000,
          description: 'Bérlés',
          createdAt: new Date(),
          createdBy: mockUserId,
        },
      ];

      vi.mocked(mockRepository.getTransactions).mockResolvedValue(transactions);

      const result = await service.getTransactionHistory(mockPartnerId, mockTenantId);

      expect(result).toHaveLength(1);
    });
  });

  describe('getWarningStatus()', () => {
    it('should return NEAR_LIMIT when usage is 80-99%', () => {
      const creditWithHighUsage = {
        ...mockCreditLimit,
        currentBalance: 450000, // 90% of 500000
      };

      const warning = service.getWarningStatus(creditWithHighUsage);

      expect(warning?.type).toBe('NEAR_LIMIT');
      expect(warning?.currentUsagePercent).toBe(90);
    });

    it('should return AT_LIMIT when usage is 100%', () => {
      const creditAtLimit = {
        ...mockCreditLimit,
        currentBalance: 500000,
        availableCredit: 0,
      };

      const warning = service.getWarningStatus(creditAtLimit);

      expect(warning?.type).toBe('AT_LIMIT');
    });

    it('should return null when usage is below threshold', () => {
      const creditLowUsage = {
        ...mockCreditLimit,
        currentBalance: 100000, // 20% of 500000
      };

      const warning = service.getWarningStatus(creditLowUsage);

      expect(warning).toBeNull();
    });

    it('should return null when credit limit is zero (prevent division by zero)', () => {
      const zeroCreditLimit = {
        ...mockCreditLimit,
        creditLimit: 0,
        currentBalance: 0,
        availableCredit: 0,
      };

      const warning = service.getWarningStatus(zeroCreditLimit);

      expect(warning).toBeNull();
    });
  });

  describe('charge() with status validation', () => {
    it('should throw error when credit is suspended', async () => {
      const suspendedCredit = { ...mockCreditLimit, status: 'SUSPENDED' as const };
      vi.mocked(mockRepository.findByPartner).mockResolvedValue(suspendedCredit);

      await expect(
        service.charge({
          partnerId: mockPartnerId,
          tenantId: mockTenantId,
          amount: 10000,
          description: 'Test',
          createdBy: mockUserId,
        })
      ).rejects.toThrow('Hitelkeret felfüggesztve');
    });

    it('should throw error when credit is inactive', async () => {
      const inactiveCredit = { ...mockCreditLimit, status: 'INACTIVE' as const };
      vi.mocked(mockRepository.findByPartner).mockResolvedValue(inactiveCredit);

      await expect(
        service.charge({
          partnerId: mockPartnerId,
          tenantId: mockTenantId,
          amount: 10000,
          description: 'Test',
          createdBy: mockUserId,
        })
      ).rejects.toThrow('Hitelkeret inaktív');
    });
  });

  describe('checkCredit() input validation', () => {
    it('should throw error when amount is zero', async () => {
      await expect(service.checkCredit(mockPartnerId, mockTenantId, 0)).rejects.toThrow(
        'Összeg pozitív kell legyen'
      );
    });

    it('should throw error when amount is negative', async () => {
      await expect(service.checkCredit(mockPartnerId, mockTenantId, -100)).rejects.toThrow(
        'Összeg pozitív kell legyen'
      );
    });
  });
});
