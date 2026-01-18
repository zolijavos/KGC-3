# Hiba: Inkonzisztens `as const` használat

**Fájl:** `packages/core/auth/src/dto/logout-response.dto.ts`
**Súlyosság:** ALACSONY

## Probléma

A `logout-response.dto.ts`-ben a `LOGOUT_ERROR_MESSAGES` és a `LOGOUT_MESSAGES` `as const`-al vannak definiálva. Ez jó gyakorlat, hogy megakadályozza a típusok `string`-re való szélesítését. Azonban a `LogoutErrorCode` enum nincs `as const`-al definiálva. Bár az enumok már eleve elég szigorúak, az `as const` használata bizonyos esetekben még nagyobb típusbiztonságot nyújthat.

## Bizonyíték

```typescript
// logout-response.dto.ts
export enum LogoutErrorCode {
  // ...
}

export const LOGOUT_ERROR_MESSAGES = {
  // ...
} as const;
```

## Megoldás

A konzisztencia érdekében fontolja meg a `LogoutErrorCode` enum cseréjét egy `as const`-al ellátott objektumra, vagy hagyja így, de dokumentálja a döntést. Az `as const` használata modernebb és flexibilisebb lehet.
