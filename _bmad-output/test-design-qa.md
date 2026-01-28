# Test Design for QA: KGC ERP v7.0

**Purpose:** Test execution recipe for QA team. Defines what to test, how to test it, and what QA needs from other teams.

**Date:** 2026-01-26
**Author:** TEA Agent (BMad v6)
**Status:** Draft
**Project:** KGC ERP v7.0

**Related:** See Architecture doc (test-design-architecture.md) for testability concerns and architectural blockers.

---

## Executive Summary

**Scope:** Comprehensive E2E and integration test coverage for KGC ERP v7.0 - covering all 5 business domains (Bérlés, Szerviz, Értékesítés, Pénzügy, Franchise).

**Risk Summary:**

- Total Risks: 12 (5 high-priority score >=6, 4 medium, 3 low)
- Critical Categories: SEC (2), DATA (2), BUS (1)

**Coverage Summary:**

- P0 tests: ~25 (critical paths, security, multi-tenant)
- P1 tests: ~45 (important features, integration)
- P2 tests: ~35 (edge cases, regression)
- P3 tests: ~15 (exploratory, benchmarks)
- **Total**: ~120 tests (~3-4 weeks with 1 QA)

---

## Dependencies & Test Blockers

**CRITICAL:** QA cannot proceed without these items from other teams.

### Backend/Architecture Dependencies (Sprint 0)

**Source:** See Architecture doc "Quick Guide" for detailed mitigation plans

1. **Test Data Seeding API** - Backend - Sprint 0 Week 1
   - POST `/api/test/seed` endpoint accepting entity factories
   - DELETE `/api/test/cleanup` for post-test cleanup
   - Why it blocks: Cannot create deterministic test data

2. **Multi-Tenant Test Isolation** - Backend - Sprint 0 Week 1
   - Test tenant creation with unique tenant_id
   - RLS context helper for setting tenant scope
   - Why it blocks: Tests pollute each other in parallel runs

3. **External Service Mocks** - Backend - Sprint 0 Week 2
   - MyPos mock returning success/failure scenarios
   - Számlázz.hu mock for NAV invoice testing
   - Why it blocks: Cannot test payment/invoice flows offline

### QA Infrastructure Setup (Sprint 0)

1. **Test Data Factories** - QA
   - Partner factory with faker-based randomization
   - Bergep (rental equipment) factory
   - Munkalap (work order) factory
   - Keszlet (inventory) factory
   - User factory with role assignment
   - Auto-cleanup fixtures for parallel safety

2. **Test Environments** - QA
   - Local: Docker Compose with test database
   - CI/CD: GitHub Actions with PostgreSQL service
   - Staging: Pre-production environment with test data

**Factory pattern example:**

```typescript
import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker/locale/hu';

// Partner factory
const createPartner = (overrides = {}) => ({
  nev: faker.company.name(),
  email: faker.internet.email(),
  telefon: faker.phone.number('+36 ## ### ####'),
  adoszam: faker.string.numeric(11),
  cim: faker.location.streetAddress(),
  ...overrides,
});

// Rental equipment factory
const createBergep = (overrides = {}) => ({
  megnevezes: faker.commerce.productName(),
  gyartmany: faker.company.name(),
  tipus: faker.string.alphanumeric(10),
  sorozatszam: faker.string.uuid(),
  napi_dij: faker.number.int({ min: 5000, max: 50000 }),
  ...overrides,
});

test('@P0 @Multi-tenant partner isolation', async ({ request }) => {
  const partner = createPartner();

  // Create partner in tenant A
  const response = await request.post('/api/partners', {
    data: partner,
    headers: { 'X-Tenant-ID': 'tenant-a' },
  });

  expect(response.status()).toBe(201);
  const created = await response.json();

  // Verify not visible from tenant B
  const crossTenantResponse = await request.get(`/api/partners/${created.id}`, {
    headers: { 'X-Tenant-ID': 'tenant-b' },
  });

  expect(crossTenantResponse.status()).toBe(404);
});
```

---

## Risk Assessment

**Note:** Full risk details in Architecture doc. This section summarizes risks relevant to QA test planning.

### High-Priority Risks (Score >=6)

