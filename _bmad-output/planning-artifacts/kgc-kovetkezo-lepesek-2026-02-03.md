# KGC ERP v7.0 - Következő Lépések és Akcióterv

**Dokumentum verzió:** 1.0
**Dátum:** 2026-02-03
**Készítette:** Claude Code (BMAD feldolgozás)
**Státusz:** ACTION REQUIRED

---

## Executive Summary

Ez a dokumentum összefogja az ügyfél válaszai alapján (2026-02-03) elvégzett teljes körű feldolgozás eredményeit és konkrét, végrehajtható akciótervet ad a következő lépésekhez.

### Készült Dokumentumok

| #   | Dokumentum                                                                                             | Méret     | Fő Tartalom                                         |
| --- | ------------------------------------------------------------------------------------------------------ | --------- | --------------------------------------------------- |
| 1   | [kgc-kovetelmeny-tisztazo-valaszok-2026-02-03.md](kgc-kovetelmeny-tisztazo-valaszok-2026-02-03.md)     | ~600 sor  | 49 kérdés-válasz pár strukturáltan, értelmezéssel   |
| 2   | [kgc-implementacios-prioritas-matrix-2026-02-03.md](kgc-implementacios-prioritas-matrix-2026-02-03.md) | ~850 sor  | 32 implementációs feladat, 12 Epic, Sprint javaslat |
| 3   | [kgc-dontesi-osszefoglalo-2026-02-03.md](kgc-dontesi-osszefoglalo-2026-02-03.md)                       | ~900 sor  | 15 döntés, 7 ADR igény, üzleti szabályok            |
| 4   | [kgc-gap-analizis-prd-architektura-2026-02-03.md](kgc-gap-analizis-prd-architektura-2026-02-03.md)     | ~1000 sor | PRD/Arch gap-ek, frissítési javaslatok              |
| 5   | [kgc-kovetkezo-lepesek-2026-02-03.md](kgc-kovetkezo-lepesek-2026-02-03.md) (ez)                        | ~400 sor  | Akcióterv, BMAD workflow-k, priorizálás             |

**Összesen:** ~3750 sor dokumentáció

### Kulcs Megállapítások

- ✅ **49 kérdés** megválaszolva (21 + 28)
- 🔴 **8 kérdés** további tisztázást igényel
- 🎯 **32 implementációs feladat** azonosítva
- 📋 **12 Epic** javasolva (3 fázis, 9 sprint)
- 📐 **7 új ADR** elkészítése szükséges
- 🔄 **PRD v2.0 → v2.1** és **Arch v1.0 → v1.1** frissítés javasolt
- 📦 **6 új package** szükséges (+25 meglévő = 31 package)
- 🗄️ **8 új adatbázis tábla** + 3 meglévő bővítése

---

## 1. AZONNALI Akciók (Ma - 1 hét)

### 1.1 Tisztázó Kérdések Küldése az Ügyfélnek

**Prioritás:** 🔴 KRITIKUS

**Cél:** 8 nem egyértelmű válasz pontosítása implementáció előtt

**Forrás:** [kgc-dontesi-osszefoglalo-2026-02-03.md](kgc-dontesi-osszefoglalo-2026-02-03.md) - 7. szekció

**Kérdések:**

1. **MyPOS Pre-authorization (1.1):** Pre-auth vagy azonnali terhelés?
2. **Hosszú távú szerződés definíció (5.3):** Mit értünk hosszú távú alatt? (30+ nap?)
3. **Szerződés automatikus megújítás (2.4):** Automatikus vagy manuális jóváhagyás?
4. **Korai lemondás kalkuláció (2.6):** Pontos számítási formula?
5. **Havi kedvezmény mértéke (2.3):** Mennyi a 30+ napos kedvezmény? (25%? 30%?)
6. **Szerviz KPI-k (7.4.1):** Milyen konkrét KPI-k kellenek?
7. **Partner szegmentáció (7.5.2):** Kell-e? (VIP, Rendszeres, Alkalmi, Inaktív)
8. **Bérlési statisztikák (7.6.1, 7.6.2, 7.6.4):** Részletek?

**Akció:**

```bash
# Email sablon készítése
1. Nyisd meg: kgc-dontesi-osszefoglalo-2026-02-03.md
2. Másold ki a 7. szekció (Tisztázandó Kérdések) tartalmát
3. Email küldése az ügyfélnek (Javo!):
   - Tárgy: "KGC ERP v7.0 - Követelmény Tisztázó Kérdések (8 db)"
   - Melléklet: kgc-kovetelmeny-tisztazo-valaszok-2026-02-03.md
   - Kérés: Válasz 3-5 munkanapon belül
```

