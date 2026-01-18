# Hiba: "Mágikus Szám" a `ThrottlerModule` Konfigurációban

**Fájl:** `packages/core/auth/src/auth.module.ts`
**Súlyosság:** ALACSONY

## Probléma

A `ThrottlerModule.forRoot`-ban a `ttl` értéke `60000`. Ezt a "mágikus számot" egy beszédesebb konstansra kellene cserélni, mint például `ONE_MINUTE_IN_MS`.

## Bizonyíték

```typescript
ThrottlerModule.forRoot([
  {
    name: 'login',
    ttl: 60000, // <-- Mágikus szám
    limit: 5,
  },
]),
```

## Megoldás

Hozzon létre egy `TTL` konstanst vagy enum-ot a `ttl` értékeknek.

```typescript
const ONE_MINUTE_IN_MS = 60000;

// ...

ThrottlerModule.forRoot([
  {
    name: 'login',
    ttl: ONE_MINUTE_IN_MS,
    limit: 5,
  },
]),
```
