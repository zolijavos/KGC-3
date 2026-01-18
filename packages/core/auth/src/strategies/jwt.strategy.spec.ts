/**
 * JWT Strategy Tests
 * Story 1.1: JWT Login Endpoint
 * G-H2 FIX: Token type validation tests
 *
 * Validates that JwtStrategy correctly:
 * - Accepts access tokens
 * - Accepts kiosk tokens
 * - Rejects refresh tokens
 * - Rejects tokens without type
 * - Rejects tokens with missing required fields
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    // Create strategy with test secret
    strategy = new JwtStrategy('test-jwt-secret-for-unit-tests');
  });

  describe('validate()', () => {
    const validPayload: JwtPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      role: 'OPERATOR',
      tenantId: 'tenant-456',
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    };

    describe('Token type validation (G-H2 FIX)', () => {
      it('should accept access token type', async () => {
        const payload: JwtPayload = { ...validPayload, type: 'access' };
        const result = await strategy.validate(payload);

        expect(result).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          role: 'OPERATOR',
          tenantId: 'tenant-456',
        });
      });

      it('should accept kiosk token type', async () => {
        const payload: JwtPayload = { ...validPayload, type: 'kiosk' };
        const result = await strategy.validate(payload);

        expect(result).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          role: 'OPERATOR',
          tenantId: 'tenant-456',
        });
      });

      it('should reject refresh token type', async () => {
        const payload: JwtPayload = { ...validPayload, type: 'refresh' };

        await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
        await expect(strategy.validate(payload)).rejects.toThrow('Invalid token type');
      });

      it('should reject token without type field', async () => {
        const payload: JwtPayload = { ...validPayload };
        delete (payload as Partial<JwtPayload>).type;

        await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
        await expect(strategy.validate(payload)).rejects.toThrow('Invalid token type');
      });

      it('should reject token with unknown type', async () => {
        const payload = { ...validPayload, type: 'unknown' } as JwtPayload;

        await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
        await expect(strategy.validate(payload)).rejects.toThrow('Invalid token type');
      });
    });

    describe('Required fields validation', () => {
      it('should reject token without sub field', async () => {
        const payload: JwtPayload = { ...validPayload };
        delete (payload as Partial<JwtPayload>).sub;

        await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
        await expect(strategy.validate(payload)).rejects.toThrow('Invalid token payload');
      });

      it('should reject token without email field', async () => {
        const payload: JwtPayload = { ...validPayload };
        delete (payload as Partial<JwtPayload>).email;

        await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
        await expect(strategy.validate(payload)).rejects.toThrow('Invalid token payload');
      });

      it('should reject token without role field', async () => {
        const payload: JwtPayload = { ...validPayload };
        delete (payload as Partial<JwtPayload>).role;

        await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
        await expect(strategy.validate(payload)).rejects.toThrow('Invalid token payload');
      });

      it('should reject token without tenantId field', async () => {
        const payload: JwtPayload = { ...validPayload };
        delete (payload as Partial<JwtPayload>).tenantId;

        await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
        await expect(strategy.validate(payload)).rejects.toThrow('Invalid token payload');
      });
    });

    describe('Valid payloads', () => {
      it('should return user context for valid access token', async () => {
        const result = await strategy.validate(validPayload);

        expect(result.id).toBe(validPayload.sub);
        expect(result.email).toBe(validPayload.email);
        expect(result.role).toBe(validPayload.role);
        expect(result.tenantId).toBe(validPayload.tenantId);
      });

      it('should work with all 8 role types', async () => {
        const roles = [
          'OPERATOR',
          'TECHNIKUS',
          'BOLTVEZETO',
          'ACCOUNTANT',
          'PARTNER_OWNER',
          'CENTRAL_ADMIN',
          'DEVOPS_ADMIN',
          'SUPER_ADMIN',
        ];

        for (const role of roles) {
          const payload: JwtPayload = { ...validPayload, role };
          const result = await strategy.validate(payload);
          expect(result.role).toBe(role);
        }
      });
    });
  });
});
