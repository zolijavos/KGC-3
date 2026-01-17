# Story 5-4: Offline Data Caching (IndexedDB)

## Story Info
- **Epic**: Epic 5 - UI Component Library (@kgc/ui)
- **Package**: @kgc/ui
- **Status**: in-progress
- **Priority**: P0 - MVP

## User Story
**AS A** felhasználó offline módban
**I WANT TO** az alkalmazás adatait helyileg cache-elni IndexedDB-ben
**SO THAT** az alkalmazás működjön internetkapcsolat nélkül is

## Acceptance Criteria

### AC1: IndexedDB Store Alapok
- [ ] Generic IndexedDB wrapper típusbiztos műveletekkel
- [ ] Store konfiguráció (név, verzió, index-ek)
- [ ] CRUD műveletek (create, read, update, delete)
- [ ] Bulk műveletek támogatása

### AC2: React Hook Integration
- [ ] `useIndexedDB` hook store műveletekhez
- [ ] `useOfflineCache` hook automatikus cache kezeléshez
- [ ] Optimista UI támogatás pending állapottal

### AC3: Cache Stratégiák
- [ ] TTL (Time-To-Live) támogatás rekordokhoz
- [ ] Verziókezelés és migráció támogatás
- [ ] Cache invalidáció mechanizmus

### AC4: Error Handling
- [ ] IndexedDB nem elérhető (private browsing)
- [ ] Kvóta túllépés kezelése
- [ ] Graceful degradation

## Technical Notes

### Implementálandó elemek:
1. **IndexedDB Store** (`src/lib/indexeddb/`)
   - `store.ts` - Generic IndexedDB wrapper
   - `types.ts` - TypeScript típusok

2. **React Hooks** (`src/hooks/`)
   - `use-indexed-db.ts` - Alap IndexedDB műveletek
   - `use-offline-cache.ts` - Cache kezelés wrapper

3. **Tesztek** (`tests/`)
   - Unit tesztek a store-hoz
   - Hook tesztek React Testing Library-vel
   - IndexedDB mock (fake-indexeddb)

### Függőségek:
- fake-indexeddb (teszt mock)

## Definition of Done
- [ ] Minden AC teljesül
- [ ] 90%+ teszt coverage
- [ ] Vitest tesztek sikeresek
- [ ] TypeScript strict mode kompatibilis
- [ ] Code review completed

## Tasks
- [x] Story fájl létrehozása
- [ ] IndexedDB store implementálása
- [ ] React hooks implementálása
- [ ] Tesztek írása
- [ ] Coverage ellenőrzés
