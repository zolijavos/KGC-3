# Story 2.4: Elevated Access Requirement

**Status:** done
**Epic:** Epic 2 - User Management (@kgc/users)
**Package:** `packages/core/users/` → `@kgc/users` + `packages/core/auth/` → `@kgc/auth`
**FR:** FR18 (Elevated access requirement kritikus műveletekhez - 5 perc TTL), ADR-032

---

## Story

**As a** rendszeradmin,
**I want** kritikus műveleteknél újra-hitelesítést megkövetelni,
**So that** biztonságosabb legyen a rendszer a véletlen vagy jogosulatlan műveletek ellen.

---

## Acceptance Criteria

### AC1: ELEVATED_PERMISSIONS Definíció

**Given** ADR-032 szerinti kritikus műveletek
**When** ElevatedAccessService inicializálódik
**Then** a következő permission-ök igényelnek elevated access-t:
- `Permission.RENTAL_CANCEL` - Bérlés törlése
- `Permission.INVENTORY_ADJUST` - Készlet korrekció
- `Permission.USER_DELETE` - Felhasználó törlése
- `Permission.ADMIN_CONFIG` - Rendszer konfiguráció

### AC2: @RequireElevatedAccess Decorator

**Given** @RequireElevatedAccess() decorator endpoint-on
**When** request érkezik
**Then** a decorator metaadatokat állít be a handler-en
**And** a decorator opcionálisan elfogad egyedi TTL-t (alapértelmezett: 5 perc)
**And** kombinálható @RequirePermission decorator-ral

### AC3: ElevatedAccessGuard Implementation

**Given** endpoint @RequireElevatedAccess decorator-ral
**When** request érkezik autentikált user-től
**Then** a guard ellenőrzi az utolsó sikeres jelszó-verifikáció időpontját
**And** ha az utolsó verifikáció > 5 perce volt, 403 Forbidden válasz
**And** error: `{ code: 'ELEVATED_ACCESS_REQUIRED', message: 'Újra-hitelesítés szükséges' }`

### AC4: POST /api/v1/auth/verify-password Endpoint

**Given** autentikált user
**When** POST /api/v1/auth/verify-password endpoint-ot használom
**Then** a jelszó ellenőrzésre kerül
**And** request body: `{ password: string }`
**And** response 200: `{ data: { success: true, validUntil: ISO8601 } }`
**And** response 401: `{ error: { code: 'INVALID_PASSWORD', message: 'Hibás jelszó' } }`
**And** sikeres verifikáció után 5 percig érvényes az elevated access

### AC5: Elevated Access Session Storage

**Given** sikeres jelszó verifikáció
**When** user elevated access státusza tárolásra kerül
**Then** in-memory vagy Redis cache tárolja: `userId -> lastVerifiedAt`
**And** 5 perc TTL automatikus lejárat
**And** logout esetén a session invalidálódik

### AC6: Audit Logging

**Given** elevated access művelet
**When** user megpróbálja végrehajtani
**Then** audit log entry létrejön
**And** tartalmazza: action='ELEVATED' | 'ELEVATED_DENIED', userId, permission, timestamp
**And** sikertelen próbálkozás is naplózódik (rate limiting célra)

### AC7: Guard Ordering - PermissionGuard után fut

**Given** endpoint @RequirePermission és @RequireElevatedAccess decorator-ral
**When** request érkezik
**Then** először PermissionGuard fut (permission check)
**And** utána ElevatedAccessGuard fut (elevated check)
**And** ez biztosítja, hogy csak jogosult user kap elevated access prompt-ot

### AC8: Unit és E2E Tests (TDD)

**Given** TDD módszertan
**When** ElevatedAccessGuard és decorator implementálása
**Then** min 12 unit teszt
**And** min 8 E2E teszt a különböző scenariókra
**And** verify-password endpoint tesztek

---

## Tasks / Subtasks