**Deadline:** 2026-02-04 (holnap)

**Blokkoló:** ADR-045 (MyPOS pre-auth) elkészítése blokkolt amíg nincs válasz.

---

### 1.2 MyPOS API Dokumentáció Áttekintése

**Prioritás:** 🔴 KRITIKUS

**Cél:** MyPOS pre-auth vs. payment döntés megalapozása

**Akció:**

```bash
# MyPOS API dokumentáció kutatás
1. MyPOS Developer Portal: https://developers.mypos.com/
2. Keresés: "pre-authorization", "auth hold", "payment capture"
3. Sandbox API kulcsok kérése (ha szükséges)
4. Jegyzet készítése: MyPOS API capabilities (pre-auth support?)
```

**Output:** MyPOS API kutatási jegyzet (max 1-2 oldal)

**Deadline:** 2026-02-05

---

### 1.3 Makita Norma Minta Excel Kérése

**Prioritás:** 🟠 MAGAS

**Cél:** Excel import fejlesztéshez valós Makita norma fájl megszerzése

**Akció:**

```bash
# Email küldése az ügyfélnek (Javo!)
Tárgy: "KGC ERP v7.0 - Makita Norma Minta Excel Kérése"
Tartalom:
- Szükségünk van egy valós Makita norma Excel fájlra
- Cél: Excel parser fejlesztése (XLSX → adatbázis import)
- Adatvédelem: érzékeny adatok kitakarhatók, csak a struktúra fontos
- Kérdések:
  - Milyen oszlopok vannak? (norma kód, leírás, munkaóra, díjszabás, stb.)
  - Van fejléc sor?
  - Egy vagy több worksheet?
```

**Deadline:** 2026-02-06

---

### 1.4 Git Commit - Dokumentumok Mentése

**Prioritás:** 🟠 MAGAS

**Cél:** 5 új dokumentum verziókezelése

**Akció:**

```bash
cd /root/LABS/KGCERP/KGC-3

# Ellenőrzés
git status

# Staging
git add _bmad-output/planning-artifacts/kgc-kovetelmeny-tisztazo-valaszok-2026-02-03.md
git add _bmad-output/planning-artifacts/kgc-implementacios-prioritas-matrix-2026-02-03.md
git add _bmad-output/planning-artifacts/kgc-dontesi-osszefoglalo-2026-02-03.md
git add _bmad-output/planning-artifacts/kgc-gap-analizis-prd-architektura-2026-02-03.md
git add _bmad-output/planning-artifacts/kgc-kovetkezo-lepesek-2026-02-03.md

# Commit
git commit -m "$(cat <<'EOF'
docs(planning): add requirement clarification analysis and gap analysis

- Add structured Q&A document (49 questions)
- Add implementation priority matrix (32 tasks, 12 Epics)
- Add decision summary (15 decisions, 7 ADR requirements)
- Add PRD/Architecture gap analysis
- Add action plan and next steps

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

# Push (opcionális)
git push origin main
```

**Deadline:** 2026-02-03 (ma)

---

## 2. RÖVID TÁVÚ Akciók (1-2 hét)

### 2.1 ADR-ek Elkészítése (Prioritási Sorrend)

**Prioritás:** 🔴 KRITIKUS

**Cél:** 7 új ADR elkészítése architektúra döntések dokumentálásához

**Sorrend:**

#### ADR-044: Kaució Konfiguráció és Kalkuláció

**Deadline:** 2026-02-05

**Input:**

- [kgc-dontesi-osszefoglalo-2026-02-03.md](kgc-dontesi-osszefoglalo-2026-02-03.md) - D-02 döntés
- Döntési kérdés: Géptípus vs. gép szintű kaució, fix vs. százalék

**BMAD Workflow:** NINCS (kézi ADR írás, sablon: `planning-artifacts/adr/ADR-TEMPLATE.md`)

**Output:** `planning-artifacts/adr/ADR-044-kaucio-konfiguracio-kalkulacio.md`

**Akció:**

```bash
# ADR sablon másolás
cp planning-artifacts/adr/ADR-TEMPLATE.md planning-artifacts/adr/ADR-044-kaucio-konfiguracio-kalkulacio.md

# Szerkesztés (használd az Edit tool-t vagy VSCode-ot)
# Tartalom: lásd kgc-dontesi-osszefoglalo-2026-02-03.md - 3. szekció (Új ADR Igények) - ADR-044
```

---

#### ADR-046: Hosszú Távú Szerződés Architektúra

