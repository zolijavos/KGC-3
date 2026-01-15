# ADR-008: Device-based Authentication & Elevated Permissions

**Státusz:** Accepted
**Dátum:** 2025-12-08
**Döntéshozók:** Architect, PM, Security Lead
**Kapcsolódó:** ADR-001 (Multi-tenancy), ADR-007 (Employee Discount)

---

## Kontextus

A KGC ERP v3 rendszerben a bolti gépeken **kiosk mód** bevezetése szükséges. Az ügyfél megjegyzése:

> *"A belépésnél legyen egy alap belépési lehetőség, mert pl. ha Zoli nyitja reggel a rendszert, akkor mindenki látni fogja a hozzáféréseit. Tehát 3db bolti gépen alap felhasználási szintű belépés. A bevételező gépnél más jogosultsági szinttel lehessen belépni..."*

A cél: **közös alapszintű belépés** a bolti gépeken, de **magasabb jogosultságú műveletek** továbbra is egyéni azonosítást igényelnek.

---

## Döntési Kérdés

**Hogyan valósítsuk meg a gép-alapú hitelesítést és az átmeneti jogosultság emelést (elevated permissions)?**

---

## Döntési Tényezők

1. **Egyszerűség:** Reggeli nyitáskor gyors belépés
2. **Biztonság:** Érzékeny műveletek továbbra is védettek
3. **Nyomonkövetés:** Ki mit csinált, még kiosk módban is
4. **Rugalmasság:** Különböző gépekhez különböző alapértelmezett jogok
5. **Offline támogatás:** Kiosk mód offline is működjön

---

## Vizsgált Opciók

### Opció A: Mindig Egyéni Bejelentkezés

**Leírás:** Minden gép egyéni bejelentkezést igényel, mint eddig.

**Előnyök:**
- ✅ Maximális biztonság
- ✅ Teljes nyomonkövetés

**Hátrányok:**
- ❌ Lassú reggeli nyitás
- ❌ Jelszó megosztás kockázata
- ❌ Nem felel meg az ügyfél igényének

---

### Opció B: Gép-alapú Kiosk Mód + Elevated Session (Javasolt)

**Leírás:** Gépek előre regisztrálva alapértelmezett jogosultsággal. Magasabb jogú műveleteknél PIN kérés.

```
Reggel: Közös PIN → Kiosk mód (OPERATOR szint)
Művelet igényel MANAGER jogot → Személyes PIN → 5 perc elevated session
```

**Előnyök:**
- ✅ Gyors nyitás
- ✅ Érzékeny műveletek védettek
- ✅ Audit log minden elevated műveletről

**Hátrányok:**
- ❌ Komplexebb implementáció
- ❌ PIN menedzsment szükséges

---

### Opció C: Idő-alapú Automatikus Kijelentkezés

**Leírás:** Reggel egyéni belépés, de a rendszer nyitva marad X percig inaktivitás után.

**Előnyök:**
- ✅ Egyszerű
- ✅ Ismert UX pattern

**Hátrányok:**
- ❌ Biztonsági kockázat (nyitva maradt session)
- ❌ Nem megoldja a reggeli problémát

---

## Döntés

**Választott opció: Opció B - Gép-alapú Kiosk Mód + Elevated Session**

### Indoklás

1. **Ügyfél igény:** Pontosan ezt kérte - közös alap belépés, de védett műveletek
2. **Biztonság:** Elevated session naplózva, időkorláttal
3. **Rugalmasság:** Gépenkénti beállítás lehetséges
4. **ADR-007 integráció:** Dolgozói kedvezményhez PIN-nel azonosít

---

## Implementációs Terv

### 1. Adatbázis Séma

