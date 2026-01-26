# Story 22.1: Értékesítés kasszából (Session + Cart + Transaction)

Status: done

---

## Story

**Mint** bolti eladó,
**szeretnék** egy kassza session-t nyitni, termékeket kosárba tenni és értékesítési tranzakciót létrehozni,
**hogy** a napi bolti értékesítést hatékonyan tudjam kezelni.

---

## Acceptance Criteria

### AC1: Kassza session nyitás

- [x] Eladó tud kassza session-t nyitni `openingBalance` megadásával
- [x] Session kap egyedi `sessionNumber`-t (KASSZA-YYYY-NNNN formátum)
- [x] Session státusz: OPEN
- [x] Egy időben csak egy aktív session lehet location-ön belül

### AC2: Termék kosárba helyezése

- [x] Eladó tud terméket kosárba tenni vonalkód/SKU alapján
- [x] Kosárban látható: termék neve, mennyiség, egységár, sor összeg
- [x] Mennyiség módosítható (+/- vagy közvetlen szám)
- [x] Tétel törölhető a kosárból
- [x] ÁFA automatikusan kalkulálódik (27%, 18%, 5%, 0%)

### AC3: Tranzakció létrehozás

- [x] Tranzakció kap egyedi `transactionNumber`-t (ELADAS-YYYY-NNNN)
- [x] Kosár → Tranzakció konverzió
- [x] Összegek kalkulálása: subtotal, taxAmount, discountAmount, total
- [x] Tranzakció státusz: IN_PROGRESS → PENDING_PAYMENT

### AC4: Opcionális vevő hozzárendelés

- [x] Vevő opcionálisan megadható (készpénzes vásárlásnál nem kötelező)
- [x] Ha vevő megadva: `customerId`, `customerName`, `customerTaxNumber` tárolás
- [ ] Partner keresés név/telefon/adószám alapján (frontend feature - nem része ennek a story-nak)

### AC5: Tranzakció sztornó

- [x] IN_PROGRESS vagy PENDING_PAYMENT státuszú tranzakció sztornózható
- [x] Sztornó rögzíti: `voidedAt`, `voidedBy`, `voidReason`
- [x] Sztornózott tranzakció státusz: VOIDED

---

## Tasks / Subtasks

### Task 1: Package setup (AC: all) ✅

- [x] 1.1 Létrehozni `packages/aruhaz/sales-pos/package.json`
- [x] 1.2 Létrehozni `tsconfig.json`, `vitest.config.ts`
- [x] 1.3 Létrehozni alapstruktúra: `src/`, `src/interfaces/`, `src/services/`, `src/dto/`

### Task 2: Interfaces létrehozása (AC: 1, 2, 3) ✅

- [x] 2.1 `session.interface.ts` - ICashRegisterSession, CashRegisterStatus enum
- [x] 2.2 `transaction.interface.ts` - ISaleTransaction, ISaleItem, SaleStatus enum
- [x] 2.3 Repository interfészek: ISessionRepository, ITransactionRepository, ISaleItemRepository

### Task 3: DTOs és validáció (AC: 1, 2, 3, 4, 5) ✅

- [x] 3.1 `session.dto.ts` - OpenSessionDto, CloseSessionDto Zod sémákkal
- [x] 3.2 `transaction.dto.ts` - CreateTransactionDto, AddItemDto, VoidTransactionDto
- [x] 3.3 `cart.dto.ts` - CartItemDto, UpdateCartItemDto

### Task 4: Session Service implementáció (AC: 1) ✅

- [x] 4.1 `session.service.ts` - openSession(), getCurrentSession(), suspendSession()
- [x] 4.2 Session number generálás: KASSZA-{év}-{sorszám}
- [x] 4.3 Aktív session validáció (egy location = egy session)
- [x] 4.4 Unit tesztek: `session.service.spec.ts` (18 teszt)

### Task 5: Cart Service implementáció (AC: 2) ✅

- [x] 5.1 `cart.service.ts` - addItem(), updateQuantity(), removeItem(), clearCart()
- [x] 5.2 Sor összeg kalkuláció: lineSubtotal, lineTax, lineTotal
- [x] 5.3 ÁFA kalkuláció különböző tax rate-ekkel (27%, 18%, 5%, 0%)
- [x] 5.4 Unit tesztek: `cart.service.spec.ts` (22 teszt)

### Task 6: Transaction Service implementáció (AC: 3, 4, 5) ✅

- [x] 6.1 `transaction.service.ts` - createTransaction(), addItem(), completeTransaction()
- [x] 6.2 Transaction number generálás: ELADAS-{év}-{sorszám}
- [x] 6.3 Összeg kalkuláció: subtotal, taxAmount, discountAmount, total
- [x] 6.4 voidTransaction() implementáció
- [x] 6.5 Opcionális vevő kezelés (setCustomer)
- [x] 6.6 Unit tesztek: `transaction.service.spec.ts` (21 teszt)

