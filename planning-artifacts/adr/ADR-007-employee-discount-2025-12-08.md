# ADR-007: Employee Discount Management

**Státusz:** Accepted
**Dátum:** 2025-12-08
**Döntéshozók:** Architect, PM, HR
**Kapcsolódó:** ADR-001 (Multi-tenancy)

---

## Kontextus

A KGC ERP v3 rendszerben bevezetésre kerül a **dolgozói kedvezmény** rendszer. Az ügyfél megjegyzése:

> *"A bérléshez és a vásárláshoz kellene rögzíteni egy dolgozói kedvezmény lehetőséget. A bérgépekért pl. nem kell fizetniük."*

A dolgozók számára különböző kedvezményeket kell biztosítani bérlés és vásárlás esetén, beleértve az ingyenes bérgép használatot.

---

## Döntési Kérdés

**Hogyan kezeljük a dolgozói kedvezményeket a rendszerben, és hogyan előzzük meg a visszaéléseket?**

---

## Döntési Tényezők

1. **Automatizálás** - A kedvezmény automatikusan alkalmazódjon, ne kelljen manuálisan beírni
2. **Rugalmasság** - Különböző kedvezmény típusok (%, fix összeg, ingyenes)
3. **Visszaélés megelőzés** - Audit trail és opcionális limitek
4. **Multi-tenant** - Franchise partnerenként eltérő szabályok
5. **Átláthatóság** - Vezetőség lássa a kedvezmények kihasználtságát

---

## Vizsgált Opciók

### Opció A: Manuális Kedvezmény Kód

**Leírás:** Minden tranzakciókor külön kedvezmény kódot kell megadni.

**Előnyök:**
- ✅ Egyszerű implementáció
- ✅ Tudatos döntés minden alkalommal

**Hátrányok:**
- ❌ Lassítja a folyamatot
- ❌ Kód kiszivárghat külsősökhöz
- ❌ Elfelejthető

---

### Opció B: Szerepkör Alapú Automatika (Javasolt)

**Leírás:** A bejelentkezett felhasználó szerepköre alapján automatikus kedvezmény.

```
EMPLOYEE szerepkör + Bérlés → 100% kedvezmény (ingyenes)
EMPLOYEE szerepkör + Vásárlás → X% kedvezmény
```

**Előnyök:**
- ✅ Automatikus, nem kell emlékezni
- ✅ Szerepkörhöz kötött, nem kiszivároghat
- ✅ Audit log minden igénybevételről

**Hátrányok:**
- ❌ Kiosk módban ki kell jelentkezni/belépni
- ❌ Limit kezelés komplexebb

---

### Opció C: Dolgozói Kártya (Vonalkód)

**Leírás:** Külön dolgozói kártyát kell beolvasni a kedvezményhez.

**Előnyök:**
- ✅ Fizikai azonosítás
- ✅ Kiosk módban is működik

**Hátrányok:**
- ❌ Kártya elvesztés/lopás kockázat
- ❌ Plusz hardver (kártyanyomtató)
- ❌ Kártya átadható másnak

---

## Döntés

**Választott opció: Opció B - Szerepkör Alapú Automatika**

### Indoklás

1. **Egyszerűség:** Nincs szükség külön kódra vagy kártyára
2. **Biztonság:** RBAC rendszerhez kötött, nem adható át
3. **Audit:** Minden igénybevétel automatikusan naplózva
4. **Kiosk támogatás:** DEVICE_ELEVATED_SESSION (ADR-008) használatával dolgozó PIN-nel azonosítja magát

---

## Implementációs Terv

### 1. Adatbázis Séma

