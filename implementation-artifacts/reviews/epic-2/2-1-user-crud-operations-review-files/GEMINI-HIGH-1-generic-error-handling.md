# Hiba: A `UsersService` generikus `Error` objektumokat dob

**Fájl:** `packages/core/users/src/users.service.ts`
**Súlyosság:** MAGAS

## Probléma

A `UsersService` metódusai az üzleti logikai hibák jelzésére több helyen is generikus `new Error(...)` kivételeket dobnak. Például, ha egy email cím már létezik (`EMAIL_EXISTS`), ha a szerepkör-hierarchia sérül (`ROLE_VIOLATION`), vagy ha egy felhasználó nem található (`NOT_FOUND`).

Ez a gyakorlat problematikus, mert a hívó rétegnek (jellemzően a `UsersController`) a hibaüzenet szövege alapján kellene megkülönböztetnie a különböző hibaállapotokat, ami törékeny és rosszul skálázható. A NestJS exception filter rétege így nem tudja automatikusan a megfelelő HTTP státuszkódot (pl. 404, 409, 403) és a konzisztens hibaüzenet-formátumot előállítani.

## Bizonyíték

```typescript
// packages/core/users/src/users.service.ts

// Példa 1: Létező email
if (existingUser) {
  throw new Error(USER_MESSAGES.EMAIL_EXISTS); // --> Ebből 500 Internal Server Error lesz
}

// Példa 2: Szerepkör-hierarchia sértés
if (!this.roleService.canAssignRole(creatorRole, targetRole)) {
  // ...
  throw new Error(USER_MESSAGES.ROLE_VIOLATION); // --> Ebből 500 Internal Server Error lesz
}

// Példa 3: Nem található felhasználó
if (!existingUser) {
  throw new Error(USER_MESSAGES.NOT_FOUND); // --> Ebből 500 Internal Server Error lesz
}

// Példa 4: Adatbázis nem elérhető
if (!this.prisma) {
  throw new Error('Database not available'); // --> Ebből 500 Internal Server Error lesz
}
```

## Megoldás

Cserélje le a generikus `Error` kivételeket a megfelelő, beépített NestJS HTTP kivételekre. Ezáltal a NestJS keretrendszer automatikusan kezeli a HTTP válaszokat, biztosítva a helyes státuszkódokat és a konzisztens, deklaratív hibakezelést.

**Javasolt javítások:**

| Helyzet | Jelenlegi kód | Javasolt NestJS kivétel | HTTP Státuszkód |
|---|---|---|---|
| Email már létezik | `throw new Error(USER_MESSAGES.EMAIL_EXISTS)` | `throw new ConflictException(USER_MESSAGES.EMAIL_EXISTS)` | 409 Conflict |
| Felhasználó nem található | `throw new Error(USER_MESSAGES.NOT_FOUND)` | `throw new NotFoundException(USER_MESSAGES.NOT_FOUND)` | 404 Not Found |
| Szerepkör-hierarchia sértés | `throw new Error(USER_MESSAGES.ROLE_VIOLATION)` | `throw new ForbiddenException(USER_MESSAGES.ROLE_VIOLATION)` | 403 Forbidden |
| Adatbázis nem elérhető | `throw new Error('Database not available')` | `throw new ServiceUnavailableException('Database not available')` | 503 Service Unavailable |
| `tenantId` hiányzik | `throw new Error('tenantId is required')` | `throw new BadRequestException('tenantId is required')` | 400 Bad Request |


**Példa a javításra:**

```typescript
// packages/core/users/src/users.service.ts
import { 
  Injectable, 
  ConflictException, 
  NotFoundException, 
  ForbiddenException,
  ServiceUnavailableException
} from '@nestjs/common';

// ...

// Létező email esetén:
if (existingUser) {
  throw new ConflictException({
    error: {
      code: UserErrorCode.EMAIL_ALREADY_EXISTS,
      message: USER_MESSAGES.EMAIL_EXISTS
    }
  });
}

// Nem található felhasználó esetén:
if (!existingUser) {
  throw new NotFoundException({
    error: {
      code: UserErrorCode.USER_NOT_FOUND,
      message: USER_MESSAGES.NOT_FOUND
    }
  });
}
```

Ez a megközelítés nagyban javítja a kód olvashatóságát, karbantarthatóságát és a keretrendszerrel való integrációját.
