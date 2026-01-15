# ADR-001: Franchise Multi-Tenant Architektúra

## Státusz

**ELFOGADVA** - 2025. december 2.

## Kontextus

A Kisgépcentrum (KGC) ERP rendszer fejlesztése során felmerült az igény egy franchise hálózat támogatására. A 7.resz.md dokumentumban részletezett követelmények alapján a franchise funkció az **MVP része** lesz, nem későbbi fázis.

### Üzleti Követelmények (forrás: 7.resz.md)

1. Különböző franchise "csomagok": kölcsönző, szerviz, komplett
2. Központ NEM lát bele franchise partner pénzügyeibe
3. Központ LÁTJA a statisztikákat (adatgyűjtés)
4. Országos készletláthatóság a honlapon
5. Központi szerviz + logisztika opció
6. Adatbázis NEM exportálható (védelem)
7. Minimum készlet → automatikus rendelés

## Döntések

### 1. Adatbázis Izoláció

**Döntés:** Single Database with Tenant ID (Egy adatbázis, tenant_id oszloppal)

**Indoklás:**
- Egyszerű implementáció és karbantartás
- Költséghatékony (egy DB szerver)
- A KGC várható méretéhez megfelelő (10-50 franchise partner)
- Későbbi migrációs lehetőség (schema-per-tenant vagy DB-per-tenant)

**Implementáció:**
```sql
-- Minden releváns táblához tenant_id oszlop
ALTER TABLE partners ADD COLUMN tenant_id UUID NOT NULL;
ALTER TABLE inventory ADD COLUMN tenant_id UUID NOT NULL;
ALTER TABLE orders ADD COLUMN tenant_id UUID NOT NULL;
-- stb.

-- Tenant tábla
CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('central', 'franchise') NOT NULL,
    package ENUM('kolcsonzo', 'szerviz', 'komplett') NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Row Level Security (RLS) vagy Application-level filtering
```

**Alternatívák (elutasítva):**
- Schema-per-tenant: Túl komplex a jelenlegi fázisban
- DB-per-tenant: Túl drága és nehezen menedzselhető

---

### 2. Készlet Szinkronizáció

**Döntés:** Közel valós idejű szinkronizáció (1-5 perc késleltetés)

**Indoklás:**
- Megfelelő a vevői elvárásoknak (webshop frissesség)
- Nem terheli túl a rendszert
- Event-driven architektúrával megvalósítható

**Implementáció:**
```
Készlet változás → Event publikálás →
→ Message Queue (Redis/RabbitMQ) →
→ Központi készlet aggregátor →
→ Cache frissítés (1-5 perc TTL)
```

**Webshop lekérdezés:**
```
Vevő keres "ütvefúró" → Cache-ből országos készlet →
→ Megjelenítés: "Érd: 3 db, Győr: 1 db, Debrecen: 2 db"
```

**Alternatívák (elutasítva):**
- Valós idejű: Túl nagy terhelés, komplexitás
- Időszakos (óránkénti): Túl lassú, rossz UX

---

### 3. Jogosultsági Rendszer (RBAC)

**Döntés:** Hierarchikus szerepkör-alapú hozzáférés-vezérlés

**Szerepkör Hierarchia:**

```
KÖZPONT (Kisgépcentrum - tenant_type: 'central')
├── SUPER_ADMIN
│   ├── Jogok: MINDEN
│   └── Hozzáférés: Teljes rendszer, minden tenant
├── CENTRAL_ADMIN
│   ├── Jogok: Franchise kezelés, országos statisztikák
│   └── Hozzáférés: Aggregált adatok, NEM egyedi pénzügyek
└── CENTRAL_OPERATOR
    ├── Jogok: Saját bolt műveletek
    └── Hozzáférés: Csak központi tenant adatok

FRANCHISE (tenant_type: 'franchise')
├── FRANCHISE_ADMIN
│   ├── Jogok: Saját tenant minden művelete
│   └── Hozzáférés: Csak saját tenant, NEM lát más franchise-t
├── STORE_MANAGER
│   ├── Jogok: Napi műveletek, lokális statisztikák
│   └── Hozzáférés: Saját tenant operatív adatok
└── OPERATOR
    ├── Jogok: Tranzakciók, ügyfélkezelés
    └── Hozzáférés: Saját tenant, korlátozott
```

