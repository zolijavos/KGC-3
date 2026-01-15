# Tech Spec: KGC ERP Monorepo Scaffold Setup

**Slug:** `ts-monorepo-scaffold`
**Dátum:** 2026-01-15
**Státusz:** Draft
**Kapcsolódó ADR-ek:** ADR-010 (Micro-modules), ADR-014 (Moduláris architektúra végleges)

---

## 1. Összefoglaló

Ez a tech spec definiálja a KGC ERP monorepo alapstruktúrájának felállítását az ADR-010 Struktúra B (flat naming) szerint.

### Scope

- **IN SCOPE:**
  - pnpm workspace konfiguráció
  - Turborepo konfiguráció frissítés
  - tsconfig.base.json path alias javítás (ADR-010 szerinti)
  - Package scaffold template
  - docker-compose.yml dev környezethez
  - ESLint + Prettier közös konfig

- **OUT OF SCOPE:**
  - Package-ek tényleges implementációja
  - CI/CD pipeline (már létezik)
  - Kubernetes deployment

---

## 2. Jelenlegi Állapot

### Meglévő Fájlok

| Fájl | Állapot | Probléma |
|------|---------|----------|
| `package.json` | ✅ OK | Turborepo scriptek rendben |
| `turbo.json` | ✅ OK | Task definíciók rendben |
| `tsconfig.base.json` | ⚠️ JAVÍTANDÓ | Nested path aliasok (`packages/core/auth`) |
| `pnpm-workspace.yaml` | ❌ HIÁNYZIK | Szükséges a workspace működéshez |
| `packages/` | ⚠️ INKONZISZTENS | Csak `shared/inventory/` létezik nested struktúrával |

### Ellentmondás

A `tsconfig.base.json` **nested struktúrát** használ:
```
packages/core/auth → @kgc/auth
packages/shared/ui → @kgc/ui
packages/berles/rental-core → @kgc/rental-core
```

Az **ADR-010** viszont **flat naming-et** definiál:
```
packages/core-auth → @kgc/auth
packages/shared-partner → @kgc/partner
packages/szerviz-munkalap → @kgc/munkalap
```

**Döntés:** Az ADR-010 az authoratív, a tsconfig.base.json javítandó.

---

## 3. Cél Struktúra (ADR-010 Struktúra B)

```
KGC-3/
├── package.json                 # Root workspace
├── pnpm-workspace.yaml          # Workspace packages definíció
├── turbo.json                   # Turborepo config (már OK)
├── tsconfig.base.json           # Közös TS config (JAVÍTOTT)
├── docker-compose.yml           # Dev environment
├── .env.example                 # Environment template
│
├── apps/                        # Alkalmazások
│   ├── kgc-api/                # NestJS backend
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── kgc-web/                # Next.js PWA frontend
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── kgc-admin/              # Admin dashboard (later)
│
├── packages/                    # 25+ modul (flat naming!)
│   │
│   │── ═══════════════ CORE LAYER ═══════════════
│   ├── core-auth/              # @kgc/auth
│   ├── core-users/             # @kgc/users
│   ├── core-tenant/            # @kgc/tenant
│   ├── core-config/            # @kgc/config
│   ├── core-ui/                # @kgc/ui
│   ├── core-audit/             # @kgc/audit (E-CORE-06)
│   │
│   │── ═══════════════ SHARED LAYER ═══════════════
│   ├── shared-partner/         # @kgc/partner
│   ├── shared-cikk/            # @kgc/cikk
│   ├── shared-keszlet/         # @kgc/keszlet (ÁTHELYEZÉS!)
│   ├── shared-szamla/          # @kgc/szamla
│   ├── shared-nav/             # @kgc/nav
│   ├── shared-feladatlista/    # @kgc/feladatlista (E-SHARED-06)
│   │
│   │── ═══════════════ BÉRLÉS LAYER ═══════════════
│   ├── berles-bergep/          # @kgc/bergep
│   ├── berles-berles/          # @kgc/berles
│   ├── berles-szerzodes/       # @kgc/szerzodes
│   ├── berles-kaucio/          # @kgc/kaucio
│   │
│   │── ═══════════════ SZERVIZ LAYER ═══════════════
│   ├── szerviz-munkalap/       # @kgc/munkalap
│   ├── szerviz-arajanlat/      # @kgc/arajanlat
│   ├── szerviz-garancia/       # @kgc/garancia
│   ├── szerviz-norma/          # @kgc/norma
│   │
│   │── ═══════════════ ÁRUHÁZ LAYER ═══════════════
│   ├── aruhaz-bevetelezes/     # @kgc/bevetelezes
│   ├── aruhaz-eladas/          # @kgc/eladas
│   ├── aruhaz-arres/           # @kgc/arres
│   ├── aruhaz-leltar/          # @kgc/leltar
│   │
│   │── ═══════════════ INTEGRATION LAYER ═══════════════
│   ├── integration-bergep-szerviz/  # @kgc/bergep-szerviz-integration
│   ├── integration-online-foglalas/ # @kgc/online-foglalas-integration
│   ├── integration-riportok/        # @kgc/riportok
│   │
│   │── ═══════════════ PLUGIN LAYER ═══════════════
│   └── plugin-chat/            # @kgc/chat (E-PLUGIN-05)
│
├── infra/                       # Infrastructure configs
│   └── docker/
│       └── postgres/
│           └── init.sql        # Initial DB setup
│
└── tools/                       # Dev tools, generators
    └── generators/
        └── package/            # Package generator script
```

