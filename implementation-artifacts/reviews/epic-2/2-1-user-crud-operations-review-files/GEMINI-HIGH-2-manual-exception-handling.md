# Hiba: Manuális és törékeny hibakezelés a kontrollerben

**Fájl:** `packages/core/users/src/users.controller.ts`
**Súlyosság:** MAGAS

## Probléma

A `UsersController` egy központi `handleError` metódust használ a szolgáltatásból (`UsersService`) érkező hibák kezelésére. Ez a metódus egy `switch` utasítással, a hibaüzenet szövege (`error.message`) alapján próbálja megállapítani a hiba típusát és a megfelelő HTTP státuszkódot.

Ez a megközelítés rendkívül törékeny:
1.  **Szoros csatolás a hibaüzenetekhez:** Ha egy hibaüzenet szövege megváltozik a `UsersService`-ben vagy a `USER_MESSAGES` konstansok között, a kontroller hibakezelése csendben elromlik, és a hibát `500 Internal Server Error`-ként fogja kezelni.
2.  **Karbantarthatósági rémálom:** Minden új üzleti logikai hiba esetén bővíteni kell a `switch` blokkot. Ez nem skálázható és hibalehetőségeket rejt magában.
3.  **NestJS Exception Filter-ek megkerülése:** Ez a manuális hibakezelés teljesen figyelmen kívül hagyja a NestJS beépített, deklaratív hibakezelési mechanizmusát (Exception Filters), ami a hibák egységes, globális kezelésére lett kitalálva.

## Bizonyíték

```typescript
// packages/core/users/src/users.controller.ts

// Minden metódusban ez a minta ismétlődik:
// ...
// } catch (error) {
//   return this.handleError(error, res);
// }
// ...

private handleError(error: unknown, res: Response): Response {
  const message = error instanceof Error ? error.message : 'Ismeretlen hiba';

  // A hibakezelés a hibaüzenet szövegétől függ, ami nagyon törékeny
  switch (message) {
    case USER_MESSAGES.NOT_FOUND:
      return res.status(HttpStatus.NOT_FOUND).json({ /*...*/ });

    case USER_MESSAGES.EMAIL_EXISTS:
      return res.status(HttpStatus.CONFLICT).json({ /*...*/ });

    case USER_MESSAGES.ROLE_VIOLATION:
      return res.status(HttpStatus.FORBIDDEN).json({ /*...*/ });
      
    // ... és így tovább ...

    default:
      console.error('[UsersController] Unexpected error:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ /*...*/ });
  }
}
```

## Megoldás

Távolítsa el a teljes `try...catch` és `handleError` logikát a kontrollerből. A hibakezelést a NestJS deklaratív kivételkezelési rendszerére kell bízni.

Ehhez a `UsersService`-nek specifikus NestJS HTTP kivételeket kell dobnia (pl. `NotFoundException`, `ConflictException`), ahogy az a `GEMINI-HIGH-1-generic-error-handling.md` riportban javasolva van.

Ha a szolgáltatás a megfelelő kivételeket dobja, a kontroller kódja drasztikusan leegyszerűsödik, és a NestJS keretrendszer automatikusan gondoskodik a helyes HTTP státuszkódokról és válaszformátumról.

**Javasolt javítás (feltételezve, hogy a Service már a megfelelő kivételeket dobja):**

```typescript
// packages/core/users/src/users.controller.ts

// Nincs többé `handleError` metódus.

@Get(':id')
// A metódus szignatúrája a válasz DTO-t adja vissza
async getUserById(
  @Param('id') id: string,
  @Req() req: AuthenticatedRequest
): Promise<{ data: UserResponse }> {
  // Nincs többé try...catch blokk!

  const user = await this.usersService.findById(id, req.user.tenantId);

  // A service `NotFoundException`-t dob, ha a user null, 
  // így erre a `if` blokkra sincs szükség a kontrollerben.
  // A service felelőssége a "nem található" eset kezelése.
  // if (!user) {
  //   throw new NotFoundException(...)
  // }

  return { data: user };
}
```

A NestJS Exception Filter-ek használata egy sokkal robusztusabb, karbantarthatóbb és a keretrendszer filozófiájához jobban illeszkedő megoldást nyújt. Lehetőség van globális vagy kontroller-szintű egyedi Exception Filter-ek létrehozására is, ha a `default` viselkedéstől el kell térni.
