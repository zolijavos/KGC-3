# ADR-024: Hibrid Test Stratégia (TDD/ATDD/Hagyományos)

## Státusz

**JAVASOLT** - 2026. január 1.

## Kontextus

A KGC ERP v7.0 egy komplex SaaS B2B platform **72 Functional Requirement-tel**, multi-tenant architektúrával, kritikus external integrációkkal (NAV, MyPos, Gemini AI), és szigorú quality attribute követelményekkel (NFR-P1-DR5).

### Probléma

Különböző feature típusok **különböző test approach-okat** igényelnek optimális coverage, team productivity és quality biztosításához:

**Business Logic Features:**
- FR12: Bérlési díj kalkuláció (napi/heti/30 nap)
- FR15: Késedelmi díj automatikus számítás
- FR41: Transaction metering (billing calculation)
- FR43-FR48: RBAC permission enforcement

→ **Precision kell**, edge case coverage, refactoring confidence → **TDD ideális**

**Critical User Workflows:**
- FR1-FR10: Kata journey (árumozgatás rögzítés < 30 sec)
- FR30-FR36: Anna journey (franchise onboarding < 15 perc)
- FR11-FR21: Bérlés E2E workflow (kiadás/visszavétel)
- FR56-FR59: NAV/MyPos payment integration

→ **User acceptance criteria explicit**, regression prevention → **ATDD ideális**

**UI Components & CRUD:**
- FR37-FR38: Partner dashboard widgets (revenue analytics, transaction count)
- FR22-FR23: Értékesítési tranzakció rögzítés (inventory auto-update)
- FR8: Warehouse config builder (K-P-D hierarchy setup)

→ **Rapid iteration kell**, UI flux, lower risk → **Hagyományos (code-first) elég**

### Üzleti Impact

**Miért számít a test approach választás:**

1. **User Journey Success Criteria:** Kata, László, Péter, Anna journey-k **mérhető targets**-szel (10x, 96x gyorsítások) → ATDD biztosítja acceptance criteria teljesülését
2. **Compliance Risk:** NAV számla, GDPR, PCI DSS, Audit trail → TDD/ATDD minimalizálja regression risk-et critical path-okon
3. **Team Productivity:** Nem minden feature igényel TDD/ATDD overhead → hibrid approach optimalizálja velocity-t

---

## Döntés

Feladattól függő **hibrid test stratégia** három approach kombinálásával:

### 1. TDD (Test-Driven Development) - Red-Green-Refactor

**Mikor használjuk:**

✅ **Business Logic:**
- FR12: Bérlési díj kalkuláció (edge cases: napi/heti/30 nap váltás, overtime calculations)
- FR15: Késedelmi díj számítás (boundary conditions: 1 nap késés, 30+ nap késés, hétvége)
- FR41: Transaction metering & billing aggregálás (tier boundaries: 100 vs 101 transaction)
- FR31: RLS schema provisioning (tenant isolation logic)

✅ **Permission Logic:**
- FR43-FR48: RBAC enforcement (permission matrix: pénztáros vs admin vs partner vs DevOps)
- FR44: Partner scope filtering (RLS policy validation logic)
- FR69: Cross-tenant isolation enforcement

✅ **Data Transformations:**
- FR32: K-P-D hierarchy generation (warehouse config → location code mapping)
- FR23: Inventory quantity reduction (sales transaction → stock update atomicity)
- FR66: Audit trail JSON diff generation (before/after state changes)

**TDD Workflow:**
```javascript
// 1. RED: Write failing test first
describe('FR12: Bérlési díj kalkuláció', () => {
  it('30 nap bérlés, 3 nap késés = +3 nap díj', () => {
    const rental = { days: 30, dailyFee: 1000, returnDate: '2026-02-03', dueDate: '2026-01-31' };
    const result = calculateRentalFee(rental);
    expect(result.lateFee).toBe(3000); // 3 nap × 1000 Ft
  });
});

// 2. GREEN: Implement minimal code to pass
function calculateRentalFee(rental) {
  const lateDays = calculateLateDays(rental.returnDate, rental.dueDate);
  return { lateFee: lateDays * rental.dailyFee };
}

// 3. REFACTOR: Improve implementation
function calculateRentalFee(rental) {
  const lateDays = Math.max(0, daysBetween(rental.returnDate, rental.dueDate));
  return {
    baseFee: rental.days * rental.dailyFee,
    lateFee: lateDays * rental.dailyFee,
    totalFee: (rental.days + lateDays) * rental.dailyFee
  };
}
```

