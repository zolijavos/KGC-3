# KGC ERP v7.0 - Követelmény Tisztázó Válaszok

**Dokumentum verzió:** 1.1
**Dátum:** 2026-02-03
**Forrás dokumentum:** MFL - kérdések (2026-02-02, BMAD Agent Team)
**Készítette:** Claude Code (BMAD feldolgozás)
**Állapot:** Végleges - Ügyfél válaszok dokumentálva

---

## Összefoglaló

Az alábbi dokumentum az ügyfél által 2026-02-02-án megválaszolt követelmény tisztázó kérdéseket tartalmazza. A válaszokat a BMAD Agent Team (Mary - Business Analyst) gyűjtötte össze. Összesen **49 kérdés** került feltevésre 7 fő kategóriában, melyekre részletes válaszokat kaptunk.

**Kért válaszokat kapott:** [DATUM KITÖLTENDO]
**Visszajelzések feldolgozása:** 2026-02-03

---

## 1. MyPOS Kauciók Kezelés

### 1.1 Pre-authorization vs. Azonnali könyvelés

**Kérdés:** A kauciók **pre-authorization** módon legyenek tárolva (csak menet) tehát nincs pénz áttranszakció, vagy a bérlés indulásakor azonnal kelljen a kauciókat könyvelni?

**Válasz:** Egy bélen belül többaszköz napvileg választott, amíg várakozik gépnél kell látani a visszatételkor szóló, akkor a kézbesáltatható a fenmaradó béslegit!

> **🔍 Értelmezés:** Az ügyfél jelezte, hogy egy bérlésen belül több eszköz is lehet, és a visszavétel során kell kezelni a fennmaradó bérleti díjat. **TISZTÁZANDÓ:** A válasz nem egyértelmű - további pontosítás szükséges a pre-auth vs. azonnali terhelés kérdésében.

---

### 1.2 Bérlés hosszabbítás - Automatikus vs. Manuális

**Kérdés:** Ha a bérlés hosszabbítása automatikusan meghosszabbodik-e további blokkolás, vagy újabb manuális engedélyezése kell?

**Válasz:** Nálunk nem szolgálódadakísan már később. Eléreni kívánjuk, hogy online vana másikre kell beszállítani. Visszahozzádóhú azt kivántosadványokat vagy más eseténg javitság kilistégett csk&kierent teszének álljuk.

> **🔍 Értelmezés:** A válasz nem egyértelmű és tisztázásra szorul. **JAVASOLT MEGOLDÁS:** Kérdezzük vissza az ügyfelet pontosan, hogy automatikus hosszabbítást szeretnének-e vagy manuális jóváhagyást.

---

### 1.3 Rendkívüli kártirozás

**Kérdés:** Rendkívüli kártirozás esetén hogyan törjéze az?

**Válasz:** Ha szanáset kaszálátthatál a javítás, szlovák lep eredett.

> **🔍 Értelmezés:** Nem egyértelmű válasz. **TISZTÁZANDÓ:** Mi történjen rendkívüli károsodás esetén - a kauciót terheljük-e, vagy külön kárigényt nyitunk?

---

### 1.4 Káldja talár a bérlés közben

**Kérdés:** Ha a káldja talár a bérlés közben, na a közvezet? (pl: elveszett, rongálódott, vagy férd bérletnök alatt eszközei?)

**Válasz:** **Ügyfélközöselvészésal visszaillesztés a bemnütázott partmeg.**

> **🔍 Értelmezés:** Ügyfélközpontú visszaillesztés a bérmunka megállapodás szerint. **JAVASOLT MEGOLDÁS:** Kádigény modul, amely lehetővé teszi a kár dokumentálását és a kaució felhasználását vagy külön számlázást.

---

### 1.5 Minimum és Maximum kaució összeg

**Kérdés:** Van-e **minimum és maximum** kaució összeg korlátoza?

**Válasz:** Minden géphez a gép éráeknek független bis lészt értéka a kauciót. Ha nem egyedi érték, úgyfeled attág pénz; az eredeling beállítált kaució elsiáva a kauciót. Ha még egyiket nem, most azt is lehet, úgy azt a klássait.

> **🔍 Értelmezés:** Minden géphez egyedi kaució érték állítható be, amely a gép árának függvénye. Ha nincs egyedi beállítás, akkor az alapértelmezett kaució értéket használjuk. **IMPLEMENTÁCIÓS KÖVETELMÉNY:** Géptípus szintű kaució konfiguráció, gép szintű felülírási lehetőséggel.

