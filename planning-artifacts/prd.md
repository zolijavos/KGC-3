---
stepsCompleted: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11]
workflowStatus: 'completed'
completionDate: '2026-01-01'
inputDocuments:
  - planning-artifacts/1-discovery/market-research/Kerdes-Valaszok-2025-12-30.md
  - planning-artifacts/1-discovery/market-research/KGC-Verzio-Elemzes-2025-12-30.md
  - planning-artifacts/1-discovery/market-research/E2E-Blueprint-Berles-Folyamat.md
  - planning-artifacts/1-discovery/market-research/Transcript-Kovetelmeny-Elemzes-2025-12-30.md
  - planning-artifacts/1-discovery/market-research/konkurencia-elemzes-gepberles-erp-2025-12-15.md
  - planning-artifacts/1-discovery/market-research/ERPNext-vs-KGC-FitGap-2025-12-19.md
  - planning-artifacts/3-solution/architecture/adr/ADR-001-franchise-multitenancy.md
  - planning-artifacts/3-solution/architecture/adr/ADR-014-modular-architektura-vegleges.md
  - planning-artifacts/3-solution/architecture/adr/ADR-015-CRM-Support-Integration-Strategy.md
  - planning-artifacts/3-solution/architecture/adr/ADR-016-ai-chatbot-koko.md
  - planning-artifacts/3-solution/architecture/KGC-Integracios-Strategia-Vegleges.md
  - docs/KGC-ERP-v7-Final-2025-12-30.html
  - reference/erp-modules/ERP/README.md
  - reference/erp-modules/ERP/HR/KGC-HR-INTEGRATION-ARCHITECTURE.md
  - reference/erp-modules/ERP/CRM/KGC-CRM-INTEGRATION-ARCHITECTURE.md
  - reference/erp-modules/ERP/Inventory/INVENTORY-INTEGRATION-ARCHITECTURE.md
documentCounts:
  briefs: 0
  research: 6
  brainstorming: 0
  projectDocs: 10
workflowType: 'prd'
lastStep: 11
project_name: 'KGC-2'
user_name: 'Javo!'
date: '2026-01-01'
primaryUsers:
  - Pultos / Értékesítő
  - Boltvezető
  - Központi admin
pricingModel: 'Hibrid Árazás (Alap díj + User-based licensing)'
metricsStrategy: 'DevOps monitoring, napi review'
---

# Termék Követelmény Dokumentum - KGC-2

**Author:** Javo!
**Date:** 2026-01-01
**Version:** 2.0 (BMad Method Reset)

---

## Vezetői Összefoglaló

A **KGC ERP v7.0** egy átfogó SaaS B2B platform építőipari és mezőgazdasági gépbérléssel foglalkozó cégek számára. A rendszer egy meglévő, 10+ éve működő bérlési rendszer (Ver:1.33z) teljes újragondolása modern technológiákkal, franchise-ready architektúrával és AI-vezérelt automatizációkkal.

### Célközönség

A rendszer három fő felhasználói csoportra fókuszál:

- **Pultos / Értékesítő** - Napi árumozgatás, bérlés kiadás/visszavétel, raktári műveletek
- **Boltvezető** - Köztes szerepkör: korlátozott vezetői jogok, napi forgalom figyelés, dolgozó felvétel
- **Központi admin** - Inventory oversight, multi-warehouse kezelés, franchise koordináció

### Fő Üzleti Probléma

**Áruk nyomon követésének hiányosságai** a meglévő rendszerben:

- Nehézkes árumozgatás nyilvántartása mindhárom Core modulban (Bérlés, Szerviz, Értékesítés)
- Raktározási rendszer nem támogatja megfelelően a real-time inventory tracking-et
- Multi-warehouse környezetben bizonytalan az áruk pontos helyzete
- Serial number alapú bérgép követés nem elég granulált
- Helykód rendszer (polc, doboz, kommandó) hiányzik vagy elavult

### Ami Ezt a Terméket Különlegessé Teszi

1. **Inventory-Centric Architektúra SaaS Modellben**
   - Minden modul (Bérlés, Szerviz, Értékesítés) központi inventory tracking-re épül
   - Real-time árumozgatás nyilvántartás multi-warehouse környezetben
   - Serial number tracking + helykód rendszer (K-P-D: Kommandó-Polc-Doboz) - ADR-021
   - Vonalkód/QR kód integráció gyors árumozgatáshoz (ADR-022)

2. **Franchise-Ready Multi-Tenancy**
   - Központosított inventory láthatóság országos hálózaton keresztül
   - Partner-specifikus árképzés és készletkezelés
   - PostgreSQL Row Level Security (RLS) alapú adatszeparáció (ADR-001)
   - White-label termék értékesítése más bérleti cégeknek (ADR-003)

3. **AI-Driven Automatizáció**
   - Koko AI Chatbot (Gemini Flash - ADR-016) - 24/7 multi-channel support
   - OCR számla feldolgozás (ADR-019) - beszerzési folyamat automatizálás
   - 3D fotó + AI sérülésdetektálás (ADR-020) - visszavételi folyamat gyorsítása
   - Email thread feldolgozás (ADR-018) - számlák automatikus beazonosítása

4. **Bérlés-Specifikus Workflow**
   - Bérgép státusz lifecycle (bent → kint → szerviz → destroyed/lost/sold)
   - Tartozékok kezelése (töltő, akkumulátor, kiegészítők)
   - Kaució + visszatartás + késedelmi díj automatizálás
   - MyPos payment integráció - kártya kaució blokkolás (ADR-005)
   - Audit trail minden bérlési művelethez (ADR-006)

5. **Hibrid Árazás (Alap díj + User-based licensing)**
   - Fix havi alap díj franchise partnerenként
   - User-based licensing: felhasználószám alapú skálázódó díjazás
   - DevOps-monitored metrics napi review-val
   - Transparent cost tracking partner-szinten

## Projekt Besorolás

**Technical Type:** SaaS B2B Platform
**Domain:** Equipment Rental & Service Management
**Complexity:** High
**Project Context:** Brownfield - Ver:1.33z rendszer teljes átdolgozása v7.0-ra

### Meglévő Rendszer Kontextus

**Jelenlegi rendszer (Ver:1.33z):**

- 10+ év működési tapasztalat
- Részletes üzleti folyamatok dokumentálva
- Ismert problémák: duplikált ügyfelek, árumozgatás nehézkes nyilvántartása, multi-warehouse kezelés hiányosságai
- Egyedi domain logika: NAV online számlázás, garanciális javítás elszámolás (Makita norma), nagy céges szerződéses számlázás

**v7.0 Fejlesztési Track:** BMad Method (PRD + Architektúra + Epic-Story lebontás)

### Technológiai Stack

- **Backend:** Node.js + TypeScript
- **Frontend:** Composable architektúra (React/Vue komponensek) - ADR-023
- **Database:** PostgreSQL multi-tenant RLS
- **AI Platform:** Google Gemini Flash API
- **Deployment:** SaaS modell (online-first, offline nem prioritás)
- **Integrations:** NAV, MyPos, Chatwoot, Twenty CRM, Horilla HR

### Komplexitás Indoklás

- **Multi-tenant franchise architektúra** - Row Level Security, országos hálózat, partner izoláció
- **Real-time inventory tracking** - Multi-warehouse, serial numbers, K-P-D helykódok, vonalkód/QR
- **Összetett üzleti folyamatok** - ~60 lépéses bérlési workflow, 20+ döntési pont, több modul interakció
- **Kritikus integrációk** - NAV online számlázás (kötelező), MyPos payment, AI szolgáltatások (Gemini), Email processing
- **GDPR compliance** - Ügyfél adatvédelem, cascade delete, audit trail
- **Árumozgatás központi szerepe** - Minden Core modul (Bérlés/Szerviz/Értékesítés) inventory-dependent
- **Domain-specifikus követelmények** - Bérleti díj számítás (napi/heti/30 nap), késedelmi díj, garanciális javítás, franchise elszámolás

### Moduláris Architektúra Áttekintés

**🔷 CORE Modulok** (kötelező komponensek):

1. **Bérlés Modul** - E2E workflow, kaució, késedelmi díj
2. **Szerviz Modul** - Munkalap, garanciális javítás, sérülésdetektálás
3. **Értékesítés Modul** - Termékeladás, készlet csökkentés
4. **Pénzügy Modul** - Automatikus banki elszámolás, kaució kezelés
5. **Inventory Modul** - Multi-warehouse, serial number, helykód, árumozgatás
6. **Gyártás Modul** - BOM, gyártási rendelés, fázisok, selejt (Fázis 2)

**🔌 PLUGIN Modulok** (opcionális, ki-bekapcsolható):

1. **Support Modul** (Chatwoot + Koko AI) - 24/7 chatbot, multi-channel support
2. **CRM Modul** (Twenty) - Lead tracking, marketing automation
3. **HR Modul** (Horilla HRMS) - Jelenlét, szabadság kezelés

---

## Felhasználói Utak

A KGC ERP v7.0 rendszer 4 kulcsfontosságú felhasználói csoportot szolgál ki, mindegyik saját egyedi igényekkel és workflow-kkal. Az alábbi narrative story-based journey-k bemutatják, hogyan változtatja meg a rendszer ezeknek az embereknek a napi munkáját.

### Journey 1: Pultos / Értékesítő - "A 3 Perces Pokol Vége"

**Szereplő: Kata (29)** - Pultos / Értékesítő, Debreceni franchise bolt

Kata minden reggel 8-kor nyit, és első dolga a tegnap visszahozott gépek raktári elhelyezése. A régi rendszerben (Ver:1.33z) ez pokol: vonalkódot beolvas, aztán átkapcsol egy másik képernyőre, keresi a raktári helyet egy Excel táblában, visszamegy az ERP-be, begépeli a K-P-D kódot (Kommandó-Polc-Doboz), elmenti... **3-5 perc per gép**. Ha reggel 8 gép van visszahozva, ez **40 perc veszteség**.

Egy nap a főnök bejelenti: "Új rendszer jön, KGC ERP v7.0". Kata szkeptikus - "Megint tanulni kell egy új rendszert?"

Az első reggel az új rendszerrel: Beolvas egy vonalkódot. A rendszer azonnal feldobja a gép adatlapját + K-P-D helykód beviteli mezőt. Kata begépeli: `K2-P5-D3`. Enter. **Kész. 20 másodperc.**

8 gép = **2,5 perc** az egész raktározás. Kata 37 percet spórolt - kávézik egyet, átolvassa a napi feladatokat nyugodtan.

Két hét múlva már olyan gyors, hogy **15 másodperc alatt** rögzít egy gépet. Kolléganője megkérdezi: "Hogy csinálod?" Kata mosolyog: "Végre van egy rendszer ami nem dolgoztat, hanem segít."

**Kritikus funkciók Kata journey-jéből:**

- Vonalkód scan → azonnali K-P-D bevitel egy képernyőn
- Nincs képernyőváltás, nincs Excel hacking
- Real-time mentés (nincs "Save" gomb mashing)
- Mobile-first UI (tablet/telefon a raktárban)
- Gyors árumozgatás rögzítés < 30 másodperc (10x gyorsabb mint 3-5 perc)

---

### Journey 2: Központi Admin - "Végre Látom Az Egész Képet"

**Szereplő: László (45)** - Központi admin, Budapest HQ

László 6 franchise boltot koordinál országosan (Budapest, Debrecen, Szeged, Pécs, Győr, Miskolc). Reggel 9-kor megnyitja a régi rendszert, és elkezdi a napi inventory checklistet:

- "Hány db Bosch fúrógép van Debrecenben?" → 3 perc keresgélés
- "Melyik polcon van a Makita bontókalapács Szegeden?" → Excel tábla + telefonhívás → 8 perc

**Napi 2-3 óra** megy el inventory lookup-ra, mert nincs központi valós idejű láthatóság.

Az új v7.0 rendszerrel az első nap: Dashboard megnyitás. Bal oldali szűrő: "Bosch fúrógép". **Bam!** Táblázat minden warehouse-szal, minden gép serial number + K-P-D kód + státusz (bent/kint/szerviz). **5 másodperc**.

A breakthrough pillanat: Délután 3-kor hívja a Szegedi bolt: "Kell egy pótgép holnapra, van valami?" László szűr: "Makita bontókalapács, státusz: bent". Látja: Debrecenben van 2 db. **Egy kattintás** a K-P-D kódra → `K1-P3-D7` → Screenshot → Slack a Debreceni boltnak: "Küldjétek át holnapra Szegedre."

**15 másodperc alatt megoldott** egy cross-warehouse koordinációt, ami régen fél órát vett igénybe.

**Kritikus funkciók László journey-jéből:**

- Real-time multi-warehouse inventory dashboard
- Szűrés: warehouse, termék, státusz, serial number
- K-P-D kód egy kattintással látható
- Cross-warehouse transfer workflow
- Slack/email integráció
- Inventory lookup response time radikális csökkentése (5 másodperc vs. 3-8 perc)

---

### Journey 3: Franchise Partner Tulajdonos - "Végre Értem A Számokat"

**Szereplő: Péter (38)** - Franchise partner tulajdonos, Szeged

Péter 2 éve üzemelteti a Szegedi KGC franchise boltot. A pénz jön-megy, de nem érti pontosan: mennyi a tényleges profit? Melyik gép a legrentábilisabb? Mi a készletforgási sebesség?

A régi rendszerben havonta kap egy Excel-t a központtól a bevételekről. **Reaktív üzletvezetés** - mindig utólag tudja meg, hogy mi történt.

Az új v7.0-val kap egy franchise partner dashboard-ot. Belép, és látja:

- **Real-time bevétel:** Mai nap, heti, havi tranzakciók
- **Top 5 bérlési termék:** Melyik gép hozza a legtöbb pénzt
- **Készlet forgási sebesség:** Melyik gépek állnak bent 30+ napja
- **Hibrid árazás breakdown:** Mennyi a havi SaaS költség (alap díj + user licensz alapon)

A nagy "aha!" pillanat: Látja, hogy a Makita fúrógépek **40%-kal többet** bérelnek ki mint a Bosch-ok, de a készletben 60% Bosch van. **Azonnal átrendez:** Növeli a Makita készletet, csökkenti a Bosch-ot.

3 hónap múlva **22%-os bevétel növekedés** - csak azért, mert végre **látja a valós számokat valós időben**.

**Kritikus funkciók Péter journey-jéből:**

- Franchise partner dashboard (role-based access)
- Real-time revenue tracking
- Készlet analytics (forgási sebesség, ROI per termék)
- Hibrid árazás átláthatóság (alap díj + user licensz)
- Trend visualization (heti/havi grafikonok)
- Business intelligence insights (melyik termék a legrentábilisabb)

---

### Journey 4: DevOps/IT Admin - "10 Franchise Partner Egy Nap Alatt"

**Szereplő: Anna (32)** - DevOps/IT admin, KGC központ

Anna felelős az új franchise partnerek technical onboarding-jáért. A régi rendszerben ez egy **3 napos manual process** volt:

- DB schema setup manuálisan
- User account létrehozás
- Warehouse konfigurálás
- Permission mapping
- Initial data import (termék katalógus, árképzés)

Egy új partner onboarding = **24 óra munka** (több nap alatt).

Az új v7.0-val Anna kap egy **Franchise Onboarding Wizard**-ot:

1. Partner info bevitel (név, cím, VAT number)
2. Warehouse konfig (címek, K-P-D rendszer generálás)
3. Initial inventory import (CSV upload vagy választás központi katalógusból)
4. Pricing model (hibrid árazás: alap díj + user licensz)
5. User creation (admin + pultosok email listája)
6. **Deploy** gomb

**Egy kattintás** → RLS (Row Level Security) schema automatikusan létrejön PostgreSQL-ben, initial data seedelődik, email megy az új partnernek a belépési linkkel.

**1 partner onboarding: 15 perc**.

A CEO bejelenti: "3 hónapon belül 10 új partnert akarunk." Anna mosolyog: "Egyik délután megcsinálom mindet."

**Kritikus funkciók Anna journey-jéből:**

- Franchise onboarding wizard (self-service vagy admin-driven)
- Automated RLS schema creation
- Warehouse config builder (K-P-D generálás)
- Bulk user import
- Email notification system
- Partner status dashboard (DevOps monitoring)
- Radikális onboarding gyorsítás (15 perc vs. 24 óra munka)

---

### Journey 5: Boltvezető - "A Közbülső Láncszem"

**Szereplő: Tamás (35)** - Boltvezető, Budapest belváros

Tamás 3 éve dolgozik a KGC hálózatban, és nemrég léptették elő boltvezetőnek. A szerepköre egyedi: több jogosultsága van, mint egy pultosnak, de kevesebb, mint a franchise tulajdonosnak. A **köztes pozíció** nagy felelősséggel jár.

A régi rendszerben Tamásnak minden döntéshez a tulajdonost kellett hívnia:

- "Adhatunk 15% kedvezményt?" → Telefon a tulajdonosnak
- "Felvehetjük ezt az új kollégát?" → Email a tulajdonosnak
- "Mennyi volt a mai forgalom?" → Nem tudta, csak a hónap végén Excel-ből

Az új v7.0-val Tamás kap egy **Boltvezető dashboard**-ot. Belép és látja:

- **Napi forgalom real-time:** Mai bevétel, tranzakciószám, átlag kosárérték
- **Kedvezmény kezelő:** Ár módosítás max ±20% keretben (tulajdonosi jóváhagyás nélkül)
- **HR alapfunkciók:** Új dolgozó felvétele (elbocsátás NEM - az tulajdonosi jog marad)
- **Készlet áttekintés:** READ-only, készlet átmozgatás NEM (csak központi admin)

