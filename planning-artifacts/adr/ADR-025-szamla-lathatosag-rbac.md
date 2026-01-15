# ADR-025: Számla Láthatóság és Hozzáférés-kezelés

**Státusz:** Accepted
**Dátum:** 2026-01-03
**Döntéshozók:** Architect, PM, Security Lead
**Kapcsolódó:** ADR-001 (Multi-tenancy), ADR-008 (Device Auth)

---

## Kontextus

A KGC ERP v3 rendszerben különböző típusú számlák kezelése szükséges, amelyek eltérő láthatósági követelményekkel rendelkeznek:

### Üzleti Probléma

1. **Költségszámlák** (beruházások, fejlesztések, beszerzések) - Ezek a vállalat belső pénzügyi információit tartalmazzák, amelyek nem lehetnek láthatóak minden dolgozó számára
2. **Ügyfél számlák** (értékesítés, szolgáltatás) - Ezekhez minden bolti dolgozónak hozzá kell férnie visszakeresés és újraküldés céljából
3. **Szerviz számlák** - Szervizes és bolti dolgozók számára egyaránt elérhetőnek kell lenniük

### Jelenlegi Helyzet

- Nincs számla-szintű hozzáférés-vezérlés
- Minden számla minden jogosult felhasználó számára látható
- Bizalmas pénzügyi információk (pl. beruházási költségek) kiszivároghatnak

---

## Döntési Kérdés

**Hogyan valósítsuk meg a számla-szintű láthatósági kontrollt anélkül, hogy a napi működést akadályoznánk?**

---

## Döntési Tényezők

1. **Bizalmasság:** Költségszámlák csak felsővezetés számára
2. **Operativitás:** Ügyfél számlák gyorsan elérhetőek legyenek
3. **Egyszerűség:** Ne legyen túl komplex a kezelés
4. **Auditálhatóság:** Ki látta/módosította a láthatósági beállítást
5. **Alapértelmezés:** Automatikus kategorizálás számla típus alapján

---

## Vizsgált Opciók

### Opció A: Számla Típus Alapú Fix Szabályok

**Leírás:** Minden számla típushoz fix láthatósági szabály.

**Előnyök:**
- ✅ Egyszerű implementáció
- ✅ Nincs felhasználói döntés szükséges

**Hátrányok:**
- ❌ Nem rugalmas (kivételek kezelése nehéz)
- ❌ Nem lehet felülbírálni

---

### Opció B: Visibility Mező + RLS Policy (Javasolt)

**Leírás:** Minden számlához `visibility` mező, alapértelmezett értékkel a számla típus alapján. RLS (Row Level Security) policy biztosítja a hozzáférés-vezérlést.

```
Ügyfél számla → visibility: 'public' (alapértelmezett)
Költség számla → visibility: 'restricted' (alapértelmezett)
Szerviz számla → visibility: 'public' (alapértelmezett)
```

**Előnyök:**
- ✅ Rugalmas - felülbírálható igény esetén
- ✅ Adatbázis szintű védelem (RLS)
- ✅ Automatikus alapértelmezés

**Hátrányok:**
- ❌ Komplexebb implementáció
- ❌ RLS policy karbantartás

---

### Opció C: Szerepkör Alapú Teljes Szétválasztás

**Leírás:** Külön modul a költségszámlákhoz, teljesen szeparált jogosultsági rendszerrel.

**Előnyök:**
- ✅ Maximális elkülönítés

**Hátrányok:**
- ❌ Duplikált logika
- ❌ Nehezebb karbantartás
- ❌ Összesített riportok bonyolultak

---

## Döntés

**Választott opció: Opció B - Visibility Mező + RLS Policy**

### Indoklás

1. **Rugalmasság:** Alapértelmezett szabályok, de felülbírálható kivételek
2. **Biztonság:** RLS policy adatbázis szinten garantálja a hozzáférés-vezérlést
3. **Operativitás:** Ügyfél számlák továbbra is gyorsan elérhetőek
4. **Auditálhatóság:** Láthatóság változás naplózható

---

## Implementációs Terv

### 1. Visibility Enum Definíció

```typescript
// TypeScript típusdefiníció
enum InvoiceVisibility {
  PUBLIC = 'public',       // Minden jogosult felhasználó látja
  RESTRICTED = 'restricted' // Csak CENTRAL_ADMIN, FRANCHISE_ADMIN, BRANCH_MANAGER
}

enum InvoiceType {
  CUSTOMER = 'customer',     // Ügyfél számla (értékesítés)
  SERVICE = 'service',       // Szerviz számla
  EXPENSE = 'expense',       // Költségszámla (beszerzés)
  INVESTMENT = 'investment', // Beruházási számla
  INTERNAL = 'internal'      // Belső elszámolás
}

interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  visibility: InvoiceVisibility;
  visibility_changed_by?: string;
  visibility_changed_at?: Date;
  // ... egyéb mezők
}
```

### 2. Adatbázis Séma

