/**
 * Property-Based Tests for Equipment Profit Calculations
 *
 * Epic 40 - Story 40-2: Bérgép megtérülés kalkuláció
 *
 * Uses fast-check library to verify mathematical invariants:
 * 1. Profit formula: PROFIT = revenue - purchasePrice - serviceCost
 * 2. ROI bounds and precision
 * 3. Status determination consistency
 * 4. Floating point precision handling
 * 5. Edge cases and boundary conditions
 */

import fc from 'fast-check';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  EquipmentProfitService,
  EquipmentProfitStatus,
  type EquipmentProfitData,
  type IEquipmentProfitRepository,
} from './equipment-profit.service';

// ============================================================================
// Mock Repository for Property Tests
// ============================================================================

class PropertyTestRepository implements IEquipmentProfitRepository {
  private data: EquipmentProfitData | null = null;

  setData(data: EquipmentProfitData | null): void {
    this.data = data;
  }

  async getEquipmentProfitData(): Promise<EquipmentProfitData | null> {
    return this.data;
  }
}

// ============================================================================
// Test Data Generators (Arbitraries)
// ============================================================================

/**
 * Generator for valid purchase prices (1 to 10,000,000 Ft)
 */
const purchasePriceArb = fc.integer({ min: 1, max: 10_000_000 });

/**
 * Generator for rental revenue (0 to 50,000,000 Ft)
 */
const revenueArb = fc.integer({ min: 0, max: 50_000_000 });

/**
 * Generator for service costs (0 to 10,000,000 Ft)
 */
const serviceCostArb = fc.integer({ min: 0, max: 10_000_000 });

/**
 * Generator for valid equipment profit data
 */
const profitDataArb = fc.record({
  equipmentId: fc.uuid(),
  purchasePrice: fc.oneof(purchasePriceArb, fc.constant(null as number | null)),
  totalRentalRevenue: revenueArb,
  totalServiceCost: serviceCostArb,
});

/**
 * Generator for complete profit data (non-null purchase price)
 */
const completeProfitDataArb = fc.record({
  equipmentId: fc.uuid(),
  purchasePrice: purchasePriceArb,
  totalRentalRevenue: revenueArb,
  totalServiceCost: serviceCostArb,
});

/**
 * Generator for profitable scenario with significant profit
 * Ensures profit is at least 1% of purchase price to avoid rounding to 0 ROI
 */
const profitableDataArb = fc
  .record({
    equipmentId: fc.uuid(),
    purchasePrice: fc.integer({ min: 100_000, max: 1_000_000 }),
    totalServiceCost: fc.integer({ min: 0, max: 50_000 }),
  })
  .chain(({ equipmentId, purchasePrice, totalServiceCost }) => {
    // Ensure profit is at least 1% of purchase price (for ROI rounding)
    const minProfit = Math.ceil(purchasePrice * 0.01);
    const minRevenue = purchasePrice + totalServiceCost + minProfit;
    return fc.integer({ min: minRevenue, max: minRevenue + 500_000 }).map(revenue => ({
      equipmentId,
      purchasePrice,
      totalRentalRevenue: revenue,
      totalServiceCost,
    }));
  });

/**
 * Generator for losing scenario with significant loss
 * Ensures loss is at least 1% of purchase price to avoid rounding to 0 ROI
 */
