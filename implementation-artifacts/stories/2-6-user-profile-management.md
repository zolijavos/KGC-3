# Story 2.6: User Profile Management

**Status:** done
**Epic:** Epic 2 - User Management (@kgc/users)
**Package:** `packages/core/users/` → `@kgc/users`
**FR:** FR21 (User Profile Management), ADR-032

---

## Story

**As a** felhasználó,
**I want** saját profilomat kezelni,
**So that** személyes adataim naprakészek legyenek.

---

## Acceptance Criteria

### AC1: GET /users/me Endpoint

**Given** bejelentkezett user JWT token-nel
**When** GET /api/v1/users/me
**Then** saját profil adatok visszatérnek
**And** response tartalmazza: id, email, name, role, phone, avatarUrl
**And** NEM tartalmaz: passwordHash, pinHash (szenzitív adatok)
**And** response format: `{ data: { ...profile } }`

### AC2: PUT /users/me Endpoint

**Given** bejelentkezett user
**When** PUT /api/v1/users/me a módosított adatokkal
**Then** profil frissül az adatbázisban
**And** csak a megengedett mezők módosíthatók: name, phone, avatarUrl
**And** response: frissített profil adatok
**And** email és role NEM módosítható ezen az endpoint-on

### AC3: Új User Mezők (Prisma Schema Update)

**Given** User model a Prisma schema-ban
**When** Story implementálva
**Then** új mezők hozzáadva:
- `phone` (String? @db.VarChar(20)) - telefon szám
- `avatarUrl` (String? @db.VarChar(500)) - avatar URL
**And** migration létrehozva

### AC4: PIN Kód Módosítás

**Given** bejelentkezett user
**When** PUT /api/v1/users/me/pin új PIN kóddal
**Then** PIN kód frissül bcrypt hash-sel
**And** régi PIN validálása szükséges (current_pin mező)
**And** új PIN 4-6 számjegy validáció
**And** response: `{ data: { success: true, message: 'PIN sikeresen módosítva' } }`

### AC5: Input Validáció

**Given** profil frissítési kérés
**When** validálás fut
**Then** zod schema validálja:
- name: min 2, max 255 karakter
- phone: opcionális, magyar formátum (+36...) vagy üres
- avatarUrl: opcionális, valid URL vagy üres
- currentPin: 4-6 számjegy (PIN módosításnál)
- newPin: 4-6 számjegy (PIN módosításnál)
**And** validation error: `{ error: { code: 'VALIDATION_ERROR', fields: {...} } }`

### AC6: Audit Logging

**Given** profil módosítás
**When** PUT /users/me sikeres
**Then** audit log entry: action='USER_PROFILE_UPDATED'
**And** tartalmazza: userId, módosított mezők (név, nem érték!)
**And** PIN módosításnál: action='USER_PIN_CHANGED' (érték nélkül!)

### AC7: TDD Unit és E2E Tests

**Given** TDD módszertan
**When** implementáció
**Then** min 10 unit teszt
**And** min 8 E2E teszt
**And** coverage: happy path, validation errors, edge cases

---

## Tasks / Subtasks

