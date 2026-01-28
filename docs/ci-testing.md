# KGC ERP - CI/CD Testing Guide

Ez a dokumentum leírja a CI/CD tesztelési pipeline működését és használatát.

## Pipeline Áttekintés

### PR Pipeline (test.yml)

Pull Request-eknél fut, gyors feedback-et ad.

```
[Lint] → [Unit Tests] → [E2E Tests (4 shard)] → [Quality Gate]
```

**Futási idő:** ~15-20 perc

### Deploy Pipeline (deploy.yml)

Main branch merge után fut, teljes teszt suite + deploy.

```
[Full Tests] → [E2E Tests] → [Build] → [Deploy Staging]
```

**Futási idő:** ~30-45 perc

### Burn-In Pipeline (burn-in.yml)

Éjszakai stabilitás teszt, flaky teszt detektálás.

```
[10 iteráció P0 tesztek] → [Report] → [Issue (ha bukik)]
```

**Futási idő:** ~45-60 perc

### Deployment Test Pipeline (deployment-test.yml)

Deployment konfiguráció validálása és Docker build tesztelés.

```
[Config Validation] → [Image Build] → [Container Health] → [Compose Stack] → [Deploy Script]
```

**Futási idő:** ~20-30 perc

**Triggerek:**

- Dockerfile változások
- infra/docker/\*\* változások
- scripts/deploy.sh változások
- Manuális indítás

## Futtatási Módok

### Standard Mód

```bash
pnpm test:e2e
```

- 30s test timeout
- Retry: 2x CI-ben, 1x lokálban
- Teljes artifact collection

### YOLO Mód

```bash
pnpm test:e2e:yolo
# vagy
TEST_YOLO=true pnpm test:e2e
```

- 10s test timeout
- Nincs retry
- 4 párhuzamos worker
- Nincs screenshot/video/trace
- Gyors feedback (~5 perc)

### Párhuzamos Futtatás (Sharding)

```bash
# Lokálban
pnpm test:e2e --shard=1/4

# CI-ben automatikus 4 shard
```

### Kritikus Tesztek

```bash
pnpm test:e2e:critical
```

Csak P0 prioritású tesztek futnak.

## Helyi CI Szimuláció

### Teljes Pipeline

```bash
./scripts/ci-local.sh
```

### Gyors Mód (build skip)

```bash
./scripts/ci-local.sh --fast
```

### YOLO Mód

```bash
./scripts/ci-local.sh --yolo
```

### Csak E2E

```bash
./scripts/ci-local.sh --e2e
```

## Szelektív Tesztelés

Csak a változtatásokhoz kapcsolódó tesztek futtatása:

```bash
./scripts/test-changed.sh           # main branch-hez képest
./scripts/test-changed.sh develop   # develop branch-hez képest
```

A script automatikusan azonosítja, mely package-ek változtak és a releváns teszteket futtatja.

## Burn-In Tesztelés

### Lokális Burn-In

```bash
./scripts/burn-in.sh              # 10 iteráció
./scripts/burn-in.sh 5            # 5 iteráció
./scripts/burn-in.sh 10 @Auth     # 10 iteráció, csak @Auth tesztek
```

### GitHub Actions Burn-In

- Automatikus: minden éjjel 3:00-kor (CET)
- Manuális: Actions fülön "Run workflow"

## Deployment Tesztelés

### Lokális Deployment Teszt

```bash
./scripts/test-deployment.sh                    # Teljes teszt
./scripts/test-deployment.sh --config-only      # Csak konfig validáció
./scripts/test-deployment.sh --build-only       # Csak Docker build
./scripts/test-deployment.sh --stack            # Teljes stack teszt
./scripts/test-deployment.sh --clean            # Takarítás
```

### Mit tesztel?

1. **Config Validation**
   - `docker-compose.demo.yml` szintaxis
   - `Caddyfile.demo` struktúra
   - `deploy.sh` és `rollback.sh` bash szintaxis
   - Kötelező környezeti változók ellenőrzése

