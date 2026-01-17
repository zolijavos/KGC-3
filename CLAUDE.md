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

**KGC ERP v7.0** - Kisgépcentrum ERP/Értékesítés-kezelő rendszer franchise hálózat támogatással és white label értékesítési modellel.

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

## Projekt Struktúra (ADR-010 + ADR-014)

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
│   ├── epics/               # Epic definíciók
│   └── adr/                 # 43 Architecture Decision Record
│
├── implementation-artifacts/ # BMAD Fázis 4 OUTPUT
│   ├── sprint-status.yaml   # Sprint állapot
│   ├── stories/             # Implementált story-k
│   └── reviews/             # Dual-AI code review-k (epic mappákban)
│
├── docs/                    # Projekt tudásbázis
│   ├── project-context.md   # AI agent context (kritikus szabályok)
│   └── kgc3-development-principles.md  # TDD/ATDD módszertan
│
├── apps/                    # Alkalmazások
│   ├── kgc-web/            # Next.js PWA frontend (Vite)
│   ├── kgc-admin/          # Admin dashboard
│   └── kgc-api/            # NestJS API
│
├── packages/                # Monorepo packages (ANGOL NEVEK!)
│   ├── core/               # Core layer
│   │   ├── auth/           # @kgc/auth
│   │   ├── tenant/         # @kgc/tenant
│   │   ├── audit/          # @kgc/audit
│   │   ├── config/         # @kgc/config
│   │   └── common/         # @kgc/common
│   │
│   ├── shared/             # Shared layer
│   │   ├── ui/             # @kgc/ui (shadcn/ui)
│   │   ├── utils/          # @kgc/utils
│   │   ├── types/          # @kgc/types
│   │   ├── i18n/           # @kgc/i18n
│   │   ├── testing/        # @kgc/testing
│   │   └── inventory/      # @kgc/inventory ← KÖZÖS KÉSZLET
│   │
│   ├── berles/             # Bérlés domain
│   │   ├── rental-core/    # @kgc/rental-core
│   │   ├── rental-checkout/# @kgc/rental-checkout
│   │   └── rental-contract/# @kgc/rental-contract
│   │
│   ├── szerviz/            # Szerviz domain
│   │   ├── service-core/   # @kgc/service-core
│   │   ├── service-worksheet/ # @kgc/service-worksheet
│   │   ├── service-warranty/  # @kgc/service-warranty
│   │   └── service-parts/  # @kgc/service-parts
│   │
│   ├── aruhaz/             # Értékesítés domain
│   │   ├── sales-core/     # @kgc/sales-core
│   │   ├── sales-pos/      # @kgc/sales-pos
│   │   ├── sales-invoice/  # @kgc/sales-invoice
│   │   └── sales-quote/    # @kgc/sales-quote
│   │
│   └── integration/        # Külső integrációk
│       ├── nav-online/     # @kgc/nav-online
│       ├── mypos/          # @kgc/mypos
│       ├── szamlazz-hu/    # @kgc/szamlazz-hu
│       ├── twenty-crm/     # @kgc/twenty-crm
│       ├── chatwoot/       # @kgc/chatwoot
│       └── horilla-hr/     # @kgc/horilla-hr
│
├── infra/                  # Infrastruktúra
│   ├── docker/
│   └── k8s/
│
└── tools/                  # Fejlesztői eszközök
```

## Fejlesztési Módszertan

**Részletes dokumentáció**: [docs/kgc3-development-principles.md](docs/kgc3-development-principles.md)

### TDD/ATDD Hibrid Stratégia (Összefoglaló)

**TDD KÖTELEZŐ (Red-Green-Refactor):**
- Pénzügyi számítások (késedelmi díj, ÁFA, árrés)
- Auth/RBAC logika
- State machine átmenetek (munkalap, bérlés)
- Validációk (adószám, IBAN)

**ATDD KÖTELEZŐ (Gherkin + Playwright):**
- Kritikus user journey-k: bérlés indítás, pénztár, munkalap

**Teszt fájl elnevezés:**
```
*.spec.ts     # Unit tesztek (Vitest)
*.e2e.ts      # E2E tesztek (Playwright)
*.feature     # Gherkin ATDD tesztek
```

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

## Dual-AI Adversarial Code Review

**Claude Code + Gemini CLI** együttműködése code review-kra. Lásd: `implementation-artifacts/reviews/README.md`

### Folyamat

```
Round 1: FÜGGETLEN review (Claude + Gemini párhuzamosan, nem olvassák egymást)
Round 2: Kereszt-analízis (elemzik egymás findings-ait + új review)
Round 3: Consensus vagy eszkaláció
```

### Használat

```bash
# 1. Review fájl létrehozás
cd implementation-artifacts/reviews
./create-review.sh 1-2-token-refresh packages/core/auth/src/services/*.ts

# 2. Claude review indítás
Read and follow _bmad/bmm/prompts/code-review-claude.md
to review implementation-artifacts/reviews/epic-1/1-2-token-refresh-review.md

# 3. Gemini review indítás (külön terminál)
gemini "Read and follow _bmad/bmm/prompts/code-review-gemini.md to review implementation-artifacts/reviews/epic-1/1-2-token-refresh-review.md"
```

### Szabályok

- **Round 1 FÜGGETLEN** - egyik AI sem olvassa a másik szekcióját
- **Minimum 3 issue** - per reviewer (BMAD adversarial követelmény)
- **Max 3 round** - utána eszkaláció user-nek
- **Development principles** - mindkét AI hivatkozik a projekt szabályaira

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
pnpm --filter @kgc/rental-core build      # Egy package build
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
// Fontos strict opciók - MINDIG tartsd be!
"strict": true,
"noUncheckedIndexedAccess": true,      // Array/object index ellenőrzés
"exactOptionalPropertyTypes": true,     // Pontos optional kezelés
"noUnusedLocals": true,
"noUnusedParameters": true

// Helyes használat:
const items: string[] = [];
const first = items[0];  // first: string | undefined ✅
// Használj: items[0] ?? 'default'
```

**Package aliasok** - minden package `@kgc/*` scope alatt (ANGOL nevek):
- Core: `@kgc/auth`, `@kgc/tenant`, `@kgc/audit`, `@kgc/config`, `@kgc/common`
- Shared: `@kgc/ui`, `@kgc/utils`, `@kgc/types`, `@kgc/i18n`, `@kgc/testing`, `@kgc/inventory`
- Bérlés: `@kgc/rental-core`, `@kgc/rental-checkout`, `@kgc/rental-contract`
- Szerviz: `@kgc/service-core`, `@kgc/service-worksheet`, `@kgc/service-warranty`, `@kgc/service-parts`
- Értékesítés: `@kgc/sales-core`, `@kgc/sales-pos`, `@kgc/sales-invoice`, `@kgc/sales-quote`
- Integráció: `@kgc/nav-online`, `@kgc/mypos`, `@kgc/szamlazz-hu`, `@kgc/twenty-crm`, `@kgc/chatwoot`, `@kgc/horilla-hr`

## Monorepo Függőségi Szabályok

```
apps/ → packages/*                    ✅ Alkalmazások használhatják a package-eket
packages/shared/ → packages/core/     ✅ Shared réteg core-ra épül
packages/[domain]/ → shared + core    ✅ Domain függ shared+core-tól
packages/integration/ → packages/*    ✅ Integration minden package-et használhat
packages/core/ ↔ packages/core/       ✅ Core package-ek egymást használhatják

packages/berles/ → packages/szerviz/  ❌ TILTOTT! Domain → Domain függőség
packages/core/ → packages/shared/     ❌ TILTOTT! Core nem függhet shared-től
```

**Közös készlet architektúra (ADR-014):**
```
@kgc/rental-*   ──┐
@kgc/service-*  ──┼──► @kgc/inventory (packages/shared/inventory/)
@kgc/sales-*    ──┘
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

## Kritikus Implementációs Szabályok

### Multi-Tenancy (ADR-001)

```typescript
// KÖTELEZŐ: Minden query automatikusan tenant-aware!
// A tenant_id-t NE add hozzá kézzel - Prisma middleware kezeli

// HELYES:
const partners = await prisma.partner.findMany();

// HELYTELEN:
const partners = await prisma.partner.findMany({
  where: { tenantId: currentTenantId } // ❌ Ne csináld!
});
```

**RLS Policy:** PostgreSQL RLS automatikusan szűri: `current_setting('app.current_tenant_id')`

### API Konvenciók

```typescript
// REST endpoint naming
GET    /api/v1/rentals           // Lista
GET    /api/v1/rentals/:id       // Egy elem
POST   /api/v1/rentals           // Létrehozás
PATCH  /api/v1/rentals/:id       // Részleges frissítés
DELETE /api/v1/rentals/:id       // Törlés

// Response format
{
  "data": { ... },               // Siker esetén
  "error": { "code": "...", "message": "..." }  // Hiba esetén
}
```

### Git Commit Konvenciók

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
Scope: package neve (auth, rental-core, stb.)

Példák:
feat(rental-core): add late fee calculation
fix(auth): resolve token refresh race condition
test(sales-invoice): add VAT calculation property tests
```

### Pre-commit Hook

Commit előtt automatikusan fut: `lint-staged` + TypeScript check

## Fejlesztési Irányelvek

1. **BMAD kötelező** - Minden feladat workflow-n keresztül
2. **TDD/ATDD hibrid** - Lásd `docs/kgc3-development-principles.md`
3. **Magyar nyelv** - Dokumentumok és kommunikáció magyarul
4. **ADR változásnál** - Új ADR készítése architektúra döntésekhez
5. **Package határok** - @kgc/* scope, angol nevek, egyértelmű függőségek
6. **Code review** - Adversarial, minimum 3-10 probléma találása
7. **Multi-tenancy** - Soha ne adj kézzel tenant_id-t a query-khez

## Licensz

Belső projekt - KGC Kft.