**Deadline:** 2026-02-07

**Input:**

- [kgc-dontesi-osszefoglalo-2026-02-03.md](kgc-dontesi-osszefoglalo-2026-02-03.md) - D-04, D-05, D-06, D-07, D-09, D-10
- Döntési kérdés: Új package vagy meglévő bővítése?

**Output:** `planning-artifacts/adr/ADR-046-hosszu-tavu-szerzodes-architektura.md`

---

#### ADR-048: Dashboard Architektúra és Widget Rendszer

**Deadline:** 2026-02-10

**Input:**

- [kgc-dontesi-osszefoglalo-2026-02-03.md](kgc-dontesi-osszefoglalo-2026-02-03.md) - D-15
- Döntési kérdés: RBAC alapú fix layout, admin konfigurálható widgetek

**Output:** `planning-artifacts/adr/ADR-048-dashboard-architektura-widget-rendszer.md`

---

#### ADR-047: Makita Norma Integráció és Verziókezelés

**Deadline:** 2026-02-12

**Input:**

- [kgc-dontesi-osszefoglalo-2026-02-03.md](kgc-dontesi-osszefoglalo-2026-02-03.md) - D-11, D-12
- Makita minta Excel (ha megérkezett)
- Döntési kérdés: Excel import stratégia

**Output:** `planning-artifacts/adr/ADR-047-makita-norma-integracio-verziokezeles.md`

---

#### ADR-045: MyPOS Pre-authorization Stratégia

**Deadline:** 2026-02-14 (blokkolt - ügyfél válasz szükséges!)

**Input:**

- Ügyfél válasz (tisztázó kérdés 1.1)
- MyPOS API dokumentáció kutatás
- [kgc-dontesi-osszefoglalo-2026-02-03.md](kgc-dontesi-osszefoglalo-2026-02-03.md) - D-03

**Output:** `planning-artifacts/adr/ADR-045-mypos-pre-authorization-strategia.md`

---

#### ADR-049: Adatmodell Bővítések v7.0

**Deadline:** 2026-02-17

**Input:**

- [kgc-dontesi-osszefoglalo-2026-02-03.md](kgc-dontesi-osszefoglalo-2026-02-03.md) - 2.3 szekció (Adatmodell változások)
- [kgc-gap-analizis-prd-architektura-2026-02-03.md](kgc-gap-analizis-prd-architektura-2026-02-03.md) - 8. szekció
- Döntési kérdés: Prisma schema bővítések (8 új tábla)

**Output:** `planning-artifacts/adr/ADR-049-adatmodell-bovitesek-v7-0.md`

---

#### ADR-037 Kiterjesztés: Késedelmi Díj Kalkuláció

**Deadline:** 2026-02-19

**Input:**

- Meglévő ADR-037 (Bérlési díj kalkuláció)
- [kgc-dontesi-osszefoglalo-2026-02-03.md](kgc-dontesi-osszefoglalo-2026-02-03.md) - D-13
- Döntési kérdés: Késedelmi díj számítási logika

**Output:** `planning-artifacts/adr/ADR-037-berlesi-dij-kalkulacio.md` (frissített verzió)

---

### 2.2 Ellentmondások Feloldása

**Prioritás:** 🔴 KRITIKUS

**Cél:** 3 azonosított ellentmondás feloldása

**Forrás:** [kgc-gap-analizis-prd-architektura-2026-02-03.md](kgc-gap-analizis-prd-architektura-2026-02-03.md) - 14. szekció

#### E-01: Package Elnevezés (Magyar vs. Angol)

**Döntés szükséges:** Magyar VAGY Angol

**Javasolt:** Angol elnevezés (nemzetközi best practice)

**Akció:**

```bash
# 1. Kód audit: Létező packages/ tartalom ellenőrzése
ls -la packages/

# 2. Ha van implementált kód: refaktoring terv készítése
# 3. Ha üres/minimális: egyszerű átnevezés

# 4. Döntés dokumentálása:
#    - ADR-010 kiterjesztés: Package Naming Convention
#    - Architektúra 5.1 frissítése angol nevekre
```

**Deadline:** 2026-02-10

---

#### E-02: Automatikus vs. Manuális Kedvezmény

**Döntés:** Mindkettő támogatása, kedvezmény halmozódás szabály tisztázása

**Akció:**

- PRD 3.2.7 szekció készítésekor tisztázás hozzáadása
- Üzleti szabály: legnagyobb kedvezmény érvényes VAGY admin konfiguráció

**Deadline:** 2026-02-12

---

#### E-03: Szerződés Modul Duplikáció

