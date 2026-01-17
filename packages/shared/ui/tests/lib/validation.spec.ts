import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  createValidationSchema,
  hungarianErrorMap,
  commonSchemas,
} from '../../src/lib/validation';

describe('Validation utilities', () => {
  describe('hungarianErrorMap', () => {
    it('should return Hungarian message for required error', () => {
      const schema = z.string();
      const result = schema.safeParse(undefined);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Kötelező mező');
      }
    });

    it('should return Hungarian message for invalid type', () => {
      const schema = z.string();
      const result = schema.safeParse(123);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Érvénytelen típus');
      }
    });

    it('should return Hungarian message for invalid URL', () => {
      const schema = z.string().url();
      const result = schema.safeParse('not-a-url');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Érvénytelen URL');
      }
    });

    it('should return Hungarian message for invalid UUID', () => {
      const schema = z.string().uuid();
      const result = schema.safeParse('not-a-uuid');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Érvénytelen UUID');
      }
    });

    it('should return Hungarian message for invalid regex', () => {
      const schema = z.string().regex(/^[a-z]+$/);
      const result = schema.safeParse('ABC123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Érvénytelen formátum');
      }
    });

    it('should return Hungarian message for too_small number (non-inclusive)', () => {
      const schema = z.number().gt(5);
      const result = schema.safeParse(3);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Nagyobb, mint');
      }
    });

    it('should return Hungarian message for too_big number (non-inclusive)', () => {
      const schema = z.number().lt(10);
      const result = schema.safeParse(15);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Kisebb, mint');
      }
    });

    it('should return Hungarian message for too_big number (inclusive)', () => {
      const schema = z.number().lte(10);
      const result = schema.safeParse(15);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Legfeljebb');
      }
    });

    it('should return Hungarian message for too_small array', () => {
      const schema = z.array(z.string()).min(2);
      const result = schema.safeParse(['one']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Legalább');
        expect(result.error.issues[0]?.message).toContain('elem');
      }
    });

    it('should return Hungarian message for too_big array', () => {
      const schema = z.array(z.string()).max(2);
      const result = schema.safeParse(['one', 'two', 'three']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Legfeljebb');
        expect(result.error.issues[0]?.message).toContain('elem');
      }
    });

    it('should return Hungarian message for invalid enum value', () => {
      const schema = z.enum(['a', 'b', 'c']);
      const result = schema.safeParse('d');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Érvénytelen érték');
      }
    });

    it('should return Hungarian message for invalid date', () => {
      const schema = z.date();
      const result = schema.safeParse(new Date('invalid'));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Érvénytelen dátum');
      }
    });
  });

  describe('commonSchemas', () => {
    describe('email', () => {
      it('should validate correct email', () => {
        const result = commonSchemas.email.safeParse('test@example.com');
        expect(result.success).toBe(true);
      });

      it('should reject invalid email', () => {
        const result = commonSchemas.email.safeParse('invalid');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe('Érvénytelen email cím');
        }
      });

      it('should reject empty email', () => {
        const result = commonSchemas.email.safeParse('');
        expect(result.success).toBe(false);
      });
    });

    describe('phone', () => {
      it('should validate correct phone number', () => {
        const result = commonSchemas.phone.safeParse('+36201234567');
        expect(result.success).toBe(true);
      });

      it('should validate phone without plus', () => {
        const result = commonSchemas.phone.safeParse('06201234567');
        expect(result.success).toBe(true);
      });

      it('should reject invalid phone', () => {
        const result = commonSchemas.phone.safeParse('abc');
        expect(result.success).toBe(false);
      });
    });

    describe('taxNumber', () => {
      it('should validate correct tax number', () => {
        const result = commonSchemas.taxNumber.safeParse('12345678-1-12');
        expect(result.success).toBe(true);
      });

      it('should reject invalid tax number format', () => {
        const result = commonSchemas.taxNumber.safeParse('123');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toContain('adószám');
        }
      });
    });

    describe('iban', () => {
      it('should validate correct IBAN', () => {
        const result = commonSchemas.iban.safeParse('HU42117730161111101800000000');
        expect(result.success).toBe(true);
      });

      it('should reject short IBAN', () => {
        const result = commonSchemas.iban.safeParse('HU42');
        expect(result.success).toBe(false);
      });
    });

    describe('password', () => {
      it('should validate strong password', () => {
        const result = commonSchemas.password.safeParse('SecurePass123!');
        expect(result.success).toBe(true);
      });

      it('should reject short password', () => {
        const result = commonSchemas.password.safeParse('short');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toContain('8');
        }
      });
    });

    describe('pin', () => {
      it('should validate 4-digit PIN', () => {
        const result = commonSchemas.pin.safeParse('1234');
        expect(result.success).toBe(true);
      });

      it('should reject non-numeric PIN', () => {
        const result = commonSchemas.pin.safeParse('abcd');
        expect(result.success).toBe(false);
      });

      it('should reject too short PIN', () => {
        const result = commonSchemas.pin.safeParse('123');
        expect(result.success).toBe(false);
      });
    });

    describe('requiredString', () => {
      it('should accept non-empty string', () => {
        const result = commonSchemas.requiredString.safeParse('text');
        expect(result.success).toBe(true);
      });

      it('should reject empty string', () => {
        const result = commonSchemas.requiredString.safeParse('');
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe('Kötelező mező');
        }
      });
    });

    describe('positiveNumber', () => {
      it('should accept positive number', () => {
        const result = commonSchemas.positiveNumber.safeParse(10);
        expect(result.success).toBe(true);
      });

      it('should reject negative number', () => {
        const result = commonSchemas.positiveNumber.safeParse(-5);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toMatch(/pozitív/i);
        }
      });

      it('should reject zero', () => {
        const result = commonSchemas.positiveNumber.safeParse(0);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('createValidationSchema', () => {
    it('should create schema from object shape', () => {
      const schema = createValidationSchema({
        name: commonSchemas.requiredString,
        email: commonSchemas.email,
      });

      const validResult = schema.safeParse({
        name: 'Test',
        email: 'test@example.com',
      });
      expect(validResult.success).toBe(true);

      const invalidResult = schema.safeParse({
        name: '',
        email: 'invalid',
      });
      expect(invalidResult.success).toBe(false);
    });
  });
});
