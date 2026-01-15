# ADR-009: Moduláris Architektúra Alternatívák

**Dátum:** 2025-12-10
**Státusz:** Döntés Előtt
**Döntéshozók:** Javo!, Winston (Architect)

---

## Kontextus

A KGC ERP rendszert **moduláris SaaS**-ként kívánjuk értékesíteni, ahol az ügyfelek kiválaszthatják a szükséges modulokat:
- **Szerviz** - Munkalapok, garanciális javítás
- **Bérlés** - Bérgép kezelés, szerződések
- **Áruház** - Készletkezelés, értékesítés

### Azonosított Problémák

A modulok **nem teljesen függetlenek**:

1. **CIKK/KÉSZLET** - Minden modul használja
2. **Bérgép ↔ Szerviz** - ROI számításhoz szükséges kapcsolat
3. **Alkatrész felhasználás** - Szerviz → Készlet csökkentés
4. **Partner** - Közös ügyfél entitás
5. **Számlázás** - Minden modulból indul

---

## Döntési Alternatívák

### Alternatíva A: Shared Core + Thin Modules (Nagy Core)

### Alternatíva B: Készlet Szolgáltatás Réteg (Shared Service)

### Alternatíva C: Micro-Modules (Finom Granularitás)

---

# Alternatíva A: Shared Core + Thin Modules

## Koncepció

A **CORE modul tartalmazza az összes közös funkcionalitást**, a domain modulok (Szerviz, Bérlés, Áruház) csak a specifikus üzleti logikát.

## Architektúra Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CORE MODUL                                 │
│                         (Mindig Telepített)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │    AUTH     │  │   USERS     │  │   PARTNER   │  │   PÉNZÜGY   │    │
│  │             │  │             │  │             │  │             │    │
│  │ • Login     │  │ • RBAC      │  │ • Ügyfél    │  │ • Számla    │    │
│  │ • JWT       │  │ • Roles     │  │ • Cég       │  │ • NAV       │    │
│  │ • Session   │  │ • Permissions│ │ • Kapcsolat │  │ • Befizetés │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │    CIKK     │  │   KÉSZLET   │  │ MULTI-TENANT│  │   COMMON    │    │
│  │             │  │             │  │             │  │     UI      │    │
│  │ • Termék    │  │ • Mozgás    │  │ • Tenant    │  │ • Components│    │
│  │ • Csoport   │  │ • Lekérdezés│  │ • Isolation │  │ • Layouts   │    │
│  │ • Beszállító│  │ • Módosítás │  │ • Sync      │  │ • Forms     │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ Használja
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  SZERVIZ MODUL  │    │  BÉRLÉS MODUL   │    │  ÁRUHÁZ MODUL   │
│   (Opcionális)  │    │   (Opcionális)  │    │   (Opcionális)  │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│                 │    │                 │    │                 │
│ • Munkalap      │    │ • Bérgép        │    │ • Bevételezés   │
│ • Munkalap_Tétel│    │ • Bérlés        │    │ • Eladás        │
│ • Árajánlat     │    │ • Szerződés     │    │ • Árrés         │
│ • Garancia_Claim│    │ • Kaució        │    │ • Leltár        │
│ • Norma_Tétel   │    │ • Késés         │    │ • E-számla      │
│                 │    │                 │    │                 │
│ Készlet: READ   │    │ Készlet: R/W    │    │ Készlet: FULL   │
│ Partner: READ   │    │ Partner: READ   │    │ Partner: READ   │
│ Számla: CREATE  │    │ Számla: CREATE  │    │ Számla: CREATE  │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Mappa Struktúra (Monorepo)

