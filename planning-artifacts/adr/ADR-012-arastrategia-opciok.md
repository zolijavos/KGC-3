# ADR-012: Árazási Stratégia Opciók

**Dátum:** 2025-12-11
**Státusz:** Döntés Előtt
**Kontextus:** Fit-Gap Analízis - Automatikus árazás

---

## Probléma

A jelenlegi rendszerben az árazás manuális és inkonzisztens:
- Kollégák eltérő árréseket állítanak be
- Bizonyos márkáknál (pl. Makita) kötelező a listaár
- Más termékeknél 20-60% között változik az árrés
- Bevételezéskor nincs automatikus ár számítás

**Transcript (12-08):**
> "nem lehet egységes haszonkulcsot állítani mindenre, mert például bizonyos márkáknál tartanunk kell az aktuális listaárat, van ami mehet 60%-al, van ami csak a 20-at bírja el"

---

## Opciók Összehasonlítása

### A) Cikkcsoportonkénti Árrés

```
CIKKCSOPORT          ÁRRÉS %
─────────────────────────────
Gép                  30%
Bérgép               0% (nem eladó)
Tartozék             45%
Alkatrész            60%
```

| Előny | Hátrány |
|-------|---------|
| ✅ Egyszerű beállítás (4 érték) | ❌ Nem elég granulált |
| ✅ Könnyű karbantartás | ❌ Makita gép ≠ Noname gép |
| ✅ Gyors bevételezés | ❌ Nem kezeli a márka különbségeket |
| ✅ Kevés hiba lehetőség | ❌ Listaáras termékek nem kezelhetők |

**Mikor jó:**
- Egyszerű, homogén termékkör
- Kevés beszállító
- Nincs listaár kötöttség

**Mikor NEM jó:**
- Makita/Hikoki listaár kötelező
- Nagy ár különbségek márka szerint

---

### B) Cikkenként (egyedi) Árrés

```
CIKK                 ÁRRÉS %    MEGJEGYZÉS
───────────────────────────────────────────
MAK-DDF481           LISTAÁR    Makita kötelező
HIK-WR36DA           LISTAÁR    Hikoki kötelező
NONAME-FURO-01       60%        Szabadon
TARTOZEK-LANC-01     45%        Szabadon
ALK-CSAPAGY-01       80%        Magas margin
```

| Előny | Hátrány |
|-------|---------|
| ✅ Maximális rugalmasság | ❌ **Nagyon sok munka** (1000+ cikk) |
| ✅ Listaár pontosan tartható | ❌ Bevételezés lassú |
| ✅ Bármilyen stratégia | ❌ Hibalehetőség magas |
| ✅ Cikkenként optimalizálható | ❌ Karbantartás nehéz |

**Mikor jó:**
- Kevés termék (<100)
- Minden cikk egyedi árazást igényel

**Mikor NEM jó:**
- Nagy termékkör (1000+ cikk)
- Gyakori új termékek
- Bevételezés sebessége fontos

---

### C) Beszállítónkénti Árrés

```
BESZÁLLÍTÓ           ÁRRÉS %    MEGJEGYZÉS
───────────────────────────────────────────
Makita Hungary       LISTAÁR    Kötelező
Hikoki Hungary       LISTAÁR    Kötelező
Eurohatár            45%        Szabadon
Robbanó Kft.         60%        Alkatrészek
Kinai Import         80%        Magas margin
```

| Előny | Hátrány |
|-------|---------|
| ✅ Márka szintű kontroll | ❌ Egy beszállítótól többféle termék |
| ✅ Listaár kezelhető | ❌ Gép vs alkatrész különbség nincs |
| ✅ Közepes komplexitás | ❌ Nem mindig logikus |
| ✅ Szerződéshez igazítható | |

**Mikor jó:**
- Beszállítói szerződések diktálják az árrést
- Márka = Beszállító (pl. Makita)

**Mikor NEM jó:**
- Egy beszállítótól sok kategória (gép + alkatrész)

---

### D) Értékhatár Alapú Árrés

```
ÉRTÉKHATÁR (BESZERZÉSI)    ÁRRÉS %
─────────────────────────────────
0 - 5.000 Ft               80%
5.001 - 20.000 Ft          60%
20.001 - 50.000 Ft         45%
50.001 - 200.000 Ft        30%
200.000+ Ft                20%
```

| Előny | Hátrány |
|-------|---------|
| ✅ Automatikus logika | ❌ Nem veszi figyelembe a márkát |
| ✅ Nem kell cikkenként beállítani | ❌ Drága Makita = alacsony árrés (rossz) |
| ✅ Piaci logikához illeszkedik | ❌ Olcsó minőségi termék = túl magas ár |
| ✅ Egyszerű szabály | ❌ Listaár nem tartható |

**Mikor jó:**
- Homogén termékkör
- Nincs márka kötöttség
- "Minél drágább, annál kisebb árrés" logika

**Mikor NEM jó:**
- Makita 500.000 Ft-os gép → 20% árrés (de listaár kell!)
- Noname 500.000 Ft-os gép → 20% árrés (de 40% lehetne)

---