### Task 7: Module és exports (AC: all) ✅

- [x] 7.1 `sales-pos.module.ts` - NestJS modul
- [x] 7.2 `index.ts` - Public exports
- [x] 7.3 Build teszt: `pnpm build` - sikeres!

### Task 8: API Repository - Prisma implementáció (AC: all) ✅

- [x] 8.1 `apps/kgc-api/src/modules/pos/prisma-session.repository.ts`
- [x] 8.2 `apps/kgc-api/src/modules/pos/prisma-transaction.repository.ts`
- [x] 8.3 `apps/kgc-api/src/modules/pos/pos.controller.ts` - REST endpoints
- [x] 8.4 `apps/kgc-api/src/modules/pos/pos.module.ts` - NestJS DI wiring

---

## Dev Notes

### Architektúra (ADR-046)

**Package:** `@kgc/sales-pos` (packages/aruhaz/sales-pos/)

**Prisma modellek:** Már hozzáadva a sémához!

- `CashRegisterSession` - Kassza session
- `SaleTransaction` - Értékesítési tranzakció
- `SaleItem` - Értékesítési tétel
- `SalePayment` - Fizetési rekord (Story 22-2-ben!)

**Függőségek:**

- `@kgc/inventory` - Készlet lekérdezés (nem csökkentés - az csak 22-2-ben!)
- `@kgc/cikk` / Product - Termék adatok
- `@kgc/partner` - Opcionális vevő

### Fontos technikai döntések

1. **Offline-first**: Ez a story NEM implementálja az offline funkciót - azt a frontend PWA kezeli majd. A backend API-k szinkron működnek.

2. **Készlet NEM csökken**: A 22-1 story-ban a készlet NEM csökken! Az inventory csak lekérdezésre kell (van-e elég?). A tényleges készletcsökkentés a payment completion-nél történik (22-2 story).

3. **Session validáció**: Egy location-ön egyszerre csak EGY OPEN session lehet. Ha van nyitott session, új nyitás előtt figyelmeztetés szükséges.

4. **Sorszám generálás**: Sequence-ek tenant-specifikusak (mint a bevetelezes-nél).

### Minta követése - @kgc/bevetelezes

Ugyanazt a struktúrát kövesd:

```
packages/aruhaz/sales-pos/
├── src/
│   ├── index.ts                    # Public exports
│   ├── sales-pos.module.ts         # NestJS module
│   ├── interfaces/
│   │   ├── session.interface.ts
│   │   └── transaction.interface.ts
│   ├── dto/
│   │   ├── session.dto.ts
│   │   ├── transaction.dto.ts
│   │   └── cart.dto.ts
│   └── services/
│       ├── session.service.ts
│       ├── session.service.spec.ts
│       ├── cart.service.ts
│       ├── cart.service.spec.ts
│       ├── transaction.service.ts
│       └── transaction.service.spec.ts
```

### Project Structure Notes

- **Package location:** `packages/aruhaz/sales-pos/`
- **API module location:** `apps/kgc-api/src/modules/pos/`
- **Prisma schema:** Modellek már hozzáadva (2026-01-26)
- **TypeScript:** strict mode, NodeNext module resolution (.js extensions!)

### TDD kötelező

**Red-Green-Refactor** alkalmazása:

- Összeg kalkulációk (lineSubtotal, lineTax, lineTotal)
- Session validáció (egy aktív session/location)
- Transaction státusz átmenetek

### API Endpoints (implementálandó)

```typescript
// Session management
POST   /api/v1/pos/sessions                    // Kassza nyitás
GET    /api/v1/pos/sessions/current            // Aktív session
POST   /api/v1/pos/sessions/:id/suspend        // Felfüggesztés

// Transaction management
POST   /api/v1/pos/transactions                // Új tranzakció
GET    /api/v1/pos/transactions/:id            // Tranzakció lekérés
POST   /api/v1/pos/transactions/:id/items      // Tétel hozzáadás
DELETE /api/v1/pos/transactions/:id/items/:itemId  // Tétel törlés
PATCH  /api/v1/pos/transactions/:id/items/:itemId  // Tétel módosítás
POST   /api/v1/pos/transactions/:id/void       // Sztornó
```

### References

- [ADR-046: Point of Sale Architecture](../planning-artifacts/adr/ADR-046-point-of-sale-architecture.md)
- [ADR-010: Micro-modules](../planning-artifacts/adr/ADR-010-micro-modules-detailed.md)
- [ADR-005: MyPos Payment](../planning-artifacts/adr/ADR-005-mypos-payment-token-2025-12-08.md)
- [Epic 21: Bevetelezes implementation](./21-1-avizo-kezeles.md) - minta a package struktúrához
- [Project Context](../docs/project-context.md)

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Build: `pnpm --filter @kgc/sales-pos build` - sikeres
- Tesztek: `pnpm --filter @kgc/sales-pos test` - **62 teszt sikeres**

