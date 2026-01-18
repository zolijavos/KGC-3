# Hiba: Használaton Kívüli `request` paraméter a `refresh` metódusban

**Fájl:** `packages/core/auth/src/auth.controller.ts`
**Súlyosság:** ALACSONY

## Probléma

A `refresh` metódusban a `request` paraméter nincs használva.

## Bizonyíték

```typescript
// auth.controller.ts
async refresh(
  @Body() body: unknown,
  @Req() request: Request, // Nincs használva
  @Res({ passthrough: true }) response: Response
): Promise<RefreshResponse | ErrorResponse> {
  // ...
}
```

## Megoldás

Távolítsa el a felesleges `request` paramétert a metódus definíciójából.
