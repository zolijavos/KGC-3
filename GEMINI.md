# GEMINI.md

This file provides context and guidance for the Gemini AI assistant when working within the KGC ERP v3.0 repository. The primary language for communication, documentation, and commit messages is **Hungarian**.

## 1. Project Overview

**KGC ERP v7.0** is a comprehensive Enterprise Resource Planning (ERP) and sales management system designed for the Kisgépcentrum franchise network, featuring a white-label distribution model.

- **Domain**: Retail / Equipment Rental / Service Management
- **Complexity**: High (multi-tenant architecture, offline-first PWA, numerous integrations)
- **Development Model**: BMad Method (a custom agile framework)
- **Key Business Domains**:
    - **Rental**: Machine rentals, deposit handling (MyPos), long-term contracts.
    - **Sales**: Product sales, invoicing with NAV integration (Számlázz.hu API).
    - **Service**: Work order management, warranty repairs.
    - **Quotation**: Price calculation, conversion tracking.
    - **Finance**: Monthly closing, VAT management, B2B accounting.

## 2. Tech Stack & Architecture

The project is a TypeScript monorepo built on a "micro-modules" architecture (see ADR-010).

- **Backend**: NestJS
- **Frontend**: Next.js (as a Progressive Web App - PWA)
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **File Storage**: MinIO (S3-compatible)
- **Monorepo Management**: pnpm Workspaces + Turborepo
- **UI Components**: shadcn/ui
- **Testing**: Vitest (unit), Playwright (E2E/ATDD)

The architecture enforces strict separation of concerns through a layered package structure. Dependencies are managed to prevent coupling between business domains (e.g., `packages/berles` cannot directly depend on `packages/szerviz`).

## 3. Development Environment

The local development environment is managed by Docker Compose.

**To start the necessary services (PostgreSQL, Redis, MinIO):**
```bash
docker-compose up -d
```
The services will be available at their default ports (`5432`, `6379`, `9000`).

## 4. Common Commands

The project uses `pnpm` as its package manager and `turbo` to manage monorepo scripts.

| Command | Description |
|---|---|
| `pnpm install` | Installs all dependencies. |
| `pnpm dev` | Starts the development servers for all apps. |
| `pnpm build` | Builds all applications and packages. |
| `pnpm test` | Runs all unit and integration tests (Vitest). |
| `pnpm test:e2e`| Runs end-to-end tests (Playwright). |
| `pnpm lint` | Lints the entire codebase. |
| `pnpm format` | Formats all files with Prettier. |
| `pnpm typecheck`| Performs a full TypeScript type check. |
| `pnpm db:migrate`| Applies pending database migrations. |
| `pnpm db:studio`| Opens the Prisma Studio GUI. |

**To run a command for a specific package or scope:**
```bash
# Test a single package
pnpm --filter @kgc/auth test

# Build all packages in the core layer
pnpm --filter "./packages/core/*" build
```

## 5. Key Conventions

Adherence to these conventions is critical for maintaining code quality.

### TypeScript Strictness
The project enforces **strict TypeScript** settings, including `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Always check for `undefined` when accessing array elements or optional properties.

```typescript
// Correct way to handle potential undefined values
const items: string[] = [];
const first = items[0]; // Type is `string | undefined`
const safeFirst = items[0] ?? 'default value';
```

### Multi-Tenancy (Row-Level Security)
The database uses PostgreSQL RLS to enforce multi-tenancy. **Do not** manually add `tenantId` to `where` clauses in Prisma queries. A middleware automatically handles this based on the current session context.

```typescript
// CORRECT: RLS policy will automatically filter by tenant.
const partners = await prisma.partner.findMany();

// INCORRECT: Avoid manually specifying the tenantId.
const partners = await prisma.partner.findMany({
  where: { tenantId: currentTenantId } // ❌ Redundant and error-prone!
});
```

### Monorepo Dependency Rules
- `apps` can depend on any `packages`.
- `packages/[domain]` (e.g., `berles`) can depend on `shared` and `core`.
- `shared` can depend on `core`.
- **Forbidden**:
    - Dependencies between different domain packages (e.g., `berles` -> `szerviz`).
    - `core` depending on `shared` or any other higher-level package.

### Git Commit Messages
Commits must follow the Conventional Commits specification.

- **Format**: `<type>(<scope>): <subject>`
- **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- **Scope**: The name of the affected package (e.g., `auth`, `rental-core`, `kgc-web`).

**Examples:**
```
feat(rental-core): add late fee calculation logic
fix(auth): resolve token refresh race condition
test(sales-invoice): add VAT calculation property tests
```

## 6. Project Structure

The repository is organized into several key directories:

```
KGC-3/
├── _bmad/                    # BMad framework configuration and workflows
├── apps/                     # Runnable applications
│   ├── kgc-web/              # Next.js PWA frontend
│   ├── kgc-admin/            # Admin dashboard
│   └── kgc-api/              # NestJS backend API
│
├── packages/                 # Shared libraries and domain logic (monorepo packages)
│   ├── core/                 # Base functionalities (auth, tenant, audit)
│   ├── shared/               # Code shared across layers (UI, utils, types)
│   ├── berles/               # "Rental" business domain
│   ├── szerviz/              # "Service" business domain
│   ├── aruhaz/               # "Sales" business domain
│   └── integration/          # Connectors for external systems (NAV, MyPOS, etc.)
│
├── docs/                     # Project knowledge base and principles
├── infra/                    # Infrastructure as Code (Docker, K8s)
├── planning-artifacts/       # Output from planning phases (PRD, Architecture, ADRs)
├── implementation-artifacts/ # Output from implementation phases (Stories, Reviews)
└── e2e/                      # End-to-end tests (Playwright)
```
- **Package Aliases**: All packages are scoped under `@kgc/*` (e.g., `@kgc/auth`, `@kgc/rental-core`).
- **Development Principles**: Detailed TDD/ATDD strategy is documented in `docs/kgc3-development-principles.md`.
- **Architecture Decisions**: Key decisions are recorded in `planning-artifacts/adr/`.