- [ ] **Task 1: ELEVATED_PERMISSIONS Constant** (AC: #1)
  - [ ] 1.1: `elevated-access.constants.ts` létrehozása
  - [ ] 1.2: ELEVATED_PERMISSIONS array definíció (4 permission)
  - [ ] 1.3: ELEVATED_ACCESS_TTL_MS constant (5 * 60 * 1000 = 300000ms)
  - [ ] 1.4: `isElevatedPermission(permission)` helper function
  - [ ] 1.5: Unit tesztek - constant completeness

- [ ] **Task 2: @RequireElevatedAccess Decorator** (AC: #2)
  - [ ] 2.1: `require-elevated-access.decorator.ts` létrehozása
  - [ ] 2.2: SetMetadata használata ('elevated_access' key)
  - [ ] 2.3: Opcionális ttlMs paraméter (default: 5 perc)
  - [ ] 2.4: Unit tesztek - decorator metaadatok (6 teszt)

- [ ] **Task 3: ElevatedAccessService Implementation** (AC: #5)
  - [ ] 3.1: `elevated-access.service.ts` létrehozása
  - [ ] 3.2: In-memory Map<userId, lastVerifiedAt> tárolás
  - [ ] 3.3: `recordVerification(userId)` - timestamp rögzítés
  - [ ] 3.4: `isVerificationValid(userId, ttlMs?)` - érvényesség ellenőrzés
  - [ ] 3.5: `clearVerification(userId)` - logout esetén
  - [ ] 3.6: Unit tesztek (TDD - 10 teszt)

- [ ] **Task 4: ElevatedAccessGuard Implementation** (AC: #3, #7)
  - [ ] 4.1: `elevated-access.guard.ts` létrehozása (CanActivate)
  - [ ] 4.2: Reflector használata metaadatok kinyerésére
  - [ ] 4.3: ElevatedAccessService.isVerificationValid() integráció
  - [ ] 4.4: ForbiddenException dobása ha nincs valid verification
  - [ ] 4.5: Guard ordering: PermissionGuard után futtatás
  - [ ] 4.6: Unit tesztek (TDD - 12 teszt)

- [ ] **Task 5: Verify Password Endpoint** (AC: #4)
  - [ ] 5.1: `POST /api/v1/auth/verify-password` endpoint AuthController-ben
  - [ ] 5.2: `verifyPassword(userId, password)` AuthService-ben
  - [ ] 5.3: PasswordService.verifyPassword() integráció
  - [ ] 5.4: ElevatedAccessService.recordVerification() hívás sikeres esetén
  - [ ] 5.5: Zod DTO validáció (VerifyPasswordSchema)
  - [ ] 5.6: Unit tesztek (8 teszt)

- [ ] **Task 6: Audit Integration** (AC: #6)
  - [ ] 6.1: Extend AuditAction enum: ELEVATED_ACCESS_GRANTED, ELEVATED_ACCESS_DENIED
  - [ ] 6.2: Audit log hívás elevated check-nél
  - [ ] 6.3: Permission és resourceType context a log-ban

- [ ] **Task 7: Module Export és Integration** (AC: #7)
  - [ ] 7.1: ElevatedAccessGuard exportálása @kgc/users index.ts-ből
  - [ ] 7.2: RequireElevatedAccess decorator exportálása
  - [ ] 7.3: ElevatedAccessService exportálása
  - [ ] 7.4: Verify password endpoint @kgc/auth-ból

- [ ] **Task 8: E2E Tests** (AC: #8)
  - [ ] 8.1: Elevated access - valid verification
  - [ ] 8.2: Elevated access - expired verification
  - [ ] 8.3: Elevated access - no verification
  - [ ] 8.4: Verify password - correct password
  - [ ] 8.5: Verify password - wrong password
  - [ ] 8.6: Combined with PermissionGuard
  - [ ] 8.7: Custom TTL test
  - [ ] 8.8: Logout clears verification

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
```

```typescript
// packages/core/auth/src/services/password.service.ts - MÁR LÉTEZIK!
export class PasswordService {
  async hashPassword(password: string): Promise<string> { ... }
  async verifyPassword(password: string, hash: string): Promise<boolean> { ... }
}
```

```typescript
// packages/core/users/src/interfaces/permission.interface.ts - MÁR LÉTEZIK!
export enum Permission {
  RENTAL_CANCEL = 'rental:cancel',
  INVENTORY_ADJUST = 'inventory:adjust',
  USER_DELETE = 'user:delete',
  ADMIN_CONFIG = 'admin:config',
  // ... 45+ permission
}
```

### ELEVATED_PERMISSIONS Definíció (ADR-032 alapján)

```typescript
// Létrehozandó: packages/core/users/src/constants/elevated-access.constants.ts
import { Permission } from '../interfaces/permission.interface';

/**
 * Permissions that require elevated access (re-authentication within 5 minutes)
 * Per ADR-032: Elevated Access (Kritikus Műveletek)
 */
export const ELEVATED_PERMISSIONS: Permission[] = [
  Permission.RENTAL_CANCEL,    // Bérlés törlése - visszavonhatatlan
  Permission.INVENTORY_ADJUST, // Készlet korrekció - audit kritikus
  Permission.USER_DELETE,      // Felhasználó törlése - személyes adatok
  Permission.ADMIN_CONFIG,     // Rendszer konfiguráció - biztonsági beállítások
];

/** Elevated access TTL in milliseconds (5 minutes) */
export const ELEVATED_ACCESS_TTL_MS = 5 * 60 * 1000; // 300000ms

/** Elevated access TTL in seconds (for response) */
export const ELEVATED_ACCESS_TTL_SECONDS = 5 * 60; // 300s

/**
 * Check if a permission requires elevated access
 */
export function isElevatedPermission(permission: Permission): boolean {
  return ELEVATED_PERMISSIONS.includes(permission);
}
```

### @RequireElevatedAccess Decorator

```typescript
// Létrehozandó: packages/core/users/src/decorators/require-elevated-access.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { ELEVATED_ACCESS_TTL_MS } from '../constants/elevated-access.constants';

export const ELEVATED_ACCESS_KEY = 'elevated_access';

export interface ElevatedAccessMetadata {
  /** Time-to-live for elevated access in milliseconds */
  ttlMs: number;
}

/**
 * @RequireElevatedAccess decorator
 * Marks endpoint as requiring recent password verification
 *
 * @param ttlMs - Custom TTL in milliseconds (default: 5 minutes)
 *
 * @example
 * // Default 5 minute TTL
 * @Post(':id/cancel')
 * @UseGuards(JwtAuthGuard, PermissionGuard, ElevatedAccessGuard)
 * @RequirePermission(Permission.RENTAL_CANCEL)
 * @RequireElevatedAccess()
 * async cancelRental(@Param('id') id: string) { ... }
 *
 * @example
 * // Custom 1 minute TTL for extra sensitive operation
 * @Delete(':id')
 * @RequireElevatedAccess(60 * 1000)
 * async deleteUser(@Param('id') id: string) { ... }
 */
export function RequireElevatedAccess(ttlMs: number = ELEVATED_ACCESS_TTL_MS): MethodDecorator {
  const metadata: ElevatedAccessMetadata = { ttlMs };
  return SetMetadata(ELEVATED_ACCESS_KEY, metadata);
}
```

### ElevatedAccessService

```typescript
// Létrehozandó: packages/core/users/src/services/elevated-access.service.ts
import { Injectable } from '@nestjs/common';
import { ELEVATED_ACCESS_TTL_MS } from '../constants/elevated-access.constants';

/**
 * Service for managing elevated access (re-authentication) sessions
 * Story 2.4: Elevated Access Requirement
 *
 * Uses in-memory storage with automatic TTL expiration.
 * For production with multiple instances, consider Redis.
 */
@Injectable()
export class ElevatedAccessService {
  /** In-memory storage: userId -> lastVerifiedAt timestamp */
  private readonly verifications = new Map<string, Date>();

  /**
   * Record successful password verification
   * @param userId - User ID to record verification for
   */
  recordVerification(userId: string): void {
    this.verifications.set(userId, new Date());
  }

  /**
   * Check if user has valid elevated access
   * @param userId - User ID to check
   * @param ttlMs - Time-to-live in milliseconds (default: 5 minutes)
   * @returns true if verification is still valid
   */
  isVerificationValid(userId: string, ttlMs: number = ELEVATED_ACCESS_TTL_MS): boolean {
    const lastVerified = this.verifications.get(userId);
    if (!lastVerified) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(lastVerified.getTime() + ttlMs);
    return now < expiresAt;
  }

  /**
   * Get time until verification expires
   * @param userId - User ID to check
   * @param ttlMs - Time-to-live in milliseconds
   * @returns Remaining time in milliseconds, or 0 if expired/not found
   */
  getTimeRemaining(userId: string, ttlMs: number = ELEVATED_ACCESS_TTL_MS): number {
    const lastVerified = this.verifications.get(userId);
    if (!lastVerified) {
      return 0;
    }

    const now = new Date();
    const expiresAt = new Date(lastVerified.getTime() + ttlMs);
    const remaining = expiresAt.getTime() - now.getTime();
    return Math.max(0, remaining);
  }

  /**
   * Get expiration timestamp for response
   * @param userId - User ID
   * @param ttlMs - Time-to-live in milliseconds
   * @returns ISO8601 timestamp or null
   */
  getValidUntil(userId: string, ttlMs: number = ELEVATED_ACCESS_TTL_MS): string | null {
    const lastVerified = this.verifications.get(userId);
    if (!lastVerified) {
      return null;
    }

    const expiresAt = new Date(lastVerified.getTime() + ttlMs);
    return expiresAt.toISOString();
  }

  /**
   * Clear verification for user (on logout)
   * @param userId - User ID to clear
   */
  clearVerification(userId: string): void {
    this.verifications.delete(userId);
  }

  /**
   * Clear all verifications (for testing/admin)
   */
  clearAll(): void {
    this.verifications.clear();
  }
}
```

### ElevatedAccessGuard

```typescript
// Létrehozandó: packages/core/users/src/guards/elevated-access.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ElevatedAccessService } from '../services/elevated-access.service';
import { IAuditService, AUDIT_SERVICE, AuditAction } from '../interfaces/audit.interface';
import {
  ELEVATED_ACCESS_KEY,
  ElevatedAccessMetadata,
} from '../decorators/require-elevated-access.decorator';
import { ELEVATED_ACCESS_TTL_MS } from '../constants/elevated-access.constants';

interface AuthenticatedUser {
  id: string;
  role: string;
  tenantId: string;
}

interface AuthenticatedRequest {
  user: AuthenticatedUser | null | undefined;
  url: string;
}

@Injectable()
export class ElevatedAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly elevatedAccessService: ElevatedAccessService,
    @Optional() @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService | null
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Get elevated access metadata from decorator
    const metadata = this.reflector.get<ElevatedAccessMetadata | undefined>(
      ELEVATED_ACCESS_KEY,
      context.getHandler()
    );

    // No elevated access requirement - allow
    if (!metadata) {
      return true;
    }

    // 2. Get user from request
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // Check if user exists (should be set by JwtAuthGuard)
    if (!user || !user.id) {
      throw new ForbiddenException({
        code: 'ELEVATED_ACCESS_REQUIRED',
        message: 'Nincs bejelentkezett felhasználó',
      });
    }

    // 3. Get TTL from metadata (default: 5 minutes)
    const ttlMs = metadata.ttlMs ?? ELEVATED_ACCESS_TTL_MS;

    // 4. Check if user has valid elevated access
    const isValid = this.elevatedAccessService.isVerificationValid(user.id, ttlMs);

    if (!isValid) {
      // Audit log - elevated access denied
      if (this.auditService) {
        await this.auditService.log({
          action: AuditAction.ELEVATED_ACCESS_DENIED,
          userId: user.id,
          tenantId: user.tenantId,
          resourceType: 'ENDPOINT',
          resourceId: request.url,
          details: {
            reason: 'No valid elevated access session',
            requiredTtlMs: ttlMs,
          },
        });
      }

      throw new ForbiddenException({
        code: 'ELEVATED_ACCESS_REQUIRED',
        message: 'Újra-hitelesítés szükséges',
        validUntil: null,
      });
    }

    // 5. Audit log - elevated access granted
    if (this.auditService) {
      await this.auditService.log({
        action: AuditAction.ELEVATED_ACCESS_GRANTED,
        userId: user.id,
        tenantId: user.tenantId,
        resourceType: 'ENDPOINT',
        resourceId: request.url,
        details: {
          remainingMs: this.elevatedAccessService.getTimeRemaining(user.id, ttlMs),
        },
      });
    }

    return true;
  }
}
```

### Verify Password Endpoint (AuthController)

```typescript
// Bővítendő: packages/core/auth/src/auth.controller.ts
import { Post, Body, UseGuards, Req, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { VerifyPasswordDto, verifyPasswordSchema } from './dto/verify-password.dto';

@Controller('api/v1/auth')
export class AuthController {
  // ... existing methods ...

  /**
   * Verify password for elevated access
   * Story 2.4: Elevated Access Requirement
   *
   * POST /api/v1/auth/verify-password
   */
  @Post('verify-password')
  @UseGuards(JwtAuthGuard)
  async verifyPassword(
    @Body() body: unknown,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ): Promise<Response> {
    // 1. Validate input
    const validation = verifyPasswordSchema.safeParse(body);
    if (!validation.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Hibás bemeneti adat',
          fields: validation.error.flatten().fieldErrors,
        },
      });
    }

    // 2. Get current user
    const user = req.user;
    if (!user?.id) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Nincs bejelentkezett felhasználó',
        },
      });
    }

    // 3. Verify password
    try {
      const result = await this.authService.verifyPasswordForElevatedAccess(
        user.id,
        validation.data.password
      );

      return res.status(HttpStatus.OK).json({
        data: {
          success: true,
          validUntil: result.validUntil,
        },
      });
    } catch (error) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Hibás jelszó',
        },
      });
    }
  }
}
```

### VerifyPassword DTO

```typescript
// Létrehozandó: packages/core/auth/src/dto/verify-password.dto.ts
import { z } from 'zod';

