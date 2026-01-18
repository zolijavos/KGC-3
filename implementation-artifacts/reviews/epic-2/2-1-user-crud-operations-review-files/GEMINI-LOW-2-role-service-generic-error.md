# Hiba: A `RoleService` generikus `Error`-t dob érvénytelen szerepkör esetén

**Fájl:** `packages/core/users/src/services/role.service.ts`
**Súlyosság:** ALACSONY

## Probléma

A `getRoleLevel` és `getRoleScope` metódusok a `RoleService`-ben egy generikus `new Error('Érvénytelen szerepkör')` hibát dobnak, ha a megadott szerepkör nem létezik a `ROLE_LEVELS` vagy `ROLE_SCOPES` objektumokban.

Ez a megközelítés megnehezíti a hibakezelést a hívó oldalon (pl. a `UsersService`-ben), mivel a hiba elkapásakor csak a hibaüzenet szövegének ellenőrzésével lehet megállapítani a hiba pontos okát. Ez a gyakorlat törékeny és nehezen karbantartható.

## Bizonyíték

```typescript
// packages/core/users/src/services/role.service.ts

export class RoleService {
  getRoleLevel(role: Role): number {
    const level = ROLE_LEVELS[role];
    if (level === undefined) {
      throw new Error('Érvénytelen szerepkör'); // <-- Generikus hiba
    }
    return level;
  }
  
  getRoleScope(role: Role): RoleScope {
    const scope = ROLE_SCOPES[role];
    if (!scope) {
      throw new Error('Érvénytelen szerepkör'); // <-- Generikus hiba
    }
    return scope;
  }
}
```

## Megoldás

A generikus `Error` helyett használjon egy specifikus, egyedi hibaklasszot, vagy egy NestJS beépített kivételt. Mivel a `RoleService` egy alapvető, üzleti logikai szolgáltatás, egy egyedi hibaklassz használata a legtisztább megoldás, ami függetleníti a szolgáltatást a NestJS HTTP rétegétől.

**1. Hozzon létre egy egyedi hibaklasszot:**

```typescript
// packages/core/users/src/errors/invalid-role.error.ts
export class InvalidRoleError extends Error {
  constructor(role: string) {
    super(`Érvénytelen szerepkör: ${role}`);
    this.name = 'InvalidRoleError';
  }
}
```

**2. Használja az egyedi hibát a `RoleService`-ben:**

```typescript
// packages-core/users/src/services/role.service.ts
import { InvalidRoleError } from '../errors/invalid-role.error';
// ...
export class RoleService {
  getRoleLevel(role: Role): number {
    const level = ROLE_LEVELS[role];
    if (level === undefined) {
      throw new InvalidRoleError(role);
    }
    return level;
  }
  // ... (hasonlóan a getRoleScope-hoz)
}
```

**3. Kezelje a specifikus hibát a hívó oldalon:**

A `UsersService`-ben vagy a `UsersController`-ben így már specifikusan el lehet kapni ezt a hibát, és le lehet fordítani egy megfelelő HTTP válasszá (pl. `400 Bad Request`).

```typescript
// packages/core/users/src/users.service.ts
try {
  this.roleService.getRoleLevel(someRole);
} catch (error) {
  if (error instanceof InvalidRoleError) {
    throw new BadRequestException({
      error: {
        code: UserErrorCode.VALIDATION_ERROR,
        message: error.message,
      }
    });
  }
  throw error;
}
```
