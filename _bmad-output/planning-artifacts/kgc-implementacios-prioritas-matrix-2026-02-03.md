# KGC ERP v7.0 - Implementációs Prioritás Mátrix

**Dokumentum verzió:** 1.0
**Dátum:** 2026-02-03
**Készítette:** Claude Code (BMAD feldolgozás)
**Forrás:** Követelmény Tisztázó Válaszok (2026-02-03)

---

## Összefoglaló

Ez a dokumentum az ügyfél válaszai alapján azonosított funkciókat, implementációs prioritást, komplexitást és Epic javaslatokat tartalmazza. Összesen **32 implementációs feladat** került azonosításra.

### Prioritási Kategóriák

- 🔴 **KRITIKUS**: MVP-hez elengedhetetlen, blokkol más funkciókat
- 🟠 **MAGAS**: Fontos üzleti érték, de nem blokkoló
- 🟡 **KÖZEPES**: Hasznos funkció, későbbi iterációban is megvalósítható
- 🟢 **ALACSONY**: Nice-to-have, optimalizáció

### Komplexitási Kategóriák

- **S (Small)**: 1-3 nap (1-3 story point)
- **M (Medium)**: 4-7 nap (5-8 story point)
- **L (Large)**: 8-15 nap (13-21 story point)
- **XL (Extra Large)**: 15+ nap (21+ story point) - Epic szintű bontás szükséges

---

## 1. MyPOS Kaució Kezelés

| ID    | Funkció                             | Leírás                                                                      | Forrás   | Prioritás   | Komplexitás | Epic Javaslat            | Függőségek                    |
| ----- | ----------------------------------- | --------------------------------------------------------------------------- | -------- | ----------- | ----------- | ------------------------ | ----------------------------- |
| MK-01 | MyPOS Pre-auth/Azonnali terhelés    | Pre-authorization vs. azonnali kaució könyvelés döntés implementálása       | 1.1      | 🔴 KRITIKUS | L           | Epic 1: MyPOS Integráció | MyPOS API, @kgc/mypos package |
| MK-02 | Géptípus szintű kaució konfiguráció | Minden géphez egyedi kaució érték beállítása (gép ár %-a vagy fix érték)    | 1.5      | 🔴 KRITIKUS | M           | Epic 1: MyPOS Integráció | @kgc/inventory, @kgc/config   |
| MK-03 | Kaució felülírás gép szinten        | Egyedi gépnél kaució felülírás lehetősége                                   | 1.5      | 🟠 MAGAS    | S           | Epic 1: MyPOS Integráció | MK-02                         |
| MK-04 | Bérlés hosszabbítás kaució kezelés  | Hosszabbításkor kaució-frissítés logika (újra auth vagy meglévő használata) | 1.2      | 🔴 KRITIKUS | M           | Epic 1: MyPOS Integráció | MK-01, TISZTÁZANDÓ            |
| MK-05 | Károsodás kezelés kaució levonással | Kárigény modul, kaució felhasználás vagy külön számlázás                    | 1.3, 1.4 | 🟠 MAGAS    | L           | Epic 2: Kárigény Kezelés | MK-01, @kgc/sales-invoice     |
| MK-06 | Kaució visszatérítés workflow       | Visszavételkor kaució visszautalás vagy megtartás (kár esetén)              | 1.4      | 🔴 KRITIKUS | M           | Epic 1: MyPOS Integráció | MK-01, MK-05                  |

**Epic Javaslat:**

- **Epic 1: MyPOS Kaució Integráció** (MK-01, MK-02, MK-03, MK-04, MK-06) - ~13-21 SP
- **Epic 2: Kárigény és Károsodás Kezelés** (MK-05) - ~8-13 SP

---

## 2. Hosszú Távú Szerződések