```
kgc-erp/
├── packages/
│   ├── core/                          # NAGY CORE
│   │   ├── src/
│   │   │   ├── auth/                  # Autentikáció
│   │   │   │   ├── login.ts
│   │   │   │   ├── jwt.ts
│   │   │   │   └── session.ts
│   │   │   ├── users/                 # Felhasználók + RBAC
│   │   │   │   ├── user.entity.ts
│   │   │   │   ├── role.entity.ts
│   │   │   │   └── permission.ts
│   │   │   ├── partner/               # Ügyfelek
│   │   │   │   ├── partner.entity.ts
│   │   │   │   ├── partner.service.ts
│   │   │   │   └── partner.controller.ts
│   │   │   ├── inventory/             # Készlet (CORE-ban!)
│   │   │   │   ├── cikk.entity.ts
│   │   │   │   ├── keszlet-mozgas.entity.ts
│   │   │   │   ├── inventory.service.ts
│   │   │   │   └── inventory.controller.ts
│   │   │   ├── finance/               # Pénzügy
│   │   │   │   ├── szamla.entity.ts
│   │   │   │   ├── nav-integration.ts
│   │   │   │   └── payment.service.ts
│   │   │   ├── tenant/                # Multi-tenant
│   │   │   │   ├── tenant.entity.ts
│   │   │   │   └── tenant.middleware.ts
│   │   │   └── ui/                    # Közös UI
│   │   │       ├── components/
│   │   │       └── layouts/
│   │   └── package.json
│   │
│   ├── module-szerviz/                # Vékony modul
│   │   ├── src/
│   │   │   ├── munkalap/
│   │   │   │   ├── munkalap.entity.ts
│   │   │   │   ├── munkalap.service.ts
│   │   │   │   └── munkalap.controller.ts
│   │   │   ├── arajanalt/
│   │   │   ├── garancia/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── module-berles/                 # Vékony modul
│   │   ├── src/
│   │   │   ├── bergep/
│   │   │   ├── szerzodes/
│   │   │   ├── kaucio/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── module-aruhaz/                 # Vékony modul
│       ├── src/
│       │   ├── bevetelezes/
│       │   ├── eladas/
│       │   ├── arres/
│       │   └── index.ts
│       └── package.json
│
├── apps/
│   └── web/                           # Frontend alkalmazás
│       ├── src/
│       │   ├── pages/
│       │   │   ├── core/              # Mindig elérhető
│       │   │   ├── szerviz/           # Feature flag
│       │   │   ├── berles/            # Feature flag
│       │   │   └── aruhaz/            # Feature flag
│       │   └── app.tsx
│       └── package.json
│
└── package.json
```

## Adatbázis Séma

