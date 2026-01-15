# ADR-031: Késedelmi Díj Kalkuláció Architektúra

**Státusz:** Accepted
**Dátum:** 2026-01-04
**Döntéshozók:** Architect, PM, Finance Lead
**Kapcsolódó:** FR15, ADR-006 (Audit Trail)

---

## Kontextus

A bérlési visszavétel során automatikusan kell kalkulálni a **késedelmi díjat**, ha az ügyfél a szerződött időpontnál később hozza vissza a gépet. A régi rendszer (Ver:1.33z) manuális számítást igényelt, ami hibalehetőséget és vitákat generált.

Az üzleti igény:
> *"Ha valaki később hozza, akkor késedelmi díjat számítunk fel. A késedelmi díj általában napi díj * késett napok, de lehet grace period is."*

---

## Döntési Kérdés

**Hogyan számítsuk automatikusan a késedelmi díjat, hogy az igazságos, transzparens és audit-kompatibilis legyen?**

---

## Döntési Tényezők

1. **Igazságosság** - Grace period az apró késésekre
2. **Transzparencia** - Ügyfél lássa a kalkuláció részleteit
3. **Rugalmasság** - Tenant-specifikus szabályok
4. **Audit** - Minden módosítás naplózva
5. **Vita kezelés** - Kedvezmény adás lehetősége

---

## Döntés

### Késedelmi Díj Kalkulációs Algoritmus

```typescript
interface LateFeeConfig {
  gracePeriodHours: number;      // Ingyenes késési idő (default: 2 óra)
  dailyRateMultiplier: number;   // Napi díj szorzó (default: 1.0)
  maxLateDays: number;           // Maximum felszámítható napok (default: 30)
  roundingStrategy: 'up' | 'down' | 'nearest';  // Kerekítés
  weekendCounts: boolean;        // Hétvége beleszámít-e (default: true)
}

interface LateFeeCalculation {
  contractEndDate: Date;         // Szerződés szerinti visszavétel
  actualReturnDate: Date;        // Tényleges visszavétel
  gracePeriodEnd: Date;          // Grace period vége
  lateHours: number;             // Késett órák (grace után)
  lateDays: number;              // Késett napok (kerekített)
  dailyRate: number;             // Napi bérleti díj
  lateFee: number;               // Számított késedelmi díj
  appliedDiscount: number;       // Alkalmazott kedvezmény
  finalLateFee: number;          // Végső késedelmi díj
  calculationDetails: string;    // Audit részletek
}

function calculateLateFee(
  rental: Rental,
  actualReturn: Date,
  config: LateFeeConfig
): LateFeeCalculation {
  const contractEnd = new Date(rental.expectedReturnDate);
  const gracePeriodEnd = addHours(contractEnd, config.gracePeriodHours);

  // Ha grace period-on belül → nincs díj
  if (actualReturn <= gracePeriodEnd) {
    return {
      ...baseResult,
      lateHours: 0,
      lateDays: 0,
      lateFee: 0,
      finalLateFee: 0,
      calculationDetails: `Visszavétel a ${config.gracePeriodHours} órás grace period-on belül`
    };
  }

  // Késett idő számítás (grace period után)
  const lateMs = actualReturn.getTime() - gracePeriodEnd.getTime();
  const lateHours = lateMs / (1000 * 60 * 60);

  // Napokra kerekítés
  let lateDays: number;
  switch (config.roundingStrategy) {
    case 'up':
      lateDays = Math.ceil(lateHours / 24);
      break;
    case 'down':
      lateDays = Math.floor(lateHours / 24);
      break;
    case 'nearest':
      lateDays = Math.round(lateHours / 24);
      break;
  }

  // Maximum limitálás
  lateDays = Math.min(lateDays, config.maxLateDays);

  // Díj kalkuláció
  const dailyRate = rental.dailyRate;
  const lateFee = lateDays * dailyRate * config.dailyRateMultiplier;

  return {
    contractEndDate: contractEnd,
    actualReturnDate: actualReturn,
    gracePeriodEnd,
    lateHours,
    lateDays,
    dailyRate,
    lateFee,
    appliedDiscount: 0,
    finalLateFee: lateFee,
    calculationDetails: `Késés: ${lateDays} nap × ${dailyRate} Ft × ${config.dailyRateMultiplier} = ${lateFee} Ft`
  };
}
```

