# Hiba: A `PermissionService` nincs a NestJS DI konténerén keresztül injektálva

**Fájl:** `packages/core/users/src/services/permission.service.ts`
**Súlyosság:** KRITIKUS

## Probléma

A `PermissionService` konstruktora közvetlenül példányosítja a `RoleService`-t a `this.roleService = new RoleService();` sorral. Ez a megoldás megkerüli a NestJS dependency injection (DI) mechanizmusát.

Ez a hiba megegyezik a `GEMINI-CRITICAL-1-permission-service-DI.md`-ben leírt hibával, csak egy másik szolgáltatásban. A probléma ugyanaz:

1.  **Tesztelhetőség:** A `PermissionService` egységtesztelése során nem lehet a `RoleService`-t mock-olni, mivel az szorosan csatolva van.
2.  **Karbantarthatóság:** Ha a `RoleService`-nek a jövőben saját függőségei lesznek, ez a kód azonnal elavul.
3.  **Inkonzisztencia:** A projekt többi szolgáltatása a DI konténert használja, ez az implementáció eltér ettől a mintától.

## Bizonyíték

```typescript
// packages/core/users/src/services/permission.service.ts
import { Injectable } from '@nestjs/common';
import { RoleService } from './role.service';

@Injectable()
export class PermissionService {
  private readonly roleService: RoleService;

  constructor() {
    this.roleService = new RoleService(); // <-- Közvetlen példányosítás
  }

  // ...
}
```

## Megoldás

A `RoleService`-t a `UsersModule`-ban kell `provider`-ként regisztrálni (ami a `2-1` story alapján már megtörtént), és a `PermissionService` konstruktorában injektálni kell. A `PermissionService`-t szintén provider-ként kell regisztrálni.

**1. Tegye a `PermissionService`-t `@Injectable()`-lé (már megvan).**

**2. Adja hozzá a `PermissionService`-t és a `RoleService`-t a `UsersModule` providereihez:**

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
  exports: [UsersService],
})
export class UsersModule {}
```

**3. Injektálja a `RoleService`-t a `PermissionService` konstruktorában:**

```typescript
// packages/core/users/src/services/permission.service.ts
import { Injectable } from '@nestjs/common';
import { RoleService } from './role.service';

@Injectable()
export class PermissionService {
  constructor(private readonly roleService: RoleService) {} // <-- Injektálás
  
  // A this.roleService = new RoleService(); sor törlendő!

  // ...
}
```
Ez a javítás biztosítja, hogy a szolgáltatások lazán csatoltak, tesztelhetőek és megfelelnek a NestJS architekturális elveinek.
