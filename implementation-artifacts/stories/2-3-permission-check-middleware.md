# Story 2.3: Permission Check Middleware

**Status:** done
**Epic:** Epic 2 - User Management (@kgc/users)
**Package:** `packages/core/users/` → `@kgc/users`
**FR:** FR17 (Permission-based access control), ADR-032

---

## Story

**As a** fejlesztő,
**I want** @RequirePermission decorator-t használni,
**So that** minden endpoint megfelelően védett legyen.

---

## Acceptance Criteria

### AC1: @RequirePermission Decorator

**Given** @RequirePermission('rental:create') decorator endpoint-on
**When** request érkezik
**Then** a decorator metaadatokat állít be a handler-en
**And** a decorator több permission-t is elfogad (array)
**And** a decorator támogatja az 'ALL' és 'ANY' logikát

### AC2: PermissionGuard Implementation

**Given** endpoint @RequirePermission decorator-ral
**When** request érkezik autentikált user-től
**Then** a guard a JWT-ből kinyeri a user role-ját
**And** ellenőrzi hogy a role rendelkezik-e a szükséges permission-nel
**And** PermissionService.hasPermission() metódust használ

### AC3: 403 Forbidden Response

**Given** user nem rendelkezik a szükséges permission-nel
**When** védett endpoint-ot hív
**Then** 403 Forbidden válasz
**And** error: `{ code: 'PERMISSION_DENIED', message: 'Nincs jogosultság: {permission}' }`
**And** audit log: PERMISSION_DENIED action

### AC4: Constraint Validation Support

**Given** @RequirePermission('rental:discount') + @DiscountLimit decorator
**When** request body tartalmaz discount értéket
**Then** a constraint limit ellenőrizve (pl. ±20% BOLTVEZETO-nak)
**And** túllépés esetén 403 + constraint-specifikus hibaüzenet

### AC5: Module-Level Guard Registration

**Given** PermissionGuard a @kgc/users package-ben
**When** más modul importálja @kgc/users-t
**Then** a guard globálisan elérhető @UseGuards-szal
**And** exportálva van az index.ts-ből

### AC6: Multiple Permissions Support

**Given** @RequirePermission(['rental:view', 'rental:create'], 'ALL')
**When** request érkezik
**Then** mindkét permission megléte ellenőrizve (AND logika)
**And** @RequirePermission(['user:view', 'admin:config'], 'ANY') esetén OR logika

### AC7: Tenant Context Integration

**Given** védett endpoint hívás
**When** PermissionGuard fut
**Then** a tenant context elérhető a request-ből
**And** scope-aware permission check (LOCATION/TENANT/GLOBAL)

### AC8: Unit Tests (TDD)

**Given** TDD módszertan
**When** PermissionGuard és decorator implementálása
**Then** min 15 unit teszt
**And** min 8 E2E teszt a különböző scenariókra

---

## Tasks / Subtasks