- [x] **Task 1: Prisma Schema Update** (AC: #3) ✅
  - [x] 1.1: User model kiegészítése `phone` mezővel (String? @db.VarChar(20))
  - [x] 1.2: User model kiegészítése `avatarUrl` mezővel (String? @db.VarChar(500))
  - [x] 1.3: Prisma migration generálás és futtatás
  - [x] 1.4: Prisma client regenerálás

- [x] **Task 2: Profile DTOs** (AC: #1, #2, #5) ✅
  - [x] 2.1: `profile-response.dto.ts` létrehozása (ProfileResponse interface)
  - [x] 2.2: `update-profile.dto.ts` létrehozása (zod schema + validation)
  - [x] 2.3: `update-pin.dto.ts` létrehozása (currentPin, newPin validáció)
  - [x] 2.4: Unit tesztek a DTO validációkra (TDD) - 102 teszt!

- [x] **Task 3: UsersService Profile Methods** (AC: #1, #2, #4) ✅
  - [x] 3.1: `getProfile(userId: string)` metódus
  - [x] 3.2: `updateProfile(userId: string, dto: UpdateProfileDto)` metódus
  - [x] 3.3: `updatePin(userId: string, currentPin: string, newPin: string)` metódus
  - [x] 3.4: PIN bcrypt hash és verify logika
  - [x] 3.5: Unit tesztek (TDD) - 59 teszt a service-ben!

- [x] **Task 4: Controller Endpoints** (AC: #1, #2, #4) ✅
  - [x] 4.1: GET /api/v1/users/me endpoint
  - [x] 4.2: PUT /api/v1/users/me endpoint
  - [x] 4.3: PUT /api/v1/users/me/pin endpoint
  - [x] 4.4: Error handling és response formatting

- [x] **Task 5: Audit Integration** (AC: #6) ✅
  - [x] 5.1: Extend AuditAction enum: USER_PROFILE_UPDATED, USER_PIN_CHANGED
  - [x] 5.2: Audit log hívás profile update-nél
  - [x] 5.3: Audit log hívás PIN change-nél (érték nélkül!)

- [x] **Task 6: Module Export és Integration** ✅
  - [x] 6.1: Új DTOs exportálása index.ts-ből
  - [x] 6.2: UserResponse interface kiegészítése phone, avatarUrl mezőkkel

- [x] **Task 7: E2E Tests** (AC: #7) ✅ - 9 E2E teszt!
  - [x] 7.1: GET /users/me - authenticated user
  - [x] 7.2: GET /users/me - user not found → 404
  - [x] 7.3: PUT /users/me - update name + phone
  - [x] 7.4: PUT /users/me - invalid phone format → 400
  - [x] 7.5: PUT /users/me - clear phone (empty string → null)
  - [x] 7.6: PUT /users/me/pin - success
  - [x] 7.7: PUT /users/me/pin - wrong current PIN → 403
  - [x] 7.8: PUT /users/me/pin - short PIN → 400
  - [x] 7.9: PUT /users/me/pin - non-numeric PIN → 400

---

## Dev Notes

### Technológiai Stack (project-context.md alapján)

| Technológia | Verzió | Használat |
|-------------|--------|-----------|
| NestJS | 10.x | Backend framework, Controller |
| TypeScript | 5.3+ | Strict mode |
| zod | 3.23.x | DTO Validation |
| bcrypt | 5.x | PIN hash |
| Vitest | 2.1+ | Unit tesztek |

### Meglévő Kód Újrahasználás

**FONTOS:** Az alábbi komponensek MÁR LÉTEZNEK és újra kell használni:

```typescript
// packages/core/users/src/users.controller.ts - MÁR LÉTEZIK!
// Új endpoints-okat ide kell hozzáadni

// packages/core/users/src/users.service.ts - MÁR LÉTEZIK!
// Új profile metódusokat ide kell hozzáadni

// packages/core/users/src/interfaces/user.interface.ts - MÁR LÉTEZIK!
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
  locationId?: string | null;
  status: UserStatus;
  // ÚJ: phone, avatarUrl
}

// packages/core/auth/prisma/schema.prisma - MÁR LÉTEZIK!
// User model kiegészítendő: phone, avatarUrl

// packages/core/users/src/interfaces/audit.interface.ts - MÁR LÉTEZIK!
export enum AuditAction {
  // ... existing
  // ÚJ: USER_PROFILE_UPDATED, USER_PIN_CHANGED
}
```

### Profile Response DTO Pattern

```typescript
// Létrehozandó: packages/core/users/src/dto/profile-response.dto.ts
import { z } from 'zod';

/**
 * Profile response - csak a nyilvános mezők
 * SOHA nem tartalmaz: passwordHash, pinHash
 */
export interface ProfileResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  locationId: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * Format user to profile response
 * Explicit field mapping - security by design
 */
export function formatProfileResponse(user: any): ProfileResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    locationId: user.locationId ?? null,
    phone: user.phone ?? null,
    avatarUrl: user.avatarUrl ?? null,
    status: user.status,
    createdAt: user.createdAt instanceof Date
      ? user.createdAt.toISOString()
      : user.createdAt,
    updatedAt: user.updatedAt instanceof Date
      ? user.updatedAt.toISOString()
      : user.updatedAt,
  };
}
```

### Update Profile DTO Pattern

```typescript
// Létrehozandó: packages/core/users/src/dto/update-profile.dto.ts
import { z } from 'zod';

/**
 * Hungarian phone validation regex
 * Formats: +36 20 123 4567, 06201234567, +36-30-1234567
 */
const HUNGARIAN_PHONE_REGEX = /^(\+36|06)[ -]?(20|30|31|50|70)[ -]?\d{3}[ -]?\d{4}$/;

export const updateProfileSchema = z.object({
  name: z.string()
    .min(2, 'A név legalább 2 karakter')
    .max(255, 'A név maximum 255 karakter')
    .optional(),
  phone: z.string()
    .regex(HUNGARIAN_PHONE_REGEX, 'Érvénytelen magyar telefonszám formátum')
    .or(z.literal(''))
    .nullish()
    .transform(val => val === '' ? null : val),
  avatarUrl: z.string()
    .url('Érvénytelen URL formátum')
    .max(500, 'Az URL maximum 500 karakter')
    .or(z.literal(''))
    .nullish()
    .transform(val => val === '' ? null : val),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export interface UpdateProfileValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields?: Record<string, string>;
}

export function validateUpdateProfileInput(input: unknown):
  | { success: true; data: UpdateProfileDto }
  | { success: false; error: UpdateProfileValidationError } {
  const result = updateProfileSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fields: Record<string, string> = {};
  for (const error of result.error.errors) {
    const path = error.path.join('.');
    fields[path] = error.message;
  }

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      fields,
    },
  };
}
```

### Update PIN DTO Pattern

```typescript
// Létrehozandó: packages/core/users/src/dto/update-pin.dto.ts
import { z } from 'zod';

/**
 * PIN validation: 4-6 digits
 */
const PIN_REGEX = /^\d{4,6}$/;

export const updatePinSchema = z.object({
  currentPin: z.string()
    .regex(PIN_REGEX, 'A jelenlegi PIN 4-6 számjegy'),
  newPin: z.string()
    .regex(PIN_REGEX, 'Az új PIN 4-6 számjegy'),
});

export type UpdatePinDto = z.infer<typeof updatePinSchema>;

export interface UpdatePinResponse {
  success: boolean;
  message: string;
}

export function validateUpdatePinInput(input: unknown):
  | { success: true; data: UpdatePinDto }
  | { success: false; error: { code: string; message: string; fields?: Record<string, string> } } {
  const result = updatePinSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fields: Record<string, string> = {};
  for (const error of result.error.errors) {
    const path = error.path.join('.');
    fields[path] = error.message;
  }

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      fields,
    },
  };
}
```

### Controller Pattern (GET /users/me)

```typescript
// Hozzáadandó: packages/core/users/src/users.controller.ts

/**
 * GET /api/v1/users/me - Get current user profile
 * Story 2.6: User Profile Management
 * AC1: Saját profil megtekintése
 */
@Get('me')
async getProfile(
  @Req() req: AuthenticatedRequest,
  @Res() res: Response
): Promise<Response> {
  try {
    const profile = await this.usersService.getProfile(req.user.id);
    return res.status(HttpStatus.OK).json({ data: profile });
  } catch (error) {
    return this.handleError(error, res);
  }
}

/**
 * PUT /api/v1/users/me - Update current user profile
 * Story 2.6: User Profile Management
 * AC2: Profil módosítás (name, phone, avatarUrl)
 */
@Put('me')
async updateProfile(
  @Body() body: unknown,
  @Req() req: AuthenticatedRequest,
  @Res() res: Response
): Promise<Response> {
  const validation = validateUpdateProfileInput(body);
  if (!validation.success) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      error: validation.error,
    });
  }

  try {
    const profile = await this.usersService.updateProfile(
      req.user.id,
      validation.data
    );
    return res.status(HttpStatus.OK).json({ data: profile });
  } catch (error) {
    return this.handleError(error, res);
  }
}

/**
 * PUT /api/v1/users/me/pin - Update current user PIN
 * Story 2.6: User Profile Management
 * AC4: PIN kód módosítás
 */
@Put('me/pin')
async updatePin(
  @Body() body: unknown,
  @Req() req: AuthenticatedRequest,
  @Res() res: Response
): Promise<Response> {
  const validation = validateUpdatePinInput(body);
  if (!validation.success) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      error: validation.error,
    });
  }

  try {
    const result = await this.usersService.updatePin(
      req.user.id,
      validation.data.currentPin,
      validation.data.newPin
    );
    return res.status(HttpStatus.OK).json({ data: result });
  } catch (error) {
    return this.handleError(error, res);
  }
}
```

### Service Methods Pattern

```typescript
// Hozzáadandó: packages/core/users/src/users.service.ts
import * as bcrypt from 'bcrypt';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { formatProfileResponse, ProfileResponse } from './dto/profile-response.dto';

/**
 * Get user profile
 * @param userId - Current user ID
 * @returns Profile without sensitive fields
 */
async getProfile(userId: string): Promise<ProfileResponse> {
  const user = await this.getUserById(userId);
  if (!user) {
    throw new NotFoundException({
      code: 'USER_NOT_FOUND',
      message: 'Felhasználó nem található',
    });
  }
  return formatProfileResponse(user);
}

/**
 * Update user profile
 * @param userId - Current user ID
 * @param dto - Update data (name, phone, avatarUrl)
 * @returns Updated profile
 */
async updateProfile(
  userId: string,
  dto: UpdateProfileDto
): Promise<ProfileResponse> {
  // Build update data - only non-undefined values
  const updateData: Record<string, unknown> = {};
  if (dto.name !== undefined) updateData.name = dto.name;
  if (dto.phone !== undefined) updateData.phone = dto.phone;
  if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;

  // Skip if nothing to update
  if (Object.keys(updateData).length === 0) {
    return this.getProfile(userId);
  }

  const updated = await this.prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  // Audit log
  if (this.auditService) {
    await this.auditService.log({
      action: AuditAction.USER_PROFILE_UPDATED,
      userId,
      tenantId: updated.tenantId,
      resourceType: 'USER_PROFILE',
      resourceId: userId,
      details: { updatedFields: Object.keys(updateData) },
    });
  }

  return formatProfileResponse(updated);
}

/**
 * Update user PIN
 * @param userId - Current user ID
 * @param currentPin - Current PIN for verification
 * @param newPin - New PIN to set
 * @returns Success response
 */
async updatePin(
  userId: string,
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; message: string }> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, pinHash: true, tenantId: true },
  });

  if (!user) {
    throw new NotFoundException({
      code: 'USER_NOT_FOUND',
      message: 'Felhasználó nem található',
    });
  }

  // Verify current PIN if user has one
  if (user.pinHash) {
    const isValid = await bcrypt.compare(currentPin, user.pinHash);
    if (!isValid) {
      throw new ForbiddenException({
        code: 'INVALID_PIN',
        message: 'Érvénytelen jelenlegi PIN kód',
      });
    }
  }

  // Hash new PIN
  const BCRYPT_ROUNDS = 10;
  const newPinHash = await bcrypt.hash(newPin, BCRYPT_ROUNDS);

  // Update PIN
  await this.prisma.user.update({
    where: { id: userId },
    data: { pinHash: newPinHash },
  });

  // Audit log (NO PIN value!)
  if (this.auditService) {
    await this.auditService.log({
      action: AuditAction.USER_PIN_CHANGED,
      userId,
      tenantId: user.tenantId,
      resourceType: 'USER_PIN',
      resourceId: userId,
      details: { pinChanged: true }, // NO actual PIN value!
    });
  }

  return {
    success: true,
    message: 'PIN sikeresen módosítva',
  };
}
```

### Prisma Schema Update

```prisma
// Módosítandó: packages/core/auth/prisma/schema.prisma

model User {
  id           String     @id @default(uuid()) @db.Uuid
  email        String     @unique @db.VarChar(255)
  passwordHash String     @map("password_hash") @db.VarChar(255)
  name         String     @db.VarChar(255)
  role         Role       @default(OPERATOR)
  tenantId     String     @map("tenant_id") @db.Uuid
  locationId   String?    @map("location_id") @db.Uuid
  status       UserStatus @default(ACTIVE)
  pinHash      String?    @map("pin_hash") @db.VarChar(255)

  // Story 2.6: Profile fields
  phone        String?    @db.VarChar(20)
  avatarUrl    String?    @map("avatar_url") @db.VarChar(500)

  // Soft delete
  deletedAt    DateTime?  @map("deleted_at") @db.Timestamptz
  deletedEmail String?    @map("deleted_email") @db.VarChar(255)

  // Timestamps
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  refreshTokens       RefreshToken[]
  passwordResetTokens PasswordResetToken[]

  // Indexes
  @@index([email])
  @@index([tenantId])
  @@index([role])
  @@index([status])
  @@index([tenantId, locationId])
  @@map("users")
}
```

### Error Response Format

```typescript
// 400 Bad Request - Validation error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "fields": {
      "phone": "Érvénytelen magyar telefonszám formátum"
    }
  }
}

// 401 Unauthorized - No auth
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}

// 403 Forbidden - Invalid PIN
{
  "error": {
    "code": "INVALID_PIN",
    "message": "Érvénytelen jelenlegi PIN kód"
  }
}

// 404 Not Found - User not found
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "Felhasználó nem található"
  }
}
```

### Project Structure Notes

**Új fájlok:**
```
packages/core/users/src/
├── dto/
│   ├── profile-response.dto.ts          # NEW
│   ├── profile-response.dto.spec.ts     # NEW tests
│   ├── update-profile.dto.ts            # NEW
│   ├── update-profile.dto.spec.ts       # NEW tests
│   ├── update-pin.dto.ts                # NEW
│   └── update-pin.dto.spec.ts           # NEW tests
└── profile.e2e.spec.ts                  # NEW E2E tests
```

**Módosított fájlok:**
- `packages/core/auth/prisma/schema.prisma` - User model: phone, avatarUrl
- `packages/core/users/src/users.controller.ts` - /me endpoints
- `packages/core/users/src/users.service.ts` - profile methods
- `packages/core/users/src/interfaces/user.interface.ts` - User, UserResponse kiegészítés
- `packages/core/users/src/interfaces/audit.interface.ts` - USER_PROFILE_UPDATED, USER_PIN_CHANGED
- `packages/core/users/src/index.ts` - új exportok

### TDD Követelmény

**KÖTELEZŐ TDD Red-Green-Refactor:**

- DTO tesztek (min 6 teszt):
  - updateProfileSchema valid input
  - updateProfileSchema invalid phone
  - updateProfileSchema invalid URL
  - updatePinSchema valid input
  - updatePinSchema invalid PIN format
  - formatProfileResponse excludes sensitive data

- Service tesztek (min 10 teszt):
  - getProfile() returns profile
  - getProfile() not found
  - updateProfile() updates name
  - updateProfile() updates phone
  - updateProfile() updates avatarUrl
  - updateProfile() no changes
  - updatePin() success
  - updatePin() wrong current PIN
  - updatePin() user not found
  - updatePin() first PIN (no current)

- E2E tesztek (min 8 teszt):
  - Per AC7 requirements

### Audit Extension

```typescript
// Bővítendő: packages/core/users/src/interfaces/audit.interface.ts
export enum AuditAction {
  // ... existing
  SCOPE_GRANTED = 'SCOPE_GRANTED',
  SCOPE_DENIED = 'SCOPE_DENIED',

  // Story 2.6 - User Profile
  USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED',
  USER_PIN_CHANGED = 'USER_PIN_CHANGED',
}
```

### Previous Story Intelligence (Story 2.5)

**Learnings:**
1. **TDD pattern** - Write tests first, then implement
2. **exactOptionalPropertyTypes** - Use `?? null` for undefined → null conversion
3. **Guard ordering** - JwtAuthGuard must be first
4. **Test counts** - Exceeded minimums consistently (27, 48, 32 tests)
5. **Audit integration** - Optional injection with AUDIT_SERVICE token

### FONTOS Routing Megjegyzés

A `/users/me` route ELŐTT kell definiálni a `/users/:id` route előtt a NestJS controller-ben, különben a "me" string id-ként értelmeződik!

```typescript
// HELYES sorrend:
@Get('me')      // Ez előbb!
@Get(':id')     // Ez később!

// HELYTELEN sorrend:
@Get(':id')     // "me" → id paraméterként értelmezi
@Get('me')      // Soha nem éri el
```

### References

- [Source: planning-artifacts/epics.md - Story 2.6: User Profile Management]
- [Source: docs/project-context.md - TDD/ATDD, API Conventions]
- [Source: implementation-artifacts/stories/2-5-tenant-es-location-scoped-permissions.md - Previous story patterns]
- [Source: packages/core/users/src/users.controller.ts - Existing controller pattern]
- [Source: packages/core/users/src/users.service.ts - Existing service pattern]
- [Source: packages/core/auth/prisma/schema.prisma - User model]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- bcrypt mock issue: "Cannot redefine property: compare" - resolved by using file-level vi.mock
- Controller parameter order: @Body() decorator requires body as first parameter
- Route ordering: /me routes must be defined BEFORE /:id routes in NestJS controller

### Completion Notes List

1. **Prisma Schema**: Added phone (VarChar 20) and avatarUrl (VarChar 500) fields to User model
2. **DTOs**: Created 3 new DTOs with comprehensive Zod validation (102 DTO tests)
3. **Service Methods**: Implemented getProfile, updateProfile, updatePin with bcrypt PIN hashing
4. **Controller Endpoints**: Added 3 new /me endpoints with proper error handling
5. **Audit Integration**: Extended AuditAction enum with USER_PROFILE_UPDATED, USER_PIN_CHANGED
6. **Tests**: Total 590 tests passing (including 9 new E2E tests for Story 2.6)
7. **Hungarian Phone Validation**: Regex supports +36/06 formats with mobile prefixes (20,30,31,50,70)
8. **Security**: formatProfileResponse explicitly excludes passwordHash and pinHash

### File List

**New Files Created:**
- `packages/core/users/src/dto/profile-response.dto.ts` - Profile response DTO with formatProfileResponse helper
- `packages/core/users/src/dto/profile-response.dto.spec.ts` - 17 unit tests
- `packages/core/users/src/dto/update-profile.dto.ts` - Update profile Zod schema
- `packages/core/users/src/dto/update-profile.dto.spec.ts` - 47 unit tests
- `packages/core/users/src/dto/update-pin.dto.ts` - Update PIN Zod schema
- `packages/core/users/src/dto/update-pin.dto.spec.ts` - 38 unit tests
- `packages/core/users/src/profile.e2e.spec.ts` - 9 E2E tests

**Modified Files:**
- `packages/core/auth/prisma/schema.prisma` - Added phone, avatarUrl fields to User model
- `packages/core/users/src/users.controller.ts` - Added GET /me, PUT /me, PUT /me/pin endpoints
- `packages/core/users/src/users.service.ts` - Added getProfile, updateProfile, updatePin methods
- `packages/core/users/src/interfaces/audit.interface.ts` - Added USER_PROFILE_UPDATED, USER_PIN_CHANGED
- `packages/core/users/src/index.ts` - Added exports for profile DTOs

---

## Change Log

| Dátum | Változás | Szerző |
|-------|----------|--------|
| 2026-01-16 | Story created by create-story workflow - comprehensive User Profile developer guide | Claude Opus 4.5 |
| 2026-01-16 | **Story completed** - All 7 tasks done, 590 tests passing (102 DTO + 59 service + 9 E2E) | Claude Opus 4.5 |
