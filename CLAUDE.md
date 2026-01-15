# CLAUDE.md

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
/bmad:bmm:workflows:create-story      # Következő story készítése
/bmad:bmm:workflows:story-ready       # Story ready-for-dev
/bmad:bmm:workflows:dev-story         # Story implementálás
/bmad:bmm:workflows:code-review       # Adversarial review (3-10 hiba!)
/bmad:bmm:workflows:story-done        # Story lezárás
```

### Story Életciklus

`backlog → drafted → ready-for-dev → in-progress → review → done`

## Gyakori Parancsok

```bash
# Fejlesztés
pnpm install                  # Függőségek telepítése
pnpm dev                      # Fejlesztői szerver
pnpm build                    # Build
pnpm test                     # Tesztek futtatása
pnpm test:coverage            # Coverage report
pnpm lint                     # Linting
pnpm typecheck                # TypeScript ellenőrzés

# Adatbázis
pnpm db:generate              # Prisma generate
pnpm db:migrate               # Migrációk futtatása
pnpm db:studio                # Prisma Studio
```

## Fontos ADR-ek

Architektúra döntéseket érintő változtatás előtt olvasd el a releváns ADR-t!

| ADR | Téma |
|-----|------|
| ADR-001 | Franchise multi-tenancy |
| ADR-002 | Deployment és offline stratégia (PWA, papír backup) |
| ADR-003 | White label értékesítési stratégia |
| ADR-010 | **Micro-modules architektúra (Struktúra B)** |
| ADR-014 | Moduláris architektúra végleges döntés |
| ADR-015 | CRM/Support integráció (Twenty + Chatwoot) |
| ADR-024 | Hybrid test stratégia |

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