| Risk ID   | Category | Description                     | Score | QA Test Coverage                    |
| --------- | -------- | ------------------------------- | ----- | ----------------------------------- |
| **R-001** | DATA     | Cross-tenant data leakage       | **6** | Multi-tenant isolation E2E tests    |
| **R-002** | SEC      | Unauthorized elevated access    | **6** | RBAC permission boundary tests      |
| **R-003** | BUS      | NAV invoice submission failure  | **9** | NAV integration + retry queue tests |
| **R-004** | DATA     | Offline sync conflict data loss | **6** | PWA offline-to-online sync tests    |
| **R-005** | SEC      | MyPos payment token exposure    | **6** | Log sanitization security tests     |

### Medium/Low-Priority Risks

| Risk ID | Category | Description                     | Score | QA Test Coverage              |
| ------- | -------- | ------------------------------- | ----- | ----------------------------- |
| R-006   | PERF     | Response time degradation       | 4     | k6 load tests (nightly)       |
| R-007   | OPS      | Docker deployment silent fail   | 4     | Health check validation in CI |
| R-008   | TECH     | Prisma migration breaks schemas | 3     | Migration test on staging     |
| R-009   | BUS      | Feature flag misconfiguration   | 4     | Feature flag matrix tests     |

---

## Test Coverage Plan

**IMPORTANT:** P0/P1/P2/P3 = **priority and risk level** (what to focus on if time-constrained), NOT execution timing. See "Execution Strategy" for when tests run.

### P0 (Critical)

**Criteria:** Blocks core functionality + High risk (>=6) + No workaround + Affects majority of users

#### Multi-Tenant Security (R-001, R-002)

| Test ID    | Requirement                            | Test Level | Risk Link | Notes                   |
| ---------- | -------------------------------------- | ---------- | --------- | ----------------------- |
| **P0-001** | Tenant A cannot access Tenant B data   | E2E        | R-001     | RLS boundary test       |
| **P0-002** | Partner data isolated per tenant       | API        | R-001     | All partner CRUD ops    |
| **P0-003** | Bergep (equipment) isolated per tenant | API        | R-001     | Rental equipment scope  |
| **P0-004** | OPERATOR cannot access CENTRAL_ADMIN   | API        | R-002     | Role escalation blocked |
| **P0-005** | Elevated ops require re-auth (5 min)   | E2E        | R-002     | rental:cancel test      |
| **P0-006** | Permission denied returns 403          | API        | R-002     | Not 401 or 500          |
| **P0-007** | JWT token expiry enforced              | API        | R-002     | 401 after expiry        |

#### Authentication Flow

| Test ID    | Requirement                        | Test Level | Risk Link | Notes                 |
| ---------- | ---------------------------------- | ---------- | --------- | --------------------- |
| **P0-008** | Login with valid credentials       | E2E        | R-002     | Happy path            |
| **P0-009** | Login fails with invalid password  | E2E        | R-002     | Error message correct |
| **P0-010** | Session persists after page reload | E2E        | R-002     | Storage state works   |
| **P0-011** | Logout clears all tokens           | E2E        | R-002     | No residual auth      |
| **P0-012** | PIN code login (kiosk mode)        | E2E        | R-002     | ADR-033 requirement   |

#### NAV Invoice Integration (R-003)

| Test ID    | Requirement                           | Test Level | Risk Link | Notes                   |
| ---------- | ------------------------------------- | ---------- | --------- | ----------------------- |
| **P0-013** | Invoice submitted to NAV successfully | API        | R-003     | Számlázz.hu integration |
| **P0-014** | NAV failure triggers retry queue      | API        | R-003     | BullMQ retry logic      |
| **P0-015** | Manual fallback after max retries     | API        | R-003     | Admin notification      |
| **P0-016** | Invoice data persisted on NAV failure | API        | R-003     | No data loss            |

#### Payment Security (R-005)

| Test ID    | Requirement                           | Test Level | Risk Link | Notes                   |
| ---------- | ------------------------------------- | ---------- | --------- | ----------------------- |
| **P0-017** | MyPos token not logged                | API        | R-005     | Log sanitization        |
| **P0-018** | Payment success creates kaució record | E2E        | R-005     | Deposit flow            |
| **P0-019** | Payment failure handled gracefully    | E2E        | R-005     | Error message, no crash |

