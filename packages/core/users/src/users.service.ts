/**
 * Users Service - Business logic for user CRUD operations
 * Story 2.1: User CRUD Operations
 *
 * Implements:
 * - AC1: User Létrehozás
 * - AC2: User Listázás és Keresés
 * - AC3: User Részletek Lekérése
 * - AC4: User Módosítás
 * - AC5: User Soft Delete
 * - AC6: Role Hierarchy Enforcement
 * - AC8: Tenant Isolation
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';

/**
 * Interface for AuthService token revocation capability
 * (local definition to avoid circular dependency issues)
 */
interface IAuthService {
  revokeAllUserTokens(userId: string): Promise<void>;
}
import { Role, UserStatus, UserListResponse, DeleteUserResponse, UserResponse } from './interfaces/user.interface';
import { Permission, UserPermissionsResponse } from './interfaces/permission.interface';
import { IAuditService, AUDIT_SERVICE, AuditAction } from './interfaces/audit.interface';
import { IEmailService, EMAIL_SERVICE } from './interfaces/email.interface';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { UserQueryDto } from './dto/user-query.dto';
import { formatUserResponse, USER_MESSAGES } from './dto/user-response.dto';
import type { AssignRoleInput, AssignRoleResponse } from './dto/assign-role.dto';
import { ROLE_ASSIGNMENT_MESSAGES } from './dto/assign-role.dto';
import { formatProfileResponse, ProfileResponseDto, PROFILE_MESSAGES } from './dto/profile-response.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { UpdatePinResponse } from './dto/update-pin.dto';

/** bcrypt salt rounds for password hashing */
const BCRYPT_SALT_ROUNDS = 12;

/** bcrypt salt rounds for PIN hashing (slightly lower for faster PIN operations) */
const BCRYPT_PIN_SALT_ROUNDS = 10;

/** Minimum temporary password length */
const TEMP_PASSWORD_LENGTH = 16;

@Injectable()
export class UsersService {
  constructor(
    @Inject('PRISMA_CLIENT') @Optional() private readonly prisma: PrismaClient | null,
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService, // C1 FIX: Now injected via DI
    @Optional() private readonly authService?: IAuthService | null,
    @Optional() @Inject(AUDIT_SERVICE) private readonly auditService?: IAuditService | null,
    @Optional() @Inject(EMAIL_SERVICE) private readonly emailService?: IEmailService | null
  ) {}

  /**
   * Create a new user
   * AC1: User Létrehozás
   * AC6: Role Hierarchy Enforcement
   *
   * @param dto - Create user data
   * @param creatorId - ID of the user creating the new user
   * @param creatorRole - Role of the user creating the new user
   * @returns Created user response
   * @throws Error if email exists or role hierarchy violation
   */
  async createUser(
    dto: CreateUserDto,
    creatorId: string,
    creatorRole: Role
  ): Promise<UserResponse> {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Database not available'); // M2 FIX: Consistent error
    }

    // Validate required tenantId
    if (!dto.tenantId) {
      throw new BadRequestException('tenantId is required'); // H1 FIX: HttpException
    }
    const tenantId = dto.tenantId;

    // Normalize email to lowercase (M4 fix from Epic 1)
    const normalizedEmail = dto.email.toLowerCase();

