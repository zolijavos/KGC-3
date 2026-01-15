# ADR-033: Session Management és Kiosk Mód Architektúra

**Státusz:** Accepted
**Dátum:** 2026-01-04
**Döntéshozók:** Architect, PM, Security Lead
**Kapcsolódó:** NFR-S4, ADR-008 (Device Auth), ADR-032 (RBAC)

---

## Kontextus

A KGC ERP v7.0 rendszer két üzemmódban használható:
1. **Egyéni eszköz** - Egy felhasználó, egy eszköz (laptop, tablet)
2. **Kiosk mód** - Megosztott eszköz a pulton, több felhasználó váltakozva

A kiosk mód különösen fontos a boltokban, ahol a pultosok gyorsan váltják egymást, és nem praktikus minden alkalommal teljes bejelentkezés.

---

## Döntési Kérdés

**Hogyan biztosítsunk biztonságos és gyors felhasználóváltást kiosk módban, miközben megőrizzük az audit trail integritását?**

---

## Döntés

### Üzemmód Architektúra

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION MANAGEMENT MÓDOK                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐       ┌─────────────────────┐         │
│  │   EGYÉNI ESZKÖZ     │       │     KIOSK MÓD       │         │
│  ├─────────────────────┤       ├─────────────────────┤         │
│  │                     │       │                     │         │
│  │  • Email + Jelszó   │       │  • 4-6 jegyű PIN    │         │
│  │  • Biometrikus opt. │       │  • Gyors váltás     │         │
│  │  • 30 nap remember  │       │  • 5 perc auto-lock │         │
│  │  • JWT token        │       │  • Device token     │         │
│  │                     │       │                     │         │
│  └─────────────────────┘       └─────────────────────┘         │
│           │                             │                       │
│           └──────────┬──────────────────┘                       │
│                      │                                          │
│                      ▼                                          │
│           ┌─────────────────────┐                              │
│           │   SESSION CONTEXT   │                              │
│           │  • user_id          │                              │
│           │  • tenant_id        │                              │
│           │  • location_id      │                              │
│           │  • device_id        │                              │
│           │  • session_type     │                              │
│           └─────────────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Device Registration (Kiosk)

```typescript
interface KioskDevice {
  deviceId: UUID;
  tenantId: UUID;
  locationId: UUID;
  deviceName: string;           // "Pult-1", "Raktár-Tablet"
  deviceType: 'TABLET' | 'DESKTOP' | 'MOBILE';
  isKiosk: boolean;
  registeredAt: Date;
  lastSeenAt: Date;
  allowedUsers: UUID[];         // Opcionális: csak ezek használhatják
}

// Device regisztráció flow
async function registerKioskDevice(
  adminUser: User,
  deviceInfo: DeviceRegistrationDto
): Promise<KioskDevice> {
  // 1. Admin jogosultság ellenőrzés
  await requirePermission(adminUser, Permission.ADMIN_CONFIG);

  // 2. Unique device token generálás
  const deviceToken = crypto.randomBytes(32).toString('hex');

  // 3. Device mentés
  const device = await prisma.device.create({
    data: {
      deviceId: uuid(),
      tenantId: adminUser.tenantId,
      locationId: deviceInfo.locationId,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      isKiosk: true,
      deviceToken: hashToken(deviceToken),
      registeredBy: adminUser.id
    }
  });

  // 4. QR kód generálás a device token-nel
  const qrCode = await generateQRCode({
    deviceId: device.deviceId,
    token: deviceToken,
    tenant: adminUser.tenantId
  });

  return { device, qrCode, rawToken: deviceToken };
}
```

### PIN-Alapú Belépés (Kiosk)

