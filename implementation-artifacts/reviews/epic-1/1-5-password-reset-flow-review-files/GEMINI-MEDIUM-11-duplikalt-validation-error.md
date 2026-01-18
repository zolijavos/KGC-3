# Hiba: Duplikált validációs hiba interfészek

**Fájl:** `packages/core/auth/src/dto/forgot-password.dto.ts`, `packages/core/auth/src/dto/reset-password.dto.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `ForgotPasswordValidationError` a `forgot-password.dto.ts`-ben és a `ResetPasswordValidationError` a `reset-password.dto.ts`-ben nagyon hasonló a `ValidationError`-hez a `login.dto.ts`-ben. Ezeket egyetlen, megosztott hibatípusba kellene konszolidálni.

## Bizonyíték

```typescript
// forgot-password.dto.ts
export interface ForgotPasswordValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}

// reset-password.dto.ts
export interface ResetPasswordValidationError {
  code: 'VALIDATION_ERROR' | 'PASSWORD_POLICY_ERROR';
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

Hozzon létre egy `packages/core/auth/src/dto/error.dto.ts` fájlt, és helyezze át a `ValidationError` interfészt oda. Az új interfésznek támogatnia kell a különböző hibakódokat. Ezután az összes DTO fájl ebből az új fájlból importálja a típust.

```typescript
// error.dto.ts
export type ErrorCode = 'VALIDATION_ERROR' | 'PASSWORD_POLICY_ERROR' | 'INVALID_CREDENTIALS' | 'INVALID_REFRESH_TOKEN';

export interface ApiError {
  code: ErrorCode;
  message: string;
  fields?: Record<string, string>;
}
```
