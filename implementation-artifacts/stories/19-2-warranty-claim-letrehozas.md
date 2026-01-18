# Story 19.2: Warranty Claim Létrehozás

## Status: DONE

## Story

**As a** technikus,
**I want** garanciális igényt rögzíteni,
**So that** beszállítótól visszaigényelhessük.

## Acceptance Criteria

- ✅ Garanciális munkalap alapján claim létrehozás
- ✅ Beszállító (Makita/Stihl/stb.) azonosítás
- ✅ Norma tétel kód támogatás
- ✅ Státusz: PENDING kezdő állapot
- ✅ Audit log minden létrehozásnál

## Implementation

### Package
`@kgc/service-warranty` - packages/szerviz/service-warranty/

### Key Files
- `src/interfaces/warranty-claim.interface.ts` - Claim interfészek
- `src/dto/warranty-claim.dto.ts` - Zod validációs sémák
- `src/services/warranty-claim.service.ts` - Claim szolgáltatás
- `src/services/warranty-claim.service.spec.ts` - Unit tesztek

### Features Implemented

1. **Claim Service - createClaim()**
   - Input validáció Zod-dal
   - Garancia lejárat ellenőrzés
   - Vásárlás dátum validáció
   - Claim number generálás (WC-YYYY-NNNN)
   - Munkalap jelölése garanciálisként
   - Audit log rögzítés

2. **IWarrantyClaim Entity**
   - id, tenantId, claimNumber
   - worksheetId kapcsolat
   - supplier (WarrantySupplier enum)
   - warrantyType (MANUFACTURER, EXTENDED, STORE)
   - deviceSerialNumber, deviceName
   - purchaseDate, warrantyExpiresAt
   - normaCode, normaHours (opcionális)
   - faultDescription, workPerformed
   - claimedAmount, approvedAmount
   - status (WarrantyClaimStatus enum)

3. **DTO Validáció (Zod)**
   - CreateWarrantyClaimSchema
   - WarrantyCheckInputSchema
   - Automatikus dátum konverzió
   - Magyar hibaüzenetek

## Tests
- Unit tesztek a createClaim funkcióra
- Validációs hibák tesztelése
- Mock repository és audit service

## DoD Checklist
- ✅ Acceptance criteria teljesítve
- ✅ Unit tesztek írva és sikeresek
- ✅ DTO validáció Zod-dal
- ✅ Build sikeres