**Adatvédelmi Szabályok:**

| Adat típus | SUPER_ADMIN | CENTRAL_ADMIN | FRANCHISE_ADMIN |
|------------|-------------|---------------|-----------------|
| Saját pénzügy | ✅ | ❌ | ✅ (csak saját) |
| Más franchise pénzügy | ✅ | ❌ | ❌ |
| Országos statisztika | ✅ | ✅ | ❌ |
| Saját statisztika | ✅ | ✅ | ✅ |
| Országos készlet | ✅ | ✅ | ✅ (csak olvasás) |
| Adatexport | ✅ | ❌ | ❌ |

**Implementáció:**
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    tenant_scope ENUM('global', 'tenant') NOT NULL,
    permissions JSONB NOT NULL
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    tenant_id UUID REFERENCES tenants(id),
    PRIMARY KEY (user_id, role_id, tenant_id)
);
```

---

### 4. Szerviz Logisztika

**Döntés:** Hibrid modell (helyi + központi)

**Működés:**

```
Gép beérkezik franchise-hoz
        │
        ▼
┌───────────────────┐
│ Diagnosztika      │
│ (franchise szerviz)│
└────────┬──────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────────┐
│Egyszerű│ │ Komplex   │
│javítás │ │ javítás   │
└───┬───┘ └─────┬─────┘
    │           │
    ▼           ▼
┌───────┐ ┌───────────────┐
│Helyben│ │Központi szerviz│
│elvégzi│ │    küldés     │
└───┬───┘ └───────┬───────┘
    │             │
    │      ┌──────┴──────┐
    │      ▼             ▼
    │  ┌───────┐   ┌──────────┐
    │  │Javítás│   │Visszaküld│
    │  │központ│   │franchise │
    │  └───────┘   └──────────┘
    │
    └──────┬──────────────┘
           ▼
    ┌─────────────┐
    │Kiadás ügyfél│
    └─────────────┘
```

**Kategorizálás:**

| Javítás típus | Hol történik | Példa |
|---------------|--------------|-------|
| Egyszerű | Franchise helyben | Olajcsere, szűrőcsere, tisztítás |
| Közepes | Franchise (ha van kapacitás) | Alkatrészcsere, beállítás |
| Komplex | Központi szerviz | Motor javítás, elektronika |
| Garanciális | Központi szerviz | Gyártói garancia kezelés |

**Logisztika:**
- Futárszolgálat integráció (GLS, MPL, stb.)
- Szállítás státusz követés
- Költségmegosztás szabályok (franchise vs. központ)

---

---

### 5. Holding Struktúra (8. rész bővítés) 🆕

**Döntés:** Holding → Leányvállalat hierarchia támogatása

**Indoklás:**
- KGC Holding Kft. anyavállalatként működik
- Regionális leányvállalatok önálló jogi személyek
- EU szabályozás: adómentes osztalék anyavállalat → leányvállalat
- Konszolidált beszámolók készítése

#### 5.1 Holding Hierarchia

```
┌─────────────────────────────────────────────────────────────┐
│                    KGC HOLDING KFT.                          │
│                    (Anyavállalat)                            │
│                                                              │
│  Tulajdonos: Eredeti tulajdonosok                           │
│  Adószám: HU12345678                                         │
├─────────────────────────────────────────────────────────────┤
│                           │                                  │
│      ┌────────────────────┼────────────────────┐            │
│      │                    │                    │            │
│      ▼                    ▼                    ▼            │
│ ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│ │ KGC Érd Kft │    │ KGC Győr Kft│    │KGC Debrecen │      │
│ │  (Központ)  │    │             │    │    Kft      │      │
│ │             │    │             │    │             │      │
│ │ tenant_id:1 │    │ tenant_id:2 │    │ tenant_id:3 │      │
│ └─────────────┘    └─────────────┘    └─────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 5.2 Implementáció

