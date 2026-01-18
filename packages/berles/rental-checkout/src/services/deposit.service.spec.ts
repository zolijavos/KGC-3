/**
 * @kgc/rental-checkout - DepositService Unit Tests
 * Story 16-1: Kaució felvétel (készpénz/kártya)
 *
 * TDD RED PHASE - Ezek a tesztek FAILELNI fognak amíg nincs implementáció!
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateDepositDto } from '../dto/deposit.dto';
import {
  DepositPaymentMethod,
  DepositRetentionReason,
  DepositStatus,
  IDeposit,
} from '../interfaces/deposit.interface';
import { DepositService } from './deposit.service';

// Mock dependencies
const mockDepositRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByRentalId: vi.fn(),
  update: vi.fn(),
};

const mockRentalService = {
  findById: vi.fn(),
  isActive: vi.fn(),
};

const mockPartnerService = {
  findById: vi.fn(),
  isRegularCustomer: vi.fn(),
};

const mockAuditService = {
  log: vi.fn(),
};

describe('DepositService', () => {
  let service: DepositService;

  const mockTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = '660e8400-e29b-41d4-a716-446655440001';
  const mockRentalId = '770e8400-e29b-41d4-a716-446655440002';
  const mockPartnerId = '880e8400-e29b-41d4-a716-446655440003';

  beforeEach(() => {
    vi.clearAllMocks();

    service = new DepositService(
      mockDepositRepository as any,
      mockRentalService as any,
      mockPartnerService as any,
      mockAuditService as any
    );

    // Default mock returns
    mockRentalService.findById.mockResolvedValue({
      id: mockRentalId,
      tenantId: mockTenantId,
      status: 'active',
      equipmentValue: 500000, // 500.000 Ft bérgép érték
    });

    mockRentalService.isActive.mockResolvedValue(true);

    mockPartnerService.findById.mockResolvedValue({
      id: mockPartnerId,
      tenantId: mockTenantId,
      name: 'Teszt Partner',
    });

    mockPartnerService.isRegularCustomer.mockResolvedValue(false);

    // Default: no existing deposit for rental
    mockDepositRepository.findByRentalId.mockResolvedValue(null);
  });

  // ============================================
  // AC1: Kaució összeg meghatározása
  // ============================================
  describe('calculateSuggestedAmount()', () => {
    describe('happy path', () => {
      it('should suggest deposit based on equipment value (10%)', async () => {
        // Arrange - equipment value set in mock: 500.000 Ft → 10% = 50.000 Ft

        // Act
        const result = await service.calculateSuggestedAmount(
          mockRentalId,
          mockPartnerId,
          mockTenantId
        );

        // Assert
        expect(result.suggestedAmount).toBe(50000); // 10% = 50.000 Ft
        expect(result.depositRequired).toBe(true);
        expect(result.regularCustomerDiscount).toBe(false);
      });

      it('should return 0 deposit for regular customers', async () => {
        // Arrange
        mockPartnerService.isRegularCustomer.mockResolvedValue(true);

        // Act
        const result = await service.calculateSuggestedAmount(
          mockRentalId,
          mockPartnerId,
          mockTenantId
        );

        // Assert
        expect(result.suggestedAmount).toBe(0);
        expect(result.depositRequired).toBe(false);
        expect(result.regularCustomerDiscount).toBe(true);
        expect(result.reason.toLowerCase()).toContain('törzsvevő');
      });

      it('should round deposit to nearest 1000 HUF', async () => {
        // Arrange
        mockRentalService.findById.mockResolvedValue({
          id: mockRentalId,
          tenantId: mockTenantId,
          status: 'active',
          equipmentValue: 123456, // 10% = 12345.6 → 12000 Ft
        });

        // Act
        const result = await service.calculateSuggestedAmount(
          mockRentalId,
          mockPartnerId,
          mockTenantId
        );

        // Assert
        expect(result.suggestedAmount).toBe(12000);
      });
    });

    describe('edge cases', () => {
      it('should return minimum 5000 Ft deposit for any rental', async () => {
        // Arrange
        mockRentalService.findById.mockResolvedValue({
          id: mockRentalId,
          tenantId: mockTenantId,
          status: 'active',
          equipmentValue: 10000, // 10% = 1000 Ft, de minimum 5000
        });

        // Act
        const result = await service.calculateSuggestedAmount(
          mockRentalId,
          mockPartnerId,
          mockTenantId
        );

        // Assert
        expect(result.suggestedAmount).toBe(5000); // Minimum kaució
      });

      it('should cap deposit at 500000 Ft maximum', async () => {
        // Arrange
        mockRentalService.findById.mockResolvedValue({
          id: mockRentalId,
          tenantId: mockTenantId,
          status: 'active',
          equipmentValue: 10000000, // 10% = 1.000.000 Ft, de max 500.000
        });

        // Act
        const result = await service.calculateSuggestedAmount(
          mockRentalId,
          mockPartnerId,
          mockTenantId
        );

        // Assert
        expect(result.suggestedAmount).toBe(500000); // Maximum kaució
      });

      it('should throw error for non-existent rental', async () => {
        // Arrange
        mockRentalService.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.calculateSuggestedAmount(mockRentalId, mockPartnerId, mockTenantId)
        ).rejects.toThrow('Bérlés nem található');
      });
    });
  });

  // ============================================
  // AC2: Készpénzes kaució felvétel
  // ============================================
  describe('collect() - Cash payment', () => {
    const validCashInput: CreateDepositDto = {
      rentalId: '770e8400-e29b-41d4-a716-446655440002',
      partnerId: '880e8400-e29b-41d4-a716-446655440003',
      amount: 50000,
      paymentMethod: DepositPaymentMethod.CASH,
    };

    describe('happy path', () => {
      it('should collect cash deposit successfully', async () => {
        // Arrange
        const expectedDeposit: Partial<IDeposit> = {
          id: expect.any(String),
          tenantId: mockTenantId,
          rentalId: mockRentalId,
          partnerId: mockPartnerId,
          amount: 50000,
          status: DepositStatus.COLLECTED,
          paymentMethod: DepositPaymentMethod.CASH,
        };

        mockDepositRepository.create.mockResolvedValue({
          ...expectedDeposit,
          id: '990e8400-e29b-41d4-a716-446655440004',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: mockUserId,
        });

        // Act
        const result = await service.collect(validCashInput, mockTenantId, mockUserId);

        // Assert
        expect(result.status).toBe(DepositStatus.COLLECTED);
        expect(result.paymentMethod).toBe(DepositPaymentMethod.CASH);
        expect(result.amount).toBe(50000);
      });

      it('should create audit log for cash deposit', async () => {
        // Arrange
        mockDepositRepository.create.mockResolvedValue({
          id: '990e8400-e29b-41d4-a716-446655440004',
          status: DepositStatus.COLLECTED,
        });

        // Act
        await service.collect(validCashInput, mockTenantId, mockUserId);

        // Assert
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'deposit_collected',
            entityType: 'deposit',
            userId: mockUserId,
            tenantId: mockTenantId,
          })
        );
      });
    });

    describe('error handling', () => {
      it('should throw error for inactive rental', async () => {
        // Arrange
        mockRentalService.isActive.mockResolvedValue(false);

        // Act & Assert
        await expect(service.collect(validCashInput, mockTenantId, mockUserId)).rejects.toThrow(
          'Bérlés nem aktív'
        );
      });

      it('should throw error if deposit already exists for rental', async () => {
        // Arrange
        mockDepositRepository.findByRentalId.mockResolvedValue({
          id: 'existing-deposit',
          status: DepositStatus.COLLECTED,
        });

        // Act & Assert
        await expect(service.collect(validCashInput, mockTenantId, mockUserId)).rejects.toThrow(
          'Már létezik kaució ehhez a bérléshez'
        );
      });
    });
  });

  // ============================================
  // AC3: Bankkártyás kaució felvétel
  // ============================================
  describe('collect() - Card payment', () => {
    const validCardInput: CreateDepositDto = {
      rentalId: '770e8400-e29b-41d4-a716-446655440002',
      partnerId: '880e8400-e29b-41d4-a716-446655440003',
      amount: 50000,
      paymentMethod: DepositPaymentMethod.CARD,
    };

    describe('happy path', () => {
      it('should collect card deposit successfully', async () => {
        // Arrange
        mockDepositRepository.create.mockResolvedValue({
          id: '990e8400-e29b-41d4-a716-446655440004',
          tenantId: mockTenantId,
          rentalId: mockRentalId,
          partnerId: mockPartnerId,
          amount: 50000,
          status: DepositStatus.COLLECTED,
          paymentMethod: DepositPaymentMethod.CARD,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: mockUserId,
        });

        // Act
        const result = await service.collect(validCardInput, mockTenantId, mockUserId);

        // Assert
        expect(result.status).toBe(DepositStatus.COLLECTED);
        expect(result.paymentMethod).toBe(DepositPaymentMethod.CARD);
      });

      it('should store transaction ID for card payment', async () => {
        // Arrange
        const inputWithTransactionId = {
          ...validCardInput,
          notes: 'Transaction: TRX-123456',
        };

        mockDepositRepository.create.mockImplementation(data =>
          Promise.resolve({
            ...data,
            id: '990e8400-e29b-41d4-a716-446655440004',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        );

        // Act
        await service.collect(inputWithTransactionId, mockTenantId, mockUserId);

        // Assert
        expect(mockDepositRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethod: DepositPaymentMethod.CARD,
          })
        );
      });
    });
  });

  // ============================================
  // AC4: Validációk
  // ============================================
  describe('validation', () => {
    it('should reject negative deposit amount', async () => {
      // Arrange
      const invalidInput: CreateDepositDto = {
        rentalId: mockRentalId,
        partnerId: mockPartnerId,
        amount: -1000,
        paymentMethod: DepositPaymentMethod.CASH,
      };

      // Act & Assert
      await expect(service.collect(invalidInput, mockTenantId, mockUserId)).rejects.toThrow(
        'Kaució összeg nem lehet negatív'
      );
    });

    it('should reject deposit over 1.000.000 Ft', async () => {
      // Arrange
      const invalidInput: CreateDepositDto = {
        rentalId: mockRentalId,
        partnerId: mockPartnerId,
        amount: 1500000, // 1.5M Ft
        paymentMethod: DepositPaymentMethod.CASH,
      };

      // Act & Assert
      await expect(service.collect(invalidInput, mockTenantId, mockUserId)).rejects.toThrow(
        'Kaució összeg maximum 1.000.000 Ft'
      );
    });

    it('should accept 0 Ft deposit for regular customers', async () => {
      // Arrange
      mockPartnerService.isRegularCustomer.mockResolvedValue(true);

      const zeroDepositInput: CreateDepositDto = {
        rentalId: mockRentalId,
        partnerId: mockPartnerId,
        amount: 0,
        paymentMethod: DepositPaymentMethod.CASH,
      };

      mockDepositRepository.create.mockResolvedValue({
        id: '990e8400-e29b-41d4-a716-446655440004',
        amount: 0,
        status: DepositStatus.COLLECTED,
      });

      // Act
      const result = await service.collect(zeroDepositInput, mockTenantId, mockUserId);

      // Assert
      expect(result.amount).toBe(0);
      expect(result.status).toBe(DepositStatus.COLLECTED);
    });

    it('should reject invalid rental ID format', async () => {
      // Arrange
      const invalidInput: CreateDepositDto = {
        rentalId: 'not-a-uuid',
        partnerId: mockPartnerId,
        amount: 50000,
        paymentMethod: DepositPaymentMethod.CASH,
      };

      // Act & Assert
      await expect(service.collect(invalidInput, mockTenantId, mockUserId)).rejects.toThrow(
        'Érvénytelen bérlés azonosító'
      );
    });

    it('should reject non-existent partner', async () => {
      // Arrange
      mockPartnerService.findById.mockResolvedValue(null);

      const validInput: CreateDepositDto = {
        rentalId: mockRentalId,
        partnerId: mockPartnerId,
        amount: 50000,
        paymentMethod: DepositPaymentMethod.CASH,
      };

      // Act & Assert
      await expect(service.collect(validInput, mockTenantId, mockUserId)).rejects.toThrow(
        'Partner nem található'
      );
    });
  });

  // ============================================
  // AC5: Audit trail
  // ============================================
  describe('audit trail', () => {
    it('should log deposit creation with all required fields', async () => {
      // Arrange
      const validInput: CreateDepositDto = {
        rentalId: mockRentalId,
        partnerId: mockPartnerId,
        amount: 50000,
        paymentMethod: DepositPaymentMethod.CASH,
      };

      mockDepositRepository.create.mockResolvedValue({
        id: '990e8400-e29b-41d4-a716-446655440004',
        status: DepositStatus.COLLECTED,
      });

      // Act
      await service.collect(validInput, mockTenantId, mockUserId);

      // Assert
      expect(mockAuditService.log).toHaveBeenCalledWith({
        action: 'deposit_collected',
        entityType: 'deposit',
        entityId: '990e8400-e29b-41d4-a716-446655440004',
        userId: mockUserId,
        tenantId: mockTenantId,
        metadata: expect.objectContaining({
          amount: 50000,
          paymentMethod: DepositPaymentMethod.CASH,
          rentalId: mockRentalId,
          partnerId: mockPartnerId,
        }),
      });
    });

    it('should be tenant-isolated (no cross-tenant access)', async () => {
      // Arrange
      const differentTenantId = 'different-tenant-id';
      mockRentalService.findById.mockResolvedValue({
        id: mockRentalId,
        tenantId: differentTenantId, // Different tenant!
        status: 'active',
      });

      const validInput: CreateDepositDto = {
        rentalId: mockRentalId,
        partnerId: mockPartnerId,
        amount: 50000,
        paymentMethod: DepositPaymentMethod.CASH,
      };

      // Act & Assert
      await expect(service.collect(validInput, mockTenantId, mockUserId)).rejects.toThrow(
        'Hozzáférés megtagadva'
      );
    });
  });

  // ============================================
  // Property-based test scenarios (összeg kalkuláció)
  // ============================================
  describe('property-based: deposit calculation', () => {
    it('suggested amount should never be negative', async () => {
      // Test with various equipment values
      const testValues = [0, 100, 1000, 10000, 100000, 1000000, 10000000];

      for (const value of testValues) {
        mockRentalService.findById.mockResolvedValue({
          id: mockRentalId,
          tenantId: mockTenantId,
          status: 'active',
          equipmentValue: value,
        });

        const result = await service.calculateSuggestedAmount(
          mockRentalId,
          mockPartnerId,
          mockTenantId
        );

        expect(result.suggestedAmount).toBeGreaterThanOrEqual(0);
      }
    });

    it('suggested amount should never exceed maximum (500.000 Ft)', async () => {
      // Test with very high equipment values
      const highValues = [5000000, 10000000, 50000000, 100000000];

      for (const value of highValues) {
        mockRentalService.findById.mockResolvedValue({
          id: mockRentalId,
          tenantId: mockTenantId,
          status: 'active',
          equipmentValue: value,
        });

        const result = await service.calculateSuggestedAmount(
          mockRentalId,
          mockPartnerId,
          mockTenantId
        );

        expect(result.suggestedAmount).toBeLessThanOrEqual(500000);
      }
    });

    it('suggested amount should be divisible by 1000 (rounding)', async () => {
      const testValues = [12345, 67890, 123456, 999999];

      for (const value of testValues) {
        mockRentalService.findById.mockResolvedValue({
          id: mockRentalId,
          tenantId: mockTenantId,
          status: 'active',
          equipmentValue: value,
        });

        const result = await service.calculateSuggestedAmount(
          mockRentalId,
          mockPartnerId,
          mockTenantId
        );

        expect(result.suggestedAmount % 1000).toBe(0);
      }
    });
  });

  // ============================================
  // Additional methods: findById, findByRentalId
  // ============================================
  describe('findById()', () => {
    it('should return deposit when found with matching tenant', async () => {
      // Arrange
      const mockDeposit: IDeposit = {
        id: '990e8400-e29b-41d4-a716-446655440004',
        tenantId: mockTenantId,
        rentalId: mockRentalId,
        partnerId: mockPartnerId,
        amount: 50000,
        status: DepositStatus.COLLECTED,
        paymentMethod: DepositPaymentMethod.CASH,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: mockUserId,
      };
      mockDepositRepository.findById.mockResolvedValue(mockDeposit);

      // Act
      const result = await service.findById(mockDeposit.id, mockTenantId);

      // Assert
      expect(result).toEqual(mockDeposit);
    });

    it('should return null when deposit not found', async () => {
      // Arrange
      mockDepositRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.findById('non-existent-id', mockTenantId);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when tenant mismatch', async () => {
      // Arrange
      const mockDeposit: IDeposit = {
        id: '990e8400-e29b-41d4-a716-446655440004',
        tenantId: 'different-tenant-id',
        rentalId: mockRentalId,
        partnerId: mockPartnerId,
        amount: 50000,
        status: DepositStatus.COLLECTED,
        paymentMethod: DepositPaymentMethod.CASH,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: mockUserId,
      };
      mockDepositRepository.findById.mockResolvedValue(mockDeposit);

      // Act
      const result = await service.findById(mockDeposit.id, mockTenantId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByRentalId()', () => {
    it('should return deposit when found', async () => {
      // Arrange
      const mockDeposit: IDeposit = {
        id: '990e8400-e29b-41d4-a716-446655440004',
        tenantId: mockTenantId,
        rentalId: mockRentalId,
        partnerId: mockPartnerId,
        amount: 50000,
        status: DepositStatus.COLLECTED,
        paymentMethod: DepositPaymentMethod.CASH,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: mockUserId,
      };
      mockDepositRepository.findByRentalId.mockResolvedValue(mockDeposit);

      // Act
      const result = await service.findByRentalId(mockRentalId, mockTenantId);

      // Assert
      expect(result).toEqual(mockDeposit);
      expect(mockDepositRepository.findByRentalId).toHaveBeenCalledWith(mockRentalId, mockTenantId);
    });

    it('should return null when no deposit for rental', async () => {
      // Arrange
      mockDepositRepository.findByRentalId.mockResolvedValue(null);

      // Act
      const result = await service.findByRentalId(mockRentalId, mockTenantId);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================
  // STORY 16-3: Kaució visszaadás (release)
  // ============================================
  describe('release()', () => {
    const mockDepositId = '990e8400-e29b-41d4-a716-446655440004';

    const mockCollectedDeposit: IDeposit = {
      id: mockDepositId,
      tenantId: mockTenantId,
      rentalId: mockRentalId,
      partnerId: mockPartnerId,
      amount: 50000,
      status: DepositStatus.COLLECTED,
      paymentMethod: DepositPaymentMethod.CASH,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: mockUserId,
    };

    beforeEach(() => {
      mockDepositRepository.findById.mockResolvedValue(mockCollectedDeposit);
    });

    describe('AC1: Készpénz visszaadás', () => {
      it('should release cash deposit successfully', async () => {
        // Arrange
        mockDepositRepository.update.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.RELEASED,
          updatedAt: new Date(),
        });

        // Act
        const result = await service.release(mockDepositId, mockTenantId, mockUserId);

        // Assert
        expect(result.status).toBe(DepositStatus.RELEASED);
        expect(mockDepositRepository.update).toHaveBeenCalledWith(
          mockDepositId,
          expect.objectContaining({
            status: DepositStatus.RELEASED,
          })
        );
      });

      it('should create audit log for cash release', async () => {
        // Arrange
        mockDepositRepository.update.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.RELEASED,
        });

        // Act
        await service.release(mockDepositId, mockTenantId, mockUserId);

        // Assert
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'deposit_released',
            entityType: 'deposit',
            entityId: mockDepositId,
            userId: mockUserId,
            tenantId: mockTenantId,
            metadata: expect.objectContaining({
              releasedAmount: 50000,
              previousStatus: DepositStatus.COLLECTED,
            }),
          })
        );
      });
    });

    describe('AC2: Kártyás zárolás feloldás (MyPOS)', () => {
      const mockHeldDeposit: IDeposit = {
        ...mockCollectedDeposit,
        status: DepositStatus.HELD,
        paymentMethod: DepositPaymentMethod.MYPOS_PREAUTH,
        myposTransactionId: 'mypos-txn-12345',
      };

      it('should release MyPOS held deposit successfully', async () => {
        // Arrange
        mockDepositRepository.findById.mockResolvedValue(mockHeldDeposit);
        mockDepositRepository.update.mockResolvedValue({
          ...mockHeldDeposit,
          status: DepositStatus.RELEASED,
        });

        // Act
        const result = await service.release(mockDepositId, mockTenantId, mockUserId);

        // Assert
        expect(result.status).toBe(DepositStatus.RELEASED);
      });

      it('should include MyPOS transaction ID in audit log', async () => {
        // Arrange
        mockDepositRepository.findById.mockResolvedValue(mockHeldDeposit);
        mockDepositRepository.update.mockResolvedValue({
          ...mockHeldDeposit,
          status: DepositStatus.RELEASED,
        });

        // Act
        await service.release(mockDepositId, mockTenantId, mockUserId);

        // Assert
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              myposTransactionId: 'mypos-txn-12345',
            }),
          })
        );
      });
    });

    describe('AC3: Részleges visszaadás', () => {
      it('should release partial amount with retention', async () => {
        // Arrange
        const retainedAmount = 10000; // 10.000 Ft visszatartás
        mockDepositRepository.update.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.PARTIALLY_RETAINED,
          updatedAt: new Date(),
        });

        // Act
        const result = await service.releasePartial(
          mockDepositId,
          retainedAmount,
          'Sérülés: karcolás a gépen',
          mockTenantId,
          mockUserId
        );

        // Assert
        expect(result.status).toBe(DepositStatus.PARTIALLY_RETAINED);
        expect(mockDepositRepository.update).toHaveBeenCalledWith(
          mockDepositId,
          expect.objectContaining({
            status: DepositStatus.PARTIALLY_RETAINED,
          })
        );
      });

      it('should require description for partial release', async () => {
        // Arrange & Act & Assert
        await expect(
          service.releasePartial(mockDepositId, 10000, '', mockTenantId, mockUserId)
        ).rejects.toThrow('Indoklás kötelező részleges visszatartás esetén');
      });

      it('should reject if retained amount exceeds deposit', async () => {
        // Arrange & Act & Assert
        await expect(
          service.releasePartial(mockDepositId, 60000, 'Sérülés', mockTenantId, mockUserId)
        ).rejects.toThrow('Visszatartott összeg nem lehet nagyobb mint a kaució');
      });
    });

    describe('AC4: Validációk', () => {
      it('should only allow release for COLLECTED status', async () => {
        // Arrange
        mockDepositRepository.findById.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.RELEASED, // Already released
        });

        // Act & Assert
        await expect(service.release(mockDepositId, mockTenantId, mockUserId)).rejects.toThrow(
          'Kaució nem adható vissza'
        );
      });

      it('should only allow release for HELD status', async () => {
        // Arrange
        mockDepositRepository.findById.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.HELD,
        });
        mockDepositRepository.update.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.RELEASED,
        });

        // Act
        const result = await service.release(mockDepositId, mockTenantId, mockUserId);

        // Assert
        expect(result.status).toBe(DepositStatus.RELEASED);
      });

      it('should reject release for PENDING status', async () => {
        // Arrange
        mockDepositRepository.findById.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.PENDING,
        });

        // Act & Assert
        await expect(service.release(mockDepositId, mockTenantId, mockUserId)).rejects.toThrow(
          'Kaució nem adható vissza'
        );
      });

      it('should reject release for non-existent deposit', async () => {
        // Arrange
        mockDepositRepository.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(service.release(mockDepositId, mockTenantId, mockUserId)).rejects.toThrow(
          'Kaució nem található'
        );
      });

      it('should reject cross-tenant release attempt', async () => {
        // Arrange
        const differentTenantId = 'different-tenant-id';

        // Act & Assert
        await expect(service.release(mockDepositId, differentTenantId, mockUserId)).rejects.toThrow(
          'Kaució nem található'
        );
      });
    });

    describe('AC5: Audit trail', () => {
      it('should log release with all required fields', async () => {
        // Arrange
        mockDepositRepository.update.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.RELEASED,
        });

        // Act
        await service.release(mockDepositId, mockTenantId, mockUserId);

        // Assert
        expect(mockAuditService.log).toHaveBeenCalledWith({
          action: 'deposit_released',
          entityType: 'deposit',
          entityId: mockDepositId,
          userId: mockUserId,
          tenantId: mockTenantId,
          metadata: {
            releasedAmount: 50000,
            previousStatus: DepositStatus.COLLECTED,
            paymentMethod: DepositPaymentMethod.CASH,
            myposTransactionId: undefined,
          },
        });
      });
    });
  });

  // ============================================
  // STORY 16-4: Kaució visszatartás sérülés
  // ============================================
  describe('retain()', () => {
    const mockDepositId = '990e8400-e29b-41d4-a716-446655440004';

    const mockCollectedDeposit: IDeposit = {
      id: mockDepositId,
      tenantId: mockTenantId,
      rentalId: mockRentalId,
      partnerId: mockPartnerId,
      amount: 50000,
      status: DepositStatus.COLLECTED,
      paymentMethod: DepositPaymentMethod.CASH,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: mockUserId,
    };

    beforeEach(() => {
      mockDepositRepository.findById.mockResolvedValue(mockCollectedDeposit);
    });

    describe('AC1: Teljes visszatartás', () => {
      it('should retain full deposit for equipment damage', async () => {
        // Arrange
        mockDepositRepository.update.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.RETAINED,
        });

        // Act
        const result = await service.retain(
          mockDepositId,
          DepositRetentionReason.EQUIPMENT_DAMAGE,
          'Súlyos sérülés: motor tönkrement',
          mockTenantId,
          mockUserId
        );

        // Assert
        expect(result.status).toBe(DepositStatus.RETAINED);
        expect(mockDepositRepository.update).toHaveBeenCalledWith(
          mockDepositId,
          expect.objectContaining({
            status: DepositStatus.RETAINED,
          })
        );
      });

      it('should retain full deposit for equipment lost', async () => {
        // Arrange
        mockDepositRepository.update.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.RETAINED,
        });

        // Act
        const result = await service.retain(
          mockDepositId,
          DepositRetentionReason.EQUIPMENT_LOST,
          'Bérgép elveszett',
          mockTenantId,
          mockUserId
        );

        // Assert
        expect(result.status).toBe(DepositStatus.RETAINED);
      });

      it('should require description for retention', async () => {
        // Act & Assert
        await expect(
          service.retain(
            mockDepositId,
            DepositRetentionReason.EQUIPMENT_DAMAGE,
            '',
            mockTenantId,
            mockUserId
          )
        ).rejects.toThrow('Leírás kötelező');
      });
    });

    describe('AC2: Részleges visszatartás (retainPartial)', () => {
      it('should retain partial amount for minor damage', async () => {
        // Arrange
        const retainedAmount = 20000;
        mockDepositRepository.update.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.PARTIALLY_RETAINED,
        });

        // Act
        const result = await service.retainPartial(
          mockDepositId,
          retainedAmount,
          DepositRetentionReason.EQUIPMENT_DAMAGE,
          'Kisebb karcolás a burkolaton',
          mockTenantId,
          mockUserId
        );

        // Assert
        expect(result.status).toBe(DepositStatus.PARTIALLY_RETAINED);
      });

      it('should reject if retained amount exceeds deposit', async () => {
        // Act & Assert
        await expect(
          service.retainPartial(
            mockDepositId,
            60000, // More than 50000 deposit
            DepositRetentionReason.EQUIPMENT_DAMAGE,
            'Sérülés',
            mockTenantId,
            mockUserId
          )
        ).rejects.toThrow('Visszatartott összeg nem lehet nagyobb mint a kaució');
      });

      it('should reject negative retained amount', async () => {
        // Act & Assert
        await expect(
          service.retainPartial(
            mockDepositId,
            -5000,
            DepositRetentionReason.EQUIPMENT_DAMAGE,
            'Sérülés',
            mockTenantId,
            mockUserId
          )
        ).rejects.toThrow('Visszatartott összeg nem lehet negatív');
      });
    });

    describe('AC3: MyPOS capture (kártyás visszatartás)', () => {
      const mockHeldDeposit: IDeposit = {
        ...mockCollectedDeposit,
        status: DepositStatus.HELD,
        paymentMethod: DepositPaymentMethod.MYPOS_PREAUTH,
        myposTransactionId: 'mypos-txn-12345',
      };

      it('should retain from HELD status (MyPOS capture)', async () => {
        // Arrange
        mockDepositRepository.findById.mockResolvedValue(mockHeldDeposit);
        mockDepositRepository.update.mockResolvedValue({
          ...mockHeldDeposit,
          status: DepositStatus.RETAINED,
        });

        // Act
        const result = await service.retain(
          mockDepositId,
          DepositRetentionReason.EQUIPMENT_DAMAGE,
          'Sérülés - MyPOS capture szükséges',
          mockTenantId,
          mockUserId
        );

        // Assert
        expect(result.status).toBe(DepositStatus.RETAINED);
      });

      it('should include MyPOS transaction ID in audit for capture', async () => {
        // Arrange
        mockDepositRepository.findById.mockResolvedValue(mockHeldDeposit);
        mockDepositRepository.update.mockResolvedValue({
          ...mockHeldDeposit,
          status: DepositStatus.RETAINED,
        });

        // Act
        await service.retain(
          mockDepositId,
          DepositRetentionReason.EQUIPMENT_DAMAGE,
          'Sérülés',
          mockTenantId,
          mockUserId
        );

        // Assert
        expect(mockAuditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              myposTransactionId: 'mypos-txn-12345',
            }),
          })
        );
      });
    });

    describe('AC4: Visszatartási okok (retention reasons)', () => {
      it.each([
        [DepositRetentionReason.EQUIPMENT_DAMAGE, 'Bérgép sérülés'],
        [DepositRetentionReason.EQUIPMENT_LOST, 'Bérgép elvesztése'],
        [DepositRetentionReason.LATE_FEE, 'Késedelmi díj'],
        [DepositRetentionReason.CLEANING_FEE, 'Tisztítási díj'],
        [DepositRetentionReason.OTHER, 'Egyéb ok'],
      ])('should accept retention reason: %s', async (reason, description) => {
        // Arrange
        mockDepositRepository.update.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.RETAINED,
        });

        // Act
        const result = await service.retain(
          mockDepositId,
          reason,
          description,
          mockTenantId,
          mockUserId
        );

        // Assert
        expect(result.status).toBe(DepositStatus.RETAINED);
      });
    });

    describe('AC5: Validációk', () => {
      it('should only allow retention for COLLECTED status', async () => {
        // Arrange
        mockDepositRepository.findById.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.RELEASED, // Already released
        });

        // Act & Assert
        await expect(
          service.retain(
            mockDepositId,
            DepositRetentionReason.EQUIPMENT_DAMAGE,
            'Sérülés',
            mockTenantId,
            mockUserId
          )
        ).rejects.toThrow('Kaució nem tartható vissza');
      });

      it('should allow retention for HELD status', async () => {
        // Arrange
        mockDepositRepository.findById.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.HELD,
        });
        mockDepositRepository.update.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.RETAINED,
        });

        // Act
        const result = await service.retain(
          mockDepositId,
          DepositRetentionReason.EQUIPMENT_DAMAGE,
          'Sérülés',
          mockTenantId,
          mockUserId
        );

        // Assert
        expect(result.status).toBe(DepositStatus.RETAINED);
      });

      it('should reject retention for non-existent deposit', async () => {
        // Arrange
        mockDepositRepository.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.retain(
            mockDepositId,
            DepositRetentionReason.EQUIPMENT_DAMAGE,
            'Sérülés',
            mockTenantId,
            mockUserId
          )
        ).rejects.toThrow('Kaució nem található');
      });

      it('should reject cross-tenant retention attempt', async () => {
        // Arrange
        const differentTenantId = 'different-tenant-id';

        // Act & Assert
        await expect(
          service.retain(
            mockDepositId,
            DepositRetentionReason.EQUIPMENT_DAMAGE,
            'Sérülés',
            differentTenantId,
            mockUserId
          )
        ).rejects.toThrow('Kaució nem található');
      });
    });

    describe('Audit trail', () => {
      it('should log retention with all required fields', async () => {
        // Arrange
        mockDepositRepository.update.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.RETAINED,
        });

        // Act
        await service.retain(
          mockDepositId,
          DepositRetentionReason.EQUIPMENT_DAMAGE,
          'Motor tönkrement a túlterhelés miatt',
          mockTenantId,
          mockUserId
        );

        // Assert
        expect(mockAuditService.log).toHaveBeenCalledWith({
          action: 'deposit_retained',
          entityType: 'deposit',
          entityId: mockDepositId,
          userId: mockUserId,
          tenantId: mockTenantId,
          metadata: {
            retainedAmount: 50000,
            reason: DepositRetentionReason.EQUIPMENT_DAMAGE,
            description: 'Motor tönkrement a túlterhelés miatt',
            previousStatus: DepositStatus.COLLECTED,
            paymentMethod: DepositPaymentMethod.CASH,
            myposTransactionId: undefined,
          },
        });
      });

      it('should log partial retention with amounts', async () => {
        // Arrange
        mockDepositRepository.update.mockResolvedValue({
          ...mockCollectedDeposit,
          status: DepositStatus.PARTIALLY_RETAINED,
        });

        // Act
        await service.retainPartial(
          mockDepositId,
          15000,
          DepositRetentionReason.CLEANING_FEE,
          'Olajfolt tisztítása',
          mockTenantId,
          mockUserId
        );

        // Assert
        expect(mockAuditService.log).toHaveBeenCalledWith({
          action: 'deposit_partially_retained',
          entityType: 'deposit',
          entityId: mockDepositId,
          userId: mockUserId,
          tenantId: mockTenantId,
          metadata: {
            originalAmount: 50000,
            retainedAmount: 15000,
            releasedAmount: 35000,
            reason: DepositRetentionReason.CLEANING_FEE,
            description: 'Olajfolt tisztítása',
            previousStatus: DepositStatus.COLLECTED,
            paymentMethod: DepositPaymentMethod.CASH,
            myposTransactionId: undefined,
          },
        });
      });
    });
  });
});
