# KGC ERP v3.0 - Projekt Kontextus

> **BMAD Ügynökök**: Ez a dokumentum tartalmazza a projekt összes kritikus információját.
> Olvasd el alaposan mielőtt bármilyen feladatot végrehajtasz!

---

## 1. Projekt Áttekintés

| Tulajdonság | Érték |
|-------------|-------|
| **Projekt név** | KGC ERP v3.0 |
| **Cég** | Kisgépcentrum Kft. |
| **Domain** | Kiskereskedelem / Bérlés / Szerviz / Értékesítés |
| **Aktuális fázis** | BMAD Fázis 4 - Implementáció kezdete |
| **Nyelv** | Magyar (dokumentáció és kommunikáció) |
| **User** | Javo! |

### Üzleti Leírás

A KGC ERP egy **franchise hálózatot** támogató ERP rendszer, amely kezeli:

- **Bérlés**: Kisgépek (fúrók, fűnyírók, stb.) kiadása, kaució kezelés MyPOS-on keresztül
- **Szerviz**: Munkalapok, garanciális javítások (Makita norma alapján)
- **Értékesítés**: POS, NAV Online számlázás (Számlázz.hu API)
- **Árajánlat**: Kalkuláció, konverzió követés

### Célcsoportok

| Szerepkör | Leírás |
|-----------|--------|
| **Tulajdonos** | Franchise központ, teljes hozzáférés |
| **Boltvezető** | Üzlet szintű menedzsment |
| **Eladó** | Napi operatív feladatok |
| **Szervizes** | Munkalap kezelés, javítások |
| **Ügyfél** | Self-service portál (jövőbeli) |

---

## 2. Dokumentum Hierarchia

### Kritikus Dokumentumok (KÖTELEZŐ olvasni)

| Dokumentum | Elérhetőség | Tartalom |
|------------|-------------|----------|
| **PRD** | `planning-artifacts/prd.md` | Teljes követelményrendszer, FR/NFR-ek |
| **Architektúra** | `planning-artifacts/architecture.md` | Rendszer architektúra összefoglaló |
| **ADR-ek** | `planning-artifacts/adr/ADR-*.md` | 43 architektúra döntés |
| **UX Design** | `planning-artifacts/ux-design-specification.md` | UI/UX specifikáció |
| **Epic Lista** | `planning-artifacts/epics/kgc3-epic-list.md` | 29 epic áttekintés |

### Fejlesztési Dokumentumok

| Dokumentum | Elérhetőség | Tartalom |
|------------|-------------|----------|
| **Fejlesztési Alapelvek** | `docs/kgc3-development-principles.md` | TDD/ATDD hibrid módszertan |
| **CI/CD Pipeline** | `docs/ci-cd-pipeline.md` | GitHub Actions, E2E tesztek |
| **Projekt Kontextus** | `docs/project-context.md` | Ez a dokumentum |

### BMAD Konfiguráció

| Fájl | Tartalom |
|------|----------|
| `_bmad/bmm/config.yaml` | BMAD modul beállítások |
| `CLAUDE.md` | Claude Code projekt kontextus |

---

## 3. Technikai Stack

### Backend

| Komponens | Technológia |
|-----------|-------------|
| **Framework** | NestJS |
| **Adatbázis** | PostgreSQL 16 + Prisma ORM |
| **Cache** | Redis 7 |
| **API** | REST + tRPC (belső) |
| **Auth** | JWT + Session (hibrid) |

### Frontend

| Komponens | Technológia |
|-----------|-------------|
| **Framework** | Next.js 14 (App Router) |
| **UI Library** | shadcn/ui + Tailwind CSS |
| **State** | Zustand + TanStack Query |
| **PWA** | Workbox (offline-first) |

### Infrastruktúra

| Komponens | Technológia |
|-----------|-------------|
| **Monorepo** | Turbo + pnpm |
| **CI/CD** | GitHub Actions |
| **Container** | Docker |
| **Orchestration** | Kubernetes (jövőbeli) |

---

## 4. Monorepo Struktúra (ADR-010)