```sql
-- Holding tábla
CREATE TABLE holding (
    holding_id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_number VARCHAR(15) NOT NULL UNIQUE,
    headquarters_address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tenant bővítése holding kapcsolattal
ALTER TABLE tenants ADD COLUMN holding_id UUID REFERENCES holding(holding_id);
ALTER TABLE tenants ADD COLUMN is_subsidiary BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN company_registration_number VARCHAR(20);

-- Index a holding lekérdezésekhez
CREATE INDEX idx_tenants_holding ON tenants(holding_id);

-- Holding szintű szerepkör
INSERT INTO roles (name, tenant_scope, permissions) VALUES
('HOLDING_ADMIN', 'holding', '{"view_all_subsidiaries": true, "consolidated_reports": true}');
```

#### 5.3 Holding Admin Jogosultságok

| Jog | HOLDING_ADMIN | TENANT_ADMIN | Megjegyzés |
|-----|---------------|--------------|------------|
| Összes leányvállalat listázása | ✅ | ❌ | Csak holding szinten |
| Konszolidált riportok | ✅ | ❌ | Csoport szintű összesítők |
| Leányvállalat pénzügyek | ❌ | ✅ (saját) | Pénzügyi adatok védettek |
| Leányvállalat létrehozása | ✅ | ❌ | Új régió indítása |
| Holding beállítások | ✅ | ❌ | Központi konfiguráció |

#### 5.4 Üzleti Előnyök

| Előny | Részletek |
|-------|-----------|
| **Adómentes osztalék** | EU szabályozás: anyavállalat ↔ leányvállalat 0% |
| **Kockázat elkülönítés** | Regionális cégek önálló felelőssége |
| **Konszolidált beszámolók** | Egységes csoport riportok |
| **Skálázható terjeszkedés** | Új régió = új leányvállalat a holding alatt |

---

## Következmények

### Pozitív

1. **Skálázhatóság**: A tenant_id alapú megoldás könnyen bővíthető
2. **Költséghatékonyság**: Egy adatbázis, egyszerű infrastruktúra
3. **Rugalmasság**: Hibrid szerviz modell alkalmazkodik a valós igényekhez
4. **Adatvédelem**: Tiszta RBAC struktúra, nincs "véletlenül látom más adatát"
5. **Holding támogatás** 🆕: Anyavállalat → leányvállalat hierarchia

### Negatív / Kockázatok

1. **Query komplexitás**: Minden lekérdezésben tenant_id szűrés szükséges
2. **Szinkron késleltetés**: 1-5 perc alatt elavulhat a készletinfó
3. **Logisztikai költség**: Központi szerviz esetén szállítási költségek

### Mitigáció

| Kockázat | Megoldás |
|----------|----------|
| Query komplexitás | ORM middleware / Row Level Security |
| Készlet késleltetés | "Utoljára frissítve" időbélyeg megjelenítése |
| Logisztikai költség | Minimum érték alatt helyi javítás kötelező |

---

## Kapcsolódó Dokumentumok

- [7.resz.md](../Flows/7.resz.md) - Új követelmények (franchise részletek)
- [1-6.resz.md](../Flows/) - Meglévő folyamatok

---

## Döntéshozók

- **Javo!** - Projekt tulajdonos
- **Winston** - Architect (BMAD)

---

## Változásnapló

| Dátum | Verzió | Változás |
|-------|--------|----------|
| 2025-12-02 | 1.0 | Kezdeti döntések rögzítése |
| 2025-12-03 | 1.1 | 8. rész bővítés: Holding struktúra |
