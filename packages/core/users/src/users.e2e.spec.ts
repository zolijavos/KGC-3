/**
 * Users E2E Tests
 * Story 2.1: User CRUD Operations
 * Story 2.2: Role Assignment és RBAC
 *
 * Tests the full request-response cycle through the controller.
 * Validates:
 * - AC1: Create user happy path
 * - AC2: List users with pagination
 * - AC3: Get user by ID
 * - AC4: Update user
 * - AC5: Soft delete user
 * - AC6: Role hierarchy enforcement
 * - AC7: Input validation errors
 * - AC8: Tenant isolation
 *
 * Story 2.2 Validation:
 * - AC1: PUT /users/:id/role endpoint
 * - AC2: Role hierarchy validation
 * - AC3: GET /users/:id/permissions endpoint
 * - AC4: Kompozit jogok (direct + inherited)
 * - AC8: Zod validation
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

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { RoleService } from './services/role.service';
import { Role, UserStatus, UserErrorCode } from './interfaces/user.interface';
import { USER_MESSAGES } from './dto/user-response.dto';

// Valid UUIDs for testing (defined at module scope for use in helper functions)
const testUserId = '00000000-0000-0000-0000-000000000001';
const testTenantId = '00000000-0000-0000-0000-000000000002';
const testCreatorId = '00000000-0000-0000-0000-000000000003';
const nonExistentId = '00000000-0000-0000-0000-000000000099';

// Mock Express Request/Response
const createMockRequest = (overrides: Partial<{
  body: unknown;
  query: Record<string, string>;
  params: Record<string, string>;
  user: { id: string; email: string; role: Role; tenantId: string };
}> = {}) => ({
  body: overrides.body ?? {},
  query: overrides.query ?? {},
  params: overrides.params ?? {},
  user: overrides.user ?? {
    id: testCreatorId,
    email: 'admin@test.com',
    role: Role.PARTNER_OWNER,
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

describe('Users E2E Tests', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockAuthService: ReturnType<typeof createMockAuthService>;

  const testUser = {
    id: testUserId,
    email: 'test@example.com',
    name: 'Test User',
    role: Role.OPERATOR,
    tenantId: testTenantId,
    locationId: null,
    status: UserStatus.ACTIVE,
    passwordHash: 'hashed',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockAuthService = createMockAuthService();
    const roleService = new RoleService();
    usersService = new UsersService(
      mockPrisma as unknown as Parameters<typeof UsersService.prototype.constructor>[0],
      roleService,
      mockAuthService as unknown as Parameters<typeof UsersService.prototype.constructor>[2]
    );
    controller = new UsersController(usersService);
  });

  // ============================================
  // AC1: Create user happy path
  // ============================================

  describe('POST /api/v1/users - Create User', () => {
    it('should create user with valid data (7.1)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(testUser);

      const req = createMockRequest({
        body: {
          email: 'new@example.com',
          name: 'New User',
          role: Role.OPERATOR,
        },
      });
      const res = createMockResponse();

      await controller.createUser(req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.CREATED);
      expect(res.responseBody).toHaveProperty('data');
    });

    it('should return 400 for invalid input (7.7)', async () => {
      const req = createMockRequest({
        body: {
          email: 'invalid-email', // Invalid email format
          name: 'A', // Too short
        },
      });
      const res = createMockResponse();

      await controller.createUser(req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect((res.responseBody as Record<string, unknown>).error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 409 for duplicate email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUser); // Email exists

      const req = createMockRequest({
        body: {
          email: 'test@example.com',
          name: 'Duplicate User',
        },
      });
      const res = createMockResponse();

      await controller.createUser(req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.CONFLICT);
      expect((res.responseBody as Record<string, unknown>).error).toHaveProperty(
        'code',
        UserErrorCode.EMAIL_ALREADY_EXISTS
      );
    });

    it('should return 403 for role hierarchy violation (7.6)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest({
        body: {
          email: 'super@example.com',
          name: 'Super Admin',
          role: Role.SUPER_ADMIN, // Cannot assign higher role
        },
      });
      const res = createMockResponse();

      await controller.createUser(req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.FORBIDDEN);
      expect((res.responseBody as Record<string, unknown>).error).toHaveProperty(
        'code',
        UserErrorCode.ROLE_HIERARCHY_VIOLATION
      );
    });
  });

  // ============================================
  // AC2: List users with pagination
  // ============================================

  describe('GET /api/v1/users - List Users', () => {
    it('should list users with pagination (7.2)', async () => {
      mockPrisma.user.findMany.mockResolvedValue([testUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      const req = createMockRequest({
        query: { limit: '10', offset: '0' },
      });
      const res = createMockResponse();

      await controller.listUsers(req.query, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.OK);
      const body = res.responseBody as { data: unknown[]; pagination: { total: number } };
      expect(body.data).toHaveLength(1);
      expect(body.pagination.total).toBe(1);
    });

    it('should filter by role', async () => {
      mockPrisma.user.findMany.mockResolvedValue([testUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      const req = createMockRequest({
        query: { role: 'OPERATOR' },
      });
      const res = createMockResponse();

      await controller.listUsers(req.query, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'OPERATOR' }),
        })
      );
    });

    it('should filter by search term', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const req = createMockRequest({
        query: { search: 'john' },
      });
      const res = createMockResponse();

      await controller.listUsers(req.query, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.OK);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ email: expect.anything() }),
              expect.objectContaining({ name: expect.anything() }),
            ]),
          }),
        })
      );
    });
  });

  // ============================================
  // AC3: Get user by ID
  // ============================================

  describe('GET /api/v1/users/:id - Get User', () => {
    it('should get user by ID (7.3)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUser);

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.getUserById(testUserId, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.OK);
      expect((res.responseBody as { data: { id: string } }).data.id).toBe(testUserId);
    });

    it('should return 404 for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.getUserById(nonExistentId, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect((res.responseBody as Record<string, unknown>).error).toHaveProperty(
        'code',
        UserErrorCode.USER_NOT_FOUND
      );
    });

    it('should enforce tenant isolation (7.8)', async () => {
      // User in different tenant returns null (simulating RLS)
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.getUserById(testUserId, req as never, res as never);

      // Verify tenant was included in query
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: testTenantId }),
        })
      );
    });
  });

  // ============================================
  // AC4: Update user
  // ============================================

  describe('PATCH /api/v1/users/:id - Update User', () => {
    it('should update user (7.4)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUser);
      mockPrisma.user.update.mockResolvedValue({ ...testUser, name: 'Updated Name' });

      const req = createMockRequest({
        body: { name: 'Updated Name' },
      });
      const res = createMockResponse();

      await controller.updateUser(testUserId, req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.OK);
      expect((res.responseBody as { data: { name: string } }).data.name).toBe('Updated Name');
    });

    it('should return 400 for invalid update input', async () => {
      const req = createMockRequest({
        body: { name: 'A' }, // Too short
      });
      const res = createMockResponse();

      await controller.updateUser(testUserId, req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should return 404 for updating non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest({
        body: { name: 'New Name' },
      });
      const res = createMockResponse();

      await controller.updateUser(nonExistentId, req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('should return 400 for empty body (no fields to update)', async () => {
      const req = createMockRequest({
        body: {}, // Empty body - no fields to update
      });
      const res = createMockResponse();

      await controller.updateUser(testUserId, req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect((res.responseBody as Record<string, unknown>).error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 for invalid UUID format', async () => {
      const req = createMockRequest({
        body: { name: 'Valid Name' },
      });
      const res = createMockResponse();

      await controller.updateUser('invalid-uuid', req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect((res.responseBody as Record<string, unknown>).error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  // ============================================
  // AC5: Soft delete user
  // ============================================

  describe('DELETE /api/v1/users/:id - Soft Delete User', () => {
    it('should soft delete user (7.5)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUser);
      mockPrisma.user.update.mockResolvedValue({ ...testUser, status: UserStatus.INACTIVE });

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.deleteUser(testUserId, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.OK);
      const body = res.responseBody as { data: { success: boolean } };
      expect(body.data.success).toBe(true);
    });

    it('should revoke all tokens on delete', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUser);
      mockPrisma.user.update.mockResolvedValue({ ...testUser, status: UserStatus.INACTIVE });

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.deleteUser(testUserId, req as never, res as never);

      expect(mockAuthService.revokeAllUserTokens).toHaveBeenCalledWith(testUserId);
    });

    it('should return 404 for deleting non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.deleteUser(nonExistentId, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.NOT_FOUND);
    });
  });

  // ============================================
  // Story 2.2: PUT /api/v1/users/:id/role - Assign Role
  // ============================================

  describe('PUT /api/v1/users/:id/role - Assign Role (Story 2.2)', () => {
    const targetUserId = '00000000-0000-0000-0000-000000000004';
    const targetUser = {
      id: targetUserId,
      email: 'target@example.com',
      name: 'Target User',
      role: Role.OPERATOR,
      tenantId: testTenantId,
      locationId: null,
      status: UserStatus.ACTIVE,
      passwordHash: 'hashed',
      createdAt: new Date('2026-01-15'),
      updatedAt: new Date('2026-01-15'),
    };

    it('should assign role successfully (2.2 AC1)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(targetUser);
      mockPrisma.user.update.mockResolvedValue({
        ...targetUser,
        role: Role.TECHNIKUS,
      });

      const req = createMockRequest({
        body: { role: Role.TECHNIKUS },
      });
      const res = createMockResponse();

      await controller.assignRole(targetUserId, req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.OK);
      const body = res.responseBody as { success: boolean; data: { newRole: string } };
      expect(body.success).toBe(true);
      expect(body.data.newRole).toBe(Role.TECHNIKUS);
    });

    it('should return 403 for role hierarchy violation (2.2 AC2)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(targetUser);

      const req = createMockRequest({
        body: { role: Role.SUPER_ADMIN }, // Cannot assign higher role
      });
      const res = createMockResponse();

      await controller.assignRole(targetUserId, req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.FORBIDDEN);
      expect((res.responseBody as Record<string, unknown>).error).toHaveProperty(
        'code',
        UserErrorCode.ROLE_HIERARCHY_VIOLATION
      );
    });

    it('should return 403 for self-assignment', async () => {
      const req = createMockRequest({
        body: { role: Role.TECHNIKUS },
      });
      const res = createMockResponse();

      await controller.assignRole(testCreatorId, req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    it('should return 404 for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest({
        body: { role: Role.TECHNIKUS },
      });
      const res = createMockResponse();

      await controller.assignRole(nonExistentId, req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('should return 400 for invalid role (2.2 AC8 - Zod validation)', async () => {
      const req = createMockRequest({
        body: { role: 'INVALID_ROLE' },
      });
      const res = createMockResponse();

      await controller.assignRole(targetUserId, req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect((res.responseBody as Record<string, unknown>).error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 for same role assignment', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(targetUser);

      const req = createMockRequest({
        body: { role: Role.OPERATOR }, // Same as current role
      });
      const res = createMockResponse();

      await controller.assignRole(targetUserId, req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should include reason in response when provided', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(targetUser);
      mockPrisma.user.update.mockResolvedValue({
        ...targetUser,
        role: Role.TECHNIKUS,
      });

      const req = createMockRequest({
        body: { role: Role.TECHNIKUS, reason: 'Promotion due to training completion' },
      });
      const res = createMockResponse();

      await controller.assignRole(targetUserId, req.body, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.OK);
      const body = res.responseBody as { data: { reason: string } };
      expect(body.data.reason).toBe('Promotion due to training completion');
    });
  });

  // ============================================
  // Story 2.2: GET /api/v1/users/:id/permissions - Get Permissions
  // ============================================

  describe('GET /api/v1/users/:id/permissions - Get Permissions (Story 2.2)', () => {
    it('should return permissions for user (2.2 AC3)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUser);

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.getUserPermissions(testUserId, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.OK);
      const body = res.responseBody as { data: { userId: string; role: string; permissions: string[] } };
      expect(body.data.userId).toBe(testUserId);
      expect(body.data.role).toBe(Role.OPERATOR);
      expect(body.data.permissions).toContain('rental:view');
    });

    it('should return inherited permissions for BOLTVEZETO (2.2 AC4)', async () => {
      const boltvezetoUser = {
        ...testUser,
        role: Role.BOLTVEZETO,
      };
      mockPrisma.user.findFirst.mockResolvedValue(boltvezetoUser);

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.getUserPermissions(testUserId, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.OK);
      const body = res.responseBody as { data: { inheritedFrom: string[]; permissions: string[] } };
      // Should have inherited roles
      expect(body.data.inheritedFrom).toContain(Role.TECHNIKUS);
      expect(body.data.inheritedFrom).toContain(Role.OPERATOR);
      // Should have inherited permissions
      expect(body.data.permissions).toContain('service:warranty'); // from TECHNIKUS
      expect(body.data.permissions).toContain('rental:view'); // from OPERATOR
    });

    it('should include constraints in response', async () => {
      const boltvezetoUser = {
        ...testUser,
        role: Role.BOLTVEZETO,
      };
      mockPrisma.user.findFirst.mockResolvedValue(boltvezetoUser);

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.getUserPermissions(testUserId, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.OK);
      const body = res.responseBody as { data: { constraints: Record<string, Record<string, number>> } };
      expect(body.data.constraints['rental:discount']).toEqual({ discount_limit: 20 });
    });

    it('should return 404 for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.getUserPermissions(nonExistentId, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('should return correct scope for different roles', async () => {
      const partnerOwner = {
        ...testUser,
        role: Role.PARTNER_OWNER,
      };
      mockPrisma.user.findFirst.mockResolvedValue(partnerOwner);

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.getUserPermissions(testUserId, req as never, res as never);

      expect(res.statusCode).toBe(HttpStatus.OK);
      const body = res.responseBody as { data: { scope: string; level: number } };
      expect(body.data.scope).toBe('TENANT');
      expect(body.data.level).toBe(4);
    });
  });
});
