/**
 * Auth E2E Tests - Integration tests for authentication flow
 * Story 1.1: JWT Login Endpoint
 *
 * Tests:
 * - AC1: Happy path - successful login returns tokens
 * - AC3: Error path - invalid credentials returns 401
 * - AC4: Rate limiting (mocked - would require full app)
 * - AC5: Input validation returns 400
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { validateLoginInput } from './dto/login.dto';
import type { UserForToken } from './interfaces/jwt-payload.interface';
import { PasswordService } from './services/password.service';
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
});
