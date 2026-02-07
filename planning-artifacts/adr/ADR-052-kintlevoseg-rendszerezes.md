# ADR-052: Kintlévőség Rendszerezés és Bevételi Előrejelzés

## Státusz

ELFOGADVA (2026-02-07)

## Kontextus

A 02-03 meeting és KGC-testdoc-02-03.pdf alapján szükség van:

- 30/60/90 napos kintlévőség aging report
- Havi várható bevétel előrejelzés (aktív bérlésekből + szerződésekből)
- Top 10 partner riport (ajándékra jogosultak)

### Üzleti követelmény (Zsuzsi)

> "Látni akarom, hogy ki mennyit költ nálunk évente, hogy tudjam az ajándékokat is kezelni a top partnereknek"

## Döntés

### 1. Aging Report Architektúra

```typescript
interface AgingBucket {
  label: '0-30' | '31-60' | '61-90' | '90+';
  count: number;
  totalAmount: number;
  invoices: AgingInvoice[];
}

interface ReceivablesAgingReport {
  generatedAt: Date;
  totalReceivables: number;
  buckets: AgingBucket[];
  topDebtors: PartnerDebt[];
}
```

### 2. Várható Bevétel Kalkuláció

```
VÁRHATÓ_BEVÉTEL =
  aktív_bérlések_hátralék +
  hosszú_távú_szerződések_következő_havi +
  ismétlődő_partnerek_becsült_forgalom
```

### 3. Top Partner Riport

- Éves forgalom alapú rangsor
- Minimum küszöb konfigurálható (tenant szinten)
- Ajándék jogosultság flag

## Technikai Megvalósítás

### Service Layer

- `ReceivablesService` - @kgc/sales-invoice bővítés
- `RevenueForecaster` - Bevétel előrejelzés
- `TopPartnersService` - Partner rangsor

### API Endpoints

- `GET /dashboard/receivables/aging` - Aging report
- `GET /dashboard/revenue/forecast` - Bevétel előrejelzés
- `GET /dashboard/partners/top` - Top partnerek

### Dashboard Widget

- `ReceivablesAgingWidget` - Táblázat + grafikon
- `RevenueForecastWidget` - Havi előrejelzés chart
- `TopPartnersWidget` - Lista + ajándék státusz

## Következmények

### Pozitív

- Átlátható kintlévőség kezelés
- Proaktív cash flow tervezés
- Partner loyalty program támogatás

### Negatív

- Invoice adatok kellenek (Prisma query-k)
- Előrejelzés pontatlansága (becslésen alapul)

## Kapcsolódó ADR-ek

- ADR-001: Multi-tenancy (tenant scoped reports)
- ADR-010: Micro-modules (@kgc/sales-invoice)
