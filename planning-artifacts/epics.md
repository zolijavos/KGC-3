---
stepsCompleted: [1, 2, 3, 4]
lastStep: 4
workflowComplete: true
totalEpics: 32
totalStories: 137
validationPassed: true
validationDate: 2026-01-15
inputDocuments:
  - planning-artifacts/prd.md
  - planning-artifacts/architecture.md
  - planning-artifacts/ux-design-specification.md
---

# KGC ERP v7.0 - Epic Breakdown

## Overview

Ez a dokumentum a KGC ERP v7.0 teljes epic és story lebontását tartalmazza, a PRD, Architecture és UX Design követelményeket implementálható story-kká alakítva.

## Requirements Inventory

### Functional Requirements (FR1-FR121)

#### Multi-Tenant & Franchise (FR1-FR12)
- **FR1:** Multi-tenant RLS izoláció PostgreSQL-ben tenant_id alapján
- **FR2:** Franchise partner onboarding wizard automatikus séma létrehozással
- **FR3:** Holding struktúra támogatás (anyavállalat → leányvállalatok)
- **FR4:** Tenant-specifikus konfiguráció (logo, színek, üzleti szabályok)
- **FR5:** Cross-tenant reporting CENTRAL_ADMIN és magasabb szerepköröknek
- **FR6:** Partner adatok megosztott láthatósága (alapadatok minden bolt látja)
- **FR7:** Tranzakció adatok tenant-izolált (csak saját bolt látja részleteket)
- **FR8:** Feature flag rendszer modulok ki/bekapcsolására tenant szinten
- **FR9:** White-label testreszabhatóság kód módosítás nélkül
- **FR10:** Franchise díjstruktúra kezelés (transaction metering)
- **FR11:** Tenant lifecycle management (create, suspend, delete)
- **FR12:** Automated RLS schema creation on tenant onboarding

#### Authentication & Authorization (FR13-FR24)
- **FR13:** JWT + Refresh Token alapú autentikáció
- **FR14:** Session-based fallback authentication
- **FR15:** PIN kód belépés kiosk módhoz (rövidített azonosítás)
- **FR16:** RBAC 7 szerepkörrel (OPERATOR → SUPER_ADMIN)
- **FR17:** Permission-based access control (45+ permission)
- **FR18:** Elevated access requirement kritikus műveletekhez (5 perc TTL)
- **FR19:** Device-level authentication (megbízható eszközök)
- **FR20:** Tenant-scoped és location-scoped jogosultságok
- **FR21:** Role inheritance (magasabb szerepkör örökli az alacsonyabb jogait)
- **FR22:** Audit trail minden jogosultsági változásról
- **FR23:** Password policy (bcrypt, minimum 10 rounds)
- **FR24:** Session timeout és automatic logout (30 perc inaktivitás)

#### Partner Management (FR25-FR33)
- **FR25:** Partner (ügyfél) törzs CRUD (magánszemély és cég)
- **FR26:** Meghatalmazott kezelés cégek esetén
- **FR27:** Törzsvendég kártya rendszer (loyalty)
- **FR28:** Partner credit limit kezelés
- **FR29:** Partner contact history (telefon, email, cím)
- **FR30:** Partner blacklist kezelés (fizetési problémák)
- **FR31:** Partner merge/duplicate detection
- **FR32:** GDPR compliance: cascade delete, data export
- **FR33:** Partner azonosítás scan-nel (törzsvendég kártya, telefon lookup)

#### Product & Inventory (FR34-FR48)
- **FR34:** Cikk törzs kezelés (termékek, alkatrészek, szolgáltatások)
- **FR35:** Cikk kategória hierarchia (cikkcsoport)
- **FR36:** K-P-D location code rendszer (Központ-Polc-Doboz)
- **FR37:** Multi-warehouse inventory tracking
- **FR38:** Real-time készlet státusz (szabad, kiadott, szervizben, selejtezett)
- **FR39:** Vonalkód/QR kód generálás és scan támogatás
- **FR40:** Beszállító törzs és beszállítói API integrációk (Makita, Stihl, Hikoki)
- **FR41:** Árszabály kezelés (listaár, partner kedvezmény, akció)
- **FR42:** Avizó kezelés (expected delivery tracking)
- **FR43:** Bevételezés workflow (avizó → delivery → stock update)
- **FR44:** Leltár workflow (inventory count → discrepancy → adjustment)
- **FR45:** Készlet mozgás audit trail (minden state change)
- **FR46:** Serial number tracking egyedi gépekhez
- **FR47:** Batch number tracking alkatrészekhez
- **FR48:** Minimum stock level alerting

#### Rental Management (FR49-FR65)
- **FR49:** Bérgép törzs kezelés (gép adatlap, státusz, előzmények)
- **FR50:** Bérlés felvétel wizard (< 15 lépés, < 10 perc)
- **FR51:** Bérlés visszavétel workflow
- **FR52:** Kaució kezelés (készpénz, kártya, átutalás)
- **FR53:** MyPos kártya kaució blokkolás és feloldás
- **FR54:** Bérlési díj kalkuláció (napi/heti/havi, hétvége/ünnepnap kezelés)
- **FR55:** Kedvezmény kezelés (role-based: Operátor 0%, Boltvezető ±20%, Owner 100%)
- **FR56:** Hosszú távú szerződés kezelés (havi számlázás)
- **FR57:** Bérlés hosszabbítás és korai visszavétel
- **FR58:** Bérgép cseréje bérlés közben
- **FR59:** Késedelmi díj automatikus számítás
- **FR60:** Kárkötelem workflow (bérlő károkozás dokumentálás)
- **FR61:** Bérlés előfoglalás (reservation) és webes foglalás
- **FR62:** Bérlés státuszok: RESERVED → ACTIVE → RETURNED → CLOSED
- **FR63:** E-szerződés generálás és digitális aláírás
- **FR64:** Bérlés audit trail (minden státuszváltozás)
- **FR65:** Online foglalás limit (max 3 gép, 1 óra countdown confirm)

#### Service & Workshop (FR66-FR80)
- **FR66:** Munkalap CRUD (szerviz ticket)
- **FR67:** Munkalap státuszok: FELVETT → DIAGNOSZTIKA → ÁRAJÁNLAT → JAVÍTÁS → KÉSZ → KIADVA
- **FR68:** Munkalap-bérlés kapcsolat (bérgép szerviz igénye)
- **FR69:** Garanciális vs fizetős javítás megkülönböztetés
- **FR70:** Makita norma alapú munkadíj kalkuláció
- **FR71:** Árajánlat generálás (robbantott ábra → alkatrész + munkadíj)
- **FR72:** Alkatrész foglalás munkalaphoz
- **FR73:** Szerviz előzmények (gép history)
- **FR74:** Tárolási díj kezelés (30 nap ingyenes → 31-90 nap fizetős → 90+ megsemmisítés)
- **FR75:** Megsemmisítés workflow (SOLD/PARTS/WASTE döntés)
- **FR76:** Szerviz értesítések (SMS/email/push)
- **FR77:** Technikus assignment és workload tracking
- **FR78:** QC (Quality Check) workflow javítás után
- **FR79:** Warranty claim management (beszállító felé)
- **FR80:** Munkalap PDF export és nyomtatás

#### Invoicing & Finance (FR81-FR95)
- **FR81:** NAV Online Számla API v3.0 integráció (Számlázz.hu közvetítő)
- **FR82:** Számla típusok: ügyfél számla, költség számla, proforma
- **FR83:** Számla láthatóság RBAC (költség számlák rejtése operátorok elől)
- **FR84:** Automatikus számla generálás bérlés lezáráskor
- **FR85:** Részszámla és végszámla kezelés hosszú távú szerződésekhez
- **FR86:** Storno számla workflow
- **FR87:** Pénztár kezelés (készpénz be/ki, napi zárás)
- **FR88:** Kártyás fizetés MyPos integráció
- **FR89:** Átutalás nyilvántartás és párosítás
- **FR90:** Fizetési emlékeztető (overdue invoices)
- **FR91:** Havi zárás workflow (ÁFA, készlet, eredmény)
- **FR92:** Cégszerződéses elszámolás (holding → franchise)
- **FR93:** Transaction metering (franchise díj alapja)
- **FR94:** Pénzügyi riportok (bevétel, kintlévőség, cash flow)
- **FR95:** NAV compliance audit trail

#### Reporting & Analytics (FR96-FR103)
- **FR96:** Dashboard widgetek (KPI-k, grafikonok)
- **FR97:** Partner revenue analytics
- **FR98:** Inventory turnover riportok
- **FR99:** Bérlés statisztikák (duration, frequency, popular items)
- **FR100:** Szerviz efficiency metrics (turnaround time, first-time fix rate)
- **FR101:** Employee performance tracking
- **FR102:** Cross-tenant comparative reporting (CENTRAL_ADMIN+)
- **FR103:** Export funkciók (CSV, Excel, PDF)

#### Integration & External Systems (FR104-FR115)
- **FR104:** Twenty CRM integráció (partner sync, sales pipeline)
- **FR105:** Chatwoot integráció (support tickets, chat)
- **FR106:** Horilla HR integráció (employee data, payroll)
- **FR107:** Koko AI chatbot (Gemini Flash, FAQ, workflow guidance)
- **FR108:** Beszállító API integrációk (product catalog sync)
- **FR109:** Email thread feldolgozás (order confirmation parsing)
- **FR110:** OCR számla feldolgozás (beszállítói számlák)
- **FR111:** Webhook rendszer external event handling-hez
- **FR112:** API rate limiting és quota management
- **FR113:** Integration health monitoring
- **FR114:** Plugin architecture (ki/bekapcsolható integrációk)
- **FR115:** Data export API külső rendszerekhez

#### PWA & Offline (FR116-FR121)
- **FR116:** Progressive Web App Service Worker
- **FR117:** Offline data caching (IndexedDB)
- **FR118:** Background sync (online visszatéréskor)
- **FR119:** Last-Write-Wins conflict resolution
- **FR120:** Offline status indicator és sync progress
- **FR121:** Push notification support

### Non-Functional Requirements (NFR-P1 - NFR-DR5)

#### Performance (8 NFR)
- **NFR-P1:** Árumozgatás rögzítés < 30 másodperc (10x gyorsítás)
- **NFR-P2:** Inventory lookup < 5 másodperc (48-96x gyorsítás)
- **NFR-P3:** Database query avg < 100ms (95th percentile)
- **NFR-P4:** Franchise onboarding wizard < 15 perc (96x gyorsítás)
- **NFR-P5:** Real-time inventory status < 2 másodperc frissítés
- **NFR-P6:** NAV számla kiállítás < 10 másodperc
- **NFR-P7:** MyPos authorization < 30 másodperc
- **NFR-P8:** Dashboard widget refresh < 3 másodperc

