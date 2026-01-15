# ADR-027: Járműnyilvántartás Modul

**Státusz:** Accepted
**Dátum:** 2026-01-04
**Döntéshozók:** Architect, PM
**Kapcsolódó:** ADR-001 (Multi-tenancy), ADR-014 (Moduláris Architektúra)

---

## Kontextus

A KGC ERP rendszerben két különböző járműtípus nyilvántartására van szükség, eltérő jogosultsági és dokumentumkezelési követelményekkel:

### Üzleti Probléma

1. **Bérgép járművek** (utánfutók, aggregátorok) - Ezek a bérlési modulhoz kapcsolódnak, bérbe adhatók az ügyfeleknek
2. **Céges gépkocsik** - A cég tulajdonában lévő járművek, amelyek biztosítási és hatósági dokumentumait kell nyilvántartani

### Jelenlegi Helyzet

- Nincs járműnyilvántartás a rendszerben
- Lejáró dokumentumokról (műszaki vizsga, biztosítás, pályamatrica) nincs automatikus értesítés
- Manuális Excel táblázatban követik a járműveket

---

## Döntési Kérdés

**Hogyan valósítsuk meg a járműnyilvántartást úgy, hogy a két kategória eltérő követelményeit kezelje?**

---

## Döntési Tényezők

1. **Szétválasztás:** Bérgép járművek és céges gépkocsik külön kezelése
2. **Egyszerűség:** Nincs szükség komplex flottakezelési funkciókra (GPS, km, üzemanyag)
3. **Emlékeztetők:** Lejáró dokumentumokról időben értesítés
4. **Jogosultság:** Eltérő hozzáférési szintek a két kategóriához
5. **Dokumentumkezelés:** Eltérő dokumentumtípusok a két kategóriához

---

## Vizsgált Opciók

### Opció A: Egységes Járműtábla Típus Mezővel

**Leírás:** Egyetlen `vehicles` tábla, `vehicle_category` mezővel megkülönböztetve.

**Előnyök:**
- Egyszerű séma
- Közös lekérdezések

**Hátrányok:**
- Sok NULL mező (ami egyik kategóriára nem vonatkozik)
- Bonyolultabb validáció

---

### Opció B: Két Külön Tábla (Javasolt)

**Leírás:** `rental_vehicles` (bérgép járművek) és `company_vehicles` (céges gépkocsik) külön táblákban, eltérő mezőkkel.

**Előnyök:**
- Tiszta szétválasztás
- Kategória-specifikus mezők
- Egyszerűbb validáció
- Eltérő jogosultságok könnyebben kezelhetők

**Hátrányok:**
- Két tábla karbantartása
- Közös riportokhoz UNION szükséges

---

### Opció C: Öröklődéses Séma (STI)

**Leírás:** Single Table Inheritance az ORM szinten.

**Előnyök:**
- ORM szintű elegancia

**Hátrányok:**
- Komplex séma
- Nehezebb adatbázis szintű validáció
- Túlzott komplexitás a feladathoz képest

---

## Döntés

**Választott opció: Opció B - Két Külön Tábla**

### Indoklás

1. **Tiszta szétválasztás:** A két kategória eltérő dokumentumtípusokat és jogosultságokat igényel
2. **Egyszerűség:** Nincs szükség komplex flottakezelésre (GPS, km, üzemanyag kártya)
3. **Jogosultság:** Könnyebb az eltérő hozzáférési szintek implementálása
4. **Bővíthetőség:** Később külön fejleszthető mindkét kategória

---

## Implementációs Terv

### 1. Járműkategóriák Definíciója

#### 1.1 Bérgép Járművek (`rental_vehicles`)

**Típusok:**
- Utánfutók
- Aggregátorok
- Egyéb bérelhető járművek/eszközök

**Kötelező dokumentumok:**
| Dokumentum | Lejárat követés | Emlékeztető |
|------------|-----------------|-------------|
| Rendszám | - | - |
| Forgalmi engedély | ✅ | 30/60 nap |
| Műszaki vizsga | ✅ | 30/60 nap |

**Jogosultság:**
- Level 2+ (üzletkötő, boltvezető, admin)
- Level 0-1 (eladó) NEM látja

---

#### 1.2 Céges Gépkocsik (`company_vehicles`)

**Típusok:**
- Személygépkocsik
- Kisteherautók
- Furgonok

