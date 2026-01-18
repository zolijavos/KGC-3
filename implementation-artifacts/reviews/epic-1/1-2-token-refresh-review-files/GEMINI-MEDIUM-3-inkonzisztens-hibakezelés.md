# Hiba: Inkonzisztens Hibakezelés a `refresh` metódusban

**Fájl:** `packages/core/auth/src/auth.controller.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `refresh` metódus egy generikus `Error`-t kap el, majd a hibaüzenet szövege alapján dönti el, hogy `Invalid refresh token` hibáról van-e szó. Jobb lenne egy egyedi hibát dobni az `auth.service.ts`-ből, és azt elkapni a controllerben. Ez robusztusabbá tenné a hibakezelést.

## Bizonyíték

```typescript
// auth.controller.ts
try {
  const result = await this.authService.refreshTokens(refreshToken);
  return result;
} catch (error) {
  // AC3, AC4: Invalid refresh token (expired, revoked, wrong type, not found)
  if (error instanceof Error && error.message === 'Invalid refresh token') {
    response.status(HttpStatus.UNAUTHORIZED);
    return {
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Érvénytelen vagy lejárt refresh token',
      },
    };
  }
  // ...
}
```

## Megoldás

Dobjon egy egyedi `InvalidRefreshTokenError` hibát az `auth.service.ts`-ből, és a controllerben ezt a specifikus hibát kapja el.

```typescript
// auth.service.ts
if (!isValid) {
  throw new InvalidRefreshTokenError();
}

// auth.controller.ts
try {
  // ...
} catch (error) {
  if (error instanceof InvalidRefreshTokenError) {
    // ...
  }
  // ...
}
```