### Completion Notes List

1. TDD megközelítés alkalmazva - minden service-hez előre megírt tesztek
2. Magyar ÁFA kulcsok implementálva: 27%, 18%, 5%, 0%
3. `exactOptionalPropertyTypes` TypeScript strict szabály kezelése conditional assignment-tel
4. Repository pattern implementálva interface-ekkel + Prisma implementáció
5. Prisma reláció kezelés: `connect` syntax használata (customer, product, warehouse)

### Code Review Results (Adversarial)

**Review Date:** 2026-01-26
**Reviewer:** Claude Opus 4.5 (BMAD code-review workflow)
**Issues Found:** 8 (3 HIGH, 3 MEDIUM, 2 LOW)
**Status:** All HIGH and MEDIUM issues fixed

#### HIGH Priority (Fixed)

| #   | Issue                                            | File                                  | Fix                                                     |
| --- | ------------------------------------------------ | ------------------------------------- | ------------------------------------------------------- |
| 1   | `suspendSession` method signature mismatch       | session.service.ts, pos.controller.ts | Signature javítva: `reason` paraméter hozzáadva         |
| 2   | `getCurrentSession` endpoint incomplete          | pos.controller.ts                     | `@Query('locationId')` hozzáadva, service hívás javítva |
| 3   | `CartService` shared Map - nem multi-tenant safe | cart.service.ts                       | `@Injectable({ scope: Scope.REQUEST })` hozzáadva       |

#### MEDIUM Priority (Fixed)

| #   | Issue                                          | File                             | Fix                                        |
| --- | ---------------------------------------------- | -------------------------------- | ------------------------------------------ |
| 4   | `generateId` collision risk - Math.random()    | cart.service.ts                  | `crypto.randomUUID()` használata           |
| 5   | `taxRate` validation too permissive            | transaction.dto.ts               | Zod refine: csak 0, 5, 18, 27 engedélyezve |
| 6   | Missing exhaustive checks in mapping functions | prisma-transaction.repository.ts | throw statement hozzáadva switch után      |

#### LOW Priority (Not Fixed - Acceptable)

| #   | Issue                                         | File                         | Reason                         |
| --- | --------------------------------------------- | ---------------------------- | ------------------------------ |
| 7   | `findCurrentByLocation` missing tenant filter | prisma-session.repository.ts | RLS szinten kezelve (ADR-001)  |
| 8   | Session tests tenant context incomplete       | session.service.spec.ts      | Mock environment - elfogadható |

#### Test Updates

- `session.service.spec.ts` - `suspendSession` tesztek frissítve új signature-rel
- +1 új teszt: "should suspend with undefined reason"
- **Összes teszt: 62 (korábban 61)**

### Change Log

| Dátum      | Változás                                   | Szerző                        |
| ---------- | ------------------------------------------ | ----------------------------- |
| 2026-01-26 | Story létrehozva, ready-for-dev            | Claude (create-story)         |
| 2026-01-26 | Story implementálva, összes task befejezve | Claude Opus 4.5 (dev-story)   |
| 2026-01-26 | Code review befejezve, 6 issue javítva     | Claude Opus 4.5 (code-review) |

### File List

#### Package: `packages/aruhaz/sales-pos/`

- `package.json` - Package konfiguráció
- `tsconfig.json` - TypeScript konfiguráció
- `vitest.config.ts` - Teszt konfiguráció
- `tsup.config.ts` - Build konfiguráció
- `src/index.ts` - Public exports
- `src/sales-pos.module.ts` - NestJS modul
- `src/interfaces/session.interface.ts` - Session interfészek és enum-ok
- `src/interfaces/transaction.interface.ts` - Transaction interfészek és enum-ok
- `src/dto/session.dto.ts` - Session DTOs + Zod validáció
- `src/dto/transaction.dto.ts` - Transaction DTOs + Zod validáció
- `src/dto/cart.dto.ts` - Cart DTOs + ÁFA definíciók
- `src/services/session.service.ts` - Session service implementáció
- `src/services/session.service.spec.ts` - Session tesztek (18 teszt)
- `src/services/cart.service.ts` - Cart service implementáció
- `src/services/cart.service.spec.ts` - Cart tesztek (22 teszt)
- `src/services/transaction.service.ts` - Transaction service implementáció
- `src/services/transaction.service.spec.ts` - Transaction tesztek (21 teszt)

#### API Module: `apps/kgc-api/src/modules/pos/`

- `prisma-session.repository.ts` - Prisma Session repository
- `prisma-transaction.repository.ts` - Prisma Transaction és SaleItem repository
- `pos.controller.ts` - REST API endpoints (Session + Transaction)
- `pos.module.ts` - NestJS modul DI konfiguráció

#### Módosított fájlok

- `apps/kgc-api/package.json` - Hozzáadva `@kgc/sales-pos` dependency