**Miért TDD ezen feature-ekhez:**
- Precision critical (billing error = revenue loss vagy compliance issue)
- Edge cases complex (boundary conditions, timezone, rounding)
- Refactoring frequent (business rule változások)
- Regression risk high (díj kalkuláció bug → minden bérlés érintett)

---

### 2. ATDD (Acceptance Test-Driven Development) - BDD Cucumber/Gherkin

**Mikor használjuk:**

✅ **Critical User Workflows (User Journey-ből):**
- FR1-FR10: Kata journey - Árumozgatás rögzítés workflow
- FR30-FR36: Anna journey - Franchise onboarding wizard
- FR4-FR5: László journey - Multi-warehouse inventory lookup
- FR37-FR38: Péter journey - Partner revenue dashboard

✅ **E2E Flows:**
- FR11-FR21: Bérlés kiadás/visszavétel teljes flow
- FR17-FR21: Szerviz munkalap lifecycle (létrehozás → feldolgozás → lezárás)
- FR22-FR24: Értékesítés + NAV számla kiállítás flow

✅ **Integration Workflows:**
- FR56-FR59: NAV API + MyPos payment integration E2E
- FR49-FR52: Koko chatbot + Chatwoot escalation flow
- FR30-FR36: Franchise onboarding (RLS schema creation + email notification)

**ATDD Workflow (Playwright + Gherkin style):**
```gherkin
# Feature: FR1-FR10 - Kata Journey: Árumozgatás rögzítés < 30 sec
# User Story: "Kata (pénztáros) 8 gépet 3 perc alatt raktároz (korábban 40 perc)"

Feature: Árumozgatás rögzítés (Kata Journey)
  Mint pénztáros
  Szeretném gyorsan rögzíteni a visszahozott gépek raktári helyét
  Hogy kevesebb mint 30 másodperc alatt végezzek egy géppel

  Background:
    Given be vagyok jelentkezve mint "Kata (pénztáros)"
    And van 8 db visszahozott bérgép (serial number: "BOSCH-001" - "BOSCH-008")

  Scenario: Egy gép raktározása vonalkód scannel
    When beolvasom a vonalkódot "BOSCH-001"
    And megjelenik a K-P-D beviteli mező
    And begépelem a helykódot "K2-P5-D3"
    And megnyomom az Enter billentyűt
    Then a rendszer automatikusan elmenti (auto-save, nincs Save gomb)
    And megjelenik a "Mentve" toast notification
    And a művelet időtartama < 30 másodperc

  Scenario: 8 gép raktározása összesen < 3 perc
    Given az árumozgatás rögzítés workflow aktív
    When rögzítem az összes 8 gépet egyenként
    Then az összes művelet időtartama < 180 másodperc
    And minden gép inventory státusza "available"
    And minden gép K-P-D kódja helyesen rögzített
```