---

## 4. Implementáció

### 4.1 pnpm-workspace.yaml (ÚJ)

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 4.2 tsconfig.base.json (JAVÍTOTT)

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "incremental": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "baseUrl": ".",
    "paths": {
      "@kgc/auth": ["packages/core-auth/src"],
      "@kgc/users": ["packages/core-users/src"],
      "@kgc/tenant": ["packages/core-tenant/src"],
      "@kgc/config": ["packages/core-config/src"],
      "@kgc/ui": ["packages/core-ui/src"],
      "@kgc/audit": ["packages/core-audit/src"],
      "@kgc/partner": ["packages/shared-partner/src"],
      "@kgc/cikk": ["packages/shared-cikk/src"],
      "@kgc/keszlet": ["packages/shared-keszlet/src"],
      "@kgc/szamla": ["packages/shared-szamla/src"],
      "@kgc/nav": ["packages/shared-nav/src"],
      "@kgc/feladatlista": ["packages/shared-feladatlista/src"],
      "@kgc/bergep": ["packages/berles-bergep/src"],
      "@kgc/berles": ["packages/berles-berles/src"],
      "@kgc/szerzodes": ["packages/berles-szerzodes/src"],
      "@kgc/kaucio": ["packages/berles-kaucio/src"],
      "@kgc/munkalap": ["packages/szerviz-munkalap/src"],
      "@kgc/arajanlat": ["packages/szerviz-arajanlat/src"],
      "@kgc/garancia": ["packages/szerviz-garancia/src"],
      "@kgc/norma": ["packages/szerviz-norma/src"],
      "@kgc/bevetelezes": ["packages/aruhaz-bevetelezes/src"],
      "@kgc/eladas": ["packages/aruhaz-eladas/src"],
      "@kgc/arres": ["packages/aruhaz-arres/src"],
      "@kgc/leltar": ["packages/aruhaz-leltar/src"],
      "@kgc/bergep-szerviz-integration": ["packages/integration-bergep-szerviz/src"],
      "@kgc/online-foglalas-integration": ["packages/integration-online-foglalas/src"],
      "@kgc/riportok": ["packages/integration-riportok/src"],
      "@kgc/chat": ["packages/plugin-chat/src"]
    }
  },
  "exclude": ["node_modules", "dist", "build", ".turbo", "coverage"]
}
```

### 4.3 docker-compose.yml (ÚJ)

```yaml
version: '3.8'

services:
  # PostgreSQL adatbázis
  postgres:
    image: postgres:15-alpine
    container_name: kgc-postgres
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: kgc
      POSTGRES_PASSWORD: kgc_dev_password
      POSTGRES_DB: kgc_erp
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U kgc -d kgc_erp']
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis cache
  redis:
    image: redis:7-alpine
    container_name: kgc-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  # MinIO (S3-compatible storage for files)
  minio:
    image: minio/minio:latest
    container_name: kgc-minio
    ports:
      - '9000:9000'
      - '9001:9001'
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:9000/minio/health/live']
      interval: 30s
      timeout: 20s
      retries: 3

volumes:
  postgres_data:
  redis_data:
  minio_data:

networks:
  default:
    name: kgc-network
