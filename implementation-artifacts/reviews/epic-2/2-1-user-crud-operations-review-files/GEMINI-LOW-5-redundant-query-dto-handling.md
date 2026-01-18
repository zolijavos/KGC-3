# Hiba: Redundáns és bonyolult DTO kezelés a query paramétereknél

**Fájl:** `packages/core/users/src/users.controller.ts`
**Súlyosság:** ALACSONY

## Probléma

A `listUsers` metódus a query paraméterek validálása után manuálisan újraépíti a DTO objektumot, ahelyett, hogy a validáció során létrejött, alapértelmezett értékekkel már feltöltött DTO-t használná.

A `userQuerySchema` a `transform` függvénnyel helyesen beállítja az alapértelmezett `limit` és `offset` értékeket, ha azok hiányoznak a requestből. A kontroller kódja azonban ezt figyelmen kívül hagyja, és a `??` operátorral újra beállítja ugyanezeket az alapértelmezett értékeket.

Ez a kód redundáns, és potenciális hibaforrás lehet, ha a DTO-ban és a kontrollerben lévő alapértelmezett értékek eltérnek egymástól.

## Bizonyíték

```typescript
// packages/core/users/src/dto/user-query.dto.ts

// A séma beállítja az alapértelmezett értéket, ha a `limit` hiányzik.
export const userQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return DEFAULT_LIMIT;
      // ...
    }),
  // ...
});


// packages/core/users/src/users.controller.ts

@Get()
async listUsers(/*...*/) {
  const validation = validateUserQueryInput(query);
  if (!validation.success) { /* ... */ }

  try {
    // A `validation.data` már tartalmazza a helyes, alapértelmezett értékeket.
    // A `?? DEFAULT_LIMIT` itt felesleges és redundáns.
    const result = await this.usersService.findAll(
      {
        limit: validation.data.limit ?? DEFAULT_LIMIT,
        offset: validation.data.offset ?? DEFAULT_OFFSET,
        search: validation.data.search,
        role: validation.data.role,
        status: validation.data.status,
        locationId: validation.data.locationId,
      },
      req.user.tenantId
    );
    // ...
  } // ...
}
```

## Megoldás

Egyszerűsítse a `listUsers` metódust úgy, hogy a `validateUserQueryInput` által visszaadott, már feldolgozott és alapértelmezett értékekkel ellátott DTO-t adja át közvetlenül a `findAll` metódusnak.

**Javasolt javítás:**
```typescript
// packages/core/users/src/users.controller.ts
@Get()
async listUsers(
  @Query() query: Record<string, string>,
  @Req() req: AuthenticatedRequest,
  @Res() res: Response
): Promise<Response> {
  const validation = validateUserQueryInput(query);
  if (!validation.success) {
    // ...
  }

  try {
    // A validált DTO-t adjuk át közvetlenül a service-nek.
    // Nincs szükség az objektum manuális újraépítésére.
    const result = await this.usersService.findAll(
      validation.data, 
      req.user.tenantId
    );

    return res.status(HttpStatus.OK).json(result);
  } catch (error) {
    return this.handleError(error, res);
  }
}
```

Ez a javítás a kódot tisztábbá, rövidebbé teszi, és megszünteti a redundanciát, csökkentve ezzel a hibalehetőségeket. A "single source of truth" elv érvényesül, mivel az alapértelmezett értékek már csak egy helyen, a `userQuerySchema`-ban vannak definiálva.
