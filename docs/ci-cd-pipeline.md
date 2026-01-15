# KGC ERP v3.0 - CI/CD Pipeline

## Áttekintés

A projekt **Trunk-based development** stratégiát használ automatizált CI/CD pipeline-nal.

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEJLESZTÉSI CIKLUS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Feature branch létrehozás (main-ről)                        │
│     └─► git checkout -b feat/STORY-001-description              │
│                                                                 │
│  2. Fejlesztés + commit                                         │
│     └─► Pre-commit hook: lint, format, typecheck                │
│     └─► Commit message: conventional commits                    │
│                                                                 │
│  3. PR nyitás → CI pipeline (gyors, ~3 perc)                    │
│     └─► Lint + TypeCheck                                        │
│     └─► Unit tesztek (affected packages)                        │
│     └─► Build check                                             │
│                                                                 │
│  4. Code review + Merge to main                                 │
│                                                                 │
│  5. Main merge → Full pipeline (~15 perc)                       │
│     └─► Teljes test suite                                       │
│     └─► E2E tesztek (Playwright)                                │
│     └─► Deploy to staging                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Pre-commit Hooks

Minden commit előtt automatikusan futnak:

| Hook | Mit csinál |
|------|------------|
| **lint-staged** | ESLint + Prettier a változtatott fájlokon |
| **TypeScript check** | Type ellenőrzés |
| **commit-msg** | Conventional commits formátum ellenőrzés |

### Commit Message Formátum

```
type(scope): description

Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
Scope: opcionális, pl. (rental), (auth), (nav)

Példák:
  feat(rental): add checkout wizard
  fix(auth): resolve session timeout
  docs: update installation guide
```

## GitHub Actions Workflow-k

### 1. CI Pipeline (`ci.yml`)

**Trigger**: Pull Request-ek és push main-re

| Job | Leírás | Időtartam |
|-----|--------|-----------|
| `quality` | Lint, TypeCheck, Format check | ~2 perc |
| `test` | Unit + Integration tesztek (affected) | ~5 perc |
| `build` | Build ellenőrzés | ~3 perc |

### 2. Deploy Pipeline (`deploy.yml`)

**Trigger**: Push to main (merge után)

| Job | Leírás | Időtartam |
|-----|--------|-----------|
| `test-full` | Teljes test suite + coverage | ~10 perc |
| `e2e` | Playwright E2E tesztek | ~15 perc |
| `deploy-staging` | Build + Deploy staging-re | ~5 perc |

## E2E Tesztek (Playwright)

### Prioritások

| Prioritás | Könyvtár | Flow-k |
|-----------|----------|--------|
| **P0 - Kritikus** | `e2e/critical/` | Auth, Bérlés checkout, NAV számlázás |
| **P1 - Fontos** | `e2e/important/` | Szerviz munkalap, Kaució kezelés |
| **P2 - Standard** | `e2e/standard/` | Ügyfél regisztráció, Termék keresés |
| **Mobile** | `e2e/mobile/` | PWA specifikus tesztek |

### Futtatás

```bash
# Összes E2E teszt
pnpm test:e2e

# Csak kritikus tesztek
pnpm test:e2e --project=critical

# UI módban (debug)
pnpm test:e2e:ui

# Report megtekintése
pnpm test:e2e:report
```

## Secrets és Környezeti Változók

### GitHub Secrets (szükséges)

| Secret | Leírás |
|--------|--------|
| `CODECOV_TOKEN` | Codecov coverage upload |
| `TURBO_TOKEN` | Turbo Remote Cache (opcionális) |

### GitHub Variables

| Variable | Leírás |
|----------|--------|
| `TURBO_TEAM` | Turbo team name (opcionális) |

## Lokális Fejlesztés

### Setup

```bash
# Repository klónozás
git clone https://github.com/kisgepcentrum/kgc-erp.git
cd kgc-erp

# Függőségek telepítése
pnpm install

# Husky hooks aktiválás (automatikus pnpm install-nál)
pnpm prepare

# Playwright browsers telepítése
pnpm exec playwright install
```

### Gyakori Parancsok

```bash
# Fejlesztés
pnpm dev                    # Dev server indítás
pnpm build                  # Teljes build
pnpm typecheck              # TypeScript ellenőrzés

# Tesztek
pnpm test                   # Unit tesztek
pnpm test:watch             # Watch mode
pnpm test:coverage          # Coverage riport
pnpm test:e2e               # E2E tesztek

# Minőség
pnpm lint                   # Linting
pnpm lint:fix               # Auto-fix
pnpm format                 # Prettier format
```

## BMAD Integráció

A CI/CD pipeline integrálódik a BMAD workflow-kkal:

```
Story életciklus + CI/CD
────────────────────────

/create-story     → Feature branch létrehozás
        ↓
/dev-story        → Fejlesztés + commits
        ↓
git push          → PR nyitás → CI pipeline
        ↓
/code-review      → Adversarial review (3-10 issue)
        ↓
Merge to main     → Full pipeline + Deploy
        ↓
/story-done       → Story lezárás
```

## Troubleshooting

### Pre-commit hook sikertelen

```bash
# Hook bypass (végső esetben)
git commit --no-verify -m "chore: emergency fix"

# Lint fix
pnpm lint:fix

# Format fix
pnpm format
```

### E2E teszt sikertelen

```bash
# Részletes log
pnpm test:e2e --debug

# Egy teszt futtatása
pnpm test:e2e -g "sikeres bejelentkezés"

# Report generálás
pnpm test:e2e:report
```

### CI pipeline sikertelen

1. Ellenőrizd a GitHub Actions logot
2. Lokálisan futtasd: `pnpm lint && pnpm typecheck && pnpm test`
3. Ha E2E hiba: ellenőrizd a Playwright report artifact-ot
