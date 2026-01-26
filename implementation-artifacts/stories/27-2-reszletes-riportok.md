# Story 27.2: Részletes Riportok

Status: ready-for-dev

---

## Story

**Mint** üzletvezető,
**szeretnék** részletes riportokat generálni különböző üzleti területekről,
**hogy** mélyebb elemzést végezhessek és döntéseket hozhassak.

---

## Acceptance Criteria

### AC1: Bevétel riportok

- [ ] Napi/heti/havi bevétel összesítő
- [ ] Bevétel termékkategória szerint
- [ ] Bevétel fizetési mód szerint
- [ ] Bevétel dolgozó szerint
- [ ] Exportálás: PDF, Excel, CSV

### AC2: Bérlés riportok

- [ ] Bérlési statisztikák (átlag időtartam, bevétel)
- [ ] Bérgép kihasználtság
- [ ] Késedelmes visszavételek
- [ ] Top ügyfelek

### AC3: Szerviz riportok

- [ ] Munkalap statisztikák (átlag idő, költség)
- [ ] Garanciális vs fizetős arány
- [ ] Alkatrész felhasználás
- [ ] Dolgozói termelékenység

### AC4: Készlet riportok

- [ ] Készletérték összesítő
- [ ] Forgási sebesség
- [ ] Lassú/holt készlet
- [ ] Minimum készlet alatti tételek

### AC5: Szűrők és paraméterek

- [ ] Dátum tartomány (from/to)
- [ ] Telephely szűrő
- [ ] Kategória/csoport szűrő
- [ ] Összehasonlítás előző időszakkal

---

## Tasks / Subtasks

### Task 1: ReportingService alap (AC: 5)

- [ ] 1.1 ReportingService interface és alap implementáció
- [ ] 1.2 ReportQuery DTO (filters, groupBy, orderBy)
- [ ] 1.3 ReportResult interface (data, totals, metadata)
- [ ] 1.4 Date range validáció és normalizálás

### Task 2: Bevétel riportok (AC: 1)

- [ ] 2.1 RevenueReportService implementáció
- [ ] 2.2 getRevenueByPeriod() - időszaki bevétel
- [ ] 2.3 getRevenueByCategory() - kategória szerinti
- [ ] 2.4 getRevenueByPaymentMethod() - fizetési mód
- [ ] 2.5 getRevenueByEmployee() - dolgozó szerint

### Task 3: Bérlés riportok (AC: 2)

- [ ] 3.1 RentalReportService implementáció
- [ ] 3.2 getRentalStatistics() - alapstatisztikák
- [ ] 3.3 getEquipmentUtilization() - kihasználtság
- [ ] 3.4 getOverdueRentals() - késések
- [ ] 3.5 getTopCustomers() - top ügyfelek

### Task 4: Szerviz riportok (AC: 3)

- [ ] 4.1 ServiceReportService implementáció
- [ ] 4.2 getWorksheetStatistics() - munkalap stat
- [ ] 4.3 getWarrantyVsPaidRatio() - garancia arány
- [ ] 4.4 getPartsUsage() - alkatrész felhasználás
- [ ] 4.5 getEmployeeProductivity() - termelékenység

### Task 5: Készlet riportok (AC: 4)

- [ ] 5.1 InventoryReportService implementáció
- [ ] 5.2 getInventoryValue() - készletérték
- [ ] 5.3 getTurnoverRate() - forgási sebesség
- [ ] 5.4 getSlowMovingItems() - lassú készlet
- [ ] 5.5 getLowStockItems() - minimum alatt

### Task 6: Export (AC: 1)

- [ ] 6.1 ReportExportService implementáció
- [ ] 6.2 exportToPdf() - PDF generálás (pdf-lib)
- [ ] 6.3 exportToExcel() - Excel (exceljs)
- [ ] 6.4 exportToCsv() - CSV

### Task 7: API endpoints

- [ ] 7.1 GET /reports/revenue - bevétel riport
- [ ] 7.2 GET /reports/rentals - bérlés riport
- [ ] 7.3 GET /reports/service - szerviz riport
- [ ] 7.4 GET /reports/inventory - készlet riport
- [ ] 7.5 GET /reports/:type/export/:format - export

---

## Dev Notes

### Architektúra

**Package:** `@kgc/reporting` (packages/shared/reporting/) - bővítés

**Közös riport struktúra:**

```typescript
interface ReportRequest {
  dateFrom: Date;
  dateTo: Date;
  locationId?: string;
  categoryId?: string;
  groupBy?: 'day' | 'week' | 'month' | 'category' | 'employee';
  compareWithPreviousPeriod?: boolean;
  format?: 'json' | 'pdf' | 'excel' | 'csv';
}

interface ReportResult<T> {
  data: T[];
  totals: Record<string, number>;
  metadata: {
    generatedAt: Date;
    period: { from: Date; to: Date };
    filters: Record<string, string>;
  };
  comparison?: {
    previousPeriod: T[];
    change: Record<string, number>;
  };
}
```

### Teljesítmény optimalizáció

- Materialized views nagy aggregációkhoz
- Cursor-based pagination nagy adathalmazoknál
- Background job hosszú riportokhoz
- Cache gyakori riportokhoz

### TDD kötelező

- Aggregációs pontosság (kerekítés)
- Szűrők kombinációi
- Export formátumok validitása
- Tenant isolation

---

## References

- [Epic 27: Reporting Engine](../planning-artifacts/epics/epic-27-reporting-engine.md)
- [Story 27-1: Dashboard widgetek](./27-1-dashboard-widgetek.md)
