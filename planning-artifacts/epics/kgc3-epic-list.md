# KGC-3 Epic Lista (ADR-010 Alapján)

**Készítette:** Bob (Scrum Master)
**Dátum:** 2026-01-15
**Alapdokumentum:** ADR-010-micro-modules-detailed.md
**Granularitás:** 1 modul = 1 epic (25+ epic)

---

## ÖSSZEFOGLALÓ

| Layer | Epic Szám | Prioritás |
|-------|-----------|-----------|
| CORE | 5 | MVP (Sprint 1-2) |
| SHARED | 5 | MVP (Sprint 2-3) |
| BÉRLÉS | 4 | MVP (Sprint 3-5) |
| SZERVIZ | 4 | MVP (Sprint 5-7) |
| ÁRUHÁZ | 4 | Post-MVP |
| INTEGRATION | 3 | Post-MVP |
| PLUGIN | 4 | Post-MVP |
| **ÖSSZESEN** | **29** | - |

---

## 1. CORE LAYER EPIC-EK (5 db) - MVP Sprint 1-2

### Epic 1.1: Authentication (@kgc/auth)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-CORE-01 |
| **Package** | @kgc/auth |
| **Prioritás** | P0 - MVP |
| **Függőségek** | - |
| **Story Szám** | ~5-8 |

**Scope:**
- JWT + Refresh Token
- Login/Logout
- Password reset
- PIN kód (Kiosk mód)
- Session kezelés

---

### Epic 1.2: User Management (@kgc/users)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-CORE-02 |
| **Package** | @kgc/users |
| **Prioritás** | P0 - MVP |
| **Függőségek** | E-CORE-01 |
| **Story Szám** | ~6-10 |

**Scope:**
- User CRUD
- Role assignment
- Permission check
- User-Tenant kapcsolat
- Profile kezelés

---

### Epic 1.3: Tenant Management (@kgc/tenant)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-CORE-03 |
| **Package** | @kgc/tenant |
| **Prioritás** | P0 - MVP |
| **Függőségek** | E-CORE-02 |
| **Story Szám** | ~4-6 |

**Scope:**
- Tenant CRUD
- Tenant middleware
- RLS setup
- Schema per tenant
- Feature flag per tenant

---

### Epic 1.4: Configuration (@kgc/config)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-CORE-04 |
| **Package** | @kgc/config |
| **Prioritás** | P0 - MVP |
| **Függőségek** | E-CORE-03 |
| **Story Szám** | ~3-5 |

**Scope:**
- Feature flags service
- License management
- System settings
- Tenant config

---

### Epic 1.5: UI Component Library (@kgc/ui)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-CORE-05 |
| **Package** | @kgc/ui |
| **Prioritás** | P0 - MVP |
| **Függőségek** | - |
| **Story Szám** | ~8-12 |

**Scope:**
- shadcn/ui setup
- Core komponensek (Button, Input, Table, Modal)
- Layout komponensek
- Theme provider
- Custom hooks (useAuth, useTenant)

---

## 2. SHARED LAYER EPIC-EK (5 db) - MVP Sprint 2-3

### Epic 2.1: Partner Management (@kgc/partner)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-SHARED-01 |
| **Package** | @kgc/partner |
| **Prioritás** | P0 - MVP |
| **Függőségek** | E-CORE-03 |
| **Story Szám** | ~8-12 |

**Scope:**
- Partner CRUD (magánszemély + cég)
- Meghatalmazott kezelés
- Partner keresés (telefon, név)
- Duplikáció ellenőrzés
- Hitelkeret kezelés
- Partner history

---

### Epic 2.2: Product Catalog (@kgc/cikk)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-SHARED-02 |
| **Package** | @kgc/cikk |
| **Prioritás** | P0 - MVP |
| **Függőségek** | E-CORE-03 |
| **Story Szám** | ~6-10 |

**Scope:**
- Cikk CRUD
- Cikkcsoport hierarchia
- Beszállító kapcsolat
- Vonalkód/QR kezelés
- Robbantott ábra kapcsolat

---

### Epic 2.3: Inventory Core (@kgc/keszlet)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-SHARED-03 |
| **Package** | @kgc/keszlet |
| **Prioritás** | P0 - MVP |
| **Függőségek** | E-SHARED-02 |
| **Story Szám** | ~8-12 |

**Scope:**
- Készlet tracking per tenant
- Készlet mozgás napló
- Reservation rendszer
- K-P-D helykód
- Multi-warehouse alap

---

### Epic 2.4: Invoice Core (@kgc/szamla)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-SHARED-04 |
| **Package** | @kgc/szamla |
| **Prioritás** | P0 - MVP |
| **Függőségek** | E-SHARED-01, E-SHARED-05 |
| **Story Szám** | ~6-10 |

**Scope:**
- Számla CRUD
- Számla tétel kezelés
- PDF generálás
- Számla státuszok
- Sztornó

---

### Epic 2.5: NAV Integration (@kgc/nav)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-SHARED-05 |
| **Package** | @kgc/nav |
| **Prioritás** | P0 - MVP |
| **Függőségek** | - |
| **Story Szám** | ~5-8 |

