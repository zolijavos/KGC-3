# KGC ERP - Teszt Összefoglaló és Ajánlások

**Dátum:** 2026-02-02
**Készítette:** Murat (BMAD TEA - Master Test Architect)
**Verzió:** 1.0

---

## 1. Teszt Infrastruktúra Áttekintés

### 1.1 Számok

| Kategória                   | Darabszám                        |
| --------------------------- | -------------------------------- |
| **Unit tesztek** (.spec.ts) | 178                              |
| **E2E tesztek** (.e2e.ts)   | 11 fájl                          |
| **Test Framework**          | Vitest (unit) + Playwright (E2E) |

### 1.2 E2E Teszt Struktúra

```
e2e/
├── critical/           # P0 - KRITIKUS (5 fájl)
│   ├── auth.e2e.ts           # Autentikáció, RBAC, session
│   ├── rental-checkout.e2e.ts # Bérlési checkout wizard
│   ├── nav-invoice.e2e.ts    # NAV számlázás
│   ├── multi-tenant.e2e.ts   # Multi-tenant izoláció
│   ├── pages-smoke.e2e.ts    # Oldal smoke tesztek
│   └── new-pages.e2e.ts      # Új oldalak
├── important/          # P1 - FONTOS (2 fájl)
│   ├── pos-sales.e2e.ts      # POS pénztár
│   └── service-worksheet.e2e.ts # Munkalap
├── standard/           # P2 - STANDARD (1 fájl)
│   └── smoke-test.e2e.ts
└── api/                # API tesztek (2 fájl)
    ├── horilla-hr.api.e2e.ts # Horilla HR API
    └── partners.api.e2e.ts   # Partner API
```

---

## 2. Futtatási Parancsok

### 2.1 Gyors Referencia

| Parancs                  | Leírás                | Mikor használd?     |
| ------------------------ | --------------------- | ------------------- |
| `pnpm test`              | Unit tesztek (Vitest) | Minden commit előtt |
| `pnpm test:e2e:critical` | Csak P0 kritikus E2E  | Gyors ellenőrzés    |
| `pnpm test:e2e`          | Összes E2E            | PR előtt            |
| `pnpm test:e2e:yolo`     | Gyors E2E (no retry)  | Fejlesztés közben   |
| `pnpm test:e2e:ui`       | Interaktív UI         | Debuggoláshoz       |

### 2.2 Részletes Parancsok

```bash
# ============================================
# UNIT TESZTEK (Vitest)
# ============================================

# Összes unit teszt
pnpm test

# Watch mód (fejlesztéshez)
pnpm test:watch

# Coverage riport
pnpm test:coverage

# Specifikus package
pnpm --filter @kgc/auth test
pnpm --filter @kgc/rental-core test

# ============================================
# E2E TESZTEK (Playwright)
# ============================================

# Összes E2E
pnpm test:e2e

# Csak kritikus (P0)
pnpm test:e2e:critical

# Csak API tesztek
pnpm test:e2e:api

# YOLO mód (gyors, nem áll meg hibánál)
pnpm test:e2e:yolo

# Párhuzamos (4 worker)
pnpm test:e2e:parallel

# UI mód (interaktív debugger)
pnpm test:e2e:ui

# Headed (látható böngésző)
pnpm test:e2e:headed

# Tag alapú futtatás
pnpm test:e2e -- --grep @Auth
pnpm test:e2e -- --grep @Berles
pnpm test:e2e -- --grep @SEC

# Report megtekintése
pnpm test:e2e:report
```

---

## 3. Ajánlott Tesztelési Terv

### 3.1 Azonnali Futtatás (Smoke Test)

```bash
# 1. Ellenőrizd, hogy fut-e a dev szerver
pnpm dev

# 2. Futtasd a kritikus teszteket
pnpm test:e2e:critical
```

**Várt eredmény:** A kritikus tesztek ~2-3 perc alatt lefutnak.

### 3.2 Prioritás Szerinti Futtatás

| Prioritás         | Parancs                                | Idő      | Mikor?              |
| ----------------- | -------------------------------------- | -------- | ------------------- |
| **P0 - Kritikus** | `pnpm test:e2e:critical`               | ~3 perc  | Minden deploy előtt |
| **P1 - Fontos**   | `pnpm test:e2e -- --project=important` | ~5 perc  | Release előtt       |
| **P2 - Standard** | `pnpm test:e2e`                        | ~10 perc | Nightly build       |

### 3.3 Domain Szerinti Futtatás

```bash
# Bérlés domain
pnpm test:e2e -- --grep @Berles

# Autentikáció és biztonság
pnpm test:e2e -- --grep "@Auth|@SEC"

# Szerviz/Munkalap
pnpm test:e2e -- --grep @Szerviz

# Értékesítés/POS
pnpm test:e2e -- --grep @Aruhaz
```

---

## 4. Teszt Lefedettség Elemzés

### 4.1 Unit Tesztek Domainenkét

| Domain            | Package         | Tesztek | Lefedettség |
| ----------------- | --------------- | ------- | ----------- |
| **Core - Auth**   | @kgc/auth       | 12      | 🟢 Magas    |
| **Core - Tenant** | @kgc/tenant     | 9       | 🟢 Magas    |
| **Core - Users**  | @kgc/users      | 15      | 🟢 Magas    |
| **Bérlés**        | @kgc/rental-\*  | 8       | 🟡 Közepes  |
| **Szerviz**       | @kgc/service-\* | 6       | 🟡 Közepes  |
| **Értékesítés**   | @kgc/sales-\*   | 7       | 🟡 Közepes  |
| **Inventory**     | @kgc/inventory  | 4       | 🟡 Közepes  |
| **Chat**          | @kgc/chat       | 5       | 🟢 Jó       |
| **NAV Online**    | @kgc/nav-online | 3       | 🟡 Közepes  |

