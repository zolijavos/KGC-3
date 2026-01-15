# ADR-037: Bérlési Díj Kalkuláció Architektúra

**Státusz:** Accepted
**Dátum:** 2026-01-04
**Döntéshozók:** Architect, PM, Finance Lead
**Kapcsolódó:** FR12, ADR-031 (Késedelmi díj), ADR-035 (Kedvezmények)

---

## Kontextus

A KGC ERP v7.0 rendszerben a bérlési díj kalkuláció komplex üzleti logikát követ:
- **Napi díj** - Rövid távú bérlésekre (1-6 nap)
- **Heti díj** - Középtávú bérlésekre (7-29 nap)
- **30 napos díj** - Hosszú távú bérlésekre (30+ nap)

A díjszámításnak automatikusnak és transzparensnek kell lennie.

---

## Döntési Kérdés

**Hogyan implementáljuk a bérlési díj kalkulációt úgy, hogy az igazságos, automatikus és tenant-konfigurálható legyen?**

---

## Döntés

### Díjszámítási Modell

```
┌─────────────────────────────────────────────────────────────────┐
│                 BÉRLÉSI DÍJ KALKULÁCIÓ                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Bérlési időszak              Díjszámítás                      │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  1-6 nap          →    napok × napi_díj                        │
│                                                                 │
│  7-29 nap         →    hetek × heti_díj + maradék × napi_díj   │
│                        (ha heti_díj < 7 × napi_díj)             │
│                                                                 │
│  30+ nap          →    hónapok × 30napos_díj +                 │
│                        maradék hetek × heti_díj +               │
│                        maradék napok × napi_díj                 │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  🎯 Optimális díj: MINDIG a legkedvezőbb kombináció            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Árképzési Konfiguráció

```typescript
interface RentalPricing {
  equipmentId: UUID;
  tenantId: UUID;

  // Alap díjak
  dailyRate: number;          // Napi díj (Ft)
  weeklyRate: number;         // Heti díj (Ft) - általában < 7 × napi
  monthlyRate: number;        // 30 napos díj (Ft) - általában < 4 × heti

  // Opcionális módosítók
  weekendMultiplier?: number; // Hétvége szorzó (pl. 1.2 = +20%)
  seasonalRates?: SeasonalRate[];
  categoryDiscounts?: CategoryDiscount[];

  // Minimum/Maximum
  minRentalDays: number;      // Minimum bérlési idő
  maxRentalDays?: number;     // Maximum bérlési idő

  // Kaució
  depositAmount: number;      // Fix kaució
  depositPercentage?: number; // VAGY százalékos kaució

  validFrom: Date;
  validUntil?: Date;
}

interface SeasonalRate {
  name: string;               // "Nyári szezon", "Karácsonyi"
  startMonth: number;         // 1-12
  startDay: number;
  endMonth: number;
  endDay: number;
  multiplier: number;         // 1.0 = normál, 1.3 = +30%
}
```

### Kalkulációs Algoritmus

```typescript
interface RentalCalculationInput {
  equipmentId: UUID;
  startDate: Date;
  endDate: Date;
  partnerId: UUID;
  quantity: number;
}

interface RentalCalculationResult {
  totalDays: number;
  breakdown: PeriodBreakdown[];
  subtotal: number;
  discounts: AppliedDiscount[];
  totalDiscount: number;
  finalAmount: number;
  depositAmount: number;
  grandTotal: number;          // finalAmount + depositAmount
  calculationDetails: string;
}

interface PeriodBreakdown {
  periodType: 'DAY' | 'WEEK' | 'MONTH';
  count: number;
  ratePerUnit: number;
  subtotal: number;
}

class RentalPriceCalculator {
  async calculate(input: RentalCalculationInput): Promise<RentalCalculationResult> {
    const pricing = await this.getPricing(input.equipmentId);
    const totalDays = this.calculateDays(input.startDate, input.endDate);

    // Optimális díjszámítás
    const breakdown = this.calculateOptimalBreakdown(totalDays, pricing);
    const subtotal = breakdown.reduce((sum, b) => sum + b.subtotal, 0) * input.quantity;

    // Kedvezmények alkalmazása
    const discountResult = await this.applyDiscounts(input.partnerId, subtotal);

    // Kaució számítás
    const depositAmount = this.calculateDeposit(pricing, discountResult.finalAmount);

    return {
      totalDays,
      breakdown,
      subtotal,
      discounts: discountResult.appliedDiscounts,
      totalDiscount: discountResult.totalDiscount,
      finalAmount: discountResult.finalAmount,
      depositAmount,
      grandTotal: discountResult.finalAmount + depositAmount,
      calculationDetails: this.generateDetails(breakdown, discountResult)
    };
  }

