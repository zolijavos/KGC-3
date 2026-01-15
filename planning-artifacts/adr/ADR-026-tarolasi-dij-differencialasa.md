# ADR-026: Tárolási Díj Differenciálása Gép Méret Alapján

**Státusz:** Accepted
**Dátum:** 2026-01-04
**Döntéshozók:** Architect, PM, Ügyfél (Javo!)
**Kapcsolódó:** Feature-Szerviz-Tarolasi-Dij-Architektura.md

---

## Kontextus

A KGC ERP szerviz moduljában bevezetésre kerül a tárolási díj funkció (Feature FIT-GAP-009). Az eredeti specifikáció egységes napi díjat (500 Ft/nap) határozott meg minden gépre. Az ügyfél visszajelzése alapján ez nem tükrözi a valóságot: egy kis fűnyíró és egy traktor tárolása jelentősen eltérő helyfoglalást és költséget jelent.

### Üzleti Probléma

1. **Egységes díj igazságtalan**: Egy kis gép (pl. sövénynyíró) ugyanannyit fizetne, mint egy nagy gép (pl. traktor)
2. **Helyfoglalás eltérése**: Nagy gépek 5-10x több helyet foglalnak
3. **Bevizsgálási díj mint proxy**: A gép "mérete" jól korrelál a bevizsgálási díjjal - drágább gép = nagyobb/komplexebb

### Jelenlegi Specifikáció (Feature dokumentum)

```
Ingyenes tárolás: 30 nap
Tárolási díj: 500 Ft/nap (egységes)
Megsemmisítési határidő: 90 nap
```

---

## Döntési Kérdés

**Hogyan differenciáljuk a tárolási díjat úgy, hogy az tükrözze a gép méretét/értékét, miközben egyszerűen adminisztrálható marad?**

---

## Döntési Tényezők

1. **Méltányosság**: Kis gép = kisebb díj, nagy gép = nagyobb díj
2. **Egyszerűség**: Ne legyen túl komplex a kategorizálás
3. **Automatizálhatóság**: A rendszer automatikusan határozza meg a díjkategóriát
4. **Transzparencia**: Az ügyfél előre tudja, mekkora díjra számíthat
5. **Karbantarthatóság**: Adminisztrátorok tudjanak módosítani a határértékeken

---

## Vizsgált Opciók

### Opció A: Gép Kategória Alapú (Manuális)

**Leírás:** Minden gép típushoz manuálisan hozzárendelt díjkategória (kis/közepes/nagy).

**Előnyök:**
- Pontos kategorizálás lehetséges

**Hátrányok:**
- Manuális karbantartás szükséges minden gép típushoz
- Új gépek bevitelekor döntés szükséges
- Hibalehetőség (rossz kategória beállítás)

---

### Opció B: Bevizsgálási Díj Alapú Küszöbérték (Javasolt)

**Leírás:** A tárolási díj kategóriát a bevizsgálási díj határozza meg automatikusan.

```
Bevizsgálási díj < 5.000 Ft  → Kis gép  → 100 Ft/nap tárolás
Bevizsgálási díj >= 5.000 Ft → Nagy gép → 500 Ft/nap tárolás
```

**Előnyök:**
- Automatikus kategorizálás - nincs manuális munka
- Jó proxy a gép méretére/értékére
- Egyszerű implementáció
- Könnyen érthető az ügyfelek számára

**Hátrányok:**
- Nem tökéletesen pontos (kivételek lehetnek)
- Bevizsgálási díj változásakor a kategória is változhat

---

### Opció C: Fizikai Méret Alapú (m³)

**Leírás:** A gép fizikai méretei alapján számított díj.

**Előnyök:**
- Legpontosabb helyfoglalás alapú számítás

**Hátrányok:**
- Minden géphez méretek szükségesek
- Adminisztrációs teher
- Nehéz automatizálni

---

## Döntés

**Választott opció: Opció B - Bevizsgálási Díj Alapú Küszöbérték**

### Elfogadott Paraméterek