A nagy "aha!" pillanat: Egy állandó ügyfél kér 18% kedvezményt egy nagy rendelésnél. Tamás **azonnal dönthet**: megadja, mert a ±20%-os keretben van. Nem kell telefonálnia, nem kell várnia. Az ügyfél boldog, a tranzakció megtörténik.

**Kritikus funkciók Tamás journey-jéből:**

- Boltvezető dashboard (role-based access, köztes jogosultságok)
- Korlátozott árazási jog (max ±20% kedvezmény/felár)
- Dolgozó felvétel (de elbocsátás NEM - tulajdonosi jog)
- Napi forgalom láthatóság real-time
- Készlet READ (de készlet átmozgatás NEM - központi admin jog)
- Audit trail minden kedvezmény döntéshez

---

### Felhasználói Utak Követelmény Összefoglaló

A 5 user journey feltárta a következő kritikus capability területeket:

**1. Inventory Core Capabilities**

- Real-time multi-warehouse tracking minden warehouse-ra
- K-P-D (Kommandó-Polc-Doboz) helykód rendszer automatizált generálással
- Vonalkód/QR integráció gyors rögzítéshez (< 30 másodperc target)
- Cross-warehouse transfer workflow (franchise-ok közötti árumozgatás)
- Készlet analytics (forgási sebesség, ROI per termék, top performers)
- Serial number tracking minden bérgéphez

**2. User Experience Requirements**

- Mobile-first UI (tablet/telefon támogatás raktárban)
- Egy képernyős workflow (nincs tab/window switching, nincs Excel integráció)
- Real-time auto-save (nincs explicit Save gomb, minden Enter után mentés)
- Role-based dashboards (pultos vs boltvezető vs admin vs partner vs DevOps különböző nézetekkel)
- < 5 másodperc response time inventory lookup-ra
- < 30 másodperc árumozgatás rögzítés (vs. régi 3-5 perc)

**3. Franchise Multi-Tenancy Requirements**

- Franchise onboarding wizard (partner info → warehouse → users → deploy)
- Automated RLS (Row Level Security) provisioning PostgreSQL-ben
- Partner-specifikus analytics dashboard (bevétel, készlet ROI, transaction costs)
- Hibrid árazás átláthatóság (alap díj + user licensz) (látható breakdown havi költségből)
- Warehouse config builder (K-P-D rendszer automatikus generálás)
- 15 perces onboarding target (vs. régi 24 órás manual process)

**4. Integration & Automation Requirements**

- Slack/email notification integráció (cross-warehouse koordinációhoz)
- Bulk import/export (CSV) initial data seeding-hez
- Automated schema creation (új partner RLS tenant létrehozás)
- Real-time sync minden warehouse között
- Email automation (új partner onboarding, password reset, stb.)

**5. Business Intelligence & Analytics**

- Real-time revenue tracking (napi/heti/havi aggregálás)
- Készlet forgási sebesség analitika (30+ nap bent álló gépek azonosítása)
- Top performer termékek (legtöbb bérlés, legnagyobb bevétel)
- Hibrid árazás cost breakdown (franchise partnerek számára átlátható SaaS költség)
- Trend visualization (grafikonok időbeli változásokról)

---

## Innováció és Újszerű Megoldások

A KGC ERP v7.0 nem csupán egy meglévő rendszer modernizálása - **7 kulcsfontosságú innovációs területen vezet be piaci újdonságokat**, amelyek egyetlen magyar vagy nemzetközi versenytárs rendszerében sem találhatók meg együtt. A következő szekció bemutatja ezeket az innovációkat, a piaci kontextust, validációs módszereket és kockázatkezelési stratégiákat.

### Azonosított Innovációs Területek

#### 1. AI-Driven Multi-Function Automation (4 AI Szolgáltatás Integráció)

**Innováció leírás:**
A KGC ERP v7.0 **négy különálló AI funkciót integrál egyetlen platformon**, mindegyik más-más üzleti workflow-t automatizál:

1. **Koko AI Chatbot** (ADR-016) - 24/7 multi-channel ügyfélszolgálat
   - Google Gemini Flash API alapú intelligens chat asszisztens
   - Support ticket eszkalációs logika (egyszerű kérdés → chatbot, komplex → Chatwoot)
   - Multilingual support (magyar/angol)

2. **OCR Számla Feldolgozás** (ADR-019) - Beszerzési folyamat automatizálás
   - Gemini Vision API-val PDF/képfájl számlák automatikus feldolgozása
   - Beszállítói számla adatok kinyerése (tételek, összeg, dátum, VAT)
   - Automata könyvelési bejegyzés generálás

3. **3D Fotó + AI Sérülésdetektálás** (ADR-020) - Visszavételi folyamat gyorsítás
   - 360° fotó készítés bérgép kiadáskor és visszavételkor
   - AI-powered összehasonlító elemzés (új sérülések automatikus detektálása)
   - Kár dokumentáció fotóval + AI-generált jegyzőkönyv

4. **Email Thread Feldolgozás** (ADR-018) - Számlák automatikus beazonosítása
   - NLP-alapú email parsing (számlák automatikus detektálása inbox-ban)
   - Gemini API-val email kontextus értelmezés és kategorizálás
   - Automata számlaimport email mellékletekből

**Piaci újdonság:** Egyetlen magyar gépbérlés ERP sem kombinál 4 AI funkciót egy platformon. Nemzetközi rendszerek (Wynne Systems, EZRentOut) nem kínálnak AI-vezérelt automatizációt.

---

#### 2. Hibrid Árazási Modell (Alap díj + User-based Licensing)

**Innováció leírás:**
A KGC ERP v7.0 **hibrid árazási modellt** vezet be franchise partnerek számára, ahol a havi SaaS költség egy fix alap díjból és a felhasználók száma alapján kalkulált user licensz díjból áll.

**Tradicionális ERP árazás vs. KGC modell:**

| Tradicionális ERP                                                  | KGC ERP v7.0 Hibrid Árazás                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Magas fix user-based licensing (pl. 10 felhasználó = 500k Ft/hó)   | Alacsony alap díj + skálázódó user licensz (pl. 50k alap + 6 user × 4k = 74k Ft/hó) |
| Skálázás = több user = lineáris költségnövekedés                   | Skálázás = több user = degresziós user licensz (kedvezmények nagyobb csomagokra)    |
| Partner nem látja a közvetlen kapcsolatot költség-használat között | Transparent breakdown: Alap díj + aktív userek száma                                |

**Üzleti előny:**

- Kis franchise partnerek (kevés user) **alacsony belépési költség** (Startup: 25k Ft alap + 1-3 user)
- Nagy partnerek (sok user) **kedvezményes user licensz** Enterprise tier-ben
- Transparent cost structure - partner látja: "Alap díj: 50k + 6 user = 74k Ft/hó"
- Inaktív user kedvezmény - 30+ nap login nélkül = fél díj

**Piaci pozícionálás:** A hibrid modell ötvözi a fix költség kiszámíthatóságát és a user-based licensing skálázhatóságát. Franchise partnerek könnyebben tervezhetik a költségeket, és az inaktív user kedvezmény méltányos a szezonális munkásokkal dolgozó partnerek számára.

---

#### 3. Franchise Onboarding Automation (96x Gyorsabb Mint Manual Process)

**Innováció leírás:**
Az új franchise partner technikai onboarding-ja **15 perc alatt** megtörténik egy automatizált wizard-dal, szemben a régi **24 órás manuális folyamattal**.

**Automatizált Franchise Onboarding Wizard workflow:**

1. **Partner Info Bevitel** - Név, cím, VAT number, contact person
2. **Warehouse Konfiguráció** - Címek, raktárméret alapján K-P-D (Kommandó-Polc-Doboz) rendszer automatikus generálása
3. **Initial Inventory Import** - CSV upload vagy választás központi katalógusból (Bosch, Makita, Stihl termékek)
4. **Pricing Model Kiválasztás** - Hibrid árazás tier (startup/standard/enterprise)
5. **User Creation** - Admin + pultosok email listája → automatikus account creation + onboarding email
6. **Deploy Button** - Egy kattintás:
   - PostgreSQL RLS (Row Level Security) schema automatikus létrehozása új tenant számára
   - Initial data seeding (katalógus, árképzés, warehouse config)
   - Email notification új partnernek login linkkel

**Mérhető innováció:** 24 óra → 15 perc = **96x gyorsabb** (Anna DevOps journey alapján)

**Piaci újdonság:** Franchise-ready multi-tenant architektúra self-service onboarding wizard-dal ritkaság még nemzetközi rendszerekben is. Magyar piacon **nincs konkurens** (konkurencia-elemzes alapján).

---

#### 4. Inventory-Centric Architecture (K-P-D Helykód Rendszer + Real-Time Multi-Warehouse)

**Innováció leírás:**
A KGC ERP v7.0 **minden modulja (Bérlés, Szerviz, Értékesítés) központi inventory tracking-re épül**, szemben a tradicionális ERP-k modul-elsőbbségű architektúrájával.

**K-P-D (Kommandó-Polc-Doboz) Location Tracking rendszer (ADR-021):**

- **Kommandó (K)** - Raktár logikai zóna (pl. K1 = Bosch terület, K2 = Makita terület)
- **Polc (P)** - Fizikai polc azonosító (P1-P20)
- **Doboz (D)** - Doboz/konténer azonosító a polcon (D1-D50)

**Példa:** `K2-P5-D3` = Makita zóna, 5-ös polc, 3-as doboz → Serial number alapú bérgép pontosan lokalizálható.

**Multi-Warehouse Real-Time Sync:**

- 6 franchise bolt országosan (Budapest, Debrecen, Szeged, Pécs, Győr, Miskolc)
- Központi admin (László journey) **5 másodperc alatt** látja: "Hol van az összes Bosch fúrógép?"
- Cross-warehouse transfer workflow (Debrecenből Szegedre átküldés koordinálás)

**Piaci újdonság:** Magyar ERP-k (Cégmenedzser, PEAS) **nincs bérlés-specifikus helykód rendszer**. Nemzetközi rendszerek (Wynne Systems) van, de nem RLS-alapú multi-tenant franchise architektúrával kombinálva.

---

#### 5. Vonalkód/QR Paradigmaváltás (Barcode-Centric vs. Article Number)

**Innováció leírás (ADR-022):**
A régi Ver:1.33z rendszer **cikkszám-centrikus** volt (manuális begépelés, Excel lookup). Az új v7.0 **vonalkód/QR-centrikus** működésre vált:

**Régi workflow (cikkszám):**

1. Pultos lát egy bérgépet
2. Megkeresi a cikkszámot (papír lista vagy Excel)
3. Begépeli az ERP-be: "BOSCH-FUR-12345"
4. Keres, megerősít, tovább...
   **Idő:** 2-3 perc

**Új workflow (vonalkód/QR):**

1. Pultos beolvas vonalkódot (gyári vagy rendszer-generált)
2. Rendszer azonnal azonosítja a bérgépet (serial number lookup)
3. Egy képernyőn: K-P-D helykód bevitel, státusz frissítés
   **Idő:** 15-30 másodperc (Kata journey alapján)

**Hibrid stratégia (ADR-022):**

- **Gyári vonalkód VAN** → használjuk (Bosch, Makita gépeken)
- **Gyári vonalkód NINCS** → rendszer generál egyedi QR kódot serial number alapján
- Nyomtatható QR kód címkék (eszköz leltárszámmal + K-P-D kóddal)

**Piaci újdonság:** Magyar kölcsönző szoftverek (ION Rent, wSoft) alap vonalkód support van, de **nem K-P-D helykóddal kombinálva**, és nincs automata QR generálás gyári kód hiányában.

---

#### 6. Comprehensive Audit Trail (Immutable Logging Every Action)

**Innováció leírás (ADR-006):**
**Minden bérlési, szerviz és értékesítési művelet immutable audit trail-lel rendelkezik**, amely rögzíti:

- **KI** (user ID + név)
- **MIT** (action type: bérlés kiadás, visszavétel, K-P-D módosítás, státusz változás, ár override, stb.)
- **MIKOR** (timestamp UTC + local timezone)
- **MIÉRT** (opcionális megjegyzés/indoklás)
- **VÁLTOZÁS ELŐTTE/UTÁNA** (JSON diff)

**Compliance & transparency előnyök:**

- **NAV audit compliance** - Számlázási műveletek visszakövethetőek
- **Franchise partner transparency** - Partner látja: ki módosította a bérlési díjat
- **Hibadetektálás** - "Ki törölte a készletből ezt a bérgépet?" → audit log válaszol
- **Dispute resolution** - Ügyfél azt mondja "nem kaptam vissza kauciót" → audit log mutatja: mikor, ki, milyen bank transaction ID-val fizették vissza

**Piaci újdonság:** Magyar ERP-k alap audit log support van (ki, mit, mikor), de **nem bérlés-specifikus kontextussal** (pl. kaució visszafizetés, késedelmi díj számítás audit trail). Nemzetközi rendszerek enterprise szinten kínálnak comprehensive audit trail-t, KKV szinten **ritka**.

---

#### 7. Beszállító API Automatizálás (Supplier Integration Pattern - ADR-017)

**Innováció leírás:**
A KGC ERP v7.0 **beszállító API adapter pattern-t** vezet be automatikus készlet- és árfrissítéshez nagy beszállítóktól (Makita, Stihl, Hikoki).

**Adapter Architecture (ADR-017):**

```
┌─────────────────────────────────────────┐
│  KGC Inventory Core                      │
│  (Unified Product Catalog)               │
└─────────────────────────────────────────┘
           ▲           ▲           ▲
           │           │           │
    ┌──────┴───┐  ┌───┴─────┐  ┌──┴──────┐
    │ Makita   │  │ Stihl   │  │ Hikoki  │
    │ Adapter  │  │ Adapter │  │ Adapter │
    └──────────┘  └─────────┘  └─────────┘
           ▲           ▲           ▲
           │           │           │
    ┌──────┴───┐  ┌───┴─────┐  ┌──┴──────┐
    │ Makita   │  │ Stihl   │  │ Hikoki  │
    │ REST API │  │ SOAP    │  │ CSV FTP │
    └──────────┘  └─────────┘  └─────────┘
```

**Automatizált workflow:**

1. **Napi sync job** (cron) meghívja az adaptereket
2. Adapter lekéri a beszállító API-ból: új termékek, ár változások, készlet elérhetőség
3. Adapter normalizálja a formátumot (unified schema: product_code, name, price, availability)
4. KGC Inventory Core frissíti a katalógust
5. **Fallback:** Ha API nem elérhető → manuális CSV import vagy admin override

**Garanciális javítás integráció (Makita Norma - ADR-019):**

- Makita garanciális javítás munkalap automatikusan szinkronizálódik Makita szerviz rendszerrel
- Automata elszámolás: munkaóra + alkatrész költség vissza a Makita-tól

**Piaci újdonság:** Magyar ERP-k **nincs beszállító API integráció support** bérlési kontextusban. Nemzetközi rendszerek (Wynne Systems) enterprise tier-ben kínálnak beszállító integációt, de **nem magyar beszállítókkal** (Makita HU, Stihl HU).

---

### Piaci Kontextus és Versenyhelyzet

**Piaci rés validációja** (forrás: konkurencia-elemzes-gepberles-erp-2025-12-15.md):

#### Magyar Piac Elemzés

**Közvetlen versenytársak:**

- ❌ **Nincs** olyan magyar rendszer, amely integrált ERP + Bérlés + Szerviz + CRM-et kínál építőipari/mezőgazdasági gépbérlők számára

**Részleges átfedés:**

1. **ION Rent** - Kölcsönző szoftver, opcionális ERP integráció
   - ✅ Van: Bérlés tervezés, foglalás kezelés, vonalkódos azonosítás
   - ❌ Nincs: Beépített szerviz modul, CRM, pénzügyi modul, **AI funkciók**, **K-P-D helykód**, **transaction-based pricing**

2. **wSoft Rental** - Egyszerű kölcsönző program (22.990 Ft/év)
   - ✅ Van: Alapvető bérleti szerződések, foglalások
   - ❌ Nincs: Szerviz, készletkezelés, franchise multi-tenancy, **összes AI funkció**

3. **Cégmenedzser** - Moduláris ERP rendszer szerviz modullal
   - ✅ Van: Teljes ERP, szerviz modul, raktár, CRM
   - ❌ Nincs: **Bérlés-specifikus modul**, K-P-D helykód rendszer, **AI automatizáció**, transaction-based pricing

4. **Tharanis Ügyvitel** - Felhő alapú ügyviteli rendszer
   - ✅ Van: Számlázás, készlet, pénzügy, webshop integráció
   - ❌ Nincs: **Bérlés modul** (e-commerce fókusz, NEM releváns versenytárs)

**Következtetés:** Egy magyar gépbérlő cégnek **MA** válogatnia kell:

- **Opció A:** Veszek egy kölcsönző szoftvert (ION Rent, wSoft) + külön Excel a készlethez + külön szerviz program
- **Opció B:** Veszek egy általános ERP-t (Cégmenedzser) + customizálom bérléshez (drága, lassú)
- **Opció C:** Használom a KGC ERP v7.0-t (integrált platform, AI funkciók, franchise-ready)

---

#### Nemzetközi Piac Elemzés

**Enterprise szintű konkurensek:**

1. **Wynne Systems (Point of Rental / RentalMan)** - USA, enterprise bérlés ERP
   - ✅ Van: Teljes bérlés lifecycle, telematika, flotta kezelés
   - ❌ Gyengeség: **Drága** (100k+ EUR), angol nyelvű, nagyvállalati fókusz (KKV-nak túlméretezett)
   - ❌ Nincs: Transaction-based pricing (enterprise license), **AI funkciók** (chatbot, OCR, vision), **magyar lokalizáció**

