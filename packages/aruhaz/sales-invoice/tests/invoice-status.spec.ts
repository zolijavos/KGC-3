/**
 * Invoice Status State Machine Tests - TDD RED Phase
 * Story 10-4: Számla Státusz Workflow
 * @package @kgc/sales-invoice
 *
 * TDD KÖTELEZŐ - State machine átmenetek
 */

import { describe, it, expect } from 'vitest';
import {
  InvoiceStatus,
  canTransition,
  getNextStatuses,
  validateTransition,
  InvoiceStatusError,
  isFinalStatus,
  canCancel,
} from '../src/services/invoice-status';

describe('InvoiceStatus State Machine', () => {
  // ============================================
  // Valid Transitions
  // ============================================
  describe('Valid Transitions', () => {
    const validTransitions: [InvoiceStatus, InvoiceStatus][] = [
      // DRAFT transitions
      ['DRAFT', 'ISSUED'],
      ['DRAFT', 'CANCELLED'],

      // ISSUED transitions
      ['ISSUED', 'SENT'],
      ['ISSUED', 'PAID'],
      ['ISSUED', 'PARTIALLY_PAID'],
      ['ISSUED', 'CANCELLED'],

      // SENT transitions
      ['SENT', 'PAID'],
      ['SENT', 'PARTIALLY_PAID'],
      ['SENT', 'OVERDUE'],
      ['SENT', 'CANCELLED'],

      // PARTIALLY_PAID transitions
      ['PARTIALLY_PAID', 'PAID'],
      ['PARTIALLY_PAID', 'OVERDUE'],

      // OVERDUE transitions
      ['OVERDUE', 'PAID'],
      ['OVERDUE', 'PARTIALLY_PAID'],
    ];

    validTransitions.forEach(([from, to]) => {
      it(`should allow transition from ${from} to ${to}`, () => {
        expect(canTransition(from, to)).toBe(true);
      });
    });
  });

  // ============================================
  // Invalid Transitions
  // ============================================
  describe('Invalid Transitions', () => {
    const invalidTransitions: [InvoiceStatus, InvoiceStatus][] = [
      // Cannot go back to DRAFT
      ['ISSUED', 'DRAFT'],
      ['SENT', 'DRAFT'],
      ['PAID', 'DRAFT'],

      // Cannot transition from PAID (final state)
      ['PAID', 'ISSUED'],
      ['PAID', 'SENT'],
      ['PAID', 'CANCELLED'],

      // Cannot transition from CANCELLED (final state)
      ['CANCELLED', 'DRAFT'],
      ['CANCELLED', 'ISSUED'],
      ['CANCELLED', 'PAID'],

      // Cannot skip states
      ['DRAFT', 'PAID'],
      ['DRAFT', 'SENT'],
      ['DRAFT', 'OVERDUE'],

      // Cannot go backwards
      ['SENT', 'ISSUED'],
      ['OVERDUE', 'SENT'],
      ['PARTIALLY_PAID', 'ISSUED'],
    ];

    invalidTransitions.forEach(([from, to]) => {
      it(`should NOT allow transition from ${from} to ${to}`, () => {
        expect(canTransition(from, to)).toBe(false);
      });
    });
  });

  // ============================================
  // getNextStatuses() Tests
  // ============================================
  describe('getNextStatuses()', () => {
    it('should return [ISSUED, CANCELLED] for DRAFT', () => {
      const next = getNextStatuses('DRAFT');
      expect(next).toContain('ISSUED');
      expect(next).toContain('CANCELLED');
      expect(next).toHaveLength(2);
    });

    it('should return [SENT, PAID, PARTIALLY_PAID, CANCELLED] for ISSUED', () => {
      const next = getNextStatuses('ISSUED');
      expect(next).toContain('SENT');
      expect(next).toContain('PAID');
      expect(next).toContain('PARTIALLY_PAID');
      expect(next).toContain('CANCELLED');
      expect(next).toHaveLength(4);
    });

    it('should return [PAID, PARTIALLY_PAID, OVERDUE, CANCELLED] for SENT', () => {
      const next = getNextStatuses('SENT');
      expect(next).toContain('PAID');
      expect(next).toContain('PARTIALLY_PAID');
      expect(next).toContain('OVERDUE');
      expect(next).toContain('CANCELLED');
      expect(next).toHaveLength(4);
    });

    it('should return [PAID, OVERDUE] for PARTIALLY_PAID', () => {
      const next = getNextStatuses('PARTIALLY_PAID');
      expect(next).toContain('PAID');
      expect(next).toContain('OVERDUE');
      expect(next).toHaveLength(2);
    });

    it('should return [PAID, PARTIALLY_PAID] for OVERDUE', () => {
      const next = getNextStatuses('OVERDUE');
      expect(next).toContain('PAID');
      expect(next).toContain('PARTIALLY_PAID');
      expect(next).toHaveLength(2);
    });

    it('should return empty array for PAID (final state)', () => {
      const next = getNextStatuses('PAID');
      expect(next).toHaveLength(0);
    });

    it('should return empty array for CANCELLED (final state)', () => {
      const next = getNextStatuses('CANCELLED');
      expect(next).toHaveLength(0);
    });
  });

  // ============================================
  // validateTransition() Tests
  // ============================================
  describe('validateTransition()', () => {
    it('should not throw for valid transition', () => {
      expect(() => validateTransition('DRAFT', 'ISSUED')).not.toThrow();
    });

    it('should throw InvoiceStatusError for invalid transition', () => {
      expect(() => validateTransition('DRAFT', 'PAID')).toThrow(InvoiceStatusError);
    });

    it('should include from/to status in error message', () => {
      try {
        validateTransition('PAID', 'DRAFT');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as InvoiceStatusError).message).toContain('PAID');
        expect((error as InvoiceStatusError).message).toContain('DRAFT');
      }
    });

    it('should have correct error code', () => {
      try {
        validateTransition('CANCELLED', 'ISSUED');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as InvoiceStatusError).code).toBe('INVALID_STATUS_TRANSITION');
      }
    });
  });

  // ============================================
  // Business Rules
  // ============================================
  describe('Business Rules', () => {
    it('PAID and CANCELLED should be final states', () => {
      expect(getNextStatuses('PAID')).toHaveLength(0);
      expect(getNextStatuses('CANCELLED')).toHaveLength(0);
    });

    it('CANCELLED should be reachable from most states except final ones', () => {
      const statesWithCancel: InvoiceStatus[] = ['DRAFT', 'ISSUED', 'SENT'];
      for (const state of statesWithCancel) {
        expect(canTransition(state, 'CANCELLED')).toBe(true);
      }
    });

    it('PARTIALLY_PAID and OVERDUE should NOT be cancellable', () => {
      // Üzleti szabály: részben fizetett vagy lejárt számlát nem lehet sztornózni
      expect(canTransition('PARTIALLY_PAID', 'CANCELLED')).toBe(false);
      expect(canTransition('OVERDUE', 'CANCELLED')).toBe(false);
    });
  });

  // ============================================
  // isFinalStatus() Tests
  // ============================================
  describe('isFinalStatus()', () => {
    it('should return true for PAID', () => {
      expect(isFinalStatus('PAID')).toBe(true);
    });

    it('should return true for CANCELLED', () => {
      expect(isFinalStatus('CANCELLED')).toBe(true);
    });

    it('should return false for DRAFT', () => {
      expect(isFinalStatus('DRAFT')).toBe(false);
    });

    it('should return false for ISSUED', () => {
      expect(isFinalStatus('ISSUED')).toBe(false);
    });

    it('should return false for SENT', () => {
      expect(isFinalStatus('SENT')).toBe(false);
    });

    it('should return false for PARTIALLY_PAID', () => {
      expect(isFinalStatus('PARTIALLY_PAID')).toBe(false);
    });

    it('should return false for OVERDUE', () => {
      expect(isFinalStatus('OVERDUE')).toBe(false);
    });
  });

  // ============================================
  // canCancel() Tests
  // ============================================
  describe('canCancel()', () => {
    it('should return true for DRAFT', () => {
      expect(canCancel('DRAFT')).toBe(true);
    });

    it('should return true for ISSUED', () => {
      expect(canCancel('ISSUED')).toBe(true);
    });

    it('should return true for SENT', () => {
      expect(canCancel('SENT')).toBe(true);
    });

    it('should return false for PARTIALLY_PAID', () => {
      expect(canCancel('PARTIALLY_PAID')).toBe(false);
    });

    it('should return false for OVERDUE', () => {
      expect(canCancel('OVERDUE')).toBe(false);
    });

    it('should return false for PAID (final state)', () => {
      expect(canCancel('PAID')).toBe(false);
    });

    it('should return false for CANCELLED (final state)', () => {
      expect(canCancel('CANCELLED')).toBe(false);
    });
  });
});
