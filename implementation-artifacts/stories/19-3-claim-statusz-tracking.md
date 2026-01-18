# Story 19.3: Claim Státusz Tracking

## Status: DONE

## Story

**As a** admin,
**I want** claim státuszokat követni,
**So that** láthassam a visszaigényléseket.

## Acceptance Criteria

- ✅ Státusz átmenetek: PENDING → SUBMITTED → APPROVED/REJECTED
- ✅ Beszállító válasz dokumentálása
- ✅ Supplier reference szám tárolás
- ✅ Összesített riport beszállító szerint
- ✅ Audit log minden státusz változásnál

## Implementation

### Package
`@kgc/service-warranty` - packages/szerviz/service-warranty/

### Key Files
- `src/services/warranty-claim.service.ts` - Státusz kezelés
- `src/services/warranty-claim.service.spec.ts` - Unit tesztek

### Features Implemented

1. **Status State Machine**
   ```
   PENDING → SUBMITTED → APPROVED → SETTLED
                      ↘ REJECTED
   PENDING → CANCELLED (bármikor)
   SUBMITTED → CANCELLED (bármikor)
   ```

2. **Status Update Methods**
   - `updateClaimStatus()` - Általános státusz frissítés
   - `submitClaim()` - Beküldés beszállítónak
   - `approveClaim()` - Jóváhagyás (approvedAmount kötelező)
   - `rejectClaim()` - Elutasítás (supplierResponse kötelező)
   - `cancelClaim()` - Visszavonás

3. **Query Methods**
   - `getClaimsByStatus()` - Státusz szerinti szűrés
   - `getClaimsBySupplier()` - Beszállító szerinti szűrés
   - `getPendingClaims()` - Függőben lévő igények
   - `getAwaitingResponseClaims()` - Válaszra váró igények
   - `getAwaitingSettlementClaims()` - Elszámolásra váró igények

4. **Validation**
   - Érvénytelen státusz átmenet → BadRequestException
   - APPROVED státusznál approvedAmount kötelező
   - UpdateClaimStatusSchema Zod validáció

5. **Summary Report**
   - `getClaimSummary()` - Összesítő riport
   - Státusz szerinti bontás
   - Beszállító szerinti bontás
   - Összes igényelt és jóváhagyott összeg

## Tests
- Státusz átmenet tesztek
- Érvénytelen átmenet elutasítás tesztek
- Query metódus tesztek

## DoD Checklist
- ✅ Acceptance criteria teljesítve
- ✅ State machine implementálva
- ✅ Unit tesztek sikeresek
- ✅ Audit log minden változásnál