2. **EZRentOut** - Felhő alapú bérlés platform (építőipar, heavy equipment)
   - ✅ Van: Valós idejű követés, 25% gyorsabb eszköz forgás
   - ❌ Gyengeség: **Angol nyelvű**, nincs magyar támogatás, USD árazás, nincs franchise multi-tenancy support
   - ❌ Nincs: **AI automatizáció**, K-P-D helykód rendszer, magyar NAV integráció

**Következtetés:** Nemzetközi rendszerek vagy túl drágák (enterprise tier), vagy nem támogatják a magyar piaci specifikus igényeket (NAV online számlázás, magyar nyelv, KKV méretű pricing).

---

#### Versenytárs Mátrix (Innovációs Pozicionálás)

```
                    BÉRLÉS-SPECIFIKUS FUNKCIÓK
                    Alacsony        Magas
                    │               │
        ┌───────────┼───────────────┼───────────┐
        │           │               │           │
 Magas  │  Cégm.    │               │  Wynne    │  A
        │  PEAS     │               │ (drága,   │  I
        │ (általános│               │ enterprise│
        │  ERP)     │               │   only)   │  F
        ├───────────┼───────────────┼───────────┤  U
        │           │               │           │  N
Alacsony│           │  ION Rent     │           │  K
        │           │  wSoft        │           │  C
        │           │ (basic only)  │           │  I
        └───────────┼───────────────┼───────────┘  Ó
                    │      ★        │
                    │   KGC ERP     │              K
                    │    v7.0       │
                    │ (AI + Multi-  │
                    │  tenant +     │
                    │ Transaction)  │
```

**KGC ERP v7.0 egyedülálló pozíció:** Magas bérlés-specifikus funkciók (K-P-D helykód, vonalkód paradigm, franchise onboarding) + Magas AI automatizáció + KKV-friendly pricing.

---

### Validációs Megközelítés

Az innovációk validálása **három forrásból** történt:

#### 1. Piaci Kutatás (Desk Research)

**Források:**

- **konkurencia-elemzes-gepberles-erp-2025-12-15.md** - Magyar és nemzetközi versenytársak funkció-összehasonlítása
- **KGC-Verzio-Elemzes-2025-12-30.md** - Ver:1.33z vs. v7.0 innovációs gap elemzés

**Validációs kérdések:**

1. Van-e magyar rendszer, amely ezt csinálja? → **NEM**
2. Van-e nemzetközi rendszer KKV áron? → **NEM**
3. Van-e 4 AI funkció integrálva egyetlen platformon? → **NEM**

**Eredmény:** Mind a 7 innováció **piaci rés** a magyar gépbérlés szektorban.

---

#### 2. User Journey Visszajelzések (Narrative Validation)

A 4 user journey konkrét **mérhető eredményeket** mutatott:

| Journey             | Metrika                                    | Régi rendszer | Új rendszer (v7.0) | Innováció validáció                    |
| ------------------- | ------------------------------------------ | ------------- | ------------------ | -------------------------------------- |
| **Kata (Pultos)**   | Árumozgatás rögzítési idő                  | 3-5 perc/gép  | 15-30 másodperc    | ✅ Vonalkód/QR + K-P-D gyorsítás (10x) |
| **László (Admin)**  | Inventory lookup idő                       | 3-8 perc      | 5 másodperc        | ✅ Real-time multi-warehouse dashboard |
| **Péter (Partner)** | Bevétel növekedés készlet optimalizálással | Nincs adat    | +22% (3 hónap)     | ✅ Business intelligence + analytics   |
| **Anna (DevOps)**   | Franchise onboarding idő                   | 24 óra        | 15 perc            | ✅ Automated RLS provisioning (96x)    |

**Következtetés:** User journey-k **számszerűsítik az innováció hatását** (nem csak "gyorsabb", hanem "10x gyorsabb konkrét idővel").

---

#### 3. Technikai Feasibility (Architektúra Validáció)

**ADR-ek (Architecture Decision Records) igazolják a megvalósíthatóságot:**

| Innováció                    | ADR                                                              | Technológia                            | Feasibility                                  |
| ---------------------------- | ---------------------------------------------------------------- | -------------------------------------- | -------------------------------------------- |
| AI Multi-Function Automation | ADR-016 (Koko), ADR-019 (OCR), ADR-020 (Vision), ADR-018 (Email) | Google Gemini Flash API                | ✅ Proven (Gemini API public, dokumentált)   |
| Transaction-Based Pricing    | ADR-003 (White-label), ADR-001 (Multi-tenancy)                   | PostgreSQL RLS + metering service      | ✅ Standard SaaS pattern                     |
| Franchise Onboarding         | ADR-001 (RLS automation)                                         | Automated schema creation scripts      | ✅ Implementálható (RLS tenant provisioning) |
| K-P-D Helykód Rendszer       | ADR-021 (Location Hierarchy)                                     | 3-tier location schema (K-P-D)         | ✅ Standard inventory management pattern     |
| Vonalkód/QR Paradigm         | ADR-022 (Barcode/QR Strategy)                                    | Hibrid stratégia (gyári + generált QR) | ✅ Off-the-shelf QR libraries                |
| Audit Trail                  | ADR-006 (Audit Logging)                                          | Immutable append-only log táblák       | ✅ Standard compliance pattern               |
| Beszállító API               | ADR-017 (Supplier Adapter Pattern)                               | REST/SOAP/CSV adapter architektúra     | ✅ Standard integration pattern              |

**Következtetés:** Mind a 7 innováció **technológiailag megvalósítható** off-the-shelf technológiákkal (nincs R&D kockázat).

---

### Kockázatkezelés

Az innovációk kockázatai és fallback stratégiák:

#### 1. AI Multi-Function Automation Kockázatok

**Kockázat:** Google Gemini API költség skálázódik nagy tranzakciószámnál (1000+ chatbot interakció/nap)

**Mitigáció:**

- **Tier-based AI usage limits** - Startup tier: 100 AI query/hó ingyen, Standard tier: 1000 AI query/hó, Enterprise tier: unlimited
- **Fallback:** AI quota túllépés → human escalation (Chatwoot support agent veszi át)
- **Cost monitoring:** Real-time Gemini API költség tracking, alert ha meghaladja a tier limitet

**Kockázat:** Gemini API downtime → Koko chatbot nem működik

**Mitigáció:**

- **Fallback:** Chatbot offline → automatic redirect Chatwoot support tickethez
- **Status page:** Gemini API health check, user értesítés ha AI service unavailable

---

#### 2. Transaction-Based Pricing Kockázatok

**Kockázat:** Partner "gaming the system" - sok apró tranzakció helyett egy nagy batch (csökkenteni SaaS költséget)

**Mitigáció:**

- **Fair use policy:** Batch tranzakció (10+ tétel egy számlán) = 10 tranzakció díj (nem 1)
- **Monitoring:** Anomália detektálás (partner hirtelen batch-el mindent)

**Kockázat:** Partner nem érti a hibrid árazást (alap díj + user licensz) → dispute

**Mitigáció:**

- **Transparent dashboard:** Partner látja real-time: "Eddig havi 47 tranzakció = 23.5k Ft költség"
- **Email notification:** Heti összefoglaló email tranzakció breakdown-nal
- **Pricing calculator:** Partner előre kalkulálhatja: "Ha 200 bérlés/hó lesz, mennyi a költség?"

---

#### 3. Franchise Onboarding Automation Kockázatok

**Kockázat:** Automated RLS schema creation elromlik → új partner nem tud belépni

**Mitigáció:**

- **Pre-flight validation:** Wizard "Deploy" gomb előtt schema creation teszt futtatása staging DB-n
- **Rollback mechanism:** Ha deploy fail → automatic rollback, admin notification
- **Manual fallback:** DevOps admin manuálisan létrehozhatja a tenant-ot (régi 24 órás process)

**Kockázat:** Partner rossz warehouse config-ot ad meg (pl. 1000 polc, de tényleg csak 50 van)

**Mitigáció:**

- **Warehouse config wizard validációk:** Polc szám max 100, doboz szám max 200 (gyakorlati limitek)
- **Post-onboarding edit:** Partner később módosíthatja a K-P-D konfigot (új polcok hozzáadása)

---

#### 4. K-P-D Helykód Rendszer Kockázatok

**Kockázat:** Pultos rossz K-P-D kódot rögzít → bérgép "elvész" a raktárban

**Mitigáció:**

- **Validációs szabályok:** K-P-D kód létezik-e a warehouse config-ban (nem lehet `K99-P999-D999` ha nincs ilyen polc)
- **Recent locations autocomplete:** Utoljára használt K-P-D kódok gyors kiválasztása (csökkenti elgépelést)
- **Audit trail + correction:** Admin látja: ki, mikor rögzítette a K-P-D kódot → javíthatja ha hiba

**Kockázat:** Fizikai raktár átrendezés → K-P-D kódok elavulnak

**Mitigáció:**

- **Bulk K-P-D update:** Admin átnevezheti a polcokat (pl. régi P1-P10 → új P11-P20)
- **Migration wizard:** "Átköltöztettük a Bosch zónát K1-ről K3-ra" → bulk update

---

#### 5. Vonalkód/QR Paradigm Kockázatok

**Kockázat:** Gyári vonalkód olvashatatlan (lekopott, sérült) → bérgép nem azonosítható

**Mitigáció:**

- **Manual serial number lookup:** Ha vonalkód scan fail → pultos begépelheti a serial number-t manuálisan
- **QR kód újranyomtatás:** Rendszer-generált QR kód címke újranyomtatása (serial number + K-P-D)

**Kockázat:** Partner nem akarja kinyomtatni a QR kód címkéket (extra munka)

**Mitigáció:**

- **Opcionális funkció:** Vonalkód/QR paradigm opcionális (partner választhat: használja vagy nem)
- **Onboarding incentive:** "Nyomtass ki 100 QR címkét az első hónapban → 10% SaaS discount"

---

#### 6. Audit Trail Kockázatok

**Kockázat:** Audit log táblák túl gyorsan növekednek → DB tárhely probléma

**Mitigáció:**

- **Log retention policy:** Audit trail 2 év után archiválódik S3-ba (cold storage)
- **Compression:** Audit log JSON diff-ek gzip tömörítéssel tárolva

**Kockázat:** Partner kifogásolja: "Miért látja a központ, hogy mit csinálok?"

**Mitigáció:**

- **Transparent policy:** Franchise szerződésben rögzítve: audit trail a franchise compliance miatt szükséges
- **Role-based access:** Partner admin saját audit log-ját látja, központi admin csak fraud detection esetén fér hozzá

---

#### 7. Beszállító API Automatizálás Kockázatok

**Kockázat:** Makita/Stihl API változik → adapter elromlik → nincs ár/készlet frissítés

**Mitigáció:**

- **API versioning:** Adapter támogatja a beszállító API v1, v2, v3 verziókat (backward compatibility)
- **Fallback:** Ha API sync fail → manuális CSV import vagy admin override
- **Monitoring:** Daily API health check, alert ha sync 2+ napja nem sikerült

**Kockázat:** Beszállító nem ad API-t (csak Excel export hetente egyszer)

**Mitigáció:**

- **CSV adapter:** FTP/SFTP-ről automatikus CSV letöltés és import
- **Manual upload:** Admin feltöltheti a beszállító Excel-jét → system parseol és importál

---

## SaaS B2B Platform-Specifikus Követelmények

A KGC ERP v7.0 egy **SaaS B2B platform** építőipari és mezőgazdasági gépbérléssel foglalkozó franchise hálózatok számára. Az alábbi szekció részletezi a multi-tenant architektúra, jogosultságkezelés, subscription modell, integrációk és compliance követelmények technikai specifikációit.

### Multi-Tenant Architektúra

**Tenant Isolation Model:** PostgreSQL Row Level Security (RLS) - ADR-001

A KGC ERP v7.0 **franchise partner-alapú multi-tenancy modellt** implementál, ahol minden franchise partner egy elkülönített tenant, de közös adatbázis sémában dolgoznak RLS policy-k segítségével.

#### Tenant Isolation Stratégia

**Database-level Isolation:**

- **Shared Schema + RLS Policies** - Egyetlen PostgreSQL adatbázisban minden tenant közös sémát használ, de row-level security policy-k biztosítják az adatizolációt
- **Tenant Identifier:** Minden táblában `partner_id` foreign key mező → franchise partner azonosító
- **RLS Policy Example:**
  ```sql
  CREATE POLICY partner_isolation_policy ON rentals
    USING (partner_id = current_setting('app.current_partner_id')::uuid);
  ```
- **Session Variable:** Backend minden request-nél beállítja az aktuális `partner_id`-t session variable-ba → RLS automatikusan szűr

#### Tenant Provisioning Workflow

**Automated Franchise Onboarding (15 perc vs. 24 óra manual):**

1. **Partner Info Capture** - Franchise Onboarding Wizard (Anna DevOps journey)
   - Partner meta: company name, VAT number, address, contact person email
   - Partner tier selection (hibrid árazás pricing tier)

2. **RLS Schema Setup** - Automated PostgreSQL schema provisioning
   - Partner record létrehozása `partners` táblában
   - Initial warehouse config insertion (K-P-D location hierarchy generálás)
   - RLS policy aktiválása az új `partner_id`-ra

3. **User Provisioning** - Email-based user account creation
   - Admin user creation (franchise partner tulajdonos role)
   - Bulk user import (pultosok / értékesítők email listája)
   - Onboarding email kiküldése login linkkel + kezdeti jelszó

4. **Data Seeding** - Initial inventory és katalógus
   - Központi termék katalógus másolása (Bosch, Makita, Stihl terméklista)
   - Partner-specifikus árképzés konfiguráció (pricing tier alapján)
   - Sample data opcionális betöltése (demo gépek, demo bérlések)

**Technikai implementáció:** `POST /api/admin/partners/onboard` endpoint → automatizált script futtatás (DB schema + email + seeding)

---

#### Tenant-közi Láthatósági Szabályok

**Ki mit láthat a franchise hálózaton keresztül:**

| Aktor                            | Saját partner adatai                                                            | Más partnerek adatai                                                      | Központi HQ adatai                |
| -------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------- |
| **Pultos / Értékesítő**          | ✅ Saját warehouse inventory<br>✅ Saját bérlési tranzakciók                    | ❌ Nincs láthatóság                                                       | ❌ Nincs láthatóság               |
| **Központi admin**               | ✅ Minden partner inventory<br>✅ Cross-warehouse analytics                     | ✅ READ-ONLY minden partnernél<br>✅ Cross-warehouse transfer koordinálás | ✅ Teljes hozzáférés HQ adatokhoz |
| **Franchise partner tulajdonos** | ✅ Saját bevételi dashboard<br>✅ Készlet analytics<br>✅ Transaction breakdown | ❌ Nincs láthatóság<br>(franchise partnerek izolálva)                     | ❌ Csak subscription billing info |
| **DevOps admin**                 | ✅ Tenant metadata (status, tier)<br>✅ Partner onboarding history              | ✅ Tenant health metrics<br>✅ System-wide monitoring                     | ✅ Teljes technikai access        |

**RLS Implementation:** `partners.visibility_scope` enum (`own_only`, `read_all_partners`, `admin_full_access`)

---

### Szerepkör Alapú Hozzáférés-vezérlés (RBAC) Mátrix

**5 fő role a KGC ERP v7.0-ban:**

#### 1. Pultos / Értékesítő (Counter Sales Role)

**User Journey:** Kata (29) - Debreceni franchise bolt

**Permissions:**

| Modul               | READ                                                             | WRITE                                                                         | DELETE | SPECIAL                          |
| ------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------ | -------------------------------- |
| **Inventory**       | ✅ Saját warehouse<br>✅ K-P-D lookup<br>✅ Serial number search | ✅ Árumozgatás rögzítés<br>✅ K-P-D kód bevitel<br>✅ Vonalkód scan           | ❌     | 🔍 Real-time inventory lookup    |
| **Bérlés**          | ✅ Bérlési tranzakciók<br>✅ Ügyfél adatlap                      | ✅ Bérlés kiadás/visszavétel<br>✅ Kaució rögzítés<br>✅ Tartozékok hozzáadás | ❌     | 💳 MyPos payment terminal access |
| **Szerviz**         | ✅ Munkalapok (read-only)                                        | ✅ Szerviz munkalapon jegyzet                                                 | ❌     | -                                |
| **Értékesítés**     | ✅ Terméklista                                                   | ✅ Értékesítési tranzakció rögzítés                                           | ❌     | -                                |
| **Admin Dashboard** | ❌                                                               | ❌                                                                            | ❌     | -                                |

**RLS Filter:** `WHERE partner_id = current_partner AND warehouse_id = user_assigned_warehouse`

---

#### 2. Boltvezető (Store Manager Role)

**User Journey:** Tamás (35) - Budapest belváros

**Permissions:**

