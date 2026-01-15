# ADR-030: NAV Online Számlázás API v3.0 Integráció

**Státusz:** Accepted
**Dátum:** 2026-01-04
**Döntéshozók:** Architect, PM, Finance Lead
**Kapcsolódó:** ADR-013 (Fit-Gap), FR24, FR28-FR29, FR56

---

## Kontextus

A KGC ERP v7.0 rendszerben **kötelező a NAV Online Számla** beküldés minden B2C és B2B tranzakciónál. A magyar jogszabályok (2018. évi LXXI. törvény) értelmében minden 100.000 Ft ÁFA tartalom feletti számláról valós idejű adatszolgáltatás szükséges.

A rendszer a **Számlázz.hu API**-t használja közvetítőként, amely:
- Automatikus NAV adatszolgáltatást végez
- PDF számlát generál
- Hibakezelést és újrapróbálkozást biztosít

---

## Döntési Kérdés

**Hogyan integráljuk a NAV Online Számlázást a Számlázz.hu API-n keresztül hibatűrő és audit-kompatibilis módon?**

---

## Döntési Tényezők

1. **Jogszabályi megfelelőség** - NAV Online Számla v3.0 API kötelező
2. **Valós idejű beküldés** - 24 órán belüli adatszolgáltatás
3. **Hibatűrés** - API timeout, hálózati hiba kezelése
4. **Audit trail** - Minden számla művelet naplózása
5. **Fallback** - Manuális számla lehetőség API hiba esetén

---

## Döntés

### Számlázz.hu API Integráció Architektúra

```
┌─────────────────────────────────────────────────────────────────┐
│                    SZÁMLA KIÁLLÍTÁSI FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  KGC ERP ──► Számla Request ──► Számlázz.hu API ──► NAV API    │
│      │              │                   │              │        │
│      │              │                   │              ▼        │
│      │              │                   │         NAV Online    │
│      │              │                   │         Adatbázis     │
│      │              │                   ▼                       │
│      │              │            ┌─────────────┐                │
│      │              │            │ PDF Számla  │                │
│      │              │            │ + Státusz   │                │
│      │              │            └─────────────┘                │
│      │              │                   │                       │
│      │              ◄───────────────────┘                       │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ AUDIT LOG: számla_id, timestamp, status, nav_response   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### API Endpoint Struktúra

```typescript
interface SzamlazzhuRequest {
  // Eladó adatok (KGC tenant-ből)
  elado: {
    bank: string;
    bankszamlaszam: string;
    emailReplyto: string;
    emailSubject: string;
    emailSzoveg: string;
  };

  // Vevő adatok (Partner entitásból)
  vevo: {
    nev: string;
    irsz: string;
    telepules: string;
    cim: string;
    adoszam?: string;        // Céges számla esetén
    adoszamTipus?: 'HU' | 'EU' | 'NONEU';
  };

  // Számla tételek
  tetelek: Array<{
    megnevezes: string;
    mennyiseg: number;
    mennyisegiEgyseg: string;
    nettoEgysegar: number;
    afakulcs: '27' | '18' | '5' | 'AAM' | 'TAM' | 'EU' | 'EUK' | 'MAA';
    nettoErtek: number;
    afaErtek: number;
    bruttoErtek: number;
  }>;

  // Számla metaadatok
  szamlaKelte: string;       // YYYY-MM-DD
  teljesitesDatum: string;   // YYYY-MM-DD
  fizetesiHatarido: string;  // YYYY-MM-DD
  fizmod: 'készpénz' | 'átutalás' | 'bankkártya' | 'utánvét';
  ppizonosito?: string;      // MyPos tranzakció ID
  megjegyzes?: string;
}

interface SzamlazzhuResponse {
  success: boolean;
  szamlaszam?: string;       // pl. "KGC-2026-00001"
  kintpizonosito?: string;   // NAV kintlevőség azonosító
  pdf?: string;              // Base64 PDF
  errorCode?: number;
  errorMessage?: string;
}
```

### Hibakezelési Stratégia

```typescript
enum InvoiceStatus {
  PENDING = 'pending',           // Várakozik küldésre
  SENT = 'sent',                 // Elküldve, válaszra vár
  SUCCESS = 'success',           // Sikeres, NAV-hoz beküldve
  FAILED_RETRYABLE = 'failed_retryable',  // Újrapróbálható hiba
  FAILED_PERMANENT = 'failed_permanent',  // Végleges hiba
  MANUAL_REQUIRED = 'manual_required'     // Kézi beavatkozás kell
}

