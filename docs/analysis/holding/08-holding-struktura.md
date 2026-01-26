# KGC - Holding Struktúra

## Diagram Információk

| Tulajdonság   | Érték                          |
| ------------- | ------------------------------ |
| **Fájlnév**   | 8-holding-struktura.excalidraw |
| **Típus**     | Szervezeti diagram             |
| **Kategória** | 8. Új Követelmények            |
| **Modul**     | Vállalati struktúra            |
| **Verzió**    | KGC ERP v2                     |
| **Forrás**    | 2025-12-02 találkozó           |

---

## Áttekintés

A holding struktúra egy olyan vállalati felépítés, ahol egy anyavállalat (holding) tulajdonolja és koordinálja a leányvállalatokat. A KGC projekt esetében ez lehetővé teszi a KisGépCentrum és My Forge Labs közös működését, valamint a jövőbeli terjeszkedést franchise partnereken keresztül.

---

## Struktúra Felépítése

```
                    ┌─────────────────────┐       ┌─────────────────────┐
                    │  👤 KisGépCentrum   │       │  👤 My Forge Labs   │
                    │       Kft.          │       │       Kft.          │
                    │   (Meglévő cég)     │       │   (Meglévő cég)     │
                    └──────────┬──────────┘       └──────────┬──────────┘
                               │ 50%                         │ 50%
                               │                             │
                               └──────────────┬──────────────┘
                                              │
                                              ▼
                               ┌──────────────────────────────┐
                               │    🏢 HOLDING TÁRSASÁG       │
                               │    "Renting" vagy hasonló    │
                               │                              │
                               │  • Stratégiai irányítás      │
                               │  • Központi szolgáltatások   │
                               │  • Marketing, IT, Könyvelés  │
                               └──────────────┬───────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
        ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
        │ 🔧 KISGÉP CENTRUM │    │ 💻 TECH/IT SZOLG. │    │ 🏪 FRANCHISE      │
        │                   │    │                   │    │    PARTNER        │
        │ • Kölcsönzés      │    │ • Szoftverfejl.   │    │                   │
        │ • Szerviz         │    │ • IT támogatás    │    │ • Önálló működés  │
        │ • Értékesítés     │    │ • SaaS szolg.     │    │ • Franchise díj   │
        │                   │    │                   │    │ • Közös brand     │
        │ Tenant: KGC-01    │    │ Tenant: TECH-01   │    │ Tenant: FRAN-XX   │
        └───────────────────┘    └───────────────────┘    └───────────────────┘
```

---

## Tulajdonosi Struktúra

### Szint 1: Tulajdonos Cégek

| Cég                    | Szerep                           | Részesedés |
| ---------------------- | -------------------------------- | ---------- |
| **KisGépCentrum Kft.** | Alapító partner, szakmai tudás   | 50%        |
| **My Forge Labs Kft.** | Technológiai partner, fejlesztés | 50%        |

**Megjegyzés**: A tulajdonosi arány megállapodás kérdése, nem feltétlenül 50-50%.

### Szint 2: Holding Társaság

| Tulajdonság      | Érték                                     |
| ---------------- | ----------------------------------------- |
| **Név**          | "Renting" vagy hasonló (döntés szükséges) |
| **Típus**        | Korlátolt Felelősségű Társaság (Kft.)     |
| **Szerep**       | Anyavállalat, stratégiai irányítás        |
| **Tulajdonosok** | KisGépCentrum Kft. + My Forge Labs Kft.   |

### Szint 3: Leányvállalatok

| Leányvállalat              | Funkció                   | Tenant ID |
| -------------------------- | ------------------------- | --------- |
| **KisGép Centrum**         | Operatív bérlés/szerviz   | KGC-01    |
| **Tech/IT Szolgáltatások** | Szoftverfejlesztés, IT    | TECH-01   |
| **Franchise Partnerek**    | Önálló működésű partnerek | FRAN-XX   |

---

## Központi Szolgáltatások

