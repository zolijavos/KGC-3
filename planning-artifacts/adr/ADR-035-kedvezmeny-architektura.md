# ADR-035: Kedvezmény Architektúra

**Státusz:** Accepted
**Dátum:** 2026-01-04
**Döntéshozók:** Architect, PM, Finance Lead
**Kapcsolódó:** ADR-007 (Employee Discount), ADR-034 (Loyalty), ADR-032 (RBAC)

---

## Kontextus

A KGC ERP v7.0 rendszerben többféle kedvezmény létezik:
- **Loyalty kedvezmény** - Automatikus, tier alapján
- **Manuális kedvezmény** - Boltvezető adhatja (±20%)
- **Akciós kedvezmény** - Időszakos promóciók
- **Dolgozói kedvezmény** - Belső munkatársaknak
- **Céges kedvezmény** - Szerződéses partnereknek

Szükség van egy egységes kedvezmény kezelési architektúrára.

---

## Döntési Kérdés

**Hogyan kombináljuk és kezeljük a különböző kedvezménytípusokat úgy, hogy az transzparens, auditálható és RBAC-kompatibilis legyen?**

---

## Döntés

### Kedvezmény Típusok Hierarchia

```
┌─────────────────────────────────────────────────────────────────┐
│                  KEDVEZMÉNY TÍPUSOK                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    AUTOMATIKUS                           │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • LOYALTY - Törzsvendég tier alapján (5-15%)           │   │
│  │  • PROMOTION - Aktív kampány/akció                       │   │
│  │  • EMPLOYEE - Dolgozói státusz alapján                   │   │
│  │  • CONTRACT - Céges szerződés alapján                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     MANUÁLIS                             │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • OPERATOR_MANUAL - Nem engedélyezett                   │   │
│  │  • MANAGER_MANUAL - Boltvezető ±20%                      │   │
│  │  • ADMIN_MANUAL - Admin korlátlan                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              KOMBINÁLÁSI SZABÁLYOK                       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  • Max összesített kedvezmény: 30%                       │   │
│  │  • Automatikus + Manuális összeadódik                    │   │
│  │  • Audit trail minden kedvezményre                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Kedvezmény Entitások

```typescript
enum DiscountType {
  LOYALTY = 'LOYALTY',           // Törzsvendég
  PROMOTION = 'PROMOTION',       // Akció/kampány
  EMPLOYEE = 'EMPLOYEE',         // Dolgozói
  CONTRACT = 'CONTRACT',         // Céges szerződés
  MANUAL = 'MANUAL',             // Manuális
  COUPON = 'COUPON'              // Kuponkód
}

enum DiscountCalculation {
  PERCENTAGE = 'PERCENTAGE',     // Százalékos
  FIXED_AMOUNT = 'FIXED_AMOUNT', // Fix összeg
  FREE_ITEM = 'FREE_ITEM'        // Ingyenes tétel
}

interface Discount {
  discountId: UUID;
  tenantId: UUID;
  type: DiscountType;
  name: string;
  description: string;
  calculation: DiscountCalculation;
  value: number;                  // % vagy Ft
  minOrderValue?: number;         // Minimum rendelés érték
  maxDiscountAmount?: number;     // Maximum kedvezmény Ft-ban
  validFrom?: Date;
  validUntil?: Date;
  usageLimit?: number;            // Max felhasználás
  usageCount: number;
  applicableCategories?: UUID[];  // Csak ezekre a kategóriákra
  isStackable: boolean;           // Kombinálható-e másikkal
  priority: number;               // Alkalmazási sorrend
  isActive: boolean;
}

interface AppliedDiscount {
  discount: Discount;
  originalAmount: number;
  discountAmount: number;
  appliedBy?: UUID;               // Manuális esetén
  reason?: string;                // Indoklás (manuális)
}
```

### Kedvezmény Kalkulációs Engine

```typescript
class DiscountEngine {
  private readonly MAX_TOTAL_DISCOUNT = 30; // %

