# KGC ERP - Dashboard és Riportok Állapota

**Dátum:** 2026. február 11.
**Készítette:** KGC Fejlesztői Csapat

---

## Összefoglaló

Az alábbi dokumentum összefoglalja a kért dashboard és riporting funkciók jelenlegi állapotát.

| Összesítés             |      |
| ---------------------- | ---- |
| **Kész funkciók**      | 12   |
| **Részben kész**       | 9    |
| **Fejlesztés alatt**   | 8    |
| **Teljes lefedettség** | ~60% |

---

## 1. Főoldal (Dashboard) Widgetek

### Pénzügyi mutatók

| Funkció                 | Állapot | Megjegyzés                    |
| ----------------------- | ------- | ----------------------------- |
| Bruttó bevétel          | ✅ Kész | Napi/heti/havi nézet          |
| Nettó bevétel           | ✅ Kész | Trend összehasonlítással      |
| Kintlévőségek összesítő | ✅ Kész | Lejárt kintlévőségek kiemelve |
| Befizetések             | ✅ Kész | Aktuális időszak              |
| Bevétel előrejelzés     | ✅ Kész | Várható bevétel grafikon      |

### Készlet mutatók

| Funkció                         | Állapot | Megjegyzés                    |
| ------------------------------- | ------- | ----------------------------- |
| Készlet összesítő               | ✅ Kész | Kategória szerinti bontás     |
| Készlet kihasználtság           | ✅ Kész | Kiadott vs. elérhető arány    |
| Alacsony készlet figyelmeztetés | ✅ Kész | Automatikus értesítés         |
| Készlet mozgások                | ✅ Kész | Grafikon az elmúlt időszakról |

### Szerviz mutatók

| Funkció                       | Állapot             | Megjegyzés                   |
| ----------------------------- | ------------------- | ---------------------------- |
| Munkalapok összesítő          | ✅ Kész             | Státusz szerinti bontás      |
| Szerelők terhelése            | ✅ Kész             | Kapacitás kijelzéssel        |
| Szerviz bevétel               | ✅ Kész             | Munkadíj és alkatrész bontás |
| Garanciális vs. fizetős arány | 🔶 Fejlesztés alatt | Tervezett                    |
| Visszatérő hibák követése     | 🔶 Fejlesztés alatt | Tervezett                    |

### Partner/Ügyfél mutatók

| Funkció            | Állapot | Megjegyzés                      |
| ------------------ | ------- | ------------------------------- |
| Partner áttekintés | ✅ Kész | Aktív partnerek, kategóriák     |
| Top 10 partner     | ✅ Kész | Bevétel alapján rendezve        |
| Partner aktivitás  | ✅ Kész | Tranzakciók az elmúlt 30 napban |

### Bérlési mutatók

| Funkció               | Állapot             | Megjegyzés |
| --------------------- | ------------------- | ---------- |
| Átlagos bérlési idő   | 🔶 Fejlesztés alatt | Tervezett  |
| Legnépszerűbb gépek   | 🔶 Fejlesztés alatt | Tervezett  |
| Szezonalitás grafikon | 🔶 Fejlesztés alatt | Tervezett  |

---

## 2. Riport Oldalak

| Riport                           | Állapot         | Megjegyzés                                   |
| -------------------------------- | --------------- | -------------------------------------------- |
| Kintlévőségek (öregedési riport) | ✅ Kész         | 30/60/90 napos bontás, partner felfüggesztés |
| ÁFA összesítő                    | ✅ Kész         | Felszámított/levonható bontás, havi trend    |
| Értékesítési riport              | 🟡 Részben kész | Működik, adatok bekötése folyamatban         |
| Bérlési riport                   | 🟡 Részben kész | Működik, adatok bekötése folyamatban         |
| Készlet riport                   | 🟡 Részben kész | Működik, adatok bekötése folyamatban         |
| Pénzügyi riport                  | 🟡 Részben kész | Működik, adatok bekötése folyamatban         |

---

## 3. Export Funkciók

| Formátum     | Állapot             | Elérhető riportoknál         |
| ------------ | ------------------- | ---------------------------- |
| CSV export   | ✅ Kész             | Kintlévőségek, ÁFA összesítő |
| Excel export | 🔶 Fejlesztés alatt | Tervezett minden riporthoz   |
| PDF export   | 🔶 Fejlesztés alatt | Tervezett minden riporthoz   |

---

## 4. Összefoglaló: Mi használható most?

### Azonnal használható funkciók:

- **Főoldal dashboard** - Pénzügyi, készlet, szerviz és partner widgetek
- **Kintlévőségek oldal** - Teljes öregedési riport, partner kezelés
- **ÁFA összesítő** - Könyvelői nézet, CSV export
- **Értesítések** - Automatikus figyelmeztetések

### Hamarosan érkező funkciók:

