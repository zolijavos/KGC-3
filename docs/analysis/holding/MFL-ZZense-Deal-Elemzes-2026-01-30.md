# MyForge Labs - ZZense/KGC Deal Elemzés

**Készítette:** BMAD TEA Agent + Party Mode Szakértők (Mary, Victor, John, Winston)
**Dátum:** 2026-01-30
**Verzió:** 1.0 - Végleges Elemzés
**Megbízó:** Javo (MyForge Labs)

---

## Vezetői Összefoglaló

A KGC által javasolt ZZense struktúra **kedvező megállapodás** a MyForge Labs számára. Az elemzés alapján MFL a bevétel **~75%-át** kapja, miközben a költségei fedezve vannak és 50% tulajdonrésszel rendelkezik a közös cégben.

| Szempont        | Értékelés                       |
| --------------- | ------------------------------- |
| **Pénzügyi**    | 🟢 KIVÁLÓ - ~75% MFL-nek        |
| **Tulajdonjog** | 🟢 JÓ - 50% ZZense              |
| **Kockázat**    | 🟢 ALACSONY - költségek fedezve |
| **Kontroll**    | 🟢 JÓ - 50/50 döntéshozatal     |

**Javaslat:** Elfogadásra javasolt, a részletek (órabér, költséglista) rögzítésével.

---

## 1. A Megállapodás Struktúrája

### 1.1 Felek

| Fél                         | Szerep                        | Tulajdonrész ZZense-ben |
| --------------------------- | ----------------------------- | ----------------------- |
| **MyForge Labs Kft (MFL)**  | Fejlesztő, üzemeltető         | 50%                     |
| **KisGépCentrum Kft (KGC)** | Megrendelő, iparági tudás     | 50%                     |
| **ZZense Kft**              | Közös cég, bevételek kezelése | -                       |

### 1.2 Struktúra Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    ┌─────────────┐              ┌─────────────┐            │
│    │     MFL     │              │     KGC     │            │
│    │   50%       │              │    50%      │            │
│    └──────┬──────┘              └──────┬──────┘            │
│           │      KÖZÖS TULAJDON        │                   │
│           └────────────┬───────────────┘                   │
│                        │                                   │
│                        ▼                                   │
│           ┌────────────────────────┐                       │
│           │      ZZense Kft        │                       │
│           │   (közös cég)          │                       │
│           │                        │                       │
│           │  • Bevételek IDE       │                       │
│           │  • Költségek INNEN     │                       │
│           │  • Profit INNEN        │                       │
│           └────────────────────────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 MFL Jogosultságok

| #   | Jogosultság                | Leírás                                                     |
| --- | -------------------------- | ---------------------------------------------------------- |
| 1   | **Költségek számlázása**   | Iroda, gépek, fejlesztés költségei ZZense-nek számlázhatók |
| 2   | **30% bevétel részesedés** | Üzemeltetési díj a bruttó bevétel 30%-a                    |
| 3   | **50% profit részesedés**  | Tulajdonosként a maradék profit fele                       |
| 4   | **+20% bónusz**            | Ha MFL hozza az ügyfelet, összesen 50% részesedés          |

---

## 2. Pénzügyi Elemzés

### 2.1 Bevétel Források (ZZense-be érkezik)

| Forrás                 | Leírás                                             |
| ---------------------- | -------------------------------------------------- |
| SaaS díjak             | Egyedi szoftver bérleti díjak                      |
| Franchise alapdíjak    | Master Franchise partnerek által fizetett Base Fee |
| Végpont díjak          | Per seat fee a hálózat után                        |
| Setup/Bevezetési díjak | Onboarding költségek                               |

### 2.2 Kivételek (NEM számít bevételnek)

- Üzletberendezés, bútor, dekoráció
- Cégtáblák, matricák, nyomdai anyagok
- Hardver eszközök (számítógép, tablet, POS)
- Tiszta Franchise Belépési Díj (Entry Fee)
- Marketing hozzájárulások

### 2.3 Részletes Pénzáramlás (100M Ft/év példa)