| ID    | Funkció                                            | Leírás                                                              | Forrás | Prioritás   | Komplexitás | Epic Javaslat                   | Függőségek                      |
| ----- | -------------------------------------------------- | ------------------------------------------------------------------- | ------ | ----------- | ----------- | ------------------------------- | ------------------------------- |
| HT-01 | Szerződés típusok (havi, negyedéves, éves, 2 éves) | Rugalmas szerződés modul különböző időtartamokkal                   | 2.1    | 🔴 KRITIKUS | L           | Epic 3: Hosszú Távú Szerződések | @kgc/rental-contract            |
| HT-02 | Szerződés hosszabbítás                             | Szerződés meghosszabbítási mechanizmus (manuális vagy automata)     | 2.1    | 🟠 MAGAS    | M           | Epic 3: Hosszú Távú Szerződések | HT-01, TISZTÁZANDÓ (2.4)        |
| HT-03 | Előre/Utólag számlázás                             | Számlázási mód beállítás szerződésenként (60% előre, 40% utólag)    | 2.2    | 🔴 KRITIKUS | M           | Epic 3: Hosszú Távú Szerződések | @kgc/sales-invoice              |
| HT-04 | Előleg kezelés                                     | Előleg rögzítés, párosítás végszámlával                             | 2.2    | 🟠 MAGAS    | M           | Epic 3: Hosszú Távú Szerződések | HT-03                           |
| HT-05 | Időtartam alapú automatikus kedvezmény             | 1 hét: 10%, 3 hét: 20%, havi: magasabb (konfigurálható)             | 2.3    | 🔴 KRITIKUS | M           | Epic 4: Kedvezmény Rendszer     | @kgc/rental-core, @kgc/config   |
| HT-06 | Korai lemondás kedvezmény visszaszámítás           | Ha korán lémondják, kedvezmény visszaszámítása                      | 2.6    | 🟠 MAGAS    | L           | Epic 3: Hosszú Távú Szerződések | HT-05, TISZTÁZANDÓ              |
| HT-07 | Minimum bérlési idő konfiguráció                   | Nincs kötelező minimum, de kedvezmény időtartam-függő               | 2.5    | 🟡 KÖZEPES  | S           | Epic 4: Kedvezmény Rendszer     | HT-05                           |
| HT-08 | Szerződés több gép és csomag                       | Egy szerződés több gépet és előre definiált csomagokat tartalmazhat | 2.7    | 🔴 KRITIKUS | L           | Epic 3: Hosszú Távú Szerződések | @kgc/inventory, HT-01           |
| HT-09 | Gép csere workflow hosszú távú szerződésben        | Gép cseréje szerződés alatt (elromlás, hasonló gép allokáció)       | 6.1    | 🟠 MAGAS    | M           | Epic 3: Hosszú Távú Szerződések | HT-08, @kgc/inventory           |
| HT-10 | Próbaidő kezelés (30 nap)                          | Első 30 nap díjmentes lemondás lehetősége                           | 6.3    | 🟡 KÖZEPES  | M           | Epic 3: Hosszú Távú Szerződések | HT-01                           |
| HT-11 | Online szerződés módosítás                         | Ügyfél portál szerződés módosításhoz (gép hozzáadás, időtartam)     | 6.2    | 🟡 KÖZEPES  | L           | Epic 5: Ügyfél Portál           | @kgc/auth, @kgc/rental-contract |
| HT-12 | Automatikus karbantartás ütemezés (1 hónap után)   | 1 hónap után kötelező karbantartás időpontfoglalás                  | 6.2    | 🟠 MAGAS    | M           | Epic 6: Karbantartás Ütemezés   | HT-01, @kgc/service-core        |

**Epic Javaslat:**

- **Epic 3: Hosszú Távú Szerződések Alapfunkciók** (HT-01, HT-02, HT-03, HT-04, HT-06, HT-08, HT-09, HT-10) - ~34-55 SP (NAGY Epic, bontás ajánlott!)
- **Epic 4: Időtartam Alapú Kedvezmény Rendszer** (HT-05, HT-07) - ~5-8 SP
- **Epic 5: Ügyfél Portál - Szerződés Módosítás** (HT-11) - ~8-13 SP
- **Epic 6: Karbantartás Ütemezés Workflow** (HT-12) - ~5-8 SP

---

## 3. Makita Norma / Garanciális Javítás