```sql
-- Visibility enum típus
CREATE TYPE invoice_visibility AS ENUM ('public', 'restricted');
CREATE TYPE invoice_type AS ENUM ('customer', 'service', 'expense', 'investment', 'internal');

-- Invoices tábla bővítés
ALTER TABLE invoices
  ADD COLUMN visibility invoice_visibility NOT NULL DEFAULT 'public',
  ADD COLUMN visibility_changed_by UUID REFERENCES users(id),
  ADD COLUMN visibility_changed_at TIMESTAMP;

-- Automatikus visibility beállítás trigger
CREATE OR REPLACE FUNCTION set_default_invoice_visibility()
RETURNS TRIGGER AS $$
BEGIN
  -- Költség és beruházási számlák alapértelmezetten restricted
  IF NEW.invoice_type IN ('expense', 'investment', 'internal') THEN
    NEW.visibility := 'restricted';
  ELSE
    NEW.visibility := 'public';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_default_visibility
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.visibility IS NULL)
  EXECUTE FUNCTION set_default_invoice_visibility();

-- Index a gyors szűréshez
CREATE INDEX idx_invoices_visibility ON invoices(tenant_id, visibility);
CREATE INDEX idx_invoices_type_visibility ON invoices(invoice_type, visibility);
```

### 3. RLS Policy

```sql
-- RLS engedélyezése az invoices táblán
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Alapvető tenant szűrés policy (ADR-001 alapján)
CREATE POLICY invoice_tenant_isolation ON invoices
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Láthatósági policy
CREATE POLICY invoice_visibility_policy ON invoices
  FOR SELECT
  USING (
    -- Public számlák mindenki számára láthatóak
    visibility = 'public'
    OR
    -- Restricted számlák csak vezetőknek
    (
      visibility = 'restricted'
      AND current_setting('app.current_user_role') IN (
        'SUPER_ADMIN',
        'CENTRAL_ADMIN',
        'FRANCHISE_ADMIN',
        'BRANCH_MANAGER',
        'HOLDING_ADMIN'
      )
    )
  );

-- Update policy - ki módosíthatja a visibility-t
CREATE POLICY invoice_visibility_update ON invoices
  FOR UPDATE
  USING (
    current_setting('app.current_user_role') IN (
      'SUPER_ADMIN',
      'CENTRAL_ADMIN',
      'FRANCHISE_ADMIN',
      'BRANCH_MANAGER'
    )
  )
  WITH CHECK (
    current_setting('app.current_user_role') IN (
      'SUPER_ADMIN',
      'CENTRAL_ADMIN',
      'FRANCHISE_ADMIN',
      'BRANCH_MANAGER'
    )
  );
```

### 4. Jogosultsági Mátrix

| Szerepkör | Public Számla | Restricted Számla | Visibility Módosítás |
|-----------|---------------|-------------------|----------------------|
| SUPER_ADMIN | ✅ Teljes | ✅ Teljes | ✅ |
| CENTRAL_ADMIN | ✅ Teljes | ✅ Teljes | ✅ |
| HOLDING_ADMIN | ✅ Teljes | ✅ Teljes | ❌ |
| FRANCHISE_ADMIN | ✅ Teljes | ✅ Saját tenant | ✅ Saját tenant |
| BRANCH_MANAGER | ✅ Teljes | ✅ Saját bolt | ✅ Saját bolt |
| SENIOR_OPERATOR | ✅ Teljes | ❌ | ❌ |
| OPERATOR | ✅ Teljes | ❌ | ❌ |
| VIEWER | ✅ Olvasás | ❌ | ❌ |

### 5. API Endpoint-ok

```typescript
// Számla lekérdezés (automatikus visibility szűrés)
GET /api/invoices
// Response: Csak a felhasználó számára látható számlák

// Számla részletek
GET /api/invoices/:id
// Response: 403 Forbidden ha restricted és nincs joga

// Visibility módosítás (csak jogosultaknak)
PATCH /api/invoices/:id/visibility
{
  "visibility": "restricted" | "public"
}
// Response: { success: true, visibility: "restricted", changed_by: "user_name" }

// Visibility módosítás előzmények
GET /api/invoices/:id/visibility-history
// Response: [{ visibility: "restricted", changed_by: "Péter", changed_at: "2026-01-03T10:00:00Z" }]
```

### 6. NestJS Service Implementáció

```typescript
@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(userId: string, tenantId: string, userRole: string): Promise<Invoice[]> {
    // RLS automatikusan szűr, de explicit ellenőrzés is
    return this.prisma.$queryRaw`
      SELECT * FROM invoices
      WHERE tenant_id = ${tenantId}
      AND (
        visibility = 'public'
        OR (visibility = 'restricted' AND ${this.canViewRestricted(userRole)})
      )
      ORDER BY created_at DESC
    `;
  }

  async updateVisibility(
    invoiceId: string,
    visibility: InvoiceVisibility,
    userId: string,
    userRole: string
  ): Promise<Invoice> {
    // Jogosultság ellenőrzés
    if (!this.canModifyVisibility(userRole)) {
      throw new ForbiddenException('Nincs jogosultsága a láthatóság módosításához');
    }

    const invoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        visibility,
        visibility_changed_by: userId,
        visibility_changed_at: new Date(),
      },
    });

    // Audit log
    await this.auditService.log({
      action: 'INVOICE_VISIBILITY_CHANGE',
      entity_type: 'invoice',
      entity_id: invoiceId,
      user_id: userId,
      details: {
        old_visibility: invoice.visibility,
        new_visibility: visibility
      },
    });

    return invoice;
  }

  private canViewRestricted(role: string): boolean {
    return [
      'SUPER_ADMIN',
      'CENTRAL_ADMIN',
      'FRANCHISE_ADMIN',
      'BRANCH_MANAGER',
      'HOLDING_ADMIN'
    ].includes(role);
  }

  private canModifyVisibility(role: string): boolean {
    return [
      'SUPER_ADMIN',
      'CENTRAL_ADMIN',
      'FRANCHISE_ADMIN',
      'BRANCH_MANAGER'
    ].includes(role);
  }
}
```