```
KGC-3/
├── apps/
│   ├── kgc-web/          # Next.js PWA frontend
│   ├── kgc-admin/        # Admin dashboard
│   └── kgc-api/          # NestJS API
│
├── packages/
│   ├── core/             # 5 package
│   │   ├── auth/         # @kgc/auth - Autentikáció, RBAC
│   │   ├── tenant/       # @kgc/tenant - Multi-tenancy, RLS
│   │   ├── audit/        # @kgc/audit - Audit trail
│   │   ├── config/       # @kgc/config - Konfiguráció
│   │   └── common/       # @kgc/common - Közös utilities
│   │
│   ├── shared/           # 5 package
│   │   ├── ui/           # @kgc/ui - UI komponensek (shadcn)
│   │   ├── utils/        # @kgc/utils - Segédfüggvények
│   │   ├── types/        # @kgc/types - TypeScript típusok
│   │   ├── i18n/         # @kgc/i18n - Lokalizáció
│   │   └── testing/      # @kgc/testing - Test utilities
│   │
│   ├── berles/           # 4 package - BÉRLÉS DOMAIN
│   │   ├── rental-core/
│   │   ├── rental-checkout/
│   │   ├── rental-contract/
│   │   └── rental-inventory/
│   │
│   ├── szerviz/          # 4 package - SZERVIZ DOMAIN
│   │   ├── service-core/
│   │   ├── service-worksheet/
│   │   ├── service-warranty/
│   │   └── service-parts/
│   │
│   ├── aruhaz/           # 4 package - ÁRUHÁZ DOMAIN
│   │   ├── sales-core/
│   │   ├── sales-pos/
│   │   ├── sales-invoice/
│   │   └── sales-quote/
│   │
│   └── integration/      # 7 package - INTEGRÁCIÓK
│       ├── nav-online/
│       ├── mypos/
│       ├── szamlazz-hu/
│       ├── twenty-crm/
│       ├── chatwoot/
│       ├── horilla-hr/
│       └── email-gateway/
│
├── e2e/                  # Playwright E2E tesztek
├── infra/                # Docker, K8s, Terraform
└── tools/                # Fejlesztői eszközök
```

### Függőségi Szabályok

```
apps/ → packages/*                    ✅
packages/shared/ → packages/core/     ✅
packages/[domain]/ → shared/ + core/  ✅
packages/integration/ → packages/*    ✅
packages/[domain]/ → [domain]/        ❌ TILOS!
```

**Körkörös függőség TILOS!** Domain package-ek között: event/interface használata.

---

## 5. Kritikus ADR-ek

> **FONTOS**: Architektúra döntés előtt MINDIG olvasd el a releváns ADR-t!

### Alapvető Architektúra

| ADR | Téma | Összefoglaló |
|-----|------|--------------|
| **ADR-001** | Multi-tenancy | Franchise-onként tenant, PostgreSQL RLS |
| **ADR-002** | Offline-first | PWA, Service Worker, papír backup |
| **ADR-010** | Micro-modules | 25 package, 6 réteg (Struktúra B) |
| **ADR-014** | Moduláris arch. | Végleges döntés a moduláris felépítésről |

### Integrációk

| ADR | Téma | Összefoglaló |
|-----|------|--------------|
| **ADR-005** | MyPOS | Kaució token kezelés, pre-auth |
| **ADR-015** | CRM + Support | Twenty CRM + Chatwoot fork |
| **ADR-030** | NAV Online | Számlázz.hu API, M2M adatszolgáltatás |

### Üzleti Logika

| ADR | Téma | Összefoglaló |
|-----|------|--------------|
| **ADR-006** | Bérlés audit | Teljes audit trail bérlésekhez |
| **ADR-031** | Késedelmi díj | Kalkulációs szabályok |
| **ADR-037** | Bérlési díj | Díjszámítás algoritmus |

### Tesztelés

| ADR | Téma | Összefoglaló |
|-----|------|--------------|
| **ADR-024** | Test stratégia | TDD/ATDD hibrid megközelítés |

---

## 6. BMAD Workflow-k

### Státusz Ellenőrzés

```bash
/bmad:bmm:workflows:workflow-status   # Aktuális fázis
/bmad:bmm:workflows:sprint-status     # Sprint állapot
```

### Implementáció (Fázis 4)

```bash
/bmad:bmm:workflows:sprint-planning   # Sprint tervezés
/bmad:bmm:workflows:create-story      # Story készítés + ready-for-dev
/bmad:bmm:workflows:dev-story         # Story implementálás
/bmad:bmm:workflows:code-review       # Adversarial review (3-10 issue!)
/bmad:bmm:workflows:story-done        # Story lezárás
/bmad:bmm:workflows:retrospective     # Epic retrospektív
```

### Tesztelés (TEA ügynök)

```bash
/bmad:bmm:workflows:testarch-atdd      # ATDD teszt generálás
/bmad:bmm:workflows:testarch-framework # Test framework setup
/bmad:bmm:workflows:testarch-automate  # Automatizált tesztek bővítése
```

### Story Életciklus

```
backlog → drafted → ready-for-dev → in-progress → review → done
```

---

## 7. Fejlesztési Alapelvek

> **📖 RÉSZLETES DOKUMENTUM**: `docs/kgc3-development-principles.md` (1150+ sor)

