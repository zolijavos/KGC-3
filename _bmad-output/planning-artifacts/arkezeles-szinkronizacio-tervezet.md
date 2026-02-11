# Árkezelés és Szinkronizáció - Tervezet

**Készült:** 2026-02-08
**Státusz:** Tervezési fázis
**Prioritás:** Megbeszélendő

---

## Probléma Leírás

> "Így, hogy főleg a nagy cégekhez nincs API kapcsolat, felmerült bennem, hogy fogjuk frissíteni az árakat? A nálunk készleten nem lévő termékek áraira is kell egy kalkuláló, ami kikerül a webshopba, de a raktári készlet árai összhangba kell legyenek a webshopban lévőkkel."

### Konkrét Kihívások

1. **API hiány** - Nagy cégeknek általában nincs API kapcsolat
2. **Nem raktári termékek** - Ezek árai is kellenek a webshopba (kalkuláló)
3. **Ár szinkron** - Raktári készlet árak ↔ Webshop árak konzisztenciája
4. **Bevételezési validáció** - Ha API-n kapunk árat (pl. Kemper), bevételezéskor stimmelnie kell
5. **Beszállítói korlátozások** - Pl. Stiga termékek csak listaáron adhatók

---

## Megoldási Lehetőségek

### 1. Beszállítói Árlisták Import

Ahol nincs API (a legtöbb nagy cég):

| Módszer              | Leírás                                             | Gyakoriság  |
| -------------------- | -------------------------------------------------- | ----------- |
| **Excel/CSV import** | Heti/havi feltöltés a beszállítói árlistából       | Heti        |
| **PDF parser**       | OCR + strukturált kinyerés, ha csak PDF-ben küldik | Eseti       |
| **Email parser**     | Automatikus feldolgozás ha emailben küldik         | Automatikus |

### 2. Árazási Szabálymotor

```
Beszállító → Szabály → Eladási ár

┌────────────┬─────────────────────────────────────┐
│ Beszállító │ Szabály                             │
├────────────┼─────────────────────────────────────┤
│ Stiga      │ LISTA_ÁR (0% árrés engedélyezett)   │
│ Kemper     │ API_ÁR + 15% árrés                  │
│ Makita     │ IMPORT_ÁR + 20% árrés               │
│ Ismeretlen │ BESZERZÉSI_ÁR + 25% alapértelmezett │
└────────────┴─────────────────────────────────────┘
```

**Beszállítói szabályok konfigurálhatók:**

- Minimum árrés %
- Maximum árrés %
- Listaár kötelező (igen/nem)
- Kerekítési szabály (10 Ft, 100 Ft, stb.)

### 3. Ár Hierarchia

```
1. API ár (ha van)           → elsődleges forrás
2. Beszállítói import ár     → másodlagos
3. Manuális ár               → fallback
4. Webshop ár szinkron       → automatikus
```

### 4. Bevételezési Validáció

```
Ha: API_ÁR ≠ BEVÉTELEZÉSI_ÁR → Figyelmeztetés

"Kemper API ár: 45.000 Ft, Bevételezési ár: 48.000 Ft - Elfogadod?"

Opciók:
  [ ] Elfogadom az új árat (API ár frissítése)
  [ ] Megtartom a régi árat (eltérés naplózása)
  [ ] Manuális ár megadása
```

### 5. Webshop Integráció

| Irány             | Leírás                                   |
| ----------------- | ---------------------------------------- |
| **KGC → Webshop** | Ár módosításkor automatikus push         |
| **Nem készleten** | Kalkulált ár (beszállítói lista + árrés) |
| **Készleten**     | Valós beszerzési ár + árrés              |

---

## Javasolt Architektúra

