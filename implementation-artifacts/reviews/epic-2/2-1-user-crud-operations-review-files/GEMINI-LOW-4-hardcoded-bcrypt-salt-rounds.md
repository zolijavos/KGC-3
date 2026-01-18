# Hiba: Hardkódolt `bcrypt` salt rounds értékek

**Fájl:** `packages/core/users/src/users.service.ts`
**Súlyosság:** ALACSONY

## Probléma

A `BCRYPT_SALT_ROUNDS` és `BCRYPT_PIN_SALT_ROUNDS` konstansok értékei (12 és 10) közvetlenül a `users.service.ts` fájlban vannak hardkódolva.

Bár ezek az értékek jelenleg megfelelőek, a hardkódolás megnehezíti a jövőbeni karbantartást. Ha a biztonsági követelmények változnak, és a "salt rounds" értékét növelni kell, akkor a forráskódot kell módosítani és újrafordítani. A bevált gyakorlat szerint az ilyen konfigurációs értékeket egy központi konfigurációs szolgáltatásból kellene betölteni.

## Bizonyíték

```typescript
// packages/core/users/src/users.service.ts

/** bcrypt salt rounds for password hashing */
const BCRYPT_SALT_ROUNDS = 12;

/** bcrypt salt rounds for PIN hashing (slightly lower for faster PIN operations) */
const BCRYPT_PIN_SALT_ROUNDS = 10;

// ...

const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS);

// ...

const newPinHash = await bcrypt.hash(newPin, BCRYPT_PIN_SALT_ROUNDS);
```

## Megoldás

Hozzon létre egy konfigurációs fájlt vagy használjon környezeti változókat a `bcrypt` salt rounds értékek tárolására. A `UsersService` pedig egy `ConfigService`-en keresztül férjen hozzá ezekhez az értékekhez.

Ez a megközelítés lehetővé teszi a biztonsági paraméterek rugalmas kezelését anélkül, hogy a kódbázist módosítani kellene.

**Példa a javításra (NestJS `@nestjs/config` használatával):**

**1. Konfiguráció definiálása (pl. `.env` fájlban):**
```dotenv
# .env
BCRYPT_SALT_ROUNDS=12
BCRYPT_PIN_SALT_ROUNDS=10
```

**2. `ConfigService` injektálása és használata:**
```typescript
// packages/core/users/src/users.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  private readonly bcryptSaltRounds: number;
  private readonly bcryptPinSaltRounds: number;

  constructor(
    private readonly configService: ConfigService,
    // ...
  ) {
    this.bcryptSaltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    this.bcryptPinSaltRounds = this.configService.get<number>('BCRYPT_PIN_SALT_ROUNDS', 10);
  }

  async createUser(/*...*/) {
    // ...
    const passwordHash = await bcrypt.hash(temporaryPassword, this.bcryptSaltRounds);
    // ...
  }
  
  async updatePin(/*...*/) {
    // ...
    const newPinHash = await bcrypt.hash(newPin, this.bcryptPinSaltRounds);
    // ...
  }
}
```

Ez a megoldás követi a "configuration as code" elvet, és sokkal robusztusabbá teszi az alkalmazást a változó környezeti és biztonsági követelményekkel szemben.