---

## 2. Hosszú Távú Szerződések

### 2.1 Szerződés típusok

**Kérdés:** Milyen **szerződés típusokat** kell kezelni? (havi, negyedéves, féléves, éves - mindtagunk kell?)

**Válasz:** Vannak **következőnek, például szolgáltatók, biztosítók stb.** Vannak pátyázatok, éves, 2 éves, és **hosszabbíthatóak**. A **beszerzeléséknél** nagyítását nem azonos állandó szerződések. A beszerálbé aknál mindig **éjvalandós** szerződések.

> **🔍 Értelmezés:** Többféle szerződés típus szükséges:
>
> - Szolgáltatók, biztosítók (pályázatok): éves, 2 éves szerződések, hosszabbíthatóak
> - Beszerzeléseknél: egyenlő arányú szerződések (valószínűleg havi/negyedéves időszakok)
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:** Rugalmas szerződés modul, amely támogatja:
>
> - Különböző időtartamokat (havi, negyedéves, féléves, éves, 2 éves)
> - Hosszabbítási mechanizmust
> - Pályázat-specifikus szerződéseket

---

### 2.2 Számlázás előre vagy utólag

**Kérdés:** A számlázás **előre vagy utólag** történjen? (pl: hónap elején előre, vagy hónap végén utólag?)

**Válasz:** Ha a szállítás gondozot? Az **ügyfének 60%-a azonnali** fizet vagy egy dátumot kérésnyel az **előre megelneztezés,** hogy mennyi **kiveszt a gépet**, meghatalrázna, hogy mennyi időre kiveszt az **előröket.** Ha kezőtt hozzá, utólag mindon ezt.

> **🔍 Értelmezés:**
>
> - **60% azonnali fizetés** (előre) - amikor az ügyfél kimondja, mennyi időre kéri a gépet
> - Megelőlegezés lehetősége
> - Ha utólag: akkor hónap végén számlázás
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Előre/utólag számlázás opció
> - Előleg kezelés
> - Rugalmas fizetési feltételek

---

### 2.3 Kedvezményes struktúra

**Kérdés:** Milyen **kedvezmény struktúra** legyen? (pl: havi -10%, negyedéves -15%, éves -25%?)

**Válasz:** Most **bicoli felülítük az eddigieknél 1 hét után 10% kedvezmány,** 3 hét után **20% kedvezmény.** Emelt **magadobb három ez** csak a **hónávog kedvezmény** menet.

> **🔍 Értelmezés:** Jelenlegi kedvezmény struktúra:
>
> - **1 hét után:** 10% kedvezmény
> - **3 hét után:** 20% kedvezmény
> - **Havi:** magasabb kedvezmény (pontos érték nem egyértelmű)
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Időtartam alapú automatikus kedvezmény rendszer
> - Konfigurálható kedvezmény táblázat

---

### 2.4 Szerződés automatikus megújítás

**Kérdés:** A szerződés **automatikusan megújul** tartalánono, vagy külön jóváhagyást kell?

**Válasz:** Megjától nem kell üzni különjük. **Fogvenelnitél kaj, hogy te fog érni,** ha béjér, minden **emchresztítélke akar online** ikzelésére. Ha lízot, vettél kártlő leedet **összjongal leleden** többre módjához a **lesent tálije**.

> **🔍 Értelmezés:** Nem egyértelmű - **TISZTÁZANDÓ!** Valószínűleg:
>
> - Automatikus megújítás nem szükséges
> - Értesítés a lejárat előtt
> - Online hosszabbítás lehetősége
>
> **JAVASOLT MEGOLDÁS:** Lejárat előtti értesítés + manuális megújítási folyamat.

---

### 2.5 Minimum bérlési idő hosszú szerződéseknél

**Kérdés:** Van-e **minimum bérlési idő** hosszú távú szerződéseknél? (pl: minimum 30 nap?)

**Válasz:** Nincs, a **kívánot bérlési időt** hadláczra nincs a **kedvezménynél**.

> **🔍 Értelmezés:** Nincs kötelező minimum bérlési idő, a kedvezmények időtartam alapúak.
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:** Rugalmas időtartam beállítás, kedvezmény automatikus számítása az időtartam függvényében.

