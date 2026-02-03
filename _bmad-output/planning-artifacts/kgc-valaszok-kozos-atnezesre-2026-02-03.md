# KGC ERP v7.0 - Válaszok Közös Átnézése

**MyForge Labs → Kisgépcentrum**
**Dátum:** 2026-02-03
**Készítette:** Javo (MFL) + Claude
**Státusz:** Közös átnézésre vár

---

## Sziasztok!

Végigmentünk a válaszaitokon és **49 kérdésből 29-re kaptunk egyértelmű választ** - ezek alapján már tudunk dolgozni! 🎉

Viszont **11 kérdésnél** kérünk pontosítást, mert vagy nem értettük jól, vagy hiányos a válasz. Ezeket most közösen átnézzük veletek.

**Amit ma csinálunk:**

1. Végigmegyünk a **11 tisztázandó kérdésen**
2. Ti pontosítjátok, amit nem értettünk
3. Mi jegyzeteljük a válaszokat

---

## 🔴 KRITIKUS Tisztázások (8 kérdés)

Ezek nélkül nem tudunk továbblépni a fejlesztéssel.

---

### 1.1 MyPOS Kaució - Pre-authorization vagy Azonnali terhelés?

**A kérdés eredeti:**
A kauciók **pre-authorization** módon legyenek tárolva (csak blokkolás, nincs pénz mozgás), vagy a bérlés indulásakor **azonnal terheljük** a kaució összeget?

**A válaszotok (PDF):**
_"Egy bélen belül többaszköz napvileg választott, amíg várakozik gépnél kell látani a visszatételkor szóló, akkor a kézbesáltatható a fenmaradó béslegit!"_

**Mit értettünk belőle:**
Valószínűleg azt akartátok mondani, hogy egy bérlésen belül több eszköz is lehet, és visszavételkor számoljátok el. De a kaució kezelés módja nem derült ki.

**Kérjük, pontosítsátok:**

**Opció A:** Pre-authorization (MyPOS blokkolja az összeget a kártyán, de nem vonja le. Csak károsodás/késedelem esetén terheljük.)

**Opció B:** Azonnali terhelés (Bérlés indításkor levonjuk a kauciót, visszavételkor visszautaljuk.)

**Opció C:** Más megoldás? (Írjátok le!)

📝 **Válaszotok:**

```




```

---

### 1.2 Bérlés Hosszabbítás - Automatikus vagy Manuális?

**A kérdés:**
Ha a bérlés lejár, **automatikusan** meghosszabbodik (pl: újabb kaució blokkolás), vagy **manuális jóváhagyás** kell?

**A válaszotok (PDF):**
_"Nálunk nem szolgálódadakísan már később. Eléreni kívánjuk, hogy online vana másikre kell beszállítani..."_

**Mit értettünk:**
Valószínűleg NEM akartok automatikus hosszabbítást, hanem online lehetőséget szeretnétek.

**Kérjük, pontosítsátok:**

- [ ] Automatikus hosszabbítás (lejáratkor automatikusan meghosszabbodik, értesítés az ügyfélnek)
- [ ] Manuális hosszabbítás (lejárat előtt értesítés, ügyfél jóváhagyása kell online/telefonon)
- [ ] Más?

📝 **Válaszotok:**

```




```

---

### 1.3 Károsodás Kezelés - Mi történjen?

**A kérdés:**
Rendkívüli károsodás esetén mi a folyamat?

**A válaszotok (PDF):**
_"Ha szanáset kaszálátthatál a javítás, szlovák lep eredett."_

**Mit értettünk:**
Nem értettük a választ. 😅

**Kérjük, írjátok le:**

1. Ha a gép károsodik bérlés alatt, mi történik?
   - Kaució felhasználás? (kár összege levonva a kaucióból)
   - Külön kárigény/számla? (kaució visszajár, de kárt külön számlázunk)
   - Biztosító bevonása?

2. Ha kár > kaució, mi történik?
   - Külön számla az ügyfelnek?
   - Biztosító?

📝 **Válaszotok:**

```




```

---

### 1.4 Kár a Bérlés Közben - Folyamat

**A kérdés:**
Ha elveszett/rongálódott/ellopták a gépet bérlés alatt, mi a folyamat?

**A válaszotok (PDF):**
_"Ügyfélközöselvészésal visszaillesztés a bemnütázott partmeg."_

**Mit értettünk:**
Ügyfélközpontú megoldást akartok, de a konkrét lépések nem világosak.

**Kérjük, írjátok le lépésről lépésre:**

