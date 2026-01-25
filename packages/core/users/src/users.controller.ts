/**
 * Users Controller - HTTP endpoints for user management
 * Story 2.1: User CRUD Operations
 *
 * Endpoints:
 * - POST   /api/v1/users       - Create user (AC1)
 * - GET    /api/v1/users       - List users (AC2)
 * - GET    /api/v1/users/:id   - Get user by ID (AC3)
 * - PATCH  /api/v1/users/:id   - Update user (AC4)
 * - DELETE /api/v1/users/:id   - Soft delete user (AC5)
 *
 * All endpoints require JWT authentication (JwtAuthGuard)
 * Permission checks prepared for Story 2.3
 *
 * C2 FIX: Uses NestJS native returns instead of manual @Res() handling
 * M1 FIX: Uses ZodValidationPipe for declarative validation
 */

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '@kgc/common';
import { RequirePermission } from './decorators/require-permission.decorator';
import { PermissionGuard } from './guards/permission.guard';
import { Permission } from './interfaces/permission.interface';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';
import { PermissionService } from './services/permission.service';

import type { AssignRoleInput, AssignRoleResponse } from './dto/assign-role.dto';
import { AssignRoleSchema } from './dto/assign-role.dto';
import type { CreateUserDto } from './dto/create-user.dto';
import { createUserSchema } from './dto/create-user.dto';
import type { ProfileResponseDto } from './dto/profile-response.dto';
import { PROFILE_MESSAGES } from './dto/profile-response.dto';
import type { UpdatePinDto, UpdatePinResponse } from './dto/update-pin.dto';
import { updatePinSchema } from './dto/update-pin.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { updateProfileSchema } from './dto/update-profile.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { updateUserSchema } from './dto/update-user.dto';
import type { UserQueryDto } from './dto/user-query.dto';
import { DEFAULT_LIMIT, DEFAULT_OFFSET, userQuerySchema } from './dto/user-query.dto';
import { USER_MESSAGES } from './dto/user-response.dto';
import type { UserPermissionsResponse } from './interfaces/permission.interface';
import type {
  DeleteUserResponse,
  UserListResponse,
  UserResponse,
} from './interfaces/user.interface';
import { Role, UserErrorCode } from './interfaces/user.interface';
import { UsersService } from './users.service';

/**
 * Express Request interface (local definition to avoid @types/express dependency)
 */
