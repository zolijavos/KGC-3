/**
 * Unit tests for PrismaWarrantyClaimRepository
 * Epic 19: Warranty Claims - Story 19-4: Settlement Methods
 *
 * TDD: Unit tesztek a garanciális igény elszámoláshoz
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaWarrantyClaimRepository } from './prisma-warranty-claim.repository';

// Mock Prisma Client with transaction support
const mockTx = {
  warrantyClaim: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
};

const mockPrismaClient = {
  warrantyClaim: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

describe('PrismaWarrantyClaimRepository - Settlement Methods', () => {
  let repository: PrismaWarrantyClaimRepository;
  const tenantId = 'tenant-123';
  const userId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaWarrantyClaimRepository(mockPrismaClient as never);
  });

  // ============================================
  // getPendingSettlements TESTS
  // ============================================

  describe('getPendingSettlements()', () => {
    it('should return APPROVED claims with null settledAt', async () => {
      const mockClaims = [
        {
          id: 'claim-1',
          tenantId,
          claimNumber: 'WC-2025-0001',
          status: 'APPROVED',
          settledAt: null,
          manufacturer: 'MAKITA',
          totalClaimValue: 25000,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
        },
        {
          id: 'claim-2',
          tenantId,
          claimNumber: 'WC-2025-0002',
          status: 'APPROVED',
          settledAt: null,
          manufacturer: 'STIHL',
          totalClaimValue: 15000,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
        },
      ];

      mockPrismaClient.warrantyClaim.findMany.mockResolvedValue(mockClaims);

      const result = await repository.getPendingSettlements(tenantId);

      expect(result).toHaveLength(2);
      expect(mockPrismaClient.warrantyClaim.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          status: 'APPROVED',
          settledAt: null,
        },
        include: { items: true },
        orderBy: { approvedAt: 'asc' },
      });
    });

    it('should return empty array when no pending settlements', async () => {
      mockPrismaClient.warrantyClaim.findMany.mockResolvedValue([]);

      const result = await repository.getPendingSettlements(tenantId);

      expect(result).toEqual([]);
    });
  });

  // ============================================
  // getSettlementSummary TESTS
  // ============================================

  describe('getSettlementSummary()', () => {
    it('should aggregate settled claims by period', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockClaims = [
        {
          manufacturer: 'MAKITA',
          totalClaimValue: 25000,
          settledAmount: 22000,
        },
        {
          manufacturer: 'MAKITA',
          totalClaimValue: 15000,
          settledAmount: 14000,
        },
        {
          manufacturer: 'STIHL',
          totalClaimValue: 30000,
          settledAmount: 28000,
        },
      ];

      mockPrismaClient.warrantyClaim.findMany.mockResolvedValue(mockClaims);

      const result = await repository.getSettlementSummary(tenantId, startDate, endDate);

      expect(result.totalClaims).toBe(3);
      expect(result.totalClaimedAmount).toBe(70000);
      expect(result.totalSettledAmount).toBe(64000);
      expect(result.differenceAmount).toBe(6000);
      expect(result.byManufacturer['MAKITA']).toEqual({ claims: 2, amount: 36000 });
      expect(result.byManufacturer['STIHL']).toEqual({ claims: 1, amount: 28000 });
    });

    it('should return empty summary when no claims in period', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockPrismaClient.warrantyClaim.findMany.mockResolvedValue([]);

      const result = await repository.getSettlementSummary(tenantId, startDate, endDate);

      expect(result.totalClaims).toBe(0);
      expect(result.totalClaimedAmount).toBe(0);
      expect(result.totalSettledAmount).toBe(0);
      expect(result.differenceAmount).toBe(0);
      expect(result.byManufacturer).toEqual({});
    });

    it('should filter by date range correctly', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockPrismaClient.warrantyClaim.findMany.mockResolvedValue([]);

      await repository.getSettlementSummary(tenantId, startDate, endDate);

      expect(mockPrismaClient.warrantyClaim.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          settledAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          manufacturer: true,
          totalClaimValue: true,
          settledAmount: true,
        },
      });
    });

    it('should handle null amounts gracefully', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockClaims = [
        {
          manufacturer: 'MAKITA',
          totalClaimValue: null,
          settledAmount: null,
        },
        {
          manufacturer: 'STIHL',
          totalClaimValue: 30000,
          settledAmount: 28000,
        },
      ];

      mockPrismaClient.warrantyClaim.findMany.mockResolvedValue(mockClaims);

      const result = await repository.getSettlementSummary(tenantId, startDate, endDate);

      expect(result.totalClaims).toBe(2);
      expect(result.totalClaimedAmount).toBe(30000);
      expect(result.totalSettledAmount).toBe(28000);
      expect(result.byManufacturer['MAKITA']).toEqual({ claims: 1, amount: 0 });
    });
  });

  // ============================================
  // bulkSettle TESTS
  // ============================================

  describe('bulkSettle()', () => {
    it('should settle multiple claims with uniform amount', async () => {
      const claimIds = ['claim-1', 'claim-2'];
      const settledAmount = 20000;

      // Mock $transaction to execute the callback
      mockPrismaClient.$transaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<void>) => {
          await callback(mockTx as never);
        }
      );

      // First call - claim-1
      mockTx.warrantyClaim.findFirst.mockResolvedValueOnce({
        id: 'claim-1',
        tenantId,
        claimNumber: 'WC-2025-0001',
        status: 'APPROVED',
        totalClaimValue: 25000,
        notes: null,
      });
      mockTx.warrantyClaim.updateMany.mockResolvedValueOnce({ count: 1 });

      // Second call - claim-2
      mockTx.warrantyClaim.findFirst.mockResolvedValueOnce({
        id: 'claim-2',
        tenantId,
        claimNumber: 'WC-2025-0002',
        status: 'APPROVED',
        totalClaimValue: 15000,
        notes: 'Előző megjegyzés',
      });
      mockTx.warrantyClaim.updateMany.mockResolvedValueOnce({ count: 1 });

      const result = await repository.bulkSettle(claimIds, settledAmount, tenantId, userId);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should settle claims with Map-based individual amounts', async () => {
      const claimIds = ['claim-1', 'claim-2'];
      const settledAmountMap = new Map<string, number>([
        ['claim-1', 22000],
        ['claim-2', 15000],
      ]);

      mockPrismaClient.$transaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<void>) => {
          await callback(mockTx as never);
        }
      );

      mockTx.warrantyClaim.findFirst
        .mockResolvedValueOnce({
          id: 'claim-1',
          tenantId,
          status: 'APPROVED',
          totalClaimValue: 25000,
          notes: null,
        })
        .mockResolvedValueOnce({
          id: 'claim-2',
          tenantId,
          status: 'APPROVED',
          totalClaimValue: 20000,
          notes: null,
        });
      mockTx.warrantyClaim.updateMany.mockResolvedValue({ count: 1 });

      const result = await repository.bulkSettle(claimIds, settledAmountMap, tenantId, userId);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle claim not found error', async () => {
      const claimIds = ['claim-1', 'claim-not-found'];
      const settledAmount = 20000;

      mockPrismaClient.$transaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<void>) => {
          await callback(mockTx as never);
        }
      );

      // First call - claim-1 found
      mockTx.warrantyClaim.findFirst.mockResolvedValueOnce({
        id: 'claim-1',
        tenantId,
        status: 'APPROVED',
        totalClaimValue: 25000,
        notes: null,
      });
      mockTx.warrantyClaim.updateMany.mockResolvedValueOnce({ count: 1 });

      // Second call - claim-not-found returns null
      mockTx.warrantyClaim.findFirst.mockResolvedValueOnce(null);

      const result = await repository.bulkSettle(claimIds, settledAmount, tenantId, userId);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        claimId: 'claim-not-found',
        error: 'Igény nem található',
      });
    });

    it('should skip claims not in APPROVED status', async () => {
      const claimIds = ['claim-1', 'claim-pending'];
      const settledAmount = 20000;

      mockPrismaClient.$transaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<void>) => {
          await callback(mockTx as never);
        }
      );

      // First call - claim-1 APPROVED
      mockTx.warrantyClaim.findFirst.mockResolvedValueOnce({
        id: 'claim-1',
        tenantId,
        status: 'APPROVED',
        totalClaimValue: 25000,
        notes: null,
      });
      mockTx.warrantyClaim.updateMany.mockResolvedValueOnce({ count: 1 });

      // Second call - claim-pending is PENDING status
      mockTx.warrantyClaim.findFirst.mockResolvedValueOnce({
        id: 'claim-pending',
        tenantId,
        status: 'PENDING',
        totalClaimValue: 15000,
        notes: null,
      });

      const result = await repository.bulkSettle(claimIds, settledAmount, tenantId, userId);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors[0]?.error).toBe('Csak jóváhagyott igény számolható el');
    });

    it('should return zero counts for empty claimIds', async () => {
      const result = await repository.bulkSettle([], 20000, tenantId, userId);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
      expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
    });

    it('should reject negative amounts', async () => {
      const claimIds = ['claim-1'];
      const settledAmount = -5000;

      const result = await repository.bulkSettle(claimIds, settledAmount, tenantId, userId);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors[0]?.error).toBe('Elszámolt összeg nem lehet negatív');
    });

    it('should add audit trail to notes', async () => {
      const claimIds = ['claim-1'];
      const settledAmount = 20000;

      mockPrismaClient.$transaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<void>) => {
          await callback(mockTx as never);
        }
      );

      mockTx.warrantyClaim.findFirst.mockResolvedValue({
        id: 'claim-1',
        tenantId,
        status: 'APPROVED',
        totalClaimValue: 25000,
        notes: 'Eredeti megjegyzés',
      });
      mockTx.warrantyClaim.updateMany.mockResolvedValue({ count: 1 });

      await repository.bulkSettle(claimIds, settledAmount, tenantId, userId);

      // Verify that notes were updated with audit trail
      expect(mockTx.warrantyClaim.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            settledAt: expect.any(Date),
            settledAmount: 20000,
            notes: expect.stringContaining('ELSZÁMOLVA'),
          }),
        })
      );
    });

    it('should throw error when Map has missing claimId', async () => {
      const claimIds = ['claim-1', 'claim-2'];
      const settledAmountMap = new Map<string, number>([
        ['claim-1', 22000],
        // claim-2 is missing
      ]);

      const result = await repository.bulkSettle(claimIds, settledAmountMap, tenantId, userId);

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toContain('Nincs összeg megadva');
    });
  });

  // ============================================
  // Multi-tenancy TESTS
  // ============================================

  describe('Multi-tenancy isolation', () => {
    it('should always filter by tenantId in getPendingSettlements', async () => {
      mockPrismaClient.warrantyClaim.findMany.mockResolvedValue([]);

      await repository.getPendingSettlements('other-tenant');

      expect(mockPrismaClient.warrantyClaim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'other-tenant',
          }),
        })
      );
    });

    it('should always filter by tenantId in getSettlementSummary', async () => {
      mockPrismaClient.warrantyClaim.findMany.mockResolvedValue([]);

      await repository.getSettlementSummary('other-tenant', new Date(), new Date());

      expect(mockPrismaClient.warrantyClaim.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'other-tenant',
          }),
        })
      );
    });

    it('should always filter by tenantId in bulkSettle', async () => {
      const claimIds = ['claim-1'];
      const settledAmount = 20000;

      mockPrismaClient.$transaction.mockImplementation(
        async (callback: (tx: typeof mockTx) => Promise<void>) => {
          await callback(mockTx as never);
        }
      );

      mockTx.warrantyClaim.findFirst.mockResolvedValue({
        id: 'claim-1',
        tenantId: 'other-tenant',
        status: 'APPROVED',
        totalClaimValue: 25000,
        notes: null,
      });
      mockTx.warrantyClaim.updateMany.mockResolvedValue({ count: 1 });

      await repository.bulkSettle(claimIds, settledAmount, 'other-tenant', userId);

      expect(mockTx.warrantyClaim.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'other-tenant',
          }),
        })
      );
    });
  });
});