```

### 4.4 .env.example (ÚJ)

```env
# Database
DATABASE_URL="postgresql://kgc:kgc_dev_password@localhost:5432/kgc_erp?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# MinIO (S3-compatible)
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="kgc-files"

# App
NODE_ENV="development"
PORT=3000
JWT_SECRET="your-jwt-secret-change-in-production"
JWT_EXPIRES_IN="7d"

# NAV Online (Számlázz.hu)
SZAMLAZZ_HU_AGENT_KEY=""
SZAMLAZZ_HU_AUTH_TOKEN=""

# MyPOS (kaució)
MYPOS_STORE_ID=""
MYPOS_PRIVATE_KEY=""
```

### 4.5 Package Template

Minden package a következő struktúrát követi:

```
packages/core-auth/
├── src/
│   ├── index.ts              # Public API exports
│   ├── auth.module.ts        # NestJS module
│   ├── auth.service.ts       # Business logic
│   ├── auth.controller.ts    # REST endpoints
│   ├── dto/                  # Data Transfer Objects
│   │   ├── login.dto.ts
│   │   └── register.dto.ts
│   ├── entities/             # Prisma entities
│   │   └── session.entity.ts
│   └── guards/               # Auth guards
│       ├── jwt.guard.ts
│       └── roles.guard.ts
├── test/
│   └── auth.service.spec.ts  # Unit tests
├── package.json
├── tsconfig.json
└── README.md
```

#### packages/core-auth/package.json

```json
{
  "name": "@kgc/auth",
  "version": "0.0.1",
  "private": true,
  "description": "KGC ERP - Authentication module (JWT, PIN, Sessions)",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@kgc/tenant": "workspace:*",
    "@kgc/config": "workspace:*"
  },
  "peerDependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0"
  },
  "kgc": {
    "layer": "core",
    "featureFlag": null,
    "requiredModules": ["tenant", "config"],
    "optionalModules": []
  }
}
```

#### packages/core-auth/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### 4.6 infra/docker/postgres/init.sql (ÚJ)

```sql
-- KGC ERP Initial Database Setup
-- Creates multi-tenant schema structure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Public schema: közös adatok (CORE, PARTNER, KÉSZLET törzs)
-- Tenant-specifikus táblák külön sémákban lesznek létrehozva runtime

-- Alapértelmezett tenant létrehozása dev környezethez
-- A tényleges séma struktúra a Prisma migrációkból jön
```

---

## 5. Migráció: Meglévő Inventory Package

A `packages/shared/inventory/` át kell helyezni `packages/shared-keszlet/`-be:

1. `mv packages/shared/inventory packages/shared-keszlet`
2. Update `package.json`: name `@kgc/inventory` → `@kgc/keszlet`
3. Remove empty `packages/shared/` directory
4. Update imports everywhere

---

## 6. Függőségi Szabályok

```
apps/ → packages/*                    ✅
shared-* → core-*                     ✅
berles-*/szerviz-*/aruhaz-* → shared-* + core-*  ✅
integration-* → packages/*            ✅
core-* → core-* (belső)               ✅
berles-* ↔ szerviz-* ↔ aruhaz-*       ❌ TILOS!
```

Körkörös függőség → event-based kommunikáció.

---

## 7. Checklist

- [ ] Létrehozni `pnpm-workspace.yaml`
- [ ] Frissíteni `tsconfig.base.json` az ADR-010 szerinti path aliasokkal
- [ ] Létrehozni `docker-compose.yml`
- [ ] Létrehozni `.env.example`
- [ ] Létrehozni `infra/docker/postgres/init.sql`
- [ ] Áthelyezni `packages/shared/inventory` → `packages/shared-keszlet`
- [ ] Létrehozni `apps/kgc-api/` scaffold
- [ ] Létrehozni `apps/kgc-web/` scaffold
- [ ] Létrehozni első core package: `packages/core-config/`
- [ ] Tesztelni: `pnpm install` működik

---

## 8. Elfogadási Kritériumok

1. `pnpm install` hiba nélkül fut
2. `pnpm build` hiba nélkül lefordul
3. `pnpm test` (üres, de fut)
4. `docker-compose up -d` elindítja PostgreSQL, Redis, MinIO-t
5. Path aliasok működnek: `import { X } from '@kgc/auth'`

---

**Következő lépés:** Jóváhagyás után implementáció a `dev-story` vagy `quick-dev` workflow-val.
