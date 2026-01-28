# Test Design for Architecture: KGC ERP v7.0

**Purpose:** Architectural concerns, testability gaps, and NFR requirements for review by Architecture/Dev teams. Serves as a contract between QA and Engineering on what must be addressed before test development begins.

**Date:** 2026-01-26
**Author:** TEA Agent (BMad v6)
**Status:** Architecture Review Pending
**Project:** KGC ERP v7.0
**PRD Reference:** planning-artifacts/prd.md
**ADR Reference:** planning-artifacts/adr/ (46 ADRs)

---

## Executive Summary

**Scope:** System-level test architecture for KGC ERP v7.0 - multi-tenant ERP platform for equipment rental, service management, and retail operations.

**Business Context** (from PRD):

- **Revenue/Impact:** Franchise network with 10+ locations, B2B/B2C mixed model
- **Problem:** Replace legacy ERP with modern, offline-capable, multi-tenant system
- **GA Launch:** Phase 4 implementation complete (32 epics done)

**Architecture** (from ADR-001, ADR-010, ADR-014):

- **Multi-tenancy:** PostgreSQL RLS + schema-per-tenant isolation
- **Module structure:** 25 micro-modules in pnpm monorepo
- **Stack:** NestJS + Prisma + React PWA + shadcn/ui
- **Integrations:** MyPos, Számlázz.hu (NAV), Twenty CRM, Chatwoot, Horilla HR

**Expected Scale** (from ADR):

- 10+ tenant locations, 50+ concurrent users
- 1000+ daily transactions peak
- Offline-first PWA with background sync

**Risk Summary:**

- **Total risks**: 12
- **High-priority (>=6)**: 5 risks requiring immediate mitigation
- **Test effort**: ~120 tests (~3-4 weeks for 1 QA, ~2 weeks for 2 QAs)

---

## Quick Guide

### BLOCKERS - Team Must Decide (Can't Proceed Without)

**Sprint 0 Critical Path** - These MUST be completed before QA can write integration tests:

1. **R-001: Test Data Seeding API** - Provide `/api/test/seed` endpoint for controlled test data creation (recommended owner: Backend)
2. **R-002: Multi-Tenant Test Fixtures** - Create test tenant isolation mechanism for parallel E2E execution (recommended owner: Backend)
3. **R-003: Mock External Services** - Implement mock endpoints for MyPos, Számlázz.hu, Twenty CRM in test environment (recommended owner: Backend)

**What we need from team:** Complete these 3 items in Sprint 0 or test development is blocked.

---

### HIGH PRIORITY - Team Should Validate (We Provide Recommendation, You Approve)

1. **R-004: RLS Bypass for Test Admin** - Recommend test-only superuser that bypasses RLS for data setup (Sprint 0)
2. **R-005: Offline Sync Test Harness** - Recommend ServiceWorker test mode for simulating offline scenarios (Sprint 1)
3. **R-006: NAV Invoice Sandbox** - Confirm Számlázz.hu sandbox environment availability for E2E tests (Sprint 0)

**What we need from team:** Review recommendations and approve (or suggest changes).

---

### INFO ONLY - Solutions Provided (Review, No Decisions Needed)

1. **Test strategy**: 70/20/10 (Unit/Integration/E2E) based on API-first architecture
2. **Tooling**: Playwright for E2E, Vitest for unit/integration, k6 for performance
3. **Tiered CI/CD**: PR (Playwright ~15 min) / Nightly (k6 ~30 min) / Weekly (chaos)
4. **Coverage**: ~120 test scenarios prioritized P0-P3 with risk-based classification
5. **Quality gates**: P0 100%, P1 >=95%, no open high-risk items

**What we need from team:** Just review and acknowledge (we already have the solution).

---

## For Architects and Devs - Open Topics

### Risk Assessment

**Total risks identified**: 12 (5 high-priority score >=6, 4 medium, 3 low)

#### High-Priority Risks (Score >=6) - IMMEDIATE ATTENTION