// Retry stratégia
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,

  // Újrapróbálható hibakódok
  retryableCodes: [
    'TIMEOUT',
    'CONNECTION_ERROR',
    'RATE_LIMIT',
    'SERVICE_UNAVAILABLE',
    'NAV_TEMPORARY_ERROR'
  ],

  // Nem újrapróbálható hibák
  permanentCodes: [
    'INVALID_TAX_NUMBER',
    'INVALID_INVOICE_DATA',
    'DUPLICATE_INVOICE',
    'AUTH_ERROR'
  ]
};
```

### Exponenciális Backoff Implementáció

```typescript
async function submitInvoiceWithRetry(
  invoice: SzamlazzhuRequest,
  attempt: number = 0
): Promise<SzamlazzhuResponse> {
  try {
    const response = await szamlazzhuApi.createInvoice(invoice);

    // Sikeres beküldés
    await auditLog.record({
      action: 'INVOICE_CREATED',
      invoiceNumber: response.szamlaszam,
      navStatus: 'SUBMITTED',
      timestamp: new Date()
    });

    return response;

  } catch (error) {
    const isRetryable = RETRY_CONFIG.retryableCodes.includes(error.code);

    if (isRetryable && attempt < RETRY_CONFIG.maxRetries) {
      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
        RETRY_CONFIG.maxDelayMs
      );

      await auditLog.record({
        action: 'INVOICE_RETRY',
        attempt: attempt + 1,
        errorCode: error.code,
        nextRetryIn: delay
      });

      await sleep(delay);
      return submitInvoiceWithRetry(invoice, attempt + 1);
    }

    // Végleges hiba - manuális beavatkozás szükséges
    await auditLog.record({
      action: 'INVOICE_FAILED',
      errorCode: error.code,
      errorMessage: error.message,
      requiresManualIntervention: true
    });

    throw new InvoicePermanentError(error);
  }
}
```

### Manuális Fallback Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                 MANUÁLIS SZÁMLA FALLBACK                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. API hiba detektálva (5x retry után is sikertelen)      │
│                           │                                 │
│                           ▼                                 │
│  2. Boltvezető értesítés (push notification + email)       │
│                           │                                 │
│                           ▼                                 │
│  3. Manuális számla opciók:                                │
│     ┌─────────────────────────────────────────┐            │
│     │ [A] Számlázz.hu web felületen kiállít   │            │
│     │ [B] Offline nyugta nyomtatás            │            │
│     │ [C] Késleltetett beküldés (24h-n belül) │            │
│     └─────────────────────────────────────────┘            │
│                           │                                 │
│                           ▼                                 │
│  4. Manuális számla rögzítése az ERP-ben                   │
│     - Külső számlaszám megadása                            │
│     - PDF feltöltés                                        │
│     - Audit trail: "MANUAL_INVOICE"                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Adatbázis Séma

```sql
CREATE TABLE INVOICE (
  invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(tenant_id),
  partner_id UUID NOT NULL REFERENCES partner(partner_id),

  -- Számla azonosítók
  internal_number VARCHAR(50) NOT NULL,        -- KGC belső szám
  external_number VARCHAR(50),                  -- Számlázz.hu szám
  nav_reference VARCHAR(100),                   -- NAV kintlevőség ID

  -- Státusz követés
  status invoice_status NOT NULL DEFAULT 'pending',
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  error_code VARCHAR(50),
  error_message TEXT,

  -- Számla adatok
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  net_amount DECIMAL(12,2) NOT NULL,
  vat_amount DECIMAL(12,2) NOT NULL,
  gross_amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) DEFAULT 'HUF',

  -- PDF tárolás
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(user_id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(tenant_id, internal_number),
  INDEX idx_invoice_status (tenant_id, status),
  INDEX idx_invoice_retry (status, next_retry_at) WHERE status = 'failed_retryable'
);

-- RLS Policy
ALTER TABLE INVOICE ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON INVOICE
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

---

## Teljesítmény Követelmények

| Metrika | Cél | Mérés |
|---------|-----|-------|
| Számla kiállítás | < 10 sec | API response time |
| Retry queue feldolgozás | 5 perc | Background job interval |
| NAV beküldés SLA | 24 óra | Jogszabályi követelmény |
| PDF generálás | < 5 sec | Számlázz.hu oldalon |

---

## Következmények

### Pozitív
- NAV compliance biztosított Számlázz.hu garantált beküldéssel
- Automatikus hibakezelés és retry
- Teljes audit trail minden számla művelethez
- Manuális fallback biztosítja az üzletmenet folytonosságot

### Negatív
- Számlázz.hu függőség (vendor lock-in)
- Hálózati hiba esetén akár 5x retry delay
- Manuális beavatkozás igény ritka esetekben

### Kockázatok
- **API változás:** Számlázz.hu API verzió update → 3 hónap migráció buffer
- **Rate limiting:** Magas forgalom → Queue-based batch processing
- **NAV audit:** Hiányzó számla → Manuális pótlás 24h-n belül

---

## Kapcsolódó Dokumentumok

- [Számlázz.hu API Dokumentáció](https://www.szamlazz.hu/szamla/docs/doku.php)
- [NAV Online Számla API v3.0](https://onlineszamla.nav.gov.hu/)
- ADR-013: Fit-Gap Döntések
- FR24, FR28-FR29, FR56: Funkcionális követelmények
