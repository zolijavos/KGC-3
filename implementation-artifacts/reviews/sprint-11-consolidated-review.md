# Sprint 11 Consolidated Code Review

**Epics Reviewed:** Epic 48 (Bérlési Dashboard), Epic 49 (Szerviz Statisztikák)
**Reviewer:** Claude Opus 4.5 (BMAD Adversarial)
**Date:** 2026-02-11

## Summary

| Severity         | Count |
| ---------------- | ----- |
| **Critical (H)** | 3     |
| **Medium (M)**   | 5     |
| **Low (L)**      | 4     |
| **Total**        | 12    |

---

## Critical Issues (H)

### H1: Missing Authentication Guards on All Dashboard Endpoints

- **File:** `apps/kgc-api/src/modules/dashboard/service/service.controller.ts:35-152`
- **File:** `apps/kgc-api/src/modules/dashboard/rental/rental-dashboard.controller.ts:24-72`
- **Issue:** All dashboard endpoints are exposed without authentication. The TODO comments mention adding JwtAuthGuard + RolesGuard "when auth module integrated", but these controllers are currently deployed without any protection.
- **Impact:** Critical data exposure vulnerability. Financial and operational metrics are publicly accessible.
- **Fix:** Add `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('STORE_MANAGER', 'ADMIN')` decorators.
- **Status:** ✅ FIXED

---

### H2: Potential Path Manipulation via Unescaped Equipment ID

- **File:** `apps/kgc-web/src/features/dashboard/components/ServiceHistoryModal.tsx:110`
- **Issue:** The `equipmentId` prop is directly interpolated into the API URL without sanitization.
- **Impact:** Potential API path manipulation if equipmentId comes from user-controlled data.
- **Fix:** Use `encodeURIComponent(equipmentId)` before URL interpolation.
- **Status:** ✅ FIXED

---

### H3: parseInt Without NaN Validation in Controller

- **File:** `apps/kgc-api/src/modules/dashboard/rental/rental-dashboard.controller.ts:52-53, 69`
- **Issue:** The controller uses `parseInt(limit, 10)` without checking for NaN results.
- **Impact:** Could cause unexpected behavior or database errors with production data.
- **Fix:** Add fallback validation: `Number.isNaN(parsedLimit) ? 5 : Math.min(parsedLimit, 20)`.
- **Status:** ✅ FIXED

---

## Medium Issues (M)

### M1: Missing Error Boundary in Widget Components

- **Files:** `RentalStatsWidget.tsx`, `PopularEquipmentWidget.tsx`, `SeasonalityChartWidget.tsx`
- **Issue:** Widgets handle API errors gracefully, but unexpected render exceptions will crash the entire dashboard.
- **Impact:** A single widget error could crash the entire dashboard.
- **Fix:** Wrap widgets with React Error Boundary component.
- **Status:** DEFERRED (Phase 2)

---

### M2: Missing ARIA Labels in TrendSparkline

- **File:** `apps/kgc-web/src/features/dashboard/widgets/WarrantyRatioWidget.tsx:81-112`
- **Issue:** The `TrendSparkline` component lacks `role="img"` and `aria-label`.
- **Impact:** Widget is not accessible to screen reader users (WCAG 2.1 violation).
- **Fix:** Add `role="img"` and `aria-label` describing the chart content.
- **Status:** DEFERRED (Phase 2)

---

### M3: Inconsistent Hungarian Accents in UI Text

- **Files:** `RecurringIssuesWidget.tsx`, `ServiceHistoryModal.tsx`
- **Issue:** Inconsistent use of Hungarian accented characters.
- **Impact:** Inconsistent user experience.
- **Fix:** Use proper Hungarian accents consistently or leverage `@kgc/i18n`.
- **Status:** DEFERRED (i18n Epic)

---

### M4: Magic Numbers Without Named Constants

- **Files:** Multiple service and widget files
- **Issue:** Various magic numbers: `MAX_CAPACITY = 5`, `refetchInterval: 300_000`, etc.
- **Impact:** Hard to maintain and modify thresholds consistently.
- **Fix:** Define constants in a shared configuration file.
- **Status:** DEFERRED (Tech Debt)

---

### M5: PDF Export Missing Error Handling

- **File:** `apps/kgc-web/src/hooks/use-pdf-export.ts:109-231`
- **Issue:** The `exportToPdf` function silently catches errors.
- **Impact:** User gets no feedback when export fails.
- **Fix:** Add proper error handling and rethrow or return error state.
- **Status:** DEFERRED (Phase 2)

---

## Low Issues (L)

### L1: Duplicate formatCurrency Function

- **Files:** 4+ widget and component files
- **Issue:** Same `formatCurrency` function duplicated across multiple files.
- **Fix:** Extract to shared utility.
- **Status:** DEFERRED (Tech Debt)

### L2: Unused \_days Parameter

- **File:** `recurring-issues.service.ts:344`
- **Issue:** The `_days` parameter is documented but ignored in mock implementation.
- **Status:** KNOWN (Mock data MVP)

### L3: Math.random() in Mock Data

- **File:** `rental-dashboard.service.ts:161`
- **Issue:** API uses `Math.random()` making responses non-deterministic.
- **Status:** KNOWN (Mock data MVP)

### L4: Missing Test Files

- **Files:** Some widget components
- **Issue:** No dedicated unit tests.
- **Status:** Partially addressed (132 tests exist)

---

## Test Coverage Summary

| Category            | Tests   |
| ------------------- | ------- |
| Frontend widgets    | 45      |
| Export hooks        | 24      |
| Backend services    | 55      |
| Backend controllers | 8       |
| **Total**           | **132** |

---

## Action Summary

### Fixed (H1, H2, H3):

- Auth guards added to controllers
- encodeURIComponent for equipmentId
- NaN validation for parseInt

### Deferred (M1-M5, L1-L4):

- Error boundaries
- ARIA labels
- Hungarian accents
- Magic numbers
- PDF error handling
- Utility consolidation

---

**Készítette:** BMAD Adversarial Code Review Agent
