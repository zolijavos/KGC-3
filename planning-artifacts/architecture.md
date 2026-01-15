# KGC ERP v7.0 - Architektúra Dokumentum

**Verzió:** 1.0
**Dátum:** 2026-01-15
**Készítette:** Winston (Architect)
**Státusz:** ELFOGADVA

---

## Tartalomjegyzék

1. [Vezetői Összefoglaló](#1-vezetői-összefoglaló)
2. [Rendszer Áttekintés](#2-rendszer-áttekintés)
3. [Technikai Stack](#3-technikai-stack)
4. [Multi-Tenant Architektúra](#4-multi-tenant-architektúra)
5. [Moduláris Rendszer (Micro-Modules)](#5-moduláris-rendszer-micro-modules)
6. [Adatbázis Architektúra](#6-adatbázis-architektúra)
7. [RBAC és Jogosultságok](#7-rbac-és-jogosultságok)
8. [Frontend Architektúra](#8-frontend-architektúra)
9. [Integrációk](#9-integrációk)
10. [Deployment és Infrastruktúra](#10-deployment-és-infrastruktúra)
11. [Biztonsági Architektúra](#11-biztonsági-architektúra)
12. [ADR Összefoglaló](#12-adr-összefoglaló)

---

## 1. Vezetői Összefoglaló

A KGC ERP v7.0 egy **multi-tenant SaaS platform** építőipari és mezőgazdasági gépbérléssel, szervizeléssel és értékesítéssel foglalkozó cégek számára.

### Kulcs Döntések

| Terület | Döntés | ADR |
|---------|--------|-----|
| Architektúra | A+B Hibrid (monolith + séma szeparáció) | ADR-014 |
| Multi-tenancy | PostgreSQL RLS + séma per tenant | ADR-001 |
| Frontend | React + shadcn/ui + Composable | ADR-023 |
| Backend | NestJS + Prisma | - |
| Monorepo | pnpm workspace + 25 package | ADR-010 |
| AI | Google Gemini Flash (Koko chatbot) | ADR-016 |

### Architektúra Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           KGC ERP v7.0                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     FRONTEND (PWA)                               │    │
│  │  React 18 + shadcn/ui + TanStack Query + Zustand                │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     BACKEND API                                  │    │
│  │  NestJS + Prisma + OpenAPI 3.1                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│         ┌────────────────────┼────────────────────┐                     │
│         ▼                    ▼                    ▼                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐         │
│  │ PostgreSQL  │    │   Redis     │    │   External APIs     │         │
│  │ (RLS)       │    │   (Cache)   │    │ MyPos, Számlázz.hu  │         │
│  └─────────────┘    └─────────────┘    └─────────────────────┘         │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     PLUGIN MODULOK                               │    │
│  │  Twenty CRM │ Chatwoot │ Horilla HR │ Koko AI                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Rendszer Áttekintés

### 2.1 Üzleti Domének

| Domain | Leírás | Modul |
|--------|--------|-------|
| **Bérlés** | Bérgép kiadás, visszavétel, kaució | @kgc/berles, @kgc/bergep, @kgc/kaucio |
| **Szerviz** | Munkalap, garanciális javítás | @kgc/munkalap, @kgc/garancia |
| **Értékesítés** | POS, készlet, számla | @kgc/eladas, @kgc/keszlet |
| **Pénzügy** | NAV számlázás, pénztár | @kgc/szamla, @kgc/nav |
| **Franchise** | Multi-tenant, partner kezelés | @kgc/tenant, @kgc/partner |

### 2.2 Felhasználói Szerepkörök

| Szerepkör | Szint | Scope | Fő Feladatok |
|-----------|-------|-------|--------------|
| OPERATOR | 1 | Location | Napi műveletek |
| TECHNIKUS | 2 | Location | Szerviz + Operátor |
| BOLTVEZETO | 3 | Location | ±20% kedvezmény, riportok |
| ACCOUNTANT | 3 | Tenant | Pénzügyi riportok (read-only) |
| PARTNER_OWNER | 4 | Tenant | Franchise összes bolt |
| CENTRAL_ADMIN | 5 | Global | Országos áttekintés |
| DEVOPS_ADMIN | 6 | Global | Rendszer konfiguráció |
| SUPER_ADMIN | 8 | Global | Teljes hozzáférés |

---

## 3. Technikai Stack

### 3.1 Backend

| Komponens | Technológia | Verzió |
|-----------|-------------|--------|
| Runtime | Node.js | 20 LTS |
| Framework | NestJS | 10.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 15+ |
| Cache | Redis | 7.x |
| Queue | BullMQ | 5.x |
| Auth | JWT + Session | - |

### 3.2 Frontend

| Komponens | Technológia | Verzió |
|-----------|-------------|--------|
| Framework | React | 18.x |
| Build | Vite | 5.x |
| Routing | TanStack Router | 1.x |
| State | Zustand | 4.x |
| Forms | React Hook Form + Zod | - |
| UI Library | shadcn/ui + Tailwind | - |
| Data Fetching | TanStack Query | 5.x |

### 3.3 Infrastruktúra

| Komponens | Technológia |
|-----------|-------------|
| Hosting | Hetzner Cloud (EU) |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |
| Logging | Loki |

---

## 4. Multi-Tenant Architektúra

**Forrás:** ADR-001, ADR-014

### 4.1 Tenant Izoláció Stratégia

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              PostgreSQL                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ╔═══════════════════════════════════════════════════════════════════╗  │
│  ║                    PUBLIC SÉMA (Közös)                             ║  │
│  ║                                                                    ║  │
│  ║  • tenants (bolt lista)     • partner (ügyfél törzs)              ║  │
│  ║  • users (felhasználók)     • cikk (termék törzs)                 ║  │
│  ║  • roles (szerepkörök)      • beszallito (beszállítók)            ║  │
│  ║  • permissions              • arszabaly (árazás)                   ║  │
│  ╚═══════════════════════════════════════════════════════════════════╝  │
│                                    │                                     │
│         ┌──────────────────────────┼──────────────────────────┐         │
│         ▼                          ▼                          ▼          │
│  ╔═══════════════╗        ╔═══════════════╗        ╔═══════════════╗    │
│  ║  tenant_kgc1  ║        ║  tenant_kgc2  ║        ║  tenant_fr01  ║    │
│  ║  (KGC Pest)   ║        ║  (KGC Buda)   ║        ║  (Franchise)  ║    │
│  ╠═══════════════╣        ╠═══════════════╣        ╠═══════════════╣    │
│  ║ • bergep      ║        ║ • bergep      ║        ║ • bergep      ║    │
│  ║ • berles      ║        ║ • berles      ║        ║ • berles      ║    │
│  ║ • munkalap    ║        ║ • munkalap    ║        ║ • munkalap    ║    │
│  ║ • keszlet     ║        ║ • keszlet     ║        ║ • keszlet     ║    │
│  ║ • szamla      ║        ║ • szamla      ║        ║ • szamla      ║    │
│  ╚═══════════════╝        ╚═══════════════╝        ╚═══════════════╝    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Row Level Security (RLS)

```sql
-- Minden tenant táblán
ALTER TABLE bergep ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON bergep
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### 4.3 Holding Struktúra Támogatás

```
KGC HOLDING KFT. (Anyavállalat)
├── KGC Érd Kft (tenant_id: kgc1)
├── KGC Győr Kft (tenant_id: kgc2)
└── KGC Debrecen Kft (tenant_id: kgc3)
```

---

## 5. Moduláris Rendszer (Micro-Modules)

**Forrás:** ADR-010

### 5.1 Monorepo Struktúra

```
kgc-erp/
├── package.json                 # Monorepo root (pnpm)
├── pnpm-workspace.yaml
├── nx.json                      # NX config (opcionális)
│
├── packages/                    # 25 modul
│   ├── core-auth/              # @kgc/auth
│   ├── core-users/             # @kgc/users
│   ├── core-tenant/            # @kgc/tenant
│   ├── core-config/            # @kgc/config
│   ├── core-ui/                # @kgc/ui
│   │
│   ├── shared-partner/         # @kgc/partner
│   ├── shared-cikk/            # @kgc/cikk
│   ├── shared-keszlet/         # @kgc/keszlet
│   ├── shared-szamla/          # @kgc/szamla
│   ├── shared-nav/             # @kgc/nav
│   │
│   ├── berles-bergep/          # @kgc/bergep
│   ├── berles-berles/          # @kgc/berles
│   ├── berles-szerzodes/       # @kgc/szerzodes
│   ├── berles-kaucio/          # @kgc/kaucio
│   │
│   ├── szerviz-munkalap/       # @kgc/munkalap
│   ├── szerviz-arajanlat/      # @kgc/arajanlat
│   ├── szerviz-garancia/       # @kgc/garancia
│   ├── szerviz-norma/          # @kgc/norma
│   │
│   ├── aruhaz-bevetelezes/     # @kgc/bevetelezes
│   ├── aruhaz-eladas/          # @kgc/eladas
│   ├── aruhaz-arres/           # @kgc/arres
│   ├── aruhaz-leltar/          # @kgc/leltar
│   │
│   ├── integration-bergep-szerviz/
│   ├── integration-online-foglalas/
│   └── integration-riportok/
│
├── apps/
│   ├── backend/                # NestJS API
│   └── frontend/               # React PWA
│
└── plugins/                    # Git Submodules
    ├── twenty-crm/
    ├── chatwoot/
    └── horilla-hr/
```

### 5.2 Layer Architektúra

| Layer | Modulok | Jellemző |
|-------|---------|----------|
| **CORE** | auth, users, tenant, config, ui | Mindig aktív |
| **SHARED** | partner, cikk, keszlet, szamla, nav | Feature flag |
| **BÉRLÉS** | bergep, berles, szerzodes, kaucio | Üzleti domain |
| **SZERVIZ** | munkalap, arajanlat, garancia, norma | Üzleti domain |
| **ÁRUHÁZ** | bevetelezes, eladas, arres, leltar | Üzleti domain |
| **INTEGRATION** | bergep-szerviz, online-foglalas, riportok | Cross-module |

### 5.3 Feature Flag Rendszer

```typescript
interface FeatureFlags {
  // CORE - mindig true
  readonly auth: true;
  readonly users: true;
  readonly tenant: true;

  // Feature-alapú
  berles: boolean;
  szerviz: boolean;
  ertekesites: boolean;
  garancia: boolean;
  // ...
}

// Tenant config
{
  tenant_id: 'kgc1',
  modules_enabled: {
    berles: true,
    szerviz: true,
    ertekesites: true,
    garancia: true
  }
}
```

---

## 6. Adatbázis Architektúra

### 6.1 Séma Felosztás

| Kategória | Séma | Táblák |
|-----------|------|--------|
| **CORE** | public | tenants, users, roles, permissions |
| **PARTNER** | public | partner, ceg, meghatalmazott |
| **KÉSZLET TÖRZS** | public | cikk, cikkcsoport, beszallito, arszabaly |
| **BÉRLÉS** | tenant_X | bergep, berles, szerzodes, kaucio |
| **SZERVIZ** | tenant_X | munkalap, munkalap_tetel, arajanlat |
| **ÉRTÉKESÍTÉS** | tenant_X | keszlet, eladas, szamla |

### 6.2 Partner Láthatóság

- **Minden bolt látja:** Alapadatok (név, telefon, email, hitelkeret)
- **Csak saját bolt:** Tranzakció részletek
- **Aggregált:** Más bolt tranzakció darabszám

---

## 7. RBAC és Jogosultságok

**Forrás:** ADR-032

### 7.1 Permission Matrix (Kivonatok)

| Permission | OPERATOR | BOLTVEZETO | PARTNER_OWNER |
|------------|----------|------------|---------------|
| rental:create | ✅ | ✅ | ✅ |
| rental:discount | ❌ | ✅ ±20% | ✅ 100% |
| inventory:transfer | ❌ | ✅ | ✅ |
| finance:reports | ❌ | ✅ | ✅ |
| user:create | ❌ | ✅ | ✅ |

### 7.2 Elevated Access

Kritikus műveletek 5 percen belüli újra-hitelesítést igényelnek:
- rental:cancel
- inventory:adjust
- user:delete
- admin:config

---

## 8. Frontend Architektúra

**Forrás:** ADR-023

### 8.1 Négyrétegű Composable Architektúra

```
┌────────────────────────────────────────┐
│     4. Composable Dashboard            │ ← Widget Registry
├────────────────────────────────────────┤
│     3. Headless API Layer              │ ← OpenAPI 3.1
├────────────────────────────────────────┤
│     2. Workflow Recipe Engine          │ ← XState + YAML
├────────────────────────────────────────┤
│     1. Schema-driven Forms             │ ← JSON Schema + Zod
└────────────────────────────────────────┘
```

### 8.2 Offline-First PWA

- Service Worker + IndexedDB
- Background Sync
- Last-Write-Wins konfliktuskezelés

---

## 9. Integrációk

**Forrás:** ADR-015, ADR-016, ADR-017

### 9.1 Külső Rendszerek

| Rendszer | Típus | Integráció |
|----------|-------|------------|
| Twenty CRM | Fork | API + GraphQL |
| Chatwoot | Fork | Webhook + API |
| Horilla HR | Fork | REST API |
| Számlázz.hu | API | NAV Online v3.0 |
| MyPos | API | Payment gateway |
| Koko AI | Egyedi | Gemini Flash API |

### 9.2 AI Chatbot (Koko)

```
User → Koko Router → Intent Classifier
                  ↓
            Gemini Flash API
                  ↓
        Confidence Check:
        >80%  → AUTO SEND
        50-80% → ADMIN APPROVAL
        <50%  → CHATWOOT ESCALATION
```

---

## 10. Deployment és Infrastruktúra

**Forrás:** ADR-002

### 10.1 Telepítési Modellek

| Modell | Leírás | Használat |
|--------|--------|-----------|
| **SaaS (Felhő)** | Hetzner Cloud, EU GDPR | Elsődleges |
| **On-Premise** | Docker Compose csomag | Franchise opció |

### 10.2 Docker Architektúra

```yaml
services:
  api:
    image: kgc-erp/api:latest
    depends_on: [postgres, redis]

  web:
    image: kgc-erp/web:latest

  postgres:
    image: postgres:15

  redis:
    image: redis:7

  # Plugin-ek (opcionális)
  twenty-crm:
    image: twentyhq/twenty:latest

  chatwoot:
    image: chatwoot/chatwoot:latest
```

---

## 11. Biztonsági Architektúra

### 11.1 Autentikáció

- JWT + Refresh Token
- Session-based fallback
- PIN kód (Kiosk mód)

### 11.2 Autorizáció

- RBAC (7 szerepkör)
- Permission-based access control
- Tenant izoláció (RLS)

### 11.3 GDPR Compliance

- Cascade delete
- Data retention policies
- Audit trail (7 év)

---

## 12. ADR Összefoglaló

### Kulcs ADR-ek

| ADR | Téma | Státusz |
|-----|------|---------|
| ADR-001 | Franchise Multi-Tenancy | ✅ Elfogadva |
| ADR-002 | Deployment + Offline | ✅ Elfogadva |
| ADR-010 | Micro-Modules Architektúra | ✅ Elfogadva |
| ADR-014 | Moduláris Arch. Végleges | ✅ Elfogadva |
| ADR-016 | Koko AI Chatbot | ✅ Elfogadva |
| ADR-023 | Composable Frontend | ✅ Elfogadva |
| ADR-032 | RBAC Architektúra | ✅ Elfogadva |

### Teljes ADR Lista

Lásd: `planning-artifacts/3-solution/architecture/adr/` (43 db)

---

## Változásnapló

| Verzió | Dátum | Változás |
|--------|-------|----------|
| 1.0 | 2026-01-15 | Kezdeti verzió - 43 ADR konszolidálása |

---

*Ez a dokumentum a KGC ERP v7.0 architektúra "single source of truth" dokumentuma. Minden architektúra döntés az ADR-ekből származik.*