**Playwright Test Implementation:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('FR1-FR10: Árumozgatás rögzítés (Kata Journey)', () => {
  test('Egy gép raktározása < 30 sec', async ({ page }) => {
    const startTime = Date.now();

    // Given: Login as Kata
    await page.goto('/login');
    await page.fill('[name="email"]', 'kata@kgc.hu');
    await page.fill('[name="password"]', 'test123');
    await page.click('button[type="submit"]');

    // When: Scan barcode
    await page.goto('/inventory/movement');
    await page.fill('[name="barcode"]', 'BOSCH-001');
    await page.waitForSelector('[name="location-code"]'); // K-P-D field appears

    // And: Enter K-P-D code
    await page.fill('[name="location-code"]', 'K2-P5-D3');
    await page.press('[name="location-code"]', 'Enter');

    // Then: Auto-save + toast notification
    await expect(page.locator('.toast')).toContainText('Mentve');

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // seconds

    expect(duration).toBeLessThan(30); // NFR-P1: < 30 sec
  });
});
```

**Miért ATDD ezen feature-ekhez:**
- User acceptance criteria explicit (< 30 sec, < 15 perc targets)
- User journey-ből validated (Kata, Anna, László, Péter stories)
- Regression prevention critical (workflow breaking = user productivity loss)
- BDD collaboration (PM-UX-Dev-QA közös acceptance criteria)

---

### 3. Hagyományos (Code-First, Test-After)

**Mikor használjuk:**

✅ **UI Components (nem critical path):**
- FR37-FR38: Partner dashboard widgets (revenue chart, transaction count card)
- FR8: Warehouse config builder UI (polc/doboz hozzáadás form)
- FR5: Inventory search filters (serial number, status dropdown)

✅ **Simple CRUD (alacsony kockázat):**
- FR22: Sales transaction creation (inventory item select + quantity input)
- FR17: Service work order creation (equipment select + problem description textarea)
- FR42: User account creation (basic form validation)

✅ **Admin Functions (low frequency):**
- FR34: Pricing tier assignment (DevOps admin one-time action)
- FR35: Bulk user import (CSV upload + parse + validate)
- FR8: K-P-D warehouse structure configuration

**Hagyományos Workflow:**
```typescript
// 1. Implement feature first
function PartnerDashboard({ partnerId }) {
  const { data: revenue } = useRevenue(partnerId);
  const { data: transactions } = useTransactionCount(partnerId);

  return (
    <div className="dashboard">
      <RevenueChart data={revenue} />
      <TransactionCountCard count={transactions} />
    </div>
  );
}