const losingDataArb = fc
  .record({
    equipmentId: fc.uuid(),
    purchasePrice: fc.integer({ min: 100_000, max: 500_000 }),
    totalServiceCost: fc.integer({ min: 10_000, max: 50_000 }),
  })
  .chain(({ equipmentId, purchasePrice, totalServiceCost }) => {
    // Ensure loss is at least 1% of purchase price (for ROI rounding)
    const minLoss = Math.ceil(purchasePrice * 0.01);
    const breakEven = purchasePrice + totalServiceCost;
    const maxRevenue = breakEven - minLoss;
    return fc.integer({ min: 0, max: Math.max(0, maxRevenue) }).map(revenue => ({
      equipmentId,
      purchasePrice,
      totalRentalRevenue: revenue,
      totalServiceCost,
    }));
  });

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('EquipmentProfitService - Property-Based Tests', () => {
  let repository: PropertyTestRepository;
  let service: EquipmentProfitService;

  beforeEach(() => {
    repository = new PropertyTestRepository();
    service = new EquipmentProfitService(repository);
  });

  // --------------------------------------------------------------------------
  // 1. Profit Formula Invariants
  // --------------------------------------------------------------------------

  describe('Profit Formula: PROFIT = revenue - purchasePrice - serviceCost', () => {
    it('Property: Profit equals revenue minus costs for any valid inputs', async () => {
      await fc.assert(
        fc.asyncProperty(completeProfitDataArb, async data => {
          repository.setData(data);
          const result = await service.calculateProfit(data.equipmentId);

          const expectedProfit =
            data.totalRentalRevenue - data.purchasePrice - data.totalServiceCost;
          const expectedRounded = Math.round(expectedProfit * 100) / 100;

          expect(result.profit).toBe(expectedRounded);
        }),
        { numRuns: 100 }
      );
    });

    it('Property: Increasing revenue increases profit (monotonic)', async () => {
      await fc.assert(
        fc.asyncProperty(
          completeProfitDataArb,
          fc.integer({ min: 1, max: 100_000 }),
          async (data, increase) => {
            // Calculate original profit
            repository.setData(data);
            const result1 = await service.calculateProfit(data.equipmentId);

            // Calculate with increased revenue
            const increasedData = {
              ...data,
              totalRentalRevenue: data.totalRentalRevenue + increase,
            };
            repository.setData(increasedData);
            const result2 = await service.calculateProfit(data.equipmentId);

            if (result1.profit !== null && result2.profit !== null) {
              expect(result2.profit).toBeGreaterThan(result1.profit);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: Increasing costs decreases profit (inverse monotonic)', async () => {
      await fc.assert(
        fc.asyncProperty(
          completeProfitDataArb,
          fc.integer({ min: 1, max: 100_000 }),
          async (data, increase) => {
            // Calculate original profit
            repository.setData(data);
            const result1 = await service.calculateProfit(data.equipmentId);

            // Calculate with increased service cost
            const increasedData = { ...data, totalServiceCost: data.totalServiceCost + increase };
            repository.setData(increasedData);
            const result2 = await service.calculateProfit(data.equipmentId);

            if (result1.profit !== null && result2.profit !== null) {
              expect(result2.profit).toBeLessThan(result1.profit);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // --------------------------------------------------------------------------
  // 2. ROI Calculation Invariants
  // --------------------------------------------------------------------------

  describe('ROI Calculation: ROI = (profit / purchasePrice) × 100', () => {
    it('Property: ROI is correctly calculated with 2 decimal precision', async () => {
      await fc.assert(
        fc.asyncProperty(completeProfitDataArb, async data => {
          repository.setData(data);
          const result = await service.calculateProfit(data.equipmentId);

          const rawProfit = data.totalRentalRevenue - data.purchasePrice - data.totalServiceCost;
          const expectedRoi = Math.round((rawProfit / data.purchasePrice) * 100 * 100) / 100;

          expect(result.roi).toBe(expectedRoi);
        }),
        { numRuns: 100 }
      );
    });

    it('Property: ROI is positive when profit is positive', async () => {
      await fc.assert(
        fc.asyncProperty(profitableDataArb, async data => {
          repository.setData(data);
          const result = await service.calculateProfit(data.equipmentId);

          expect(result.roi).toBeGreaterThan(0);
        }),
        { numRuns: 50 }
      );
    });

    it('Property: ROI is negative when profit is negative', async () => {
      await fc.assert(
        fc.asyncProperty(losingDataArb, async data => {
          repository.setData(data);
          const result = await service.calculateProfit(data.equipmentId);

          if (result.roi !== null) {
            expect(result.roi).toBeLessThan(0);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('Property: 100% ROI means profit equals purchase price', async () => {
      await fc.assert(
        fc.asyncProperty(purchasePriceArb, async purchasePrice => {
          // Set up data where profit = purchasePrice (100% ROI)
          const data: EquipmentProfitData = {
            equipmentId: 'test-100-roi',
            purchasePrice,
            totalRentalRevenue: purchasePrice * 2, // revenue = 2x purchase
            totalServiceCost: 0,
          };

          repository.setData(data);
          const result = await service.calculateProfit(data.equipmentId);

          expect(result.roi).toBe(100);
        }),
        { numRuns: 20 }
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. Status Determination Invariants
  // --------------------------------------------------------------------------

  describe('Status Determination Consistency', () => {
    it('Property: PROFITABLE status when profit > 0', async () => {
      await fc.assert(
        fc.asyncProperty(profitableDataArb, async data => {
          repository.setData(data);
          const result = await service.calculateProfit(data.equipmentId);

          expect(result.status).toBe(EquipmentProfitStatus.PROFITABLE);
        }),
        { numRuns: 50 }
      );
    });

    it('Property: LOSING status when profit < 0', async () => {
      await fc.assert(
        fc.asyncProperty(losingDataArb, async data => {
          repository.setData(data);
          const result = await service.calculateProfit(data.equipmentId);

          expect(result.status).toBe(EquipmentProfitStatus.LOSING);
        }),
        { numRuns: 50 }
      );
    });

    it('Property: BREAK_EVEN status when profit = 0', async () => {
      await fc.assert(
        fc.asyncProperty(purchasePriceArb, serviceCostArb, async (purchasePrice, serviceCost) => {
          // Create exact break-even scenario
          const data: EquipmentProfitData = {
            equipmentId: 'test-break-even',
            purchasePrice,
            totalRentalRevenue: purchasePrice + serviceCost, // Exactly covers costs
            totalServiceCost: serviceCost,
          };

          repository.setData(data);
          const result = await service.calculateProfit(data.equipmentId);

          expect(result.status).toBe(EquipmentProfitStatus.BREAK_EVEN);
        }),
        { numRuns: 30 }
      );
    });

    it('Property: INCOMPLETE status when purchasePrice is null', async () => {
      await fc.assert(
        fc.asyncProperty(revenueArb, serviceCostArb, async (revenue, serviceCost) => {
          const data: EquipmentProfitData = {
            equipmentId: 'test-incomplete',
            purchasePrice: null,
            totalRentalRevenue: revenue,
            totalServiceCost: serviceCost,
          };

          repository.setData(data);
          const result = await service.calculateProfit(data.equipmentId);

          expect(result.status).toBe(EquipmentProfitStatus.INCOMPLETE);
          expect(result.profit).toBeNull();
          expect(result.roi).toBeNull();
        }),
        { numRuns: 30 }
      );
    });
  });

  // --------------------------------------------------------------------------
  // 4. Floating Point Precision
  // --------------------------------------------------------------------------

  describe('Floating Point Precision Handling', () => {
    it('Property: Profit is always rounded to 2 decimal places', async () => {
      await fc.assert(
        fc.asyncProperty(completeProfitDataArb, async data => {
          repository.setData(data);
          const result = await service.calculateProfit(data.equipmentId);

          if (result.profit !== null) {
            // Check that multiplying by 100 gives an integer (within tolerance)
            const scaled = result.profit * 100;
            expect(Math.abs(scaled - Math.round(scaled))).toBeLessThan(0.0001);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('Property: ROI is always rounded to 2 decimal places', async () => {
      await fc.assert(
        fc.asyncProperty(completeProfitDataArb, async data => {
          repository.setData(data);
          const result = await service.calculateProfit(data.equipmentId);

          if (result.roi !== null) {
            // Check that multiplying by 100 gives an integer (within tolerance)
            const scaled = result.roi * 100;
            expect(Math.abs(scaled - Math.round(scaled))).toBeLessThan(0.0001);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  // --------------------------------------------------------------------------
  // 5. Edge Cases and Boundary Conditions
  // --------------------------------------------------------------------------

  describe('Edge Cases and Boundary Conditions', () => {
    it('Property: Zero revenue with zero cost equals negative profit (purchase price)', async () => {
      await fc.assert(
        fc.asyncProperty(purchasePriceArb, async purchasePrice => {
          const data: EquipmentProfitData = {
            equipmentId: 'test-zero',
            purchasePrice,
            totalRentalRevenue: 0,
            totalServiceCost: 0,
          };

          repository.setData(data);
          const result = await service.calculateProfit(data.equipmentId);

          expect(result.profit).toBe(-purchasePrice);
          expect(result.status).toBe(EquipmentProfitStatus.LOSING);
        }),
        { numRuns: 20 }
      );
    });

    it('Property: Very large numbers do not cause overflow', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1_000_000, max: 100_000_000 }),
          fc.integer({ min: 1_000_000, max: 500_000_000 }),
          fc.integer({ min: 0, max: 50_000_000 }),
          async (purchasePrice, revenue, serviceCost) => {
            const data: EquipmentProfitData = {
              equipmentId: 'test-large',
              purchasePrice,
              totalRentalRevenue: revenue,
              totalServiceCost: serviceCost,
            };

            repository.setData(data);
            const result = await service.calculateProfit(data.equipmentId);

            // Should not produce NaN or Infinity
            expect(Number.isFinite(result.profit)).toBe(true);
            expect(Number.isFinite(result.roi)).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('Property: Result structure is always complete', async () => {
      await fc.assert(
        fc.asyncProperty(profitDataArb, async data => {
          repository.setData(data);
          const result = await service.calculateProfit(data.equipmentId);

          // All required fields exist
          expect(result).toHaveProperty('equipmentId');
          expect(result).toHaveProperty('purchasePrice');
          expect(result).toHaveProperty('totalRentalRevenue');
          expect(result).toHaveProperty('totalServiceCost');
          expect(result).toHaveProperty('profit');
          expect(result).toHaveProperty('roi');
          expect(result).toHaveProperty('status');
        }),
        { numRuns: 50 }
      );
    });
  });
});
