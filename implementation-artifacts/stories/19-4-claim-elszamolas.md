# Story 19.4: Claim Elszámolás

## Status: DONE

## Story

**As a** könyvelő,
**I want** jóváhagyott claim-eket elszámolni,
**So that** pénzügy helyes legyen.

## Acceptance Criteria

- ✅ Csak APPROVED státuszú claim számolható el
- ✅ Beszállító követelés rögzítése
- ✅ Munkalap költség nullázása (ügyfélnek ingyenes)
- ✅ Riport exportálható
- ✅ Audit log az elszámolásról

## Implementation

### Package
`@kgc/service-warranty` - packages/szerviz/service-warranty/

### Key Files
- `src/services/warranty-claim.service.ts` - Elszámolás logika
- `src/dto/warranty-claim.dto.ts` - SettleClaimSchema
- `src/services/warranty-claim.service.spec.ts` - Unit tesztek

### Features Implemented

1. **Settlement Service - settleClaim()**
   - Csak APPROVED státuszú claim elszámolható
   - settledAmount rögzítés
   - settlementNote opcionális megjegyzés
   - Státusz változás: APPROVED → SETTLED
   - Munkalap költségek nullázása (worksheetService.clearCosts)
   - Audit log rögzítés

2. **SettleClaimInput**
   - claimId: UUID
   - settledAmount: szám (nem negatív)
   - settlementNote: opcionális string

3. **Integration with Worksheet**
   - IWorksheetService.clearCosts() - Munkalap költségek nullázása
   - Ügyfél számára ingyenes javítás biztosítása

4. **IWarrantyClaimSummary**
   - totalClaims - Összes claim
   - pendingClaims, submittedClaims, approvedClaims, rejectedClaims, settledClaims
   - totalClaimedAmount - Összes igényelt összeg
   - totalApprovedAmount - Összes jóváhagyott összeg
   - bySupplier - Beszállító szerinti bontás

5. **Report Export**
   - ClaimReportFilterSchema - Szűrési opciók
   - dateFrom, dateTo kötelező
   - supplier opcionális
   - groupBy: 'supplier' | 'month' | 'status'

## Tests
- settleClaim sikeres elszámolás teszt
- Nem APPROVED claim elutasítás teszt
- Munkalap költség nullázás mock ellenőrzés
- Audit log rögzítés ellenőrzés

## DoD Checklist
- ✅ Acceptance criteria teljesítve
- ✅ Settlement workflow implementálva
- ✅ Munkalap integráció (clearCosts)
- ✅ Unit tesztek sikeresek
- ✅ Audit log minden elszámolásnál