```typescript
interface PinSession {
  userId: UUID;
  deviceId: UUID;
  sessionId: UUID;
  startedAt: Date;
  expiresAt: Date;            // 5 perc inaktivitás után
  lastActivity: Date;
}

// PIN kód generálás és tárolás
async function generateUserPin(user: User): Promise<string> {
  const pin = generateSecurePin(6);  // 6 jegyű
  const pinHash = await bcrypt.hash(pin, 10);

  await prisma.userPin.upsert({
    where: { userId: user.id },
    update: { pinHash, updatedAt: new Date() },
    create: {
      userId: user.id,
      pinHash,
      failedAttempts: 0
    }
  });

  return pin;  // Csak egyszer jelenítjük meg!
}

// PIN bejelentkezés
async function loginWithPin(
  deviceId: UUID,
  pin: string
): Promise<PinSession> {
  // 1. Device ellenőrzés
  const device = await prisma.device.findUnique({
    where: { deviceId, isKiosk: true }
  });
  if (!device) throw new UnauthorizedException('Invalid device');

  // 2. PIN keresés a tenant felhasználói között
  const users = await prisma.user.findMany({
    where: {
      tenantId: device.tenantId,
      isActive: true,
      pin: { isNot: null }
    },
    include: { pin: true }
  });

  // 3. PIN validálás
  for (const user of users) {
    const isValid = await bcrypt.compare(pin, user.pin.pinHash);
    if (isValid) {
      // Sikeres belépés
      await resetFailedAttempts(user.id);

      const session = await createPinSession(user, device);

      await auditLog.record({
        action: 'KIOSK_LOGIN',
        userId: user.id,
        deviceId: device.deviceId,
        sessionId: session.sessionId
      });

      return session;
    }
  }

  // 4. Sikertelen belépés naplózás
  await auditLog.record({
    action: 'KIOSK_LOGIN_FAILED',
    deviceId: device.deviceId,
    reason: 'Invalid PIN'
  });

  throw new UnauthorizedException('Invalid PIN');
}
```

### Auto-Lock Mechanizmus

```typescript
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;  // 5 perc

// Session activity tracking
async function trackActivity(sessionId: UUID): Promise<void> {
  await prisma.pinSession.update({
    where: { sessionId },
    data: {
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + INACTIVITY_TIMEOUT_MS)
    }
  });
}

// Auto-lock check middleware
async function checkSessionValidity(
  sessionId: UUID
): Promise<boolean> {
  const session = await prisma.pinSession.findUnique({
    where: { sessionId }
  });

  if (!session || session.expiresAt < new Date()) {
    // Session lejárt - auto-lock
    await auditLog.record({
      action: 'SESSION_AUTO_LOCKED',
      sessionId,
      reason: 'Inactivity timeout'
    });
    return false;
  }

  return true;
}

// Frontend auto-lock detection
class SessionWatcher {
  private timeoutId: number | null = null;

  startWatching() {
    document.addEventListener('click', () => this.resetTimer());
    document.addEventListener('keypress', () => this.resetTimer());
    document.addEventListener('touchstart', () => this.resetTimer());
    this.resetTimer();
  }

  resetTimer() {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.lockScreen();
    }, INACTIVITY_TIMEOUT_MS);
  }

  lockScreen() {
    // PIN újra bekérése
    store.dispatch({ type: 'SESSION_LOCKED' });
    router.push('/kiosk/pin');
  }
}
```

### Elevated Access (Kritikus Műveletek)

```typescript
const ELEVATED_OPERATIONS = [
  'rental:cancel',
  'rental:discount',
  'inventory:adjust',
  'partner:delete'
];

// Elevated access flow
async function requireElevatedAccess(
  currentSession: PinSession,
  operation: string
): Promise<void> {
  if (!ELEVATED_OPERATIONS.includes(operation)) {
    return; // Nem kell elevated access
  }

  // Ellenőrizzük mikor volt utoljára elevated auth
  const lastElevated = await prisma.elevatedAuth.findFirst({
    where: {
      userId: currentSession.userId,
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }
    }
  });

  if (!lastElevated) {
    // PIN újra bekérése
    throw new ElevatedAccessRequiredException(
      'Please re-enter your PIN for this operation'
    );
  }
}

// Elevated auth rögzítése
async function recordElevatedAuth(
  userId: UUID,
  pin: string,
  operation: string
): Promise<void> {
  const isValidPin = await validateUserPin(userId, pin);
  if (!isValidPin) {
    throw new UnauthorizedException('Invalid PIN');
  }

  await prisma.elevatedAuth.create({
    data: {
      userId,
      operation,
      createdAt: new Date()
    }
  });

  await auditLog.record({
    action: 'ELEVATED_ACCESS_GRANTED',
    userId,
    operation
  });
}
```

