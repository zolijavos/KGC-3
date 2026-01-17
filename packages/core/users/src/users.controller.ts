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
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';

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
 * Express Response interface (local definition to avoid @types/express dependency)
 */
interface Response {
  status(code: number): this;
  json(body: unknown): this;
}
import { JwtAuthGuard } from '@kgc/auth';

import { UsersService } from './users.service';
import { validateCreateUserInput } from './dto/create-user.dto';
import { validateUpdateUserInput } from './dto/update-user.dto';
import { validateUserQueryInput, validateUuid, DEFAULT_LIMIT, DEFAULT_OFFSET } from './dto/user-query.dto';
import { USER_MESSAGES } from './dto/user-response.dto';
import { validateAssignRoleInput, ROLE_ASSIGNMENT_MESSAGES } from './dto/assign-role.dto';
import { validateUpdateProfileInput } from './dto/update-profile.dto';
import { validateUpdatePinInput } from './dto/update-pin.dto';
import { PROFILE_MESSAGES } from './dto/profile-response.dto';
import { Role, UserErrorCode } from './interfaces/user.interface';

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
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /api/v1/users - Create new user
   * AC1: User Létrehozás
   */
  @Post()
  async createUser(
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<Response> {
    // Validate input
    const validation = validateCreateUserInput(body);
    if (!validation.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: validation.error,
      });
    }

    try {
      // Override tenantId from authenticated user's context (security)
      const dtoWithTenant = {
        ...validation.data,
        tenantId: req.user.tenantId,
      };

      const user = await this.usersService.createUser(
        dtoWithTenant,
        req.user.id,
        req.user.role as Role
      );

      return res.status(HttpStatus.CREATED).json({ data: user });
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/users - List users with pagination
   * AC2: User Listázás és Keresés
   */
  @Get()
  async listUsers(
    @Query() query: Record<string, string>,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<Response> {
    // Validate query params
    const validation = validateUserQueryInput(query);
    if (!validation.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: validation.error,
      });
    }

    try {
      const result = await this.usersService.findAll(
        {
          limit: validation.data.limit ?? DEFAULT_LIMIT,
          offset: validation.data.offset ?? DEFAULT_OFFSET,
          search: validation.data.search,
          role: validation.data.role,
          status: validation.data.status,
          locationId: validation.data.locationId,
        },
        req.user.tenantId
      );

      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
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
   */
  @Get('me')
  async getMyProfile(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<Response> {
    try {
      // SECURITY: Always pass tenantId to ensure multi-tenant isolation
      const profile = await this.usersService.getProfile(req.user.id, req.user.tenantId);

      if (!profile) {
        return res.status(HttpStatus.NOT_FOUND).json({
          error: {
            code: UserErrorCode.USER_NOT_FOUND,
            message: PROFILE_MESSAGES.NOT_FOUND,
          },
        });
      }

      return res.status(HttpStatus.OK).json({ data: profile });
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  /**
   * PUT /api/v1/users/me - Update current user's profile
   * Story 2.6: User Profile Management
   * AC#2: Profil módosítás (name, phone, avatarUrl)
   *
   * SECURITY: tenantId passed for multi-tenant isolation (ADR-001)
   */
  @Put('me')
  async updateMyProfile(
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<Response> {
    // Validate input
    const validation = validateUpdateProfileInput(body);
    if (!validation.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: validation.error,
      });
    }

    try {
      // SECURITY: Always pass tenantId to ensure multi-tenant isolation
      const profile = await this.usersService.updateProfile(
        req.user.id,
        validation.data,
        req.user.tenantId
      );

      return res.status(HttpStatus.OK).json({ data: profile });
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  /**
   * PUT /api/v1/users/me/pin - Update current user's PIN
   * Story 2.6: User Profile Management
   * AC#4: PIN kód módosítás
   *
   * SECURITY:
   * - tenantId passed for multi-tenant isolation (ADR-001)
   * - First PIN setup requires password verification
   */
  @Put('me/pin')
  async updateMyPin(
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<Response> {
    // Validate input
    const validation = validateUpdatePinInput(body);
    if (!validation.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: validation.error,
      });
    }

    try {
      // SECURITY: Pass tenantId for multi-tenant isolation, password for first PIN setup
      const result = await this.usersService.updatePin(
        req.user.id,
        validation.data.currentPin,
        validation.data.newPin,
        req.user.tenantId,
        validation.data.password // Optional - required for first PIN setup
      );

      return res.status(HttpStatus.OK).json({ data: result });
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/users/:id - Get user by ID
   * AC3: User Részletek Lekérése
   */
  @Get(':id')
  async getUserById(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<Response> {
    // Validate UUID format
    const uuidValidation = validateUuid(id);
    if (!uuidValidation.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: uuidValidation.error,
      });
    }

    try {
      const user = await this.usersService.findById(id, req.user.tenantId);

      if (!user) {
        return res.status(HttpStatus.NOT_FOUND).json({
          error: {
            code: UserErrorCode.USER_NOT_FOUND,
            message: USER_MESSAGES.NOT_FOUND,
          },
        });
      }

      return res.status(HttpStatus.OK).json({ data: user });
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  /**
   * PATCH /api/v1/users/:id - Update user
   * AC4: User Módosítás
   */
  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<Response> {
    // Validate UUID format
    const uuidValidation = validateUuid(id);
    if (!uuidValidation.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: uuidValidation.error,
      });
    }

    // Validate input
    const validation = validateUpdateUserInput(body);
    if (!validation.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: validation.error,
      });
    }

    try {
      const user = await this.usersService.updateUser(
        id,
        validation.data,
        req.user.id,
        req.user.role as Role,
        req.user.tenantId
      );

      return res.status(HttpStatus.OK).json({ data: user });
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  /**
   * DELETE /api/v1/users/:id - Soft delete user
   * AC5: User Soft Delete
   */
  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<Response> {
    // Validate UUID format
    const uuidValidation = validateUuid(id);
    if (!uuidValidation.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: uuidValidation.error,
      });
    }

    try {
      const result = await this.usersService.softDeleteUser(
        id,
        req.user.id,
        req.user.tenantId
      );

      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  /**
   * GET /api/v1/users/:id/permissions - Get user permissions
   * Story 2.2: Role Assignment és RBAC
   * AC#3: Jogosultság lekérdezés endpoint
   * AC#4: Kompozit jogok (direkt + örökölt)
   */
  @Get(':id/permissions')
  async getUserPermissions(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<Response> {
    // Validate UUID format
    const uuidValidation = validateUuid(id);
    if (!uuidValidation.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: uuidValidation.error,
      });
    }

    try {
      const result = await this.usersService.getUserPermissions(id, req.user.tenantId);

      return res.status(HttpStatus.OK).json({ data: result });
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  /**
   * PUT /api/v1/users/:id/role - Assign role to user
   * Story 2.2: Role Assignment és RBAC
   * AC#1: PUT endpoint
   * AC#2: Role hierarchy validation
   * AC#8: Zod validation
   */
  @Put(':id/role')
  async assignRole(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<Response> {
    // Validate UUID format
    const uuidValidation = validateUuid(id);
    if (!uuidValidation.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: uuidValidation.error,
      });
    }

    // Validate input (AC#8: Zod validation)
    const validation = validateAssignRoleInput(body);
    if (!validation.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: validation.error,
      });
    }

    try {
      const result = await this.usersService.assignRole(
        id,
        validation.data,
        req.user.id,
        req.user.role as Role,
        req.user.tenantId
      );

      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      return this.handleError(error, res);
    }
  }

  /**
   * Handle service errors and convert to HTTP responses
   */
  private handleError(error: unknown, res: Response): Response {
    const message = error instanceof Error ? error.message : 'Ismeretlen hiba';

    // Map error messages to HTTP status codes
    switch (message) {
      case USER_MESSAGES.NOT_FOUND:
      case ROLE_ASSIGNMENT_MESSAGES.USER_NOT_FOUND:
        return res.status(HttpStatus.NOT_FOUND).json({
          error: {
            code: UserErrorCode.USER_NOT_FOUND,
            message,
          },
        });

      case USER_MESSAGES.EMAIL_EXISTS:
        return res.status(HttpStatus.CONFLICT).json({
          error: {
            code: UserErrorCode.EMAIL_ALREADY_EXISTS,
            message,
          },
        });

      case USER_MESSAGES.ROLE_VIOLATION:
      case ROLE_ASSIGNMENT_MESSAGES.HIERARCHY_VIOLATION:
        return res.status(HttpStatus.FORBIDDEN).json({
          error: {
            code: UserErrorCode.ROLE_HIERARCHY_VIOLATION,
            message,
          },
        });

      case USER_MESSAGES.UNAUTHORIZED:
      case ROLE_ASSIGNMENT_MESSAGES.SELF_ASSIGNMENT:
        return res.status(HttpStatus.FORBIDDEN).json({
          error: {
            code: UserErrorCode.FORBIDDEN,
            message,
          },
        });

      case ROLE_ASSIGNMENT_MESSAGES.SAME_ROLE:
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: {
            code: 'SAME_ROLE',
            message,
          },
        });

      case PROFILE_MESSAGES.INVALID_PIN:
        return res.status(HttpStatus.FORBIDDEN).json({
          error: {
            code: 'INVALID_PIN',
            message,
          },
        });

      // First PIN setup errors (password verification)
      case 'A jelszó megadása kötelező az első PIN beállításához':
      case 'Érvénytelen jelszó':
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: {
            code: 'FIRST_PIN_SETUP_ERROR',
            message,
          },
        });

      default:
        console.error('[UsersController] Unexpected error:', error);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Belső szerver hiba', // Hungarian: Internal server error
          },
        });
    }
  }
}