### Díjszámítási Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                KÉSEDELMI DÍJ KALKULÁCIÓ FLOW                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Visszavétel indítás                                           │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────┐                       │
│  │ 1. SZERZŐDÉS DÁTUM ELLENŐRZÉS       │                       │
│  │    - expectedReturnDate betöltés    │                       │
│  │    - actualReturnDate = NOW()       │                       │
│  └─────────────────────────────────────┘                       │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────┐                       │
│  │ 2. GRACE PERIOD CHECK               │                       │
│  │    - Default: +2 óra                │                       │
│  │    - Tenant config override         │                       │
│  └─────────────────────────────────────┘                       │
│         │                                                       │
│    ┌────┴────┐                                                  │
│    │         │                                                  │
│    ▼         ▼                                                  │
│ [Időben] [Késett]                                               │
│    │         │                                                  │
│    │         ▼                                                  │
│    │  ┌─────────────────────────────────────┐                  │
│    │  │ 3. KÉSEDELMI DÍJ KALKULÁCIÓ         │                  │
│    │  │    - lateDays = ceil((actual -      │                  │
│    │  │      grace) / 24h)                  │                  │
│    │  │    - lateFee = lateDays × dailyRate │                  │
│    │  └─────────────────────────────────────┘                  │
│    │         │                                                  │
│    │         ▼                                                  │
│    │  ┌─────────────────────────────────────┐                  │
│    │  │ 4. KEDVEZMÉNY LEHETŐSÉG             │                  │
│    │  │    - Operátor: nincs                │                  │
│    │  │    - Boltvezető: ±20%               │                  │
│    │  │    - Admin: 100%                    │                  │
│    │  └─────────────────────────────────────┘                  │
│    │         │                                                  │
│    └────┬────┘                                                  │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────┐                       │
│  │ 5. AUDIT LOG + TRANZAKCIÓ          │                       │
│  │    - Kalkuláció részletek mentve    │                       │
│  │    - Kedvezmény indoklás (ha van)   │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tenant-Specifikus Konfiguráció

```sql
CREATE TABLE LATE_FEE_CONFIG (
  tenant_id UUID PRIMARY KEY REFERENCES tenant(tenant_id),
  grace_period_hours INT DEFAULT 2,
  daily_rate_multiplier DECIMAL(3,2) DEFAULT 1.00,
  max_late_days INT DEFAULT 30,
  rounding_strategy VARCHAR(10) DEFAULT 'up',
  weekend_counts BOOLEAN DEFAULT TRUE,
  notify_on_late BOOLEAN DEFAULT TRUE,
  auto_calculate BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alapértelmezett értékek minden új tenant-nek
INSERT INTO LATE_FEE_CONFIG (tenant_id)
SELECT tenant_id FROM tenant
ON CONFLICT (tenant_id) DO NOTHING;
```

### Kedvezmény Kezelés

```typescript
interface LateFeeDiscount {
  rentalId: UUID;
  originalFee: number;
  discountPercent: number;
  discountAmount: number;
  finalFee: number;
  reason: string;               // Kötelező indoklás
  approvedBy: UUID;             // Jóváhagyó user
  approvedAt: Date;
}

// RBAC ellenőrzés
function canApplyDiscount(user: User, discountPercent: number): boolean {
  switch (user.role) {
    case 'OPERATOR':
      return false;                          // Nincs kedvezmény jog
    case 'BOLTVEZETO':
      return Math.abs(discountPercent) <= 20; // Max ±20%
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return true;                           // Bármennyi
    default:
      return false;
  }
}
```

### Audit Trail Integráció

```sql
-- Késedelmi díj specifikus audit
CREATE TABLE LATE_FEE_AUDIT (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID NOT NULL REFERENCES rental(rental_id),
  tenant_id UUID NOT NULL,

  -- Kalkuláció snapshot
  contract_end_date TIMESTAMPTZ NOT NULL,
  actual_return_date TIMESTAMPTZ NOT NULL,
  late_hours DECIMAL(10,2),
  late_days INT,
  daily_rate DECIMAL(10,2),
  calculated_fee DECIMAL(10,2),

  -- Kedvezmény (ha volt)
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_reason TEXT,
  final_fee DECIMAL(10,2),

  -- Meta
  calculated_by UUID REFERENCES users(user_id),
  approved_by UUID REFERENCES users(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_late_fee_rental (rental_id),
  INDEX idx_late_fee_tenant (tenant_id, created_at)
);
```

---

## UI Megjelenítés

```
┌─────────────────────────────────────────────────────────────┐
│                  KÉSEDELMI DÍJ PANEL                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📅 Szerződés lejárat:     2026-01-03 18:00                │
│  ⏰ Tényleges visszavétel:  2026-01-05 14:30               │
│  ────────────────────────────────────────                   │
│  ⚠️ Késés: 2 nap 20 óra 30 perc                            │
│     (Grace period: +2 óra alkalmazva)                       │
│                                                             │
│  💰 Kalkuláció:                                             │
│     Napi díj: 5.000 Ft                                      │
│     Késett napok: 3 (felkerekítve)                         │
│     Késedelmi díj: 15.000 Ft                               │
│                                                             │
│  [Boltvezető: Kedvezmény adás (-20% max)]                  │
│  ┌─────────────────────────────────────────┐               │
│  │ Kedvezmény: [____] %  Indok: [________] │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
│  Végső késedelmi díj: 15.000 Ft                            │
│                                                             │
│  [Elfogad és folytat]                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Következmények

### Pozitív
- Automatikus, hibamentes kalkuláció
- Grace period méltányos az ügyfeleknek
- RBAC-alapú kedvezmény kontroll
- Teljes audit trail vitákhoz

### Negatív
- Tenant konfiguráció komplexitás
- Kedvezmény indoklás kötelező (extra munka)

### Kockázatok
- **Helytelen konfiguráció:** Grace period 0 beállítás → ügyfél elégedetlenség
- **Túl nagy kedvezmény:** Boltvezető túlhasználja → riport monitoring