- Bérlési statisztikák dashboard
- Garanciális vs. fizetős szerviz arány
- PDF és Excel export
- Visszatérő hibák követése

---

## 5. Fejlesztési Ütemterv

A hiányzó funkciókhoz két fejlesztési csomagot terveztünk:

### Csomag 1: Bérlési Dashboard & Export

**Várható:** Sprint 11 (~2 hét)

| Funkció              | Leírás                                                 |
| -------------------- | ------------------------------------------------------ |
| Bérlési statisztikák | Átlagos bérlési idő, legnépszerűbb gépek, szezonalitás |
| PDF export           | Minden riport PDF formátumban letölthető               |
| Excel export         | Minden riport Excel formátumban letölthető             |

### Csomag 2: Szerviz Statisztikák

**Várható:** Sprint 11 (~2 hét)

| Funkció                       | Leírás                                                |
| ----------------------------- | ----------------------------------------------------- |
| Garanciális vs. fizetős arány | Kördiagram + trend a dashboard-on                     |
| Visszatérő hibák követése     | Problémás gépek listája automatikus figyelmeztetéssel |

---

## 6. Tisztázandó Kérdések

A fejlesztések pontos specifikálásához az alábbi kérdésekben kérjük visszajelzésüket:

### Szerepkörök és Jogosultságok

| #   | Kérdés                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| K1  | A **könyvelő** szerep külső partnert jelent (pl. külsős könyvelő iroda) vagy belső munkatársat? Ez befolyásolja a hozzáférési szinteket. |
| K2  | A **partner tulajdonos** (franchise owner) milyen összesített riportokat szeretne látni a saját üzleteiről?                              |

### Bevételi Riportok

| #   | Kérdés                                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ |
| K3  | A bevételi riportoknál milyen **részletezettséget** várnak? (pl. termékkategória, szolgáltatás típus, eladó személy szerinti bontás) |
| K4  | Szükséges-e az **előző év azonos időszakával** való összehasonlítás a bevételi kimutatásokon?                                        |

### Készlet Riportok

| #   | Kérdés                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------ |
| K5  | A készlet riportoknál milyen **értékelési módszert** használnak? (FIFO, átlagár, utolsó beszerzési ár) |

### Szerviz Statisztikák

| #   | Kérdés                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------- |
| K6  | A szerviz statisztikáknál fontos-e az **átlagos javítási idő** (átfutási idő napokban) megjelenítése?   |
| K7  | A visszatérő hibák követésénél mi legyen a **küszöbérték**? (pl. 3 szerviz 90 napon belül = visszatérő) |
| K8  | Szükséges-e **Makita-specifikus** szerviz riport a garanciális elszámoláshoz?                           |

### Partner Riportok

| #   | Kérdés                                                                                   |
| --- | ---------------------------------------------------------------------------------------- |
| K9  | A partner riportoknál van-e **hűségprogram** vagy kedvezményrendszer, amit követni kell? |
| K10 | Fontos-e az **inaktív partnerek** követése? (pl. 90 napja nincs tranzakció)              |

### Bérlési Statisztikák

| #   | Kérdés                                                                                           |
| --- | ------------------------------------------------------------------------------------------------ |
| K11 | A bérlési statisztikáknál fontos-e a **késedelmes visszavételek** külön követése és riportálása? |
| K12 | Szükséges-e a **foglalások és no-show-k** követése?                                              |
| K13 | A bérlési bevétel előrejelzésnél milyen **időtávra** van szükség? (1 hét, 1 hónap, negyedév)     |

### Export Funkciók

| #   | Kérdés                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------- |
| K14 | Az automatikus email riportoknál milyen **gyakoriságot** és címzetteket kell beállítani?                        |
| K15 | Van-e konkrét **könyvelő szoftver** (pl. Kulcs-Soft, Novitax), amelynek formátumát támogatni kell az exportnál? |

### Könyvelői Funkciók

| #   | Kérdés                                                                                    |
| --- | ----------------------------------------------------------------------------------------- |
| K16 | A könyvelői integráció része-e a **bejövő számlák** kezelése, vagy csak a kimenő számlák? |
| K17 | Szükséges-e **banki kivonat egyeztetés** funkció a pénzügyi riportokhoz?                  |

---

**Kérjük, a fenti kérdésekre adott válaszokat küldjék el, hogy a fejlesztések pontosan az igényeknek megfelelően készülhessenek el.**

---

## Jelmagyarázat

| Jelölés             | Jelentés                                   |
| ------------------- | ------------------------------------------ |
| ✅ Kész             | Teljes funkcionalitás, használatra kész    |
| 🟡 Részben kész     | Működik, de további fejlesztés folyamatban |
| 🔶 Fejlesztés alatt | Tervezés vagy fejlesztés alatt             |

---

**Kérdés esetén keresse a fejlesztői csapatot.**
