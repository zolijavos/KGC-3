# ADR-011: B → C Migráció Útmutató

**Dátum:** 2025-12-10
**Státusz:** Útmutató
**Kapcsolódó:** ADR-009, ADR-010

---

## Tartalomjegyzék

1. [Migráció Áttekintés](#migráció-áttekintés)
2. [Komplexitás Elemzés](#komplexitás-elemzés)
3. [Lépésről Lépésre Migráció](#lépésről-lépésre-migráció)
4. [Kockázatok és Megoldások](#kockázatok-és-megoldások)
5. [Előkészítés B-nél C-re](#előkészítés-b-nél-c-re)
6. [Költség-Haszon Elemzés](#költség-haszon-elemzés)

---

## Migráció Áttekintés

### Mi változik B → C átállásnál?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        B) SERVICE LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   packages/                                                              │
│   ├── core/                    ← 1 NAGY package (auth+users+tenant+ui)  │
│   ├── service-layer/           ← 1 KÖZPONTI közvetítő                   │
│   ├── module-szerviz/          ← 1 modul package                        │
│   ├── module-berles/           ← 1 modul package                        │
│   └── module-aruhaz/           ← 1 modul package                        │
│                                                                          │
│   ÖSSZESEN: 5 package                                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ MIGRÁCIÓ
                                    │ 3-4 hét
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        C) MICRO-MODULES                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   packages/                                                              │
│   ├── core-auth/               ← @kgc/auth                              │
│   ├── core-users/              ← @kgc/users                             │
│   ├── core-tenant/             ← @kgc/tenant                            │
│   ├── core-config/             ← @kgc/config                            │
│   ├── core-ui/                 ← @kgc/ui                                │
│   ├── shared-partner/          ← @kgc/partner                           │
│   ├── shared-cikk/             ← @kgc/cikk                              │
│   ├── shared-keszlet/          ← @kgc/keszlet    ← Service Layer-ből   │
│   ├── shared-szamla/           ← @kgc/szamla                            │
│   ├── shared-nav/              ← @kgc/nav                               │
│   ├── szerviz-munkalap/        ← @kgc/munkalap                          │
│   ├── szerviz-arajanlat/       ← @kgc/arajanlat                         │
│   ├── szerviz-garancia/        ← @kgc/garancia                          │
│   ├── szerviz-norma/           ← @kgc/norma                             │
│   ├── berles-bergep/           ← @kgc/bergep                            │
│   ├── berles-szerzodes/        ← @kgc/berles                            │
│   ├── berles-kaucio/           ← @kgc/kaucio                            │
│   ├── aruhaz-bevetelezes/      ← @kgc/bevetelezes                       │
│   ├── aruhaz-eladas/           ← @kgc/eladas                            │
│   ├── aruhaz-arres/            ← @kgc/arres                             │
│   ├── aruhaz-leltar/           ← @kgc/leltar                            │
│   ├── integration-bergep-szerviz/  ← Cross-module                       │
│   └── integration-riportok/    ← Cross-module                           │
│                                                                          │
│   ÖSSZESEN: 23+ package                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Komplexitás Elemzés

### Összesített Nehézség

| Komponens | Migráció Nehézség | Időigény | Kockázat |
|-----------|-------------------|----------|----------|
| Core szétbontás | ⭐⭐ Közepes | 3-4 nap | Alacsony |
| **Service Layer szétbontás** | ⭐⭐⭐ **NEHÉZ** | **4-5 nap** | **MAGAS** |
| Domain modulok szétbontás | ⭐⭐⭐ Nehéz | 5-7 nap | Közepes |
| Event rendszer átállás | ⭐⭐⭐ Nehéz | 3-4 nap | Magas |
| Tesztek átírása | ⭐⭐ Közepes | 3-5 nap | Közepes |
| CI/CD frissítés | ⭐ Könnyű | 1-2 nap | Alacsony |
| **ÖSSZESEN** | | **3-4 hét** | |

### Miért a Service Layer a LEGNEHEZEBB?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER PROBLÉMÁK                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  B-NÉL:                                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    InventoryServiceLayer                            │ │
│  │                                                                      │ │
│  │  • consumeForRepair(munkalapId, items)    → Készlet csökken         │ │
│  │  • reserveForRental(berlesId, bergepId)   → Státusz változik        │ │
│  │  • sellItem(cikkId, qty)                  → Készlet + Számla        │ │
│  │  • transferStock(fromId, toId, qty)       → Átcsoportosítás         │ │
│  │  • calculateROI(bergepId)                 → Bérlés + Szerviz adat   │ │
│  │                                                                      │ │
│  │  MINDEN EGYÜTT, KÖZPONTILAG                                          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  C-NÉL SZÉT KELL BONTANI:                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │@kgc/keszlet │  │@kgc/munkalap│  │@kgc/berles  │  │@kgc/bergep- │    │
│  │             │  │             │  │             │  │szerviz-integ│    │
│  │ decrease()  │  │ addTetel()  │  │ reserve()   │  │             │    │
│  │ increase()  │  │ → EVENT     │  │ → EVENT     │  │ calcROI()   │    │
│  │ transfer()  │  │             │  │             │  │ → mindkét   │    │
│  │             │  │             │  │             │  │   modultól  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                          │
│  PROBLÉMA: Ki hívjon kit? Hogy maradjon loose coupled?                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Lépésről Lépésre Migráció

### 1. FÁZIS: Előkészítés (2-3 nap)

```bash
# 1. NX inicializálás
npx create-nx-workspace@latest kgc-erp --preset=ts

# 2. PNPM workspace
# pnpm-workspace.yaml
packages:
  - 'packages/*'

# 3. Alap package-ek létrehozása (üres)
mkdir -p packages/{core-auth,core-users,core-tenant,core-config,core-ui}
mkdir -p packages/{shared-partner,shared-cikk,shared-keszlet,shared-szamla}
mkdir -p packages/{szerviz-munkalap,szerviz-arajanlat,szerviz-garancia}
mkdir -p packages/{berles-bergep,berles-szerzodes,berles-kaucio}
mkdir -p packages/{aruhaz-bevetelezes,aruhaz-eladas,aruhaz-arres}
```

**Ellenőrző lista:**
- [ ] NX/Turborepo működik
- [ ] PNPM workspace konfigurálva
- [ ] tsconfig paths beállítva
- [ ] ESLint monorepo config kész

---

### 2. FÁZIS: Core Szétbontás (3-4 nap)

```typescript
// ELŐTTE (B - packages/core/src/index.ts)
export * from './auth';
export * from './users';
export * from './tenant';
export * from './config';
export * from './ui';

// UTÁNA (C - minden külön package)
// packages/core-auth/src/index.ts
export * from './auth.service';
export * from './auth.guard';
export * from './jwt.strategy';

// packages/core-users/src/index.ts
export * from './user.entity';
export * from './user.service';
export * from './rbac';
```

**Import változások:**
```typescript
// ELŐTTE
import { AuthService, UserService, TenantService } from '@kgc/core';

// UTÁNA
import { AuthService } from '@kgc/auth';
import { UserService } from '@kgc/users';
import { TenantService } from '@kgc/tenant';
```

**Ellenőrző lista:**
- [ ] @kgc/auth package működik
- [ ] @kgc/users package működik
- [ ] @kgc/tenant package működik
- [ ] @kgc/config package működik
- [ ] @kgc/ui package működik
- [ ] Régi @kgc/core importok átírva

---

### 3. FÁZIS: Service Layer Szétbontás (4-5 nap) ⚠️ KRITIKUS

Ez a **legnehezebb** lépés. A központi logikát szét kell osztani.

```typescript
// ═══════════════════════════════════════════════════════════════════════
// ELŐTTE: B - Egy nagy ServiceLayer
// ═══════════════════════════════════════════════════════════════════════

// packages/service-layer/src/inventory.service.ts
@Injectable()
export class InventoryServiceLayer {
  constructor(
    private keszletRepo: KeszletRepository,
    private cikkRepo: CikkRepository,
    private auditService: AuditService,
  ) {}

  // Szerviz használja
  async consumeForRepair(munkalapId: string, items: ConsumeItem[]) {
    for (const item of items) {
      await this.keszletRepo.decrease(item.cikkId, item.qty);
      await this.auditService.log({
        action: 'consume',
        source: 'szerviz',
        sourceId: munkalapId,
        cikkId: item.cikkId,
        qty: item.qty,
      });
    }
  }

  // Bérlés használja
  async reserveForRental(berlesId: string, bergepId: string) {
    await this.bergepRepo.setStatus(bergepId, 'kiadva');
    // Nem készlet mozgás, csak státusz
  }

  // Áruház használja
  async sellItem(cikkId: string, qty: number, partnerId: string) {
    await this.keszletRepo.decrease(cikkId, qty);
    // Számla generálás is itt
    return await this.szamlaService.create({ ... });
  }

  // Cross-module: Bérgép ROI számítás
  async calculateBergepROI(bergepId: string) {
    const berlesek = await this.berlesRepo.findByBergep(bergepId);
    const szervizek = await this.szervizRepo.findByBergep(bergepId);

    const bevetel = berlesek.reduce((sum, b) => sum + b.dij, 0);
    const koltseg = szervizek.reduce((sum, s) => sum + s.osszeg, 0);

    return { bevetel, koltseg, roi: bevetel - koltseg };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// UTÁNA: C - Szétbontva + Events
// ═══════════════════════════════════════════════════════════════════════

// 1. packages/shared-keszlet/src/keszlet.service.ts
@Injectable()
export class KeszletService {
  constructor(
    private keszletRepo: KeszletRepository,
    private eventBus: EventBus,
  ) {}

  async decrease(cikkId: string, qty: number, source?: AuditSource) {
    const result = await this.keszletRepo.decrease(cikkId, qty);

    // Event kibocsátás - bárki feliratkozhat
    await this.eventBus.emit(new KeszletCsokkentEvent({
      cikkId,
      qty,
      source,
      timestamp: new Date(),
    }));

    return result;
  }

  async increase(cikkId: string, qty: number, source?: AuditSource) {
    const result = await this.keszletRepo.increase(cikkId, qty);

    await this.eventBus.emit(new KeszletNoveltEvent({
      cikkId,
      qty,
      source,
    }));

    return result;
  }
}

// 2. packages/szerviz-munkalap/src/munkalap.service.ts
@Injectable()
export class MunkalapService {
  constructor(
    private munkalapRepo: MunkalapRepository,
    private eventBus: EventBus,
    // OPCIONÁLIS függőség - lehet, hogy nincs @kgc/keszlet
    @Optional() private keszletService?: KeszletService,
  ) {}

  async addTetel(munkalapId: string, tetel: TetelDto) {
    const result = await this.munkalapRepo.addTetel(munkalapId, tetel);

    // Ha van készlet modul, csökkentjük
    if (this.keszletService) {
      await this.keszletService.decrease(tetel.cikkId, tetel.qty, {
        type: 'szerviz',
        id: munkalapId,
      });
    }

    // Event minden esetben
    await this.eventBus.emit(new MunkalapTetelHozzaadvaEvent({
      munkalapId,
      tetel,
    }));

    return result;
  }
}

// 3. packages/integration-bergep-szerviz/src/roi.service.ts
// Ez egy INTEGRATION package - mindkét modultól függ
@Injectable()
export class BergepRoiService {
  constructor(
    @Optional() private berlesService?: BerlesService,
    @Optional() private szervizService?: SzervizService,
  ) {}

  async calculateROI(bergepId: string): Promise<RoiResult | null> {
    // Ha nincs mindkét modul, nem tudunk ROI-t számolni
    if (!this.berlesService || !this.szervizService) {
      return null;
    }

    const berlesek = await this.berlesService.findByBergep(bergepId);
    const szervizek = await this.szervizService.findByBergep(bergepId);

    const bevetel = berlesek.reduce((sum, b) => sum + b.dij, 0);
    const koltseg = szervizek.reduce((sum, s) => sum + s.osszeg, 0);

    return { bevetel, koltseg, roi: bevetel - koltseg };
  }
}
```

**Ellenőrző lista:**
- [ ] @kgc/keszlet önálló package
- [ ] @kgc/partner önálló package
- [ ] @kgc/szamla önálló package
- [ ] Event bus implementálva
- [ ] Összes service layer metódus áthelyezve
- [ ] Cross-module logika integration package-ben

---

### 4. FÁZIS: Domain Modulok Szétbontás (5-7 nap)

```typescript
// Szerviz modul → 4 package
// packages/module-szerviz/ → packages/szerviz-{munkalap,arajanlat,garancia,norma}/

// Bérlés modul → 4 package
// packages/module-berles/ → packages/berles-{bergep,szerzodes,berles,kaucio}/

// Áruház modul → 4 package
// packages/module-aruhaz/ → packages/aruhaz-{bevetelezes,eladas,arres,leltar}/
```

**Package.json példa:**
```json
// packages/szerviz-munkalap/package.json
{
  "name": "@kgc/munkalap",
  "version": "1.0.0",
  "main": "src/index.ts",
  "dependencies": {
    "@kgc/partner": "workspace:*",
    "@kgc/users": "workspace:*"
  },
  "peerDependencies": {
    "@kgc/keszlet": "workspace:*"
  },
  "peerDependenciesMeta": {
    "@kgc/keszlet": {
      "optional": true
    }
  }
}
```

---

### 5. FÁZIS: Finalizálás (3-4 nap)

```typescript
// Feature flags frissítése
// packages/core-config/src/packages.definition.ts
export const LICENSE_PACKAGES = {
  // Régi (B)
  // basic_szerviz: ['szerviz'],

  // Új (C) - finom granularitás
  basic_szerviz: [
    '@kgc/munkalap',
    '@kgc/arajanlat',
    // garancia NINCS
  ],
  pro_szerviz: [
    '@kgc/munkalap',
    '@kgc/arajanlat',
    '@kgc/garancia',
    '@kgc/norma',
  ],
  // ...
};
```

---

## Kockázatok és Megoldások

### 1. Circular Dependency

```
❌ PROBLÉMA:
@kgc/munkalap → @kgc/keszlet → @kgc/munkalap

✅ MEGOLDÁS:
• Interface-ek külön package-ben (@kgc/contracts)
• Event-driven kommunikáció
• Dependency Inversion
```

### 2. Import Path Törések

```
❌ PROBLÉMA:
Több száz fájlban változnak az importok

✅ MEGOLDÁS:
• TypeScript path aliasok (@kgc/*) már B-nél
• IDE refactor tool használata
• ESLint rule az ellenőrzésre
```

### 3. Runtime Hibák

```
❌ PROBLÉMA:
Opcionális függőség nincs → undefined error

✅ MEGOLDÁS:
• @Optional() decorator
• Null check minden opcionális service-nél
• Feature flag ellenőrzés UI-ban is
```

### 4. Teszt Törések

```
❌ PROBLÉMA:
Mock-ok nem működnek az új struktúrában

✅ MEGOLDÁS:
• Jest moduleNameMapper frissítés
• Új mock factory-k
• Integration tesztek külön
```

---

## Előkészítés B-nél C-re

### HA ELŐRE TERVEZEL, A MIGRÁCIÓ SOKKAL KÖNNYEBB!

```typescript
// ═══════════════════════════════════════════════════════════════════════
// B-NÉL IS HASZNÁLD EZEKET:
// ═══════════════════════════════════════════════════════════════════════

// 1. PATH ALIASOK - tsconfig.json
{
  "compilerOptions": {
    "paths": {
      // Már B-nél is @kgc/* prefix
      "@kgc/auth": ["./packages/core/src/auth"],
      "@kgc/users": ["./packages/core/src/users"],
      "@kgc/keszlet": ["./packages/service-layer/src/inventory"],
      "@kgc/munkalap": ["./packages/module-szerviz/src/munkalap"]
    }
  }
}
// C-nél: csak a path változik, import NEM!

// 2. INTERFACE-EK MINDENHOL
// packages/core/src/contracts/inventory.interface.ts
export interface IKeszletService {
  decrease(cikkId: string, qty: number): Promise<void>;
  increase(cikkId: string, qty: number): Promise<void>;
}

// Service implementálja
export class InventoryServiceLayer implements IKeszletService { ... }

// 3. EVENT BUS MÁR B-NÉL
// packages/core/src/events/event-bus.ts
@Injectable()
export class EventBus {
  private handlers = new Map<string, Function[]>();

  emit(event: BaseEvent) { ... }
  on(eventName: string, handler: Function) { ... }
}

// B-nél: szinkron, de event struktúra már kész
// C-nél: async + külön package-ek

// 4. MAPPA STRUKTÚRA B-NÉL
packages/
├── core/
│   └── src/
│       ├── auth/           # → @kgc/auth
│       ├── users/          # → @kgc/users
│       ├── tenant/         # → @kgc/tenant
│       └── contracts/      # → @kgc/contracts
├── service-layer/
│   └── src/
│       ├── inventory/      # → @kgc/keszlet
│       ├── partner/        # → @kgc/partner
│       └── szamla/         # → @kgc/szamla
└── module-szerviz/
    └── src/
        ├── munkalap/       # → @kgc/munkalap
        ├── arajanlat/      # → @kgc/arajanlat
        └── garancia/       # → @kgc/garancia

// A mappa nevek már egyeznek a későbbi package nevekkel!
```

---

## Költség-Haszon Elemzés

### Migráció ELŐKÉSZÍTÉS NÉLKÜL

| Tétel | Idő | Kockázat |
|-------|-----|----------|
| Előkészítés | 3 nap | Alacsony |
| Core szétbontás | 4 nap | Közepes |
| Service Layer | 5 nap | **MAGAS** |
| Domain modulok | 7 nap | Közepes |
| Event átállás | 4 nap | **MAGAS** |
| Tesztek | 5 nap | Közepes |
| CI/CD | 2 nap | Alacsony |
| **ÖSSZESEN** | **30 nap** | **MAGAS** |

### Migráció ELŐKÉSZÍTÉSSEL (B-nél már C-re tervezve)

| Tétel | Idő | Kockázat |
|-------|-----|----------|
| Előkészítés | 1 nap | Alacsony |
| Core szétbontás | 2 nap | Alacsony |
| Service Layer | 3 nap | Közepes |
| Domain modulok | 4 nap | Alacsony |
| Event átállás | 1 nap | Alacsony (már van) |
| Tesztek | 2 nap | Alacsony |
| CI/CD | 1 nap | Alacsony |
| **ÖSSZESEN** | **14 nap** | **ALACSONY** |

### Megtakarítás

```
ELŐKÉSZÍTÉS NÉLKÜL:  30 nap,  Magas kockázat
ELŐKÉSZÍTÉSSEL:      14 nap,  Alacsony kockázat
─────────────────────────────────────────────
MEGTAKARÍTÁS:        16 nap (53%)
```

---

## Összegzés

### Ajánlás

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   🏆 LEGJOBB STRATÉGIA:                                                  │
│                                                                          │
│   1. KEZDJ B-VEL (Service Layer)                                         │
│      → Gyorsabb MVP                                                      │
│      → Egyszerűbb fejlesztés                                             │
│                                                                          │
│   2. DE TERVEZZ C-RE:                                                    │
│      → @kgc/* path aliasok                                               │
│      → Interface-ek mindenhol                                            │
│      → Event bus már B-nél                                               │
│      → Mappa struktúra előkészítve                                       │
│                                                                          │
│   3. MIGRÁLD C-RE AMIKOR:                                                │
│      → 4+ fejlesztő                                                      │
│      → Komplex licenc struktúra kell                                     │
│      → Bundle méret kritikus                                             │
│      → Team-ek modulonként dolgoznának                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Kapcsolódó Dokumentumok

- [ADR-009-modular-architecture-alternatives.md](ADR-009-modular-architecture-alternatives.md) - Opciók összehasonlítása
- [ADR-010-micro-modules-detailed.md](ADR-010-micro-modules-detailed.md) - C opció részletes terv
- [5-b-to-c-migration-complexity.excalidraw](../diagrams/5-b-to-c-migration-complexity.excalidraw) - Vizuális diagram
