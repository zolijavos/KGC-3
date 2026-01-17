/**
 * VAT Calculator Tests - TDD RED Phase
 * Story 10-2: Számla Tétel Kezelés
 * @package @kgc/sales-invoice
 *
 * TDD KÖTELEZŐ - Pénzügyi számítás (90% coverage target)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateVatAmount,
  calculateGrossAmount,
  calculateNetFromGross,
  getVatPercentage,
  roundToHuf,
  VatRate,
} from '../src/services/vat-calculator';

describe('VatCalculator', () => {
  // ============================================
  // getVatPercentage() Tests
  // ============================================
  describe('getVatPercentage()', () => {
    it('should return 27 for RATE_27', () => {
      expect(getVatPercentage('RATE_27')).toBe(27);
    });

    it('should return 18 for RATE_18', () => {
      expect(getVatPercentage('RATE_18')).toBe(18);
    });

    it('should return 5 for RATE_5', () => {
      expect(getVatPercentage('RATE_5')).toBe(5);
    });

    it('should return 0 for RATE_0', () => {
      expect(getVatPercentage('RATE_0')).toBe(0);
    });

    it('should return 0 for AAM (alanyi adómentes)', () => {
      expect(getVatPercentage('AAM')).toBe(0);
    });

    it('should return 0 for TAM (tárgyi adómentes)', () => {
      expect(getVatPercentage('TAM')).toBe(0);
    });

    it('should return 0 for EU', () => {
      expect(getVatPercentage('EU')).toBe(0);
    });

    it('should throw for invalid VAT rate', () => {
      expect(() => getVatPercentage('INVALID' as VatRate)).toThrow('Invalid VAT rate');
    });
  });

  // ============================================
  // calculateVatAmount() Tests
  // ============================================
  describe('calculateVatAmount()', () => {
    it('should calculate 27% VAT correctly', () => {
      // 10000 * 0.27 = 2700
      expect(calculateVatAmount(10000, 'RATE_27')).toBe(2700);
    });

    it('should calculate 18% VAT correctly', () => {
      // 10000 * 0.18 = 1800
      expect(calculateVatAmount(10000, 'RATE_18')).toBe(1800);
    });

    it('should calculate 5% VAT correctly', () => {
      // 10000 * 0.05 = 500
      expect(calculateVatAmount(10000, 'RATE_5')).toBe(500);
    });

    it('should return 0 for 0% VAT', () => {
      expect(calculateVatAmount(10000, 'RATE_0')).toBe(0);
    });

    it('should return 0 for AAM', () => {
      expect(calculateVatAmount(50000, 'AAM')).toBe(0);
    });

    it('should round to integer HUF', () => {
      // 1234 * 0.27 = 333.18 -> 333
      expect(calculateVatAmount(1234, 'RATE_27')).toBe(333);
    });

    it('should round 0.5 down (bankers rounding)', () => {
      // 1850 * 0.27 = 499.5 -> 500 (round half to even)
      const result = calculateVatAmount(1850, 'RATE_27');
      expect(result).toBe(500);
    });

    it('should handle zero amount', () => {
      expect(calculateVatAmount(0, 'RATE_27')).toBe(0);
    });

    it('should handle negative amount', () => {
      // Sztornó számla esetén negatív összeg
      expect(calculateVatAmount(-10000, 'RATE_27')).toBe(-2700);
    });
  });

  // ============================================
  // calculateGrossAmount() Tests
  // ============================================
  describe('calculateGrossAmount()', () => {
    it('should calculate gross from net + VAT (27%)', () => {
      // 10000 + 2700 = 12700
      expect(calculateGrossAmount(10000, 'RATE_27')).toBe(12700);
    });

    it('should calculate gross from net + VAT (18%)', () => {
      // 10000 + 1800 = 11800
      expect(calculateGrossAmount(10000, 'RATE_18')).toBe(11800);
    });

    it('should return net amount for 0% VAT', () => {
      expect(calculateGrossAmount(10000, 'RATE_0')).toBe(10000);
    });

    it('should handle zero net amount', () => {
      expect(calculateGrossAmount(0, 'RATE_27')).toBe(0);
    });
  });

  // ============================================
  // calculateNetFromGross() Tests
  // ============================================
  describe('calculateNetFromGross()', () => {
    it('should calculate net from gross (27%)', () => {
      // 12700 / 1.27 = 10000
      expect(calculateNetFromGross(12700, 'RATE_27')).toBe(10000);
    });

    it('should calculate net from gross (18%)', () => {
      // 11800 / 1.18 = 10000
      expect(calculateNetFromGross(11800, 'RATE_18')).toBe(10000);
    });

    it('should return gross for 0% VAT', () => {
      expect(calculateNetFromGross(10000, 'RATE_0')).toBe(10000);
    });

    it('should round correctly', () => {
      // 15000 / 1.27 = 11811.0236... -> 11811
      expect(calculateNetFromGross(15000, 'RATE_27')).toBe(11811);
    });
  });

  // ============================================
  // roundToHuf() Tests
  // ============================================
  describe('roundToHuf()', () => {
    it('should round to nearest integer', () => {
      expect(roundToHuf(100.4)).toBe(100);
      expect(roundToHuf(100.5)).toBe(100); // Bankers rounding
      expect(roundToHuf(100.6)).toBe(101);
      expect(roundToHuf(101.5)).toBe(102); // Bankers rounding
    });

    it('should handle negative amounts', () => {
      expect(roundToHuf(-100.4)).toBe(-100);
      expect(roundToHuf(-100.6)).toBe(-101);
    });
  });

  // ============================================
  // Property-Based Tests (fast-check)
  // ============================================
  describe('Property-Based Tests', () => {
    it('VAT amount should never be negative for positive net', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 10000000 }), (netAmount) => {
          const vat = calculateVatAmount(netAmount, 'RATE_27');
          return vat >= 0;
        }),
      );
    });

    it('Gross should always be >= Net for non-negative VAT rates', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 10000000 }), (netAmount) => {
          const gross = calculateGrossAmount(netAmount, 'RATE_27');
          return gross >= netAmount;
        }),
      );
    });

    it('Net + VAT should equal Gross', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 10000000 }), (netAmount) => {
          const vat = calculateVatAmount(netAmount, 'RATE_27');
          const gross = calculateGrossAmount(netAmount, 'RATE_27');
          return netAmount + vat === gross;
        }),
      );
    });

    it('calculateNetFromGross should be inverse of calculateGrossAmount (within rounding)', () => {
      fc.assert(
        fc.property(fc.integer({ min: 100, max: 10000000 }), (netAmount) => {
          const gross = calculateGrossAmount(netAmount, 'RATE_27');
          const calculatedNet = calculateNetFromGross(gross, 'RATE_27');
          // Allow 1 HUF difference due to rounding
          return Math.abs(calculatedNet - netAmount) <= 1;
        }),
      );
    });

    it('VAT percentage should be between 0 and 100', () => {
      const validRates: VatRate[] = ['RATE_27', 'RATE_18', 'RATE_5', 'RATE_0', 'AAM', 'TAM', 'EU'];
      for (const rate of validRates) {
        const percentage = getVatPercentage(rate);
        expect(percentage).toBeGreaterThanOrEqual(0);
        expect(percentage).toBeLessThanOrEqual(100);
      }
    });
  });
});
