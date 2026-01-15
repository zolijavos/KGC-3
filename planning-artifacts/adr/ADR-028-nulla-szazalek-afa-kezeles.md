# ADR-028: 0% ÁFA Kezelés és Számlázási Szabályok

**Státusz:** Accepted
**Dátum:** 2026-01-04
**Döntéshozók:** Architect, PM, Finance Lead
**Kapcsolódó:** ADR-017 (Szállítói API integráció), PRD 4.5 (Számlázz.hu integráció)

---

## Kontextus

A KGC ERP rendszerben háromféle 0% ÁFA eset fordul elő, amelyek mindegyike más-más üzleti logikát és validációt igényel. A helytelen ÁFA kulcs alkalmazása NAV bírságot és adóhiányt eredményezhet.

### Üzleti Probléma

1. **Fordított ÁFA (Reverse Charge):** Cégek közötti ügyleteknél, aláírt nyilatkozat birtokában
2. **FAD termékek:** Fémkereskedésből származó acél alapanyagok értékesítése jogosult partnereknek
3. **Kaució:** Letéti jellegű összegek, amelyek nem számítanak bele az adóalapba

### Jelenlegi Helyzet

- Nincs automatizált 0% ÁFA kezelés
- Manuális ellenőrzés hibalehetőséget rejt
- Számlázz.hu API-nak megfelelő ÁFA kódot kell küldeni

---

## Döntési Kérdés

**Hogyan kezeljük a három különböző 0% ÁFA esetet úgy, hogy a rendszer automatikusan validálja és a megfelelő ÁFA kódot küldje a Számlázz.hu API-nak?**

---

## Döntési Tényezők

1. **NAV megfelelőség:** Helyes ÁFA kulcs és jogcím alkalmazása
2. **Automatizálás:** Minimális manuális beavatkozás
3. **Validáció:** Hibás kombináció esetén figyelmeztetés vagy blokkolás
4. **Auditálhatóság:** Nyilatkozatok és jogosultságok dokumentálása
5. **Számlázz.hu kompatibilitás:** Megfelelő API paraméterek küldése

---

## Döntés

### Három 0% ÁFA Eset Kezelése

---

### 1. Fordított ÁFA (Reverse Charge)

**Szabály:** Cég partner + érvényes aláírt nyilatkozat = 0% ÁFA

#### Üzleti Logika

```
HA partner.type == 'COMPANY'
  ÉS partner.reverse_charge_declaration == true
  ÉS partner.declaration_valid_until >= ma()
AKKOR
  vat_rate = 0%
  vat_reason = 'REVERSE_CHARGE'
  számlázz.hu_vat_code = 'AAM'
KÜLÖNBEN
  vat_rate = 27%
```

#### Implementáció

```typescript
// Partner entitás bővítése
interface Partner {
  id: string;
  type: 'INDIVIDUAL' | 'COMPANY';  // Magánszemély | Cég
  tax_number?: string;              // Adószám (csak cégnek)

  // Fordított ÁFA nyilatkozat
  reverse_charge_declaration: boolean;
  declaration_file_id?: string;     // PDF dokumentum referencia
  declaration_uploaded_at?: Date;
  declaration_valid_until?: Date;
  declaration_uploaded_by?: string;
}

// Validációs service
@Injectable()
export class VatValidationService {

  isReverseChargeEligible(partner: Partner): boolean {
    // Magánszemély SOHA nem lehet fordított ÁFA alany
    if (partner.type === 'INDIVIDUAL') {
      return false;
    }

    // Cégnek kell érvényes nyilatkozat
    if (!partner.reverse_charge_declaration) {
      return false;
    }

    // Lejárat ellenőrzés
    if (partner.declaration_valid_until &&
        partner.declaration_valid_until < new Date()) {
      return false;
    }

    return true;
  }
}
```

#### Nyilatkozat Feltöltés UI