**Döntés szükséges:** Meglévő `@kgc/szerzodes` bővítése vagy új `@kgc/rental-contract`?

**Akció:**

```bash
# Meglévő package tartalom ellenőrzése
ls -la packages/berles-szerzodes/

# Ha üres → átnevezés
# Ha van implementáció → bővítés
```

**Deadline:** 2026-02-10

---

## 3. KÖZEPES TÁVÚ Akciók (2-4 hét)

### 3.1 PRD v2.0 → v2.1 Frissítés

**Prioritás:** 🔴 KRITIKUS

**Cél:** PRD frissítése új követelményekkel

**Forrás:** [kgc-gap-analizis-prd-architektura-2026-02-03.md](kgc-gap-analizis-prd-architektura-2026-02-03.md) - 13.1 szekció

**BMAD Workflow:** NINCS (kézi szerkesztés)

**Frissítendő fájl:** `planning-artifacts/prd.md`

**Új szekciók:**

```markdown
## 3.2 Bérlés Modul

### 3.2.5 Kaució Kezelés (MyPOS Integráció)

[Tartalom: kgc-gap-analizis... 1. szekció alapján]

### 3.2.6 Hosszú Távú Szerződések

[Tartalom: kgc-gap-analizis... 2. szekció alapján]

### 3.2.7 Időtartam Alapú Kedvezmény Rendszer

[Tartalom: kgc-gap-analizis... 3. szekció alapján]

## 3.3 Szerviz Modul

### 3.3.5 Makita Norma és Garanciális Integráció

[Tartalom: kgc-gap-analizis... 4. szekció alapján]

## 3.4 Pénzügy Modul

### 3.4.3 Számlázási Módok

[Tartalom: kgc-gap-analizis... 5. szekció - előre/utólag, előleg]

### 3.4.4 Késedelmi Díj és Fizetési Késedelem

[Tartalom: kgc-gap-analizis... 5. szekció - késedelmi díj]

## 3.7 Dashboard és Riporting Modul (ÚJ SZEKCIÓ)

### 3.7.1 RBAC Alapú Dashboard

### 3.7.2 Bevételi Riportok

### 3.7.3 Készlet Riportok

### 3.7.4 Szerviz Riportok

### 3.7.5 Partner / Ügyfél Riportok

### 3.7.6 Export és Integráció

[Tartalom: kgc-gap-analizis... 6. szekció alapján]
```

**Verzió frissítés:**

```yaml
---
# YAML front matter frissítése
version: '2.1' # 2.0 → 2.1
date: '2026-02-03' # 2026-01-01 → 2026-02-03
---
```

**Változásnapló hozzáadása:**

```markdown
## Változásnapló

| Verzió | Dátum      | Változás                                                                                                          |
| ------ | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| 2.1    | 2026-02-03 | Új követelmények: Kaució, Hosszú távú szerződések, Kedvezmények, Makita norma, Dashboard/Riporting (7 új szekció) |
| 2.0    | 2026-01-01 | BMad Method Reset - Kezdeti verzió                                                                                |
```

**Deadline:** 2026-02-21

**Git Commit:**

```bash
git add planning-artifacts/prd.md
git commit -m "docs(prd): update to v2.1 - add 7 new sections

- 3.2.5 MyPOS Deposit Management
- 3.2.6 Long-term Contracts
- 3.2.7 Duration-based Discount System
- 3.3.5 Makita Norma Integration
- 3.4.3 Billing Modes (prepaid/postpaid)
- 3.4.4 Late Fees and Payment Delays
- 3.7.* Dashboard and Reporting Module (6 subsections)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### 3.2 Architektúra v1.0 → v1.1 Frissítés

**Prioritás:** 🔴 KRITIKUS

**Cél:** Architektúra dokumentum frissítése új package-ekkel, ADR-ekkel

**Forrás:** [kgc-gap-analizis-prd-architektura-2026-02-03.md](kgc-gap-analizis-prd-architektura-2026-02-03.md) - 13.2 szekció

**Frissítendő fájl:** `planning-artifacts/architecture.md`

**Fő változások:**

1. **5.1 Monorepo Struktúra:** 6 új package + angol átnevezés
2. **6. Adatbázis:** 2 új alszekció (6.3 Új táblák, 6.4 Bővítések)
3. **7. RBAC:** 7.3 Dashboard/Riport permission-ök
4. **8. Frontend:** 8.3 Dashboard Widget Rendszer
5. **9. Integrációk:** 9.3 MyPOS, 9.4 Makita
6. **12. ADR Összefoglaló:** 7 új ADR

**Deadline:** 2026-02-24

**Git Commit:**

```bash
git add planning-artifacts/architecture.md
git commit -m "docs(arch): update to v1.1 - add 6 new packages and 7 new ADRs

