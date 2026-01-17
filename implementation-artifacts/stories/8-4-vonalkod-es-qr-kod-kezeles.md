# Story 8-4: Vonalkód és QR Kód Kezelés

**Status:** done
**Epic:** Epic 8 - Product Catalog (@kgc/cikk)
**Package:** `packages/shared/cikk/` → `@kgc/cikk`

---

## Story

**As a** raktáros vagy pénztáros,
**I want** vonalkódot és QR kódot olvasni,
**So that** gyorsan azonosíthassam a termékeket és helyeket.

---

## Acceptance Criteria

### AC1: Code128 vonalkód támogatás

**Given** egy cikk kód (PRD-YYYYMMDD-XXXX)
**When** Code128 vonalkód validációt kérek
**Then** a szolgáltatás validálja az ASCII karaktereket (0-127)
**And** max 128 karakter hosszúságig

### AC2: K-P-D helykód támogatás

**Given** egy raktári helykód (K2-P5-D3)
**When** validálom a formátumot
**Then** a K{num}-P{num}-D{num} minta kerül ellenőrzésre
**And** case-insensitive a validáció

### AC3: Vonalkód típus detekció

**Given** egy beolvasott sztring
**When** detectBarcodeType() metódust hívom
**Then** automatikusan felismeri:
- EAN-13: 13 számjegy, helyes ellenőrző szám
- CODE128: ASCII karakterek
- QR: JSON formátum

### AC4: Scan lookup

**Given** egy beolvasott vonalkód vagy QR adat
**When** scanLookup() metódust hívom
**Then** megkapom:
- found: boolean
- barcodeType: detektált típus
- item: cikk adatok (ha talált)
- qrData: QR tartalom (ha QR)

### AC5: QR kód generálás cikkekhez

**Given** egy cikk entitás
**When** generateItemQRData() metódust hívom
**Then** JSON struktúra jön létre

### AC6: QR kód generálás helykódokhoz

**Given** egy raktári hely
**When** generateLocationQRData() metódust hívom
**Then** JSON struktúra jön létre a K-P-D helykóddal

### AC7: QR kód kép generálás

**Given** QR adat
**When** generateQRImage() vagy generateQRDataURL() metódust hívom
**Then** PNG Buffer vagy base64 data URL jön létre
**And** testreszabható: width, margin, error correction level (L/M/Q/H)

---

## Tasks / Subtasks

- [x] **Task 1: Barcode Interface bővítés** (AC: #1, #2, #3)
  - [x] 1.1: BarcodeType enum (EAN13, CODE128, QR)
  - [x] 1.2: QRDataType enum (item, location, work_order, rental)
  - [x] 1.3: BARCODE_PATTERNS konstansok
  - [x] 1.4: QRCodeGenerationOptions interface
  - [x] 1.5: ItemQRData, LocationQRData interface-ek
  - [x] 1.6: ScanLookupResult interface

- [x] **Task 2: BarcodeService bővítés** (AC: #1, #2, #3, #4)
  - [x] 2.1: validateCode128() - ASCII validáció
  - [x] 2.2: validateKPDCode() - K-P-D minta
  - [x] 2.3: validateItemCode() - PRD/PRT/SVC minta
  - [x] 2.4: detectBarcodeType() - automatikus felismerés
  - [x] 2.5: scanLookup() - cikk keresés vonalkód/QR alapján

- [x] **Task 3: QRCodeService** (AC: #5, #6, #7)
  - [x] 3.1: generateItemQRData() - cikk QR adat
  - [x] 3.2: generateLocationQRData() - hely QR adat
  - [x] 3.3: encodeQRData() / parseQRData()
  - [x] 3.4: identifyQRDataType()
  - [x] 3.5: generateQRImage() - PNG Buffer
  - [x] 3.6: generateQRDataURL() - base64 data URL
  - [x] 3.7: validateQRData() - struktúra validáció

- [x] **Task 4: Unit Tests (TDD)**
  - [x] 4.1: BarcodeService tesztek (39 teszt)
  - [x] 4.2: QRCodeService tesztek (25 teszt)

---

## Test Results

```
BarcodeService: 39 tests passed
QRCodeService: 25 tests passed
Total: 64 tests
```

---

## Files Created/Modified

| File | Description |
|------|-------------|
| `src/interfaces/barcode.interface.ts` | Interface-ek bővítése |
| `src/services/barcode.service.ts` | Code128, K-P-D, scan lookup |
| `src/services/barcode.service.spec.ts` | 39 unit teszt |
| `src/services/qr-code.service.ts` | QR generálás és validálás |
| `src/services/qr-code.service.spec.ts` | 25 unit teszt |
| `src/index.ts` | Export frissítés |

---

## DoD Checklist

- [x] Összes AC implementálva
- [x] Unit tesztek (64 teszt) átmentek
- [x] TypeScript strict mode megfelelés
- [x] Index.ts exportok hozzáadva
- [x] Kód dokumentálva (JSDoc)
- [x] ADR-022 követelményei teljesítve