```sql
-- Kedvezmény szabályok definíciója
CREATE TABLE KEDVEZMÉNY_SZABÁLY (
  kedvezmeny_id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id UUID NOT NULL,

  -- Azonosítás
  nev VARCHAR(100) NOT NULL,              -- "Dolgozói bérlés - Ingyenes"
  kod VARCHAR(20) UNIQUE,                 -- "EMP_BERLES_FREE"

  -- Típus és alkalmazási kör
  tipus ENUM('berles', 'ertekesites', 'mindketto') DEFAULT 'mindketto',

  -- Kedvezmény mértéke
  kedvezmeny_tipus ENUM('szazalek', 'fix_osszeg', 'ingyenes') DEFAULT 'szazalek',
  kedvezmeny_ertek DECIMAL(10,2) DEFAULT 0,  -- % vagy Ft

  -- Jogosultság
  jogosult_szerepkorok JSON,              -- ["EMPLOYEE", "MANAGER"]

  -- Limitek (opcionális)
  limit_tipus ENUM('nincs', 'havonta', 'evente') DEFAULT 'nincs',
  limit_ertek INT DEFAULT 0,              -- Max db vagy Ft

  -- Érvényesség
  ervenyesseg_kezdete DATE NOT NULL,
  ervenyesseg_vege DATE NULL,             -- NULL = határozatlan
  aktiv BOOLEAN DEFAULT TRUE,

  -- Audit
  letrehozta_user_id INT,
  letrehozva DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_kedvezmeny_tenant (tenant_id),
  INDEX idx_kedvezmeny_tipus (tipus),
  INDEX idx_kedvezmeny_aktiv (aktiv)
);

-- Kedvezmény igénybevételek naplója
CREATE TABLE KEDVEZMÉNY_IGÉNYBEVÉTEL (
  igenybevel_id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id UUID NOT NULL,

  -- Kapcsolatok
  kedvezmeny_id INT NOT NULL,
  user_id INT NOT NULL,                   -- Ki vette igénybe

  -- Tranzakció típus
  tranzakcio_tipus ENUM('berles', 'ertekesites') NOT NULL,
  berles_id INT NULL,                     -- Ha bérlés
  szamla_id INT NULL,                     -- Ha értékesítés

  -- Összegek
  eredeti_osszeg DECIMAL(10,2) NOT NULL,  -- Kedvezmény nélküli ár
  kedvezmeny_osszeg DECIMAL(10,2) NOT NULL, -- Megtakarítás
  fizetett_osszeg DECIMAL(10,2) NOT NULL, -- Ténylegesen fizetett

  -- Időbélyeg
  igenybevel_datum DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Kapcsolatok
  FOREIGN KEY (kedvezmeny_id) REFERENCES KEDVEZMÉNY_SZABÁLY(kedvezmeny_id),
  FOREIGN KEY (user_id) REFERENCES FELHASZNÁLÓ(felhasznalo_id),
  FOREIGN KEY (berles_id) REFERENCES BÉRLÉS(berles_id),

  INDEX idx_igenybevel_user (user_id),
  INDEX idx_igenybevel_kedvezmeny (kedvezmeny_id),
  INDEX idx_igenybevel_datum (igenybevel_datum),
  INDEX idx_igenybevel_tenant_datum (tenant_id, igenybevel_datum)
);
```

### 2. Alapértelmezett Kedvezmény Szabályok

```sql
-- Dolgozói bérlés: 100% ingyenes
INSERT INTO KEDVEZMÉNY_SZABÁLY (
  tenant_id, nev, kod, tipus,
  kedvezmeny_tipus, kedvezmeny_ertek,
  jogosult_szerepkorok, limit_tipus,
  ervenyesseg_kezdete, aktiv
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Dolgozói bérlés - Ingyenes',
  'EMP_BERLES_FREE',
  'berles',
  'ingyenes',
  100,
  '["EMPLOYEE", "MANAGER", "ADMIN"]',
  'nincs',  -- Nincs limit
  '2025-01-01',
  TRUE
);

-- Dolgozói vásárlás: 20% kedvezmény
INSERT INTO KEDVEZMÉNY_SZABÁLY (
  tenant_id, nev, kod, tipus,
  kedvezmeny_tipus, kedvezmeny_ertek,
  jogosult_szerepkorok, limit_tipus, limit_ertek,
  ervenyesseg_kezdete, aktiv
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Dolgozói vásárlás - 20%',
  'EMP_VASARLAS_20',
  'ertekesites',
  'szazalek',
  20,
  '["EMPLOYEE", "MANAGER", "ADMIN"]',
  'havonta',
  50000,  -- Max 50.000 Ft kedvezmény/hó
  '2025-01-01',
  TRUE
);
```

