# Hiba: A `PasswordResetErrorResponse` interfész nincs használva

**Fájl:** `packages/core/auth/src/dto/reset-password-response.dto.ts`
**Súlyosság:** ALACSONY

## Probléma

A `PasswordResetErrorResponse` interfész a `reset-password-response.dto.ts`-ben definiálva van, de soha nincs használva a kódbázisban.

## Bizonyíték

```typescript
// reset-password-response.dto.ts
export interface PasswordResetErrorResponse {
  error: {
    code: PasswordResetErrorCode;
    message: string;
    fields?: Record<string, string>;
  };
}
```

## Megoldás

Távolítsa el a felesleges `PasswordResetErrorResponse` interfészt.
