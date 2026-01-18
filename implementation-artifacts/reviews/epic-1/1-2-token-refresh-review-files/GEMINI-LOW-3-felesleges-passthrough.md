# Hiba: Felesleges `passthrough: true` a `@Res()` dekorátorban

**Fájl:** `packages/core/auth/src/auth.controller.ts`
**Súlyosság:** ALACSONY

## Probléma

A `@Res({ passthrough: true })` dekorátorban a `passthrough: true` opció felesleges, ha a metódus `undefined` vagy `null` értéken kívül mást ad vissza. A NestJS automatikusan kezeli a választ.

## Bizonyíték

```typescript
// auth.controller.ts
async refresh(
  @Body() body: unknown,
  @Res({ passthrough: true }) response: Response
): Promise<RefreshResponse | ErrorResponse> {
  // ...
  return result;
}
```

## Megoldás

Távolítsa el a `passthrough: true` opciót a `@Res()` dekorátorból, és a `response` objektumot csak a status kód beállítására használja.

```typescript
async refresh(
  @Body() body: unknown,
  @Res() response: Response
): Promise<RefreshResponse | ErrorResponse> {
  // ...
  if (!validationResult.success) {
    return response.status(HttpStatus.BAD_REQUEST).send({
      error: validationResult.error,
    });
  }
  // ...
  return response.status(HttpStatus.OK).send(result);
}
```
Vagy, ha a `response` objektumot egyáltalán nem használja, távolítsa el teljesen.
