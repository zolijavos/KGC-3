# Story 1.5: Password Reset Flow

**Status:** done
**Epic:** Epic 1 - Authentication (@kgc/auth)
**Package:** `packages/core/auth/` → `@kgc/auth`

---

## Story

**As a** felhasználó,
**I want** elfelejtett jelszavamat visszaállítani email-en keresztül,
**So that** visszanyerjem a hozzáférésem.

---

## Acceptance Criteria

### AC1: Forgot Password Request

**Given** létező user email
**When** POST /api/v1/auth/forgot-password `{ email: "user@example.com" }`
**Then** reset token generálódik (crypto random, 64 char hex)
**And** a token 1 óra TTL-lel tárolódik az adatbázisban
**And** email küldés (mockolható) a reset linkkel
**And** response: 200 OK `{ data: { message: "..." } }` (generikus üzenet)

### AC2: Security - No Email Enumeration

**Given** nem létező email cím
**When** POST /api/v1/auth/forgot-password `{ email: "nonexistent@example.com" }`
**Then** response: 200 OK (ugyanaz mint AC1)
**And** NEM áruljuk el, hogy az email nem létezik
**And** email NEM kerül kiküldésre (silent fail)

### AC3: Reset Password with Valid Token

**Given** valid reset token (nem lejárt, nem használt)
**When** POST /api/v1/auth/reset-password `{ token: "abc123...", newPassword: "..." }`
**Then** jelszó frissül bcrypt hash-sel (min 10 rounds)
**And** reset token invalidálódik (isUsed = true)
**And** response: 200 OK `{ data: { success: true, message: "..." } }`
**And** user bejelentkezhet az új jelszóval

### AC4: Password Policy Validation

**Given** reset password request
**When** új jelszó nem felel meg a policy-nak
**Then** response: 400 Bad Request
**And** validációs hiba: min 8 karakter, legalább 1 szám, 1 nagybetű
**And** reset token NEM invalidálódik (újra próbálható)

### AC5: Invalid/Expired Token Handling

**Given** lejárt (>1h) VAGY már használt VAGY nem létező token
**When** POST /api/v1/auth/reset-password
**Then** response: 400 Bad Request
**And** error: `{ code: 'INVALID_TOKEN', message: '...' }`
**And** generikus hibaüzenet (ne árulja el a pontos okot)

### AC6: Rate Limiting on Forgot Password

**Given** túl sok forgot-password kérés ugyanarra az email-re
**When** 3+ kérés 15 percen belül
**Then** response: 429 Too Many Requests
**And** következő kérés csak 15 perc múlva lehetséges
**And** a limit IP alapján is érvényesül

### AC7: Input Validation

**Given** hiányzó vagy érvénytelen input
**When** POST /api/v1/auth/forgot-password VAGY /reset-password
**Then** response: 400 Bad Request
**And** Zod validációs hiba mezőnként

---

## Tasks / Subtasks