#### Security (11 NFR)
- **NFR-S1:** Ügyfél személyes adatok titkosítva (column encryption at-rest)
- **NFR-S2:** Kártyaadatok SOHA nem tárolódnak (csak MyPos tokenek, PCI DSS SAQ A-EP)
- **NFR-S3:** Multi-tenant RLS 100% izoláció (0 cross-tenant leak)
- **NFR-S4:** Session variable validálás minden requestnél
- **NFR-S5:** Password bcrypt hash min 10 rounds
- **NFR-S6:** Admin funkciók csak authorized role-oknak (RBAC)
- **NFR-S7:** HTTPS/TLS 1.3 kötelező (no HTTP fallback)
- **NFR-S8:** JWT max 24 óra TTL, automatic refresh rotation
- **NFR-S9:** Audit log immutable (append-only)
- **NFR-S10:** Pre-launch penetration testing (0 critical vulnerability)
- **NFR-S11:** GDPR breach notification < 72 óra

#### Scalability (7 NFR)
- **NFR-SC1:** 10+ franchise partner egyidejű használat < 10% degradáció
- **NFR-SC2:** 500+ bérlés/nap/partner RLS policy performance
- **NFR-SC3:** 20+ warehouse multi-location tracking
- **NFR-SC4:** 10.000+ tranzakció/hó metering
- **NFR-SC5:** AI quota tier-based enforcement (100/1000/unlimited)
- **NFR-SC6:** 2 év audit log + S3 cold storage archival
- **NFR-SC7:** Horizontal scaling opció (read replicas Phase 3)

#### Reliability (9 NFR)
- **NFR-R1:** Overall uptime > 99% (max 7.2 óra downtime/hónap)
- **NFR-R2:** NAV számla success rate > 99.5% (3 retry, exponential backoff)
- **NFR-R3:** Koko AI chatbot uptime > 99%
- **NFR-R4:** MyPos failure rate < 5%
- **NFR-R5:** NAV downtime fallback: manual számlázás + sync queue
- **NFR-R6:** Gemini downtime fallback: automatic Chatwoot redirect
- **NFR-R7:** Daily backup + 30 nap retention, PITR < 1 óra
- **NFR-R8:** RLS schema rollback automatic + admin notification
- **NFR-R9:** Health check monitoring 5 percenként, alert 3+ failure

#### Integration (6 NFR)
- **NFR-I1:** NAV API v3.0 backward compatibility + v4.0 readiness
- **NFR-I2:** MyPos timeout 30s, retry 1x network error
- **NFR-I3:** Gemini timeout 60s, no retry (quota limit)
- **NFR-I4:** Beszállító API napi sync, fallback: manual CSV
- **NFR-I5:** Integration error logging minden API call
- **NFR-I6:** Plugin integrations optional feature flags

#### Usability (10 NFR)
- **NFR-U1:** Mobile-first responsive (tablet 10"+, telefon 6"+, desktop 1920+)
- **NFR-U2:** Egy képernyős workflow (no tab switching)
- **NFR-U3:** Real-time auto-save (no explicit Save gomb)
- **NFR-U4:** Context-sensitive help tooltips
- **NFR-U5:** Magyar nyelv primary, angol secondary
- **NFR-U6:** User-friendly magyar hibaüzenetek
- **NFR-U7:** Loading indicator > 1 sec műveletekhez
- **NFR-U8:** In-app tutorial első bejelentkezéskor
- **NFR-U9:** Keyboard shortcuts (Ctrl+K, Enter, Esc)
- **NFR-U10:** USB barcode scanner + camera scan fallback

#### Data Retention (5 NFR)
- **NFR-DR1:** Audit log 2 év active + S3 archival
- **NFR-DR2:** Audit log gzip compression
- **NFR-DR3:** Bérlési history 5 év (NAV compliance)
- **NFR-DR4:** GDPR cascade delete
- **NFR-DR5:** Partner metadata indefinite retention

### Additional Requirements (Architecture & UX)

#### Architecture Requirements
- **AR1:** NestJS 10.x + Prisma 5.x backend stack
- **AR2:** React 18.x + shadcn/ui + TanStack Query frontend
- **AR3:** PostgreSQL 15+ with RLS multi-tenancy
- **AR4:** Redis 7.x cache layer
- **AR5:** BullMQ 5.x background job queue
- **AR6:** 25 package monorepo (ADR-010 flat naming)
- **AR7:** Feature flag system per tenant
- **AR8:** Plugin architecture (Twenty CRM, Chatwoot, Horilla HR)
- **AR9:** OpenAPI 3.1 API specification
- **AR10:** Hetzner Cloud EU deployment (GDPR)
- **AR11:** Docker + Docker Compose containerization
- **AR12:** GitHub Actions CI/CD
- **AR13:** Prometheus + Grafana monitoring
- **AR14:** A+B Hibrid architektúra (monolith + séma szeparáció)

#### UX Requirements
- **UX1:** Scan-First Interaction paradigm
- **UX2:** PWA tablet-optimized (landscape, nagy gombok)
- **UX3:** Offline-first IndexedDB caching
- **UX4:** < 30 másodperc árumozgatás workflow
- **UX5:** < 10 perc bérlés felvétel (60+ lépésből 15)
- **UX6:** Vonalkód scan-first, manual entry fallback
- **UX7:** Hangjelzéses feedback scan eredményekre
- **UX8:** Role-adaptive UI (elemek megjelenése/eltűnése)
- **UX9:** Visual status system (zöld/sárga/piros)
- **UX10:** Smart defaults ML-alapú előrejelzéssel
- **UX11:** Törzsvendég személyes üdvözlés és előzmény preview
- **UX12:** Kedvezmény slider komponens (±20% határokon belül)
- **UX13:** Non-blocking offline sync banner
- **UX14:** Megsemmisítés 2-lépéses flow (javaslat → jóváhagyás)

### FR Coverage Map

| FR Tartomány | Epic | Modul |
|--------------|------|-------|
| FR1-FR12 | E-CORE-03 | @kgc/tenant (Multi-Tenant) |
| FR13-FR24 | E-CORE-01, E-CORE-02 | @kgc/auth, @kgc/users |
| FR25-FR33 | E-SHARED-01 | @kgc/partner |
| FR34-FR48 | E-SHARED-02, E-SHARED-03 | @kgc/cikk, @kgc/keszlet |
| FR49-FR65 | E-BERLES-01, E-BERLES-02, E-BERLES-03, E-BERLES-04 | Bérlés layer |
| FR66-FR80 | E-SZERVIZ-01, E-SZERVIZ-02, E-SZERVIZ-03, E-SZERVIZ-04 | Szerviz layer |
| FR81-FR95 | E-SHARED-04, E-SHARED-05 | @kgc/szamla, @kgc/nav |
| FR96-FR103 | E-INTEG-03 | @kgc/riportok |
| FR104-FR115 | E-PLUGIN-01, E-PLUGIN-02, E-PLUGIN-03, E-PLUGIN-04, E-PLUGIN-05 | Plugin layer |
| FR116-FR121 | E-CORE-05 | @kgc/ui (PWA) |

**NFR Lefedettség:**
- Performance (NFR-P1-P8): Minden layer-ben implementálandó
- Security (NFR-S1-S11): E-CORE-01, E-CORE-03, E-CORE-06
- Scalability (NFR-SC1-SC7): E-CORE-03, E-SHARED-03
- Reliability (NFR-R1-R9): Infrastructure + E-SHARED-05
- Integration (NFR-I1-I6): E-SHARED-05, E-PLUGIN-*
- Usability (NFR-U1-U10): E-CORE-05
- Data Retention (NFR-DR1-DR5): E-CORE-06

## Epic List (32 Epic - 7 Layer)

### ÖSSZEFOGLALÓ

| Layer | Epic Szám | Prioritás |
|-------|-----------|-----------|
| CORE | 6 | MVP (Sprint 1-2) |
| SHARED | 6 | MVP (Sprint 2-4) |
| BÉRLÉS | 4 | MVP (Sprint 5-6) |
| SZERVIZ | 4 | MVP (Sprint 7-8) |
| ÁRUHÁZ | 4 | Post-MVP |
| INTEGRATION | 3 | Post-MVP |
| PLUGIN | 5 | Post-MVP |
| **ÖSSZESEN** | **32** | - |

---

### 1. CORE LAYER (6 Epic)

**E-CORE-01: Authentication (@kgc/auth)** - P0 MVP
- JWT + Refresh Token, Login/Logout, Password reset, PIN kód
- **FRs:** FR13-FR15, FR23-FR24

**E-CORE-02: User Management (@kgc/users)** - P0 MVP
- User CRUD, Role assignment, Permission check
- **FRs:** FR16-FR22

**E-CORE-03: Tenant Management (@kgc/tenant)** - P0 MVP
- Tenant CRUD, RLS setup, Schema per tenant, Feature flags
- **FRs:** FR1-FR12

**E-CORE-04: Configuration (@kgc/config)** - P0 MVP
- Feature flags service, License management, System settings

**E-CORE-05: UI Component Library (@kgc/ui)** - P0 MVP
- shadcn/ui, Core komponensek, PWA Service Worker
- **FRs:** FR116-FR121, **NFRs:** NFR-U1-U10

**E-CORE-06: Audit Trail (@kgc/audit)** - P0 MVP
- Audit napló, PII titkosítás, GDPR compliance
- **NFRs:** NFR-S9, NFR-DR1-DR5

---

### 2. SHARED LAYER (6 Epic)

**E-SHARED-01: Partner Management (@kgc/partner)** - P0 MVP
- Partner CRUD, Meghatalmazott, Törzsvendég kártya, Hitelkeret
- **FRs:** FR25-FR33

**E-SHARED-02: Product Catalog (@kgc/cikk)** - P0 MVP
- Cikk CRUD, Cikkcsoport, Vonalkód, Beszállító kapcsolat
- **FRs:** FR34-FR42

**E-SHARED-03: Inventory Core (@kgc/keszlet)** - P0 MVP
- Készlet tracking, K-P-D helykód, Multi-warehouse
- **FRs:** FR43-FR48

**E-SHARED-04: Invoice Core (@kgc/szamla)** - P0 MVP
- Számla CRUD, PDF generálás, Számla státuszok
- **FRs:** FR81-FR90

**E-SHARED-05: NAV Integration (@kgc/nav)** - P0 MVP
- Számlázz.hu API, NAV Online v3.0, Retry logic
- **FRs:** FR91-FR95, **NFRs:** NFR-I1, NFR-R2, NFR-R5

**E-SHARED-06: Task List Widget (@kgc/feladatlista)** - P0 MVP
- Bevásárlólista, To-Do feladatok, Státusz követés

---

### 3. BÉRLÉS LAYER (4 Epic)

**E-BERLES-01: Rental Equipment (@kgc/bergep)** - P0 MVP
- Bérgép CRUD, Státusz lifecycle, Serial number tracking
- **FRs:** FR49-FR51

**E-BERLES-02: Rental Operations (@kgc/berles)** - P0 MVP
- Bérlés kiadás/visszavétel, Hosszabbítás, Késedelmi díj
- **FRs:** FR52-FR62

**E-BERLES-03: Rental Contracts (@kgc/szerzodes)** - P1 MVP
- Szerződés PDF, Template kezelés, Digitális aláírás
- **FRs:** FR63

