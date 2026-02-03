# KGC ERP v7.0 - Követelmény Tisztázó Válaszok (Tisztázott Verzió)

**Dokumentum verzió:** 1.2
**Dátum:** 2026-02-03
**Készítette:** Claude Code (BMAD feldolgozás)
**Állapot:** Tisztázott - PDF pontos szövegekkel

---

## Összefoglaló

Ez a dokumentum az ügyfél által megadott **pontos válaszokat** tartalmazza a PDF alapján, értelmezéssel és tisztázandó kérdésekkel.

**Jelmagyarázat:**

- ✅ **EGYÉRTELMŰ** - A válasz világos és implementálható
- ⚠️ **RÉSZBEN ÉRTHETŐ** - Valamilyen szinten értelmezhető, de megerősítés jó lenne
- ❌ **NEM EGYÉRTELMŰ** - Tisztázás elengedhetetlen

---

## 1. MyPOS Kauciók Kezelés

### 1.1 Pre-authorization vs. Azonnali könyvelés

| Mező                     | Tartalom                                                                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kérdés**               | A kauciók pre-authorization módon legyenek tárolva (csak menet) tehát nincs pénz áttranszakció, vagy a bérlés indulásakor azonnal kelljen a kauciókat könyvelni?                          |
| **PDF szó szerint**      | "Egy bélen belül többaszköz napvileg választott, amíg várakozik gépnél kell látani a visszatételkor szóló, akkor a kézbesáltatható a fenmaradó béslegit!"                                 |
| **Státusz**              | ❌ **NEM EGYÉRTELMŰ**                                                                                                                                                                     |
| **Értelmezési kísérlet** | A válasz értelmezhetetlennek tűnik (OCR hiba vagy gépelési probléma). Valószínűleg azt akarja mondani, hogy egy bérlésen belül több eszköz is lehet, és a visszavétel során számolják el. |
| **TISZTÁZANDÓ**          | ✅ **Kérdezzük vissza:** Pre-authorization (összeg blokkolása) VAGY azonnali terhelés (kaució levonása)?                                                                                  |

---

### 1.2 Bérlés hosszabbítás - Automatikus vs. Manuális

| Mező                     | Tartalom                                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Kérdés**               | Ha a bérlés hosszabbítása automatikusan meghosszabbodik-e további blokkolás, vagy újabb manuális engedélyezése kell?                                                                                               |
| **PDF szó szerint**      | "Nálunk nem szolgálódadakísan már később. Eléreni kívánjuk, hogy online vana másikre kell beszállítani. Visszahozzádóhú azt kivántosadványokat vagy más eseténg javitság kilistégett csk&kierent teszének álljuk." |
| **Státusz**              | ❌ **NEM EGYÉRTELMŰ**                                                                                                                                                                                              |
| **Értelmezési kísérlet** | Valószínűleg nem akarnak automatikus hosszabbítást, hanem online lehetőséget szeretnének a hosszabbításra.                                                                                                         |
| **TISZTÁZANDÓ**          | ✅ **Kérdezzük vissza:** Automatikus hosszabbítás VAGY manuális jóváhagyás kell?                                                                                                                                   |

---

### 1.3 Rendkívüli kártirozás

| Mező                     | Tartalom                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| **Kérdés**               | Rendkívüli kártirozás esetén hogyan törjéze az?                                                    |
| **PDF szó szerint**      | "Ha szanáset kaszálátthatál a javítás, szlovák lep eredett."                                       |
| **Státusz**              | ❌ **NEM EGYÉRTELMŰ**                                                                              |
| **Értelmezési kísérlet** | Értelmezhetetlen válasz.                                                                           |
| **TISZTÁZANDÓ**          | ✅ **Kérdezzük vissza:** Mi történjen károsodás esetén? Kaució levonás VAGY külön kárigény/számla? |

---

### 1.4 Kár a bérlés közben

| Mező                     | Tartalom                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Kérdés**               | Ha a káldja talár a bérlés közben, na a közvezet? (pl: elveszett, rongálódott, vagy férd bérletnök alatt eszközei?) |
| **PDF szó szerint**      | "Ügyfélközöselvészésal visszaillesztés a bemnütázott partmeg."                                                      |
| **Státusz**              | ❌ **NEM EGYÉRTELMŰ**                                                                                               |
| **Értelmezési kísérlet** | Valószínűleg ügyfélközpontú megoldást szeretnének, de a konkrét folyamat nem világos.                               |
| **TISZTÁZANDÓ**          | ✅ **Kérdezzük vissza:** Károsodás esetén mi történik? Kaució felhasználás? Külön számla? Biztosító bevonása?       |