  async calculateDiscounts(
    order: OrderContext
  ): Promise<DiscountResult> {
    const applicableDiscounts: AppliedDiscount[] = [];
    let totalDiscountPercent = 0;
    let remainingAmount = order.subtotal;

    // 1. Automatikus kedvezmények (prioritás szerint)
    const autoDiscounts = await this.getAutoDiscounts(order);

    for (const discount of autoDiscounts) {
      if (totalDiscountPercent >= this.MAX_TOTAL_DISCOUNT) break;

      const applied = this.applyDiscount(
        discount,
        remainingAmount,
        this.MAX_TOTAL_DISCOUNT - totalDiscountPercent
      );

      if (applied.discountAmount > 0) {
        applicableDiscounts.push(applied);
        totalDiscountPercent += applied.effectivePercent;
        remainingAmount -= applied.discountAmount;
      }
    }

    // 2. Manuális kedvezmény (ha van)
    if (order.manualDiscount) {
      const manualApplied = this.applyManualDiscount(
        order.manualDiscount,
        remainingAmount,
        this.MAX_TOTAL_DISCOUNT - totalDiscountPercent
      );

      if (manualApplied) {
        applicableDiscounts.push(manualApplied);
        totalDiscountPercent += manualApplied.effectivePercent;
      }
    }

    return {
      originalSubtotal: order.subtotal,
      totalDiscount: order.subtotal - remainingAmount,
      totalDiscountPercent,
      finalAmount: remainingAmount,
      appliedDiscounts: applicableDiscounts,
      breakdown: this.generateBreakdown(applicableDiscounts)
    };
  }

  private async getAutoDiscounts(order: OrderContext): Promise<Discount[]> {
    const discounts: Discount[] = [];

    // Loyalty kedvezmény
    if (order.partner?.loyaltyTier) {
      discounts.push({
        type: DiscountType.LOYALTY,
        name: `${order.partner.loyaltyTier.tierName} kedvezmény`,
        calculation: DiscountCalculation.PERCENTAGE,
        value: order.partner.loyaltyTier.discountPercent,
        isStackable: true,
        priority: 1
      });
    }

    // Aktív promóciók
    const activePromotions = await this.getActivePromotions(
      order.tenantId,
      order.items
    );
    discounts.push(...activePromotions);

    // Dolgozói kedvezmény
    if (order.partner?.isEmployee) {
      discounts.push({
        type: DiscountType.EMPLOYEE,
        name: 'Dolgozói kedvezmény',
        calculation: DiscountCalculation.PERCENTAGE,
        value: order.partner.employeeDiscountPercent,
        isStackable: true,
        priority: 3
      });
    }

    // Céges szerződéses kedvezmény
    if (order.partner?.contract) {
      discounts.push({
        type: DiscountType.CONTRACT,
        name: `${order.partner.companyName} szerződéses kedvezmény`,
        calculation: DiscountCalculation.PERCENTAGE,
        value: order.partner.contract.discountPercent,
        isStackable: true,
        priority: 2
      });
    }

    // Prioritás szerint rendezés
    return discounts.sort((a, b) => a.priority - b.priority);
  }

  private applyDiscount(
    discount: Discount,
    amount: number,
    remainingAllowance: number
  ): AppliedDiscount {
    let discountAmount: number;
    let effectivePercent: number;

    switch (discount.calculation) {
      case DiscountCalculation.PERCENTAGE:
        effectivePercent = Math.min(discount.value, remainingAllowance);
        discountAmount = amount * (effectivePercent / 100);
        break;

      case DiscountCalculation.FIXED_AMOUNT:
        discountAmount = Math.min(discount.value, amount);
        effectivePercent = (discountAmount / amount) * 100;
        break;
    }

    // Max discount limit
    if (discount.maxDiscountAmount) {
      discountAmount = Math.min(discountAmount, discount.maxDiscountAmount);
    }

    return {
      discount,
      originalAmount: amount,
      discountAmount: Math.round(discountAmount),
      effectivePercent
    };
  }
}
```

### RBAC Integráció (Manuális Kedvezmény)

```typescript
interface ManualDiscountRequest {
  orderId: UUID;
  discountPercent: number;
  reason: string;
  approvedBy: UUID;
}

