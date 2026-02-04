# Story 35-7: WebSocket Real-Time Events

**Epic:** 35 - Dashboard Foundation
**Sprint:** Phase 2 (Sprint 3-4)
**Story Points:** 8
**Priority:** High
**Status:** ready-for-dev

---

## User Story

**Mint** boltvezető vagy admin,
**Szeretném** azonnal értesülni a kritikus üzleti eseményekről,
**Hogy** gyorsan reagálhassak készlethiányra, fizetési hibákra és új bérlésekre.

---

## Background & Context

Az MVP-ben (Stories 35-1 → 35-6) a dashboard widgetek 5 perces polling-ot használnak TanStack Query-vel. Ez elegendő a legtöbb KPI-hoz, de **kritikus események** esetén túl lassú:

- **Készlethiány alert:** Ha egy termék elfogy, 5 perc késés elfogadhatatlan
- **Fizetési hiba:** Azonnali beavatkozás szükséges
- **Új bérlés indítás:** Valós idejű értesítés a csapatnak

A WebSocket infrastruktúra már létezik a projektben (Epic 32: Real-time Chat), így ezt bővítjük dashboard eseményekkel.

**ADR-041 hivatkozás:** "Phase 2 WebSocket (nem MVP): Kritikus készlethiány alert, Fizetési hiba értesítés, Új bérlés indítás notification"

---

## Acceptance Criteria

### AC1: WebSocket Connection Management

**GIVEN** a felhasználó bejelentkezett és a dashboard oldalon van
**WHEN** az alkalmazás betöltődik
**THEN** automatikusan csatlakozik a `/ws/dashboard` namespace-hez
**AND** sikeres csatlakozáskor "connected" státuszt mutat
**AND** hálózati hiba esetén automatikusan újracsatlakozik (exponential backoff: 3s, 6s, 12s, max 30s)
**AND** kijelentkezéskor gracefully bontja a kapcsolatot

### AC2: Stock Alert Real-Time Event

**GIVEN** a WebSocket kapcsolat aktív
**WHEN** egy termék készlete a kritikus szint alá csökken
**THEN** a frontend 100ms-on belül megkapja a `stock_alert` eseményt
**AND** toast notification jelenik meg "Kritikus készlethiány: {product_name}" szöveggel
**AND** a StockAlertList widget automatikusan frissül (nem kell 5 percet várni)
**AND** a Notification Panel badge száma nő

### AC3: Payment Error Real-Time Event

**GIVEN** a WebSocket kapcsolat aktív
**WHEN** egy fizetési tranzakció sikertelen (MyPOS hiba, kártyaelutasítás, stb.)
**THEN** a frontend 100ms-on belül megkapja a `payment_error` eseményt
**AND** piros toast notification jelenik meg "Fizetési hiba: {error_message}" szöveggel
**AND** csak STORE_MANAGER és ADMIN role-ok kapják az értesítést
**AND** az esemény tartalmazza: transaction_id, error_code, partner_name, amount

### AC4: Rental Created Real-Time Event

**GIVEN** a WebSocket kapcsolat aktív
**WHEN** egy új bérlés sikeresen létrejön (checkout wizard befejezése)
**THEN** a frontend 100ms-on belül megkapja a `rental_created` eseményt
**AND** zöld toast notification jelenik meg "Új bérlés: {partner_name} - {equipment_count} tétel" szöveggel
**AND** csak STORE_MANAGER és ADMIN role-ok kapják az értesítést

### AC5: Role-Based Event Filtering

**GIVEN** különböző role-ok vannak bejelentkezve
**WHEN** események érkeznek
**THEN** az alábbi szűrés érvényesül:

| Event Type     | OPERATOR | STORE_MANAGER | ADMIN |
| -------------- | -------- | ------------- | ----- |
| stock_alert    | ✅       | ✅            | ✅    |
| payment_error  | ❌       | ✅            | ✅    |
| rental_created | ❌       | ✅            | ✅    |

### AC6: Offline Queue & Reconnect

**GIVEN** a felhasználó offline-ba kerül (hálózati hiba)
**WHEN** az alkalmazás újra online lesz
**THEN** a WebSocket automatikusan újracsatlakozik
**AND** az offline időszak alatt keletkezett események megérkeznek (server-side queue, max 50 event/tenant)
**AND** duplikált események szűrésre kerülnek (event_id + timestamp alapján)

### AC7: Tenant Isolation

**GIVEN** több tenant fut ugyanazon a szerveren
**WHEN** események generálódnak
**THEN** minden tenant csak a saját eseményeit kapja
**AND** cross-tenant event leak nem lehetséges (tenant_id validáció minden broadcast előtt)

---

## Technical Tasks

### Backend (NestJS + Socket.io)

- [ ] **Task 1:** `DashboardGateway` WebSocket gateway létrehozása
  - `@WebSocketGateway({ namespace: '/ws/dashboard' })`
  - `handleConnection()` - JWT auth + tenant context beállítás
  - `handleDisconnect()` - cleanup, room elhagyás
  - `@SubscribeMessage('subscribe')` - room subscription role alapján

