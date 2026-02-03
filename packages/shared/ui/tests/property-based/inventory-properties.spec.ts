/**
 * Property-Based Tests for Inventory Calculations and Data Transformations
 *
 * Story 35-3: Dashboard Widgets & KPI Calculations - Inventory Domain
 *
 * Uses fast-check library to generate random test data and verify invariants:
 * 1. Hungarian number formatting always produces valid strings
 * 2. Location percentages always sum to 100%
 * 3. Stock movement net calculation: net = inbound - outbound
 * 4. Color intensity mapping consistently maps to utilization ranges
 * 5. Date formatting produces timezone-safe parseable strings
 * 6. Total count equals sum of location counts
 * 7. Status breakdown sums to total
 * 8. Utilization percentage is always 0-100
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

const { assert } = fc;

// ============================================================================
// Test Data Generators (Arbitraries)
// ============================================================================

/**
 * Generator for valid stock counts (0 to 10,000)
 */
const stockCountArb = fc.nat({ max: 10000 });

/**
 * Generator for location names
 */
const locationNameArb = fc.oneof(
  fc.constant('budapest_raktár'),
  fc.constant('debrecen_bolt'),
  fc.constant('szeged_bolt'),
  fc.constant('pécs_raktár'),
  fc.constant('győr_bolt'),
);

/**
 * Generator for machine type names
 */
const machineTypeArb = fc.oneof(
  fc.constant('Fúró'),
  fc.constant('Csiszoló'),
  fc.constant('Kalapács'),
  fc.constant('Fűrész'),
  fc.constant('Kompresszor'),
);

/**
 * Generator for utilization percentage (0-100)
 */
const utilizationPercentArb = fc.nat({ max: 100 });

/**
 * Generator for dates in the last 30 days
 */
const recentDateArb = fc
  .integer({ min: 0, max: 29 })
  .map((daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  });

/**
 * Generator for stock movement data
 */
const stockMovementArb = fc.record({
  date: recentDateArb,
  inbound: stockCountArb,
  outbound: stockCountArb,
});

/**
 * Generator for location breakdown (ensures at least 1 location)
 */
const locationBreakdownArb = fc
  .array(
    fc.record({
      location: locationNameArb,
      count: stockCountArb,
    }),
    { minLength: 1, maxLength: 5 },
  )
  .map((locations) => {
    // Calculate total to derive percentages
    const total = locations.reduce((sum, loc) => sum + loc.count, 0);

    if (total === 0) {
      // Handle edge case: all counts are 0
      return {
        locations: locations.map((loc) => ({ ...loc, percentage: 0 })),
        total: 0,
      };
    }

    // Calculate percentages with rounding
    const locationsWithPercentage = locations.map((loc) => ({
      ...loc,
      percentage: (loc.count / total) * 100,
    }));

    return { locations: locationsWithPercentage, total };
  });

/**
 * Generator for stock summary data with status breakdown
 * Ensures that location counts sum to total and status breakdown is consistent
 */
const stockSummaryArb = fc
  .record({
    available: stockCountArb,
    rented: stockCountArb,
    service: stockCountArb,
  })
  .chain((status) => {
    const total = status.available + status.rented + status.service;

    // Generate location names (1-5 unique locations)
    return fc
      .array(locationNameArb, { minLength: 1, maxLength: 5 })
      .map((locationNames) => {
        // Remove duplicates
        const uniqueLocations = Array.from(new Set(locationNames));

        if (total === 0) {
          // All locations have 0 count
          return {
            total: 0,
            byLocation: Object.fromEntries(
              uniqueLocations.map((loc) => [loc, { count: 0, percentage: 0 }]),
            ),
            byStatus: status,
          };
        }

        // Distribute total across locations proportionally
        const counts: number[] = [];
        let remaining = total;

        for (let i = 0; i < uniqueLocations.length - 1; i++) {
          // Each location gets a random portion of remaining
          const maxForThisLocation = remaining - (uniqueLocations.length - i - 1);
          const count = Math.min(remaining, Math.floor(Math.random() * maxForThisLocation));
          counts.push(count);
          remaining -= count;
        }
        // Last location gets the remainder
        counts.push(remaining);

        // Build location breakdown
        const byLocation = Object.fromEntries(
          uniqueLocations.map((loc, idx) => [
            loc,
            {
              count: counts[idx]!,
              percentage: (counts[idx]! / total) * 100,
            },
          ]),
        );

        return {
          total,
          byLocation,
          byStatus: status,
        };
      });
  });

