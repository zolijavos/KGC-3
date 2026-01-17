# Story 16-2: MyPOS Pre-Authorization

## Státusz: done ✅

**Befejezve:** 2026-01-17
**Coverage:** Lines 92.07% | Branches 81.39% | Functions 100%
**Tesztek:** 19 PASS (MyPosService)

## Epic
Epic 16: Deposit Management (@kgc/rental-checkout)

## User Story

**Mint** bolti eladó,
**szeretném** a kaució összeget a vásárló bankkártyáján zárolni MyPOS pre-authorization segítségével,
**hogy** a tényleges levonás csak a bérlés lezárásakor történjen meg (sérülés/késedelem esetén).

## Acceptance Criteria

### AC1: MyPOS Pre-Authorization indítás
- [x] Pre-auth kérés küldése a MyPOS API-nak
- [x] Zárolási összeg megadása (kaució összeg)
- [x] Sikeres zárolás esetén tranzakció ID mentése
- [x] Státusz tracking (PENDING → AUTHORIZED)

### AC2: Pre-Auth sikertelen kezelés
- [x] Hibaüzenet megjelenítése ha nincs elég fedezet (INSUFFICIENT_FUNDS)
- [x] Hibaüzenet megjelenítése ha kártya elutasítva (CARD_DECLINED)
- [x] Error codes: INSUFFICIENT_FUNDS, CARD_DECLINED, INVALID_CARD, EXPIRED_CARD
- [x] Retry logic (max 3x) exponential backoff-fal

### AC3: Pre-Auth feloldás (release)
- [x] release() API hívás
- [x] Teljes összeg visszaadása a kártyára
- [x] Státusz: AUTHORIZED → RELEASED

### AC4: Pre-Auth capture (levonás)
- [x] capture() API hívás
- [x] Részleges vagy teljes levonás támogatás
- [x] Státusz: AUTHORIZED → CAPTURED

### AC5: MyPOS API integráció
- [x] API credentials konfiguráció (IMyPosConfig)
- [x] Timeout kezelés (30 sec) Promise.race-szel
- [x] Retry logic exponential backoff-fal (1s, 2s, 4s)
- [x] Sandbox/Production környezet váltás (isSandbox flag)

## Technical Notes

### Package
`@kgc/rental-checkout`

### Dependencies
- `@nestjs/common` - Injectable decorator
- HTTP client interface (IHttpClient) - DI injected

### Implementált komponensek
1. `IMyPosService` interface - API contract
2. `MyPosService` - MyPOS API client implementáció
3. `IMyPosConfig` - Konfiguráció interface
4. `IHttpClient` - HTTP adapter interface (DI)
5. Enums: `MyPosTransactionStatus`, `MyPosErrorCode`
6. Request/Response interfaces (IMyPosPreAuthRequest, etc.)

### Fájlok
- `src/interfaces/mypos.interface.ts` - Típusok és interface-ek
- `src/services/mypos.service.ts` - Service implementáció
- `src/services/mypos.service.spec.ts` - 19 unit teszt

## Tasks

1. [x] Story file létrehozás
2. [x] MyPOS interface és típusok
3. [x] **TDD RED**: Failing tesztek (19 teszt)
4. [x] **TDD GREEN**: MyPosService implementálás
5. [x] Exponential backoff retry logic
6. [x] Timeout kezelés (30 sec)
7. [x] Unit tesztek PASS
8. [x] Coverage ellenőrzés (>85% lines)
9. [x] Code export frissítés

## Megjegyzések

- Contract Testing (Pact) a valós MyPOS API-val FUTURE WORK
- HTTP client DI-vel inject-elve (testability)
- Fake timers használata a retry tesztekhez

## Definition of Done

- [x] Minden AC teljesül
- [x] Unit tesztek: 92%+ coverage
- [x] Code review: Auto-pilot self-review PASS
- [x] Sprint status: done

---

**Létrehozva:** 2026-01-17
**Package:** @kgc/rental-checkout