**E-BERLES-04: Deposit Management (@kgc/kaucio)** - P0 MVP
- Kaució felvétel/visszaadás, MyPos integráció
- **FRs:** FR64-FR65

---

### 4. SZERVIZ LAYER (4 Epic)

**E-SZERVIZ-01: Work Orders (@kgc/munkalap)** - P0 MVP
- Munkalap CRUD, Státusz workflow, Alkatrész felhasználás
- **FRs:** FR66-FR73

**E-SZERVIZ-02: Quotations (@kgc/arajanlat)** - P1 MVP
- Árajánlat generálás, PDF export
- **FRs:** FR74

**E-SZERVIZ-03: Warranty Claims (@kgc/garancia)** - P1 MVP
- Garanciális claim, Claim státusz tracking
- **FRs:** FR75-FR79

**E-SZERVIZ-04: Service Standards (@kgc/norma)** - P2 Post-MVP
- Makita norma import, Norma alapú árazás
- **FRs:** FR80

---

### 5. ÁRUHÁZ LAYER (4 Epic) - Post-MVP

**E-ARUHAZ-01: Goods Receipt (@kgc/bevetelezes)** - P2
**E-ARUHAZ-02: Point of Sale (@kgc/eladas)** - P2
**E-ARUHAZ-03: Pricing & Margin (@kgc/arres)** - P2
**E-ARUHAZ-04: Stock Count (@kgc/leltar)** - P2

---

### 6. INTEGRATION LAYER (3 Epic) - Post-MVP

**E-INTEG-01: Equipment-Service Integration** - P2
**E-INTEG-02: Online Booking** - P3
**E-INTEG-03: Reporting Engine** - P2
- **FRs:** FR96-FR103

---

### 7. PLUGIN LAYER (5 Epic)

**E-PLUGIN-01: Twenty CRM Integration** - P2 Post-MVP
- **FRs:** FR104

**E-PLUGIN-02: Chatwoot Integration** - P2 Post-MVP
- **FRs:** FR105

**E-PLUGIN-03: Horilla HR Integration** - P3 Future
- **FRs:** FR106

**E-PLUGIN-04: Koko AI Chatbot** - P2 Post-MVP
- **FRs:** FR107

**E-PLUGIN-05: Internal Chat (@kgc/chat)** - P0 MVP
- Valós idejű chat, Online/offline státusz
- **FRs:** FR108-FR115

---

## MVP Sprint Plan

| Sprint | Epic-ek | Cél |
|--------|---------|-----|
| Sprint 1 | E-CORE-01, E-CORE-02, E-CORE-05 | Auth + Users + UI |
| Sprint 2 | E-CORE-03, E-CORE-04, E-CORE-06 | Tenant + Config + Audit |
| Sprint 3 | E-SHARED-01, E-SHARED-02, E-SHARED-03 | Partner + Cikk + Készlet |
| Sprint 4 | E-SHARED-05, E-SHARED-06, E-PLUGIN-05 | NAV + Feladatlista + Chat |
| Sprint 5 | E-BERLES-01, E-BERLES-04 | Bérgép + Kaució |
| Sprint 6 | E-BERLES-02, E-SHARED-04 | Bérlés + Számla |
| Sprint 7 | E-BERLES-03, E-SZERVIZ-01 | Szerződés + Munkalap |
| Sprint 8 | E-SZERVIZ-02, E-SZERVIZ-03 | Árajánlat + Garancia |

**MVP Ready:** Sprint 8 végén

<!-- Step 2 completed - Epic list with FR mapping -->

---

## Epic 1: Authentication (@kgc/auth) - E-CORE-01

**Epic Goal:** Felhasználók biztonságosan bejelentkezhetnek és azonosíthatják magukat a rendszerben JWT token-ekkel, PIN kóddal (kiosk) és password reset funkcióval.

**FRs covered:** FR13, FR14, FR15, FR23, FR24

---

### Story 1.1: JWT Login Endpoint

**As a** felhasználó,
**I want** email és jelszóval bejelentkezni,
**So that** biztonságosan hozzáférhetek a rendszerhez.

**Acceptance Criteria:**

**Given** egy létező user email/password kombinációval
**When** POST /auth/login endpoint-ra küldöm a credentials-t
**Then** JWT access token (24h TTL) és refresh token-t kapok
**And** a jelszó bcrypt hash-sel van validálva (min 10 rounds)
**And** sikertelen login esetén 401 Unauthorized + rate limiting (5 próba/perc)

---

### Story 1.2: Token Refresh

**As a** bejelentkezett felhasználó,
**I want** lejárt access token-t megújítani refresh token-nel,
**So that** ne kelljen újra bejelentkeznem.

**Acceptance Criteria:**

**Given** valid refresh token
**When** POST /auth/refresh endpoint-ra küldöm
**Then** új access token + rotált refresh token-t kapok
**And** régi refresh token invalidálódik (rotation)
**And** érvénytelen refresh token esetén 401 + logout

---

### Story 1.3: Logout és Session Invalidation

**As a** bejelentkezett felhasználó,
**I want** kijelentkezni a rendszerből,
**So that** más ne férhessen hozzá a munkamenetemhez.

**Acceptance Criteria:**

**Given** aktív session
**When** POST /auth/logout
**Then** access és refresh token invalidálódik
**And** session törlődik az adatbázisból
**And** 30 perc inaktivitás után automatikus logout

---

### Story 1.4: PIN Kód Belépés (Kiosk Mód)

**As a** pultos (operátor),
**I want** 4-6 számjegyű PIN kóddal belépni,
**So that** gyorsan váltani tudjak felhasználók között a pultgépen.

**Acceptance Criteria:**

**Given** eszköz regisztrálva van trusted device-ként
**When** beírom a PIN kódomat
**Then** bejelentkezek a rendszerbe rövidített session-nel (4h TTL)
**And** PIN sikertelen 3x → teljes login szükséges
**And** PIN csak előre regisztrált eszközön működik

---

### Story 1.5: Password Reset Flow

**As a** felhasználó,
**I want** elfelejtett jelszavamat visszaállítani email-en keresztül,
**So that** visszanyerjem a hozzáférésem.

**Acceptance Criteria:**

**Given** létező user email
**When** POST /auth/forgot-password
**Then** reset link kerül kiküldésre (1h TTL)
**And** a link egyszer használható
**And** új jelszó követi a policy-t (bcrypt, 10 rounds)

---

## Epic 2: User Management (@kgc/users) - E-CORE-02

**Epic Goal:** Felhasználók és szerepkörök kezelése RBAC rendszerrel, permission-alapú hozzáférés-ellenőrzéssel.

**FRs covered:** FR16, FR17, FR18, FR19, FR20, FR21, FR22

---

### Story 2.1: User CRUD Operations

**As a** admin (PARTNER_OWNER+),
**I want** felhasználókat létrehozni, módosítani és törölni,
**So that** kezelni tudjam a bolt dolgozóit.

**Acceptance Criteria:**

**Given** PARTNER_OWNER vagy magasabb jogosultság
**When** POST/PUT/DELETE /users endpoint-okat használom
**Then** user CRUD műveletek végrehajtódnak
**And** user létrehozáskor kötelező: email, név, tenant_id
**And** törlés soft-delete (GDPR cascade opció külön)

---

### Story 2.2: Role Assignment és RBAC

**As a** admin,
**I want** szerepköröket hozzárendelni felhasználókhoz,
**So that** megfelelő jogosultságokat kapjanak.

**Acceptance Criteria:**

**Given** 7 szerepkör definiálva (OPERATOR → SUPER_ADMIN)
**When** PUT /users/:id/role
**Then** szerepkör hozzárendelődik
**And** role inheritance működik (magasabb örökli alacsonyabbat)
**And** csak magasabb szerepkör adhat alacsonyabbat

---

### Story 2.3: Permission Check Middleware

**As a** fejlesztő,
**I want** @RequirePermission decorator-t használni,
**So that** minden endpoint megfelelően védett legyen.

**Acceptance Criteria:**

**Given** @RequirePermission('rental:create') decorator endpoint-on
**When** request érkezik
**Then** user permission-jei ellenőrizve
**And** 403 Forbidden ha nincs megfelelő permission
**And** 45+ permission definiálva

---

### Story 2.4: Elevated Access Requirement

**As a** rendszer,
**I want** kritikus műveleteknél újra-hitelesítést kérni,
**So that** védjük a veszélyes műveleteket.

**Acceptance Criteria:**

**Given** elevated_access_required flag
**When** user kritikus műveletet indít
**Then** jelszó újra bekérése szükséges
**And** elevated session 5 percig érvényes
**And** audit log minden elevated access-ről

---

### Story 2.5: Tenant és Location Scoped Permissions

**As a** felhasználó,
**I want** hogy jogosultságaim tenant/location-re korlátozódjanak,
**So that** ne férhessek hozzá más bolt adataihoz.

**Acceptance Criteria:**

**Given** user tenant_id és location_id hozzárendeléssel
**When** adatokhoz fér hozzá
**Then** RLS policy tenant_id alapján szűr
**And** location-scoped permission-ök csak saját bolt

---

### Story 2.6: User Profile Management

**As a** felhasználó,
**I want** saját profilomat kezelni,
**So that** személyes adataim naprakészek legyenek.

**Acceptance Criteria:**

**Given** bejelentkezett user
**When** GET/PUT /users/me
**Then** saját profil megtekinthető és módosítható
**And** módosítható: név, telefon, avatar, PIN kód

---

## Epic 3: Tenant Management (@kgc/tenant) - E-CORE-03

**Epic Goal:** Multi-tenant infrastruktúra PostgreSQL RLS-sel, tenant onboarding és feature flag rendszer.

**FRs covered:** FR1-FR12

---

### Story 3.1: Tenant CRUD és Alapstruktúra

**As a** DEVOPS_ADMIN,
**I want** tenant-eket létrehozni és kezelni,
**So that** új franchise partnereket tudjak onboard-olni.

**Acceptance Criteria:**

**Given** DEVOPS_ADMIN jogosultság
**When** POST /tenants
**Then** tenant rekord létrejön (id, name, slug, status)
**And** tenant séma létrejön PostgreSQL-ben
**And** alapértelmezett konfiguráció beállítódik

---

### Story 3.2: RLS Policy Infrastructure

**As a** rendszer,
**I want** Row Level Security policy-ket minden tenant táblán,
**So that** garantált legyen a tenant izoláció.

**Acceptance Criteria:**

**Given** tenant_id oszlop minden üzleti táblán
**When** query fut
**Then** app.current_tenant_id session variable alapján szűrés
**And** 100% izoláció (0 cross-tenant leak)
**And** RLS policy automatikusan alkalmazódik

---

### Story 3.3: Tenant Context Middleware

**As a** fejlesztő,
**I want** automatikus tenant context beállítást minden request-nél,
**So that** ne kelljen manuálisan kezelni.

**Acceptance Criteria:**

