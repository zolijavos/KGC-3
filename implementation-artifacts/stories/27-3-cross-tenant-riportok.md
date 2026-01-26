# Story 27.3: Cross-Tenant Riportok

Status: ready-for-dev

---

## Story

**Mint** franchise tulajdonos / holding vezető,
**szeretnék** összesített riportokat látni az összes telephelyemről,
**hogy** átfogó képet kapjak a teljes üzletmenetről.

---

## Acceptance Criteria

### AC1: Holding-szintű összesítés

- [ ] Összes telephely bevétel összesítő
- [ ] Telephely összehasonlító riport
- [ ] Top/bottom performer telephelyek
- [ ] Trend összehasonlítás telephelyek között

### AC2: Multi-tenant lekérdezések

- [ ] Központi admin jogosultság ellenőrzés
- [ ] Tenant-ek közötti aggregáció
- [ ] Telephely szűrő (subset kiválasztás)
- [ ] Időszak összehasonlítás tenant-enként

### AC3: Franchise riportok

- [ ] Franchise díj kalkuláció (bevétel alapú)
- [ ] Royalty összesítő telephely szerint
- [ ] Franchise teljesítmény scorecard
- [ ] Szerződéses KPI tracking

### AC4: Export és ütemezés

- [ ] Scheduled report generálás (cron)
- [ ] Email küldés beállított címzetteknek
- [ ] Multi-format export (PDF, Excel)
- [ ] Report template mentés

---

## Tasks / Subtasks

### Task 1: Cross-Tenant Service alap (AC: 2)

- [ ] 1.1 CrossTenantReportService interface
- [ ] 1.2 Holding/franchise jogosultság ellenőrzés
- [ ] 1.3 Multi-tenant query builder
- [ ] 1.4 Tenant aggregáció helper-ek
- [ ] 1.5 Unit tesztek

### Task 2: Holding összesítések (AC: 1)

- [ ] 2.1 getHoldingRevenueSummary() - összbevétel
- [ ] 2.2 getLocationComparison() - telephely összehasonlítás
- [ ] 2.3 getTopPerformers() - legjobb/legrosszabb
- [ ] 2.4 getLocationTrends() - trend comparison

### Task 3: Franchise riportok (AC: 3)

- [ ] 3.1 FranchiseReportService implementáció
- [ ] 3.2 calculateFranchiseFee() - díj kalkuláció
- [ ] 3.3 getRoyaltySummary() - royalty összesítő
- [ ] 3.4 getFranchiseScorecard() - teljesítmény scorecard
- [ ] 3.5 getKpiTracking() - KPI követés

### Task 4: Ütemezett riportok (AC: 4)

- [ ] 4.1 ScheduledReportService implementáció
- [ ] 4.2 Report schedule CRUD
- [ ] 4.3 Cron job integráció (@nestjs/schedule)
- [ ] 4.4 Email küldés (nodemailer)
- [ ] 4.5 Report template mentés

### Task 5: API endpoints (AC: all)

- [ ] 5.1 GET /reports/holding/summary - holding összesítő
- [ ] 5.2 GET /reports/holding/comparison - telephely összehasonlítás
- [ ] 5.3 GET /reports/franchise/fees - franchise díjak
- [ ] 5.4 POST /reports/schedule - ütemezés létrehozás
- [ ] 5.5 GET /reports/schedule - ütemezések listája

---

## Dev Notes

### Architektúra

**Package:** `@kgc/reporting` (packages/shared/reporting/) - bővítés

**Jogosultság ellenőrzés:**

```typescript
// Holding admin: láthat minden tenant-et a holding-ban
// Franchise owner: láthat minden franchise tenant-et
// Location admin: csak saját tenant

interface CrossTenantPermission {
  userId: string;
  holdingId?: string; // Holding szintű hozzáférés
  franchiseGroupId?: string; // Franchise csoport
  tenantIds: string[]; // Engedélyezett tenant-ek
}
```

**Aggregációs query:**

```typescript
interface CrossTenantQuery {
  tenantIds: string[];
  dateFrom: Date;
  dateTo: Date;
  groupBy: 'tenant' | 'day' | 'week' | 'month';
  metrics: ('revenue' | 'rentals' | 'worksheets' | 'inventory')[];
}
```

### Teljesítmény

- Materialized view-k holding szintű aggregációkhoz
- Async job nagy riportokhoz (>100k sor)
- Cache holding-level KPI-khoz (5 perc TTL)
- Batch processing ütemezett riportoknál

### RLS megfontolások

A cross-tenant query-k megkerülik az RLS-t, ezért:

- Explicit jogosultság ellenőrzés MINDEN endpoint-on
- Audit log minden cross-tenant lekérdezésre
- Rate limiting holding-level query-kra

### TDD kötelező

- Jogosultság ellenőrzés pontossága
- Tenant isolation (nem láthat jogosulatlan tenant-et)
- Aggregációs pontosság
- Ütemezés megbízhatósága

---

## References

- [Epic 27: Reporting Engine](../planning-artifacts/epics/epic-27-reporting-engine.md)
- [Story 27-1: Dashboard widgetek](./27-1-dashboard-widgetek.md)
- [Story 27-2: Részletes riportok](./27-2-reszletes-riportok.md)
- [ADR-001: Franchise multi-tenancy](../planning-artifacts/adr/ADR-001-franchise-multi-tenancy.md)
