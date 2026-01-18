# Hiba: A `findValidRefreshToken` metódusnak ellenőriznie kell a lejáratot és a visszavonást

**Fájl:** `packages/core/auth/src/auth.service.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `findValidRefreshToken` metódus csak azt ellenőrzi, hogy a token létezik-e az adatbázisban. Ellenőriznie kellene azt is, hogy a token lejárt-e vagy vissza lett-e vonva. Ez egyszerűsítené a `refreshTokens` metódust.

## Bizonyíték

```typescript
// auth.service.ts
async findValidRefreshToken(token: string): Promise<{ ... } | null> {
  if (!this.prisma) {
    return null;
  }

  const tokenRecord = await this.prisma.refreshToken.findFirst({
    where: { token },
  });

  return tokenRecord;
}
```

## Megoldás

A `findValidRefreshToken` metódusnak a `where` klózában ellenőriznie kell, hogy `isRevoked` hamis-e és `expiresAt` a jövőben van-e.

```typescript
// auth.service.ts
async findValidRefreshToken(token: string): Promise<{ ... } | null> {
  if (!this.prisma) {
    return null;
  }

  const tokenRecord = await this.prisma.refreshToken.findFirst({
    where: {
      token,
      isRevoked: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  return tokenRecord;
}
```
