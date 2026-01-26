# KGC ERP v7.0

> Modern ERP/Sales Management System for Equipment Rental, Service, and Retail with Franchise Network Support

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red.svg)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-19.x-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-gray.svg)]()

## Overview

KGC ERP is a comprehensive enterprise resource planning system designed for **Kisgépcentrum** - a Hungarian equipment rental and service company. The system supports multi-tenant franchise operations with offline-first PWA capabilities.

### Key Features

- **Equipment Rental** - Daily/weekly/monthly rentals with deposit management (MyPOS)
- **Service Management** - Worksheets, warranty tracking, Makita service standards
- **Retail Sales** - POS, invoicing, NAV Online integration (Számlázz.hu API)
- **Quote Management** - Price calculation, conversion tracking
- **Finance** - Monthly closing, VAT reporting, corporate billing
- **Multi-tenant** - Franchise network support with Row Level Security (RLS)
- **Offline-first PWA** - Works without internet connection

## Tech Stack

| Layer        | Technology                                |
| ------------ | ----------------------------------------- |
| **Frontend** | React 19, Vite, TanStack Query, shadcn/ui |
| **Backend**  | NestJS 10, Prisma ORM                     |
| **Database** | PostgreSQL 16 with RLS                    |
| **Cache**    | Redis                                     |
| **Auth**     | JWT with refresh tokens                   |
| **Testing**  | Vitest, Playwright                        |
| **Monorepo** | pnpm workspaces, Turborepo                |

## Architecture

The project follows a **micro-modules architecture** (ADR-010) with 25 packages organized by domain:

```
KGC-3/
├── apps/
│   ├── kgc-web/          # Next.js PWA Frontend
│   ├── kgc-admin/        # Admin Dashboard
│   └── kgc-api/          # NestJS API
│
├── packages/
│   ├── core/             # Auth, Tenant, Audit, Config, Common
│   ├── shared/           # UI, Utils, Types, i18n, Testing, Inventory
│   ├── berles/           # Rental domain (rental-core, checkout, contract)
│   ├── szerviz/          # Service domain (core, worksheet, warranty, parts)
│   ├── aruhaz/           # Sales domain (core, pos, invoice, quote)
│   └── integration/      # External integrations
│
└── infra/
    └── docker/           # Docker configurations
```

## Integrations

| System          | Purpose                          | Status        |
| --------------- | -------------------------------- | ------------- |
| **Twenty CRM**  | Customer relationship management | ✅ Configured |
| **Chatwoot**    | Customer support & ticketing     | ✅ Configured |
| **Horilla HR**  | Human resources management       | ✅ Configured |
| **Számlázz.hu** | NAV Online invoicing             | Stub ready    |
| **MyPOS**       | Card payments & deposits         | Stub ready    |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- Redis 7+
- Docker (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/zolijavos/KGC-3.git
cd KGC-3

# Install dependencies
pnpm install

# Setup environment
cp apps/kgc-api/.env.example apps/kgc-api/.env
# Edit .env with your database credentials

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

### Available Scripts

```bash
# Development
pnpm dev              # Start all apps in development mode
pnpm build            # Build all packages and apps
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues
pnpm format           # Format code with Prettier
pnpm typecheck        # TypeScript type checking

# Testing
pnpm test             # Run unit tests (Vitest)
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Generate coverage report
pnpm test:e2e         # Run E2E tests (Playwright)

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema changes (dev)
pnpm db:studio        # Open Prisma Studio

# Package-specific
pnpm --filter @kgc/auth test        # Run tests for specific package
pnpm --filter @kgc/rental-core build # Build specific package
```

## Docker Deployment

### Full Stack (Development)

```bash
cd infra/docker/full-stack
docker compose up -d kgc-db kgc-redis
```

### Staging Environment (staging.kgc.local)

```bash
cd infra/docker/full-stack

# Configure
cp .env.staging.example .env.staging
# Edit .env.staging

# Add to /etc/hosts: 127.0.0.1 staging.kgc.local api.staging.kgc.local

# Start
docker compose -f docker-compose.yml -f docker-compose.staging.yml --env-file .env.staging up -d
```

Access staging at `https://staging.kgc.local`

### Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d
```

See [docs/deployment-guide.md](./docs/deployment-guide.md) for detailed instructions

## Project Status

**Current Phase:** Implementation (BMAD Phase 4)

The project uses the **BMAD Method** for agile development with comprehensive documentation:

- PRD and Architecture documents completed
- 43 Architecture Decision Records (ADRs)
- Epic and Story definitions ready
- TDD/ATDD hybrid testing strategy

## Documentation

| Document                                                                     | Description                                  |
| ---------------------------------------------------------------------------- | -------------------------------------------- |
| [CLAUDE.md](./CLAUDE.md)                                                     | AI assistant instructions & project overview |
| [docs/deployment-guide.md](./docs/deployment-guide.md)                       | Deployment and staging guide                 |
| [planning-artifacts/prd.md](./planning-artifacts/prd.md)                     | Product Requirements Document                |
| [planning-artifacts/architecture.md](./planning-artifacts/architecture.md)   | System Architecture                          |
| [planning-artifacts/adr/](./planning-artifacts/adr/)                         | Architecture Decision Records (46)           |
| [docs/kgc3-development-principles.md](./docs/kgc3-development-principles.md) | Development guidelines                       |

## API Endpoints

| Endpoint                | Description                 |
| ----------------------- | --------------------------- |
| `GET /health`           | Health check                |
| `GET /api/docs`         | Swagger documentation       |
| `POST /auth/login`      | User authentication         |
| `POST /webhooks/twenty` | Twenty CRM webhook receiver |

## Contributing

This is a private project for KGC Kft. Please follow the development guidelines in [CLAUDE.md](./CLAUDE.md).

### Commit Convention

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
Scope: package name (auth, rental-core, etc.)

Examples:
feat(rental-core): add late fee calculation
fix(auth): resolve token refresh race condition
```

## License

Proprietary - KGC Kft. All rights reserved.

---

Built with the [BMAD Method](https://github.com/bmad-method) for AI-assisted development.