| Risk ID   | Category | Description                                        | Probability | Impact | Score | Mitigation                          | Owner    | Timeline |
| --------- | -------- | -------------------------------------------------- | ----------- | ------ | ----- | ----------------------------------- | -------- | -------- |
| **R-001** | **DATA** | Cross-tenant data leakage via RLS misconfiguration | 2           | 3      | **6** | RLS policy audit + isolation tests  | Backend  | Sprint 0 |
| **R-002** | **SEC**  | Unauthorized access to elevated operations         | 2           | 3      | **6** | RBAC boundary tests per role level  | Backend  | Sprint 0 |
| **R-003** | **BUS**  | NAV invoice submission failure loses revenue data  | 3           | 3      | **9** | Retry queue + manual fallback tests | Backend  | Sprint 0 |
| **R-004** | **DATA** | Offline sync conflict causes data loss             | 2           | 3      | **6** | Conflict resolution test scenarios  | Frontend | Sprint 1 |
| **R-005** | **SEC**  | MyPos payment token exposure in logs               | 2           | 3      | **6** | Token sanitization verification     | Backend  | Sprint 0 |

#### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description                              | Probability | Impact | Score | Mitigation                | Owner   |
| ------- | -------- | ---------------------------------------- | ----------- | ------ | ----- | ------------------------- | ------- |
| R-006   | PERF     | Response time degradation under load     | 2           | 2      | 4     | Load testing with k6      | DevOps  |
| R-007   | OPS      | Docker deployment fails silently         | 2           | 2      | 4     | Health check validation   | DevOps  |
| R-008   | TECH     | Prisma migration breaks tenant schemas   | 1           | 3      | 3     | Migration test on staging | Backend |
| R-009   | BUS      | Feature flag misconfiguration per tenant | 2           | 2      | 4     | Feature flag matrix tests | Backend |

#### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description                     | Probability | Impact | Score | Action  |
| ------- | -------- | ------------------------------- | ----------- | ------ | ----- | ------- |
| R-010   | OPS      | Log aggregation delay           | 1           | 2      | 2     | Monitor |
| R-011   | TECH     | Redis cache invalidation timing | 1           | 1      | 1     | Monitor |
| R-012   | BUS      | Report generation timeout       | 1           | 2      | 2     | Monitor |

#### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

### Testability Concerns and Architectural Gaps

**ACTIONABLE CONCERNS - Architecture Team Must Address**

#### 1. Blockers to Fast Feedback (WHAT WE NEED FROM ARCHITECTURE)

| Concern                      | Impact                         | What Architecture Must Provide             | Owner   | Timeline |
| ---------------------------- | ------------------------------ | ------------------------------------------ | ------- | -------- |
| **No test data seeding API** | Cannot parallelize E2E tests   | POST /api/test/seed endpoint (dev/staging) | Backend | Sprint 0 |
| **Multi-tenant isolation**   | Tests pollute each other       | Test tenant creation/cleanup mechanism     | Backend | Sprint 0 |
| **External service mocking** | Cannot test offline            | Mock endpoints for MyPos, Számlázz.hu      | Backend | Sprint 0 |
| **RLS context in tests**     | Cannot test as different roles | Test helper to set app.current_tenant_id   | Backend | Sprint 0 |

#### 2. Architectural Improvements Needed (WHAT SHOULD BE CHANGED)

1. **Test Data Factory Support**
   - **Current problem**: No API for creating controlled test data
   - **Required change**: Implement `/api/test/seed` with entity factories
   - **Impact if not fixed**: QA cannot write deterministic tests
   - **Owner**: Backend
   - **Timeline**: Sprint 0

2. **External Service Abstraction**
   - **Current problem**: Direct integration with MyPos/Számlázz.hu
   - **Required change**: Interface abstraction with mock implementations
   - **Impact if not fixed**: Cannot test payment/invoice flows without live services
   - **Owner**: Backend
   - **Timeline**: Sprint 0

3. **Offline Sync Test Mode**
   - **Current problem**: ServiceWorker hard to test
   - **Required change**: Test mode flag to simulate offline scenarios
   - **Impact if not fixed**: Cannot validate offline-first requirements
   - **Owner**: Frontend
   - **Timeline**: Sprint 1

---

### Testability Assessment Summary

**CURRENT STATE - FYI**

#### What Works Well