    // Check if email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException(USER_MESSAGES.EMAIL_EXISTS); // H1 FIX: HttpException
    }

    // AC6: Check role hierarchy - creator can only assign roles at equal or lower level
    const targetRole = dto.role ?? Role.OPERATOR;
    if (!this.roleService.canAssignRole(creatorRole, targetRole)) {
      // AC6: Audit log for denied action
      if (this.auditService) {
        await this.auditService.log({
          action: AuditAction.ROLE_ASSIGNMENT_DENIED,
          userId: creatorId,
          tenantId,
          details: {
            creatorRole,
            attemptedRole: targetRole,
            reason: 'Role hierarchy violation',
          },
        });
      }
      throw new ForbiddenException(USER_MESSAGES.ROLE_VIOLATION); // H1 FIX: HttpException
    }

    // Generate temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: dto.name,
        passwordHash,
        role: targetRole,
        tenantId,
        locationId: dto.locationId ?? null,
        status: dto.status ?? UserStatus.ACTIVE,
      },
    });

    // AC1: Send welcome email with temporary password
    if (this.emailService) {
      await this.emailService.sendWelcomeEmail({
        recipientEmail: user.email,
        recipientName: user.name,
        temporaryPassword,
      });
    }

    return formatUserResponse(user);
  }

  /**
   * Find all users with pagination, search, and filters
   * AC2: User Listázás és Keresés
   * AC8: Tenant Isolation
   *
   * NOTE: By default, excludes soft-deleted users (status=INACTIVE with deletedAt set).
   * To include deleted users, explicitly filter by status=INACTIVE.
   *
   * @param query - Query parameters (pagination, search, filters)
   * @param tenantId - Tenant ID for isolation
   * @returns Paginated user list
   */
  async findAll(query: UserQueryDto, tenantId: string): Promise<UserListResponse> {
    // C3 FIX: Throw ServiceUnavailableException instead of silent fail
    if (!this.prisma) {
      throw new ServiceUnavailableException('Database not available');
    }

    // Build where clause with tenant isolation (AC8)
    const where: Record<string, unknown> = {
      tenantId,
      // Exclude soft-deleted users by default (deletedAt is set for deleted users)
      deletedAt: null,
    };

    // Search filter (case-insensitive on email or name)
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Role filter
    if (query.role) {
      where.role = query.role;
    }

    // Status filter - if explicitly filtering by INACTIVE, include deleted users
    if (query.status) {
      where.status = query.status;
      // Allow viewing deleted users when explicitly filtering by INACTIVE
      if (query.status === UserStatus.INACTIVE) {
        delete where.deletedAt;
      }
    }

    // Location filter
    if (query.locationId) {
      where.locationId = query.locationId;
    }

    // Execute queries in parallel for performance
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: query.offset,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenantId: true,
          locationId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map(formatUserResponse),
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    };
  }

  /**
   * Find user by ID
   * AC3: User Részletek Lekérése
   * AC8: Tenant Isolation
   *
   * @param id - User ID
   * @param tenantId - Tenant ID for isolation
   * @returns User or null if not found
   */
  async findById(id: string, tenantId: string): Promise<UserResponse | null> {
    // C3 FIX: Throw ServiceUnavailableException instead of silent fail
    if (!this.prisma) {
      throw new ServiceUnavailableException('Database not available');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId, // AC8: Tenant isolation
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        locationId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return null;
    }

    return formatUserResponse(user);
  }

  /**
   * Update user
   * AC4: User Módosítás
   * AC6: Role Hierarchy Enforcement
   *
   * @param id - User ID
   * @param dto - Update data
   * @param updaterId - ID of the user making the update
   * @param updaterRole - Role of the user making the update
   * @param tenantId - Tenant ID for isolation
   * @returns Updated user response
   * @throws Error if not found or role hierarchy violation
   */
  async updateUser(
    id: string,
    dto: UpdateUserDto,
    _updaterId: string,
    updaterRole: Role,
    tenantId: string
  ): Promise<UserResponse> {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Database not available'); // M2 FIX
    }

    // Find existing user (with tenant isolation)
    const existingUser = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!existingUser) {
      throw new NotFoundException(USER_MESSAGES.NOT_FOUND); // H1 FIX
    }

    // AC6: Check role hierarchy if role is being changed
    if (dto.role && !this.roleService.canAssignRole(updaterRole, dto.role)) {
      throw new ForbiddenException(USER_MESSAGES.ROLE_VIOLATION); // H1 FIX
    }

    // Build update data (only include provided fields)
    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.locationId !== undefined) updateData.locationId = dto.locationId;
    if (dto.status !== undefined) updateData.status = dto.status;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return formatUserResponse(updatedUser);
  }

  /**
   * Soft delete user
   * AC5: User Soft Delete
   *
   * @param id - User ID
   * @param deleterId - ID of the user performing the delete
   * @param tenantId - Tenant ID for isolation
   * @returns Delete response
   * @throws Error if not found
   */
  async softDeleteUser(
    id: string,
    _deleterId: string,
    tenantId: string
  ): Promise<DeleteUserResponse> {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Database not available'); // M2 FIX
    }

    // Find existing user (with tenant isolation)
    const existingUser = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!existingUser) {
      throw new NotFoundException(USER_MESSAGES.NOT_FOUND); // H1 FIX
    }

    const now = new Date();
    const timestamp = now.getTime();

    // Update user: set status to INACTIVE, modify email, set deletedAt
    await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.INACTIVE,
        deletedAt: now,
        deletedEmail: existingUser.email, // Store original email
        email: `${existingUser.email}_deleted_${timestamp}`, // Free up unique constraint
      },
    });

    // Revoke all refresh tokens (AC5)
    if (this.authService) {
      await this.authService.revokeAllUserTokens(id);
    }

    return {
      data: {
        success: true,
        message: USER_MESSAGES.DELETED,
      },
    };
  }

  /**
   * Assign role to user
   * Story 2.2: Role Assignment és RBAC
   * AC#1: PUT /users/:id/role endpoint
   * AC#2: Role hierarchy validation
   *
   * C2 SECURITY FIX: Uses Prisma $transaction to prevent race conditions
   * where concurrent requests could bypass validations
   *
   * @param targetUserId - ID of the user to assign role to
   * @param dto - Role assignment data
   * @param assignerId - ID of the user making the assignment
   * @param assignerRole - Role of the user making the assignment
   * @param tenantId - Tenant ID for isolation
   * @returns Role assignment response
   * @throws Error if not found, hierarchy violation, or self-assignment
   */
  async assignRole(
    targetUserId: string,
    dto: AssignRoleInput,
    assignerId: string,
    assignerRole: Role,
    tenantId: string
  ): Promise<AssignRoleResponse> {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Database not available'); // M2 FIX
    }

    // Check for self-assignment (before transaction - fast fail)
    if (targetUserId === assignerId) {
      throw new ForbiddenException(ROLE_ASSIGNMENT_MESSAGES.SELF_ASSIGNMENT); // H1 FIX
    }

    // AC#2: Check role hierarchy - assigner can only assign roles at equal or lower level
    // (before transaction - fast fail, doesn't depend on DB state)
    if (!this.roleService.canAssignRole(assignerRole, dto.role)) {
      // Audit log for denied action (outside transaction OK - fire-and-forget)
      if (this.auditService) {
        await this.auditService.log({
          action: AuditAction.ROLE_ASSIGNMENT_DENIED,
          userId: assignerId,
          tenantId,
          resourceType: 'USER',
          resourceId: targetUserId,
          details: {
            assignerRole,
            attemptedRole: dto.role,
            reason: 'Role hierarchy violation',
          },
        });
      }
      throw new ForbiddenException(ROLE_ASSIGNMENT_MESSAGES.HIERARCHY_VIOLATION); // H1 FIX
    }

    const now = new Date();

    // C2 SECURITY FIX: Use transaction for atomic read-check-write
    // This prevents race conditions where two concurrent requests could both pass validations
    const result = await this.prisma.$transaction(async (tx) => {
      // Find target user (with tenant isolation) - inside transaction for consistency
      const targetUser = await tx.user.findFirst({
        where: { id: targetUserId, tenantId },
      });

      if (!targetUser) {
        throw new NotFoundException(ROLE_ASSIGNMENT_MESSAGES.USER_NOT_FOUND);
      }

      // Check if same role (inside transaction to prevent TOCTOU race)
      if (targetUser.role === dto.role) {
        throw new BadRequestException(ROLE_ASSIGNMENT_MESSAGES.SAME_ROLE);
      }

      const previousRole = targetUser.role as Role;

      // Update user's role atomically
      await tx.user.update({
        where: { id: targetUserId },
        data: { role: dto.role },
      });

      return { previousRole };
    });

    // AC#7: Audit log for successful assignment (outside transaction - non-critical)
    if (this.auditService) {
      await this.auditService.log({
        action: AuditAction.ROLE_CHANGED,
        userId: assignerId,
        tenantId,
        resourceType: 'USER',
        resourceId: targetUserId,
        details: {
          previousRole: result.previousRole,
          newRole: dto.role,
          reason: dto.reason,
        },
      });
    }

    const responseData: AssignRoleResponse['data'] = {
      userId: targetUserId,
      previousRole: result.previousRole,
      newRole: dto.role,
      assignedBy: assignerId,
      assignedAt: now,
    };
    if (dto.reason !== undefined) {
      responseData.reason = dto.reason;
    }

    return {
      success: true,
      data: responseData,
    };
  }

  /**
   * Get user permissions
   * Story 2.2: Role Assignment és RBAC
   * AC#3: Jogosultság lekérdezés endpoint
   * AC#4: Kompozit jogok (direkt + örökölt)
   *
   * @param targetUserId - ID of the user to get permissions for
   * @param tenantId - Tenant ID for isolation
   * @returns User permissions response with all permissions and constraints
   * @throws Error if user not found
   */
  async getUserPermissions(
    targetUserId: string,
    tenantId: string
  ): Promise<UserPermissionsResponse> {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Database not available'); // M2 FIX: HttpException
    }

    // Find target user (with tenant isolation)
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId },
    });

    if (!user) {
      throw new NotFoundException(ROLE_ASSIGNMENT_MESSAGES.USER_NOT_FOUND); // H1 FIX: HttpException
    }

    const role = user.role as Role;
    const level = this.roleService.getRoleLevel(role);
    const scope = this.roleService.getRoleScope(role);
    const inheritedFrom = this.roleService.getInheritedRoles(role);
    const permissions = this.permissionService.getAllPermissions(role);

    // Build constraints map
    const constraints: Partial<Record<Permission, Record<string, number>>> = {};
    for (const permission of permissions) {
      const discountLimit = this.permissionService.getConstraint(role, permission, 'discount_limit');
      if (discountLimit !== undefined) {
        constraints[permission] = { discount_limit: discountLimit };
      }
    }

    return {
      userId: targetUserId,
      role,
      level,
      scope,
      permissions,
      inheritedFrom,
      constraints,
    };
  }

  // ============================================
  // Story 2.6: User Profile Management
  // ============================================

  /**
   * Get user profile by ID
   * Story 2.6: User Profile Management
   * AC#1: GET /users/me - Profile lekérés
   *
   * Returns profile without sensitive fields (passwordHash, pinHash)
   *
   * SECURITY: Always validates tenantId to prevent cross-tenant data access (ADR-001)
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID for isolation (REQUIRED for security)
   * @returns Profile response or null if not found
   */
  async getProfile(userId: string, tenantId: string): Promise<ProfileResponseDto | null> {
    // C3 FIX: Throw ServiceUnavailableException instead of silent fail
    if (!this.prisma) {
      throw new ServiceUnavailableException('Database not available');
    }

    // SECURITY: findFirst with tenantId ensures user can only access their own tenant's data
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId, // ADR-001: Multi-tenant isolation REQUIRED
      },
    });

    if (!user) {
      return null;
    }

    return formatProfileResponse(user);
  }

  /**
   * Update user profile
   * Story 2.6: User Profile Management
   * AC#2: PUT /users/me - Profil módosítás
   *
   * Only name, phone, avatarUrl can be updated via this method.
   * Email and role changes require separate endpoints/permissions.
   *
   * SECURITY: Always validates tenantId to prevent cross-tenant data access (ADR-001)
   *
   * @param userId - User ID
   * @param dto - Update data (name, phone, avatarUrl)
   * @param tenantId - Tenant ID for isolation (REQUIRED for security)
   * @returns Updated profile
   * @throws Error if user not found
   */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    tenantId: string
  ): Promise<ProfileResponseDto> {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Database not available'); // M2 FIX: HttpException
    }

    // SECURITY: findFirst with tenantId ensures user can only modify their own tenant's data
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId, // ADR-001: Multi-tenant isolation REQUIRED
      },
    });

    if (!existingUser) {
      throw new NotFoundException(PROFILE_MESSAGES.NOT_FOUND); // H1 FIX: HttpException
    }

    // Build update data - only include provided fields
    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;

    // If no fields to update, return current profile
    if (Object.keys(updateData).length === 0) {
      return formatProfileResponse(existingUser);
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // AC#6: Audit log for profile update (field names only, not values for privacy)
    if (this.auditService) {
      await this.auditService.log({
        action: AuditAction.USER_PROFILE_UPDATED,
        userId,
        tenantId: updatedUser.tenantId,
        resourceType: 'USER_PROFILE',
        resourceId: userId,
        details: {
          updatedFields: Object.keys(updateData),
        },
      });
    }

    return formatProfileResponse(updatedUser);
  }

  /**
   * Update user PIN
   * Story 2.6: User Profile Management
   * AC#4: PUT /users/me/pin - PIN módosítás
   *
   * SECURITY REQUIREMENTS:
   * - If user HAS existing PIN: requires current PIN verification
   * - If user has NO PIN (first setup): requires password verification
   * - Multi-tenant isolation enforced (ADR-001)
   * - Failed attempts are audit logged
   *
   * @param userId - User ID
   * @param currentPin - Current PIN for verification (required if user has PIN)
   * @param newPin - New PIN to set (4-6 digits)
   * @param tenantId - Tenant ID for isolation (REQUIRED for security)
   * @param password - Password for first PIN setup verification (required if no existing PIN)
   * @returns Success response
   * @throws Error if user not found, verification fails, or tenant mismatch
   */
  async updatePin(
    userId: string,
    currentPin: string,
    newPin: string,
    tenantId: string,
    password?: string
  ): Promise<UpdatePinResponse> {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Database not available'); // M2 FIX: HttpException
    }

    // SECURITY: Find user with tenantId to ensure multi-tenant isolation (ADR-001)
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId, // ADR-001: Multi-tenant isolation REQUIRED
      },
      select: {
        id: true,
        tenantId: true,
        pinHash: true,
        passwordHash: true, // Needed for first PIN setup verification
      },
    });

    if (!user) {
      throw new NotFoundException(PROFILE_MESSAGES.NOT_FOUND); // H1 FIX: HttpException
    }

    // SECURITY: Verification required before PIN change
    if (user.pinHash) {
      // User has existing PIN - verify current PIN
      const isValidPin = await bcrypt.compare(currentPin, user.pinHash);
      if (!isValidPin) {
        // Audit log failed PIN attempt (SECURITY)
        if (this.auditService) {
          await this.auditService.log({
            action: AuditAction.USER_PIN_FAILED,
            userId,
            tenantId: user.tenantId,
            resourceType: 'USER_PIN',
            resourceId: userId,
            details: {
              reason: 'Invalid current PIN',
              // NEVER log actual PIN values!
            },
          });
        }
        throw new BadRequestException(PROFILE_MESSAGES.INVALID_PIN); // H1 FIX: HttpException
      }
    } else {
      // SECURITY FIX: First PIN setup requires password verification
      // Cannot allow PIN setup without identity verification
      if (!password) {
        throw new BadRequestException('A jelszó megadása kötelező az első PIN beállításához'); // H1 FIX: Password required for first PIN setup
      }
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        // Audit log failed password attempt during PIN setup
        if (this.auditService) {
          await this.auditService.log({
            action: AuditAction.USER_PIN_FAILED,
            userId,
            tenantId: user.tenantId,
            resourceType: 'USER_PIN',
            resourceId: userId,
            details: {
              reason: 'Invalid password during first PIN setup',
              // NEVER log actual credential values!
            },
          });
        }
        throw new BadRequestException('Érvénytelen jelszó'); // H1 FIX: Invalid password
      }
    }

    // Hash new PIN
    const newPinHash = await bcrypt.hash(newPin, BCRYPT_PIN_SALT_ROUNDS);

    // Update PIN
    await this.prisma.user.update({
      where: { id: userId },
      data: { pinHash: newPinHash },
    });

    // AC#6: Audit log for successful PIN change (NO PIN values!)
    if (this.auditService) {
      await this.auditService.log({
        action: AuditAction.USER_PIN_CHANGED,
        userId,
        tenantId: user.tenantId,
        resourceType: 'USER_PIN',
        resourceId: userId,
        details: {
          pinChanged: true,
          isFirstPinSetup: !user.pinHash,
          // NEVER log actual PIN values!
        },
      });
    }

    return {
      success: true,
      message: PROFILE_MESSAGES.PIN_CHANGED,
    };
  }

  /**
   * Generate a secure temporary password
   * Uses cryptographically secure random bytes
   *
   * H4 FIX: Uses hex encoding for full entropy instead of sliced base64
   * L2 FIX: Made private - only used internally
   *
   * @returns Random password string (hexadecimal, 32 characters = 128 bits entropy)
   */
  private generateTemporaryPassword(): string {
    // H4 FIX: Use hex encoding for full entropy (16 bytes = 32 hex chars = 128 bits)
    // Each hex char = 4 bits, so 32 chars = 128 bits of entropy
    const randomBuffer = randomBytes(TEMP_PASSWORD_LENGTH);
    return randomBuffer.toString('hex');
  }
}
