# Story 22.4: POS Frontend - Kassza Session + API Integráció

Status: done

---

## Story

**Mint** bolti eladó,
**szeretnék** egy teljes kassza workflow-t a frontend-en (nyitás → tranzakciók → zárás) API integrációval és vonalkód szkennereléssel,
**hogy** a backend-en már implementált POS funkciókat valós környezetben használhassam.

---

## Acceptance Criteria

### AC1: Kassza session nyitás

- [x] Session nyitás modal az `openingBalance` megadásával
- [x] API hívás: `POST /api/v1/pos/sessions` (OpenSessionDto)
- [x] Aktív session lekérés: `GET /api/v1/pos/sessions/current`
- [x] Session státusz megjelenítés a fejlécben (OPEN/SUSPENDED/CLOSED)
- [x] Egy location-ön csak egy aktív session lehet - hiba kezelés

### AC2: Termékkeresés és kosár - API integráció

- [x] Termék keresés API-val: `GET /api/v1/products?search=...`
- [x] Termék hozzáadás kosárhoz (lokális state)
- [x] Tranzakció létrehozás: `POST /api/v1/pos/transactions`
- [x] Tétel hozzáadás: `POST /api/v1/pos/transactions/:id/items`
- [x] Tétel módosítás: `PATCH /api/v1/pos/transactions/:id/items/:itemId`
- [x] Tétel törlés: `DELETE /api/v1/pos/transactions/:id/items/:itemId`

### AC3: Fizetés feldolgozás - API integráció

- [x] Készpénz fizetés: `POST /api/v1/pos/transactions/:id/payments/cash`
- [x] Kártyás fizetés (stub): `POST /api/v1/pos/transactions/:id/payments/card`
- [x] Vegyes fizetés: `POST /api/v1/pos/transactions/:id/payments/partial`
- [x] Tranzakció lezárás: `POST /api/v1/pos/transactions/:id/complete`
- [x] Visszajáró kalkuláció és megjelenítés
- [x] Tranzakció sztornó: `POST /api/v1/pos/transactions/:id/void`

### AC4: USB/Bluetooth vonalkód szkennelés

- [x] Keyboard wedge mode támogatás (USB/Bluetooth szkenner)
- [x] Vonalkód beolvasás detektálása (gyors karakterbevitel + Enter)
- [x] Beolvasott vonalkód alapján termék keresés
- [x] Hang visszajelzés sikeres/sikertelen beolvasásra
- [x] Fokusz kezelés - szkennelés bármikor működik

### AC5: Kassza zárás és Z-report

- [x] Session felfüggesztés: `POST /api/v1/pos/sessions/:id/suspend`
- [x] Session zárás modal a `closingBalance` megadásával
- [x] Z-report generálás: `POST /api/v1/pos/sessions/:id/close`
- [x] Z-report megjelenítés: összesítő, fizetési módok, eltérés
- [x] Eltérés jóváhagyás modal (ha variance !== 0)
- [x] Z-report PDF letöltés stub

### AC6: Offline indikátor és hibaKezelés

- [x] Hálózati státusz megjelenítés
- [x] API hiba kezelés és felhasználói üzenetek
- [x] Loading állapotok minden API híváshoz
- [x] Retry logika átmeneti hibáknál

---

## Tasks / Subtasks

### Task 1: API hooks és React Query setup (AC: 2, 3, 5)

- [x] 1.1 `apps/kgc-web/src/hooks/pos/use-pos-session.ts` - session CRUD hooks
- [x] 1.2 `apps/kgc-web/src/hooks/pos/use-pos-transaction.ts` - transaction hooks
- [x] 1.3 `apps/kgc-web/src/hooks/pos/use-pos-payment.ts` - payment hooks
- [x] 1.4 API típusok: `apps/kgc-web/src/types/pos.types.ts`
- [x] 1.5 Unit tesztek: Vitest + MSW mock handlers

### Task 2: Session management UI (AC: 1, 5)

- [x] 2.1 `SessionOpenModal.tsx` - Kassza nyitás modal
- [x] 2.2 `SessionCloseModal.tsx` - Kassza zárás modal
- [x] 2.3 `SessionSuspendModal.tsx` - Felfüggesztés modal
- [x] 2.4 `SessionStatusBadge.tsx` - Státusz badge a fejlécben
- [x] 2.5 `ZReportView.tsx` - Z-report megjelenítés
- [x] 2.6 Unit tesztek

### Task 3: Vonalkód szkennelés (AC: 4)

- [x] 3.1 `useBarcodeScanner.ts` - Keyboard wedge hook
- [x] 3.2 Gyors bevitel detektálás (< 50ms karakterek között)
- [x] 3.3 Enter billentyű kezelés mint vonalkód vége
- [x] 3.4 Audio feedback hook (`useAudioFeedback.ts`)
- [x] 3.5 Globális event listener a dokumentumon
- [x] 3.6 Unit tesztek: szkenner szimulációval

### Task 4: SalesPOSPage refaktorálás (AC: 2, 3, 6)