| Modul                    | READ                                                                   | WRITE                                                                                      | DELETE                              | SPECIAL                                        |
| ------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------- | ---------------------------------------------- |
| **Inventory**            | ✅ Saját warehouse<br>✅ K-P-D lookup<br>✅ Serial number search       | ✅ Árumozgatás rögzítés<br>✅ K-P-D kód bevitel                                            | ❌                                  | ❌ Készlet átmozgatás NEM (központi admin jog) |
| **Bérlés**               | ✅ Bérlési tranzakciók<br>✅ Ügyfél adatlap                            | ✅ Bérlés kiadás/visszavétel<br>✅ Kaució rögzítés<br>✅ **Korlátozott árazás (max ±20%)** | ❌                                  | 💰 Kedvezmény/felár max ±20% keretben          |
| **Szerviz**              | ✅ Munkalapok (read-only)                                              | ✅ Szerviz munkalapon jegyzet                                                              | ❌                                  | -                                              |
| **Értékesítés**          | ✅ Terméklista                                                         | ✅ Értékesítési tranzakció rögzítés<br>✅ **Korlátozott árazás (max ±20%)**                | ❌                                  | 💰 Kedvezmény/felár max ±20% keretben          |
| **HR Alapfunkciók**      | ✅ Dolgozók listája                                                    | ✅ Új dolgozó felvétel                                                                     | ❌ Elbocsátás NEM (tulajdonosi jog) | 👤 HR korlátozott hozzáférés                   |
| **Boltvezető Dashboard** | ✅ Napi forgalom real-time<br>✅ Tranzakciószám<br>✅ Átlag kosárérték | ❌                                                                                         | ❌                                  | 📊 Real-time forgalom monitoring               |

**RLS Filter:** `WHERE partner_id = current_partner AND warehouse_id = user_assigned_warehouse AND role = 'store_manager'`

**Korlátok:**

- Kedvezmény/felár: max ±20% (túllépésnél tulajdonosi jóváhagyás szükséges)
- HR: dolgozó felvétel IGEN, elbocsátás NEM
- Készlet: READ igen, készlet átmozgatás NEM

---

#### 3. Központi Admin (Central Operations Admin)

**User Journey:** László (45) - Budapest HQ

**Permissions:**

| Modul                            | READ                                                                                   | WRITE                                                                      | DELETE                                   | SPECIAL                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| **Inventory**                    | ✅ **Minden warehouse**<br>✅ Cross-warehouse analytics<br>✅ Készlet forgási sebesség | ✅ Cross-warehouse transfer<br>✅ Bulk K-P-D update<br>✅ Warehouse config | ✅ Inventory correction (admin override) | 📊 Multi-warehouse dashboard<br>🔄 Transfer workflow coordination |
| **Bérlés**                       | ✅ Minden partner bérlései                                                             | ✅ Bérlési díj override (audit trail-lel)                                  | ❌                                       | 🚨 Késedelmi díj manual adjustment                                |
| **Franchise Partner Management** | ✅ Partner dashboards<br>✅ Transaction breakdown                                      | ❌ Pricing tier change (csak DevOps)                                       | ❌                                       | 📈 Partner performance analytics                                  |

**RLS Filter:** `WHERE visibility_scope = 'read_all_partners'` (user role check application level-en)

---

#### 4. Franchise Partner Tulajdonos (Partner Owner)

**User Journey:** Péter (38) - Szegedi franchise partner

**Permissions:**

| Modul                     | READ                                                                                      | WRITE                                                                    | DELETE                               | SPECIAL                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------- |
| **Business Intelligence** | ✅ Saját bevételi dashboard<br>✅ Készlet analytics<br>✅ Hibrid árazás billing breakdown | ❌                                                                       | ❌                                   | 📊 Real-time revenue tracking<br>💰 Transparent SaaS cost calculator |
| **User Management**       | ✅ Saját franchise partner users                                                          | ✅ User létrehozás/törlés<br>✅ Role assignment (partner scope-on belül) | ✅ User deletion                     | 👥 Bulk user import CSV                                              |
| **Warehouse Config**      | ✅ K-P-D helykód rendszer                                                                 | ✅ Polc/doboz hozzáadás/átnevezés                                        | ❌ Warehouse törlés (központi admin) | 🏗️ Warehouse config wizard                                           |
| **Pricing**               | ✅ Saját pricing tier info                                                                | ❌ Tier change (request → DevOps approval)                               | ❌                                   | -                                                                    |

**RLS Filter:** `WHERE partner_id = user_partner_id`

---

#### 5. DevOps Admin (System Administrator)

**User Journey:** Anna (32) - KGC központ IT/DevOps

**Permissions:**

| Modul                     | READ                                                                                   | WRITE                                                                                                            | DELETE                               | SPECIAL                                                           |
| ------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| **Tenant Management**     | ✅ Minden tenant metadata<br>✅ Partner onboarding history<br>✅ System health metrics | ✅ Franchise onboarding wizard<br>✅ RLS schema creation<br>✅ Tenant provisioning<br>✅ Pricing tier assignment | ✅ Tenant deactivation (soft delete) | 🚀 Automated onboarding (15 perc)<br>🔧 Manual rollback mechanism |
| **Monitoring**            | ✅ Transaction count/partner<br>✅ API usage metrics<br>✅ Gemini AI cost tracking     | ✅ Alert threshold beállítás<br>✅ Partner quota limits                                                          | ❌                                   | 📉 Real-time DevOps monitoring dashboard                          |
| **Partner Business Data** | ❌ Bevétel, inventory details<br>(csak metadata)                                       | ❌                                                                                                               | ❌                                   | 🔒 Privacy: DevOps nem látja üzleti adatokat                      |

**Application-Level Check:** DevOps role csak tenant metadata és system metrics-hez fér hozzá, business data RLS-sel blokkolva.

---

### Hibrid Árazási Modell (Alap díj + User-based licensing)

**Pricing Philosophy:** Hibrid modell, ahol a franchise partnerek havi SaaS költsége egy fix alap díjból és a felhasználók száma alapján kalkulált user licensz díjból áll.

#### Árazási Szintek Áttekintése

**Javasolt tier struktúra** (Q24 kérdés későbbi válaszra vár, de interim modell):

| Tier           | Max Users | Havi alap díj | User licensz díj | AI Query Limit | Extra user díj |
| -------------- | --------- | ------------- | ---------------- | -------------- | -------------- |
| **Startup**    | 1-3 user  | 25.000 Ft/hó  | 5.000 Ft/user/hó | 100 query/hó   | 7.000 Ft/user  |
| **Standard**   | 4-10 user | 50.000 Ft/hó  | 4.000 Ft/user/hó | 1000 query/hó  | 5.000 Ft/user  |
| **Enterprise** | 10+ user  | Egyedi árazás | Egyedi árazás    | Unlimited      | Egyedi         |

**Licensing Strategy:**

- **Alap díj:** Fix havi díj partnerenként (infrastruktúra, support, frissítések)
- **User licensz:** Aktív felhasználók száma alapján (Pultos, Boltvezető, Admin)
- **Billing Cycle:** Havi billing, előző hónap user count alapján
- **Transparent Dashboard:** Partner látja: "Alap díj: 50.000 Ft + 6 user × 4.000 Ft = 74.000 Ft/hó"

**Fair Use Policy (Q24 kérdés validációra vár):**

- Inaktív user (30+ nap nincs login) = fél díj
- Temporary user (szezonális munkás) = napi arányosítás lehetséges

---

### Integrációs Architektúra

**Integrációs stratégia:** CORE integrations (MVP) vs. PLUGIN integrations (opcionális modulok)

#### CORE Integrációk (MVP Kötelező)

**1. NAV Online Számlázás (ADR-013)**

- **Státusz:** Kötelező (magyar jogszabályi követelmény)
- **Scope:** Real-time számla kiállítás NAV API-n keresztül
- **Implementáció:** Node.js NAV API SDK integráció
- **Kritikusság:** HIGH - nélküle a rendszer nem használható Magyarországon

**2. MyPos Payment Terminal (ADR-005)**

- **Státusz:** CORE (kaució blokkolás kritikus a bérlés workflow-hoz)
- **Scope:** Kártya kaució blokkolás, kaució visszatérítés
- **Implementáció:** MyPos REST API → tokenization (PCI DSS compliance)
- **Kritikusság:** HIGH - bérlés kiadás/visszavétel core funkció

**3. Google Gemini AI - Koko Chatbot (ADR-016)**

- **Státusz:** CORE (Innovation differentiator)
- **Scope:** 24/7 multi-channel support chatbot, FAQ handling
- **Implementáció:** Gemini Flash API + Chatwoot escalation
- **Kritikusság:** MEDIUM - Innovation core, de fallback: direct Chatwoot

**4. Beszállító API-k (ADR-017)**

- **Státusz:** CORE (készlet frissítés automatizálás)
- **Scope:** Makita, Stihl, Hikoki termék katalógus + ár sync
- **Implementáció:** Adapter pattern (REST/SOAP/CSV)
- **Kritikusság:** MEDIUM - Fallback: manuális CSV import

---

#### PLUGIN Integrációk (Opcionális Modulok - 2. Fázis)

**5. Chatwoot Support (ADR-015)**

- **Modul:** Support Plugin (ki/bekapcsolható)
- **Scope:** Multi-channel support (email, chat, Facebook Messenger)
- **Pricing Impact:** Plugin modul usage = extra díj? (Q25 validációra vár)

**6. Twenty CRM (ADR-015)**

- **Modul:** CRM Plugin
- **Scope:** Lead tracking, marketing automation, sales pipeline
- **Pricing Impact:** CRM plugin használat = extra havi díj?

**7. Horilla HRMS (ADR-015)**

- **Modul:** HR Plugin
- **Scope:** Jelenlét, szabadság kezelés, payroll integráció
- **Pricing Impact:** HR plugin használat = extra havi díj?

**8. Gemini AI Extended Features (ADR-018, ADR-019, ADR-020)**

- **Scope:** OCR számla feldolgozás, 3D fotó sérülésdetektálás, Email thread parsing
- **Pricing Impact:** AI Extended usage = tier-based quota (Q24 validációra vár)

**Plugin Architecture (ADR-014):**

- Moduláris architektúra → frontend + backend plugin komponensek
- Ki/bekapcsolás partner szinten (`partners.enabled_plugins` JSON mező)
- Plugin usage metering → billing system-be integráció

---

### Megfelelőségi és Biztonsági Követelmények

**Compliance Scope:** MVP kritikus compliance vs. Phase 2 enhanced compliance

#### MVP Kritikus Megfelelőség

**1. NAV Online Számlázás Compliance**

- **Követelmény:** Magyar jogszabályi kötelezettség (GDPR + NAV törvény)
- **Implementáció:** NAV API v3.0 real-time számlázás
- **Scope:** Bérlési díj, szerviz munkalap, értékesítés számlázás
- **Validáció:** NAV teszt környezet sikeres integráció teszt

**2. GDPR Compliance Alapok**

- **User Data Privacy:** Ügyfél adatok titkosítása (PostgreSQL column encryption)
- **Right to be Forgotten:** Cascade delete implementáció (ügyfél törlésekor minden kapcsolódó adat törlődik)
- **Consent Management:** Explicit user consent GDPR-compliant formokkal
- **Data Export:** GDPR data export API (ügyfél kérheti adatai letöltését)

**3. Audit Trail (ADR-006)**

- **Immutable Logging:** Minden bérlési/szerviz/értékesítési művelet append-only log táblában
- **Log Content:** KI (user_id + name), MIT (action_type), MIKOR (timestamp UTC), MIÉRT (optional note), VÁLTOZÁS (JSON diff)
- **Retention:** 2 év audit trail retention, utána S3 cold storage archiválás
- **Compliance Use:** NAV audit, franchise partner transparency, dispute resolution

**4. Multi-Tenancy RLS Security (ADR-001)**

- **Tenant Isolation:** PostgreSQL RLS policy minden táblán
- **Session Security:** `app.current_partner_id` session variable validáció minden request-nél
- **Cross-Tenant Attack Prevention:** Application-level partner_id check + DB-level RLS double protection

---

#### Közepes Prioritás Megfelelőség (MVP Nice-to-Have vagy 2. Fázis)

**5. PCI DSS Compliance**

- **MyPos Tokenization:** Kártyaadatok soha nem tárolódnak KGC adatbázisban, csak MyPos tokenek
- **Scope:** PCI DSS Level 4 SAQ A-EP (self-assessment)
- **Validáció:** Q19 kérdés validációra vár (tokenization elég-e MVP-ben vagy teljes PCI audit kell)

**6. Equipment Liability Documentation**

- **AI-Powered Sérülésdetektálás (ADR-020):** 360° fotó + AI comparison kár dokumentáláshoz
- **Scope:** Fotó evidence elegendő-e vagy digitális szerződés aláírás is kell?
- **Validáció:** Q21 kérdés validációra vár

---

#### Alacsony Prioritás (2. Fázis)

**7. ISO 27001 Compliance**

- **Cél:** Enterprise tier franchise partnerek követelménye (nagy cégek beszállítói audit)
- **Scope:** Security management system certification
- **Timeline:** Phase 2 vagy 3 (MVP után)

**8. Financial Regulations Detailed Audit**

- **Kaució/Késedelmi Díj:** Alapvető logika MVP-ben, részletes pénzügyi audit Phase 2
- **Scope:** Pénzügyi tranzakció compliance audit (Q22 validációra vár)

---

## Projekt Hatókör és Fázisolt Fejlesztés

A KGC ERP v7.0 fejlesztése **3 fázisra** oszlik, ahol az **MVP (Phase 1) a 4 core user journey fájdalmát oldja meg** mérhető business value szállításával. Az alábbi scoping stratégia biztosítja, hogy a minimális viable product valóban működőképes és értékteremtő legyen, miközben a nice-to-have funkciók későbbi fázisokra kerülnek.

### MVP Stratégia és Filozófia

**MVP Típus:** Problem-Solving MVP

**Fő Üzleti Probléma:**

> "Áruk nyomon követésének hiányosságai a meglévő rendszerben" - Executive Summary

**MVP Célkitűzés:**
A legkisebb feature set, amely:

1. ✅ **Megoldja a 4 core user journey fájdalmat** (Kata, László, Péter, Anna)
2. ✅ **Mérhető business value-t szállít** (10x árumozgatás gyorsítás, 96x onboarding gyorsítás, 22% bevétel növekedés)
3. ✅ **Franchise-ready multi-tenant platform** (RLS alapú tenant isolation + automated onboarding)
4. ✅ **Innovation differentiator működik** (legalább 1-2 AI funkció: Koko chatbot + inventory tracking)

**MVP Success Criteria (User Journey alapján):**

| User Journey                | Fájdalom (Régi rendszer)              | MVP Target (v7.0)            | Siker Metrika                      |
| --------------------------- | ------------------------------------- | ---------------------------- | ---------------------------------- |
| **Kata (Pultos)**           | Árumozgatás rögzítés 3-5 perc/gép     | < 30 másodperc/gép           | ✅ 10x gyorsítás                   |
| **László (Központi Admin)** | Inventory lookup 3-8 perc             | < 5 másodperc                | ✅ 48-96x gyorsítás                |
| **Péter (Partner)**         | Nincs real-time business intelligence | Real-time bevételi dashboard | ✅ 22% bevétel növekedés (3 hónap) |
| **Anna (DevOps)**           | Franchise onboarding 24 óra           | < 15 perc                    | ✅ 96x gyorsítás                   |

**MVP Filozófia - "Must-Have" Decision Framework:**

- ❓ **Without this feature, does the product fail to solve the core problem?** → YES = MVP
- ❓ **Can this be manual initially or added later?** → NO = MVP, YES = Phase 2
- ❓ **Is this a deal-breaker for early adopters (franchise partners)?** → YES = MVP
- ❓ **Does this feature enable measurable business value in the first 90 days?** → YES = MVP

---

### MVP Funkciókészlet (1. Fázis)

**Timeline:** MVP Development + Initial Deployment (90-120 nap)
**Success Gate:** 3 pilot franchise partner sikeres onboarding + 90 nap production use

#### 1. CORE Modulok (Kötelező Komponensek)

##### 1.1 Inventory Modul ⭐ CRITICAL

**Scope:**

- ✅ K-P-D (Kommandó-Polc-Doboz) helykód rendszer (ADR-021)
  - 3-tier location hierarchy: `K{1-20}-P{1-100}-D{1-200}`
  - Automated K-P-D generation wizard franchise onboarding során
  - Warehouse config builder (polc/doboz hozzáadás/átnevezés)
- ✅ Vonalkód/QR kód integráció (ADR-022)
  - Gyári vonalkód scan support (Bosch, Makita, Stihl gépek)
  - Rendszer-generált QR kód fallback (gyári kód hiányában)
  - Nyomtatható QR címkék (serial number + K-P-D kód)
- ✅ Multi-Warehouse Real-Time Tracking
  - Központi admin dashboard (László journey): "Hol van az összes Bosch fúrógép?"
  - Serial number alapú bérgép lokalizálás (< 5 másodperc response time)
  - Készlet státusz tracking: bent / kint / szerviz / destroyed / lost / sold
- ✅ Árumozgatás Rögzítés Workflow (Kata journey)
  - Egy képernyős workflow: Vonalkód scan → K-P-D bevitel → Auto-save
  - Mobile-first UI (tablet/telefon támogatás raktárban)
  - Target: < 30 másodperc árumozgatás rögzítés (vs. régi 3-5 perc)

**Out-of-Scope (Phase 2):**

- ❌ Cross-warehouse transfer workflow automation (MVP: manual koordináció Slack-en)
- ❌ Bulk K-P-D update wizard (MVP: manuális egyenkénti módosítás)
- ❌ Készlet forgási sebesség analytics (MVP: basic inventory count report)

**Acceptance Criteria:**

- Kata (pultos) 8 gépet 3 perc alatt raktároz (korábban 40 perc)
- László (admin) 5 másodperc alatt talál egy konkrét bérgépet 6 warehouse között
- K-P-D kód validáció működik (nem lehet nem létező polcot beírni)

---

##### 1.2 Bérlés Modul ⭐ CRITICAL

**Scope:**

- ✅ E2E Bérlés Workflow
  - Ügyfél kiválasztás/új ügyfél felvétel
  - Bérgép kiválasztás (inventory lookup)
  - Bérlési díj kalkuláció (napi/heti/30 nap)
  - Kaució összeg meghatározás
  - Bérlés kiadás státusz (inventory: bent → kint)
  - Bérlés visszavétel + késedelmi díj automatikus számítás
