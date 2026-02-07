# Story 40-2: Bérgép megtérülés kalkuláció

## Story Metaadatok

| Mező           | Érték                                    |
| -------------- | ---------------------------------------- |
| **Story ID**   | 40-2                                     |
| **Epic**       | Epic 40 - Bérgép Megtérülés & Előzmények |
| **Prioritás**  | P0 - Kritikus                            |
| **Becsült SP** | 5                                        |
| **Státusz**    | ready-for-dev                            |
| **ADR**        | ADR-051                                  |
| **Sprint**     | Sprint 9                                 |

## User Story

**Mint** boltvezető,
**Szeretném** látni egy bérgép teljes megtérülését,
**Hogy** tudjam, mikor érdemes eladni.

## Üzleti Kontextus

Meeting idézet (Zsuzsi):

> _"Nekem ez kell. És ezt állandóan látnom kell, mert ha egy ügyfél azt mondja pont bérlésre, hogy én ezt a gépet megvenném, nekem ez azonnal kell ez az adat, hiszen innen tudom, hogy ez a gép eladható, mennyit hozott, hogy mennyiért tudom eladni"_

## Acceptance Criteria

### AC-1: Nyereséges gép kalkulációja

```gherkin
Given egy bérgép vételára "500000" Ft
And összes bérleti bevétel "800000" Ft
And összes szerviz ráfordítás "150000" Ft
When kiszámolom a megtérülést
Then a nyereség "150000" Ft (800000 - 500000 - 150000)
And a ROI "30" % (150000 / 500000 * 100)
And a státusz "PROFITABLE"
```

### AC-2: Veszteséges gép kalkulációja

```gherkin
Given egy bérgép vételára "600000" Ft
And összes bérleti bevétel "300000" Ft
And összes szerviz ráfordítás "100000" Ft
When kiszámolom a megtérülést
Then a nyereség "-400000" Ft
And a ROI "-66.67" %
And a státusz "LOSING"
```

### AC-3: Nullszaldós gép

```gherkin
Given egy bérgép vételára "400000" Ft
And összes bérleti bevétel "450000" Ft
And összes szerviz ráfordítás "50000" Ft
When kiszámolom a megtérülést
Then a nyereség "0" Ft
And a státusz "BREAK_EVEN"
```

### AC-4: Vételár nélküli gép (hiányzó adat)

```gherkin
Given egy bérgép vételár NÉLKÜL
When kiszámolom a megtérülést
Then a státusz "INCOMPLETE"
And hibaüzenet "Vételár szükséges a megtérülés számításhoz"
```

## Képlet

```
PROFIT = Σ(Rental.totalAmount) - purchasePrice - Σ(Worksheet.totalCost WHERE !isWarranty)
ROI % = (PROFIT / purchasePrice) × 100

Státusz meghatározás:
- PROFITABLE: profit > 0
- LOSING: profit < 0
- BREAK_EVEN: profit == 0
- INCOMPLETE: purchasePrice == null
```

## Technikai Feladatok

### Task 1: EquipmentProfitService - TDD ✅ KÉSZ

- [x] Interface definíció: `IEquipmentProfitResult`
- [x] `EquipmentProfitService.calculateProfit(equipmentId, tenantId?)`
- [x] Unit tesztek: 17 db PASS (TDD KÖTELEZŐ!)
- [ ] Property-based tesztek: 10 db (boundary cases) - TODO

**TDD Teszt szkenáriók:**

1. Nyereséges gép - pozitív profit
2. Veszteséges gép - negatív profit
3. Nullszaldós gép - 0 profit
4. Vételár nélküli gép - INCOMPLETE
5. Bevétel nélküli gép - csak költség
6. Ráfordítás nélküli gép - csak bevétel
7. Garanciális munkalapok kizárása
8. Több bérlés aggregáció
9. Több munkalap aggregáció
10. ROI kalkuláció pontosság (2 tizedes)
11. Negatív ROI kezelés
12. Nagy számok kezelése (100M+)
13. Floating point pontosság
14. Multi-tenancy (ADR-001) - tenantId átadás
15. Multi-tenancy - RLS fallback
16. Üres equipmentId kezelése
17. Nem létező equipment kezelése
18. Részleges adatok (csak vételár)
19. Időszakos lekérdezés (dateFrom, dateTo)
20. Snapshot mentés (opcionális)

**Fájlok:**

- `packages/berles/rental-core/src/services/equipment-profit.service.ts` - LÉTREHOZANDÓ
- `packages/berles/rental-core/src/services/equipment-profit.service.spec.ts` - LÉTREHOZANDÓ

### Task 2: Prisma Repository ⏳

- [ ] `IEquipmentProfitRepository` interface
- [ ] `PrismaEquipmentProfitRepository` implementáció
- [ ] Bevétel aggregáció (Rental.totalAmount)
- [ ] Integration tesztek

**Fájlok:**

- `apps/kgc-api/src/modules/bergep/repositories/prisma-equipment-profit.repository.ts` - LÉTREHOZANDÓ

### Task 3: API Endpoint ⏳

- [ ] `GET /bergep/:id/profit` endpoint
- [ ] Response DTO: `EquipmentProfitResponseDto`
- [ ] Controller teszt

**Fájlok:**

- `apps/kgc-api/src/modules/bergep/controllers/bergep.controller.ts` - BŐVÍTENDŐ
- `apps/kgc-api/src/modules/bergep/dto/equipment-profit-response.dto.ts` - LÉTREHOZANDÓ

## Függőségek

| Függőség                          | Státusz    |
| --------------------------------- | ---------- |
| Story 40-1 (EquipmentCostService) | ✅ DONE    |
| Rental model (Epic 14)            | ✅ Létezik |
| RentalEquipment.purchasePrice     | ✅ Létezik |

## Tesztelési Követelmények

| Típus       | Darab | Fájl                                | Státusz |
| ----------- | ----- | ----------------------------------- | ------- |
| Unit (TDD)  | 20    | `equipment-profit.service.spec.ts`  | ⏳ TODO |
| Property    | 10    | `equipment-profit.property.spec.ts` | ⏳ TODO |
| Integration | 5     | `bergep.controller.spec.ts`         | ⏳ TODO |

## Definition of Done

- [ ] AC-1, AC-2, AC-3, AC-4 teljesül
- [ ] TDD: Tesztek ELŐBB megírva
- [ ] Unit tesztek PASS (20 db)
- [ ] Property-based tesztek PASS (10 db)
- [ ] Code review PASS
- [ ] Multi-tenancy (ADR-001) implementálva
- [ ] Floating point pontosság biztosított
- [ ] Sprint-status.yaml DONE státuszra állítva

## Megjegyzések

- **TDD KÖTELEZŐ** - Pénzügyi számítás, tesztek ELŐBB!
- A ráfordítás aggregáció már kész (Story 40-1)
- A bevétel aggregációhoz a Rental model-t kell használni
- ROI kerekítés: 2 tizedesre
- Floating point: Math.round(value \* 100) / 100 pattern