- [x] 4.1 Mock adatok megtartása fallback-ként, API integráció hozzáadva
- [x] 4.2 React Query integrálás a meglévő komponensekbe
- [x] 4.3 Session workflow beépítése (nyitás előtti ellenőrzés)
- [x] 4.4 Szkenner hook integrálása
- [x] 4.5 Loading és error state-ek hozzáadása
- [x] 4.6 Integration tesztek

### Task 5: Komponens tesztek (AC: all)

- [x] 5.1 use-pos-session.test.ts
- [x] 5.2 use-pos-transaction.test.ts
- [x] 5.3 use-barcode-scanner.test.ts
- [x] 5.4 use-audio-feedback.test.ts
- [x] 5.5 MSW handlers a POS API-hoz (pos-handlers.ts)

---

## Dev Notes

### Backend API (már implementált - Story 22-1, 22-2, 22-3)

**Package:** `@kgc/sales-pos` (packages/aruhaz/sales-pos/)
**API Module:** `apps/kgc-api/src/modules/pos/`
**Tesztek:** 112 teszt

### API Endpoints (ADR-046)

```typescript
// Session management
POST   /api/v1/pos/sessions                    // Kassza nyitás
GET    /api/v1/pos/sessions/current            // Aktív session
POST   /api/v1/pos/sessions/:id/suspend        // Felfüggesztés
POST   /api/v1/pos/sessions/:id/close          // Zárás + Z-report

// Transaction management
POST   /api/v1/pos/transactions                // Új tranzakció
GET    /api/v1/pos/transactions/:id            // Tranzakció lekérés
POST   /api/v1/pos/transactions/:id/items      // Tétel hozzáadás
DELETE /api/v1/pos/transactions/:id/items/:itemId  // Tétel törlés
PATCH  /api/v1/pos/transactions/:id/items/:itemId  // Tétel módosítás
POST   /api/v1/pos/transactions/:id/void       // Sztornó

// Payment
POST   /api/v1/pos/transactions/:id/payments/cash     // Készpénz
POST   /api/v1/pos/transactions/:id/payments/card     // Kártya
POST   /api/v1/pos/transactions/:id/payments/partial  // Részleges
POST   /api/v1/pos/transactions/:id/complete          // Lezárás
```

### USB/Bluetooth Szkenner - Keyboard Wedge Mode

```typescript
// Szkenner működése:
// 1. USB/Bluetooth szkenner keyboard módban küldi a vonalkódot
// 2. Karakterek gyorsan érkeznek (< 50ms között)
// 3. Enter billentyűvel zárul a vonalkód
// 4. Hook detektálja és triggeri a keresést

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number; // min vonalkód hossz (default: 5)
  maxGap?: number; // max idő karakterek között ms (default: 50)
  enabled?: boolean;
}
```

### Frontend Technológiák

- **React 19 + TypeScript**
- **React Query (TanStack Query)** - API state management
- **Zustand** - Lokális state (kosár)
- **Vitest + React Testing Library** - Unit tesztek
- **MSW (Mock Service Worker)** - API mocking

### Fájl Struktúra

```
apps/kgc-web/src/
├── hooks/
│   ├── pos/
│   │   ├── use-pos-session.ts
│   │   ├── use-pos-transaction.ts
│   │   ├── use-pos-payment.ts
│   │   └── use-barcode-scanner.ts
│   └── use-audio-feedback.ts
├── pages/sales/
│   ├── SalesPOSPage.tsx (refaktorálás)
│   ├── components/
│   │   ├── SessionOpenModal.tsx
│   │   ├── SessionCloseModal.tsx
│   │   ├── SessionSuspendModal.tsx
│   │   ├── SessionStatusBadge.tsx
│   │   └── ZReportView.tsx
│   └── __tests__/
│       ├── SalesPOSPage.test.tsx
│       └── mocks/
│           └── pos-handlers.ts
└── types/
    └── pos.types.ts
```

### TDD Kötelező

**Red-Green-Refactor:**

- useBarcodeScanner hook tesztek (gyors bevitel, Enter kezelés)
- Session workflow tesztek (nyitás, zárás, felfüggesztés)
- Payment flow tesztek (készpénz visszajáró, vegyes fizetés)

### References

- [ADR-046: Point of Sale Architecture](../../planning-artifacts/adr/ADR-046-point-of-sale-architecture.md)
- [Story 22-1: Értékesítés kasszából](./22-1-ertekesites-kasszabol.md)
- [Story 22-2: Fizetési módok](./22-2-fizetesi-modok.md)
- [Story 22-3: Napi pénztárzárás](./22-3-napi-penztarzaras.md)

---

## Change Log

| Dátum      | Változás                                       | Szerző          |
| ---------- | ---------------------------------------------- | --------------- |
| 2026-01-26 | Story létrehozva, ready-for-dev                | Claude Opus 4.5 |
| 2026-01-26 | Implementáció befejezve, 65 teszt átment, done | Claude Opus 4.5 |
