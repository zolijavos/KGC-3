# Story 1.2: Token Refresh

**Status:** done
**Epic:** Epic 1 - Authentication (@kgc/auth)
**Package:** `packages/core/auth/` → `@kgc/auth`

---

## Story

**As a** bejelentkezett felhasználó,
**I want** lejárt access token-t megújítani refresh token-nel,
**So that** ne kelljen újra bejelentkeznem.

---

## Acceptance Criteria

### AC1: Sikeres Token Refresh

**Given** valid refresh token (nem lejárt, nem revokált)
**When** POST /api/v1/auth/refresh endpoint-ra küldöm a refresh token-t
**Then** új access token (24h TTL) és új refresh token-t kapok
**And** a response tartalmazza: `{ accessToken, refreshToken, expiresIn }`

### AC2: Refresh Token Rotation (Security)

**Given** sikeres token refresh művelet
**When** új token pár generálódik
**Then** a régi refresh token invalidálódik (isRevoked = true)
**And** az invalidálás időbélyeggel rögzítődik (revokedAt)
**And** az új refresh token eltárolódik az adatbázisban

### AC3: Érvénytelen Refresh Token Kezelés

**Given** érvénytelen, lejárt vagy revokált refresh token
**When** POST /api/v1/auth/refresh
**Then** 401 Unauthorized válasz
**And** hibaüzenet: `{ error: { code: 'INVALID_REFRESH_TOKEN', message: '...' } }`
**And** a user session invalidálódik (logout szükséges)

### AC4: Token Type Validation

**Given** access token küldve refresh token helyett
**When** POST /api/v1/auth/refresh
**Then** 401 Unauthorized válasz (token type mismatch)
**And** nem fog refresh-elni hibás token típussal

### AC5: Input Validation

**Given** hiányzó vagy malformed token
**When** POST /api/v1/auth/refresh
**Then** 400 Bad Request válasz
**And** validációs hibaüzenet: `{ error: { code: 'VALIDATION_ERROR', fields: { refreshToken: '...' } } }`

---

## Tasks / Subtasks