**Scope:**
- Számlázz.hu API integráció
- NAV Online v3.0
- XML builder
- Response parser
- Retry logic

---

## 3. BÉRLÉS LAYER EPIC-EK (4 db) - MVP Sprint 3-5

### Epic 3.1: Rental Equipment (@kgc/bergep)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-BERLES-01 |
| **Package** | @kgc/bergep |
| **Prioritás** | P0 - MVP |
| **Függőségek** | E-SHARED-02 |
| **Story Szám** | ~6-10 |

**Scope:**
- Bérgép CRUD
- Státusz lifecycle (bent/kint/szerviz)
- Serial number tracking
- Bérgép keresés (QR, kód)
- Tartozék kapcsolat

---

### Epic 3.2: Rental Operations (@kgc/berles)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-BERLES-02 |
| **Package** | @kgc/berles |
| **Prioritás** | P0 - MVP |
| **Függőségek** | E-BERLES-01, E-SHARED-01 |
| **Story Szám** | ~10-15 |

**Scope:**
- Bérlés kiadás workflow
- Bérlés visszavétel workflow
- Hosszabbítás kezelés
- Késedelmi díj számítás
- Bérlési díj kalkuláció (napi/heti/30 nap)

---

### Epic 3.3: Rental Contracts (@kgc/szerzodes)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-BERLES-03 |
| **Package** | @kgc/szerzodes |
| **Prioritás** | P1 - MVP |
| **Függőségek** | E-BERLES-02 |
| **Story Szám** | ~4-6 |

**Scope:**
- Szerződés PDF generálás
- Template kezelés
- Digitális aláírás
- Szerződés archiválás

---

### Epic 3.4: Deposit Management (@kgc/kaucio)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-BERLES-04 |
| **Package** | @kgc/kaucio |
| **Prioritás** | P0 - MVP |
| **Függőségek** | E-BERLES-02 |
| **Story Szám** | ~6-10 |

**Scope:**
- Kaució felvétel (készpénz/kártya)
- MyPos integráció (pre-auth)
- Kaució visszaadás
- Kaució visszatartás (sérülés)
- Kaució könyvelés

---

## 4. SZERVIZ LAYER EPIC-EK (4 db) - MVP Sprint 5-7

### Epic 4.1: Work Orders (@kgc/munkalap)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-SZERVIZ-01 |
| **Package** | @kgc/munkalap |
| **Prioritás** | P0 - MVP |
| **Függőségek** | E-SHARED-01, E-SHARED-02, E-SHARED-03 |
| **Story Szám** | ~10-15 |

**Scope:**
- Munkalap CRUD
- Státusz workflow
- Munkalap tétel kezelés
- Belső megjegyzés
- Alkatrész felhasználás

---

### Epic 4.2: Quotations (@kgc/arajanlat)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-SZERVIZ-02 |
| **Package** | @kgc/arajanlat |
| **Prioritás** | P1 - MVP |
| **Függőségek** | E-SZERVIZ-01 |
| **Story Szám** | ~4-6 |

**Scope:**
- Árajánlat generálás
- Árajánlat → Munkalap konverzió
- PDF export
- Email küldés

---

### Epic 4.3: Warranty Claims (@kgc/garancia)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-SZERVIZ-03 |
| **Package** | @kgc/garancia |
| **Prioritás** | P1 - MVP |
| **Függőségek** | E-SZERVIZ-01 |
| **Story Szám** | ~5-8 |

**Scope:**
- Garanciális claim CRUD
- Makita norma kapcsolat
- Claim státusz tracking
- Elszámolás

---

### Epic 4.4: Service Standards (@kgc/norma)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-SZERVIZ-04 |
| **Package** | @kgc/norma |
| **Prioritás** | P2 - Post-MVP |
| **Függőségek** | E-SZERVIZ-03 |
| **Story Szám** | ~3-5 |

**Scope:**
- Makita norma tétel import
- Norma alapú árazás
- Norma frissítés

---

## 5. ÁRUHÁZ LAYER EPIC-EK (4 db) - Post-MVP

### Epic 5.1: Goods Receipt (@kgc/bevetelezes)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-ARUHAZ-01 |
| **Package** | @kgc/bevetelezes |
| **Prioritás** | P2 - Post-MVP |
| **Függőségek** | E-SHARED-02, E-SHARED-03 |
| **Story Szám** | ~5-8 |

---

### Epic 5.2: Point of Sale (@kgc/eladas)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-ARUHAZ-02 |
| **Package** | @kgc/eladas |
| **Prioritás** | P2 - Post-MVP |
| **Függőségek** | E-SHARED-02, E-SHARED-03, E-SHARED-04 |
| **Story Szám** | ~8-12 |

---

### Epic 5.3: Pricing & Margin (@kgc/arres)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-ARUHAZ-03 |
| **Package** | @kgc/arres |
| **Prioritás** | P2 - Post-MVP |
| **Függőségek** | E-SHARED-02 |
| **Story Szám** | ~4-6 |

---