| ID    | Funkció                                      | Leírás                                                              | Forrás | Prioritás  | Komplexitás | Epic Javaslat                   | Függőségek              |
| ----- | -------------------------------------------- | ------------------------------------------------------------------- | ------ | ---------- | ----------- | ------------------------------- | ----------------------- |
| MN-01 | Makita norma Excel import                    | Excel fájl importálás Makita norma adatokkal                        | 3.1    | 🟠 MAGAS   | M           | Epic 7: Makita Norma Integráció | @kgc/service-core       |
| MN-02 | Norma verziókezelés (éves frissítés)         | Norma verziók kezelése, éves frissítési workflow                    | 3.2    | 🟡 KÖZEPES | M           | Epic 7: Makita Norma Integráció | MN-01                   |
| MN-03 | Garanciális munkalap típus                   | Munkalap típus: "Garanciális" (Makita norma alapján)                | 3.3    | 🟠 MAGAS   | S           | Epic 7: Makita Norma Integráció | @kgc/service-worksheet  |
| MN-04 | Makita platform integráció (CSV/API)         | Makita platformról havi számla/elszámolás importálás                | 3.4    | 🟠 MAGAS   | L           | Epic 7: Makita Norma Integráció | MN-01, @kgc/integration |
| MN-05 | Garanciális elszámolás automatikus párosítás | Importált Makita számla párosítása munkalapokkal                    | 3.4    | 🟡 KÖZEPES | M           | Epic 7: Makita Norma Integráció | MN-04, MN-03            |
| MN-06 | Csak Makita esetén norma (SBM, Hikoki nem)   | Makita-specifikus norma modul, más beszállítóknál standard munkalap | 3.5    | 🟡 KÖZEPES | S           | Epic 7: Makita Norma Integráció | MN-01                   |

**Epic Javaslat:**

- **Epic 7: Makita Norma és Garanciális Integráció** (MN-01, MN-02, MN-03, MN-04, MN-05, MN-06) - ~21-34 SP

---

## 4. Pénzügyi / Számlázási

| ID    | Funkció                             | Leírás                                                                   | Forrás | Prioritás   | Komplexitás | Epic Javaslat            | Függőségek                     |
| ----- | ----------------------------------- | ------------------------------------------------------------------------ | ------ | ----------- | ----------- | ------------------------ | ------------------------------ |
| PF-01 | Kaució kezelés minden bérléshez     | Kaució kötelező rövid/hosszú távú bérléshez egyaránt                     | 4.1    | 🔴 KRITIKUS | S           | Epic 1: MyPOS Integráció | MK-01                          |
| PF-02 | Fizetési késedelem követés          | Automata értesítések, szolgáltatás felfüggesztés, kedvezmény visszavonás | 4.2    | 🟠 MAGAS    | L           | Epic 8: Pénzügyi Modul   | @kgc/sales-invoice, @kgc/audit |
| PF-03 | Késedelmi díj kalkuláció (egységes) | Késedelmi díj számítás rövid/hosszú távú szerződéseknél egyaránt         | 4.3    | 🟠 MAGAS    | M           | Epic 8: Pénzügyi Modul   | PF-02, ADR-037                 |

**Epic Javaslat:**

- **Epic 8: Pénzügyi Modul - Késedelem és Díjszámítás** (PF-02, PF-03) - ~13-21 SP

---

## 5. Dashboard és Riporting