```sql
-- =====================================================
-- CORE SÉMA (mindig telepített)
-- =====================================================

-- Tenants
CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    package_type VARCHAR(50) NOT NULL, -- 'basic_szerviz', 'basic_berles', 'pro', 'enterprise'
    modules_enabled JSONB DEFAULT '[]', -- ['szerviz', 'berles', 'aruhaz']
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users & RBAC
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT TRUE
);

-- Partner (közös ügyfél)
CREATE TABLE partners (
    partner_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id),
    nev VARCHAR(255) NOT NULL,
    adoszam VARCHAR(15),
    cim TEXT,
    telefon VARCHAR(20),
    email VARCHAR(255),
    tipus VARCHAR(20) DEFAULT 'szemely', -- 'szemely', 'ceg'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cikk (CORE-ban - minden modul használja)
CREATE TABLE cikkek (
    cikk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id),
    cikkszam VARCHAR(50) NOT NULL,
    megnevezes VARCHAR(255) NOT NULL,
    cikkcsoport_id UUID,
    beszallito_id UUID,
    beszerzesi_ar DECIMAL(12,2),
    eladasi_ar DECIMAL(12,2),
    keszlet INTEGER DEFAULT 0,
    alkatresz BOOLEAN DEFAULT FALSE,
    berelheto BOOLEAN DEFAULT FALSE, -- Bérlés modulhoz
    aktiv BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, cikkszam)
);

-- Készlet mozgás (CORE-ban - audit)
CREATE TABLE keszlet_mozgasok (
    mozgas_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id),
    cikk_id UUID REFERENCES cikkek(cikk_id),
    tipus VARCHAR(10) NOT NULL, -- '+', '-'
    mennyiseg INTEGER NOT NULL,
    forras_modul VARCHAR(20), -- 'szerviz', 'berles', 'aruhaz', 'manual'
    forras_id UUID, -- munkalap_id, berles_id, stb.
    megjegyzes TEXT,
    rogzito_id UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Számlák (CORE-ban)
CREATE TABLE szamlak (
    szamla_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id),
    szamla_szam VARCHAR(50) NOT NULL,
    partner_id UUID REFERENCES partners(partner_id),
    forras_modul VARCHAR(20), -- 'szerviz', 'berles', 'aruhaz'
    forras_id UUID,
    netto_osszeg DECIMAL(12,2),
    afa_osszeg DECIMAL(12,2),
    brutto_osszeg DECIMAL(12,2),
    nav_statusz VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, szamla_szam)
);

-- =====================================================
-- SZERVIZ MODUL SÉMA (opcionális)
-- =====================================================

CREATE TABLE munkalapok (
    munkalap_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id),
    munkalap_szam VARCHAR(20) NOT NULL,
    partner_id UUID REFERENCES partners(partner_id),
    gep_azonosito VARCHAR(50),
    geptipus VARCHAR(100),
    problema_leiras TEXT,
    statusz VARCHAR(20) DEFAULT 'felveve',
    felvevo_id UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, munkalap_szam)
);

CREATE TABLE munkalap_tetelek (
    tetel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    munkalap_id UUID REFERENCES munkalapok(munkalap_id),
    cikk_id UUID REFERENCES cikkek(cikk_id),
    mennyiseg INTEGER NOT NULL,
    egysegar DECIMAL(12,2),
    megjegyzes TEXT
);

CREATE TABLE garancia_claimek (
    claim_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id),
    munkalap_id UUID REFERENCES munkalapok(munkalap_id),
    gyarto VARCHAR(100),
    tipus VARCHAR(20), -- 'norma', 'egyedi'
    norma_perc INTEGER,
    osszeg DECIMAL(12,2),
    statusz VARCHAR(20) DEFAULT 'keszitett'
);

-- =====================================================
-- BÉRLÉS MODUL SÉMA (opcionális)
-- =====================================================

CREATE TABLE bergepek (
    bergep_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id),
    kod VARCHAR(20) NOT NULL, -- 'ST200', 'HU050'
    cikk_id UUID REFERENCES cikkek(cikk_id), -- Hivatkozás CORE cikkre
    gyari_szam VARCHAR(50),
    vasarlasi_ar DECIMAL(12,2),
    allapot VARCHAR(20) DEFAULT 'elerheto', -- 'elerheto', 'kiadva', 'szerviz'
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, kod)
);

CREATE TABLE berlesek (
    berles_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id),
    bergep_id UUID REFERENCES bergepek(bergep_id),
    partner_id UUID REFERENCES partners(partner_id),
    kezdet TIMESTAMP NOT NULL,
    tervezett_veg TIMESTAMP,
    tenyleges_veg TIMESTAMP,
    kaucio DECIMAL(12,2),
    statusz VARCHAR(20) DEFAULT 'aktiv',
    kiadta_id UUID REFERENCES users(user_id),
    visszavette_id UUID REFERENCES users(user_id)
);

-- =====================================================
-- ÁRUHÁZ MODUL SÉMA (opcionális)
-- =====================================================

CREATE TABLE bevetelezesek (
    bevetelezes_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id),
    bizonylat_szam VARCHAR(50) NOT NULL,
    szamla_szam VARCHAR(50),
    beszallito_id UUID,
    osszeg DECIMAL(12,2),
    penznem VARCHAR(3) DEFAULT 'HUF',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bevetelezes_tetelek (
    tetel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bevetelezes_id UUID REFERENCES bevetelezesek(bevetelezes_id),
    cikk_id UUID REFERENCES cikkek(cikk_id),
    mennyiseg INTEGER,
    egysegar DECIMAL(12,2)
);

CREATE TABLE eladasok (
    eladas_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(tenant_id),
    partner_id UUID REFERENCES partners(partner_id),
    szamla_id UUID REFERENCES szamlak(szamla_id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE eladas_tetelek (
    tetel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    eladas_id UUID REFERENCES eladasok(eladas_id),
    cikk_id UUID REFERENCES cikkek(cikk_id),
    mennyiseg INTEGER,
    egysegar DECIMAL(12,2)
);
```

## Git Branching

```
main ─────────────────────────────────────────────────────────►
  │
  └── develop ─────────────────────────────────────────────────►
        │
        ├── feature/core-* ────────────► Core módosítások
        │
        ├── feature/szerviz-* ─────────► Szerviz modul
        │
        ├── feature/berles-* ──────────► Bérlés modul
        │
        └── feature/aruhaz-* ──────────► Áruház modul
```

## Előnyök