### 3. Kedvezmény Ellenőrzés Logika

```typescript
interface KedvezmenyEredmeny {
  alkalmazhato: boolean;
  kedvezmeny_id: number | null;
  kedvezmeny_osszeg: number;
  fizetendo_osszeg: number;
  uzenet: string;
}

async function ellenorizKedvezmenyt(
  user_id: number,
  tenant_id: string,
  tranzakcio_tipus: 'berles' | 'ertekesites',
  eredeti_osszeg: number
): Promise<KedvezmenyEredmeny> {

  // 1. Felhasználó szerepkörének lekérdezése
  const user = await getUser(user_id);
  const szerepkor = user.szerepkor;

  // 2. Alkalmazható kedvezmény keresése
  const kedvezmeny = await db.query(`
    SELECT * FROM KEDVEZMÉNY_SZABÁLY
    WHERE tenant_id = ?
      AND tipus IN (?, 'mindketto')
      AND JSON_CONTAINS(jogosult_szerepkorok, ?)
      AND aktiv = TRUE
      AND ervenyesseg_kezdete <= CURDATE()
      AND (ervenyesseg_vege IS NULL OR ervenyesseg_vege >= CURDATE())
    ORDER BY kedvezmeny_ertek DESC
    LIMIT 1
  `, [tenant_id, tranzakcio_tipus, `"${szerepkor}"`]);

  if (!kedvezmeny) {
    return {
      alkalmazhato: false,
      kedvezmeny_id: null,
      kedvezmeny_osszeg: 0,
      fizetendo_osszeg: eredeti_osszeg,
      uzenet: 'Nincs alkalmazható kedvezmény'
    };
  }

  // 3. Limit ellenőrzés (ha van)
  if (kedvezmeny.limit_tipus !== 'nincs') {
    const hasznalt = await getHasznaltKedvezmeny(
      user_id,
      kedvezmeny.kedvezmeny_id,
      kedvezmeny.limit_tipus
    );

    if (hasznalt >= kedvezmeny.limit_ertek) {
      return {
        alkalmazhato: false,
        kedvezmeny_id: kedvezmeny.kedvezmeny_id,
        kedvezmeny_osszeg: 0,
        fizetendo_osszeg: eredeti_osszeg,
        uzenet: `Kedvezmény limit elérve (${kedvezmeny.limit_ertek} Ft/${kedvezmeny.limit_tipus})`
      };
    }
  }

  // 4. Kedvezmény számítás
  let kedvezmeny_osszeg = 0;

  switch (kedvezmeny.kedvezmeny_tipus) {
    case 'ingyenes':
      kedvezmeny_osszeg = eredeti_osszeg;
      break;
    case 'szazalek':
      kedvezmeny_osszeg = eredeti_osszeg * (kedvezmeny.kedvezmeny_ertek / 100);
      break;
    case 'fix_osszeg':
      kedvezmeny_osszeg = Math.min(kedvezmeny.kedvezmeny_ertek, eredeti_osszeg);
      break;
  }

  // 5. Limit korlátozás alkalmazása
  if (kedvezmeny.limit_tipus !== 'nincs') {
    const hasznalt = await getHasznaltKedvezmeny(user_id, kedvezmeny.kedvezmeny_id, kedvezmeny.limit_tipus);
    const maradeek = kedvezmeny.limit_ertek - hasznalt;
    kedvezmeny_osszeg = Math.min(kedvezmeny_osszeg, maradeek);
  }

  return {
    alkalmazhato: true,
    kedvezmeny_id: kedvezmeny.kedvezmeny_id,
    kedvezmeny_osszeg: kedvezmeny_osszeg,
    fizetendo_osszeg: eredeti_osszeg - kedvezmeny_osszeg,
    uzenet: `${kedvezmeny.nev} alkalmazva`
  };
}
```

