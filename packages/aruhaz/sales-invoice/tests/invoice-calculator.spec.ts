/**
 * Invoice Calculator Tests - TDD RED Phase
 * Story 10-2: Számla Tétel Kezelés
 * @package @kgc/sales-invoice
 *
 * TDD KÖTELEZŐ - Összeg számítások
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateInvoiceTotals,
  calculateItemAmount,
  applyDiscount,
  InvoiceItem,
  InvoiceTotals,
} from '../src/services/invoice-calculator';

describe('InvoiceCalculator', () => {
  // ============================================
  // calculateItemAmount() Tests
  // ============================================
  describe('calculateItemAmount()', () => {
    it('should calculate item amount correctly', () => {
      const result = calculateItemAmount({
        quantity: 2,
        unitPriceNet: 5000,
        vatRate: 'RATE_27',
      });

      expect(result.netAmount).toBe(10000);
      expect(result.vatAmount).toBe(2700);
      expect(result.grossAmount).toBe(12700);
    });

    it('should handle fractional quantities', () => {
      const result = calculateItemAmount({
        quantity: 1.5,
        unitPriceNet: 1000,
        vatRate: 'RATE_27',
      });

      expect(result.netAmount).toBe(1500);
      expect(result.vatAmount).toBe(405);
      expect(result.grossAmount).toBe(1905);
    });

    it('should handle zero quantity', () => {
      const result = calculateItemAmount({
        quantity: 0,
        unitPriceNet: 5000,
        vatRate: 'RATE_27',
      });

      expect(result.netAmount).toBe(0);
      expect(result.vatAmount).toBe(0);
      expect(result.grossAmount).toBe(0);
    });

    it('should handle different VAT rates', () => {
      const rates: Array<{ rate: string; expected: number }> = [
        { rate: 'RATE_27', expected: 2700 },
        { rate: 'RATE_18', expected: 1800 },
        { rate: 'RATE_5', expected: 500 },
        { rate: 'RATE_0', expected: 0 },
      ];

      for (const { rate, expected } of rates) {
        const result = calculateItemAmount({
          quantity: 1,
          unitPriceNet: 10000,
          vatRate: rate,
        });
        expect(result.vatAmount).toBe(expected);
      }
    });
  });

  // ============================================
  // applyDiscount() Tests
  // ============================================
  describe('applyDiscount()', () => {
    it('should apply percentage discount', () => {
      const result = applyDiscount(10000, { type: 'percent', value: 10 });
      expect(result).toBe(9000);
    });

    it('should apply fixed amount discount', () => {
      const result = applyDiscount(10000, { type: 'fixed', value: 1500 });
      expect(result).toBe(8500);
    });

    it('should not allow negative result', () => {
      const result = applyDiscount(1000, { type: 'fixed', value: 2000 });
      expect(result).toBe(0);
    });

    it('should handle 100% discount', () => {
      const result = applyDiscount(10000, { type: 'percent', value: 100 });
      expect(result).toBe(0);
    });

    it('should handle 0% discount', () => {
      const result = applyDiscount(10000, { type: 'percent', value: 0 });
      expect(result).toBe(10000);
    });

    it('should reject discount > 100%', () => {
      expect(() => applyDiscount(10000, { type: 'percent', value: 150 })).toThrow(
        'Discount cannot exceed 100%',
      );
    });

    it('should reject negative discount', () => {
      expect(() => applyDiscount(10000, { type: 'percent', value: -10 })).toThrow(
        'Discount cannot be negative',
      );
    });
  });

  // ============================================
  // calculateInvoiceTotals() Tests
  // ============================================
  describe('calculateInvoiceTotals()', () => {
    it('should calculate totals for single item', () => {
      const items: InvoiceItem[] = [
        {
          description: 'Test item',
          quantity: 1,
          unitPriceNet: 10000,
          vatRate: 'RATE_27',
        },
      ];

      const totals = calculateInvoiceTotals(items);

      expect(totals.netAmount).toBe(10000);
      expect(totals.vatAmount).toBe(2700);
      expect(totals.grossAmount).toBe(12700);
    });

    it('should calculate totals for multiple items', () => {
      const items: InvoiceItem[] = [
        { description: 'Item 1', quantity: 2, unitPriceNet: 5000, vatRate: 'RATE_27' },
        { description: 'Item 2', quantity: 1, unitPriceNet: 8000, vatRate: 'RATE_27' },
      ];

      const totals = calculateInvoiceTotals(items);

      // Item 1: net=10000, vat=2700, gross=12700
      // Item 2: net=8000, vat=2160, gross=10160
      // Total: net=18000, vat=4860, gross=22860
      expect(totals.netAmount).toBe(18000);
      expect(totals.vatAmount).toBe(4860);
      expect(totals.grossAmount).toBe(22860);
    });

    it('should handle mixed VAT rates', () => {
      const items: InvoiceItem[] = [
        { description: 'Item 27%', quantity: 1, unitPriceNet: 10000, vatRate: 'RATE_27' },
        { description: 'Item 5%', quantity: 1, unitPriceNet: 10000, vatRate: 'RATE_5' },
      ];

      const totals = calculateInvoiceTotals(items);

      // Item 1: vat=2700
      // Item 2: vat=500
      // Total vat=3200
      expect(totals.vatAmount).toBe(3200);
      expect(totals.netAmount).toBe(20000);
      expect(totals.grossAmount).toBe(23200);
    });

    it('should provide VAT breakdown by rate', () => {
      const items: InvoiceItem[] = [
        { description: 'Item 27%', quantity: 1, unitPriceNet: 10000, vatRate: 'RATE_27' },
        { description: 'Item 5%', quantity: 1, unitPriceNet: 10000, vatRate: 'RATE_5' },
      ];

      const totals = calculateInvoiceTotals(items);

      expect(totals.vatBreakdown).toBeDefined();
      expect(totals.vatBreakdown?.['RATE_27']).toEqual({
        netAmount: 10000,
        vatAmount: 2700,
        grossAmount: 12700,
      });
      expect(totals.vatBreakdown?.['RATE_5']).toEqual({
        netAmount: 10000,
        vatAmount: 500,
        grossAmount: 10500,
      });
    });

    it('should handle empty items array', () => {
      const totals = calculateInvoiceTotals([]);

      expect(totals.netAmount).toBe(0);
      expect(totals.vatAmount).toBe(0);
      expect(totals.grossAmount).toBe(0);
    });

    it('should handle items with discounts', () => {
      const items: InvoiceItem[] = [
        {
          description: 'Discounted item',
          quantity: 1,
          unitPriceNet: 10000,
          vatRate: 'RATE_27',
          discount: { type: 'percent', value: 10 },
        },
      ];

      const totals = calculateInvoiceTotals(items);

      // Net after discount: 9000
      // VAT: 2430
      // Gross: 11430
      expect(totals.netAmount).toBe(9000);
      expect(totals.vatAmount).toBe(2430);
      expect(totals.grossAmount).toBe(11430);
    });
  });

  // ============================================
  // Property-Based Tests
  // ============================================
  describe('Property-Based Tests', () => {
    it('gross should always equal net + vat', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 100, max: 1000000 }),
          (quantity, unitPrice) => {
            const result = calculateItemAmount({
              quantity,
              unitPriceNet: unitPrice,
              vatRate: 'RATE_27',
            });
            return result.grossAmount === result.netAmount + result.vatAmount;
          },
        ),
      );
    });

    it('invoice totals should equal sum of item totals', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              description: fc.string(),
              quantity: fc.integer({ min: 1, max: 10 }),
              unitPriceNet: fc.integer({ min: 100, max: 100000 }),
              vatRate: fc.constant('RATE_27' as const),
            }),
            { minLength: 1, maxLength: 10 },
          ),
          (items) => {
            const totals = calculateInvoiceTotals(items);

            const expectedNet = items.reduce(
              (sum, item) => sum + item.quantity * item.unitPriceNet,
              0,
            );

            return totals.netAmount === expectedNet;
          },
        ),
      );
    });
  });
});