| Előny | Leírás |
|-------|--------|
| **Egyszerű függőségek** | Modulok csak CORE-tól függnek |
| **Tiszta API határok** | CORE API-t használják a modulok |
| **Könnyű tesztelés** | CORE mockolható a modulokhoz |
| **Egyértelmű felelősségek** | CORE = közös, Modul = specifikus |

## Hátrányok

| Hátrány | Leírás |
|---------|--------|
| **Nagy CORE** | Sok kód egy helyen |
| **CORE változás = minden érintett** | Koordináció szükséges |
| **Teljes CORE telepítés** | Nem használt funkciók is jelen vannak |
| **Verziókezelés nehézkes** | CORE verzió + modul verziók |

## Mikor Ajánlott?

- Kis-közepes csapat (2-5 fejlesztő)
- Nem túl gyakori CORE változások
- Egyszerűbb DevOps pipeline
- Gyorsabb time-to-market

---

# Alternatíva B: Készlet Szolgáltatás Réteg

## Koncepció

A **Készlet egy önálló szolgáltatás** (Shared Service), amit minden modul API-n keresztül ér el. A CORE kisebb marad.

## Architektúra Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CORE MODUL (Kisebb)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │    AUTH     │  │   USERS     │  │   PARTNER   │  │ MULTI-TENANT│    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐                                      │
│  │   PÉNZÜGY   │  │  COMMON UI  │   ← Készlet NINCS itt!               │
│  └─────────────┘  └─────────────┘                                      │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │
┌────────────────────────────────┼────────────────────────────────────────┐
│                                │                                        │
│                    ┌───────────▼───────────┐                            │
│                    │   KÉSZLET SZOLGÁLTATÁS │   ◄── Önálló Service      │
│                    │     (Inventory API)    │                           │
│                    ├────────────────────────┤                           │
│                    │ • CIKK entitás         │                           │
│                    │ • KÉSZLET_MOZGÁS       │                           │
│                    │ • Készlet lekérdezés   │                           │
│                    │ • Készlet módosítás    │                           │
│                    │ • Foglalás (reserve)   │                           │
│                    │ • Felszabadítás        │                           │
│                    └───────────┬────────────┘                           │
│                                │                                        │
│              ┌─────────────────┼─────────────────┐                      │
│              │                 │                 │                      │
│              ▼                 ▼                 ▼                      │
│     ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                │
│     │   SZERVIZ   │   │   BÉRLÉS    │   │   ÁRUHÁZ    │                │
│     │   MODUL     │   │   MODUL     │   │   MODUL     │                │
│     └─────────────┘   └─────────────┘   └─────────────┘                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Mappa Struktúra

```
kgc-erp/
├── packages/
│   ├── core/                          # Kisebb CORE
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── partner/
│   │   │   ├── finance/
│   │   │   ├── tenant/
│   │   │   └── ui/
│   │   └── package.json
│   │
│   ├── inventory-service/             # ÖNÁLLÓ SZOLGÁLTATÁS
│   │   ├── src/
│   │   │   ├── cikk/
│   │   │   │   ├── cikk.entity.ts
│   │   │   │   ├── cikk.service.ts
│   │   │   │   └── cikk.controller.ts
│   │   │   ├── mozgas/
│   │   │   │   ├── mozgas.entity.ts
│   │   │   │   ├── mozgas.service.ts
│   │   │   │   └── mozgas.controller.ts
│   │   │   ├── reservation/           # Foglalás rendszer
│   │   │   │   ├── reservation.entity.ts
│   │   │   │   └── reservation.service.ts
│   │   │   └── api/
│   │   │       ├── inventory.api.ts   # Publikus API
│   │   │       └── inventory.client.ts # Client SDK
│   │   └── package.json
│   │
│   ├── module-szerviz/
│   │   ├── src/
│   │   │   └── ... (inventory-service-t használja)
│   │   └── package.json
│   │
│   ├── module-berles/
│   │   └── ...
│   │
│   └── module-aruhaz/
│       └── ...
│
└── package.json
```

## Inventory Service API