### 7. Frontend UI

```
┌─────────────────────────────────────────────────────────────┐
│  SZÁMLÁK                                    [+ Új számla]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Szűrők: [Típus ▼] [Dátum ▼] [Láthatóság ▼]                │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ #2026-0001 │ Ügyfél számla │ 🌐 Public  │ 45.000 Ft   │  │
│  │ Partner: Kis János         │ 2026-01-03              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ #2026-0002 │ Szerviz számla │ 🌐 Public │ 12.500 Ft   │  │
│  │ Partner: Nagy Péter         │ 2026-01-02              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ #2026-K001 │ Költségszámla │ 🔒 Restricted │ 850.000 Ft│  │
│  │ Szállító: Makita Hungary   │ 2026-01-01   [Módosítás] │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Jelmagyarázat: 🌐 Mindenki látja  🔒 Csak vezetők         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  LÁTHATÓSÁG MÓDOSÍTÁSA                              [X]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Számla: #2026-K001 - Makita Hungary beszerzés             │
│                                                             │
│  Jelenlegi láthatóság: 🔒 Restricted                        │
│                                                             │
│  Új láthatóság:                                             │
│  ○ 🌐 Public (mindenki látja)                              │
│  ● 🔒 Restricted (csak vezetők)                             │
│                                                             │
│  ⚠️ Figyelem: A módosítás naplózásra kerül!                │
│                                                             │
│                              [Mégse]  [Mentés]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8. Migráció

```sql
-- Meglévő számlák migrációja
-- FONTOS: Minden meglévő számla public marad a visszamenőleges kompatibilitás miatt

BEGIN;

-- 1. Visibility oszlop hozzáadása alapértelmezett 'public' értékkel
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS visibility invoice_visibility DEFAULT 'public';

-- 2. Minden meglévő számla → public (konzervatív megközelítés)
UPDATE invoices
SET visibility = 'public'
WHERE visibility IS NULL;

-- 3. Opcionálisan: költségszámlák átállítása restricted-re
-- FIGYELEM: Csak manuális jóváhagyás után futtatandó!
-- UPDATE invoices
-- SET visibility = 'restricted'
-- WHERE invoice_type IN ('expense', 'investment', 'internal');

-- 4. Index létrehozása
CREATE INDEX IF NOT EXISTS idx_invoices_visibility
ON invoices(tenant_id, visibility);

COMMIT;
```

---

## Következmények

### Pozitív

- **Biztonság:** Költségszámlák védettek az illetéktelen hozzáféréstől
- **Rugalmasság:** Kivételek kezelhetők (pl. public költségszámla ha szükséges)
- **Auditálhatóság:** Minden láthatóság-módosítás naplózva
- **Operativitás:** Ügyfél számlák továbbra is gyorsan elérhetőek
- **RLS védelem:** Adatbázis szintű garancia, nem csak alkalmazás szintű

### Negatív

- **Komplexitás:** RLS policy karbantartás szükséges
- **Teljesítmény:** RLS minimális overhead (< 1ms)
- **Felhasználói döntés:** Vezetőknek kell dönteni a visibility-ről

### Kockázatok

| Kockázat | Valószínűség | Hatás | Mitigáció |
|----------|--------------|-------|-----------|
| Rossz visibility beállítás | Közepes | Közepes | Alapértelmezés + audit log |
| RLS kikerülése | Alacsony | Kritikus | Közvetlen DB hozzáférés tiltása |
| Teljesítmény csökkenés | Alacsony | Alacsony | Index optimalizálás |

---

## Kapcsolódó Döntések

- **ADR-001:** Multi-tenancy - tenant_id szűrés alapja
- **ADR-005:** MyPos Payment - érzékeny adatok titkosítása minta
- **ADR-008:** Device Auth - jogosultsági szintek definíciója

---

## Függőben Lévő Kérdések

1. ⏳ **Riportok:** Restricted számlák szerepeljenek-e az összesítő riportokban?
2. ⏳ **Export:** Visibility szűrés alkalmazandó-e exportnál is?
3. ⏳ **Migráció:** Meglévő költségszámlák automatikusan restricted-re állítsuk?

---

## Változásnapló

| Verzió | Dátum | Változás |
|--------|-------|----------|
| 1.0 | 2026-01-03 | Első verzió - Accepted státusz |