```
┌─────────────────────────────────────────────────────────────┐
│  PARTNER ADATOK - ABC Építő Kft.                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Típus: ● Cég  ○ Magánszemély                              │
│  Adószám: 12345678-2-42                                     │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│  FORDÍTOTT ÁFA NYILATKOZAT                                  │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  [✓] Fordított adózás alanya (aláírt nyilatkozat alapján)  │
│                                                             │
│  Nyilatkozat dokumentum:                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 fordított_afa_nyilatkozat_2026.pdf               │   │
│  │    Feltöltve: 2026-01-04 | Feltöltötte: admin       │   │
│  │    [Megtekintés]  [Újra feltöltés]                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Érvényesség: 2026-12-31-ig                                │
│                                                             │
│  ⚠️ A nyilatkozat hiányában 27% ÁFA kerül felszámításra!  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. FAD Termékek (Fémkereskedés)

**Szabály:** FAD jelölésű termék + FAD jogosult partner = kötelező 0% ÁFA

> **FONTOS:** Nem hulladék termékekről van szó, hanem fémkereskedésből származó acél alapanyagokról!

#### Üzleti Logika

```
HA product.is_fad == true
AKKOR
  HA partner.is_fad_eligible == true
  AKKOR
    vat_rate = 0%
    vat_reason = 'FAD'
    számlázz.hu_vat_code = 'FAD'
  KÜLÖNBEN
    → FIGYELMEZTETÉS + BLOKKOLÁS
    "A partner nem FAD jogosult! Az értékesítés nem folytatható."
```

#### Implementáció

```typescript
// Termék entitás bővítése
interface Product {
  id: string;
  name: string;
  sku: string;

  // FAD jelölés
  is_fad: boolean;  // Checkbox a termék törzsadatoknál
  fad_category?: string;  // Pl. "acél lemez", "acél rúd"
}

// Partner entitás bővítése
interface Partner {
  // ... előző mezők

  // FAD jogosultság
  is_fad_eligible: boolean;  // Checkbox a partner adatoknál
  fad_license_number?: string;  // Fémkereskedői engedély száma
}

// Validáció értékesítéskor
@Injectable()
export class FadValidationService {

  validateFadSale(product: Product, partner: Partner): ValidationResult {
    // Ha a termék nem FAD, nincs teendő
    if (!product.is_fad) {
      return { valid: true, vatRate: null };  // Normál ÁFA szabályok
    }

    // FAD termék, de partner nem jogosult
    if (!partner.is_fad_eligible) {
      return {
        valid: false,
        blocked: true,
        error: 'FAD_PARTNER_NOT_ELIGIBLE',
        message: 'A partner nem FAD jogosult! FAD termék értékesítése blokkolva.',
        suggestedAction: 'Ellenőrizze a partner FAD jogosultságát, vagy válasszon másik terméket.'
      };
    }

    // FAD termék + FAD partner = 0% ÁFA
    return {
      valid: true,
      vatRate: 0,
      vatReason: 'FAD',
      szamlazzhuVatCode: 'FAD'
    };
  }
}
```

#### FAD Figyelmeztetés UI

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ FIGYELMEZTETÉS - FAD TERMÉK ÉRTÉKESÍTÉS                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  A kiválasztott termék FAD (fémkereskedési) termék:        │
│                                                             │
│  📦 Acél négyszögcső 40x40x3mm - 6m                        │
│     FAD kategória: Acél alapanyag                          │
│                                                             │
│  ❌ A partner NEM FAD jogosult:                            │
│                                                             │
│  👤 Kiss János (Magánszemély)                              │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│  Az értékesítés NEM folytatható!                           │
│  FAD termék csak FAD jogosult partnernek értékesíthető.   │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  Lehetőségek:                                               │
│  • Válasszon másik terméket                                 │
│  • Állítsa be a partner FAD jogosultságát                  │
│                                                             │
│                              [Vissza a kosárhoz]            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Kaució

**Szabály:** Kaució tétel = mindig 0% ÁFA

#### Üzleti Logika

```
HA line_item.type == 'DEPOSIT' (kaució)
AKKOR
  vat_rate = 0%
  vat_reason = 'DEPOSIT'
  számlázz.hu_vat_code = 'AAM'  // Mentes az adó alól