| ID    | Funkció                                        | Leírás                                                                    | Forrás       | Prioritás   | Komplexitás | Epic Javaslat                   | Függőségek                        |
| ----- | ---------------------------------------------- | ------------------------------------------------------------------------- | ------------ | ----------- | ----------- | ------------------------------- | --------------------------------- |
| DR-01 | RBAC alapú dashboard nézetek                   | Szerepkör-specifikus widgetek (Operátor, Buhaszető, Admin, Partner Owner) | 7.1.1        | 🔴 KRITIKUS | M           | Epic 9: Dashboard Alapok        | @kgc/auth, ADR-032                |
| DR-02 | Near real-time frissítés (5 perc)              | WebSocket/SSE real-time eseményekhez, 5 perces polling egyéb adatokhoz    | 7.1.2        | 🟡 KÖZEPES  | L           | Epic 9: Dashboard Alapok        | DR-01                             |
| DR-03 | Fix dashboard layout szerepkörönként           | Admin által konfigurálható fix widgetek (NINCS user-szintű testreszabás!) | 7.1.3        | 🟠 MAGAS    | M           | Epic 9: Dashboard Alapok        | DR-01                             |
| DR-04 | Reszponzív dashboard (tablet támogatás)        | Tablet-optimalizált dashboard design                                      | 7.1.4        | 🟡 KÖZEPES  | M           | Epic 9: Dashboard Alapok        | DR-03                             |
| DR-05 | Bevételi riport (többszintű bontás)            | Összesített, bolt, szerviz, bérlések, partner szerint                     | 7.2.1, 7.2.2 | 🟠 MAGAS    | L           | Epic 10: Riporting Modul        | @kgc/tenant, @kgc/audit           |
| DR-06 | Időszak összehasonlítás (current vs. previous) | Időszak összehasonlítás funkció (%, delta)                                | 7.2.3        | 🟠 MAGAS    | M           | Epic 10: Riporting Modul        | DR-05                             |
| DR-07 | Pénzügyi KPI-k (bruttó, nettó, kintlévők)      | Alapvető pénzügyi KPI dashboard widgetek                                  | 7.2.4        | 🟠 MAGAS    | M           | Epic 10: Riporting Modul        | DR-05                             |
| DR-08 | Készlet riport (gyártó, kategória, státusz)    | Készlet riport dimenzionális bontással                                    | 7.3.1        | 🟠 MAGAS    | M           | Epic 10: Riporting Modul        | @kgc/inventory                    |
| DR-09 | Készlet mozgás riport                          | Beszerzés, kiadás, visszavétel, javítás, selejtezés tracking              | 7.3.2        | 🟡 KÖZEPES  | M           | Epic 10: Riporting Modul        | DR-08                             |
| DR-10 | Minimum készlet alert                          | Dashboard alert widget kritikus készlethiány esetén                       | 7.3.3        | 🟠 MAGAS    | S           | Epic 9: Dashboard Alapok        | DR-08                             |
| DR-11 | Kihasználtsági ráta                            | (kiadott gépek / összes gép) \* 100, trend grafikon                       | 7.3.4        | 🟠 MAGAS    | M           | Epic 10: Riporting Modul        | @kgc/rental-core, @kgc/inventory  |
| DR-12 | Technikus teljesítmény dashboard               | Munkalapok száma, átlagos átfutási idő, ügyfél értékelések                | 7.4.2        | 🟡 KÖZEPES  | M           | Epic 10: Riporting Modul        | @kgc/service-core, @kgc/audit     |
| DR-13 | Garanciális / Fizetős javítások aránya         | Garanciális vs. fizetős bontás, trend                                     | 7.4.3        | 🟡 KÖZEPES  | S           | Epic 10: Riporting Modul        | MN-03                             |
| DR-14 | Visszatérő hiba tracking                       | Gép szerviz történet, ismétlődő hibajelenségek                            | 7.4.4        | 🟡 KÖZEPES  | M           | Epic 10: Riporting Modul        | @kgc/service-core                 |
| DR-15 | Top 10 partner (bevétel, bérlés)               | Partner KPI-k dashboard                                                   | 7.5.1        | 🟠 MAGAS    | S           | Epic 10: Riporting Modul        | @kgc/tenant                       |
| DR-16 | Kintlévőség aging riport                       | Kintlévőség partner szerint (0-30, 30-60, 60-90, 90+ nap)                 | 7.5.3        | 🟠 MAGAS    | M           | Epic 10: Riporting Modul        | PF-02                             |
| DR-17 | Törzsvevői aktivitás riport                    | Hűségprogram használat, kedvezmények                                      | 7.5.4        | 🟢 ALACSONY | M           | Epic 11: Hűségprogram (későbbi) | N/A                               |
| DR-18 | Export (PDF, Excel, CSV)                       | Riportok exportálása különböző formátumokban                              | 7.7.1        | 🟠 MAGAS    | M           | Epic 10: Riporting Modul        | DR-05+                            |
| DR-19 | Könyvelői speciális riportok                   | ÁFA összesítő, be/kimenő számlák, banki párosítás                         | 7.7.4        | 🟠 MAGAS    | L           | Epic 12: Könyvelői Modul        | @kgc/szamlazz-hu, @kgc/nav-online |

