/**
 * Auth Service Unit Tests - TDD Red-Green-Refactor
 * Story 1.2: Token Refresh
 * Story 1.3: Logout és Session Invalidation
 * Story 1.4: PIN Kód Belépés (Kiosk Mód)
 * Story 1.5: Password Reset Flow
 *
 * AC1: Sikeres token refresh
 * AC2: Refresh token rotation
 * AC3: Érvénytelen token kezelés
 * AC4: Token type validation
 * Story 1.3 AC1: Single device logout
 * Story 1.3 AC2: Logout all devices
 * Story 1.4 AC1: Sikeres PIN belépés
 * Story 1.4 AC2: Trusted device validation
 * Story 1.4 AC3: PIN lockout (3 failed attempts)
 * Story 1.4 AC6: User without PIN
 * Story 1.5 AC1: Forgot password success
 * Story 1.5 AC2: No email enumeration
 * Story 1.5 AC3: Reset password with valid token
 * Story 1.5 AC5: Invalid/expired token
 * Story 1.5 AC6: Rate limiting
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserForToken } from './interfaces/jwt-payload.interface';
import type { IEmailService } from './services/email.service';
import { PasswordResetService } from './services/password-reset.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { PinService } from './services/pin.service';
import { PinLockoutService } from './services/pin-lockout.service';
import { TrustedDeviceService } from './services/trusted-device.service';
import { AuthService } from './auth.service';
import { FORGOT_PASSWORD_MESSAGE } from './dto/forgot-password-response.dto';
import { RESET_PASSWORD_MESSAGES } from './dto/reset-password-response.dto';

// Mock user for testing
const mockUser: UserForToken = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  name: 'Test User',
  role: 'OPERATOR',
  tenantId: '660e8400-e29b-41d4-a716-446655440001',
};

// Mock Prisma client with $transaction support (P1 fix)
const createMockPrisma = () => ({
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(), // Story 1.4: for location-based PIN lookup
    update: vi.fn(), // Story 1.5: for password update
  },
  refreshToken: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  loginAttempt: {
    create: vi.fn(),
    count: vi.fn(),
  },
  // Story 1.4: Trusted Device
  trustedDevice: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  // Story 1.4: PIN Attempt tracking
  pinAttempt: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  // Story 1.5: Password Reset Token
  passwordResetToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  // P1 fix: Mock $transaction to execute array of promises
  $transaction: vi.fn(async (operations: Promise<unknown>[]) => {
    return Promise.all(operations);
  }),
});

// Mock email service for Story 1.5
const createMockEmailService = (): IEmailService => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
});

describe('AuthService - Token Refresh', () => {
  const jwtSecret = 'test-jwt-secret-at-least-32-characters-long';
  let authService: AuthService;
  let tokenService: TokenService;
  let passwordService: PasswordService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    tokenService = new TokenService(jwtSecret);
    passwordService = new PasswordService();
    mockPrisma = createMockPrisma();
    authService = new AuthService(
      passwordService,
      tokenService,
      mockPrisma as unknown as Parameters<typeof AuthService.prototype.login>[2]
    );
  });

  describe('refreshTokens()', () => {
    describe('happy path (AC1)', () => {
      it('should return new access token and refresh token for valid refresh token', async () => {
        // Arrange: Generate a valid refresh token
        const validRefreshToken = await tokenService.generateRefreshToken(mockUser);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

        // Mock DB: token exists and is valid
        mockPrisma.refreshToken.findFirst.mockResolvedValue({
          id: 'token-id-1',
          token: validRefreshToken,
          userId: mockUser.id,
          expiresAt,
          isRevoked: false,
          revokedAt: null,
          deviceInfo: null,
          createdAt: new Date(),
        });

        // Mock user lookup for new token generation
        mockPrisma.user.findUnique.mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
          status: 'ACTIVE',
          passwordHash: 'hash',
        });

        // Mock token revocation and creation
        mockPrisma.refreshToken.update.mockResolvedValue({});
        mockPrisma.refreshToken.create.mockResolvedValue({});

        // Act
        const result = await authService.refreshTokens(validRefreshToken);

        // Assert
        expect(result).toHaveProperty('data');
        expect(result.data).toHaveProperty('accessToken');
        expect(result.data).toHaveProperty('refreshToken');
        expect(result.data).toHaveProperty('expiresIn');
        expect(result.data.expiresIn).toBe(24 * 60 * 60); // 24 hours
      });

      it('should return different refresh token than the one submitted (rotation)', async () => {
        const validRefreshToken = await tokenService.generateRefreshToken(mockUser);

        // Wait 1.1 seconds to ensure different iat (issued at) timestamp in JWT
        await new Promise(resolve => setTimeout(resolve, 1100));

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        mockPrisma.refreshToken.findFirst.mockResolvedValue({
          id: 'token-id-1',
          token: validRefreshToken,
          userId: mockUser.id,
          expiresAt,
          isRevoked: false,
          revokedAt: null,
          deviceInfo: null,
          createdAt: new Date(),
        });

        mockPrisma.user.findUnique.mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
          status: 'ACTIVE',
          passwordHash: 'hash',
        });

        mockPrisma.refreshToken.update.mockResolvedValue({});
        mockPrisma.refreshToken.create.mockResolvedValue({});

        const result = await authService.refreshTokens(validRefreshToken);

        // Different token due to different iat timestamp (waited 1.1s)
        expect(result.data.refreshToken).not.toBe(validRefreshToken);
      });
    });

    describe('token rotation (AC2)', () => {
      it('should revoke old token when generating new tokens', async () => {
        const validRefreshToken = await tokenService.generateRefreshToken(mockUser);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        mockPrisma.refreshToken.findFirst.mockResolvedValue({
          id: 'token-id-1',
          token: validRefreshToken,
          userId: mockUser.id,
          expiresAt,
          isRevoked: false,
          revokedAt: null,
          deviceInfo: null,
          createdAt: new Date(),
        });

        mockPrisma.user.findUnique.mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
          status: 'ACTIVE',
          passwordHash: 'hash',
        });

        mockPrisma.refreshToken.update.mockResolvedValue({});
        mockPrisma.refreshToken.create.mockResolvedValue({});

        await authService.refreshTokens(validRefreshToken);

        // Verify old token was revoked
        expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'token-id-1' },
            data: expect.objectContaining({
              isRevoked: true,
              revokedAt: expect.any(Date),
            }),
          })
        );
      });

      it('should store new refresh token in database', async () => {
        const validRefreshToken = await tokenService.generateRefreshToken(mockUser);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        mockPrisma.refreshToken.findFirst.mockResolvedValue({
          id: 'token-id-1',
          token: validRefreshToken,
          userId: mockUser.id,
          expiresAt,
          isRevoked: false,
          revokedAt: null,
          deviceInfo: null,
          createdAt: new Date(),
        });

        mockPrisma.user.findUnique.mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
          status: 'ACTIVE',
          passwordHash: 'hash',
        });

        mockPrisma.refreshToken.update.mockResolvedValue({});
        mockPrisma.refreshToken.create.mockResolvedValue({});

        await authService.refreshTokens(validRefreshToken);

        // Verify new token was created
        expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              token: expect.any(String),
              userId: mockUser.id,
              expiresAt: expect.any(Date),
            }),
          })
        );
      });
    });

    describe('error handling (AC3)', () => {
      it('should throw error for expired refresh token', async () => {
        const validRefreshToken = await tokenService.generateRefreshToken(mockUser);
        const expiredAt = new Date(Date.now() - 1000); // 1 second ago (expired)

        mockPrisma.refreshToken.findFirst.mockResolvedValue({
          id: 'token-id-1',
          token: validRefreshToken,
          userId: mockUser.id,
          expiresAt: expiredAt,
          isRevoked: false,
          revokedAt: null,
          deviceInfo: null,
          createdAt: new Date(),
        });

        await expect(authService.refreshTokens(validRefreshToken)).rejects.toThrow(
          'Invalid refresh token'
        );
      });

      it('should throw error for revoked refresh token', async () => {
        const validRefreshToken = await tokenService.generateRefreshToken(mockUser);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        mockPrisma.refreshToken.findFirst.mockResolvedValue({
          id: 'token-id-1',
          token: validRefreshToken,
          userId: mockUser.id,
          expiresAt,
          isRevoked: true, // Already revoked
          revokedAt: new Date(),
          deviceInfo: null,
          createdAt: new Date(),
        });

        await expect(authService.refreshTokens(validRefreshToken)).rejects.toThrow(
          'Invalid refresh token'
        );
      });

      it('should throw error for non-existent refresh token', async () => {
        const validRefreshToken = await tokenService.generateRefreshToken(mockUser);

        // Mock: token not found in DB
        mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

        await expect(authService.refreshTokens(validRefreshToken)).rejects.toThrow(
          'Invalid refresh token'
        );
      });

      it('should throw error for malformed token (invalid JWT)', async () => {
        await expect(authService.refreshTokens('not-a-valid-jwt')).rejects.toThrow(
          'Invalid refresh token'
        );
      });
    });

    describe('token type validation (AC4)', () => {
      it('should throw error when access token is used as refresh token', async () => {
        // Generate an ACCESS token (not refresh)
        const accessToken = await tokenService.generateAccessToken(mockUser);

        await expect(authService.refreshTokens(accessToken)).rejects.toThrow(
          'Invalid refresh token'
        );
      });
    });
  });

  describe('findValidRefreshToken()', () => {
    it('should return token record for valid token in database', async () => {
      const validRefreshToken = await tokenService.generateRefreshToken(mockUser);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const tokenRecord = {
        id: 'token-id-1',
        token: validRefreshToken,
        userId: mockUser.id,
        expiresAt,
        isRevoked: false,
        revokedAt: null,
        deviceInfo: null,
        createdAt: new Date(),
      };

      mockPrisma.refreshToken.findFirst.mockResolvedValue(tokenRecord);

      const result = await authService.findValidRefreshToken(validRefreshToken);

      expect(result).toEqual(tokenRecord);
    });

    it('should return null for token not in database', async () => {
      const validRefreshToken = await tokenService.generateRefreshToken(mockUser);

      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      const result = await authService.findValidRefreshToken(validRefreshToken);

      expect(result).toBeNull();
    });
  });

  describe('revokeAllUserTokens()', () => {
    it('should revoke all refresh tokens for a user', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await authService.revokeAllUserTokens(mockUser.id);

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should return count of revoked tokens', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 5 });

      const count = await authService.revokeAllUserTokens(mockUser.id);

      expect(count).toBe(5);
    });
  });

  describe('rotateRefreshToken()', () => {
    it('should invalidate old token and create new one using transaction (P1 fix)', async () => {
      const oldTokenId = 'old-token-id';
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const newToken = await authService.rotateRefreshToken(oldTokenId, mockUser);

      // P1 fix: Verify $transaction was called (atomic operation)
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      // Verify old token revocation was included in transaction
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: oldTokenId },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      });

      // Verify new token created was included in transaction
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: expect.any(String),
          userId: mockUser.id,
          expiresAt: expect.any(Date),
        },
      });

      // Verify new token is returned
      expect(newToken).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    });

    it('should rollback if transaction fails', async () => {
      const oldTokenId = 'old-token-id';

      // Simulate transaction failure (e.g., create fails after update)
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(authService.rotateRefreshToken(oldTokenId, mockUser)).rejects.toThrow(
        'Transaction failed'
      );
    });
  });

  // P4 fix: Test for inactive user during refresh
  describe('inactive user handling', () => {
    it('should throw error when user is INACTIVE during refresh', async () => {
      const validRefreshToken = await tokenService.generateRefreshToken(mockUser);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Token exists and is valid
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'token-id-1',
        token: validRefreshToken,
        userId: mockUser.id,
        expiresAt,
        isRevoked: false,
        revokedAt: null,
        deviceInfo: null,
        createdAt: new Date(),
      });

      // User is INACTIVE
      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        status: 'INACTIVE', // P4: User is inactive
        passwordHash: 'hash',
      });

      await expect(authService.refreshTokens(validRefreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw error when user is SUSPENDED during refresh', async () => {
      const validRefreshToken = await tokenService.generateRefreshToken(mockUser);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'token-id-1',
        token: validRefreshToken,
        userId: mockUser.id,
        expiresAt,
        isRevoked: false,
        revokedAt: null,
        deviceInfo: null,
        createdAt: new Date(),
      });

      // User is SUSPENDED
      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        status: 'SUSPENDED',
        passwordHash: 'hash',
      });

      await expect(authService.refreshTokens(validRefreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw error when user is not found during refresh', async () => {
      const validRefreshToken = await tokenService.generateRefreshToken(mockUser);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'token-id-1',
        token: validRefreshToken,
        userId: mockUser.id,
        expiresAt,
        isRevoked: false,
        revokedAt: null,
        deviceInfo: null,
        createdAt: new Date(),
      });

      // User not found
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.refreshTokens(validRefreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  // ============================================
  // Story 1.3: Logout Tests
  // ============================================

  describe('logout() - Single Device (Story 1.3 AC1)', () => {
    it('should revoke a single refresh token', async () => {
      const validRefreshToken = await tokenService.generateRefreshToken(mockUser);
      const tokenRecord = {
        id: 'token-id-1',
        token: validRefreshToken,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        revokedAt: null,
        deviceInfo: null,
        createdAt: new Date(),
      };

      mockPrisma.refreshToken.findFirst.mockResolvedValue(tokenRecord);
      mockPrisma.refreshToken.update.mockResolvedValue({
        ...tokenRecord,
        isRevoked: true,
        revokedAt: new Date(),
      });

      // P1 fix: Pass userId for ownership validation
      const result = await authService.logout(validRefreshToken, mockUser.id);

      expect(result.data.success).toBe(true);
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-id-1' },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should throw error for non-existent token', async () => {
      const validRefreshToken = await tokenService.generateRefreshToken(mockUser);

      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      // P1 fix: Pass userId for ownership validation
      await expect(authService.logout(validRefreshToken, mockUser.id)).rejects.toThrow(
        'Token not found'
      );
    });

    it('should succeed for already revoked token (idempotent)', async () => {
      const validRefreshToken = await tokenService.generateRefreshToken(mockUser);
      const tokenRecord = {
        id: 'token-id-1',
        token: validRefreshToken,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: true, // Already revoked
        revokedAt: new Date(Date.now() - 1000),
        deviceInfo: null,
        createdAt: new Date(),
      };

      mockPrisma.refreshToken.findFirst.mockResolvedValue(tokenRecord);

      // P1 fix: Pass userId for ownership validation
      const result = await authService.logout(validRefreshToken, mockUser.id);

      // Should succeed without updating
      expect(result.data.success).toBe(true);
      expect(mockPrisma.refreshToken.update).not.toHaveBeenCalled();
    });

    it('should throw error for invalid JWT token', async () => {
      // P1 fix: Pass userId for ownership validation
      await expect(authService.logout('invalid-jwt-token', mockUser.id)).rejects.toThrow(
        'Invalid token'
      );
    });

    it('should throw error when access token is used instead of refresh token', async () => {
      const accessToken = await tokenService.generateAccessToken(mockUser);

      // P1 fix: Pass userId for ownership validation
      await expect(authService.logout(accessToken, mockUser.id)).rejects.toThrow(
        'Invalid token'
      );
    });

    // P2 fix: Add missing test for token ownership validation
    it('should throw error when token belongs to different user (P1 security fix)', async () => {
      const validRefreshToken = await tokenService.generateRefreshToken(mockUser);
      const otherUserId = '770e8400-e29b-41d4-a716-446655440002';
      const tokenRecord = {
        id: 'token-id-1',
        token: validRefreshToken,
        userId: mockUser.id, // Token belongs to mockUser
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        revokedAt: null,
        deviceInfo: null,
        createdAt: new Date(),
      };

      mockPrisma.refreshToken.findFirst.mockResolvedValue(tokenRecord);

      // Try to revoke with different user's ID - should fail
      await expect(authService.logout(validRefreshToken, otherUserId)).rejects.toThrow(
        'Token not owned'
      );

      // Token should NOT be revoked
      expect(mockPrisma.refreshToken.update).not.toHaveBeenCalled();
    });
  });

  describe('logoutAll() - All Devices (Story 1.3 AC2)', () => {
    it('should revoke all refresh tokens for a user', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      const result = await authService.logoutAll(mockUser.id);

      expect(result.data.success).toBe(true);
      expect(result.data.revokedCount).toBe(3);
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should return 0 when user has no active tokens', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      const result = await authService.logoutAll(mockUser.id);

      expect(result.data.success).toBe(true);
      expect(result.data.revokedCount).toBe(0);
    });

    it('should only revoke tokens for the specified user (isolation)', async () => {
      const otherUserId = '770e8400-e29b-41d4-a716-446655440002';
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await authService.logoutAll(mockUser.id);

      // Verify only mockUser.id tokens are revoked
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUser.id,
          }),
        })
      );
    });
  });
});

// ============================================
// Story 1.4: PIN Login Tests (Kiosk Mode)
// ============================================

describe('AuthService - PIN Login (Story 1.4)', () => {
  const jwtSecret = 'test-jwt-secret-at-least-32-characters-long';
  let authService: AuthService;
  let tokenService: TokenService;
  let passwordService: PasswordService;
  let pinService: PinService;
  let pinLockoutService: PinLockoutService;
  let trustedDeviceService: TrustedDeviceService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let validPinHash: string;

  const validDeviceId = '880e8400-e29b-41d4-a716-446655440003';
  const validPin = '1234';
  const validLocationId = '770e8400-e29b-41d4-a716-446655440002';
  const validTenantId = mockUser.tenantId;

  beforeEach(async () => {
    // Generate valid bcrypt hash for the test PIN
    const bcrypt = await import('bcrypt');
    validPinHash = await bcrypt.hash(validPin, 10);

    tokenService = new TokenService(jwtSecret);
    passwordService = new PasswordService();
    mockPrisma = createMockPrisma();

    // Create services with mock prisma (using proper type casting)
    // PinService doesn't need Prisma for verifyPin, only for DB operations
    pinService = new PinService(null);
    pinLockoutService = new PinLockoutService(null);
    trustedDeviceService = new TrustedDeviceService(null);

    // AuthService uses mock Prisma directly for PIN login (fallback paths)
    authService = new AuthService(
      passwordService,
      tokenService,
      mockPrisma as unknown as Parameters<typeof AuthService.prototype.login>[2],
      pinService,  // PinService for PIN verification
      null,        // No PinLockoutService - use direct Prisma
      null         // No TrustedDeviceService - use direct Prisma
    );
  });

  describe('pinLogin() - AC1: Sikeres PIN belépés', () => {
    it('should return kiosk token for valid PIN and trusted device', async () => {
      // Arrange: Trusted device exists with new schema (status instead of isActive)
      mockPrisma.trustedDevice.findUnique.mockResolvedValue({
        id: validDeviceId,
        tenantId: validTenantId,
        locationId: validLocationId,
        deviceName: 'Kiosk Terminal 1',
        status: 'ACTIVE',
        lastUsedAt: new Date(),
        registeredAt: new Date(),
      });

      // User with PIN set at location (findMany for location-based lookup)
      mockPrisma.user.findMany.mockResolvedValue([{
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        status: 'ACTIVE',
        pinHash: validPinHash,
      }]);

      // No lockout
      mockPrisma.pinAttempt.findUnique.mockResolvedValue(null);
      mockPrisma.trustedDevice.update.mockResolvedValue({});
      mockPrisma.loginAttempt.create.mockResolvedValue({});

      // Act
      const result = await authService.pinLogin(validPin, validDeviceId);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('accessToken');
      expect(result.data).not.toHaveProperty('refreshToken'); // Kiosk mode: no refresh token
      expect(result.data).toHaveProperty('expiresIn');
      expect(result.data.expiresIn).toBe(4 * 60 * 60); // 4 hours for kiosk
      expect(result.data.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
    });

    it('should update device lastUsedAt on successful login', async () => {
      // Arrange
      mockPrisma.trustedDevice.findUnique.mockResolvedValue({
        id: validDeviceId,
        tenantId: validTenantId,
        locationId: validLocationId,
        deviceName: 'Kiosk Terminal 1',
        status: 'ACTIVE',
        lastUsedAt: new Date(Date.now() - 86400000), // 1 day ago
        registeredAt: new Date(),
      });

      mockPrisma.user.findMany.mockResolvedValue([{
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        status: 'ACTIVE',
        pinHash: validPinHash,
      }]);

      mockPrisma.pinAttempt.findUnique.mockResolvedValue(null);
      mockPrisma.trustedDevice.update.mockResolvedValue({});
      mockPrisma.loginAttempt.create.mockResolvedValue({});

      // Act
      await authService.pinLogin(validPin, validDeviceId);

      // Assert
      expect(mockPrisma.trustedDevice.update).toHaveBeenCalledWith({
        where: { id: validDeviceId },
        data: { lastUsedAt: expect.any(Date) },
      });
    });

    it('should reset PIN attempts on successful login', async () => {
      // Arrange
      mockPrisma.trustedDevice.findUnique.mockResolvedValue({
        id: validDeviceId,
        tenantId: validTenantId,
        locationId: validLocationId,
        deviceName: 'Kiosk Terminal 1',
        status: 'ACTIVE',
        lastUsedAt: new Date(),
        registeredAt: new Date(),
      });

      mockPrisma.user.findMany.mockResolvedValue([{
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        status: 'ACTIVE',
        pinHash: validPinHash,
      }]);

      // Had previous failed attempts
      mockPrisma.pinAttempt.findUnique.mockResolvedValue({
        userId: mockUser.id,
        deviceId: validDeviceId,
        attemptCount: 2,
        lastAttemptAt: new Date(),
        lockedUntil: null,
      });

      mockPrisma.pinAttempt.delete.mockResolvedValue({});
      mockPrisma.trustedDevice.update.mockResolvedValue({});
      mockPrisma.loginAttempt.create.mockResolvedValue({});

      // Act
      await authService.pinLogin(validPin, validDeviceId);

      // Assert: Attempts should be reset
      expect(mockPrisma.pinAttempt.delete).toHaveBeenCalledWith({
        where: {
          userId_deviceId: { userId: mockUser.id, deviceId: validDeviceId },
        },
      });
    });
  });

  describe('pinLogin() - AC2: Trusted device validation', () => {
    it('should throw error for untrusted device', async () => {
      // Arrange: Device not found
      mockPrisma.trustedDevice.findUnique.mockResolvedValue(null);

      // Act & Assert - AC2: 403 Forbidden with specific error
      await expect(authService.pinLogin(validPin, validDeviceId)).rejects.toThrow(
        'Eszköz nem regisztrált' // AC2: Device not registered
      );
    });

    it('should throw error for inactive device', async () => {
      // Arrange: Device is inactive (SUSPENDED status)
      mockPrisma.trustedDevice.findUnique.mockResolvedValue({
        id: validDeviceId,
        tenantId: validTenantId,
        locationId: validLocationId,
        deviceName: 'Kiosk Terminal 1',
        status: 'SUSPENDED', // Inactive
        lastUsedAt: new Date(),
        registeredAt: new Date(),
      });

      // Act & Assert - AC2: Treated same as not found
      await expect(authService.pinLogin(validPin, validDeviceId)).rejects.toThrow(
        'Eszköz nem regisztrált'
      );
    });
  });

  describe('pinLogin() - AC3: PIN lockout (3 failed attempts)', () => {
    it('should throw error when device is locked out', async () => {
      // Arrange: Device is trusted
      mockPrisma.trustedDevice.findUnique.mockResolvedValue({
        id: validDeviceId,
        tenantId: validTenantId,
        locationId: validLocationId,
        deviceName: 'Kiosk Terminal 1',
        status: 'ACTIVE',
        lastUsedAt: new Date(),
        registeredAt: new Date(),
      });

      // No matching users (wrong PIN)
      mockPrisma.user.findMany.mockResolvedValue([{
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        status: 'ACTIVE',
        pinHash: validPinHash,
      }]);

      // User is locked out (3+ failed attempts, lockout active)
      mockPrisma.pinAttempt.findUnique.mockResolvedValue({
        userId: mockUser.id,
        deviceId: validDeviceId,
        attemptCount: 3,
        lastAttemptAt: new Date(),
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      });

      // Act & Assert
      await expect(authService.pinLogin(validPin, validDeviceId)).rejects.toThrow(
        'Fiók zárolva'
      );
    });

    it('should increment failed attempts on wrong PIN', async () => {
      // Arrange: Trusted device
      mockPrisma.trustedDevice.findUnique.mockResolvedValue({
        id: validDeviceId,
        tenantId: validTenantId,
        locationId: validLocationId,
        deviceName: 'Kiosk Terminal 1',
        status: 'ACTIVE',
        lastUsedAt: new Date(),
        registeredAt: new Date(),
      });

      // No matching users for wrong PIN
      mockPrisma.user.findMany.mockResolvedValue([{
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        status: 'ACTIVE',
        pinHash: validPinHash, // Hash for '1234', but we'll send '9999'
      }]);

      // No current lockout
      mockPrisma.pinAttempt.findUnique.mockResolvedValue(null);

      // Mock increment (device-level lockout since user lookup fails)
      mockPrisma.pinAttempt.upsert.mockResolvedValue({
        userId: validDeviceId,
        deviceId: validDeviceId,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        lockedUntil: null,
      });

      // Act & Assert: Wrong PIN
      await expect(authService.pinLogin('9999', validDeviceId)).rejects.toThrow(
        'Érvénytelen hitelesítési adatok'
      );

      // Verify increment was called
      expect(mockPrisma.pinAttempt.upsert).toHaveBeenCalled();
    });

    it('should trigger lockout on 3rd failed attempt', async () => {
      // Arrange: Trusted device
      mockPrisma.trustedDevice.findUnique.mockResolvedValue({
        id: validDeviceId,
        tenantId: validTenantId,
        locationId: validLocationId,
        deviceName: 'Kiosk Terminal 1',
        status: 'ACTIVE',
        lastUsedAt: new Date(),
        registeredAt: new Date(),
      });

      // No matching users for wrong PIN
      mockPrisma.user.findMany.mockResolvedValue([{
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        status: 'ACTIVE',
        pinHash: validPinHash,
      }]);

      // 2 previous failed attempts (device-level)
      mockPrisma.pinAttempt.findUnique.mockResolvedValue({
        userId: validDeviceId,
        deviceId: validDeviceId,
        attemptCount: 2,
        lastAttemptAt: new Date(),
        lockedUntil: null,
      });

      // This will be the 3rd attempt - triggers lockout
      mockPrisma.pinAttempt.upsert.mockResolvedValue({
        userId: validDeviceId,
        deviceId: validDeviceId,
        attemptCount: 3,
        lastAttemptAt: new Date(),
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      });

      // Act & Assert
      await expect(authService.pinLogin('9999', validDeviceId)).rejects.toThrow(
        'Fiók zárolva'
      );
    });
  });

  describe('pinLogin() - AC6: User without PIN', () => {
    it('should throw error when no users have PIN at location', async () => {
      // Arrange: Trusted device
      mockPrisma.trustedDevice.findUnique.mockResolvedValue({
        id: validDeviceId,
        tenantId: validTenantId,
        locationId: validLocationId,
        deviceName: 'Kiosk Terminal 1',
        status: 'ACTIVE',
        lastUsedAt: new Date(),
        registeredAt: new Date(),
      });

      // No users with PIN at location (empty array)
      mockPrisma.user.findMany.mockResolvedValue([]);

      mockPrisma.pinAttempt.findUnique.mockResolvedValue(null);
      mockPrisma.pinAttempt.upsert.mockResolvedValue({
        userId: validDeviceId,
        deviceId: validDeviceId,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        lockedUntil: null,
      });

      // Act & Assert: Generic error message (security)
      await expect(authService.pinLogin(validPin, validDeviceId)).rejects.toThrow(
        'Érvénytelen hitelesítési adatok'
      );
    });

    it('should throw error when PIN does not match any user', async () => {
      // Arrange: Trusted device
      mockPrisma.trustedDevice.findUnique.mockResolvedValue({
        id: validDeviceId,
        tenantId: validTenantId,
        locationId: validLocationId,
        deviceName: 'Kiosk Terminal 1',
        status: 'ACTIVE',
        lastUsedAt: new Date(),
        registeredAt: new Date(),
      });

      // Users exist but with different PINs (PIN won't match)
      mockPrisma.user.findMany.mockResolvedValue([{
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        status: 'ACTIVE',
        pinHash: validPinHash, // Hash for '1234'
      }]);

      mockPrisma.pinAttempt.findUnique.mockResolvedValue(null);
      mockPrisma.pinAttempt.upsert.mockResolvedValue({
        userId: validDeviceId,
        deviceId: validDeviceId,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        lockedUntil: null,
      });

      // Act & Assert: Wrong PIN (9999 vs 1234)
      await expect(authService.pinLogin('9999', validDeviceId)).rejects.toThrow(
        'Érvénytelen hitelesítési adatok'
      );
    });

    it('should throw error when no users found at location', async () => {
      // Arrange: Trusted device exists but no users at location
      mockPrisma.trustedDevice.findUnique.mockResolvedValue({
        id: validDeviceId,
        tenantId: validTenantId,
        locationId: validLocationId,
        deviceName: 'Kiosk Terminal 1',
        status: 'ACTIVE',
        lastUsedAt: new Date(),
        registeredAt: new Date(),
      });

      // No users found at location
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.pinAttempt.findUnique.mockResolvedValue(null);
      mockPrisma.pinAttempt.upsert.mockResolvedValue({
        userId: validDeviceId,
        deviceId: validDeviceId,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        lockedUntil: null,
      });

      // Act & Assert
      await expect(authService.pinLogin(validPin, validDeviceId)).rejects.toThrow(
        'Érvénytelen hitelesítési adatok'
      );
    });
  });
});

// ============================================
// Story 1.5: Password Reset Tests
// ============================================

describe('AuthService - Password Reset (Story 1.5)', () => {
  const jwtSecret = 'test-jwt-secret-at-least-32-characters-long';
  let authService: AuthService;
  let tokenService: TokenService;
  let passwordService: PasswordService;
  let passwordResetService: PasswordResetService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockEmailService: IEmailService;

  beforeEach(() => {
    tokenService = new TokenService(jwtSecret);
    passwordService = new PasswordService();
    mockPrisma = createMockPrisma();
    mockEmailService = createMockEmailService();
    passwordResetService = new PasswordResetService(mockPrisma as never);

    authService = new AuthService(
      passwordService,
      tokenService,
      mockPrisma as never,
      null, // pinService
      null, // pinLockoutService
      null, // trustedDeviceService
      passwordResetService,
      mockEmailService
    );
  });

  describe('forgotPassword() - AC1: Success', () => {
    it('should return success response for existing user', async () => {
      // Arrange: User exists
      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        status: 'ACTIVE',
        passwordHash: 'hash',
      });

      mockPrisma.passwordResetToken.create.mockResolvedValue({});

      // Act
      const result = await authService.forgotPassword(mockUser.email, 'https://app.kgc.hu/reset');

      // Assert
      expect(result.data.message).toBe(FORGOT_PASSWORD_MESSAGE);
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          expiresInHours: 1,
        })
      );
    });
  });

  describe('forgotPassword() - AC2: No email enumeration', () => {
    it('should return same response for non-existing user', async () => {
      // Arrange: User does not exist
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await authService.forgotPassword('nonexistent@example.com');

      // Assert: Same message as for existing user
      expect(result.data.message).toBe(FORGOT_PASSWORD_MESSAGE);
      // Email should NOT be sent
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should return same response for inactive user', async () => {
      // Arrange: User is inactive
      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        status: 'INACTIVE',
        passwordHash: 'hash',
      });

      // Act
      const result = await authService.forgotPassword(mockUser.email);

      // Assert: Same message, no email
      expect(result.data.message).toBe(FORGOT_PASSWORD_MESSAGE);
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword() - AC6: Rate limiting', () => {
    it('should throw error when rate limited', async () => {
      // Arrange: Trigger rate limit (3 requests) - now async
      for (let i = 0; i < 3; i++) {
        await passwordResetService.incrementRateLimit(mockUser.email);
      }

      // Act & Assert
      await expect(authService.forgotPassword(mockUser.email)).rejects.toThrow('Túl sok kérés');
    });
  });

  describe('resetPassword() - AC3: Success', () => {
    it('should reset password for valid token', async () => {
      // Arrange: Generate valid token
      const tokenResult = passwordResetService.generateToken();

      // Mock token lookup
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-id',
        tokenHash: tokenResult.tokenHash,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      });

      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        status: 'ACTIVE',
        passwordHash: 'old-hash',
      });

      // Mock user update
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.passwordResetToken.update.mockResolvedValue({});
      mockPrisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await authService.resetPassword(tokenResult.plainToken, 'NewPassword1');

      // Assert
      expect(result.data.success).toBe(true);
      expect(result.data.message).toBe(RESET_PASSWORD_MESSAGES.SUCCESS);

      // M2 fix: Verify password was updated with a bcrypt hash
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { passwordHash: expect.stringMatching(/^\$2[aby]\$\d+\$/) }, // bcrypt hash pattern
      });

      // M2 fix: Verify token was marked as used
      expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'token-id' },
        data: {
          isUsed: true,
          usedAt: expect.any(Date),
        },
      });

      // M2 fix: Verify all user's reset tokens were invalidated
      expect(mockPrisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          isUsed: false,
        },
        data: {
          isUsed: true,
          usedAt: expect.any(Date),
        },
      });

      // M2 fix: Verify all refresh tokens were revoked
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: expect.any(Date),
        },
      });
    });
  });

  describe('resetPassword() - AC5: Invalid token', () => {
    it('should throw error for non-existent token', async () => {
      // Arrange: Token not found
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.resetPassword('invalid-token', 'NewPassword1')).rejects.toThrow(
        'Érvénytelen token'
      );
    });

    it('should throw error for expired token', async () => {
      // Arrange: Token is expired
      const tokenResult = passwordResetService.generateToken();

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-id',
        tokenHash: tokenResult.tokenHash,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago (expired)
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      });

      // Act & Assert
      await expect(authService.resetPassword(tokenResult.plainToken, 'NewPassword1')).rejects.toThrow(
        'Érvénytelen token'
      );
    });

    it('should throw error for already used token', async () => {
      // Arrange: Token is already used
      const tokenResult = passwordResetService.generateToken();

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-id',
        tokenHash: tokenResult.tokenHash,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 3600000),
        isUsed: true, // Already used
        usedAt: new Date(),
        createdAt: new Date(),
      });

      // Act & Assert
      await expect(authService.resetPassword(tokenResult.plainToken, 'NewPassword1')).rejects.toThrow(
        'Érvénytelen token'
      );
    });

    it('should throw error for inactive user', async () => {
      // Arrange: Token is valid but user is inactive
      const tokenResult = passwordResetService.generateToken();

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-id',
        tokenHash: tokenResult.tokenHash,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 3600000),
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        status: 'INACTIVE',
        passwordHash: 'hash',
      });

      // Act & Assert
      await expect(authService.resetPassword(tokenResult.plainToken, 'NewPassword1')).rejects.toThrow(
        'Érvénytelen token'
      );
    });
  });
});

describe('PasswordResetService', () => {
  describe('generateToken()', () => {
    it('should generate 64 character hex token', () => {
      const passwordResetService = new PasswordResetService();
      const result = passwordResetService.generateToken();

      expect(result.plainToken).toHaveLength(64);
      expect(result.plainToken).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique tokens', () => {
      const passwordResetService = new PasswordResetService();
      const token1 = passwordResetService.generateToken();
      const token2 = passwordResetService.generateToken();

      expect(token1.plainToken).not.toBe(token2.plainToken);
      expect(token1.tokenHash).not.toBe(token2.tokenHash);
    });

    it('should generate different hash than plain token', () => {
      const passwordResetService = new PasswordResetService();
      const result = passwordResetService.generateToken();

      expect(result.tokenHash).not.toBe(result.plainToken);
      expect(result.tokenHash).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it('should set expiry to 1 hour from now', () => {
      const passwordResetService = new PasswordResetService();
      const before = Date.now();
      const result = passwordResetService.generateToken();
      const after = Date.now();

      const expectedMinExpiry = before + 3600000 - 1000; // 1 hour minus 1 second tolerance
      const expectedMaxExpiry = after + 3600000 + 1000; // 1 hour plus 1 second tolerance

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });
  });

  describe('hashToken()', () => {
    it('should produce consistent hash for same input', () => {
      const passwordResetService = new PasswordResetService();
      const token = 'test-token-12345';

      const hash1 = passwordResetService.hashToken(token);
      const hash2 = passwordResetService.hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const passwordResetService = new PasswordResetService();

      const hash1 = passwordResetService.hashToken('token1');
      const hash2 = passwordResetService.hashToken('token2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('checkRateLimit()', () => {
    it('should return false when not rate limited', async () => {
      const passwordResetService = new PasswordResetService();

      expect(await passwordResetService.checkRateLimit('test@example.com')).toBe(false);
    });

    it('should return true after 3 requests', async () => {
      const passwordResetService = new PasswordResetService();
      const email = 'test@example.com';

      await passwordResetService.incrementRateLimit(email);
      await passwordResetService.incrementRateLimit(email);
      await passwordResetService.incrementRateLimit(email);

      expect(await passwordResetService.checkRateLimit(email)).toBe(true);
    });

    it('should be case insensitive', async () => {
      const passwordResetService = new PasswordResetService();

      await passwordResetService.incrementRateLimit('TEST@Example.com');
      await passwordResetService.incrementRateLimit('test@EXAMPLE.COM');
      await passwordResetService.incrementRateLimit('Test@Example.Com');

      expect(await passwordResetService.checkRateLimit('test@example.com')).toBe(true);
    });
  });
});

// ============================================
// Story 2.4: Elevated Access Verify Password Tests
// ============================================

describe('AuthService - Verify Password for Elevated Access (Story 2.4)', () => {
  const jwtSecret = 'test-jwt-secret-at-least-32-characters-long';
  let authService: AuthService;
  let tokenService: TokenService;
  let passwordService: PasswordService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockElevatedAccessService: {
    recordVerification: ReturnType<typeof vi.fn>;
    getValidUntil: ReturnType<typeof vi.fn>;
    isVerificationValid: ReturnType<typeof vi.fn>;
    getTimeRemaining: ReturnType<typeof vi.fn>;
    clearVerification: ReturnType<typeof vi.fn>;
  };

  const testPassword = 'TestPassword123';
  let validPasswordHash: string;

  beforeEach(async () => {
    // Generate valid bcrypt hash for the test password
    const bcrypt = await import('bcrypt');
    validPasswordHash = await bcrypt.hash(testPassword, 10);

    tokenService = new TokenService(jwtSecret);
    passwordService = new PasswordService();
    mockPrisma = createMockPrisma();

    // Mock elevated access service
    mockElevatedAccessService = {
      recordVerification: vi.fn(),
      getValidUntil: vi.fn().mockReturnValue('2026-01-16T10:05:00.000Z'),
      isVerificationValid: vi.fn().mockReturnValue(true),
      getTimeRemaining: vi.fn().mockReturnValue(300000),
      clearVerification: vi.fn(),
    };

    authService = new AuthService(
      passwordService,
      tokenService,
      mockPrisma as never,
      null, // pinService
      null, // pinLockoutService
      null, // trustedDeviceService
      null, // passwordResetService
      null, // emailService
      mockElevatedAccessService as never // elevatedAccessService
    );
  });

  describe('verifyPasswordForElevatedAccess() - AC#6', () => {
    describe('happy path', () => {
      it('should return validUntil timestamp for valid password', async () => {
        // Arrange: User exists with valid password
        mockPrisma.user.findUnique.mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
          status: 'ACTIVE',
          passwordHash: validPasswordHash,
        });

        // Act
        const result = await authService.verifyPasswordForElevatedAccess(
          mockUser.id,
          testPassword
        );

        // Assert
        expect(result.data.success).toBe(true);
        expect(result.data.validUntil).toBe('2026-01-16T10:05:00.000Z');
        expect(mockElevatedAccessService.recordVerification).toHaveBeenCalledWith(mockUser.id);
      });

      it('should call recordVerification on elevated access service', async () => {
        // Arrange
        mockPrisma.user.findUnique.mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
          status: 'ACTIVE',
          passwordHash: validPasswordHash,
        });

        // Act
        await authService.verifyPasswordForElevatedAccess(mockUser.id, testPassword);

        // Assert
        expect(mockElevatedAccessService.recordVerification).toHaveBeenCalledTimes(1);
        expect(mockElevatedAccessService.recordVerification).toHaveBeenCalledWith(mockUser.id);
      });

      it('should return Hungarian success message', async () => {
        // Arrange
        mockPrisma.user.findUnique.mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
          status: 'ACTIVE',
          passwordHash: validPasswordHash,
        });

        // Act
        const result = await authService.verifyPasswordForElevatedAccess(
          mockUser.id,
          testPassword
        );

        // Assert
        expect(result.data.message).toBe('Emelt szintű hozzáférés megerősítve');
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid password', async () => {
        // Arrange: User exists but password is wrong
        mockPrisma.user.findUnique.mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
          status: 'ACTIVE',
          passwordHash: validPasswordHash,
        });

        // Act & Assert
        await expect(
          authService.verifyPasswordForElevatedAccess(mockUser.id, 'WrongPassword123')
        ).rejects.toThrow('Érvénytelen jelszó');
      });

      it('should throw error for non-existent user', async () => {
        // Arrange: User not found
        mockPrisma.user.findUnique.mockResolvedValue(null);

        // Act & Assert
        await expect(
          authService.verifyPasswordForElevatedAccess('non-existent-user', testPassword)
        ).rejects.toThrow('Felhasználó nem található');
      });

      it('should throw error for inactive user', async () => {
        // Arrange: User is inactive
        mockPrisma.user.findUnique.mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
          status: 'INACTIVE',
          passwordHash: validPasswordHash,
        });

        // Act & Assert
        await expect(
          authService.verifyPasswordForElevatedAccess(mockUser.id, testPassword)
        ).rejects.toThrow('Felhasználó nem található');
      });

      it('should not call recordVerification on failed verification', async () => {
        // Arrange: Wrong password
        mockPrisma.user.findUnique.mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
          status: 'ACTIVE',
          passwordHash: validPasswordHash,
        });

        // Act
        try {
          await authService.verifyPasswordForElevatedAccess(mockUser.id, 'WrongPassword123');
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mockElevatedAccessService.recordVerification).not.toHaveBeenCalled();
      });
    });

    describe('without elevated access service', () => {
      it('should throw error when elevated access service is not configured', async () => {
        // Create AuthService without elevated access service
        const authServiceWithoutElevated = new AuthService(
          passwordService,
          tokenService,
          mockPrisma as never,
          null, // pinService
          null, // pinLockoutService
          null, // trustedDeviceService
          null, // passwordResetService
          null, // emailService
          null  // elevatedAccessService NOT configured
        );

        // Arrange
        mockPrisma.user.findUnique.mockResolvedValue({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          tenantId: mockUser.tenantId,
          status: 'ACTIVE',
          passwordHash: validPasswordHash,
        });

        // Act & Assert
        await expect(
          authServiceWithoutElevated.verifyPasswordForElevatedAccess(mockUser.id, testPassword)
        ).rejects.toThrow('Elevated access service not configured');
      });
    });
  });
});
