# Hiba: Potenciálisan Kezeletlen Promise Visszautasítások az `auth.service.ts`-ben

**Fájl:** `packages/core/auth/src/auth.service.ts`
**Súlyosság:** MAGAS

## Probléma

A `recordLoginAttempt` és `updateDeviceLastUsed` metódusok az `auth.service.ts`-ben elkapják a Prisma által dobott hibákat, de nem dobják tovább őket. Ez csendes hibákhoz vezethet, ahol a hívó kód nem szerez tudomást a problémáról.

## Bizonyíték

```typescript
// auth.service.ts
try {
  await this.prisma.loginAttempt.create({ ... });
} catch (error) {
  // Don't block login flow, but log the error for operational visibility
  console.warn('[AuthService] Failed to record login attempt:', error);
}
```

## Megoldás

A hibát naplózás után tovább kell dobni, vagy a metódusnak egy eredmény objektumot kell visszaadnia, amely jelzi a sikert vagy a hibát. A hiba továbbdobása a gyakoribb és elvártabb minta ebben az esetben.

```typescript
// auth.service.ts
try {
  await this.prisma.loginAttempt.create({ ... });
} catch (error) {
  // Don't block login flow, but log the error for operational visibility
  console.warn('[AuthService] Failed to record login attempt:', error);
  throw error;
}
```
