# Hiba: Használaton Kívüli `deviceInfo` a `storeRefreshToken`-ben

**Fájl:** `packages/core/auth/src/auth.service.ts`
**Súlyosság:** ALACSONY

## Probléma

A `storeRefreshToken` metódusnak van egy `deviceInfo` paramétere, ami nincs használva.

## Bizonyíték

```typescript
// auth.service.ts
private async storeRefreshToken(userId: string, token: string, deviceInfo?: string): Promise<void> {
  if (!this.prisma) {
    return;
  }

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await this.prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
      // deviceInfo nincs használva
    },
  });
}
```

## Megoldás

Távolítsa el a felesleges `deviceInfo` paramétert a metódus definíciójából, vagy használja fel a `refreshToken` létrehozásakor.
