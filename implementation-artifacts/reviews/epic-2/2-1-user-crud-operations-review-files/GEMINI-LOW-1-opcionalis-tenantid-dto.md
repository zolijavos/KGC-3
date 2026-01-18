# Hiba: A `tenantId` opcionálisan megadható a kliens által

**Fájl:** `packages/core/users/src/dto/create-user.dto.ts`
**Súlyosság:** ALACSONY

## Probléma

A `createUserSchema` validációs séma lehetővé teszi a `tenantId` opcionális megadását a kliens számára. Bár a dokumentáció és a kód megjegyzései is utalnak arra, hogy ezt az értéket a szerver oldalon, az authentikációs kontextusból kellene kinyerni, a séma jelenlegi formája kétértelműséget okozhat.

Ha a kliens mégis elküld egy `tenantId`-t, a szerver oldali logikának expliciten felül kell írnia azt, ami felesleges bonyolultságot okozhat és potenciális biztonsági rés lehet, ha a felülírás logikája hibásan van implementálva.

## Bizonyíték

```typescript
// packages/core/users/src/dto/create-user.dto.ts
export const createUserSchema = z.object({
  // ...
  // tenantId is optional in request - will be injected from auth context
  tenantId: z
    .string()
    .uuid('Érvénytelen tenant ID formátum')
    .optional(),
  // ...
});
```

## Megoldás

A `tenantId`-t teljesen el kell távolítani a `createUserSchema`-ból. A DTO-nak csak azokat az adatokat kell tartalmaznia, amiket a kliensnek ténylegesen meg kell adnia.

A `users.service.ts` `createUser` metódusának felelőssége, hogy a kliens által küldött DTO-t és a request kontextusból származó `tenantId`-t (és a létrehozó felhasználó ID-ját) egyesítse a perzisztencia réteg felé.

**Javasolt séma:**
```typescript
// packages/core/users/src/dto/create-user.dto.ts
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.nativeEnum(Role).optional().default(Role.OPERATOR),
  locationId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(UserStatus).optional().default(UserStatus.ACTIVE),
});
```

Ez a megközelítés tisztábbá teszi az API kontraktust, és megszünteti annak a lehetőségét, hogy a kliens a tenant kontextust befolyásolja a létrehozási művelet során.