1. Ügyfél jelzi a kárt/elvesztést
2. Ti mit csináltok? (kárigény nyitás? rendőrségi feljelentés? biztosító?)
3. Kaució mi lesz? (felhasználjátok vagy visszaadjátok?)
4. Ha kár > kaució, külön számlázás?

📝 **Válaszotok:**

```




```

---

### 2.4 Szerződés Automatikus Megújítás

**A kérdés:**
Hosszú távú szerződéseknél (pl: éves) a szerződés automatikusan megújul lejáratkor, vagy külön jóváhagyás kell?

**A válaszotok (PDF):**
_"Megjától nem kell üzni különjük. Fogvenelnitél kaj, hogy te fog érni, ha béjér..."_

**Mit értettünk:**
Valószínűleg értesítés + manuális megújítás kell.

**Kérjük, pontosítsátok:**

- [ ] Automatikus megújítás (pl: éves szerződés lejár, automatikusan újabb évre megújul, kivéve ha lemondja az ügyfél)
- [ ] Manuális megújítás (lejárat előtt értesítés, ügyfél dönt: megújít vagy nem)
- [ ] Más?

📝 **Válaszotok:**

```




```

---

### 5.3 "Hosszú Távú Szerződés" Definíció

**A kérdés:**
A hosszú távú szerződések funkció MVP része, vagy később jön?

**A válaszotok (PDF):**
_"Milyen hosszabstól szolgálódelnél beszélek? Hosszú tátra vszes a gépet lentáé szolgálódele? Összobadazó szolgálódeles?"_

**Mit értettünk:**
Ti is kérdést tettetek fel nekünk! 😊 Pontosítjuk:

**Mit értünk "hosszú távú szerződés" alatt:**

- **Rövid távú:** Napi/heti bérlés (1-30 nap)
- **Hosszú távú:** Havi/negyedéves/féléves/éves szerződések (30+ nap, ismétlődő/előre tervezett)

**Kérjük, válaszoljátok meg:**

1. Nektek mi számít "hosszú távú" szerződésnek?
2. Milyen időtartamokat használtok most? (pl: van nálatok havi bérlés? éves?)
3. MVP-ben (első verzió) kell ez, vagy későbbi fázis?

📝 **Válaszotok:**

```




```

---

### 2.3 Havi Kedvezmény Mértéke

**A kérdés:**
Mennyi a kedvezmény 30+ napos (havi) bérlésekre?

**A válaszotok (PDF):**
_"1 hét után 10% kedvezmény, 3 hét után 20% kedvezmény. Emelt magadobb három ez csak a hónávog kedvezmény menet."_

**Mit értettünk:**

- ✅ **1 hét (7 nap):** 10% kedvezmény
- ✅ **3 hét (21 nap):** 20% kedvezmény
- ❓ **Havi (30+ nap):** magasabb kedvezmény, de mennyi?

**Kérjük, pontosítsátok:**
30+ napos bérlésekre mennyi a kedvezmény? (pl: 25%? 30%?)

📝 **Válaszotok:**

```




```

---

### 2.6 Korai Lemondás Kalkuláció

**A kérdés:**
Mi történik, ha valaki korai lemondja a szerződést? Hogyan számoljuk vissza a kedvezményt?

**A válaszotok (PDF):**
_"Ha kedvézményével vitis, a keliban időre szánítottuk kettszerűnél számdvan égesben biztonos kettszerűnél."_

**Mit értettünk:**
Ha kedvezményesen vette és korán lémondja, a kedvezményt vissza kell számítani. De a pontos formula nem világos.

**Példa forgatókönyv:**
Ügyfél 30 napra bérel gépet → kap 25% kedvezményt. 15 nap után lemondja.

**Kérjük, írjátok le:**
Mi történik? Opciók:

- [ ] Opció A: 15 napra csak 10% kedvezmény járt volna, a 15% különbözetet visszakérjük
- [ ] Opció B: Lemondási díj (pl: 1 heti díj büntetés)
- [ ] Opció C: Nincs visszaszámítás, elfogadjuk
- [ ] Opció D: Más? (írjátok le!)

📝 **Válaszotok:**

```




```

---

## 🟡 KÖZEPES Tisztázások (5 kérdés)

Ezek nem blokkolók, de jó lenne, ha pontosítanátok.

---

### 7.4.1 Szerviz KPI-k - Konkrét Lista

**A kérdés:**
Milyen szerviz KPI-k kellenek a dashboard-ra?

**A válaszotok (PDF):**
_(nincs válasz)_

**Javaslatunk:**

