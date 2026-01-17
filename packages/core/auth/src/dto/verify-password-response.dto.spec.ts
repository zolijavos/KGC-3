/**
 * Verify Password Response DTO Tests
 * Story 2.4: Elevated Access Requirement
 * AC#6: POST /api/v1/auth/verify-password endpoint
 *
 * TDD Red-Green-Refactor
 */

import { describe, it, expect } from 'vitest';
import {
  verifyPasswordResponseSchema,
  VERIFY_PASSWORD_MESSAGES,
  VerifyPasswordErrorCode,
  type VerifyPasswordResponse,
} from './verify-password-response.dto';

describe('verifyPasswordResponseSchema', () => {
  describe('valid responses', () => {
    it('should accept valid success response', () => {
      const response = {
        data: {
          success: true,
          validUntil: '2026-01-16T10:05:00.000Z',
          message: 'Emelt szintű hozzáférés megerősítve',
        },
      };

      const result = verifyPasswordResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.success).toBe(true);
        expect(result.data.data.validUntil).toBe('2026-01-16T10:05:00.000Z');
      }
    });

    it('should accept ISO8601 datetime string for validUntil', () => {
      const response = {
        data: {
          success: true,
          validUntil: new Date().toISOString(),
          message: 'Test message',
        },
      };

      const result = verifyPasswordResponseSchema.safeParse(response);

      expect(result.success).toBe(true);
    });
  });

  describe('invalid responses', () => {
    it('should reject missing data field', () => {
      const response = {};
      const result = verifyPasswordResponseSchema.safeParse(response);

      expect(result.success).toBe(false);
    });

    it('should reject missing success field', () => {
      const response = {
        data: {
          validUntil: '2026-01-16T10:05:00.000Z',
          message: 'Test',
        },
      };
      const result = verifyPasswordResponseSchema.safeParse(response);

      expect(result.success).toBe(false);
    });

    it('should reject success: false (must be literal true)', () => {
      const response = {
        data: {
          success: false,
          validUntil: '2026-01-16T10:05:00.000Z',
          message: 'Test',
        },
      };
      const result = verifyPasswordResponseSchema.safeParse(response);

      expect(result.success).toBe(false);
    });

    it('should reject missing validUntil', () => {
      const response = {
        data: {
          success: true,
          message: 'Test',
        },
      };
      const result = verifyPasswordResponseSchema.safeParse(response);

      expect(result.success).toBe(false);
    });

    it('should reject missing message', () => {
      const response = {
        data: {
          success: true,
          validUntil: '2026-01-16T10:05:00.000Z',
        },
      };
      const result = verifyPasswordResponseSchema.safeParse(response);

      expect(result.success).toBe(false);
    });
  });
});

describe('VERIFY_PASSWORD_MESSAGES', () => {
  it('should have SUCCESS message in Hungarian', () => {
    expect(VERIFY_PASSWORD_MESSAGES.SUCCESS).toBe('Emelt szintű hozzáférés megerősítve');
  });

  it('should have INVALID_PASSWORD message in Hungarian', () => {
    expect(VERIFY_PASSWORD_MESSAGES.INVALID_PASSWORD).toBe('Érvénytelen jelszó');
  });
});

describe('VerifyPasswordErrorCode', () => {
  it('should have INVALID_PASSWORD code', () => {
    expect(VerifyPasswordErrorCode.INVALID_PASSWORD).toBe('INVALID_PASSWORD');
  });

  it('should have USER_NOT_FOUND code', () => {
    expect(VerifyPasswordErrorCode.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
  });
});

describe('VerifyPasswordResponse interface', () => {
  it('should have correct shape', () => {
    const response: VerifyPasswordResponse = {
      data: {
        success: true,
        validUntil: '2026-01-16T10:05:00.000Z',
        message: 'Emelt szintű hozzáférés megerősítve',
      },
    };

    expect(response.data.success).toBe(true);
    expect(response.data.validUntil).toBe('2026-01-16T10:05:00.000Z');
    expect(response.data.message).toBe('Emelt szintű hozzáférés megerősítve');
  });
});