- ✅ Kaució Kezelés (MyPos integráció - ADR-005)
  - Kártya kaució blokkolás (MyPos terminal)
  - Kaució visszatérítés workflow
  - Készpénz kaució opció (manual tracking)
- ✅ Tartozékok Kezelés
  - Töltő, akkumulátor, kiegészítők bérléshez csatolása
  - Tartozék visszavétel checklist (hiány jelzés)
- ✅ Audit Trail (ADR-006)
  - Minden bérlési művelet immutable log (KI, MIT, MIKOR, MIÉRT, JSON diff)

**Out-of-Scope (Phase 2):**

- ❌ Bérlés foglalási rendszer (reservation system) - MVP: walk-in only
- ❌ Online bérlés portal (ügyfél self-service) - MVP: pultos rögzít mindent
- ❌ Bérlés díj override audit alert (MVP: audit trail rögzít, de nincs auto-alert)

**Acceptance Criteria:**

- Pultos 5 perc alatt kiad egy bérlést (ügyfél adatok + gép + kaució + tartozékok)
- MyPos kaució blokkolás működik (teszt transaction sikeres)
- Késedelmi díj automatikusan számolódik (30 nap bérlés, 3 nap késés = +3 nap díj)

---

##### 1.3 Szerviz Modul

**Scope:**

- ✅ Szerviz Munkalap Workflow
  - Bérgép státusz: kint/bent → szerviz
  - Munkalap létrehozás (probléma leírás, alkatrészek, munkaóra)
  - Garanciális javítás jelölés (Makita norma - ADR-019 basic)
  - Szerviz befejezés → státusz: szerviz → bent
- ✅ Inventory Integration
  - Szervizbe kerülő gép inventory státusz auto-update
  - Alkatrész készlet csökkentés (ha szerviz során csere történik)

**Out-of-Scope (Phase 2):**

- ❌ Makita garanciális javítás API sync (ADR-019 extended) - MVP: manual elszámolás
- ❌ Szerviz munkaóra kalkulátor (standard óradíj × munkaóra) - MVP: manual bevitel
- ❌ Szerviz analitika (átlagos javítási idő, gyakori hibák) - Phase 2

**Acceptance Criteria:**

- Szerviz munkalap létrehozás < 2 perc (probléma leírás + alkatrész lista)
- Bérgép státusz szinkronban van (szerviz alatt lévő gép nem kiadható bérlésre)

---

##### 1.4 Értékesítés Modul

**Scope:**

- ✅ Termékeladás Workflow
  - Termék kiválasztás inventory-ból
  - Értékesítési tranzakció rögzítés
  - Készlet csökkentés (inventory auto-update)
  - NAV számla kiállítás (ADR-013)
- ✅ Audit Trail
  - Értékesítési művelet immutable log

**Out-of-Scope (Phase 2):**

- ❌ Értékesítési analytics (top termékek, bevétel trend) - Phase 2
- ❌ Készlet low-stock alert (automatikus értesítés ha termék fogy) - Phase 2

**Acceptance Criteria:**

- Termékeladás rögzítés < 1 perc (termék + mennyiség + NAV számla)
- Inventory automatikusan csökken értékesítés után

---

##### 1.5 Pénzügy Modul (Basic)

**Scope:**

- ✅ MyPos Payment Integráció (ADR-005)
  - Kártya kaució blokkolás/visszatérítés
  - Payment transaction log
- ✅ Késedelmi Díj Számítás
  - Automatikus késedelmi díj kalkuláció (bérlés lejárat után napi díj)
- ✅ Audit Trail
  - Pénzügyi tranzakciók immutable log (compliance)

**Out-of-Scope (Phase 2):**

- ❌ Banki elszámolás automata import (bank statement parsing) - MVP: manual
- ❌ Pénzügyi jelentések (P&L, cash flow) - Phase 2
- ❌ Multi-currency support - Phase 3 (MVP: HUF only)

**Acceptance Criteria:**

- MyPos payment sikeres (kaució blokkolás + visszatérítés teszt)
- Késedelmi díj helyesen számolódik (30 nap bérlés + 5 nap késés = +5 nap bérlési díj)

---

#### 2. CORE Integrációk (MVP Must-Have)

##### 2.1 NAV Online Számlázás ⭐ CRITICAL

**Scope:**

- ✅ NAV API v3.0 integráció (ADR-013)
  - Real-time számla kiállítás (bérlés, szerviz, értékesítés)
  - NAV API error handling (retry logic, fallback manual számlázás)
- ✅ Számlatípusok Support
  - Egyszerűsített számla (magánszemély)
  - Adóalany számla (cég, VAT number)

**Out-of-Scope (Phase 2):**

- ❌ NAV API v4.0+ migration - MVP: v3.0 elég
- ❌ Automata stornó számla (credit note) - MVP: manual

**Acceptance Criteria:**

- NAV teszt környezet sikeres számla kiállítás (100% success rate 10 teszt számlából)
- NAV API downtime fallback működik (manual számlázás + későbbi NAV sync)

---

##### 2.2 MyPos Payment Terminal ⭐ CRITICAL

**Scope:**

- ✅ MyPos REST API integráció (ADR-005)
  - Kártya kaució blokkolás (authorization hold)
  - Kaució visszatérítés (refund/void)
  - Payment tokenization (PCI DSS SAQ A-EP compliance)

**Out-of-Scope (Phase 2):**

- ❌ MyPos terminal fizikai integráció (bluetooth/USB) - MVP: manual terminal use + API sync
- ❌ PCI DSS teljes audit - MVP: tokenization elég

**Acceptance Criteria:**

- 10 teszt tranzakció sikeres (kaució blokkolás + visszatérítés)
- Kártyaadatok soha nem tárolódnak KGC DB-ben (csak MyPos tokenek)

---

##### 2.3 Google Gemini AI - Koko Chatbot Basic ⭐ INNOVATION DIFFERENTIATOR

**Scope:**

- ✅ Gemini Flash API integráció (ADR-016)
  - 24/7 FAQ handling chatbot (magyar nyelv)
  - Basic support kérdések (nyitvatartás, árak, bérlési feltételek)
  - Chatwoot escalation (komplex kérdés → human agent)
- ✅ AI Usage Metering
  - Tier-based AI query limit (Startup: 100/hó, Standard: 1000/hó)
  - AI quota túllépés → fallback: direct Chatwoot

**Out-of-Scope (Phase 2):**

- ❌ Multi-channel chatbot (Facebook Messenger, WhatsApp) - MVP: web chat only
- ❌ AI intent recognition advanced (custom NLP training) - MVP: Gemini off-the-shelf
- ❌ AI-generated email responses - Phase 2 (ADR-018 extended)

**Acceptance Criteria:**

- Koko chatbot válaszol 10 gyakori kérdésre (FAQ teszt)
- Chatwoot escalation működik (komplex kérdés → support ticket auto-creation)
- AI quota limit működik (101. query Startup tier-ben → fallback Chatwoot)

---

#### 3. CORE Franchise Multi-Tenancy (MVP Must-Have)

##### 3.1 Franchise Onboarding Wizard ⭐ CRITICAL (Anna Journey)

**Scope:**

- ✅ Automated Onboarding Workflow (ADR-001)
  1. Partner info bevitel (név, cím, VAT number, contact email)
  2. Warehouse config (K-P-D rendszer auto-generálás)
  3. Initial inventory import (CSV upload vagy központi katalógus választás)
  4. Pricing tier kiválasztás (Startup/Standard/Enterprise)
  5. User creation (admin + pultosok bulk import)
  6. Deploy button → RLS schema auto-creation + email notification
- ✅ Target: **15 perc onboarding** (vs. régi 24 óra manual)

**Out-of-Scope (Phase 2):**

- ❌ Self-service partner onboarding (MVP: DevOps admin-driven)
- ❌ Partner migration wizard (régi rendszer import) - Phase 2

**Acceptance Criteria:**

- 3 pilot partner sikeres onboarding < 15 perc/partner
- RLS schema automatikusan létrejön (tenant isolation teszt)
- Onboarding email megérkezik új partnernek (login link)

---

##### 3.2 PostgreSQL RLS Multi-Tenancy ⭐ CRITICAL

**Scope:**

- ✅ Row Level Security implementáció (ADR-001)
  - `partner_id` foreign key minden táblában
  - RLS policy minden táblán: `WHERE partner_id = current_setting('app.current_partner_id')`
  - Session variable beállítás minden request-nél
- ✅ Tenant Isolation Validáció
  - Partner A nem látja Partner B adatait (integration teszt)
  - Cross-tenant attack prevention (security teszt)

**Out-of-Scope (Phase 2):**

- ❌ Multi-database tenant separation (MVP: shared DB + RLS elég)
- ❌ Tenant backup/restore per-partner - Phase 2

**Acceptance Criteria:**

- RLS policy teszt: 100 query, 0 cross-tenant leak
- Központi admin látja minden partnert (read-only)
- Pultos csak saját partner adatait látja

---

##### 3.3 Transaction-Based Pricing Metering

**Scope:**

- ✅ Transaction Event Tracking
  - Bérlés kiadás/visszavétel = 1 transaction
  - Szerviz munkalap létrehozás = 1 transaction
  - Értékesítés rögzítés = 1 transaction
- ✅ Billing Dashboard (Partner tulajdonos - Péter journey)
  - Real-time transaction count (havi aggregálás)
  - Transparent cost breakdown: "47 bérlés × 500 Ft + 12 szerviz × 300 Ft = 27.700 Ft"
- ✅ Metering Service
  - `partner_transactions` tábla havi aggregálás
  - Billing cycle: előző hónap tranzakcióinak összesítése

**Out-of-Scope (Phase 2):**

- ❌ Automated invoicing (partner számla kiküldés) - MVP: manual billing
- ❌ Fair use policy enforcement (batch transaction detection) - Phase 2
- ❌ Pricing calculator widget (előzetes költség becslés) - Phase 2

**Acceptance Criteria:**

- Partner dashboard mutatja real-time transaction count
- Havi billing report generálódik (előző hónap összesítése)

---

#### 4. CORE User Roles (RBAC - MVP Scope)

**5 fő role MVP-ben:**

1. ✅ **Pultos / Értékesítő**
   - Inventory: READ (saját warehouse), WRITE (árumozgatás, K-P-D kód)
   - Bérlés: WRITE (kiadás/visszavétel), READ
   - Szerviz: READ munkalapok, WRITE jegyzet
   - Értékesítés: WRITE tranzakció
   - Admin Dashboard: NO ACCESS

2. ✅ **Boltvezető**
   - Inventory: READ (saját warehouse), WRITE (árumozgatás) - készlet átmozgatás NEM
   - Bérlés/Értékesítés: WRITE + korlátozott árazás (max ±20% kedvezmény/felár)
   - HR: dolgozó felvétel IGEN, elbocsátás NEM
   - Boltvezető Dashboard: napi forgalom real-time láthatóság

3. ✅ **Központi Admin**
   - Inventory: READ (minden warehouse), WRITE (cross-warehouse transfer, bulk update)
   - Bérlés: READ (minden partner), WRITE (bérlési díj override audit trail-lel)
   - Franchise Partner Management: READ dashboards

4. ✅ **Franchise Partner Tulajdonos**
   - Business Intelligence: READ (saját bevételi dashboard, készlet analytics)
   - User Management: WRITE (user létrehozás/törlés partner scope-on belül)
   - Warehouse Config: WRITE (K-P-D polc/doboz hozzáadás)

5. ✅ **DevOps Admin**
   - Tenant Management: WRITE (onboarding wizard, RLS schema creation, tier assignment)
   - Monitoring: READ (transaction count, API usage, AI cost tracking)
   - Partner Business Data: NO ACCESS (privacy)

**Out-of-Scope (Phase 2):**

- ❌ Custom role builder (admin definiálhat új role-okat) - Phase 2
- ❌ Fine-grained permission matrix (permission per module/action) - MVP: 5 standard role elég

---

#### 5. CORE Compliance (MVP Kritikus)

1. ✅ **NAV Online Számlázás Compliance** - Jogszabályi kötelezettség
2. ✅ **GDPR Compliance Alapok** - User data encryption, cascade delete, consent management
3. ✅ **Audit Trail (ADR-006)** - Immutable logging (KI, MIT, MIKOR, MIÉRT, JSON diff)
4. ✅ **Multi-Tenancy RLS Security** - Tenant isolation (ADR-001)

**Out-of-Scope (Phase 2):**

- ❌ PCI DSS teljes audit (MVP: MyPos tokenization SAQ A-EP elég)
- ❌ ISO 27001 certification - Phase 3
- ❌ GDPR data export API (user request) - Phase 2

---

### MVP Utáni Funkciók (2. és 3. Fázis)

#### 2. Fázis: AI Kiterjesztett Funkciók + CRM Plugin (120-180 nap post-MVP)

**Success Gate:** MVP stabilizálás 3 pilot partnernél + 50+ production transaction/partner/hó

**Feature Set:**

##### 2.1 AI Extended Automation (ADR-018, ADR-019, ADR-020)

1. 🔌 **OCR Számla Feldolgozás (ADR-019)**
   - Gemini Vision API → PDF/képfájl számlák automatikus feldolgozása
   - Beszállítói számla adatok kinyerése (tételek, összeg, dátum, VAT)
   - Automata könyvelési bejegyzés generálás
   - **Business Value:** Beszerzési folyamat 30-50% gyorsítás

2. 🔌 **3D Fotó + AI Sérülésdetektálás (ADR-020)**
   - 360° fotó készítés bérgép kiadáskor és visszavételkor
   - AI-powered összehasonlító elemzés (új sérülések detektálása)
   - Kár dokumentáció fotóval + AI-generált jegyzőkönyv
   - **Business Value:** Visszavételi folyamat 20-30% gyorsítás + jogi védelem

3. 🔌 **Email Thread Feldolgozás (ADR-018)**
   - NLP-alapú email parsing (számlák automatikus detektálása inbox-ban)
   - Gemini API email kontextus értelmezés és kategorizálás
   - Automata számlaimport email mellékletekből
   - **Business Value:** Manual email processing 40-60% csökkentés

**AI Usage Tier Extended:**

- Startup tier: 100 AI query/hó (basic Koko only)
- Standard tier: 1000 AI query/hó (Koko + OCR + Vision)
- Enterprise tier: Unlimited (Koko + OCR + Vision + Email parsing)

**Pricing Impact:**

- AI Extended features = plugin usage metering (extra transaction charge vagy tier upgrade)

---

##### 2.2 CRM Plugin - Twenty Integration (ADR-015)

**Scope:**

- 🔌 Lead tracking (potenciális ügyfél management)
- 🔌 Sales pipeline (lead → qualified → proposal → closed)
- 🔌 Marketing automation basic (email kampányok)
- 🔌 Twenty CRM API sync (KGC ügyfél adatok → Twenty contacts)

**Plugin Architecture:**

- Ki/bekapcsolás partner szinten (`partners.enabled_plugins: ['crm']`)
- CRM plugin usage metering → billing system

**Business Value:**

- Marketing ROI tracking (kampány → lead → bérlés konverzió)
- Franchise partner sales efficiency 15-25% növekedés

---

##### 2.3 Chatwoot Support Advanced (ADR-015)

**Scope:**

- 🔌 Multi-channel support (email, Facebook Messenger, WhatsApp)
- 🔌 Support ticket management (Koko chatbot escalation extended)
- 🔌 Team collaboration (support agent collaboration tools)

**Plugin Architecture:**

- Ki/bekapcsolás partner szinten
- Chatwoot plugin usage metering

**Business Value:**

- Customer support response time 30-50% csökkentés
- Multi-channel customer engagement

---

##### 2.4 Beszállító API Extended (ADR-017)

**Scope:**

- 🔌 Makita garanciális javítás API sync (ADR-019 extended)
  - Munkalap automatikus szinkronizálás Makita szerviz rendszerrel
  - Automata elszámolás: munkaóra + alkatrész költség vissza a Makita-tól
- 🔌 Stihl/Hikoki termék katalógus + ár sync (REST/SOAP/CSV adapter)
- 🔌 Napi automata sync job (cron) + fallback manual CSV import

**Business Value:**

- Beszerzési folyamat automatizálás 50-70%
- Garanciális elszámolás pontosság 90%+

---

##### 2.5 Inventory Advanced Features

**Scope:**

- 🔌 Cross-warehouse transfer workflow automation
  - László (központi admin) egy kattintással transfer request
  - Pultos approval workflow
  - Inventory auto-update transfer után
- 🔌 Bulk K-P-D update wizard
  - Admin átnevezheti polcokat (pl. P1-P10 → P11-P20)
  - Migration wizard: "Átköltöztettük a Bosch zónát K1-ről K3-ra" → bulk update
- 🔌 Készlet forgási sebesség analytics
  - Top performer termékek (legtöbb bérlés, legnagyobb bevétel)
  - Készlet 30+ nap bent álló gépek azonosítása
  - Low-stock alert (automatikus értesítés ha termék fogy)

**Business Value:**

- Készlet optimalizálás → Péter journey 22% bevétel növekedés (validált user journey-ből)
- Cross-warehouse koordináció 50-70% gyorsítás

---

#### 3. Fázis: HR Plugin + Enterprise Megfelelőség (180-240 nap post-MVP)

**Success Gate:** 10+ franchise partner production use + 500+ transaction/partner/hó

**Feature Set:**

##### 3.1 HR Plugin - Horilla HRMS Integration (ADR-015)

**Scope:**

