# Project Context for AI Agents

**Projekt:** KGC ERP v7.0
**Generálva:** 2026-01-15
**Felhasználó:** Javo!

_Ez a fájl kritikus szabályokat és mintákat tartalmaz, amelyeket az AI ügynököknek követniük KELL a kód implementálásakor._

---

## Technology Stack & Versions

| Technológia | Verzió | Megjegyzés |
|-------------|--------|------------|
| **Node.js** | 20 LTS | Runtime |
| **pnpm** | 9.15.0 | Package manager (workspace) |
| **TypeScript** | 5.3+ | Strict mode kötelező |
| **NestJS** | 10.x | Backend framework |
| **Prisma** | 5.x | ORM + migrations |
| **PostgreSQL** | 15+ | RLS enabled |
| **React** | 18.x | Frontend |
| **Vite** | 5.x | Build tool |
| **TanStack Query** | 5.x | Data fetching |
| **Zustand** | 4.x | State management |
| **shadcn/ui** | latest | UI komponensek |
| **Vitest** | 2.1+ | Unit tesztek |
| **Playwright** | 1.48+ | E2E tesztek |

---

## Critical Implementation Rules

### 1. Multi-Tenancy (ADR-001)

```typescript
// KÖTELEZŐ: Minden adatbázis lekérdezés tenant-aware
// A tenant_id-t NE kézzel add hozzá - a Prisma middleware kezeli

// HELYES:
const partners = await prisma.partner.findMany();

// HELYTELEN:
const partners = await prisma.partner.findMany({
  where: { tenantId: currentTenantId } // ❌ Ne csináld!
});
```

**RLS Policy:** A PostgreSQL RLS automatikusan szűri a tenant adatokat. A \`current_setting('app.current_tenant_id')\` session változó alapján.

### 2. Package Határok

```
TILOS körkörös függőség!

✅ ENGEDÉLYEZETT:
apps/ → packages/*
packages/shared/ → packages/core/
packages/[domain]/ → packages/shared/ + packages/core/
packages/integration/ → packages/*

❌ TILTOTT:
packages/berles/ → packages/szerviz/  (domain → domain)
packages/core/ → packages/shared/     (core → shared)
```

### 3. TypeScript Strict Rules

```typescript
// tsconfig.base.json strict opciók - MINDIG tartsd be!

// noUncheckedIndexedAccess: true
const items: string[] = [];
const first = items[0];  // first: string | undefined ✅
// Használj nullish coalescing-et: items[0] ?? 'default'

// exactOptionalPropertyTypes: true
interface Config {
  timeout?: number;  // undefined VAGY number, de NEM mindkettő
}
```

### 4. TDD/ATDD Hibrid Módszertan

**TDD KÖTELEZŐ (Red-Green-Refactor):**
- Pénzügyi számítások (késedelmi díj, ÁFA, árrés)
- Auth/RBAC logika
- State machine átmenetek
- Validációk (adószám, IBAN)

**ATDD KÖTELEZŐ (Gherkin + Playwright):**
- Kritikus user journey-k (bérlés indítás, pénztár, munkalap)
- Lásd: \`docs/kgc3-development-principles.md\`

### 5. Package Elnevezési Konvenció

**Angol nyelvű package nevek:**

| Domain | Package | Scope |
|--------|---------|-------|
| Core | auth, tenant, audit, config, common | @kgc/auth |
| Shared | ui, utils, types, i18n, testing | @kgc/ui |
| Bérlés | rental-core, rental-checkout, rental-contract, rental-inventory | @kgc/rental-core |
| Szerviz | service-core, service-worksheet, service-warranty, service-parts | @kgc/service-worksheet |
| Értékesítés | sales-core, sales-pos, sales-invoice, sales-quote | @kgc/sales-invoice |
| Integráció | nav-online, mypos, szamlazz-hu, twenty-crm, chatwoot, horilla-hr | @kgc/nav-online |

### 6. API Konvenciók

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

### 7. Tesztelési Konvenciók

```typescript
// Fájl elnevezés
*.spec.ts     // Unit tesztek (Vitest)
*.e2e.ts      // E2E tesztek (Playwright)
*.feature     // Gherkin ATDD tesztek

// Teszt struktúra
describe('ServiceName', () => {
  describe('methodName()', () => {
    describe('happy path', () => {
      it('should [expected behavior] when [condition]', () => {});
    });
    describe('edge cases', () => {});
    describe('error handling', () => {});
  });
});
```

### 8. Git Commit Konvenciók

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
Scope: package neve (auth, rental-core, stb.)

Példák:
feat(rental-core): add late fee calculation
fix(auth): resolve token refresh race condition
test(sales-invoice): add VAT calculation property tests
```

---

## Fontos ADR-ek

| ADR | Téma | Miért Fontos |
|-----|------|--------------|
| ADR-001 | Multi-tenancy RLS | Minden query tenant-aware |
| ADR-010 | Micro-modules | 25 package struktúra |
| ADR-024 | Hybrid TDD/ATDD | Teszt stratégia |
| ADR-030 | NAV Online API | Számla XML formátum |
| ADR-032 | RBAC | 8 szintű jogosultság |
| ADR-037 | Bérlési díj | Késedelmi díj kalkuláció |

Teljes lista: \`planning-artifacts/adr/\`

---

## Kritikus Üzleti Szabályok

### Késedelmi Díj Kalkuláció (ADR-037)

```typescript
// Szabály: 20% naponta, max = napi díj
const lateFeePerDay = dailyRate * 0.20;
const totalLateFee = Math.min(lateDays * lateFeePerDay, dailyRate);
```

### Kaució Kezelés

```typescript
// Törzsvevő: 0 Ft kaució
// Új ügyfél: teljes kaució (bérgép értéke alapján)
// Visszatérő: részleges kaució (50%)
```

### ÁFA Szabályok (ADR-028)

```typescript
// Standard: 27%
// Fordított ÁFA (B2B építőipar): 0%
// Kerekítés: HUF-ra kerekítés
```

---

## Environment Variables

```bash
# Kötelező
DATABASE_URL=postgresql://...
JWT_SECRET=...
TENANT_ID=...  # Runtime-ban session-ből

# Integrációk
SZAMLAZZ_API_KEY=...
MYPOS_MERCHANT_ID=...
NAV_TECHNICAL_USER=...
```

---

_Utolsó frissítés: 2026-01-15_