```sql
-- Regisztrált eszközök
CREATE TABLE DEVICE_REGISTRATION (
  device_id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id UUID NOT NULL,

  -- Azonosítás
  device_uuid UUID NOT NULL UNIQUE,       -- Generált eszköz azonosító
  device_name VARCHAR(100) NOT NULL,      -- "Bolt-1", "Pénztár", "Bevételező"

  -- Típus és jogosultság
  device_type ENUM('kiosk', 'backoffice', 'mobile', 'service') DEFAULT 'kiosk',
  default_role ENUM('VIEWER', 'OPERATOR', 'SENIOR_OPERATOR') DEFAULT 'OPERATOR',

  -- Kiosk PIN (bcrypt hash)
  kiosk_pin_hash VARCHAR(255),

  -- Hardver azonosítás (opcionális, extra biztonság)
  mac_address VARCHAR(17),
  hardware_id VARCHAR(100),

  -- Státusz
  aktiv BOOLEAN DEFAULT TRUE,
  last_login DATETIME,
  last_ip VARCHAR(45),

  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INT,

  INDEX idx_device_tenant (tenant_id),
  INDEX idx_device_uuid (device_uuid),
  INDEX idx_device_type (device_type),
  INDEX idx_device_aktiv (aktiv)
);

-- Elevated session-ök (PIN-nel emelt jogosultság)
CREATE TABLE DEVICE_ELEVATED_SESSION (
  session_id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id UUID NOT NULL,

  -- Kapcsolatok
  device_id INT NOT NULL,
  user_id INT NOT NULL,                   -- Ki adta meg a PIN-jét

  -- Session időzítés
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,           -- started_at + 5 perc
  ended_at DATETIME NULL,                 -- Manuális befejezés vagy lejárat

  -- Mi váltotta ki
  trigger_operation VARCHAR(100),         -- "berles_torles", "keszlet_modositas"

  -- Mi történt a session alatt
  operations_performed JSON,              -- ["berles_torles:123", "keszlet_modositas:456"]

  -- Kapcsolatok
  FOREIGN KEY (device_id) REFERENCES DEVICE_REGISTRATION(device_id),
  FOREIGN KEY (user_id) REFERENCES FELHASZNÁLÓ(felhasznalo_id),

  INDEX idx_elevated_device (device_id),
  INDEX idx_elevated_user (user_id),
  INDEX idx_elevated_active (ended_at),
  INDEX idx_elevated_expires (expires_at)
);

-- Felhasználó PIN (kiosk módhoz)
ALTER TABLE FELHASZNÁLÓ
  ADD COLUMN kiosk_pin_hash VARCHAR(255),  -- 4-6 számjegyű PIN bcrypt hash
  ADD COLUMN kiosk_pin_enabled BOOLEAN DEFAULT FALSE;
```

### 2. Gép Típusok és Alapértelmezett Jogok

| Gép Típus | Alapértelmezett Jog | Példa |
|-----------|---------------------|-------|
| `kiosk` | OPERATOR | Bolti pénztárgép (3 db) |
| `backoffice` | SENIOR_OPERATOR | Bevételező gép |
| `service` | OPERATOR | Szervizes laptop |
| `mobile` | VIEWER | Mobil leltár |

### 3. Jogosultság Hierarchia

```
┌─────────────────────────────────────────────────────────────┐
│              MŰVELETEK ÉS SZÜKSÉGES JOGOSULTSÁG             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  VIEWER (Szint 6)                                           │
│  ├─ Lekérdezések                                            │
│  └─ Riportok megtekintése                                   │
│                                                             │
│  OPERATOR (Szint 5) - Kiosk alapértelmezett                 │
│  ├─ Bérlés indítása                                         │
│  ├─ Bérlés visszavétele                                     │
│  ├─ Értékesítés (számla)                                    │
│  ├─ Szerviz felvétel                                        │
│  └─ Partner keresés                                         │
│                                                             │
│  SENIOR_OPERATOR (Szint 4) - Elevated szükséges             │
│  ├─ Késés kezelés                                           │
│  ├─ Árajánlat készítés                                      │
│  ├─ Készlet módosítás                                       │
│  ├─ Partner módosítás                                       │
│  └─ Kedvezmény alkalmazás (nem dolgozói)                    │
│                                                             │
│  BRANCH_MANAGER (Szint 3) - Elevated szükséges              │
│  ├─ Bérlés törlése                                          │
│  ├─ Számla sztornó                                          │
│  ├─ Pénztár zárás                                           │
│  └─ Felhasználó kezelés (saját bolt)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4. Bejelentkezési Folyamat

```
┌─────────────────────────────────────────────────────────────┐
│                   KIOSK BEJELENTKEZÉS                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. GÉP INDÍTÁS                                             │
│     │                                                       │
│     ▼                                                       │
│  ┌─────────────────┐                                        │
│  │ Eszköz UUID     │ ← Lokálisan tárolt / QR kód            │
│  │ ellenőrzés      │                                        │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ Kiosk PIN kérés │ ← 4 számjegy (közös a gépre)           │
│  │ [____]          │                                        │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ Kiosk Mód aktív │                                        │
│  │ Jog: OPERATOR   │                                        │
│  │ User: "Bolt-1"  │ ← Gép neve, nem személyes user         │
│  └─────────────────┘                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   ELEVATED SESSION                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  2. MŰVELET IGÉNYEL MAGASABB JOGOT                          │
│     │                                                       │
│     ▼                                                       │
│  ┌─────────────────┐                                        │
│  │ "Bérlés törlése │                                        │
│  │  MANAGER jogot  │                                        │
│  │  igényel"       │                                        │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ Személyes PIN   │ ← Péter: 1234, Levente: 5678           │
│  │ [____]          │                                        │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ PIN ellenőrzés  │                                        │
│  │ → User: Péter   │                                        │
│  │ → Jog: MANAGER  │                                        │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ Elevated Session│                                        │
│  │ létrehozva      │                                        │
│  │ Lejárat: 5 perc │                                        │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ Művelet         │                                        │
│  │ végrehajtva     │                                        │
│  │ + Audit log     │                                        │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ Visszaáll       │                                        │
│  │ OPERATOR szint  │                                        │
│  │ (5 perc múlva)  │                                        │
│  └─────────────────┘                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5. API Endpoint-ok

