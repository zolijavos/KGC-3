# Hiba: Felesleges `async` a `jwt-auth.guard.ts`-ben

**Fájl:** `packages/core/auth/src/guards/jwt-auth.guard.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `handleRequest` metódus nem `async`, de egy `async` kontextusból van hívva. Bár ez nem hiba, jó gyakorlat megtartani az `async` kulcsszót, ha a metódus a jövőben aszinkronná válhat. Ebben az esetben a metódus egyszerű és lehet szinkron.

## Bizonyíték

```typescript
handleRequest<TUser>(err: Error | null, user: TUser): TUser { ... }
```

## Megoldás

Döntés kérdése, de a jelenlegi implementáció alapján az `async` felesleges. A konzisztencia kedvéért vagy tegyük `async`-cá, vagy hagyjuk így, de dokumentáljuk a döntést.