#### Core Business Flows

| Test ID    | Requirement                          | Test Level | Risk Link | Notes               |
| ---------- | ------------------------------------ | ---------- | --------- | ------------------- |
| **P0-020** | Rental checkout complete flow        | E2E        | -         | Bérlés domain       |
| **P0-021** | Rental return with damage assessment | E2E        | -         | Visszavétel flow    |
| **P0-022** | Work order creation (munkalap)       | E2E        | -         | Szerviz domain      |
| **P0-023** | POS sale with inventory deduction    | E2E        | -         | Értékesítés domain  |
| **P0-024** | Customer creation with validation    | E2E        | -         | Partner management  |
| **P0-025** | Late fee calculation correct         | API        | -         | ADR-031 requirement |

**Total P0:** ~25 tests

---

### P1 (High)

**Criteria:** Important features + Medium risk (3-4) + Common workflows + Workaround exists but difficult

#### Offline PWA Sync (R-004)

| Test ID    | Requirement                       | Test Level | Risk Link | Notes               |
| ---------- | --------------------------------- | ---------- | --------- | ------------------- |
| **P1-001** | Data available offline after sync | E2E        | R-004     | ServiceWorker cache |
| **P1-002** | Offline changes sync on reconnect | E2E        | R-004     | Background sync API |
| **P1-003** | Conflict shows resolution UI      | E2E        | R-004     | Last-Write-Wins     |
| **P1-004** | Sync status indicator visible     | E2E        | R-004     | UX feedback         |

#### Rental Management

| Test ID    | Requirement                     | Test Level | Risk Link | Notes                |
| ---------- | ------------------------------- | ---------- | --------- | -------------------- |
| **P1-005** | Rental extension (hosszabbítás) | E2E        | -         | ADR-043 self-service |
| **P1-006** | Rental pricing calculation      | API        | -         | ADR-037 formula      |
| **P1-007** | Equipment availability check    | API        | -         | Booking conflict     |
| **P1-008** | Rental contract generation      | E2E        | -         | PDF generation       |
| **P1-009** | Deposit (kaució) refund flow    | E2E        | -         | MyPos refund         |

#### Service Management

| Test ID    | Requirement                        | Test Level | Risk Link | Notes                  |
| ---------- | ---------------------------------- | ---------- | --------- | ---------------------- |
| **P1-010** | Work order status transitions      | API        | -         | State machine          |
| **P1-011** | Warranty claim processing          | E2E        | -         | Makita norma           |
| **P1-012** | Service quote (árajánlat) creation | E2E        | -         | Quote-to-order flow    |
| **P1-013** | Parts inventory for service        | API        | -         | Cross-module inventory |
| **P1-014** | Service priority queue             | API        | -         | ADR-041 requirement    |

#### Inventory Management

| Test ID    | Requirement                      | Test Level | Risk Link | Notes                  |
| ---------- | -------------------------------- | ---------- | --------- | ---------------------- |
| **P1-015** | Goods receipt (bevételezés)      | E2E        | -         | Epic 21 implementation |
| **P1-016** | Stock transfer between locations | API        | -         | BOLTVEZETO permission  |
| **P1-017** | Inventory count (leltár)         | E2E        | -         | ADR-022 barcode        |
| **P1-018** | Low stock alert notification     | API        | -         | Threshold trigger      |

#### User Management

| Test ID    | Requirement                  | Test Level | Risk Link | Notes               |
| ---------- | ---------------------------- | ---------- | --------- | ------------------- |
| **P1-019** | User creation by BOLTVEZETO  | E2E        | R-002     | Permission scope    |
| **P1-020** | User role assignment         | API        | R-002     | RBAC enforcement    |
| **P1-021** | User preferences persistence | API        | -         | ADR-044 requirement |
| **P1-022** | Password reset flow          | E2E        | R-002     | Email verification  |

#### Reporting

