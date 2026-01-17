/**
 * Update PIN DTO Tests
 * Story 2.6: User Profile Management
 * AC#4: PIN code modification validation
 * AC#5: Input validation tests
 *
 * TDD: Tests for updatePinSchema and validation
 */

import { describe, it, expect } from 'vitest';
import {
  updatePinSchema,
  validateUpdatePinInput,
  PIN_REGEX,
} from './update-pin.dto';

describe('update-pin.dto', () => {
  describe('updatePinSchema', () => {
    describe('currentPin validation', () => {
      it('should accept 4-digit PIN', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '1234',
          newPin: '5678',
        });
        expect(result.success).toBe(true);
      });

      it('should accept 5-digit PIN', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '12345',
          newPin: '56789',
        });
        expect(result.success).toBe(true);
      });

      it('should accept 6-digit PIN', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '123456',
          newPin: '567890',
        });
        expect(result.success).toBe(true);
      });

      it('should reject 3-digit PIN (too short)', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '123',
          newPin: '5678',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toContain('4-6 számjegy');
        }
      });

      it('should reject 7-digit PIN (too long)', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '1234567',
          newPin: '5678',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toContain('4-6 számjegy');
        }
      });

      it('should reject non-numeric PIN', () => {
        const result = updatePinSchema.safeParse({
          currentPin: 'abcd',
          newPin: '5678',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toContain('4-6 számjegy');
        }
      });

      it('should reject mixed alphanumeric PIN', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '12ab',
          newPin: '5678',
        });
        expect(result.success).toBe(false);
      });

      it('should require currentPin', () => {
        const result = updatePinSchema.safeParse({
          newPin: '5678',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some((i) => i.path.includes('currentPin'))).toBe(
            true
          );
        }
      });
    });

    describe('newPin validation', () => {
      it('should accept 4-digit PIN', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '1234',
          newPin: '5678',
        });
        expect(result.success).toBe(true);
      });

      it('should accept 5-digit PIN', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '1234',
          newPin: '56789',
        });
        expect(result.success).toBe(true);
      });

      it('should accept 6-digit PIN', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '1234',
          newPin: '567890',
        });
        expect(result.success).toBe(true);
      });

      it('should reject 3-digit PIN (too short)', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '1234',
          newPin: '567',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toContain('4-6 számjegy');
        }
      });

      it('should reject 7-digit PIN (too long)', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '1234',
          newPin: '5678901',
        });
        expect(result.success).toBe(false);
      });

      it('should reject non-numeric newPin', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '1234',
          newPin: 'efgh',
        });
        expect(result.success).toBe(false);
      });

      it('should require newPin', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '1234',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some((i) => i.path.includes('newPin'))).toBe(
            true
          );
        }
      });
    });

    describe('combined validation', () => {
      it('should accept valid currentPin and newPin', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '1234',
          newPin: '5678',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.currentPin).toBe('1234');
          expect(result.data.newPin).toBe('5678');
        }
      });

      it('should allow same PIN for current and new (policy check in service)', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '1234',
          newPin: '1234',
        });
        // DTO doesn't check if same - business logic in service
        expect(result.success).toBe(true);
      });

      it('should report multiple errors', () => {
        const result = updatePinSchema.safeParse({
          currentPin: '12',
          newPin: 'ab',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBe(2);
        }
      });
    });
  });

  describe('validateUpdatePinInput()', () => {
    it('should return success for valid input', () => {
      const result = validateUpdatePinInput({
        currentPin: '1234',
        newPin: '5678',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currentPin).toBe('1234');
        expect(result.data.newPin).toBe('5678');
      }
    });

    it('should return error with field details for invalid input', () => {
      const result = validateUpdatePinInput({
        currentPin: '12',
        newPin: 'abcd',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('Érvénytelen bemenet');
        expect(result.error.fields).toBeDefined();
        expect(result.error.fields?.currentPin).toContain('4-6 számjegy');
        expect(result.error.fields?.newPin).toContain('4-6 számjegy');
      }
    });

    it('should handle missing fields', () => {
      const result = validateUpdatePinInput({});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.fields?.currentPin).toBeDefined();
        expect(result.error.fields?.newPin).toBeDefined();
      }
    });

    it('should handle null input', () => {
      const result = validateUpdatePinInput(null);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle non-object input', () => {
      const result = validateUpdatePinInput('not an object');

      expect(result.success).toBe(false);
    });
  });

  describe('PIN_REGEX', () => {
    const validPins = ['1234', '12345', '123456', '0000', '9999', '00000', '999999'];

    const invalidPins = [
      '123', // Too short
      '1234567', // Too long
      'abcd', // Letters
      '12ab', // Mixed
      '12.4', // Special char
      ' 1234', // Leading space
      '1234 ', // Trailing space
      '', // Empty
    ];

    it.each(validPins)('should match valid PIN: %s', (pin) => {
      expect(PIN_REGEX.test(pin)).toBe(true);
    });

    it.each(invalidPins)('should not match invalid PIN: %s', (pin) => {
      expect(PIN_REGEX.test(pin)).toBe(false);
    });
  });
});