export const verifyPasswordSchema = z.object({
  password: z.string().min(1, 'Jelszó megadása kötelező'),
});

export type VerifyPasswordDto = z.infer<typeof verifyPasswordSchema>;

export interface VerifyPasswordResponse {
  data: {
    success: boolean;
    validUntil: string; // ISO8601
  };
}
```

### AuthService Extension

```typescript
// Bővítendő: packages/core/auth/src/auth.service.ts
import { ElevatedAccessService } from '@kgc/users';
import { ELEVATED_ACCESS_TTL_MS } from '@kgc/users';

@Injectable()
export class AuthService {
  constructor(
    // ... existing dependencies ...
    @Optional() private readonly elevatedAccessService?: ElevatedAccessService | null
  ) {}

  /**
   * Verify password for elevated access
   * Story 2.4: Records verification timestamp on success
   *
   * @param userId - User ID
   * @param password - Password to verify
   * @returns { validUntil: ISO8601 }
   * @throws Error('Invalid password') if verification fails
   */
  async verifyPasswordForElevatedAccess(
    userId: string,
    password: string
  ): Promise<{ validUntil: string }> {
    // 1. Get user
    const user = await this.findUserById(userId);
    if (!user) {
      throw new Error('Invalid password');
    }

    // 2. Get password hash from database
    const userWithHash = await this.findUserWithPasswordHash(userId);
    if (!userWithHash) {
      throw new Error('Invalid password');
    }

    // 3. Verify password
    const isValid = await this.passwordService.verifyPassword(
      password,
      userWithHash.passwordHash
    );

    if (!isValid) {
      throw new Error('Invalid password');
    }

    // 4. Record verification
    if (this.elevatedAccessService) {
      this.elevatedAccessService.recordVerification(userId);
    }

    // 5. Calculate validUntil
    const validUntil = new Date(Date.now() + ELEVATED_ACCESS_TTL_MS).toISOString();

    return { validUntil };
  }