### Adatbázis Séma

```sql
-- Device regisztráció
CREATE TABLE device (
  device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(tenant_id),
  location_id UUID REFERENCES location(location_id),
  device_name VARCHAR(100) NOT NULL,
  device_type VARCHAR(20) NOT NULL,
  is_kiosk BOOLEAN DEFAULT FALSE,
  device_token_hash VARCHAR(255),
  registered_by UUID REFERENCES users(user_id),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(tenant_id, device_name)
);

-- User PIN
CREATE TABLE user_pin (
  user_id UUID PRIMARY KEY REFERENCES users(user_id),
  pin_hash VARCHAR(255) NOT NULL,
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kiosk session
CREATE TABLE pin_session (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  device_id UUID NOT NULL REFERENCES device(device_id),
  tenant_id UUID NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  end_reason VARCHAR(50),  -- 'LOGOUT' | 'TIMEOUT' | 'SWITCH_USER'
  INDEX idx_session_active (device_id, expires_at) WHERE ended_at IS NULL
);

-- Elevated access log
CREATE TABLE elevated_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id),
  session_id UUID REFERENCES pin_session(session_id),
  operation VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_elevated_recent (user_id, created_at)
);
```

### Session Context Propagation

```typescript
// NestJS middleware for session context
@Injectable()
export class SessionContextMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const sessionId = req.headers['x-session-id'];
    const deviceId = req.headers['x-device-id'];

    if (sessionId && deviceId) {
      // Kiosk session
      const session = await this.validatePinSession(sessionId, deviceId);
      req.user = session.user;
      req.session = session;
      req.isKiosk = true;

      // PostgreSQL session context beállítás
      await this.setDbContext(session);
    } else {
      // Standard JWT session
      // ... JWT validation
    }

    next();
  }

  private async setDbContext(session: PinSession) {
    await prisma.$executeRaw`
      SELECT set_config('app.current_user_id', ${session.userId}::text, true);
      SELECT set_config('app.current_tenant_id', ${session.tenantId}::text, true);
      SELECT set_config('app.current_session_id', ${session.sessionId}::text, true);
    `;
  }
}
```

---

## UI Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    KIOSK BELÉPÉS UI                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│               ┌─────────────────────┐                       │
│               │                     │                       │
│               │    KGC ERP v7.0     │                       │
│               │                     │                       │
│               │   [Pult-1 Tablet]   │                       │
│               │                     │                       │
│               └─────────────────────┘                       │
│                                                             │
│                    Adja meg PIN kódját                      │
│                                                             │
│               ┌─────────────────────┐                       │
│               │   [●] [●] [●] [●]   │                       │
│               └─────────────────────┘                       │
│                                                             │
│               ┌───┬───┬───┐                                 │
│               │ 1 │ 2 │ 3 │                                 │
│               ├───┼───┼───┤                                 │
│               │ 4 │ 5 │ 6 │                                 │
│               ├───┼───┼───┤                                 │
│               │ 7 │ 8 │ 9 │                                 │
│               ├───┼───┼───┤                                 │
│               │ ⌫ │ 0 │ ✓ │                                 │
│               └───┴───┴───┘                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🔒 Session lejárt: 5 perc inaktivitás                     │
│  👤 Felhasználó váltás: új PIN megadásával                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Következmények

### Pozitív
- Gyors felhasználóváltás (< 5 sec)
- Biztonságos audit trail minden művelethez
- Auto-lock védi a nyitott session-öket
- Elevated access kritikus műveletekhez

### Negatív
- PIN management overhead (elfelejtett PIN-ek)
- Device regisztráció admin beavatkozás igényel

### Kockázatok
- **PIN brute-force:** Max 5 próbálkozás → 15 perc lockout
- **Device theft:** Device token revoke lehetőség