2. **Docker Image Build**
   - `kgc-api` multi-stage build
   - `kgc-web` Vite + Nginx build

3. **Container Health**
   - Önálló container indítás
   - Health endpoint ellenőrzés
   - HTTP válasz validáció

4. **Compose Stack**
   - PostgreSQL, Redis, MinIO indítás
   - Szolgáltatás health check-ek
   - Hálózati kapcsolatok

### GitHub Actions Deployment Test

A workflow automatikusan fut:

- Dockerfile változásoknál
- Docker Compose konfig változásoknál
- Deploy script módosításoknál

Manuális indítás: Actions → "Deployment Test" → "Run workflow"

## Test Tagging

### Prioritás

| Tag   | Leírás   | Mikor fut       |
| ----- | -------- | --------------- |
| `@P0` | Kritikus | Minden CI futás |
| `@P1` | Fontos   | Teljes suite    |
| `@P2` | Standard | Teljes suite    |

### Domain

| Tag             | Leírás          |
| --------------- | --------------- |
| `@Auth`         | Autentikáció    |
| `@Berles`       | Bérlés          |
| `@Szerviz`      | Szerviz         |
| `@Aruhaz`       | Értékesítés/POS |
| `@NAV`          | Számlázás       |
| `@Multi-tenant` | Tenant izoláció |

### Típus

| Tag         | Leírás          |
| ----------- | --------------- |
| `@SEC`      | Biztonsági      |
| `@DATA`     | Adat integritás |
| `@BUSINESS` | Üzleti flow     |
| `@API`      | API teszt       |
| `@STATE`    | Állapotgép      |

## Artifact-ok

### Sikertelen Teszt Artifact-ok

- `playwright-report/` - HTML riport
- `test-results/` - Screenshots, traces, videos

### Letöltés

```bash
# GitHub CLI-vel
gh run download <run-id> --name playwright-report-shard-1
```

### Trace Viewer

```bash
npx playwright show-trace test-results/.../trace.zip
```

## Troubleshooting

### Teszt lokálban működik, CI-ben nem

1. Futtass lokálban CI-szerű környezetben:

   ```bash
   ./scripts/ci-local.sh
   ```

2. Ellenőrizd az időzítést:
   - CI lassabb lehet
   - Használj explicit wait-eket

3. Környezeti különbségek:
   - Headless vs headed
   - Linux vs macOS/Windows

### Flaky Teszt

1. Burn-in futtatása:

   ```bash
   ./scripts/burn-in.sh 20 "teszt neve"
   ```

2. Keress:
   - Race condition-öket
   - Implicit várakozásokat
   - Külső függőségeket

### Cache Probléma

```bash
# Töröld a lokális Playwright cache-t
rm -rf ~/.cache/ms-playwright

# CI-ben: töröld a cache key-t a workflow-ban
```

## Secrets

A CI működéséhez szükséges secrets:

| Secret            | Leírás                 |
| ----------------- | ---------------------- |
| `TURBO_TOKEN`     | Turborepo remote cache |
| `CODECOV_TOKEN`   | Coverage upload        |
| `STAGING_SSH_KEY` | Deploy SSH kulcs       |
| `STAGING_HOST`    | Staging szerver címe   |
| `STAGING_USER`    | Staging SSH user       |
| `STAGING_PATH`    | Staging deploy path    |

## Kapcsolódó Dokumentumok

- [E2E README](../e2e/README.md) - Teszt framework dokumentáció
- [ADR-024](../planning-artifacts/adr/ADR-024-hybrid-tdd-atdd.md) - TDD/ATDD stratégia
- [Test Design](../_bmad-output/test-design-architecture.md) - Rendszerszintű teszt terv

---

**Generálta:** BMAD TEA Agent
**Frissítve:** 2026-01-28