- Add 6 new packages (mypos, rental-contract, rental-discount, service-makita, dashboard, reporting)
- Add database schema expansions (8 new tables)
- Add RBAC dashboard/report permissions
- Add MyPOS and Makita integrations
- Update ADR summary (7 new ADRs)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### 3.3 Epic és Story Készítés

**Prioritás:** 🟠 MAGAS

**Cél:** 12 Epic lebontása részletes Story-kra

**Forrás:** [kgc-implementacios-prioritas-matrix-2026-02-03.md](kgc-implementacios-prioritas-matrix-2026-02-03.md)

**BMAD Workflow:** `/bmad:bmm:workflows:create-epics-and-stories`

**Input Dokumentumok:**

- PRD v2.1 (frissített)
- Architektúra v1.1 (frissített)
- ADR-044, ADR-046, ADR-047, ADR-048 (elkészített ADR-ek)

**Epicek:**

1. Epic 1: MyPOS Kaució Integráció (~13-21 SP)
2. Epic 2: Kárigény és Károsodás Kezelés (~8-13 SP)
3. Epic 3: Hosszú Távú Szerződések Alapfunkciók (~34-55 SP - BONTÁS!)
4. Epic 4: Időtartam Alapú Kedvezmény Rendszer (~5-8 SP)
5. Epic 5: Ügyfél Portál - Szerződés Módosítás (~8-13 SP)
6. Epic 6: Karbantartás Ütemezés Workflow (~5-8 SP)
7. Epic 7: Makita Norma és Garanciális Integráció (~21-34 SP)
8. Epic 8: Pénzügyi Modul - Késedelem és Díjszámítás (~13-21 SP)
9. Epic 9: Dashboard Alapok és Widgetek (~13-21 SP)
10. Epic 10: Riporting Modul (~34-55 SP - BONTÁS!)
11. Epic 11: Hűségprogram (későbbi fázis)
12. Epic 12: Könyvelői Modul (~8-13 SP)

**Akció:**

```bash
# BMAD workflow indítása
/bmad:bmm:workflows:create-epics-and-stories

# Workflow input:
# - PRD: planning-artifacts/prd.md
# - Architektúra: planning-artifacts/architecture.md
# - ADR-ek: planning-artifacts/adr/ADR-044, ADR-046, ADR-047, ADR-048
```

**Output:** `planning-artifacts/epics/*.md` (Epic fájlok Story-kkal)

**Deadline:** 2026-02-28

---

### 3.4 Sprint Planning

**Prioritás:** 🟠 MAGAS

**Cél:** Phase 1 Sprint 1-3 tervezés

**BMAD Workflow:** `/bmad:bmm:workflows:sprint-planning`

**Input:**

- Epic fájlok (`planning-artifacts/epics/*.md`)
- Implementációs prioritás mátrix

**Output:** `implementation-artifacts/sprint-status.yaml`

**Akció:**

```bash
# BMAD workflow indítása
/bmad:bmm:workflows:sprint-planning
```

**Deadline:** 2026-03-03

---

## 4. HOSSZÚ TÁVÚ Akciók (1-3 hónap)

### 4.1 Prisma Schema Tervezés

**Prioritás:** 🟠 MAGAS

**Cél:** 8 új tábla Prisma modellek + 3 meglévő bővítése

**Forrás:** [kgc-dontesi-osszefoglalo-2026-02-03.md](kgc-dontesi-osszefoglalo-2026-02-03.md) - 2.3 szekció

**Új táblák:**

- `RentalContract`
- `DiscountRule`
- `EquipmentDepositConfig`
- `EquipmentPackage`, `EquipmentPackageItem`
- `MakitaNorma`, `MakitaNormaItem`
- `MyPosTransaction`

**Bővítendő táblák:**

- `Rental`: +4 mező
- `Invoice`: +5 mező
- `ServiceWorksheet`: +3 mező

**Akció:**

```bash
# 1. Prisma schema fájl megkeresése
find . -name "schema.prisma"

# 2. Schema bővítése (használj Edit tool-t)
# 3. Migráció generálás (később, implementációkor):
pnpm db:generate
pnpm db:migrate
```

**Deadline:** 2026-03-10

---

### 4.2 Phase 1 Implementáció (Sprint 1-3)

**Prioritás:** 🔴 KRITIKUS

**Cél:** MVP funkciók implementálása