**Given** bejelentkezett user tenant_id-vel
**When** API request érkezik
**Then** SET app.current_tenant_id automatikus
**And** tenant context elérhető @CurrentTenant decorator-ral
**And** tenant nélküli request 400 Bad Request

---

### Story 3.4: Tenant Onboarding Wizard

**As a** DEVOPS_ADMIN,
**I want** automatizált tenant onboarding wizard-ot,
**So that** < 15 perc alatt új partner indulhasson.

**Acceptance Criteria:**

**Given** új partner adatai (név, kontakt, config)
**When** onboarding wizard lefut
**Then** tenant létrejön, séma létrejön, admin user létrejön
**And** alapértelmezett role-ok és permission-ök beállítódnak
**And** feature flags default értékekkel inicializálódnak

---

### Story 3.5: Feature Flag per Tenant

**As a** DEVOPS_ADMIN,
**I want** feature flag-eket tenant szinten kezelni,
**So that** modulokat ki/be tudjak kapcsolni partnerenként.

**Acceptance Criteria:**

**Given** feature flag definíciók (berles, szerviz, garancia, stb.)
**When** PUT /tenants/:id/features
**Then** tenant feature flag-ek frissülnek
**And** @RequireFeature decorator ellenőrzi
**And** UI dinamikusan reagál feature flag-ekre

---

### Story 3.6: Holding Struktúra Támogatás

**As a** CENTRAL_ADMIN,
**I want** anyavállalat-leányvállalat kapcsolatot kezelni,
**So that** holding szintű riportokat lássak.

**Acceptance Criteria:**

**Given** tenant parent_tenant_id mezővel
**When** holding struktúra beállítva
**Then** CENTRAL_ADMIN látja az összes leányvállalatot
**And** cross-tenant riportok működnek holding szinten
**And** RLS továbbra is izolál tenant szinten

---

## Epic 4: Configuration (@kgc/config) - E-CORE-04

**Epic Goal:** Rendszer és tenant szintű konfiguráció kezelés, license management.

---

### Story 4.1: System Configuration Service

**As a** DEVOPS_ADMIN,
**I want** rendszer szintű konfigurációt kezelni,
**So that** globális beállításokat tudjak módosítani.

**Acceptance Criteria:**

**Given** DEVOPS_ADMIN jogosultság
**When** GET/PUT /config/system
**Then** system config CRUD működik
**And** config értékek: email settings, API keys, defaults
**And** config change audit log-olva

---

### Story 4.2: Tenant Configuration

**As a** PARTNER_OWNER,
**I want** saját tenant konfigurációt kezelni,
**So that** testreszabhassam a rendszert.

**Acceptance Criteria:**

**Given** tenant admin jogosultság
**When** GET/PUT /config/tenant
**Then** tenant-specifikus config módosítható
**And** white-label: logo, színek, cég adatok
**And** üzleti szabályok: kedvezmény limitek, kaució összegek

---

### Story 4.3: License Management

**As a** DEVOPS_ADMIN,
**I want** license-eket kezelni tenant-enként,
**So that** a számlázási modell alapján korlátozhassam funkciókat.

**Acceptance Criteria:**

**Given** license tier-ek (Startup, Standard, Enterprise)
**When** tenant license beállítva
**Then** megfelelő feature-ök és limitek érvényesülnek
**And** transaction metering működik
**And** limit túllépés figyelmeztetés

---

### Story 4.4: Configuration Cache és Reload

**As a** rendszer,
**I want** konfigurációt cache-elni és hot-reload-olni,
**So that** ne kelljen minden request-nél DB-t olvasni.

**Acceptance Criteria:**

**Given** konfiguráció Redis cache-ben
**When** config változik
**Then** cache invalidálódik és frissül
**And** hot-reload config restart nélkül
**And** cache TTL: 5 perc, forced refresh endpoint

---

## Epic 5: UI Component Library (@kgc/ui) - E-CORE-05

**Epic Goal:** shadcn/ui alapú komponens könyvtár, PWA infrastruktúra, offline support.

**FRs covered:** FR116-FR121

---

### Story 5.1: shadcn/ui Setup és Core Components

**As a** fejlesztő,
**I want** shadcn/ui komponens könyvtárat használni,
**So that** konzisztens UI-t építhessek.

**Acceptance Criteria:**

**Given** shadcn/ui telepítve
**When** komponenseket használok
**Then** Button, Input, Select, Table, Modal, Toast elérhető
**And** Tailwind CSS konfigurálva
**And** dark/light theme support

---

### Story 5.2: Layout és Navigation Components

**As a** felhasználó,
**I want** konzisztens layout-ot és navigációt,
**So that** könnyen eligazodjak a rendszerben.

**Acceptance Criteria:**

**Given** bejelentkezett user
**When** alkalmazást használom
**Then** Sidebar, Header, Breadcrumb komponensek működnek
**And** responsive layout (mobile/tablet/desktop)
**And** role-based menu filtering

---

### Story 5.3: PWA Service Worker és Manifest

**As a** felhasználó,
**I want** PWA-ként telepíteni az alkalmazást,
**So that** app-szerű élményt kapjak.

**Acceptance Criteria:**

**Given** PWA manifest konfigurálva
**When** "Add to Home Screen"
**Then** alkalmazás telepíthető
**And** Service Worker regisztrálva
**And** offline shell működik

---

### Story 5.4: Offline Data Caching (IndexedDB)

**As a** felhasználó,
**I want** offline módban is dolgozni,
**So that** internet nélkül is működjön a rendszer.

**Acceptance Criteria:**

**Given** aktív session
**When** internet megszakad
**Then** kritikus adatok IndexedDB-ben cache-elve
**And** offline status indicator látható
**And** műveletek queue-ba kerülnek

---

### Story 5.5: Background Sync és Conflict Resolution

**As a** felhasználó,
**I want** offline változásaim automatikusan szinkronizálódjanak,
**So that** ne veszítsek adatot.

**Acceptance Criteria:**

**Given** offline queue-ban változások
**When** internet visszatér
**Then** background sync automatikus
**And** Last-Write-Wins conflict resolution
**And** sync progress és konfliktus notification

---

### Story 5.6: Form Components és Validation

**As a** fejlesztő,
**I want** form komponenseket Zod validációval,
**So that** konzisztens form kezelést kapjak.

**Acceptance Criteria:**

**Given** React Hook Form + Zod
**When** form-ot építek
**Then** FormField, FormLabel, FormError komponensek
**And** client-side és server-side validáció
**And** magyar nyelvű hibaüzenetek

---

### Story 5.7: Barcode Scanner Integration

**As a** pultos,
**I want** vonalkódot USB scanner-rel vagy kamerával olvasni,
**So that** gyorsan azonosíthassak termékeket.

**Acceptance Criteria:**

**Given** USB barcode scanner vagy kamera
**When** vonalkódot olvasok
**Then** scan event feldolgozva
**And** kamera fallback mobilon
**And** hangjelzés sikeres scan-nél

---

### Story 5.8: Push Notifications

**As a** felhasználó,
**I want** push notification-öket kapni,
**So that** értesüljek fontos eseményekről.

**Acceptance Criteria:**

**Given** notification permission engedélyezve
**When** fontos esemény történik
**Then** push notification megjelenik
**And** notification preferences kezelhetők
**And** offline queue-ból is küldhet

---

## Epic 6: Audit Trail (@kgc/audit) - E-CORE-06

**Epic Goal:** Immutable audit log, PII titkosítás, GDPR compliance, 2 év retention.

---

### Story 6.1: Audit Log Service

**As a** rendszer,
**I want** minden üzleti műveletet naplózni,
**So that** audit trail legyen compliance-hez.

**Acceptance Criteria:**

**Given** @Auditable decorator vagy service
**When** üzleti művelet történik
**Then** audit rekord létrejön (user, action, timestamp, before/after)
**And** append-only tábla (no UPDATE/DELETE)
**And** tenant_id-vel izolált

---

### Story 6.2: PII Encryption

**As a** rendszer,
**I want** személyes adatokat titkosítani,
**So that** GDPR-nak megfeleljünk.

**Acceptance Criteria:**

**Given** PII mezők (név, telefon, cím)
**When** adatbázisba írás
**Then** column-level encryption at-rest
**And** decryption csak authorized access-nél
**And** encryption key management

---

### Story 6.3: GDPR Cascade Delete

**As a** adattulajdonos,
**I want** hogy törlési kérelmem minden adatomat törölje,
**So that** right to be forgotten érvényesüljön.

**Acceptance Criteria:**

**Given** GDPR deletion request
**When** DELETE /gdpr/user/:id
**Then** cascade delete minden kapcsolódó adatra
**And** audit log anonymizálva (nem törölve)
**And** confirmation és dokumentálás

---

### Story 6.4: Audit Log Query és Export

**As a** PARTNER_OWNER,
**I want** audit log-ot lekérdezni és exportálni,
**So that** NAV audit-ra felkészüljek.

**Acceptance Criteria:**

**Given** audit log query jogosultság
**When** GET /audit?filters
**Then** szűrt audit rekordok visszaadva
**And** export: CSV, PDF
**And** date range, action type, user filters

---

### Story 6.5: Retention Policy és Archival

**As a** rendszer,
**I want** 2 év után audit log-ot archiválni,
**So that** storage cost optimális legyen.

**Acceptance Criteria:**

**Given** 2 évnél régebbi audit rekordok
**When** archival job fut
**Then** S3 cold storage-ba mozgatás
**And** gzip tömörítés
**And** 5 év retention bérlési history-ra (NAV)

---

## Epic 7: Partner Management (@kgc/partner) - E-SHARED-01

**Epic Goal:** Ügyfél törzs kezelés, törzsvendég rendszer, hitelkeret, meghatalmazottak.

**FRs covered:** FR25-FR33

---

### Story 7.1: Partner CRUD (Magánszemély és Cég)

**As a** operátor,
**I want** partnereket (ügyfeleket) rögzíteni,
**So that** bérléshez/szervizhez azonosíthatók legyenek.

**Acceptance Criteria:**

**Given** partner adatok (név, telefon, email, cím)
**When** POST /partners
**Then** partner létrejön (magánszemély vagy cég)
**And** cég esetén adószám, cégjegyzékszám
**And** duplikáció figyelmeztetés (telefon/email)

---

### Story 7.2: Meghatalmazott Kezelés

**As a** cég képviselője,
**I want** meghatalmazottakat rögzíteni,
**So that** más is intézhessen ügyeket.

**Acceptance Criteria:**

**Given** cég típusú partner
**When** POST /partners/:id/representatives
**Then** meghatalmazott hozzáadva
**And** meghatalmazás típusa (bérlés, szerviz, mindkettő)
**And** érvényességi idő opcionális

---

### Story 7.3: Törzsvendég Kártya Rendszer

**As a** visszatérő ügyfél,
**I want** törzsvendég kártyát kapni,
**So that** gyorsabban azonosíthassanak.

**Acceptance Criteria:**

**Given** partner loyalty status
**When** scan törzsvendég kártyát
**Then** partner azonnal betöltődik
**And** előzmények láthatók
**And** személyes üdvözlés ("Üdv újra, Kovács úr!")

