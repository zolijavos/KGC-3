# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

Ez a fájl útmutatást ad a Claude Code (claude.ai/code) számára a repository kódjával való munkához.

## KRITIKUS SZABÁLY - MINDIG BMAD MÓDSZERREL DOLGOZZ

**KÖTELEZŐ**: Minden fejlesztési feladathoz BMAD ügynököket és BMAD workflow-kat használj! Soha ne dolgozz a BMAD keretrendszeren kívül.

- **Nyelv**: Magyar - minden kommunikáció és dokumentum magyarul készüljön
- **Módszer**: Mindig a megfelelő BMAD workflow-t indítsd el a `/bmad:bmm:workflows:*` parancsokkal
- **Code review MINDIG adversarial**: minimum 3-10 konkrét problémát kell találnia

## Projekt Státusz

**Aktuális fázis**: BMAD Fázis 4 - Implementáció (Sprint Planning)
**Megjegyzés**: A PRD, Architektúra és Epics dokumentumok készen vannak. Az implementáció most kezdődik.

## Projekt Áttekintés

**KGC ERP v3.0** - Kisgépcentrum ERP/Értékesítés-kezelő rendszer franchise hálózat támogatással és white label értékesítési modellel.

| Jellemző | Érték |
|----------|-------|
| **Domain** | Kiskereskedelem / Bérleti rendszer / Szerviz menedzsment |
| **Komplexitás** | Magas (multi-tenant, offline-first PWA, NAV integráció) |
| **Track** | BMad Method Level 2-3 |
| **Stack** | NestJS + PostgreSQL + Next.js PWA |
| **Architektúra** | ADR-010 Micro-modules (Struktúra B) - 25 package |

### Üzleti Domének

- **Bérlés**: Bérgép kiadás, kaució kezelés (MyPos), hosszú távú szerződések
- **Eladás**: Termék értékesítés, NAV Online számlázás (Számlázz.hu API)
- **Szerviz**: Munkalap kezelés, garanciális javítás (Makita norma)
- **Árajánlat**: Árkalkuláció, konverzió követés
- **Pénzügy**: Havi zárás, ÁFA, cégszerződéses elszámolás

### Integrációs Stratégia (7 Rendszer)

Hibrid architektúra: iframe + API + forráskód módosítás

1. **Twenty CRM** (fork) - Ügyfélkapcsolat kezelés
2. **Chatwoot** (fork) - Ügyfélszolgálat, support ticket
3. **Horilla HR** (fork) - Humánerőforrás menedzsment
4. **Custom Chat** (egyedi) - Belső kommunikáció
5. **KGC Finance + Számlázz.hu** - Pénzügy, NAV Online számla
6. **MyPOS** - Kártyás fizetés, kaució kezelés
7. **Plane.so** - Projektmenedzsment (opcionális)

## Projekt Struktúra (ADR-010 Struktúra B)

```
KGC-3/
├── _bmad/                    # BMAD keretrendszer
│   ├── core/                 # Keretrendszer alap, config.yaml
│   ├── bmm/                  # BMad Method Modul
│   ├── bmb/                  # BMad Builder
│   └── cis/                  # Creative Intelligence Suite
│
├── planning-artifacts/       # BMAD Fázis 1-3 OUTPUT
│   ├── prd.md               # Product Requirements Document
│   ├── architecture.md       # Architektúra összefoglaló
│   ├── ux-design-specification.md
│   ├── ui-style-guide-v1.md
│   ├── epics/               # Epic definíciók
│   └── adr/                 # 43 Architecture Decision Record
│
├── implementation-artifacts/ # BMAD Fázis 4 OUTPUT
│   ├── sprint-status.yaml   # Sprint állapot
│   └── stories/             # Implementált story-k
│
├── docs/                    # Projekt tudásbázis
│   ├── kgc3-development-principles.md  # TDD/ATDD hibrid módszertan
│   ├── features/            # Feature dokumentációk
│   └── diagrams/            # Technikai diagramok
│
├── apps/                    # Alkalmazások
│   ├── kgc-web/            # Next.js PWA frontend
│   ├── kgc-admin/          # Admin dashboard
│   └── kgc-api/            # NestJS API
│
├── packages/
│   ├── core/               # 5 package: auth, tenant, audit, config, common
│   ├── shared/             # 5 package: ui, utils, types, i18n, testing
│   ├── berles/             # 4 package: rental-core/checkout/contract/inventory
│   ├── szerviz/            # 4 package: service-core/worksheet/warranty/parts
│   ├── aruhaz/             # 4 package: sales-core/pos/invoice/quote
│   └── integration/        # 7 package: nav-online, mypos, szamlazz-hu, etc.
│
├── infra/                  # Infrastruktúra konfigurációk
│   ├── docker/
│   ├── k8s/
│   └── terraform/
│
└── tools/                  # Fejlesztői eszközök
```

## Fejlesztési Módszertan

**Lásd**: [docs/kgc3-development-principles.md](docs/kgc3-development-principles.md)

### TDD/ATDD Hibrid Stratégia

| Módszer | Mikor |
|---------|-------|
| **TDD** | Core modulok, üzleti logika, pénzügyi számítások |
| **ATDD** | User story-k, UI folyamatok, integrációk |
| **Contract Testing** | Plugin API határok (Pact) |
| **Property-Based** | Pénzügyi kalkulációk (fast-check) |

### TDD Célok Package-enként

- **@kgc/auth, @kgc/tenant**: 90%+ TDD
- **@kgc/rental-*, @kgc/service-***: 80%+ TDD
- **@kgc/sales-invoice**: 95%+ TDD (NAV compliance)
- **@kgc/ui**: 70%+ (Visual Regression + Storybook)