- [x] **Task 1: Refresh DTO-k és Interfaces** (AC: #1, #5)
  - [x] 1.1: RefreshTokenDto - Zod validáció (refreshToken: string, required)
  - [x] 1.2: RefreshResponseDto - response structure
  - [x] 1.3: validateRefreshInput() helper function
  - [x] 1.4: Update index.ts exports

- [x] **Task 2: AuthService bővítés** (AC: #1, #2, #3, #4)
  - [x] 2.1: `refreshTokens(refreshToken: string)` method
  - [x] 2.2: `findValidRefreshToken(token: string)` - DB lookup + validation
  - [x] 2.3: `rotateRefreshToken(oldToken: string, userId: string)` - invalidate old, create new
  - [x] 2.4: `revokeAllUserTokens(userId: string)` - logout support
  - [x] 2.5: Unit tesztek (TDD - 14 tesztek)

- [x] **Task 3: AuthController bővítés** (AC: #1, #3, #5)
  - [x] 3.1: `POST /api/v1/auth/refresh` endpoint
  - [x] 3.2: Input validation middleware (Zod)
  - [x] 3.3: Error handling (401, 400)
  - [x] 3.4: Response formatting

- [x] **Task 4: TokenService bővítés** (AC: #4)
  - [x] 4.1: `verifyRefreshToken(token: string)` - verify + decode + type check (already exists from Story 1.1)
  - [x] 4.2: Token type validation tesztek bővítése (already exists from Story 1.1)

- [x] **Task 5: E2E Tests** (AC: all)
  - [x] 5.1: Happy path: valid refresh → new tokens
  - [x] 5.2: Token rotation: old token invalidated
  - [x] 5.3: Error path: expired refresh token → 401
  - [x] 5.4: Error path: revoked refresh token → 401
  - [x] 5.5: Error path: access token as refresh → 401
  - [x] 5.6: Error path: malformed token → 400

---

## Dev Notes

### Technológiai Stack (project-context.md alapján)

| Technológia | Verzió | Használat |
|-------------|--------|-----------|
| NestJS | 10.x | Backend framework |
| Prisma | 5.x | ORM |
| PostgreSQL | 15+ | Database |
| jsonwebtoken | 9.x | JWT kezelés |
| @nestjs/jwt | 10.2.x | NestJS JWT integration |
| zod | 3.23.x | Validation (DTO) |

### Architektúra Minták (ADR-008, ADR-032 alapján)

```typescript
// Refresh Token Request
interface RefreshTokenDto {
  refreshToken: string;
}

// Refresh Response (hasonló LoginResponse-hoz)
interface RefreshResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;  // másodpercben
  };
}

// Error format (consistent with Story 1.1)
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
```

### Refresh Token Rotation Flow

```
1. Client sends: POST /api/v1/auth/refresh { refreshToken: "old_token" }
                          ↓
2. Server validates token (JWT signature + expiry + type='refresh')
                          ↓
3. Server checks DB: RefreshToken exists + !isRevoked + !expired
                          ↓
4. Server revokes old token: UPDATE refresh_tokens SET is_revoked=true, revoked_at=NOW()
                          ↓
5. Server generates new token pair (access + refresh)
                          ↓
6. Server stores new refresh token in DB
                          ↓
7. Response: { accessToken, refreshToken, expiresIn }
```

### Prisma RefreshToken Entity (már létezik!)

```prisma
model RefreshToken {
  id         String   @id @default(uuid())
  token      String   @unique
  userId     String   @map("user_id")
  expiresAt  DateTime @map("expires_at")
  deviceInfo String?  @map("device_info")

  // Security: Token lifecycle
  isRevoked  Boolean  @default(false) @map("is_revoked")
  revokedAt  DateTime? @map("revoked_at")

  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id])
}
```

### Project Structure Notes

**Módosítandó fájlok:**

```
packages/core/auth/src/
├── auth.controller.ts      # + POST /refresh endpoint
├── auth.service.ts         # + refreshTokens(), rotateRefreshToken()
├── auth.service.spec.ts    # NEW: TDD tesztek (min 10)
├── dto/
│   ├── refresh-token.dto.ts     # NEW: Zod validation
│   └── refresh-response.dto.ts  # NEW: Response DTO
├── services/
│   └── token.service.ts    # + verifyRefreshToken()
└── index.ts                # + new exports
```

### Biztonsági Követelmények

1. **Token Rotation KÖTELEZŐ:** Minden refresh után invalidáljuk a régi token-t
2. **Double-Submit Prevention:** Revokált token újrahasználata → teljes logout
3. **Token Type Check:** Access token nem használható refresh-hez (P7 pattern-ből)
4. **Database Lookup:** JWT validation + DB check (isRevoked, expiresAt)
5. **Graceful Degradation:** Ha nincs Prisma, graceful fallback tesztekhez

### Error Codes

```typescript
enum AuthErrorCode {
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',  // 401 - lejárt, revokált, nem létezik
  TOKEN_TYPE_MISMATCH = 'TOKEN_TYPE_MISMATCH',      // 401 - access token küldve refresh helyett
  VALIDATION_ERROR = 'VALIDATION_ERROR',             // 400 - hiányzó/malformed token
}
```

### TDD Követelmény

**KÖTELEZŐ TDD Red-Green-Refactor:**

- `auth.service.spec.ts` - min 10 új teszt:
  - refreshTokens() happy path
  - refreshTokens() expired token
  - refreshTokens() revoked token
  - refreshTokens() non-existent token
  - refreshTokens() access token (wrong type)
  - rotateRefreshToken() invalidates old
  - rotateRefreshToken() creates new
  - findValidRefreshToken() returns valid token
  - findValidRefreshToken() returns null for invalid
  - revokeAllUserTokens() revokes all user tokens

---

### Previous Story Intelligence (Story 1.1)

**Learnings from Story 1.1:**

1. **AuthModule.forRoot() pattern:** Dynamic module with PRISMA_CLIENT and JWT_SECRET providers
2. **Zod validation:** validateLoginInput() pattern - use same for refresh
3. **Error response format:** Consistent { error: { code, message, fields? } }
4. **Token type validation:** Added in P7 fix - type claim in JWT payload
5. **@Injectable() decorators:** Required on all services
6. **Hungarian error messages:** Maintain consistency

**Code patterns to follow:**

```typescript
// From auth.controller.ts - validation pattern
const validationResult = validateRefreshInput(body);
if (!validationResult.success) {
  response.status(HttpStatus.BAD_REQUEST);
  return { error: validationResult.error };
}

// From token.service.ts - type validation pattern
async validateRefreshToken(token: string): Promise<boolean> {
  if (!(await this.validateToken(token))) {
    return false;
  }
  const payload = this.decodeToken(token);
  return payload?.type === 'refresh';
}
```

**Files created in Story 1.1 (reference):**

- `auth.module.ts` - NestJS dynamic module with forRoot()
- `auth.controller.ts` - POST /api/v1/auth/login
- `auth.service.ts` - login(), storeRefreshToken()
- `dto/login.dto.ts` - Zod validation pattern
- `services/token.service.ts` - JWT generation/validation

---

### Git Intelligence

**Recent commits pattern:**

```
5eb8bef feat(auth): implement Story 1.1 JWT Login Endpoint
```

**Commit convention:** `feat(auth): <description>`

---

### References

- [Source: planning-artifacts/epics.md - Story 1.2]
- [Source: docs/project-context.md - TDD/ATDD Hibrid Módszertan]
- [Source: implementation-artifacts/stories/1-1-jwt-login-endpoint.md - Previous story patterns]
- [Source: packages/core/auth/prisma/schema.prisma - RefreshToken entity]
- [Source: packages/core/auth/src/services/token.service.ts - validateRefreshToken()]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TDD Red-Green-Refactor ciklus követve AuthService metódusoknál
- 80 összesített teszt sikeres lefutással (76 + 4 code review fix)

### Code Review Fixes

Adversarial code review során azonosított és javított problémák:

| # | Probléma | Javítás |
|---|----------|---------|
| P1 | Race condition token rotation-nál | Prisma `$transaction` hozzáadva `rotateRefreshToken()`-hoz |
| P2 | Nincs transaction refreshTokens-ban | P1 javítás lefedi (rotateRefreshToken tranzakciós) |
| P4 | Hiányzó teszt - inactive user | 3 új teszt: INACTIVE, SUSPENDED, not found user |
| P5 | Duplikált TTL konstans | `REFRESH_TOKEN_TTL_MS` konstans kiemelve |

### Completion Notes List

1. **Task 1 - Refresh DTOs:** RefreshTokenDto és RefreshResponseDto Zod validációval, validateRefreshInput() helper
2. **Task 2 - AuthService (TDD):** 14 unit teszt, refreshTokens(), findValidRefreshToken(), rotateRefreshToken(), revokeAllUserTokens()
3. **Task 3 - AuthController:** POST /api/v1/auth/refresh endpoint Zod validációval és megfelelő error handling-gel
4. **Task 4 - TokenService:** validateRefreshToken() már létezett Story 1.1-ből (P7 fix)
5. **Task 5 - E2E Tests:** 12 új integráció teszt a refresh flow-hoz (happy path, token type validation, error paths, input validation)

### File List

**Created:**
- `packages/core/auth/src/dto/refresh-token.dto.ts`
- `packages/core/auth/src/dto/refresh-response.dto.ts`
- `packages/core/auth/src/auth.service.spec.ts`

**Modified:**
- `packages/core/auth/src/auth.service.ts` - +refreshTokens(), +findValidRefreshToken(), +rotateRefreshToken(), +revokeAllUserTokens(), +findUserById()
- `packages/core/auth/src/auth.controller.ts` - +POST /refresh endpoint
- `packages/core/auth/src/auth.e2e.spec.ts` - +12 refresh tests
- `packages/core/auth/src/index.ts` - +refresh DTO exports

---

## Change Log

| Dátum | Változás | Szerző |
|-------|----------|--------|
| 2026-01-15 | Story created by create-story workflow | Claude Opus 4.5 |
| 2026-01-15 | Story implementálva: Token Refresh endpoint és rotation | Claude Opus 4.5 |
| 2026-01-16 | Code review: P1, P2, P4, P5 javítások, 80 teszt | Claude Opus 4.5 |
