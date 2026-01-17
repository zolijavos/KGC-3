/**
 * Verify Password DTO Tests
 * Story 2.4: Elevated Access Requirement
 * AC#6: POST /api/v1/auth/verify-password endpoint
 *
 * TDD Red-Green-Refactor
 */

import { describe, it, expect } from 'vitest';
import {
  verifyPasswordSchema,
  validateVerifyPasswordInput,
  type VerifyPasswordDto,
} from './verify-password.dto';

describe('verifyPasswordSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid password', () => {
      const input = { password: 'ValidPassword123' };
      const result = verifyPasswordSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password).toBe('ValidPassword123');
      }
    });

    it('should accept minimum length password (1 char)', () => {
      const input = { password: 'a' };
      const result = verifyPasswordSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it('should accept maximum length password (128 chars)', () => {
      const input = { password: 'a'.repeat(128) };
      const result = verifyPasswordSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing password', () => {
      const input = {};
      const result = verifyPasswordSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const input = { password: '' };
      const result = verifyPasswordSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject password exceeding max length (129 chars)', () => {
      const input = { password: 'a'.repeat(129) };
      const result = verifyPasswordSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject non-string password', () => {
      const input = { password: 12345 };
      const result = verifyPasswordSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should reject null password', () => {
      const input = { password: null };
      const result = verifyPasswordSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});

describe('validateVerifyPasswordInput', () => {
  describe('valid inputs', () => {
    it('should return success with parsed data', () => {
      const input = { password: 'MySecurePassword123' };
      const result = validateVerifyPasswordInput(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.password).toBe('MySecurePassword123');
      }
    });

    it('should strip extra fields', () => {
      const input = { password: 'ValidPassword', extraField: 'should be ignored' };
      const result = validateVerifyPasswordInput(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ password: 'ValidPassword' });
        expect((result.data as Record<string, unknown>)['extraField']).toBeUndefined();
      }
    });
  });

  describe('invalid inputs', () => {
    it('should return error for missing password', () => {
      const input = {};
      const result = validateVerifyPasswordInput(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.fields?.['password']).toBeDefined();
      }
    });

    it('should return error for empty password', () => {
      const input = { password: '' };
      const result = validateVerifyPasswordInput(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.fields?.['password']).toBeDefined();
      }
    });

    it('should return Hungarian error message', () => {
      const input = {};
      const result = validateVerifyPasswordInput(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Érvénytelen bemenet');
      }
    });

    it('should return error for non-object input', () => {
      const result = validateVerifyPasswordInput('not an object');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should return error for null input', () => {
      const result = validateVerifyPasswordInput(null);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});

describe('VerifyPasswordDto type', () => {
  it('should have correct shape', () => {
    const dto: VerifyPasswordDto = {
      password: 'TestPassword123',
    };

    expect(dto.password).toBe('TestPassword123');
  });
});
