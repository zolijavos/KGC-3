# Hiba: Inkonzisztens Hibaüzenet az `auth.controller.ts`-ben

**Fájl:** `packages/core/auth/src/auth.controller.ts`
**Súlyosság:** KÖZEPES

## Probléma

A generikus szerverhiba üzenete a `login` metódusban "Szerverhiba történt", míg a `refresh` és `logout` metódusokban "Szerverhiba történt". Ez egy apró inkonzisztencia, de a konzisztencia érdekében érdemes javítani.

## Bizonyíték

```typescript
// login metódus
message: 'Szerverhiba történt'

// refresh metódus
message: 'Szerverhiba történt'
```

## Megoldás

Egységesítse a hibaüzenetet "Szerverhiba történt"-re minden metódusban.
