/**
 * Users Service Tests - TDD Red-Green-Refactor
 * Story 2.1: User CRUD Operations
 *
 * Tests for:
 * - AC1: User Létrehozás
 * - AC2: User Listázás és Keresés
 * - AC3: User Részletek Lekérése
 * - AC4: User Módosítás
 * - AC5: User Soft Delete
 * - AC6: Role Hierarchy Enforcement
 * - AC8: Tenant Isolation
 *
 * Minimum 15 tests required per story.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @kgc/auth before importing service
vi.mock('@kgc/auth', () => ({
  AuthService: class MockAuthService {
    revokeAllUserTokens = vi.fn().mockResolvedValue(1);
  },
}));

// Mock bcrypt for PIN tests - Story 2.6
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

import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { UserQueryDto } from './dto/user-query.dto';
import { Permission } from './interfaces/permission.interface';
import { Role, UserStatus } from './interfaces/user.interface';
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';
import { UsersService } from './users.service';

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
    $transaction: vi.fn((callback: (tx: { user: typeof userMocks }) => Promise<unknown>) => {
      return callback({ user: userMocks });
    }),
  };
};

// Mock AuthService (for token revocation)
const createMockAuthService = () => ({
  revokeAllUserTokens: vi.fn().mockResolvedValue(1),
});

// Mock AuditService (for audit logging - Story 2.2 AC#7)
const createMockAuditService = () => ({
  log: vi.fn().mockResolvedValue(undefined),
});

// Mock PermissionService - C1 FIX: Now injected via DI
const _createMockPermissionService = () => ({
  getAllPermissions: vi.fn().mockReturnValue([Permission.USER_VIEW, Permission.USER_CREATE]),
  getDirectPermissions: vi.fn().mockReturnValue([Permission.USER_VIEW]),
  hasPermission: vi.fn().mockReturnValue(true),
  getConstraint: vi.fn().mockReturnValue(undefined),
});

describe('UsersService', () => {
  let usersService: UsersService;
  let usersServiceWithAudit: UsersService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockAuthService: ReturnType<typeof createMockAuthService>;
  let mockAuditService: ReturnType<typeof createMockAuditService>;
  let roleService: RoleService;
  let permissionService: PermissionService;

  const testTenantId = '00000000-0000-0000-0000-000000000001';
  const testUserId = '00000000-0000-0000-0000-000000000002';
  const testCreatorId = '00000000-0000-0000-0000-000000000003';

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    mockAuthService = createMockAuthService();
    mockAuditService = createMockAuditService();
    roleService = new RoleService();
    // C1 FIX: Use real PermissionService for accurate permission tests
    permissionService = new PermissionService(roleService);
    // Default bcrypt mock behavior - return realistic hash for hash(), true for compare()
    // bcrypt hash is ~60 chars: $2b$XX$ + 53 chars
    mockBcryptHash.mockResolvedValue('$2b$12$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP');
    mockBcryptCompare.mockResolvedValue(true);
    // C1 FIX: PermissionService now injected via DI (3rd parameter)
    usersService = new UsersService(
      mockPrisma as unknown as Parameters<typeof UsersService.prototype.constructor>[0],
      roleService,
      permissionService,
      mockAuthService as unknown as Parameters<typeof UsersService.prototype.constructor>[3]
    );
    // Service with audit for testing audit integration
    usersServiceWithAudit = new UsersService(
      mockPrisma as unknown as Parameters<typeof UsersService.prototype.constructor>[0],
      roleService,
      permissionService,
      mockAuthService as unknown as Parameters<typeof UsersService.prototype.constructor>[3],
      mockAuditService as unknown as Parameters<typeof UsersService.prototype.constructor>[4]
    );
  });

  // ============================================
  // createUser() tests - AC1
  // ============================================

  describe('createUser()', () => {
    const validCreateDto: CreateUserDto = {
      email: 'test@example.com',
      name: 'Test User',
      tenantId: testTenantId,
      role: Role.OPERATOR,
    };

    it('should create user with valid data (happy path)', async () => {
      const createdUser = {
        id: testUserId,
        ...validCreateDto,
        status: UserStatus.ACTIVE,
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(null); // Email not exists
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await usersService.createUser(
        validCreateDto,
        testCreatorId,
        Role.PARTNER_OWNER
      );

      expect(result).toBeDefined();
      expect(result.email).toBe(validCreateDto.email);
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should throw error for duplicate email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing', email: validCreateDto.email });

      await expect(
        usersService.createUser(validCreateDto, testCreatorId, Role.PARTNER_OWNER)
      ).rejects.toThrow('Ez az email cím már foglalt');
    });

    it('should throw error when creator role cannot assign target role (hierarchy violation)', async () => {
      const dtoWithHigherRole: CreateUserDto = {
        ...validCreateDto,
        role: Role.SUPER_ADMIN, // Higher than PARTNER_OWNER
      };
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        usersService.createUser(dtoWithHigherRole, testCreatorId, Role.PARTNER_OWNER)
      ).rejects.toThrow('Csak egyenlő vagy alacsonyabb szintű szerepkört rendelhet hozzá');
    });

    it('should generate temporary password when creating user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: testUserId,
        ...validCreateDto,
        status: UserStatus.ACTIVE,
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await usersService.createUser(
        validCreateDto,
        testCreatorId,
        Role.PARTNER_OWNER
      );

      expect(result).toBeDefined();
      // Check that password was hashed (bcrypt creates 60-char hash)
      const createCall = mockPrisma.user.create.mock.calls[0]?.[0];
      expect(createCall?.data?.passwordHash).toBeDefined();
      expect(createCall?.data?.passwordHash?.length).toBeGreaterThan(30);
    });

    it('should normalize email to lowercase', async () => {
      const dtoWithUpperEmail: CreateUserDto = {
        ...validCreateDto,
        email: 'TEST@EXAMPLE.COM',
      };
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: testUserId,
        ...dtoWithUpperEmail,
        email: 'test@example.com',
        status: UserStatus.ACTIVE,
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await usersService.createUser(dtoWithUpperEmail, testCreatorId, Role.PARTNER_OWNER);

      const createCall = mockPrisma.user.create.mock.calls[0]?.[0];
      expect(createCall?.data?.email).toBe('test@example.com');
    });
  });

  // ============================================
  // findAll() tests - AC2
  // ============================================

  describe('findAll()', () => {
    const queryDto: UserQueryDto = {
      limit: 20,
      offset: 0,
    };

    it('should return paginated user list', async () => {
      const users = [
        {
          id: '1',
          email: 'a@test.com',
          name: 'User A',
          role: Role.OPERATOR,
          tenantId: testTenantId,
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          email: 'b@test.com',
          name: 'User B',
          role: Role.TECHNIKUS,
          tenantId: testTenantId,
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await usersService.findAll(queryDto, testTenantId);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.offset).toBe(0);
    });

    it('should filter by search term (email or name)', async () => {
      const searchQuery: UserQueryDto = { ...queryDto, search: 'john' };
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await usersService.findAll(searchQuery, testTenantId);

      const findCall = mockPrisma.user.findMany.mock.calls[0]?.[0];
      expect(findCall?.where?.OR).toBeDefined();
    });

    it('should filter by role', async () => {
      const roleQuery: UserQueryDto = { ...queryDto, role: Role.OPERATOR };
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await usersService.findAll(roleQuery, testTenantId);

      const findCall = mockPrisma.user.findMany.mock.calls[0]?.[0];
      expect(findCall?.where?.role).toBe(Role.OPERATOR);
    });

    it('should filter by status', async () => {
      const statusQuery: UserQueryDto = { ...queryDto, status: UserStatus.ACTIVE };
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await usersService.findAll(statusQuery, testTenantId);

      const findCall = mockPrisma.user.findMany.mock.calls[0]?.[0];
      expect(findCall?.where?.status).toBe(UserStatus.ACTIVE);
    });

    it('should enforce tenant isolation (RLS)', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await usersService.findAll(queryDto, testTenantId);

      const findCall = mockPrisma.user.findMany.mock.calls[0]?.[0];
      expect(findCall?.where?.tenantId).toBe(testTenantId);
    });
  });

  // ============================================
  // findById() tests - AC3
  // ============================================

  describe('findById()', () => {
    it('should return user when exists in same tenant', async () => {
      const user = {
        id: testUserId,
        email: 'test@example.com',
        name: 'Test User',
        role: Role.OPERATOR,
        tenantId: testTenantId,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(user);

      const result = await usersService.findById(testUserId, testTenantId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testUserId);
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await usersService.findById('non-existent-id', testTenantId);

      expect(result).toBeNull();
    });

    it('should return null for user in different tenant (tenant isolation)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null); // Simulates tenant isolation

      const result = await usersService.findById(testUserId, 'different-tenant');

      expect(result).toBeNull();
      const findCall = mockPrisma.user.findFirst.mock.calls[0]?.[0];
      expect(findCall?.where?.tenantId).toBe('different-tenant');
    });
  });

  // ============================================
  // updateUser() tests - AC4
  // ============================================

  describe('updateUser()', () => {
    const updateDto: UpdateUserDto = {
      name: 'Updated Name',
    };

    it('should update user name', async () => {
      const existingUser = {
        id: testUserId,
        email: 'test@example.com',
        name: 'Original Name',
        role: Role.OPERATOR,
        tenantId: testTenantId,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({ ...existingUser, ...updateDto });

      const result = await usersService.updateUser(
        testUserId,
        updateDto,
        testCreatorId,
        Role.PARTNER_OWNER,
        testTenantId
      );

      expect(result.name).toBe('Updated Name');
    });

    it('should throw error when trying to update to higher role (hierarchy violation)', async () => {
      const existingUser = {
        id: testUserId,
        email: 'test@example.com',
        name: 'Test',
        role: Role.OPERATOR,
        tenantId: testTenantId,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);

      const higherRoleDto: UpdateUserDto = { role: Role.SUPER_ADMIN };

      await expect(
        usersService.updateUser(
          testUserId,
          higherRoleDto,
          testCreatorId,
          Role.PARTNER_OWNER,
          testTenantId
        )
      ).rejects.toThrow('Csak egyenlő vagy alacsonyabb szintű szerepkört rendelhet hozzá');
    });

    it('should allow role downgrade', async () => {
      const existingUser = {
        id: testUserId,
        email: 'test@example.com',
        name: 'Test',
        role: Role.BOLTVEZETO,
        tenantId: testTenantId,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({ ...existingUser, role: Role.OPERATOR });

      const downgradeDto: UpdateUserDto = { role: Role.OPERATOR };

      const result = await usersService.updateUser(
        testUserId,
        downgradeDto,
        testCreatorId,
        Role.PARTNER_OWNER,
        testTenantId
      );

      expect(result.role).toBe(Role.OPERATOR);
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        usersService.updateUser(
          testUserId,
          updateDto,
          testCreatorId,
          Role.PARTNER_OWNER,
          testTenantId
        )
      ).rejects.toThrow('Felhasználó nem található');
    });
  });

  // ============================================
  // softDeleteUser() tests - AC5
  // ============================================

  describe('softDeleteUser()', () => {
    it('should soft delete user (set status to INACTIVE)', async () => {
      const existingUser = {
        id: testUserId,
        email: 'test@example.com',
        name: 'Test',
        role: Role.OPERATOR,
        tenantId: testTenantId,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        status: UserStatus.INACTIVE,
        deletedAt: new Date(),
      });

      const result = await usersService.softDeleteUser(testUserId, testCreatorId, testTenantId);

      expect(result.data.success).toBe(true);
      const updateCall = mockPrisma.user.update.mock.calls[0]?.[0];
      expect(updateCall?.data?.status).toBe(UserStatus.INACTIVE);
    });

    it('should modify email with _deleted_TIMESTAMP suffix', async () => {
      const existingUser = {
        id: testUserId,
        email: 'test@example.com',
        name: 'Test',
        role: Role.OPERATOR,
        tenantId: testTenantId,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        email: 'test@example.com_deleted_1234567890',
        deletedEmail: 'test@example.com',
        status: UserStatus.INACTIVE,
      });

      await usersService.softDeleteUser(testUserId, testCreatorId, testTenantId);

      const updateCall = mockPrisma.user.update.mock.calls[0]?.[0];
      expect(updateCall?.data?.email).toContain('_deleted_');
      expect(updateCall?.data?.deletedEmail).toBe('test@example.com');
    });

    it('should revoke all refresh tokens on delete', async () => {
      const existingUser = {
        id: testUserId,
        email: 'test@example.com',
        name: 'Test',
        role: Role.OPERATOR,
        tenantId: testTenantId,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        status: UserStatus.INACTIVE,
      });

      await usersService.softDeleteUser(testUserId, testCreatorId, testTenantId);

      expect(mockAuthService.revokeAllUserTokens).toHaveBeenCalledWith(testUserId);
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        usersService.softDeleteUser(testUserId, testCreatorId, testTenantId)
      ).rejects.toThrow('Felhasználó nem található');
    });
  });

  // ============================================
  // assignRole() tests - Story 2.2: Role Assignment
  // ============================================

  describe('assignRole()', () => {
    const targetUserId = '00000000-0000-0000-0000-000000000004';
    const existingUser = {
      id: targetUserId,
      email: 'target@example.com',
      name: 'Target User',
      role: Role.OPERATOR,
      tenantId: testTenantId,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should assign role successfully (happy path)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        role: Role.TECHNIKUS,
      });

      const result = await usersService.assignRole(
        targetUserId,
        { role: Role.TECHNIKUS },
        testCreatorId,
        Role.PARTNER_OWNER,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.data.previousRole).toBe(Role.OPERATOR);
      expect(result.data.newRole).toBe(Role.TECHNIKUS);
      expect(result.data.userId).toBe(targetUserId);
      expect(result.data.assignedBy).toBe(testCreatorId);
    });

    it('should include reason in response when provided', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        role: Role.TECHNIKUS,
      });

      const result = await usersService.assignRole(
        targetUserId,
        { role: Role.TECHNIKUS, reason: 'Promotion due to training completion' },
        testCreatorId,
        Role.PARTNER_OWNER,
        testTenantId
      );

      expect(result.data.reason).toBe('Promotion due to training completion');
    });

    it('should throw error for self-assignment', async () => {
      await expect(
        usersService.assignRole(
          testCreatorId,
          { role: Role.TECHNIKUS },
          testCreatorId,
          Role.PARTNER_OWNER,
          testTenantId
        )
      ).rejects.toThrow('Saját szerepkör nem módosítható');
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        usersService.assignRole(
          targetUserId,
          { role: Role.TECHNIKUS },
          testCreatorId,
          Role.PARTNER_OWNER,
          testTenantId
        )
      ).rejects.toThrow('Felhasználó nem található');
    });

    it('should throw error when assigning same role', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);

      await expect(
        usersService.assignRole(
          targetUserId,
          { role: Role.OPERATOR },
          testCreatorId,
          Role.PARTNER_OWNER,
          testTenantId
        )
      ).rejects.toThrow('A felhasználónak már ez a szerepköre');
    });

    it('should throw error for role hierarchy violation', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);

      // BOLTVEZETO (level 3) cannot assign PARTNER_OWNER (level 4)
      await expect(
        usersService.assignRole(
          targetUserId,
          { role: Role.PARTNER_OWNER },
          testCreatorId,
          Role.BOLTVEZETO,
          testTenantId
        )
      ).rejects.toThrow('Nem rendelhet magasabb szintű szerepkört');
    });

    it('should allow PARTNER_OWNER to assign BOLTVEZETO', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        role: Role.BOLTVEZETO,
      });

      const result = await usersService.assignRole(
        targetUserId,
        { role: Role.BOLTVEZETO },
        testCreatorId,
        Role.PARTNER_OWNER,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.data.newRole).toBe(Role.BOLTVEZETO);
    });

    it('should allow SUPER_ADMIN to assign any role', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        role: Role.DEVOPS_ADMIN,
      });

      const result = await usersService.assignRole(
        targetUserId,
        { role: Role.DEVOPS_ADMIN },
        testCreatorId,
        Role.SUPER_ADMIN,
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.data.newRole).toBe(Role.DEVOPS_ADMIN);
    });

    // ============================================
    // Audit Integration tests - AC#7
    // ============================================

    it('should log ROLE_CHANGED to audit service on success', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        role: Role.TECHNIKUS,
      });

      await usersServiceWithAudit.assignRole(
        targetUserId,
        { role: Role.TECHNIKUS, reason: 'Promotion' },
        testCreatorId,
        Role.PARTNER_OWNER,
        testTenantId
      );

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ROLE_CHANGED',
          userId: testCreatorId,
          tenantId: testTenantId,
          resourceType: 'USER',
          resourceId: targetUserId,
          details: expect.objectContaining({
            previousRole: Role.OPERATOR,
            newRole: Role.TECHNIKUS,
            reason: 'Promotion',
          }),
        })
      );
    });

    it('should log ROLE_ASSIGNMENT_DENIED to audit service on hierarchy violation', async () => {
      // C2 FIX: Hierarchy check now happens BEFORE user lookup for faster fail
      // So previousRole is no longer included in audit log (not yet known)
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);

      await expect(
        usersServiceWithAudit.assignRole(
          targetUserId,
          { role: Role.PARTNER_OWNER },
          testCreatorId,
          Role.BOLTVEZETO,
          testTenantId
        )
      ).rejects.toThrow();

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ROLE_ASSIGNMENT_DENIED',
          userId: testCreatorId,
          tenantId: testTenantId,
          resourceType: 'USER',
          resourceId: targetUserId,
          details: expect.objectContaining({
            assignerRole: Role.BOLTVEZETO,
            attemptedRole: Role.PARTNER_OWNER,
            // C2 FIX: previousRole no longer available at this point
            reason: 'Role hierarchy violation',
          }),
        })
      );
    });

    it('should respect tenant isolation', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        usersService.assignRole(
          targetUserId,
          { role: Role.TECHNIKUS },
          testCreatorId,
          Role.PARTNER_OWNER,
          'different-tenant-id'
        )
      ).rejects.toThrow('Felhasználó nem található');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: targetUserId, tenantId: 'different-tenant-id' },
      });
    });
  });

  // ============================================
  // getUserPermissions() tests - Story 2.2: AC#3, AC#4
  // ============================================

  describe('getUserPermissions()', () => {
    const targetUserId = '00000000-0000-0000-0000-000000000005';

    it('should return permissions for OPERATOR', async () => {
      const user = {
        id: targetUserId,
        email: 'operator@example.com',
        name: 'Operator User',
        role: Role.OPERATOR,
        tenantId: testTenantId,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(user);

      const result = await usersService.getUserPermissions(targetUserId, testTenantId);

      expect(result.userId).toBe(targetUserId);
      expect(result.role).toBe(Role.OPERATOR);
      expect(result.level).toBe(1);
      expect(result.scope).toBe('LOCATION');
      expect(result.inheritedFrom).toEqual([]);
      expect(result.permissions).toContain('rental:view');
      expect(result.permissions).toContain('rental:create');
    });

    it('should return inherited permissions for BOLTVEZETO', async () => {
      const user = {
        id: targetUserId,
        email: 'boltvezeto@example.com',
        name: 'Boltvezeto User',
        role: Role.BOLTVEZETO,
        tenantId: testTenantId,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(user);

      const result = await usersService.getUserPermissions(targetUserId, testTenantId);

      expect(result.role).toBe(Role.BOLTVEZETO);
      expect(result.level).toBe(3);
      expect(result.scope).toBe('LOCATION');
      expect(result.inheritedFrom).toContain(Role.TECHNIKUS);
      expect(result.inheritedFrom).toContain(Role.OPERATOR);
      // Direct permissions
      expect(result.permissions).toContain('rental:discount');
      // Inherited permissions
      expect(result.permissions).toContain('rental:view');
      expect(result.permissions).toContain('service:warranty');
    });

    it('should include constraints for BOLTVEZETO', async () => {
      const user = {
        id: targetUserId,
        email: 'boltvezeto@example.com',
        name: 'Boltvezeto User',
        role: Role.BOLTVEZETO,
        tenantId: testTenantId,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(user);

      const result = await usersService.getUserPermissions(targetUserId, testTenantId);

      expect(result.constraints['rental:discount']).toEqual({ discount_limit: 20 });
    });

    it('should return GLOBAL scope for SUPER_ADMIN', async () => {
      const user = {
        id: targetUserId,
        email: 'admin@example.com',
        name: 'Super Admin',
        role: Role.SUPER_ADMIN,
        tenantId: testTenantId,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(user);

      const result = await usersService.getUserPermissions(targetUserId, testTenantId);

      expect(result.role).toBe(Role.SUPER_ADMIN);
      expect(result.level).toBe(8);
      expect(result.scope).toBe('GLOBAL');
      expect(result.permissions).toContain('admin:system');
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(usersService.getUserPermissions(targetUserId, testTenantId)).rejects.toThrow(
        'Felhasználó nem található'
      );
    });

    it('should respect tenant isolation', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        usersService.getUserPermissions(targetUserId, 'different-tenant-id')
      ).rejects.toThrow('Felhasználó nem található');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: targetUserId, tenantId: 'different-tenant-id' },
      });
    });
  });

  // ============================================
  // Story 2.6: User Profile Management
  // ============================================

  // ============================================
  // getProfile() tests - AC#1
  // ============================================

  describe('getProfile()', () => {
    const mockUser = {
      id: testUserId,
      email: 'profile@example.com',
      name: 'Profile User',
      role: Role.OPERATOR,
      tenantId: testTenantId,
      locationId: 'loc-123',
      phone: '+36 20 123 4567',
      avatarUrl: 'https://example.com/avatar.png',
      status: UserStatus.ACTIVE,
      passwordHash: '$2b$12$secrethash',
      pinHash: '$2b$10$pinhash',
      createdAt: new Date('2026-01-15T10:00:00Z'),
      updatedAt: new Date('2026-01-16T12:00:00Z'),
    };

    it('should return profile without sensitive fields (passwordHash, pinHash)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await usersService.getProfile(testUserId, testTenantId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testUserId);
      expect(result?.email).toBe('profile@example.com');
      expect(result?.phone).toBe('+36 20 123 4567');
      expect(result?.avatarUrl).toBe('https://example.com/avatar.png');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('pinHash');
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await usersService.getProfile('non-existent-id', testTenantId);

      expect(result).toBeNull();
    });

    it('should enforce tenant isolation (ADR-001 CRITICAL)', async () => {
      // User should not be found when tenantId doesn't match
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await usersService.getProfile(testUserId, 'different-tenant');

      expect(result).toBeNull();
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: testUserId,
          tenantId: 'different-tenant',
        },
      });
    });

    it('should handle null phone and avatarUrl', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        phone: null,
        avatarUrl: null,
      });

      const result = await usersService.getProfile(testUserId, testTenantId);

      expect(result?.phone).toBeNull();
      expect(result?.avatarUrl).toBeNull();
    });

    it('should handle undefined phone and avatarUrl (legacy data)', async () => {
      const userWithoutProfileFields = { ...mockUser };
      // @ts-expect-error - simulating legacy data without profile fields
      delete userWithoutProfileFields.phone;
      // @ts-expect-error - simulating legacy data without profile fields
      delete userWithoutProfileFields.avatarUrl;
      mockPrisma.user.findFirst.mockResolvedValue(userWithoutProfileFields);

      const result = await usersService.getProfile(testUserId, testTenantId);

      expect(result?.phone).toBeNull();
      expect(result?.avatarUrl).toBeNull();
    });
  });

  // ============================================
  // updateProfile() tests - AC#2
  // ============================================

  describe('updateProfile()', () => {
    const mockUser = {
      id: testUserId,
      email: 'profile@example.com',
      name: 'Original Name',
      role: Role.OPERATOR,
      tenantId: testTenantId,
      locationId: 'loc-123',
      phone: null,
      avatarUrl: null,
      status: UserStatus.ACTIVE,
      createdAt: new Date('2026-01-15T10:00:00Z'),
      updatedAt: new Date('2026-01-16T12:00:00Z'),
    };

    it('should update name only', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        name: 'New Name',
        updatedAt: new Date(),
      });

      const result = await usersServiceWithAudit.updateProfile(
        testUserId,
        { name: 'New Name' },
        testTenantId
      );

      expect(result.name).toBe('New Name');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: { name: 'New Name' },
      });
    });

    it('should update phone only', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        phone: '+36 30 987 6543',
        updatedAt: new Date(),
      });

      const result = await usersServiceWithAudit.updateProfile(
        testUserId,
        { phone: '+36 30 987 6543' },
        testTenantId
      );

      expect(result.phone).toBe('+36 30 987 6543');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: { phone: '+36 30 987 6543' },
      });
    });

    it('should update avatarUrl only', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        avatarUrl: 'https://cdn.example.com/new-avatar.jpg',
        updatedAt: new Date(),
      });

      const result = await usersServiceWithAudit.updateProfile(
        testUserId,
        {
          avatarUrl: 'https://cdn.example.com/new-avatar.jpg',
        },
        testTenantId
      );

      expect(result.avatarUrl).toBe('https://cdn.example.com/new-avatar.jpg');
    });

    it('should update multiple fields at once', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
        phone: '+36 70 111 2222',
        avatarUrl: 'https://example.com/avatar2.png',
        updatedAt: new Date(),
      });

      const result = await usersServiceWithAudit.updateProfile(
        testUserId,
        {
          name: 'Updated Name',
          phone: '+36 70 111 2222',
          avatarUrl: 'https://example.com/avatar2.png',
        },
        testTenantId
      );

      expect(result.name).toBe('Updated Name');
      expect(result.phone).toBe('+36 70 111 2222');
      expect(result.avatarUrl).toBe('https://example.com/avatar2.png');
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        usersService.updateProfile('non-existent-id', { name: 'New Name' }, testTenantId)
      ).rejects.toThrow('Felhasználó nem található');
    });

    it('should enforce tenant isolation (ADR-001 CRITICAL)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        usersService.updateProfile(testUserId, { name: 'Hacked' }, 'different-tenant')
      ).rejects.toThrow('Felhasználó nem található');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: testUserId,
          tenantId: 'different-tenant',
        },
      });
    });

    it('should return current profile when no updates provided', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await usersService.updateProfile(testUserId, {}, testTenantId);

      expect(result.name).toBe('Original Name');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should call audit service when updating profile', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        name: 'Audited Name',
        updatedAt: new Date(),
      });

      await usersServiceWithAudit.updateProfile(testUserId, { name: 'Audited Name' }, testTenantId);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_PROFILE_UPDATED',
          userId: testUserId,
        })
      );
    });

    it('should set phone to null when empty string provided', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        phone: '+36 20 123 4567',
      });
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        phone: null,
        updatedAt: new Date(),
      });

      const result = await usersService.updateProfile(testUserId, { phone: null }, testTenantId);

      expect(result.phone).toBeNull();
    });
  });

  // ============================================
  // updatePin() tests - AC#4
  // ============================================

  describe('updatePin()', () => {
    const mockUserWithPin = {
      id: testUserId,
      tenantId: testTenantId,
      pinHash: '$2b$10$validpinhash', // Mocked
      passwordHash: '$2b$12$validpasswordhash', // For first PIN setup
    };

    it('should update PIN successfully with correct current PIN', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUserWithPin);
      mockPrisma.user.update.mockResolvedValue({ ...mockUserWithPin });
      mockBcryptCompare.mockResolvedValue(true);

      const result = await usersServiceWithAudit.updatePin(
        testUserId,
        '1234',
        '5678',
        testTenantId
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('PIN sikeresen módosítva');
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should throw error for incorrect current PIN', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUserWithPin);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(
        usersService.updatePin(testUserId, 'wrongpin', '5678', testTenantId)
      ).rejects.toThrow('Érvénytelen jelenlegi PIN kód');
    });

    it('should log failed PIN attempt to audit (SECURITY)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUserWithPin);
      mockBcryptCompare.mockResolvedValue(false);

      await expect(
        usersServiceWithAudit.updatePin(testUserId, 'wrongpin', '5678', testTenantId)
      ).rejects.toThrow();

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_PIN_FAILED',
          userId: testUserId,
          details: expect.objectContaining({
            reason: 'Invalid current PIN',
          }),
        })
      );
    });

    it('should throw error for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        usersService.updatePin('non-existent-id', '1234', '5678', testTenantId)
      ).rejects.toThrow('Felhasználó nem található');
    });

    it('should enforce tenant isolation (ADR-001 CRITICAL)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        usersService.updatePin(testUserId, '1234', '5678', 'different-tenant')
      ).rejects.toThrow('Felhasználó nem található');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: testUserId,
          tenantId: 'different-tenant',
        },
        select: expect.objectContaining({
          id: true,
          tenantId: true,
          pinHash: true,
          passwordHash: true,
        }),
      });
    });

    // SECURITY FIX: First PIN setup now requires password verification
    it('should require password for first PIN setup (SECURITY)', async () => {
      const userWithoutPin = {
        id: testUserId,
        tenantId: testTenantId,
        pinHash: null,
        passwordHash: '$2b$12$validpasswordhash',
      };
      mockPrisma.user.findFirst.mockResolvedValue(userWithoutPin);

      // Without password - should fail
      await expect(usersService.updatePin(testUserId, '', '1234', testTenantId)).rejects.toThrow(
        'A jelszó megadása kötelező az első PIN beállításához'
      );
    });

    it('should allow first PIN setup with valid password', async () => {
      const userWithoutPin = {
        id: testUserId,
        tenantId: testTenantId,
        pinHash: null,
        passwordHash: '$2b$12$validpasswordhash',
      };
      mockPrisma.user.findFirst.mockResolvedValue(userWithoutPin);
      mockPrisma.user.update.mockResolvedValue({ ...userWithoutPin, pinHash: 'newhash' });
      mockBcryptCompare.mockResolvedValue(true); // Password verification

      const result = await usersService.updatePin(
        testUserId,
        '',
        '1234',
        testTenantId,
        'validpassword'
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should reject first PIN setup with invalid password', async () => {
      const userWithoutPin = {
        id: testUserId,
        tenantId: testTenantId,
        pinHash: null,
        passwordHash: '$2b$12$validpasswordhash',
      };
      mockPrisma.user.findFirst.mockResolvedValue(userWithoutPin);
      mockBcryptCompare.mockResolvedValue(false); // Invalid password

      await expect(
        usersService.updatePin(testUserId, '', '1234', testTenantId, 'wrongpassword')
      ).rejects.toThrow('Érvénytelen jelszó');
    });

    it('should call audit service when updating PIN', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUserWithPin);
      mockPrisma.user.update.mockResolvedValue({ ...mockUserWithPin });
      mockBcryptCompare.mockResolvedValue(true);

      await usersServiceWithAudit.updatePin(testUserId, '1234', '5678', testTenantId);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_PIN_CHANGED',
          userId: testUserId,
          details: expect.objectContaining({
            pinChanged: true,
          }),
        })
      );
      // Ensure PIN values are NOT logged
      expect(mockAuditService.log).not.toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            currentPin: expect.anything(),
            newPin: expect.anything(),
          }),
        })
      );
    });
  });

  // ============================================
  // generateTemporaryPassword() tests
  // H4 FIX: Now uses hex encoding for full entropy
  // L2 FIX: Now private, use type assertion for testing
  // ============================================

  describe('generateTemporaryPassword()', () => {
    // L2 FIX: Access private method via type assertion for testing
    const callGeneratePassword = () =>
      (
        usersService as unknown as { generateTemporaryPassword: () => string }
      ).generateTemporaryPassword();

    it('should generate password of correct length (H4 FIX: 32 hex chars = 128 bits entropy)', () => {
      const password = callGeneratePassword();
      // H4 FIX: hex encoding of 16 bytes = 32 characters
      expect(password.length).toBe(32);
    });

    it('should generate unique passwords', () => {
      const password1 = callGeneratePassword();
      const password2 = callGeneratePassword();
      expect(password1).not.toBe(password2);
    });

    it('should generate valid hex string (H4 FIX: full entropy)', () => {
      const password = callGeneratePassword();
      // H4 FIX: Should be valid hex (only 0-9 and a-f)
      expect(password).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate cryptographically strong password with full entropy', () => {
      // H4 FIX: Hex encoding preserves full entropy (no slicing)
      // 16 bytes = 32 hex chars = 128 bits of entropy
      const passwords = Array.from({ length: 10 }, () => callGeneratePassword());
      // All passwords should be valid hex and 32 chars
      expect(passwords.every(p => p.length === 32 && /^[0-9a-f]+$/.test(p))).toBe(true);
    });
  });
});