**Epic Javaslat:**

- **Epic 9: Dashboard Alapok és Widgetek** (DR-01, DR-02, DR-03, DR-04, DR-10) - ~13-21 SP
- **Epic 10: Riporting Modul - Bevétel, Készlet, Szerviz** (DR-05, DR-06, DR-07, DR-08, DR-09, DR-11, DR-12, DR-13, DR-14, DR-15, DR-16, DR-18) - ~34-55 SP (NAGY Epic, bontás ajánlott!)
- **Epic 11: Hűségprogram és Törzsvevői Rendszer** (DR-17) - Későbbi fázis
- **Epic 12: Könyvelői Modul és Pénzügyi Integráció** (DR-19) - ~8-13 SP

---

## Összesített Prioritás és Komplexitás

### Prioritás szerinti megoszlás

| Prioritás       | Darabszám | Azonosítók                                                                                                                                                      |
| --------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 **KRITIKUS** | 11        | MK-01, MK-02, MK-04, MK-06, HT-01, HT-03, HT-05, HT-08, PF-01, DR-01                                                                                            |
| 🟠 **MAGAS**    | 15        | MK-03, MK-05, HT-02, HT-04, HT-06, HT-09, HT-12, MN-01, MN-03, MN-04, PF-02, PF-03, DR-03, DR-05, DR-06, DR-07, DR-08, DR-10, DR-11, DR-15, DR-16, DR-18, DR-19 |
| 🟡 **KÖZEPES**  | 11        | HT-07, HT-10, HT-11, MN-02, MN-05, MN-06, DR-02, DR-04, DR-09, DR-12, DR-13, DR-14                                                                              |
| 🟢 **ALACSONY** | 1         | DR-17                                                                                                                                                           |

### Komplexitás szerinti megoszlás

| Komplexitás          | Darabszám | Becsült Összesen (SP) |
| -------------------- | --------- | --------------------- |
| **S (Small)**        | 5         | ~5-15 SP              |
| **M (Medium)**       | 20        | ~100-160 SP           |
| **L (Large)**        | 13        | ~104-273 SP           |
| **XL (Epic szintű)** | 0         | N/A                   |

**Teljes becsült implementációs komplexitás: 209-448 Story Point**

---

## Ajánlott Sprint Tervezés

### Phase 1: MVP Alapok (Sprint 1-3)

**Cél:** Kritikus funkciók implementálása, alapvető működőképesség

**Tartalmazott Epicek:**

- Epic 1: MyPOS Kaució Integráció (MK-01, MK-02, MK-03, MK-04, MK-06)
- Epic 3: Hosszú Távú Szerződések Alapfunkciók **részleges** (HT-01, HT-03, HT-08)
- Epic 4: Időtartam Alapú Kedvezmény Rendszer (HT-05)
- Epic 9: Dashboard Alapok **részleges** (DR-01, DR-03)

**Becsült SP:** ~60-90 SP (3 sprint @ 20-30 SP/sprint)

### Phase 2: Bővített Funkciók (Sprint 4-6)

**Cél:** Hosszú távú szerződések lezárása, Makita integráció, riportok

**Tartalmazott Epicek:**

- Epic 3: Hosszú Távú Szerződések Alapfunkciók **befejezés** (HT-02, HT-04, HT-06, HT-09, HT-10)
- Epic 7: Makita Norma és Garanciális Integráció (MN-01, MN-02, MN-03, MN-04, MN-05, MN-06)
- Epic 8: Pénzügyi Modul (PF-02, PF-03)
- Epic 10: Riporting Modul **részleges** (DR-05, DR-06, DR-07, DR-08, DR-10, DR-11, DR-15, DR-16, DR-18)

**Becsült SP:** ~80-120 SP

### Phase 3: Optimalizáció és Kiegészítők (Sprint 7-9)

