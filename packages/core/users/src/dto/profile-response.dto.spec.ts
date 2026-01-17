/**
 * Profile Response DTO Tests
 * Story 2.6: User Profile Management
 * AC#1: Profile response without sensitive data
 *
 * TDD: Tests for formatProfileResponse function
 */

import { describe, it, expect } from 'vitest';
import { formatProfileResponse, profileResponseSchema, PROFILE_MESSAGES } from './profile-response.dto';
import { Role, UserStatus } from '../interfaces/user.interface';

describe('profile-response.dto', () => {
  describe('formatProfileResponse()', () => {
    const baseUser = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      email: 'test@example.com',
      name: 'Test User',
      role: Role.OPERATOR,
      tenantId: 'b1c2d3e4-f5a6-7890-bcde-f12345678901',
      locationId: 'c1d2e3f4-a5b6-7890-cdef-123456789012',
      phone: '+36 20 123 4567',
      avatarUrl: 'https://example.com/avatar.png',
      status: UserStatus.ACTIVE,
      createdAt: new Date('2026-01-15T10:00:00Z'),
      updatedAt: new Date('2026-01-16T15:30:00Z'),
      passwordHash: '$2b$10$secret_hash',
      pinHash: '$2b$10$pin_hash',
    };

    describe('happy path', () => {
      it('should return profile with all fields', () => {
        const result = formatProfileResponse(baseUser);

        expect(result).toEqual({
          id: baseUser.id,
          email: baseUser.email,
          name: baseUser.name,
          role: Role.OPERATOR,
          tenantId: baseUser.tenantId,
          locationId: baseUser.locationId,
          phone: baseUser.phone,
          avatarUrl: baseUser.avatarUrl,
          status: UserStatus.ACTIVE,
          createdAt: '2026-01-15T10:00:00.000Z',
          updatedAt: '2026-01-16T15:30:00.000Z',
        });
      });

      it('should NOT include passwordHash in response', () => {
        const result = formatProfileResponse(baseUser);

        expect(result).not.toHaveProperty('passwordHash');
        expect(Object.keys(result)).not.toContain('passwordHash');
      });

      it('should NOT include pinHash in response', () => {
        const result = formatProfileResponse(baseUser);

        expect(result).not.toHaveProperty('pinHash');
        expect(Object.keys(result)).not.toContain('pinHash');
      });

      it('should convert Date objects to ISO strings', () => {
        const result = formatProfileResponse(baseUser);

        expect(typeof result.createdAt).toBe('string');
        expect(typeof result.updatedAt).toBe('string');
        expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });
    });

    describe('null/undefined handling', () => {
      it('should handle null locationId', () => {
        const user = { ...baseUser, locationId: null };
        const result = formatProfileResponse(user);

        expect(result.locationId).toBeNull();
      });

      it('should handle undefined locationId', () => {
        const user = { ...baseUser, locationId: undefined };
        const result = formatProfileResponse(user);

        expect(result.locationId).toBeNull();
      });

      it('should handle null phone', () => {
        const user = { ...baseUser, phone: null };
        const result = formatProfileResponse(user);

        expect(result.phone).toBeNull();
      });

      it('should handle undefined phone', () => {
        const user = { ...baseUser, phone: undefined };
        const result = formatProfileResponse(user);

        expect(result.phone).toBeNull();
      });

      it('should handle null avatarUrl', () => {
        const user = { ...baseUser, avatarUrl: null };
        const result = formatProfileResponse(user);

        expect(result.avatarUrl).toBeNull();
      });

      it('should handle undefined avatarUrl', () => {
        const user = { ...baseUser, avatarUrl: undefined };
        const result = formatProfileResponse(user);

        expect(result.avatarUrl).toBeNull();
      });
    });

    describe('role conversion', () => {
      it('should handle string role', () => {
        const user = { ...baseUser, role: 'BOLTVEZETO' };
        const result = formatProfileResponse(user);

        expect(result.role).toBe(Role.BOLTVEZETO);
      });

      it('should handle enum role', () => {
        const user = { ...baseUser, role: Role.TECHNIKUS };
        const result = formatProfileResponse(user);

        expect(result.role).toBe(Role.TECHNIKUS);
      });
    });

    describe('status conversion', () => {
      it('should handle string status', () => {
        const user = { ...baseUser, status: 'LOCKED' };
        const result = formatProfileResponse(user);

        expect(result.status).toBe(UserStatus.LOCKED);
      });

      it('should handle enum status', () => {
        const user = { ...baseUser, status: UserStatus.INACTIVE };
        const result = formatProfileResponse(user);

        expect(result.status).toBe(UserStatus.INACTIVE);
      });
    });
  });

  describe('profileResponseSchema', () => {
    it('should validate correct profile response', () => {
      const validProfile = {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.OPERATOR,
        tenantId: 'b1c2d3e4-f5a6-7890-bcde-f12345678901',
        locationId: null,
        phone: '+36 20 123 4567',
        avatarUrl: 'https://example.com/avatar.png',
        status: UserStatus.ACTIVE,
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-01-16T15:30:00.000Z',
      };

      const result = profileResponseSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should reject invalid uuid', () => {
      const invalidProfile = {
        id: 'invalid-uuid',
        email: 'test@example.com',
        name: 'Test User',
        role: Role.OPERATOR,
        tenantId: 'tenant-uuid-1234-5678-90ab-cdef12345678',
        locationId: null,
        phone: null,
        avatarUrl: null,
        status: UserStatus.ACTIVE,
        createdAt: '2026-01-15T10:00:00.000Z',
        updatedAt: '2026-01-16T15:30:00.000Z',
      };

      const result = profileResponseSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });
  });

  describe('PROFILE_MESSAGES', () => {
    it('should have all required messages', () => {
      expect(PROFILE_MESSAGES.PROFILE_UPDATED).toBe('Profil sikeresen frissítve');
      expect(PROFILE_MESSAGES.PIN_CHANGED).toBe('PIN sikeresen módosítva');
      expect(PROFILE_MESSAGES.NOT_FOUND).toBe('Felhasználó nem található');
      expect(PROFILE_MESSAGES.INVALID_PIN).toBe('Érvénytelen jelenlegi PIN kód');
    });
  });
});