- [ ] **Task 2:** `DashboardEventsService` implementálása
  - `broadcastStockAlert(tenantId, event)` - készlet alert küldés
  - `broadcastPaymentError(tenantId, event)` - fizetési hiba küldés
  - `broadcastRentalCreated(tenantId, event)` - új bérlés küldés
  - Role-based filtering a broadcast előtt

- [ ] **Task 3:** Integration hooks hozzáadása meglévő service-ekhez
  - `InventoryAlertService.checkThreshold()` → `DashboardEventsService.broadcastStockAlert()`
  - `PaymentService.processPayment()` error branch → `DashboardEventsService.broadcastPaymentError()`
  - `RentalService.createRental()` success → `DashboardEventsService.broadcastRentalCreated()`

- [ ] **Task 4:** Event queue offline support
  - Redis-based event queue per tenant (max 50 events, 5 perc TTL)
  - `getQueuedEvents(tenantId, userId, since)` - missed events lekérdezése reconnect-kor

### Frontend (React + Socket.io Client)

- [ ] **Task 5:** `useWebSocketEvents()` hook implementálása
  - Socket.io connection management
  - Auto-reconnect exponential backoff (3s, 6s, 12s, 30s max)
  - Event subscription: `socket.on('stock_alert' | 'payment_error' | 'rental_created')`
  - Cleanup on unmount

- [ ] **Task 6:** Toast notification integration
  - Stock alert → warning toast (sárga)
  - Payment error → error toast (piros)
  - Rental created → success toast (zöld)
  - Toast-ok 5 másodperc után automatikusan eltűnnek

- [ ] **Task 7:** Widget real-time update integration
  - StockAlertList widget: `queryClient.invalidateQueries(['dashboard-inventory', 'alerts'])` on stock_alert
  - Notification Panel: increment unread count on any event

- [ ] **Task 8:** Connection status indicator
  - Header-ben kis ikon: zöld (connected), sárga (reconnecting), piros (disconnected)
  - Tooltip: "WebSocket: Csatlakozva" / "Újracsatlakozás..." / "Offline"

### Testing

- [ ] **Task 9:** Backend unit tesztek (Vitest)
  - DashboardGateway connection/disconnect tesztek
  - Role-based filtering tesztek
  - Tenant isolation tesztek
  - Event queue tesztek

- [ ] **Task 10:** Frontend unit tesztek (Vitest)
  - useWebSocketEvents() hook tesztek
  - Toast notification trigger tesztek
  - Reconnect logic tesztek

- [ ] **Task 11:** E2E tesztek (Playwright)
  - WebSocket connection established
  - Stock alert event triggers toast (< 100ms)
  - Payment error only visible for STORE_MANAGER/ADMIN
  - Reconnect after network loss simulation

---

## Technical Notes

### Event Payload Schemas

```typescript
// Stock Alert Event
interface StockAlertEvent {
  eventId: string;
  timestamp: string;
  type: 'stock_alert';
  data: {
    productId: string;
    productName: string;
    currentQuantity: number;
    threshold: number;
    locationId: string;
    locationName: string;
    severity: 'CRITICAL' | 'WARNING';
  };
}

// Payment Error Event
interface PaymentErrorEvent {
  eventId: string;
  timestamp: string;
  type: 'payment_error';
  data: {
    transactionId: string;
    errorCode: string;
    errorMessage: string;
    partnerId: string;
    partnerName: string;
    amount: number;
    currency: 'HUF';
  };
}

// Rental Created Event
interface RentalCreatedEvent {
  eventId: string;
  timestamp: string;
  type: 'rental_created';
  data: {
    rentalId: string;
    partnerId: string;
    partnerName: string;
    equipmentCount: number;
    totalValue: number;
    currency: 'HUF';
  };
}
```

### Socket.io Room Structure

```
/ws/dashboard
├── tenant:{tenantId}:all          # All events for tenant
├── tenant:{tenantId}:operators    # Stock alerts only
└── tenant:{tenantId}:managers     # All events (managers + admins)
```

### Performance Requirements

- Event delivery latency: < 100ms (server → client)
- Max concurrent connections per tenant: 50
- Event queue size: 50 events per tenant
- Queue TTL: 5 minutes

---

## Dependencies

- **Story 35-3** (Készlet Dashboard) - StockAlertList widget integration
- **Story 35-4** (Notification Panel) - Badge count update
- **Epic 32** (Real-time Chat) - Socket.io infrastructure patterns

---

## Out of Scope

- Push notifications (mobile PWA) - külön story
- Email notifications - külön story
- WebSocket clustering (Redis adapter) - infrastructure story
- Event persistence (audit log) - ADR-049 scope

---

## Definition of Done

- [ ] Minden AC teljesül
- [ ] Backend unit tesztek PASS (min. 80% coverage)
- [ ] Frontend unit tesztek PASS (min. 80% coverage)
- [ ] E2E tesztek PASS (3 kritikus scenario)
- [ ] Code review PASS (adversarial, min. 3 issue)
- [ ] Dokumentáció frissítve (API docs, architecture)
- [ ] Sprint status YAML frissítve

---

**Létrehozva:** 2026-02-04
**Státusz:** ready-for-dev