// 2. Write tests after (coverage-driven)
describe('PartnerDashboard', () => {
  it('renders revenue chart with data', () => {
    const mockRevenue = [{ date: '2026-01', amount: 100000 }];
    render(<PartnerDashboard partnerId="p1" />);
    expect(screen.getByRole('img', { name: /revenue chart/i })).toBeInTheDocument();
  });

  it('renders transaction count card', () => {
    render(<PartnerDashboard partnerId="p1" />);
    expect(screen.getByText(/47 bérlés/i)).toBeInTheDocument();
  });
});
```

**Miért Hagyományos ezen feature-ekhez:**
- UI rapid iteration (design változások gyakori feedback alapján)
- Lower business risk (dashboard widget bug ≠ revenue loss)
- Visual regression testing elég (Chromatic snapshot tests)
- Test-after gyorsabb (UI flux, refactoring frequent)

---

## Decision Matrix (Feature Type → Test Approach Mapping)

| Feature Type | FR Példák | Test Approach | Indoklás |
|--------------|-----------|---------------|----------|
| **Billing & Pricing Logic** | FR12, FR15, FR41 | **TDD** | Precision critical, revenue impact, edge cases |
| **Permission & Security** | FR43-FR48, FR69 | **TDD** | Security bug = compliance breach, isolation critical |
| **Critical User Workflows** | FR1-FR10, FR30-FR36 | **ATDD** | User journey targets (< 30s, < 15min), acceptance criteria |
| **E2E Integration Flows** | FR11-FR21, FR56-FR59 | **ATDD** | Multi-step flows, external API dependencies, regression risk |
| **UI Components (non-critical)** | FR37-FR38, FR8 | **Hagyományos** | Rapid iteration, visual testing, lower risk |
| **Simple CRUD** | FR22, FR17, FR42 | **Hagyományos** | Low complexity, standard patterns, coverage-driven |
| **Admin Functions** | FR34, FR35 | **Hagyományos** | Low frequency, manual validation possible |

---

## Implementation Guidelines

### Test Framework Stack (testarch-framework workflow)

**TDD Stack:**
- **Unit Testing:** Jest (Node.js backend), Vitest (frontend Vite projektek)
- **Mocking:** jest.mock(), MSW (Mock Service Worker - API mocking)
- **Coverage:** Istanbul (nyc) - target: 80%+ coverage critical business logic

**ATDD Stack:**
- **E2E Testing:** Playwright (cross-browser, multi-language support)
- **BDD Framework:** Playwright Test (Gherkin-style test descriptions)
- **Visual Regression:** Playwright screenshots + Chromatic
- **API Testing:** Playwright API testing (NAV/MyPos/Gemini integration tests)

**Hagyományos Stack:**
- **Component Testing:** React Testing Library / Vue Test Utils
- **Snapshot Testing:** Jest snapshots (UI component regression)
- **Visual Testing:** Chromatic (Storybook-based visual regression)

### Story-Level Decision Process (Sprint Planning)

**Minden story-nál (dev-story workflow):**

1. **Story típus azonosítás:**
   - Business logic? → **TDD**
   - User journey critical? → **ATDD**
   - UI component / CRUD? → **Hagyományos**

2. **Acceptance Criteria check:**
   - Van mérhető target (< 30 sec, < 15 perc)? → **ATDD** (user journey validation)
   - Edge case heavy (díj kalkuláció, permission logic)? → **TDD** (precision)
   - Visual/UX driven? → **Hagyományos** (rapid iteration)

3. **Dokumentáció story file-ban:**
   ```markdown
   ## Test Approach: ATDD

   **Rationale:** Critical user workflow (Kata journey), acceptance criteria < 30 sec, regression risk high

   **Test Strategy:**
   - Playwright E2E test (full workflow árumozgatás rögzítés)
   - Performance assertion (duration < 30 sec)
   - User journey scenario coverage (vonalkód scan → K-P-D bevitel → auto-save)
   ```

### Code Review Validation

**PR checklist item:**
- [ ] Test approach documented (TDD/ATDD/Hagyományos)
- [ ] Test approach justified (decision matrix alapján)
- [ ] Tests exist BEFORE merge (TDD: unit tests, ATDD: E2E tests, Hagyományos: coverage tests)
- [ ] Acceptance criteria coverage validated (ATDD story-knál Gherkin scenario)

---

## Consequences

### Positive

✅ **Optimális Test Coverage:**
- Business logic: 80%+ unit test coverage (TDD)
- Critical workflows: 100% E2E coverage (ATDD)
- UI components: Visual regression + basic interaction tests (Hagyományos)

✅ **Team Productivity:**
- Nem minden feature igényel TDD/ATDD overhead
- Rapid iteration UI-on (hagyományos approach)
- Focus on high-risk features (TDD/ATDD)

✅ **Flexibility:**
- Új feature type → új decision (decision matrix bővíthető)
- Adaptálható project phase-hez (MVP: több hagyományos, Production: több TDD/ATDD)

✅ **Quality Assurance:**
- Critical path-ok védettek (ATDD user journey tests)
- Business logic precision (TDD edge case coverage)
- Regression prevention (acceptance tests minden release előtt)

### Negative

⚠️ **Learning Curve:**
- Team-nek tudnia kell mindhárom approach-ot
- Test framework stack komplexebb (Jest + Playwright + RTL/VTU)

⚠️ **Decision Overhead:**
- Minden story-nál dönteni kell approach-ról
- Code review-ban validálni kell consistency-t

⚠️ **Test Maintenance:**
- E2E tests fragile (UI change → test update)
- TDD refactoring time (business rule change → update tests first)

---

## Mitigation Strategies

**Learning Curve:**
- Test Architecture workflow (`testarch-framework`) setup: framework + fixtures + helper functions
- Pair programming (senior TDD/ATDD mentor)
- Test strategy workshop (1 nap team training)

**Decision Overhead:**
- Decision matrix cheat sheet (wiki/Confluence dokumentáció)
- Sprint planning template (test approach field mandatory)
- Automated PR check (test approach documented?)

**Test Maintenance:**
- Page Object Model pattern (Playwright - UI change encapsulation)
- Test utilities library (reusable helpers, fixtures)
- Regular test review (refactor brittle tests sprint retrospective-ben)

---

## Alternatives Considered

### Alternative 1: Tisztán TDD (minden feature-hez)

**Pros:** Maximum coverage, precision mindenhol
**Cons:** Overhead UI rapid iteration-nél, team velocity csökkenés
**Rejected:** Nem cost-effective non-critical features-nél

### Alternative 2: Tisztán ATDD (minden feature-hez E2E tests)

**Pros:** User acceptance garantált, BDD collaboration
**Cons:** E2E tests slow (suite runtime hours), fragile (UI change → mass test update)
**Rejected:** Nem skálázodik 72 FR-hez (túl sok E2E test)

### Alternative 3: Tisztán Hagyományos (code-first mindenhol)

**Pros:** Maximum velocity, egyszerű (egy approach)
**Cons:** Business logic bugs (díj kalkuláció hiba), regression risk critical workflows-on
**Rejected:** Quality risk túl magas (compliance, revenue impact)

---

## References

### PRD Requirements (Source of Truth)

**Functional Requirements (FR1-FR72):**
- [prd.md - Functional Requirements](../../../prd.md#functional-requirements)

**User Journeys (Acceptance Criteria):**
- Kata Journey (FR1-FR10): Árumozgatás rögzítés < 30 sec (NFR-P1)
- László Journey (FR4-FR5): Inventory lookup < 5 sec (NFR-P2)
- Anna Journey (FR30-FR36): Franchise onboarding < 15 perc (NFR-P4)
- Péter Journey (FR37-FR38): Real-time revenue dashboard

**Non-Functional Requirements (NFR-P1-DR5):**
- Performance: Response time targets (NFR-P1-P8)
- Security: RLS isolation, encryption (NFR-S1-S11)
- Reliability: 99% uptime, fallback workflows (NFR-R1-R9)

### Related ADRs

- [ADR-001: Franchise Multi-Tenant Architektúra](ADR-001-franchise-multitenancy.md) → RLS isolation testing (TDD approach)
- [ADR-006: Audit Trail Immutable Logging](ADR-006-audit-trail.md) → Audit log validation (TDD unit tests)
- [ADR-016: Koko AI Chatbot](ADR-016-ai-chatbot-koko.md) → Chatbot flow testing (ATDD E2E + Gemini API mock)

### BMad Method Workflows

**Test Architecture Workflows:**
- `/bmad:bmm:workflows:testarch-test-design` - Epic-level test planning (decision matrix application)
- `/bmad:bmm:workflows:testarch-atdd` - ATDD red-green-refactor cycle (Playwright E2E tests)
- `/bmad:bmm:workflows:testarch-framework` - Test framework setup (Jest/Vitest/Playwright)
- `/bmad:bmm:workflows:testarch-automate` - Test automation expansion (coverage improvement)
- `/bmad:bmm:workflows:testarch-trace` - Requirements-to-tests traceability matrix

---

## Implementation Timeline

### Phase 1: MVP (90-120 nap)

**Setup:**
- Week 1: Test framework setup (`testarch-framework` workflow)
  - Jest (backend unit tests)
  - Playwright (E2E tests)
  - React Testing Library (component tests)

**Test Strategy Application:**
- ATDD: Critical user workflows (Kata, Anna journey) - 10-15 E2E tests
- TDD: Business logic (billing, permissions) - 50+ unit tests
- Hagyományos: UI components, CRUD - coverage-driven tests

**Target Coverage:**
- Critical business logic: 80%+ unit test coverage
- User journey workflows: 100% E2E coverage
- Overall code coverage: 70%+

### Phase 2: AI Extended + CRM (120-180 nap post-MVP)

**Expansion:**
- ATDD: AI Extended workflows (OCR, Vision, Email parsing) - 5-10 E2E tests
- TDD: AI quota limit enforcement logic - unit tests
- Hagyományos: CRM plugin UI - component tests

### Phase 3: Enterprise Compliance (180-240 nap post-MVP)

**Compliance Testing:**
- ATDD: Compliance workflows (ISO 27001, PCI DSS audit scenarios)
- TDD: Security & compliance logic (advanced encryption, access control)
- Load testing: Scalability NFR validation (10k+ transaction/hó)

---

## Decision Log

| Dátum | Verzió | Változás | Indoklás |
|-------|--------|----------|----------|
| 2026-01-01 | 1.0 | Kezdeti ADR létrehozás | PRD elkészülte után test strategy dokumentálás |

---

## Approval

**Status:** JAVASOLT (Pending Architecture workflow során validation)

**Next Steps:**
1. Architecture workflow során review + approval
2. Test Architecture workflow (`testarch-framework`) setup
3. Sprint Planning template update (test approach field)
4. Team training workshop (TDD/ATDD/Hibrid approach)

---

*ADR maintained by: Javo (Product Owner) + BMad Method PM Agent*
*Last updated: 2026-01-01*
