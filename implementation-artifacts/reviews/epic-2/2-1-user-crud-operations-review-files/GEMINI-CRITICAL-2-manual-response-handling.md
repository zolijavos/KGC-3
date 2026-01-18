# Hiba: Manuális `Response` kezelés és Express függőség

**Fájl:** `packages/core/users/src/users.controller.ts`
**Súlyosság:** KRITIKUS

## Probléma

A `UsersController` metódusai a `@Res()` dekorátor segítségével közvetlenül a `Response` objektumot kezelik (`res.status(...).json(...)`). Ez a megközelítés egy NestJS anti-pattern, és számos problémát okoz:

1.  **NestJS funkciók megkerülése:** A manuális válaszkezelés megkerüli a NestJS beépített mechanizmusait, mint például az Exception Filter-eket, Interceptor-okat és a `class-transformer`-t. Ez azt jelenti, hogy a globálisan definiált hibakezelési vagy válasz-átalakítási logikák nem fognak lefutni ezekre az endpointokra.
2.  **Karbantarthatóság:** A kód sokkal bőbeszédűbb és nehezebben olvasható a `try...catch` blokkok és a manuális `res.status().json()` hívások miatt.
3.  **Express függőség:** A kód lokális `Request` és `Response` interfészeket definiál, hogy elkerülje a `@types/express` csomagot. Ez csak a tünete a mélyebb problémának: a kontroller logikája szorosan kötődik az Express-hez, ahelyett, hogy a NestJS absztrakciós rétegét használná, ami elvileg lehetővé tenné a mögöttes HTTP szerver (pl. Fastify) cseréjét.

## Bizonyíték

```typescript
// packages/core/users/src/users.controller.ts

// A metódus szignatúrája `@Res()`-t használ
async createUser(
  @Body() body: unknown,
  @Req() req: AuthenticatedRequest,
  @Res() res: Response // <-- Manuális válasz objektum
): Promise<Response> {
  // ...
  // Manuális válasz küldése siker esetén
  return res.status(HttpStatus.CREATED).json({ data: user });
  // ...
  // Manuális válasz küldése hiba esetén
  return this.handleError(error, res);
}
```

## Megoldás

Refaktorálja a controllert, hogy a NestJS deklaratív, "return-based" megközelítését használja. A metódusoknak a DTO-t vagy a service által visszaadott adatot kell visszaadniuk, a hibákat pedig a megfelelő NestJS kivételeken keresztül kell dobniuk. A `@Res()` és `@Req()` dekorátorok használatát minimalizálni kell.

**Javasolt javítás:**

```typescript
// packages/core/users/src/users.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body,
  Req,
  HttpCode,
  HttpStatus,
  // ...
  // Nincs szükség a @Res dekorátorra
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto'; // A DTO class-t használjuk
// ...

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  // Nincs többé `Promise<Response>`, helyette a válasz DTO-t adjuk vissza
  async createUser(
    @Body() createUserDto: CreateUserDto, // Itt már a `ValidationPipe` lefutott
    @Req() req: AuthenticatedRequest
  ): Promise<{ data: UserResponse }> {
    // A validációt a `ValidationPipe` elvégzi, nincs szükség a `validateCreateUserInput`-ra

    // A service hiba esetén NestJS kivételt dob, amit egy Exception Filter kezel.
    // Nincs szükség a `try...catch` blokkra.
    const user = await this.usersService.createUser(
      { ...createUserDto, tenantId: req.user.tenantId },
      req.user.id,
      req.user.role as Role
    );

    return { data: user }; // Csak az adatot adjuk vissza
  }
}
```

Ehhez a refaktoráláshoz kapcsolódik a többi issue (manuális hibakezelés, `ValidationPipe` hiánya) megoldása is. Az átállás egy sokkal tisztább, tesztelhetőbb és a NestJS ökoszisztémába jobban illeszkedő kódot eredményez.