### E) 🏆 KOMBINÁLT Megoldás (AJÁNLOTT)

**Hierarchikus árazási szabályrendszer:**

```
PRIORITÁS   SZINT              BEÁLLÍTÁS
────────────────────────────────────────────────────────────
1. (legmagasabb)  CIKK         Ha van egyedi ár → azt használja
2.                BESZÁLLÍTÓ   Ha nincs egyedi → beszállító szabály
3.                CIKKCSOPORT  Ha nincs beszállító → cikkcsoport %
4. (legalacsonyabb) ÉRTÉKHATÁR Ha semmi nincs → értékhatár %
```

**Példa működés:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ BEVÉTELEZÉS: Makita DDF481 fúró, beszerzési ár: 85.000 Ft              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Van egyedi cikk ár?                                                │
│     └─ NEM → tovább                                                    │
│                                                                         │
│  2. Van beszállító szabály? (Makita Hungary)                           │
│     └─ IGEN: "LISTAÁR" → Lekérdezi Makita árlista API/táblából         │
│     └─ Eladási ár: 129.900 Ft (Makita listaár)                         │
│                                                                         │
│  ✅ EREDMÉNY: 129.900 Ft                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ BEVÉTELEZÉS: Noname fúrógép, beszerzési ár: 25.000 Ft                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Van egyedi cikk ár?                                                │
│     └─ NEM → tovább                                                    │
│                                                                         │
│  2. Van beszállító szabály? (Kínai Import Kft.)                        │
│     └─ IGEN: 60% árrés                                                 │
│     └─ Eladási ár: 25.000 × 1.60 = 40.000 Ft                           │
│                                                                         │
│  ✅ EREDMÉNY: 40.000 Ft                                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ BEVÉTELEZÉS: Ismeretlen alkatrész, beszerzési ár: 3.500 Ft             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Van egyedi cikk ár?                                                │
│     └─ NEM → tovább                                                    │
│                                                                         │
│  2. Van beszállító szabály?                                            │
│     └─ NEM (új beszállító) → tovább                                    │
│                                                                         │
│  3. Van cikkcsoport szabály? (Alkatrész)                               │
│     └─ IGEN: 60% árrés                                                 │
│     └─ Eladási ár: 3.500 × 1.60 = 5.600 Ft                             │
│                                                                         │
│  ✅ EREDMÉNY: 5.600 Ft                                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ BEVÉTELEZÉS: Teljesen új termék, új beszállító, nincs csoport          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Van egyedi cikk ár? → NEM                                          │
│  2. Van beszállító szabály? → NEM                                      │
│  3. Van cikkcsoport szabály? → NEM (vagy "Egyéb")                      │
│  4. Értékhatár szabály: 0-5.000 Ft → 80%                               │
│     └─ Eladási ár: 3.500 × 1.80 = 6.300 Ft                             │
│                                                                         │
│  ⚠️ FIGYELMEZTETÉS: "Alapértelmezett árazás használva!"                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## E) Kombinált Megoldás - Részletes Előnyök/Hátrányok

### ✅ Előnyök

| # | Előny | Részletezés |
|---|-------|-------------|
| 1 | **Listaár tartható** | Makita/Hikoki beszállító szinten: "LISTAÁR" |
| 2 | **Rugalmas** | Egyedi cikknél felülírható bármi |
| 3 | **Skálázható** | Új beszállító → 1 szabály, nem 1000 cikk |
| 4 | **Automatikus** | Bevételezéskor azonnal számol |
| 5 | **Kevés karbantartás** | ~10-20 beszállító + 4 cikkcsoport szabály |
| 6 | **Fallback van** | Ha semmi nincs → értékhatár alapján |
| 7 | **Auditálható** | Látszik melyik szabály alapján számolt |
| 8 | **Fokozatosan bővíthető** | Kezdetben csak cikkcsoport, később beszállító |

### ❌ Hátrányok

| # | Hátrány | Megoldás |
|---|---------|----------|
| 1 | Komplexebb logika | Egyszer kell megírni, utána automatikus |
| 2 | Több beállítás kell | Admin felület + importálás |
| 3 | Szabályok ütközhetnek | Prioritás egyértelmű (cikk > beszállító > csoport) |

---

## Adatbázis Séma (E opció)