```typescript
// packages/inventory-service/src/api/inventory.api.ts

export interface InventoryAPI {
  // Cikk műveletek
  getCikk(cikkId: string): Promise<Cikk>;
  searchCikkek(query: SearchQuery): Promise<Cikk[]>;
  createCikk(data: CreateCikkDTO): Promise<Cikk>;
  updateCikk(cikkId: string, data: UpdateCikkDTO): Promise<Cikk>;

  // Készlet műveletek
  getKeszlet(cikkId: string): Promise<number>;
  adjustKeszlet(cikkId: string, amount: number, reason: string, sourceModule: string, sourceId: string): Promise<KeszletMozgas>;

  // Foglalás műveletek (konkurens hozzáférés kezelése)
  reserveKeszlet(cikkId: string, amount: number, forModule: string, forId: string): Promise<Reservation>;
  confirmReservation(reservationId: string): Promise<void>;
  cancelReservation(reservationId: string): Promise<void>;

  // Lekérdezések
  getMozgasHistory(cikkId: string, fromDate?: Date): Promise<KeszletMozgas[]>;
  getLowStockItems(threshold?: number): Promise<Cikk[]>;
}

// Modul használat példa:
// packages/module-szerviz/src/munkalap/munkalap.service.ts

import { inventoryClient } from '@kgc/inventory-service';

class MunkalapService {
  async lezarasMunkalap(munkalapId: string) {
    const munkalap = await this.getMunkalap(munkalapId);
    const tetelek = await this.getTetelek(munkalapId);

    // Készlet csökkentés inventory service-en keresztül
    for (const tetel of tetelek) {
      if (tetel.cikk.alkatresz) {
        await inventoryClient.adjustKeszlet(
          tetel.cikk_id,
          -tetel.mennyiseg,
          `Munkalap lezárás: ${munkalap.munkalap_szam}`,
          'szerviz',
          munkalapId
        );
      }
    }

    // Státusz frissítés
    await this.updateStatusz(munkalapId, 'szamlazando');
  }
}
```

## Event-Driven Kommunikáció (Opcionális)

```typescript
// Event-ek a modulok között

// Inventory Service események
interface InventoryEvents {
  'inventory.stock.low': { cikkId: string; currentStock: number; threshold: number };
  'inventory.stock.adjusted': { cikkId: string; amount: number; sourceModule: string };
  'inventory.reservation.expired': { reservationId: string };
}

// Szerviz modul figyelés
inventoryEvents.on('inventory.stock.low', async (event) => {
  // Értesítés ha alkatrész fogyóban
  if (await isAlkatresz(event.cikkId)) {
    await notifyMaintenance('Alkatrész készlet alacsony', event);
  }
});

// Bérlés modul esemény
interface BerlesEvents {
  'berles.bergep.status.changed': { bergepId: string; oldStatus: string; newStatus: string };
}

// Szerviz modul figyelés (opcionális integráció)
berlesEvents.on('berles.bergep.status.changed', async (event) => {
  if (event.newStatus === 'szerviz') {
    // Automatikus munkalap létrehozás bérgéphez
    await createMunkalapFromBergep(event.bergepId);
  }
});
```

## Előnyök

| Előny | Leírás |
|-------|--------|
| **Kisebb CORE** | Készlet külön, áttekinthetőbb |
| **Tiszta API** | Inventory API dokumentált, verzionált |
| **Skálázható** | Inventory service külön skálázható |
| **Loose coupling** | Modulok nem függnek egymástól |
| **Konkurens hozzáférés** | Rezerváció rendszer kezeli |

## Hátrányok

| Hátrány | Leírás |
|---------|--------|
| **Extra komplexitás** | Egy szolgáltatás pluszban |
| **Hálózati overhead** | API hívások költsége |
| **Tranzakció határok** | Distributed transaction kihívások |
| **Deployment komplexitás** | Több szolgáltatás üzemeltetése |

## Mikor Ajánlott?

- Nagyobb csapat (5+ fejlesztő)
- Magas konkurencia (sok egyidejű készlet művelet)
- Microservices irány
- Készlet-központú üzlet

---

# Alternatíva C: Micro-Modules (Finom Granularitás)

## Koncepció

Minden funkció **önálló micro-modul**, a legfinomabb granularitással. Feature flag-ek vezérlik az engedélyezett funkciókat.

