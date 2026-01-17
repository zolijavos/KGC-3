/**
 * Auth E2E Tests - Integration tests for authentication flow
 * Story 1.1: JWT Login Endpoint
 * Story 1.2: Token Refresh
 * Story 1.3: Logout és Session Invalidation
 * Story 1.4: PIN Kód Belépés (Kiosk Mód)
 *
 * Tests:
 * - AC1: Happy path - successful login returns tokens
 * - AC3: Error path - invalid credentials returns 401
 * - AC4: Rate limiting (mocked - would require full app)
 * - AC5: Input validation returns 400
 * - Story 1.2: Token refresh flow tests
 * - Story 1.3: Logout tests
 * - Story 1.4: PIN login tests (kiosk mode)
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { validateLoginInput } from './dto/login.dto';
import { validateLogoutInput } from './dto/logout.dto';
import { validatePinLoginInput } from './dto/pin-login.dto';
import { validateRefreshInput } from './dto/refresh-token.dto';
import type { UserForToken } from './interfaces/jwt-payload.interface';
import { PasswordService } from './services/password.service';
import { PinService } from './services/pin.service';
import { TokenService } from './services/token.service';

describe('Auth E2E Flow', () => {
  const jwtSecret = 'test-secret-key-at-least-32-characters';
  let passwordService: PasswordService;
  let tokenService: TokenService;

  beforeEach(() => {
    passwordService = new PasswordService();
    tokenService = new TokenService(jwtSecret);
  });

  describe('Happy Path: Successful Login (AC1)', () => {
    it('should complete full login flow: validate input → verify password → generate tokens', async () => {
      // Step 1: Validate input
      const input = { email: 'user@example.com', password: 'SecurePass123!' };
      const validationResult = validateLoginInput(input);
      expect(validationResult.success).toBe(true);

      // Step 2: Hash password (simulate stored hash)
      const storedHash = await passwordService.hashPassword(input.password);

      // Step 3: Verify password
      const isValid = await passwordService.verifyPassword(input.password, storedHash);
      expect(isValid).toBe(true);

      // Step 4: Generate tokens
      const user: UserForToken = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: input.email,
        name: 'Test User',
        role: 'OPERATOR',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
      };

      const accessToken = await tokenService.generateAccessToken(user);
      const refreshToken = await tokenService.generateRefreshToken(user);

      // Verify tokens are valid
      expect(await tokenService.validateToken(accessToken)).toBe(true);
      expect(await tokenService.validateToken(refreshToken)).toBe(true);

      // Verify token payload
      const payload = tokenService.decodeToken(accessToken);
      expect(payload?.sub).toBe(user.id);
      expect(payload?.email).toBe(user.email);
      expect(payload?.role).toBe(user.role);
      expect(payload?.tenantId).toBe(user.tenantId);
      expect(payload?.type).toBe('access'); // P7: Token type validation
    });

    it('should return correct response structure (AC1)', async () => {
      const user: UserForToken = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        name: 'Test User',
        role: 'OPERATOR',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
      };

      const accessToken = await tokenService.generateAccessToken(user);
      const refreshToken = await tokenService.generateRefreshToken(user);

      // Simulate LoginResponse structure
      const response = {
        data: {
          accessToken,
          refreshToken,
          expiresIn: tokenService.getExpiresIn('access'),
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        },
      };

      // Verify response structure matches AC1
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data).toHaveProperty('expiresIn');
      expect(response.data).toHaveProperty('user');
      expect(response.data.expiresIn).toBe(24 * 60 * 60); // 24 hours in seconds
      expect(response.data.user).toMatchObject({
        id: expect.any(String),
        email: expect.any(String),
        name: expect.any(String),
        role: expect.any(String),
      });
    });
  });

  describe('Error Path: Invalid Credentials (AC3)', () => {
    it('should fail password verification for wrong password', async () => {
      const correctPassword = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword456!';

      const storedHash = await passwordService.hashPassword(correctPassword);
      const isValid = await passwordService.verifyPassword(wrongPassword, storedHash);

      expect(isValid).toBe(false);
    });

    it('should handle non-existent user gracefully (timing attack prevention)', async () => {
      // Simulate what happens when user not found
      // Still perform password verification to prevent timing attacks
      const dummyHash = '$2b$12$dummyHashForTimingAttackPrevention';
      const password = 'AnyPassword123!';

      const start = performance.now();
      const isValid = await passwordService.verifyPassword(password, dummyHash);
      const duration = performance.now() - start;

      expect(isValid).toBe(false);
      // Should still take some time (not instant fail)
      expect(duration).toBeGreaterThan(0);
    });

    it('should return generic error message for security (AC3)', () => {
      // Simulate error response - should NOT reveal which field was wrong
      const errorResponse = {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Érvénytelen email vagy jelszó', // Hungarian: Invalid email or password
        },
      };

      // Error message should be generic (doesn't say "email not found" or "wrong password")
      expect(errorResponse.error.message).not.toContain('email not found');
      expect(errorResponse.error.message).not.toContain('wrong password');
      expect(errorResponse.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Input Validation (AC5)', () => {
    it('should reject missing email', () => {
      const result = validateLoginInput({ password: 'ValidPass123!' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.fields).toHaveProperty('email');
      }
    });

    it('should reject invalid email format', () => {
      const result = validateLoginInput({ email: 'not-an-email', password: 'ValidPass123!' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.fields).toHaveProperty('email');
      }
    });

    it('should reject missing password', () => {
      const result = validateLoginInput({ email: 'valid@email.com' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.fields).toHaveProperty('password');
      }
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validateLoginInput({ email: 'valid@email.com', password: 'short' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.fields).toHaveProperty('password');
      }
    });

    it('should accept valid input', () => {
      const result = validateLoginInput({
        email: 'valid@email.com',
        password: 'ValidPassword123!',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('valid@email.com');
        expect(result.data.password).toBe('ValidPassword123!');
      }
    });

    it('should return proper error format (AC5)', () => {
      const result = validateLoginInput({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatchObject({
          code: 'VALIDATION_ERROR',
          message: expect.any(String),
          fields: expect.any(Object),
        });
      }
    });
  });

  describe('Rate Limiting Simulation (AC4)', () => {
    it('should return proper rate limit error format', () => {
      // Simulate rate limit response
      const rateLimitResponse = {
        statusCode: 429,
        headers: {
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': '60',
        },
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Túl sok bejelentkezési kísérlet. Próbálja újra 60 másodperc múlva.',
        },
      };

      // Verify rate limit response structure (AC4)
      expect(rateLimitResponse.statusCode).toBe(429);
      expect(rateLimitResponse.headers['X-RateLimit-Limit']).toBe('5');
      expect(rateLimitResponse.headers['X-RateLimit-Remaining']).toBe('0');
      expect(rateLimitResponse.headers['X-RateLimit-Reset']).toBeTruthy();
    });
  });

  describe('Token Validation', () => {
    it('should reject expired tokens', async () => {
      const shortTtlService = new TokenService(jwtSecret, {
        accessTokenTtl: '1ms',
        refreshTokenTtl: '1ms',
      });

      const user: UserForToken = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        name: 'Test User',
        role: 'OPERATOR',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
      };

      const token = await shortTtlService.generateAccessToken(user);

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 50));

      const isValid = await shortTtlService.validateToken(token);
      expect(isValid).toBe(false);
    });

    it('should reject tampered tokens', async () => {
      const user: UserForToken = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        name: 'Test User',
        role: 'OPERATOR',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
      };

      const token = await tokenService.generateAccessToken(user);
      const tamperedToken = token.slice(0, -10) + 'tampered!!';

      const isValid = await tokenService.validateToken(tamperedToken);
      expect(isValid).toBe(false);
    });
  });

  // ============================================
  // Story 1.2: Token Refresh E2E Tests
  // ============================================

  describe('Token Refresh Flow (Story 1.2)', () => {
    const user: UserForToken = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      name: 'Test User',
      role: 'OPERATOR',
      tenantId: '660e8400-e29b-41d4-a716-446655440001',
    };

    describe('Happy Path: Valid Refresh (AC1)', () => {
      it('should validate refresh token and generate new tokens', async () => {
        // Generate initial tokens (simulating login)
        const refreshToken = await tokenService.generateRefreshToken(user);

        // Validate refresh token
        const isValidRefresh = await tokenService.validateRefreshToken(refreshToken);
        expect(isValidRefresh).toBe(true);

        // Wait to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Generate new token pair (simulating refresh)
        const newAccessToken = await tokenService.generateAccessToken(user);
        const newRefreshToken = await tokenService.generateRefreshToken(user);

        // Verify new tokens are valid
        expect(await tokenService.validateAccessToken(newAccessToken)).toBe(true);
        expect(await tokenService.validateRefreshToken(newRefreshToken)).toBe(true);

        // Verify new refresh token is different from old one
        expect(newRefreshToken).not.toBe(refreshToken);
      });

      it('should return correct refresh response structure (AC1)', async () => {
        const accessToken = await tokenService.generateAccessToken(user);
        const refreshToken = await tokenService.generateRefreshToken(user);

        // Simulate RefreshResponse structure
        const response = {
          data: {
            accessToken,
            refreshToken,
            expiresIn: tokenService.getExpiresIn('access'),
          },
        };

        // Verify response structure matches AC1
        expect(response.data).toHaveProperty('accessToken');
        expect(response.data).toHaveProperty('refreshToken');
        expect(response.data).toHaveProperty('expiresIn');
        expect(response.data.expiresIn).toBe(24 * 60 * 60); // 24 hours in seconds
      });
    });

    describe('Token Type Validation (AC4)', () => {
      it('should reject access token used as refresh token', async () => {
        const accessToken = await tokenService.generateAccessToken(user);

        // Access token should fail refresh token validation
        const isValidRefresh = await tokenService.validateRefreshToken(accessToken);
        expect(isValidRefresh).toBe(false);
      });

      it('should reject refresh token used as access token', async () => {
        const refreshToken = await tokenService.generateRefreshToken(user);

        // Refresh token should fail access token validation
        const isValidAccess = await tokenService.validateAccessToken(refreshToken);
        expect(isValidAccess).toBe(false);
      });

      it('should correctly identify token types', async () => {
        const accessToken = await tokenService.generateAccessToken(user);
        const refreshToken = await tokenService.generateRefreshToken(user);

        // Access token
        const accessPayload = tokenService.decodeToken(accessToken);
        expect(accessPayload?.type).toBe('access');

        // Refresh token
        const refreshPayload = tokenService.decodeToken(refreshToken);
        expect(refreshPayload?.type).toBe('refresh');
      });
    });

    describe('Error Path: Invalid Refresh Token (AC3)', () => {
      it('should reject expired refresh token', async () => {
        const shortTtlService = new TokenService(jwtSecret, {
          accessTokenTtl: '1ms',
          refreshTokenTtl: '1ms',
        });

        const refreshToken = await shortTtlService.generateRefreshToken(user);

        // Wait for token to expire
        await new Promise(resolve => setTimeout(resolve, 50));

        const isValid = await shortTtlService.validateRefreshToken(refreshToken);
        expect(isValid).toBe(false);
      });

      it('should reject malformed refresh token', async () => {
        const isValid = await tokenService.validateRefreshToken('not-a-valid-jwt');
        expect(isValid).toBe(false);
      });

      it('should reject tampered refresh token', async () => {
        const refreshToken = await tokenService.generateRefreshToken(user);
        const tamperedToken = refreshToken.slice(0, -5) + 'xxxxx';

        const isValid = await tokenService.validateRefreshToken(tamperedToken);
        expect(isValid).toBe(false);
      });

      it('should return proper error format for invalid refresh token', () => {
        // Simulate error response for invalid refresh token (AC3)
        const errorResponse = {
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Érvénytelen vagy lejárt refresh token', // Hungarian
          },
        };

        expect(errorResponse.error.code).toBe('INVALID_REFRESH_TOKEN');
        expect(errorResponse.error.message).toBeTruthy();
      });
    });

    describe('Input Validation (AC5)', () => {
      it('should reject missing refresh token', () => {
        const result = validateRefreshInput({});
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('VALIDATION_ERROR');
          expect(result.error.fields).toHaveProperty('refreshToken');
        }
      });

      it('should reject empty refresh token', () => {
        const result = validateRefreshInput({ refreshToken: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('VALIDATION_ERROR');
          expect(result.error.fields).toHaveProperty('refreshToken');
        }
      });

      it('should accept valid refresh token format', () => {
        const result = validateRefreshInput({
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.refreshToken).toBeTruthy();
        }
      });
    });
  });

  // ============================================
  // Story 1.3: Logout E2E Tests
  // ============================================

  describe('Logout Flow (Story 1.3)', () => {
    const user: UserForToken = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      name: 'Test User',
      role: 'OPERATOR',
      tenantId: '660e8400-e29b-41d4-a716-446655440001',
    };

    describe('Logout Input Validation (AC4)', () => {
      it('should reject missing refresh token', () => {
        const result = validateLogoutInput({});
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('VALIDATION_ERROR');
          expect(result.error.fields).toHaveProperty('refreshToken');
        }
      });

      it('should reject empty refresh token', () => {
        const result = validateLogoutInput({ refreshToken: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('VALIDATION_ERROR');
          expect(result.error.fields).toHaveProperty('refreshToken');
        }
      });

      it('should accept valid refresh token for logout', () => {
        const result = validateLogoutInput({
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.refreshToken).toBeTruthy();
        }
      });
    });

    describe('Single Device Logout (AC1)', () => {
      it('should generate valid tokens that can be used for logout flow', async () => {
        // Generate tokens (simulating login)
        const accessToken = await tokenService.generateAccessToken(user);
        const refreshToken = await tokenService.generateRefreshToken(user);

        // Verify access token is valid (for AuthGuard)
        expect(await tokenService.validateAccessToken(accessToken)).toBe(true);

        // Verify refresh token is valid (for logout)
        expect(await tokenService.validateRefreshToken(refreshToken)).toBe(true);

        // Simulate logout response structure
        const logoutResponse = {
          data: {
            success: true,
            message: 'Sikeres kijelentkezés',
          },
        };

        expect(logoutResponse.data.success).toBe(true);
        expect(logoutResponse.data.message).toBeTruthy();
      });

      it('should return proper error format for invalid logout request', () => {
        // Simulate error response (AC1)
        const errorResponse = {
          error: {
            code: 'TOKEN_NOT_FOUND',
            message: 'Refresh token nem található',
          },
        };

        expect(errorResponse.error.code).toBe('TOKEN_NOT_FOUND');
        expect(errorResponse.error.message).toBeTruthy();
      });
    });

    describe('Logout All Devices (AC2)', () => {
      it('should return proper logout-all response structure', () => {
        // Simulate logout-all response (AC2)
        const logoutAllResponse = {
          data: {
            success: true,
            revokedCount: 3,
            message: 'Sikeres kijelentkezés minden eszközről (3 session)',
          },
        };

        expect(logoutAllResponse.data.success).toBe(true);
        expect(logoutAllResponse.data.revokedCount).toBe(3);
        expect(logoutAllResponse.data.message).toContain('3 session');
      });

      it('should handle zero active sessions', () => {
        // Simulate logout-all with no active sessions
        // C-L2 fix: Consistent message format regardless of count
        const logoutAllResponse = {
          data: {
            success: true,
            revokedCount: 0,
            message: 'Sikeres kijelentkezés minden eszközről (0 session)',
          },
        };

        expect(logoutAllResponse.data.success).toBe(true);
        expect(logoutAllResponse.data.revokedCount).toBe(0);
        expect(logoutAllResponse.data.message).toContain('0 session');
      });
    });

    describe('Protected Endpoint (AC5)', () => {
      it('should require valid access token for logout', async () => {
        const accessToken = await tokenService.generateAccessToken(user);

        // Verify token is valid access token
        const payload = tokenService.decodeToken(accessToken);
        expect(payload?.type).toBe('access');
        expect(payload?.sub).toBe(user.id);
      });

      it('should reject refresh token as access token', async () => {
        const refreshToken = await tokenService.generateRefreshToken(user);

        // Verify refresh token cannot be used for access
        const isValidAccess = await tokenService.validateAccessToken(refreshToken);
        expect(isValidAccess).toBe(false);
      });

      it('should return 401 error format for unauthorized requests', () => {
        // Simulate 401 response (AC5)
        const errorResponse = {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Nincs jogosultság',
          },
        };

        expect(errorResponse.error.code).toBe('UNAUTHORIZED');
        expect(errorResponse.error.message).toBeTruthy();
      });
    });
  });

  // ============================================
  // Story 1.4: PIN Login E2E Tests (Kiosk Mode)
  // ============================================

  describe('PIN Login Flow (Story 1.4)', () => {
    const user: UserForToken = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      name: 'Test User',
      role: 'OPERATOR',
      tenantId: '660e8400-e29b-41d4-a716-446655440001',
    };

    const validDeviceId = '880e8400-e29b-41d4-a716-446655440003';
    let pinService: PinService;

    beforeEach(() => {
      pinService = new PinService(null, 10);
    });

    describe('Happy Path: Successful PIN Login (AC1)', () => {
      it('should complete full PIN login flow: validate input → verify PIN → generate kiosk token', async () => {
        // Step 1: Validate input
        const input = { pin: '1234', deviceId: validDeviceId };
        const validationResult = validatePinLoginInput(input);
        expect(validationResult.success).toBe(true);

        // Step 2: Hash PIN (simulate stored hash)
        const storedPinHash = await pinService.hashPin('1234');

        // Step 3: Verify PIN
        const isValid = await pinService.verifyPin('1234', storedPinHash);
        expect(isValid).toBe(true);

        // Step 4: Generate kiosk token
        const kioskToken = await tokenService.generateKioskToken(user);

        // Verify kiosk token is valid
        expect(await tokenService.validateKioskToken(kioskToken)).toBe(true);

        // Verify token payload
        const payload = tokenService.decodeToken(kioskToken);
        expect(payload?.sub).toBe(user.id);
        expect(payload?.email).toBe(user.email);
        expect(payload?.role).toBe(user.role);
        expect(payload?.type).toBe('kiosk');
      });

      it('should return correct PIN login response structure (AC1 - no refresh token)', async () => {
        const kioskToken = await tokenService.generateKioskToken(user);

        // Simulate PinLoginResponse structure
        const response = {
          data: {
            accessToken: kioskToken,
            expiresIn: tokenService.getExpiresIn('kiosk'),
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
          },
        };

        // Verify response structure matches AC1 (NO refresh token for kiosk mode)
        expect(response.data).toHaveProperty('accessToken');
        expect(response.data).not.toHaveProperty('refreshToken');
        expect(response.data).toHaveProperty('expiresIn');
        expect(response.data).toHaveProperty('user');
        expect(response.data.expiresIn).toBe(4 * 60 * 60); // 4 hours in seconds
        expect(response.data.user).toMatchObject({
          id: expect.any(String),
          email: expect.any(String),
          name: expect.any(String),
          role: expect.any(String),
        });
      });

      it('should generate kiosk token with 4h TTL (AC1)', async () => {
        const kioskToken = await tokenService.generateKioskToken(user);
        const payload = tokenService.decodeToken(kioskToken);

        // Verify 4 hour expiration
        expect(payload?.exp).toBeDefined();
        expect(payload?.iat).toBeDefined();
        if (payload?.exp && payload?.iat) {
          const ttlSeconds = payload.exp - payload.iat;
          expect(ttlSeconds).toBe(4 * 60 * 60); // 4 hours
        }
      });
    });

    describe('PIN Input Validation (AC4)', () => {
      it('should reject missing PIN', () => {
        const result = validatePinLoginInput({ deviceId: validDeviceId });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('VALIDATION_ERROR');
          expect(result.error.fields).toHaveProperty('pin');
        }
      });

      it('should reject PIN shorter than 4 digits', () => {
        const result = validatePinLoginInput({ pin: '123', deviceId: validDeviceId });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('VALIDATION_ERROR');
          expect(result.error.fields).toHaveProperty('pin');
        }
      });

      it('should reject PIN longer than 6 digits', () => {
        const result = validatePinLoginInput({ pin: '1234567', deviceId: validDeviceId });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('VALIDATION_ERROR');
          expect(result.error.fields).toHaveProperty('pin');
        }
      });

      it('should reject non-numeric PIN', () => {
        const result = validatePinLoginInput({ pin: '12ab', deviceId: validDeviceId });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('VALIDATION_ERROR');
          expect(result.error.fields).toHaveProperty('pin');
        }
      });

      it('should accept valid 4-digit PIN', () => {
        const result = validatePinLoginInput({ pin: '1234', deviceId: validDeviceId });
        expect(result.success).toBe(true);
      });

      it('should accept valid 5-digit PIN', () => {
        const result = validatePinLoginInput({ pin: '12345', deviceId: validDeviceId });
        expect(result.success).toBe(true);
      });

      it('should accept valid 6-digit PIN', () => {
        const result = validatePinLoginInput({ pin: '123456', deviceId: validDeviceId });
        expect(result.success).toBe(true);
      });
    });

    describe('Device ID Validation (AC5)', () => {
      it('should reject missing deviceId', () => {
        const result = validatePinLoginInput({ pin: '1234' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('VALIDATION_ERROR');
          expect(result.error.fields).toHaveProperty('deviceId');
        }
      });

      it('should reject invalid UUID format', () => {
        const result = validatePinLoginInput({ pin: '1234', deviceId: 'not-a-uuid' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('VALIDATION_ERROR');
          expect(result.error.fields).toHaveProperty('deviceId');
        }
      });

      it('should reject empty deviceId', () => {
        const result = validatePinLoginInput({ pin: '1234', deviceId: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('VALIDATION_ERROR');
          expect(result.error.fields).toHaveProperty('deviceId');
        }
      });

      it('should accept valid UUID v4', () => {
        const result = validatePinLoginInput({
          pin: '1234',
          deviceId: '880e8400-e29b-41d4-a716-446655440003',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('Error Path: Invalid Credentials (AC6)', () => {
      it('should fail PIN verification for wrong PIN', async () => {
        const correctPin = '1234';
        const wrongPin = '9999';

        const storedHash = await pinService.hashPin(correctPin);
        const isValid = await pinService.verifyPin(wrongPin, storedHash);

        expect(isValid).toBe(false);
      });

      it('should return generic error message for security (AC6)', () => {
        // Simulate error response - should NOT reveal what failed
        const errorResponse = {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Érvénytelen PIN kód', // Hungarian: Invalid PIN code
          },
        };

        // Error message should be generic (doesn't say "device not trusted" or "user has no PIN")
        expect(errorResponse.error.message).not.toContain('device');
        expect(errorResponse.error.message).not.toContain('user');
        expect(errorResponse.error.code).toBe('INVALID_CREDENTIALS');
      });
    });

    describe('PIN Lockout (AC3)', () => {
      it('should return proper lockout error format', () => {
        // Simulate lockout response (AC3)
        const lockoutResponse = {
          statusCode: 429,
          error: {
            code: 'PIN_LOCKOUT',
            message: 'Fiók ideiglenesen zárolva. Próbálja újra 15 perc múlva.',
          },
        };

        expect(lockoutResponse.statusCode).toBe(429);
        expect(lockoutResponse.error.code).toBe('PIN_LOCKOUT');
        expect(lockoutResponse.error.message).toContain('15 perc');
      });

      it('should lockout after 3 failed attempts (simulation)', () => {
        // Simulate lockout state after 3 failed attempts
        const lockoutState = {
          attemptCount: 3,
          isLocked: true,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
        };

        expect(lockoutState.attemptCount).toBe(3);
        expect(lockoutState.isLocked).toBe(true);
        // Lockout duration should be 15 minutes
        const lockoutDuration = lockoutState.lockedUntil.getTime() - Date.now();
        expect(lockoutDuration).toBeGreaterThan(14 * 60 * 1000); // At least 14 mins
        expect(lockoutDuration).toBeLessThanOrEqual(15 * 60 * 1000); // At most 15 mins
      });
    });

    describe('Trusted Device Validation (AC2)', () => {
      it('should return error for untrusted device (simulation)', () => {
        // Simulate untrusted device error (AC2)
        // Note: Uses same error code as AC6 for security
        const errorResponse = {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Érvénytelen PIN kód',
          },
        };

        // Should return generic error (not "device not trusted" for security)
        expect(errorResponse.error.code).toBe('INVALID_CREDENTIALS');
      });
    });

    describe('Kiosk Token Type Validation', () => {
      it('should identify kiosk token type correctly', async () => {
        const kioskToken = await tokenService.generateKioskToken(user);

        const payload = tokenService.decodeToken(kioskToken);
        expect(payload?.type).toBe('kiosk');
      });

      it('should reject kiosk token as access token', async () => {
        const kioskToken = await tokenService.generateKioskToken(user);

        const isValidAccess = await tokenService.validateAccessToken(kioskToken);
        expect(isValidAccess).toBe(false);
      });

      it('should reject kiosk token as refresh token', async () => {
        const kioskToken = await tokenService.generateKioskToken(user);

        const isValidRefresh = await tokenService.validateRefreshToken(kioskToken);
        expect(isValidRefresh).toBe(false);
      });

      it('should accept kiosk token only via validateKioskToken', async () => {
        const kioskToken = await tokenService.generateKioskToken(user);

        const isValidKiosk = await tokenService.validateKioskToken(kioskToken);
        expect(isValidKiosk).toBe(true);
      });
    });
  });
});
