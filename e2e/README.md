# KGC ERP - E2E Test Framework

Playwright-alapú E2E teszt keretrendszer párhuzamos futtatással és YOLO móddal.

## Gyors Indítás

```bash
# Normál futtatás
pnpm test:e2e

# YOLO mód (gyors, nem áll meg hibánál)
pnpm test:e2e:yolo

# Párhuzamos futtatás (4 worker)
pnpm test:e2e:parallel

# Csak kritikus (P0) tesztek
pnpm test:e2e:critical

# UI módban (debuggoláshoz)
pnpm test:e2e:ui

# Headed módban (böngésző látható)
pnpm test:e2e:headed
```

## Futtatási Módok

| Mód          | Parancs                  | Leírás                                |
| ------------ | ------------------------ | ------------------------------------- |
| **Standard** | `pnpm test:e2e`          | CI-barát, retry-val, teljes report    |
| **YOLO**     | `pnpm test:e2e:yolo`     | Gyors, nincs retry, folytatás hibánál |
| **Parallel** | `pnpm test:e2e:parallel` | 4 worker, max sebesség                |
| **Critical** | `pnpm test:e2e:critical` | Csak P0 kritikus tesztek              |
| **UI**       | `pnpm test:e2e:ui`       | Interaktív UI debugger                |
| **Headed**   | `pnpm test:e2e:headed`   | Látható böngészővel                   |

### YOLO Mód

YOLO mód a gyors fejlesztési iterációhoz:

```bash
# Környezeti változóval
TEST_YOLO=true pnpm test:e2e

# Vagy script-tel
pnpm test:e2e:yolo
```

YOLO módban:

- **Rövidebb timeout-ok**: 10s test, 3s action (vs 30s/5s)
- **Nincs retry**: hibánál azonnal tovább
- **4 párhuzamos worker**
- **Nincs screenshot/video/trace**: gyorsabb
- **Csak list reporter**: minimális output

## Könyvtárstruktúra

```
e2e/
├── critical/               # P0 - Kritikus tesztek
│   ├── auth.e2e.ts
│   ├── rental-checkout.e2e.ts
│   └── nav-invoice.e2e.ts
├── important/              # P1 - Fontos tesztek
├── standard/               # P2 - Standard tesztek
├── mobile/                 # PWA mobil tesztek
├── api/                    # Headless API tesztek
├── fixtures/               # Auth setup
│   └── auth.setup.ts
└── support/                # Test infrastruktúra
    ├── fixtures/           # Playwright fixtures
    │   ├── index.ts        # Extended test with factories
    │   └── factories/      # Data factories
    │       ├── partner.factory.ts
    │       └── bergep.factory.ts
    └── helpers/            # Utility functions
        ├── api.helper.ts
        └── index.ts
```

## Fixture-ök Használata

### Extended Test Import

```typescript
// Használj extended test-et a fixture-ökkel
import { test, expect } from '../support/fixtures';

test('partner létrehozása', async ({ partnerFactory, testTenantId }) => {
  // Factory automatikusan cleanup-ol a teszt végén
  const partner = await partnerFactory.create({
    nev: 'Test Kft.',
    tipus: 'CEG',
  });

  expect(partner.id).toBeTruthy();
  expect(partner.nev).toBe('Test Kft.');

  // Nincs szükség manuális cleanup-ra!
});
```

### Elérhető Fixture-ök

| Fixture          | Leírás                                      |
| ---------------- | ------------------------------------------- |
| `partnerFactory` | Partner/Ügyfél létrehozása auto-cleanup-pal |
| `bergepFactory`  | Bérgép létrehozása auto-cleanup-pal         |
| `testTenantId`   | Egyedi tenant ID párhuzamos izolációhoz     |
| `apiRequest`     | API request context                         |
| `isYoloMode`     | YOLO mód flag (timeout kezeléshez)          |

### Data Factory Példa

```typescript
import { test, expect } from '../support/fixtures';

test('bérlés flow', async ({ partnerFactory, bergepFactory }) => {
  // Létrehozás faker adatokkal
  const partner = await partnerFactory.create();
  const bergep = await bergepFactory.createAvailable();

  // Több entity egyszerre
  const partners = await partnerFactory.createMany(5);

  // Custom adatokkal
  const vipPartner = await partnerFactory.create({
    nev: 'VIP Ügyfél Kft.',
    hitelkeret: 1000000,
  });

  // Tesztek...

  // Auto-cleanup a teszt végén - nem kell törölni!
});
```