  // Helper to get user with password hash
  private async findUserWithPasswordHash(userId: string): Promise<{
    passwordHash: string;
  } | null> {
    if (!this.prisma) {
      return null;
    }

    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
  }
}
```

### Controller Használati Példa

```typescript
// Használat más controller-ekben
import { Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@kgc/auth';
import {
  RequirePermission,
  PermissionGuard,
  Permission,
  RequireElevatedAccess,
  ElevatedAccessGuard,
} from '@kgc/users';

@Controller('api/v1/rentals')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RentalsController {
  // Normal endpoint - only permission check
  @Get()
  @RequirePermission(Permission.RENTAL_VIEW)
  async listRentals() { ... }

  // Elevated access endpoint - permission + re-auth required
  @Post(':id/cancel')
  @UseGuards(ElevatedAccessGuard)  // Add after PermissionGuard
  @RequirePermission(Permission.RENTAL_CANCEL)
  @RequireElevatedAccess()
  async cancelRental(@Param('id') id: string) { ... }

  // Custom TTL (1 minute) for extra sensitive operation
  @Delete(':id/force')
  @UseGuards(ElevatedAccessGuard)
  @RequirePermission(Permission.RENTAL_CANCEL)
  @RequireElevatedAccess(60 * 1000)  // 1 minute
  async forceDeleteRental(@Param('id') id: string) { ... }
}
```

### Error Response Format

```typescript
// 403 Forbidden - Elevated access required
{
  "error": {
    "code": "ELEVATED_ACCESS_REQUIRED",
    "message": "Újra-hitelesítés szükséges",
    "validUntil": null
  }
}

// 401 Unauthorized - Wrong password
{
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "Hibás jelszó"
  }
}

