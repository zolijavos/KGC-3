# KGC ERP v7.0 - Követelmény Tisztázó Kérdések

**Dátum:** 2026-02-02
**Verzió:** 1.0
**Készítette:** BMAD Agent Team (Mary - Business Analyst)
**Cél:** Új követelmények pontosítása implementáció előtt

---

## Összefoglaló

Az alábbi kérdések az ügyfél által küldött új követelmények (2026-02-02) alapján kerültek összeállításra. A válaszok szükségesek a pontos technikai specifikáció és implementációs terv elkészítéséhez.

**Kérjük a válaszokat legkésőbb:** [DÁTUM KITÖLTENDŐ]

---

## 1. MyPOS Kaució Kezelés

| #       | Kérdés                                                                                                            | Válasz |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| **1.1** | A kaució **pre-authorization** (blokkolás) után mennyi ideig maradjon aktív? (pl. 7 nap, 30 nap, bérlés végéig?)  |        |
| **1.2** | Ha a bérlés hosszabbodik, automatikusan hosszabbodjon a kaució blokkolás is, vagy új tranzakció kell?             |        |
| **1.3** | Részleges károkozás esetén hogyan történjen az elszámolás? (pl. 50k kaució, 20k kár → 20k capture + 30k release?) |        |
| **1.4** | Ha a kártya lejár a bérlés közben, mi a folyamat? (új kártya kérés, készpénz áttérés?)                            |        |
| **1.5** | Van-e **minimum és maximum kaució összeg** korlátozás?                                                            |        |

---

## 2. Hosszú Távú Szerződések

| #       | Kérdés                                                                                              | Válasz |
| ------- | --------------------------------------------------------------------------------------------------- | ------ |
| **2.1** | Milyen **szerződés típusokat** kell kezelni? (havi, negyedéves, féléves, éves - mindegyik kell?)    |        |
| **2.2** | A számlázás **előre** vagy **utólag** történjen? (pl. hónap elején előre, vagy hónap végén utólag?) |        |
| **2.3** | Milyen **kedvezmény struktúra** legyen? (pl. havi -10%, negyedéves -15%, éves -25%?)                |        |
| **2.4** | A szerződés **automatikusan megújul** lejáratkor, vagy külön jóváhagyás kell?                       |        |
| **2.5** | Van-e **minimum bérlési idő** hosszú távú szerződésnél? (pl. minimum 30 nap?)                       |        |
| **2.6** | Mi történik **korai felmondás** esetén? (kötbér, arányos visszatérítés?)                            |        |
| **2.7** | Egy szerződésben **több gép** is lehet, vagy gépenként külön szerződés?                             |        |

---

## 3. Makita Norma / Garanciális Javítás

| #       | Kérdés                                                                                        | Válasz |
| ------- | --------------------------------------------------------------------------------------------- | ------ |
| **3.1** | A Makita normák **milyen formátumban** érhetők el? (Excel, CSV, API, PDF?)                    |        |
| **3.2** | Milyen gyakran **frissülnek** a normák? (évente, negyedévente, ad-hoc?)                       |        |
| **3.3** | A normák **munkatípusonként** vagy **gépmodell + munkatípus** kombinációnként vannak megadva? |        |
| **3.4** | A garanciális elszámolás **automatikusan** megy Makita felé, vagy manuális claim?             |        |
| **3.5** | Más beszállítók (Stihl, Hikoki) esetén is lesz hasonló norma rendszer?                        |        |

---

## 4. Pénzügyi / Számlázási Kérdések

| #       | Kérdés                                                                                                     | Válasz |
| ------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| **4.1** | A hosszú távú szerződéseknél a **kaució** egyszeri, vagy havonta újra blokkolandó?                         |        |
| **4.2** | Ha a bérlő **nem fizet** időben a havi számlára, mi a folyamat? (emlékeztető → felfüggesztés → felmondás?) |        |
| **4.3** | A **késedelmi díj** hosszú távú szerződésnél is ugyanúgy számítódik, mint rövid távúnál?                   |        |

---

## 5. Prioritás és Ütemezés

| #       | Kérdés                                                                                                             | Válasz |
| ------- | ------------------------------------------------------------------------------------------------------------------ | ------ |
| **5.1** | Mi a **prioritási sorrend** az új követelmények között? (1. MyPOS kaució, 2. Hosszú táv, 3. Makita norma - ez jó?) |        |
| **5.2** | Van-e **határidő** valamelyik funkcióra? (pl. "Makita norma kell 2026 Q2-re")                                      |        |
| **5.3** | A hosszú távú szerződés funkció **MVP része** legyen, vagy későbbi fázis?                                          |        |

---

## 6. Üzleti Folyamat Kérdések

| #       | Kérdés                                                                                        | Válasz |
| ------- | --------------------------------------------------------------------------------------------- | ------ |
| **6.1** | Hosszú távú szerződésnél a gép **cserélhető** a szerződés alatt? (pl. elromlott → másik gép)  |        |
| **6.2** | A bérlő **online** is meg tudja hosszabbítani/felmondani a szerződést, vagy csak személyesen? |        |
| **6.3** | Van-e **"próbaidő"** hosszú távú szerződésnél? (pl. első hét kötbérmentes felmondás?)         |        |

---

## 7. Dashboard és Riporting Követelmények

### 7.1 Általános Dashboard Kérdések