**Cél:** Riportok lezárása, karbantartás, ügyfél portál, optimalizációk

**Tartalmazott Epicek:**

- Epic 2: Kárigény és Károsodás Kezelés (MK-05)
- Epic 5: Ügyfél Portál (HT-11)
- Epic 6: Karbantartás Ütemezés (HT-12)
- Epic 9: Dashboard Alapok **befejezés** (DR-02, DR-04)
- Epic 10: Riporting Modul **befejezés** (DR-09, DR-12, DR-13, DR-14)
- Epic 12: Könyvelői Modul (DR-19)

**Becsült SP:** ~70-100 SP

### Phase 4: Jövőbeli (későbbi)

**Tartalmazott Epicek:**

- Epic 11: Hűségprogram és Törzsvevői Rendszer (DR-17)
- További optimalizációk és finomhangolások

---

## Függőségi Gráf (kritikus útvonal)

```
@kgc/auth (RBAC) → DR-01 → DR-03 → DR-04
                      ↓
@kgc/mypos → MK-01 → MK-02 → MK-03
                ↓        ↓
             MK-04    MK-06
                ↓
             PF-01

@kgc/rental-contract → HT-01 → HT-08 → HT-09
                         ↓        ↓
                      HT-03    HT-10
                         ↓
                      HT-04

@kgc/config → HT-05 → HT-07
                ↓
             HT-06

@kgc/service-core → MN-01 → MN-02
                      ↓        ↓
                   MN-03    MN-06
                      ↓
                   MN-04 → MN-05

@kgc/sales-invoice → PF-02 → PF-03
                        ↓
                     DR-16

@kgc/inventory → DR-08 → DR-09 → DR-10
                    ↓
                 DR-11

DR-05 → DR-06 → DR-07 → DR-18
```

---

## Kockázatok és Blokkollók

### Magas Kockázatú Elemek

1. **MK-01 - MyPOS Pre-auth/Azonnali terhelés**
   - **Kockázat:** Ügyfél válasz nem egyértelmű, tisztázás szükséges
   - **Mitigáció:** Follow-up kérdés küldése, MyPOS API dokumentáció áttekintése

2. **HT-02 - Szerződés automatikus megújítása**
   - **Kockázat:** Válasz nem egyértelmű (2.4 kérdés)
   - **Mitigáció:** Tisztázó egyeztetés az ügyféllel

3. **HT-06 - Korai lemondás kalkuláció**
   - **Kockázat:** Pontos számítási logika nincs meghatározva
   - **Mitigáció:** Részletes üzleti szabály definiálás szükséges

4. **DR-02 - Real-time frissítés (WebSocket/SSE)**
   - **Kockázat:** Infrastruktúra skálázhatósági kihívások
   - **Mitigáció:** Kezdetben polling, később migráció WebSocket-re

5. **DR-19 - Könyvelői modul**
   - **Kockázat:** NAV Online számla, Számlázz.hu API komplexitása
   - **Mitigáció:** Fokozatos integráció, külső szakértő bevonása

### Blokkollók

- **MyPOS API hozzáférés**: MK-01 fejlesztés megkezdéséhez MyPOS sandbox és production API kulcsok szükségesek
- **Makita norma Excel minták**: MN-01 fejlesztéshez valós Makita norma Excel fájl minták kellenek
- **RBAC implementáció**: DR-01 előfeltétele az ADR-032 szerinti RBAC rendszer implementálása

---

## Következő Lépések

1. **Tisztázandó kérdések pontosítása** (lásd: kgc-kovetelmeny-tisztazo-valaszok-2026-02-03.md "Tisztázandó Kérdések" szekció)
2. **Epic lebontás részletes Story-kra** (BMAD workflow: `/bmad:bmm:workflows:create-epics-and-stories`)
3. **Sprint Planning** (BMAD workflow: `/bmad:bmm:workflows:sprint-planning`)
4. **ADR felülvizsgálat és új ADR-ek készítése** (lásd következő dokumentum: Döntési összefoglaló)

---

**Dokumentum vége**

_Generálva: BMAD Correct-Course Workflow, 2026-02-03_