```

#### Implementáció

```typescript
// Számlasor típusok
enum LineItemType {
  PRODUCT = 'PRODUCT',       // Termék értékesítés
  SERVICE = 'SERVICE',       // Szolgáltatás
  RENTAL = 'RENTAL',         // Bérleti díj
  DEPOSIT = 'DEPOSIT',       // Kaució (0% ÁFA)
  DEPOSIT_RETURN = 'DEPOSIT_RETURN'  // Kaució visszatérítés
}

// Számlasor entitás
interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  type: LineItemType;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;       // Automatikusan 0 kaució esetén
  vat_reason?: string;    // 'DEPOSIT' kaució esetén
  net_amount: number;
  vat_amount: number;     // 0 kaució esetén
  gross_amount: number;
}

// Automatikus ÁFA kalkuláció
@Injectable()
export class InvoiceLineService {

  calculateVat(lineItem: Partial<InvoiceLineItem>, partner: Partner, product?: Product): LineItemVatResult {

    // 1. Kaució - mindig 0%
    if (lineItem.type === 'DEPOSIT' || lineItem.type === 'DEPOSIT_RETURN') {
      return {
        vatRate: 0,
        vatReason: 'DEPOSIT',
        szamlazzhuVatCode: 'AAM'
      };
    }

    // 2. FAD termék ellenőrzés
    if (product?.is_fad) {
      const fadResult = this.fadValidation.validateFadSale(product, partner);
      if (!fadResult.valid) {
        throw new BusinessRuleException(fadResult.message);
      }
      if (fadResult.vatRate === 0) {
        return {
          vatRate: 0,
          vatReason: 'FAD',
          szamlazzhuVatCode: 'FAD'
        };
      }
    }

    // 3. Fordított ÁFA ellenőrzés
    if (this.vatValidation.isReverseChargeEligible(partner)) {
      return {
        vatRate: 0,
        vatReason: 'REVERSE_CHARGE',
        szamlazzhuVatCode: 'AAM'
      };
    }

    // 4. Normál ÁFA (27%)
    return {
      vatRate: 27,
      vatReason: null,
      szamlazzhuVatCode: '27'
    };
  }
}
```

---

## Számlázz.hu API Integráció

### ÁFA Kódok Mapping

| KGC ÁFA Ok | Számlázz.hu Kód | Leírás |
|------------|-----------------|--------|
| Normál 27% | `27` | Általános forgalmi adó 27% |
| Fordított ÁFA | `AAM` | Alanyi adómentes |
| FAD | `FAD` | Fordított adózás (fémkereskedelem) |
| Kaució | `AAM` | Alanyi adómentes (nem adóköteles) |

### API Hívás Példa

```typescript
// Számlázz.hu API kliens
@Injectable()
export class SzamlazzhuService {

  async createInvoice(invoice: Invoice): Promise<SzamlazzhuResponse> {
    const items = invoice.line_items.map(item => ({
      megnevezes: item.description,
      mennyiseg: item.quantity,
      mennyisegiEgyseg: item.unit,
      nettoEgysegar: item.unit_price,
      afakulcs: this.mapVatCode(item.vat_rate, item.vat_reason),
      // FAD és fordított ÁFA esetén megjegyzés
      megjegyzes: this.getVatNote(item.vat_reason)
    }));

    return this.apiClient.generateInvoice({
      // ... fejléc adatok
      tetelek: items
    });
  }

  private mapVatCode(vatRate: number, vatReason?: string): string {
    if (vatReason === 'FAD') return 'FAD';
    if (vatReason === 'REVERSE_CHARGE') return 'AAM';
    if (vatReason === 'DEPOSIT') return 'AAM';
    return vatRate.toString();  // '27', '18', '5', '0'
  }