```sql
-- Cikkcsoport szintű árrés (alapértelmezett)
CREATE TABLE arres_cikkcsoport (
    cikkcsoport_id UUID PRIMARY KEY REFERENCES cikkcsoportok(id),
    arres_szazalek DECIMAL(5,2),  -- pl. 45.00
    aktiv BOOLEAN DEFAULT TRUE
);

-- Beszállító szintű árrés (felülírja a cikkcsoportot)
CREATE TABLE arres_beszallito (
    beszallito_id UUID PRIMARY KEY REFERENCES beszallitok(id),
    arres_tipus VARCHAR(20) NOT NULL,  -- 'SZAZALEK' vagy 'LISTAAR'
    arres_szazalek DECIMAL(5,2),       -- ha SZAZALEK típus
    listaar_tabla VARCHAR(100),        -- ha LISTAAR típus (API/tábla név)
    aktiv BOOLEAN DEFAULT TRUE
);

-- Egyedi cikk árrés (legmagasabb prioritás)
CREATE TABLE arres_cikk (
    cikk_id UUID PRIMARY KEY REFERENCES cikkek(id),
    arres_tipus VARCHAR(20) NOT NULL,  -- 'SZAZALEK', 'FIX_AR', 'LISTAAR'
    arres_szazalek DECIMAL(5,2),       -- ha SZAZALEK
    fix_eladasi_ar DECIMAL(12,2),      -- ha FIX_AR
    megjegyzes TEXT,
    aktiv BOOLEAN DEFAULT TRUE
);

-- Értékhatár alapú árrés (fallback)
CREATE TABLE arres_ertekhatár (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_ertek DECIMAL(12,2) NOT NULL,
    max_ertek DECIMAL(12,2),           -- NULL = nincs felső határ
    arres_szazalek DECIMAL(5,2) NOT NULL,
    aktiv BOOLEAN DEFAULT TRUE
);

-- Audit: melyik szabály alapján számoltunk
CREATE TABLE bevételezes_ar_audit (
    bevetelezes_tetel_id UUID REFERENCES bevetelezes_tetelek(id),
    szabaly_tipus VARCHAR(20),         -- 'CIKK', 'BESZALLITO', 'CIKKCSOPORT', 'ERTEKHATÁR'
    szabaly_id UUID,                   -- melyik szabály
    szamitott_ar DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Javasolt Beállítások (KGC)

### Beszállító Szabályok

| Beszállító | Típus | Árrés/Szabály |
|------------|-------|---------------|
| Makita Hungary | LISTAÁR | makita_arlista tábla |
| Hikoki Hungary | LISTAÁR | hikoki_arlista tábla |
| Eurohatár Kft. | SZÁZALÉK | 45% |
| Robel/Cembre | SZÁZALÉK | 40% |
| Kínai import | SZÁZALÉK | 70% |
| FGSZ | SZÁZALÉK | 35% |

### Cikkcsoport Szabályok (Fallback)

| Cikkcsoport | Árrés % |
|-------------|---------|
| Gép | 35% |
| Bérgép | 0% (nem eladó) |
| Tartozék | 50% |
| Alkatrész | 65% |

### Értékhatár Szabályok (Végső Fallback)

| Beszerzési Ár | Árrés % |
|---------------|---------|
| 0 - 5.000 Ft | 80% |
| 5.001 - 20.000 Ft | 60% |
| 20.001 - 100.000 Ft | 45% |
| 100.001+ Ft | 30% |

---

## UI Mockup - Bevételezés

```
┌─────────────────────────────────────────────────────────────────────────┐
│ BEVÉTELEZÉS - Tétel hozzáadása                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Cikkszám: [MAK-DDF481_________] 🔍                                     │
│  Megnevezés: Makita DDF481 akkus fúró-csavarozó                         │
│  Beszállító: Makita Hungary                                             │
│  Cikkcsoport: Gép                                                       │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  Mennyiség:      [  5  ] db                                             │
│  Beszerzési ár:  [ 85.000 ] Ft/db                                       │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  📊 ÁRAZÁS                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Számított eladási ár: 129.900 Ft                                │   │
│  │ Szabály: 🏢 Beszállító (Makita) → LISTAÁR                        │   │
│  │                                                                  │   │
│  │ [ ] Egyedi ár felülírás: [_________] Ft                         │   │
│  │     ⚠️ Jóváhagyás szükséges (Admin)                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ℹ️ Jelenlegi készlet: 3 db @ 125.900 Ft                                │
│  ⚠️ ÁR VÁLTOZOTT! Régi: 125.900 Ft → Új: 129.900 Ft                    │
│                                                                         │
│  [ ] Árcédula nyomtatás (5 db)                                          │
│                                                                         │
│                              [Hozzáadás] [Mégse]                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Összegzés

| Opció | Komplexitás | Rugalmasság | Ajánlott? |
|-------|-------------|-------------|-----------|
| A) Cikkcsoport | ⭐ Alacsony | ⭐ Alacsony | ❌ Nem elég |
| B) Cikkenként | ⭐⭐⭐ Magas | ⭐⭐⭐ Magas | ❌ Túl sok munka |
| C) Beszállító | ⭐⭐ Közepes | ⭐⭐ Közepes | ⚠️ Részben |
| D) Értékhatár | ⭐ Alacsony | ⭐ Alacsony | ❌ Nem kezeli listaárat |
| **E) Kombinált** | ⭐⭐ Közepes | ⭐⭐⭐ Magas | ✅ **AJÁNLOTT** |

---

## Döntés Szükséges

1. **E opció megfelelő?** (Kombinált hierarchikus)
2. **Listaár táblák** - Makita/Hikoki árlistát honnan vesszük?
   - Manuális import (Excel)
   - API integráció (ha van)
   - Éves frissítés
3. **Egyedi felülírás** - Ki módosíthatja? (Admin only?)
4. **Kezdeti beállítások** - A fenti táblázatok jók kiindulásnak?