**Kötelező dokumentumok:**
| Dokumentum | Lejárat követés | Emlékeztető |
|------------|-----------------|-------------|
| Rendszám | - | - |
| Forgalmi engedély | ✅ | 30/60 nap |
| Műszaki vizsga | ✅ | 30/60 nap |
| KGFB biztosítás | ✅ | 30/60 nap |
| CASCO biztosítás | ✅ | 30/60 nap |
| Pályamatrica | ✅ | 30/60 nap |

**Jogosultság:**
- Level 1 (eladó) - alap hozzáférés (opcionális, konfiguráció alapján)
- Boltvezető - teljes hozzáférés a saját bolthoz
- Admin - teljes hozzáférés

---

### 2. Kizárt Funkciók (Scope-on Kívül)

A következő funkciók **NEM** részei a modulnak:

| Funkció | Indoklás |
|---------|----------|
| Üzemanyag kártya nyilvántartás | Nincs igény, külső rendszerben kezelik |
| Km tracking | Túl komplex, nincs üzleti igény |
| GPS integráció | Költséges, nincs prioritás |
| Jogosítvány kategória ellenőrzés | B kategória elég minden járműhöz |
| Szerviznapló | Külső szervizek kezelik |
| Tankolási napló | Üzemanyag kártya rendszerében van |

---

### 3. Adatbázis Séma

```sql
-- Bérgép járművek (tenant-specifikus)
CREATE TABLE rental_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Alapadatok
  license_plate VARCHAR(20) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,  -- 'utanfuto', 'aggregator', 'egyeb'
  brand VARCHAR(100),
  model VARCHAR(100),
  description TEXT,

  -- Kapcsolat bérgép modulhoz
  bergep_id UUID REFERENCES bergep(id),

  -- Dokumentumok
  registration_doc_number VARCHAR(50),  -- Forgalmi szám
  registration_valid_until DATE,
  technical_inspection_valid_until DATE,

  -- Státusz
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'inactive', 'sold'

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(tenant_id, license_plate)
);

-- Céges gépkocsik (központi - public séma)
CREATE TABLE company_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alapadatok
  license_plate VARCHAR(20) NOT NULL UNIQUE,
  vehicle_type VARCHAR(50) NOT NULL,  -- 'szemelyauto', 'kisteher', 'furgon'
  brand VARCHAR(100),
  model VARCHAR(100),
  year_of_manufacture INTEGER,
  vin VARCHAR(17),  -- Alvázszám

  -- Hozzárendelés
  assigned_tenant_id UUID REFERENCES tenants(id),
  assigned_user_id UUID REFERENCES users(id),

  -- Dokumentumok - Forgalmi és műszaki
  registration_doc_number VARCHAR(50),
  registration_valid_until DATE,
  technical_inspection_valid_until DATE,

  -- Biztosítások
  kgfb_policy_number VARCHAR(50),
  kgfb_insurer VARCHAR(100),
  kgfb_valid_until DATE,

  casco_policy_number VARCHAR(50),
  casco_insurer VARCHAR(100),
  casco_valid_until DATE,

  -- Pályamatrica
  highway_sticker_category VARCHAR(10),  -- 'D1', 'D2', 'U', stb.
  highway_sticker_valid_until DATE,

  -- Státusz
  status VARCHAR(20) DEFAULT 'active',

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Dokumentum lejárati emlékeztetők log
CREATE TABLE vehicle_document_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polimorf kapcsolat
  vehicle_type VARCHAR(20) NOT NULL,  -- 'rental' vagy 'company'
  vehicle_id UUID NOT NULL,

  -- Emlékeztető részletek
  document_type VARCHAR(50) NOT NULL,
  expiry_date DATE NOT NULL,
  reminder_days_before INTEGER NOT NULL,  -- 30 vagy 60

  -- Küldés státusz
  notification_sent_at TIMESTAMP,
  notification_type VARCHAR(20),  -- 'push', 'email', 'both'
  sent_to_user_ids UUID[],

  -- Ismétlés kezelés
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexek
CREATE INDEX idx_rental_vehicles_tenant ON rental_vehicles(tenant_id);
CREATE INDEX idx_rental_vehicles_status ON rental_vehicles(tenant_id, status);
CREATE INDEX idx_company_vehicles_assigned ON company_vehicles(assigned_tenant_id);
CREATE INDEX idx_vehicle_reminders_expiry ON vehicle_document_reminders(expiry_date);
```

---