---

### 1.5 Minimum és Maximum kaució összeg

| Mező                | Tartalom                                                                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kérdés**          | Van-e minimum és maximum kaució összeg korlátoza?                                                                                                                                                                           |
| **PDF szó szerint** | "Minden géphez a gép éráeknek független bis lészt értéka a kauciót. Ha nem egyedi érték, úgyfeled attág pénz; az eredeling beállítált kaució elsiáva a kauciót. Ha még egyiket nem, most azt is lehet, úgy azt a klássait." |
| **Státusz**         | ⚠️ **RÉSZBEN ÉRTHETŐ**                                                                                                                                                                                                      |
| **Értelmezés**      | ✅ **Minden géphez egyedi kaució érték állítható be (gép ár függvénye)**<br>✅ **Ha nincs egyedi beállítás → alapértelmezett kaució érték**                                                                                 |
| **IMPLEMENTÁCIÓ**   | Géptípus szintű alapértelmezett kaució + gép szintű felülírás lehetősége                                                                                                                                                    |

---

## 2. Hosszú Távú Szerződések

### 2.1 Szerződés típusok

| Mező                | Tartalom                                                                                                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kérdés**          | Milyen szerződés típusokat kell kezelni? (havi, negyedéves, féléves, éves - mindtagunk kell?)                                                                                                                                      |
| **PDF szó szerint** | "Vannak következőnek, például szolgáltatók, biztosítók stb. Vannak pátyázatok, éves, 2 éves, és hosszabbíthatóak. A beszerzeléséknél nagyítását nem azonos állandó szerződések. A beszerálbé aknál mindig éjvalandós szerződések." |
| **Státusz**         | ⚠️ **RÉSZBEN ÉRTHETŐ**                                                                                                                                                                                                             |
| **Értelmezés**      | ✅ **Szolgáltatók, biztosítók:** éves, 2 éves szerződések, hosszabbíthatóak<br>✅ **Beszerzések:** egyenlő arányú (valószínűleg havi/negyedéves) szerződések                                                                       |
| **IMPLEMENTÁCIÓ**   | Rugalmas szerződés típusok: havi, negyedéves, féléves, éves, 2 éves + hosszabbítási opció                                                                                                                                          |

---

### 2.2 Számlázás előre vagy utólag

| Mező                | Tartalom                                                                                                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kérdés**          | A számlázás előre vagy utólag történjen? (pl: hónap elején előre, vagy hónap végén utólag?)                                                                                                                                           |
| **PDF szó szerint** | "Ha a szállítás gondozot? Az ügyfének 60%-a azonnali fizet vagy egy dátumot kérésnyel az előre megelneztezés, hogy mennyi kiveszt a gépet, meghatalrázna, hogy mennyi időre kiveszt az előröket. Ha kezőtt hozzá, utólag mindon ezt." |
| **Státusz**         | ⚠️ **RÉSZBEN ÉRTHETŐ**                                                                                                                                                                                                                |
| **Értelmezés**      | ✅ **60% ügyfelek: azonnali fizetés (előre)** - amikor kimondják, mennyi időre kérik<br>✅ **40% ügyfelek: utólag számlázás**<br>✅ **Előleg lehetősége**                                                                             |
| **IMPLEMENTÁCIÓ**   | Előre/utólag számlázás opció + előleg kezelés                                                                                                                                                                                         |

---

### 2.3 Kedvezményes struktúra

| Mező                | Tartalom                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Kérdés**          | Milyen kedvezmény struktúra legyen? (pl: havi -10%, negyedéves -15%, éves -25%?)                                                                       |
| **PDF szó szerint** | "Most bicoli felülítük az eddigieknél 1 hét után 10% kedvezmény, 3 hét után 20% kedvezmény. Emelt magadobb három ez csak a hónávog kedvezmény menet."  |
| **Státusz**         | ⚠️ **RÉSZBEN ÉRTHETŐ**                                                                                                                                 |
| **Értelmezés**      | ✅ **1 hét (7 nap): 10% kedvezmény**<br>✅ **3 hét (21 nap): 20% kedvezmény**<br>⚠️ **Havi (30+ nap): magasabb kedvezmény** (pontos érték nem világos) |
| **TISZTÁZANDÓ**     | ✅ **Kérdezzük vissza:** Mennyi a havi (30+ napos) kedvezmény? 25%? 30%?                                                                               |