- API-first design (NestJS + OpenAPI) supports headless test execution
- Playwright already configured with priority-based project structure
- Auth setup fixture exists for session management
- Feature flag system (per-tenant) enables test isolation
- Docker Compose provides reproducible test environment

#### Accepted Trade-offs (No Action Required)

For KGC v7.0 Phase 1, the following trade-offs are acceptable:

- **Plugin isolation**: Twenty CRM/Chatwoot tested via integration, not unit tests
- **Mobile PWA**: Mobile-specific tests deferred to Phase 2
- **Performance baseline**: Initial load tests with synthetic data, not production-like

This is acceptable for Phase 1 and should be revisited post-GA.

---

### Risk Mitigation Plans (High-Priority Risks >=6)

#### R-001: Cross-tenant Data Leakage (Score: 6) - HIGH

**Mitigation Strategy:**

1. Audit all Prisma queries for RLS policy compliance
2. Implement automated RLS boundary tests (Tenant A cannot see Tenant B data)
3. Add tenant_id assertion to all API response schemas

**Owner:** Backend
**Timeline:** Sprint 0
**Status:** Planned
**Verification:** E2E test suite with multi-tenant scenarios

---

#### R-002: Unauthorized Elevated Access (Score: 6) - HIGH

**Mitigation Strategy:**

1. Create RBAC permission matrix test suite (7 role levels x N operations)
2. Test elevated access re-authentication (5-minute timeout)
3. Verify permission denial returns 403, not 401

**Owner:** Backend
**Timeline:** Sprint 0
**Status:** Planned
**Verification:** API tests for each role/permission combination

---

#### R-003: NAV Invoice Submission Failure (Score: 9) - CRITICAL

**Mitigation Strategy:**

1. Implement BullMQ retry queue for failed NAV submissions
2. Create manual fallback mechanism with admin notification
3. Test retry logic with simulated NAV failures

**Owner:** Backend
**Timeline:** Sprint 0
**Status:** Planned
**Verification:** Integration tests with NAV sandbox + failure injection

---

#### R-004: Offline Sync Data Loss (Score: 6) - HIGH

**Mitigation Strategy:**

1. Document conflict resolution rules (Last-Write-Wins per ADR-002)
2. Implement sync conflict detection logging
3. Create E2E tests for offline-to-online transition scenarios

**Owner:** Frontend
**Timeline:** Sprint 1
**Status:** Planned
**Verification:** PWA tests with network interception

---

#### R-005: MyPos Token Exposure (Score: 6) - HIGH

**Mitigation Strategy:**

1. Audit all log statements for PCI-DSS compliance
2. Implement token sanitization in logger middleware
3. Verify no sensitive data in error responses

**Owner:** Backend
**Timeline:** Sprint 0
**Status:** Planned
**Verification:** Security tests scanning logs for token patterns

---

### Assumptions and Dependencies

#### Assumptions

1. Számlázz.hu sandbox environment is available for NAV invoice testing
2. MyPos test credentials can be used for payment flow E2E tests
3. Test tenant data can be isolated and cleaned up between test runs
4. CI/CD has access to Docker services (PostgreSQL, Redis)

#### Dependencies

1. Test data seeding API - Required by Sprint 0 start
2. Mock service implementations - Required by Sprint 0 start
3. Playwright configuration updates - Required by Sprint 0 Week 2
4. k6 performance scripts - Required by Sprint 1

#### Risks to Plan

- **Risk**: NAV sandbox unavailable
  - **Impact**: Cannot test invoice integration
  - **Contingency**: Use recorded HAR responses as mock

- **Risk**: MyPos test credentials expire
  - **Impact**: Cannot test payment flows
  - **Contingency**: Mock payment gateway responses

---

**End of Architecture Document**

**Next Steps for Architecture Team:**

1. Review Quick Guide (BLOCKERS/HIGH PRIORITY/INFO ONLY) and prioritize blockers
2. Assign owners and timelines for high-priority risks (>=6)
3. Validate assumptions and dependencies
4. Provide feedback to QA on testability gaps

**Next Steps for QA Team:**

1. Wait for Sprint 0 blockers to be resolved
2. Refer to companion QA doc (test-design-qa.md) for test scenarios
3. Begin test infrastructure setup (factories, fixtures, environments)