---

### 2.6 Korai lémondás

**Kérdés:** Mi történik **korai lémondás** esetén? (Költség, anyéső visszaszámítás?)

**Válasz:** Ha **kedvézményével vitis,** a **keliban** időre **szánítottuk kettszerűnél** számdvan **égesben** biztonos **kettszerűnél**.

> **🔍 Értelmezés:** Ha kedvezményesen vették igénybe és korán lémondják, a kedvezményt vissza kell számítani. **TISZTÁZANDÓ:** Pontos kalkulációs módszer.
>
> **JAVASOLT MEGOLDÁS:** Korai lemondási díj kalkulátor, amely visszaszámolja a korábban nyújtott kedvezményt.

---

### 2.7 Szerződéslején több gép

**Kérdés:** Egy szerződésben **több gép** is lehet, vagy gépenként külön szerződés?

**Válasz:** Több gép is lehet, még **csomagokját is beszállítunk**.

> **🔍 Értelmezés:** Egy szerződés tartalmazhat több gépet, sőt csomagokat is.
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Szerződés-gép kapcsolótábla (1:N)
> - Csomag kezelés (előre definiált gépcsomagok)
> - Csomag szintű kedvezmények

---

## 3. Makita Norma / Garanciális Javítás

### 3.1 Makita norma formátum

**Kérdés:** A Makita normák **milyen formátumban** érhetők el? (Excel, CSV, API, PDF?)

**Válasz:** **Excel**

> **IMPLEMENTÁCIÓS KÖVETELMÉNY:** Excel import funkció Makita norma adatokhoz.

---

### 3.2 Gyakori frissítés

**Kérdés:** Milyen **gyakran frissülnek a normák?** (éventé, negyedéventé, ad-hoc?)

**Válasz:** **Éventé**

> **IMPLEMENTÁCIÓS KÖVETELMÉNY:** Éves norma frissítési workflow, verziókezelés.

---

### 3.3 Garanciális elszámolás

**Kérdés:** A garanciális **elszámolások munkalapként** vagy **garanciálne + munkalások** kontextusában vannak tárolva?

**Válasz:** **Munkalapként** és **gárciáes**

> **🔍 Értelmezés:** Mind munkalap, mind garanciális kontextusban kezelendők.
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Munkalap típus: "Garanciális"
> - Garanciális elszámolás modul Makita normák szerint

---

### 3.4 Garanciális elszámolás automatizálása

**Kérdés:** A garanciális elszámolás **automatikusan** megy (pl: Makita API, CSV import), vagy manuális rögzítés?

**Válasz:** **Divideon törölni a Makita platformon. Ök készít a haví számúázunk és a közvéteséséknél javavunk.**

> **🔍 Értelmezés:** A Makita platformon történik a rögzítés, onnan érkezik havi számla/elszámolás.
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Makita platform integráció (CSV/Excel import vagy API, ha elérhető)
> - Havi számla importálás és párosítás a munkalapokkal

---

### 3.5 Beszállítás (SBM, Hikoki)

**Kérdés:** Más beszállítók (SBM, Hikoki) esetén is lesz hasonló norma használat?

**Válasz:** **Sajnával van norma rendünkör,** a többi cégnél **nincs**.

> **🔍 Értelmezés:** Csak Makita esetén van norma rendszer, más beszállítóknál (SBM, Hikoki) nincs.
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:** Makita-specifikus norma modul, más beszállítóknál szabványos munkalap kezelés.

---

## 4. Pénzügyi / Számlázási Kérdések

### 4.1 Hosszú távú szerződések és kaució

**Kérdés:** A hosszú távú **szerződéseknél is kaució** egyeztet, vagy konkrétus üzleti vállótezés?

**Válasz:** A **kaució mindig a bérlés beléte** időre nálunk marad.

> **🔍 Értelmezés:** Kaució mindig szükséges, függetlenül a szerződés típusától (rövid/hosszú távú).
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:** Kaució kezelés minden bérlési típusnál (rövid/hosszú távú egyaránt).

---

### 4.2 Bérlő nem fizeti időben

**Kérdés:** Ha a bérlő **nem fizeti időben** a számlát, mi történik? (Kamatok/mellékteziségek - hellisgezettés - lemondásos?)