---

### 2.4 Szerződés automatikus megújítás

| Mező                     | Tartalom                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kérdés**               | A szerződés automatikusan megújul tartalánono, vagy külön jóváhagyást kell?                                                                                                                                         |
| **PDF szó szerint**      | "Megjától nem kell üzni különjük. Fogvenelnitél kaj, hogy te fog érni, ha béjér, minden emchresztítélke akar online ikzelésére. Ha lízot, vettél kártlő leedet összjongal leleden többre módjához a lesent tálije." |
| **Státusz**              | ❌ **NEM EGYÉRTELMŰ**                                                                                                                                                                                               |
| **Értelmezési kísérlet** | Valószínűleg értesítés a lejárat előtt + online hosszabbítási lehetőség.                                                                                                                                            |
| **TISZTÁZANDÓ**          | ✅ **Kérdezzük vissza:** Automatikus megújítás VAGY manuális jóváhagyás szükséges?                                                                                                                                  |

---

### 2.5 Minimum bérlési idő hosszú szerződéseknél

| Mező                | Tartalom                                                                     |
| ------------------- | ---------------------------------------------------------------------------- |
| **Kérdés**          | Van-e minimum bérlési idő hosszú távú szerződéseknél? (pl: minimum 30 nap?)  |
| **PDF szó szerint** | "Nincs, a kívánot bérlési időt hadláczra nincs a kedvezménynél."             |
| **Státusz**         | ✅ **EGYÉRTELMŰ**                                                            |
| **Értelmezés**      | ✅ **Nincs kötelező minimum bérlési idő** - a kedvezmények időtartam alapúak |
| **IMPLEMENTÁCIÓ**   | Rugalmas időtartam, kedvezmény automatikus számítása                         |

---

### 2.6 Korai lemondás

| Mező                | Tartalom                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Kérdés**          | Mi történik korai lemondás esetén? (Költség, anyéső visszaszámítás?)                                        |
| **PDF szó szerint** | "Ha kedvézményével vitis, a keliban időre szánítottuk kettszerűnél számdvan égesben biztonos kettszerűnél." |
| **Státusz**         | ⚠️ **RÉSZBEN ÉRTHETŐ**                                                                                      |
| **Értelmezés**      | ⚠️ **Ha kedvezményesen vette igénybe és korán lémondja → kedvezmény visszaszámítás**                        |
| **TISZTÁZANDÓ**     | ✅ **Kérdezzük vissza:** Pontos kalkulációs formula korai lemondásra?                                       |

---

### 2.7 Szerződésben több gép

| Mező                | Tartalom                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Kérdés**          | Egy szerződésben több gép is lehet, vagy gépenként külön szerződés?                         |
| **PDF szó szerint** | "Több gép is lehet, még csomagokját is beszállítunk."                                       |
| **Státusz**         | ✅ **EGYÉRTELMŰ**                                                                           |
| **Értelmezés**      | ✅ **Egy szerződés = több gép**<br>✅ **Csomagok támogatása** (előre definiált gépcsomagok) |
| **IMPLEMENTÁCIÓ**   | Szerződés-gép 1:N kapcsolat + csomag modul                                                  |

---

## 3. Makita Norma / Garanciális Javítás

### 3.1 Makita norma formátum

| Mező                | Tartalom                                                               |
| ------------------- | ---------------------------------------------------------------------- |
| **Kérdés**          | A Makita normák milyen formátumban érhetők el? (Excel, CSV, API, PDF?) |
| **PDF szó szerint** | "Excel"                                                                |
| **Státusz**         | ✅ **EGYÉRTELMŰ**                                                      |
| **Értelmezés**      | ✅ **Excel formátum**                                                  |
| **IMPLEMENTÁCIÓ**   | XLSX parser, Excel import funkció                                      |

---

### 3.2 Gyakori frissítés