```typescript
// Kiosk bejelentkezés
POST /api/auth/kiosk/login
{
  "device_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "kiosk_pin": "1234"
}
// Response: { session_token, device_name, default_role: "OPERATOR" }

// Elevated session kérés
POST /api/auth/elevated
{
  "user_pin": "5678",
  "trigger_operation": "berles_torles"
}
// Response: { elevated_session_id, user_name, role, expires_at }

// Elevated session befejezés (manuális)
POST /api/auth/elevated/{session_id}/end

// Aktív session ellenőrzés
GET /api/auth/elevated/active
// Response: { has_elevated: true, user_name: "Péter", role: "MANAGER", expires_in: 240 }
```

### 6. Frontend Integráció

```typescript
// Middleware: Művelet előtt jogosultság ellenőrzés
async function checkPermission(requiredRole: string): Promise<boolean> {
  const currentRole = getCurrentRole();  // Kiosk vagy elevated

  if (hasPermission(currentRole, requiredRole)) {
    return true;
  }

  // Elevated session kérés
  const pin = await showPinDialog("Művelet magasabb jogot igényel");
  if (!pin) return false;

  try {
    const elevated = await api.post('/auth/elevated', { user_pin: pin });
    setElevatedSession(elevated);

    // Auto-expire timer
    setTimeout(() => {
      clearElevatedSession();
      showNotification("Emelt jogosultság lejárt");
    }, elevated.expires_in * 1000);

    return true;
  } catch (e) {
    showError("Hibás PIN vagy nincs jogosultság");
    return false;
  }
}

// Használat
async function deleteBerles(berlesId: number) {
  if (!await checkPermission('BRANCH_MANAGER')) {
    return;
  }

  await api.delete(`/berles/${berlesId}`);
  // Audit log automatikusan rögzíti az elevated user-t
}
```

### 7. Offline Támogatás

```typescript
// Offline módban az elevated session lokálisan tárolódik
interface OfflineElevatedSession {
  user_id: number;
  user_pin_hash: string;  // Lokálisan tárolt hash
  role: string;
  started_at: Date;
  expires_at: Date;
  operations: string[];
}

// Szinkronizáláskor feltöltődik a DEVICE_ELEVATED_SESSION táblába
```

---

## Biztonsági Megfontolások

### PIN Követelmények

| Követelmény | Érték |
|-------------|-------|
| Hossz | 4-6 számjegy |
| Tárolás | bcrypt hash (cost: 12) |
| Próbálkozások | Max 3, utána 5 perc lockout |
| Érvényesség | Nem jár le (de változtatható) |

### Session Biztonság

| Követelmény | Megoldás |
|-------------|----------|
| Timeout | 5 perc (konfigurálható) |
| Egyidejűség | 1 elevated session / device |
| Audit | Minden művelet naplózva |
| Offline | Lokális tárolás + sync |

---

## UI Megjelenítés

```
┌─────────────────────────────────────────────────────────────┐
│  KGC ERP - Bolt-1 (Kiosk mód)                    [Péter 👤] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🟢 Emelt jogosultság aktív                                 │
│  ├─ Felhasználó: Péter (BRANCH_MANAGER)                     │
│  ├─ Lejárat: 4:32                                           │
│  └─ [Befejezés]                                             │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Bérlés]  [Értékesítés]  [Szerviz]  [Készlet*]  [Beáll.*]  │
│                                                             │
│  * = Emelt jogosultság szükséges                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Következmények

### Pozitív
- Gyors reggeli nyitás
- Érzékeny műveletek védettek
- Teljes audit trail
- Offline támogatás

### Negatív
- PIN menedzsment overhead
- Komplexebb auth flow
- User training szükséges

### Kockázatok

| Kockázat | Valószínűség | Hatás | Mitigáció |
|----------|--------------|-------|-----------|
| PIN megosztás | Közepes | Közepes | Audit + policy |
| Elevated session elfelejtés | Alacsony | Alacsony | Auto-expire |
| Kiosk PIN kiszivárgás | Alacsony | Közepes | Rotáció policy |

---

## Kapcsolódó Döntések

- **ADR-001:** Multi-tenancy - device tenant_id
- **ADR-007:** Employee Discount - PIN-nel azonosítás kedvezményhez

---

## Függőben Lévő Kérdések

1. ⏳ **Elevated timeout:** 5 perc elég? Vagy 10?
2. ⏳ **PIN komplexitás:** 4 vagy 6 számjegy?
3. ⏳ **Lockout policy:** 3 próba után hány perc?

---

## Változásnapló

| Verzió | Dátum | Változás |
|--------|-------|----------|
| 1.0 | 2025-12-08 | Első verzió - Proposed státusz |
| 1.1 | 2025-12-09 | Státusz: Accepted |
