# ADR-010: Micro-Modules Architektúra - Részletes Terv

**Dátum:** 2025-12-10
**Státusz:** Tervezet
**Kapcsolódó:** ADR-009 (Alternatívák összehasonlítás)

---

## Tartalomjegyzék

1. [Koncepció](#koncepció)
2. [Mappa Struktúra](#mappa-struktúra)
3. [Package Konfigurációk](#package-konfigurációk)
4. [Modul Katalógus](#modul-katalógus)
5. [Dependency Graph](#dependency-graph)
6. [Feature Flag Rendszer](#feature-flag-rendszer)
7. [Licenc Csomagok](#licenc-csomagok)
8. [Monorepo Tooling](#monorepo-tooling)
9. [Build és Deploy](#build-és-deploy)
10. [Példa Implementációk](#példa-implementációk)
11. [Migrációs Terv](#migrációs-terv)

---

## Koncepció

### Mi az a Micro-Modules?

A Micro-Modules architektúra a **mikroszolgáltatások elveit alkalmazza modul szinten**, de egyetlen deployable unit-ként (monorepo). Minden üzleti funkció önálló npm package, amelyek:

- Önállóan verzionálhatók
- Önállóan tesztelhetők
- Feature flag-ekkel ki/bekapcsolhatók
- Lazy-loadolhatók runtime-ban

### Vizuális Áttekintés

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KGC ERP - MICRO-MODULES                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CORE LAYER (Mindig aktív - nem kikapcsolható)                       │   │
│  │                                                                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  @kgc/   │ │  @kgc/   │ │  @kgc/   │ │  @kgc/   │ │  @kgc/   │  │   │
│  │  │  auth    │ │  users   │ │  tenant  │ │  config  │ │   ui     │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ SHARED LAYER (Feature flag vezérelt)                                │   │
│  │                                                                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  @kgc/   │ │  @kgc/   │ │  @kgc/   │ │  @kgc/   │ │  @kgc/   │  │   │
│  │  │ partner  │ │  cikk    │ │ keszlet  │ │  szamla  │ │   nav    │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│            ┌─────────────────────────┼─────────────────────────┐           │
│            │                         │                         │           │
│            ▼                         ▼                         ▼           │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│  │ SZERVIZ LAYER   │     │ BÉRLÉS LAYER    │     │ ÁRUHÁZ LAYER    │      │
│  │                 │     │                 │     │                 │      │
│  │ ┌─────────────┐ │     │ ┌─────────────┐ │     │ ┌─────────────┐ │      │
│  │ │  @kgc/      │ │     │ │  @kgc/      │ │     │ │  @kgc/      │ │      │
│  │ │  munkalap   │ │     │ │  bergep     │ │     │ │ bevetelezes │ │      │
│  │ └─────────────┘ │     │ └─────────────┘ │     │ └─────────────┘ │      │
│  │ ┌─────────────┐ │     │ ┌─────────────┐ │     │ ┌─────────────┐ │      │
│  │ │  @kgc/      │ │     │ │  @kgc/      │ │     │ │  @kgc/      │ │      │
│  │ │  arajanlat  │ │     │ │  berles     │ │     │ │   eladas    │ │      │
│  │ └─────────────┘ │     │ └─────────────┘ │     │ └─────────────┘ │      │
│  │ ┌─────────────┐ │     │ ┌─────────────┐ │     │ ┌─────────────┐ │      │
│  │ │  @kgc/      │ │     │ │  @kgc/      │ │     │ │  @kgc/      │ │      │
│  │ │  garancia   │ │     │ │  szerzodes  │ │     │ │   arres     │ │      │
│  │ └─────────────┘ │     │ └─────────────┘ │     │ └─────────────┘ │      │
│  │ ┌─────────────┐ │     │ ┌─────────────┐ │     │ ┌─────────────┐ │      │
│  │ │  @kgc/      │ │     │ │  @kgc/      │ │     │ │  @kgc/      │ │      │
│  │ │   norma     │ │     │ │   kaucio    │ │     │ │   leltar    │ │      │
│  │ └─────────────┘ │     │ └─────────────┘ │     │ └─────────────┘ │      │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘      │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ INTEGRÁCIÓ LAYER (Cross-module funkciók)                            │   │
│  │                                                                     │   │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌───────────────┐  │   │
│  │  │ @kgc/              │  │ @kgc/              │  │ @kgc/         │  │   │
│  │  │ bergep-szerviz     │  │ online-foglalas    │  │ riportok      │  │   │
│  │  │ integration        │  │ integration        │  │               │  │   │
│  │  └────────────────────┘  └────────────────────┘  └───────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mappa Struktúra

### Teljes Projekt Struktúra

```
/home/javo/DEV/KGC-2/
├── package.json                    # Monorepo root
├── pnpm-workspace.yaml             # PNPM workspace config
├── nx.json                         # NX monorepo config
├── tsconfig.base.json              # Közös TypeScript config
│
├── packages/                       # Minden modul itt
│   │
│   │── ══════════════════════════════════════════════════════
│   │   CORE LAYER - Mindig aktív
│   │── ══════════════════════════════════════════════════════
│   │
│   ├── core-auth/                  # @kgc/auth
│   │   ├── src/
│   │   │   ├── index.ts            # Public API
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       └── register.dto.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── core-users/                 # @kgc/users
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── user.entity.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.controller.ts
│   │   │   └── rbac/
│   │   │       ├── role.entity.ts
│   │   │       ├── permission.entity.ts
│   │   │       └── rbac.service.ts
│   │   └── package.json
│   │
│   ├── core-tenant/                # @kgc/tenant
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── tenant.entity.ts
│   │   │   ├── tenant.service.ts
│   │   │   ├── tenant.middleware.ts
│   │   │   └── tenant.decorator.ts
│   │   └── package.json
│   │
│   ├── core-config/                # @kgc/config
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── config.service.ts
│   │   │   ├── feature-flags.ts
│   │   │   ├── license.service.ts
│   │   │   └── packages.definition.ts
│   │   └── package.json
│   │
│   ├── core-ui/                    # @kgc/ui
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── components/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Table.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── ...
│   │   │   ├── layouts/
│   │   │   │   ├── MainLayout.tsx
│   │   │   │   └── AuthLayout.tsx
│   │   │   └── hooks/
│   │   │       ├── useAuth.ts
│   │   │       └── useTenant.ts
│   │   └── package.json
│   │
│   │── ══════════════════════════════════════════════════════
│   │   SHARED LAYER - Feature flag vezérelt
│   │── ══════════════════════════════════════════════════════
│   │
│   ├── shared-partner/             # @kgc/partner
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── partner.entity.ts
│   │   │   ├── partner.service.ts
│   │   │   ├── partner.controller.ts
│   │   │   ├── partner.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-partner.dto.ts
│   │   │   │   └── update-partner.dto.ts
│   │   │   └── components/         # UI komponensek
│   │   │       ├── PartnerSearch.tsx
│   │   │       ├── PartnerForm.tsx
│   │   │       └── PartnerList.tsx
│   │   ├── package.json
│   │   └── dependencies.json       # Modul függőségek
│   │
│   ├── shared-cikk/                # @kgc/cikk
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── cikk.entity.ts
│   │   │   ├── cikk.service.ts
│   │   │   ├── cikkcsoport.entity.ts
│   │   │   ├── beszallito.entity.ts
│   │   │   └── components/
│   │   │       ├── CikkSearch.tsx
│   │   │       └── CikkForm.tsx
│   │   └── package.json
│   │
│   ├── shared-keszlet/             # @kgc/keszlet
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── keszlet.service.ts
│   │   │   ├── keszlet-mozgas.entity.ts
│   │   │   ├── reservation.entity.ts
│   │   │   ├── reservation.service.ts
│   │   │   └── components/
│   │   │       └── KeszletDisplay.tsx
│   │   └── package.json
│   │
│   ├── shared-szamla/              # @kgc/szamla
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── szamla.entity.ts
│   │   │   ├── szamla.service.ts
│   │   │   ├── szamla-tetel.entity.ts
│   │   │   └── pdf-generator.ts
│   │   └── package.json
│   │
│   ├── shared-nav/                 # @kgc/nav
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── nav.service.ts
│   │   │   ├── nav-xml-builder.ts
│   │   │   └── nav-response-parser.ts
│   │   └── package.json
│   │
│   │── ══════════════════════════════════════════════════════
│   │   SZERVIZ LAYER
│   │── ══════════════════════════════════════════════════════
│   │
│   ├── szerviz-munkalap/           # @kgc/munkalap
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── munkalap.entity.ts
│   │   │   ├── munkalap.service.ts
│   │   │   ├── munkalap.controller.ts
│   │   │   ├── munkalap-tetel.entity.ts
│   │   │   ├── statusz-machine.ts
│   │   │   └── components/
│   │   │       ├── MunkalapForm.tsx
│   │   │       ├── MunkalapList.tsx
│   │   │       └── MunkalapTetelForm.tsx
│   │   ├── package.json
│   │   └── dependencies.json
│   │
│   ├── szerviz-arajanlat/          # @kgc/arajanlat
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── arajanlat.entity.ts
│   │   │   ├── arajanlat.service.ts
│   │   │   └── components/
│   │   │       └── ArajanlatForm.tsx
│   │   └── package.json
│   │
│   ├── szerviz-garancia/           # @kgc/garancia
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── garancia-claim.entity.ts
│   │   │   ├── garancia.service.ts
│   │   │   └── components/
│   │   │       └── GaranciaClaimForm.tsx
│   │   └── package.json
│   │
│   ├── szerviz-norma/              # @kgc/norma
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── norma-tetel.entity.ts
│   │   │   ├── norma.service.ts
│   │   │   └── makita-norma-import.ts
│   │   └── package.json
│   │
│   │── ══════════════════════════════════════════════════════
│   │   BÉRLÉS LAYER
│   │── ══════════════════════════════════════════════════════
│   │
│   ├── berles-bergep/              # @kgc/bergep
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── bergep.entity.ts
│   │   │   ├── bergep.service.ts
│   │   │   ├── bergep-statusz.enum.ts
│   │   │   └── components/
│   │   │       ├── BergepList.tsx
│   │   │       └── BergepForm.tsx
│   │   └── package.json
│   │
│   ├── berles-berles/              # @kgc/berles
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── berles.entity.ts
│   │   │   ├── berles.service.ts
│   │   │   ├── keses-szamitas.ts
│   │   │   └── components/
│   │   │       ├── BerlesInditasForm.tsx
│   │   │       └── BerlesLezarasForm.tsx
│   │   └── package.json
│   │
│   ├── berles-szerzodes/           # @kgc/szerzodes
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── szerzodes.service.ts
│   │   │   ├── szerzodes-pdf.ts
│   │   │   └── szerzodes-template.ts
│   │   └── package.json
│   │
│   ├── berles-kaucio/              # @kgc/kaucio
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── kaucio.entity.ts
│   │   │   ├── kaucio.service.ts
│   │   │   └── components/
│   │   │       └── KaucioForm.tsx
│   │   └── package.json
│   │
│   │── ══════════════════════════════════════════════════════
│   │   ÁRUHÁZ LAYER
│   │── ══════════════════════════════════════════════════════
│   │
│   ├── aruhaz-bevetelezes/         # @kgc/bevetelezes
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── bevetelezes.entity.ts
│   │   │   ├── bevetelezes.service.ts
│   │   │   └── components/
│   │   │       └── BevetelezesForm.tsx
│   │   └── package.json
│   │
│   ├── aruhaz-eladas/              # @kgc/eladas
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── eladas.entity.ts
│   │   │   ├── eladas.service.ts
│   │   │   └── components/
│   │   │       └── PenztarForm.tsx
│   │   └── package.json
│   │
│   ├── aruhaz-arres/               # @kgc/arres
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── arres-kategoria.entity.ts
│   │   │   ├── arres.service.ts
│   │   │   └── auto-arazas.ts
│   │   └── package.json
│   │
│   ├── aruhaz-leltar/              # @kgc/leltar
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── leltar.service.ts
│   │   │   └── components/
│   │   │       └── LeltarForm.tsx
│   │   └── package.json
│   │
│   │── ══════════════════════════════════════════════════════
│   │   INTEGRÁCIÓ LAYER
│   │── ══════════════════════════════════════════════════════
│   │
│   ├── integration-bergep-szerviz/ # @kgc/bergep-szerviz-integration
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── bergep-to-munkalap.ts
│   │   │   ├── roi-calculator.ts
│   │   │   └── szerviz-koltseg-tracker.ts
│   │   └── package.json
│   │
│   ├── integration-online-foglalas/# @kgc/online-foglalas-integration
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── foglalas.entity.ts
│   │   │   ├── foglalas.service.ts
│   │   │   └── webshop-sync.ts
│   │   └── package.json
│   │
│   └── integration-riportok/       # @kgc/riportok
│       ├── src/
│       │   ├── index.ts
│       │   ├── riport-generator.ts
│       │   └── riport-templates/
│       └── package.json
│
├── apps/                           # Alkalmazások
│   │
│   ├── api/                        # Backend API
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   └── module-loader.ts    # Dinamikus modul betöltés
│   │   └── package.json
│   │
│   └── web/                        # Frontend Web App
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── router.tsx
│       │   ├── module-loader.ts    # Lazy loading
│       │   └── pages/
│       │       └── ...
│       └── package.json
│
├── tools/                          # Build és fejlesztői eszközök
│   ├── generators/                 # NX generátorok
│   │   └── module/
│   └── scripts/
│       ├── build-package.ts
│       └── publish-package.ts
│
└── docs/                           # Dokumentáció
    ├── architecture/
    └── diagrams/
```

---

## Package Konfigurációk

### Root package.json

```json
{
  "name": "kgc-erp",
  "version": "0.0.0",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev": "nx run-many --target=serve --all",
    "build": "nx run-many --target=build --all",
    "test": "nx run-many --target=test --all",
    "lint": "nx run-many --target=lint --all",
    "build:affected": "nx affected --target=build",
    "test:affected": "nx affected --target=test"
  },
  "devDependencies": {
    "@nx/workspace": "^17.0.0",
    "@nx/node": "^17.0.0",
    "@nx/react": "^17.0.0",
    "typescript": "^5.3.0",
    "nx": "^17.0.0"
  }
}
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

### Példa modul package.json (@kgc/munkalap)

```json
{
  "name": "@kgc/munkalap",
  "version": "1.0.0",
  "description": "KGC ERP - Munkalap modul",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./components": {
      "import": "./dist/components/index.mjs",
      "require": "./dist/components/index.js"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "test": "vitest run",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@kgc/partner": "workspace:*",
    "@kgc/cikk": "workspace:*",
    "@kgc/keszlet": "workspace:*",
    "@kgc/tenant": "workspace:*"
  },
  "peerDependencies": {
    "@kgc/szamla": "workspace:*"
  },
  "optionalDependencies": {
    "@kgc/bergep-szerviz-integration": "workspace:*"
  },
  "kgc": {
    "layer": "szerviz",
    "featureFlag": "munkalap",
    "requiredModules": ["partner", "cikk", "keszlet"],
    "optionalModules": ["szamla", "bergep-szerviz-integration"]
  }
}
```

### dependencies.json (Modul metaadat)

```json
{
  "module": "@kgc/munkalap",
  "layer": "szerviz",
  "featureFlag": "munkalap",
  "dependencies": {
    "required": [
      {
        "module": "@kgc/partner",
        "reason": "Ügyfél adatok a munkalaphoz"
      },
      {
        "module": "@kgc/cikk",
        "reason": "Alkatrészek a munkalap tételekhez"
      },
      {
        "module": "@kgc/keszlet",
        "reason": "Készlet csökkentés lezáráskor"
      }
    ],
    "optional": [
      {
        "module": "@kgc/szamla",
        "reason": "Számla generálás",
        "fallback": "Külső számlázó rendszer"
      }
    ],
    "integrations": [
      {
        "module": "@kgc/bergep-szerviz-integration",
        "reason": "Bérgép szerviz költség tracking",
        "enabledWhen": "bergep AND munkalap"
      }
    ]
  },
  "provides": {
    "entities": ["Munkalap", "MunkalapTetel"],
    "services": ["MunkalapService"],
    "controllers": ["MunkalapController"],
    "components": ["MunkalapForm", "MunkalapList", "MunkalapTetelForm"]
  },
  "events": {
    "emits": [
      "munkalap.created",
      "munkalap.status.changed",
      "munkalap.closed"
    ],
    "listens": [
      "bergep.status.changed"
    ]
  }
}
```

---

## Modul Katalógus

### Összes Modul Táblázat

| Layer | Modul | Package | Feature Flag | Függőségek |
|-------|-------|---------|--------------|------------|
| **CORE** | Auth | `@kgc/auth` | - (mindig) | - |
| **CORE** | Users | `@kgc/users` | - (mindig) | auth |
| **CORE** | Tenant | `@kgc/tenant` | - (mindig) | - |
| **CORE** | Config | `@kgc/config` | - (mindig) | - |
| **CORE** | UI | `@kgc/ui` | - (mindig) | - |
| **SHARED** | Partner | `@kgc/partner` | `partner` | tenant |
| **SHARED** | Cikk | `@kgc/cikk` | `cikk` | tenant |
| **SHARED** | Készlet | `@kgc/keszlet` | `keszlet` | cikk, tenant |
| **SHARED** | Számla | `@kgc/szamla` | `szamla` | partner, nav |
| **SHARED** | NAV | `@kgc/nav` | `nav` | - |
| **SZERVIZ** | Munkalap | `@kgc/munkalap` | `munkalap` | partner, cikk, keszlet |
| **SZERVIZ** | Árajánlat | `@kgc/arajanlat` | `arajanlat` | munkalap, partner |
| **SZERVIZ** | Garancia | `@kgc/garancia` | `garancia` | munkalap |
| **SZERVIZ** | Norma | `@kgc/norma` | `norma` | garancia |
| **BÉRLÉS** | Bérgép | `@kgc/bergep` | `bergep` | cikk |
| **BÉRLÉS** | Bérlés | `@kgc/berles` | `berles` | bergep, partner |
| **BÉRLÉS** | Szerződés | `@kgc/szerzodes` | `szerzodes` | berles |
| **BÉRLÉS** | Kaució | `@kgc/kaucio` | `kaucio` | berles |
| **ÁRUHÁZ** | Bevételezés | `@kgc/bevetelezes` | `bevetelezes` | cikk, keszlet |
| **ÁRUHÁZ** | Eladás | `@kgc/eladas` | `eladas` | cikk, keszlet, szamla |
| **ÁRUHÁZ** | Árrés | `@kgc/arres` | `arres` | cikk |
| **ÁRUHÁZ** | Leltár | `@kgc/leltar` | `leltar` | cikk, keszlet |
| **INTEG** | Bérgép-Szerviz | `@kgc/bergep-szerviz-integration` | `bergepSzerviz` | bergep, munkalap |
| **INTEG** | Online Foglalás | `@kgc/online-foglalas-integration` | `onlineFoglalas` | keszlet, partner |
| **INTEG** | Riportok | `@kgc/riportok` | `riportok` | * |

---

## Dependency Graph

### Vizuális Függőségi Gráf

```
                                    ┌─────────┐
                                    │  CORE   │
                                    │ (mindig)│
                                    └────┬────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
              ┌──────────┐        ┌──────────┐        ┌──────────┐
              │ @kgc/    │        │ @kgc/    │        │ @kgc/    │
              │ partner  │        │  cikk    │        │   nav    │
              └────┬─────┘        └────┬─────┘        └────┬─────┘
                   │                   │                   │
                   │              ┌────┴────┐              │
                   │              │         │              │
                   │              ▼         │              │
                   │        ┌──────────┐    │              │
                   │        │ @kgc/    │    │              │
                   │        │ keszlet  │    │              │
                   │        └────┬─────┘    │              │
                   │             │          │              │
    ┌──────────────┼─────────────┼──────────┼──────────────┼──────────────┐
    │              │             │          │              │              │
    │    ┌─────────┴─────────────┴──────────┴───────┐      │              │
    │    │                                          │      │              │
    │    ▼                                          ▼      ▼              │
    │ ┌──────────┐                            ┌──────────────┐            │
    │ │ @kgc/    │                            │   @kgc/      │            │
    │ │ munkalap │                            │   szamla     │            │
    │ └────┬─────┘                            └──────────────┘            │
    │      │                                                              │
    │      ├────────────────┐                                             │
    │      │                │                                             │
    │      ▼                ▼                                             │
    │ ┌──────────┐    ┌──────────┐                                       │
    │ │ @kgc/    │    │ @kgc/    │                                       │
    │ │arajanlat │    │ garancia │                                       │
    │ └──────────┘    └────┬─────┘                                       │
    │                      │                                              │
    │                      ▼                                              │
    │                 ┌──────────┐                                        │
    │                 │ @kgc/    │                                        │
    │                 │  norma   │                                        │
    │                 └──────────┘                                        │
    │                                                                     │
    │  SZERVIZ LAYER ─────────────────────────────────────────────────────┤
    │                                                                     │
    │    ┌─────────────────────────────────────────────────────────────┐  │
    │    │                                                             │  │
    │    ▼                                                             │  │
    │ ┌──────────┐                                                     │  │
    │ │ @kgc/    │                                                     │  │
    │ │ bergep   │────────────────────────┐                            │  │
    │ └────┬─────┘                        │                            │  │
    │      │                              │                            │  │
    │      ▼                              │                            │  │
    │ ┌──────────┐                        │                            │  │
    │ │ @kgc/    │                        │                            │  │
    │ │  berles  │                        │                            │  │
    │ └────┬─────┘                        │                            │  │
    │      │                              │                            │  │
    │      ├────────────────┐             │                            │  │
    │      │                │             │                            │  │
    │      ▼                ▼             │                            │  │
    │ ┌──────────┐    ┌──────────┐        │                            │  │
    │ │ @kgc/    │    │ @kgc/    │        │                            │  │
    │ │szerzodes │    │  kaucio  │        │                            │  │
    │ └──────────┘    └──────────┘        │                            │  │
    │                                     │                            │  │
    │  BÉRLÉS LAYER ──────────────────────┼────────────────────────────┤  │
    │                                     │                            │  │
    │                                     │                            │  │
    │                                     ▼                            │  │
    │                        ┌────────────────────────┐                │  │
    │                        │ @kgc/bergep-szerviz    │                │  │
    │                        │     integration        │◄───────────────┘  │
    │                        └────────────────────────┘                   │
    │                                                                     │
    │  INTEGRÁCIÓ LAYER ──────────────────────────────────────────────────┤
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

---

## Feature Flag Rendszer

### Feature Flags Definíció

```typescript
// packages/core-config/src/feature-flags.ts

export interface FeatureFlags {
  // CORE - mindig true, nem változtatható
  readonly auth: true;
  readonly users: true;
  readonly tenant: true;
  readonly config: true;
  readonly ui: true;

  // SHARED - csomag függő
  partner: boolean;
  cikk: boolean;
  keszlet: boolean;
  szamla: boolean;
  nav: boolean;

  // SZERVIZ
  munkalap: boolean;
  arajanlat: boolean;
  garancia: boolean;
  norma: boolean;

  // BÉRLÉS
  bergep: boolean;
  berles: boolean;
  szerzodes: boolean;
  kaucio: boolean;

  // ÁRUHÁZ
  bevetelezes: boolean;
  eladas: boolean;
  arres: boolean;
  leltar: boolean;

  // INTEGRÁCIÓK
  bergepSzerviz: boolean;
  onlineFoglalas: boolean;
  riportok: boolean;
}

// Alapértelmezett értékek
export const DEFAULT_FLAGS: FeatureFlags = {
  // CORE
  auth: true,
  users: true,
  tenant: true,
  config: true,
  ui: true,

  // Minden más alapból kikapcsolva
  partner: false,
  cikk: false,
  keszlet: false,
  szamla: false,
  nav: false,
  munkalap: false,
  arajanlat: false,
  garancia: false,
  norma: false,
  bergep: false,
  berles: false,
  szerzodes: false,
  kaucio: false,
  bevetelezes: false,
  eladas: false,
  arres: false,
  leltar: false,
  bergepSzerviz: false,
  onlineFoglalas: false,
  riportok: false,
};
```

### Feature Flag Service

```typescript
// packages/core-config/src/feature-flag.service.ts

import { Injectable } from '@nestjs/common';
import { FeatureFlags, DEFAULT_FLAGS } from './feature-flags';
import { TenantService } from '@kgc/tenant';

@Injectable()
export class FeatureFlagService {
  constructor(private tenantService: TenantService) {}

  async getFlags(tenantId: string): Promise<FeatureFlags> {
    const tenant = await this.tenantService.getTenant(tenantId);
    const packageFlags = PACKAGES[tenant.packageType];

    return {
      ...DEFAULT_FLAGS,
      ...packageFlags,
      ...tenant.customFlags, // Egyedi felülírások
    };
  }

  async isEnabled(tenantId: string, flag: keyof FeatureFlags): Promise<boolean> {
    const flags = await this.getFlags(tenantId);
    return flags[flag] === true;
  }

  async checkDependencies(tenantId: string, flag: keyof FeatureFlags): Promise<{
    canEnable: boolean;
    missingDependencies: string[];
  }> {
    const deps = MODULE_DEPENDENCIES[flag];
    const flags = await this.getFlags(tenantId);

    const missing = deps.required.filter(dep => !flags[dep]);

    return {
      canEnable: missing.length === 0,
      missingDependencies: missing,
    };
  }
}
```

### Frontend Feature Flag Hook

```typescript
// packages/core-ui/src/hooks/useFeatureFlag.ts

import { useContext, useMemo } from 'react';
import { TenantContext } from '../contexts/TenantContext';
import { FeatureFlags } from '@kgc/config';

export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  const { tenant, flags } = useContext(TenantContext);
  return flags[flag] === true;
}

export function useFeatureFlags(): FeatureFlags {
  const { flags } = useContext(TenantContext);
  return flags;
}

// Használat komponensben:
export function SzervizMenu() {
  const munkalapEnabled = useFeatureFlag('munkalap');
  const garanciaEnabled = useFeatureFlag('garancia');

  return (
    <nav>
      {munkalapEnabled && <Link to="/szerviz/munkalap">Munkalapok</Link>}
      {garanciaEnabled && <Link to="/szerviz/garancia">Garancia</Link>}
    </nav>
  );
}
```

### Conditional Module Loading

```typescript
// apps/web/src/module-loader.ts

import { lazy, Suspense } from 'react';
import { FeatureFlags } from '@kgc/config';

// Lazy loaded modulok
const moduleMap = {
  munkalap: lazy(() => import('@kgc/munkalap/components')),
  arajanlat: lazy(() => import('@kgc/arajanlat/components')),
  garancia: lazy(() => import('@kgc/garancia/components')),
  bergep: lazy(() => import('@kgc/bergep/components')),
  berles: lazy(() => import('@kgc/berles/components')),
  // ... többi modul
};

export function loadModule(moduleName: keyof typeof moduleMap, flags: FeatureFlags) {
  if (!flags[moduleName]) {
    return null;
  }

  const Module = moduleMap[moduleName];

  return (
    <Suspense fallback={<Loading />}>
      <Module />
    </Suspense>
  );
}
```

---

## Licenc Csomagok

### Csomag Definíciók

```typescript
// packages/core-config/src/packages.definition.ts

export const PACKAGES: Record<string, Partial<FeatureFlags>> = {

  // ═══════════════════════════════════════════════════════════════
  // BASIC CSOMAGOK - Egy üzleti terület
  // ═══════════════════════════════════════════════════════════════

  basic_szerviz: {
    // SHARED
    partner: true,
    cikk: true,
    keszlet: true,
    szamla: true,
    nav: true,
    // SZERVIZ
    munkalap: true,
    arajanlat: true,
    garancia: true,
    norma: true,
  },

  basic_berles: {
    // SHARED
    partner: true,
    cikk: true,
    keszlet: true,
    szamla: true,
    nav: true,
    // BÉRLÉS
    bergep: true,
    berles: true,
    szerzodes: true,
    kaucio: true,
  },

  basic_aruhaz: {
    // SHARED
    partner: true,
    cikk: true,
    keszlet: true,
    szamla: true,
    nav: true,
    // ÁRUHÁZ
    bevetelezes: true,
    eladas: true,
    arres: true,
    leltar: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // PRO CSOMAGOK - Kombinációk
  // ═══════════════════════════════════════════════════════════════

  pro_szerviz_berles: {
    // SHARED
    partner: true,
    cikk: true,
    keszlet: true,
    szamla: true,
    nav: true,
    // SZERVIZ
    munkalap: true,
    arajanlat: true,
    garancia: true,
    norma: true,
    // BÉRLÉS
    bergep: true,
    berles: true,
    szerzodes: true,
    kaucio: true,
    // INTEGRÁCIÓ
    bergepSzerviz: true,  // ROI számítás!
  },

  pro_full: {
    // Minden SHARED
    partner: true,
    cikk: true,
    keszlet: true,
    szamla: true,
    nav: true,
    // Minden SZERVIZ
    munkalap: true,
    arajanlat: true,
    garancia: true,
    norma: true,
    // Minden BÉRLÉS
    bergep: true,
    berles: true,
    szerzodes: true,
    kaucio: true,
    // Minden ÁRUHÁZ
    bevetelezes: true,
    eladas: true,
    arres: true,
    leltar: true,
    // INTEGRÁCIÓK
    bergepSzerviz: true,
    riportok: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // ENTERPRISE - Minden + egyedi
  // ═══════════════════════════════════════════════════════════════

  enterprise: {
    // Minden true
    partner: true,
    cikk: true,
    keszlet: true,
    szamla: true,
    nav: true,
    munkalap: true,
    arajanlat: true,
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
    bergepSzerviz: true,
    onlineFoglalas: true,
    riportok: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // EGYEDI CSOMAGOK - À la carte
  // ═══════════════════════════════════════════════════════════════

  // Példa: Ügyfél csak munkalapot akar, garancia nélkül
  custom_munkalap_only: {
    partner: true,
    cikk: true,
    keszlet: true,
    munkalap: true,
    // Nincs: arajanlat, garancia, norma, szamla
  },

  // Példa: Egyszerű kölcsönző, szerviz nélkül
  custom_berles_simple: {
    partner: true,
    cikk: true,
    bergep: true,
    berles: true,
    szerzodes: true,
    // Nincs: keszlet (nem kell részletes készlet), szamla (külső rendszer)
  },
};
```

### Csomag Árazás (Példa)

```typescript
// packages/core-config/src/pricing.ts

export const PACKAGE_PRICING = {
  basic_szerviz: {
    basePrice: 15000,      // HUF/hó
    perUser: 3000,         // HUF/felhasználó/hó
    maxUsers: 5,
  },
  basic_berles: {
    basePrice: 15000,
    perUser: 3000,
    maxUsers: 5,
  },
  basic_aruhaz: {
    basePrice: 20000,
    perUser: 4000,
    maxUsers: 5,
  },
  pro_szerviz_berles: {
    basePrice: 35000,
    perUser: 5000,
    maxUsers: 15,
  },
  pro_full: {
    basePrice: 50000,
    perUser: 6000,
    maxUsers: 30,
  },
  enterprise: {
    basePrice: 100000,
    perUser: 8000,
    maxUsers: -1,  // Korlátlan
  },
};

// À la carte árazás
export const MODULE_PRICING = {
  munkalap: 5000,
  arajanlat: 2000,
  garancia: 3000,
  norma: 2000,
  bergep: 5000,
  berles: 5000,
  szerzodes: 2000,
  kaucio: 1000,
  bevetelezes: 4000,
  eladas: 5000,
  arres: 2000,
  leltar: 3000,
  bergepSzerviz: 5000,
  onlineFoglalas: 8000,
  riportok: 5000,
};
```

---

## Monorepo Tooling

### NX Konfiguráció

```json
// nx.json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/*.spec.ts",
      "!{projectRoot}/tsconfig.spec.json"
    ],
    "sharedGlobals": ["{workspaceRoot}/tsconfig.base.json"]
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production"],
      "cache": true
    }
  },
  "plugins": [
    {
      "plugin": "@nx/eslint/plugin",
      "options": {
        "targetName": "lint"
      }
    }
  ],
  "defaultBase": "main"
}
```

### project.json (Példa: @kgc/munkalap)

```json
// packages/szerviz-munkalap/project.json
{
  "name": "@kgc/munkalap",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/szerviz-munkalap/src",
  "projectType": "library",
  "tags": ["layer:szerviz", "type:feature"],
  "implicitDependencies": [
    "@kgc/partner",
    "@kgc/cikk",
    "@kgc/keszlet"
  ],
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/packages/szerviz-munkalap",
        "main": "packages/szerviz-munkalap/src/index.ts",
        "tsConfig": "packages/szerviz-munkalap/tsconfig.lib.json"
      }
    },
    "test": {
      "executor": "@nx/vite:test",
      "options": {
        "config": "packages/szerviz-munkalap/vite.config.ts"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["packages/szerviz-munkalap/**/*.ts"]
      }
    }
  }
}
```

### Affected Build

```bash
# Csak a változott modulokat buildeli
nx affected --target=build --base=main

# Példa: Ha @kgc/keszlet változott
# Automatikusan rebuild: @kgc/munkalap, @kgc/berles, @kgc/bevetelezes, stb.

# Dependency graph megjelenítés
nx graph
```

---

## Build és Deploy

### Build Pipeline

```yaml
# .github/workflows/build.yml
name: Build & Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # NX affected-hoz kell

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint affected
        run: pnpm nx affected --target=lint --base=origin/main

      - name: Test affected
        run: pnpm nx affected --target=test --base=origin/main

      - name: Build affected
        run: pnpm nx affected --target=build --base=origin/main

      - name: Build Apps (ha package változott)
        run: |
          pnpm nx build api
          pnpm nx build web
```

### Docker Build (Multi-stage)

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Dependency install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile

# Build
COPY . .
RUN pnpm nx build api --prod
RUN pnpm nx build web --prod

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist/apps/api ./api
COPY --from=builder /app/dist/apps/web ./web
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "api/main.js"]
```

---

## Példa Implementációk

### 1. Modul Export (Public API)

```typescript
// packages/szerviz-munkalap/src/index.ts

// Entitások
export { Munkalap, MunkalapStatusz } from './munkalap.entity';
export { MunkalapTetel } from './munkalap-tetel.entity';

// Szolgáltatások
export { MunkalapService } from './munkalap.service';

// DTO-k
export { CreateMunkalapDto, UpdateMunkalapDto } from './dto';

// Controller (NestJS modul használja)
export { MunkalapController } from './munkalap.controller';

// NestJS Module
export { MunkalapModule } from './munkalap.module';

// Események
export { MunkalapEvents } from './events';
```

### 2. Service Implementáció

```typescript
// packages/szerviz-munkalap/src/munkalap.service.ts

import { Injectable, Inject, Optional } from '@nestjs/common';
import { PartnerService } from '@kgc/partner';
import { CikkService } from '@kgc/cikk';
import { KeszletService } from '@kgc/keszlet';
import { SzamlaService } from '@kgc/szamla';  // Opcionális
import { BergepSzervizIntegration } from '@kgc/bergep-szerviz-integration';  // Opcionális
import { Munkalap, MunkalapStatusz } from './munkalap.entity';
import { MunkalapRepository } from './munkalap.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class MunkalapService {
  constructor(
    private readonly repository: MunkalapRepository,
    private readonly partnerService: PartnerService,
    private readonly cikkService: CikkService,
    private readonly keszletService: KeszletService,
    private readonly eventEmitter: EventEmitter2,

    // Opcionális függőségek
    @Optional() @Inject(SzamlaService)
    private readonly szamlaService?: SzamlaService,

    @Optional() @Inject(BergepSzervizIntegration)
    private readonly bergepIntegration?: BergepSzervizIntegration,
  ) {}

  async create(dto: CreateMunkalapDto, tenantId: string): Promise<Munkalap> {
    // Partner ellenőrzés
    const partner = await this.partnerService.findById(dto.partnerId, tenantId);
    if (!partner) {
      throw new NotFoundException('Partner nem található');
    }

    // Munkalap létrehozás
    const munkalap = await this.repository.create({
      ...dto,
      tenantId,
      statusz: MunkalapStatusz.FELVEVE,
      munkalapSzam: await this.generateMunkalapSzam(tenantId),
    });

    // Event kibocsátás
    this.eventEmitter.emit('munkalap.created', {
      munkalapId: munkalap.id,
      tenantId,
    });

    return munkalap;
  }

  async addTetel(munkalapId: string, tetelDto: AddTetelDto): Promise<MunkalapTetel> {
    const munkalap = await this.repository.findById(munkalapId);

    // Cikk ellenőrzés
    const cikk = await this.cikkService.findById(tetelDto.cikkId);
    if (!cikk) {
      throw new NotFoundException('Cikk nem található');
    }

    // Készlet foglalás (ha alkatrész)
    if (cikk.alkatresz) {
      await this.keszletService.reserve({
        cikkId: cikk.id,
        mennyiseg: tetelDto.mennyiseg,
        forModule: 'munkalap',
        forId: munkalapId,
      });
    }

    return this.repository.addTetel(munkalapId, tetelDto);
  }

  async close(munkalapId: string): Promise<Munkalap> {
    const munkalap = await this.repository.findById(munkalapId);
    const tetelek = await this.repository.getTetelek(munkalapId);

    // Készlet véglegesítés
    for (const tetel of tetelek) {
      if (tetel.cikk.alkatresz) {
        await this.keszletService.confirmReservation(tetel.reservationId);
      }
    }

    // Bérgép szerviz költség tracking (ha van integráció)
    if (this.bergepIntegration && munkalap.bergepId) {
      await this.bergepIntegration.trackSzervizKoltseg({
        bergepId: munkalap.bergepId,
        munkalapId: munkalap.id,
        koltseg: this.calculateKoltseg(tetelek),
      });
    }

    // Státusz frissítés
    const updated = await this.repository.updateStatusz(
      munkalapId,
      MunkalapStatusz.SZAMLAZANDO
    );

    // Event kibocsátás
    this.eventEmitter.emit('munkalap.closed', {
      munkalapId: munkalap.id,
      tenantId: munkalap.tenantId,
    });

    return updated;
  }

  async generateSzamla(munkalapId: string): Promise<Szamla | null> {
    // Ha nincs számla modul, return null
    if (!this.szamlaService) {
      return null;
    }

    const munkalap = await this.repository.findById(munkalapId);

    if (munkalap.statusz !== MunkalapStatusz.SZAMLAZANDO) {
      throw new BadRequestException('Csak számlázandó státuszú munkalap számlázható');
    }

    return this.szamlaService.create({
      partnerId: munkalap.partnerId,
      forrasModul: 'munkalap',
      forrasId: munkalapId,
      tetelek: await this.repository.getTetelek(munkalapId),
    });
  }
}
```

### 3. Frontend Komponens Lazy Loading

```typescript
// apps/web/src/pages/szerviz/index.tsx

import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useFeatureFlag } from '@kgc/ui';
import { Loading } from '@kgc/ui';

// Lazy loaded komponensek
const MunkalapList = lazy(() => import('@kgc/munkalap/components').then(m => ({ default: m.MunkalapList })));
const MunkalapForm = lazy(() => import('@kgc/munkalap/components').then(m => ({ default: m.MunkalapForm })));
const GaranciaList = lazy(() => import('@kgc/garancia/components').then(m => ({ default: m.GaranciaList })));

export function SzervizRoutes() {
  const munkalapEnabled = useFeatureFlag('munkalap');
  const garanciaEnabled = useFeatureFlag('garancia');

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {munkalapEnabled && (
          <>
            <Route path="/munkalap" element={<MunkalapList />} />
            <Route path="/munkalap/new" element={<MunkalapForm />} />
            <Route path="/munkalap/:id" element={<MunkalapForm />} />
          </>
        )}

        {garanciaEnabled && (
          <Route path="/garancia" element={<GaranciaList />} />
        )}

        {/* Ha semmi nem elérhető */}
        {!munkalapEnabled && !garanciaEnabled && (
          <Route path="*" element={<div>Nincs elérhető szerviz modul</div>} />
        )}
      </Routes>
    </Suspense>
  );
}
```

### 4. Event-alapú Integráció

```typescript
// packages/integration-bergep-szerviz/src/bergep-to-munkalap.ts

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MunkalapService } from '@kgc/munkalap';
import { BergepService } from '@kgc/bergep';

@Injectable()
export class BergepToMunkalapHandler {
  constructor(
    private readonly munkalapService: MunkalapService,
    private readonly bergepService: BergepService,
  ) {}

  @OnEvent('bergep.status.changed')
  async handleBergepStatusChange(event: {
    bergepId: string;
    oldStatus: string;
    newStatus: string;
    tenantId: string;
  }) {
    // Ha bérgép szervizbe került, automatikus munkalap
    if (event.newStatus === 'szerviz') {
      const bergep = await this.bergepService.findById(event.bergepId);

      await this.munkalapService.create({
        partnerId: null,  // Belső szerviz
        gepTipus: bergep.megnevezes,
        gepAzonosito: bergep.kod,
        bergepId: bergep.id,
        problemLeiras: 'Bérgép szerviz',
      }, event.tenantId);
    }
  }
}
```

---

## Migrációs Terv (A → C)

Ha A opcióból indulsz és később C-re migrálsz:

### Fázis 1: Előkészítés (2-4 hét)

1. **Monorepo setup** - NX/Turborepo bevezetés
2. **Package határok** - Kód szétválasztás logikai egységekre
3. **Dependency audit** - Cirkuláris függőségek feloldása

### Fázis 2: Core kiemelés (2-3 hét)

1. **Core packages létrehozása** - auth, users, tenant, config, ui
2. **Import útvonalak átírása** - `@kgc/auth` format
3. **Tesztek migrálása**

### Fázis 3: Shared layer (2-3 hét)

1. **partner, cikk, keszlet, szamla, nav** kiemelése
2. **API interface-ek** definiálása
3. **Backward compatibility** fenntartása

### Fázis 4: Domain modulok (4-6 hét)

1. **Szerviz modulok** - munkalap, arajanlat, garancia, norma
2. **Bérlés modulok** - bergep, berles, szerzodes, kaucio
3. **Áruház modulok** - bevetelezes, eladas, arres, leltar

### Fázis 5: Integrációk és feature flags (2-3 hét)

1. **Integration modulok** létrehozása
2. **Feature flag rendszer** bevezetése
3. **Licenc csomagok** definiálása

---

## Összefoglalás

| Szempont | Részlet |
|----------|---------|
| **Összes modul** | 25 db |
| **Layer-ek** | 5 (Core, Shared, Szerviz, Bérlés, Áruház, Integráció) |
| **Feature flags** | 20+ |
| **Licenc csomagok** | 7+ (alap + egyedi) |
| **Becsült setup idő** | 3-4 hét |
| **Becsült migráció (A→C)** | 12-18 hét |

---

*Dokumentum verzió: 1.0*
*Készült: 2025-12-10*
*Szerző: Winston (Architect)*