| Paraméter | Érték | Megjegyzés |
|-----------|-------|------------|
| **Ingyenes tárolási idő** | 30 nap | Javítás befejezésétől |
| **Kis gép küszöbérték** | bevizsgálási díj < 5.000 Ft | pl. sövénynyíró, fűkasza |
| **Kis gép tárolási díj** | 100 Ft/nap | |
| **Nagy gép küszöbérték** | bevizsgálási díj >= 5.000 Ft | pl. traktor, nagy fűnyíró |
| **Nagy gép tárolási díj** | 500 Ft/nap | |
| **Értesítések száma** | 2 db | 7 nap + 1 nap a megsemmisítés előtt |
| **Megsemmisítési határidő** | 90 nap + 15 nap figyelmeztetés | |

### Indoklás

1. **Automatizálás**: A bevizsgálási díj már rögzített adat a munkalaphoz - nincs extra adminisztráció
2. **Egyszerűség**: Két kategória (kis/nagy) könnyen érthető
3. **Korrelált proxy**: A bevizsgálási díj jól tükrözi a gép komplexitását és értékét
4. **Konfigurálhatóság**: A küszöbérték (5.000 Ft) és a díjak később módosíthatók

---

## Implementációs Terv

### 1. Adatmodell Módosítások

A `storage_config` tábla bővítése a Feature dokumentumhoz képest:

```sql
-- storage_config tábla módosítás
ALTER TABLE kgc.storage_config
  -- Meglévő mezők maradnak, DE a storage_daily_fee nem használatos többé
  DROP COLUMN IF EXISTS storage_daily_fee,

  -- ÚJ: Differenciált díjak
  ADD COLUMN storage_fee_threshold DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
    -- Bevizsgálási díj küszöb a kis/nagy kategóriához

  ADD COLUMN storage_fee_small DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    -- Kis gép napi tárolási díja (Ft)

  ADD COLUMN storage_fee_large DECIMAL(10,2) NOT NULL DEFAULT 500.00;
    -- Nagy gép napi tárolási díja (Ft)

-- Alapértelmezett globális konfiguráció frissítése
UPDATE kgc.storage_config
SET
  storage_fee_threshold = 5000.00,
  storage_fee_small = 100.00,
  storage_fee_large = 500.00
WHERE location_id IS NULL;
```

### 2. Tárolási Díj Kategória Meghatározás

```typescript
enum StorageFeeCategory {
  SMALL = 'small',  // Kis gép
  LARGE = 'large'   // Nagy gép
}

interface StorageConfig {
  storageFreedays: number;           // 30
  storageFeeThreshold: number;       // 5000 Ft
  storageFeeSmall: number;           // 100 Ft/nap
  storageFeeLarge: number;           // 500 Ft/nap
  destructionDeadlineDays: number;   // 90
  destructionWarningDays: number;    // 15
}

function getStorageFeeCategory(
  inspectionFee: number,
  config: StorageConfig
): StorageFeeCategory {
  return inspectionFee < config.storageFeeThreshold
    ? StorageFeeCategory.SMALL
    : StorageFeeCategory.LARGE;
}

function getDailyStorageFee(
  inspectionFee: number,
  config: StorageConfig
): number {
  const category = getStorageFeeCategory(inspectionFee, config);
  return category === StorageFeeCategory.SMALL
    ? config.storageFeeSmall
    : config.storageFeeLarge;
}
```

### 3. Módosított Tárolási Díj Algoritmus

