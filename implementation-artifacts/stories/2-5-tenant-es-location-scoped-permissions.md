# Story 2.5: Tenant és Location Scoped Permissions

**Status:** done
**Epic:** Epic 2 - User Management (@kgc/users)
**Package:** `packages/core/users/` → `@kgc/users`
**FR:** FR20 (Tenant-scoped és location-scoped jogosultságok), ADR-032

---

## Story

**As a** felhasználó,
**I want** hogy jogosultságaim tenant/location-re korlátozódjanak,
**So that** ne férhessek hozzá más bolt adataihoz.

---

## Acceptance Criteria

### AC1: RoleScope Interface és Utility Functions

**Given** ADR-032 szerinti scope definíciók (LOCATION, TENANT, GLOBAL)
**When** ScopedPermissionService inicializálódik
**Then** a következő scope hierarchia érvényesül:
- `LOCATION` scope: Csak saját location adatai (OPERATOR, TECHNIKUS, BOLTVEZETO)
- `TENANT` scope: Összes location a tenant-en belül (ACCOUNTANT, PARTNER_OWNER)
- `GLOBAL` scope: Cross-tenant hozzáférés (CENTRAL_ADMIN, DEVOPS_ADMIN, SUPER_ADMIN)

### AC2: @RequireScope Decorator

**Given** @RequireScope() decorator endpoint-on
**When** request érkezik
**Then** a decorator beállítja a szükséges scope szintet
**And** kombinálható @RequirePermission decorator-ral
**And** opcionálisan megadható resource_tenant_id és resource_location_id

### AC3: ScopedPermissionGuard Implementation

**Given** endpoint @RequireScope decorator-ral
**When** request érkezik autentikált user-től
**Then** a guard ellenőrzi:
- User tenantId egyezik-e a resource tenantId-vel
- Ha LOCATION scope: User locationId egyezik-e a resource locationId-vel
- Ha GLOBAL scope: Engedélyez cross-tenant hozzáférést (read-only esetén)
**And** 403 Forbidden válasz ha scope violation
**And** error: `{ code: 'SCOPE_VIOLATION', message: 'Nincs hozzáférés ehhez az erőforráshoz' }`

### AC4: Resource Context Extraction

**Given** request a resource endpoint-ra
**When** guard ellenőrzi a scope-ot
**Then** a resource tenant_id és location_id kiolvassa:
- URL param: `:tenantId`, `:locationId`
- Request header: `x-resource-tenant-id`, `x-resource-location-id`
- Request body: `tenantId`, `locationId`
- Database lookup: resource ID alapján (lazy load)

### AC5: ScopedPermissionService Functions

**Given** ScopedPermissionService
**When** scope ellenőrzés szükséges
**Then** a service a következő metódusokat biztosítja:
- `canAccessTenant(user, resourceTenantId)`: Tenant scope check
- `canAccessLocation(user, resourceTenantId, resourceLocationId)`: Location scope check
- `getScopeForRole(role)`: Role → RoleScope mapping
- `requiresLocationScope(role)`: Boolean - LOCATION scope-e a role

### AC6: Guard Ordering Integration

**Given** endpoint @RequirePermission és @RequireScope decorator-ral
**When** request érkezik
**Then** a guard-ok sorrendje:
1. JwtAuthGuard (authentication)
2. PermissionGuard (permission check)
3. ScopedPermissionGuard (scope check)
4. ElevatedAccessGuard (ha szükséges)

### AC7: Audit Logging

**Given** scope violation vagy sikeres scope check
**When** ScopedPermissionGuard döntést hoz
**Then** audit log entry létrejön
**And** tartalmazza: action='SCOPE_GRANTED' | 'SCOPE_DENIED', userId, resourceTenantId, resourceLocationId
**And** sikertelen próbálkozás is naplózódik

### AC8: GLOBAL Scope Read-Only Override

**Given** CENTRAL_ADMIN vagy magasabb role
**When** cross-tenant adathoz fér hozzá
**Then** csak READ műveletek engedélyezettek (GET endpoints)
**And** WRITE műveletek (POST, PUT, DELETE) → 403 Forbidden
**And** error: `{ code: 'CROSS_TENANT_WRITE_DENIED', message: 'Cross-tenant írás nem engedélyezett' }`

### AC9: Unit és E2E Tests (TDD)

