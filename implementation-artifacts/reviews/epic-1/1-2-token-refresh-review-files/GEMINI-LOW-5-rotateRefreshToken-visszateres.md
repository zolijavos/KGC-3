# Hiba: A `rotateRefreshToken` nem adja vissza az új tokent

**Fájl:** `packages/core/auth/src/auth.service.ts`
**Súlyosság:** ALACSONY

## Probléma

A `rotateRefreshToken` metódus `Promise<string>` visszatérési típussal van deklarálva, de nem ad vissza semmit. Vissza kellene adnia az `newRefreshToken`-t.

## Bizonyíték

```typescript
// auth.service.ts
async rotateRefreshToken(oldTokenId: string, user: UserForToken): Promise<string> {
  // ...
  await this.prisma.$transaction([
    // ...
  ]);

  // Nincs visszatérési érték
}
```

## Megoldás

A metódusnak vissza kell adnia az `newRefreshToken` változót.

```typescript
// auth.service.ts
async rotateRefreshToken(oldTokenId: string, user: UserForToken): Promise<string> {
  const newRefreshToken = await this.tokenService.generateRefreshToken(user);

  // ...
  await this.prisma.$transaction([
    // ...
  ]);

  return newRefreshToken;
}
```
