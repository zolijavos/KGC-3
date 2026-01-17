# Story 1.4: PIN Kód Belépés (Kiosk Mód)

**Status:** done
**Epic:** Epic 1 - Authentication (@kgc/auth)
**Package:** `packages/core/auth/` → `@kgc/auth`
**FR:** FR15 - PIN kód belépés kiosk módhoz (rövidített azonosítás)

---

## Story

**As a** pultos (operátor),
**I want** 4-6 számjegyű PIN kóddal belépni,
**So that** gyorsan váltani tudjak felhasználók között a pultgépen.

---

## Acceptance Criteria

### AC1: PIN Kód Belépés Sikeres

**Given** eszköz regisztrálva van trusted device-ként
**And** a felhasználó rendelkezik beállított PIN kóddal
**When** beírom a PIN kódomat
**Then** bejelentkezek a rendszerbe rövidített session-nel (4h TTL)
**And** kiosk access token-t kapok (type: 'kiosk')
**And** a response: 200 OK `{ data: { accessToken, expiresIn, user } }`

### AC2: Trusted Device Validáció

**Given** eszköz NEM regisztrált trusted device-ként
**When** PIN login-t próbálok
**Then** 403 Forbidden válasz
**And** hibaüzenet: "Ez az eszköz nincs regisztrálva kiosk módhoz"
**And** a teljes login flow szükséges

### AC3: PIN Lockout (3 Sikertelen Próbálkozás)

**Given** PIN sikertelen 3x egymás után
**When** újabb PIN login-t próbálok
**Then** 429 Too Many Requests válasz
**And** hibaüzenet: "PIN lockout - teljes login szükséges"
**And** a lockout 15 percig tart VAGY teljes login feloldja
**And** lockout event naplózódik

### AC4: PIN Input Validáció

**Given** hiányzó vagy érvénytelen PIN formátum
**When** POST /api/v1/auth/pin-login
**Then** 400 Bad Request válasz
**And** validációs hibaüzenet: `{ error: { code: 'VALIDATION_ERROR', fields: { pin: '...' } } }`
**And** PIN formátum: 4-6 numerikus karakter

### AC5: Device ID Validáció

**Given** hiányzó vagy érvénytelen deviceId a requestben
**When** POST /api/v1/auth/pin-login
**Then** 400 Bad Request válasz
**And** validációs hibaüzenet deviceId field-re

### AC6: User PIN Not Set

**Given** a felhasználó nem rendelkezik beállított PIN kóddal
**When** PIN login-t próbálok
**Then** 401 Unauthorized válasz
**And** hibaüzenet: "Érvénytelen PIN vagy felhasználó"
**And** generikus üzenet (ne fedjen fel, hogy nincs PIN beállítva)

---

## Tasks / Subtasks