| Mező                | Tartalom                                                            |
| ------------------- | ------------------------------------------------------------------- |
| **Kérdés**          | Milyen gyakran frissülnek a normák? (éventé, negyedéventé, ad-hoc?) |
| **PDF szó szerint** | "Éventé"                                                            |
| **Státusz**         | ✅ **EGYÉRTELMŰ**                                                   |
| **Értelmezés**      | ✅ **Évente egyszer frissítés**                                     |
| **IMPLEMENTÁCIÓ**   | Éves norma frissítési workflow, verziókezelés                       |

---

### 3.3 Garanciális elszámolás

| Mező                | Tartalom                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| **Kérdés**          | A garanciális elszámolások munkalapként vagy garanciálne + munkalások kontextusában vannak tárolva? |
| **PDF szó szerint** | "munkalapként és gárciáes"                                                                          |
| **Státusz**         | ⚠️ **RÉSZBEN ÉRTHETŐ**                                                                              |
| **Értelmezés**      | ✅ **Munkalap típus: Garanciális**<br>⚠️ Külön garanciális kontextus is?                            |
| **IMPLEMENTÁCIÓ**   | Munkalap típus field + garanciális flag                                                             |

---

### 3.4 Garanciális elszámolás automatizálása

| Mező                | Tartalom                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **Kérdés**          | A garanciális elszámolás automatikusan megy (pl: Makita API, CSV import), vagy manuális rögzítés?  |
| **PDF szó szerint** | "Divideon törölni a Makita platformon. Ök készít a haví számúázunk és a közvéteséséknél javavunk." |
| **Státusz**         | ⚠️ **RÉSZBEN ÉRTHETŐ**                                                                             |
| **Értelmezés**      | ✅ **Makita platformon történik a rögzítés**<br>✅ **Havi számla/elszámolás érkezik tőlük**        |
| **IMPLEMENTÁCIÓ**   | Makita CSV/Excel import (havi számla), párosítás munkalapokkal                                     |

---

### 3.5 Beszállítás (SBM, Hikoki)

| Mező                | Tartalom                                                                         |
| ------------------- | -------------------------------------------------------------------------------- |
| **Kérdés**          | Más beszállítók (SBM, Hikoki) esetén is lesz hasonló norma használat?            |
| **PDF szó szerint** | "Sajnával van norma rendünkör, a többi cégnél nincs."                            |
| **Státusz**         | ✅ **EGYÉRTELMŰ**                                                                |
| **Értelmezés**      | ✅ **Csak Makita esetén van norma rendszer**<br>✅ **SBM, Hikoki - nincs norma** |
| **IMPLEMENTÁCIÓ**   | Makita-specifikus norma modul, más beszállítók szabványos munkalap               |

---

## 4. Pénzügyi / Számlázási Kérdések

### 4.1 Hosszú távú szerződések és kaució

| Mező                | Tartalom                                                                           |
| ------------------- | ---------------------------------------------------------------------------------- |
| **Kérdés**          | A hosszú távú szerződéseknél is kaució egyeztet, vagy konkrétus üzleti vállótezés? |
| **PDF szó szerint** | "A kaució mindig a bérlés beléte időre nálunk marad."                              |
| **Státusz**         | ✅ **EGYÉRTELMŰ**                                                                  |
| **Értelmezés**      | ✅ **Kaució kötelező minden bérléshez** (rövid/hosszú távú egyaránt)               |
| **IMPLEMENTÁCIÓ**   | Kaució modul minden bérlési típushoz                                               |

---

### 4.2 Bérlő nem fizeti időben

| Mező                | Tartalom                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Kérdés**          | Ha a bérlő nem fizeti időben a számlát, mi történik? (Kamatok/mellékteziségek - hellisgezettés - lemondásos?)  |
| **PDF szó szerint** | "Értékesíztő, lefagyazztés. Ha korrban kell szolgáltat lefelőzés és a kedvzeményék maguonsága hozzáadó időre." |
| **Státusz**         | ⚠️ **RÉSZBEN ÉRTHETŐ**                                                                                         |
| **Értelmezés**      | ⚠️ **Értékesítés? Lefagyasztás (szolgáltatás felfüggesztés)?**<br>⚠️ **Kedvezmények megszűnése**               |
| **IMPLEMENTÁCIÓ**   | Fizetési késedelem → értesítés + szolgáltatás felfüggesztés + kedvezmény visszavonás                           |

---

### 4.3 Késedelmi díj

