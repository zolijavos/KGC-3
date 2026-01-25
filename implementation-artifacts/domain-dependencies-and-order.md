# KGC ERP - Domain Dependencies & Implementation Order

> **Created:** 2026-01-23
> **Status:** Master Planning Document
> **Phase:** BMAD Phase 4 - Implementation

---

## Executive Summary

This document defines the dependencies between all major domains and the recommended implementation order. The project has 4 main business domains plus supporting domains, with a total of **~950 unit tests** already passing in the service layer.

### Domain Overview

| Domain                  | Packages | Unit Tests | Service Layer | Repository Layer | API Layer |
| ----------------------- | -------- | ---------- | ------------- | ---------------- | --------- |
| **Inventory**           | 1        | 221        | ✅ 100%       | 🟡 20%           | 🟡 20%    |
| **Bérlés (Rental)**     | 4        | 294        | ✅ 100%       | 🔴 0%            | 🔴 0%     |
| **Szerviz (Service)**   | 5        | 201        | 🟡 60%        | 🔴 0%            | 🔴 0%     |
| **Értékesítés (Sales)** | 10       | 241+       | 🟡 60%        | 🔴 0%            | 🔴 0%     |
| **TOTAL**               | 20       | **~950**   |               |                  |           |

---

## Domain Dependency Graph

```
                    ┌──────────────┐
                    │   Partner    │
                    │   Domain     │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  Inventory │  │   Rental   │  │   Sales    │
    │   Domain   │  │   Domain   │  │   Domain   │
    └─────┬──────┘  └──────┬─────┘  └──────┬─────┘
          │                │               │
          │         ┌──────┴───────┐       │
          │         │              │       │
          │         ▼              │       │
          │  ┌────────────┐        │       │
          └─►│  Service   │◄───────┘       │
             │   Domain   │                │
             └──────┬─────┘                │
                    │                      │
                    └──────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    NAV       │
                    │ Integration  │
                    └──────────────┘
```

---

## Dependency Matrix

### What Each Domain DEPENDS ON (requires first)

| Domain        | Depends On                  | Why                                 |
| ------------- | --------------------------- | ----------------------------------- |
| **Inventory** | Partner (optional)          | Supplier tracking                   |
| **Rental**    | Partner, Inventory          | Customer + equipment links          |
| **Service**   | Partner, Inventory          | Customer + parts                    |
| **Sales**     | Partner, Inventory, Service | Customer + stock + worksheet quotes |

### What Each Domain BLOCKS (must complete first)

| Domain        | Blocks                 | Why                           |
| ------------- | ---------------------- | ----------------------------- |
| **Partner**   | ALL domains            | Customer/supplier master data |
| **Inventory** | Rental, Service, Sales | Stock management              |
| **Rental**    | Service (partial)      | Rental damage → worksheet     |
| **Service**   | Sales (partial)        | Worksheet → quote → invoice   |

---

## Recommended Implementation Order

### Phase 0: Foundation (Already Done)

- ✅ Authentication (@kgc/auth)
- ✅ Users (@kgc/users)
- ✅ Tenant management

### Phase 1: Core Infrastructure (CRITICAL PATH)

#### Sprint 1.1: Inventory Completion

```
Priority: P0 (Blocking)
Duration: Focus sprint
Stories: INV-S1 → INV-S8

┌─────────────────────────────────────────────────────────┐
│ Complete Inventory Module                               │
├─────────────────────────────────────────────────────────┤
│ ✅ Service Layer: 221 tests passing                     │
│ ⬜ INV-S1: Prisma schema (3 new models, 3 extensions)  │
│ ⬜ INV-S2-S5: 4 repositories (48 methods)              │
│ ⬜ INV-S6-S7: 4 controllers + module                    │
│ ⬜ INV-S8: E2E tests                                    │
└─────────────────────────────────────────────────────────┘
```

**Why First:** All other domains need inventory for stock management.

#### Sprint 1.2: Partner Domain (NEW - Not yet analyzed)

