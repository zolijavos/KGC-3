# Hiba: Felesleges `async` a `jwt.strategy.ts`-ben

**Fájl:** `packages/core/auth/src/strategies/jwt.strategy.ts`
**Súlyosság:** ALACSONY

## Probléma

A `validate` metódus `async`-ként van megjelölve, de nem végez aszinkron műveletet.

## Bizonyíték

```typescript
async validate(payload: JwtPayload): Promise<{...}> {
  return { ... }; // Nincs await hívás
}
```

## Megoldás

Távolítsa el az `async` kulcsszót a metódus definíciójából.

```typescript
validate(payload: JwtPayload): { ... } {
  return { ... };
}
```