async function applyManualDiscount(
  request: ManualDiscountRequest,
  currentUser: User
): Promise<AppliedDiscount> {
  // 1. RBAC ellenőrzés
  const maxAllowed = await getMaxManualDiscount(currentUser);

  if (Math.abs(request.discountPercent) > maxAllowed) {
    throw new ForbiddenException(
      `Maximum manual discount for your role: ±${maxAllowed}%`
    );
  }

  // 2. Indoklás kötelező
  if (!request.reason || request.reason.length < 10) {
    throw new ValidationException(
      'Discount reason must be at least 10 characters'
    );
  }

  // 3. Kedvezmény alkalmazása
  const applied = await discountEngine.applyManualDiscount({
    orderId: request.orderId,
    type: DiscountType.MANUAL,
    value: request.discountPercent,
    appliedBy: currentUser.id,
    reason: request.reason
  });

  // 4. Audit log
  await auditLog.record({
    action: 'MANUAL_DISCOUNT_APPLIED',
    orderId: request.orderId,
    discountPercent: request.discountPercent,
    reason: request.reason,
    appliedBy: currentUser.id,
    userRole: currentUser.role
  });

  return applied;
}

function getMaxManualDiscount(user: User): number {
  switch (user.role) {
    case Role.OPERATOR:
    case Role.TECHNIKUS:
      return 0;               // Nincs manual kedvezmény jog
    case Role.BOLTVEZETO:
      return 20;              // ±20%
    case Role.PARTNER_OWNER:
    case Role.CENTRAL_ADMIN:
      return 50;              // ±50%
    case Role.SUPER_ADMIN:
      return 100;             // Korlátlan
    default:
      return 0;
  }
}
```

### Adatbázis Séma

```sql
-- Kedvezmény definíciók
CREATE TABLE discount (
  discount_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(tenant_id),
  type VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  calculation VARCHAR(20) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(12,2),
  max_discount_amount DECIMAL(12,2),
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  usage_limit INT,
  usage_count INT DEFAULT 0,
  applicable_categories UUID[],
  is_stackable BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id),
  INDEX idx_discount_active (tenant_id, is_active, valid_from, valid_until)
);

-- Alkalmazott kedvezmények
CREATE TABLE applied_discount (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  discount_id UUID REFERENCES discount(discount_id),
  discount_type VARCHAR(20) NOT NULL,
  discount_name VARCHAR(100) NOT NULL,
  original_amount DECIMAL(12,2) NOT NULL,
  discount_percent DECIMAL(5,2),
  discount_amount DECIMAL(12,2) NOT NULL,
  applied_by UUID REFERENCES users(user_id),
  reason TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_applied_transaction (transaction_id)
);

-- Promóciós kampányok
CREATE TABLE promotion (
  promotion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(tenant_id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  discount_id UUID REFERENCES discount(discount_id),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  target_segment VARCHAR(50),  -- 'ALL' | 'NEW' | 'RETURNING' | 'VIP'
  promo_code VARCHAR(20),
  banner_image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_promotion_active (tenant_id, is_active, start_date, end_date)
);
```

### UI Megjelenítés

```
┌─────────────────────────────────────────────────────────────┐
│                  KEDVEZMÉNY ÖSSZESÍTŐ                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Részösszeg:                          45.000 Ft            │
│  ────────────────────────────────────────────────          │
│                                                             │
│  📊 Alkalmazott kedvezmények:                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🥈 Ezüst törzsvendég              -10%    -4.500 Ft │   │
│  │ 🎉 Téli akció (WINTER2026)         -5%    -2.250 Ft │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📝 Manuális kedvezmény: [Boltvezető: max ±20%]            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Kedvezmény: [-10] %    Indok: [________________]    │   │
│  │                                 (min 10 karakter)   │   │
│  │ [Alkalmaz]                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ────────────────────────────────────────────────          │
│  Össz kedvezmény:          -25%              -11.250 Ft    │
│  ════════════════════════════════════════════════          │
│  FIZETENDŐ:                                  33.750 Ft    │
│                                                             │
│  ⚠️ Maximum kedvezmény: 30% (maradék: 5%)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Következmények

### Pozitív
- Egységes kedvezmény kezelés minden típusra
- Max 30% limit védi a profitot
- RBAC-alapú manuális kedvezmény kontroll
- Teljes audit trail

### Negatív
- Komplex kombinálási logika
- Promóció kezelés admin overhead

### Kockázatok
- **Kedvezmény stacking abuse:** Max limit + audit
- **Rossz konfiguráció:** Negatív kedvezmény validáció