```
BEVÉTEL:                                         100.0M Ft
                                                     │
┌────────────────────────────────────────────────────┼────────┐
│ 1. MFL SZÁMLÁZOTT KÖLTSÉGEK:                       │        │
│    ├── Fejlesztők: 2 fő × 12 hó × 700k Ft       16.8M Ft   │
│    ├── Iroda + rezsi                             2.4M Ft   │
│    ├── Gépek, szoftverek                         1.2M Ft   │
│    └── Hosting + infra                           2.4M Ft   │
│                                                 ────────    │
│    MFL KÖLTSÉG ÖSSZESEN:                        22.8M Ft ──► MFL
└────────────────────────────────────────────────────┼────────┘
                                                     │
                                               77.2M Ft marad
                                                     │
┌────────────────────────────────────────────────────┼────────┐
│ 2. MFL 30% BEVÉTEL RÉSZESEDÉS:                     │        │
│    100M × 30% =                                 30.0M Ft ──► MFL
└────────────────────────────────────────────────────┼────────┘
                                                     │
                                               47.2M Ft marad
                                                     │
┌────────────────────────────────────────────────────┼────────┐
│ 3. KGC KÖLTSÉGEK + EGYÉB:                          │        │
│    ├── KGC értékesítés, támogatás                5.0M Ft   │
│    └── Működési költségek                        5.0M Ft   │
│                                                 ────────    │
│                                                 10.0M Ft ──► KGC + egyéb
└────────────────────────────────────────────────────┼────────┘
                                                     │
                                               37.2M Ft PROFIT
                                                     │
┌────────────────────────────────────────────────────┼────────┐
│ 4. PROFIT ELOSZTÁS (50/50 tulajdon):               │        │
│    ├── MFL (50%):                               18.6M Ft ──► MFL
│    └── KGC (50%):                               18.6M Ft ──► KGC
└────────────────────────────────────────────────────┴────────┘
```

### 2.4 Összesítés

**MFL bevételek:**

| #   | Forrás                 | Összeg       | % a teljesből |
| --- | ---------------------- | ------------ | ------------- |
| 1   | Számlázott költségek   | 22.8M Ft     | 22.8%         |
| 2   | 30% bevétel részesedés | 30.0M Ft     | 30.0%         |
| 3   | 50% profit részesedés  | 18.6M Ft     | 18.6%         |
|     | **MFL ÖSSZESEN**       | **71.4M Ft** | **~75%**      |

**KGC bevételek:**

| #   | Forrás                | Összeg       | % a teljesből |
| --- | --------------------- | ------------ | ------------- |
| 1   | Költségeik megtérítve | 5.0M Ft      | 5.0%          |
| 2   | 50% profit részesedés | 18.6M Ft     | 18.6%         |
|     | **KGC ÖSSZESEN**      | **23.6M Ft** | **~25%**      |

### 2.5 Érzékenységvizsgálat

| Bevétel | MFL költség | MFL 30% | MFL profit | MFL össz | MFL % |
| ------- | ----------- | ------- | ---------- | -------- | ----- |
| 50M Ft  | 22.8M       | 15M     | 6.1M       | 43.9M    | 88%   |
| 100M Ft | 22.8M       | 30M     | 18.6M      | 71.4M    | 75%   |
| 200M Ft | 22.8M       | 60M     | 43.6M      | 126.4M   | 72%   |
| 500M Ft | 22.8M       | 150M    | 118.6M     | 291.4M   | 70%   |

**Megjegyzés:** Nagyobb bevételnél az MFL % csökken (mert a fix költség kisebb arány), de az abszolút összeg jelentősen nő.

---

## 3. Összehasonlítás Más Modellekkel

### 3.1 Modell Összehasonlítás

| Modell                | MFL SaaS % | MFL tulajdon? | MFL kockázat | Komplexitás |
| --------------------- | ---------- | ------------- | ------------ | ----------- |
| Csak 30% (félreértés) | 30%        | ❌            | Magas        | Alacsony    |
| MFL holding javaslat  | 80%        | ✅ 50%        | Közepes      | Magas       |
| **ZZense struktúra**  | **~75%**   | **✅ 50%**    | **Alacsony** | **Közepes** |
| Licensz + Royalty     | 15%        | ❌            | Alacsony     | Alacsony    |

### 3.2 Miért jó a ZZense struktúra MFL-nek?