### 4.2 E2E Lefedettség

| Flow                   | Teszt Fájl               | Státusz      |
| ---------------------- | ------------------------ | ------------ |
| **Bejelentkezés**      | auth.e2e.ts              | ✅ Teljes    |
| **RBAC jogosultságok** | auth.e2e.ts              | ✅ Teljes    |
| **Session kezelés**    | auth.e2e.ts              | ✅ Teljes    |
| **Bérlés checkout**    | rental-checkout.e2e.ts   | ✅ Teljes    |
| **NAV számlázás**      | nav-invoice.e2e.ts       | ✅ Teljes    |
| **Multi-tenant**       | multi-tenant.e2e.ts      | ✅ Teljes    |
| **POS eladás**         | pos-sales.e2e.ts         | 🟡 Részleges |
| **Munkalap**           | service-worksheet.e2e.ts | 🟡 Részleges |
| **Partner API**        | partners.api.e2e.ts      | ✅ Teljes    |
| **Horilla HR API**     | horilla-hr.api.e2e.ts    | 🟡 Részleges |

---

## 5. Ismert Problémák és Kockázatok

### 5.1 E2E Teszt Függőségek

| Probléma            | Hatás                   | Megoldás                                 |
| ------------------- | ----------------------- | ---------------------------------------- |
| Dev szerver nem fut | E2E tesztek elszállnak  | `pnpm dev` előtte                        |
| Auth setup hiányzik | Login tesztek failelnek | `e2e/fixtures/auth.setup.ts` ellenőrzése |
| TestSeeding API     | Néhány teszt skip-el    | Mock data használata                     |

### 5.2 Potenciális Flaky Tesztek

| Teszt               | Ok                | Mitigáció            |
| ------------------- | ----------------- | -------------------- |
| Brute force teszt   | Rate limit timing | YOLO módban skip     |
| MyPOS kaució        | External mock     | Mock timeout növelés |
| Real-time WebSocket | Async timing      | Explicit wait        |

---

## 6. Javasolt Futtatási Sorrend

### 6.1 Gyors Ellenőrzés (5 perc)

```bash
# 1. TypeScript ellenőrzés
pnpm typecheck

# 2. Lint
pnpm lint

# 3. Unit tesztek (core)
pnpm --filter @kgc/auth test
pnpm --filter @kgc/tenant test

# 4. E2E kritikus
pnpm test:e2e:critical
```

### 6.2 Teljes Teszt Suite (20 perc)

```bash
# 1. Összes unit teszt
pnpm test

# 2. Összes E2E
pnpm test:e2e

# 3. Coverage riport
pnpm test:coverage
```

### 6.3 Demo Környezet Validálás

```bash
# Remote környezet ellen
E2E_BASE_URL=https://demo-kgc.mflerp.com pnpm test:e2e:critical
```

---

## 7. Következő Lépések (TEA Ajánlás)

### 7.1 Azonnali Teendők

| #   | Feladat                                        | Prioritás  |
| --- | ---------------------------------------------- | ---------- |
| 1   | Futtasd: `pnpm test:e2e:critical`              | 🔴 Magas   |
| 2   | Ellenőrizd a report-ot: `pnpm test:e2e:report` | 🟡 Közepes |
| 3   | Ha fail: debug UI módban                       | 🟡 Közepes |

### 7.2 Ha Hibát Találsz

```bash
# 1. UI módban debug
pnpm test:e2e:ui

# 2. Trace megtekintése
npx playwright show-trace test-results/[teszt-neve]/trace.zip

# 3. Headed módban futtatás
pnpm test:e2e:headed
```

### 7.3 Hiányzó Tesztek Pótlása

A TEA elemzésem alapján ezek a területek igényelnek több tesztet:

| Terület                | Hiány               | Javaslat            |
| ---------------------- | ------------------- | ------------------- |
| **Offline PWA**        | E2E teszt nincs     | ServiceWorker teszt |
| **Push notifications** | E2E teszt nincs     | Mock push teszt     |
| **Visszavétel flow**   | Részleges           | Teljes happy path   |
| **Storno számla**      | Unit van, E2E nincs | E2E teszt           |

---

## 8. Parancs Cheat Sheet

```bash
# ============================================
# LEGFONTOSABB PARANCSOK
# ============================================

# Minden ellenőrzés (commit előtt)
pnpm lint && pnpm typecheck && pnpm test

# Gyors E2E (fejlesztés közben)
pnpm test:e2e:yolo

# Kritikus E2E (deploy előtt)
pnpm test:e2e:critical

# Debug mód
pnpm test:e2e:ui

# Coverage
pnpm test:coverage

# Report
pnpm test:e2e:report
```

---

_Dokumentum vége_

**Master Test Architect véleménye:** A KGC ERP teszt infrastruktúra solid alapokon áll. A kritikus üzleti folyamatok (auth, bérlés, számlázás) jól le vannak fedve. Ajánlom a `pnpm test:e2e:critical` futtatását első lépésként - ez megmutatja a rendszer egészségét.

_"A teszt nem költség, hanem befektetés. Minden elkapott bug a tesztelés során 10x olcsóbb, mint production-ben."_ - TEA