---

### Story 7.4: Partner Hitelkeret Kezelés

**As a** boltvezető,
**I want** hitelkeretet beállítani partnernek,
**So that** megbízható ügyfelek késleltetve fizethessenek.

**Acceptance Criteria:**

**Given** BOLTVEZETO+ jogosultság
**When** PUT /partners/:id/credit-limit
**Then** hitelkeret beállítva
**And** bérléskor hitelkeret ellenőrzés
**And** figyelmeztetés limit közelítéskor

---

### Story 7.5: Partner Blacklist és Figyelmeztetések

**As a** operátor,
**I want** problémás ügyfelekről figyelmeztetést látni,
**So that** kockázatot kezeljem.

**Acceptance Criteria:**

**Given** partner fizetési problémával
**When** partner betöltődik
**Then** figyelmeztetés jelenik meg
**And** blacklist státusz block-olja a bérlést
**And** ok dokumentálva, feloldás BOLTVEZETO+

---

### Story 7.6: Partner Keresés és Azonosítás

**As a** operátor,
**I want** partnert gyorsan megtalálni,
**So that** < 5 másodperc alatt azonosítsak.

**Acceptance Criteria:**

**Given** keresési input (telefon, név, törzsvendég kód)
**When** keresés indul
**Then** találatok < 5 másodperc
**And** auto-complete suggestions
**And** scan támogatás (törzsvendég kártya)

---

## Epic 8: Product Catalog (@kgc/cikk) - E-SHARED-02

**Epic Goal:** Termék és alkatrész törzs, kategória hierarchia, vonalkód kezelés.

**FRs covered:** FR34-FR42

---

### Story 8.1: Cikk CRUD

**As a** admin,
**I want** termékeket és alkatrészeket rögzíteni,
**So that** készlet és bérlés alapja legyen.

**Acceptance Criteria:**

**Given** cikk adatok (kód, név, kategória, ár)
**When** POST /products
**Then** cikk létrejön
**And** típus: termék, alkatrész, szolgáltatás
**And** vonalkód generálás/hozzárendelés

---

### Story 8.2: Cikkcsoport Hierarchia

**As a** admin,
**I want** kategória hierarchiát kezelni,
**So that** termékek logikusan csoportosulva legyenek.

**Acceptance Criteria:**

**Given** cikkcsoport struktúra
**When** kategóriákat kezelek
**Then** fa struktúra (parent-child)
**And** cikk több kategóriába tartozhat
**And** kategória alapú szűrés

---

### Story 8.3: Beszállító Kapcsolat és Import

**As a** admin,
**I want** beszállítókat és termékeiket kezelni,
**So that** beszerzés követhető legyen.

**Acceptance Criteria:**

**Given** beszállító (Makita, Stihl, Hikoki)
**When** termék import
**Then** beszállító-cikk kapcsolat létrejön
**And** beszerzési ár tracking
**And** API/CSV import támogatás

---

### Story 8.4: Vonalkód és QR Kód Kezelés

**As a** operátor,
**I want** vonalkóddal azonosítani termékeket,
**So that** gyorsan dolgozhassak.

**Acceptance Criteria:**

**Given** cikk vonalkód mezővel
**When** vonalkódot scan-elek
**Then** cikk azonosítva és betöltve
**And** QR kód generálás opció
**And** unique vonalkód per cikk

---

### Story 8.5: Árszabály Kezelés

**As a** admin,
**I want** árszabályokat definiálni,
**So that** különböző árak legyenek partnerenként.

**Acceptance Criteria:**

**Given** árszabály típusok (lista, partner, akció)
**When** ár kalkuláció
**Then** megfelelő árszabály alkalmazódik
**And** prioritás: akció > partner > lista
**And** időszakos akció támogatás

---

## Epic 9: Inventory Core (@kgc/keszlet) - E-SHARED-03

**Epic Goal:** Készlet tracking, K-P-D helykód rendszer, multi-warehouse támogatás.

**FRs covered:** FR43-FR48

---

### Story 9.1: Készlet Nyilvántartás Alap

**As a** raktáros,
**I want** készletszinteket követni,
**So that** tudjam mi van raktáron.

**Acceptance Criteria:**

**Given** cikk készlet rekord
**When** készlet változik
**Then** aktuális mennyiség frissül
**And** státuszok: szabad, foglalt, kiadott, szervizben
**And** tenant izolált készlet

---

### Story 9.2: K-P-D Helykód Rendszer

**As a** raktáros,
**I want** K-P-D kódokkal megtalálni tételeket,
**So that** < 30 másodperc alatt meglegyen.

**Acceptance Criteria:**

**Given** helykód struktúra (Központ-Polc-Doboz)
**When** K2-P5-D3 kódot beírom
**Then** tétel helye azonosítva
**And** vonalkód scan helykód címkéről
**And** kontextus érzékeny help

---

### Story 9.3: Multi-Warehouse Támogatás

**As a** admin,
**I want** több raktárat kezelni,
**So that** készlet elosztás követhető legyen.

**Acceptance Criteria:**

**Given** warehouse/location entitások
**When** készlet mozgatás
**Then** forrás és cél warehouse tracking
**And** raktárközi transfer workflow
**And** készlet összesítés tenant szinten

---

### Story 9.4: Készlet Mozgás Audit Trail

**As a** boltvezető,
**I want** minden készlet mozgást látni,
**So that** utólag ellenőrizhető legyen.

**Acceptance Criteria:**

**Given** készlet változás
**When** bevétel/kiadás/transfer történik
**Then** audit rekord létrejön
**And** ki, mikor, honnan-hova, mennyit
**And** keresés és export

---

### Story 9.5: Serial Number és Batch Tracking

**As a** raktáros,
**I want** egyedi gépeket sorszámmal követni,
**So that** konkrét példány azonosítható legyen.

**Acceptance Criteria:**

**Given** cikk serial_number_required flag
**When** bevételezés
**Then** serial number kötelező megadni
**And** batch number alkatrészekhez
**And** serial alapú lekérdezés

---

### Story 9.6: Minimum Stock Alert

**As a** boltvezető,
**I want** értesítést kapni alacsony készletről,
**So that** időben rendelhessek.

**Acceptance Criteria:**

**Given** cikk min_stock_level beállítva
**When** készlet ez alá csökken
**Then** alert notification
**And** dashboard widget
**And** beszerzési javaslat

---

## Epic 10: Invoice Core (@kgc/szamla) - E-SHARED-04

**Epic Goal:** Számla kezelés, PDF generálás, státuszok, sztornó, RBAC visibility.

**FRs covered:** FR81-FR90

---

### Story 10.1: Számla CRUD

**As a** operátor,
**I want** számlákat létrehozni és kezelni,
**So that** pénzügyi tranzakciók dokumentáltak legyenek.

**Acceptance Criteria:**

**Given** számla adatok (partner, tételek, összeg)
**When** POST /invoices
**Then** számla létrejön draft státusszal
**And** számla típusok: ügyfél, költség, proforma
**And** sorszám generálás

---

### Story 10.2: Számla Tétel Kezelés

**As a** operátor,
**I want** számla tételeket kezelni,
**So that** részletes számla legyen.

**Acceptance Criteria:**

**Given** számla tételek
**When** tétel hozzáadás/módosítás
**Then** mennyiség, egységár, ÁFA kalkulálva
**And** kedvezmény per tétel
**And** összesítés automatikus

---

### Story 10.3: Számla PDF Generálás

**As a** operátor,
**I want** PDF számlát generálni,
**So that** nyomtatható/küldhető legyen.

**Acceptance Criteria:**

**Given** kész számla
**When** PDF generálás
**Then** NAV-kompatibilis PDF létrejön
**And** tenant branding (logo, adatok)
**And** email küldés opció

---

### Story 10.4: Számla Státusz Workflow

**As a** rendszer,
**I want** számla státuszokat kezelni,
**So that** életciklus követhető legyen.

**Acceptance Criteria:**

**Given** státuszok: draft, issued, paid, overdue, cancelled
**When** státusz változik
**Then** megfelelő akciók engedélyezve/tiltva
**And** issued után nem módosítható (csak sztornó)
**And** audit trail minden változásról

---

### Story 10.5: Sztornó Számla

**As a** boltvezető,
**I want** számlát sztornózni,
**So that** hibás számla korrigálható legyen.

**Acceptance Criteria:**

**Given** issued számla
**When** sztornó indítás
**Then** sztornó számla létrejön (negatív)
**And** eredeti számla cancelled státuszba
**And** ok dokumentálása kötelező

---

### Story 10.6: Számla Láthatóság RBAC

**As a** boltvezető,
**I want** költség számlákat elrejteni operátorok elől,
**So that** csak releváns számlák látszódjanak.

**Acceptance Criteria:**

**Given** számla visibility flag
**When** költség számla
**Then** alapértelmezetten rejtett operátoroknak
**And** visibility toggle BOLTVEZETO+
**And** badge indicator rejtett státuszhoz

---

## Epic 11: NAV Integration (@kgc/nav) - E-SHARED-05

**Epic Goal:** NAV Online Számla API integráció Számlázz.hu-n keresztül.

**FRs covered:** FR91-FR95

---

### Story 11.1: Számlázz.hu API Integráció

**As a** rendszer,
**I want** Számlázz.hu API-t használni,
**So that** NAV-nak megfelelő számlák jöjjenek létre.

**Acceptance Criteria:**

**Given** Számlázz.hu API credentials
**When** számla kiállítás
**Then** API hívás Számlázz.hu felé
**And** NAV Online automatikus beküldés
**And** response feldolgozás

---

### Story 11.2: NAV XML Builder

**As a** rendszer,
**I want** NAV-kompatibilis XML-t generálni,
**So that** API hívások helyesek legyenek.

**Acceptance Criteria:**

**Given** számla adatok
**When** NAV XML generálás
**Then** NAV Online v3.0 schema-nak megfelelő
**And** validáció küldés előtt
**And** v4.0 migration readiness

---

### Story 11.3: Retry Logic és Error Handling

**As a** rendszer,
**I want** hibakezelést NAV API hívásoknál,
**So that** átmeneti hibák ne okozzanak adatvesztést.

**Acceptance Criteria:**

**Given** NAV API hiba
**When** hívás sikertelen
**Then** 3x retry exponential backoff-fal (5-10-20 sec)
**And** persistent queue sikertelen hívásokhoz
**And** admin notification 3+ failure esetén

---

### Story 11.4: NAV Számla Státusz Követés

**As a** könyvelő,
**I want** NAV beküldés státuszát látni,
**So that** tudjam sikeres volt-e.

**Acceptance Criteria:**

**Given** kiállított számla
**When** NAV státusz lekérdezés
**Then** pending/success/failed státusz
**And** NAV transaction ID tárolva
**And** manuális újraküldés opció

---

### Story 11.5: Offline Fallback és Queue

**As a** operátor,
**I want** offline is számlázni,
**So that** NAV downtime ne állítsa le az üzletet.

**Acceptance Criteria:**