| Test ID    | Requirement                   | Test Level | Risk Link | Notes              |
| ---------- | ----------------------------- | ---------- | --------- | ------------------ |
| **P1-023** | Daily sales report generation | API        | -         | ACCOUNTANT role    |
| **P1-024** | Monthly revenue report        | API        | -         | Tenant aggregation |
| **P1-025** | Export to Excel/CSV           | E2E        | -         | File download      |

#### CRM Integration

| Test ID    | Requirement                        | Test Level | Risk Link | Notes                  |
| ---------- | ---------------------------------- | ---------- | --------- | ---------------------- |
| **P1-026** | Partner sync to Twenty CRM         | API        | -         | Epic 28 implementation |
| **P1-027** | CRM dashboard embed                | E2E        | -         | iframe integration     |
| **P1-028** | Support ticket creation (Chatwoot) | E2E        | -         | ADR-015 requirement    |

**...additional P1 tests...**

**Total P1:** ~45 tests

---

### P2 (Medium)

**Criteria:** Secondary features + Low risk (1-2) + Edge cases + Regression prevention

| Test ID    | Requirement                          | Test Level | Risk Link | Notes               |
| ---------- | ------------------------------------ | ---------- | --------- | ------------------- |
| **P2-001** | Empty search returns helpful message | E2E        | -         | UX edge case        |
| **P2-002** | Pagination handles large datasets    | API        | -         | 1000+ records       |
| **P2-003** | Date picker locale (Hungarian)       | E2E        | -         | hu-HU format        |
| **P2-004** | Form validation error messages       | E2E        | -         | Zod schema errors   |
| **P2-005** | Mobile responsive breakpoints        | E2E        | -         | PWA mobile view     |
| **P2-006** | Keyboard navigation (a11y)           | E2E        | -         | Tab order           |
| **P2-007** | Loading states show skeleton         | E2E        | -         | QoE requirement     |
| **P2-008** | Error boundary catches crashes       | E2E        | -         | No white screen     |
| **P2-009** | Feature flag toggle per tenant       | API        | R-009     | Config isolation    |
| **P2-010** | Barcode scanner integration          | E2E        | -         | ADR-022 requirement |
| **P2-011** | QR code generation for rental        | API        | -         | ADR-022 requirement |
| **P2-012** | Employee discount application        | API        | -         | ADR-007 requirement |
| **P2-013** | Zero VAT handling                    | API        | -         | ADR-028 requirement |
| **P2-014** | Vehicle tracking module              | E2E        | -         | ADR-027 requirement |
| **P2-015** | Shopping list widget                 | E2E        | -         | ADR-029 requirement |

**...additional P2 tests...**

**Total P2:** ~35 tests

---

### P3 (Low)

**Criteria:** Nice-to-have + Exploratory + Performance benchmarks + Documentation validation

| Test ID    | Requirement                        | Test Level | Notes                  |
| ---------- | ---------------------------------- | ---------- | ---------------------- |
| **P3-001** | API response time < 200ms (P95)    | k6         | Load test baseline     |
| **P3-002** | 50 concurrent users load test      | k6         | Scalability check      |
| **P3-003** | Database connection pool stability | k6         | Stress test            |
| **P3-004** | Redis cache hit rate > 80%         | k6         | Performance metric     |
| **P3-005** | OpenAPI schema validation          | API        | Documentation accuracy |
| **P3-006** | Koko AI chatbot response           | E2E        | ADR-016 integration    |
| **P3-007** | Print layout rendering             | E2E        | Invoice/receipt print  |
| **P3-008** | Dark mode toggle                   | E2E        | Theme preference       |
| **P3-009** | Multi-language support (future)    | E2E        | i18n preparation       |
| **P3-010** | Accessibility score > 90           | E2E        | axe-core audit         |

**Total P3:** ~15 tests

---

## Execution Strategy

**Philosophy:** Run everything in PRs unless there's significant infrastructure overhead. Playwright with parallelization is extremely fast (100s of tests in ~10-15 min).

**Organized by TOOL TYPE:**

### Every PR: Playwright Tests (~10-15 min)

**All functional tests** (from any priority level):

- All E2E, API, integration tests using Playwright
- Parallelized across 4 shards
- Total: ~105 Playwright tests (P0, P1, P2, P3 minus k6 tests)

