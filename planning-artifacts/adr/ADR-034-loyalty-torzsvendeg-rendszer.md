# ADR-034: Loyalty/Törzsvendég Rendszer Architektúra

**Státusz:** Accepted
**Dátum:** 2026-01-04
**Döntéshozók:** Architect, PM, Marketing Lead
**Kapcsolódó:** Partner wireframe, ADR-007 (Employee Discount)

---

## Kontextus

A KGC ERP v7.0 rendszerben **törzsvendég program** működik, amely hűséges ügyfeleket jutalmaz automatikus kedvezményekkel. A wireframe-ek említik a Bronz/Ezüst/Arany tier rendszert.

Az üzleti igény:
> *"A törzsvásárlók kapjanak automatikus kedvezményt. 3+ bérlés után Bronz, 10+ után Ezüst, 20+ után Arany."*

---

## Döntési Kérdés

**Hogyan implementáljuk a tier-alapú loyalty rendszert úgy, hogy az automatikus, igazságos és tenant-konfigurálható legyen?**

---

## Döntés

### Tier Hierarchia

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOYALTY TIER RENDSZER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
│  │   🥉        │   │   🥈        │   │   🥇        │           │
│  │   BRONZ    │   │   EZÜST    │   │   ARANY    │           │
│  ├─────────────┤   ├─────────────┤   ├─────────────┤           │
│  │ 3+ bérlés   │   │ 10+ bérlés  │   │ 20+ bérlés  │           │
│  │ 5% kedv.    │   │ 10% kedv.   │   │ 15% kedv.   │           │
│  │ Standard    │   │ Prioritás   │   │ VIP kezelés │           │
│  └─────────────┘   └─────────────┘   └─────────────┘           │
│        │                 │                 │                    │
│        └─────────────────┼─────────────────┘                    │
│                          │                                      │
│                          ▼                                      │
│              Automatikus tier számítás                          │
│              (utolsó 12 hónap tranzakciói)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tier Konfiguráció

```typescript
interface LoyaltyTier {
  tierId: UUID;
  tierCode: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  tierName: string;
  minTransactions: number;      // Minimum tranzakciószám
  minSpend?: number;            // Opcionális: minimum költés
  discountPercent: number;      // Automatikus kedvezmény %
  benefits: string[];           // Extra juttatások
  badgeColor: string;           // UI megjelenítés
  sortOrder: number;            // Hierarchia sorrend
}

const DEFAULT_TIERS: LoyaltyTier[] = [
  {
    tierCode: 'BRONZE',
    tierName: 'Bronz Törzsvendég',
    minTransactions: 3,
    discountPercent: 5,
    benefits: ['Automatikus 5% kedvezmény'],
    badgeColor: '#CD7F32',
    sortOrder: 1
  },
  {
    tierCode: 'SILVER',
    tierName: 'Ezüst Törzsvendég',
    minTransactions: 10,
    discountPercent: 10,
    benefits: [
      'Automatikus 10% kedvezmény',
      'Prioritásos telefonos ügyfélszolgálat'
    ],
    badgeColor: '#C0C0C0',
    sortOrder: 2
  },
  {
    tierCode: 'GOLD',
    tierName: 'Arany Törzsvendég',
    minTransactions: 20,
    discountPercent: 15,
    benefits: [
      'Automatikus 15% kedvezmény',
      'VIP kezelés',
      'Exkluzív akciók előnézete',
      'Ingyenes kiszállítás (5 km-en belül)'
    ],
    badgeColor: '#FFD700',
    sortOrder: 3
  }
];
```

### Automatikus Tier Számítás

