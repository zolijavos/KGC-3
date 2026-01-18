# Story 19.1: Garanciális vs Fizetős Megkülönböztetés

## Status: DONE

## Story

**As a** technikus,
**I want** garanciális javítást jelölni,
**So that** elszámolás helyes legyen.

## Acceptance Criteria

- ✅ Garanciális flag beállítás munkalap alapján
- ✅ Garancia ellenőrzés (vásárlás dátum, lejárat)
- ✅ Beszállító azonosítás (Makita, Stihl, stb.)
- ✅ Fizetős fallback ha nem garanciális
- ✅ Garancia elutasítás okok kezelése

## Implementation

### Package
`@kgc/service-warranty` - packages/szerviz/service-warranty/

### Key Files
- `src/interfaces/warranty-check.interface.ts` - Garancia ellenőrzés interfészek
- `src/interfaces/warranty-claim.interface.ts` - Warrant claim interfészek
- `src/services/warranty-check.service.ts` - Garancia ellenőrzés szolgáltatás
- `src/services/warranty-check.service.spec.ts` - Unit tesztek

### Features Implemented

1. **Warranty Check Service**
   - `checkWarranty()` - Teljes garancia ellenőrzés
   - `checkWarrantySimple()` - Egyszerűsített ellenőrzés munkalaphoz
   - `getDeviceWarrantyInfo()` - Készülék garancia információ
   - `getSupplierWarrantyRules()` - Beszállító szabályok
   - `calculateWarrantyExpiration()` - Lejárat számítás

2. **Supplier Warranty Rules**
   - Makita: 24 hó, regisztráció kötelező, max 3 javítás, norma rendszer
   - Stihl: 24 hó, nincs regisztráció
   - Husqvarna: 24 hó + 48 hó kiterjesztett
   - Bosch: 24 hó + 36 hó kiterjesztett
   - DeWalt: 12 hó + 36 hó kiterjesztett, max 2 javítás
   - Milwaukee: 60 hó (5 év!)
   - HiKoki: 24 hó + 36 hó kiterjesztett

3. **Rejection Reasons**
   - EXPIRED - Lejárt garancia
   - USER_DAMAGE - Felhasználói hiba
   - NOT_REGISTERED - Nem regisztrált
   - NO_PURCHASE_PROOF - Nincs bizonylat
   - UNAUTHORIZED_REPAIR - Nem hivatalos javítás
   - UNKNOWN_DEVICE - Ismeretlen készülék

4. **Warnings**
   - EXPIRING_SOON - 30 napon belül lejár
   - MULTIPLE_REPAIRS - Több korábbi javítás
   - EXTENDED_WARRANTY - Kiterjesztett garancia alatt

## Tests
- 17 unit tesztek
- 97.96% coverage a warranty-check.service.ts-en

## DoD Checklist
- ✅ Acceptance criteria teljesítve
- ✅ Unit tesztek írva és sikeresek
- ✅ Coverage > 85%
- ✅ Build sikeres
- ✅ TypeScript strict mode hibák javítva