## API Helper Használata

```typescript
import { test, expect } from '../support/fixtures';
import { createApiHelper } from '../support/helpers';

test('API teszt', async ({ request, testTenantId }) => {
  const api = createApiHelper(request, { tenantId: testTenantId });

  // GET
  const { status, data } = await api.get('/api/partners');
  expect(status).toBe(200);

  // POST
  const created = await api.post('/api/partners', {
    nev: 'Test Partner',
    email: 'test@test.hu',
  });
  expect(created.status).toBe(201);

  // Auth
  const token = await api.login('admin@kgc-test.hu', 'TestAdmin123!');
  api.setToken(token);
});
```

## Párhuzamos Futtatás

A tesztek alapból párhuzamosan futnak worker-enként izolálva.

### Worker Izoláció

- Minden worker egyedi `testTenantId`-t kap
- Factory-k automatikusan használják a tenant kontextust
- Nincs cross-contamination a tesztek között

```typescript
test('izolált teszt', async ({ testTenantId }) => {
  // testTenantId = "test-tenant-{workerIndex}-{testHash}"
  console.log('Running in tenant:', testTenantId);
});
```

### Sharding (CI-hoz)

```bash
# 4 shard, elsőt futtatja
pnpm test:e2e --shard=1/4

# GitHub Actions-ben
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - run: pnpm test:e2e --shard=${{ matrix.shard }}/4
```

## Tagging Konvenció

```typescript
// Prioritás
test('@P0 kritikus teszt', ...);
test('@P1 fontos teszt', ...);
test('@P2 standard teszt', ...);

// Domain
test('@Berles bérlés flow', ...);
test('@Szerviz munkalap', ...);
test('@Aruhaz POS eladás', ...);

// Kockázat
test('@SEC biztonsági teszt', ...);
test('@DATA adat integritás', ...);

// Futtatás tag alapján
pnpm test:e2e --grep @P0
pnpm test:e2e --grep @Berles
pnpm test:e2e --grep "@P0|@SEC"
```

## Best Practices

### 1. Használj Network-First Pattern-t

```typescript
// JÓ: Intercept ELŐTT navigálj
const responsePromise = page.waitForResponse('**/api/partners');
await page.goto('/partners');
await responsePromise;

// ROSSZ: Race condition
await page.goto('/partners');
await page.waitForResponse('**/api/partners'); // Lehet, hogy lekéste
```

### 2. Kerüld a Hard Wait-et

```typescript
// JÓ: Várd meg az elemet
await expect(page.getByText('Sikeres')).toBeVisible();

// ROSSZ: Fix várakozás
await page.waitForTimeout(3000); // SOHA!
```

### 3. Használj data-testid Selector-t

```typescript
// JÓ: Stabil selector
await page.getByTestId('submit-button').click();

// ROSSZ: Törékeny selector
await page.locator('.btn.btn-primary.submit').click();
```

### 4. Explicit Assertion-ök

```typescript
// JÓ: Látható assertion
expect(response.status).toBe(200);
expect(partner.nev).toBe('Test Kft.');

// ROSSZ: Rejtett helper-ben
await validatePartner(partner); // Mit ellenőriz?
```

## Troubleshooting

### Teszt flaky?

1. Ellenőrizd a network intercept-et (előbb setup-old)
2. Használj explicit wait-et element-re
3. Ellenőrizd a tenant izolációt

### Timeout?

```typescript
// Növeld a timeout-ot adott tesztre
test('lassú teszt', async ({ page }) => {
  test.setTimeout(60000); // 60s
});
```

### Auth hiba?

```bash
# Töröld a storage state-et és futtasd újra
rm -rf e2e/.auth/
pnpm test:e2e
```

## Report Megtekintése

```bash
# HTML report megnyitása
pnpm test:e2e:report

# Trace viewer (sikertelen tesztnél)
npx playwright show-trace test-results/.../trace.zip
```

---

**Generated by:** BMad TEA Agent
**Framework:** Playwright ^1.48.0
**Node.js:** >=20.0.0