**Időkeret:** 3 sprint (~6-9 hét)

**Tartalmazott Epicek:**

- Epic 1: MyPOS Kaució Integráció (részleges)
- Epic 3: Hosszú Távú Szerződések Alapfunkciók (részleges)
- Epic 4: Időtartam Alapú Kedvezmény Rendszer
- Epic 9: Dashboard Alapok (részleges)

**BMAD Workflow-k:**

- `/bmad:bmm:workflows:dev-story` (story implementálás)
- `/bmad:bmm:workflows:code-review` (adversarial review)
- `/bmad:bmm:workflows:testarch-atdd` (ATDD teszt generálás)

**Deadline:** 2026-04-30

---

## 5. Prioritási Mátrix (Összefoglaló)

| Akció                            | Prioritás   | Deadline   | Blokkoló?                 | BMAD Workflow                                                      |
| -------------------------------- | ----------- | ---------- | ------------------------- | ------------------------------------------------------------------ |
| 1.1 Tisztázó kérdések küldése    | 🔴 KRITIKUS | 2026-02-04 | ✅ Igen (ADR-045)         | -                                                                  |
| 1.2 MyPOS API kutatás            | 🔴 KRITIKUS | 2026-02-05 | ✅ Igen (ADR-045)         | -                                                                  |
| 1.3 Makita minta Excel kérése    | 🟠 MAGAS    | 2026-02-06 | Részben (ADR-047)         | -                                                                  |
| 1.4 Git commit (dokumentumok)    | 🟠 MAGAS    | 2026-02-03 | ❌ Nem                    | -                                                                  |
| 2.1.1 ADR-044 (Kaució)           | 🔴 KRITIKUS | 2026-02-05 | ✅ Igen (Epic 1)          | -                                                                  |
| 2.1.2 ADR-046 (Szerződések)      | 🔴 KRITIKUS | 2026-02-07 | ✅ Igen (Epic 3)          | -                                                                  |
| 2.1.3 ADR-048 (Dashboard)        | 🔴 KRITIKUS | 2026-02-10 | ✅ Igen (Epic 9)          | -                                                                  |
| 2.1.4 ADR-047 (Makita)           | 🟠 MAGAS    | 2026-02-12 | Részben (Epic 7)          | -                                                                  |
| 2.1.5 ADR-045 (MyPOS pre-auth)   | 🔴 KRITIKUS | 2026-02-14 | ✅ Igen (Epic 1)          | -                                                                  |
| 2.1.6 ADR-049 (Adatmodell)       | 🟠 MAGAS    | 2026-02-17 | ❌ Nem                    | -                                                                  |
| 2.1.7 ADR-037 kiterjesztés       | 🟡 KÖZEPES  | 2026-02-19 | ❌ Nem                    | -                                                                  |
| 2.2.1 E-01 Package elnevezés     | 🔴 KRITIKUS | 2026-02-10 | ✅ Igen (Arch frissítés)  | -                                                                  |
| 2.2.2 E-02 Kedvezmény halmozódás | 🟡 KÖZEPES  | 2026-02-12 | ❌ Nem                    | -                                                                  |
| 2.2.3 E-03 Szerződés modul       | 🟠 MAGAS    | 2026-02-10 | Részben (Epic 3)          | -                                                                  |
| 3.1 PRD v2.1 frissítés           | 🔴 KRITIKUS | 2026-02-21 | ✅ Igen (Epic készítés)   | -                                                                  |
| 3.2 Arch v1.1 frissítés          | 🔴 KRITIKUS | 2026-02-24 | ✅ Igen (Epic készítés)   | -                                                                  |
| 3.3 Epic és Story készítés       | 🟠 MAGAS    | 2026-02-28 | ✅ Igen (Sprint planning) | `/bmad:bmm:workflows:create-epics-and-stories`                     |
| 3.4 Sprint Planning              | 🟠 MAGAS    | 2026-03-03 | ✅ Igen (Implementáció)   | `/bmad:bmm:workflows:sprint-planning`                              |
| 4.1 Prisma schema                | 🟠 MAGAS    | 2026-03-10 | ✅ Igen (Implementáció)   | -                                                                  |
| 4.2 Phase 1 implementáció        | 🔴 KRITIKUS | 2026-04-30 | ❌ Nem (cél)              | `/bmad:bmm:workflows:dev-story`, `/bmad:bmm:workflows:code-review` |

---

## 6. BMAD Workflow Útmutató

### 6.1 Epic és Story Készítés