## Architektúra Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            MICRO-MODULES                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CORE LAYER (Mindig aktív)                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                │
│  │  auth  │ │ users  │ │ tenant │ │  ui    │ │ config │                │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘                │
│                                                                         │
│  SHARED LAYER (Feature flag vezérelt)                                   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                │
│  │partner │ │ cikk   │ │keszlet │ │ szamla │ │  nav   │                │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘                │
│                                                                         │
│  SZERVIZ LAYER                                                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                           │
│  │munkalap│ │arajanlt│ │garancia│ │ norma  │                           │
│  └────────┘ └────────┘ └────────┘ └────────┘                           │
│                                                                         │
│  BÉRLÉS LAYER                                                           │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                           │
│  │ bergep │ │ berles │ │szerzod.│ │ kaucio │                           │
│  └────────┘ └────────┘ └────────┘ └────────┘                           │
│                                                                         │
│  ÁRUHÁZ LAYER                                                           │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                           │
│  │bevétel.│ │ eladas │ │ arres  │ │ leltar │                           │
│  └────────┘ └────────┘ └────────┘ └────────┘                           │
│                                                                         │
│  INTEGRÁCIÓ LAYER (Opcionális)                                          │
│  ┌────────────────┐ ┌────────────────┐                                 │
│  │bergep-szerviz  │ │ online-foglalas│                                 │
│  │  integráció    │ │   integráció   │                                 │
│  └────────────────┘ └────────────────┘                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Mappa Struktúra

```
kgc-erp/
├── packages/
│   │
│   │── CORE LAYER ────────────────────────────────
│   ├── @kgc/auth/
│   ├── @kgc/users/
│   ├── @kgc/tenant/
│   ├── @kgc/ui/
│   ├── @kgc/config/
│   │
│   │── SHARED LAYER ──────────────────────────────
│   ├── @kgc/partner/
│   │   ├── src/
│   │   │   ├── partner.entity.ts
│   │   │   ├── partner.service.ts
│   │   │   └── partner.module.ts
│   │   └── package.json
│   │
│   ├── @kgc/cikk/
│   │   ├── src/
│   │   │   ├── cikk.entity.ts
│   │   │   ├── cikk.service.ts
│   │   │   └── cikk.module.ts
│   │   └── package.json
│   │
│   ├── @kgc/keszlet/
│   ├── @kgc/szamla/
│   ├── @kgc/nav/
│   │
│   │── SZERVIZ LAYER ─────────────────────────────
│   ├── @kgc/munkalap/
│   │   ├── src/
│   │   │   ├── munkalap.entity.ts
│   │   │   ├── munkalap.service.ts
│   │   │   ├── munkalap.module.ts
│   │   │   └── dependencies.ts  ← Deklarált függőségek
│   │   └── package.json
│   │
│   ├── @kgc/arajanalt/
│   ├── @kgc/garancia/
│   ├── @kgc/norma/
│   │
│   │── BÉRLÉS LAYER ──────────────────────────────
│   ├── @kgc/bergep/
│   ├── @kgc/berles/
│   ├── @kgc/szerzodes/
│   ├── @kgc/kaucio/
│   │
│   │── ÁRUHÁZ LAYER ──────────────────────────────
│   ├── @kgc/bevetelezes/
│   ├── @kgc/eladas/
│   ├── @kgc/arres/
│   ├── @kgc/leltar/
│   │
│   │── INTEGRÁCIÓ LAYER ──────────────────────────
│   ├── @kgc/bergep-szerviz-integration/
│   │   ├── src/
│   │   │   ├── bergep-to-munkalap.ts
│   │   │   └── roi-calculator.ts
│   │   └── package.json  ← Függ: @kgc/bergep, @kgc/munkalap
│   │
│   └── @kgc/online-foglalas-integration/
│
└── apps/
    └── web/
        ├── src/
        │   └── module-loader.ts  ← Dinamikus modul betöltés
        └── package.json
```

## Feature Flag Konfiguráció

