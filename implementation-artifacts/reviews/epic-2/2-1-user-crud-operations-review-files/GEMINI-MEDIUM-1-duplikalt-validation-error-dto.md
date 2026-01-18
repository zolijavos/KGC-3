# Hiba: Duplikált validációs hiba interfészek a DTO-kban

**Fájl:** `packages/core/users/src/dto/`
**Súlyosság:** KÖZEPES

## Probléma

A `CreateUserValidationError`, `UpdateUserValidationError` és `UserQueryValidationError` interfészek mind ugyanazt a struktúrát definiálják a `create-user.dto.ts`, `update-user.dto.ts` és `user-query.dto.ts` fájlokban. Ez kódduplikáció, és megnehezíti a közös hibakezelést.

Az Epic 1 kódellenőrzése során ez egy visszatérő probléma volt, ami arra utal, hogy szükség van egy közös, megosztott hibakezelési struktúrára a csomagon belül.

## Bizonyíték

```typescript
// packages/core/users/src/dto/create-user.dto.ts
export interface CreateUserValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}

// packages/core/users/src/dto/update-user.dto.ts
export interface UpdateUserValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}

// packages/core/users/src/dto/user-query.dto.ts
export interface UserQueryValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}
```

## Megoldás

Hozzon létre egy új, közös `packages/core/users/src/dto/error.dto.ts` fájlt, és definiáljon benne egyetlen, az egész csomagban használható `ValidationError` interfészt. Ezt követően az összes DTO fájl ebből az új fájlból importálja és használja a közös típust.

```typescript
// packages/core/users/src/dto/error.dto.ts
export interface ValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}
```

Majd a DTO fájlokban:
```typescript
// packages/core/users/src/dto/create-user.dto.ts
import type { ValidationError } from './error.dto';

export function validateCreateUserInput(
  data: unknown
): { success: true; data: CreateUserDto } | { success: false; error: ValidationError } {
  // ...
}
```