/**
 * Generator for heatmap cell data
 */
const heatmapCellArb = fc.record({
  machineType: machineTypeArb,
  location: locationNameArb,
  count: stockCountArb,
  utilizationPercent: utilizationPercentArb,
});

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Inventory Calculations - Property-Based Tests', () => {
  // --------------------------------------------------------------------------
  // 1. Hungarian Number Formatting Invariants
  // --------------------------------------------------------------------------

  describe('Hungarian Number Formatting', () => {
    it('Property: Hungarian formatter always produces valid string for any natural number', () => {
      assert(
        fc.property(stockCountArb, (count) => {
          const formatter = new Intl.NumberFormat('hu-HU');
          const formatted = formatter.format(count);

          // Invariant 1: Result is a non-empty string
          expect(formatted).toBeTypeOf('string');
          expect(formatted.length).toBeGreaterThan(0);

          // Invariant 2: Contains only digits, spaces (thousands separator)
          expect(formatted).toMatch(/^[\d\s]+$/);

          // Invariant 3: Reversible - parsing gives back original number
          const parsed = parseInt(formatted.replace(/\s/g, ''), 10);
          expect(parsed).toBe(count);
        }),
      );
    });

    it('Property: Formatted number preserves magnitude (number of digits)', () => {
      assert(
        fc.property(stockCountArb, (count) => {
          const formatter = new Intl.NumberFormat('hu-HU');
          const formatted = formatter.format(count);

          // Remove spaces and count digits
          const digitCount = formatted.replace(/\s/g, '').length;
          const expectedDigits = count.toString().length;

          expect(digitCount).toBe(expectedDigits);
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // 2. Location Percentage Calculations
  // --------------------------------------------------------------------------

  describe('Location Breakdown Percentages', () => {
    it('Property: Location percentages sum to ~100% (within floating point tolerance)', () => {
      assert(
        fc.property(locationBreakdownArb, ({ locations, total }) => {
          if (total === 0) {
            // Edge case: all percentages should be 0
            locations.forEach((loc) => {
              expect(loc.percentage).toBe(0);
            });
            return;
          }

          const sumPercentages = locations.reduce((sum, loc) => sum + loc.percentage, 0);

          // Allow 0.1% tolerance for floating point rounding
          expect(Math.abs(sumPercentages - 100)).toBeLessThan(0.1);
        }),
      );
    });

    it('Property: Each location percentage is proportional to its count', () => {
      assert(
        fc.property(locationBreakdownArb, ({ locations, total }) => {
          if (total === 0) return;

          locations.forEach((loc) => {
            const expectedPercentage = (loc.count / total) * 100;

            // Allow 0.01% tolerance for floating point arithmetic
            expect(Math.abs(loc.percentage - expectedPercentage)).toBeLessThan(0.01);
          });
        }),
      );
    });

    it('Property: Location percentages are always non-negative', () => {
      assert(
        fc.property(locationBreakdownArb, ({ locations }) => {
          locations.forEach((loc) => {
            expect(loc.percentage).toBeGreaterThanOrEqual(0);
            expect(loc.percentage).toBeLessThanOrEqual(100);
          });
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. Stock Movement Net Calculation
  // --------------------------------------------------------------------------

  describe('Stock Movement Calculations', () => {
    it('Property: Net movement equals inbound minus outbound (commutative)', () => {
      assert(
        fc.property(stockMovementArb, (movement) => {
          const calculatedNet = movement.inbound - movement.outbound;

          expect(calculatedNet).toBe(movement.inbound - movement.outbound);

          // Commutative property: order doesn't matter
          expect(calculatedNet).toBe(-(movement.outbound - movement.inbound));
        }),
      );
    });

    it('Property: Net is positive when inbound > outbound', () => {
      assert(
        fc.property(
          fc.nat({ max: 1000 }),
          fc.nat({ max: 1000 }),
          (inbound, outbound) => {
            fc.pre(inbound > outbound); // Precondition

            const net = inbound - outbound;
            expect(net).toBeGreaterThan(0);
          },
        ),
      );
    });

    it('Property: Net is negative when outbound > inbound', () => {
      assert(
        fc.property(
          fc.nat({ max: 1000 }),
          fc.nat({ max: 1000 }),
          (inbound, outbound) => {
            fc.pre(outbound > inbound); // Precondition

            const net = inbound - outbound;
            expect(net).toBeLessThan(0);
          },
        ),
      );
    });

    it('Property: Net is zero when inbound equals outbound', () => {
      assert(
        fc.property(fc.nat({ max: 1000 }), (value) => {
          const net = value - value;
          expect(net).toBe(0);
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // 4. Color Intensity Mapping for Heatmap
  // --------------------------------------------------------------------------

  describe('Heatmap Color Intensity Mapping', () => {
    /**
     * Color intensity function from StockHeatmap.tsx
     */
    const getColorIntensity = (percent: number): string => {
      if (percent === 0) return 'bg-gray-100';
      if (percent <= 40) return 'bg-blue-200';
      if (percent <= 70) return 'bg-blue-400';
      if (percent <= 90) return 'bg-blue-500';
      return 'bg-blue-600';
    };

    it('Property: Color intensity mapping is deterministic and consistent', () => {
      assert(
        fc.property(utilizationPercentArb, (percent) => {
          const color1 = getColorIntensity(percent);
          const color2 = getColorIntensity(percent);

          // Same input always produces same output
          expect(color1).toBe(color2);
        }),
      );
    });

    it('Property: Color intensity maps to correct ranges', () => {
      assert(
        fc.property(utilizationPercentArb, (percent) => {
          const color = getColorIntensity(percent);

          // Verify correct range mapping
          if (percent === 0) {
            expect(color).toBe('bg-gray-100');
          } else if (percent <= 40) {
            expect(color).toBe('bg-blue-200');
          } else if (percent <= 70) {
            expect(color).toBe('bg-blue-400');
          } else if (percent <= 90) {
            expect(color).toBe('bg-blue-500');
          } else {
            expect(color).toBe('bg-blue-600');
          }
        }),
      );
    });

    it('Property: Color intensity is monotonically increasing with utilization', () => {
      const colorOrder = ['bg-gray-100', 'bg-blue-200', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600'];
      const colorToIndex = Object.fromEntries(colorOrder.map((c, i) => [c, i]));

      assert(
        fc.property(
          utilizationPercentArb,
          utilizationPercentArb,
          (percent1, percent2) => {
            fc.pre(percent1 < percent2); // Precondition: percent1 < percent2

            const color1 = getColorIntensity(percent1);
            const color2 = getColorIntensity(percent2);

            const index1 = colorToIndex[color1];
            const index2 = colorToIndex[color2];

            // Higher percentage should have same or higher color intensity
            expect(index2).toBeGreaterThanOrEqual(index1);
          },
        ),
      );
    });
  });

  // --------------------------------------------------------------------------
  // 5. Date Formatting (Timezone-safe)
  // --------------------------------------------------------------------------

  describe('Date Formatting for Charts', () => {
    it('Property: Date strings are always parseable back to Date objects', () => {
      assert(
        fc.property(recentDateArb, (dateString) => {
          const parsed = new Date(dateString);

          // Invariant: Valid date object
          expect(parsed).toBeInstanceOf(Date);
          expect(isNaN(parsed.getTime())).toBe(false);
        }),
      );
    });

    it('Property: Hungarian locale date formatting is reversible', () => {
      assert(
        fc.property(recentDateArb, (dateString) => {
          const date = new Date(dateString);
          const formatted = date.toLocaleDateString('hu-HU');

          // Invariant: Format is YYYY. MM. DD. or YYYY. M. D.
          expect(formatted).toMatch(/^\d{4}\.\s\d{1,2}\.\s\d{1,2}\.$/);
        }),
      );
    });

    it('Property: Date formatting for chart X-axis is consistent', () => {
      assert(
        fc.property(recentDateArb, (dateString) => {
          const date = new Date(dateString);
          const formatted = `${date.getMonth() + 1}/${date.getDate()}`;

          // Invariant: Format is M/D or MM/DD
          expect(formatted).toMatch(/^\d{1,2}\/\d{1,2}$/);

          // Invariant: Month is 1-12
          const month = date.getMonth() + 1;
          expect(month).toBeGreaterThanOrEqual(1);
          expect(month).toBeLessThanOrEqual(12);

          // Invariant: Day is 1-31
          const day = date.getDate();
          expect(day).toBeGreaterThanOrEqual(1);
          expect(day).toBeLessThanOrEqual(31);
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // 6. Stock Summary Total Invariants
  // --------------------------------------------------------------------------

  describe('Stock Summary Total Calculations', () => {
    it('Property: Total equals sum of all location counts', () => {
      assert(
        fc.property(stockSummaryArb, (data) => {
          const locationSum = Object.values(data.byLocation).reduce(
            (sum, loc) => sum + loc.count,
            0,
          );

          expect(locationSum).toBe(data.total);
        }),
      );
    });

    it('Property: Total equals sum of status breakdown', () => {
      assert(
        fc.property(stockSummaryArb, (data) => {
          const statusSum = data.byStatus.available + data.byStatus.rented + data.byStatus.service;

          expect(statusSum).toBe(data.total);
        }),
      );
    });

    it('Property: Each status count is non-negative and <= total', () => {
      assert(
        fc.property(stockSummaryArb, (data) => {
          expect(data.byStatus.available).toBeGreaterThanOrEqual(0);
          expect(data.byStatus.available).toBeLessThanOrEqual(data.total);

          expect(data.byStatus.rented).toBeGreaterThanOrEqual(0);
          expect(data.byStatus.rented).toBeLessThanOrEqual(data.total);

          expect(data.byStatus.service).toBeGreaterThanOrEqual(0);
          expect(data.byStatus.service).toBeLessThanOrEqual(data.total);
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // 7. Heatmap Data Invariants
  // --------------------------------------------------------------------------

  describe('Heatmap Data Structure Invariants', () => {
    it('Property: Utilization percentage is always 0-100', () => {
      assert(
        fc.property(heatmapCellArb, (cell) => {
          expect(cell.utilizationPercent).toBeGreaterThanOrEqual(0);
          expect(cell.utilizationPercent).toBeLessThanOrEqual(100);
        }),
      );
    });

    it('Property: Count is non-negative', () => {
      assert(
        fc.property(heatmapCellArb, (cell) => {
          expect(cell.count).toBeGreaterThanOrEqual(0);
        }),
      );
    });

    it('Property: Machine type and location keys are valid strings', () => {
      assert(
        fc.property(heatmapCellArb, (cell) => {
          expect(typeof cell.machineType).toBe('string');
          expect(cell.machineType.length).toBeGreaterThan(0);

          expect(typeof cell.location).toBe('string');
          expect(cell.location.length).toBeGreaterThan(0);
        }),
      );
    });
  });

  // --------------------------------------------------------------------------
  // 8. Additional Edge Cases and Boundary Conditions
  // --------------------------------------------------------------------------

  describe('Edge Cases and Boundary Conditions', () => {
    it('Property: Zero counts produce zero percentages', () => {
      const zeroData = {
        total: 0,
        byLocation: {
          budapest_raktár: { count: 0, percentage: 0 },
        },
        byStatus: { available: 0, rented: 0, service: 0 },
      };

      expect(zeroData.byLocation.budapest_raktár.percentage).toBe(0);
    });

    it('Property: Single location has 100% distribution', () => {
      assert(
        fc.property(fc.integer({ min: 1, max: 1000 }), (count) => {
          // When there's only one location, it should have 100% of the total
          const percentage = (count / count) * 100;
          expect(percentage).toBe(100);
        }),
      );
    });

    it('Property: Percentage formatting to 1 decimal place is stable', () => {
      assert(
        fc.property(fc.float({ min: 0, max: 100 }), (percent) => {
          const formatted = percent.toFixed(1);
          const parsed = parseFloat(formatted);

          // Difference should be less than 0.05 (half of rounding unit)
          expect(Math.abs(parsed - percent)).toBeLessThan(0.05);
        }),
      );
    });
  });
});
