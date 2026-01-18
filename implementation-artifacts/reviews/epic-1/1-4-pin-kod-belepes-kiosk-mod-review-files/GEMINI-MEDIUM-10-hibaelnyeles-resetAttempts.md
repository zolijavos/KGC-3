# Hiba: Hibaelnyelés a `resetAttempts`-ben

**Fájl:** `packages/core/auth/src/services/pin-lockout.service.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `resetAttempts` metódus `try...catch` blokkja elnyel minden hibát, kivéve a Prisma "rekord nem található" (P2025) hibáját. Ez elrejthet más váratlan adatbázis-hibákat.

## Bizonyíték

```typescript
// pin-lockout.service.ts
try {
  await this.prisma.pinAttempt.delete({
    where: {
      userId_deviceId: { userId, deviceId },
    },
  });
} catch (error) {
  // Record may not exist - that's fine
  if ((error as { code?: string })?.code !== 'P2025') {
    throw error;
  }
}
```

## Megoldás

Ahelyett, hogy csak a P2025 hibát engedné át, a `catch` blokknak naplóznia kellene a hibát, és csak akkor kellene elnyelnie, ha az a várt "rekord nem található" hiba. Más hibákat tovább kellene dobni.

```typescript
// pin-lockout.service.ts
try {
  await this.prisma.pinAttempt.delete({
    where: {
      userId_deviceId: { userId, deviceId },
    },
  });
} catch (error) {
  if ((error as { code?: string })?.code !== 'P2025') {
    console.error('Unexpected error in resetAttempts:', error);
    throw error;
  }
  // It's okay if the record to delete was not found.
}
```