### Epic 5.4: Stock Count (@kgc/leltar)

| Mező | Érték |
|------|-------|
| **Epic ID** | E-ARUHAZ-04 |
| **Package** | @kgc/leltar |
| **Prioritás** | P2 - Post-MVP |
| **Függőségek** | E-SHARED-02, E-SHARED-03 |
| **Story Szám** | ~4-6 |

---

## 6. INTEGRATION LAYER EPIC-EK (3 db) - Post-MVP

### Epic 6.1: Equipment-Service Integration

| Mező | Érték |
|------|-------|
| **Epic ID** | E-INTEG-01 |
| **Package** | @kgc/bergep-szerviz-integration |
| **Prioritás** | P2 - Post-MVP |
| **Függőségek** | E-BERLES-01, E-SZERVIZ-01 |
| **Story Szám** | ~3-5 |

---

### Epic 6.2: Online Booking

| Mező | Érték |
|------|-------|
| **Epic ID** | E-INTEG-02 |
| **Package** | @kgc/online-foglalas-integration |
| **Prioritás** | P3 - Future |
| **Függőségek** | E-SHARED-03, E-SHARED-01 |
| **Story Szám** | ~5-8 |

---

### Epic 6.3: Reporting Engine

| Mező | Érték |
|------|-------|
| **Epic ID** | E-INTEG-03 |
| **Package** | @kgc/riportok |
| **Prioritás** | P2 - Post-MVP |
| **Függőségek** | Minden modul |
| **Story Szám** | ~6-10 |

---

## 7. PLUGIN EPIC-EK (4 db) - Post-MVP

### Epic 7.1: Twenty CRM Integration

| Mező | Érték |
|------|-------|
| **Epic ID** | E-PLUGIN-01 |
| **Prioritás** | P2 - Post-MVP |
| **Típus** | Git Submodule Fork |
| **Story Szám** | ~5-8 |

---

### Epic 7.2: Chatwoot Integration

| Mező | Érték |
|------|-------|
| **Epic ID** | E-PLUGIN-02 |
| **Prioritás** | P2 - Post-MVP |
| **Típus** | Git Submodule Fork |
| **Story Szám** | ~5-8 |

---

### Epic 7.3: Horilla HR Integration

| Mező | Érték |
|------|-------|
| **Epic ID** | E-PLUGIN-03 |
| **Prioritás** | P3 - Future |
| **Típus** | Git Submodule Fork |
| **Story Szám** | ~4-6 |

---

### Epic 7.4: Koko AI Chatbot

| Mező | Érték |
|------|-------|
| **Epic ID** | E-PLUGIN-04 |
| **Prioritás** | P2 - Post-MVP |
| **Típus** | Egyedi fejlesztés |
| **Story Szám** | ~8-12 |

---

## DEPENDENCY GRAPH

```
E-CORE-01 (auth)
    ↓
E-CORE-02 (users) ────────────────────┐
    ↓                                  │
E-CORE-03 (tenant) ───────────────────┼───────────────────┐
    ↓                                  │                   │
E-CORE-04 (config)                     │                   │
                                       │                   │
E-CORE-05 (ui) ←──────────────────────┘                   │
                                                          │
E-SHARED-01 (partner) ←───────────────────────────────────┤
E-SHARED-02 (cikk) ←──────────────────────────────────────┤
    ↓                                                      │
E-SHARED-03 (keszlet) ←───────────────────────────────────┘
    ↓
E-SHARED-05 (nav)
    ↓
E-SHARED-04 (szamla)

E-BERLES-01 (bergep) ← E-SHARED-02
    ↓
E-BERLES-02 (berles) ← E-SHARED-01
    ↓
E-BERLES-03 (szerzodes)
E-BERLES-04 (kaucio)

E-SZERVIZ-01 (munkalap) ← E-SHARED-01, E-SHARED-02, E-SHARED-03
    ↓
E-SZERVIZ-02 (arajanlat)
E-SZERVIZ-03 (garancia)
    ↓
E-SZERVIZ-04 (norma)
```

---

## MVP SPRINT PLAN (Javasolt)

| Sprint | Epic-ek | Cél |
|--------|---------|-----|
| Sprint 1 | E-CORE-01, E-CORE-02, E-CORE-05 | Auth + Users + UI |
| Sprint 2 | E-CORE-03, E-CORE-04, E-SHARED-01 | Tenant + Partner |
| Sprint 3 | E-SHARED-02, E-SHARED-03, E-SHARED-05 | Cikk + Készlet + NAV |
| Sprint 4 | E-BERLES-01, E-BERLES-04 | Bérgép + Kaució |
| Sprint 5 | E-BERLES-02, E-SHARED-04 | Bérlés + Számla |
| Sprint 6 | E-BERLES-03, E-SZERVIZ-01 | Szerződés + Munkalap |
| Sprint 7 | E-SZERVIZ-02, E-SZERVIZ-03 | Árajánlat + Garancia |

**MVP Ready:** Sprint 7 végén (~14-16 story/sprint)

---

*Készítette: Bob (Scrum Master) - BMAD Method*
