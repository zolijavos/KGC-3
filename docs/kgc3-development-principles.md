# KGC ERP - Fejlesztési Alapelvek

**Verzió:** 2.2
**Készült:** 2026-01-16
**Státusz:** AKTÍV

---

## TARTALOMJEGYZÉK

0. [Package Elnevezési Konvenció](#0-package-elnevezési-konvenció)
1. [Fejlesztési Metodológia](#1-fejlesztési-metodológia)
2. [TDD vs Tradicionális - Döntési Mátrix](#2-tdd-vs-tradicionális---döntési-mátrix)
3. [ATDD - Acceptance Test-Driven Development](#3-atdd---acceptance-test-driven-development)
4. [További Tesztelési Módszertanok](#4-további-tesztelési-módszertanok)
5. [Modul-specifikus Stratégia](#5-modul-specifikus-stratégia)
6. [Teszt Piramis](#6-teszt-piramis)
7. [Code Review Szabályok](#7-code-review-szabályok)
   - 7.1 Dual-AI Adversarial Code Review
   - 7.2 TDD Ellenőrzés
   - 7.3 Automatikus Ellenőrzések (CI)
8. [Automatizálási Célok](#8-automatizálási-célok)

---

## 0. PACKAGE ELNEVEZÉSI KONVENCIÓ

> **FONTOS:** A projekt angol nyelvű package neveket használ (nemzetközi npm/TypeScript konvenció).

### Package Mapping (Üzleti domain → Package név)

| Üzleti Domain | Package | Teljes név |
|---------------|---------|------------|
| **CORE** | | |
| Autentikáció | auth | @kgc/auth |
| Tenant kezelés | tenant | @kgc/tenant |
| Audit log | audit | @kgc/audit |
| Konfiguráció | config | @kgc/config |
| Közös | common | @kgc/common |
| **SHARED** | | |
| UI komponensek | ui | @kgc/ui |
| Utility-k | utils | @kgc/utils |
| Típusok | types | @kgc/types |
| Lokalizáció | i18n | @kgc/i18n |
| Teszt segédek | testing | @kgc/testing |
| **Készlet (KÖZÖS)** | inventory | @kgc/inventory |
| **BÉRLÉS** | | |
| Bérlés üzleti logika | rental-core | @kgc/rental-core |
| Bérlés checkout/kaució | rental-checkout | @kgc/rental-checkout |
| Bérlési szerződés | rental-contract | @kgc/rental-contract |
| **SZERVIZ** | | |
| Szerviz üzleti logika | service-core | @kgc/service-core |
| Munkalap | service-worksheet | @kgc/service-worksheet |
| Garancia | service-warranty | @kgc/service-warranty |
| Alkatrész/norma | service-parts | @kgc/service-parts |
| **ÉRTÉKESÍTÉS** | | |
| Értékesítés logika | sales-core | @kgc/sales-core |
| POS/pénztár | sales-pos | @kgc/sales-pos |
| Számlázás | sales-invoice | @kgc/sales-invoice |
| Árajánlat | sales-quote | @kgc/sales-quote |
| **INTEGRÁCIÓ** | | |
| NAV Online | nav-online | @kgc/nav-online |
| MyPos fizetés | mypos | @kgc/mypos |
| Számlázz.hu | szamlazz-hu | @kgc/szamlazz-hu |
| Twenty CRM | twenty-crm | @kgc/twenty-crm |
| Chatwoot | chatwoot | @kgc/chatwoot |
| Horilla HR | horilla-hr | @kgc/horilla-hr |
| Email gateway | email-gateway | @kgc/email-gateway |

---

## 1. FEJLESZTÉSI METODOLÓGIA

### 1.1 Hibrid TDD + Tradicionális Megközelítés

```
┌─────────────────────────────────────────────────────────────────┐
│                    HIBRID FEJLESZTÉSI MODELL                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐         ┌─────────────────┐               │
│   │   TDD (30-40%)  │         │ TRADICIONÁLIS   │               │
│   │   Red-Green-    │         │    (60-70%)     │               │
│   │   Refactor      │         │ Code-First +    │               │
│   │                 │         │ Post-Test       │               │
│   └────────┬────────┘         └────────┬────────┘               │
│            │                           │                         │
│            ▼                           ▼                         │
│   ┌─────────────────┐         ┌─────────────────┐               │
│   │ • Üzleti logika │         │ • CRUD ops      │               │
│   │ • Számítások    │         │ • UI komponens  │               │
│   │ • Validációk    │         │ • Integráció    │               │
│   │ • State machine │         │ • Prototípus    │               │
│   │ • Pénzügyi ops  │         │ • Config        │               │
│   └─────────────────┘         └─────────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Mikor Használjunk TDD-t?

**TDD KÖTELEZŐ** (Red-Green-Refactor):

| Kritérium | Példa | Indoklás |
|-----------|-------|----------|
| Pénzügyi számítások | Késedelmi díj, ÁFA, árrés | Egy hiba = pénzügyi veszteség |
| Komplex üzleti szabályok | Garancia feltételek, kedvezmények | Sok edge case |
| State machine átmenetek | Munkalap státusz, bérlés lifecycle | Determinisztikus átmenetek |
| Validációk | Adószám, bankszámla, NAV XML | Szabályalapú, jól definiált |
| Pure functions | Dátum számítások, formázók | Izolált, nincs side effect |
| Kritikus útvonalak | Login, jogosultság ellenőrzés | Biztonsági kritikus |

**TRADICIONÁLIS ELÉG** (Code-First + Post-Test):

| Kritérium | Példa | Indoklás |
|-----------|-------|----------|
| CRUD műveletek | Partner létrehozás, lista | Egyszerű, kevés logika |
| UI komponensek | Form, táblázat, modal | Vizuális, nehéz TDD |
| Integráció külső API-val | NAV Online, Számlázz.hu | Mock-függő, változékony |
| Konfigurációs kód | Feature flags setup | Deklaratív |
| Prototípus/POC | Új feature kipróbálás | Gyors iteráció fontosabb |

---

## 2. TDD vs TRADICIONÁLIS - DÖNTÉSI MÁTRIX

### 2.1 Gyors Döntési Folyamatábra

```
                    ┌─────────────────────────┐
                    │ Új funkció fejlesztése  │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │ Van egyértelmű          │
                    │ input/output spec?      │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │ IGEN            │                 │ NEM
              ▼                 │                 ▼
    ┌─────────────────┐         │       ┌─────────────────┐
    │ Pénzügyi vagy   │         │       │ TRADICIONÁLIS   │
    │ biztonsági      │         │       │ Írd meg, utána  │
    │ kritikus?       │         │       │ tesztelj        │
    └────────┬────────┘         │       └─────────────────┘
             │                  │
    ┌────────┼────────┐         │
    │ IGEN   │        │ NEM     │
    ▼        │        ▼         │
┌────────┐   │   ┌────────────────────┐
│  TDD   │   │   │ Több mint 3 edge   │
│KÖTELEZŐ│   │   │ case várható?      │
└────────┘   │   └─────────┬──────────┘
             │             │
             │    ┌────────┼────────┐
             │    │ IGEN   │        │ NEM
             │    ▼        │        ▼
             │ ┌────────┐  │  ┌────────────┐
             │ │  TDD   │  │  │TRADICIONÁLIS│
             │ │AJÁNLOTT│  │  └────────────┘
             │ └────────┘  │
             │             │
             └─────────────┘
```

### 2.2 Pontozásos Rendszer

Minden új feature-nél számold ki a TDD Pontszámot:

| Faktor | Pont | Leírás |
|--------|------|--------|
| Pénzügyi művelet | +3 | Számla, fizetés, kaució |
| Biztonsági kritikus | +3 | Auth, RBAC, audit |
| Komplex üzleti szabály | +2 | Több feltétel, branch |
| State machine | +2 | Átmenetek, workflow |
| Több mint 5 edge case | +2 | Határesetek sokasága |
| Pure function | +1 | Nincs side effect |
| UI komponens | -2 | Vizuális, nehéz TDD |
| CRUD művelet | -1 | Egyszerű adatkezelés |
| Külső API integráció | -1 | Mock-függő |
| Prototípus fázis | -2 | Gyors iteráció kell |

**Értékelés:**
- **5+ pont**: TDD KÖTELEZŐ
- **3-4 pont**: TDD AJÁNLOTT
- **0-2 pont**: TRADICIONÁLIS
- **Negatív**: TRADICIONÁLIS + Integration test

---

## 3. ATDD - ACCEPTANCE TEST-DRIVEN DEVELOPMENT

### 3.1 Mi az ATDD?

Az ATDD az üzleti követelmények alapján írt tesztek, amelyeket **ELŐBB** definiálunk, mint az implementációt. A "3 Amigos" (PO + Dev + QA) együtt dolgoznak ki.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ATDD vs TDD ÖSSZEHASONLÍTÁS                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ATDD (Story szint)              │    TDD (Kód szint)                      │
│   ─────────────────               │    ────────────────                      │
│   Ki írja: PO + Dev + QA          │    Ki írja: Fejlesztő                    │
│   Nyelv: Gherkin (magyar)         │    Nyelv: TypeScript                     │
│   Fókusz: User behavior           │    Fókusz: Method logic                  │
│   Tool: Playwright + Cucumber     │    Tool: Vitest                          │
│   Mikor: Story refinement         │    Mikor: Implementáció előtt            │
│                                   │                                          │
│   ┌─────────────────────┐         │    ┌─────────────────────┐              │
│   │ Adott egy bérlés    │         │    │ describe('calc')    │              │
│   │ Amikor visszahozza  │         │    │   it('should...')   │              │
│   │ Akkor díj = X Ft    │         │    │   expect(x).toBe(y) │              │
│   └─────────────────────┘         │    └─────────────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 ATDD Workflow - "3 Amigos" Megközelítés

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ATDD FEJLESZTÉSI CIKLUS                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. SPECIFY (Story Refinement)                                               │
│     ┌─────────────────────────────────────────────────────────────────┐      │
│     │  👤 PO          👨‍💻 Dev         🧪 QA                              │      │
│     │    │              │              │                               │      │
│     │    └──────────────┼──────────────┘                               │      │
│     │                   │                                              │      │
│     │          ┌────────▼────────┐                                     │      │
│     │          │  Gherkin specs  │                                     │      │
│     │          │  (Acceptance    │                                     │      │
│     │          │   Criteria)     │                                     │      │
│     │          └─────────────────┘                                     │      │
│     └─────────────────────────────────────────────────────────────────┘      │
│                          │                                                    │
│                          ▼                                                    │
│  2. AUTOMATE (Test First)                                                    │
│     ┌─────────────────────────────────────────────────────────────────┐      │
│     │  Playwright + Cucumber tesztek implementálása                    │      │
│     │  → Tesztek FAIL-elnek (nincs még kód)                           │      │
│     └─────────────────────────────────────────────────────────────────┘      │
│                          │                                                    │
│                          ▼                                                    │
│  3. DEVELOP (TDD a háttérben)                                                │
│     ┌─────────────────────────────────────────────────────────────────┐      │
│     │  Feature implementálás TDD-vel                                   │      │
│     │  → Unit tesztek + Acceptance tesztek PASS                       │      │
│     └─────────────────────────────────────────────────────────────────┘      │
│                          │                                                    │
│                          ▼                                                    │
│  4. DEMO (Definition of Done)                                                │
│     ┌─────────────────────────────────────────────────────────────────┐      │
│     │  ✅ Acceptance teszt PASS = Story DONE                           │      │
│     └─────────────────────────────────────────────────────────────────┘      │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Mikor Használjunk ATDD-t?

| Kritérium | ATDD Szükséges? | Indoklás |
|-----------|-----------------|----------|
| Kritikus user journey | ✅ **IGEN** | Bérlés indítás, pénztár, munkalap lezárás |
| Komplex üzleti szabály | ✅ **IGEN** | Garancia feltételek, kedvezmények |
| Több stakeholder érintett | ✅ **IGEN** | PO + Dev + QA együtt kell |
| Regression kockázat | ✅ **IGEN** | Változás más feature-t érinthet |
| Egyszerű CRUD | ❌ NEM | Nincs üzleti komplexitás |
| Technikai refaktor | ❌ NEM | Nincs user-facing változás |
| Prototípus | ❌ NEM | Túl korai, gyors iteráció kell |

### 3.4 KGC User Journey-k - ATDD Kötelező

| User Journey | Epic | Prioritás | Story Count |
|--------------|------|-----------|-------------|
| **Bérlés indítás flow** | Epic-3 | P0 | 3-4 story |
| **Bérlés visszavétel** | Epic-3 | P0 | 2-3 story |
| **Kaució kezelés (MyPos)** | Epic-3 | P0 | 2 story |
| **Munkalap lifecycle** | Epic-4 | P0 | 4-5 story |
| **Pénztár / Eladás** | Epic-5 | P0 | 3 story |
| **Login + RBAC** | Epic-1 | P0 | 2 story |
| **Partner felvétel** | Epic-2 | P1 | 2 story |
| **Garancia igénylés** | Epic-4 | P1 | 2 story |
| **Árajánlat → Megrendelés** | Epic-4 | P2 | 2 story |
| **Riport generálás** | Epic-7 | P2 | 1 story |

### 3.5 Gherkin Példák (Magyar Nyelven)

#### Bérlés Indítás

```gherkin
# features/berles/berles-inditas.feature

Funkció: Bérlés indítása
  Mint eladó
  Szeretnék új bérlést indítani
  Hogy a vásárló elvihesse a kiválasztott bérgépet

  Háttér:
    Adott bejelentkezett felhasználó "operator" jogkörrel
    És létezik partner "Teszt Kft" adószámmal "12345678-2-42"
    És létezik bérgép "Makita HR2470" státusz "szabad"

  Forgatókönyv: Sikeres bérlés indítás új partnernek
    Amikor megnyitom a "Bérlés indítás" oldalt
    És kiválasztom a partnert "Teszt Kft"
    És kiválasztom a bérgépet "Makita HR2470"
    És beállítom a tervezett visszahozatalt "3 nap múlva"
    És megadom a kaució összeget "50000" Ft
    És rákattintok a "Bérlés indítása" gombra
    Akkor a bérlés létrejön "aktív" státusszal
    És a bérgép státusza "kiadva" lesz
    És a kaució rögzítve van "függőben" státusszal
    És megjelenik a "Bérlési szerződés" PDF letöltése

  Forgatókönyv: Bérlés indítás törzsvevőnek kaució nélkül
    Adott partner "Régi Ügyfél Kft" törzsvevő státusszal
    Amikor megnyitom a "Bérlés indítás" oldalt
    És kiválasztom a partnert "Régi Ügyfél Kft"
    Akkor a kaució mező értéke "0" Ft
    És megjelenik "Törzsvevő - kaució nem szükséges" üzenet

  Forgatókönyv: Bérlés indítás elutasítása - nincs elég bérgép
    Adott bérgép "Makita HR2470" státusz "kiadva"
    Amikor megnyitom a "Bérlés indítás" oldalt
    És kiválasztom a bérgépet "Makita HR2470"
    Akkor hibaüzenet jelenik meg "A bérgép nem elérhető"
    És a "Bérlés indítása" gomb inaktív
```

#### Munkalap Lezárás

```gherkin
# features/szerviz/munkalap-lezaras.feature

Funkció: Munkalap lezárása és számlázás
  Mint szervizes
  Szeretném lezárni a kész munkalapot
  Hogy a partner számlázhassa a javítást

  Háttér:
    Adott bejelentkezett felhasználó "szervizes" jogkörrel
    És létezik munkalap "ML-2026-0042" státusz "folyamatban"
    És munkalap tételek:
      | cikk           | mennyiség | egységár |
      | Szénkefe       | 2         | 1500     |
      | Munkadíj 1 óra | 1         | 8000     |

  Forgatókönyv: Sikeres munkalap lezárás
    Amikor megnyitom a munkalapot "ML-2026-0042"
    És rákattintok a "Munka kész" gombra
    Akkor a státusz "számlázandó" lesz
    És az anyagköltség "3000" Ft
    És a munkadíj "8000" Ft
    És a végösszeg nettó "11000" Ft
    És a végösszeg bruttó "13970" Ft
    És megjelenik a "Számla készítése" gomb

  Forgatókönyv: Garanciális munkalap - 0 Ft végösszeg
    Adott munkalap "ML-2026-0042" típus "garancia"
    Amikor megnyitom a munkalapot "ML-2026-0042"
    És rákattintok a "Munka kész" gombra
    Akkor a végösszeg "0" Ft
    És megjelenik "Garanciális javítás - díjmentes" üzenet
```

#### Késedelmi Díj Számítás

```gherkin
# features/berles/keses-szamitas.feature

Funkció: Késedelmi díj automatikus számítása
  Mint boltvezető
  Szeretném hogy a rendszer automatikusan számolja a késedelmi díjat
  Hogy ne kelljen kézzel kalkulálnom

  Forgatókönyv Vázlat: Késedelmi díj számítás
    Adott egy aktív bérlés <napidij> Ft napi díjjal
    És a tervezett visszahozatal <tervezett> volt
    És a tényleges visszahozatal <tenyleges>
    Amikor lezárom a bérlést
    Akkor a késedelmi díj <keses_dij> Ft

    Példák:
      | napidij | tervezett   | tenyleges   | keses_dij | megjegyzés               |
      | 10000   | 2026-01-10  | 2026-01-10  | 0         | Időben visszahozta       |
      | 10000   | 2026-01-10  | 2026-01-11  | 2000      | 1 nap késés (20%)        |
      | 10000   | 2026-01-10  | 2026-01-13  | 6000      | 3 nap késés              |
      | 10000   | 2026-01-10  | 2026-01-20  | 10000     | 10 nap = max (napidíj)   |
      | 10000   | 2026-01-10  | 2026-01-10 18:00 | 500  | 2 óra késés (óradíj)     |

  Forgatókönyv: Hétvégi kedvezmény alkalmazása
    Adott egy aktív bérlés 10000 Ft napi díjjal
    És a bérlés pénteken indult
    És hétfőn hozza vissza
    Amikor lezárom a bérlést
    Akkor a hétvégi napok 50% kedvezménnyel számolódnak
```

### 3.6 ATDD Technikai Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                      ATDD TECH STACK                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GHERKIN PARSER                                                  │
│  └── @cucumber/cucumber (hivatalos)                              │
│                                                                  │
│  BROWSER AUTOMATION                                              │
│  └── Playwright (cross-browser, fast)                            │
│      └── @playwright/test                                        │
│                                                                  │
│  API TESTING (backend ATDD)                                      │
│  └── SuperTest + Gherkin                                         │
│                                                                  │
│  STEP DEFINITIONS                                                │
│  └── TypeScript step implementations                             │
│                                                                  │
│  REPORTING                                                       │
│  └── Allure / Cucumber HTML Reporter                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Step Definition Példa

```typescript
// features/step-definitions/berles.steps.ts

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { BerlesPage } from '../pages/berles.page';

Given('létezik bérgép {string} státusz {string}', async function(nev, statusz) {
  // Seed test data
  await this.db.bergep.create({
    megnevezes: nev,
    statusz: statusz,
    tenantId: this.tenantId,
  });
});

When('kiválasztom a bérgépet {string}', async function(nev) {
  const page = new BerlesPage(this.page);
  await page.selectBergep(nev);
});

Then('a bérgép státusza {string} lesz', async function(expectedStatusz) {
  const bergep = await this.db.bergep.findFirst({
    where: { megnevezes: this.selectedBergep }
  });
  expect(bergep.statusz).toBe(expectedStatusz);
});

Then('a késedelmi díj {int} Ft', async function(expectedDij) {
  const displayedDij = await this.page.locator('[data-testid="keses-dij"]').textContent();
  expect(parseInt(displayedDij.replace(/\D/g, ''))).toBe(expectedDij);
});
```

### 3.7 ATDD + TDD Együttműködés

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ATDD + TDD KOMBINÁLT WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  USER STORY: Bérlés késedelmi díj számítás                                  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ 1. ATDD: Acceptance Test (Gherkin)                                 │     │
│  │    "Adott bérlés 10000 Ft → 3 nap késés → 6000 Ft késedelmi díj"   │     │
│  │    → Teszt FAIL (nincs implementáció)                              │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                              │                                               │
│                              ▼                                               │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ 2. TDD: Unit Tests (Vitest)                                        │     │
│  │    describe('calculateLateFee')                                    │     │
│  │      it('should calc 20% per day')          → RED                  │     │
│  │      it('should cap at daily rate')         → RED                  │     │
│  │      it('should handle partial day')        → RED                  │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                              │                                               │
│                              ▼                                               │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ 3. IMPLEMENTATION                                                   │     │
│  │    calculateLateFee() implementálása                               │     │
│  │    → Unit tesztek GREEN                                            │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                              │                                               │
│                              ▼                                               │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ 4. INTEGRATION                                                      │     │
│  │    BerlesService.close() használja calculateLateFee()-t            │     │
│  │    → ATDD Acceptance teszt GREEN                                   │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                              │                                               │
│                              ▼                                               │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ 5. DONE ✅                                                          │     │
│  │    - Unit tests: GREEN                                             │     │
│  │    - Acceptance tests: GREEN                                       │     │
│  │    - Code review: APPROVED                                         │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. TOVÁBBI TESZTELÉSI MÓDSZERTANOK

### 4.1 Módszertanok Összefoglalása

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    KGC TESZTELÉSI MÓDSZERTAN PALETTA                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    TDD      │  │    ATDD     │  │  CONTRACT   │  │  PROPERTY   │        │
│  │  Unit Test  │  │ Acceptance  │  │   TESTING   │  │   BASED     │        │
│  │             │  │             │  │   (Pact)    │  │ (fast-check)│        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         ▼                ▼                ▼                ▼                │
│    Üzleti         User          Plugin API      Edge case               │
│    logika         journey       határok         felfedezés              │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   VISUAL    │  │  SNAPSHOT   │  │    LOAD     │  │  MUTATION   │        │
│  │ REGRESSION  │  │   TESTING   │  │   TESTING   │  │   TESTING   │        │
│  │ (Chromatic) │  │  (Vitest)   │  │    (k6)     │  │  (Stryker)  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         ▼                ▼                ▼                ▼                │
│    UI konzisz-     API válasz      Teljesítmény    Teszt minőség        │
│    tencia          struktúra       határok         ellenőrzés            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Contract Testing (Pact) - Plugin API-khoz

**Mikor használjuk?**
- Plugin integrációk (Twenty CRM, Chatwoot, Horilla HR)
- Külső API-k (NAV Online, Számlázz.hu, MyPOS)
- Microservice határok (ha lesz service split)

```typescript
// Contract Test Példa: KGC ↔ Twenty CRM

// Consumer side (KGC)
describe('Twenty CRM Contract', () => {
  const provider = new PactV3({
    consumer: 'KGC-ERP',
    provider: 'Twenty-CRM',
  });

  it('should get partner by tax number', async () => {
    provider
      .given('partner exists with tax number 12345678-2-42')
      .uponReceiving('a request for partner by tax number')
      .withRequest({
        method: 'GET',
        path: '/api/partners',
        query: { taxNumber: '12345678-2-42' },
      })
      .willRespondWith({
        status: 200,
        body: {
          id: string(),
          name: string(),
          taxNumber: '12345678-2-42',
          email: email(),
        },
      });

    await provider.executeTest(async (mockServer) => {
      const client = new TwentyCrmClient(mockServer.url);
      const partner = await client.getPartnerByTaxNumber('12345678-2-42');
      expect(partner.taxNumber).toBe('12345678-2-42');
    });
  });
});
```

**KGC Contract-ok:**

| Consumer | Provider | Contract |
|----------|----------|----------|
| KGC Core | Twenty CRM | Partner sync, Contact lookup |
| KGC Core | Chatwoot | Ticket create, Status update |
| KGC Core | Horilla HR | Employee lookup, Schedule |
| KGC Számla | Számlázz.hu | Invoice create, Status |
| KGC Számla | NAV Online | XML submit, Response |
| KGC Kaució | MyPOS | Token hold, Release |

### 4.3 Property-Based Testing - Pénzügyi Számításokhoz

**Mikor használjuk?**
- Pénzügyi kalkulációk (edge case-ek automatikus felfedezése)
- Validációk (adószám, IBAN, email formátum)
- Matematikai függvények

```typescript
// Property-Based Test Példa: Késedelmi díj
import { fc } from 'fast-check';

describe('calculateLateFee - Property Based', () => {
  // Property 1: Késedelmi díj soha nem negatív
  it('should never return negative fee', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 100000 }),  // napidíj
        fc.integer({ min: 0, max: 365 }),         // késés napok
        (dailyRate, lateDays) => {
          const fee = calculateLateFee(dailyRate, lateDays);
          return fee >= 0;
        }
      )
    );
  });

  // Property 2: Késedelmi díj max = napidíj
  it('should never exceed daily rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 100000 }),
        fc.integer({ min: 0, max: 365 }),
        (dailyRate, lateDays) => {
          const fee = calculateLateFee(dailyRate, lateDays);
          return fee <= dailyRate;
        }
      )
    );
  });

  // Property 3: Több késés = több díj (monoton növekvő)
  it('should be monotonically increasing with late days', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 100000 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (dailyRate, days1, additionalDays) => {
          const days2 = days1 + additionalDays;
          const fee1 = calculateLateFee(dailyRate, days1);
          const fee2 = calculateLateFee(dailyRate, days2);
          return fee2 >= fee1;
        }
      )
    );
  });
});
```

**Property-Based Testing Használat:**

| Modul | Függvény | Properties |
|-------|----------|------------|
| `@kgc/berles` | calculateLateFee | Non-negative, Max cap, Monotonic |
| `@kgc/arres` | calculateMargin | Percentage bounds, Rounding rules |
| `@kgc/szamla` | calculateVAT | Correct rates, Rounding |
| `@kgc/keszlet` | calculateAvailable | Non-negative, Sum consistency |
| `@kgc/nav` | validateTaxNumber | Format rules, Checksum |

### 4.4 Visual Regression Testing - UI Konzisztenciához

**Mikor használjuk?**
- Design system komponensek (@kgc/ui)
- White-label témák (tenant-specifikus styling)
- Responsive layout

```
┌─────────────────────────────────────────────────────────────────┐
│                VISUAL REGRESSION WORKFLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. STORYBOOK                                                   │
│     └── Minden @kgc/ui komponens story-val                      │
│                                                                  │
│  2. CHROMATIC (vagy Percy)                                      │
│     └── Screenshot minden story-ról                             │
│     └── Diff detection PR-en                                    │
│                                                                  │
│  3. CI INTEGRATION                                              │
│     └── PR block ha vizuális diff van                          │
│     └── Manual approve szükséges                                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  PR #123: Update Button component                        │    │
│  │                                                          │    │
│  │  ⚠️  Visual changes detected:                            │    │
│  │                                                          │    │
│  │  Button/Primary:                                         │    │
│  │  ┌────────────┐    ┌────────────┐                       │    │
│  │  │  Before    │ →  │   After    │  Padding changed      │    │
│  │  └────────────┘    └────────────┘                       │    │
│  │                                                          │    │
│  │  [Accept] [Reject] [View Diff]                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Snapshot Testing - API Válaszokhoz