- [x] **Task 1: Trusted Device Infrastructure** (AC: #2) ✅
  - [x] 1.1: TrustedDevice interface és típusok
  - [x] 1.2: TrustedDeviceService - findByDeviceId(), isDeviceTrusted(), registerDevice(), updateLastUsed()
  - [x] 1.3: Unit tesztek TrustedDeviceService-hez (TDD - 11 teszt) ✅

- [x] **Task 2: User PIN Management** (AC: #1, #6) ✅
  - [x] 2.1: User model bővítés - pinHash field (bcrypt, opcionális)
  - [x] 2.2: PinService - hashPin(), verifyPin(), setPinForUser(), getUserPinHash(), hasPinSet(), clearPin()
  - [x] 2.3: Unit tesztek PinService-hez (TDD - 20 teszt) ✅

- [x] **Task 3: PIN Login DTO-k** (AC: #4, #5) ✅
  - [x] 3.1: PinLoginDto - Zod validáció (pin: 4-6 digit string, deviceId: uuid)
  - [x] 3.2: PinLoginResponseDto - kiosk token response structure + PinLoginErrorCode enum
  - [x] 3.3: Update index.ts exports

- [x] **Task 4: PIN Lockout System** (AC: #3) ✅
  - [x] 4.1: FailedAttemptResult interface (attemptCount, isLocked, lockedUntil)
  - [x] 4.2: PinLockoutService - checkLockout(), incrementFailedAttempt(), resetAttempts(), getRemainingLockoutTime(), getAttemptInfo()
  - [x] 4.3: 15 perc lockout timer (LOCKOUT_DURATION_MS = 15 * 60 * 1000)
  - [x] 4.4: Full login lockout reset
  - [x] 4.5: Unit tesztek PinLockoutService-hez (TDD - 17 teszt) ✅

- [x] **Task 5: TokenService Bővítés** (AC: #1) ✅
  - [x] 5.1: generateKioskToken(user) - 4h TTL, type: 'kiosk'
  - [x] 5.2: validateKioskToken() method
  - [x] 5.3: Update getExpiresIn() for kiosk type
  - [x] 5.4: Unit tesztek (TDD - 9 új teszt, összesen 35) ✅

- [x] **Task 6: AuthService Bővítés** (AC: #1, #2, #3, #6) ✅
  - [x] 6.1: pinLogin(pin, deviceId) method - orchestrates full flow
  - [x] 6.2: Trusted device validation (findTrustedDevice)
  - [x] 6.3: PIN verification with timing attack prevention (bcrypt)
  - [x] 6.4: Lockout integration (checkPinLockout, incrementPinAttempt, resetPinAttempts)
  - [x] 6.5: Device lastUsed update (updateDeviceLastUsed)
  - [x] 6.6: Unit tesztek (TDD - 11 teszt) ✅

- [x] **Task 7: AuthController Bővítés** (AC: all) ✅
  - [x] 7.1: POST /api/v1/auth/pin-login endpoint
  - [x] 7.2: Input validation (validatePinLoginInput Zod)
  - [x] 7.3: Error handling (400, 401, 429) + Hungarian messages
  - [x] 7.4: Rate limiting (LoginThrottlerGuard)

- [x] **Task 8: E2E Tests** (AC: all) ✅
  - [x] 8.1: Happy path: successful PIN login, kiosk token, 4h TTL
  - [x] 8.2: PIN validation: 4-6 digits, numeric only
  - [x] 8.3: Device ID validation: UUID format
  - [x] 8.4: Error path: PIN lockout (429)
  - [x] 8.5: Error path: invalid credentials (401 generic)
  - [x] 8.6: Kiosk token type validation (23 új E2E teszt)

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
| bcrypt | 5.x | PIN hashing |

### Architektúra Minták (ADR-032, ADR-008 alapján)

```typescript
// PIN Login Request
interface PinLoginDto {
  pin: string;       // 4-6 digit numeric string
  deviceId: string;  // UUID of trusted device
}

// PIN Login Response (shortened session)
interface PinLoginResponse {
  data: {
    accessToken: string;  // Kiosk token (4h TTL)
    expiresIn: number;    // 14400 seconds (4h)
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  };
}

// Error format (consistent with Story 1.1-1.3)
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
```

### PIN Login Flow

```
PIN Login Flow:
1. Client sends: POST /api/v1/auth/pin-login
   Headers: { X-Device-Id: "uuid", X-Device-Fingerprint: "hash" }
   Body: { pin: "1234", deviceId: "uuid" }
                          ↓
2. Server validates input (Zod)
                          ↓
3. Server checks: Is deviceId in trusted_devices table?
   - NO → 403 Forbidden "Ez az eszköz nincs regisztrálva"
   - YES → continue
                          ↓
4. Server checks: Is user locked out?
   - YES → 429 "PIN lockout - teljes login szükséges"
   - NO → continue
                          ↓
5. Server finds user by deviceId → gets locationId → finds users with PIN at location
   - Device fingerprint additional validation (optional)
                          ↓
6. Server verifies PIN against user's pinHash (bcrypt, constant-time)
   - INVALID → increment failed attempts, check if lockout threshold
   - VALID → continue
                          ↓
7. Server generates kiosk access token (4h TTL, type: 'kiosk')
   - No refresh token for kiosk mode (shorter session)
                          ↓
8. Record successful login attempt for audit
                          ↓
9. Response: { data: { accessToken, expiresIn: 14400, user } }
```

### Kiosk Token vs Access Token

| Jellemző | Access Token (JWT) | Kiosk Token |
|----------|-------------------|-------------|
| TTL | 24h | 4h |
| type claim | 'access' | 'kiosk' |
| Refresh token | Van (7d) | NINCS |
| Generálás | Email/password login | PIN login |
| Használati eset | Teljes session | Gyors váltás |

### Database Schema Extensions

```sql
-- Trusted Devices Table (NEW)
CREATE TABLE trusted_device (
  device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(tenant_id),
  location_id UUID NOT NULL REFERENCES location(location_id),
  device_name VARCHAR(100) NOT NULL,
  device_fingerprint VARCHAR(255),
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, REVOKED
  registered_by UUID REFERENCES users(user_id),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_trusted_device_tenant ON trusted_device(tenant_id);
CREATE INDEX idx_trusted_device_status ON trusted_device(status);

-- User PIN Field (ALTER existing)
ALTER TABLE users ADD COLUMN pin_hash VARCHAR(60);

-- PIN Attempts Tracking (for lockout)
CREATE TABLE pin_attempt (
  attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  device_id UUID NOT NULL REFERENCES trusted_device(device_id),
  attempt_count INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);
```

### Security Considerations

1. **PIN Hashing:** bcrypt (same as password, min 10 rounds)
2. **Timing Attack Prevention:** Constant-time PIN comparison
3. **Brute Force Protection:** 3 failed attempts → 15 min lockout
4. **Device Binding:** PIN only works on pre-registered devices
5. **Short Session:** 4h TTL limits exposure window
6. **No Refresh Token:** Kiosk sessions cannot be extended
7. **Audit Trail:** All PIN attempts logged
8. **Generic Error Messages:** Don't reveal if user has PIN or not

### Error Codes

```typescript
enum PinAuthErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',      // 400 - invalid input
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS', // 401 - wrong PIN or no PIN
  DEVICE_NOT_TRUSTED = 'DEVICE_NOT_TRUSTED',  // 403 - device not registered
  PIN_LOCKOUT = 'PIN_LOCKOUT',                // 429 - too many attempts
}
```

### Project Structure Notes

**Új fájlok:**

```
packages/core/auth/src/
├── dto/
│   ├── pin-login.dto.ts           # NEW: PIN login Zod validation
│   └── pin-login-response.dto.ts  # NEW: Response DTOs
├── services/
│   ├── pin.service.ts             # NEW: PIN hashing/verification
│   ├── pin.service.spec.ts        # NEW: TDD tests
│   ├── trusted-device.service.ts  # NEW: Device management
│   ├── trusted-device.service.spec.ts # NEW: TDD tests
│   ├── pin-lockout.service.ts     # NEW: Lockout logic
│   └── pin-lockout.service.spec.ts # NEW: TDD tests
└── index.ts                       # Updated exports
```

**Módosítandó fájlok:**

```
packages/core/auth/src/
├── auth.controller.ts      # + POST /api/v1/auth/pin-login
├── auth.service.ts         # + pinLogin() method
├── auth.service.spec.ts    # + PIN login tests
├── services/
│   └── token.service.ts    # + generateKioskToken()
└── index.ts                # + new exports

prisma/schema.prisma        # + TrustedDevice, PinAttempt models, User.pinHash
```

### TDD Követelmény

**KÖTELEZŐ TDD Red-Green-Refactor:**

- `pin.service.spec.ts` - min 4 teszt:
  - hashPin() generates valid bcrypt hash
  - verifyPin() returns true for correct PIN
  - verifyPin() returns false for incorrect PIN
  - verifyPin() is timing-attack resistant

- `trusted-device.service.spec.ts` - min 5 teszt:
  - findByDeviceId() returns device for valid ID
  - findByDeviceId() returns null for unknown ID
  - isDeviceTrusted() returns true for ACTIVE device
  - isDeviceTrusted() returns false for SUSPENDED device
  - isDeviceTrusted() returns false for unknown device

- `pin-lockout.service.spec.ts` - min 6 teszt:
  - checkLockout() returns false when no attempts
  - checkLockout() returns false when under threshold
  - checkLockout() returns true when locked
  - incrementFailedAttempt() increments counter
  - incrementFailedAttempt() triggers lockout at threshold (3)
  - resetAttempts() clears lockout

- `auth.service.spec.ts` (PIN extension) - min 10 teszt:
  - pinLogin() success on trusted device
  - pinLogin() fails for untrusted device
  - pinLogin() fails for invalid PIN
  - pinLogin() fails when user has no PIN set
  - pinLogin() fails when locked out
  - pinLogin() increments lockout on failure
  - pinLogin() resets lockout on success
  - pinLogin() returns kiosk token (4h TTL)
  - pinLogin() records successful attempt
  - pinLogin() records failed attempt

---

### Previous Story Intelligence (Story 1.1, 1.2, 1.3)

**Learnings from Story 1.1-1.3:**

1. **AuthModule.forRoot() pattern:** Dynamic module with PRISMA_CLIENT and JWT_SECRET providers
2. **Zod validation:** validateXxxInput() pattern - return { success: true, data } or { success: false, error }
3. **Error response format:** Consistent { error: { code, message, fields? } }
4. **Token type validation:** type claim in JWT payload (access vs refresh vs kiosk)
5. **@Injectable() decorators:** Required on all services
6. **Hungarian error messages:** Maintain consistency
7. **Prisma $transaction:** Use for atomic operations
8. **Constant-time comparison:** Use for password/PIN verification
9. **P1 Security Fix (Story 1.3):** Token ownership validation - user can only revoke own tokens
10. **TTL constants:** Extract to top-level constants for clarity

**Code patterns to follow:**

```typescript
// Validation pattern (Story 1.1-1.3)
const validationResult = validatePinLoginInput(body);
if (!validationResult.success) {
  response.status(HttpStatus.BAD_REQUEST);
  return { error: validationResult.error };
}

// Device ID from header (new for Story 1.4)
@Header('X-Device-Id')
const deviceId = request.headers['x-device-id'];

// Kiosk token pattern (new)
const kioskToken = await this.tokenService.generateKioskToken(userForToken);
// kioskToken has: { sub, email, role, tenantId, type: 'kiosk' }
// TTL: 4h (14400 seconds)
// No refresh token paired
```

**Files created in Story 1.1-1.3 (reference):**

- `auth.module.ts` - NestJS dynamic module
- `auth.controller.ts` - POST /login, POST /refresh, POST /logout, POST /logout-all
- `auth.service.ts` - login(), refreshTokens(), logout(), logoutAll()
- `token.service.ts` - generateAccessToken(), generateRefreshToken(), validateXxxToken()
- `password.service.ts` - hashPassword(), verifyPassword()
- `dto/login.dto.ts`, `dto/refresh-token.dto.ts`, `dto/logout.dto.ts` - Zod validation

---

### Git Intelligence

**Recent commits pattern:**

```
feat(auth): implement Story 1.1 JWT Login Endpoint
feat(auth): implement Story 1.2 Token Refresh
feat(auth): implement Story 1.3 Logout és Session Invalidation
```

**Commit convention for this story:**

```
feat(auth): implement Story 1.4 PIN Login (Kiosk Mode)
```

---

### References

- [Source: planning-artifacts/epics.md - Story 1.4]
- [Source: planning-artifacts/epics.md - FR15, FR19]
- [Source: docs/project-context.md - TDD/ATDD Hibrid Módszertan]
- [Source: planning-artifacts/adr/ADR-032-rbac-teljes-architektura.md - Roles]
- [Source: packages/core/auth/src/services/token.service.ts - Token generation]
- [Source: packages/core/auth/src/services/password.service.ts - Bcrypt patterns]
- [Source: implementation-artifacts/stories/1-3-logout-es-session-invalidation.md - Previous story]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

1. **TDD Methodology Followed:** All services implemented using Red-Green-Refactor cycle
2. **Test Coverage:** 190 tests total (167 unit + 23 E2E), all passing
3. **Security:** bcrypt PIN hashing (min 10 rounds), constant-time comparison, generic error messages
4. **Kiosk Token:** 4h TTL, type: 'kiosk', no refresh token
5. **PIN Lockout:** 3 failed attempts → 15 minute lockout per user+device combination
6. **Input Validation:** Zod schemas for PIN (4-6 numeric digits) and deviceId (UUID)
7. **Hungarian Messages:** All error messages in Hungarian as per project requirements
8. **Backward Compatibility:** Optional service injection, AuthService works with or without PIN services

### Code Review Fixes (2026-01-16)

8 issues found and fixed during adversarial code review:

| Fix | Description |
|-----|-------------|
| **P1 - AC2** | Added 403 Forbidden response for untrusted device (was returning 401) |
| **P2 - Schema** | Fixed `isActive: boolean` → `status: 'ACTIVE'` consistency |
| **P3 - Audit** | Added `recordPinLoginAttempt()` for security audit trail |
| **P4 - DRY** | Imported and used `MAX_FAILED_ATTEMPTS`, `LOCKOUT_DURATION_MS` constants |
| **P5 - DI** | Made PinService constructor fully injectable with @Inject decorators |
| **P7 - Error** | Added try-catch to `updateDeviceLastUsed()` for silent failure |
| **P8 - Code** | Now using `DEVICE_NOT_TRUSTED` error code for AC2 errors |
| **Flow** | Refactored to `findUserByPinAtLocation()` for location-based PIN lookup |

### File List

**New Files Created:**

```
packages/core/auth/src/
├── dto/
│   ├── pin-login.dto.ts              # Zod validation (pin, deviceId)
│   └── pin-login-response.dto.ts     # Response DTOs, PinLoginErrorCode enum
├── services/
│   ├── pin.service.ts                # PIN hashing/verification (bcrypt)
│   ├── pin.service.spec.ts           # 20 TDD tests
│   ├── pin-lockout.service.ts        # Lockout logic (3 attempts → 15 min)
│   ├── pin-lockout.service.spec.ts   # 17 TDD tests
│   ├── trusted-device.service.ts     # Device management
│   └── trusted-device.service.spec.ts # 11 TDD tests
```

**Modified Files:**

```
packages/core/auth/src/
├── auth.controller.ts       # + POST /api/v1/auth/pin-login endpoint
├── auth.service.ts          # + pinLogin() method + helper methods
├── auth.service.spec.ts     # + 11 PIN login unit tests
├── auth.e2e.spec.ts         # + 23 E2E tests for Story 1.4
├── services/
│   ├── token.service.ts     # + generateKioskToken(), validateKioskToken()
│   └── token.service.spec.ts # + 9 kiosk token tests
├── interfaces/
│   └── jwt-payload.interface.ts # + 'kiosk' type, kioskTokenTtl option
└── index.ts                 # + new exports for all Story 1.4 components
```

---

## Change Log

| Dátum | Változás | Szerző |
|-------|----------|--------|
| 2026-01-16 | Story created by create-story workflow | Claude Opus 4.5 |
| 2026-01-16 | Story implemented - all 8 tasks completed, 190 tests passing | Claude Opus 4.5 |
| 2026-01-16 | Code review - 8 issues found and fixed, all tests passing | Claude Opus 4.5 |