### TDD Döntési Mátrix

**TDD Pontszám Rendszer** - számold ki minden új feature-nél:

| Faktor | Pont | Példa |
|--------|------|-------|
| Pénzügyi művelet | +3 | Számla, kaució, díjszámítás |
| Biztonsági kritikus | +3 | Auth, RBAC, audit |
| Komplex üzleti szabály | +2 | Garancia, kedvezmények |
| State machine | +2 | Munkalap státusz, bérlés lifecycle |
| UI komponens | -2 | Form, táblázat, modal |
| CRUD művelet | -1 | Partner létrehozás, lista |

**Értékelés**: 5+ = TDD KÖTELEZŐ | 3-4 = TDD AJÁNLOTT | <3 = TRADICIONÁLIS

### TDD/ATDD Hibrid (ADR-024)

| Módszer | Mikor | Tool | Coverage cél |
|---------|-------|------|--------------|
| **TDD** | Üzleti logika, számítások | Vitest | 80-95% |
| **ATDD** | User story-k, kritikus flow-k | Playwright + Gherkin | Story szint |
| **Contract** | Plugin API határok | Pact | API boundaries |
| **Property-Based** | Pénzügyi edge case-ek | fast-check | Auto-discovery |
| **Visual Regression** | UI komponensek | Chromatic | @kgc/ui |
| **Mutation** | Teszt minőség | Stryker | TDD modulok |

### TDD Célok Package-enként

| Package | TDD % | Line Coverage |
|---------|-------|---------------|
| @kgc/auth, @kgc/tenant | **90%** | 90%+ |
| @kgc/rental-*, @kgc/service-* | **80%** | 85%+ |
| @kgc/sales-invoice | **95%** | 95%+ (NAV!) |
| @kgc/ui | 70% | 80%+ |

### ATDD Kötelező User Journey-k (P0)

| Flow | Epic | Leírás |
|------|------|--------|
| Bérlés indítás | Epic-3 | Checkout wizard + kaució |
| Bérlés visszavétel | Epic-3 | Díjszámítás + kaució visszaadás |
| Munkalap lifecycle | Epic-4 | Státusz átmenetek + számlázás |
| Pénztár / Eladás | Epic-5 | NAV számla kiállítás |
| Login + RBAC | Epic-1 | Jogosultság ellenőrzés |

### Code Review Szabályok

**Adversarial megközelítés**: Minden review-nak minimum **3-10 konkrét problémát** kell találnia:
- Kód minőség
- Test coverage
- Architektúra compliance (ADR betartás!)
- Biztonság
- Teljesítmény

---

## 8. CI/CD Pipeline

### PR Pipeline (~3 perc)

```
PR nyitás → lint → typecheck → affected tests → build check
```

### Main Merge Pipeline (~15 perc)

```
Merge → full tests → E2E (Playwright) → deploy staging
```

### Kritikus E2E Tesztek (P0)

| Teszt | Flow |
|-------|------|
| `auth.e2e.ts` | Bejelentkezés, jogosultság |
| `rental-checkout.e2e.ts` | Teljes bérlési folyamat + kaució |
| `nav-invoice.e2e.ts` | NAV számlázás + sztornó |

### Pre-commit Hooks

- **lint-staged**: ESLint + Prettier
- **TypeScript check**: Típus ellenőrzés
- **commit-msg**: Conventional commits (`feat(rental): add checkout`)

---

## 9. Gyakori Parancsok

```bash
# Fejlesztés
pnpm install              # Függőségek
pnpm dev                  # Dev server
pnpm build                # Build

# Tesztek
pnpm test                 # Unit tesztek
pnpm test:e2e             # E2E tesztek
pnpm test:coverage        # Coverage

# Minőség
pnpm lint                 # Linting
pnpm typecheck            # TypeScript
pnpm format               # Prettier

# Package-specifikus
pnpm --filter @kgc/auth test
pnpm --filter @kgc/rental-core build
```

---

## 10. Ellenőrző Lista Feladat Előtt

Mielőtt bármilyen feladatot végrehajtasz, ellenőrizd:

- [ ] Elolvastad a releváns ADR-t?
- [ ] Ismered a package függőségi szabályokat?
- [ ] Tudod melyik domain-hez tartozik a feladat?
- [ ] Van story/epic hozzárendelve?
- [ ] Ismered a TDD/ATDD követelményeket a package-hez?
- [ ] A kód követi a TypeScript strict szabályokat?

---

## 11. Kapcsolattartás

- **User**: Javo!
- **Kommunikáció nyelve**: Magyar
- **Dokumentumok nyelve**: Magyar

---

_Utolsó frissítés: 2026-01-15_