### 4. Emlékeztető Rendszer

#### 4.1 Emlékeztető Időzítés

| Dokumentum típus | 60 napos emlékeztető | 30 napos emlékeztető |
|------------------|----------------------|----------------------|
| Műszaki vizsga | ✅ | ✅ |
| Forgalmi engedély | ✅ | ✅ |
| KGFB biztosítás | ✅ | ✅ |
| CASCO biztosítás | ✅ | ✅ |
| Pályamatrica | ✅ | ✅ |

#### 4.2 Értesítési Csatornák

```
┌─────────────────────────────────────────────────────────────┐
│  EMLÉKEZTETŐ RENDSZER                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Napi CRON Job (06:00)                               │   │
│  │                                                      │   │
│  │  1. Lejáró dokumentumok lekérdezése                 │   │
│  │     - 60 napon belül lejáró                         │   │
│  │     - 30 napon belül lejáró                         │   │
│  │                                                      │   │
│  │  2. Értesítések küldése                              │   │
│  │     ├─ 🔔 Push notification (PWA)                   │   │
│  │     └─ 📧 Email (admin/boltvezető)                  │   │
│  │                                                      │   │
│  │  3. Log mentése (vehicle_document_reminders)        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Címzettek:                                                 │
│  ├─ Bérgép jármű → Boltvezető + Tenant admin              │
│  └─ Céges gépkocsi → Hozzárendelt user + Central admin    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 4.3 Emlékeztető Szolgáltatás

```typescript
@Injectable()
export class VehicleReminderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  @Cron('0 6 * * *')  // Minden nap 06:00-kor
  async checkExpiringDocuments(): Promise<void> {
    const today = new Date();
    const in30Days = addDays(today, 30);
    const in60Days = addDays(today, 60);

    // Bérgép járművek ellenőrzése
    await this.checkRentalVehicles(in30Days, in60Days);

    // Céges gépkocsik ellenőrzése
    await this.checkCompanyVehicles(in30Days, in60Days);
  }

  private async checkCompanyVehicles(in30Days: Date, in60Days: Date): Promise<void> {
    const expiringDocs = await this.prisma.$queryRaw`
      SELECT
        id,
        license_plate,
        'technical_inspection' as doc_type,
        technical_inspection_valid_until as expiry_date,
        assigned_user_id
      FROM company_vehicles
      WHERE technical_inspection_valid_until BETWEEN CURRENT_DATE AND ${in60Days}
        AND status = 'active'

      UNION ALL

      SELECT id, license_plate, 'kgfb', kgfb_valid_until, assigned_user_id
      FROM company_vehicles
      WHERE kgfb_valid_until BETWEEN CURRENT_DATE AND ${in60Days}
        AND status = 'active'

      UNION ALL

      SELECT id, license_plate, 'casco', casco_valid_until, assigned_user_id
      FROM company_vehicles
      WHERE casco_valid_until BETWEEN CURRENT_DATE AND ${in60Days}
        AND status = 'active'

      UNION ALL

      SELECT id, license_plate, 'highway_sticker', highway_sticker_valid_until, assigned_user_id
      FROM company_vehicles
      WHERE highway_sticker_valid_until BETWEEN CURRENT_DATE AND ${in60Days}
        AND status = 'active'
    `;

    for (const doc of expiringDocs) {
      const daysUntilExpiry = differenceInDays(doc.expiry_date, new Date());
      const reminderDays = daysUntilExpiry <= 30 ? 30 : 60;

      // Ellenőrzés, hogy küldtünk-e már ilyen emlékeztetőt
      const alreadySent = await this.wasReminderSent(
        'company',
        doc.id,
        doc.doc_type,
        reminderDays
      );

      if (!alreadySent) {
        await this.sendReminder(doc, reminderDays);
      }
    }
  }

  private async sendReminder(doc: ExpiringDocument, reminderDays: number): Promise<void> {
    const message = this.formatReminderMessage(doc, reminderDays);

    // Push notification
    await this.notificationService.sendPush({
      userId: doc.assigned_user_id,
      title: 'Járműdokumentum lejár!',
      body: message,
      data: { vehicleId: doc.id, docType: doc.doc_type }
    });

    // Email az adminoknak
    await this.emailService.send({
      to: await this.getAdminEmails(),
      subject: `[KGC] Járműdokumentum lejár: ${doc.license_plate}`,
      template: 'vehicle-document-expiry',
      context: { document: doc, daysRemaining: reminderDays }
    });

    // Log mentése
    await this.logReminder(doc, reminderDays);
  }

  private formatReminderMessage(doc: ExpiringDocument, days: number): string {
    const docNames = {
      'technical_inspection': 'Műszaki vizsga',
      'kgfb': 'KGFB biztosítás',
      'casco': 'CASCO biztosítás',
      'highway_sticker': 'Pályamatrica',
      'registration': 'Forgalmi engedély'
    };

    return `${doc.license_plate}: ${docNames[doc.doc_type]} ${days} napon belül lejár!`;
  }
}
```

---

### 5. Jogosultsági Mátrix

#### 5.1 Bérgép Járművek (`rental_vehicles`)

| Szerepkör | Listázás | Létrehozás | Módosítás | Törlés |
|-----------|----------|------------|-----------|--------|
| SUPER_ADMIN | ✅ Összes | ✅ | ✅ | ✅ |
| CENTRAL_ADMIN | ✅ Összes | ✅ | ✅ | ✅ |
| FRANCHISE_ADMIN | ✅ Saját tenant | ✅ | ✅ | ✅ |
| BRANCH_MANAGER | ✅ Saját bolt | ✅ | ✅ | ❌ |
| SENIOR_OPERATOR (Level 2) | ✅ Saját bolt | ❌ | ❌ | ❌ |
| OPERATOR (Level 1) | ❌ | ❌ | ❌ | ❌ |
| VIEWER (Level 0) | ❌ | ❌ | ❌ | ❌ |

#### 5.2 Céges Gépkocsik (`company_vehicles`)

| Szerepkör | Listázás | Létrehozás | Módosítás | Törlés |
|-----------|----------|------------|-----------|--------|
| SUPER_ADMIN | ✅ Összes | ✅ | ✅ | ✅ |
| CENTRAL_ADMIN | ✅ Összes | ✅ | ✅ | ✅ |
| FRANCHISE_ADMIN | ✅ Saját tenant | ❌ | ❌ | ❌ |
| BRANCH_MANAGER | ✅ Saját bolt | ❌ | ✅ Részleges* | ❌ |
| OPERATOR (Level 1) | ✅ Opcionális** | ❌ | ❌ | ❌ |

*Boltvezető csak a hozzárendelt gépkocsi adatait frissítheti (pl. pályamatrica megújítás jelzése)
**Konfiguráció alapján engedélyezhető a Level 1 számára is

---

### 6. API Endpoint-ok

```typescript
// === BÉRGÉP JÁRMŰVEK ===