A holding az alábbi szolgáltatásokat biztosítja központilag:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         📋 KÖZPONTI SZOLGÁLTATÁSOK                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  📢 MARKETING                    💻 IT INFRASTRUKTÚRA                       │
│  ─────────────────               ──────────────────────                     │
│  • Közös márkaépítés             • KGC ERP szoftver                         │
│  • Reklámkampányok               • Felhő infrastruktúra                     │
│  • Weboldal, SEO                 • Helpdesk, támogatás                      │
│  • Social media                  • Fejlesztés, karbantartás                │
│                                                                              │
│  📊 KÖNYVELÉS                    ⚖️ JOGI SZOLGÁLTATÁSOK                     │
│  ─────────────────               ──────────────────────                     │
│  • Koordináció                   • Szerződések kezelése                     │
│  • Konszolidált riportok         • Franchise szerződések                    │
│  • Adótervezés                   • Védjegyek, szabadalmak                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Szolgáltatás Díjak

| Szolgáltatás | Díjmodell               | Megjegyzés                 |
| ------------ | ----------------------- | -------------------------- |
| Marketing    | Havi fix összeg         | Arányosan elosztva         |
| IT/Szoftver  | SaaS díj (tenant alapú) | Felhasználók száma szerint |
| Könyvelés    | Havi fix                | Tranzakciószám alapú       |
| Jogi         | Eseti                   | Szükség szerint            |

---

## Pénzáramlás a Holdingban

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            💰 PÉNZÁRAMLÁS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FELFELÉ (Leányvállalat → Holding)                                          │
│  ─────────────────────────────────                                          │
│  ✅ Osztalék fizetés           Adómentes a cégek között!                    │
│  ✅ Marketing hozzájárulás     Havi fix összeg                              │
│  ✅ Franchise díj              Franchise partnerektől                       │
│                                                                              │
│  LEFELÉ (Holding → Leányvállalat)                                           │
│  ─────────────────────────────────                                          │
│  ✅ Tagi hitel                 Rugalmas finanszírozás                       │
│  ✅ Tőkeemelés                 Beruházásokhoz                               │
│                                                                              │
│  OLDALIRÁNYBAN (Leány ↔ Leány)                                              │
│  ─────────────────────────────────                                          │
│  ✅ Bérleti díj                Pl. iroda, gépek                            │
│  ✅ Szolgáltatási díj          Belső elszámolás                            │
│                                                                              │
│  ⚠️ FONTOS: Pénzmozgás a holdingon belül adómentesen történhet!            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Holding Előnyei

### 1. Adóoptimalizálás

| Előny                     | Leírás                                          |
| ------------------------- | ----------------------------------------------- |
| **Adómentes osztalék**    | Cégek közötti osztalék Magyarországon adómentes |
| **Rugalmas pénzmozgatás** | Tagi hitelként bárhova                          |
| **Költségmegosztás**      | Központi szolgáltatások arányos elosztása       |

### 2. Kockázatkezelés

| Előny             | Leírás                                           |
| ----------------- | ------------------------------------------------ |
| **Elkülönítés**   | Ha egy leányvállalat csődbe megy, a többi védett |
| **Eszközvédelem** | Értékes eszközök a holdingban tarthatók          |
| **Hitelezők**     | Nem fordulhatnak a holding többi cégéhez         |

### 3. Növekedés és Terjeszkedés

| Előny                 | Leírás                                       |
| --------------------- | -------------------------------------------- |
| **Franchise**         | Új partnerek egyszerűen csatlakoztathatók    |
| **Befektető bevonás** | Holding szintjén vagy leányvállalat szintjén |
| **Cégeladás**         | Egy leányvállalat egyszerűen értékesíthető   |

### 4. Generációváltás

| Előny                    | Leírás                                |
| ------------------------ | ------------------------------------- |
| **Tulajdon átadás**      | Részvények átruházása egyszerűbb      |
| **Operatív elkülönítés** | Tulajdon és irányítás szétválasztható |

---