// 200 OK - Successful verification
{
  "data": {
    "success": true,
    "validUntil": "2026-01-16T10:05:00.000Z"
  }
}
```

### Project Structure Notes

**Új fájlok:**
```
packages/core/users/src/
├── constants/
│   └── elevated-access.constants.ts        # NEW
│   └── elevated-access.constants.spec.ts   # NEW tests
├── decorators/
│   └── require-elevated-access.decorator.ts      # NEW
│   └── require-elevated-access.decorator.spec.ts # NEW tests
├── services/
│   └── elevated-access.service.ts          # NEW
│   └── elevated-access.service.spec.ts     # NEW tests
├── guards/
│   └── elevated-access.guard.ts            # NEW
│   └── elevated-access.guard.spec.ts       # NEW tests
└── elevated-access.e2e.spec.ts             # NEW E2E tests

packages/core/auth/src/
├── dto/
│   └── verify-password.dto.ts              # NEW
└── auth.controller.ts                      # EXTEND
└── auth.service.ts                         # EXTEND
```

**Módosított fájlok:**
- `packages/core/users/src/users.module.ts` - ElevatedAccessGuard, ElevatedAccessService regisztráció
- `packages/core/users/src/index.ts` - új exportok
- `packages/core/users/src/interfaces/audit.interface.ts` - ELEVATED_ACCESS_GRANTED, ELEVATED_ACCESS_DENIED
- `packages/core/auth/src/auth.controller.ts` - verify-password endpoint
- `packages/core/auth/src/auth.service.ts` - verifyPasswordForElevatedAccess method
- `packages/core/auth/src/index.ts` - új exportok

### TDD Követelmény

**KÖTELEZŐ TDD Red-Green-Refactor:**

- `elevated-access.constants.spec.ts` - min 4 teszt:
  - ELEVATED_PERMISSIONS contains expected permissions
  - ELEVATED_ACCESS_TTL_MS is 5 minutes
  - isElevatedPermission() - true for elevated
  - isElevatedPermission() - false for non-elevated

- `require-elevated-access.decorator.spec.ts` - min 6 teszt:
  - Default TTL metadata
  - Custom TTL metadata
  - Metadata key correctness
  - Combined with other decorators
  - Type safety

- `elevated-access.service.spec.ts` - min 10 teszt:
  - recordVerification() stores timestamp
  - isVerificationValid() - true within TTL
  - isVerificationValid() - false after TTL
  - isVerificationValid() - false if never verified
  - getTimeRemaining() - correct value
  - getValidUntil() - ISO8601 format
  - clearVerification() removes entry
  - clearAll() removes all entries
  - Custom TTL support

- `elevated-access.guard.spec.ts` - min 12 teszt:
  - No decorator - allow all
  - Valid verification - allow
  - Expired verification - 403
  - No verification - 403
  - Missing user - 403
  - Custom TTL - respected
  - Audit logging on allow
  - Audit logging on deny
  - Error message format

- E2E tests - min 8 teszt (integration)

### Audit Extension

```typescript
// Bővítendő: packages/core/users/src/interfaces/audit.interface.ts
export enum AuditAction {
  // ... existing
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // Story 2.4 - Elevated Access
  ELEVATED_ACCESS_GRANTED = 'ELEVATED_ACCESS_GRANTED',
  ELEVATED_ACCESS_DENIED = 'ELEVATED_ACCESS_DENIED',
}
```

### Previous Story Intelligence (Story 2.3)

**Learnings:**
1. **PermissionGuard pattern** - Reflector + SetMetadata + CanActivate
2. **Audit integration** - Optional injection with AUDIT_SERVICE token
3. **Error response format** - `{ error: { code, message } }`
4. **Guard ordering** - Multiple guards execute in order specified in @UseGuards
5. **Test patterns** - createMockExecutionContext, createMockReflector helpers

**Code patterns to follow:**
```typescript
// Guard pattern (from PermissionGuard)
@Injectable()
export class ElevatedAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly elevatedAccessService: ElevatedAccessService,
    @Optional() @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService | null
  ) {}
  // ...
}

