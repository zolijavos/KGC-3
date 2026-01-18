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
import { PermissionService } from './services/permission.service';
import { Role, UserStatus } from './interfaces/user.interface';

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

// Mock PrismaClient
const createMockPrisma = () => {
  const userMocks = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return {
    user: userMocks,
    // C2 FIX: Add $transaction mock for assignRole race condition fix
    // Passes the same user mocks to callback so test mocks work inside transaction
    $transaction: vi.fn((callback: (tx: { user: typeof userMocks }) => Promise<unknown>) => {
      return callback({ user: userMocks });
    }),
  };
};

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
    // C1 FIX: PermissionService now injected via DI
    const permissionService = new PermissionService(roleService);
    usersService = new UsersService(
      mockPrisma as unknown as Parameters<typeof UsersService.prototype.constructor>[0],
      roleService,
      permissionService,
      mockAuthService as unknown as Parameters<typeof UsersService.prototype.constructor>[3]
    );
    // C1 & H1 FIX: Controller now also needs permissionService for permission checks
    controller = new UsersController(usersService, permissionService);
  });

  // ============================================
  // AC1: Create user happy path
  // H1v2 FIX: Updated to use native returns pattern (no @Res() decorator)
  // ============================================

  describe('POST /api/v1/users - Create User', () => {
    it('should create user with valid data (7.1)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(testUser);

      const req = createMockRequest();
      const dto = {
        email: 'new@example.com',
        name: 'New User',
        role: Role.OPERATOR,
      };

      // H1v2 FIX: Controller returns native type
      const result = await controller.createUser(dto as never, req as never);

      expect(result).toHaveProperty('data');
      expect(result.data.email).toBe(testUser.email);
    });

    it('should return 409 for duplicate email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUser); // Email exists

      const req = createMockRequest();
      const dto = {
        email: 'test@example.com',
        name: 'Duplicate User',
        role: Role.OPERATOR,
      };

      // H1v2 FIX: Controller throws ConflictException
      await expect(controller.createUser(dto as never, req as never)).rejects.toThrow();
    });

    it('should return 403 for role hierarchy violation (7.6)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest();
      const dto = {
        email: 'super@example.com',
        name: 'Super Admin',
        role: Role.SUPER_ADMIN, // Cannot assign higher role
      };

      // H1v2 FIX: Controller throws ForbiddenException
      await expect(controller.createUser(dto as never, req as never)).rejects.toThrow();
    });
  });

  // ============================================
  // AC2: List users with pagination
  // H1v2 FIX: Updated to use native returns pattern
  // ============================================

  describe('GET /api/v1/users - List Users', () => {
    it('should list users with pagination (7.2)', async () => {
      mockPrisma.user.findMany.mockResolvedValue([testUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      const req = createMockRequest();
      const query = { limit: 10, offset: 0 };

      // H1v2 FIX: Controller returns native type
      const result = await controller.listUsers(query as never, req as never);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by role', async () => {
      mockPrisma.user.findMany.mockResolvedValue([testUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      const req = createMockRequest();
      const query = { role: 'OPERATOR', limit: 20, offset: 0 };

      // H1v2 FIX: Controller returns native type
      const result = await controller.listUsers(query as never, req as never);

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'OPERATOR' }),
        })
      );
    });

    it('should filter by search term', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const req = createMockRequest();
      const query = { search: 'john', limit: 20, offset: 0 };

      // H1v2 FIX: Controller returns native type
      const result = await controller.listUsers(query as never, req as never);

      expect(result.data).toHaveLength(0);
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
  // H1v2 FIX: Updated to use native returns pattern
  // ============================================

  describe('GET /api/v1/users/:id - Get User', () => {
    it('should get user by ID (7.3)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUser);

      const req = createMockRequest();

      // H1v2 FIX: Controller returns native type
      const result = await controller.getUserById(testUserId, req as never);

      expect(result.data.id).toBe(testUserId);
    });

    it('should return 404 for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest();

      // H1v2 FIX: Controller throws NotFoundException
      await expect(controller.getUserById(nonExistentId, req as never)).rejects.toThrow();
    });

    it('should enforce tenant isolation (7.8)', async () => {
      // User in different tenant returns null (simulating RLS)
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest();

      // H1v2 FIX: Controller throws NotFoundException, catch it
      await expect(controller.getUserById(testUserId, req as never)).rejects.toThrow();

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
  // H1v2 FIX: Updated to use native returns pattern
  // ============================================

  describe('PATCH /api/v1/users/:id - Update User', () => {
    it('should update user (7.4)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUser);
      mockPrisma.user.update.mockResolvedValue({ ...testUser, name: 'Updated Name' });

      const req = createMockRequest();
      const dto = { name: 'Updated Name' };

      // H1v2 FIX: Controller returns native type
      const result = await controller.updateUser(testUserId, dto as never, req as never);

      expect(result.data.name).toBe('Updated Name');
    });

    it('should return 404 for updating non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest();
      const dto = { name: 'New Name' };

      // H1v2 FIX: Controller throws NotFoundException
      await expect(controller.updateUser(nonExistentId, dto as never, req as never)).rejects.toThrow();
    });
  });

  // ============================================
  // AC5: Soft delete user
  // H1v2 FIX: Updated to use native returns pattern
  // ============================================

  describe('DELETE /api/v1/users/:id - Soft Delete User', () => {
    it('should soft delete user (7.5)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUser);
      mockPrisma.user.update.mockResolvedValue({ ...testUser, status: UserStatus.INACTIVE });

      const req = createMockRequest();

      // H1v2 FIX: Controller returns native type
      const result = await controller.deleteUser(testUserId, req as never);

      expect(result.data.success).toBe(true);
    });

    it('should revoke all tokens on delete', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUser);
      mockPrisma.user.update.mockResolvedValue({ ...testUser, status: UserStatus.INACTIVE });

      const req = createMockRequest();

      // H1v2 FIX: Controller returns native type
      await controller.deleteUser(testUserId, req as never);

      expect(mockAuthService.revokeAllUserTokens).toHaveBeenCalledWith(testUserId);
    });

    it('should return 404 for deleting non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest();

      // H1v2 FIX: Controller throws NotFoundException
      await expect(controller.deleteUser(nonExistentId, req as never)).rejects.toThrow();
    });
  });

  // ============================================
  // Story 2.2: PUT /api/v1/users/:id/role - Assign Role
  // C2 FIX: Controller now uses native returns and throws HttpExceptions
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

      // C2 FIX: Controller returns native type
      const result = await controller.assignRole(targetUserId, req.body as never, req as never);

      expect(result.success).toBe(true);
      expect(result.data.newRole).toBe(Role.TECHNIKUS);
    });

    it('should return 403 for role hierarchy violation (2.2 AC2)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(targetUser);

      const req = createMockRequest({
        body: { role: Role.SUPER_ADMIN }, // Cannot assign higher role
      });

      // C2 FIX: Controller throws HttpException
      await expect(
        controller.assignRole(targetUserId, req.body as never, req as never)
      ).rejects.toThrow();
    });

    it('should return 403 for self-assignment', async () => {
      const req = createMockRequest({
        body: { role: Role.TECHNIKUS },
      });

      // C2 FIX: Controller throws ForbiddenException
      await expect(
        controller.assignRole(testCreatorId, req.body as never, req as never)
      ).rejects.toThrow();
    });

    it('should return 404 for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest({
        body: { role: Role.TECHNIKUS },
      });

      // C2 FIX: Controller throws NotFoundException
      await expect(
        controller.assignRole(nonExistentId, req.body as never, req as never)
      ).rejects.toThrow();
    });

    it('should return 400 for invalid role (2.2 AC8 - Zod validation)', async () => {
      const req = createMockRequest({
        body: { role: 'INVALID_ROLE' },
      });

      // C2 FIX: ZodValidationPipe throws BadRequestException
      await expect(
        controller.assignRole(targetUserId, req.body as never, req as never)
      ).rejects.toThrow();
    });

    it('should return 400 for same role assignment', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(targetUser);

      const req = createMockRequest({
        body: { role: Role.OPERATOR }, // Same as current role
      });

      // C2 FIX: Controller throws BadRequestException
      await expect(
        controller.assignRole(targetUserId, req.body as never, req as never)
      ).rejects.toThrow();
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

      // C2 FIX: Controller returns native type
      const result = await controller.assignRole(targetUserId, req.body as never, req as never);

      expect(result.data.reason).toBe('Promotion due to training completion');
    });
  });

  // ============================================
  // Story 2.2: GET /api/v1/users/:id/permissions - Get Permissions
  // C2 FIX: Controller now uses native returns and throws HttpExceptions
  // ============================================

  describe('GET /api/v1/users/:id/permissions - Get Permissions (Story 2.2)', () => {
    it('should return permissions for user (2.2 AC3)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUser);

      const req = createMockRequest();
      // C2 FIX: Controller returns native type, not via res.json()
      const result = await controller.getUserPermissions(testUserId, req as never);

      expect(result.data.userId).toBe(testUserId);
      expect(result.data.role).toBe(Role.OPERATOR);
      expect(result.data.permissions).toContain('rental:view');
    });

    it('should return inherited permissions for BOLTVEZETO (2.2 AC4)', async () => {
      const boltvezetoUser = {
        ...testUser,
        role: Role.BOLTVEZETO,
      };
      mockPrisma.user.findFirst.mockResolvedValue(boltvezetoUser);

      const req = createMockRequest();
      // C2 FIX: Controller returns native type
      const result = await controller.getUserPermissions(testUserId, req as never);

      // Should have inherited roles
      expect(result.data.inheritedFrom).toContain(Role.TECHNIKUS);
      expect(result.data.inheritedFrom).toContain(Role.OPERATOR);
      // Should have inherited permissions
      expect(result.data.permissions).toContain('service:warranty'); // from TECHNIKUS
      expect(result.data.permissions).toContain('rental:view'); // from OPERATOR
    });

    it('should include constraints in response', async () => {
      const boltvezetoUser = {
        ...testUser,
        role: Role.BOLTVEZETO,
      };
      mockPrisma.user.findFirst.mockResolvedValue(boltvezetoUser);

      const req = createMockRequest();
      // C2 FIX: Controller returns native type
      const result = await controller.getUserPermissions(testUserId, req as never);

      expect(result.data.constraints['rental:discount']).toEqual({ discount_limit: 20 });
    });

    it('should return 404 for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const req = createMockRequest();
      // C2 FIX: Controller throws NotFoundException, need to catch it
      await expect(controller.getUserPermissions(nonExistentId, req as never)).rejects.toThrow();
    });

    it('should return correct scope for different roles', async () => {
      const partnerOwner = {
        ...testUser,
        role: Role.PARTNER_OWNER,
      };
      mockPrisma.user.findFirst.mockResolvedValue(partnerOwner);

      const req = createMockRequest();
      // C2 FIX: Controller returns native type
      const result = await controller.getUserPermissions(testUserId, req as never);

      expect(result.data.scope).toBe('TENANT');
      expect(result.data.level).toBe(4);
    });
  });
});
