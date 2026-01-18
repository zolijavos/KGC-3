# Hiba: Felesleges `null` ellenőrzés a `prisma`-ra

**Fájl:** `packages/core/auth/src/services/pin-lockout.service.ts`
**Súlyosság:** ALACSONY

## Probléma

A `getRemainingLockoutTime` és `getAttemptInfo` metódusok ellenőrzik, hogy a `this.prisma` null-e, és alapértelmezett értéket adnak vissza. Azonban a `PinLockoutService` csak akkor hasznos, ha van adatbázis-kapcsolat. Jobb lenne hibát dobni, ha a `prisma` nem áll rendelkezésre.

## Bizonyíték

```typescript
// pin-lockout.service.ts
async getRemainingLockoutTime(userId: string, deviceId: string): Promise<number> {
  if (!this.prisma) {
    return 0;
  }
  // ...
}
```

## Megoldás

A metódusoknak hibát kellene dobniuk, ha a `prisma` nem áll rendelkezésre, ahelyett, hogy csendben visszatérnének egy alapértelmezett értékkel.

```typescript
// pin-lockout.service.ts
async getRemainingLockoutTime(userId: string, deviceId: string): Promise<number> {
  if (!this.prisma) {
    throw new Error('Prisma client is not available');
  }
  // ...
}
```