**Given** NAV API nem elérhető
**When** számla kiállítás
**Then** lokális queue-ba kerül
**And** manual fallback workflow aktiválódik
**And** automatikus sync amikor API visszatér

---

## Epic 12: Task List Widget (@kgc/feladatlista) - E-SHARED-06

**Epic Goal:** Bevásárlólista, to-do feladatok, dolgozók közti kommunikáció.

---

### Story 12.1: Bevásárlólista Tétel

**As a** dolgozó,
**I want** bevásárlólista tételeket rögzíteni,
**So that** ne felejtsek el semmit.

**Acceptance Criteria:**

**Given** lista hozzáférés
**When** POST /tasks (type: shopping)
**Then** tétel létrejön (cím, mennyiség, helyszín)
**And** létrehozó és időpont automatikus
**And** duplikáció figyelmeztetés

---

### Story 12.2: To-Do Feladat Felelőssel

**As a** boltvezető,
**I want** feladatokat kiosztani dolgozóknak,
**So that** felelősségek egyértelműek legyenek.

**Acceptance Criteria:**

**Given** to-do típusú task
**When** létrehozás
**Then** felelős(ök) hozzárendelhetők
**And** határidő opcionális
**And** értesítés felelősnek

---

### Story 12.3: Feladat Státusz és Kipipálás

**As a** dolgozó,
**I want** feladatokat készre jelölni,
**So that** haladás látható legyen.

**Acceptance Criteria:**

**Given** aktív feladat
**When** kipipálás
**Then** státusz: kész, ki és mikor rögzítve
**And** státuszok: nyitott, folyamatban, kész
**And** előzmények archiválva

---

### Story 12.4: Személyes Jegyzet

**As a** dolgozó,
**I want** privát jegyzeteket írni,
**So that** csak én lássam.

**Acceptance Criteria:**

**Given** jegyzet típusú task
**When** létrehozás personal flag-gel
**Then** csak létrehozó látja
**And** titkosított tárolás
**And** bolt szintű izoláció

---

### Story 12.5: Boltvezető Lista Hozzáférés

**As a** boltvezető,
**I want** minden feladatot látni,
**So that** áttekintsem a boltot.

**Acceptance Criteria:**

**Given** BOLTVEZETO jogosultság
**When** lista megtekintés
**Then** összes feladat látható (kivéve személyes)
**And** szűrés felelős, státusz, típus szerint
**And** összesített statisztika

---

## Epic 13: Rental Equipment (@kgc/bergep) - E-BERLES-01

**Epic Goal:** Bérgép törzs kezelés, státusz lifecycle, tartozék kezelés.

**FRs covered:** FR49-FR51

---

### Story 13.1: Bérgép CRUD

**As a** admin,
**I want** bérgépeket rögzíteni,
**So that** bérelhető készlet legyen.

**Acceptance Criteria:**

**Given** bérgép adatok (típus, serial, kategória)
**When** POST /rental-equipment
**Then** bérgép létrejön
**And** cikk kapcsolat (termék törzs)
**And** tenant izolált

---

### Story 13.2: Bérgép Státusz Lifecycle

**As a** rendszer,
**I want** bérgép státuszokat követni,
**So that** rendelkezésre állás látható legyen.

**Acceptance Criteria:**

**Given** bérgép státuszok (bent, kint, szervizben, selejtezett)
**When** státusz változik
**Then** audit trail
**And** automatikus átmenet (kiadás → kint)
**And** szervizbe küldés workflow

---

### Story 13.3: Serial Number és QR Kód

**As a** operátor,
**I want** bérgépet scan-nel azonosítani,
**So that** gyors legyen a kiadás.

**Acceptance Criteria:**

**Given** bérgép QR kóddal
**When** scan
**Then** bérgép betöltődik teljes adatlappal
**And** előzmények láthatók
**And** aktuális státusz kiemelt

---

### Story 13.4: Tartozék Kezelés

**As a** operátor,
**I want** bérgép tartozékait kezelni,
**So that** komplett készlet menjen ki.

**Acceptance Criteria:**

**Given** bérgép tartozék kapcsolat
**When** kiadás
**Then** tartozékok checklistán
**And** hiányzó tartozék figyelmeztetés
**And** tartozék készlet követés

---

### Story 13.5: Bérgép Előzmények és Karbantartás

**As a** technikus,
**I want** bérgép history-t látni,
**So that** karbantartást tervezzek.

**Acceptance Criteria:**

**Given** bérgép
**When** history megtekintés
**Then** összes bérlés, szerviz, karbantartás
**And** karbantartási ütemezés
**And** alert esedékes karbantartáshoz

---

## Epic 14: Rental Operations (@kgc/berles) - E-BERLES-02

**Epic Goal:** Bérlés kiadás/visszavétel workflow, díjkalkuláció, hosszabbítás.

**FRs covered:** FR52-FR62

---

### Story 14.1: Bérlés Kiadás Wizard

**As a** operátor,
**I want** bérlést gyorsan felvenni,
**So that** < 10 perc alatt kész legyen.

**Acceptance Criteria:**

**Given** partner és bérgép azonosítva
**When** kiadás wizard
**Then** max 15 lépés a teljes folyamat
**And** smart defaults (díj, kaució)
**And** auto-save minden lépésnél

---

### Story 14.2: Bérlési Díj Kalkuláció

**As a** rendszer,
**I want** bérlési díjat automatikusan számolni,
**So that** pontos ár legyen.

**Acceptance Criteria:**

**Given** bérgép kategória és időtartam
**When** díj kalkuláció
**Then** napi/heti/30 napos ár alapján
**And** hétvége/ünnepnap kezelés (ADR-037)
**And** kedvezmény alkalmazás

---

### Story 14.3: Kedvezmény Kezelés (Role-based)

**As a** boltvezető,
**I want** kedvezményt adni ±20% határig,
**So that** rugalmasan árazhassak.

**Acceptance Criteria:**

**Given** BOLTVEZETO jogosultság
**When** kedvezmény beállítás
**Then** ±20% limit érvényesül
**And** ok dokumentálása kötelező
**And** PARTNER_OWNER 100% kedvezményt adhat
**And** audit trail minden kedvezményről

---

### Story 14.4: Bérlés Visszavétel Workflow

**As a** operátor,
**I want** visszavételt dokumentálni,
**So that** bérlés lezárható legyen.

**Acceptance Criteria:**

**Given** aktív bérlés
**When** visszavétel
**Then** állapot felmérés (ép/sérült)
**And** késedelmi díj automatikus számítás
**And** kaució visszaadás/visszatartás

---

### Story 14.5: Bérlés Hosszabbítás

**As a** bérlő,
**I want** bérlést hosszabbítani,
**So that** tovább használhassam a gépet.

**Acceptance Criteria:**

**Given** aktív bérlés
**When** hosszabbítás kérelem
**Then** új végdátum/összeg kalkulálva
**And** max fizetés nélküli limit (1 hét default)
**And** online fizetés opció

---

### Story 14.6: Késedelmi Díj Számítás

**As a** rendszer,
**I want** késedelmi díjat automatikusan számolni,
**So that** késés dokumentált legyen.

**Acceptance Criteria:**

**Given** lejárt bérlés
**When** visszavétel vagy napi job
**Then** késedelmi díj kalkulálva
**And** értesítés bérlőnek
**And** díj hozzáadva számlához

---

### Story 14.7: Bérlés Státuszok és Audit

**As a** rendszer,
**I want** bérlés státuszokat követni,
**So that** életciklus átlátható legyen.

**Acceptance Criteria:**

**Given** státuszok: RESERVED, ACTIVE, RETURNED, CLOSED
**When** státusz változik
**Then** audit trail
**And** automatikus átmenetek
**And** manuális beavatkozás loggolva

---

## Epic 15: Rental Contracts (@kgc/szerzodes) - E-BERLES-03

**Epic Goal:** Szerződés PDF generálás, template kezelés, digitális aláírás.

**FRs covered:** FR63

---

### Story 15.1: Szerződés Template Kezelés

**As a** admin,
**I want** szerződés template-eket kezelni,
**So that** testreszabható dokumentumok legyenek.

**Acceptance Criteria:**

**Given** template változók (partner, gép, dátum, stb.)
**When** template szerkesztés
**Then** változók behelyettesíthetők
**And** tenant-specifikus template-ek
**And** verzió kezelés

---

### Story 15.2: Szerződés PDF Generálás

**As a** operátor,
**I want** szerződést PDF-ben generálni,
**So that** aláírható legyen.

**Acceptance Criteria:**

**Given** bérlés adatok
**When** szerződés generálás
**Then** PDF létrejön pre-filled adatokkal
**And** partner, gép, feltételek kitöltve
**And** nyomtatás és email opció

---

### Story 15.3: Digitális Aláírás

**As a** bérlő,
**I want** digitálisan aláírni a szerződést,
**So that** ne kelljen papír.

**Acceptance Criteria:**

**Given** generált szerződés
**When** aláírás tablet-en
**Then** touch/stylus aláírás capture
**And** aláírás beágyazva PDF-be
**And** timestamp és hash

---

### Story 15.4: Szerződés Archiválás

**As a** rendszer,
**I want** szerződéseket archiválni,
**So that** később visszakereshetők legyenek.

**Acceptance Criteria:**

**Given** aláírt szerződés
**When** archiválás
**Then** PDF tárolva (S3/MinIO)
**And** bérléshez kapcsolva
**And** 5 év retention

---

## Epic 16: Deposit Management (@kgc/kaucio) - E-BERLES-04

**Epic Goal:** Kaució kezelés, MyPos integráció, visszatartás workflow.

**FRs covered:** FR64-FR65

---

### Story 16.1: Kaució Felvétel (Készpénz/Kártya)

**As a** operátor,
**I want** kauciót felvenni,
**So that** biztosíték legyen a bérlésre.

**Acceptance Criteria:**

**Given** bérlés kaució összeggel
**When** kaució felvétel
**Then** készpénz vagy kártya opció
**And** összeg a gép kategória alapján
**And** kaució rekord létrejön

---

### Story 16.2: MyPos Pre-Authorization

**As a** rendszer,
**I want** kártya kauciót MyPos-on blokkolni,
**So that** összeg zárolva legyen.

**Acceptance Criteria:**

**Given** MyPos terminal/API
**When** kártya kaució
**Then** pre-authorization (zárolás, nem terhelés)
**And** < 30 másodperc response
**And** authorization code tárolva

---

### Story 16.3: Kaució Visszaadás

**As a** operátor,
**I want** kauciót visszaadni,
**So that** bérlés lezárható legyen.

**Acceptance Criteria:**

**Given** visszavett bérlés, ép gép
**When** kaució visszaadás
**Then** készpénz kifizetés VAGY kártya void/refund
**And** MyPos void pre-auth esetén
**And** dokumentálás

---

### Story 16.4: Kaució Visszatartás (Sérülés)

**As a** operátor,
**I want** kauciót részben/egészben visszatartani,
**So that** kár fedezhető legyen.

**Acceptance Criteria:**

