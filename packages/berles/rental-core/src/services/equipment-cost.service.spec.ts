/**
 * @kgc/rental-core - Equipment Cost Service Tests
 * Epic 40: Story 40-1 - Bérgép vételár és ráfordítás nyilvántartás
 *
 * TDD Tests for EquipmentCostService
 * ADR-051: Bérgép Megtérülés Kalkuláció
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  EquipmentCostService,
  IEquipmentCostRepository,
  WorksheetCostInfo,
} from './equipment-cost.service';

/**
 * In-Memory Repository for Testing
 */
class InMemoryEquipmentCostRepository implements IEquipmentCostRepository {
  private worksheets: Map<string, WorksheetCostInfo[]> = new Map();
  public lastTenantId: string | undefined;

  addWorksheet(equipmentId: string, worksheet: WorksheetCostInfo): void {
    const existing = this.worksheets.get(equipmentId) ?? [];
    existing.push(worksheet);
    this.worksheets.set(equipmentId, existing);
  }

  async getWorksheetsByEquipmentId(
    equipmentId: string,
    tenantId?: string
  ): Promise<WorksheetCostInfo[]> {
    this.lastTenantId = tenantId; // Track for testing
    return this.worksheets.get(equipmentId) ?? [];
  }

  clear(): void {
    this.worksheets.clear();
    this.lastTenantId = undefined;
  }
}