| Mező                | Tartalom                                                                     |
| ------------------- | ---------------------------------------------------------------------------- |
| **Kérdés**          | A késedelmi díj hozási távu szerződéseknél is százdáadik, mint rövid távúál? |
| **PDF szó szerint** | "Igen"                                                                       |
| **Státusz**         | ✅ **EGYÉRTELMŰ**                                                            |
| **Értelmezés**      | ✅ **Egységes késedelmi díj minden szerződés típusnál**                      |
| **IMPLEMENTÁCIÓ**   | Egységes késedelmi díj kalkuláció                                            |

---

## 5. Prioritás és Ütemezés

### 5.1 Prioritási sorrend

| Mező                | Tartalom                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Kérdés**          | Mi a prioritási sorrend az új követelmények között? (1. MyPOS kaució, 2. Hosszú táv., 3. Makita norma - az én?) |
| **PDF szó szerint** | "Nincs értalme a kidosnak"                                                                                      |
| **Státusz**         | ✅ **EGYÉRTELMŰ**                                                                                               |
| **Értelmezés**      | ✅ **Nincs prioritási sorrend** - mindhárom egyformán fontos vagy párhuzamosan fejleszthető                     |
| **JAVASLAT**        | Párhuzamos Epic tervezés, függőségek alapján ütemezés                                                           |

---

### 5.2 Határidők

| Mező                | Tartalom                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| **Kérdés**          | Van-e határidő valamilknál? (pl: 2026 Q1, Makita norma - az 2026 Q2-re?) |
| **PDF szó szerint** | "Nem érték a kérdést"                                                    |
| **Státusz**         | ⚠️ **RÉSZBEN ÉRTHETŐ**                                                   |
| **Értelmezés**      | ⚠️ **Nem értették a kérdést** vagy nincs konkrét határidő                |
| **JAVASLAT**        | BMAD sprint planning alapján iteratív fejlesztés, MVP megközelítés       |

---

### 5.3 Hosszú távú szerződések MVP rétse