## BMAD Workflow-k

### Leggyakoribb Workflow-k

```bash
# Státusz
/bmad:bmm:workflows:workflow-status   # Aktuális fázis
/bmad:bmm:workflows:sprint-status     # Sprint státusz

# Implementáció (Fázis 4)
/bmad:bmm:workflows:sprint-planning   # Sprint tervezés
/bmad:bmm:workflows:create-story      # Story készítés és ready-for-dev jelölés
/bmad:bmm:workflows:dev-story         # Story implementálás
/bmad:bmm:workflows:code-review       # Adversarial review (3-10 hiba!)
/bmad:bmm:workflows:retrospective     # Epic lezárás után

# Tesztelés
/bmad:bmm:workflows:testarch-atdd     # ATDD teszt generálás
/bmad:bmm:workflows:testarch-framework # Test framework setup
```

### Story Életciklus

`backlog → drafted → ready-for-dev → in-progress → review → done`

## Gyakori Parancsok

```bash
# Fejlesztés
pnpm install                  # Függőségek telepítése
pnpm dev                      # Fejlesztői szerver
pnpm build                    # Build
pnpm lint                     # Linting
pnpm lint:fix                 # Lint javítás
pnpm typecheck                # TypeScript ellenőrzés
pnpm format                   # Prettier formázás
pnpm format:check             # Formázás ellenőrzés

# Tesztelés
pnpm test                     # Összes teszt (Vitest)
pnpm test:watch               # Watch mode
pnpm test:coverage            # Coverage report
pnpm test:e2e                 # E2E tesztek (Playwright)

# Egyedi package futtatás (turbo --filter)
pnpm --filter @kgc/auth test              # Egy package tesztjei
pnpm --filter @kgc/berles build           # Egy package build
pnpm --filter "./packages/core/*" test    # Core layer tesztek

# Adatbázis
pnpm db:generate              # Prisma generate
pnpm db:migrate               # Migrációk futtatása
pnpm db:push                  # Schema push (dev)
pnpm db:studio                # Prisma Studio
```

## TypeScript Konfiguráció

A projekt **strict TypeScript** beállításokat használ (`tsconfig.base.json`):

```typescript
// Fontos strict opciók
"strict": true,
"noUncheckedIndexedAccess": true,      // Array/object index ellenőrzés
"exactOptionalPropertyTypes": true,     // Pontos optional kezelés
"noUnusedLocals": true,
"noUnusedParameters": true
```

**Package aliasok** - minden package `@kgc/*` scope alatt:
- Core: `@kgc/auth`, `@kgc/tenant`, `@kgc/audit`, `@kgc/config`, `@kgc/common`
- Shared: `@kgc/ui`, `@kgc/utils`, `@kgc/types`, `@kgc/i18n`, `@kgc/testing`
- Domain: `@kgc/rental-*`, `@kgc/service-*`, `@kgc/sales-*`
- Integration: `@kgc/nav-online`, `@kgc/mypos`, `@kgc/szamlazz-hu`

## Monorepo Függőségi Szabályok

```
apps/ → packages/*            ✅ Alkalmazások használhatják a package-eket
packages/shared/ → packages/core/   ✅ Shared réteg core-ra épül
packages/[domain]/ → packages/shared/ + core/  ✅ Domain függ shared+core-tól
packages/integration/ → packages/*  ✅ Integration minden package-et használhat
packages/core/ → packages/core/ (belül)  ✅ Core package-ek egymást használhatják
packages/[domain]/ → packages/[domain]/ ❌ Domain package-ek NEM függhetnek egymástól
```

**Körkörös függőség tilos!** Ha domain package-ek közötti kommunikáció kell → event/köztes interface.

## Fontos ADR-ek

Architektúra döntéseket érintő változtatás előtt olvasd el a releváns ADR-t! Összesen **43 ADR** van.

| ADR | Téma | Státusz |
|-----|------|---------|
| ADR-001 | Franchise multi-tenancy + RLS | Elfogadva |
| ADR-002 | Offline-first PWA stratégia | Elfogadva |
| ADR-010 | **Micro-modules (25 package)** | Elfogadva |
| ADR-014 | Moduláris architektúra végleges | Elfogadva |
| ADR-015 | Twenty CRM + Chatwoot integráció | Elfogadva |
| ADR-023 | Composable frontend (shadcn/ui) | Elfogadva |
| ADR-024 | Hybrid TDD/ATDD test stratégia | Elfogadva |
| ADR-030 | NAV Online számlázás API | Elfogadva |
| ADR-032 | RBAC teljes architektúra | Elfogadva |
| ADR-037 | Bérlési díj kalkuláció | Elfogadva |

Teljes lista: [planning-artifacts/adr/](planning-artifacts/adr/)

## BMAD Konfiguráció

- **Fő config**: `_bmad/core/config.yaml`
- **User**: `Javo!`
- **Nyelv**: Hungarian
- **Planning output**: `planning-artifacts/`
- **Implementation output**: `implementation-artifacts/`
- **Project knowledge**: `docs/`

## Fejlesztési Irányelvek

1. **BMAD kötelező** - Minden feladat workflow-n keresztül
2. **TDD/ATDD hibrid** - Lásd development-principles.md
3. **Magyar nyelv** - Dokumentumok és kommunikáció magyarul
4. **ADR változásnál** - Új ADR készítése architektúra döntésekhez
5. **Package határok** - @kgc/* scope, egyértelmű függőségek
6. **Code review** - Adversarial, minimum 3-10 probléma találása

## Licensz

Belső projekt - KGC Kft.