**Given** sérült gép visszavételkor
**When** visszatartás
**Then** ok és összeg dokumentálva
**And** partial capture MyPos-on
**And** számla generálás visszatartott összegről

---

### Story 16.5: Kaució Könyvelés és Riport

**As a** könyvelő,
**I want** kaució mozgásokat látni,
**So that** pénzügyi riport helyes legyen.

**Acceptance Criteria:**

**Given** kaució tranzakciók
**When** riport lekérdezés
**Then** felvétel/visszaadás/visszatartás összesítve
**And** nyitott kauciók listája
**And** export

---

## Epic 17: Work Orders (@kgc/munkalap) - E-SZERVIZ-01

**Epic Goal:** Szerviz munkalap kezelés, státusz workflow, alkatrész felhasználás.

**FRs covered:** FR66-FR73

---

### Story 17.1: Munkalap CRUD

**As a** technikus,
**I want** munkalapot felvenni,
**So that** szerviz dokumentált legyen.

**Acceptance Criteria:**

**Given** gép és partner azonosítva
**When** POST /work-orders
**Then** munkalap létrejön FELVETT státusszal
**And** hibajelenség rögzítve
**And** sorszám generálás

---

### Story 17.2: Munkalap Státusz Workflow

**As a** technikus,
**I want** munkalap státuszát léptetni,
**So that** haladás követhető legyen.

**Acceptance Criteria:**

**Given** státuszok: FELVETT → DIAGNOSZTIKA → ÁRAJÁNLAT → JAVÍTÁS → KÉSZ → KIADVA
**When** státusz léptetés
**Then** megfelelő akciók engedélyezve
**And** audit trail
**And** értesítés ügyfélnek

---

### Story 17.3: Diagnosztika és Hibaok

**As a** technikus,
**I want** diagnosztikát dokumentálni,
**So that** hiba oka rögzítve legyen.

**Acceptance Criteria:**

**Given** DIAGNOSZTIKA státusz
**When** hibaok rögzítés
**Then** kategorizált hibaok
**And** fénykép csatolás opció
**And** becsült javítási idő

---

### Story 17.4: Alkatrész Felhasználás

**As a** technikus,
**I want** felhasznált alkatrészeket rögzíteni,
**So that** költség számítható legyen.

**Acceptance Criteria:**

**Given** munkalap javítás közben
**When** alkatrész felhasználás
**Then** készlet csökken
**And** tétel hozzáadódik munkalaphoz
**And** ár kalkulálva

---

### Story 17.5: Munkadíj Kalkuláció

**As a** rendszer,
**I want** munkadíjat számolni,
**So that** teljes költség meglegyen.

**Acceptance Criteria:**

**Given** elvégzett munka
**When** munkadíj kalkuláció
**Then** óradíj vagy norma alapján
**And** Makita norma opció garanciálishoz
**And** összesítés: alkatrész + munkadíj

---

### Story 17.6: Munkalap-Bérlés Kapcsolat

**As a** technikus,
**I want** bérgép szerviz igényét kezelni,
**So that** bérlés és szerviz összekapcsolódjon.

**Acceptance Criteria:**

**Given** bérgép szerviz igénnyel
**When** munkalap létrehozás
**Then** bérgép kapcsolat rögzítve
**And** bérgép státusz: szervizben
**And** bérlés szünetel értesítés

---

### Story 17.7: Prioritás és Várakozási Lista

**As a** boltvezető,
**I want** munkalapokat priorizálni,
**So that** sürgős esetek előre kerüljenek.

**Acceptance Criteria:**

**Given** prioritás szintek (sürgős, felár, garanciális, normál)
**When** prioritás beállítás
**Then** várakozási lista rendezve
**And** szín/ikon kódolás
**And** partner alapú auto-prioritás

---

### Story 17.8: Tárolási Díj Kezelés

**As a** boltvezető,
**I want** tárolási díjat kezelni,
**So that** hosszan álló gépek ne foglaljanak helyet ingyen.

**Acceptance Criteria:**

**Given** KÉSZ státuszú munkalap
**When** 30 nap eltelt
**Then** tárolási díj indul (31-90 nap)
**And** értesítések: 14/7/1 nap megsemmisítés előtt
**And** 90+ nap: megsemmisítés workflow

---

## Epic 18: Quotations (@kgc/arajanlat) - E-SZERVIZ-02

**Epic Goal:** Árajánlat generálás, PDF export, konverzió követés.

**FRs covered:** FR74

---

### Story 18.1: Árajánlat Generálás

**As a** technikus,
**I want** árajánlatot készíteni,
**So that** ügyfél dönthessen a javításról.

**Acceptance Criteria:**

**Given** diagnosztizált hiba
**When** árajánlat létrehozás
**Then** alkatrész + munkadíj tételek
**And** érvényesség (default 14 nap)
**And** munkalaphoz kapcsolva

---

### Story 18.2: Robbantott Ábra Alapú Alkatrész Kiválasztás

**As a** technikus,
**I want** robbantott ábráról alkatrészt választani,
**So that** pontos legyen a tétel.

**Acceptance Criteria:**

**Given** gép robbantott ábra kapcsolattal
**When** alkatrész kiválasztás
**Then** vizuális ábra megjelenítés
**And** kattintásra tétel azonosítás
**And** automatikus ár betöltés

---

### Story 18.3: Árajánlat PDF és Email

**As a** technikus,
**I want** árajánlatot PDF-ben küldeni,
**So that** ügyfél megkaphassa.

**Acceptance Criteria:**

**Given** kész árajánlat
**When** export
**Then** PDF generálás
**And** email küldés partner email-re
**And** tenant branding

---

### Story 18.4: Árajánlat Elfogadás → Munkalap

**As a** ügyfél,
**I want** árajánlatot elfogadni,
**So that** javítás indulhasson.

**Acceptance Criteria:**

**Given** küldött árajánlat
**When** elfogadás (online/telefonos)
**Then** munkalap JAVÍTÁS státuszba
**And** alkatrész foglalás aktiválódik
**And** audit trail

---

## Epic 19: Warranty Claims (@kgc/garancia) - E-SZERVIZ-03

**Epic Goal:** Garanciális javítások, beszállító claim kezelés, norma alapú elszámolás.

**FRs covered:** FR75-FR79

---

### Story 19.1: Garanciális vs Fizetős Megkülönböztetés

**As a** technikus,
**I want** garanciális javítást jelölni,
**So that** elszámolás helyes legyen.

**Acceptance Criteria:**

**Given** munkalap
**When** garanciális flag beállítás
**Then** más workflow (beszállító claim)
**And** garancia ellenőrzés (vásárlás dátum)
**And** fizetős fallback ha nem garanciális

---

### Story 19.2: Warranty Claim Létrehozás

**As a** technikus,
**I want** garanciális igényt rögzíteni,
**So that** beszállítótól visszaigényelhessük.

**Acceptance Criteria:**

**Given** garanciális munkalap
**When** claim létrehozás
**Then** beszállító (Makita/Stihl/stb.) azonosítva
**And** norma tétel kód
**And** státusz: pending

---

### Story 19.3: Claim Státusz Tracking

**As a** admin,
**I want** claim státuszokat követni,
**So that** láthassam a visszaigényléseket.

**Acceptance Criteria:**

**Given** claim
**When** státusz változik
**Then** pending → submitted → approved/rejected
**And** beszállító response dokumentálva
**And** összesített riport

---

### Story 19.4: Claim Elszámolás

**As a** könyvelő,
**I want** jóváhagyott claim-eket elszámolni,
**So that** pénzügy helyes legyen.

**Acceptance Criteria:**

**Given** approved claim
**When** elszámolás
**Then** beszállító követelés rögzítve
**And** munkalap költség nullázva (ügyfélnek)
**And** riport exportálható

---

## Epic 20: Service Standards (@kgc/norma) - E-SZERVIZ-04

**Epic Goal:** Makita norma import, norma alapú árazás garanciális javításokhoz.

**FRs covered:** FR80

---

### Story 20.1: Norma Tétel Import

**As a** admin,
**I want** Makita norma tételeket importálni,
**So that** garanciális árazás automatikus legyen.

**Acceptance Criteria:**

**Given** Makita norma lista (Excel/CSV)
**When** import
**Then** norma tételek betöltve
**And** kód, leírás, norma óra, díj
**And** verzió kezelés

---

### Story 20.2: Norma Alapú Munkadíj

**As a** technikus,
**I want** norma alapján munkadíjat kalkulálni,
**So that** garanciális elszámolás helyes legyen.

**Acceptance Criteria:**

**Given** garanciális munkalap
**When** norma tétel kiválasztás
**Then** munkadíj automatikusan számítva
**And** norma óra × óradíj
**And** eltérés dokumentálható

---

### Story 20.3: Norma Lista Frissítés

**As a** admin,
**I want** norma listát frissíteni,
**So that** aktuális árak legyenek.

**Acceptance Criteria:**

**Given** új norma verzió
**When** frissítés
**Then** régi verziók archivált
**And** új claim-ek új normával
**And** átmeneti kezelés

---

## Epic 21: Goods Receipt (@kgc/bevetelezes) - E-ARUHAZ-01 (Post-MVP)

**Epic Goal:** Árubevételezés workflow, avizó kezelés.

---

### Story 21.1: Avizó Kezelés

**As a** raktáros,
**I want** beérkező szállítmányt előre látni,
**So that** felkészülhessek.

**Acceptance Criteria:**

**Given** beszállítói avizó (email/API)
**When** avizó feldolgozás
**Then** várható tételek listázva
**And** várható érkezési dátum
**And** PDF upload opció

---

### Story 21.2: Bevételezés Workflow

**As a** raktáros,
**I want** szállítmányt bevételezni,
**So that** készlet frissüljön.

**Acceptance Criteria:**

**Given** megérkezett szállítmány
**When** bevételezés
**Then** tételek ellenőrzése avizóval
**And** ±0.5% eltérés tolerance
**And** készlet növelés

---

### Story 21.3: Bevételezés Eltérés Kezelés

**As a** raktáros,
**I want** eltéréseket dokumentálni,
**So that** beszállítói reklamáció indítható legyen.

**Acceptance Criteria:**

**Given** eltérés avizó és szállítmány között
**When** eltérés rögzítés
**Then** hiány/többlet dokumentálva
**And** beszállító értesítés opció
**And** audit trail

---

## Epic 22: Point of Sale (@kgc/eladas) - E-ARUHAZ-02 (Post-MVP)

**Epic Goal:** Bolti értékesítés, pénztár, fizetési módok.

---

### Story 22.1: Értékesítés Kasszából

**As a** operátor,
**I want** termékeket eladni,
**So that** bolt bevételt termeljen.

**Acceptance Criteria:**

**Given** scan/keresés termék
**When** kosárba tétel és fizetés
**Then** tranzakció létrejön
**And** készlet csökken
**And** számla/nyugta

---

### Story 22.2: Fizetési Módok

**As a** operátor,
**I want** több fizetési módot kezelni,
**So that** rugalmas legyen a fizetés.

**Acceptance Criteria:**

