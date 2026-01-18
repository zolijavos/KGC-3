# Hiba: Használatlan `updaterId` és `deleterId` paraméterek

**Fájl:** `packages/core/users/src/users.service.ts`
**Súlyosság:** ALACSONY

## Probléma

Az `updateUser` és a `softDeleteUser` metódusok megkapják az `updaterId` és `deleterId` paramétereket, de nem használják fel őket. A paraméterek nevei ( `_updaterId`, `_deleterId` ) aláhúzással kezdődnek, ami arra utal, hogy a fejlesztő szándékosan hagyta őket figyelmen kívül.

Azonban a story (`2-1-user-crud-operations.md`) és a projekt kontextusa is hangsúlyozza az audit logolás fontosságát. Más metódusok, mint az `assignRole` vagy az `updateProfile` helyesen használják is a "cselekvő" azonosítóját az audit naplóbejegyzések létrehozásakor.

Ennek a két metódusnak a hiányzó audit logolása inkonzisztenciát és egy hiányos audit nyomvonalat eredményez.

## Bizonyíték

```typescript
// packages/core/users/src/users.service.ts

// A `_updaterId` nincs felhasználva, és nincs audit log.
async updateUser(
  id: string,
  dto: UpdateUserDto,
  _updaterId: string, // <-- Használatlan
  updaterRole: Role,
  tenantId: string
): Promise<UserResponse> {
  // ...
  const updatedUser = await this.prisma.user.update({
    where: { id },
    data: updateData,
  });
  
  // HIÁNYZIK: Audit log bejegyzés az update-ről
  
  return formatUserResponse(updatedUser);
}


// A `_deleterId` nincs felhasználva, és nincs audit log.
async softDeleteUser(
  id: string,
  _deleterId: string, // <-- Használatlan
  tenantId: string
): Promise<DeleteUserResponse> {
  // ...
  await this.prisma.user.update({
    // ...
  });
  
  // HIÁNYZIK: Audit log bejegyzés a törlésről

  // ...
}
```

Összehasonlításképpen, az `updateProfile` metódus helyesen implementálja az audit logolást:
```typescript
// packages/core/users/src/users.service.ts
async updateProfile(/*...*/) {
  // ...
  if (this.auditService) {
    await this.auditService.log({
      action: AuditAction.USER_PROFILE_UPDATED,
      userId, // A cselekvő ID-ja
      // ...
    });
  }
  // ...
}
```

## Megoldás

Implementálja a hiányzó audit logolást az `updateUser` és `softDeleteUser` metódusokban, felhasználva a `updaterId` és `deleterId` paramétereket.

**Javasolt javítás `updateUser`-hez:**
```typescript
async updateUser(
  id: string,
  dto: UpdateUserDto,
  updaterId: string, // Aláhúzás eltávolítva
  updaterRole: Role,
  tenantId: string
): Promise<UserResponse> {
  // ... (a metódus többi része)
  const updatedUser = await this.prisma.user.update({ /*...*/ });

  if (this.auditService) {
    await this.auditService.log({
      action: AuditAction.USER_UPDATED, // Feltételezve, hogy létezik ilyen action
      userId: updaterId,
      tenantId,
      resourceType: 'USER',
      resourceId: id,
      details: {
        updatedFields: Object.keys(dto)
      }
    });
  }

  return formatUserResponse(updatedUser);
}
```

**Javasolt javítás `softDeleteUser`-hez:**
```typescript
async softDeleteUser(
  id: string,
  deleterId: string, // Aláhúzás eltávolítva
  tenantId: string
): Promise<DeleteUserResponse> {
  // ... (a metódus többi része)
  if (this.auditService) {
    await this.auditService.log({
      action: AuditAction.USER_DELETED, // Feltételezve, hogy létezik ilyen action
      userId: deleterId,
      tenantId,
      resourceType: 'USER',
      resourceId: id,
    });
  }

  return { /*...*/ };
}
```
Ez a javítás biztosítja, hogy a felhasználói adatok módosítása és törlése is megfelelően naplózásra kerüljön, ami kritikus a biztonság és a visszakövethetőség szempontjából.