- 🔌 Jelenlét kezelés (check-in/check-out)
- 🔌 Szabadság kezelés (szabadság kérelem workflow)
- 🔌 Payroll integráció basic (órabér × munkaóra)

**Plugin Architecture:**

- Ki/bekapcsolás partner szinten
- HR plugin usage metering

**Business Value:**

- HR admin munka 40-60% csökkentés
- Compliance: munkaidő nyilvántartás (munkaügyi ellenőrzés)

---

##### 3.2 ISO 27001 Compliance

**Scope:**

- 🔒 Security management system certification
- 🔒 Enterprise tier franchise partnerek követelménye
- 🔒 Audit preparation + certification process

**Business Value:**

- Enterprise tier sales enablement (nagy cégek beszállítói audit compliance)

---

##### 3.3 PCI DSS Full Audit

**Scope:**

- 🔒 PCI DSS Level 4 teljes audit (SAQ A-EP → SAQ D)
- 🔒 Quarterly security scans + penetration testing

**Business Value:**

- Payment security compliance advanced
- Enterprise tier sales enablement

---

##### 3.4 Advanced Analytics Dashboard

**Scope:**

- 📊 Pénzügyi jelentések (P&L, cash flow, balance sheet)
- 📊 Predictive analytics (bérlési trend előrejelzés)
- 📊 Franchise partner benchmarking (performance comparison)

**Business Value:**

- Data-driven decision making
- Franchise network optimization

---

##### 3.5 Mobile App Native (iOS/Android)

**Scope:**

- 📱 Native mobile app (React Native vagy Flutter)
- 📱 Offline mode support (raktárban internet nélkül is használható)
- 📱 Push notifications (bérlés lejárat, késedelmi díj alert)

**Business Value:**

- Pultos mobility 30-50% növekedés
- Offline capability = no downtime

---

### Kockázatcsökkentési Stratégia

Az MVP sikeressége és a phased development zavartalan végrehajtása érdekében az alábbi kockázatok és mitigációs stratégiák kerültek azonosításra:

#### 1. Technical Risks

##### 1.1 PostgreSQL RLS Performance Bottleneck

**Kockázat:** RLS policy evaluation minden query-nél lassíthatja a rendszert nagy transaction volume esetén (500+ bérlés/nap/partner).

**Mitigáció:**

- ✅ **Database indexing:** `partner_id` index minden táblán
- ✅ **Query optimization:** Application-level caching (Redis) gyakori lookup-okhoz (pl. termék katalógus)
- ✅ **Load testing:** MVP pre-launch 10.000 query/óra stress teszt
- ✅ **Fallback:** Ha RLS bottleneck → migration to separate DB per tenant (Phase 3 opció)

**Success Metric:** < 100ms average query response time 95th percentile

---

##### 1.2 Gemini AI API Downtime vagy Cost Skálázódás

**Kockázat:** Gemini API downtime → Koko chatbot nem működik. Vagy: nagy tranzakciószám → AI költség exponenciálisan nő.

**Mitigáció:**

- ✅ **Fallback:** Gemini API offline → automatic redirect Chatwoot support ticket
- ✅ **AI quota limit:** Tier-based query limit (Startup: 100/hó, Standard: 1000/hó)
- ✅ **Cost monitoring:** Real-time Gemini API költség tracking, alert ha meghaladja tier limitet
- ✅ **Status page:** Gemini API health check, user értesítés ha AI service unavailable

**Success Metric:** 99% chatbot uptime (Gemini + Chatwoot fallback kombinálva)

---

##### 1.3 NAV API Integration Failure

**Kockázat:** NAV API v3.0 változik vagy downtime → számlázás leáll.

**Mitigáció:**

- ✅ **NAV API versioning:** API v3.0 + v4.0 backward compatibility support
- ✅ **Fallback:** NAV API downtime → manual számlázás + későbbi NAV sync queue
- ✅ **Retry logic:** Exponential backoff retry (3 retry, 5-10-20 sec delay)
- ✅ **Monitoring:** NAV API health check, alert ha 3+ failure egymás után

**Success Metric:** 99.5% NAV számla success rate (retry-vel együtt)

---

#### 2. Market Risks

##### 2.1 Franchise Partner Adoption Resistance

**Kockázat:** Franchise partnerek nem akarnak átállni új rendszerre (change resistance), ragaszkodnak a régi Ver:1.33z-hez.

**Mitigáció:**

- ✅ **Pilot program:** 3 franchise partner early adopter program (ingyenes 90 nap + dedicated support)
- ✅ **Change management:** User training (2 napos onboarding workshop pultosoknak)
- ✅ **Success story:** Pilot partnerek eredményei (10x gyorsítás, 22% bevétel növekedés) → marketing case study
- ✅ **Incentive:** Hibrid árazás kedvezmény első 6 hónapban (50% discount az alap díjból)

**Success Metric:** 80%+ pilot partner satisfaction (NPS > 50)

---

##### 2.2 Hibrid Árazás Kommunikáció

**Kockázat:** Franchise partnerek nem értik a hibrid árazás (alap díj + user licensz) modellt, vagy nehezen tervezik a költségeket.

**Mitigáció:**

- ✅ **Transparent dashboard:** Partner látja real-time: "Alap díj: 50.000 Ft + 6 user = 74.000 Ft/hó"
- ✅ **Pricing calculator:** Partner előre kalkulálhatja: "Ha 10 pultos lesz, mennyi a költség?"
- ✅ **User tracking:** Inaktív userek (30+ nap) fél díjjal számítanak
- ✅ **Email notification:** Heti összefoglaló email user count és költség breakdown-nal

**Success Metric:** < 10% partner churn (first 12 months)

---

#### 3. Resource Risks

##### 3.1 Development Team Capacity Bottleneck

**Kockázat:** MVP 90-120 nap timeline túl ambiciózus, fejlesztői kapacitás nem elég.

**Mitigáció:**

- ✅ **Phased feature delivery:** MVP feature set priorizálás (CORE modulok first, PLUGIN modulok Phase 2)
- ✅ **Outsource opció:** DevOps admin onboarding wizard fejlesztése outsource-olható (junior dev task)
- ✅ **Reusable components:** UI component library (React/Vue shared components) → development speed 20-30% gyorsítás
- ✅ **Technical debt management:** Code review minden sprint végén (refactoring time budget 20%)

**Success Metric:** MVP delivery max 30 nap csúszással (120 nap → max 150 nap)

---

##### 3.2 Franchise Onboarding Wizard Complexity Underestimation

**Kockázat:** Automated RLS schema creation + K-P-D generation + user provisioning komplexebb mint becsült → Anna journey 15 perc target nem elérhető.

**Mitigáció:**

- ✅ **Manual fallback:** Ha automated wizard fail → DevOps admin manuálisan létrehozhatja tenant-ot (régi 24 órás process)
- ✅ **Pre-flight validation:** Wizard "Deploy" gomb előtt schema creation teszt futtatása staging DB-n
- ✅ **Rollback mechanism:** Ha deploy fail → automatic rollback, admin notification
- ✅ **Iterative improvement:** MVP launch után onboarding wizard optimization Phase 2-ben

**Success Metric:** 80%+ automated onboarding success rate (20% manual fallback megengedett MVP-ben)

---

##### 3.3 User Training & Documentation Gap

**Kockázat:** Pultosok és partnerek nem tudják használni az új rendszert (insufficient training).

**Mitigáció:**

- ✅ **User documentation:** Minden feature-hez screenshot-os user guide (magyar nyelv)
- ✅ **Video tutorials:** 5-10 perces video tutorial-ok (árumozgatás rögzítés, bérlés kiadás, stb.)
- ✅ **In-app help:** Context-sensitive help tooltips (pl. K-P-D kód bevitelnél: "Példa: K2-P5-D3")
- ✅ **Dedicated support:** Első 90 napban dedicated support (Chatwoot + email + telefon)

**Success Metric:** < 5 support ticket/partner/hét (első 90 napban)

---

#### 4. Compliance Risks

##### 4.1 GDPR Data Breach vagy Violation

**Kockázat:** Ügyfél adatok szivárgása (data breach) → GDPR bírság + reputációs kár.

**Mitigáció:**

- ✅ **PostgreSQL column encryption:** Ügyfél személyes adatok (név, cím, telefonszám) titkosítva
- ✅ **RLS tenant isolation:** Partner A nem látja Partner B ügyfeleit (integration teszt)
- ✅ **Security audit:** Pre-launch penetration testing + security code review
- ✅ **Incident response plan:** GDPR breach notification protocol (72 óra reporting)

**Success Metric:** 0 GDPR breach MVP első 12 hónapjában

---

##### 4.2 NAV Audit Non-Compliance

**Kockázat:** NAV audit során kiderül, hogy számlázás nem szabályos → bírság franchise partnernek.

**Mitigáció:**

- ✅ **NAV API v3.0 compliance:** NAV teszt környezet sikeres számlázás (100% success rate)
- ✅ **Audit trail:** Minden számla kiállítás immutable log (KI, MIT, MIKOR)
- ✅ **NAV API error handling:** Ha NAV API elutasít számlát → error message user-nek + admin alert
- ✅ **Compliance documentation:** NAV audit checklist + process dokumentáció

**Success Metric:** 100% NAV compliant számlázás (0 NAV rejection pre-launch teszt során)

---

### MVP Indítási Ellenőrzőlista

**Pre-Launch Gates:**

1. ✅ **Feature Completeness Check**
   - Minden CORE modul (Inventory, Bérlés, Szerviz, Értékesítés, Pénzügy) functional teszt sikeres
   - 4 user journey acceptance criteria teljesült (Kata, László, Péter, Anna)
   - CORE integrations (NAV, MyPos, Gemini Koko) integration teszt sikeres

2. ✅ **Performance Validation**
   - < 100ms average query response time (95th percentile)
   - < 30 másodperc árumozgatás rögzítés (Kata journey)
   - < 5 másodperc inventory lookup (László journey)
   - < 15 perc franchise onboarding (Anna journey)

3. ✅ **Security & Compliance Audit**
   - RLS tenant isolation teszt: 0 cross-tenant leak (100 query teszt)
   - GDPR compliance checklist: user data encryption, cascade delete, consent management
   - NAV API compliance teszt: 100% success rate (10 teszt számla)
   - Penetration testing: 0 critical vulnerability

4. ✅ **Pilot Partner Readiness**
   - 3 pilot franchise partner kiválasztva
   - Pilot partner onboarding training (2 napos workshop pultosoknak)
   - Pilot partner success criteria meghatározva (90 nap KPI-ok)

5. ✅ **Documentation & Training**
   - User guide minden feature-hez (screenshot-os magyar dokumentáció)
   - Video tutorials (5-10 perc/video, minimum 10 video)
   - In-app help tooltips minden critical workflow-hoz
   - Dedicated support setup (Chatwoot + email + telefon)

**Launch Timeline:**

- **T-30 nap:** Feature freeze, QA testing intensification
- **T-14 nap:** Security & compliance audit finalizálás
- **T-7 nap:** Pilot partner training workshop (2 nap)
- **T-0 (Launch Day):** Pilot partner onboarding (3 partner × 15 perc = 45 perc)
- **T+90 nap:** Pilot program evaluation, Phase 2 go/no-go döntés

---

## Funkcionális Követelmények

A funkcionális követelmények definiálják **MILYEN képességekkel rendelkezik a termék** (WHAT capabilities exist), implementáció-független módon. Ez a **capability contract** minden downstream munkához (UX design, Architecture, Epic breakdown).

**Kritikus tulajdonságok:**

- ✅ Minden FR testelhető képesség (capability)
- ✅ Minden FR implementáció-agnosztikus (sokféleképpen megvalósítható)
- ✅ Minden FR meghatározza KI és MIT, de NEM a HOGYAN-t
- ✅ Nincs UI részlet, nincs performance szám, nincs technológia választás
- ✅ Átfogó lefedés minden capability területen

**Felhasználás:**

1. UX Designer olvassa FRs → interakciót tervez minden képességhez
2. Architect olvassa FRs → rendszert tervez minden képesség támogatásához
3. PM olvassa FRs → epiceket és storykat hoz létre minden képesség implementálásához

---

### 1. Inventory & Warehouse Management

**Scope:** Készlet nyomon követés, multi-warehouse kezelés, K-P-D location tracking, vonalkód/QR azonosítás

- **FR1:** A Pultos képes a berendezés helyét rögzíteni 3 szintű helykóddal (Kommandó-Polc-Doboz)
- **FR2:** A Pultos képes a berendezést vonalkód vagy QR kód beolvasásával azonosítani
- **FR3:** A Rendszer képes egyedi QR kód címkéket generálni gyári vonalkóddal nem rendelkező berendezésekhez
- **FR4:** A Központi admin képes valós idejű készletállapotot megtekinteni az összes raktárban
- **FR5:** A Központi admin képes adott berendezést keresni sorozatszám, helykód vagy státusz alapján
- **FR6:** A Rendszer képes nyomon követni a berendezés státuszát (elérhető / bérelt / szervizben / selejtezett / elveszett / eladott)
- **FR7:** A Pultos képes frissíteni a berendezés helyét raktári lokációk közötti mozgatáskor
- **FR8:** A Központi admin képes konfigurálni a raktári helyhierarchiát (kommandó, polc, doboz struktúra)
- **FR9:** A Központi admin képes raktárak közötti berendezés-átmozgatást kezdeményezni
- **FR10:** A Rendszer képes a helykódokat validálni a konfigurált raktárstruktúra alapján

---

### 2. Rental & Service Operations

**Scope:** Bérlés lifecycle (kiadás/visszavétel), kaució, késedelmi díj, tartozékok, szerviz munkalap, garanciális javítás

- **FR11:** A Pultos képes bérlési tranzakciót létrehozni ügyfél és berendezés kiválasztásával
- **FR12:** A Rendszer képes bérlési díjat kalkulálni a bérlési időszak alapján (napi / heti / 30 napos)
- **FR13:** A Pultos képes megadni a bérlési kaució összegét és fizetési módját
- **FR14:** A Pultos képes rögzíteni a berendezés kiadását (státusz: elérhető → bérelt)
- **FR15:** A Pultos képes rögzíteni a berendezés visszavételét és automatikusan kalkulálni a késedelmi díjat lejárat esetén
- **FR16:** A Rendszer képes nyomon követni a berendezéshez tartozó bérleti tartozékokat (töltő, akkumulátor, kiegészítők)
- **FR17:** A Pultos képes szerviz munkalapot létrehozni karbantartást igénylő berendezéshez
- **FR18:** A Szerviz technikus képes rögzíteni a szerviz részleteket (probléma leírás, felhasznált alkatrészek, munkaórák)
- **FR19:** A Rendszer képes a szerviz munkalapot garanciális javításként megjelölni beszállítói költségtérítés követéséhez
- **FR20:** A Rendszer képes frissíteni a berendezés státuszát a szerviz workflow-ba belépéskor vagy kilépéskor
- **FR21:** A Pultos képes ellenőrizni a tartozék visszavételi ellenőrzőlistát a berendezés visszavételi folyamat során

---

### 3. Sales, Invoicing & Payments

**Scope:** Értékesítési tranzakció, készlet csökkentés, NAV online számlázás, MyPos payment integráció, kaució kezelés

- **FR22:** A Pultos képes értékesítési tranzakciót létrehozni készlettételekre
- **FR23:** A Rendszer képes automatikusan csökkenteni a készletmennyiséget értékesítési tranzakció befejezésekor
- **FR24:** A Rendszer képes NAV-kompatibilis számlát generálni valós időben magánszemély vagy céges ügyfeleknek
- **FR25:** A Rendszer képes kártyás kaució engedélyezést feldolgozni fizetési terminál integráción keresztül
- **FR26:** A Rendszer képes kaució visszatérítést feldolgozni berendezés visszavételkor
- **FR27:** A Rendszer képes nyomon követni a kaució fizetési módját (kártya / készpénz)
- **FR28:** A Rendszer képes kezelni a számla API hibákat manuális számla fallback workflow-val
- **FR29:** A Rendszer képes automatikusan újrapróbálni a sikertelen számla beküldéseket exponenciális visszalépéssel

---

### 4. Franchise Partner & Multi-Tenancy

**Scope:** Franchise onboarding automation, multi-tenant RLS isolation, partner dashboard, hibrid árazás user metering

- **FR30:** A DevOps admin képes új franchise partnert bevonni automatizált wizard workflow-val
- **FR31:** A Rendszer képes multi-tenant adatbázis sémát kiépíteni row-level security szabályzatokkal automatikusan
- **FR32:** A Rendszer képes raktári helyszín struktúrát (K-P-D hierarchia) generálni partner onboarding során
- **FR33:** A DevOps admin képes kezdeti készlet katalógust importálni új franchise partnernek
- **FR34:** A DevOps admin képes árazási szintet hozzárendelni (Startup / Standard / Enterprise) franchise partnerhez
- **FR35:** A DevOps admin képes tömeges felhasználói fiók importálást végezni (admin + pultosok) új partnernek
- **FR36:** A Rendszer képes onboarding értesítő emailt küldeni bejelentkezési adatokkal új partnernek
- **FR37:** A Partner tulajdonos képes valós idejű tranzakciószámot és számlázási költség lebontást megtekinteni
- **FR38:** A Partner tulajdonos képes bevételi analitikát megtekinteni (napi / heti / havi aggregálások)
- **FR39:** A Rendszer képes izolálni a partner adatokat row-level security szabályzatokkal (nincs tenant-közi adathozzáférés)
- **FR40:** A Központi admin képes csak olvasható dashboardokat megtekinteni az összes franchise partnernél
- **FR41:** A Rendszer képes mérni a számlázható tranzakciókat (bérlés kiadás/visszavétel, szerviz munkalap, értékesítés) számlázási kalkulációhoz