```
Priority: P0 (Blocking)
Duration: 1 sprint
Needed: Partner CRUD, address book, tax info

┌─────────────────────────────────────────────────────────┐
│ Create Partner Module                                   │
├─────────────────────────────────────────────────────────┤
│ ⬜ Prisma schema: Partner, Address, Contact             │
│ ⬜ Repository: PrismaPartnerRepository                  │
│ ⬜ Controller: PartnerController                        │
│ ⬜ Integration: Twenty CRM sync                         │
└─────────────────────────────────────────────────────────┘
```

**Why:** All business transactions reference partners.

---

### Phase 2: Revenue Domains (PARALLEL)

Once Inventory and Partner are complete, these can be worked in parallel:

#### Sprint 2.1: Rental Domain

```
Priority: P1 (Revenue Critical)
Duration: 2 sprints
Stories: RNT-S1 → RNT-S11

┌─────────────────────────────────────────────────────────┐
│ Complete Rental Module                                  │
├─────────────────────────────────────────────────────────┤
│ ✅ Service Layer: 294 tests passing                     │
│ ⬜ RNT-S1-S3: Prisma schema (12+ models)               │
│ ⬜ RNT-S4-S7: 5 repositories                            │
│ ⬜ RNT-S8-S10: 5 controllers + module                   │
│ ⬜ RNT-S11: E2E tests                                   │
└─────────────────────────────────────────────────────────┘
```

#### Sprint 2.2: Sales Core (Invoice + POS)

```
Priority: P1 (Revenue Critical)
Duration: 2 sprints
Stories: SLS-S1-S2, SLS-S5-S7, SLS-S11-S12, SLS-S14

┌─────────────────────────────────────────────────────────┐
│ Sales Core (Invoice + POS)                              │
├─────────────────────────────────────────────────────────┤
│ ✅ Service Layer: 216 tests (invoice), 10+ tests (POS)  │
│ ⬜ SLS-S1-S2: Prisma schema                             │
│ ⬜ SLS-S5-S7: Invoice, Quote, POS repositories          │
│ ⬜ SLS-S11-S12: Controllers                             │
│ ⬜ SLS-S14: Module registration                         │
└─────────────────────────────────────────────────────────┘
```

---

### Phase 3: Service Domain

After Rental and Sales Core, Service can integrate with both:

```
Priority: P1 (Core Business)
Duration: 2 sprints
Stories: SRV-S1 → SRV-S12

┌─────────────────────────────────────────────────────────┐
│ Complete Service Module                                 │
├─────────────────────────────────────────────────────────┤
│ ✅ Service Layer: 201 tests passing                     │
│ ⬜ SRV-S1-S3: Prisma schema                             │
│ ⬜ SRV-S4-S8: 6 repositories                            │
│ ⬜ SRV-S9-S11: Controllers + modules                    │
│ ⬜ SRV-S12: E2E tests                                   │
└─────────────────────────────────────────────────────────┘
```

**Cross-Domain Links:**

- Rental → Service: `WorksheetRentalService.createFromRentalDamage()`
- Service → Sales: `QuoteService.createFromWorksheet()`

---

### Phase 4: Sales Supporting Features

```
Priority: P2
Duration: 1-2 sprints
Stories: SLS-S3-S4, SLS-S8-S10, SLS-S13

┌─────────────────────────────────────────────────────────┐
│ Sales Supporting Features                               │
├─────────────────────────────────────────────────────────┤
│ ⬜ Receipt (bevételezés) module                         │
│ ⬜ Stock Count (leltár) module                          │
│ ⬜ Margin & Pricing module                              │
│ ⬜ E2E tests                                            │
└─────────────────────────────────────────────────────────┘
```

---

### Phase 5: Integrations