**Why run in PRs:** Fast feedback, no expensive infrastructure

**Tag-based execution:**

```bash
# Run only P0 (critical) in PR for speed
npx playwright test --grep @P0

# Run full suite on main merge
npx playwright test

# Run by domain
npx playwright test --grep @Berles
npx playwright test --grep @Szerviz
npx playwright test --grep @Aruhaz
```

### Nightly: k6 Performance Tests (~30-60 min)

**All performance tests** (from any priority level):

- Load, stress, spike tests
- Total: ~10 k6 tests (P3-001 through P3-004)

**Why defer to nightly:** Long-running (10-40 min per test), requires dedicated resources

### Weekly: Chaos & Long-Running (~hours)

**Special infrastructure tests** (from any priority level):

- Multi-region failover (if applicable)
- Database backup restore validation
- Endurance tests (4+ hours runtime)
- Full regression with all browsers

**Why defer to weekly:** Very expensive, infrequent validation sufficient

**Manual tests** (excluded from automation):

- DevOps validation (deployment, monitoring)
- Finance validation (NAV compliance check)
- Documentation review

---

## QA Effort Estimate

**QA test development effort only** (excludes DevOps, Backend, Data Eng work):

| Priority  | Count | Effort Range   | Notes                                           |
| --------- | ----- | -------------- | ----------------------------------------------- |
| P0        | ~25   | ~2-3 weeks     | Complex setup (security, multi-tenant, payment) |
| P1        | ~45   | ~2-3 weeks     | Standard coverage (integration, API tests)      |
| P2        | ~35   | ~1-2 weeks     | Edge cases, simple validation                   |
| P3        | ~15   | ~3-5 days      | Performance scripts, exploratory                |
| **Total** | ~120  | **~6-9 weeks** | **1 QA engineer, full-time**                    |

**With 2 QA engineers:** ~3-5 weeks

**Assumptions:**

- Includes test design, implementation, debugging, CI integration
- Excludes ongoing maintenance (~10% effort)
- Assumes test infrastructure (factories, fixtures) ready

**Dependencies from other teams:**

- See "Dependencies & Test Blockers" section for what QA needs from Backend, DevOps

---

## Appendix A: Playwright Project Structure

**Existing structure (playwright.config.ts):**

```
e2e/
├── fixtures/
│   └── auth.setup.ts          # Auth session setup
├── critical/                   # P0 tests
│   ├── auth.e2e.ts            # Authentication tests
│   ├── rental-checkout.e2e.ts # Rental flow
│   ├── nav-invoice.e2e.ts     # NAV integration
│   └── pages-smoke.e2e.ts     # Smoke tests
├── important/                  # P1 tests (to be created)
│   ├── rental-management.e2e.ts
│   ├── service-workflow.e2e.ts
│   └── inventory-ops.e2e.ts
├── standard/                   # P2 tests
│   └── smoke-test.e2e.ts
└── mobile/                     # Mobile-specific (P2)
    └── pwa-offline.e2e.ts
```

**Tagging Convention:**

```typescript
import { test, expect } from '@playwright/test';

// Priority tags
test('@P0 @Multi-tenant @SEC tenant isolation', async ({ page }) => { ... });
test('@P1 @Berles rental extension', async ({ page }) => { ... });
test('@P2 @UX form validation', async ({ page }) => { ... });

// Domain tags
test('@P0 @Berles @Checkout rental checkout', async ({ page }) => { ... });
test('@P1 @Szerviz @Munkalap work order creation', async ({ page }) => { ... });
test('@P1 @Aruhaz @POS point of sale', async ({ page }) => { ... });

// Risk tags
test('@P0 @SEC @RBAC role boundary test', async ({ page }) => { ... });
test('@P0 @DATA @RLS tenant data isolation', async ({ page }) => { ... });
```

---

## Appendix B: Code Examples