| #   | Előny                 | Magyarázat                                            |
| --- | --------------------- | ----------------------------------------------------- |
| 1   | **Költségek fedezve** | Nem kell saját zsebből fizetni a fejlesztőket, irodát |
| 2   | **30% FIX**           | Bevétel részesedés akkor is jár, ha nincs profit      |
| 3   | **50% tulajdon**      | Döntéshozatalban egyenlő súly                         |
| 4   | **Alacsony kockázat** | Ha nincs bevétel, költségek akkor is számlázhatók     |
| 5   | **Upside megmarad**   | Ha sikeres, a profit 50%-a is MFL-é                   |

---

## 4. Kockázatok és Buktatók

### 4.1 Azonosított Kockázatok

| #   | Kockázat                                | Súlyosság  | Kezelés                     |
| --- | --------------------------------------- | ---------- | --------------------------- |
| 1   | Költség definíció viták                 | 🟡 Közepes | Mellékletben részletezni    |
| 2   | 50/50 patthelyzet döntéseknél           | 🟡 Közepes | Döntő mechanizmus rögzítése |
| 3   | Exit feltételek hiánya                  | 🟡 Közepes | Szerződésben rögzíteni      |
| 4   | Automatikus jogátszállás fejlesztésekre | 🟠 Magas   | Tárgyalni / elfogadni       |
| 5   | KGC visszalicencelési jog (GINOP)       | 🟡 Közepes | Törvényi követelmény        |

### 4.2 Automatikus Jogátszállás (Figyelem!)

A szerződés szerint:

> "Minden új kódrészlet, grafika és dokumentáció tulajdonjoga automatikusan a Tulajdonost (ZZense) illeti meg"

**Értelmezés:** Ez azt jelenti, hogy az MFL által készített fejlesztések a közös cég (ZZense) tulajdonába kerülnek, nem KGC-ébe. Mivel ZZense 50% MFL tulajdon, ez elfogadható.

---

## 5. Teendők és Ellenőrzőlista

### 5.1 Szerződésbe Foglalandó Részletek

| #   | Tétel                   | Javasolt érték            | Státusz        |
| --- | ----------------------- | ------------------------- | -------------- |
| 1   | ZZense tulajdoni arány  | 50% MFL / 50% KGC         | ✅ Egyeztetett |
| 2   | Bevétel részesedés      | 30% (bruttó bevétel után) | ✅ Egyeztetett |
| 3   | Bónusz ügyfélszerzésért | +20% (összesen 50%)       | ✅ Egyeztetett |
| 4   | Fejlesztői órabér       | 12.000-15.000 Ft/óra      | ⬜ Rögzítendő  |
| 5   | Iroda költség           | Fix havi vagy bevétel %-a | ⬜ Rögzítendő  |
| 6   | Elszámolás gyakorisága  | Negyedévente javasolt     | ⬜ Rögzítendő  |
| 7   | Exit feltételek         | 6 hónap felmondási idő    | ⬜ Rögzítendő  |
| 8   | Éves felülvizsgálat     | Arányok újratárgyalása    | ⬜ Rögzítendő  |

### 5.2 Aláírás Előtti Checklist

- [ ] Költségek listája mellékletben rögzítve
- [ ] Órabérek konkrétan meghatározva
- [ ] Elszámolási gyakoriság egyeztetve
- [ ] Exit feltételek definiálva
- [ ] Patthelyzet-feloldó mechanizmus (ha kell)
- [ ] Ügyvéd átnézte a szerződést
- [ ] Könyvelő véleményezte az adózási kérdéseket

---

## 6. Melléklet: Számlázható Költségek Sablon

### 6.1 Fejlesztési Költségek

| Pozíció            | Órabér        | Megjegyzés                |
| ------------------ | ------------- | ------------------------- |
| Senior fejlesztő   | 15.000 Ft/óra | Backend, frontend, DevOps |
| Medior fejlesztő   | 12.000 Ft/óra | Általános fejlesztés      |
| Junior fejlesztő   | 8.000 Ft/óra  | Támogatás, tesztelés      |
| UI/UX designer     | 12.000 Ft/óra | Grafikai munkák           |
| Projektmenedzsment | 10.000 Ft/óra | Koordináció               |

### 6.2 Infrastruktúra Költségek