```typescript
// packages/@kgc/config/src/feature-flags.ts

export interface TenantFeatures {
  // Core (mindig aktív)
  auth: true;
  users: true;
  tenant: true;

  // Shared (csomag függő)
  partner: boolean;
  cikk: boolean;
  keszlet: boolean;
  szamla: boolean;
  nav: boolean;

  // Szerviz csomag
  munkalap: boolean;
  arajanalt: boolean;
  garancia: boolean;
  norma: boolean;

  // Bérlés csomag
  bergep: boolean;
  berles: boolean;
  szerzodes: boolean;
  kaucio: boolean;

  // Áruház csomag
  bevetelezes: boolean;
  eladas: boolean;
  arres: boolean;
  leltar: boolean;

  // Integrációk
  bergepSzervizIntegration: boolean;
  onlineFoglalasIntegration: boolean;
}

// Csomag definíciók
export const PACKAGES: Record<string, Partial<TenantFeatures>> = {
  basic_szerviz: {
    partner: true,
    cikk: true,
    keszlet: true,
    szamla: true,
    nav: true,
    munkalap: true,
    arajanalt: true,
    garancia: true,
    norma: true,
  },

  basic_berles: {
    partner: true,
    cikk: true,
    keszlet: true,
    szamla: true,
    nav: true,
    bergep: true,
    berles: true,
    szerzodes: true,
    kaucio: true,
  },

  pro: {
    // Minden ami basic_szerviz-ben
    // + Minden ami basic_berles-ben
    // + Integráció
    ...PACKAGES.basic_szerviz,
    ...PACKAGES.basic_berles,
    bergepSzervizIntegration: true,
  },

  enterprise: {
    // Minden feature
    partner: true,
    cikk: true,
    keszlet: true,
    szamla: true,
    nav: true,
    munkalap: true,
    arajanalt: true,
    garancia: true,
    norma: true,
    bergep: true,
    berles: true,
    szerzodes: true,
    kaucio: true,
    bevetelezes: true,
    eladas: true,
    arres: true,
    leltar: true,
    bergepSzervizIntegration: true,
    onlineFoglalasIntegration: true,
  },
};
```

## Modul Dependency Graph

```typescript
// packages/@kgc/munkalap/src/dependencies.ts

export const MUNKALAP_DEPENDENCIES = {
  required: ['@kgc/partner', '@kgc/cikk', '@kgc/keszlet'],
  optional: ['@kgc/szamla'],
  integrations: ['@kgc/bergep-szerviz-integration'],
};

// packages/@kgc/bergep/src/dependencies.ts

export const BERGEP_DEPENDENCIES = {
  required: ['@kgc/partner', '@kgc/cikk'],
  optional: ['@kgc/keszlet'],
  integrations: ['@kgc/bergep-szerviz-integration'],
};
```

## Dinamikus Modul Betöltés

```typescript
// apps/web/src/module-loader.ts

import { TenantFeatures, PACKAGES } from '@kgc/config';

class ModuleLoader {
  private loadedModules: Map<string, any> = new Map();

  async loadModulesForTenant(tenantId: string): Promise<void> {
    const tenant = await getTenant(tenantId);
    const features = PACKAGES[tenant.package_type];

    // Dependency resolution
    const modulesToLoad = this.resolveDependencies(features);

    // Lazy load modules
    for (const moduleName of modulesToLoad) {
      if (!this.loadedModules.has(moduleName)) {
        const module = await import(`@kgc/${moduleName}`);
        await module.initialize();
        this.loadedModules.set(moduleName, module);
      }
    }
  }

  private resolveDependencies(features: Partial<TenantFeatures>): string[] {
    const result: string[] = [];
    const visited = new Set<string>();

    const resolve = (moduleName: string) => {
      if (visited.has(moduleName)) return;
      visited.add(moduleName);

      // Load dependencies first
      const deps = DEPENDENCIES[moduleName];
      if (deps?.required) {
        deps.required.forEach(resolve);
      }

      result.push(moduleName);
    };

    Object.entries(features)
      .filter(([_, enabled]) => enabled)
      .forEach(([name]) => resolve(name));

    return result;
  }
}
```

## Előnyök

| Előny | Leírás |
|-------|--------|
| **Maximális rugalmasság** | Bármilyen kombináció összeállítható |
| **Tree-shaking** | Csak a használt kód kerül a bundle-be |
| **Független fejlesztés** | Minden micro-modul külön csapat |
| **Finom licencelés** | Akár funkcióra lebontva is |
| **A/B tesztelés** | Feature flag-ekkel |

## Hátrányok

| Hátrány | Leírás |
|---------|--------|
| **Komplexitás** | Sok kis csomag kezelése |
| **Dependency hell** | Verziók összehangolása |
| **Runtime overhead** | Dinamikus betöltés költsége |
| **Tesztelési mátrix** | Kombinációk tesztelése exponenciális |
| **Dokumentáció** | Minden micro-modulhoz külön |

## Mikor Ajánlott?