```
┌─────────────────────┐     ┌──────────────────────────────┐
│ Beszállítói API     │────►│                              │
│ (Kemper, stb.)      │     │                              │
└─────────────────────┘     │                              │
                            │       ÁR MOTOR               │
┌─────────────────────┐     │                              │
│ Excel/CSV/PDF       │────►│  - Beszállítói szabályok     │────► Webshop
│ Import              │     │  - Árrés kalkuláció          │
└─────────────────────┘     │  - Validáció                 │────► Készlet
                            │  - Audit log                 │
┌─────────────────────┐     │  - Ár történet               │────► Riportok
│ Manuális bevitel    │────►│                              │
└─────────────────────┘     └──────────────────────────────┘
```

---

## Adatmodell Javaslat

### Beszállítói Árazási Szabály

```typescript
interface SupplierPricingRule {
  supplierId: string;
  supplierName: string;

  // Ár forrás
  priceSource: 'API' | 'IMPORT' | 'MANUAL';
  apiEndpoint?: string;

  // Árazási szabályok
  minMarginPercent: number; // Minimum árrés %
  maxMarginPercent: number; // Maximum árrés %
  defaultMarginPercent: number; // Alapértelmezett árrés %

  // Korlátozások
  listPriceOnly: boolean; // Csak listaáron adható (pl. Stiga)
  roundingRule: 'NONE' | '10' | '100' | '1000';

  // Import beállítások
  importFormat?: 'EXCEL' | 'CSV' | 'PDF';
  importSchedule?: string; // Cron expression

  // Audit
  lastUpdated: Date;
  updatedBy: string;
}
```

### Termék Ár Történet

```typescript
interface ProductPriceHistory {
  productId: string;
  timestamp: Date;

  // Árak
  purchasePrice: number; // Beszerzési ár
  listPrice: number; // Listaár
  sellingPrice: number; // Eladási ár
  webshopPrice: number; // Webshop ár

  // Forrás
  source: 'API' | 'IMPORT' | 'MANUAL' | 'RECEIPT';
  sourceReference?: string; // Import fájl, API hívás ID, stb.

  // Változás oka
  changeReason?: string;
  changedBy: string;
}
```

---

## Felhasználói Folyamatok

### 1. Beszállítói Árlista Import

```
1. Felhasználó feltölti az Excel/CSV fájlt
2. Rendszer parse-olja és validálja
3. Eltérések megjelenítése:
   - Új termékek
   - Ár változások (+ és -)
   - Megszűnt termékek
4. Felhasználó jóváhagyja/módosítja
5. Árak frissítése + webshop szinkron
6. Audit log bejegyzés
```

### 2. Bevételezés Ár Validációval

```
1. Bevételezési bizonylat rögzítése
2. Rendszer ellenőrzi az árakat:
   - API ár (ha elérhető)
   - Utolsó beszerzési ár
   - Listaár
3. Eltérés esetén figyelmeztetés
4. Felhasználó dönt (elfogad/módosít)
5. Készlet és ár frissítése
```

### 3. Webshop Ár Szinkron

```
1. KGC-ben ár módosul
2. Automatikus webhook a webshop felé
3. Webshop visszaigazol
4. Ha hiba → retry + értesítés
5. Napi reconciliation riport
```

---

## Következő Lépések

1. **Beszállítók felmérése** - Kik adnak API-t, árlistát, stb.
2. **Szabályok definiálása** - Beszállítónkénti árazási szabályok
3. **Webshop API** - Milyen webshop van, van-e API
4. **Prioritás egyeztetés** - Mikor kerüljön sorra

---

## Kérdések Tisztázásra

- [ ] Milyen webshop van használatban? (WooCommerce, Shopify, egyedi?)
- [ ] Van-e a webshopnak API-ja ár frissítéshez?
- [ ] Hány beszállító van összesen?
- [ ] Melyik beszállítóknál van API lehetőség?
- [ ] Milyen gyakran változnak az árak általában?
- [ ] Ki jogosult árakat módosítani?

---

**Megjegyzés:** Ez a dokumentum a 2026-02-08-i beszélgetés alapján készült, további egyeztetés szükséges a végleges tervezéshez.