- [x] **Task 1: @RequirePermission Decorator** (AC: #1, #6) ✅
  - [x] 1.1: `require-permission.decorator.ts` létrehozása
  - [x] 1.2: SetMetadata használata ('permissions' key)
  - [x] 1.3: Több permission támogatása (array)
  - [x] 1.4: 'ALL' (AND) és 'ANY' (OR) logika támogatása
  - [x] 1.5: Unit tesztek - decorator metaadatok (16 teszt)

- [x] **Task 2: PermissionGuard Implementation** (AC: #2, #3, #7) ✅
  - [x] 2.1: `permission.guard.ts` létrehozása (CanActivate)
  - [x] 2.2: Reflector használata metaadatok kinyerésére
  - [x] 2.3: User role kinyerése JWT-ből (request.user.role)
  - [x] 2.4: PermissionService.hasPermission() integráció
  - [x] 2.5: ForbiddenException dobása ha nincs permission
  - [x] 2.6: Tenant context elérése (request.user.tenantId)
  - [x] 2.7: Unit tesztek (TDD - 19 teszt)

- [x] **Task 3: Constraint Validation** (AC: #4) ✅
  - [x] 3.1: @CheckConstraint decorator létrehozása
  - [x] 3.2: PermissionService.getConstraint() integráció
  - [x] 3.3: ConstraintInterceptor létrehozása
  - [x] 3.4: Unit tesztek - constraint ellenőrzés (5 + 12 teszt)

- [x] **Task 4: Audit Integration** (AC: #3) ✅
  - [x] 4.1: AuditAction.PERMISSION_DENIED hozzáadása
  - [x] 4.2: Audit log hívás denied esetén
  - [x] 4.3: Permission + resource context a log-ban

- [x] **Task 5: Module Export és Integration** (AC: #5) ✅
  - [x] 5.1: PermissionGuard exportálása index.ts-ből
  - [x] 5.2: RequirePermission decorator exportálása
  - [x] 5.3: CheckConstraint és ConstraintInterceptor exportálása

- [x] **Task 6: E2E Tests** (AC: #8) ✅
  - [x] 6.1: Permission granted - happy path
  - [x] 6.2: Permission denied - 403 response
  - [x] 6.3: Multiple permissions - ALL logic
  - [x] 6.4: Multiple permissions - ANY logic
  - [x] 6.5: Constraint violation
  - [x] 6.6: Missing JWT - 403 response
  - [x] 6.7: Role inheritance test
  - [x] 6.8: Audit log verification (20 E2E teszt)

---

## Dev Notes

### Technológiai Stack (project-context.md alapján)

| Technológia | Verzió | Használat |
|-------------|--------|-----------|
| NestJS | 10.x | Backend framework, Guards, Decorators |
| TypeScript | 5.3+ | Strict mode |
| zod | 3.23.x | Validation (ha szükséges) |
| Vitest | 2.1+ | Unit tesztek |

### Meglévő Kód (Story 2.2-ből)

**FONTOS:** Az alábbi komponensek MÁR LÉTEZNEK és újra kell használni:

```typescript
// packages/core/users/src/services/permission.service.ts - MÁR LÉTEZIK!
export class PermissionService {
  private readonly roleService = new RoleService();

  getDirectPermissions(role: Role): Permission[] { ... }
  getAllPermissions(role: Role): Permission[] { ... }
  hasPermission(role: Role, permission: Permission): boolean { ... }
  getConstraint(role: Role, permission: Permission, constraintKey: string): number | undefined { ... }
  getRolesWithPermission(permission: Permission): Role[] { ... }
}
```

```typescript
// packages/core/users/src/interfaces/permission.interface.ts - MÁR LÉTEZIK!
export enum Permission {
  // 45+ permission, 12 modul
  RENTAL_VIEW = 'rental:view',
  RENTAL_CREATE = 'rental:create',
  // ... stb.
}

export enum RoleScope {
  LOCATION = 'LOCATION',
  TENANT = 'TENANT',
  GLOBAL = 'GLOBAL',
}
```

```typescript
// packages/core/users/src/interfaces/audit.interface.ts - MÁR LÉTEZIK!
export enum AuditAction {
  // ... meglévő action-ök
  ROLE_ASSIGNMENT_DENIED = 'ROLE_ASSIGNMENT_DENIED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  // PERMISSION_DENIED - HOZZÁADANDÓ
}
```

### NestJS Guard és Decorator Pattern (ADR-032 alapján)

```typescript
// Létrehozandó: packages/core/users/src/decorators/require-permission.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Permission } from '../interfaces/permission.interface';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSION_LOGIC_KEY = 'permission_logic';

export type PermissionLogic = 'ALL' | 'ANY';

/**
 * @RequirePermission decorator - single permission
 * @example @RequirePermission(Permission.RENTAL_CREATE)
 */
export function RequirePermission(permission: Permission): MethodDecorator;

/**
 * @RequirePermission decorator - multiple permissions with logic
 * @example @RequirePermission([Permission.RENTAL_VIEW, Permission.RENTAL_CREATE], 'ALL')
 */
export function RequirePermission(
  permissions: Permission[],
  logic?: PermissionLogic
): MethodDecorator;

export function RequirePermission(
  permissionOrPermissions: Permission | Permission[],
  logic: PermissionLogic = 'ALL'
): MethodDecorator {
  const permissions = Array.isArray(permissionOrPermissions)
    ? permissionOrPermissions
    : [permissionOrPermissions];

  return (target, key, descriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(target, key, descriptor);
    SetMetadata(PERMISSION_LOGIC_KEY, logic)(target, key, descriptor);
    return descriptor;
  };
}
```

```typescript
// Létrehozandó: packages/core/users/src/guards/permission.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../interfaces/permission.interface';
import { Role } from '../interfaces/user.interface';
import { PermissionService } from '../services/permission.service';
import { IAuditService, AUDIT_SERVICE, AuditAction } from '../interfaces/audit.interface';
import { PERMISSIONS_KEY, PERMISSION_LOGIC_KEY, PermissionLogic } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly permissionService = new PermissionService();

  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(AUDIT_SERVICE) private readonly auditService?: IAuditService | null
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Get required permissions from decorator metadata
    const requiredPermissions = this.reflector.get<Permission[]>(
      PERMISSIONS_KEY,
      context.getHandler()
    );

    // No permission requirement - allow
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 2. Get permission logic (ALL = AND, ANY = OR)
    const logic = this.reflector.get<PermissionLogic>(
      PERMISSION_LOGIC_KEY,
      context.getHandler()
    ) ?? 'ALL';

    // 3. Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'Nincs bejelentkezett felhasználó',
      });
    }

    const userRole = user.role as Role;

    // 4. Check permissions based on logic
    const results = requiredPermissions.map((permission) =>
      this.permissionService.hasPermission(userRole, permission)
    );

    const hasPermission = logic === 'ALL'
      ? results.every(Boolean)  // AND logic
      : results.some(Boolean);  // OR logic

    if (!hasPermission) {
      // Find missing permissions for error message
      const missingPermissions = requiredPermissions.filter(
        (_, index) => !results[index]
      );

      // Audit log
      if (this.auditService) {
        await this.auditService.log({
          action: AuditAction.PERMISSION_DENIED,
          userId: user.id,
          tenantId: user.tenantId,
          resourceType: 'ENDPOINT',
          resourceId: request.url,
          details: {
            requiredPermissions,
            missingPermissions,
            userRole,
            logic,
          },
        });
      }

      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: `Nincs jogosultság: ${missingPermissions.join(', ')}`,
      });
    }

    return true;
  }
}
```

### Controller Használati Példa

```typescript
// Használat más controller-ekben
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@kgc/auth';
import { RequirePermission, PermissionGuard, Permission } from '@kgc/users';

@Controller('api/v1/rentals')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RentalsController {
  @Get()
  @RequirePermission(Permission.RENTAL_VIEW)
  async listRentals() { ... }

  @Post()
  @RequirePermission(Permission.RENTAL_CREATE)
  async createRental() { ... }

  @Post(':id/discount')
  @RequirePermission([Permission.RENTAL_DISCOUNT, Permission.RENTAL_VIEW], 'ALL')
  async applyDiscount() { ... }
}
```

### Error Response Format

```typescript
// 403 Forbidden response
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Nincs jogosultság: rental:discount"
  }
}

// Multiple permissions missing
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Nincs jogosultság: rental:discount, inventory:adjust"
  }
}
```

### Project Structure Notes

**Új fájlok:**
```
packages/core/users/src/
├── decorators/
│   └── require-permission.decorator.ts     # NEW
├── guards/
│   └── permission.guard.ts                 # NEW
└── decorators/
    └── require-permission.decorator.spec.ts # NEW tests
    └── permission.guard.spec.ts             # NEW tests
```

**Módosított fájlok:**
- `users.module.ts` - PermissionGuard provider
- `index.ts` - új exportok (RequirePermission, PermissionGuard, PERMISSIONS_KEY)
- `interfaces/audit.interface.ts` - PERMISSION_DENIED enum value

### TDD Követelmény

**KÖTELEZŐ TDD Red-Green-Refactor:**

- `require-permission.decorator.spec.ts` - min 5 teszt:
  - Single permission metadata
  - Multiple permissions metadata
  - Default 'ALL' logic
  - Explicit 'ANY' logic
  - Function overload behavior

- `permission.guard.spec.ts` - min 10 teszt:
  - No decorator - allow all
  - Single permission - granted
  - Single permission - denied
  - Multiple permissions ALL - all granted
  - Multiple permissions ALL - one missing
  - Multiple permissions ANY - one granted
  - Multiple permissions ANY - none granted
  - Missing user - forbidden
  - Audit logging on denial
  - Role inheritance check

- E2E tests - min 8 teszt (integration)

### Previous Story Intelligence (Story 2.2)

**Learnings:**
1. **PermissionService** már implementált - `hasPermission(role, permission)` használható
2. **Role enum** létezik - 8 role (OPERATOR → SUPER_ADMIN)
3. **Permission enum** létezik - 45+ permission 12 modulban
4. **RoleScope** létezik - LOCATION, TENANT, GLOBAL
5. **Audit interface** használható - IAuditService + AUDIT_SERVICE token

**Code patterns to follow:**
```typescript
// Guard pattern (from JwtAuthGuard in @kgc/auth)
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(AUDIT_SERVICE) private readonly auditService?: IAuditService | null
  ) {}
  // ...
}

// Metadata decorator pattern
import { SetMetadata } from '@nestjs/common';
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
```

### References

- [Source: planning-artifacts/adr/ADR-032-rbac-teljes-architektura.md - Middleware Implementation, Permission Matrix]
- [Source: docs/project-context.md - TDD/ATDD, API Conventions]
- [Source: implementation-artifacts/stories/2-2-role-assignment-es-rbac.md - PermissionService, Permission enum]
- [Source: packages/core/users/src/services/permission.service.ts - hasPermission(), getConstraint()]
- [Source: packages/core/users/src/interfaces/permission.interface.ts - Permission enum]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - Clean implementation, no debug issues

### Completion Notes List

1. **TDD Megközelítés:** Minden komponens TDD Red-Green-Refactor módszerrel készült
2. **Teszt Coverage:** 233 teszt sikeres a teljes @kgc/users package-ben
   - require-permission.decorator.spec.ts: 16 teszt
   - permission.guard.spec.ts: 19 teszt
   - check-constraint.decorator.spec.ts: 5 teszt
   - constraint.interceptor.spec.ts: 12 teszt
   - permission.e2e.spec.ts: 20 E2E teszt
3. **Meglévő PermissionService újrahasználat:** hasPermission() és getConstraint() metódusok
4. **NestJS Pattern:** Standard Guard + Reflector + SetMetadata pattern követése
5. **Error Format:** Magyar nyelvű hibaüzenetek a 403 response-ban

### File List

**Új fájlok:**
- `packages/core/users/src/decorators/require-permission.decorator.ts`
- `packages/core/users/src/decorators/require-permission.decorator.spec.ts`
- `packages/core/users/src/decorators/check-constraint.decorator.ts`
- `packages/core/users/src/decorators/check-constraint.decorator.spec.ts`
- `packages/core/users/src/guards/permission.guard.ts`
- `packages/core/users/src/guards/permission.guard.spec.ts`
- `packages/core/users/src/interceptors/constraint.interceptor.ts`
- `packages/core/users/src/interceptors/constraint.interceptor.spec.ts`
- `packages/core/users/src/permission.e2e.spec.ts`

**Módosított fájlok:**
- `packages/core/users/src/interfaces/audit.interface.ts` - PERMISSION_DENIED enum hozzáadása
- `packages/core/users/src/users.module.ts` - PermissionGuard és ConstraintInterceptor regisztráció
- `packages/core/users/src/index.ts` - Új exportok hozzáadása

---

## Change Log

| Dátum | Változás | Szerző |
|-------|----------|--------|
| 2026-01-16 | Story created by create-story workflow - comprehensive Permission Guard developer guide | Claude Opus 4.5 |
| 2026-01-16 | Story implemented - TDD approach, 233 tests passing | Claude Opus 4.5 |
