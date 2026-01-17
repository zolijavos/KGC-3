# Story 11-1: Számlázz.hu API Integráció

**Epic:** Epic 11 - NAV Integration (@kgc/nav-online)
**Státusz:** ✅ DONE
**Implementálva:** 2026-01-16

## User Story

**As a** rendszer
**I want** Számlázz.hu API-t használni
**So that** NAV-nak megfelelő számlák jöjjenek létre.

## Acceptance Criteria

- [x] Számlázz.hu API credentials konfigurálható
- [x] Számla request küldése API-nak
- [x] API hívás Számlázz.hu felé működik
- [x] NAV Online automatikus beküldés támogatott
- [x] Számlaszám visszaérkezik válaszban

## Technical Implementation

### Létrehozott fájlok

- `packages/integration/nav-online/src/services/szamlazz-hu.service.ts` - Fő API szolgáltatás
- `packages/integration/nav-online/src/interfaces/szamlazz-hu.interface.ts` - API interfészek
- `packages/integration/nav-online/src/dto/create-invoice.dto.ts` - Számla DTO
- `packages/integration/nav-online/tests/szamlazz-hu.service.spec.ts` - Tesztek

### Megvalósított funkciók

1. **Számla létrehozás** (`createInvoice`)
   - Invoice → SzamlazzhuRequest mapping
   - XML kérés építése
   - API hívás és válasz feldolgozás

2. **Számla sztornózás** (`cancelInvoice`)
   - Hivatkozott számla kezelése
   - Sztornó XML építése

3. **Státusz lekérdezés** (`getInvoiceStatus`)
   - NAV státusz polling

4. **PDF letöltés** (`downloadPdf`)
   - Base64 PDF feldolgozás

### ADR hivatkozások

- ADR-030: NAV Online Számlázás API v3.0 Integráció

## Tesztek

- 10 teszt eset
- 100% lefedettség a fő API műveletekre
