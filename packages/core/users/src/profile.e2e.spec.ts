/**
 * Profile E2E Tests
 * Story 2.6: User Profile Management
 *
 * Tests the full request-response cycle through the controller.
 * AC#7 requires 8 E2E tests covering:
 * - GET /users/me - Saját profil lekérés
 * - PUT /users/me - Profil frissítés
 * - PUT /users/me/pin - PIN módosítás
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';

// Mock @kgc/auth before importing controller
vi.mock('@kgc/auth', () => ({
  JwtAuthGuard: class MockJwtAuthGuard {
    canActivate() {
      return true;
    }
  },
  AuthService: class MockAuthService {
    revokeAllUserTokens = vi.fn().mockResolvedValue(1);
  },
}));

// Mock bcrypt at file level
const mockBcryptCompare = vi.fn();
const mockBcryptHash = vi.fn();
vi.mock('bcrypt', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bcrypt')>();
  return {
    ...actual,
    compare: (...args: unknown[]) => mockBcryptCompare(...args),
    hash: (...args: unknown[]) => mockBcryptHash(...args),
  };
});

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RoleService } from './services/role.service';
import { Role, UserStatus, UserErrorCode } from './interfaces/user.interface';
import { PROFILE_MESSAGES } from './dto/profile-response.dto';

// Valid UUIDs for testing
const testUserId = '00000000-0000-0000-0000-000000000001';
const testTenantId = '00000000-0000-0000-0000-000000000002';
const testLocationId = '00000000-0000-0000-0000-000000000003';

// Mock Express Request/Response
const createMockRequest = (overrides: Partial<{
  body: unknown;
  user: { id: string; email: string; role: Role; tenantId: string };
}> = {}) => ({
  body: overrides.body ?? {},
  query: {},
  params: {},
  user: overrides.user ?? {
    id: testUserId,
    email: 'user@test.com',
    role: Role.OPERATOR,
    tenantId: testTenantId,
  },
});

const createMockResponse = () => {
  const res = {
    statusCode: 200,
    responseBody: null as unknown,
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((body: unknown) => {
      res.responseBody = body;
      return res;
    }),
  };
  return res;
};

// Mock PrismaClient
const createMockPrisma = () => ({
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
});

// Mock AuthService
const createMockAuthService = () => ({
  revokeAllUserTokens: vi.fn().mockResolvedValue(1),
});

// Mock AuditService
const createMockAuditService = () => ({
  log: vi.fn().mockResolvedValue(undefined),
});

describe('Profile E2E Tests - Story 2.6', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockAuthService: ReturnType<typeof createMockAuthService>;
  let mockAuditService: ReturnType<typeof createMockAuditService>;

  const testUser = {
    id: testUserId,
    email: 'user@test.com',
    name: 'Test User',
    role: Role.OPERATOR,
    tenantId: testTenantId,
    locationId: testLocationId,
    status: UserStatus.ACTIVE,
    passwordHash: 'hashed_password',
    pinHash: '$2b$10$validpinhash1234567890abcdefghijklmnopqrstuvwxyz',
    phone: '+36 20 123 4567',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    deletedBy: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockAuthService = createMockAuthService();
    mockAuditService = createMockAuditService();

    // UsersService constructor: (prisma, roleService, authService, auditService)
    usersService = new UsersService(
      mockPrisma as unknown as Parameters<typeof UsersService['prototype']['constructor']>[0],
      new RoleService(), // RoleService is required
      mockAuthService as unknown as Parameters<typeof UsersService['prototype']['constructor']>[2],
      mockAuditService as unknown as Parameters<typeof UsersService['prototype']['constructor']>[3],
    );
    controller = new UsersController(usersService);

    // Reset bcrypt mocks
    mockBcryptCompare.mockReset();
    mockBcryptHash.mockReset();
  });

  // ============================================
  // GET /api/v1/users/me - Saját profil lekérés
  // ============================================

  describe('GET /users/me - Saját profil lekérés', () => {
    it('should return current user profile successfully (AC#1)', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(testUser);
      const req = createMockRequest();
      const res = createMockResponse();

      // Act
      await controller.getMyProfile(req as never, res as never);

      // Assert
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.responseBody).toHaveProperty('data');
      const data = (res.responseBody as { data: unknown }).data;
      expect(data).toMatchObject({
        id: testUserId,
        email: 'user@test.com',
        name: 'Test User',
        phone: '+36 20 123 4567',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
      // Verify sensitive fields are excluded
      expect(data).not.toHaveProperty('passwordHash');
      expect(data).not.toHaveProperty('pinHash');
    });

    it('should return 404 if user not found', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(null);
      const req = createMockRequest();
      const res = createMockResponse();

      // Act
      await controller.getMyProfile(req as never, res as never);

      // Assert
      expect(res.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(res.responseBody).toMatchObject({
        error: {
          code: UserErrorCode.USER_NOT_FOUND,
          message: PROFILE_MESSAGES.NOT_FOUND,
        },
      });
    });
  });

  // ============================================
  // PUT /api/v1/users/me - Profil frissítés
  // ============================================

  describe('PUT /users/me - Profil frissítés', () => {
    it('should update profile successfully (AC#2)', async () => {
      // Arrange
      const updatedUser = {
        ...testUser,
        name: 'Updated Name',
        phone: '+36 30 987 6543',
      };
      mockPrisma.user.findFirst.mockResolvedValue(testUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const body = {
        name: 'Updated Name',
        phone: '+36 30 987 6543',
      };
      const req = createMockRequest({ body });
      const res = createMockResponse();

      // Act - note: controller method has @Body() decorator, so body is first param
      await controller.updateMyProfile(body, req as never, res as never);

      // Assert
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.responseBody).toHaveProperty('data');
      const data = (res.responseBody as { data: unknown }).data;
      expect(data).toMatchObject({
        name: 'Updated Name',
        phone: '+36 30 987 6543',
      });
    });

    it('should reject invalid phone format', async () => {
      // Arrange
      const body = {
        phone: 'invalid-phone',
      };
      const req = createMockRequest({ body });
      const res = createMockResponse();

      // Act
      await controller.updateMyProfile(body, req as never, res as never);

      // Assert
      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(res.responseBody).toHaveProperty('error');
    });

    it('should clear phone when empty string provided', async () => {
      // Arrange
      const updatedUser = {
        ...testUser,
        phone: null,
      };
      mockPrisma.user.findFirst.mockResolvedValue(testUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const body = {
        phone: '',
      };
      const req = createMockRequest({ body });
      const res = createMockResponse();

      // Act
      await controller.updateMyProfile(body, req as never, res as never);

      // Assert
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: null,
          }),
        })
      );
    });
  });

  // ============================================
  // PUT /api/v1/users/me/pin - PIN módosítás
  // ============================================

  describe('PUT /users/me/pin - PIN módosítás', () => {
    it('should update PIN successfully (AC#4)', async () => {
      // Arrange
      const newPinHash = '$2b$10$newpinhash1234567890abcdefghijklmnopqrstuvwxyzABC';
      mockPrisma.user.findFirst.mockResolvedValue(testUser);
      mockBcryptCompare.mockResolvedValue(true); // Current PIN is valid
      mockBcryptHash.mockResolvedValue(newPinHash);
      mockPrisma.user.update.mockResolvedValue({
        ...testUser,
        pinHash: newPinHash,
      });

      const body = {
        currentPin: '1234',
        newPin: '5678',
      };
      const req = createMockRequest({ body });
      const res = createMockResponse();

      // Act - note: controller method has @Body() decorator, so body is first param
      await controller.updateMyPin(body, req as never, res as never);

      // Assert
      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(res.responseBody).toMatchObject({
        data: {
          success: true,
          message: expect.any(String),
        },
      });
    });

    it('should reject invalid current PIN', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(testUser);
      mockBcryptCompare.mockResolvedValue(false); // Wrong PIN

      const body = {
        currentPin: '0000',
        newPin: '5678',
      };
      const req = createMockRequest({ body });
      const res = createMockResponse();

      // Act
      await controller.updateMyPin(body, req as never, res as never);

      // Assert
      expect(res.statusCode).toBe(HttpStatus.FORBIDDEN);
      expect(res.responseBody).toMatchObject({
        error: {
          code: 'INVALID_PIN',
          message: PROFILE_MESSAGES.INVALID_PIN,
        },
      });
    });

    it('should reject short PIN (less than 4 digits)', async () => {
      // Arrange
      const body = {
        currentPin: '123', // Too short
        newPin: '5678',
      };
      const req = createMockRequest({ body });
      const res = createMockResponse();

      // Act
      await controller.updateMyPin(body, req as never, res as never);

      // Assert
      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(res.responseBody).toHaveProperty('error');
    });

    it('should reject PIN with non-numeric characters', async () => {
      // Arrange
      const body = {
        currentPin: '1234',
        newPin: 'abcd', // Non-numeric
      };
      const req = createMockRequest({ body });
      const res = createMockResponse();

      // Act
      await controller.updateMyPin(body, req as never, res as never);

      // Assert
      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(res.responseBody).toHaveProperty('error');
    });
  });
});