  private getVatNote(vatReason?: string): string | null {
    switch (vatReason) {
      case 'REVERSE_CHARGE':
        return 'Fordított adózás - Áfa tv. 142. §';
      case 'FAD':
        return 'Fordított adózás - Fémkereskedelem (Áfa tv. 142. § (1) b))';
      case 'DEPOSIT':
        return 'Kaució - nem adóköteles';
      default:
        return null;
    }
  }
}
```

---

## Adatbázis Séma

```sql
-- Partner tábla bővítés
ALTER TABLE partners ADD COLUMN IF NOT EXISTS
  reverse_charge_declaration BOOLEAN DEFAULT false;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS
  declaration_file_id UUID REFERENCES files(id);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS
  declaration_valid_until DATE;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS
  declaration_uploaded_by UUID REFERENCES users(id);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS
  declaration_uploaded_at TIMESTAMP;

ALTER TABLE partners ADD COLUMN IF NOT EXISTS
  is_fad_eligible BOOLEAN DEFAULT false;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS
  fad_license_number VARCHAR(50);

-- Termék tábla bővítés
ALTER TABLE products ADD COLUMN IF NOT EXISTS
  is_fad BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS
  fad_category VARCHAR(100);

-- Számlasor bővítés
ALTER TABLE invoice_line_items ADD COLUMN IF NOT EXISTS
  vat_reason VARCHAR(50);  -- 'REVERSE_CHARGE', 'FAD', 'DEPOSIT', NULL

-- Index a FAD termékekhez
CREATE INDEX IF NOT EXISTS idx_products_is_fad ON products(is_fad) WHERE is_fad = true;
CREATE INDEX IF NOT EXISTS idx_partners_fad_eligible ON partners(is_fad_eligible) WHERE is_fad_eligible = true;
```

---

## Validációs Összefoglaló

| Eset | Partner Feltétel | Termék Feltétel | Eredmény |
|------|------------------|-----------------|----------|
| Fordított ÁFA | Cég + nyilatkozat | - | 0% ÁFA (AAM) |
| Fordított ÁFA | Magánszemély | - | 27% ÁFA |
| FAD | FAD jogosult | FAD termék | 0% ÁFA (FAD) |
| FAD | Nem jogosult | FAD termék | **BLOKKOLÁS** |
| FAD | Bármi | Nem FAD termék | Normál szabályok |
| Kaució | Bármi | DEPOSIT típus | 0% ÁFA (AAM) |

---

## Következmények

### Pozitív

- **NAV megfelelőség:** Helyes ÁFA kódok automatikus alkalmazása
- **Hibamegelőzés:** FAD validáció megakadályozza a helytelen értékesítést
- **Auditálhatóság:** Nyilatkozatok dokumentáltan tárolva
- **Automatizálás:** Minimális manuális beavatkozás a napi működésben

### Negatív

- **Komplexitás:** Három különböző 0% ÁFA logika karbantartása
- **Felhasználói tanulási görbe:** Kezelők számára új fogalmak

### Kockázatok

| Kockázat | Valószínűség | Hatás | Mitigáció |
|----------|--------------|-------|-----------|
| Lejárt nyilatkozattal számlázás | Közepes | Magas | Lejárat figyelmeztetés 30 nappal előtte |
| FAD téves jelölés | Alacsony | Közepes | Termék törzsadat validáció |
| Helytelen ÁFA kód Számlázz.hu-nak | Alacsony | Kritikus | Unit tesztek a mapping-re |

---

## Kapcsolódó Döntések

- **PRD 4.5:** Számlázz.hu integráció követelmények
- **ADR-017:** Szállítói API integráció (API kliens minta)

---

## Változásnapló

| Verzió | Dátum | Változás |
|--------|-------|----------|
| 1.0 | 2026-01-04 | Első verzió - Accepted státusz |