  private calculateOptimalBreakdown(
    totalDays: number,
    pricing: RentalPricing
  ): PeriodBreakdown[] {
    const breakdown: PeriodBreakdown[] = [];
    let remainingDays = totalDays;

    // 30 napos periódusok
    if (remainingDays >= 30 && pricing.monthlyRate) {
      const months = Math.floor(remainingDays / 30);

      // Ellenőrzés: megéri-e havi díjat használni
      const monthlyTotal = months * pricing.monthlyRate;
      const dailyEquivalent = months * 30 * pricing.dailyRate;

      if (monthlyTotal < dailyEquivalent) {
        breakdown.push({
          periodType: 'MONTH',
          count: months,
          ratePerUnit: pricing.monthlyRate,
          subtotal: monthlyTotal
        });
        remainingDays -= months * 30;
      }
    }

    // Heti periódusok
    if (remainingDays >= 7 && pricing.weeklyRate) {
      const weeks = Math.floor(remainingDays / 7);

      // Ellenőrzés: megéri-e heti díjat használni
      const weeklyTotal = weeks * pricing.weeklyRate;
      const dailyEquivalent = weeks * 7 * pricing.dailyRate;

      if (weeklyTotal < dailyEquivalent) {
        breakdown.push({
          periodType: 'WEEK',
          count: weeks,
          ratePerUnit: pricing.weeklyRate,
          subtotal: weeklyTotal
        });
        remainingDays -= weeks * 7;
      }
    }

    // Maradék napok
    if (remainingDays > 0) {
      breakdown.push({
        periodType: 'DAY',
        count: remainingDays,
        ratePerUnit: pricing.dailyRate,
        subtotal: remainingDays * pricing.dailyRate
      });
    }

    return breakdown;
  }

