/**
 * @kgc/users - User Management Module
 * Story 2.1: User CRUD Operations
 * Story 2.2: Role Assignment és RBAC
 * Story 2.3: Permission Check Middleware
 * Story 2.4: Elevated Access Requirement
 * Story 2.5: Tenant és Location Scoped Permissions
 * Story 2.6: User Profile Management
 *
 * Exports:
 * - UsersModule: NestJS module for user management
 * - UsersService: Business logic for user CRUD
 * - RoleService: Role hierarchy and permission logic
 * - PermissionService: Role-permission mapping and checking
 * - ElevatedAccessService: Elevated access session management
 * - PermissionGuard: Guard for permission checking
 * - ElevatedAccessGuard: Guard for elevated access verification
 * - ConstraintInterceptor: Interceptor for constraint validation
 * - UsersController: HTTP endpoints
 * - Decorators: RequirePermission, CheckConstraint, RequireElevatedAccess
 * - DTOs: CreateUserDto, UpdateUserDto, UserQueryDto, UserResponseDto, AssignRoleDto
 * - Interfaces: User, UserResponse, Role, UserStatus, Permission
 * - Constants: ELEVATED_PERMISSIONS, ELEVATED_ACCESS_TTL_MS
 */

// Module
export { UsersModule } from './users.module';
export type { UsersModuleOptions } from './users.module';

// Services
export { UsersService } from './users.service';
export { RoleService, ROLE_LEVELS } from './services/role.service';
export { PermissionService } from './services/permission.service';

// Controller
export { UsersController } from './users.controller';

// Interfaces
export {
  Role,
  UserStatus,
  UserErrorCode,
} from './interfaces/user.interface';
export type {
  User,
  UserResponse,
  UserListResponse,
  SingleUserResponse,
  DeleteUserResponse,
  ErrorResponse,
} from './interfaces/user.interface';

// DTOs - Create User
export { createUserSchema, validateCreateUserInput } from './dto/create-user.dto';
export type { CreateUserDto, CreateUserValidationError } from './dto/create-user.dto';

// DTOs - Update User
export { updateUserSchema, validateUpdateUserInput } from './dto/update-user.dto';
export type { UpdateUserDto, UpdateUserValidationError } from './dto/update-user.dto';

// DTOs - User Query
export {
  userQuerySchema,
  validateUserQueryInput,
  uuidSchema,
  validateUuid,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  DEFAULT_OFFSET,
} from './dto/user-query.dto';
export type { UserQueryDto, UserQueryValidationError } from './dto/user-query.dto';

// Interfaces - Audit (stub for Epic 6)
export { AuditAction, AUDIT_SERVICE } from './interfaces/audit.interface';
export type { IAuditService, AuditLogEntry } from './interfaces/audit.interface';

// Interfaces - Email (stub for later)
export { EmailTemplate, EMAIL_SERVICE, MockEmailService } from './interfaces/email.interface';
export type { IEmailService, WelcomeEmailData } from './interfaces/email.interface';

// DTOs - User Response
export {
  userResponseSchema,
  singleUserResponseSchema,
  userListResponseSchema,
  deleteUserResponseSchema,
  errorResponseSchema,
  formatUserResponse,
  USER_MESSAGES,
} from './dto/user-response.dto';
export type {
  UserResponseDto,
  SingleUserResponseDto,
  UserListResponseDto,
  DeleteUserResponseDto,
  ErrorResponseDto,
} from './dto/user-response.dto';

// DTOs - Assign Role (Story 2.2)
export {
  AssignRoleSchema,
  validateAssignRoleInput,
  ROLE_ASSIGNMENT_MESSAGES,
} from './dto/assign-role.dto';
export type {
  AssignRoleInput,
  AssignRoleResponse,
  AssignRoleValidationResult,
} from './dto/assign-role.dto';

// Interfaces - Permission (Story 2.2)
export {
  Permission,
  PermissionModule,
  RoleScope,
  getPermissionsByModule,
  getPermissionModule,
  getPermissionAction,
  isValidPermission,
  TOTAL_PERMISSION_COUNT,
} from './interfaces/permission.interface';
export type {
  PermissionConstraint,
  IPermission,
  RoleDefinition,
  UserPermissionsResponse,
} from './interfaces/permission.interface';

// Guards (Story 2.3)
export { PermissionGuard } from './guards/permission.guard';

// Decorators (Story 2.3)
export {
  RequirePermission,
  PERMISSIONS_KEY,
  PERMISSION_LOGIC_KEY,
} from './decorators/require-permission.decorator';
export type { PermissionLogic } from './decorators/require-permission.decorator';

export {
  CheckConstraint,
  CONSTRAINT_KEY,
} from './decorators/check-constraint.decorator';
export type { ConstraintMetadata } from './decorators/check-constraint.decorator';

// Interceptors (Story 2.3)
export { ConstraintInterceptor } from './interceptors/constraint.interceptor';

// Story 2.4: Elevated Access
// Constants
export {
  ELEVATED_PERMISSIONS,
  ELEVATED_ACCESS_TTL_MS,
  ELEVATED_ACCESS_TTL_SECONDS,
  isElevatedPermission,
} from './constants/elevated-access.constants';

// Services
export { ElevatedAccessService } from './services/elevated-access.service';

// Guards
export { ElevatedAccessGuard } from './guards/elevated-access.guard';

// Decorators
export {
  RequireElevatedAccess,
  ELEVATED_ACCESS_KEY,
} from './decorators/require-elevated-access.decorator';
export type { ElevatedAccessMetadata } from './decorators/require-elevated-access.decorator';

// Story 2.5: Tenant és Location Scoped Permissions
// Constants
export {
  ROLE_SCOPE_MAP,
  getScopeForRole,
  isLocationScopedRole,
  isTenantScopedRole,
  isGlobalScopedRole,
} from './constants/scoped-permission.constants';

// Services
export { ScopedPermissionService } from './services/scoped-permission.service';
export type {
  ScopeCheckUser,
  ResourceContext,
  ScopeCheckResult,
} from './services/scoped-permission.service';

// Guards
export { ScopedPermissionGuard } from './guards/scoped-permission.guard';

// Decorators
export {
  RequireScope,
  SCOPE_REQUIREMENT_KEY,
} from './decorators/require-scope.decorator';
export type { ScopeRequirementMetadata } from './decorators/require-scope.decorator';

// Story 2.6: User Profile Management
// DTOs - Profile Response
export {
  profileResponseSchema,
  formatProfileResponse,
  PROFILE_MESSAGES,
} from './dto/profile-response.dto';
export type { ProfileResponseDto } from './dto/profile-response.dto';

// DTOs - Update Profile
export {
  updateProfileSchema,
  validateUpdateProfileInput,
} from './dto/update-profile.dto';
export type {
  UpdateProfileDto,
  UpdateProfileValidationError,
} from './dto/update-profile.dto';

// DTOs - Update PIN
export {
  updatePinSchema,
  validateUpdatePinInput,
} from './dto/update-pin.dto';
export type {
  UpdatePinDto,
  UpdatePinResponse,
  UpdatePinValidationError,
} from './dto/update-pin.dto';