interface Request {
  user?: unknown;
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

/**
 * Extended request type with user from JWT
 */
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: Role | string;
    tenantId: string;
  };
}

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly permissionService: PermissionService // C1 & H1 FIX: For permission checks
  ) {}

  /**
   * POST /api/v1/users - Create new user
   * AC1: User Létrehozás
   *
   * M1 FIX: Uses ZodValidationPipe for validation
   * C2 FIX: Returns native type, NestJS handles response
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto,
    @Req() req: AuthenticatedRequest
  ): Promise<{ data: UserResponse }> {
    // Override tenantId from authenticated user's context (security)
    const dtoWithTenant = {
      ...dto,
      tenantId: req.user.tenantId,
    };

    // Service throws HttpExceptions (ConflictException, ForbiddenException, etc.)
    const user = await this.usersService.createUser(
      dtoWithTenant,
      req.user.id,
      req.user.role as Role
    );

    return { data: user };
  }

  /**
   * GET /api/v1/users - List users with pagination
   * AC2: User Listázás és Keresés
   *
   * M1 FIX: Uses ZodValidationPipe for query validation
   * C2 FIX: Returns native type, NestJS handles response
   */
  @Get()
  async listUsers(
    @Query(new ZodValidationPipe(userQuerySchema)) query: UserQueryDto,
    @Req() req: AuthenticatedRequest
  ): Promise<UserListResponse> {
    const result = await this.usersService.findAll(
      {
        limit: query.limit ?? DEFAULT_LIMIT,
        offset: query.offset ?? DEFAULT_OFFSET,
        search: query.search,
        role: query.role,
        status: query.status,
        locationId: query.locationId,
      },
      req.user.tenantId
    );

    return result;
  }

  // ============================================
  // Story 2.6: User Profile Management
  // IMPORTANT: /me routes MUST be before /:id routes!
  // ============================================

  /**
   * GET /api/v1/users/me - Get current user's profile
   * Story 2.6: User Profile Management
   * AC#1: Saját profil megtekintése
   *
   * SECURITY: tenantId passed for multi-tenant isolation (ADR-001)
   * C2 FIX: Returns native type or throws NotFoundException
   */
  @Get('me')
  async getMyProfile(@Req() req: AuthenticatedRequest): Promise<{ data: ProfileResponseDto }> {
    // SECURITY: Always pass tenantId to ensure multi-tenant isolation
    const profile = await this.usersService.getProfile(req.user.id, req.user.tenantId);

    if (!profile) {
      throw new NotFoundException({
        code: UserErrorCode.USER_NOT_FOUND,
        message: PROFILE_MESSAGES.NOT_FOUND,
      });
    }

    return { data: profile };
  }

  /**
   * PUT /api/v1/users/me - Update current user's profile
   * Story 2.6: User Profile Management
   * AC#2: Profil módosítás (name, phone, avatarUrl)
   *
   * SECURITY: tenantId passed for multi-tenant isolation (ADR-001)
   * M1 FIX: Uses ZodValidationPipe for validation
   * C2 FIX: Returns native type, NestJS handles response
   */
  @Put('me')
  async updateMyProfile(
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileDto,
    @Req() req: AuthenticatedRequest
  ): Promise<{ data: ProfileResponseDto }> {
    // SECURITY: Always pass tenantId to ensure multi-tenant isolation
    // Service throws NotFoundException for user not found
    const profile = await this.usersService.updateProfile(req.user.id, dto, req.user.tenantId);

    return { data: profile };
  }

  /**
   * PUT /api/v1/users/me/pin - Update current user's PIN
   * Story 2.6: User Profile Management
   * AC#4: PIN kód módosítás
   *
   * SECURITY:
   * - tenantId passed for multi-tenant isolation (ADR-001)
   * - First PIN setup requires password verification
   * M1 FIX: Uses ZodValidationPipe for validation
   * C2 FIX: Returns native type, NestJS handles response
   */
  @Put('me/pin')
  async updateMyPin(
    @Body(new ZodValidationPipe(updatePinSchema)) dto: UpdatePinDto,
    @Req() req: AuthenticatedRequest
  ): Promise<{ data: UpdatePinResponse }> {
    // SECURITY: Pass tenantId for multi-tenant isolation, password for first PIN setup
    // Service throws NotFoundException, BadRequestException for errors
    const result = await this.usersService.updatePin(
      req.user.id,
      dto.currentPin,
      dto.newPin,
      req.user.tenantId,
      dto.password // Optional - required for first PIN setup
    );

    return { data: result };
  }

  /**
   * GET /api/v1/users/:id - Get user by ID
   * AC3: User Részletek Lekérése
   *
   * C2 FIX: Uses ParseUUIDPipe for UUID validation, returns native type
   */
  @Get(':id')
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest
  ): Promise<{ data: UserResponse }> {
    const user = await this.usersService.findById(id, req.user.tenantId);

    if (!user) {
      throw new NotFoundException({
        code: UserErrorCode.USER_NOT_FOUND,
        message: USER_MESSAGES.NOT_FOUND,
      });
    }

    return { data: user };
  }

  /**
   * PATCH /api/v1/users/:id - Update user
   * AC4: User Módosítás
   *
   * M1 FIX: Uses ZodValidationPipe for validation
   * C2 FIX: Uses ParseUUIDPipe and returns native type
   */
  @Patch(':id')
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
    @Req() req: AuthenticatedRequest
  ): Promise<{ data: UserResponse }> {
    // Service throws NotFoundException, ForbiddenException for errors
    const user = await this.usersService.updateUser(
      id,
      dto,
      req.user.id,
      req.user.role as Role,
      req.user.tenantId
    );

    return { data: user };
  }

  /**
   * DELETE /api/v1/users/:id - Soft delete user
   * AC5: User Soft Delete
   *
   * C2 FIX: Uses ParseUUIDPipe and returns native type
   */
  @Delete(':id')
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest
  ): Promise<DeleteUserResponse> {
    // Service throws NotFoundException for user not found
    const result = await this.usersService.softDeleteUser(id, req.user.id, req.user.tenantId);

    return result;
  }

  /**
   * GET /api/v1/users/:id/permissions - Get user permissions
   * Story 2.2: Role Assignment és RBAC
   * AC#3: Jogosultság lekérdezés endpoint
   * AC#4: Kompozit jogok (direkt + örökölt)
   *
   * C2 FIX: Uses ParseUUIDPipe and returns native type
   * H1 FIX: Permission check - self or USER_VIEW required
   */
  @Get(':id/permissions')
  async getUserPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest
  ): Promise<{ data: UserPermissionsResponse }> {
    // H1 SECURITY FIX: Only allow querying self OR users with USER_VIEW permission
    // This prevents information disclosure of other users' permissions
    const isSelf = id === req.user.id;
    const hasUserViewPermission = this.permissionService.hasPermission(
      req.user.role as Role,
      Permission.USER_VIEW
    );

    if (!isSelf && !hasUserViewPermission) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'Nincs jogosultság más felhasználó jogosultságainak megtekintéséhez',
      });
    }

    // Service throws NotFoundException for user not found
    const result = await this.usersService.getUserPermissions(id, req.user.tenantId);

    return { data: result };
  }

  /**
   * PUT /api/v1/users/:id/role - Assign role to user
   * Story 2.2: Role Assignment és RBAC
   * AC#1: PUT endpoint
   * AC#2: Role hierarchy validation
   * AC#8: Zod validation
   *
   * M1 FIX: Uses ZodValidationPipe for validation
   * C2 FIX: Uses ParseUUIDPipe and returns native type
   * C1 FIX: Uses PermissionGuard with USER_ROLE_ASSIGN permission
   */
  @Put(':id/role')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.USER_ROLE_ASSIGN)
  async assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(AssignRoleSchema)) dto: AssignRoleInput,
    @Req() req: AuthenticatedRequest
  ): Promise<AssignRoleResponse> {
    // Service throws ForbiddenException, NotFoundException, BadRequestException for errors
    const result = await this.usersService.assignRole(
      id,
      dto,
      req.user.id,
      req.user.role as Role,
      req.user.tenantId
    );

    return result;
  }
}