// Decorator pattern (from RequirePermission)
export function RequireElevatedAccess(ttlMs?: number): MethodDecorator {
  return SetMetadata(ELEVATED_ACCESS_KEY, { ttlMs: ttlMs ?? ELEVATED_ACCESS_TTL_MS });
}
```

### References

- [Source: planning-artifacts/adr/ADR-032-rbac-teljes-architektura.md - Elevated Access, ELEVATED_PERMISSIONS]
- [Source: planning-artifacts/epics.md - FR18: Elevated access requirement]
- [Source: docs/project-context.md - TDD/ATDD, API Conventions]
- [Source: implementation-artifacts/stories/2-3-permission-check-middleware.md - Guard patterns, Decorator patterns]
- [Source: packages/core/users/src/guards/permission.guard.ts - CanActivate pattern]
- [Source: packages/core/auth/src/services/password.service.ts - verifyPassword()]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- All 8 Acceptance Criteria implemented with TDD approach
- ElevatedAccessService uses in-memory Map with automatic cleanup
- Cross-package DI through IElevatedAccessService interface
- Rate limiting added to verify-password endpoint (P1 fix)
- Memory leak prevention with cleanup mechanism (P2 fix)
- Singleton service instance across modules (P3 fix)
- Audit logging for password verification events (P4 fix)
- TTL parameter validation in decorator (P6 fix)

### File List

**New Files (Story 2.4):**
```
packages/core/users/src/
├── constants/
│   ├── elevated-access.constants.ts        # ELEVATED_PERMISSIONS, TTL constants
│   └── elevated-access.constants.spec.ts   # 4 unit tests
├── decorators/
│   ├── require-elevated-access.decorator.ts      # @RequireElevatedAccess
│   └── require-elevated-access.decorator.spec.ts # 6 unit tests
├── services/
│   ├── elevated-access.service.ts          # Session management with cleanup
│   └── elevated-access.service.spec.ts     # 10 unit tests
├── guards/
│   ├── elevated-access.guard.ts            # CanActivate guard
│   └── elevated-access.guard.spec.ts       # 12 unit tests
└── elevated-access.e2e.spec.ts             # 20 E2E tests