```bash
# 1. Workflow indítása
/bmad:bmm:workflows:create-epics-and-stories

# 2. Input dokumentumok megadása (amikor kéri):
# - PRD: planning-artifacts/prd.md
# - Architektúra: planning-artifacts/architecture.md
# - Epics összefoglaló: kgc-implementacios-prioritas-matrix-2026-02-03.md

# 3. Workflow lépések:
# - Epics azonosítása
# - Story-k generálása Epic-enkén
# - Acceptance criteria definiálása
# - Story fájlok létrehozása (planning-artifacts/epics/)

# 4. Output ellenőrzése:
ls -la planning-artifacts/epics/
```

---

### 6.2 Sprint Planning

```bash
# 1. Workflow indítása
/bmad:bmm:workflows:sprint-planning

# 2. Input:
# - Epic fájlok (planning-artifacts/epics/*.md)
# - Prioritási mátrix (kgc-implementacios-prioritas-matrix-2026-02-03.md)

# 3. Workflow lépések:
# - Story-k kihúzása Epic-ekből
# - Prioritás szerinti rendezés
# - Sprint allokáció (Sprint 1, 2, 3)
# - sprint-status.yaml generálás

# 4. Output:
cat implementation-artifacts/sprint-status.yaml
```

---

### 6.3 Story Implementálás

```bash
# 1. Válassz egy "ready-for-dev" story-t
cat implementation-artifacts/sprint-status.yaml | grep -A 5 "ready-for-dev"

# 2. Workflow indítása
/bmad:bmm:workflows:dev-story

# 3. Input:
# - Story ID (pl: EPIC-1-STORY-1)

# 4. Workflow lépések:
# - Story fájl beolvasása
# - TDD/ATDD teszt generálás (ha szükséges)
# - Implementáció
# - Tesztek futtatása
# - Story státusz frissítés (review)

# 5. Code review (adversarial!)
/bmad:bmm:workflows:code-review
```

---

### 6.4 Adversarial Code Review

```bash
# 1. Workflow indítása
/bmad:bmm:workflows:code-review

# 2. Input:
# - Story fájl (implementation-artifacts/stories/epic-1/1-2-token-refresh.md)
# - Implementált fájlok (packages/core/auth/src/services/*.ts)

# 3. KRITIKUS SZABÁLY:
# - Minimum 3-10 konkrét problémát kell találnia
# - SOHA ne fogadja el "looks good" - mindig keres hibát!
# - Architecture compliance, security, performance, tests mind vizsgálva

# 4. Output:
# - Review findings (implementation-artifacts/reviews/epic-1/1-2-review.md)
# - Auto-fix javaslat (ha user jóváhagyja)
```

---

## 7. Kockázat Kezelés

| Kockázat                             | Valószínűség | Impact  | Mitigáció                            | Akció                                        |
| ------------------------------------ | ------------ | ------- | ------------------------------------ | -------------------------------------------- |
| Ügyfél válaszok késése               | MAGAS        | MAGAS   | Follow-up email 3 nap után           | Email emlékeztető 2026-02-07                 |
| MyPOS API hiányos dokumentáció       | KÖZEPES      | MAGAS   | Sandbox API tesztelés                | API kutatás 2026-02-05                       |
| ADR-ek elkészítése túl sok időt vesz | KÖZEPES      | KÖZEPES | Prioritizálás: kritikus ADR-ek előre | Csak ADR-044, 046, 048 ASAP                  |
| Package átnevezés breaking change    | ALACSONY     | KÖZEPES | Kód audit előre                      | packages/ tartalom ellenőrzés 2026-02-10     |
| Ellentmondás feloldása blokkol       | KÖZEPES      | MAGAS   | Korai döntés (E-01, E-03)            | Döntés dokumentálása ADR-010 kiterjesztésben |
| Prisma migráció problémák            | KÖZEPES      | MAGAS   | Többlépcsős migráció + backup        | Migráció terv ADR-049-ben                    |

---

## 8. Kommunikációs Terv

### 8.1 Ügyfél Kommunikáció

**Email 1: Tisztázó kérdések (2026-02-04)**

```
Tárgy: KGC ERP v7.0 - Követelmény Tisztázó Kérdések (8 db)

Kedves Javo!

Köszönjük a részletes válaszokat! Alapos feldolgozás után még 8 kérdés
maradt, ahol pontosításra van szükség a fejlesztés megkezdése előtt.

Kérdések (lásd csatolt dokumentum 7. szekció):
1. MyPOS Pre-authorization (pre-auth vs. azonnali terhelés?)
2. Hosszú távú szerződés definíció (30+ nap?)
3. ... (stb.)

Válaszaid 3-5 munkanapon belül nagyon hasznosak lennének, hogy ne
álljon le a fejlesztés.

Melléklet:
- kgc-kovetelmeny-tisztazo-valaszok-2026-02-03.md

Üdvözlettel,
Claude Code / BMAD Agent Team
```

