# Story 40-1: Bérgép vételár és ráfordítás nyilvántartás

## Story Metaadatok

| Mező           | Érték                                    |
| -------------- | ---------------------------------------- |
| **Story ID**   | 40-1                                     |
| **Epic**       | Epic 40 - Bérgép Megtérülés & Előzmények |
| **Prioritás**  | P0 - Kritikus                            |
| **Becsült SP** | 3                                        |
| **Státusz**    | done                                     |
| **ADR**        | ADR-051                                  |
| **Sprint**     | Sprint 9                                 |

## User Story

**Mint** boltvezető,
**Szeretném** rögzíteni a bérgépek vételárát és látni a szerviz ráfordításokat,
**Hogy** tudjam a megtérülés alapját számolni.

## Üzleti Kontextus

Meeting idézet (Zsuzsi):

> _"Mennyiért vettük plusz mennyit költöttünk rá. És a bevétel azt kell kivonni. Tehát egy gép kint volt és hozott mondjuk 1 millió Ft-ot, de 500000-ért vettem és javítottunk rá 300000 Ft-ot, akkor ki fog jönni, hogy 300 nyereségben vagyok."_

## Acceptance Criteria

### AC-1: Vételár rögzítése új bérgéphez

```gherkin
Given egy új bérgép létrehozása folyamatban
When megadom a vételárat "450000" Ft
And megadom a vásárlás dátumát "2025-01-15"
And megadom a beszállítót "Makita Hungary Kft."
Then a bérgép mentésre kerül a vételárral
And a vételár megjelenik a bérgép adatlapon
```

### AC-2: Meglévő bérgép vételárának utólagos rögzítése

```gherkin
Given egy meglévő bérgép vételár nélkül
When szerkesztem a bérgép adatait
And megadom a vételárat "320000" Ft
Then a vételár elmentésre kerül
And az audit logban rögzítésre kerül a változás
```

### AC-3: Szerviz ráfordítások automatikus összesítése

```gherkin
Given egy bérgép "EQ-001" azonosítóval
And 3 lezárt belső munkalap a géphez:
  | Munkalap | Összeg | Garanciális |
  | WS-001   | 50000  | nem         |
  | WS-002   | 30000  | nem         |
  | WS-003   | 20000  | igen        |
When lekérdezem a ráfordításokat
Then a teljes ráfordítás "80000" Ft (garanciális NEM számít)
```

## Technikai Feladatok

### Task 1: Prisma Migráció ✅ KÉSZ

- [x] `EquipmentProfitSnapshot` model hozzáadása
- [x] `RentalEquipment.purchasedFrom` mező hozzáadása
- [x] Migráció SQL létrehozása
- [x] RLS policy beállítása

**Fájlok:**

- `apps/kgc-api/prisma/schema.prisma` - ✅ Frissítve
- `apps/kgc-api/prisma/migrations/20260207000000_epic40_equipment_profit/migration.sql` - ✅ Létrehozva

### Task 2: Ráfordítás Aggregáció Service ✅ KÉSZ

- [x] `EquipmentCostService.getTotalServiceCost(equipmentId)` implementálása
- [x] Garanciális munkalapok kizárása
- [x] Unit tesztek (11 db - min. 5 teljesítve, +2 multi-tenancy teszt)

**Fájlok:**

- `packages/berles/rental-core/src/services/equipment-cost.service.ts` - ✅ Létrehozva
- `packages/berles/rental-core/src/services/equipment-cost.service.spec.ts` - ✅ 11 teszt PASS
- `packages/berles/rental-core/src/index.ts` - ✅ Export hozzáadva

### Task 3: API Endpoint ✅ KÉSZ

- [x] `GET /bergep/:id/costs` endpoint
- [x] Response DTO
- [x] Integration teszt (4 új teszt a controller.spec.ts-ben)

**Fájlok:**

- `apps/kgc-api/src/modules/bergep/controllers/bergep.controller.ts` - ✅ Bővítve
- `apps/kgc-api/src/modules/bergep/dto/equipment-cost-response.dto.ts` - ✅ Létrehozva
- `apps/kgc-api/src/modules/bergep/repositories/prisma-equipment-cost.repository.ts` - ✅ Létrehozva
- `apps/kgc-api/src/modules/bergep/bergep.module.ts` - ✅ Frissítve
- `apps/kgc-api/src/modules/bergep/controllers/bergep.controller.spec.ts` - ✅ 29 teszt PASS

### Task 4: UI Form Bővítés ⏳ BLOCKER

- [ ] Vételár mező hozzáadása a bérgép form-hoz
- [ ] Beszállító mező hozzáadása
- [ ] Ráfordítás megjelenítése (csak olvasható)

**Blocker:** Az `EquipmentForm.tsx` még nem létezik a projektben. A bérgép kezelő UI komponensek létrehozása külön story-ban szükséges (Epic 13 folytatása).

**Fájlok:**

- `apps/kgc-web/src/pages/equipment/EquipmentForm.tsx` - LÉTREHOZANDÓ

## Függőségek

| Függőség                        | Státusz    |
| ------------------------------- | ---------- |
| Prisma schema                   | ✅ Kész    |
| Worksheet model (Epic 17)       | ✅ Létezik |
| RentalEquipment model (Epic 13) | ✅ Létezik |

## Tesztelési Követelmények

| Típus       | Darab | Fájl                             | Státusz    |
| ----------- | ----- | -------------------------------- | ---------- |
| Unit        | 11    | `equipment-cost.service.spec.ts` | ✅ PASS    |
| Integration | 4     | `bergep.controller.spec.ts`      | ✅ PASS    |
| E2E         | 2     | `equipment-cost.e2e.ts`          | ⏳ Pending |

## Definition of Done

- [x] AC-3 teljesül (ráfordítás számítás backend)
- [x] Prisma migráció létrehozva (alkalmazás staging-en függőben)
- [x] Unit tesztek PASS (11 db)
- [x] Integration tesztek PASS (4 db)
- [x] Code review PASS
- [x] Dokumentáció frissítve
- [x] Sprint-status.yaml DONE státuszra állítva
- ⏳ AC-1, AC-2 UI része blokkolt (EquipmentForm hiányzik)
- ⏳ Task 4 külön story-ra halasztva

## Megjegyzések

- A `purchasePrice` és `purchaseDate` mezők MÁR LÉTEZNEK a schemában
- Csak a `purchasedFrom` és `EquipmentProfitSnapshot` lett hozzáadva
- A garanciális munkalapok NEM számítanak ráfordításnak (gyártó fizeti)