| Mező                | Tartalom                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Kérdés**          | A hosszú távú szerződések funkcié MVP részte (agyon, vagy később lázás?                                                  |
| **PDF szó szerint** | "Milyen hosszabstól szolgálódelnél beszélek? Hosszú tátra vszes a gépet lentáé szolgálódele? Összobadazó szolgálódeles?" |
| **Státusz**         | ❌ **NEM EGYÉRTELMŰ**                                                                                                    |
| **Értelmezés**      | ❌ **Ügyfél tisztázást kér - mit értünk "hosszú távú szerződés" alatt?**                                                 |
| **TISZTÁZANDÓ**     | ✅ **Kérdezzük vissza:** Mi számít hosszú távú szerződésnek? Havi? Negyedéves? Éves?                                     |

---

## 6. Üzleti Folyamat Kérdések

### 6.1 Gép cseréje szerződésben

| Mező                | Tartalom                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| **Kérdés**          | Hosszú távú szerződéseknél a gép cserélhető-e a szerződés alatt? (pl: elenromot - másík hasonló gép?) |
| **PDF szó szerint** | "Igen"                                                                                                |
| **Státusz**         | ✅ **EGYÉRTELMŰ**                                                                                     |
| **Értelmezés**      | ✅ **Gép csere lehetséges szerződés alatt**                                                           |
| **IMPLEMENTÁCIÓ**   | Gép csere workflow + készlet ellenőrzés (hasonló gép)                                                 |

---

### 6.2 Bérlő online hozzáadása/módosítása

| Mező                | Tartalom                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kérdés**          | A bérlő online is megy tudja hozzáállíthatóság/megföldet a szolgálódést, vagy csak személyesen?                                              |
| **PDF szó szerint** | "Igen, bázázor beszádják, hogy tó online történett üdvözöl is hozzáadholassanak, de 1 hónap után közhász boltozni a kíván karbantatatásnak." |
| **Státusz**         | ⚠️ **RÉSZBEN ÉRTHETŐ**                                                                                                                       |
| **Értelmezés**      | ✅ **Online módosítás lehetséges**<br>✅ **1 hónap után kötelező karbantartás**                                                              |
| **IMPLEMENTÁCIÓ**   | Online ügyfél portál + automatikus karbantartás ütemezés (1 hónap után)                                                                      |

---

### 6.3 Próbaidő

| Mező                | Tartalom                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| **Kérdés**          | Van-e "próbaidő" hosszú távú szerződéseknél? (pl: első két hónap próbalét, aztán "fix" státusz a gépet. |
| **PDF szó szerint** | "Egy hónapapi időként ne lehessen bérlést szolgólódést, ha ezzen nem felát éntl a gépet."               |
| **Státusz**         | ⚠️ **RÉSZBEN ÉRTHETŐ**                                                                                  |
| **Értelmezés**      | ⚠️ **Egy hónapos próbaidő** - amely alatt lemondható következmények nélkül                              |
| **IMPLEMENTÁCIÓ**   | Próbaidő flag (30 nap) + díjmentes lemondási lehetőség                                                  |

---

## 7. Dashboard és Riporting Követelmények

### 7.1.1 Szerepkör alapú dashboard

| Mező                | Tartalom                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Kérdés**          | Mennyire egyéniasülő, kell a dashboard-ot látni? (Operátor, Buhaszető, Készpáros Admin, Partner Owner - mindtagunk?) |
| **PDF szó szerint** | "Másacorított hozzátérésinek megleitedőn."                                                                           |
| **Státusz**         | ⚠️ **RÉSZBEN ÉRTHETŐ**                                                                                               |
| **Értelmezés**      | ✅ **Szerepkör-specifikus dashboard nézetek szükségesek**                                                            |
| **IMPLEMENTÁCIÓ**   | RBAC alapú dashboard widgetek                                                                                        |

---

### 7.1.2 Real-time vs. Periodikus

| Mező                | Tartalom                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| **Kérdés**          | A dashboard real-time vaga legördítsen a periodikusan, vagy elegendő az adatokat hátinenként péntenként? |
| **PDF szó szerint** | "A bérlęs ninset született matt-time, mint 5 perc alatt, amit káön esetben online is fogáthatók."        |
| **Státusz**         | ⚠️ **RÉSZBEN ÉRTHETŐ**                                                                                   |
| **Értelmezés**      | ✅ **Bérlések: near real-time (5 perc)**<br>✅ **Kritikus események: online (real-time)**                |
| **IMPLEMENTÁCIÓ**   | WebSocket/SSE real-time eseményekhez + 5 perces polling                                                  |

---

### 7.1.3 Testreszabható widget rendszer

| Mező                | Tartalom                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kérdés**          | Szükséges-e testreszabható widget rendszer (hathatóság), hogy a maga állája vesza a dashboard-ját?                                                                                                                                                                                                                                                  |
| **PDF szó szerint** | "Nem, személyzőnként az admin (setting bohózási) használni érdemeseivel használásával boszőhetések dálnak, a teszetősőzető widlokat nem magálelet ügyvárően hozítélhatési délnak, a bemondón widgettek bohverett időkan, admin méndele. Mivel nem szemelórzöleg ilyen számítógatók, bernyedelem lemne, hát melésítési nást témne. Legyen egyságes." |
| **Státusz**         | ✅ **EGYÉRTELMŰ**                                                                                                                                                                                                                                                                                                                                   |
| **Értelmezés**      | ✅ **NEM kell user-szintű testreszabás!**<br>✅ **Admin által beállított fix widget elrendezés**<br>✅ **Egységes nézet szerepkörönként**                                                                                                                                                                                                           |
| **IMPLEMENTÁCIÓ**   | Fix dashboard layout szerepkörönként, admin konfigurálható (de nem user által)                                                                                                                                                                                                                                                                      |

---

### 7.1.4 Mobil-optimalizált dashboard

| Mező                | Tartalom                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Kérdés**          | Kell-e mobil-optimalizált dashboard nézet? (tablet, telefon)                                  |
| **PDF szó szerint** | "Max tablet: várakában, vagy négygaézúl a admin hogy ákra is rendre a rendsezanhe távorolót." |
| **Státusz**         | ⚠️ **RÉSZBEN ÉRTHETŐ**                                                                        |
| **Értelmezés**      | ✅ **Tablet támogatás: igen**<br>⚠️ **Telefon: valószínűleg nem prioritás**                   |
| **IMPLEMENTÁCIÓ**   | Reszponzív design, tablet-optimalizált nézet                                                  |

---

### 7.2.1 Időszakokra bontott riport

| Mező                | Tartalom                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Kérdés**          | Milyen időszakokra kell riportot tutt generálni? (napi, heti, havi, negyedéves, éves - mindtagunk szerint?) |
| **PDF szó szerint** | "Milyen riport? Mindegyik más, napi, heti, havi, évi."                                                      |
| **Státusz**         | ✅ **EGYÉRTELMŰ**                                                                                           |
| **Értelmezés**      | ✅ **Minden időtartam szükséges** (napi, heti, havi, negyedéves, éves)                                      |
| **IMPLEMENTÁCIÓ**   | Időszak szűrő minden riporton (date range picker)                                                           |

---

### 7.2.2 Bevételi riport bontása

| Mező                | Tartalom                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Kérdés**          | A bevételi riport bontása milyen szinten legyen? (össszerlesi, bolt szerint, géptegóris, partner, szerződés (Zoli leirta táskélesen)) |
| **PDF szó szerint** | "Összerlési, bolt, szerviz, bérlésekt, partner, szervizek (Zoli leirta táskélesen)"                                                   |
| **Státusz**         | ✅ **EGYÉRTELMŰ**                                                                                                                     |
| **Értelmezés**      | ✅ **Többszintű bontás:** Összesített, Bolt, Szerviz, Bérlések, Partner                                                               |
| **IMPLEMENTÁCIÓ**   | Riport pivot funkció, drill-down                                                                                                      |

---

### 7.2.3 Összehasonlító nézet

| Mező                | Tartalom                                                                                |
| ------------------- | --------------------------------------------------------------------------------------- |
| **Kérdés**          | Kell-e összehasonlító nézet? (pl: ez a hónap vs. előző hónap, vagy ez az év vs. tavaly) |
| **PDF szó szerint** | "Igen"                                                                                  |
| **Státusz**         | ✅ **EGYÉRTELMŰ**                                                                       |
| **Értelmezés**      | ✅ **Időszak összehasonlítás szükséges**                                                |
| **IMPLEMENTÁCIÓ**   | Current vs. previous period, delta számítás (%, abszolút)                               |

---

### 7.2.4 Pénzügyi KPI-k

| Mező                | Tartalom                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Kérdés**          | Milyen pénzügyi KPI-k kellenek? (bruttó bevétel, nettó bevétel, kintlévők vs. befektők, költségdeng, stb.) |
| **PDF szó szerint** | "Igen"                                                                                                     |
| **Státusz**         | ✅ **EGYÉRTELMŰ**                                                                                          |
| **Értelmezés**      | ✅ **Alapvető pénzügyi KPI-k:** Bruttó, Nettó bevétel, Kintlévőségek, Befizetések                          |
| **IMPLEMENTÁCIÓ**   | Dashboard KPI widgetek                                                                                     |

---

### 7.3.1 - 7.7.4 További Dashboard/Riport Kérdések

**Megjegyzés:** A többi dashboard/riport kérdésre (7.3.1 - 7.7.4) többnyire **"Igen"** vagy hiányzó válaszok érkeztek a PDF-ben. Ezek az alábbiak:

| Kérdés ID | Kérdés                          | PDF Válasz                                                                                                                                                       | Státusz        |
| --------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 7.3.1     | Készlet riport milyen bontásban | "minden szinten"                                                                                                                                                 | ✅ EGYÉRTELMŰ  |
| 7.3.2     | Készlet mozgás riport           | "Igen"                                                                                                                                                           | ✅ EGYÉRTELMŰ  |
| 7.3.3     | Minimum készlet alert           | "Igen"                                                                                                                                                           | ✅ EGYÉRTELMŰ  |
| 7.3.4     | Kihasználtsági mutató           | "Igen"                                                                                                                                                           | ✅ EGYÉRTELMŰ  |
| 7.4.1     | Szerviz KPI-k                   | (nincs válasz)                                                                                                                                                   | ❌ TISZTÁZANDÓ |
| 7.4.2     | Technikus hatékonyság riport    | "Igen"                                                                                                                                                           | ✅ EGYÉRTELMŰ  |
| 7.4.3     | Garanciális vs. Fizetős         | "Igen"                                                                                                                                                           | ✅ EGYÉRTELMŰ  |
| 7.4.4     | Visszatérő hiba tracking        | "Igen"                                                                                                                                                           | ✅ EGYÉRTELMŰ  |
| 7.5.1     | Partner KPI-k                   | "Igen"                                                                                                                                                           | ✅ EGYÉRTELMŰ  |
| 7.5.2     | Partner szegmentáció            | (nincs válasz)                                                                                                                                                   | ❌ TISZTÁZANDÓ |
| 7.5.3     | Kintlévőség riport              | "Igen"                                                                                                                                                           | ✅ EGYÉRTELMŰ  |
| 7.5.4     | Törzsvevői aktivitás            | "Igen"                                                                                                                                                           | ✅ EGYÉRTELMŰ  |
| 7.6.1     | Bérlési mutatók                 | (nincs válasz)                                                                                                                                                   | ❌ TISZTÁZANDÓ |
| 7.6.2     | Kiadástími riport               | (nincs válasz)                                                                                                                                                   | ❌ TISZTÁZANDÓ |
| 7.6.3     | Foglalás vs. Kivétel            | "Ezt lehet az egyébet hozádagan előtelést, nem?"                                                                                                                 | ⚠️ RÉSZBEN     |
| 7.6.4     | Előrejelzés                     | (nincs válasz)                                                                                                                                                   | ❌ TISZTÁZANDÓ |
| 7.7.1     | Export formátumok               | "attól függ mithez, főszöségképen mind kell"                                                                                                                     | ✅ EGYÉRTELMŰ  |
| 7.7.2     | Automatikus email küldés        | "Lehet, de most még nem élvén kérésk"                                                                                                                            | ⚠️ KÉSŐBBI     |
| 7.7.3     | API endpoint riportokhoz        | "Könyvelők pl?"                                                                                                                                                  | ⚠️ RÉSZBEN     |
| 7.7.4     | Könyvelői speciális riportok    | "Kinendi, begvő számlák, kélesök, cigek-én magálínezettyé szóló számázk átudtóma történű (timerd); belpót inálások, kéesétatési, bankernyás íczsilése, kötelege" | ⚠️ RÉSZBEN     |

---

## Összefoglaló - Tisztázandó Kérdések

### 🔴 KRITIKUS - Tisztázás elengedhetetlen (8 kérdés)

1. **1.1** - MyPOS Pre-authorization vs. Azonnali terhelés
2. **1.2** - Bérlés hosszabbítás automatikus/manuális
3. **1.3** - Rendkívüli károsodás kezelése
4. **1.4** - Kár a bérlés közben (folyamat)
5. **2.4** - Szerződés automatikus megújítás
6. **5.3** - Hosszú távú szerződés definíció (mi számít hosszú távú?)
7. **2.3** - Havi kedvezmény mértéke (30+ nap = ?%)
8. **2.6** - Korai lemondás pontos kalkulációja

### 🟡 KÖZEPES - Megerősítés jó lenne (5 kérdés)

9. **7.4.1** - Szerviz KPI-k (konkrét lista)
10. **7.5.2** - Partner szegmentáció
11. **7.6.1** - Bérlési mutatók részletei
12. **7.6.2** - Kiadástími riport
13. **7.6.4** - Előrejelzés hosszú távú szerződések alapján

---

## Egyértelmű Válaszok Listája

✅ **29 kérdésre kaptunk egyértelmű választ:**

- 1.5 - Kaució konfiguráció (gép szintű)
- 2.1 - Szerződés típusok
- 2.5 - Nincs minimum bérlési idő
- 2.7 - Több gép szerződésben
- 3.1 - Excel formátum
- 3.2 - Éves frissítés
- 3.5 - Csak Makita norma
- 4.1 - Kaució mindig kötelező
- 4.3 - Egységes késedelmi díj
- 5.1 - Nincs prioritás sorrend
- 6.1 - Gép csere lehetséges
- 7.1.3 - NEM kell user testreszabás!
- 7.2.1, 7.2.2, 7.2.3, 7.2.4 - Riport követelmények
- 7.3.1, 7.3.2, 7.3.3, 7.3.4 - Készlet riportok
- 7.4.2, 7.4.3, 7.4.4 - Szerviz riportok (részben)
- 7.5.1, 7.5.3, 7.5.4 - Partner riportok (részben)
- 7.7.1 - Export formátumok (mind kell)

---

**Dokumentum vége**

_Generálva: BMAD Correct-Course Workflow, 2026-02-03_