// Listázás (tenant-szűrt)
GET /api/rental-vehicles
// Query params: ?status=active&type=utanfuto

// Részletek
GET /api/rental-vehicles/:id

// Létrehozás
POST /api/rental-vehicles
{
  "license_plate": "ABC-123",
  "vehicle_type": "utanfuto",
  "brand": "Pongratz",
  "model": "L-AT 300",
  "registration_valid_until": "2027-06-15",
  "technical_inspection_valid_until": "2026-12-01"
}

// Módosítás
PATCH /api/rental-vehicles/:id

// Bérgép kapcsolás
PATCH /api/rental-vehicles/:id/link-bergep
{
  "bergep_id": "uuid"
}

// === CÉGES GÉPKOCSIK ===

// Listázás
GET /api/company-vehicles
// Query params: ?assigned_tenant_id=uuid&status=active

// Részletek
GET /api/company-vehicles/:id

// Létrehozás (csak admin)
POST /api/company-vehicles
{
  "license_plate": "KGC-001",
  "vehicle_type": "kisteher",
  "brand": "Ford",
  "model": "Transit",
  "year_of_manufacture": 2022,
  "vin": "WF0XXXGCDXXX12345",
  "kgfb_policy_number": "KGFB-2026-001",
  "kgfb_insurer": "Allianz",
  "kgfb_valid_until": "2027-01-01"
}

// Módosítás
PATCH /api/company-vehicles/:id

// Hozzárendelés
PATCH /api/company-vehicles/:id/assign
{
  "assigned_tenant_id": "uuid",
  "assigned_user_id": "uuid"
}

// === EMLÉKEZTETŐK ===

// Lejáró dokumentumok listázása
GET /api/vehicles/expiring-documents
// Query params: ?days=30&type=all