  private calculateDays(startDate: Date, endDate: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffMs / msPerDay) + 1;  // +1 mert mindkét nap számít
  }

  private calculateDeposit(pricing: RentalPricing, rentalAmount: number): number {
    if (pricing.depositPercentage) {
      return Math.round(rentalAmount * (pricing.depositPercentage / 100));
    }
    return pricing.depositAmount || 0;
  }
}
```

### Speciális Esetek Kezelése

```typescript
// 1. Hétvége kezelés
function applyWeekendMultiplier(
  startDate: Date,
  endDate: Date,
  baseAmount: number,
  multiplier: number
): number {
  let weekendDays = 0;
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {  // Vasárnap vagy Szombat
      weekendDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const totalDays = calculateDays(startDate, endDate);
  const weekdayDays = totalDays - weekendDays;
  const dailyRate = baseAmount / totalDays;

  return (weekdayDays * dailyRate) + (weekendDays * dailyRate * multiplier);
}

// 2. Szezonális díjak
function applySeasonalRates(
  startDate: Date,
  endDate: Date,
  baseAmount: number,
  seasonalRates: SeasonalRate[]
): number {
  let adjustedAmount = 0;
  let currentDate = new Date(startDate);
  const totalDays = calculateDays(startDate, endDate);
  const dailyRate = baseAmount / totalDays;

  while (currentDate <= endDate) {
    const multiplier = getSeasonalMultiplier(currentDate, seasonalRates);
    adjustedAmount += dailyRate * multiplier;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return Math.round(adjustedAmount);
}

// 3. Hosszabbítás kezelése
async function extendRental(
  rentalId: UUID,
  newEndDate: Date
): Promise<RentalExtensionResult> {
  const rental = await prisma.rental.findUnique({ where: { id: rentalId } });

  // Eredeti végdátumtól számítjuk a hosszabbítást
  const extensionDays = calculateDays(rental.endDate, newEndDate);

  // Új díj kalkuláció a hosszabbításra
  const extensionPricing = await calculator.calculate({
    equipmentId: rental.equipmentId,
    startDate: rental.endDate,
    endDate: newEndDate,
    partnerId: rental.partnerId,
    quantity: rental.quantity
  });

  return {
    originalEndDate: rental.endDate,
    newEndDate,
    extensionDays,
    extensionAmount: extensionPricing.finalAmount,
    newTotalAmount: rental.totalAmount + extensionPricing.finalAmount
  };
}
```

### Adatbázis Séma

```sql
-- Árazási konfiguráció
CREATE TABLE equipment_pricing (
  pricing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(tenant_id),
  equipment_id UUID NOT NULL REFERENCES equipment(equipment_id),
  daily_rate DECIMAL(10,2) NOT NULL,
  weekly_rate DECIMAL(10,2),
  monthly_rate DECIMAL(10,2),
  weekend_multiplier DECIMAL(3,2) DEFAULT 1.0,
  deposit_amount DECIMAL(10,2),
  deposit_percentage DECIMAL(5,2),
  min_rental_days INT DEFAULT 1,
  max_rental_days INT,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id),
  UNIQUE(tenant_id, equipment_id, valid_from),
  INDEX idx_pricing_equipment (equipment_id, valid_from)
);

-- Szezonális árazás
CREATE TABLE seasonal_rate (
  rate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(tenant_id),
  name VARCHAR(100) NOT NULL,
  start_month INT NOT NULL CHECK (start_month BETWEEN 1 AND 12),
  start_day INT NOT NULL CHECK (start_day BETWEEN 1 AND 31),
  end_month INT NOT NULL CHECK (end_month BETWEEN 1 AND 12),
  end_day INT NOT NULL CHECK (end_day BETWEEN 1 AND 31),
  multiplier DECIMAL(3,2) NOT NULL,
  applies_to_categories UUID[],  -- NULL = összes
  is_active BOOLEAN DEFAULT TRUE
);

-- Bérlési díj kalkuláció log
CREATE TABLE rental_calculation (
  calc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID NOT NULL REFERENCES rental(rental_id),
  total_days INT NOT NULL,
  breakdown JSONB NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  discounts_applied JSONB DEFAULT '[]',
  total_discount DECIMAL(12,2) DEFAULT 0,
  final_amount DECIMAL(12,2) NOT NULL,
  deposit_amount DECIMAL(12,2) NOT NULL,
  grand_total DECIMAL(12,2) NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculated_by UUID REFERENCES users(user_id)
);
```

### UI Megjelenítés

```
┌─────────────────────────────────────────────────────────────┐
│                BÉRLÉSI DÍJ KALKULÁCIÓ                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔧 Makita Bontókalapács HR2470                            │
│  📅 2026-01-04 → 2026-01-25 (22 nap)                       │
│                                                             │
│  ════════════════════════════════════════════════          │
│                                                             │
│  📊 DÍJ KALKULÁCIÓ (optimalizált):                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Periódus          Egység    Díj        Összeg     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  3 hét             7 nap    18.000 Ft   54.000 Ft  │   │
│  │  1 nap             1 nap     3.500 Ft    3.500 Ft  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Részösszeg:                            57.500 Ft  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💰 KEDVEZMÉNYEK:                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🥈 Ezüst törzsvendég         -10%      -5.750 Ft  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ════════════════════════════════════════════════          │
│  Bérleti díj:                              51.750 Ft       │
│  Kaució (20%):                             10.350 Ft       │
│  ────────────────────────────────────────────────          │
│  FIZETENDŐ ÖSSZESEN:                       62.100 Ft       │
│                                                             │
│  ℹ️ Megjegyzés: Heti díj alkalmazva                        │
│     (22 × 3.500 = 77.000 Ft helyett 57.500 Ft)             │
│     Megtakarítás: 19.500 Ft (-25%)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Következmények

### Pozitív
- Automatikus optimális díjszámítás
- Transzparens ár kalkuláció
- Szezonális és hétvégi árképzés
- Tenant-specifikus konfiguráció

### Negatív
- Komplex pricing logic karbantartás
- Árváltozás kezelés meglévő bérlésekre

### Kockázatok
- **Helytelen konfig:** Heti díj > 7 × napi → validáció
- **Áremelés konfliktus:** Bérlés közben nem változik az ár