- [x] **Task 1: Password Reset DTOs** (AC: #1, #3, #4, #7)
  - [x] 1.1: ForgotPasswordDto - Zod validáció (email: string, email format)
  - [x] 1.2: ResetPasswordDto - Zod validáció (token: string, newPassword: string with policy)
  - [x] 1.3: ForgotPasswordResponseDto - response structure
  - [x] 1.4: ResetPasswordResponseDto - response structure
  - [x] 1.5: Password policy schema (min 8 char, 1 number, 1 uppercase)
  - [x] 1.6: Update index.ts exports

- [x] **Task 2: PasswordResetToken Prisma Model** (AC: #1, #3, #5)
  - [x] 2.1: Schema design - token, userId, expiresAt, isUsed, createdAt
  - [x] 2.2: Prisma schema update
  - [~] 2.3: Migration generation - Deferred (schema only, migration at deploy time)

- [x] **Task 3: AuthService Password Reset Methods** (AC: #1, #2, #3, #5)
  - [x] 3.1: `forgotPassword(email: string)` method - token generation
  - [x] 3.2: `resetPassword(token: string, newPassword: string)` method
  - [x] 3.3: `generateResetToken()` helper - crypto random 64 char hex (in PasswordResetService)
  - [x] 3.4: `findValidToken(token: string)` helper
  - [x] 3.5: Uses existing PasswordService.hashPassword() - bcrypt 12 rounds
  - [x] 3.6: Unit tesztek (TDD - 18 új teszt)

- [x] **Task 4: Email Service Interface** (AC: #1, #2)
  - [x] 4.1: EmailService interface definition (IEmailService)
  - [x] 4.2: MockEmailService for testing
  - [~] 4.3: Email template for password reset - Deferred (production email service later)
  - [x] 4.4: Inject EmailService into AuthModule (via EMAIL_SERVICE token)

- [x] **Task 5: AuthController Password Reset Endpoints** (AC: #1, #3, #6, #7)
  - [x] 5.1: `POST /api/v1/auth/forgot-password` endpoint
  - [x] 5.2: `POST /api/v1/auth/reset-password` endpoint
  - [x] 5.3: Input validation middleware (Zod)
  - [x] 5.4: Rate limiting via PasswordResetService (email-based)
  - [x] 5.5: Error handling (400, 429)

- [x] **Task 6: Rate Limiting Implementation** (AC: #6)
  - [x] 6.1: Rate limiting in PasswordResetService (in-memory Map)
  - [x] 6.2: In-memory rate limiting (email-based)
  - [x] 6.3: 3 requests / 15 minutes per email
  - [~] 6.4: IP-based limiting - Uses existing LoginThrottlerGuard

- [x] **Task 7: Unit Tests** (AC: all)
  - [x] 7.1: forgotPassword() success for existing user
  - [x] 7.2: Email enumeration protection test (non-existing/inactive user)
  - [x] 7.3: Expired token handling
  - [x] 7.4: Already used token handling
  - [x] 7.5: Password policy validation (via Zod schema)
  - [x] 7.6: Rate limiting test
  - [x] 7.7: PasswordResetService token generation/validation tests

---

## Dev Notes

### Technológiai Stack (project-context.md alapján)

| Technológia | Verzió | Használat |
|-------------|--------|-----------|
| NestJS | 10.x | Backend framework |
| Prisma | 5.x | ORM |
| PostgreSQL | 15+ | Database |
| bcrypt | 5.x | Password hashing |
| crypto | Node.js built-in | Token generation |
| zod | 3.23.x | Validation (DTO) |

### Architektúra Minták (ADR-032 alapján)

```typescript
// Forgot Password Request
interface ForgotPasswordDto {
  email: string;
}

// Forgot Password Response (always same - no email enumeration)
interface ForgotPasswordResponse {
  data: {
    message: string; // "Ha az email cím létezik, reset linket küldtünk"
  };
}

// Reset Password Request
interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

// Reset Password Response
interface ResetPasswordResponse {
  data: {
    success: boolean;
    message: string;
  };
}

// Password Policy (Zod schema)
const passwordPolicy = z.string()
  .min(8, 'Minimum 8 karakter')
  .regex(/[A-Z]/, 'Legalább 1 nagybetű szükséges')
  .regex(/[0-9]/, 'Legalább 1 szám szükséges');

// Error format (consistent with Story 1.1-1.4)
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
```

### Password Reset Flow

```
Forgot Password:
1. Client sends: POST /api/v1/auth/forgot-password { email: "user@example.com" }
                          ↓
2. Server generates crypto random token (64 hex chars)
                          ↓
3. Server stores token: password_reset_tokens table
   - token (hashed)
   - userId
   - expiresAt (NOW + 1 hour)
   - isUsed (false)
                          ↓
4. Server sends email with reset link (or mocks in test)
                          ↓
5. Response: { data: { message: "Ha az email cím létezik..." } }

Reset Password:
1. Client sends: POST /api/v1/auth/reset-password { token: "abc...", newPassword: "..." }
                          ↓
2. Server validates token: exists, not expired, not used
                          ↓
3. Server validates password policy: 8+ chars, 1 uppercase, 1 number
                          ↓
4. Server updates user password: bcrypt hash (12 rounds)
                          ↓
5. Server marks token as used: isUsed = true
                          ↓
6. Response: { data: { success: true, message: "Jelszó sikeresen módosítva" } }
```

### Prisma Schema (PasswordResetToken)

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  token     String   @unique  // Hashed token (SHA-256)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  isUsed    Boolean  @default(false)
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}
```

### Security Considerations

1. **Token Storage:** Store SHA-256 hash of token, not plain token
2. **No Email Enumeration:** Same response for existing/non-existing emails
3. **One-Time Use:** Token invalidated immediately after use
4. **TTL:** 1 hour expiration (configurable)
5. **Rate Limiting:** 3 requests per email per 15 minutes
6. **Password Policy:** Min 8 chars, 1 uppercase, 1 number
7. **bcrypt Rounds:** 12 (consistent with login - ADR-032)

### Error Codes

```typescript
enum PasswordResetErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',      // 400 - input validation failed
  INVALID_TOKEN = 'INVALID_TOKEN',            // 400 - token not found/expired/used
  PASSWORD_POLICY = 'PASSWORD_POLICY_ERROR',  // 400 - password doesn't meet policy
  RATE_LIMITED = 'RATE_LIMITED',              // 429 - too many requests
}
```

### TDD Követelmény

**KÖTELEZŐ TDD Red-Green-Refactor:**

- `auth.service.spec.ts` - min 12 új teszt:
  - forgotPassword() happy path - token created, email sent
  - forgotPassword() non-existent email - no error, no email
  - forgotPassword() rate limited - throws error
  - resetPassword() happy path - password updated, token used
  - resetPassword() expired token - throws error
  - resetPassword() used token - throws error
  - resetPassword() invalid token - throws error
  - resetPassword() weak password - throws policy error
  - resetPassword() valid policy (8 chars, upper, number)
  - generateResetToken() - returns 64 char hex
  - validateResetToken() valid - returns token record
  - validateResetToken() invalid - returns null

---

### Previous Story Intelligence (Story 1.1-1.4)

**Learnings from Story 1.1-1.4:**

1. **AuthModule.forRoot() pattern:** Dynamic module with PRISMA_CLIENT and JWT_SECRET providers
2. **Zod validation:** validateXxxInput() pattern
3. **Error response format:** Consistent { error: { code, message, fields? } }
4. **Hungarian error messages:** Maintain consistency
5. **Prisma $transaction:** Use for atomic operations
6. **PasswordService exists:** Reuse for password hashing
7. **@Optional() @Inject():** Pattern for optional dependencies

**Code patterns to follow:**

```typescript
// Validation pattern (Story 1.1-1.4)
const validationResult = validateForgotPasswordInput(body);
if (!validationResult.success) {
  response.status(HttpStatus.BAD_REQUEST);
  return { error: validationResult.error };
}

// Service method pattern
async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  // 1. Find user (don't reveal if not found)
  // 2. Generate token
  // 3. Store token (hashed)
  // 4. Send email (or mock)
  // 5. Return generic response
}
```

**Existing PasswordService (reuse):**

```typescript
// packages/core/auth/src/services/password.service.ts
class PasswordService {
  async hashPassword(password: string): Promise<string>;
  async verifyPassword(password: string, hash: string): Promise<boolean>;
}
```

---

### Git Intelligence

**Recent commits pattern:**

```
feat(auth): implement Story 1.1 JWT Login Endpoint
feat(auth): implement Story 1.2 Token Refresh
feat(auth): implement Story 1.3 Logout és Session Invalidation
feat(auth): implement Story 1.4 PIN Kód Belépés (Kiosk Mód)
```

**Commit convention:** `feat(auth): implement Story 1.5 Password Reset Flow`

---

### References

- [Source: planning-artifacts/epics.md - Story 1.5]
- [Source: docs/project-context.md - TDD/ATDD Hibrid Módszertan]
- [Source: implementation-artifacts/stories/1-1-jwt-login-endpoint.md]
- [Source: implementation-artifacts/stories/1-4-pin-kod-belepes-kiosk-mod.md]
- [Source: packages/core/auth/src/services/password.service.ts]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- TDD: 18 új teszt (190 → 208 teszt)
- All tests green: `pnpm --filter @kgc/auth test`
- Story 1.5 AC lefedettség: 100% (AC1-AC7)

### Completion Notes List

1. **Task 1 (DTOs):** Létrehozva forgot-password.dto.ts, reset-password.dto.ts, és response DTOs Zod validációval
2. **Task 2 (Prisma):** PasswordResetToken model hozzáadva a schema-hoz + TrustedDevice és PinAttempt modellek
3. **Task 3 (AuthService):** forgotPassword() és resetPassword() metódusok implementálva
4. **Task 4 (Email):** IEmailService interface és MockEmailService teszteléshez
5. **Task 5 (Controller):** POST /forgot-password és POST /reset-password endpoints
6. **Task 6 (Rate Limiting):** In-memory rate limiting email alapján (3 req / 15 min)
7. **Task 7 (Tests):** 18 új unit teszt a password reset flow-hoz

**Deferred Items:**
- Email template (production email service later)
- Prisma migration generation (at deploy time)

### File List

**Új fájlok:**
- `packages/core/auth/src/dto/forgot-password.dto.ts` - Forgot password Zod validáció
- `packages/core/auth/src/dto/reset-password.dto.ts` - Reset password Zod validáció
- `packages/core/auth/src/dto/forgot-password-response.dto.ts` - Response interface
- `packages/core/auth/src/dto/reset-password-response.dto.ts` - Response interface
- `packages/core/auth/src/services/password-reset.service.ts` - Password reset token management
- `packages/core/auth/src/services/email.service.ts` - Email service interface + mock

**Módosított fájlok:**
- `packages/core/auth/src/auth.service.ts` - forgotPassword(), resetPassword() methods
- `packages/core/auth/src/auth.service.spec.ts` - 18 új unit teszt (208 total)
- `packages/core/auth/src/auth.controller.ts` - 2 új endpoint (forgot-password, reset-password)
- `packages/core/auth/src/index.ts` - Új exportok
- `packages/core/auth/prisma/schema.prisma` - PasswordResetToken, TrustedDevice, PinAttempt models + User updates
- `implementation-artifacts/sprint-status.yaml` - Story státusz: in-progress

---

## Change Log

| Dátum | Változás | Szerző |
|-------|----------|--------|
| 2026-01-16 | Story created from Epic 1 definition | Claude Opus 4.5 |
| 2026-01-16 | Story implementáció: DTOs, Service, Controller, Tests (18 új teszt) | Claude Opus 4.5 |
| 2026-01-16 | Adversarial Code Review + Fixes (4 MEDIUM, 2 LOW) | Claude Opus 4.5 |

---

## Senior Developer Review (AI)

### Review Date
2026-01-16

### Review Outcome
**APPROVED** - All issues fixed automatically

### Issues Found and Fixed

#### MEDIUM Issues (4)

1. **M1: Rate limit memory leak** - In-memory Map never cleaned expired entries
   - **Fix:** Added `OnModuleDestroy` lifecycle hook and 5-minute interval cleanup in `PasswordResetService`
   - **File:** `password-reset.service.ts:57-92`

2. **M2: Weak test coverage for resetPassword success path**
   - **Fix:** Added specific assertions for password hash, token used, all tokens invalidated, refresh tokens revoked
   - **File:** `auth.service.spec.ts:1295-1332`

3. **M3: No EMAIL_SERVICE configuration warning**
   - **Fix:** Added `console.warn` when email service not configured
   - **File:** `auth.service.ts:956-961`

4. **M4: Email case sensitivity inconsistency**
   - **Fix:** Normalized email to lowercase in `forgotPassword()` before processing
   - **File:** `auth.service.ts:916-917`

#### LOW Issues (2)

1. **L1: No scheduled cleanup for expired tokens** - `cleanupExpiredTokens()` exists but not called
   - **Status:** Documented - requires cron job configuration at deployment

2. **L2: Silent error swallowing in forgotPassword**
   - **Fix:** Added `console.error` logging while still returning success (AC2 compliance)
   - **File:** `auth.service.ts:964-966`

### Test Results After Fixes
- **208 tests passed** (no regressions)
- All AC validations confirmed