### Multi-Tenant Isolation Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('@P0 @Multi-tenant RLS Isolation', () => {
  test('Tenant A cannot access Tenant B partner', async ({ request }) => {
    // Setup: Create partner in Tenant A
    const partnerData = {
      nev: 'Test Partner A',
      email: 'partner-a@test.com',
    };

    const createResponse = await request.post('/api/partners', {
      data: partnerData,
      headers: { 'X-Tenant-ID': 'tenant-a' },
    });
    expect(createResponse.status()).toBe(201);
    const partner = await createResponse.json();

    // Act: Try to access from Tenant B
    const crossTenantResponse = await request.get(`/api/partners/${partner.id}`, {
      headers: { 'X-Tenant-ID': 'tenant-b' },
    });

    // Assert: Should return 404 (not 403 - don't reveal existence)
    expect(crossTenantResponse.status()).toBe(404);

    // Cleanup
    await request.delete(`/api/partners/${partner.id}`, {
      headers: { 'X-Tenant-ID': 'tenant-a' },
    });
  });
});
```

### RBAC Permission Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('@P0 @SEC @RBAC Permission Boundaries', () => {
  const rolePermissions = [
    { role: 'OPERATOR', canCreate: true, canDelete: false, canTransfer: false },
    { role: 'BOLTVEZETO', canCreate: true, canDelete: true, canTransfer: true },
    { role: 'PARTNER_OWNER', canCreate: true, canDelete: true, canTransfer: true },
  ];

  for (const { role, canCreate, canDelete, canTransfer } of rolePermissions) {
    test(`${role} - create=${canCreate}, delete=${canDelete}`, async ({ request }) => {
      // Authenticate as role
      const authResponse = await request.post('/api/auth/login', {
        data: { email: `${role.toLowerCase()}@test.com`, password: 'test123' },
      });
      const { token } = await authResponse.json();

      // Test create permission
      const createResponse = await request.post('/api/rentals', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          /* rental data */
        },
      });
      expect(createResponse.status()).toBe(canCreate ? 201 : 403);

      // Test delete permission (if applicable)
      if (canCreate) {
        const rental = await createResponse.json();
        const deleteResponse = await request.delete(`/api/rentals/${rental.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        expect(deleteResponse.status()).toBe(canDelete ? 200 : 403);
      }
    });
  }
});
```

### NAV Invoice Integration Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('@P0 @BUS NAV Invoice Integration', () => {
  test('Invoice submitted to NAV successfully', async ({ request }) => {
    // Create invoice
    const invoiceData = {
      partner_id: 'partner-123',
      tetelek: [{ cikk_id: 'cikk-1', mennyiseg: 2, egysegar: 10000 }],
    };

    const createResponse = await request.post('/api/invoices', {
      data: invoiceData,
    });
    expect(createResponse.status()).toBe(201);
    const invoice = await createResponse.json();

    // Submit to NAV
    const navResponse = await request.post(`/api/invoices/${invoice.id}/submit-nav`);
    expect(navResponse.status()).toBe(200);

    const navResult = await navResponse.json();
    expect(navResult.nav_transaction_id).toBeTruthy();
    expect(navResult.status).toBe('SUBMITTED');
  });

  test('NAV failure triggers retry queue', async ({ request }) => {
    // This test requires NAV mock to return failure
    const invoiceId = 'invoice-with-nav-failure';

    const navResponse = await request.post(`/api/invoices/${invoiceId}/submit-nav`);

    // Should return accepted (queued for retry)
    expect(navResponse.status()).toBe(202);

    const result = await navResponse.json();
    expect(result.status).toBe('QUEUED_FOR_RETRY');
    expect(result.retry_count).toBe(1);
  });
});
```

---

## Appendix C: Knowledge Base References

- **Risk Governance**: `risk-governance.md` - Risk scoring methodology
- **Test Priorities Matrix**: `test-priorities-matrix.md` - P0-P3 criteria
- **Test Levels Framework**: `test-levels-framework.md` - E2E vs API vs Unit selection
- **Test Quality**: `test-quality.md` - Definition of Done (no hard waits, <300 lines, <1.5 min)
- **ADR Quality Readiness**: `adr-quality-readiness-checklist.md` - 8-category NFR framework

---

**Generated by:** BMad TEA Agent
**Workflow:** `_bmad/bmm/testarch/test-design`
**Version:** 4.0 (BMad v6)