## Holding vs. Franchise Kapcsolat

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     HOLDING vs. FRANCHISE KÜLÖNBSÉG                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  HOLDING TAGJAI (Leányvállalatok)                                           │
│  ─────────────────────────────────                                          │
│  • Tulajdonos: a Holding (többségi részesedés)                              │
│  • Pénzügy: teljes betekintés a Holdingnak                                  │
│  • Irányítás: stratégiai döntések a Holdingnál                              │
│  • Profit: osztalék a Holdingnak                                            │
│                                                                              │
│  FRANCHISE PARTNEREK                                                         │
│  ─────────────────────────────────                                          │
│  • Tulajdonos: önálló (saját tulajdonosok)                                  │
│  • Pénzügy: NEM lát bele a Holding!                                         │
│  • Irányítás: önálló operatív működés                                       │
│  • Profit: franchise díjat fizet a Holdingnak                               │
│                                                                              │
│  ⚠️ A franchise partner NEM leányvállalat, csak szerződéses partner!        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ERD - Új Entitások

### HOLDING Entitás

```sql
CREATE TABLE holding (
    holding_id      SERIAL PRIMARY KEY,
    nev             VARCHAR(200) NOT NULL,
    adoszam         VARCHAR(20) NOT NULL,
    szekhely        TEXT NOT NULL,
    alapitas_datum  DATE NOT NULL,
    aktiv           BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

### LEÁNYVÁLLALAT Entitás

```sql
CREATE TABLE leanyvallalat (
    leanyvallalat_id    SERIAL PRIMARY KEY,
    holding_id          INTEGER REFERENCES holding(holding_id),
    tenant_id           UUID NOT NULL UNIQUE,
    nev                 VARCHAR(200) NOT NULL,
    tipus               VARCHAR(50) NOT NULL,  -- 'operativ', 'tech', 'franchise'
    reszesedes_szazalek DECIMAL(5,2),          -- Holding részesedése
    statusz             VARCHAR(30) NOT NULL,
    csatlakozas_datum   DATE NOT NULL,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);
```

### Típus Értékek

| Típus       | Leírás                                  |
| ----------- | --------------------------------------- |
| `operativ`  | Teljes tulajdonú operatív leányvállalat |
| `tech`      | Technológiai/IT szolgáltató leány       |
| `franchise` | Franchise szerződéses partner           |

---

## Multi-Tenant Integráció (ADR-001)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    🏢 HOLDING - TENANT KAPCSOLAT                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Holding                                                                     │
│     │                                                                        │
│     ├── tenant_id: HOLDING-01 (Super Admin szint)                           │
│     │      └── Látja: MINDEN tenant adatát (aggregált)                      │
│     │                                                                        │
│     ├── Leány 1: KisGépCentrum                                              │
│     │      └── tenant_id: KGC-01                                            │
│     │      └── Látja: csak saját adatait                                    │
│     │                                                                        │
│     ├── Leány 2: Tech/IT                                                    │
│     │      └── tenant_id: TECH-01                                           │
│     │      └── Látja: csak saját adatait                                    │
│     │                                                                        │
│     └── Franchise 1...N                                                     │
│            └── tenant_id: FRAN-01, FRAN-02, ...                             │
│            └── Látja: csak saját adatait                                    │
│            └── Holding látja: statisztikákat (ha engedélyezett)            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Következő Lépések

1. ⬜ Ügyvédi konzultáció a holding alapításról
2. ⬜ Tulajdonosi arányok véglegesítése
3. ⬜ Holding név kiválasztása
4. ⬜ Alapító okirat elkészítése
5. ⬜ Szolgáltatási szerződések (belső elszámolás)
6. ⬜ Franchise szerződés sablon

---

## Kapcsolódó Dokumentumok

- [02-holding-modell-elemzes.md](../analysis/02-holding-modell-elemzes.md) - Részletes elemzés
- [07-erd-uj-entitasok.md](07-erd-uj-entitasok.md) - FRANCHISE_PARTNER entitás
- [06-egyeb-felhasznalo.md](06-egyeb-felhasznalo.md) - RBAC jogosultságok

---

## Jelmagyarázat

| Szimbólum | Jelentés                |
| --------- | ----------------------- |
| 🏢        | Holding társaság        |
| 👤        | Tulajdonos cég          |
| 🔧        | Operatív leányvállalat  |
| 💻        | Tech/IT szolgáltatás    |
| 🏪        | Franchise partner       |
| 💰        | Pénzáramlás             |
| 📋        | Központi szolgáltatások |