- Nagy csapat (10+ fejlesztő)
- Sok eltérő ügyfél igény
- SaaS termék sok testreszabással
- Platform stratégia

---

# Összehasonlító Táblázat

## Fejlesztési Komplexitás

| Szempont | A: Shared Core | B: Készlet Service | C: Micro-Modules |
|----------|----------------|-------------------|------------------|
| Kezdeti setup | Egyszerű | Közepes | Bonyolult |
| Új funkció hozzáadás | Egyszerű | Közepes | Egyszerű |
| Refaktorálás | Közepes | Közepes | Nehéz |
| Új fejlesztő onboarding | Gyors | Közepes | Lassú |

## Üzemeltetési Komplexitás

| Szempont | A: Shared Core | B: Készlet Service | C: Micro-Modules |
|----------|----------------|-------------------|------------------|
| Deployment | Egyszerű | Közepes | Bonyolult |
| Monitoring | Egyszerű | Közepes | Bonyolult |
| Debugging | Egyszerű | Közepes | Nehéz |
| Skálázás | Monolit | Service-szintű | Modul-szintű |

## Üzleti Rugalmasság

| Szempont | A: Shared Core | B: Készlet Service | C: Micro-Modules |
|----------|----------------|-------------------|------------------|
| Licenc csomagok | 3-4 fix csomag | 3-4 fix csomag | Korlátlan kombináció |
| Egyedi testreszabás | Nehéz | Közepes | Egyszerű |
| Feature flag-ek | Modul szintű | Modul szintű | Funkció szintű |
| Upgrade path | Csomag váltás | Csomag váltás | Modul hozzáadás |

## Technikai Skálázhatóság

| Szempont | A: Shared Core | B: Készlet Service | C: Micro-Modules |
|----------|----------------|-------------------|------------------|
| Kódméret kezelés | Kihívás (nagy core) | Jó | Kiváló |
| Build idő | Növekvő | Stabil | Párhuzamosítható |
| Tesztelés | Integrációs | Unit + integrációs | Unit alapú |
| CI/CD pipeline | Egyszerű | Közepes | Összetett |

## Pontszámok (1-5)

| Kritérium | Súly | A | B | C |
|-----------|------|---|---|---|
| Fejlesztési egyszerűség | 25% | 5 | 3 | 2 |
| Üzemeltetési egyszerűség | 20% | 5 | 3 | 2 |
| Rugalmasság | 20% | 2 | 3 | 5 |
| Skálázhatóság | 15% | 2 | 4 | 5 |
| Csapat méret (2-5 fő) | 10% | 5 | 3 | 1 |
| Time-to-market | 10% | 5 | 3 | 2 |
| **Összesen** | **100%** | **3.95** | **3.15** | **2.85** |

---

# Ajánlás

## Jelenlegi Helyzethez: Alternatíva A (Shared Core + Thin Modules)

### Miért?

1. **Csapat méret**: Kis csapat (1-3 fő) → egyszerűség kell
2. **Első verzió**: MVP-hez gyors fejlesztés szükséges
3. **Üzleti modell**: Kezdetben 3-4 fix csomag elég
4. **Technikai adósság**: Később refaktorálható B vagy C felé

### Javasolt Evolúciós Út

```
2025 Q1-Q2: Alternatíva A (MVP)
     │
     │  ↓ Ha sok a készlet művelet
     │  ↓ Ha performance probléma
     │
2025 Q3-Q4: Alternatíva B (Készlet Service kiemelése)
     │
     │  ↓ Ha 10+ ügyfél eltérő igényekkel
     │  ↓ Ha 5+ fejlesztő a csapatban
     │
2026+: Alternatíva C (Fokozatos micro-module bontás)
```

### Konkrét Tennivalók

1. **Most**: Shared Core + Thin Modules architektúra
2. **Készlet API**: Tervezd úgy, hogy később kiszervezhető
3. **Feature flags**: Készítsd elő a modul engedélyezés logikát
4. **Dokumentáció**: Minden modul határfelület dokumentálva

---

## Döntés

**Kiválasztott alternatíva:** [ ] A / [ ] B / [ ] C

**Döntés dátuma:** ____________________

**Döntéshozó:** ____________________

**Megjegyzések:**

---

## Változásnapló

| Dátum | Verzió | Változás |
|-------|--------|----------|
| 2025-12-10 | 1.0 | Kezdeti dokumentum |