```typescript
interface TierCalculationConfig {
  lookbackMonths: number;           // Visszatekintési időszak (default: 12)
  transactionTypes: string[];       // Melyik tranzakciók számítanak
  excludeRefunds: boolean;          // Visszatérítések kizárása
  recalculationInterval: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

async function calculatePartnerTier(
  partnerId: UUID,
  config: TierCalculationConfig
): Promise<LoyaltyTier> {
  const lookbackDate = subMonths(new Date(), config.lookbackMonths);

  // Tranzakciók számolása
  const transactionCount = await prisma.transaction.count({
    where: {
      partnerId,
      type: { in: config.transactionTypes },
      status: 'COMPLETED',
      createdAt: { gte: lookbackDate },
      ...(config.excludeRefunds && { isRefund: false })
    }
  });

  // Költés összesítés (opcionális)
  const totalSpend = await prisma.transaction.aggregate({
    where: {
      partnerId,
      createdAt: { gte: lookbackDate },
      status: 'COMPLETED'
    },
    _sum: { amount: true }
  });

  // Tier meghatározás (csökkenő sorrendben ellenőrzés)
  const tiers = await prisma.loyaltyTier.findMany({
    orderBy: { sortOrder: 'desc' }
  });

  for (const tier of tiers) {
    const meetsTransactionReq = transactionCount >= tier.minTransactions;
    const meetsSpendReq = !tier.minSpend ||
      (totalSpend._sum.amount ?? 0) >= tier.minSpend;

    if (meetsTransactionReq && meetsSpendReq) {
      return tier;
    }
  }

  return null; // Nincs tier (új ügyfél)
}

// Napi újraszámítás job
@Cron('0 2 * * *')  // Minden nap 02:00-kor
async function recalculateAllTiers(): Promise<void> {
  const partners = await prisma.partner.findMany({
    where: { isActive: true }
  });

  for (const partner of partners) {
    const newTier = await calculatePartnerTier(partner.id, defaultConfig);
    const currentTier = partner.loyaltyTierId;

    if (newTier?.tierId !== currentTier) {
      await prisma.partner.update({
        where: { id: partner.id },
        data: { loyaltyTierId: newTier?.tierId }
      });

      // Tier változás értesítés
      if (newTier && (!currentTier || newTier.sortOrder > currentTier.sortOrder)) {
        await notifyTierUpgrade(partner, newTier);
      }

      await auditLog.record({
        action: 'LOYALTY_TIER_CHANGED',
        partnerId: partner.id,
        oldTier: currentTier,
        newTier: newTier?.tierId,
        transactionCount: partner.transactionCount
      });
    }
  }
}
```

### Kedvezmény Alkalmazás

```typescript
// Bérlés/eladás során automatikus kedvezmény
async function applyLoyaltyDiscount(
  partnerId: UUID,
  subtotal: number
): Promise<DiscountResult> {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: { loyaltyTier: true }
  });

  if (!partner.loyaltyTier) {
    return { discountAmount: 0, discountPercent: 0, tierApplied: null };
  }

  const tier = partner.loyaltyTier;
  const discountAmount = subtotal * (tier.discountPercent / 100);

  return {
    discountAmount: Math.round(discountAmount),  // Kerekítés
    discountPercent: tier.discountPercent,
    tierApplied: tier.tierCode,
    tierName: tier.tierName
  };
}

// Kombinálás manuális kedvezménnyel
function combinedDiscount(
  loyaltyDiscount: DiscountResult,
  manualDiscount: number,
  subtotal: number
): number {
  // Loyalty + manuális kedvezmény összeadódik, de max 30%
  const totalPercent = Math.min(
    loyaltyDiscount.discountPercent + manualDiscount,
    30
  );

  return subtotal * (totalPercent / 100);
}
```

### Adatbázis Séma