packages/core/auth/src/
├── dto/
│   ├── verify-password.dto.ts              # Zod validation schema
│   ├── verify-password.dto.spec.ts         # 14 unit tests
│   ├── verify-password-response.dto.ts     # Response DTO
│   └── verify-password-response.dto.spec.ts # 14 unit tests
└── interfaces/
    └── elevated-access.interface.ts        # IElevatedAccessService interface
```

**Modified Files:**
```
packages/core/users/src/
├── users.module.ts      # ElevatedAccessService, ElevatedAccessGuard registration
└── index.ts             # Story 2.4 exports

packages/core/auth/src/
├── auth.module.ts       # ELEVATED_ACCESS_SERVICE provider (useExisting)
├── auth.service.ts      # verifyPasswordForElevatedAccess() + audit logging
├── auth.controller.ts   # POST /api/v1/auth/verify-password + rate limiting
└── index.ts             # IElevatedAccessService, verify-password DTO exports

packages/core/users/src/interfaces/
└── audit.interface.ts   # ELEVATED_ACCESS_GRANTED, ELEVATED_ACCESS_DENIED
```

---

## Change Log

| Dátum | Változás | Szerző |
|-------|----------|--------|
| 2026-01-16 | Story created by create-story workflow - comprehensive Elevated Access developer guide | Claude Opus 4.5 |
| 2026-01-16 | Implementation complete - all 8 ACs, 558 tests passing | Claude Opus 4.5 |
| 2026-01-16 | Code review fixes: P1 rate limiting, P2 memory cleanup, P3 singleton instance, P4 audit logging, P6 TTL validation | Claude Opus 4.5 |
