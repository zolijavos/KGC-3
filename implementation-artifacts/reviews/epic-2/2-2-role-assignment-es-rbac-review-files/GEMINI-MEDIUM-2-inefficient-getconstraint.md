# Hiba: Inhatékony constraint-kezelési logika

**Fájl:** `packages/core/users/src/services/permission.service.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `getConstraint` metódus logikája inhatékony, mivel kétszer számolja ki ugyanazt az öröklési láncot.

1.  A metódus elején meghívja a `this.hasPermission(role, permission)`-t, ami belsőleg meghívja a `this.getAllPermissions(role)`-t.
2.  A `getAllPermissions` meghívja a `this.roleService.getInheritedRoles(role)`-t, hogy összegyűjtse az örökölt jogosultságokat.
3.  Ezután, ha a `getConstraint` metódusban nem található közvetlen constraint, újra meghívja a `this.roleService.getInheritedRoles(role)`-t, hogy végigiteráljon az örökölt szerepkörökön.

Az öröklési lánc lekérdezése (`getInheritedRoles`) így minden egyes `getConstraint` hívásnál kétszer történik meg, ami felesleges számítási többletet jelent, különösen, ha a metódust gyakran hívják.

## Bizonyíték

```typescript
// packages/core/users/src/services/permission.service.ts

export class PermissionService {
  // ...
  
  getConstraint(
    role: Role,
    permission: Permission,
    constraintKey: string
  ): number | undefined {
    // 1. ELSŐ HÍVÁS (közvetetten, a hasPermission -> getAllPermissions -> getInheritedRoles útvonalon)
    if (!this.hasPermission(role, permission)) {
      return undefined;
    }

    // ... (közvetlen constraint ellenőrzése)

    // 2. MÁSODIK HÍVÁS (közvetlenül)
    const inheritedRoles = this.roleService.getInheritedRoles(role);
    for (const inheritedRole of inheritedRoles) {
      // ...
    }

    return undefined;
  }
}
```

## Megoldás

Optimalizálja a `getConstraint` metódust úgy, hogy az öröklési láncot csak egyszer kérdezze le. Az öröklött szerepköröket tartalmazó tömböt használja fel mind a jogosultság ellenőrzésére, mind a constraint-ek keresésére.

**Javasolt javítás:**
```typescript
// packages/core/users/src/services/permission.service.ts

export class PermissionService {
  // ...

  getConstraint(
    role: Role,
    permission: Permission,
    constraintKey: string
  ): number | undefined {
    // 1. Az öröklési lánc lekérdezése CSAK EGYSZER.
    const rolesToCheck = [role, ...this.roleService.getInheritedRoles(role)];

    // 2. Jogosultság ellenőrzése a teljes láncon.
    const hasPerm = rolesToCheck.some(r => 
      (this.getDirectPermissions(r) || []).includes(permission)
    );

    if (!hasPerm) {
      return undefined;
    }

    // 3. Constraint keresése a láncon, a legspecifikusabbtól (gyerek) haladva a legáltalánosabb felé (szülő).
    // Az első találat lesz a helyes, mivel a `rolesToCheck` a legspecifikusabbal kezdődik.
    for (const currentRole of rolesToCheck) {
      const roleConstraints = ROLE_CONSTRAINTS[currentRole];
      if (roleConstraints) {
        const permissionConstraints = roleConstraints[permission];
        if (permissionConstraints && constraintKey in permissionConstraints) {
          return permissionConstraints[constraintKey];
        }
      }
    }

    return undefined;
  }
}
```
Ez a refaktorált kód elkerüli a redundáns `getInheritedRoles` hívást, és a logikát is egyértelműbbé teszi, mivel egyetlen listán (`rolesToCheck`) dolgozik.