```sql
-- Loyalty tier definíciók (tenant-specifikus)
CREATE TABLE loyalty_tier (
  tier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(tenant_id),
  tier_code VARCHAR(20) NOT NULL,
  tier_name VARCHAR(100) NOT NULL,
  min_transactions INT NOT NULL,
  min_spend DECIMAL(12,2),
  discount_percent DECIMAL(5,2) NOT NULL,
  benefits JSONB DEFAULT '[]',
  badge_color VARCHAR(7),
  sort_order INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, tier_code),
  INDEX idx_tier_tenant (tenant_id, sort_order)
);

-- Partner loyalty státusz
ALTER TABLE partner ADD COLUMN loyalty_tier_id UUID REFERENCES loyalty_tier(tier_id);
ALTER TABLE partner ADD COLUMN loyalty_points INT DEFAULT 0;
ALTER TABLE partner ADD COLUMN tier_calculated_at TIMESTAMPTZ;

-- Loyalty history (tier változások)
CREATE TABLE loyalty_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner(partner_id),
  old_tier_id UUID REFERENCES loyalty_tier(tier_id),
  new_tier_id UUID REFERENCES loyalty_tier(tier_id),
  reason VARCHAR(50),  -- 'CALCULATION' | 'MANUAL' | 'PROMOTION'
  transaction_count INT,
  total_spend DECIMAL(12,2),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES users(user_id)
);

-- Kedvezmény alkalmazás log
CREATE TABLE loyalty_discount_applied (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  tier_id UUID REFERENCES loyalty_tier(tier_id),
  subtotal DECIMAL(12,2) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL,
  discount_amount DECIMAL(12,2) NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
```

### UI Megjelenítés

```
┌─────────────────────────────────────────────────────────────┐
│                    PARTNER PROFIL                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 Kovács János                                           │
│  📞 +36 30 123 4567                                        │
│                                                             │
│  ┌────────────────────────────────────┐                    │
│  │  🥈 EZÜST TÖRZSVENDÉG              │                    │
│  │  ─────────────────────────          │                    │
│  │  • 10% automatikus kedvezmény       │                    │
│  │  • 14 bérlés az elmúlt 12 hónapban  │                    │
│  │                                     │                    │
│  │  Következő szint: 🥇 Arany (6 bérlés)│                   │
│  │  ████████████░░░░ 70%               │                    │
│  └────────────────────────────────────┘                    │
│                                                             │
│  📊 Tranzakció összesítő:                                  │
│  • Összes bérlés: 47                                       │
│  • Összes költés: 1.250.000 Ft                            │
│  • Tag óta: 2023-05-12                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tenant Konfiguráció

```typescript
interface TenantLoyaltyConfig {
  isEnabled: boolean;
  lookbackMonths: number;
  includeRentals: boolean;
  includeSales: boolean;
  includeService: boolean;
  maxCombinedDiscount: number;     // Max össz kedvezmény %
  tierUpgradeNotification: boolean;
  tierDowngradeNotification: boolean;
}

// Admin felület a tier-ek konfigurálásához
async function updateTenantTiers(
  tenantId: UUID,
  tiers: LoyaltyTier[]
): Promise<void> {
  // Validáció: sorrendben növekvő minTransactions
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].minTransactions <= tiers[i-1].minTransactions) {
      throw new ValidationError('Tier thresholds must be increasing');
    }
  }

  await prisma.$transaction(async (tx) => {
    // Régi tier-ek soft delete
    await tx.loyaltyTier.updateMany({
      where: { tenantId },
      data: { isActive: false }
    });

    // Új tier-ek létrehozása
    for (const tier of tiers) {
      await tx.loyaltyTier.create({
        data: {
          ...tier,
          tenantId,
          isActive: true
        }
      });
    }
  });

  // Összes partner tier újraszámítása
  await queueTierRecalculation(tenantId);
}
```

---

## Következmények

### Pozitív
- Automatikus kedvezmény alkalmazás
- Ügyfél motiváció a visszatérésre
- Tenant-specifikus konfiguráció
- Teljes történet audit

### Negatív
- Napi tier számítás CPU költség
- Tier downgrade kommunikáció érzékeny

### Kockázatok
- **Kedvezmény abuse:** Max 30% combined limit
- **Tier gaming:** Kis tranzakciók spammelése → minimum összeg limit
