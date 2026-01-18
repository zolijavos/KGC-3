# Hiba: A `PinLoginErrorCode` enum nincs használva

**Fájl:** `packages/core/auth/src/dto/pin-login-response.dto.ts`
**Súlyosság:** ALACSONY

## Probléma

A `PinLoginErrorCode` enum a `pin-login-response.dto.ts`-ben definiálva van, de soha nincs használva a kódbázisban.

## Bizonyíték

```typescript
// pin-login-response.dto.ts
export enum PinLoginErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR', // 400 - invalid input
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS', // 401 - wrong PIN or no PIN
  DEVICE_NOT_TRUSTED = 'DEVICE_NOT_TRUSTED', // 403 - device not registered
  PIN_LOCKOUT = 'PIN_LOCKOUT', // 429 - too many attempts
}
```

## Megoldás

Távolítsa el a felesleges `PinLoginErrorCode` enumot, vagy használja fel a hibakezelés során a hibakódok konzisztens kezelésére.
