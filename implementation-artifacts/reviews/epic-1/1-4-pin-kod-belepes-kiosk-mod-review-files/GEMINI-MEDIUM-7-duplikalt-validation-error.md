# Hiba: A `PinValidationError` duplikálva van

**Fájl:** `packages/core/auth/src/dto/pin-login.dto.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `PinValidationError` interfész a `pin-login.dto.ts`-ben megegyezik a `ValidationError` interfésszel a `login.dto.ts`-ben. Ez kódduplikáció.

## Bizonyíték

```typescript
// pin-login.dto.ts
export interface PinValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}

// login.dto.ts
export interface ValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}
```

## Megoldás

Hozzon létre egy `packages/core/auth/src/dto/error.dto.ts` fájlt, és helyezze át a `ValidationError` interfészt oda. Ezután mindkét DTO fájl ebből az új fájlból importálja a típust.