---

**Email 2: Makita Norma Minta Kérése (2026-02-06)**

```
Tárgy: KGC ERP v7.0 - Makita Norma Minta Excel Kérése

Kedves Javo!

A Makita norma integráció fejlesztéséhez szükségünk lenne egy valós
Makita norma Excel fájlra (érzékeny adatok kitakarhatók).

Kérdések:
- Milyen oszlopok vannak?
- Van fejléc sor?
- Egy vagy több worksheet?

Köszönjük!

Üdvözlettel,
Claude Code
```

---

### 8.2 Belső Team Kommunikáció

**Slack/Teams Channel Update (heti):**

```
📊 KGC ERP v7.0 - Heti Státusz Összefoglaló

✅ Elkészült:
- 5 analízis dokumentum (~3750 sor)
- Gap analízis (PRD/Arch)

🔄 Folyamatban:
- 7 ADR elkészítése (ADR-044, 046, 048 előrébb)
- Tisztázó kérdések (várakozás ügyfél válaszra)

🚧 Következő lépések:
- PRD v2.1 frissítés (2026-02-21 deadline)
- Arch v1.1 frissítés (2026-02-24 deadline)

⚠️ Blokkolók:
- ADR-045 (MyPOS pre-auth) blokkolt → ügyfél válasz szükséges
```

---

## 9. Sikerkritériumok (Definition of Done)

### 9.1 Dokumentáció DoD

- ✅ PRD v2.1 frissítés elkészült (7 új szekció)
- ✅ Architektúra v1.1 frissítés elkészült (6 új package, 7 új ADR)
- ✅ 7 ADR elkészült és elfogadott státuszú
- ✅ 12 Epic elkészült részletes Story-kkal
- ✅ Sprint Planning elkészült (Phase 1 Sprint 1-3)
- ✅ Prisma schema frissítve (8 új tábla)

### 9.2 Implementáció DoD (Phase 1)

- ✅ Epic 1: MyPOS Kaució Integráció (részleges) - implementálva + tesztelve
- ✅ Epic 3: Hosszú Távú Szerződések (részleges) - implementálva + tesztelve
- ✅ Epic 4: Kedvezmény Rendszer - implementálva + tesztelve
- ✅ Epic 9: Dashboard Alapok (részleges) - implementálva + tesztelve
- ✅ TDD/ATDD tesztek (kritikus üzleti logika) - 100% coverage
- ✅ Adversarial code review (minden Epic) - minimum 3 issue / review round
- ✅ Dual-AI review (Claude + Gemini) - consensus vagy eszkaláció

---

## 10. Összefoglalás - Gyors Referencia

### Mi van most?

✅ **KÉSZ:**

- 5 analízis dokumentum (~3750 sor)
- 49 kérdés strukturált válaszokkal
- 32 implementációs feladat azonosítva
- 12 Epic javasolva
- 7 ADR igény dokumentálva
- PRD/Arch gap analízis

⏳ **FOLYAMATBAN:**

- Ügyfél válaszok várakozás (8 kérdés)
- MyPOS API kutatás

🎯 **KÖVETKEZŐ LÉPÉS (MA):**

1. Git commit (5 dokumentum)
2. Tisztázó kérdések email küldése
3. MyPOS API kutatás indítása

---

### Mi a kritikus útvonal?

```
Tisztázó kérdések → ADR-ek (044, 046, 048) → PRD/Arch frissítés →
Epic készítés → Sprint Planning → Implementáció (Phase 1)
```

**Blokkoló:** Ügyfél válaszok (8 kérdés) - ADR-045 függ tőle!

---

### Hol találhatók a dokumentumok?

```
_bmad-output/planning-artifacts/
├── kgc-kovetelmeny-tisztazo-valaszok-2026-02-03.md
├── kgc-implementacios-prioritas-matrix-2026-02-03.md
├── kgc-dontesi-osszefoglalo-2026-02-03.md
├── kgc-gap-analizis-prd-architektura-2026-02-03.md
└── kgc-kovetkezo-lepesek-2026-02-03.md (ez a dokumentum)
```

---

**AKCIÓ SZÜKSÉGES:** Kezdd a 1. szekció (AZONNALI Akciók) végrehajtásával!

---

**Dokumentum vége**

_Generálva: BMAD Correct-Course Workflow, 2026-02-03_