// Emlékeztető előzmények
GET /api/vehicles/:type/:id/reminder-history
```

---

### 7. Frontend UI

```
┌─────────────────────────────────────────────────────────────┐
│  JÁRMŰNYILVÁNTARTÁS                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Bérgép járművek]  [Céges gépkocsik]                       │
│                                                             │
│  ═══════════════════════════════════════════════════════    │
│  BÉRGÉP JÁRMŰVEK                          [+ Új jármű]      │
│  ═══════════════════════════════════════════════════════    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ABC-123 │ Utánfutó │ Pongratz L-AT 300              │    │
│  │ Műszaki: 2026-12-01 │ ⚠️ 30 napon belül lejár!      │    │
│  │ [Részletek]  [Szerkesztés]                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ XYZ-789 │ Aggregátor │ Honda EU70is                 │    │
│  │ Műszaki: 2027-05-15 │ ✅ Érvényes                   │    │
│  │ [Részletek]  [Szerkesztés]                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  CÉGES GÉPKOCSI RÉSZLETEK                             [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Rendszám: KGC-001                                          │
│  Típus: Ford Transit (2022)                                 │
│  Hozzárendelve: KGC Pest - Kovács János                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  DOKUMENTUMOK                                               │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📋 Forgalmi engedély                                       │
│     Szám: AB123456                                          │
│     Érvényes: 2028-03-15  ✅                                │
│                                                             │
│  🔧 Műszaki vizsga                                          │
│     Érvényes: 2026-06-30  ⚠️ 60 napon belül lejár          │
│                                                             │
│  🛡️ KGFB Biztosítás                                         │
│     Kötvényszám: KGFB-2026-001                              │
│     Biztosító: Allianz                                      │
│     Érvényes: 2027-01-01  ✅                                │
│                                                             │
│  🛡️ CASCO Biztosítás                                        │
│     Kötvényszám: CASCO-2026-001                             │
│     Biztosító: Generali                                     │
│     Érvényes: 2027-01-01  ✅                                │
│                                                             │
│  🛣️ Pályamatrica                                            │
│     Kategória: D2                                           │
│     Érvényes: 2026-01-31  ⚠️ 30 napon belül lejár!         │
│                                                             │
│                              [Szerkesztés]  [Bezárás]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🔔 LEJÁRÓ DOKUMENTUMOK                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  30 napon belül lejár:                                      │
│  ├─ KGC-001: Pályamatrica (2026-01-31)                     │
│  └─ ABC-123: Műszaki vizsga (2026-12-01)                   │
│                                                             │
│  60 napon belül lejár:                                      │
│  └─ KGC-001: Műszaki vizsga (2026-06-30)                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Következmények

### Pozitív

- **Tiszta szétválasztás:** Bérgép és céges járművek külön kezelése
- **Automatikus emlékeztetők:** Nem felejtődik el a dokumentumok megújítása
- **Megfelelő jogosultság:** Érzékeny adatok (biztosítás) védettek
- **Egyszerűség:** Nincs túlbonyolított flottakezelés

### Negatív

- **Két tábla:** Közös riportokhoz UNION szükséges
- **Manuális frissítés:** A felhasználóknak frissíteni kell a lejárati dátumokat

### Kockázatok

| Kockázat | Valószínűség | Hatás | Mitigáció |
|----------|--------------|-------|-----------|
| Elfelejtett dokumentum frissítés | Közepes | Közepes | 30 + 60 napos dupla emlékeztető |
| Emlékeztető nem érkezik meg | Alacsony | Közepes | Push + email dupla csatorna |
| Hibás adatbevitel | Közepes | Alacsony | Validáció (rendszám formátum, dátumok) |

---

## Kapcsolódó Döntések

- **ADR-001:** Multi-tenancy - tenant szűrés alapja
- **ADR-014:** Moduláris Architektúra - séma struktúra
- **ADR-008:** Device Auth - jogosultsági szintek

---

## Függőben Lévő Kérdések

1. ✅ **Üzemanyag kártya:** Nem szükséges - döntés meghozva
2. ✅ **GPS tracking:** Nem szükséges - döntés meghozva
3. ✅ **Km nyilvántartás:** Nem szükséges - döntés meghozva
4. ⏳ **Dokumentum szkennelés:** Szükséges-e a dokumentumok fotójának tárolása?

---

## Változásnapló

| Verzió | Dátum | Változás |
|--------|-------|----------|
| 1.0 | 2026-01-04 | Első verzió - Accepted státusz |