**Given** TDD módszertan
**When** ScopedPermissionGuard és service implementálása
**Then** min 15 unit teszt
**And** min 10 E2E teszt a különböző scope scenariókra
**And** teszt coverage a scope kombinációkra

---

## Tasks / Subtasks

- [x] **Task 1: Scope Constants és Types** (AC: #1)
  - [x] 1.1: `scoped-permission.constants.ts` létrehozása
  - [x] 1.2: ROLE_SCOPE_MAP constant definíció (8 role → scope)
  - [x] 1.3: `getScopeForRole(role)` helper function
  - [x] 1.4: `isLocationScopedRole(role)` helper function
  - [x] 1.5: Unit tesztek - 27 teszt (exceeded 6 minimum)

- [x] **Task 2: @RequireScope Decorator** (AC: #2)
  - [x] 2.1: `require-scope.decorator.ts` létrehozása
  - [x] 2.2: SetMetadata használata ('scope_requirement' key)
  - [x] 2.3: Opcionális `resourceIdParam` paraméter (melyik URL param a resource ID)
  - [x] 2.4: Unit tesztek - 11 teszt (exceeded 6 minimum)

- [x] **Task 3: ScopedPermissionService Implementation** (AC: #5)
  - [x] 3.1: `scoped-permission.service.ts` létrehozása
  - [x] 3.2: `canAccessTenant(user, resourceTenantId)` - tenant check
  - [x] 3.3: `canAccessLocation(user, resourceTenantId, resourceLocationId)` - location check
  - [x] 3.4: `getScopeForRole(role)` - role → scope mapping
  - [x] 3.5: `requiresLocationScope(role)` - boolean check
  - [x] 3.6: Unit tesztek (TDD - 48 teszt, exceeded 12 minimum)

- [x] **Task 4: ScopedPermissionGuard Implementation** (AC: #3, #4, #6, #8)
  - [x] 4.1: `scoped-permission.guard.ts` létrehozása (CanActivate)
  - [x] 4.2: Reflector használata metaadatok kinyerésére
  - [x] 4.3: Resource context extraction (URL, header, body)
  - [x] 4.4: Tenant scope validation
  - [x] 4.5: Location scope validation
  - [x] 4.6: Global scope read-only override logic
  - [x] 4.7: ForbiddenException dobása scope violation esetén
  - [x] 4.8: Unit tesztek (TDD - 27 teszt, exceeded 15 minimum)

- [x] **Task 5: Audit Integration** (AC: #7)
  - [x] 5.1: Extend AuditAction enum: SCOPE_GRANTED, SCOPE_DENIED
  - [x] 5.2: Audit log hívás scope check-nél
  - [x] 5.3: Resource context (tenantId, locationId) a log-ban

- [x] **Task 6: Module Export és Integration** (AC: #6)
  - [x] 6.1: ScopedPermissionGuard exportálása @kgc/users index.ts-ből
  - [x] 6.2: RequireScope decorator exportálása
  - [x] 6.3: ScopedPermissionService exportálása
  - [x] 6.4: Guard ordering dokumentáció (in decorator JSDoc)

- [x] **Task 7: E2E Tests** (AC: #9)
  - [x] 7.1: Same tenant access - LOCATION scope user
  - [x] 7.2: Same location access - LOCATION scope user
  - [x] 7.3: Different location access denied - LOCATION scope user
  - [x] 7.4: Cross-location access - TENANT scope user
  - [x] 7.5: Cross-tenant access denied - TENANT scope user
  - [x] 7.6: Cross-tenant read access - GLOBAL scope user
  - [x] 7.7: Cross-tenant write denied - GLOBAL scope user
  - [x] 7.8: Combined PermissionGuard + ScopedPermissionGuard
  - [x] 7.9: Resource ID from URL param
  - [x] 7.10: Resource ID from request body
  - Total: 32 E2E tesztek (exceeded 10 minimum)

---

## Dev Notes

### Technológiai Stack (project-context.md alapján)

| Technológia | Verzió | Használat |
|-------------|--------|-----------|
| NestJS | 10.x | Backend framework, Guards, Decorators |
| TypeScript | 5.3+ | Strict mode |
| zod | 3.23.x | Validation |
| Vitest | 2.1+ | Unit tesztek |

### Meglévő Kód Újrahasználás

**FONTOS:** Az alábbi komponensek MÁR LÉTEZNEK és újra kell használni:

```typescript
// packages/core/users/src/guards/permission.guard.ts - MÁR LÉTEZIK!
export class PermissionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> { ... }
}

// packages/core/users/src/decorators/require-permission.decorator.ts - MÁR LÉTEZIK!
export function RequirePermission(
  permissionOrPermissions: Permission | Permission[],
  logic: PermissionLogic = 'ALL'
): MethodDecorator { ... }

// packages/core/users/src/interfaces/permission.interface.ts - MÁR LÉTEZIK!
export enum RoleScope {
  LOCATION = 'LOCATION', // Single location access
  TENANT = 'TENANT',     // All locations within tenant
  GLOBAL = 'GLOBAL',     // Cross-tenant access
}

// packages/core/users/src/interfaces/user.interface.ts - MÁR LÉTEZIK!
export interface User {
  id: string;
  tenantId: string;       // FONTOS: minden user-nek van tenant!
  locationId?: string;    // FONTOS: opcionális location hozzárendelés
  role: Role;
}
```

### ROLE_SCOPE_MAP Definíció (ADR-032 alapján)

```typescript
// Létrehozandó: packages/core/users/src/constants/scoped-permission.constants.ts
import { Role } from '../interfaces/user.interface';
import { RoleScope } from '../interfaces/permission.interface';

/**
 * Role to Scope mapping per ADR-032 RBAC Architecture
 * - LOCATION: Single location access (OPERATOR, TECHNIKUS, BOLTVEZETO)
 * - TENANT: All locations within tenant (ACCOUNTANT, PARTNER_OWNER)
 * - GLOBAL: Cross-tenant access (CENTRAL_ADMIN, DEVOPS_ADMIN, SUPER_ADMIN)
 */
export const ROLE_SCOPE_MAP: Record<Role, RoleScope> = {
  [Role.OPERATOR]: RoleScope.LOCATION,
  [Role.TECHNIKUS]: RoleScope.LOCATION,
  [Role.BOLTVEZETO]: RoleScope.LOCATION,
  [Role.ACCOUNTANT]: RoleScope.TENANT,
  [Role.PARTNER_OWNER]: RoleScope.TENANT,
  [Role.CENTRAL_ADMIN]: RoleScope.GLOBAL,
  [Role.DEVOPS_ADMIN]: RoleScope.GLOBAL,
  [Role.SUPER_ADMIN]: RoleScope.GLOBAL,
};

/**
 * Get scope for a role
 */
export function getScopeForRole(role: Role): RoleScope {
  return ROLE_SCOPE_MAP[role];
}

/**
 * Check if role requires location-level scope
 */
export function isLocationScopedRole(role: Role): boolean {
  return ROLE_SCOPE_MAP[role] === RoleScope.LOCATION;
}

/**
 * Check if role has tenant-level scope
 */
export function isTenantScopedRole(role: Role): boolean {
  return ROLE_SCOPE_MAP[role] === RoleScope.TENANT;
}

/**
 * Check if role has global (cross-tenant) scope
 */
export function isGlobalScopedRole(role: Role): boolean {
  return ROLE_SCOPE_MAP[role] === RoleScope.GLOBAL;
}
```

### @RequireScope Decorator

```typescript
// Létrehozandó: packages/core/users/src/decorators/require-scope.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { RoleScope } from '../interfaces/permission.interface';

export const SCOPE_REQUIREMENT_KEY = 'scope_requirement';

export interface ScopeRequirementMetadata {
  /** Minimum scope required to access this resource */
  minimumScope: RoleScope;
  /** URL param name containing resource ID for scope lookup (e.g., 'id', 'tenantId') */
  resourceIdParam?: string;
  /** Allow GLOBAL scope users to write (default: false = read-only) */
  allowGlobalWrite?: boolean;
}

/**
 * @RequireScope decorator
 * Marks endpoint as requiring specific scope level
 *
 * @param minimumScope - Minimum scope required (LOCATION | TENANT | GLOBAL)
 * @param options - Additional options for resource extraction
 *
 * @example
 * // Require LOCATION scope - user must be in same location as resource
 * @Get(':id')
 * @UseGuards(JwtAuthGuard, PermissionGuard, ScopedPermissionGuard)
 * @RequirePermission(Permission.RENTAL_VIEW)
 * @RequireScope(RoleScope.LOCATION, { resourceIdParam: 'id' })
 * async getRental(@Param('id') id: string) { ... }
 *
 * @example
 * // Require TENANT scope - user must be in same tenant
 * @Get()
 * @RequireScope(RoleScope.TENANT)
 * async listTenantRentals() { ... }
 */
export function RequireScope(
  minimumScope: RoleScope,
  options?: Partial<Omit<ScopeRequirementMetadata, 'minimumScope'>>
): MethodDecorator {
  const metadata: ScopeRequirementMetadata = {
    minimumScope,
    resourceIdParam: options?.resourceIdParam,
    allowGlobalWrite: options?.allowGlobalWrite ?? false,
  };
  return SetMetadata(SCOPE_REQUIREMENT_KEY, metadata);
}
```

### ScopedPermissionService

```typescript
// Létrehozandó: packages/core/users/src/services/scoped-permission.service.ts
import { Injectable } from '@nestjs/common';
import { Role } from '../interfaces/user.interface';
import { RoleScope } from '../interfaces/permission.interface';
import {
  ROLE_SCOPE_MAP,
  isLocationScopedRole,
  isGlobalScopedRole,
} from '../constants/scoped-permission.constants';

/**
 * User context for scope checking
 */
export interface ScopeCheckUser {
  id: string;
  role: Role;
  tenantId: string;
  locationId?: string | null;
}

/**
 * Resource context for scope checking
 */
export interface ResourceContext {
  tenantId?: string | null;
  locationId?: string | null;
}

/**
 * Service for checking permission scopes (tenant/location)
 * Story 2.5: Tenant és Location Scoped Permissions
 */
@Injectable()
export class ScopedPermissionService {
  /**
   * Get the scope for a role
   */
  getScopeForRole(role: Role): RoleScope {
    return ROLE_SCOPE_MAP[role];
  }

  /**
   * Check if user has location-scoped role
   */
  requiresLocationScope(role: Role): boolean {
    return isLocationScopedRole(role);
  }

  /**
   * Check if user has global (cross-tenant) scope
   */
  hasGlobalScope(role: Role): boolean {
    return isGlobalScopedRole(role);
  }

  /**
   * Check if user can access a tenant
   * @param user - User context
   * @param resourceTenantId - Target tenant ID
   * @returns true if access allowed
   */
  canAccessTenant(user: ScopeCheckUser, resourceTenantId: string | null | undefined): boolean {
    // No resource tenant specified - allow (tenant will be from user context)
    if (!resourceTenantId) {
      return true;
    }

    // Global scope users can access any tenant
    if (this.hasGlobalScope(user.role)) {
      return true;
    }

    // Check if user's tenant matches resource tenant
    return user.tenantId === resourceTenantId;
  }

  /**
   * Check if user can access a location
   * @param user - User context
   * @param resourceTenantId - Target tenant ID
   * @param resourceLocationId - Target location ID
   * @returns true if access allowed
   */
  canAccessLocation(
    user: ScopeCheckUser,
    resourceTenantId: string | null | undefined,
    resourceLocationId: string | null | undefined
  ): boolean {
    // First check tenant access
    if (!this.canAccessTenant(user, resourceTenantId)) {
      return false;
    }

    // No resource location specified - allow
    if (!resourceLocationId) {
      return true;
    }

    // TENANT and GLOBAL scope users can access any location within allowed tenants
    if (!this.requiresLocationScope(user.role)) {
      return true;
    }

    // LOCATION scope users must match location
    // User without locationId cannot access location-specific resources
    if (!user.locationId) {
      return false;
    }

    return user.locationId === resourceLocationId;
  }

  /**
   * Full scope check combining tenant and location
   */
  checkScope(
    user: ScopeCheckUser,
    resource: ResourceContext,
    minimumScope: RoleScope
  ): { allowed: boolean; reason?: string } {
    const userScope = this.getScopeForRole(user.role);

    // Check if user's scope is sufficient
    const scopeLevel = { [RoleScope.LOCATION]: 1, [RoleScope.TENANT]: 2, [RoleScope.GLOBAL]: 3 };

    if (scopeLevel[userScope] < scopeLevel[minimumScope]) {
      return {
        allowed: false,
        reason: `Insufficient scope: required ${minimumScope}, user has ${userScope}`,
      };
    }

    // Check tenant access
    if (!this.canAccessTenant(user, resource.tenantId)) {
      return {
        allowed: false,
        reason: `Tenant access denied: user tenant ${user.tenantId}, resource tenant ${resource.tenantId}`,
      };
    }

    // Check location access for LOCATION scope users
    if (this.requiresLocationScope(user.role)) {
      if (!this.canAccessLocation(user, resource.tenantId, resource.locationId)) {
        return {
          allowed: false,
          reason: `Location access denied: user location ${user.locationId}, resource location ${resource.locationId}`,
        };
      }
    }

    return { allowed: true };
  }
}
```

### ScopedPermissionGuard

```typescript
// Létrehozandó: packages/core/users/src/guards/scoped-permission.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ScopedPermissionService, ScopeCheckUser, ResourceContext } from '../services/scoped-permission.service';
import { IAuditService, AUDIT_SERVICE, AuditAction } from '../interfaces/audit.interface';
import { RoleScope } from '../interfaces/permission.interface';
import {
  SCOPE_REQUIREMENT_KEY,
  ScopeRequirementMetadata,
} from '../decorators/require-scope.decorator';

interface AuthenticatedUser {
  id: string;
  role: string;
  tenantId: string;
  locationId?: string | null;
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser | null | undefined;
}

@Injectable()
export class ScopedPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly scopedPermissionService: ScopedPermissionService,
    @Optional() @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService | null
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Get scope requirement from decorator
    const metadata = this.reflector.get<ScopeRequirementMetadata | undefined>(
      SCOPE_REQUIREMENT_KEY,
      context.getHandler()
    );

    // No scope requirement - allow
    if (!metadata) {
      return true;
    }

    // 2. Get user from request
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !user.id || !user.role) {
      throw new ForbiddenException({
        code: 'SCOPE_VIOLATION',
        message: 'Nincs bejelentkezett felhasználó',
      });
    }

    // 3. Extract resource context
    const resourceContext = this.extractResourceContext(request, metadata);

    // 4. Check GLOBAL scope write restriction
    if (this.scopedPermissionService.hasGlobalScope(user.role as any)) {
      const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);

      // Cross-tenant write check
      if (isWriteOperation && !metadata.allowGlobalWrite) {
        if (resourceContext.tenantId && resourceContext.tenantId !== user.tenantId) {
          await this.logScopeDenied(user, resourceContext, 'Cross-tenant write not allowed');
          throw new ForbiddenException({
            code: 'CROSS_TENANT_WRITE_DENIED',
            message: 'Cross-tenant írás nem engedélyezett',
          });
        }
      }
    }

    // 5. Perform scope check
    const scopeUser: ScopeCheckUser = {
      id: user.id,
      role: user.role as any,
      tenantId: user.tenantId,
      locationId: user.locationId,
    };

    const result = this.scopedPermissionService.checkScope(
      scopeUser,
      resourceContext,
      metadata.minimumScope
    );

    if (!result.allowed) {
      await this.logScopeDenied(user, resourceContext, result.reason || 'Scope check failed');
      throw new ForbiddenException({
        code: 'SCOPE_VIOLATION',
        message: 'Nincs hozzáférés ehhez az erőforráshoz',
      });
    }

    // 6. Log success
    await this.logScopeGranted(user, resourceContext);

    return true;
  }

  /**
   * Extract resource context from request
   * Priority: URL params > Headers > Body
   */
  private extractResourceContext(
    request: AuthenticatedRequest,
    metadata: ScopeRequirementMetadata
  ): ResourceContext {
    const context: ResourceContext = {};

    // From URL params
    if (request.params) {
      if (request.params['tenantId']) {
        context.tenantId = request.params['tenantId'];
      }
      if (request.params['locationId']) {
        context.locationId = request.params['locationId'];
      }
    }

    // From headers (override)
    const headerTenantId = request.headers['x-resource-tenant-id'];
    const headerLocationId = request.headers['x-resource-location-id'];
    if (headerTenantId && typeof headerTenantId === 'string') {
      context.tenantId = headerTenantId;
    }
    if (headerLocationId && typeof headerLocationId === 'string') {
      context.locationId = headerLocationId;
    }

    // From body (lowest priority for GET, highest for POST/PUT)
    if (request.body && typeof request.body === 'object') {
      const body = request.body as Record<string, unknown>;
      if (!context.tenantId && body.tenantId && typeof body.tenantId === 'string') {
        context.tenantId = body.tenantId;
      }
      if (!context.locationId && body.locationId && typeof body.locationId === 'string') {
        context.locationId = body.locationId;
      }
    }

    return context;
  }

  private async logScopeGranted(user: AuthenticatedUser, resource: ResourceContext): Promise<void> {
    if (this.auditService) {
      await this.auditService.log({
        action: AuditAction.SCOPE_GRANTED,
        userId: user.id,
        tenantId: user.tenantId,
        resourceType: 'SCOPE_CHECK',
        resourceId: resource.tenantId || user.tenantId,
        details: {
          resourceTenantId: resource.tenantId,
          resourceLocationId: resource.locationId,
          userRole: user.role,
        },
      });
    }
  }

  private async logScopeDenied(
    user: AuthenticatedUser,
    resource: ResourceContext,
    reason: string
  ): Promise<void> {
    if (this.auditService) {
      await this.auditService.log({
        action: AuditAction.SCOPE_DENIED,
        userId: user.id,
        tenantId: user.tenantId,
        resourceType: 'SCOPE_CHECK',
        resourceId: resource.tenantId || user.tenantId,
        details: {
          resourceTenantId: resource.tenantId,
          resourceLocationId: resource.locationId,
          userRole: user.role,
          reason,
        },
      });
    }
  }
}
```

### Controller Használati Példa

```typescript
// Használat controller-ekben
import { Controller, Get, Post, UseGuards, Param, Body } from '@nestjs/common';
import { JwtAuthGuard } from '@kgc/auth';
import {
  RequirePermission,
  PermissionGuard,
  Permission,
  RequireScope,
  ScopedPermissionGuard,
  RoleScope,
} from '@kgc/users';

@Controller('api/v1/rentals')
@UseGuards(JwtAuthGuard, PermissionGuard, ScopedPermissionGuard)
export class RentalsController {
  // LOCATION scope - user must be in same location
  @Get(':id')
  @RequirePermission(Permission.RENTAL_VIEW)
  @RequireScope(RoleScope.LOCATION, { resourceIdParam: 'id' })
  async getRental(@Param('id') id: string) { ... }

  // TENANT scope - user can see all locations in their tenant
  @Get()
  @RequirePermission(Permission.RENTAL_VIEW)
  @RequireScope(RoleScope.TENANT)
  async listTenantRentals() { ... }

  // LOCATION scope for create - resource location from body
  @Post()
  @RequirePermission(Permission.RENTAL_CREATE)
  @RequireScope(RoleScope.LOCATION)
  async createRental(@Body() dto: CreateRentalDto) { ... }
}
```

### Error Response Format

```typescript
// 403 Forbidden - Scope violation
{
  "error": {
    "code": "SCOPE_VIOLATION",
    "message": "Nincs hozzáférés ehhez az erőforráshoz"
  }
}

// 403 Forbidden - Cross-tenant write denied
{
  "error": {
    "code": "CROSS_TENANT_WRITE_DENIED",
    "message": "Cross-tenant írás nem engedélyezett"
  }
}
```

### Project Structure Notes

**Új fájlok:**
```
packages/core/users/src/
├── constants/
│   └── scoped-permission.constants.ts          # NEW
│   └── scoped-permission.constants.spec.ts     # NEW tests
├── decorators/
│   └── require-scope.decorator.ts              # NEW
│   └── require-scope.decorator.spec.ts         # NEW tests
├── services/
│   └── scoped-permission.service.ts            # NEW
│   └── scoped-permission.service.spec.ts       # NEW tests
├── guards/
│   └── scoped-permission.guard.ts              # NEW
│   └── scoped-permission.guard.spec.ts         # NEW tests
└── scoped-permission.e2e.spec.ts               # NEW E2E tests
```

**Módosított fájlok:**
- `packages/core/users/src/users.module.ts` - ScopedPermissionGuard, ScopedPermissionService regisztráció
- `packages/core/users/src/index.ts` - új exportok
- `packages/core/users/src/interfaces/audit.interface.ts` - SCOPE_GRANTED, SCOPE_DENIED

### TDD Követelmény

**KÖTELEZŐ TDD Red-Green-Refactor:**

- `scoped-permission.constants.spec.ts` - min 6 teszt:
  - ROLE_SCOPE_MAP contains all 8 roles
  - getScopeForRole() returns correct scope
  - isLocationScopedRole() - true for OPERATOR, TECHNIKUS, BOLTVEZETO
  - isLocationScopedRole() - false for TENANT/GLOBAL roles
  - isTenantScopedRole() - correct
  - isGlobalScopedRole() - correct

- `require-scope.decorator.spec.ts` - min 6 teszt:
  - Default metadata
  - Custom resourceIdParam
  - allowGlobalWrite option
  - Metadata key correctness
  - Combined with other decorators

- `scoped-permission.service.spec.ts` - min 12 teszt:
  - getScopeForRole() all roles
  - requiresLocationScope() - true cases
  - requiresLocationScope() - false cases
  - canAccessTenant() - same tenant allowed
  - canAccessTenant() - different tenant denied for TENANT scope
  - canAccessTenant() - different tenant allowed for GLOBAL scope
  - canAccessLocation() - same location allowed
  - canAccessLocation() - different location denied for LOCATION scope
  - canAccessLocation() - different location allowed for TENANT scope
  - checkScope() - full integration

- `scoped-permission.guard.spec.ts` - min 15 teszt:
  - No decorator - allow all
  - LOCATION scope - same location - allow
  - LOCATION scope - different location - deny
  - TENANT scope - same tenant - allow
  - TENANT scope - different tenant - deny
  - GLOBAL scope - cross-tenant read - allow
  - GLOBAL scope - cross-tenant write - deny
  - Resource from URL params
  - Resource from headers
  - Resource from body
  - Missing user - error
  - Audit logging on allow
  - Audit logging on deny

- E2E tests - min 10 teszt

### Audit Extension

```typescript
// Bővítendő: packages/core/users/src/interfaces/audit.interface.ts
export enum AuditAction {
  // ... existing
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ELEVATED_ACCESS_GRANTED = 'ELEVATED_ACCESS_GRANTED',
  ELEVATED_ACCESS_DENIED = 'ELEVATED_ACCESS_DENIED',

  // Story 2.5 - Scoped Permissions
  SCOPE_GRANTED = 'SCOPE_GRANTED',
  SCOPE_DENIED = 'SCOPE_DENIED',
}
```

### Previous Story Intelligence (Story 2.4)

**Learnings:**
1. **Guard pattern** - Reflector + SetMetadata + CanActivate - HASZNÁLD UGYANEZT!
2. **Audit integration** - Optional injection with AUDIT_SERVICE token
3. **Error response format** - `{ error: { code, message } }` - KÖVESD!
4. **Guard ordering** - Multiple guards execute in order specified in @UseGuards
5. **Test patterns** - createMockExecutionContext, createMockReflector helpers

**Code patterns to follow:**
```typescript
// Guard pattern (from ElevatedAccessGuard)
@Injectable()
export class ScopedPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly scopedPermissionService: ScopedPermissionService,
    @Optional() @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService | null
  ) {}
  // ...
}

// Decorator pattern (from RequireElevatedAccess)
export function RequireScope(minimumScope: RoleScope, options?: ...): MethodDecorator {
  return SetMetadata(SCOPE_REQUIREMENT_KEY, { minimumScope, ...options });
}
```

### RLS Integration Note

**FONTOS:** A PostgreSQL RLS policy (`current_setting('app.current_tenant_id')`) automatikusan szűri a tenant adatokat! A ScopedPermissionGuard egy **extra védelmi réteg** az API szinten, de a RLS policy a fő biztonsági mechanizmus.

A guard feladata:
1. **Early rejection** - Ne engedje a kérést tovább, ha scope violation van
2. **Audit logging** - Naplózza a scope check eredményét
3. **Better error messages** - Specifikus hibaüzenet a felhasználónak

A RLS policy (`ADR-001`) továbbra is működik a háttérben!

### References

- [Source: planning-artifacts/adr/ADR-032-rbac-teljes-architektura.md - Role Scope, Permission Matrix]
- [Source: planning-artifacts/epics.md - FR20: Tenant-scoped és location-scoped jogosultságok]
- [Source: docs/project-context.md - TDD/ATDD, API Conventions, Multi-Tenancy]
- [Source: implementation-artifacts/stories/2-4-elevated-access-requirement.md - Guard patterns, Decorator patterns]
- [Source: packages/core/users/src/guards/permission.guard.ts - CanActivate pattern]
- [Source: packages/core/users/src/interfaces/permission.interface.ts - RoleScope enum]
- [Source: packages/core/users/src/interfaces/user.interface.ts - User with tenantId, locationId]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Dátum | Változás | Szerző |
|-------|----------|--------|
| 2026-01-16 | Story created by create-story workflow - comprehensive Scoped Permissions developer guide | Claude Opus 4.5 |