---

### 5. User Management & Access Control

**Scope:** RBAC (5 roles: Pultos, Boltvezető, Központi Admin, Partner Tulajdonos, DevOps Admin), user provisioning, role-based permissions

- **FR42:** Az Admin képes felhasználói fiókokat létrehozni szerepkör hozzárendeléssel (Pultos / Boltvezető / Központi Admin / Partner Tulajdonos / DevOps Admin)
- **FR43:** A Rendszer képes szerepkör-alapú jogosultságokat érvényesíteni a készlet, bérlés, szerviz, értékesítés és admin funkcióknál
- **FR44:** A Pultos csak a hozzárendelt raktár és franchise partner hatókörén belüli adatokhoz férhet hozzá
- **FR45:** A Központi admin képes hozzáférni a készlet és bérlési adatokhoz az összes franchise partnernél (csak olvasás ahol alkalmazandó)
- **FR46:** A Partner tulajdonos képes a felhasználói fiókokat kezelni a saját franchise partner hatókörén belül
- **FR47:** A DevOps admin képes hozzáférni a tenant menedzsment és rendszer monitoring funkciókhoz üzleti adatok elérése nélkül
- **FR48:** A Rendszer képes az admin dashboard és konfiguráció hozzáférést kizárólag jogosult szerepkörökre korlátozni

---

### 6. AI-Powered Automation & Support

**Scope:** Koko AI chatbot (MVP), OCR számla feldolgozás (Phase 2), 3D fotó sérülésdetektálás (Phase 2), Email parsing (Phase 2), AI quota management

- **FR49:** Az Ügyfelek képesek interakcióba lépni az AI chatbottal (Koko) magyar nyelvű FAQ támogatásért (24/7 elérhetőség)
- **FR50:** A Rendszer képes automatikusan emberi ügyfélszolgálati munkatárshoz eszkalálni az összetett chatbot kérdéseket
- **FR51:** A Rendszer képes AI lekérdezési kvóta korlátokat érvényesíteni a franchise partner árazási szintje alapján
- **FR52:** A Rendszer képes emberi ügyfélszolgálathoz átirányítani a felhasználókat, ha az AI kvóta limit túllépésre került
- **FR53:** A Rendszer képes számla OCR feldolgozásra PDF vagy kép fájlokból a tételek, összegek, dátumok, ÁFA kinyeréséhez (Phase 2)
- **FR54:** A Rendszer képes berendezés sérülést detektálni a kiadáskor és visszavételkor készített 360°-os fotók AI vision összehasonlításával (Phase 2)
- **FR55:** A Rendszer képes email szálak feldolgozására számla mellékletek automatikus importálásához (Phase 2)

---

### 7. Integrations & External Systems

**Scope:** NAV Online API, MyPos Payment API, Google Gemini AI API, Beszállító API-k (Makita/Stihl/Hikoki), CRM/Support/HR integrations (Phase 2)

- **FR56:** A Rendszer képes NAV-kompatibilis számlákat kiállítani a NAV Online API v3.0-n keresztül
- **FR57:** A Rendszer képes kártyás kaució foglalást engedélyezni a fizetési terminál REST API-n keresztül
- **FR58:** A Rendszer képes kártyás kaució visszatérítést végrehajtani a fizetési terminál REST API-n keresztül
- **FR59:** A Rendszer képes kártyás fizetési adatok tokenizálására (bankkártya adatok nem kerülnek tárolásra az alkalmazás adatbázisában)
- **FR60:** A Rendszer képes termékkatalógus és árazási adatok szinkronizálására a beszállítói API-kból (Makita / Stihl / Hikoki) (Phase 2)
- **FR61:** A Rendszer képes garanciális javítási munkalapok szinkronizálására a Makita szerviz rendszerrel költségtérítéshez (Phase 2)
- **FR62:** A Rendszer képes integrálódni a CRM rendszerrel (Twenty) lead nyomkövetéshez és értékesítési pipeline kezeléséhez (Phase 2)
- **FR63:** A Rendszer képes integrálódni a multi-channel support rendszerrel (Chatwoot) email, chat, közösségi média támogatáshoz (Phase 2)
- **FR64:** A Rendszer képes integrálódni a HR rendszerrel (Horilla) munkavállalói jelenlét és szabadság kezeléséhez (Phase 2)

---

### 8. Compliance, Security & Audit

**Scope:** Immutable audit trail, GDPR compliance, NAV audit compliance, RLS tenant isolation, PCI DSS tokenization

- **FR65:** A Rendszer képes naplózni az összes bérlési, szerviz és értékesítési műveletet megváltoztathatatlan audit naplóval
- **FR66:** Az Audit naplók képesek rögzíteni a felhasználó azonosítóját, művelet típusát, időbélyeget, indoklást, és az előtte/utána állapotváltozásokat
- **FR67:** A Rendszer képes az ügyfél személyes adatait (név, cím, telefonszám) titkosítani az adatbázis tárolásban
- **FR68:** A Rendszer képes kaszkád módon törölni az ügyfél adatait törlési kérelem esetén (GDPR elfeledtetéshez való jog megfelelőség)
- **FR69:** A Rendszer képes row-level security szabályzatokat érvényesíteni a tenant-ek közötti adathozzáférés megakadályozására
- **FR70:** A Rendszer képes validálni a bérleti díj felülírási műveleteket audit napló indoklás követelménnyel
- **FR71:** Az Admin képes audit naplókat lekérdezni megfelelőségi jelentésekhez (NAV audit, franchise transzparencia, vita rendezés)
- **FR72:** A Rendszer képes az audit naplókat 2 évig megőrizni aktív tárolásban a hideg tárolóba archiválás előtt

---

### 9. Feladatlista Widget (Bevásárlólista + To-Do + Jegyzet)

**Scope:** Egységes feladatkezelő widget három funkcióval: közös bevásárlólista (bolt szintű), delegálható feladatok (felelős hozzárendelés), személyes jegyzetek (privát)

**MVP Funkciók:**

- **FR73:** A Pultos képes bevásárlólista tételt létrehozni címmel, opcionális mennyiséggel és helyszín kiválasztásával
- **FR74:** A Pultos képes feladatot (To-Do) létrehozni és felelőst hozzárendelni (multi-select a bolt dolgozóiból)
- **FR75:** A Pultos képes személyes jegyzetet létrehozni, amely csak a saját felhasználója számára látható
- **FR76:** A Rendszer automatikusan rögzíti ki hozta létre a tételt és mikor
- **FR77:** A Pultos képes tételt kipipálni (checkbox), a Rendszer rögzíti ki pipálta ki és mikor
- **FR78:** A Rendszer képes előzmények megjelenítésére (korábban kipipált/archivált tételek)
- **FR79:** A Rendszer képes duplikáció figyelmeztetést adni azonos című tétel bevitelekor (soft warning, nem blokkoló)
- **FR80:** A Pultos képes opcionális határidőt megadni feladatokhoz
- **FR81:** A Rendszer képes státusz követésre minden tételtípusnál (nyitott / folyamatban / kész)
- **FR82:** A Boltvezető képes a bolt összes bevásárlólista és feladat tételét látni és kezelni
- **FR83:** A Rendszer biztosítja a bolt szintű izolációt (franchise-ok nem látják egymás listáit)

**Phase 2 Funkciók:**

- Kategóriák (takarítószer, irodaszer, alkatrész stb.)
- Push értesítések új feladatról / közelgő határidőről
- Ismétlődő tételek (heti bevásárlás)

**User Story Kontextus:**

> "Reggel látom nincs WC papír a raktárban. Beírom: 'WC papír - Raktár'. Délután Kata elmegy bevásárolni, kipipálja."
> "Ki lett adva a boltosoknak, hogy töltsék fel az X polcot" - delegált feladat felelőssel

---

### 10. Termék Gyártás Modul (Fázis 2)

**Scope:** Alapanyagok késztermékké alakítása BOM (Bill of Materials / Darabjegyzék) kezeléssel, gyártási rendelésekkel és fázis követéssel. Támogatott gyártási típusok: összeszerelés, kit/csomag készítés, felújítás, egyedi konfiguráció.

**Üzleti Indoklás:** Pályázati követelmény - a rendszernek támogatnia kell a termelési/gyártási folyamatokat az alapanyag bevételezéstől a késztermék készletbe vételéig.

**MVP Funkciók (Phase 2):**

- **FR84:** BOM (Darabjegyzék) Kezelés - A Központi Admin képes többszintű (2-3 level) BOM-ot definiálni, amely meghatározza milyen alapanyagokból/alkatrészekből áll egy késztermék, beleértve a mennyiségeket és mértékegységeket
- **FR85:** Gyártási Rendelés Létrehozás - A Központi Admin képes gyártási rendelést létrehozni BOM alapján megadott mennyiségre, amely automatikusan kiszámolja a szükséges alapanyag mennyiségeket
- **FR86:** Gyártási Lap (Munkalap Analóg) - A Raktáros/Gyártó képes gyártási lapot kezelni fázisokkal (előkészítés → gyártás → ellenőrzés → készletbe vétel), státusz követéssel és munkaidő rögzítéssel
- **FR87:** Készlet Automatikus Mozgatás - A Rendszer automatikusan csökkenti az alapanyag készletet (MÍNUSZ) és növeli a késztermék készletet (PLUSZ) a gyártási lap lezárásakor
- **FR88:** Selejt Kezelés - A Raktáros képes selejt mennyiséget rögzíteni gyártási fázisonként okkal és megjegyzéssel, amely automatikusan készletcsökkenést generál
- **FR89:** Felújított Termék Workflow - A Szervizes képes javítás → új termék workflow-t indítani, ahol a javított gép új cikkszámmal és serial numberrel kerül vissza a készletbe "felújított" státusszal
- **FR90:** Lot/Batch Követés (Opcionális) - A Rendszer képes gyártási tételenként (lot/batch) nyomon követni a készterméket terméktípusonként konfigurálható módon (engedélyezett/tiltott)

**Kapcsolódó Modulok:**

- **Inventory Modul:** Készletmozgások (FR4-FR5), Serial Number tracking
- **Szerviz Modul:** Munkalap analógia, felújítási workflow

**Architekturális Referenciák:**

- ADR-027: Gyártás Modul Architektúra
- Feature-Gyartas-Modul-ERD.excalidraw

---

### 11. Szerviz Prioritás Rendszer (Fázis 1)

**Scope:** Szerviz munkalapok prioritás alapú kezelése, vizuális megkülönböztetés a várakozási listán, partner alapú automatikus prioritás.

**Üzleti Indoklás:** A szervizben különböző sürgősségű munkák érkeznek (garanciális, szerződött partner, felár miatt sürgős). A pultosnak azonnal látnia kell, melyik gépet kell előre venni.

**Funkciók:**

- **FR91:** A Pultos képes szerviz prioritást beállítani munkalap létrehozásakor (sürgős / felár miatt sürgős / garanciális / franchise partner / normál)
- **FR92:** A Rendszer képes a szerviz várakozási listát prioritás szerint rendezni és vizuálisan megkülönböztetni (szín/ikon kódolás)
- **FR93:** A Központi Admin képes partnerenként alapértelmezett prioritási szintet beállítani (szerződött partner = automatikusan magasabb prioritás)

**Architekturális Referenciák:**

- ADR-041: Szerviz Prioritás Rendszer

---

### 12. Beszállító Import Bővítés (Fázis 2)

**Scope:** Email-alapú JSON készletimport, manuális fájlfeltöltés támogatás a meglévő API integráció mellé.

**Üzleti Indoklás:** Nem minden beszállítónak van API-ja. Egyesek JSON-t küldenek emailben, másoktól manuálisan kell letölteni az adatokat.

**Funkciók:**

- **FR94:** A Rendszer képes JSON készletfájlokat fogadni és feldolgozni dedikált email címről (technikai@kisgepcentrum.hu) automatikus parsing-gel
- **FR95:** A Központi Admin képes manuálisan feltölteni beszállítói készlet/ár fájlokat (JSON, CSV, Excel) web felületen keresztül

**Architekturális Referenciák:**

- ADR-017: Beszállítói API Integráció (bővített)

---

### 13. Dolgozói Kommunikáció Bővítés (Fázis 1)

**Scope:** Kétirányú feladatküldés dolgozók között, szerviz kommunikáció naplózása munkalaphoz.

**Üzleti Indoklás:** A dolgozóknak tudniuk kell egymásnak feladatot adni, kérdést küldeni. A szervizben fontos látni, milyen kommunikáció folyt az ügyféllel egy javítással kapcsolatban.

**Funkciók:**

- **FR96:** A Pultos képes másik dolgozónak üzenetet/kérést küldeni a rendszeren belül, amely az adott dolgozó feladatlistájában megjelenik
- **FR97:** A Szervizes képes kommunikációs bejegyzést rögzíteni munkalaphoz (ügyfél hívás, email, egyéb), amely a munkalap előzményeiben látható

**Kapcsolódó:** FR73-FR83 (Feladatlista Widget)

---

### 14. Bérlői Kommunikáció Modul (Fázis 2)

**Scope:** In-app kommunikáció bérlő ügyfelekkel, kommunikációs előzmények bérléshez kapcsoltan.

**Üzleti Indoklás:** "Tudod, hogy meddig marad még nálad a gép?" - Az ügyféllel való kommunikáció előzményei megmaradjanak, ne kelljen hívogatni, mindkét fél lássa a historyt.

**Funkciók:**

- **FR98:** A Bérlő képes in-app üzenetet küldeni az aktív bérlésével kapcsolatban a boltnak, amely a bérlési rekordhoz kapcsolódik
- **FR99:** A Pultos képes a bérléshez kapcsolódó kommunikációs előzményeket megtekinteni és válaszolni az ügyfélnek
- **FR100:** A Rendszer képes a kommunikáció feladóját azonosítani (dolgozó név + szerep)

**Megjegyzés:** Ez a modul NEM kapcsolódik a Chatwoot-hoz, kifejezetten bérlő-specifikus kommunikációs csatorna.

**Architekturális Referenciák:**

- ADR-042: Bérlői Kommunikáció Modul

---

### 15. Bérlés Hosszabbítás Self-Service (Fázis 1)

**Scope:** Önkiszolgáló bérlés hosszabbítási lehetőség app/web felületen, online fizetéssel, kétirányú kalkulációval.

**Üzleti Indoklás:** A késés kezelés jelenleg telefonos. Az ügyfél tudja maga hosszabbítani, kalkulálni a díjat, és online fizetni - mindkét félnek kevesebb adminisztráció.

**Funkciók:**

- **FR101:** A Bérlő képes bérlés hosszabbítási kérelmet benyújtani app/web felületen, megadva a kívánt új visszahozási dátumot VAGY a befizetni kívánt összeget
- **FR102:** A Rendszer képes automatikusan kalkulálni a hosszabbítás díját idő alapján VAGY a befizetett összeg alapján a meghosszabbított időtartamot (kedvezményeket figyelembe véve: hétvége 1,5 nap, heti, havi)
- **FR103:** A Rendszer képes maximális fizetés nélküli hosszabbítási időt (alapértelmezett: 1 hét) érvényesíteni, utána fizetés szükséges a további hosszabbításhoz
- **FR104:** A Központi Admin képes megbízható ügyfelenként személyre szabott hosszabbítási limitet beállítani (megbízható vevő = hosszabb limit)
- **FR105:** A Bérlő képes online bankkártyás fizetéssel rendezni a hosszabbítási díjat az alkalmazáson keresztül
- **FR106:** A Rendszer képes jogi figyelmeztetést megjeleníteni a hosszabbítás során a nem fizetés következményeiről (lopás minősítés)

**Architekturális Referenciák:**

- ADR-043: Bérlés Hosszabbítás Self-Service
- ADR-005: MyPos Payment (bővített)

---

### 16. Szerviz Javítási Költség Limit (Fázis 1)

**Scope:** Ügyfél megadhat maximális javítási költséget, ameddig a szerviz engedély nélkül dolgozhat.

**Üzleti Indoklás:** "Ha beírja, hogy 20000-ig csináljátok, ha annál fölött van, akkor küldjetek árajánlatot, akkor tudja, hogy figyelj, nem küldök neki árajánlatot, hanem megcsinálom és küldöm is, hogy kész van. Sokkal gyorsabb a munka."

**Funkciók:**

- **FR107:** A Pultos képes szerviz felvételkor maximális javítási költség limitet rögzíteni az ügyfél kérésére
- **FR108:** A Rendszer képes a szervizest figyelmeztetni, ha a becsült javítási költség meghaladja az ügyfél által megadott limitet (árajánlat szükséges)
- **FR109:** A Szervizes képes a limiten belüli javítást elvégezni és lezárni külön jóváhagyás nélkül

---

### 17. Alkatrész Foglalás Árajánlathoz (Fázis 1)

**Scope:** Árajánlat készítésekor az alkatrészek időkorlátosan foglalhatók.

**Üzleti Indoklás:** "Három hétig árajánlat van, és nem különíti el, akkor mit fog látni a másik? Zárolva, hogy van raktáron de zárolva."

**Funkciók:**

- **FR110:** A Szervizes képes alkatrészeket "foglalt" státuszba helyezni árajánlat készítésekor, amely más szervizesek számára látható (raktáron, de foglalt)
- **FR111:** A Rendszer képes a foglalást automatikusan feloldani konfigurálja időkorlát után (alapértelmezett: 5 nap), ha nincs ügyfél válasz
- **FR112:** A Pultos képes reminder értesítést küldeni az ügyfélnek a foglalás lejárta előtt

---

### 18. Többnyelvűség (Fázis 2)

**Scope:** Alkalmazás felület több nyelven.

**Üzleti Indoklás:** "Angolok szoktak jönni, meg ukrán."

