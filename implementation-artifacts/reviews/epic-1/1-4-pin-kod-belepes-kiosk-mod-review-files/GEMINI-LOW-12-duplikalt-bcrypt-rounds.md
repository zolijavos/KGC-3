# Hiba: A `BCRYPT_ROUNDS` duplikálva van

**Fájl:** `packages/core/auth/src/services/pin.service.ts`
**Súlyosság:** ALACSONY

## Probléma

A `DEFAULT_BCRYPT_ROUNDS` és `MIN_BCRYPT_ROUNDS` konstansok a `password.service.ts`-ben is definiálva vannak. Ezeket egy megosztott fájlban kellene definiálni a duplikáció elkerülése érdekében.

## Bizonyíték

```typescript
// pin.service.ts
const MIN_BCRYPT_ROUNDS = 10;
const DEFAULT_BCRYPT_ROUNDS = 12;

// password.service.ts
const MIN_BCRYPT_ROUNDS = 10;
const DEFAULT_BCRYPT_ROUNDS = 12;
```

## Megoldás

Hozzon létre egy `packages/core/auth/src/constants.ts` fájlt, és helyezze át a konstansokat oda. Ezután mindkét service fájl ebből az új fájlból importálja a konstansokat.