describe('EquipmentCostService', () => {
  let service: EquipmentCostService;
  let repository: InMemoryEquipmentCostRepository;

  beforeEach(() => {
    repository = new InMemoryEquipmentCostRepository();
    service = new EquipmentCostService(repository);
  });

  describe('getTotalServiceCost()', () => {
    describe('happy path', () => {
      it('should return 0 when no worksheets exist for equipment', async () => {
        // Given: No worksheets for equipment
        const equipmentId = 'eq-001';

        // When: Getting total service cost
        const result = await service.getTotalServiceCost(equipmentId);

        // Then: Cost should be 0
        expect(result.totalServiceCost).toBe(0);
        expect(result.worksheetCount).toBe(0);
      });

      it('should sum costs from non-warranty worksheets only', async () => {
        // Given: Equipment with mixed worksheets (AC-3 scenario)
        const equipmentId = 'eq-001';

        // Non-warranty worksheets (should be counted)
        repository.addWorksheet(equipmentId, {
          worksheetId: 'ws-001',
          worksheetNumber: 'ML-2026-0001',
          totalCost: 50000,
          isWarranty: false,
          completedAt: new Date('2026-01-15'),
        });
        repository.addWorksheet(equipmentId, {
          worksheetId: 'ws-002',
          worksheetNumber: 'ML-2026-0002',
          totalCost: 30000,
          isWarranty: false,
          completedAt: new Date('2026-01-20'),
        });

        // Warranty worksheet (should NOT be counted - AC-3)
        repository.addWorksheet(equipmentId, {
          worksheetId: 'ws-003',
          worksheetNumber: 'ML-2026-0003',
          totalCost: 20000,
          isWarranty: true, // Garanciális - NEM számít!
          completedAt: new Date('2026-01-25'),
        });

        // When: Getting total service cost
        const result = await service.getTotalServiceCost(equipmentId);

        // Then: Only non-warranty costs counted (50000 + 30000 = 80000)
        expect(result.totalServiceCost).toBe(80000);
        expect(result.worksheetCount).toBe(2); // Only non-warranty
        expect(result.warrantyWorksheetCount).toBe(1);
      });

      it('should include all non-warranty worksheets in breakdown', async () => {
        // Given: Equipment with multiple worksheets
        const equipmentId = 'eq-002';

        repository.addWorksheet(equipmentId, {
          worksheetId: 'ws-101',
          worksheetNumber: 'ML-2026-0101',
          totalCost: 15000,
          isWarranty: false,
          completedAt: new Date('2026-02-01'),
        });
        repository.addWorksheet(equipmentId, {
          worksheetId: 'ws-102',
          worksheetNumber: 'ML-2026-0102',
          totalCost: 25000,
          isWarranty: false,
          completedAt: new Date('2026-02-05'),
        });

        // When: Getting total service cost
        const result = await service.getTotalServiceCost(equipmentId);

        // Then: Should have breakdown
        expect(result.breakdown).toHaveLength(2);
        expect(result.breakdown[0]?.worksheetNumber).toBe('ML-2026-0101');
        expect(result.breakdown[0]?.totalCost).toBe(15000);
        expect(result.breakdown[1]?.worksheetNumber).toBe('ML-2026-0102');
        expect(result.breakdown[1]?.totalCost).toBe(25000);
      });
    });

    describe('edge cases', () => {
      it('should handle equipment with only warranty worksheets', async () => {
        // Given: Equipment with ONLY warranty worksheets
        const equipmentId = 'eq-warranty-only';

        repository.addWorksheet(equipmentId, {
          worksheetId: 'ws-w1',
          worksheetNumber: 'ML-2026-W001',
          totalCost: 100000,
          isWarranty: true,
          completedAt: new Date('2026-01-10'),
        });
        repository.addWorksheet(equipmentId, {
          worksheetId: 'ws-w2',
          worksheetNumber: 'ML-2026-W002',
          totalCost: 50000,
          isWarranty: true,
          completedAt: new Date('2026-01-15'),
        });

        // When: Getting total service cost
        const result = await service.getTotalServiceCost(equipmentId);

        // Then: Total should be 0 (all warranty)
        expect(result.totalServiceCost).toBe(0);
        expect(result.worksheetCount).toBe(0);
        expect(result.warrantyWorksheetCount).toBe(2);
        expect(result.breakdown).toHaveLength(0);
      });

      it('should handle worksheets with zero cost', async () => {
        // Given: Worksheet with zero cost (e.g., free inspection)
        const equipmentId = 'eq-free';

        repository.addWorksheet(equipmentId, {
          worksheetId: 'ws-free',
          worksheetNumber: 'ML-2026-FREE',
          totalCost: 0,
          isWarranty: false,
          completedAt: new Date('2026-02-01'),
        });

        // When: Getting total service cost
        const result = await service.getTotalServiceCost(equipmentId);

        // Then: Should include but with 0 cost
        expect(result.totalServiceCost).toBe(0);
        expect(result.worksheetCount).toBe(1);
      });

      it('should handle very large costs correctly', async () => {
        // Given: Expensive repairs
        const equipmentId = 'eq-expensive';

        repository.addWorksheet(equipmentId, {
          worksheetId: 'ws-exp1',
          worksheetNumber: 'ML-2026-EXP1',
          totalCost: 999999.99,
          isWarranty: false,
          completedAt: new Date('2026-02-01'),
        });
        repository.addWorksheet(equipmentId, {
          worksheetId: 'ws-exp2',
          worksheetNumber: 'ML-2026-EXP2',
          totalCost: 1000000.01,
          isWarranty: false,
          completedAt: new Date('2026-02-02'),
        });

        // When: Getting total service cost
        const result = await service.getTotalServiceCost(equipmentId);

        // Then: Should sum correctly
        expect(result.totalServiceCost).toBe(2000000);
      });
    });

    describe('error handling', () => {
      it('should handle empty equipmentId gracefully', async () => {
        // Given: Empty equipment ID
        const equipmentId = '';

        // When: Getting total service cost
        const result = await service.getTotalServiceCost(equipmentId);

        // Then: Should return empty result
        expect(result.totalServiceCost).toBe(0);
        expect(result.worksheetCount).toBe(0);
      });
    });

    describe('multi-tenancy (ADR-001)', () => {
      it('should pass tenantId to repository when provided', async () => {
        // Given: Equipment and tenant
        const equipmentId = 'eq-tenant-test';
        const tenantId = 'tenant-123';

        repository.addWorksheet(equipmentId, {
          worksheetId: 'ws-t1',
          worksheetNumber: 'ML-2026-T001',
          totalCost: 10000,
          isWarranty: false,
          completedAt: new Date('2026-01-15'),
        });

        // When: Getting total service cost with tenantId
        await service.getTotalServiceCost(equipmentId, tenantId);

        // Then: Repository should receive tenantId
        expect(repository.lastTenantId).toBe(tenantId);
      });

      it('should work without tenantId (RLS fallback)', async () => {
        // Given: Equipment without explicit tenant
        const equipmentId = 'eq-no-tenant';

        repository.addWorksheet(equipmentId, {
          worksheetId: 'ws-nt1',
          worksheetNumber: 'ML-2026-NT001',
          totalCost: 5000,
          isWarranty: false,
          completedAt: new Date('2026-01-20'),
        });

        // When: Getting total service cost without tenantId
        const result = await service.getTotalServiceCost(equipmentId);

        // Then: Should still work (relies on RLS)
        expect(result.totalServiceCost).toBe(5000);
        expect(repository.lastTenantId).toBeUndefined();
      });
    });
  });

  describe('getCostSummary()', () => {
    it('should return full summary with equipment details', async () => {
      // Given: Equipment with worksheets
      const equipmentId = 'eq-summary';

      repository.addWorksheet(equipmentId, {
        worksheetId: 'ws-s1',
        worksheetNumber: 'ML-2026-S001',
        totalCost: 45000,
        isWarranty: false,
        completedAt: new Date('2026-01-15'),
      });
      repository.addWorksheet(equipmentId, {
        worksheetId: 'ws-s2',
        worksheetNumber: 'ML-2026-S002',
        totalCost: 55000,
        isWarranty: false,
        completedAt: new Date('2026-02-01'),
      });

      // When: Getting cost summary
      const summary = await service.getCostSummary(equipmentId);

      // Then: Summary should include all details
      expect(summary.equipmentId).toBe(equipmentId);
      expect(summary.totalServiceCost).toBe(100000);
      expect(summary.worksheetCount).toBe(2);
      expect(summary.lastServiceDate).toEqual(new Date('2026-02-01'));
    });

    it('should return null lastServiceDate when no worksheets', async () => {
      // Given: No worksheets
      const equipmentId = 'eq-no-service';

      // When: Getting cost summary
      const summary = await service.getCostSummary(equipmentId);

      // Then: lastServiceDate should be null
      expect(summary.lastServiceDate).toBeNull();
    });
  });
});