### 4. UI Megjelenítés

```
┌─────────────────────────────────────────────────────────────┐
│  ÚJ BÉRLÉS - Péter (EMPLOYEE)                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Bérgép: Stihl TS400 Betonvágó                              │
│  Időtartam: 1 nap                                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Eredeti ár:        15.000 Ft                               │
│  🏷️ Dolgozói kedvezmény: -15.000 Ft (100%)                  │
│  ─────────────────────────────────────────────────────────  │
│  Fizetendő:              0 Ft                               │
│                                                             │
│  ℹ️ Dolgozói bérlés - Ingyenes kedvezmény alkalmazva        │
│                                                             │
│  [Mégsem]                              [Bérlés indítása]    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5. Riport - Kedvezmény Kihasználtság

```sql
-- Havi kedvezmény összesítő (vezetőségnek)
SELECT
  u.nev AS dolgozó,
  u.szerepkor,
  ks.nev AS kedvezmeny_tipus,
  COUNT(*) AS igenybevetelek_szama,
  SUM(ki.kedvezmeny_osszeg) AS osszes_kedvezmeny_ft,
  DATE_FORMAT(ki.igenybevel_datum, '%Y-%m') AS honap
FROM KEDVEZMÉNY_IGÉNYBEVÉTEL ki
JOIN FELHASZNÁLÓ u ON ki.user_id = u.felhasznalo_id
JOIN KEDVEZMÉNY_SZABÁLY ks ON ki.kedvezmeny_id = ks.kedvezmeny_id
WHERE ki.tenant_id = ?
  AND ki.igenybevel_datum >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY u.felhasznalo_id, ks.kedvezmeny_id, honap
ORDER BY honap DESC, osszes_kedvezmeny_ft DESC;
```

---

## Következmények

### Pozitív
- Automatikus kedvezmény, nincs manuális beavatkozás
- Teljes átláthatóság (audit log)
- Rugalmas szabályrendszer
- Multi-tenant támogatás

### Negatív
- Kiosk módban belépés szükséges a kedvezményhez
- Limit kezelés komplexitása

### Kockázatok

| Kockázat | Valószínűség | Hatás | Mitigáció |
|----------|--------------|-------|-----------|
| Visszaélés (túlzott használat) | Közepes | Közepes | Limit + riportok |
| Kedvezmény nem alkalmazódik | Alacsony | Alacsony | UI visszajelzés |
| Szerepkör téves beállítás | Alacsony | Közepes | Admin felülvizsgálat |

---

## Kiosk Mód Integráció (ADR-008)

Kiosk módban a dolgozó kedvezményhez:

1. Alap kiosk belépés (közös PIN)
2. Bérlés indításkor: "Dolgozói kedvezmény?" kérdés
3. Ha igen → Személyes PIN megadása (elevated session)
4. Rendszer ellenőrzi a szerepkört
5. Kedvezmény automatikusan alkalmazva

---

## Függőben Lévő Kérdések

1. ⏳ **Limit:** Van-e havi/éves limit? (Ügyfél kérdés #3)
2. ⏳ **Vásárlás kedvezmény %:** Mennyi legyen? (20%?)
3. ⏳ **Családtag kedvezmény:** Kell-e külön szabály?

---

## Változásnapló

| Verzió | Dátum | Változás |
|--------|-------|----------|
| 1.0 | 2025-12-08 | Első verzió - Proposed státusz |
| 1.1 | 2025-12-09 | Státusz: Accepted |
