# Hiba: A `logoutAll` nem `Promise`-t ad vissza

**Fájl:** `packages/core/auth/src/auth.service.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `logoutAll` metódus az `auth.controller.ts`-ben `async` és `Promise`-t ad vissza, de a `logoutAll` metódus az `auth.service.ts`-ben nem `async` és nem ad vissza `Promise`-t. Ez inkonzisztens.

## Bizonyíték

```typescript
// auth.controller.ts
async logoutAll(
  @Req() request: AuthenticatedRequest
): Promise<LogoutAllResponse | ErrorResponse> {
  // ...
  const result = await this.authService.logoutAll(userId);
  // ...
}

// auth.service.ts
logoutAll(userId: string): LogoutAllResponse {
  const revokedCount = await this.revokeAllUserTokens(userId); // ERROR: await in non-async function
  // ...
}
```

## Megoldás

Tegye a `logoutAll` metódust az `auth.service.ts`-ben `async`-cá és `Promise`-t adjon vissza.

```typescript
// auth.service.ts
async logoutAll(userId: string): Promise<LogoutAllResponse> {
  const revokedCount = await this.revokeAllUserTokens(userId);
  // ...
}
```
