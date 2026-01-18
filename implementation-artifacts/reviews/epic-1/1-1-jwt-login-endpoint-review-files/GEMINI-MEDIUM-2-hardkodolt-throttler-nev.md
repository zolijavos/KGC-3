# Hiba: Hardcode-olt 'login' a `ThrottlerModule` Konfigurációban

**Fájl:** `packages/core/auth/src/auth.module.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `ThrottlerModule` konfigurációjában a `name: 'login'` érték hardcode-olva van. Ez egy "mágikus string", amit kerülni kell.

## Bizonyíték

```typescript
ThrottlerModule.forRoot([
  {
    name: 'login', // <-- Mágikus string
    ttl: 60000,
    limit: 5,
  },
]),
```

## Megoldás

Hozzon létre egy konstanst a throttler nevének és használja azt a konfigurációban.

```typescript
const THROTTLER_NAMES = {
  LOGIN: 'login',
};

// ...

ThrottlerModule.forRoot([
  {
    name: THROTTLER_NAMES.LOGIN,
    ttl: 60000,
    limit: 5,
  },
]),
```
