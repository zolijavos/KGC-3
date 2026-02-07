/**
 * @kgc/rental-core - Equipment Profit Service Tests
 * Epic 40: Story 40-2 - Bérgép megtérülés kalkuláció
 *
 * TDD KÖTELEZŐ - Pénzügyi számítás!
 * Tesztek ELŐBB megírva, majd implementáció.
 *
 * Képlet:
 * PROFIT = Σ(Rental.totalAmount) - purchasePrice - Σ(Worksheet.totalCost WHERE !isWarranty)
 * ROI % = (PROFIT / purchasePrice) × 100
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  EquipmentProfitData,
  EquipmentProfitService,
  EquipmentProfitStatus,
  IEquipmentProfitRepository,
} from './equipment-profit.service';

/**
 * In-Memory Repository for testing
 */
class InMemoryEquipmentProfitRepository implements IEquipmentProfitRepository {
  private equipmentData: Map<string, EquipmentProfitData> = new Map();
  public lastTenantId: string | undefined;

  setEquipmentData(equipmentId: string, data: EquipmentProfitData): void {
    this.equipmentData.set(equipmentId, data);
  }

  async getEquipmentProfitData(
    equipmentId: string,
    tenantId?: string
  ): Promise<EquipmentProfitData | null> {
    this.lastTenantId = tenantId;
    return this.equipmentData.get(equipmentId) ?? null;
  }

  reset(): void {
    this.equipmentData.clear();
    this.lastTenantId = undefined;
  }
}

