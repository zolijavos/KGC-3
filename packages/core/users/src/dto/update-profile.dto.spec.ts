/**
 * Update Profile DTO Tests
 * Story 2.6: User Profile Management
 * AC#5: Input validation tests
 *
 * TDD: Tests for updateProfileSchema and validation
 */

import { describe, it, expect } from 'vitest';
import {
  updateProfileSchema,
  validateUpdateProfileInput,
  HUNGARIAN_PHONE_REGEX,
} from './update-profile.dto';

describe('update-profile.dto', () => {
  describe('updateProfileSchema', () => {
    describe('name validation', () => {
      it('should accept valid name', () => {
        const result = updateProfileSchema.safeParse({ name: 'Kovács János' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('Kovács János');
        }
      });

      it('should accept minimum length name (2 chars)', () => {
        const result = updateProfileSchema.safeParse({ name: 'AB' });
        expect(result.success).toBe(true);
      });

      it('should reject too short name (1 char)', () => {
        const result = updateProfileSchema.safeParse({ name: 'A' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toContain('legalább 2 karakter');
        }
      });

      it('should reject too long name (256 chars)', () => {
        const longName = 'A'.repeat(256);
        const result = updateProfileSchema.safeParse({ name: longName });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toContain('maximum 255 karakter');
        }
      });

      it('should allow omitting name', () => {
        const result = updateProfileSchema.safeParse({});
        expect(result.success).toBe(true);
      });
    });

    describe('phone validation', () => {
      it('should accept valid +36 20 format', () => {
        const result = updateProfileSchema.safeParse({ phone: '+36 20 123 4567' });
        expect(result.success).toBe(true);
      });

      it('should accept valid 06 format', () => {
        const result = updateProfileSchema.safeParse({ phone: '06201234567' });
        expect(result.success).toBe(true);
      });

      it('should accept valid +36-30 format with dashes', () => {
        const result = updateProfileSchema.safeParse({ phone: '+36-30-123-4567' });
        expect(result.success).toBe(true);
      });

      it('should accept valid 06 31 format', () => {
        const result = updateProfileSchema.safeParse({ phone: '06 31 555 1234' });
        expect(result.success).toBe(true);
      });

      it('should accept valid +36 50 format', () => {
        const result = updateProfileSchema.safeParse({ phone: '+36 50 987 6543' });
        expect(result.success).toBe(true);
      });

      it('should accept valid +36 70 format', () => {
        const result = updateProfileSchema.safeParse({ phone: '+36 70 111 2222' });
        expect(result.success).toBe(true);
      });

      it('should reject invalid phone format', () => {
        const result = updateProfileSchema.safeParse({ phone: '1234567890' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toContain('magyar telefonszám');
        }
      });

      it('should reject international non-Hungarian number', () => {
        const result = updateProfileSchema.safeParse({ phone: '+1 555 123 4567' });
        expect(result.success).toBe(false);
      });

      it('should transform empty string to null', () => {
        const result = updateProfileSchema.safeParse({ phone: '' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.phone).toBeNull();
        }
      });

      it('should accept null phone', () => {
        const result = updateProfileSchema.safeParse({ phone: null });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.phone).toBeNull();
        }
      });

      it('should allow omitting phone', () => {
        const result = updateProfileSchema.safeParse({});
        expect(result.success).toBe(true);
      });
    });

    describe('avatarUrl validation', () => {
      it('should accept valid URL', () => {
        const result = updateProfileSchema.safeParse({
          avatarUrl: 'https://example.com/avatar.png',
        });
        expect(result.success).toBe(true);
      });

      it('should accept https URL', () => {
        const result = updateProfileSchema.safeParse({
          avatarUrl: 'https://cdn.example.com/images/user/123.jpg',
        });
        expect(result.success).toBe(true);
      });

      it('should accept http URL', () => {
        const result = updateProfileSchema.safeParse({
          avatarUrl: 'http://localhost:3000/avatar.png',
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid URL', () => {
        const result = updateProfileSchema.safeParse({ avatarUrl: 'not-a-url' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toContain('URL formátum');
        }
      });

      it('should reject too long URL (501 chars)', () => {
        const longUrl = 'https://example.com/' + 'a'.repeat(481);
        const result = updateProfileSchema.safeParse({ avatarUrl: longUrl });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toContain('maximum 500 karakter');
        }
      });

      it('should transform empty string to null', () => {
        const result = updateProfileSchema.safeParse({ avatarUrl: '' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.avatarUrl).toBeNull();
        }
      });

      it('should accept null avatarUrl', () => {
        const result = updateProfileSchema.safeParse({ avatarUrl: null });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.avatarUrl).toBeNull();
        }
      });

      it('should allow omitting avatarUrl', () => {
        const result = updateProfileSchema.safeParse({});
        expect(result.success).toBe(true);
      });
    });

    describe('combined validation', () => {
      it('should accept all valid fields together', () => {
        const result = updateProfileSchema.safeParse({
          name: 'Kovács János',
          phone: '+36 20 123 4567',
          avatarUrl: 'https://example.com/avatar.png',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('Kovács János');
          expect(result.data.phone).toBe('+36 20 123 4567');
          expect(result.data.avatarUrl).toBe('https://example.com/avatar.png');
        }
      });

      it('should accept empty object (no updates)', () => {
        const result = updateProfileSchema.safeParse({});
        expect(result.success).toBe(true);
      });
    });
  });

  describe('validateUpdateProfileInput()', () => {
    it('should return success for valid input', () => {
      const result = validateUpdateProfileInput({
        name: 'Test User',
        phone: '+36 70 123 4567',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test User');
        expect(result.data.phone).toBe('+36 70 123 4567');
      }
    });

    it('should return error with field details for invalid input', () => {
      const result = validateUpdateProfileInput({
        name: 'A', // Too short
        phone: 'invalid', // Invalid format
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('Érvénytelen bemenet');
        expect(result.error.fields).toBeDefined();
        expect(result.error.fields?.name).toContain('legalább 2 karakter');
        expect(result.error.fields?.phone).toContain('magyar telefonszám');
      }
    });

    it('should handle non-object input', () => {
      const result = validateUpdateProfileInput('not an object');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle null input', () => {
      const result = validateUpdateProfileInput(null);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('HUNGARIAN_PHONE_REGEX', () => {
    const validPhones = [
      '+36 20 123 4567',
      '+36201234567',
      '+36-20-123-4567',
      '06 20 123 4567',
      '06201234567',
      '06-20-123-4567',
      '+36 30 999 8888',
      '+36 31 111 2222',
      '+36 50 333 4444',
      '+36 70 555 6666',
    ];

    const invalidPhones = [
      '+36 21 123 4567', // Invalid prefix (21)
      '+36 40 123 4567', // Invalid prefix (40)
      '06 60 123 4567', // Invalid prefix (60)
      '+1 555 123 4567', // US number
      '1234567890', // No prefix
      '+36 20 12345678', // Too many digits
      '+36 20 12 3456', // Not enough digits
    ];

    it.each(validPhones)('should match valid phone: %s', (phone) => {
      expect(HUNGARIAN_PHONE_REGEX.test(phone)).toBe(true);
    });

    it.each(invalidPhones)('should not match invalid phone: %s', (phone) => {
      expect(HUNGARIAN_PHONE_REGEX.test(phone)).toBe(false);
    });
  });
});
