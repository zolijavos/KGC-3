# Hiba: A `PermissionGuard` nem működik a dekorátor hibája miatt

**Fájl:** `packages/core/users/src/guards/permission.guard.ts`
**Súlyosság:** KRITIKUS

## Probléma

A `PermissionGuard` logikája, bár papíron helyesnek tűnik, a valóságban soha nem fogja elvégezni a jogosultság-ellenőrzést. Ennek oka a `@RequirePermission` dekorátorban található kritikus hiba (`GEMINI-CRITICAL-1-incorrect-metadata-composition.md`).

Mivel a dekorátor helytelenül állítja be a metaadatokat, a `PERMISSIONS_KEY` kulcshoz tartozó érték soha nem kerül mentésre. Emiatt a guard-ban a `this.reflector.get<Permission[] | undefined>(PERMISSIONS_KEY, ...)` hívás mindig `undefined` értéket ad vissza.

A guard kódjának első soraiban található ellenőrzés (`if (!requiredPermissions || requiredPermissions.length === 0)`) ezért mindig `true` lesz, és a guard azonnal, a jogosultságok ellenőrzése nélkül engedélyezi a hozzáférést.

Ez a hiba teljesen funkcióképtelenné teszi a teljes jogosultság-ellenőrző rendszert, és komoly biztonsági rést jelent, mivel a védettnek hitt endpoint-ok valójában védelem nélkül maradnak.

## Bizonyíték

**A hibás dekorátor (a probléma forrása):**
A `require-permission.decorator.ts`-ben lévő hiba miatt a `PERMISSIONS_KEY` metaadat sosem lesz beállítva. (Lásd: `GEMINI-CRITICAL-1-incorrect-metadata-composition.md`)

**A guard logikája, ami emiatt meghiúsul:**
```typescript
// packages/core/users/src/guards/permission.guard.ts

async canActivate(context: ExecutionContext): Promise<boolean> {
  // 1. A `requiredPermissions` itt MINDIG `undefined` lesz a dekorátor hibája miatt.
  const requiredPermissions = this.reflector.get<Permission[] | undefined>(
    PERMISSIONS_KEY,
    context.getHandler()
  );

  // 2. Emiatt ez a feltétel MINDIG `true`-ra értékelődik ki.
  if (!requiredPermissions || requiredPermissions.length === 0) {
    // 3. A guard itt MINDIG `true`-val tér vissza, és a jogosultság-ellenőrzés soha nem fut le.
    return true;
  }

  // A kód többi része soha nem kerül végrehajtásra.
  // ...
}
```

## Megoldás

A probléma elsődlegesen a `@RequirePermission` dekorátorban van, amit a `GEMINI-CRITICAL-1-incorrect-metadata-composition.md` riportban leírtak szerint kell javítani (az `applyDecorators` használatával).

Amint a dekorátor helyesen működik és beállítja a `PERMISSIONS_KEY` metaadatot, a `PermissionGuard` logikája (feltéve, hogy a DI probléma is javítva van) képessé válik a `requiredPermissions` tömb kiolvasására és a jogosultság-ellenőrzés tényleges elvégzésére.

A két hiba (a dekorátor hibás implementációja és a guard DI problémája) együttesen egy teljesen működésképtelen, de működőnek látszó jogosultságkezelő rendszert eredményez, ami rendkívül veszélyes. A javításuk kritikus fontosságú.
