# Hiba: A `PermissionGuard` nincs a NestJS DI konténerén keresztül injektálva

**Fájl:** `packages/core/users/src/guards/permission.guard.ts`
**Súlyosság:** KRITIKUS

## Probléma

A `PermissionGuard` konstruktora közvetlenül példányosítja a `PermissionService`-t a `this.permissionService = new PermissionService();` sorral. Ez a megoldás megkerüli a NestJS dependency injection (DI) mechanizmusát.

Ez a hiba mostanra egy ismétlődő anti-pattern a `@kgc/users` csomagban, és ugyanazokat a súlyos problémákat okozza, mint a korábban talált esetekben:

1.  **Tesztelhetőség:** A `PermissionGuard` egységtesztelése során nem lehet a `PermissionService`-t mock-olni, ami elengedhetetlen lenne a `hasPermission` logika teszteléséhez anélkül, hogy a teljes `PermissionService` logikát is tesztelnénk.
2.  **Karbantarthatóság:** Szorosan csatolja a guard-ot a `PermissionService` konkrét implementációjához.
3.  **Inkonzisztencia:** Megtöri a NestJS általános architekturális mintáját.

## Bizonyíték

```typescript
// packages/core/users/src/guards/permission.guard.ts
import { Injectable } from '@nestjs/common';
import { PermissionService } from '../services/permission.service';
// ...

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly permissionService: PermissionService;

  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService | null
  ) {
    this.permissionService = new PermissionService(); // <-- Közvetlen példányosítás
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ...
    const results = requiredPermissions.map((permission) =>
      this.permissionService.hasPermission(userRole, permission) // <-- Itt van használva
    );
    // ...
  }
}
```

## Megoldás

A `PermissionService`-t a `UsersModule`-ban kell `provider`-ként regisztrálni (ami a korábbi riportok alapján már javasolt), és a `PermissionGuard` konstruktorában injektálni kell.

**1. Regisztrálja a `PermissionService`-t és a `PermissionGuard`-ot a `UsersModule` providerei között:**

```typescript
// packages/core/users/src/users.module.ts
import { Module } from '@nestjs/common';
import { PermissionGuard } from './guards/permission.guard';
import { PermissionService } from './services/permission.service';
// ...

@Module({
  providers: [
    UsersService, 
    RoleService, 
    PermissionService,
    PermissionGuard // <-- Regisztrálja a guard-ot is provider-ként
  ],
  // ...
})
export class UsersModule {}
```

**2. Injektálja a `PermissionService`-t a `PermissionGuard` konstruktorában:**

```typescript
// packages/core/users/src/guards/permission.guard.ts
import { Injectable } from '@nestjs/common';
import { PermissionService } from '../services/permission.service';
// ...

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService, // <-- Injektálás
    @Optional() @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService | null
  ) {}
  
  // A this.permissionService = new PermissionService(); sor törlendő!

  // ...
}
```
Ez a javítás elengedhetetlen a guard helyes, tesztelhető és karbantartható működéséhez, és összhangba hozza a kódot a projekt többi részével.
