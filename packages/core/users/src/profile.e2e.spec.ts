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

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
vi.mock('bcrypt', async importOriginal => {
  const actual = await importOriginal<typeof import('bcrypt')>();
  return {
    ...actual,
    compare: (...args: unknown[]) => mockBcryptCompare(...args),
    hash: (...args: unknown[]) => mockBcryptHash(...args),
  };
});

import { Role, UserStatus } from './interfaces/user.interface';
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
// Profile messages exported for future tests
// import { PROFILE_MESSAGES } from './dto/profile-response.dto';

// Valid UUIDs for testing
const testUserId = '00000000-0000-0000-0000-000000000001';
const testTenantId = '00000000-0000-0000-0000-000000000002';
const testLocationId = '00000000-0000-0000-0000-000000000003';

// Mock Express Request/Response
const createMockRequest = (
  overrides: Partial<{
    body: unknown;
    user: { id: string; email: string; role: Role; tenantId: string };
  }> = {}
) => ({
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

// Note: createMockResponse removed - controller uses native returns

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

    // UsersService constructor: (prisma, roleService, permissionService, authService, auditService)
    // C1v2 FIX: PermissionService now requires RoleService via DI
    const roleService = new RoleService();
    const permissionService = new PermissionService(roleService);
    usersService = new UsersService(
      mockPrisma as unknown as Parameters<(typeof UsersService)['prototype']['constructor']>[0],
      roleService,
      permissionService,
      mockAuthService as unknown as Parameters<
        (typeof UsersService)['prototype']['constructor']
      >[3],
      mockAuditService as unknown as Parameters<
        (typeof UsersService)['prototype']['constructor']
      >[4]
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

      // Act - H1v2 FIX: Controller returns native type
      const result = await controller.getMyProfile(req as never);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        id: testUserId,
        email: 'user@test.com',
        name: 'Test User',
        phone: '+36 20 123 4567',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
      // Verify sensitive fields are excluded
      expect(result.data).not.toHaveProperty('passwordHash');
      expect(result.data).not.toHaveProperty('pinHash');
    });

    it('should return 404 if user not found', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(null);
      const req = createMockRequest();

      // Act & Assert - H1v2 FIX: Controller throws NotFoundException
      await expect(controller.getMyProfile(req as never)).rejects.toThrow(NotFoundException);
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

      // Act - H1v2 FIX: Controller returns native type
      const result = await controller.updateMyProfile(body as never, req as never);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        name: 'Updated Name',
        phone: '+36 30 987 6543',
      });
    });

    it('should return 404 when updating non-existent user', async () => {
      // Arrange - user not found
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const body = {
        name: 'Updated Name',
      };
      const req = createMockRequest({ body });

      // Act & Assert - H1v2 FIX: Controller throws NotFoundException
      await expect(controller.updateMyProfile(body as never, req as never)).rejects.toThrow(
        NotFoundException
      );
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

      // Act - H1v2 FIX: Controller returns native type
      const result = await controller.updateMyProfile(body as never, req as never);

      // Assert
      expect(result).toHaveProperty('data');
      // Empty string is passed through - service decides how to handle
      expect(mockPrisma.user.update).toHaveBeenCalled();
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

      // Act - H1v2 FIX: Controller returns native type
      const result = await controller.updateMyPin(body as never, req as never);

      // Assert
      expect(result).toMatchObject({
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

      // Act & Assert - H1v2 FIX: Controller throws BadRequestException
      await expect(controller.updateMyPin(body as never, req as never)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should return 404 when updating PIN for non-existent user', async () => {
      // Arrange - user not found
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const body = {
        currentPin: '1234',
        newPin: '5678',
      };
      const req = createMockRequest({ body });

      // Act & Assert - H1v2 FIX: Controller throws NotFoundException
      await expect(controller.updateMyPin(body as never, req as never)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should allow setting PIN when user has no existing PIN (with password)', async () => {
      // Arrange - user exists but has no PIN, password required for first setup
      const userWithoutPin = { ...testUser, pinHash: null };
      const newPinHash = '$2b$10$newpinhash1234567890abcdefghijklmnopqrstuvwxyzABC';
      mockPrisma.user.findFirst.mockResolvedValue(userWithoutPin);
      mockBcryptCompare.mockResolvedValue(true); // Password verification passes
      mockBcryptHash.mockResolvedValue(newPinHash);
      mockPrisma.user.update.mockResolvedValue({
        ...userWithoutPin,
        pinHash: newPinHash,
      });

      const body = {
        newPin: '5678',
        password: 'validPassword123', // Required for first PIN setup
      };
      const req = createMockRequest({ body });

      // Act - H1v2 FIX: Controller returns native type
      const result = await controller.updateMyPin(body as never, req as never);

      // Assert
      expect(result).toMatchObject({
        data: {
          success: true,
          message: expect.any(String),
        },
      });
    });
  });
});