```
Priority: P2
Duration: 1-2 sprints

┌─────────────────────────────────────────────────────────┐
│ External Integrations                                   │
├─────────────────────────────────────────────────────────┤
│ ⬜ NAV Online (invoice submission)                      │
│ ⬜ MyPOS (card payments, deposits)                      │
│ ⬜ Számlázz.hu (invoice PDF)                            │
│ ⬜ Twenty CRM (partner sync)                            │
│ ⬜ Chatwoot (support tickets)                           │
└─────────────────────────────────────────────────────────┘
```

---

## Sprint Timeline Overview

```
Week 1-2:   Phase 1.1 - Inventory Completion
Week 3-4:   Phase 1.2 - Partner Domain
Week 5-8:   Phase 2.1 - Rental Domain (parallel with 2.2)
Week 5-8:   Phase 2.2 - Sales Core (parallel with 2.1)
Week 9-12:  Phase 3   - Service Domain
Week 13-14: Phase 4   - Sales Supporting
Week 15-16: Phase 5   - Integrations
```

---

## Story Count Summary

| Domain    | Schema Stories | Repository Stories | Controller Stories | E2E Stories | Total  |
| --------- | -------------- | ------------------ | ------------------ | ----------- | ------ |
| Inventory | 1              | 4                  | 2                  | 1           | **8**  |
| Rental    | 3              | 4                  | 2                  | 1           | **11** |
| Service   | 3              | 5                  | 2                  | 1           | **12** |
| Sales     | 4              | 6                  | 4                  | 1           | **15** |
| **TOTAL** | **11**         | **19**             | **10**             | **4**       | **46** |

---

## Shared Services Required

These services are expected by multiple domains via dependency injection:

| Service                | Provider Module | Used By                              |
| ---------------------- | --------------- | ------------------------------------ |
| `IPartnerService`      | Partner         | Rental, Service, Sales               |
| `IInventoryService`    | Inventory       | Rental, Service, Sales               |
| `IAuditService`        | Audit           | ALL domains                          |
| `IRentalService`       | Rental          | Service (worksheet linking)          |
| `IWorksheetService`    | Service         | Sales (quotes)                       |
| `IFileStorageService`  | Storage         | Rental (contracts), Sales (invoices) |
| `INotificationService` | Notifications   | ALL domains                          |

---

## Critical Path Analysis

```
                BLOCKING DEPENDENCIES

Partner ────────┬──────────────────────────────────┐
                │                                   │
                ▼                                   ▼
Inventory ──────┼─────────────┬───────────────────►Sales
                │             │                     ▲
                ▼             ▼                     │
            Rental ────────►Service ────────────────┘
```

**Minimum Viable Path:**

1. ✅ Auth (done)
2. ⬜ Inventory (8 stories)
3. ⬜ Partner (new, ~5 stories)
4. ⬜ Rental Core (11 stories) - for bérlés operations
5. ⬜ Sales Core (10 stories) - for invoicing

**Total to MVP:** ~34 stories

---

## Risk Assessment

| Risk                            | Impact | Mitigation                               |
| ------------------------------- | ------ | ---------------------------------------- |
| Prisma schema conflicts         | HIGH   | Coordinate schema changes across domains |
| Cross-domain integration bugs   | MEDIUM | Integration tests between domains        |
| Performance with large datasets | MEDIUM | Index optimization, pagination           |
| NAV integration complexity      | HIGH   | Early prototype, error handling          |

---

## Quick Reference: Plan Documents

| Domain    | Plan File                                            |
| --------- | ---------------------------------------------------- |
| Inventory | [inventory-domain-plan.md](inventory-domain-plan.md) |
| Rental    | [rental-domain-plan.md](rental-domain-plan.md)       |
| Service   | [service-domain-plan.md](service-domain-plan.md)     |
| Sales     | [sales-domain-plan.md](sales-domain-plan.md)         |

---

## Next Steps

1. **Review this plan with stakeholders**
2. **Start with Inventory completion (INV-S1)**
3. **Create Partner domain plan** (not yet documented)
4. **Update sprint-status.yaml** with new stories
5. **Begin implementation following the order**

---

_Last Updated: 2026-01-23_
_Document Version: 1.0_
