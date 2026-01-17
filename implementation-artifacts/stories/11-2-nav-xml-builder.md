# Story 11-2: NAV XML Builder

**Epic:** Epic 11 - NAV Integration (@kgc/nav-online)
**Státusz:** ✅ DONE
**Implementálva:** 2026-01-16

## User Story

**As a** pénztáros
**I want** NAV-kompatibilis XML-t generálni
**So that** a számlák megfeleljenek a jogszabályoknak.

## Acceptance Criteria

- [x] NAV XML generálás implementálva
- [x] NAV Online v3.0 schema-nak megfelelő
- [x] Minden kötelező mező kitöltve
- [x] XML escape karakterek kezelése

## Technical Implementation

### Megvalósított funkciók

1. **XML Builder** (`buildXmlRequest`)
   - Teljes számla XML struktúra
   - NAV Online v3.0 kompatibilis
   - Speciális karakterek escape-elése

2. **XML Parser** (`parseXmlResponse`)
   - Válasz feldolgozás
   - Hibakód kinyerés
   - Számlaszám és NAV referencia

### Kapcsolódó fájlok

- `packages/integration/nav-online/src/services/szamlazz-hu.service.ts`
  - `buildXmlRequest()` metódus
  - `buildStornoRequest()` metódus
  - `buildStatusRequest()` metódus
  - `buildPdfRequest()` metódus

### XML struktúra

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla">
  <bepiallitasok>...</bepiallitasok>
  <fejlec>...</fejlec>
  <elado>...</elado>
  <vevo>...</vevo>
  <tetelek>...</tetelek>
</xmlszamla>
```

## Tesztek

- XML escape teszt implementálva
- Speciális karakterek (<, >, &, ', ") kezelése ellenőrizve