**Funkciók:**

- **FR113:** A Rendszer képes a felhasználói felületet magyar, angol és ukrán nyelven megjeleníteni
- **FR114:** A Felhasználó képes a preferált nyelvet beállítani a profiljában

---

### 19. Belső Dolgozói Chat (Fázis 1)

**Scope:** Valós idejű kommunikáció dolgozók között a rendszeren belül (Slack-szerű).

**Üzleti Indoklás:** "legyen egy belső kommunikációs csatorna... a szervíz tud a pultossal kommunikálni... a szervíz egy csomó üzenetet ír a pultnak, hogy mit mondjon majd az ügyfélnek"

**Funkciók:**

- **FR115:** A Dolgozó képes valós idejű üzenetet küldeni másik dolgozónak a rendszeren belül (1-to-1 chat, WebSocket)
- **FR116:** A Rendszer képes online/offline státuszt megjeleníteni a dolgozók mellett (zöld/piros jelzés)
- **FR117:** A Dolgozó képes értesítést kapni új üzenetről (toast notification + olvasatlan badge a chat ikonon)
- **FR118:** A Rendszer képes a chat előzményeket tárolni és visszakereshetővé tenni (dolgozónként)

**Architekturális Referenciák:**

- KGC-Integracios-Strategia-Vegleges.md (2.3 Custom Belső Chat)

**Technológia:** NestJS + Socket.io (WebSocket), React komponens, PostgreSQL

**MVP Korlátok:**

- Csak 1-to-1 chat (nincs group chat)
- Csak szöveg (nincs fájl csatolás)
- Nincs video call

---

### 20. Egyéb Bővítések (Fázis 3)

**Scope:** Alacsonyabb prioritású kényelmi funkciók.

**Funkciók:**

- **FR119:** A Rendszer képes franchise partnerenként email aláírás sablont tárolni és generálni a jogi követelményeknek megfelelően (brand név + üzemeltető cég adatai)
- **FR120:** A Boltvezető képes ideiglenes emelt jogosultságot adni dolgozónak meghatározott időtartamra (max 24 óra), amely automatikusan visszavonódik
- **FR121:** A Felhasználó képes a dashboard widgetjeit átrendezni és személyre szabott elrendezést menteni
- **FR122:** A Felhasználó képes menüpontokat kedvencként megjelölni (max 10), amelyek a navigációs sávban külön "Gyorselérés" szekcióban jelennek meg, felhasználónként mentve, offline-first szinkronizációval (ADR-044)

---

### Funkcionális Követelmények Összefoglaló

**Total Functional Requirements:** 122 FRs across 20 capability areas

**Coverage Validation:**

- ✅ **MVP Scope (Phase 1):** FR1-FR52, FR73-FR83, FR91-FR93, FR96-FR97, FR101-FR112, FR115-FR118 (CORE modulok, CORE integrations, CORE franchise multi-tenancy, CORE compliance, Feladatlista Widget, Szerviz Prioritás, Bérlés Hosszabbítás, Javítási Limit, Alkatrész Foglalás, Belső Chat)
- ✅ **Phase 2 Scope:** FR53-FR55 (AI Extended), FR60-FR64 (Extended Integrations), FR84-FR90 (Gyártás Modul), FR94-FR95 (Beszállító Import), FR98-FR100 (Bérlői Kommunikáció), FR113-FR114 (Többnyelvűség)
- ✅ **Phase 3 Scope:** FR119-FR122 (Egyéb Bővítések)
- ✅ **All User Journeys:** Kata (FR1-FR10, FR73-FR77), László (FR4-FR5, FR40), Péter (FR37-FR38), Anna (FR30-FR36), Tamás (FR82)
- ✅ **Domain-Specific:** NAV compliance (FR24, FR56), GDPR (FR67-FR68), PCI DSS (FR59), Audit (FR65-FR72)
- ✅ **Innovation Differentiators:** AI automation (FR49-FR55), Hibrid árazás billing (FR41), Franchise onboarding (FR30-FR36), K-P-D tracking (FR1, FR8), Vonalkód/QR (FR2-FR3), Audit trail (FR65-FR72), Beszállító API (FR60-FR61, FR94-FR95), Feladatlista Widget (FR73-FR83, FR96-FR97), Gyártás/BOM (FR84-FR90), Szerviz Prioritás (FR91-FR93), Bérlés Self-Service (FR101-FR106), Bérlői Kommunikáció (FR98-FR100)

**Capability Contract Notice:**
Ez a FR lista mostantól **kötelező érvényű**. Minden feature amit implementálunk, vissza kell vezethető legyen ezen követelményekhez. Amennyiben egy képesség nem szerepel itt, **nem fog létezni a végleges termékben**, kivéve ha később explicit módon hozzáadjuk.

---

## Nem-Funkcionális Követelmények

A nem-funkcionális követelmények meghatározzák **MILYEN JÓL kell a rendszernek működnie** (HOW WELL), nem azt hogy MIT kell csinálnia. Minőségi attribútumokat (performance, security, scalability) specifikálnak **specifikus, mérhető kritériumokkal**.

**Selective Approach:** Csak azokat az NFR kategóriákat dokumentáljuk, amelyek **valóban relevánsak** ennél a terméknél, elkerülve a követelmény-inflációt.

---

### Teljesítmény

**Kontextus:** User journey fájdalmak jelentős része **sebességgel** kapcsolatos (10x-96x gyorsítás célok). Real-time inventory tracking multi-warehouse környezetben kritikus a felhasználói siker szempontjából.

**Performance követelmények:**

- **NFR-P1:** Árumozgatás rögzítés workflow befejezése **< 30 másodperc** (Kata journey: target 10x gyorsítás a régi 3-5 perc helyett)
- **NFR-P2:** Inventory lookup response time **< 5 másodperc** bármely serial number/location code/status szűrésre (László journey: target 48-96x gyorsítás)
- **NFR-P3:** Database query átlagos response time **< 100ms** (95th percentile) normál terhelés mellett
- **NFR-P4:** Franchise onboarding wizard teljes workflow **< 15 perc** (Anna journey: target 96x gyorsítás a régi 24 óra helyett)
- **NFR-P5:** Real-time inventory status frissítés **< 2 másodperc** minden warehouse-ban bérlés kiadás/visszavétel után
- **NFR-P6:** NAV számla kiállítás **< 10 másodperc** sikeres API response esetén
- **NFR-P7:** MyPos payment terminal authorization **< 30 másodperc** kártya kaució blokkolásra
- **NFR-P8:** Dashboard widget (partner revenue analytics, transaction count) refresh **< 3 másodperc**

**Validáció:** Pre-launch load testing 10.000 query/óra stress teszttel (Scoping → Risk Mitigation: RLS performance bottleneck).

---

### Biztonság

**Kontextus:** Személyes adatok (ügyfél), payment data (MyPos), multi-tenant isolation (franchise partnerek), GDPR compliance, NAV audit követelmények.

**Security követelmények:**

- **NFR-S1:** Összes ügyfél személyes adat (név, cím, telefonszám) **titkosítva** PostgreSQL column encryption-nel at-rest
- **NFR-S2:** Kártyaadatok **soha nem tárolódnak** application adatbázisban, csak MyPos payment tokenek (PCI DSS SAQ A-EP compliance)
- **NFR-S3:** Multi-tenant RLS policies **100% izolációt biztosítanak** partner adatok között (0 cross-tenant data leak integration teszt alapján)
- **NFR-S4:** Session management: `app.current_partner_id` session variable **validálása minden request-nél** RLS policy enforcement előtt
- **NFR-S5:** User password **bcrypt hash** minimum 10 rounds salt-tal, plain text password soha nem tárolódik
- **NFR-S6:** Admin dashboard és configuration funkciók **csak authorized role-oknak** elérhetők (RBAC enforcement application level)
- **NFR-S7:** HTTPS/TLS 1.3 **kötelező** minden client-server kommunikációra (no HTTP fallback)
- **NFR-S8:** API authentication: JWT token **maximum 24 óra TTL**, automatic refresh token rotation
- **NFR-S9:** Audit log **immutable** (append-only táblák, no UPDATE/DELETE permission user role-oknak)
- **NFR-S10:** Pre-launch **penetration testing** 0 critical vulnerability target
- **NFR-S11:** GDPR breach notification protocol **< 72 óra** detection után (incident response plan)

**Compliance Validáció:**

- GDPR compliance checklist: user data encryption ✅, cascade delete ✅, consent management ✅
- PCI DSS SAQ A-EP: tokenization ✅, no card data storage ✅
- NAV audit: immutable audit trail ✅, számla kiállítás tracking ✅

---

### Skálázhatóság

**Kontextus:** Franchise network expansion tervezett (3 pilot partner MVP → 10+ partner Phase 3), transaction volume növekedés (50+ transaction/partner/hó MVP → 500+ Phase 3).

**Scalability követelmények:**

- **NFR-SC1:** Rendszer támogat **10+ franchise partner** egyidejű használatot < 10% performance degradációval (Phase 3 target)
- **NFR-SC2:** RLS policy evaluation skálázódik **500+ bérlés/nap/partner** transaction volume mellett (database indexing: partner_id minden táblán)
- **NFR-SC3:** Multi-warehouse inventory tracking skálázódik **20+ warehouse** országos hálózatra (current: 6 warehouse initial)
- **NFR-SC4:** Transaction metering service támogat **10.000+ tranzakció/hó** aggregálást single partner-re
- **NFR-SC5:** Gemini AI API quota limit enforcement **tier-based** (Startup: 100/hó, Standard: 1000/hó, Enterprise: unlimited) - skálázható AI usage
- **NFR-SC6:** Database storage: **2 év audit log retention** active storage-ban, majd S3 cold storage archival (compression: gzip)
- **NFR-SC7:** Horizontal scaling opció: PostgreSQL read replicas **Phase 3-ban** ha query volume meghaladja single instance kapacitást

**Growth Scenario Planning:**

- MVP: 3 partner × 100 transaction/hó = 300 transaction/hó
- Phase 2: 10 partner × 200 transaction/hó = 2.000 transaction/hó
- Phase 3: 20 partner × 500 transaction/hó = 10.000 transaction/hó

---

### Megbízhatóság és Rendelkezésre állás

**Kontextus:** Kritikus external API függőségek (NAV, MyPos, Gemini). NAV API downtime → számlázás leáll (compliance risk). MyPos failure → bérlés kiadás blokkolva.

**Reliability követelmények:**

- **NFR-R1:** Overall system uptime **> 99%** (maximum 7.2 óra downtime/hónap)
- **NFR-R2:** NAV számla success rate **> 99.5%** (retry logic-kal együtt: 3 retry, exponential backoff 5-10-20 sec)
- **NFR-R3:** Gemini AI chatbot uptime **> 99%** (Gemini API + Chatwoot fallback kombinálva)
- **NFR-R4:** MyPos payment authorization **< 5% failure rate** (automatic fallback: manual terminal use + later API sync)
- **NFR-R5:** NAV API downtime fallback: **manual számlázás workflow** + későbbi NAV sync queue (0 számla loss)
- **NFR-R6:** Gemini API downtime fallback: **automatic redirect Chatwoot** support ticket (0 user query loss)
- **NFR-R7:** Database backup: **napi automatic backup** + 30 nap retention, point-in-time recovery < 1 óra
- **NFR-R8:** Automated RLS schema creation rollback: **deploy failure → automatic rollback** + admin notification (Anna journey: 80% automated success rate target, 20% manual fallback megengedett)
- **NFR-R9:** Health check monitoring: NAV API, MyPos API, Gemini API **status check 5 percenként**, alert ha 3+ consecutive failure

**Monitoring & Alerting:**

- Real-time DevOps monitoring dashboard: transaction count, API usage metrics, Gemini AI cost tracking
- Alert thresholds: API failure > 3 egymás után, query response time > 200ms (90th percentile), RLS tenant leak teszt failure

---

### Integrációs Megbízhatóság

**Kontextus:** 4+ kritikus external system integráció (NAV Online API, MyPos Payment API, Google Gemini AI API, Beszállító API-k). Integration failure jelentős business impact.

**Integration követelmények:**

- **NFR-I1:** NAV Online API v3.0 **backward compatibility support** + v4.0 migration readiness (API versioning)
- **NFR-I2:** MyPos REST API **timeout: 30 másodperc**, retry 1x ha network error (not business logic error)
- **NFR-I3:** Gemini Flash API **timeout: 60 másodperc** (AI query processing lehet lassabb), no retry (quota limit miatt)
- **NFR-I4:** Beszállító API-k (Makita/Stihl/Hikoki) **napi sync job** cron scheduling, fallback: manual CSV import ha API unavailable > 2 nap
- **NFR-I5:** Integration error logging: **minden API call** (request + response + error) audit trail-ben compliance tracking-hez
- **NFR-I6:** Chatwoot/Twenty CRM/Horilla HRMS Plugin integrations **optional feature flags** (ki/bekapcsolható partner szinten, no core system dependency)

**API Health Monitoring:**

- NAV API health check: sikeres test számla minden deploy előtt (100% success rate 10 teszt számlából)
- MyPos API health check: sikeres test authorization minden deploy előtt (10 teszt tranzakció)
- Gemini API health check: FAQ teszt query minden deploy előtt (10 gyakori kérdés válasz accuracy > 80%)

---

### Használhatóság

**Kontextus:** Pultos efficiency kritikus (Kata journey: 3-5 perc → 30 sec). Mobile-first UI raktári használatra. Magyar nyelv primary user base.

**Usability követelmények:**

- **NFR-U1:** Mobile-first responsive UI: **támogatott eszközök** tablet (10"+ screen), telefon (6"+ screen), desktop (1920×1080+ resolution)
- **NFR-U2:** Egy képernyős workflow (no tab switching, no window juggling): árumozgatás rögzítés **egyetlen form** vonalkód scan → K-P-D bevitel → auto-save
- **NFR-U3:** Real-time auto-save: **nincs explicit Save gomb**, minden Enter/submit után automatic mentés (user feedback: toast notification "Mentve")
- **NFR-U4:** Context-sensitive help tooltips: **minden critical input field** (pl. K-P-D kód bevitelnél: "Példa: K2-P5-D3")
- **NFR-U5:** Magyar nyelv **primary UI language**, angol secondary (admin/DevOps dashboard lehet angol)
- **NFR-U6:** Error messages **magyar nyelven**, user-friendly (nem technical stack trace), actionable guidance (pl. "K-P-D kód hibás formátum. Helyes formátum: K2-P5-D3")
- **NFR-U7:** Loading indicators: **minden > 1 sec művelet** (inventory lookup, NAV számla kiállítás) progress spinner + estimated time
- **NFR-U8:** User onboarding: **in-app tutorial** első bejelentkezéskor (5 perc guided tour: árumozgatás rögzítés, bérlés kiadás, inventory lookup)
- **NFR-U9:** Keyboard shortcuts: **power user features** (pl. Ctrl+K = gyors inventory search modal, Enter = submit form, Esc = cancel/close)
- **NFR-U10:** Vonalkód/QR scan támogatás: **USB barcode scanner** + **camera-based scan** (telefon/tablet kamera fallback)

**User Training & Documentation:**

- Screenshot-os user guide minden feature-hez (magyar nyelv)
- Video tutorials: 5-10 perc/video, minimum 10 video (árumozgatás, bérlés kiadás, szerviz munkalap, NAV számla, stb.)
- Dedicated support első 90 napban (Chatwoot + email + telefon)
- Target: < 5 support ticket/partner/hét (első 90 napban)

---

### Adatmegőrzés és Archiválás

**Kontextus:** Audit trail compliance (NAV audit, GDPR, franchise transparency), storage cost optimization.

**Data Retention követelmények:**

- **NFR-DR1:** Audit log retention: **2 év active storage** (PostgreSQL), majd automatic S3 cold storage archival
- **NFR-DR2:** Audit log compression: **gzip** tárolás S3-ban (storage cost optimization)
- **NFR-DR3:** Bérlési tranzakció history: **5 év retention** (NAV audit compliance: számlák 5 év megőrzési kötelezettség)
- **NFR-DR4:** Ügyfél adatok: **cascade delete** GDPR deletion request esetén (right to be forgotten compliance)
- **NFR-DR5:** Partner onboarding history metadata: **indefinite retention** (DevOps troubleshooting, partner lifecycle tracking)

---

### Nem-Funkcionális Követelmények Összefoglaló

**Total NFR Categories:** 6 releváns kategóriák (Accessibility kihagyva - nem releváns internal tool esetén)

**NFR Coverage:**

- ✅ **Performance (8 NFR):** Response time targets minden critical workflow-ra (árumozgatás < 30s, inventory lookup < 5s, onboarding < 15 perc)
- ✅ **Security (11 NFR):** Encryption, RLS isolation, PCI DSS tokenization, GDPR compliance, penetration testing
- ✅ **Scalability (7 NFR):** Franchise network expansion (10+ partner), transaction volume growth (10k+ transaction/hó), horizontal scaling opció
- ✅ **Reliability (9 NFR):** 99% uptime, API fallback workflows, health check monitoring, backup/recovery
- ✅ **Integration (6 NFR):** API versioning, timeout/retry policies, health monitoring, plugin architecture
- ✅ **Usability (10 NFR):** Mobile-first UI, magyar nyelv, egy képernyős workflow, context-sensitive help, auto-save
- ✅ **Data Retention (5 NFR):** 2 év audit log, 5 év bérlési history, GDPR cascade delete, archival strategy

**Quality Attribute Validation:**
Minden NFR **specifikus és mérhető** (nem vague mint "gyors", "biztonságos", "skálázható"). Minden NFR **tesztelhető** pre-launch validation során.

---