**Given** fizetés
**When** mód kiválasztás
**Then** készpénz/kártya/átutalás
**And** vegyes fizetés támogatás
**And** MyPos integráció kártyához

---

### Story 22.3: Napi Pénztárzárás

**As a** boltvezető,
**I want** pénztárt zárni,
**So that** nap végezhető legyen.

**Acceptance Criteria:**

**Given** napi tranzakciók
**When** zárás
**Then** készpénz egyeztetés
**And** eltérés dokumentálás
**And** napi riport

---

## Epic 23: Pricing & Margin (@kgc/arres) - E-ARUHAZ-03 (Post-MVP)

**Epic Goal:** Árrés kezelés, árkalkuláció.

---

### Story 23.1: Beszerzési Ár Tracking

**As a** admin,
**I want** beszerzési árakat követni,
**So that** árrés számítható legyen.

**Acceptance Criteria:**

**Given** cikk beszerzési ár
**When** bevételezés
**Then** ár frissül
**And** átlag/utolsó ár opció
**And** history

---

### Story 23.2: Árrés Kalkuláció és Riport

**As a** boltvezető,
**I want** árréset látni,
**So that** profitabilitást követhessem.

**Acceptance Criteria:**

**Given** eladási és beszerzési ár
**When** riport
**Then** árrés % és összeg
**And** cikk/kategória/időszak szűrés
**And** export

---

## Epic 24: Stock Count (@kgc/leltar) - E-ARUHAZ-04 (Post-MVP)

**Epic Goal:** Leltár workflow, eltérés kezelés.

---

### Story 24.1: Leltár Indítás

**As a** boltvezető,
**I want** leltárt indítani,
**So that** készlet ellenőrizhető legyen.

**Acceptance Criteria:**

**Given** leltár időszak
**When** leltár indítás
**Then** leltárív generálva
**And** készlet "freeze" opció
**And** részleltár támogatás

---

### Story 24.2: Leltár Rögzítés

**As a** raktáros,
**I want** számlált mennyiségeket rögzíteni,
**So that** eltérés látszódjon.

**Acceptance Criteria:**

**Given** leltárív
**When** számolás rögzítés
**Then** tétel mennyiség beírva
**And** scan támogatás
**And** több felhasználó párhuzamosan

---

### Story 24.3: Leltár Eltérés és Korrekció

**As a** boltvezető,
**I want** eltéréseket kezelni,
**So that** készlet helyes legyen.

**Acceptance Criteria:**

**Given** eltérés könyv vs fizikai
**When** korrekció
**Then** hiány/többlet rögzítve
**And** ok dokumentálás kötelező
**And** készlet adjust

---

## Epic 25: Equipment-Service Integration - E-INTEG-01 (Post-MVP)

**Epic Goal:** Bérgép és szerviz közötti automatikus átmenet.

---

### Story 25.1: Bérgép Szervizbe Küldés Automatizálás

**As a** operátor,
**I want** hibás bérgépet egyből szervizbe küldeni,
**So that** átmenet automatikus legyen.

**Acceptance Criteria:**

**Given** bérgép visszavétel sérüléssel
**When** "szervizbe küld"
**Then** munkalap automatikusan létrejön
**And** bérgép státusz: szervizben
**And** bérlés lezárva

---

### Story 25.2: Szerviz Kész → Bérgép Visszaáll

**As a** technikus,
**I want** hogy kész szerviz után bérgép automatikusan elérhető legyen,
**So that** újra bérelhető legyen.

**Acceptance Criteria:**

**Given** munkalap KIADVA
**When** lezárás
**Then** bérgép státusz: bent
**And** készlet frissül
**And** notification

---

## Epic 26: Online Booking - E-INTEG-02 (Post-MVP)

**Epic Goal:** Webes foglalás, limit kezelés.

---

### Story 26.1: Online Foglalás Felület

**As a** potenciális bérlő,
**I want** online foglalni gépet,
**So that** ne kelljen telefonálnom.

**Acceptance Criteria:**

**Given** publikus foglalási felület
**When** foglalás
**Then** gép és időpont kiválasztás
**And** max 3 gép limit
**And** partner adatok megadása

---

### Story 26.2: Foglalás Megerősítés

**As a** bérlő,
**I want** foglalást megerősíteni,
**So that** végleges legyen.

**Acceptance Criteria:**

**Given** foglalás pending
**When** 1 óra countdown lejár confirmation nélkül
**Then** foglalás automatikusan törlődik
**And** email reminder küldve
**And** megerősítve: gép lefoglalva

---

## Epic 27: Reporting Engine - E-INTEG-03 (Post-MVP)

**Epic Goal:** Komplex riportok, export, cross-tenant aggregáció.

**FRs covered:** FR96-FR103

---

### Story 27.1: Dashboard Widgetek

**As a** boltvezető,
**I want** KPI widgeteket látni,
**So that** gyors áttekintésem legyen.

**Acceptance Criteria:**

**Given** dashboard
**When** betöltés
**Then** bevétel, tranzakció szám, top termékek
**And** real-time frissítés < 3 sec
**And** testreszabható layout

---

### Story 27.2: Részletes Riportok

**As a** könyvelő,
**I want** részletes riportokat generálni,
**So that** elemzést végezhessek.

**Acceptance Criteria:**

**Given** riport típus (bevétel, készlet, bérlés, szerviz)
**When** riport generálás
**Then** szűrők: dátum, partner, kategória
**And** export: CSV, Excel, PDF
**And** scheduling opció

---

### Story 27.3: Cross-Tenant Riportok

**As a** CENTRAL_ADMIN,
**I want** összes franchise riportját látni,
**So that** holding szintű áttekintésem legyen.

**Acceptance Criteria:**

**Given** CENTRAL_ADMIN jogosultság
**When** riport
**Then** tenant aggregáció
**And** összehasonlító elemzés
**And** holding dashboard

---

## Epic 28: Twenty CRM Integration - E-PLUGIN-01 (Post-MVP)

**Epic Goal:** Twenty CRM fork integráció ügyfélkezeléshez.

---

### Story 28.1: Partner Szinkronizálás

**As a** rendszer,
**I want** partnereket szinkronizálni Twenty CRM-mel,
**So that** CRM adatok naprakészek legyenek.

**Acceptance Criteria:**

**Given** partner változás
**When** sync job
**Then** Two-way sync működik
**And** conflict handling
**And** mapping: partner ↔ CRM contact

---

### Story 28.2: CRM Dashboard Embed

**As a** boltvezető,
**I want** CRM dashboard-ot az ERP-ben látni,
**So that** ne kelljen váltogatni.

**Acceptance Criteria:**

**Given** Twenty CRM telepítve
**When** ERP-ben megnyitás
**Then** iframe embed
**And** SSO (single sign-on)
**And** context passing

---

## Epic 29: Chatwoot Integration - E-PLUGIN-02 (Post-MVP)

**Epic Goal:** Chatwoot fork integráció ügyfélszolgálathoz.

---

### Story 29.1: Support Ticket Integráció

**As a** ügyfél,
**I want** support ticket-et nyitni az ERP-ből,
**So that** segítséget kapjak.

**Acceptance Criteria:**

**Given** bejelentkezett user
**When** support kérés
**Then** Chatwoot ticket létrejön
**And** context (tenant, user, bérlés) automatikus
**And** chat widget embed

---

### Story 29.2: AI Escalation Chatwoot-ba

**As a** rendszer,
**I want** AI chatbot escalation-t Chatwoot-ba,
**So that** emberi segítség legyen ha AI nem tud válaszolni.

**Acceptance Criteria:**

**Given** AI confidence < 50%
**When** escalation
**Then** automatikus Chatwoot redirect
**And** conversation history átadva
**And** agent notification

---

## Epic 30: Horilla HR Integration - E-PLUGIN-03 (Post-MVP)

**Epic Goal:** Horilla HR fork integráció.

---

### Story 30.1: Dolgozó Adatok Szinkronizálás

**As a** admin,
**I want** dolgozó adatokat HR rendszerből szinkronizálni,
**So that** ne kelljen dupán kezelni.

**Acceptance Criteria:**

**Given** Horilla HR telepítve
**When** sync
**Then** user ↔ employee mapping
**And** munkaidő, fizetés adatok (read-only)
**And** org structure

---

## Epic 31: Koko AI Chatbot - E-PLUGIN-04 (Post-MVP)

**Epic Goal:** Google Gemini alapú AI chatbot.

---

### Story 31.1: Koko Chatbot Widget

**As a** felhasználó,
**I want** AI chatbot-tal beszélgetni,
**So that** gyorsan kapjak választ.

**Acceptance Criteria:**

**Given** Koko widget
**When** kérdés
**Then** Gemini Flash API hívás
**And** magyar nyelvű válasz
**And** context-aware (aktuális képernyő)

---

### Story 31.2: Intent Classification és Routing

**As a** rendszer,
**I want** kérdéseket klasszifikálni,
**So that** megfelelő válasz jöjjön.

**Acceptance Criteria:**

**Given** user kérdés
**When** intent classification
**Then** FAQ, workflow guidance, data query
**And** confidence score
**And** routing: >80% auto, 50-80% admin approval, <50% Chatwoot

---

### Story 31.3: AI Quota és Rate Limiting

**As a** rendszer,
**I want** AI használatot limitálni,
**So that** költség kontrollált legyen.

**Acceptance Criteria:**

**Given** tenant AI quota (tier-based)
**When** quota közelít
**Then** warning notification
**And** limit elérése: degraded mode
**And** usage dashboard

---

## Epic 32: Internal Chat (@kgc/chat) - E-PLUGIN-05

**Epic Goal:** Belső kommunikáció dolgozók között.

**FRs covered:** FR108-FR115

---

### Story 32.1: Real-time 1-to-1 Chat

**As a** dolgozó,
**I want** kollégákkal chatelni,
**So that** gyorsan kommunikálhassunk.

**Acceptance Criteria:**

**Given** két bejelentkezett user
**When** chat kezdés
**Then** real-time üzenetváltás (WebSocket)
**And** typing indicator
**And** delivered/read status

---

### Story 32.2: Online/Offline Státusz

**As a** dolgozó,
**I want** látni ki van online,
**So that** tudjam kit érhetek el.

**Acceptance Criteria:**

**Given** user lista
**When** státusz változik
**Then** zöld/piros jelzés
**And** last seen timestamp
**And** "away" automatikus 5 perc inaktivitás után

---

### Story 32.3: Chat Értesítések

**As a** dolgozó,
**I want** értesítést kapni új üzenetről,
**So that** ne maradjak le semmiről.

**Acceptance Criteria:**

**Given** új üzenet
**When** nem aktív a chat ablak
**Then** toast notification
**And** badge olvasatlan számmal
**And** push notification ha app háttérben

---

### Story 32.4: Chat Előzmények

**As a** dolgozó,
**I want** régi üzeneteket visszanézni,
**So that** ne felejtsem el mit beszéltünk.

**Acceptance Criteria:**

**Given** chat history
**When** görgetés/keresés
**Then** régebbi üzenetek betöltődnek
**And** keresés szövegben
**And** 1 év retention
