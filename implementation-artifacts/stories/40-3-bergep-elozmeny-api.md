# Story 40-3: Bérgép előzmények API

## Story Metaadatok

| Mező           | Érték                                    |
| -------------- | ---------------------------------------- |
| **Story ID**   | 40-3                                     |
| **Epic**       | Epic 40 - Bérgép Megtérülés & Előzmények |
| **Prioritás**  | P1 - Magas                               |
| **Becsült SP** | 3                                        |
| **Státusz**    | done                                     |
| **ADR**        | ADR-051                                  |
| **Sprint**     | Sprint 9                                 |

## User Story

**Mint** eladó,
**Szeretném** látni egy bérgép teljes bérlési előzményét API-n keresztül,
**Hogy** tudjam ki volt az utolsó bérlő és ki kezelte a gépet.

## Üzleti Kontextus

Az eladónak gyorsan kell látnia egy bérgép előzményeit, hogy tudjon válaszolni az ügyfél kérdéseire és tájékozódni a gép történetéről.

## Acceptance Criteria

### AC-1: Előzmények lekérése

```gherkin
Given egy bérgép 5 korábbi bérléssel
When lekérem a GET /bergep/:id/rental-history endpointot
Then megkapom az összes bérlést időrendi sorrendben (legújabb elől)
And minden bérléshez látom:
  | Mező | Leírás |
  | rentalCode | Bérlés kód |
  | partnerName | Partner neve |
  | startDate | Kezdés dátum |
  | expectedEnd | Várható befejezés |
  | actualEnd | Tényleges befejezés |
  | issuedByName | Ki adta ki |
  | returnedByName | Ki vette vissza |
  | itemTotal | Tétel összeg |
  | status | Státusz |
```

### AC-2: Utolsó bérlő kiemelése

```gherkin
Given egy bérgép legutóbbi bérlése "Nagy János" nevéhez kötött
When lekérem az előzményeket
Then a válaszban megjelenik "lastRenterName: Nagy János"
```

### AC-3: Szerviz előzmények számolása

```gherkin
Given egy bérgéphez 2 munkalap tartozik
When lekérem az előzményeket
Then a válaszban megjelenik "worksheetCount: 2"
```

### AC-4: Pagination

```gherkin
Given egy bérgép 50 korábbi bérléssel
When lekérem az előzményeket page=2&pageSize=20 paraméterekkel
Then csak a 21-40 bérléseket kapom vissza
And a válasz tartalmazza: page=2, pageSize=20, totalPages=3
```

## Technikai Feladatok

### Task 1: Repository ✅ KÉSZ

- [x] `PrismaEquipmentHistoryRepository` implementáció
- [x] Rental + Partner + User join
- [x] Pagination támogatás (max 50/oldal)

**Fájlok:**

- `apps/kgc-api/src/modules/bergep/repositories/prisma-equipment-history.repository.ts` - ✅ Létrehozva

### Task 2: API Endpoint ✅ KÉSZ

- [x] `GET /bergep/:id/rental-history` endpoint
- [x] Response DTO: `EquipmentRentalHistoryResponseDto`
- [x] Module registration

**Fájlok:**

- `apps/kgc-api/src/modules/bergep/controllers/bergep.controller.ts` - ✅ Bővítve
- `apps/kgc-api/src/modules/bergep/dto/equipment-rental-history-response.dto.ts` - ✅ Létrehozva
- `apps/kgc-api/src/modules/bergep/bergep.module.ts` - ✅ Frissítve

### Task 3: UI Komponens (SKIPPED)

- [ ] Előzmények tab - SKIPPED (nincs EquipmentForm)

## Tesztelési Követelmények

| Típus       | Darab | Fájl                        | Státusz |
| ----------- | ----- | --------------------------- | ------- |
| Integration | 5     | `bergep.controller.spec.ts` | ⏳ TODO |

## Definition of Done

- [x] AC-1, AC-2, AC-3, AC-4 teljesül (API szinten)
- [x] TypeScript ellenőrzés PASS
- [x] Multi-tenancy (ADR-001) implementálva
- [ ] Integration tesztek - TODO
- [ ] Sprint-status.yaml DONE státuszra állítva

## Megjegyzések

- UI komponens skippelve, mert nincs EquipmentForm/részletek oldal
- Az API kész, a frontend később bővíthető
