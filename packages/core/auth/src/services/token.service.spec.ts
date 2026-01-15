/**
 * Token Service Unit Tests - TDD Red-Green-Refactor
 * Story 1.1: JWT Login Endpoint
 * AC1: JWT access token (24h TTL) és refresh token (7d TTL)
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { UserForToken } from '../interfaces/jwt-payload.interface';
import { TokenService } from './token.service';

// Mock user for testing
const mockUser: UserForToken = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  name: 'Test User',
  role: 'OPERATOR',
  tenantId: '660e8400-e29b-41d4-a716-446655440001',
};

describe('TokenService', () => {
  let tokenService: TokenService;
  const jwtSecret = 'test-jwt-secret-at-least-32-characters-long';

  beforeEach(() => {
    tokenService = new TokenService(jwtSecret);
  });

  describe('generateAccessToken()', () => {
    describe('happy path', () => {
      it('should generate a valid JWT access token', async () => {
        const token = await tokenService.generateAccessToken(mockUser);

        // JWT format: header.payload.signature
        expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      });

      it('should include correct payload data in token', async () => {
        const token = await tokenService.generateAccessToken(mockUser);
        const payload = tokenService.decodeToken(token);

        expect(payload).toMatchObject({
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
          type: 'access', // P7: Token type validation
        });
      });

      it('should set expiration to 24 hours from now', async () => {
        const beforeTime = Math.floor(Date.now() / 1000);
        const token = await tokenService.generateAccessToken(mockUser);
        const afterTime = Math.floor(Date.now() / 1000);

        const payload = tokenService.decodeToken(token);
        const expectedExp = 24 * 60 * 60; // 24 hours in seconds

        // Expiration should be roughly 24 hours from now
        expect(payload?.exp).toBeGreaterThanOrEqual(beforeTime + expectedExp - 1);
        expect(payload?.exp).toBeLessThanOrEqual(afterTime + expectedExp + 1);
      });
    });

    describe('error handling', () => {
      it('should throw when user is null', async () => {
        await expect(
          tokenService.generateAccessToken(null as unknown as UserForToken)
        ).rejects.toThrow('User data is required');
      });

      it('should throw when user.id is missing', async () => {
        const invalidUser = { ...mockUser, id: undefined } as unknown as UserForToken;
        await expect(tokenService.generateAccessToken(invalidUser)).rejects.toThrow(
          'User ID is required'
        );
      });
    });
  });

  describe('generateRefreshToken()', () => {
    describe('happy path', () => {
      it('should generate a valid JWT refresh token', async () => {
        const token = await tokenService.generateRefreshToken(mockUser);

        expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
      });

      it('should set expiration to 7 days from now', async () => {
        const beforeTime = Math.floor(Date.now() / 1000);
        const token = await tokenService.generateRefreshToken(mockUser);
        const afterTime = Math.floor(Date.now() / 1000);

        const payload = tokenService.decodeToken(token);
        const expectedExp = 7 * 24 * 60 * 60; // 7 days in seconds

        expect(payload?.exp).toBeGreaterThanOrEqual(beforeTime + expectedExp - 1);
        expect(payload?.exp).toBeLessThanOrEqual(afterTime + expectedExp + 1);
      });

      it('should include user ID in refresh token payload', async () => {
        const token = await tokenService.generateRefreshToken(mockUser);
        const payload = tokenService.decodeToken(token);

        expect(payload?.sub).toBe(mockUser.id);
      });

      it('should include type: refresh in refresh token payload', async () => {
        const token = await tokenService.generateRefreshToken(mockUser);
        const payload = tokenService.decodeToken(token);

        expect(payload?.type).toBe('refresh');
      });
    });
  });

  describe('validateToken()', () => {
    describe('happy path', () => {
      it('should return true for valid access token', async () => {
        const token = await tokenService.generateAccessToken(mockUser);

        const isValid = await tokenService.validateToken(token);

        expect(isValid).toBe(true);
      });

      it('should return true for valid refresh token', async () => {
        const token = await tokenService.generateRefreshToken(mockUser);

        const isValid = await tokenService.validateToken(token);

        expect(isValid).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should return false for expired token', async () => {
        // Create a service with very short TTL for testing
        const shortTtlService = new TokenService(jwtSecret, {
          accessTokenTtl: '1ms',
          refreshTokenTtl: '1ms',
        });

        const token = await shortTtlService.generateAccessToken(mockUser);

        // Wait for token to expire
        await new Promise(resolve => setTimeout(resolve, 50));

        const isValid = await shortTtlService.validateToken(token);
        expect(isValid).toBe(false);
      });

      it('should return false for invalid signature', async () => {
        const token = await tokenService.generateAccessToken(mockUser);
        const tamperedToken = token.slice(0, -5) + 'xxxxx'; // Tamper with signature

        const isValid = await tokenService.validateToken(tamperedToken);

        expect(isValid).toBe(false);
      });

      it('should return false for malformed token', async () => {
        const isValid = await tokenService.validateToken('not.a.valid.token');

        expect(isValid).toBe(false);
      });

      it('should return false for empty token', async () => {
        const isValid = await tokenService.validateToken('');

        expect(isValid).toBe(false);
      });

      it('should return false for token signed with different secret', async () => {
        const otherService = new TokenService('different-secret-key-32-chars-long');
        const token = await otherService.generateAccessToken(mockUser);

        const isValid = await tokenService.validateToken(token);

        expect(isValid).toBe(false);
      });
    });
  });

  describe('decodeToken()', () => {
    it('should decode and return payload without verification', () => {
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6Ik9QRVJBVE9SIiwidGVuYW50SWQiOiJ0ZXN0LXRlbmFudCIsImlhdCI6MTUxNjIzOTAyMn0.4S5r-VzPvEPxjLBsL6K7VZ9r7yCvVnhgk_PZnZh_7_0';

      const payload = tokenService.decodeToken(token);

      expect(payload?.sub).toBe('1234567890');
      expect(payload?.email).toBe('test@example.com');
    });

    it('should return null for invalid token format', () => {
      const payload = tokenService.decodeToken('invalid-token');

      expect(payload).toBeNull();
    });
  });

  describe('getExpiresIn()', () => {
    it('should return expiration time in seconds for access token', () => {
      const expiresIn = tokenService.getExpiresIn('access');

      expect(expiresIn).toBe(24 * 60 * 60); // 24 hours in seconds
    });

    it('should return expiration time in seconds for refresh token', () => {
      const expiresIn = tokenService.getExpiresIn('refresh');

      expect(expiresIn).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });
  });

  describe('validateAccessToken() - P7 Token Type Validation', () => {
    it('should return true for valid access token', async () => {
      const token = await tokenService.generateAccessToken(mockUser);

      const isValid = await tokenService.validateAccessToken(token);

      expect(isValid).toBe(true);
    });

    it('should return false for refresh token passed as access token', async () => {
      const token = await tokenService.generateRefreshToken(mockUser);

      const isValid = await tokenService.validateAccessToken(token);

      expect(isValid).toBe(false);
    });

    it('should return false for invalid token', async () => {
      const isValid = await tokenService.validateAccessToken('invalid.token.here');

      expect(isValid).toBe(false);
    });
  });

  describe('validateRefreshToken() - P7 Token Type Validation', () => {
    it('should return true for valid refresh token', async () => {
      const token = await tokenService.generateRefreshToken(mockUser);

      const isValid = await tokenService.validateRefreshToken(token);

      expect(isValid).toBe(true);
    });

    it('should return false for access token passed as refresh token', async () => {
      const token = await tokenService.generateAccessToken(mockUser);

      const isValid = await tokenService.validateRefreshToken(token);

      expect(isValid).toBe(false);
    });

    it('should return false for invalid token', async () => {
      const isValid = await tokenService.validateRefreshToken('invalid.token.here');

      expect(isValid).toBe(false);
    });
  });
});
