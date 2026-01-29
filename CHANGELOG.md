# Changelog

Minden jelentős változás dokumentálva van ebben a fájlban.

A formátum [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) alapján készül,
és a projekt [Semantic Versioning](https://semver.org/spec/v2.0.0.html) szabványt követi.

## [7.1.0] - 2026-01-29

### Hozzáadva

#### API Integráció

- **Frontend API kliensek**: Új API kliensek és React hookok minden modulhoz
  - `apps/kgc-web/src/api/` - API kliens fájlok (inventory, invoices, partners, products, rentals, sales, tasks, worksheets)
  - `apps/kgc-web/src/hooks/` - React hookok (use-inventory, use-invoices, use-partners, use-products, use-rentals, use-sales, use-tasks, use-worksheets)

#### Backend Kontrollerek

- **Direct kontrollerek**: Közvetlen Prisma lekérdezéseket használó kontrollerek
  - `apps/kgc-api/src/modules/partners/controllers/partner-direct.controller.ts`
  - `apps/kgc-api/src/modules/products/controllers/product-direct.controller.ts`
  - `apps/kgc-api/src/modules/rental/controllers/rental-direct.controller.ts`
  - `apps/kgc-api/src/modules/service/controllers/worksheet-direct.controller.ts`

#### POS Modul

- **Tranzakció lista endpoint**: GET `/api/v1/pos/transactions` - értékesítések lekérdezése
- **Tranzakció filter interfész**: `ITransactionFilter` típus a `@kgc/sales-pos` csomagban

### Javítva

#### Hibakezelés

- **ProductListPage.tsx**: `stats?.totalValue ?? 0` - null check hozzáadva a stats értékekhez
- **InvoiceListPage.tsx**: `invoices ?? []` - undefined check a számlalistához
- **TasksPage.tsx**: `tasks ?? []` - undefined check a feladatlistához
- **invoices.ts API**: Null check hozzáadva a `getInvoices` és `getInvoiceStats` függvényekhez

#### SQL Query-k

- **product-direct.controller.ts**: Raw SQL query táblanevek javítva (`"Product"` → `products`, `"InventoryItem"` → `inventory_items`)

#### Seed Data

- **seed.ts**: 5 értékesítési tranzakció és CashRegisterSession hozzáadva a demo adatokhoz

### Változtatva

- **PosModule**: Hozzáadva az `app.module.ts`-hez a POS endpoint-ok engedélyezéséhez
- **@kgc/sales-pos package.json**: CommonJS exports hozzáadva (`require` entry)
- **useWarehouses hook**: API response formátum kezelés javítva (tömb és objektum támogatás)

### Demo Környezet

- **URL**: https://demo-kgc.mflerp.com/
- **Teszt belépés**:
  - Admin: `admin@kgc.hu` / `admin123`
  - Operator: `operator@kgc.hu` / `operator123` (PIN: 1234)

---

## [7.0.0] - 2026-01-28

### Hozzáadva

- Teljes KGC ERP v7.0 implementáció - 32 epic befejezve
- Twenty CRM integráció (Epic 28)
- Chatwoot support integráció
- Horilla HR integráció
- NAV Online számlázás integráció
- MyPOS fizetési integráció
- Offline-first PWA támogatás
- Multi-tenant franchise architektúra

### Dokumentáció

- Részletes ADR dokumentumok (43 db)
- BMAD módszertan implementáció
- CI/CD pipeline konfiguráció

---

## Verzió Információk

| Verzió | Dátum      | Leírás                                |
| ------ | ---------- | ------------------------------------- |
| 7.1.0  | 2026-01-29 | API integráció, hibakezelés javítások |
| 7.0.0  | 2026-01-28 | Teljes implementáció - 32 epic        |
