# Hiba: Inkonzisztens `prisma` null ellenőrzés és hibakezelés

**Fájl:** `packages/core/users/src/users.service.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `UsersService` több metódusa is ellenőrzi, hogy a `this.prisma` kliens `null`-e. Azonban a hibakezelés módja inkonzisztens a különböző metódusokban.

- A `createUser` metódus `new Error('Database not available')` hibát dob.
- A `findAll` metódus csendben, hiba nélkül egy üres tömbbel és nullás paginációval tér vissza.
- A `findById` metódus csendben, hiba nélkül `null`-t ad vissza.

Ez az inkonzisztencia megnehezíti a kliensoldali fejlesztők számára a hibák egységes kezelését. Egy szolgáltatás kiesése (mint az adatbázis-kapcsolat hiánya) esetén a kliensnek egyértelmű, 5xx-es szintű hibát kellene kapnia, nem pedig egy sikeres, de üres választ. A csendes hibakezelés elrejti a problémát, és megnehezíti a hibakeresést.

## Bizonyíték

```typescript
// packages/core/users/src/users.service.ts

// Hiba dobása:
async createUser(/*...*/) {
  if (!this.prisma) {
    throw new Error('Database not available');
  }
  // ...
}

// Üres válasszal való visszatérés:
async findAll(/*...*/) {
  if (!this.prisma) {
    return { data: [], pagination: { total: 0, limit: query.limit, offset: query.offset } };
  }
  // ...
}

// Null válasszal való visszatérés:
async findById(/*...*/) {
  if (!this.prisma) {
    return null;
  }
  // ...
}
```

## Megoldás

Legyen egységes a `prisma` kliens hiányának kezelése minden metódusban. A javasolt megközelítés egy `ServiceUnavailableException` dobása, ami egyértelműen jelzi a kliens felé, hogy a szolgáltatás átmenetileg nem elérhető.

Ez biztosítja, hogy az API-hívások kiszámíthatóan `503 Service Unavailable` hibával térnek vissza, ha az adatbázis-kapcsolat nem áll rendelkezésre, ahelyett, hogy sikeres, de félrevezetően üres választ adnának.

**Javasolt javítás:**

```typescript
// packages/core/users/src/users.service.ts
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class UsersService {
  constructor(
    @Inject('PRISMA_CLIENT') private readonly prisma: PrismaClient,
    // ...
  ){
    if (!this.prisma) {
      // Lehetőség: a konstruktorban dobunk hibát, ha a prisma kliens hiányzik.
      // Így a modul betöltődésekor azonnal kiderül a hiba.
      throw new ServiceUnavailableException('Prisma client is not available');
    }
  }

  private checkPrismaAvailability(): void {
    if (!this.prisma) {
      throw new ServiceUnavailableException('Database not available');
    }
  }
  
  async createUser(/*...*/) {
    this.checkPrismaAvailability();
    // ...
  }

  async findAll(/*...*/) {
    this.checkPrismaAvailability();
    // ...
  }

  async findById(/*...*/) {
    this.checkPrismaAvailability();
    // ...
  }
}
```

Egy másik megközelítés lehet a `PrismaClient` `@Optional()` dekorátorának eltávolítása. Ha a `PrismaClient` egy kötelező függőség, akkor a NestJS DI konténere fog hibát dobni az alkalmazás indulásakor, ha a `PRISMA_CLIENT` provider nem elérhető. Ez a "fail-fast" megközelítés gyakran a legjobb, mivel a konfigurációs hibák azonnal kiderülnek.