```typescript
function calculateStorageFee(serviceJob: ServiceJob): StorageFeeResult {
  const config = getStorageConfig(serviceJob.locationId);
  const today = new Date();
  const completedAt = serviceJob.completedAt;

  if (!completedAt) {
    return { fee: 0, status: 'ACTIVE_REPAIR', message: 'Javítás folyamatban' };
  }

  // Kategória meghatározás bevizsgálási díj alapján
  const inspectionFee = serviceJob.inspectionFee || 0;
  const category = getStorageFeeCategory(inspectionFee, config);
  const dailyFee = getDailyStorageFee(inspectionFee, config);

  const daysSinceCompleted = differenceInDays(today, completedAt);

  // Ingyenes periódus (30 nap)
  if (daysSinceCompleted <= config.storageFreedays) {
    const remainingFreeDays = config.storageFreedays - daysSinceCompleted;
    return {
      fee: 0,
      dailyFee,
      category,
      status: 'FREE_STORAGE',
      remainingFreeDays,
      message: `Ingyenes tárolás: ${remainingFreeDays} nap hátra`
    };
  }

  // Fizetős tárolás - differenciált díjjal
  const paidDays = daysSinceCompleted - config.storageFreedays;
  const fee = paidDays * dailyFee;

  // Megsemmisítési figyelmeztetés (90 nap után)
  if (daysSinceCompleted >= config.destructionDeadlineDays) {
    const destructionDate = addDays(
      completedAt,
      config.destructionDeadlineDays + config.destructionWarningDays
    );
    return {
      fee,
      dailyFee,
      category,
      status: 'DESTRUCTION_PENDING',
      destructionDate,
      paidDays,
      message: `Megsemmisítés tervezett időpontja: ${formatDate(destructionDate)}`
    };
  }

  return {
    fee,
    dailyFee,
    category,
    status: 'PAID_STORAGE',
    paidDays,
    message: `Tárolási díj: ${formatCurrency(fee)} (${paidDays} nap × ${formatCurrency(dailyFee)})`
  };
}
```

### 4. Értesítési Ütemezés (Módosított - 2 db)

Az eredeti 3 lépcsős helyett 2 értesítés:

```
[Javítás lezárása: completed_at = NOW()]
  ↓
  pickup_deadline = completed_at + 30 nap
  ↓
[90 nap eltelt - megsemmisítés előtti értesítések]
  ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️ ÉRTESÍTÉS #1 - 7 nappal a megsemmisítés előtt (98. nap):               │
│     Tárgy: "Figyelem! 7 nap múlva a gép megsemmisül"                       │
│     Tartalom:                                                               │
│       • Munkalap #: XXXXX                                                   │
│       • Gép: {make} {model}                                                 │
│       • Kategória: {kis/nagy} gép                                          │
│       • Felhalmozott tárolási díj: {total_fee} Ft                          │
│       • Megsemmisítés időpontja: {destruction_date}                         │
│       • Kérjük, sürgősen vegye fel a kapcsolatot!                           │
└─────────────────────────────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  🚨 ÉRTESÍTÉS #2 - 1 nappal a megsemmisítés előtt (104. nap):              │
│     Tárgy: "UTOLSÓ FIGYELMEZTETÉS: Holnap a gép megsemmisül!"              │
│     Tartalom:                                                               │
│       • Munkalap #: XXXXX                                                   │
│       • HOLNAP megsemmisül a gép!                                           │
│       • Felhalmozott tárolási díj: {total_fee} Ft                          │
│       • Ez az utolsó lehetőség az átvételre                                 │
└─────────────────────────────────────────────────────────────────────────────┘
  ↓
[105. nap - Megsemmisítés]
```

### 5. Megsemmisítési Döntés (Esetfüggő)

A megsemmisítési döntés a gép értékétől függ:

```typescript
interface DestructionGuideline {
  category: StorageFeeCategory;
  inspectionFee: number;
  suggestedDecision: 'SOLD' | 'PARTS' | 'WASTE';
  reasoning: string;
}

function getDestructionGuideline(serviceJob: ServiceJob): DestructionGuideline {
  const inspectionFee = serviceJob.inspectionFee || 0;
  const category = getStorageFeeCategory(inspectionFee, getStorageConfig());

  if (category === StorageFeeCategory.LARGE) {
    // Drága/nagy gépek - értékesítés javasolt
    return {
      category,
      inspectionFee,
      suggestedDecision: 'SOLD',
      reasoning: 'Értékes gép - eladás vagy alkatrészként hasznosítás javasolt'
    };
  } else {
    // Kis gépek - hulladék kezelés
    return {
      category,
      inspectionFee,
      suggestedDecision: 'WASTE',
      reasoning: 'Alacsony értékű gép - hulladékként kezelés javasolt'
    };
  }
}
```

**Megjegyzés:** A javaslat csak iránymutatás - a végső döntést a Manager/Admin hozza meg az adott gép állapota alapján.

### 6. UI Megjelenítés (Munkalap)

A munkalap UI-on látható kell legyen a tárolási információ:

```tsx
<ServiceJobDetails job={serviceJob}>
  {/* Tárolási információ szekció */}
  {serviceJob.status === 'SZÁMLÁZHATÓ' && (
    <Card title="Tárolási Információ" variant={getVariant(storageStatus)}>

      {/* Kategória megjelenítés */}
      <InfoRow label="Gép kategória">
        <Badge variant={category === 'large' ? 'warning' : 'default'}>
          {category === 'large' ? '🚜 Nagy gép' : '🔧 Kis gép'}
        </Badge>
        <Text muted>
          (bevizsgálási díj: {formatCurrency(inspectionFee)})
        </Text>
      </InfoRow>

      {/* Napi díj megjelenítés */}
      <InfoRow label="Tárolási díj">
        <Amount>{formatCurrency(dailyFee)}/nap</Amount>
      </InfoRow>

      {/* Státusz és számítás */}
      <InfoRow label="Aktuális tárolási díj">
        {storageFee > 0 ? (
          <>
            <Amount bold>{formatCurrency(storageFee)}</Amount>
            <Text muted>({paidDays} nap × {formatCurrency(dailyFee)})</Text>
          </>
        ) : (
          <Badge variant="success">
            Ingyenes ({remainingFreeDays} nap hátra)
          </Badge>
        )}
      </InfoRow>

      {/* Határidők */}
      <InfoRow label="Ingyenes tárolás határideje">
        {formatDate(pickupDeadline)}
      </InfoRow>

      {isDestructionPending && (
        <Alert variant="danger">
          ⚠️ Megsemmisítés: {formatDate(destructionScheduledAt)}
        </Alert>
      )}
    </Card>
  )}
</ServiceJobDetails>
```

---

## Következmények

### Pozitív

- **Méltányos díjazás**: Kis gépekért kevesebbet fizetnek az ügyfelek
- **Automatikus kategorizálás**: Nincs manuális adminisztráció
- **Transzparens**: Az ügyfél a bevizsgálási díjból következtethet a tárolási díjra
- **Konfigurálható**: A küszöbérték és díjak módosíthatók
- **Egyszerű implementáció**: Minimális változtatás a Feature dokumentumhoz képest

### Negatív

- **Nem tökéletes proxy**: Előfordulhat, hogy egy drága, de kis gép "nagy" kategóriába kerül
- **Bevizsgálási díj függőség**: Ha a bevizsgálási díj változik, a kategória is változhat

### Kockázatok

| Kockázat | Valószínűség | Hatás | Mitigáció |
|----------|--------------|-------|-----------|
| Rossz kategorizálás | Alacsony | Alacsony | Manager felülbírálási lehetőség |
| Bevizsgálási díj hiánya | Közepes | Közepes | Alapértelmezett "kis gép" kategória |
| Díjak módosítási igénye | Közepes | Alacsony | Konfigurálható paraméterek |

---

## Kapcsolódó Döntések

- **Feature-Szerviz-Tarolasi-Dij-Architektura.md**: Alap feature specifikáció - ez az ADR pontosítja a díjazást
- **ADR-006**: Bérlés Audit Trail - hasonló időalapú díjszámítási minta
- **ADR-001**: Multi-tenancy - tenant-specifikus konfiguráció lehetősége

---

## Függőben Lévő Kérdések

1. **Manuális kategória felülbírálás**: Legyen-e lehetőség a Manager-nek manuálisan átsorolni egy gépet?
2. **Kategória rögzítése**: A kategória a munkalap létrehozásakor vagy a javítás befejezésekor rögzüljön?
3. **Historikus változások**: Ha a küszöbérték változik, a meglévő munkalapok kategóriája változzon-e?

**Javaslat:** A kategória a javítás befejezésekor (completed_at beállításakor) rögzüljön, és utána ne változzon - így konzisztens marad a díjszámítás.

---

## Változásnapló

| Verzió | Dátum | Változás |
|--------|-------|----------|
| 1.0 | 2026-01-04 | Első verzió - Accepted státusz, ügyfél döntései alapján |

---

**Dokumentum Vége**

_Készítette: Architect Agent_
_Boring technology. Reliable solutions._