| Tétel          | Típus             | Megjegyzés            |
| -------------- | ----------------- | --------------------- |
| Cloud hosting  | Tényleges költség | AWS/GCP/Azure számla  |
| Domain, SSL    | Tényleges költség | Éves díjak            |
| Monitoring     | Tényleges költség | Datadog, Sentry, stb. |
| CI/CD eszközök | Tényleges költség | GitHub Actions, stb.  |

### 6.3 Iroda és Overhead

| Tétel                  | Számítás          | Megjegyzés        |
| ---------------------- | ----------------- | ----------------- |
| Iroda bérleti díj      | Arányos rész      | Projekt %-ában    |
| Rezsi (áram, internet) | Arányos rész      | Projekt %-ában    |
| Irodai eszközök        | Amortizáció       | Havi bontásban    |
| Szoftver licenszek     | Tényleges költség | IDE, Office, stb. |

### 6.4 Egyéb Számlázható Tételek

| Tétel               | Feltétel               |
| ------------------- | ---------------------- |
| Képzés, konferencia | Előzetes jóváhagyással |
| Utazási költségek   | Projekt-kapcsolódó     |
| Külső szakértők     | Előzetes jóváhagyással |

---

## 7. Összefoglalás

### 7.1 Végső Értékelés

| Szempont                   | Értékelés  | Megjegyzés                   |
| -------------------------- | ---------- | ---------------------------- |
| **Pénzügyi feltételek**    | 🟢 KIVÁLÓ  | ~75% MFL-nek                 |
| **Tulajdonosi jogok**      | 🟢 JÓ      | 50% tulajdon és döntési jog  |
| **Kockázatkezelés**        | 🟢 KIVÁLÓ  | Költségek fedezve            |
| **Stratégiai illeszkedés** | 🟢 KIVÁLÓ  | SaaS piacra lépés lehetséges |
| **Komplexitás**            | 🟡 KÖZEPES | Tisztázandó részletek vannak |

### 7.2 Javaslat

**✅ ELFOGADÁSRA JAVASOLT** a következő feltételekkel:

1. Költségek listája részletesen rögzítve
2. Órabérek konkrétan meghatározva (min. 12.000 Ft/óra)
3. Negyedéves elszámolás és riportolás
4. Exit feltételek definiálva
5. Ügyvédi felülvizsgálat megtörtént

### 7.3 Pénzügyi Előrejelzés (5 év)

| Év           | Bevétel     | MFL részesedés (~75%) |
| ------------ | ----------- | --------------------- |
| 1            | 30M Ft      | 22.5M Ft              |
| 2            | 60M Ft      | 45M Ft                |
| 3            | 100M Ft     | 75M Ft                |
| 4            | 150M Ft     | 112.5M Ft             |
| 5            | 200M Ft     | 150M Ft               |
| **Összesen** | **540M Ft** | **405M Ft**           |

---

## 8. Dokumentum Története

| Verzió | Dátum      | Szerző                | Változás       |
| ------ | ---------- | --------------------- | -------------- |
| 1.0    | 2026-01-30 | BMAD TEA + Party Mode | Kezdeti verzió |

---

## 9. Hivatkozások

### 9.1 Kapcsolódó Dokumentumok

- [MyForge-Labs-Holding-Javaslat-KGC-2026.md](MyForge-Labs-Holding-Javaslat-KGC-2026.md) - Eredeti MFL holding javaslat
- [02-holding-modell-elemzes.md](02-holding-modell-elemzes.md) - Általános holding modell elemzés
- [08-holding-struktura.md](08-holding-struktura.md) - KGC holding struktúra
- [HYCRO-Holding-Elemzes-2026-01-08.md](HYCRO-Holding-Elemzes-2026-01-08.md) - Branding elemzés

### 9.2 KGC Eredeti Dokumentumok

- Háromoldalú Megállapodás (Opciós Jog)
- Üzemeltetési és Partneri Keretszerződés
- (Képek: kgc-holding-plan/ mappa)

---

_Dokumentum vége_

_Készítette: BMAD TEA Agent (Murat, Master Test Architect) Party Mode-ban, Mary (Business Analyst), Victor (Innovation Strategist), John (Product Manager) és Winston (Architect) közreműködésével._
