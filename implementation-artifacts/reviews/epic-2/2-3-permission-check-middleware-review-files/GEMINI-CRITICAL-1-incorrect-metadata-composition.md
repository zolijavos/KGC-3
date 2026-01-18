# Hiba: A `@RequirePermission` dekorátor helytelenül kezeli a metaadatokat

**Fájl:** `packages/core/users/src/decorators/require-permission.decorator.ts`
**Súlyosság:** KRITIKUS

## Probléma

A `@RequirePermission` dekorátor implementációja hibásan próbál meg két különböző metaadatot (`PERMISSIONS_KEY` és `PERMISSION_LOGIC_KEY`) beállítani a cél metóduson. A `SetMetadata` függvény egy új dekorátort ad vissza, és a jelenlegi kód ezt a visszaadott dekorátor-függvényt próbálja manuálisan, egymás után meghívni.

A `Reflect.defineMetadata` (amit a `SetMetadata` belsőleg használ) működése miatt a második `SetMetadata` hívás felülírja az első által beállított metaadatokat a célpontra vonatkozóan, mivel mindkettő ugyanazt a belső metaadat-tárolót módosítja. Ennek eredményeképpen csak az utolsó metaadat (`PERMISSION_LOGIC_KEY`) fog ténylegesen beállításra kerülni, a `PERMISSIONS_KEY` (a szükséges jogosultságok listája) pedig elveszik.

Ez a hiba azt jelenti, hogy a `PermissionGuard` soha nem fogja megkapni a szükséges jogosultságok listáját, és a jogosultság-ellenőrzés minden esetben sikeres lesz (mivel a `requiredPermissions` a guard-ban `undefined` lesz).

## Bizonyíték

```typescript
// packages/core/users/src/decorators/require-permission.decorator.ts

export function RequirePermission(
  permissionOrPermissions: Permission | Permission[],
  logic: PermissionLogic = 'ALL'
): MethodDecorator {
  const permissions = Array.isArray(permissionOrPermissions)
    ? permissionOrPermissions
    : [permissionOrPermissions];

  // HIBÁS IMPLEMENTÁCIÓ:
  // A második hívás felülírja az elsőt.
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor => {
    // 1. Ez beállítja a `permissions` metaadatot...
    SetMetadata(PERMISSIONS_KEY, permissions)(target, key, descriptor);
    // 2. ...de ez a hívás azonnal felülírja az előzőleg beállított metaadatokat
    //    a `permission_logic` metaadattal a közös tárolóban.
    SetMetadata(PERMISSION_LOGIC_KEY, logic)(target, key, descriptor);
    return descriptor;
  };
}
```

## Megoldás

Használja a `@nestjs/common` csomagból importálható `applyDecorators` segédfüggvényt több dekorátor biztonságos és helyes kompozíciójához. Ez a függvény kifejezetten arra lett tervezve, hogy több dekorátort egyetlen, alkalmazható dekorátorrá fűzzön össze.

**Javasolt javítás:**

```typescript
// packages/core/users/src/decorators/require-permission.decorator.ts

import { applyDecorators, SetMetadata } from '@nestjs/common'; // Importálja az `applyDecorators`-t
import { Permission } from '../interfaces/permission.interface';

// ... (a konstansok és típusok maradnak)

export function RequirePermission(
  permissionOrPermissions: Permission | Permission[],
  logic: PermissionLogic = 'ALL'
): MethodDecorator {
  const permissions = Array.isArray(permissionOrPermissions)
    ? permissionOrPermissions
    : [permissionOrPermissions];

  // HELYES IMPLEMENTÁCIÓ: `applyDecorators` használata
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    SetMetadata(PERMISSION_LOGIC_KEY, logic)
  );
}
```

Ez a javítás biztosítja, hogy mindkét metaadat helyesen és felülírás nélkül kerüljön beállításra az endpoint handler-en, lehetővé téve a `PermissionGuard` számára a megfelelő működést.
