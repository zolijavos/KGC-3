# Hiba: A `PermissionService` nincs a NestJS DI konténerén keresztül injektálva

**Fájl:** `packages/core/users/src/users.service.ts`
**Súlyosság:** KRITIKUS

## Probléma

A `UsersService` konstruktora közvetlenül példányosítja a `PermissionService`-t a `this.permissionService = new PermissionService();` sorral. Ez a megoldás megkerüli a NestJS dependency injection (DI) mechanizmusát.

Ez több problémát is okoz:
1.  **Tesztelhetőség:** A `UsersService` egységtesztelése során nem lehet a `PermissionService`-t mock-olni, mivel az szorosan csatolva van.
2.  **Karbantarthatóság:** Ha a `PermissionService`-nek a jövőben saját függőségei lesznek (pl. egy konfigurációs szolgáltatás), ez a kód azonnal elavul, és refaktorálásra szorul.
3.  **Konzisztencia:** A projekt többi szolgáltatását (pl. `RoleService`) a DI konténer kezeli, ez az implementáció eltér ettől a mintától.

## Bizonyíték

```typescript
// packages/core/users/src/users.service.ts

@Injectable()
export class UsersService {
  private readonly permissionService: PermissionService;

  constructor(
    @Inject('PRISMA_CLIENT') @Optional() private readonly prisma: PrismaClient | null,
    private readonly roleService: RoleService,
    // ...
  ) {
    this.permissionService = new PermissionService(); // <-- Közvetlen példányosítás
  }
  
  // ...
  
  async getUserPermissions(/*...*/) {
    // ...
    const permissions = this.permissionService.getAllPermissions(role); // <-- Itt van használva
    // ...
  }
}
```

## Megoldás

A `PermissionService`-t a `UsersModule`-ban kell `provider`-ként regisztrálni, és a `UsersService` konstruktorában injektálni, ugyanúgy, ahogy a `RoleService` is be van injektálva.

**1. Tegye a `PermissionService`-t `@Injectable()`-lé:**

Feltételezve, hogy a `permission.service.ts` fájl létezik:
```typescript
// packages/core/users/src/services/permission.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class PermissionService {
  // ...
}
```

**2. Adja hozzá a `PermissionService`-t a `UsersModule` providereihez:**

```typescript
// packages/core/users/src/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';

@Module({
  providers: [
    UsersService, 
    RoleService, 
    PermissionService // <-- Regisztrálás provider-ként
  ],
  // ...
})
export class UsersModule {}
```

**3. Injektálja a `PermissionService`-t a `UsersService` konstruktorában:**

```typescript
// packages/core/users/src/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    @Inject('PRISMA_CLIENT') @Optional() private readonly prisma: PrismaClient | null,
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService, // <-- Injektálás
    // ...
  ) {}
  
  // A this.permissionService = new PermissionService(); sor törlendő!
  
  // ...
}
```