**Mikor használjuk?**
- API response struktúra
- PDF/XML generálás
- Config objektumok

```typescript
// Snapshot Test Példa: NAV XML
describe('NAV XML Builder', () => {
  it('should generate correct invoice XML', () => {
    const invoice = {
      invoiceNumber: 'KGC-2026-0001',
      partner: { taxNumber: '12345678-2-42', name: 'Teszt Kft' },
      items: [
        { name: 'Munkalap', netAmount: 10000, vatRate: 27 },
      ],
    };

    const xml = navXmlBuilder.createInvoice(invoice);

    // Snapshot comparison
    expect(xml).toMatchSnapshot();
  });
});
```

### 4.6 Load Testing - Kritikus Útvonalakhoz

**Mikor használjuk?**
- Pénztár (peak időszak)
- Riport generálás (havi zárás)
- Batch műveletek

```javascript
// k6 Load Test Példa
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up
    { duration: '5m', target: 50 },   // Steady
    { duration: '2m', target: 100 },  // Peak
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% < 500ms
    http_req_failed: ['rate<0.01'],    // < 1% failure
  },
};

export default function () {
  // Bérlés lista lekérdezés
  const res = http.get('http://localhost:3000/api/berles', {
    headers: { Authorization: `Bearer ${__ENV.TOKEN}` },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### 4.7 Mutation Testing - Teszt Minőség Ellenőrzéshez

**Mikor használjuk?**
- TDD-kötelező modulok teszt minőségének validálása
- Coverage 80%+ de tesztek gyengék?
- Sprint végén minőség audit

```bash
# Stryker konfigurálás
npx stryker run --mutate "packages/berles-berles/src/**/*.ts"
```

```
┌─────────────────────────────────────────────────────────────────┐
│                    MUTATION TESTING REPORT                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Module: @kgc/berles                                            │
│                                                                  │
│  Mutation Score: 85%                                            │
│  ████████████████░░░░                                           │
│                                                                  │
│  Survived Mutants (bad - tests didn't catch):                   │
│  ├── calculateLateFee.ts:42 - Changed > to >=                   │
│  ├── calculateLateFee.ts:55 - Removed boundary check            │
│  └── berles.service.ts:123 - Changed && to ||                   │
│                                                                  │
│  Action: Add tests for these edge cases!                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.8 Módszertan Döntési Mátrix

| Módszertan | Mikor | KGC Modulok | Tool |
|------------|-------|-------------|------|
| **TDD** | Üzleti logika | auth, berles, szamla, kaucio | Vitest |
| **ATDD** | User journey | Kritikus flow-k (15 story) | Playwright+Cucumber |
| **Contract** | API határok | Plugin integrációk | Pact |
| **Property** | Pénzügyi calc | berles, arres, szamla | fast-check |
| **Visual** | UI komponens | @kgc/ui, themes | Chromatic |
| **Snapshot** | Struktúra | API, XML, PDF | Vitest |
| **Load** | Performance | Pénztár, riport | k6 |
| **Mutation** | Teszt minőség | TDD-kötelező modulok | Stryker |

---

## 5. MODUL-SPECIFIKUS STRATÉGIA

### 5.1 CORE Layer (Mindig TDD)

| Package | TDD % | Prioritás | Indoklás |
|---------|-------|-----------|----------|
| `@kgc/auth` | **90%** | KÖTELEZŐ | Biztonsági kritikus |
| `@kgc/common` | 70% | Magas | RBAC, permission logic |
| `@kgc/tenant` | **85%** | KÖTELEZŐ | Multi-tenant izoláció |
| `@kgc/config` | 40% | Közepes | Feature flag logic TDD |
| `@kgc/audit` | 60% | Közepes | Audit trail logika |

#### Auth Modul - TDD Részletek

```typescript
// TDD KÖTELEZŐ ezekre:
- login() - credential validation
- validateToken() - JWT verification
- checkPermission() - RBAC logic
- refreshToken() - token rotation
- rateLimit() - brute force protection

// TRADICIONÁLIS elég:
- getUserProfile() - simple query
- updatePassword() - CRUD + hash
- logout() - session cleanup
```

### 5.2 SHARED Layer (Hibrid)

| Package | TDD % | Fókusz területek |
|---------|-------|------------------|
| `@kgc/types` | 30% | Type definitions, validációk |
| `@kgc/utils` | **70%** | Pure functions, számítások |
| `@kgc/ui` | 20% | Storybook + vizuális teszt |
| `@kgc/i18n` | 30% | Lokalizációs logika |
| `@kgc/testing` | 50% | Test utilities, fixtures |

#### Készlet Modul - TDD Map

```typescript
// TDD KÖTELEZŐ (üzleti logika):
describe('KeszletService', () => {
  describe('reserve()', () => {
    it('should reserve available stock')
    it('should fail when insufficient stock')
    it('should handle concurrent reservations')
    it('should respect min stock level')
  })

  describe('calculateAvailable()', () => {
    it('should subtract reserved from total')
    it('should handle multiple locations')
    it('should consider pending orders')
  })
})

// TRADICIONÁLIS (CRUD):
- create/update/delete készlet rekord
- list készlet with filters
- készlet import from CSV
```

### 5.3 SZERVIZ Layer

| Package | TDD % | TDD Fókusz |
|---------|-------|------------|
| `@kgc/service-core` | 55% | Szerviz üzleti logika |
| `@kgc/service-worksheet` | 60% | Státusz átmenetek, díjszámítás |
| `@kgc/service-warranty` | **70%** | Feltétel ellenőrzés, határidők |
| `@kgc/service-parts` | **80%** | Makita norma lookup, idő számítás |

#### Munkalap Státusz Machine - TDD Példa

```typescript
// TDD KÖTELEZŐ - State Machine
describe('MunkalapStateMachine', () => {
  const validTransitions = [
    ['FELVEVE', 'FOLYAMATBAN'],
    ['FOLYAMATBAN', 'VARHATO'],
    ['FOLYAMATBAN', 'KESZ'],
    ['KESZ', 'SZAMLAZANDO'],
    ['SZAMLAZANDO', 'LEZART'],
  ];

  const invalidTransitions = [
    ['FELVEVE', 'LEZART'],      // Skip not allowed
    ['LEZART', 'FOLYAMATBAN'],  // Backward not allowed
    ['KESZ', 'FELVEVE'],        // Reset not allowed
  ];

  validTransitions.forEach(([from, to]) => {
    it(`should allow transition from ${from} to ${to}`)
  });

  invalidTransitions.forEach(([from, to]) => {
    it(`should reject transition from ${from} to ${to}`)
  });
})
```

### 5.4 BÉRLÉS Layer

| Package | TDD % | TDD Fókusz |
|---------|-------|------------|
| `@kgc/rental-core` | **85%** | Késedelmi díj, időszámítás |
| `@kgc/rental-contract` | 45% | PDF generálás validation |
| `@kgc/rental-checkout` | **90%** | MyPos, kaució visszatartás logika |

> **Megjegyzés:** `@kgc/inventory` a SHARED rétegben található (50% TDD - Státusz, elérhetőség)

#### Bérlés Díjszámítás - TDD Részletek

```typescript
// TDD KÖTELEZŐ - Pénzügyi számítás
describe('BerlesDijService', () => {
  describe('calculateRentalFee()', () => {
    it('should calculate daily rate correctly')
    it('should apply weekend discount (FR-067)')
    it('should calculate late fee per started hour')
    it('should cap late fee at daily rate')
    it('should handle holiday pricing')
  })

  describe('calculateDeposit()', () => {
    it('should return 0 for regular customers with history')
    it('should require full deposit for new customers')
    it('should calculate partial deposit for returning customers')
  })

  // Edge cases
  describe('edge cases', () => {
    it('should handle DST transitions')
    it('should handle leap year')
    it('should handle midnight returns')
    it('should round to nearest 100 HUF')
  })
})
```

### 5.5 ÉRTÉKESÍTÉS Layer

| Package | TDD % | TDD Fókusz |
|---------|-------|------------|
| `@kgc/sales-core` | **70%** | Kedvezmények, összeg, árazás |
| `@kgc/sales-pos` | **85%** | Pénztár logika, árrés kalkuláció |
| `@kgc/sales-invoice` | **90%** | ÁFA, összeg számítás, NAV XML |
| `@kgc/sales-quote` | 55% | Árajánlat kalkuláció, konverzió |

#### Árrés Kalkulátor - TDD Példa

```typescript
// TDD KÖTELEZŐ - Kritikus üzleti logika
describe('ArresService', () => {
  describe('calculateSalePrice()', () => {
    // FR-082: Árrés kategóriák
    it('should apply "A" category margin (35%)')
    it('should apply "B" category margin (25%)')
    it('should apply "C" category margin (15%)')

    // Kerekítés szabályok
    it('should round to nearest 10 HUF under 1000')
    it('should round to nearest 100 HUF over 1000')
    it('should round to nearest 500 HUF over 10000')
  })

  describe('calculateMargin()', () => {
    it('should calculate margin from sale and cost price')
    it('should handle 0 cost price (division by zero)')
    it('should flag negative margin')
  })
})
```

### 5.6 INTEGRATION Layer

| Package | TDD % | TDD Fókusz |
|---------|-------|------------|
| `@kgc/nav-online` | **80%** | XML builder, response parser |
| `@kgc/mypos` | **75%** | Payment token, kaució logika |
| `@kgc/szamlazz-hu` | **70%** | Számla API integráció |
| `@kgc/twenty-crm` | 50% | Partner sync, contact lookup |
| `@kgc/chatwoot` | 40% | Ticket create, status update |
| `@kgc/horilla-hr` | 40% | Employee lookup, schedule |

---

## 6. TESZT PIRAMIS

### 6.1 KGC Specifikus Piramis

```
                          ╱╲
                         ╱  ╲
                        ╱ E2E╲           5% - Kritikus user journey
                       ╱ (Playwright)
                      ╱──────────╲
                     ╱            ╲
                    ╱ Integration  ╲      20% - API + Module
                   ╱   (Supertest)  ╲
                  ╱──────────────────╲
                 ╱                    ╲
                ╱      Unit Tests      ╲   75% - Service, Utils
               ╱    (Vitest / Jest)     ╲
              ╱──────────────────────────╲
```

### 6.2 Coverage Célok

| Layer | Line Coverage | Branch Coverage | TDD Target |
|-------|---------------|-----------------|------------|
| CORE | **90%** | **85%** | 80% TDD |
| SHARED | 80% | 75% | 60% TDD |
| SZERVIZ | 75% | 70% | 55% TDD |
| BÉRLÉS | **85%** | **80%** | 70% TDD |
| ÁRUHÁZ | 75% | 70% | 55% TDD |
| INTEGRATION | 70% | 65% | 45% TDD |

### 6.3 Teszt Típusok per Réteg

```
┌─────────────────────────────────────────────────────────────┐
│                      TESZT STRATÉGIA                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BACKEND (NestJS)                                           │
│  ├── Unit: Service methods, utils, validators               │
│  ├── Integration: Controller + Service + DB (TestContainers)│
│  └── E2E: Full API flow (Supertest)                         │
│                                                              │
│  FRONTEND (React)                                           │
│  ├── Unit: Hooks, utils, state logic                        │
│  ├── Component: React Testing Library                       │
│  ├── Visual: Storybook + Chromatic                         │
│  └── E2E: Playwright (kritikus flow-k)                      │
│                                                              │
│  SHARED (@kgc/* packages)                                   │
│  ├── Unit: Pure functions, validators                       │
│  └── Integration: Cross-package kommunikáció                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. CODE REVIEW SZABÁLYOK

### 7.1 Dual-AI Adversarial Code Review

**Claude Code + Gemini CLI** együttműködése code review-kra. Részletes dokumentáció: `implementation-artifacts/reviews/README.md`

```
Round 1: FÜGGETLEN review (Claude + Gemini párhuzamosan)
         - Egyik AI NEM olvassa a másik szekcióját
         - Minimum 3 issue per reviewer (BMAD adversarial követelmény)

Round 2: Kereszt-analízis
         - Elemzik egymás Round 1 findings-ait
         - AGREE / DISAGREE / EXPAND válaszok
         - Consensus javaslat

Round 3: Végső Consensus vagy Eszkaláció
         - Max 3 round, utána user dönt
```

**Használat:**
```bash
# Review fájl létrehozás
cd implementation-artifacts/reviews
./create-review.sh 1-2-token-refresh packages/core/auth/src/services/*.ts

# Claude review indítás
Read and follow _bmad/bmm/prompts/code-review-claude.md
to review implementation-artifacts/reviews/epic-1/1-2-token-refresh-review.md

# Gemini review indítás (külön terminál)
gemini "Read and follow _bmad/bmm/prompts/code-review-gemini.md to review implementation-artifacts/reviews/epic-1/1-2-token-refresh-review.md"
```

**Fájl struktúra:**
```
implementation-artifacts/reviews/
├── README.md
├── _TEMPLATE.md
├── create-review.sh
└── epic-{N}/
    └── {story-id}-review.md
```

### 7.2 TDD Ellenőrzés

Code review során ellenőrizni:

- [ ] **TDD-kötelező kód**: Van-e `*.spec.ts` ELŐBB mint az implementáció? (git history)
- [ ] **Coverage**: Új kód 80%+ lefedett?
- [ ] **Edge cases**: Boundary conditions tesztelve?
- [ ] **Naming**: Test nevek leírják az expected behavior-t?

### 7.3 Automatikus Ellenőrzések (CI)

```yaml
# .github/workflows/test.yml
- name: Check TDD compliance
  run: |
    # TDD-kötelező moduloknál ellenőrzi, hogy a test ELŐBB volt
    pnpm run check:tdd-compliance

- name: Coverage gate
  run: |
    pnpm test:coverage
    # Fail if below threshold
```

---

## 8. AUTOMATIZÁLÁSI CÉLOK

### 8.1 Fázis 1 - Alapok (Sprint 1-3)

- [ ] Vitest/Jest setup minden package-ben
- [ ] Coverage reporting (Codecov/Coveralls)
- [ ] Pre-commit hook: lint + type check
- [ ] CI pipeline: test on PR

### 8.2 Fázis 2 - Integráció (Sprint 4-6)

- [ ] TestContainers PostgreSQL
- [ ] API integration test suite
- [ ] Storybook + visual regression
- [ ] E2E framework setup (Playwright)

### 8.3 Fázis 3 - Maturitás (Sprint 7+)

- [ ] Mutation testing (Stryker)
- [ ] Performance regression tests
- [ ] Contract testing (Pact)
- [ ] Chaos engineering (opcionális)

---

## APPENDIX: TDD TEMPLATE

### A. Service Unit Test Template

```typescript
// packages/[layer]-[module]/src/[name].service.spec.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;
  let mockDependency: MockType<DependencyService>;

  beforeEach(() => {
    mockDependency = {
      someMethod: vi.fn(),
    };
    service = new MyService(mockDependency);
  });

  describe('methodName()', () => {
    describe('happy path', () => {
      it('should [expected behavior] when [condition]', async () => {
        // Arrange
        const input = { /* ... */ };
        mockDependency.someMethod.mockResolvedValue(/* ... */);

        // Act
        const result = await service.methodName(input);

        // Assert
        expect(result).toEqual(/* expected */);
      });
    });

    describe('edge cases', () => {
      it('should handle [edge case]', async () => {
        // ...
      });
    });

    describe('error handling', () => {
      it('should throw [ErrorType] when [condition]', async () => {
        // ...
        await expect(service.methodName(input))
          .rejects.toThrow(ErrorType);
      });
    });
  });
});
```

### B. TDD Checklist per Feature

```markdown
## TDD Checklist: [Feature Name]

### Pre-Implementation
- [ ] Acceptance criteria definiálva
- [ ] Edge cases azonosítva
- [ ] Test file létrehozva (ELŐBB mint implementáció)
- [ ] Failing tests megírva (RED)

### Implementation
- [ ] Minimum kód a tesztek átmenéséhez (GREEN)
- [ ] Refaktor (REFACTOR)
- [ ] Edge case tesztek hozzáadva
- [ ] Error handling tesztek

### Post-Implementation
- [ ] Coverage ellenőrzés (80%+)
- [ ] Integration test szükséges?
- [ ] E2E test szükséges?
- [ ] Documentation frissítve
```

---

## CHANGELOG

| Verzió | Dátum | Változás |
|--------|-------|----------|
| 2.2 | 2026-01-16 | Dual-AI Adversarial Code Review (Claude + Gemini) hozzáadva |
| 2.0 | 2026-01-15 | ATDD, Contract Testing, Property-Based, Visual Regression, Load Testing, Mutation Testing hozzáadva |
| 1.0 | 2026-01-15 | Kezdeti verzió - TDD alapok |

---

*Ez egy élő dokumentum. Fejlesztés során folyamatosan frissítendő az új tapasztalatok alapján.*
