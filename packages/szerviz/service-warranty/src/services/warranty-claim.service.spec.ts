/**
 * @kgc/service-warranty - Warranty Claim Service Tests
 * Epic 19: Warranty Claims - Story 19.2, 19.3, 19.4
 *
 * TDD: Unit tesztek a garanciális igény kezeléshez
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  WarrantyClaimService,
  WARRANTY_CLAIM_REPOSITORY,
  AUDIT_SERVICE,
  WORKSHEET_SERVICE,
  IAuditService,
  IWorksheetService,
} from './warranty-claim.service';
import {
  IWarrantyClaim,
  IWarrantyClaimRepository,
  ICreateWarrantyClaimInput,
  WarrantyClaimStatus,
  WarrantySupplier,
  WarrantyType,
} from '../interfaces/warranty-claim.interface';

describe('WarrantyClaimService', () => {
  let service: WarrantyClaimService;
  let repository: IWarrantyClaimRepository;
  let auditService: IAuditService;
  let worksheetService: IWorksheetService;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';
  const mockClaimId = 'claim-789';
  const mockWorksheetId = 'worksheet-001';

  const createMockClaim = (
    overrides: Partial<IWarrantyClaim> = {},
  ): IWarrantyClaim => ({
    id: mockClaimId,
    tenantId: mockTenantId,
    claimNumber: 'WC-2025-0001',
    worksheetId: mockWorksheetId,
    status: WarrantyClaimStatus.PENDING,
    supplier: WarrantySupplier.MAKITA,
    warrantyType: WarrantyType.MANUFACTURER,
    deviceSerialNumber: 'MAKITA-123456',
    deviceName: 'Makita DHP486',
    purchaseDate: new Date('2024-01-15'),
    warrantyExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year in future
    normaCode: 'MAK-001',
    normaHours: 1.5,
    faultDescription: 'Motor nem indul',
    workPerformed: 'Motor cseréje',
    claimedAmount: 25000,
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createMockInput = (): ICreateWarrantyClaimInput => ({
    worksheetId: mockWorksheetId,
    supplier: WarrantySupplier.MAKITA,
    warrantyType: WarrantyType.MANUFACTURER,
    deviceSerialNumber: 'MAKITA-123456',
    deviceName: 'Makita DHP486',
    purchaseDate: new Date('2024-01-15'),
    warrantyExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year in future
    normaCode: 'MAK-001',
    normaHours: 1.5,
    faultDescription: 'Motor nem indul',
    workPerformed: 'Motor cseréje',
    claimedAmount: 25000,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarrantyClaimService,
        {
          provide: WARRANTY_CLAIM_REPOSITORY,
          useValue: {
            create: vi.fn(),
            findById: vi.fn(),
            findByWorksheetId: vi.fn(),
            findByStatus: vi.fn(),
            findBySupplier: vi.fn(),
            updateStatus: vi.fn(),
            settle: vi.fn(),
            getSummary: vi.fn(),
            generateClaimNumber: vi.fn(),
          },
        },
        {
          provide: AUDIT_SERVICE,
          useValue: {
            log: vi.fn(),
          },
        },
        {
          provide: WORKSHEET_SERVICE,
          useValue: {
            markAsWarranty: vi.fn(),
            clearCosts: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WarrantyClaimService>(WarrantyClaimService);
    repository = module.get<IWarrantyClaimRepository>(WARRANTY_CLAIM_REPOSITORY);
    auditService = module.get<IAuditService>(AUDIT_SERVICE);
    worksheetService = module.get<IWorksheetService>(WORKSHEET_SERVICE);
  });

  describe('createClaim', () => {
    it('should create a warranty claim successfully', async () => {
      const input = createMockInput();
      const mockClaim = createMockClaim();

      vi.mocked(repository.create).mockResolvedValue(mockClaim);

      const result = await service.createClaim(mockTenantId, input, mockUserId);

      expect(result).toEqual(mockClaim);
      expect(repository.create).toHaveBeenCalledWith(mockTenantId, input, mockUserId);
      expect(worksheetService.markAsWarranty).toHaveBeenCalledWith(mockTenantId, mockWorksheetId);
      expect(auditService.log).toHaveBeenCalledWith(
        mockTenantId,
        'WARRANTY_CLAIM_CREATED',
        'warranty_claim',
        mockClaim.id,
        expect.any(Object),
      );
    });

    it('should reject claim if warranty already expired', async () => {
      const input = createMockInput();
      input.warrantyExpiresAt = new Date('2020-01-01'); // Expired

      await expect(
        service.createClaim(mockTenantId, input, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject claim if purchase date is in future', async () => {
      const input = createMockInput();
      input.purchaseDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Future

      await expect(
        service.createClaim(mockTenantId, input, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getClaimById', () => {
    it('should return claim when found', async () => {
      const mockClaim = createMockClaim();
      vi.mocked(repository.findById).mockResolvedValue(mockClaim);

      const result = await service.getClaimById(mockTenantId, mockClaimId);

      expect(result).toEqual(mockClaim);
    });

    it('should throw NotFoundException when claim not found', async () => {
      vi.mocked(repository.findById).mockResolvedValue(null);

      await expect(
        service.getClaimById(mockTenantId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateClaimStatus', () => {
    it('should submit pending claim', async () => {
      const pendingClaim = createMockClaim({ status: WarrantyClaimStatus.PENDING });
      const submittedClaim = createMockClaim({ status: WarrantyClaimStatus.SUBMITTED });

      vi.mocked(repository.findById).mockResolvedValue(pendingClaim);
      vi.mocked(repository.updateStatus).mockResolvedValue(submittedClaim);

      const result = await service.submitClaim(mockTenantId, mockClaimId, mockUserId);

      expect(result.status).toBe(WarrantyClaimStatus.SUBMITTED);
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should approve submitted claim', async () => {
      const submittedClaim = createMockClaim({ status: WarrantyClaimStatus.SUBMITTED });
      const approvedClaim = createMockClaim({
        status: WarrantyClaimStatus.APPROVED,
        approvedAmount: 20000,
      });

      vi.mocked(repository.findById).mockResolvedValue(submittedClaim);
      vi.mocked(repository.updateStatus).mockResolvedValue(approvedClaim);

      const result = await service.approveClaim(
        mockTenantId,
        mockClaimId,
        20000,
        'Jóváhagyva',
        'SUP-REF-123',
        mockUserId,
      );

      expect(result.status).toBe(WarrantyClaimStatus.APPROVED);
      expect(result.approvedAmount).toBe(20000);
    });

    it('should reject submitted claim', async () => {
      const submittedClaim = createMockClaim({ status: WarrantyClaimStatus.SUBMITTED });
      const rejectedClaim = createMockClaim({ status: WarrantyClaimStatus.REJECTED });

      vi.mocked(repository.findById).mockResolvedValue(submittedClaim);
      vi.mocked(repository.updateStatus).mockResolvedValue(rejectedClaim);

      const result = await service.rejectClaim(
        mockTenantId,
        mockClaimId,
        'Nem garanciális hiba',
        mockUserId,
      );

      expect(result.status).toBe(WarrantyClaimStatus.REJECTED);
    });

    it('should reject invalid status transition', async () => {
      const rejectedClaim = createMockClaim({ status: WarrantyClaimStatus.REJECTED });
      vi.mocked(repository.findById).mockResolvedValue(rejectedClaim);

      await expect(
        service.updateClaimStatus(
          mockTenantId,
          { claimId: mockClaimId, status: WarrantyClaimStatus.APPROVED },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require approved amount for APPROVED status', async () => {
      const submittedClaim = createMockClaim({ status: WarrantyClaimStatus.SUBMITTED });
      vi.mocked(repository.findById).mockResolvedValue(submittedClaim);

      await expect(
        service.updateClaimStatus(
          mockTenantId,
          { claimId: mockClaimId, status: WarrantyClaimStatus.APPROVED },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('settleClaim', () => {
    it('should settle approved claim', async () => {
      const approvedClaim = createMockClaim({
        status: WarrantyClaimStatus.APPROVED,
        approvedAmount: 20000,
      });
      const settledClaim = createMockClaim({
        status: WarrantyClaimStatus.SETTLED,
        settledAt: new Date(),
      });

      vi.mocked(repository.findById).mockResolvedValue(approvedClaim);
      vi.mocked(repository.settle).mockResolvedValue(settledClaim);

      const result = await service.settleClaim(
        mockTenantId,
        { claimId: mockClaimId, settledAmount: 20000 },
        mockUserId,
      );

      expect(result.status).toBe(WarrantyClaimStatus.SETTLED);
      expect(worksheetService.clearCosts).toHaveBeenCalledWith(mockTenantId, mockWorksheetId);
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should reject settling non-approved claim', async () => {
      const pendingClaim = createMockClaim({ status: WarrantyClaimStatus.PENDING });
      vi.mocked(repository.findById).mockResolvedValue(pendingClaim);

      await expect(
        service.settleClaim(
          mockTenantId,
          { claimId: mockClaimId, settledAmount: 20000 },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getClaimsByStatus', () => {
    it('should return claims filtered by status', async () => {
      const claims = [createMockClaim(), createMockClaim({ id: 'claim-2' })];
      vi.mocked(repository.findByStatus).mockResolvedValue(claims);

      const result = await service.getClaimsByStatus(mockTenantId, WarrantyClaimStatus.PENDING);

      expect(result).toHaveLength(2);
      expect(repository.findByStatus).toHaveBeenCalledWith(mockTenantId, WarrantyClaimStatus.PENDING);
    });
  });

  describe('getClaimsBySupplier', () => {
    it('should return claims filtered by supplier', async () => {
      const claims = [createMockClaim()];
      vi.mocked(repository.findBySupplier).mockResolvedValue(claims);

      const result = await service.getClaimsBySupplier(mockTenantId, WarrantySupplier.MAKITA);

      expect(result).toHaveLength(1);
      expect(repository.findBySupplier).toHaveBeenCalledWith(mockTenantId, WarrantySupplier.MAKITA);
    });
  });

  describe('getClaimSummary', () => {
    it('should return claim summary', async () => {
      const mockSummary = {
        totalClaims: 10,
        pendingClaims: 2,
        submittedClaims: 3,
        approvedClaims: 4,
        rejectedClaims: 1,
        settledClaims: 0,
        totalClaimedAmount: 250000,
        totalApprovedAmount: 180000,
        bySupplier: {
          [WarrantySupplier.MAKITA]: { count: 8, claimedAmount: 200000, approvedAmount: 150000 },
          [WarrantySupplier.STIHL]: { count: 2, claimedAmount: 50000, approvedAmount: 30000 },
        } as Record<WarrantySupplier, { count: number; claimedAmount: number; approvedAmount: number }>,
      };

      vi.mocked(repository.getSummary).mockResolvedValue(mockSummary);

      const result = await service.getClaimSummary(
        mockTenantId,
        new Date('2025-01-01'),
        new Date('2025-12-31'),
      );

      expect(result.totalClaims).toBe(10);
      expect(result.totalApprovedAmount).toBe(180000);
    });
  });

  describe('convenience methods', () => {
    it('getPendingClaims should call findByStatus with PENDING', async () => {
      vi.mocked(repository.findByStatus).mockResolvedValue([]);

      await service.getPendingClaims(mockTenantId);

      expect(repository.findByStatus).toHaveBeenCalledWith(mockTenantId, WarrantyClaimStatus.PENDING);
    });

    it('getAwaitingResponseClaims should call findByStatus with SUBMITTED', async () => {
      vi.mocked(repository.findByStatus).mockResolvedValue([]);

      await service.getAwaitingResponseClaims(mockTenantId);

      expect(repository.findByStatus).toHaveBeenCalledWith(mockTenantId, WarrantyClaimStatus.SUBMITTED);
    });

    it('getAwaitingSettlementClaims should call findByStatus with APPROVED', async () => {
      vi.mocked(repository.findByStatus).mockResolvedValue([]);

      await service.getAwaitingSettlementClaims(mockTenantId);

      expect(repository.findByStatus).toHaveBeenCalledWith(mockTenantId, WarrantyClaimStatus.APPROVED);
    });
  });
});
