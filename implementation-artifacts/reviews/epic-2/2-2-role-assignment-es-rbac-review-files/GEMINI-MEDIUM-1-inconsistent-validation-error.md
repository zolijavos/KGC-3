# Hiba: Inkonzisztens validációs hiba struktúra az `assign-role.dto.ts`-ben

**Fájl:** `packages/core/users/src/dto/assign-role.dto.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `validateAssignRoleInput` validációs függvény által visszaadott hibaobjektum struktúrája eltér a csomag többi DTO validációs függvényétől.

- A `validateCreateUserInput` és `validateUpdateUserInput` egy `fields: Record<string, string>` mezőt ad vissza, ami a hibás mező nevét és a hozzá tartozó hibaüzenetet tartalmazza.
- Ezzel szemben a `validateAssignRoleInput` egy `details: z.ZodIssue[]` mezőt ad vissza, ami a nyers Zod hibaobjektum-tömböt tartalmazza.

Ez az inkonzisztencia megnehezíti egy egységes, kliensoldali vagy kontroller-szintű hibakezelési logika implementálását, mivel két különböző hibaformátumot kellene feldolgoznia. Az API-nak egységes és kiszámítható validációs hibaformátumot kellene biztosítania.

## Bizonyíték

**Inkonzisztens hiba (`assign-role.dto.ts`):**
```typescript
export type AssignRoleValidationResult =
  // ...
  | { success: false; error: { code: string; message: string; details?: z.ZodIssue[] } }; // <-- `details` mező

export function validateAssignRoleInput(input: unknown): AssignRoleValidationResult {
  // ...
  return {
    success: false,
    error: {
      code: UserErrorCode.VALIDATION_ERROR,
      message: 'Érvénytelen bemenet',
      details: result.error.issues, // <-- Nyers Zod issue-k
    },
  };
}
```

**Konzisztens, javasolt hiba (`create-user.dto.ts`-ből):**
```typescript
export interface CreateUserValidationError {
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>; // <-- `fields` mező
}

export function validateCreateUserInput(
  data: unknown
): { success: true; data: CreateUserDto } | { success: false; error: CreateUserValidationError } {
  // ...
  // A Zod issue-kat átalakítja `fields` objektummá
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    fields[path] = issue.message;
  }

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Érvénytelen bemenet',
      fields, // <-- Konzisztens `fields` objektum
    },
  };
}
```

## Megoldás

Módosítsa a `validateAssignRoleInput` függvényt, hogy az is a `fields: Record<string, string>` formátumú hibaobjektumot adja vissza, konzisztensen a modul többi validációs függvényével.

**Javasolt javítás:**

```typescript
// packages/core/users/src/dto/assign-role.dto.ts

// ...

// A validációs eredménytípusnak is a `fields` mezőt kellene használnia
export type AssignRoleValidationResult =
  | { success: true; data: AssignRoleInput }
  | { success: false; error: { code: string; message: string; fields?: Record<string, string> } };


export function validateAssignRoleInput(input: unknown): AssignRoleValidationResult {
  const result = AssignRoleSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Ugyanaz a transzformációs logika, mint a többi DTO-ban
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    fields[path] = issue.message;
  }

  return {
    success: false,
    error: {
      code: UserErrorCode.VALIDATION_ERROR,
      message: 'Érvénytelen bemenet',
      fields, // <-- Konzisztens `fields` objektum használata
    },
  };
}
```