describe('EquipmentProfitService', () => {
  let service: EquipmentProfitService;
  let repository: InMemoryEquipmentProfitRepository;

  beforeEach(() => {
    repository = new InMemoryEquipmentProfitRepository();
    service = new EquipmentProfitService(repository);
  });

  describe('calculateProfit()', () => {
    describe('happy path', () => {
      it('should calculate profit for profitable equipment (AC-1)', async () => {
        // Given: Vételár 500000, bevétel 800000, ráfordítás 150000
        repository.setEquipmentData('eq-001', {
          equipmentId: 'eq-001',
          purchasePrice: 500000,
          totalRentalRevenue: 800000,
          totalServiceCost: 150000,
        });

        // When
        const result = await service.calculateProfit('eq-001');

        // Then: profit = 800000 - 500000 - 150000 = 150000
        expect(result.profit).toBe(150000);
        expect(result.roi).toBeCloseTo(30, 2); // 150000 / 500000 * 100 = 30%
        expect(result.status).toBe(EquipmentProfitStatus.PROFITABLE);
      });

      it('should calculate loss for losing equipment (AC-2)', async () => {
        // Given: Vételár 600000, bevétel 300000, ráfordítás 100000
        repository.setEquipmentData('eq-002', {
          equipmentId: 'eq-002',
          purchasePrice: 600000,
          totalRentalRevenue: 300000,
          totalServiceCost: 100000,
        });

        // When
        const result = await service.calculateProfit('eq-002');

        // Then: profit = 300000 - 600000 - 100000 = -400000
        expect(result.profit).toBe(-400000);
        expect(result.roi).toBeCloseTo(-66.67, 2);
        expect(result.status).toBe(EquipmentProfitStatus.LOSING);
      });

      it('should identify break-even equipment (AC-3)', async () => {
        // Given: Vételár 400000, bevétel 450000, ráfordítás 50000
        repository.setEquipmentData('eq-003', {
          equipmentId: 'eq-003',
          purchasePrice: 400000,
          totalRentalRevenue: 450000,
          totalServiceCost: 50000,
        });

        // When
        const result = await service.calculateProfit('eq-003');

        // Then: profit = 450000 - 400000 - 50000 = 0
        expect(result.profit).toBe(0);
        expect(result.roi).toBe(0);
        expect(result.status).toBe(EquipmentProfitStatus.BREAK_EVEN);
      });
    });

    describe('incomplete data handling', () => {
      it('should return INCOMPLETE when equipment has no purchase price (AC-4)', async () => {
        // Given: Equipment without purchase price
        repository.setEquipmentData('eq-004', {
          equipmentId: 'eq-004',
          purchasePrice: null,
          totalRentalRevenue: 500000,
          totalServiceCost: 100000,
        });

        // When
        const result = await service.calculateProfit('eq-004');

        // Then
        expect(result.status).toBe(EquipmentProfitStatus.INCOMPLETE);
        expect(result.profit).toBeNull();
        expect(result.roi).toBeNull();
        expect(result.error).toBe('Vételár szükséges a megtérülés számításhoz');
      });

      it('should handle equipment with zero purchase price', async () => {
        // Given: Free equipment (gift, etc.)
        repository.setEquipmentData('eq-005', {
          equipmentId: 'eq-005',
          purchasePrice: 0,
          totalRentalRevenue: 100000,
          totalServiceCost: 20000,
        });

        // When
        const result = await service.calculateProfit('eq-005');

        // Then: Can't calculate ROI for zero purchase price
        expect(result.status).toBe(EquipmentProfitStatus.INCOMPLETE);
        expect(result.error).toBe('Vételár szükséges a megtérülés számításhoz');
      });

      it('should handle equipment with no revenue (only costs)', async () => {
        // Given: New equipment, never rented
        repository.setEquipmentData('eq-006', {
          equipmentId: 'eq-006',
          purchasePrice: 300000,
          totalRentalRevenue: 0,
          totalServiceCost: 50000,
        });

        // When
        const result = await service.calculateProfit('eq-006');

        // Then: profit = 0 - 300000 - 50000 = -350000
        expect(result.profit).toBe(-350000);
        expect(result.roi).toBeCloseTo(-116.67, 2);
        expect(result.status).toBe(EquipmentProfitStatus.LOSING);
      });

      it('should handle equipment with no service costs', async () => {
        // Given: Equipment never serviced
        repository.setEquipmentData('eq-007', {
          equipmentId: 'eq-007',
          purchasePrice: 200000,
          totalRentalRevenue: 350000,
          totalServiceCost: 0,
        });

        // When
        const result = await service.calculateProfit('eq-007');

        // Then: profit = 350000 - 200000 - 0 = 150000
        expect(result.profit).toBe(150000);
        expect(result.roi).toBe(75);
        expect(result.status).toBe(EquipmentProfitStatus.PROFITABLE);
      });

      it('should handle non-existent equipment', async () => {
        // Given: Equipment ID that doesn't exist
        // When
        const result = await service.calculateProfit('non-existent');

        // Then
        expect(result.status).toBe(EquipmentProfitStatus.INCOMPLETE);
        expect(result.error).toBe('Bérgép nem található');
      });
    });

    describe('precision and edge cases', () => {
      it('should round ROI to 2 decimal places', async () => {
        // Given: Values that produce repeating decimals
        repository.setEquipmentData('eq-008', {
          equipmentId: 'eq-008',
          purchasePrice: 300000,
          totalRentalRevenue: 400000,
          totalServiceCost: 0,
        });

        // When
        const result = await service.calculateProfit('eq-008');

        // Then: ROI = 100000/300000*100 = 33.333...
        expect(result.roi).toBe(33.33);
      });

      it('should handle floating point precision for profit', async () => {
        // Given: Values that could cause floating point issues
        repository.setEquipmentData('eq-009', {
          equipmentId: 'eq-009',
          purchasePrice: 499999.99,
          totalRentalRevenue: 600000.01,
          totalServiceCost: 100000.02,
        });

        // When
        const result = await service.calculateProfit('eq-009');

        // Then: profit should be properly rounded
        expect(result.profit).toBe(0); // 600000.01 - 499999.99 - 100000.02 = 0
      });

      it('should handle very large numbers (100M+)', async () => {
        // Given: Large equipment investment
        repository.setEquipmentData('eq-010', {
          equipmentId: 'eq-010',
          purchasePrice: 100_000_000,
          totalRentalRevenue: 150_000_000,
          totalServiceCost: 10_000_000,
        });

        // When
        const result = await service.calculateProfit('eq-010');

        // Then: profit = 150M - 100M - 10M = 40M
        expect(result.profit).toBe(40_000_000);
        expect(result.roi).toBe(40);
        expect(result.status).toBe(EquipmentProfitStatus.PROFITABLE);
      });

      it('should handle negative ROI correctly', async () => {
        // Given: Equipment with 100% loss
        repository.setEquipmentData('eq-011', {
          equipmentId: 'eq-011',
          purchasePrice: 500000,
          totalRentalRevenue: 0,
          totalServiceCost: 0,
        });

        // When
        const result = await service.calculateProfit('eq-011');

        // Then: ROI = -500000/500000*100 = -100%
        expect(result.roi).toBe(-100);
        expect(result.status).toBe(EquipmentProfitStatus.LOSING);
      });
    });

    describe('multi-tenancy (ADR-001)', () => {
      it('should pass tenantId to repository when provided', async () => {
        // Given
        repository.setEquipmentData('eq-012', {
          equipmentId: 'eq-012',
          purchasePrice: 100000,
          totalRentalRevenue: 150000,
          totalServiceCost: 20000,
        });

        // When
        await service.calculateProfit('eq-012', 'tenant-123');

        // Then
        expect(repository.lastTenantId).toBe('tenant-123');
      });

      it('should work without tenantId (RLS fallback)', async () => {
        // Given
        repository.setEquipmentData('eq-013', {
          equipmentId: 'eq-013',
          purchasePrice: 100000,
          totalRentalRevenue: 150000,
          totalServiceCost: 20000,
        });

        // When
        await service.calculateProfit('eq-013');

        // Then
        expect(repository.lastTenantId).toBeUndefined();
      });
    });

    describe('input validation', () => {
      it('should handle empty equipmentId', async () => {
        // When
        const result = await service.calculateProfit('');

        // Then
        expect(result.status).toBe(EquipmentProfitStatus.INCOMPLETE);
        expect(result.error).toBe('Equipment ID szükséges');
      });

      it('should handle whitespace-only equipmentId', async () => {
        // When
        const result = await service.calculateProfit('   ');

        // Then
        expect(result.status).toBe(EquipmentProfitStatus.INCOMPLETE);
        expect(result.error).toBe('Equipment ID szükséges');
      });
    });

    describe('result structure', () => {
      it('should include all required fields in result', async () => {
        // Given
        repository.setEquipmentData('eq-014', {
          equipmentId: 'eq-014',
          purchasePrice: 500000,
          totalRentalRevenue: 700000,
          totalServiceCost: 100000,
        });

        // When
        const result = await service.calculateProfit('eq-014');

        // Then
        expect(result).toHaveProperty('equipmentId', 'eq-014');
        expect(result).toHaveProperty('purchasePrice', 500000);
        expect(result).toHaveProperty('totalRentalRevenue', 700000);
        expect(result).toHaveProperty('totalServiceCost', 100000);
        expect(result).toHaveProperty('profit', 100000);
        expect(result).toHaveProperty('roi', 20);
        expect(result).toHaveProperty('status', EquipmentProfitStatus.PROFITABLE);
      });
    });
  });
});