- [ ] Átfutási idő (órában vagy napokban)
- [ ] Nyitott munkalapok száma
- [ ] Lezárt munkalapok száma (heti/havi)
- [ ] Várakozó alkatrészre (darabszám)
- [ ] First-time fix rate (első javítás sikeressége %)
- [ ] Technikus kihasználtság
- [ ] Átlagos munkalap érték

**Melyikeket akarjátok? Vagy mások?**

📝 **Válaszotok:**

```




```

---

### 7.5.2 Partner Szegmentáció

**A kérdés:**
Kell-e partner szegmentáció riport? (pl: VIP, Rendszeres, Alkalmi, Inaktív ügyfelek)

**A válaszotok (PDF):**
_(nincs válasz)_

**Kell ez vagy nem?**

- [ ] Igen, kell (írjátok le, milyen kategóriák!)
- [ ] Nem kell
- [ ] Később

📝 **Válaszotok:**

```




```

---

### 7.6.1 Bérlési Statisztikák - Részletek

**A kérdés:**
Milyen bérlési statisztikák kellenek?

**A válaszotok (PDF):**
_(nincs válasz)_

**Javaslatunk:**

- [ ] Átlagos bérlési időtartam
- [ ] Top 10 legnépszerűbb gép
- [ ] Szezonális trend (havi/negyedéves)
- [ ] Hétvége vs. hétköznap bérlések
- [ ] Mások?

**Melyikeket akarjátok?**

📝 **Válaszotok:**

```




```

---

### 7.6.2 Kiadási Riport

**A kérdés:**
Kell-e kiadási ütemezési riport? (mikor kérték, mikor vették át, átlagos kivételi idő)

**A válaszotok (PDF):**
_(nincs válasz)_

**Kell ez vagy nem?**

- [ ] Igen
- [ ] Nem
- [ ] Később

📝 **Válaszotok:**

```




```

---

### 7.6.4 Bevételi Előrejelzés

**A kérdés:**
Kell-e bevételi előrejelzés hosszú távú szerződések alapján? (pl: várható havi bevétel a következő 3 hónapban)

**A válaszotok (PDF):**
_(nincs válasz)_

**Kell ez vagy nem?**

- [ ] Igen, kell (milyen időtávra? 1 hónap? 3 hónap? 6 hónap?)
- [ ] Nem kell
- [ ] Később

📝 **Válaszotok:**

```




```

---

## ✅ Amiket Jól Értettünk (29 kérdés)

Ezeket nem kell már tisztáznunk, csak megerősítésképpen felsoroljuk:

### Kaució

- ✅ **1.5** - Minden géphez egyedi kaució (gép ár függvénye + alapértelmezett érték)

### Hosszú Távú Szerződések

- ✅ **2.1** - Többféle szerződés típus (éves, 2 éves, hosszabbíthatóak + beszerzések)
- ✅ **2.5** - Nincs kötelező minimum bérlési idő
- ✅ **2.7** - Egy szerződésben több gép + csomagok is lehetnek

### Makita Norma

- ✅ **3.1** - Excel formátum
- ✅ **3.2** - Éves frissítés
- ✅ **3.5** - Csak Makita-nál van norma (SBM, Hikoki nincs)

### Pénzügy

- ✅ **4.1** - Kaució mindig kötelező (rövid/hosszú távú egyaránt)
- ✅ **4.3** - Egységes késedelmi díj minden szerződésnél

### Egyéb

- ✅ **5.1** - Nincs prioritási sorrend (mindhárom téma egyformán fontos)
- ✅ **6.1** - Gép csere lehetséges szerződés alatt
- ✅ **7.1.3** - **NEM kell user-szintű dashboard testreszabás** (csak admin által beállított fix layoutok)
- ✅ **7.2.1-7.2.4** - Riport követelmények (minden időtartam, többszintű bontás, összehasonlítás, KPI-k)
- ✅ **7.3.1-7.3.4** - Készlet riportok (minden szinten, mozgás, alert, kihasználtság)
- ✅ **7.7.1** - Export formátumok (PDF, Excel, CSV - mind kell)

---

## Következő Lépések

**Mai találkozó után:**

1. ✅ 11 tisztázott kérdés válaszaival frissítjük a dokumentumot
2. ✅ Elkészítjük a végleges követelmény specifikációt
3. ✅ Elkezdhetjük az ADR-ek (architektúra döntések) írását
4. ✅ Sprint planning - első fejlesztési sprint tervezése

**Kérdésetek van?** 😊

---

**Köszönjük a közös munkát!**
_MyForge Labs csapat_