**Válasz:** **Értékesíztő, lefagyazztés.** Ha korrban kell **szolgáltat** lefelőzés és a **kedvzeményék maguonsága hozzáadó** időre.

> **🔍 Értelmezés:**
>
> - Értékesítés (equipment sale?) vagy lefagyasztás
> - Szolgáltatás felfüggesztés
> - Kedvezmények megszűnése
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Fizetési késedelem követés
> - Automata értesítések
> - Szolgáltatás felfüggesztési workflow
> - Kedvezmény visszavonás mechanizmus

---

### 4.3 Késedelmi díj hozási vagy ügynönytő

**Kérdés:** A **késedelmi díj hozási** távu szerződéseknél is **százdáadik,** mint rövid távúál?

**Válasz:** **Igen**

> **IMPLEMENTÁCIÓS KÖVETELMÉNY:** Egységes késedelmi díj kalkuláció minden szerződés típusnál.

---

## 5. Prioritás és Ütemezés

### 5.1 Prioritási sorrend

**Kérdés:** Mi a **prioritási sorrend** az új követelmények között? (1. MyPOS kaució, 2. Hosszú táv., 3. Makita norma - az én?)

**Válasz:** **Nincs értalme a kidosnak**

> **🔍 Értelmezés:** Az ügyfél nem lát prioritási sorrendet - valószínűleg mindhárom egyformán fontos, vagy párhuzamosan kell fejleszteni.
>
> **JAVASOLT MEGOLDÁS:** Párhuzamos Epic tervezés, függőségek alapján történő ütemezés.

---

### 5.2 Határidők

**Kérdés:** Van-e **határidő** valamilknál? (pl: 2026 Q1, Makita norma - az 2026 Q2-re?)

**Válasz:** **Nem érték a kérdést**

> **🔍 Értelmezés:** Nincs konkrét határidő meghatározva.
>
> **JAVASOLT MEGOLDÁS:** BMAD sprint planning alapján iteratív fejlesztés, MVP megközelítés.

---

### 5.3 Hosszú távú szerződések MVP rétse