| #         | Kérdés                                                                                                                  | Válasz |
| --------- | ----------------------------------------------------------------------------------------------------------------------- | ------ |
| **7.1.1** | Milyen **szerepköröknek** kell dashboard-ot látniuk? (Operátor, Boltvezető, Központi Admin, Partner Owner - mindegyik?) |        |
| **7.1.2** | A dashboard **real-time** frissüljön, vagy elegendő a **periodikus** (pl. 5 percenként)?                                |        |
| **7.1.3** | Szükséges-e **testreszabható widget** rendszer? (felhasználó maga állítja össze a dashboard-ját)                        |        |
| **7.1.4** | Kell-e **mobil-optimalizált** dashboard nézet? (tablet, telefon)                                                        |        |

### 7.2 Bevételi Riportok

| #         | Kérdés                                                                                                               | Válasz |
| --------- | -------------------------------------------------------------------------------------------------------------------- | ------ |
| **7.2.1** | Milyen **időszakokra** kell riportot tudni generálni? (napi, heti, havi, negyedéves, éves, egyedi dátum tartomány?)  |        |
| **7.2.2** | A bevételi riport **bontása** milyen szinteken legyen? (összesített, bolt szinten, gép kategória, partner, dolgozó?) |        |
| **7.2.3** | Kell-e **összehasonlító** nézet? (pl. ez a hónap vs. előző hónap, vagy ez az év vs. tavaly)                          |        |
| **7.2.4** | Milyen **pénzügyi KPI-k** fontosak? (bruttó bevétel, nettó bevétel, árrés, kintlévőség, stb.)                        |        |

### 7.3 Készlet Riportok

| #         | Kérdés                                                                                      | Válasz |
| --------- | ------------------------------------------------------------------------------------------- | ------ |
| **7.3.1** | A készlet riport **milyen bontásban** legyen? (raktár/bolt szinten, kategória, beszállító?) |        |
| **7.3.2** | Kell-e **készlet mozgás** riport? (bevételezés, kiadás, átmozgatás history)                 |        |
| **7.3.3** | Kell-e **minimum készlet alert** dashboard-on? (piros jelzés ha elfogy)                     |        |
| **7.3.4** | A bérgépek **kihasználtsági** mutatója fontos? (hány % van kint vs. bent)                   |        |

### 7.4 Szerviz Statisztikák

| #         | Kérdés                                                                                  | Válasz |
| --------- | --------------------------------------------------------------------------------------- | ------ |
| **7.4.1** | Milyen **szerviz KPI-k** fontosak? (átfutási idő, first-time fix rate, garancia arány?) |        |
| **7.4.2** | Kell-e **technikus hatékonyság** riport? (munkalapok száma, átlag javítási idő)         |        |
| **7.4.3** | A **garanciális vs. fizetős** javítások aránya fontos mutató?                           |        |
| **7.4.4** | Kell-e **visszatérő hiba** tracking? (ugyanaz a gép többször szervizben)                |        |

### 7.5 Partner/Ügyfél Riportok

| #         | Kérdés                                                                                 | Válasz |
| --------- | -------------------------------------------------------------------------------------- | ------ |
| **7.5.1** | Milyen **partner KPI-k** fontosak? (top 10 bérlő, legtöbb bevétel, legtöbb bérlés?)    |        |
| **7.5.2** | Kell-e **partner szegmentáció** riport? (magánszemély vs. cég, alkalmi vs. visszatérő) |        |
| **7.5.3** | A **kintlévőség** (tartozások) listázása fontos? (ki mennyivel tartozik, mióta)        |        |
| **7.5.4** | Kell-e **törzsvendég aktivitás** riport? (loyalty program használat)                   |        |

### 7.6 Bérlési Statisztikák

| #         | Kérdés                                                                                         | Válasz |
| --------- | ---------------------------------------------------------------------------------------------- | ------ |
| **7.6.1** | Milyen **bérlési mutatók** fontosak? (átlagos bérlési idő, legnépszerűbb gépek, szezonalitás?) |        |
| **7.6.2** | Kell-e **késedelmi statisztika**? (hány % hozza vissza időben, átlag késés)                    |        |
| **7.6.3** | A **foglalási előrejelzés** (reservation forecast) hasznos lenne?                              |        |
| **7.6.4** | Kell-e **árbevétel előrejelzés** a hosszú távú szerződések alapján?                            |        |

### 7.7 Export és Integráció

| #         | Kérdés                                                                                 | Válasz |
| --------- | -------------------------------------------------------------------------------------- | ------ |
| **7.7.1** | Milyen **export formátumok** kellenek? (PDF, Excel, CSV - mindegyik?)                  |        |
| **7.7.2** | Kell-e **automatikus email** küldés riportokkal? (pl. hétfőn reggel heti összefoglaló) |        |
| **7.7.3** | Kell-e **API endpoint** a riport adatokhoz? (külső rendszer számára)                   |        |
| **7.7.4** | A könyvelő számára milyen speciális riportok kellenek? (ÁFA összesítő, számla lista?)  |        |

---

## Következő Lépések

1. **Ügyfél kitölti** a válaszokat a fenti táblázatokban
2. **Visszaküldi** a dokumentumot email-ben
3. **Fejlesztői csapat** elkészíti a részletes implementációs tervet
4. **Sprint Planning** frissítés a végleges követelmények alapján

---

## Kapcsolat

**Kérdések esetén:**

- Email: [EMAIL CÍM]
- Telefon: [TELEFONSZÁM]

---

_Dokumentum generálva: BMAD Correct-Course Workflow_