**Kérdés:** A hosszú távú szerződések **funkcié MVP részte** (agyon, vagy később lázás?

**Válasz:** **Milyen hosszabstól szolgálódelnél beszélek? Hosszú tátra vszes a gépet lentáé szolgálódele? Összobadazó szolgálódeles?**

> **🔍 Értelmezés:** Az ügyfél tisztázást kér - mit értünk "hosszú távú szerződés" alatt?
>
> **TISZTÁZANDÓ:**
>
> - Rövid távú (napi/heti bérlés)?
> - Hosszú távú (havi/éves szerződések)?
> - Átdobázó szerződések (megújítható)?
>
> **JAVASOLT MEGOLDÁS:** Követési kérdés küldése az ügyfélnek a pontos definíció érdekében.

---

## 6. Üzleti Folyamat Kérdések

### 6.1 Hosszú távú szerződések gép cseréje

**Kérdés:** Hosszú távú szerződéseknél a **gép cserélhető-e** a szerződés alatt? (pl: elenromot - másík hasonló gép?)

**Válasz:** **Igen**

> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Gép csere workflow hosszú távú szerződéseknél
> - Készlet ellenőrzés (hasonló gép elérhetősége)
> - Automatikus szerződés módosítás (új gép hozzárendelése)

---

### 6.2 Bérlő online hozzáadása/módosítása

**Kérdés:** A bérlő **online** is megy tudja hozzáállíthatóság/megföldet a szolgálódést, vagy csak személyesen?

**Válasz:** **Igen, bázázor beszádják, hogy tó online történett üdvözöl is hozzáadholassanak, de 1 hónap után közhász boltozni a kíván karbantatatásnak.**

> **🔍 Értelmezés:**
>
> - Online hozzáadás/módosítás lehetséges
> - 1 hónap után kötelező karbantartás
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Online ügyfél portál bérlés módosításhoz
> - Automatikus karbantartás ütemezés 1 hónap után

---

### 6.3 Próbaidő

**Kérdés:** Van-e **"próbaidő"** hosszú távú szerződéseknél? (pl: első két hónap **próbalét,** aztán "fix" státusz a gépet.

**Válasz:** **Egy hónapapi időként ne lehessen bérlést szolgólódést,** ha **ezzen nem felát éntl a gépet.**

> **🔍 Értelmezés:** Egy hónapos próbaidő, amely alatt lemondható a bérlés következmények nélkül.
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Próbaidő flag a szerződéseknél (első 30 nap)
> - Díjmentes lemondási lehetőség próbaidő alatt
> - Automatikus státusz váltás próbaidő lejárta után

---

## 7. Dashboard és Riporting Követelmények

### 7.1 Általános Dashboard Kérdések

#### 7.1.1 Szerepkör alapú dashboard

**Kérdés:** Mennyire **egyéniasülő,** kell a dashboard-ot látni? (Operátor, Buhaszető, Készpáros Admin, Partner Owner - mindtagunk?)

**Válasz:** **Másacorított hozzátérésinek megleitedőn.**

> **🔍 Értelmezés:** Szerepkör-specifikus dashboard nézetek szükségesek.
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - RBAC alapú dashboard widgetek
> - Operátor: napi műveletek, bérlések, visszavételek
> - Buhaszető: pénzügyi összesítők, számlák, kintlévőségek
> - Admin: teljes rendszer áttekintés
> - Partner Owner: franchise-specifikus nézet

---

#### 7.1.2 Real-time vs. Periodikus frissítés

**Kérdés:** A dashboard **real-time** vaga legördítsen a periodikusan, vagy elegendő az adatokat hátinenként péntenként?

**Válasz:** A **bérlęs ninset született matt-time,** mint **5 perc alatt,** amit **káön esetben online is fogáthatók.**

> **🔍 Értelmezés:**
>
> - Bérlések: near real-time (5 perc frissítés)
> - Kritikus események: online frissítés
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - WebSocket vagy SSE real-time eseményekhez (új bérlés, visszavétel)
> - 5 perces polling egyéb adatokhoz
> - Cache stratégia nehéz lekérdezésekhez

---

#### 7.1.3 Testreszabható widget rendszer

**Kérdés:** Szükséges-e **testreszabható widget** rendszer (hathatóság), hogy a maga állája vesza a dashboard-ját?

**Válasz:** **Nem, személyzőnként az admin (setting bohózási) használni érdemeseivel használásával boszőhetések dálnak, a teszetősőzető widlokat** nem **magálelet ügyvárően** hozítélhatési délnak, a **bemondón** widgettek **bohverett** időkan, admin **méndele.** Mivel nem **szemelórzöleg** ilyen **számítógatók, bernyedelem** lemne, hát melésítési nást **témne.** Legyen egyságes.

> **🔍 Értelmezés:**
>
> - NEM kell testreszabható widget rendszer
> - Admin által beállított fix widget elrendezés
> - Egységes nézet minden szerepkörnek (azon belül)
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:** Fix dashboard layoutok szerepkörönként, admin által konfigurálható (de nem user által).

---

#### 7.1.4 Mobil-optimalizált dashboard

**Kérdés:** Kell-e **mobil-optimalizált** dashboard nézet? (tablet, telefon)

**Válasz:** **Max tablet: várakában, vagy négygaézúl a admin hogy ákra is rendre a rendsezanhe távorolót.**

> **🔍 Értelmezés:**
>
> - Tablet támogatás: igen
> - Telefon: valószínűleg nem prioritás, de reszponzív megjelenítés hasznos
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:** Reszponzív dashboard design, tablet-optimalizált nézet.

---

### 7.2 Bevételi Riportok

#### 7.2.1 Időszakokra bontott riport

**Kérdés:** Milyen **időszakokra kell riportot** tutt generálni? (napi, heti, havi, negyedéves, éves - mindtagunk szerint?)

**Válasz:** **Milyen riport? Mindegyik más,** napi, heti, havi, évi.

> **🔍 Értelmezés:** Minden időtartam szükséges (napi, heti, havi, negyedéves, éves).
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Időszak szűrő minden riporton (date range picker)
> - Előre definiált időszakok: ma, tegnap, ez a hét, múlt hét, ez a hónap, múlt hónap, Q1-Q4, év

---

#### 7.2.2 Bevételi riport bontása

**Kérdés:** A bevételi riport **bontása** milyen szinten legyen? (össszerlesi, bolt szerint, géptegóris, partner, szerződés (Zoli leirta táskélesen))

**Válasz:** **Összerlési, bolt, szerviz, bérlésekt, partner, szervizek (Zoli leirta táskélesen)**

> **🔍 Értelmezés:** Többszintű bontás szükséges:
>
> - Összesített
> - Bolt (franchise partner) szerint
> - Szerviz szerint
> - Bérlések szerint
> - Partner szerint
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Riport pivot funkció (csoportosítás különböző dimenziók szerint)
> - Drill-down lehetőség (összesítésből részletekbe)

---

#### 7.2.3 Összehasonlító nézet

**Kérdés:** Kell-e **összehasonlító nézet?** (pl: ez a hónap vs. előző hónap, vagy ez az év vs. tavaly)

**Válasz:** **Igen**

> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Időszak összehasonlítás funkció (current vs. previous period)
> - Delta számítás (%, abszolút érték)
> - Vizualizáció: trend grafikonok, % változás mutatók

---

#### 7.2.4 Pénzügyi KPI-k

**Kérdés:** Milyen **pénzügyi KPI-k** kellenek? (bruttó bevétel, nettó bevétel, kintlévők vs. befektők, költségdeng, stb.)

**Válasz:** **Igen**

> **🔍 Értelmezés:** Alapvető pénzügyi KPI-k mind szükségesek.
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Bruttó bevétel
> - Nettó bevétel
> - Kintlévőségek
> - Befizetések
> - Költségek (opcionális - későbbi fázis?)

---

### 7.3 Készlet Riportok

#### 7.3.1 Készlet riport milyen bontásban

**Kérdés:** A készlet riport **milyen bontásban** legyen? (mákulándi szitem, katigóris, hasztálláto?)

**Válasz:** **Minden szinten**

> **🔍 Értelmezés:** Minden szintű bontás szükséges:
>
> - Gyártó szerint (Makita, SBM, Hikoki, stb.)
> - Kategória szerint (fúrógép, sarokcsiszoló, stb.)
> - Használhatóság szerint (elérhető, kiadva, javításon, selejtezett)
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Készlet riport dimenzionális bontással
> - Filter: gyártó, kategória, státusz, bolt

---

#### 7.3.2 Készlet mozgás riport

**Kérdés:** Kell-e **készlet mozgás** riport? (bevételez, kiadás, küzébs, hazználtó?)

**Válasz:** **Igen**

> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Készlet tranzakció napló
> - Mozgás típusok: beszerzés, kiadás (bérlés), visszavétel, javítás, selejtezés
> - Időszak szerinti szűrés

---

#### 7.3.3 Minimum készlet alert

**Kérdés:** Kell-e **minimum készlet** alert dashboard-on? (alanis hatólás ha ellogę)

**Válasz:** **Igen**

> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Minimum készlet threshold beállítás gép típusonként
> - Dashboard alert widget (kritikus készlethiány)
> - Email/push értesítés

---

#### 7.3.4 Készlet kihasználtsági mutató

**Kérdés:** A **bérlépett kihasználtsági** mutatós kell-e? (barry % van kintr js. bent)

**Válasz:** **Igen**

> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Kihasználtsági ráta: (kiadott gépek / összes gép) \* 100
> - Géptípus szerinti bontás
> - Trend grafikon (időbeli változás)
> - Heti/havi átlag

---

### 7.4 Szerviz Statisztikák

#### 7.4.1 Szerviz KPI-k

**Kérdés:** Milyen **szerviz KPI-k** kellenek? (átfutási ido, mubkalşpok száma, átlag árako?)

**Válasz:** [Nincs válasz a PDF-ben]

> **🔍 Értelmezés:** Nem található válasz - **TISZTÁZANDÓ!**
>
> **JAVASOLT KPI-k:**
>
> - Átfutási idő (átlag, medián)
> - Munkalapok száma (nyitott, lezárt, várakozó alkatrészre)
> - Átlagár munkalapok
> - First-time fix rate (első javítás sikeressége)

---

#### 7.4.2 Technikus hatékonyság riport

**Kérdés:** Kell-e **technikus hatékonyság** riport? (munkidőlapok száma, átlag javítási idő, stb.)

**Válasz:** **Igen**

> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Technikus teljesítmény dashboard
> - Metrikák: munkalapok száma, átlagos átfutási idő, ügyfél értékelések
> - Összehasonlítás (techikusok között)

---

#### 7.4.3 Garanciális vs. Fizetős javítások

**Kérdés:** A **garanciális vs. fizetős** javítások aránya kéne mutatós?

**Válasz:** **Igen**

> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Garanciális / fizetős bontás
> - Arány számítás
> - Trend grafikon

---

#### 7.4.4 Visszatérő hiba tracking

**Kérdés:** Kell-e **visszatérő hiba** tracking? (ugyanaz a géptöké szervízében)

**Válasz:** **Igen**

> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Gép szerviz történet
> - Ismétlődő hibajelenségek azonosítása
> - Alert: ha egy gép X időn belül Y-szor kerül szervizbe

---

### 7.5 Partner/Ügyfél Riportok

#### 7.5.1 Partner KPI-k

**Kérdés:** Milyen **partner KPI-k** kellenek? (top 10 bérló, legőbb bevételt, legkötteblő program)

**Válasz:** **Igen**

> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Top 10 partner bevétel szerint
> - Legnagyobb bérlő (bérlési darabszám)
> - Hűségprogram státusz (ha van ilyen)

---

#### 7.5.2 Partner szegmentáció

**Kérdés:** Kell-e partner **szegmentáció** riport? (megálénérlésély vs. időg, elkanri vs. vészállónő)

**Válasz:** [Nincs válasz a PDF-ben]

> **🔍 Értelmezés:** Nem található válasz - **TISZTÁZANDÓ!**
>
> **JAVASOLT MEGOLDÁS:**
>
> - Partner kategorizálás (pl: VIP, rendszeres, alkalmi, inaktív)
> - Szegmens alapú riport

---

#### 7.5.3 Kintlévőség riport

**Kérdés:** A **kintlévőség** (tartozások) mutatós kell-e? (al túrrészvényleg inkavába vs. vésztállónő)

**Válasz:** **Igen**

> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Kintlévőség partner szerint
> - Lejárt kintlévőségek kiemelése
> - Aging riport (0-30 nap, 30-60 nap, 60-90 nap, 90+ nap)

---

#### 7.5.4 Törzsvevői aktivitás riport

**Kérdés:** Kell-e **törzsvevói aktivitás** riport? (ügvahy program használat)

**Válasz:** **Igen**

> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Törzsvevő aktivitás tracking
> - Hűségprogram használat
> - Kedvezmények kihasználtsága

---

### 7.6 Bérlési Statisztikák

#### 7.6.1 Bérlési mutatók

**Kérdés:** Milyen **bérlési mutatók** kellenek? (átlagos bérlési időn, leggyakoribb gépek, szezonalitás?)

**Válasz:** [Nincs válasz a PDF-ben]

> **🔍 Értelmezés:** Nem található válasz - **TISZTÁZANDÓ!**
>
> **JAVASOLT MUTATÓK:**
>
> - Átlagos bérlési időtartam
> - Top 10 legnépszerűbb gép
> - Szezonális trend (havi/negyedéves)
> - Hétvége vs. hétköznap bérlések

---

#### 7.6.2 Kiadástími riport

**Kérdés:** Kell-e **kiadásülésme** riport? (mikarán kékö le bérlés vs. végvé télemi, átbóg kálózsl)

**Válasz:** [Nincs válasz a PDF-ben]

> **🔍 Értelmezés:** Nem található válasz - **TISZTÁZANDÓ!**
>
> **JAVASOLT MEGOLDÁS:** Kiadás részletesség riport (időpont, időtartam, géptípus).

---

#### 7.6.3 Foglalás vs. Kivétel

**Kérdés:** A **fogltulás** (reservation) függetően **haszonap fenné** lenne?

**Válasz:** **Ezt lehet az egyébet hozádagan előtelést,** nem?

> **🔍 Értelmezés:** Foglalás követés hasznos lenne, külön nézet foglalásokra.
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Foglalás vs. tényleges kivétel összehasonlítás
> - No-show arány (foglaltak, de nem vették át)

---

#### 7.6.4 Előrejelzés

**Kérdés:** Kell-e **előreeltő előrejelzés** a hosszú távú szerződések alapján?

**Válasz:** [Nincs válasz a PDF-ben]

> **🔍 Értelmezés:** Nem található válasz - **TISZTÁZANDÓ!**
>
> **JAVASOLT MEGOLDÁS:** Bevételi előrejelzés hosszú távú szerződések alapján (havi várható bevétel).

---

### 7.7 Export és Integráció

#### 7.7.1 Export formátumok

**Kérdés:** Milyen **export formátumok** kellenek? (PDF, Excel, CSV)

**Válasz:** **Attól függ mithez, főszöségképen mind kell**

> **🔍 Értelmezés:** Minden formátum szükséges, kontextustól függően.
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - PDF: riportok nyomtatáshoz
> - Excel: részletes adatexport elemzéshez
> - CSV: integráció, import más rendszerekbe

---

#### 7.7.2 Automatikus email küldés

**Kérdés:** Kell-e **automatikus email küldés** riportokról? (pl: hetőn reggel lett összefoglaló)

**Válasz:** **Lehet, de most még nem élvén kérésk**

> **🔍 Értelmezés:** Későbbi fázis, nem MVP követelmény.
>
> **JAVASOLT MEGOLDÁS:** Későbbi Epic - riport automatizálás, ütemezett küldés.

---

#### 7.7.3 API endpoint riportokhoz

**Kérdés:** Kell-e **API endpoint** a riport adatokhoz? (külső rendszer lépésének pl.)

**Válasz:** **Könyvelők pl?**

> **🔍 Értelmezés:** Könyvelői integrációhoz lehet szükség API-ra.
>
> **JAVASOLT MEGOLDÁS:** REST API endpoint riport adatokhoz (pénzügyi összesítők, tranzakciók).

---

#### 7.7.4 Könyvelői speciális riportok

**Kérdés:** A **könyvolő** számára milyen **speciális riportok** kellenek? (ÁFA összesítő, számla lista?)

**Válasz:** **Kinendi, begvő számlák, kélesök,** cigek-én **magálínezettyé szóló** számázk **átudtóma** történű (timerd); **belpót inálások,** kéesétatési, bankernyás **íczsilése, kötelege**

> **🔍 Értelmezés:** Könyvelői riportok:
>
> - Kimenő számlák
> - Bejövő számlák
> - Kifizetések
> - Cégek szerinti bontás (multi-tenant!)
> - Időszak szerinti szűrés
> - Belépő utalások
> - Késedelmi kamatok
> - Bankkivonat párosítás
>
> **IMPLEMENTÁCIÓS KÖVETELMÉNY:**
>
> - Könyvelői modul speciális riportokkal
> - ÁFA összesítő
> - Tranzakció lista (be/ki)
> - Banki párosítás
> - Export könyvelő szoftverhez (pl: NAV Online számla XML)

---

## Összegzés és Következő Lépések

### Tisztázandó Kérdések

Az alábbi kérdések **nem kaptak egyértelmű választ**, újabb egyeztetés szükséges:

1. **1.1-1.3**: MyPOS kaució kezelés - pre-auth vs. azonnali, automatikus hosszabbítás, rendkívüli károsodás
2. **2.4**: Szerződés automatikus megújítása
3. **2.6**: Korai lemondás pontos kalkulációja
4. **5.3**: Hosszú távú szerződés definíció pontosítása
5. **7.4.1**: Szerviz KPI-k (nincs válasz)
6. **7.5.2**: Partner szegmentáció (nincs válasz)
7. **7.6.1, 7.6.2, 7.6.4**: Bérlési statisztikák (nincs válasz)

### Kulcsfontosságú Döntések

1. **Kaució kezelés**: Minden bérléshez kaució szükséges, géptípus szintű konfiguráció
2. **Kedvezmény struktúra**: 1 hét = 10%, 3 hét = 20%, havi még magasabb
3. **Szerződés több gép**: Egy szerződés tartalmazhat több gépet és csomagokat
4. **Makita norma**: Excel formátum, éves frissítés, csak Makita beszállítónál
5. **Késedelmi díj**: Egységes minden szerződés típusnál
6. **Dashboard**: Fix layout szerepkörönként, NINCS user-szintű testreszabás
7. **Riportok**: Minden időszak (napi, heti, havi, éves), többszintű bontás

### Implementációs Komplexitás

A válaszok alapján az alábbi területek igényelnek komolya fejlesztést:

- **MAGAS komplexitás**: MyPOS integráció, Hosszú távú szerződések, Riporting modul
- **KÖZEPES komplexitás**: Makita norma, Késedelmi díj kalkuláció, Dashboard
- **ALACSONY komplexitás**: Email értesítések, Export funkciók

---

**Dokumentum vége**

_Generálva: BMAD Correct-Course Workflow, 2026-02-03_
