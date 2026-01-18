# Hiba: A `validatePinFormat` privát, de belsőleg nem használt

**Fájl:** `packages/core/auth/src/services/pin.service.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `validatePinFormat` metódus privát, ami jó, de más publikus metódusok hívják. Jobb lenne statikus metódussá tenni, vagy egy megosztott utility fájlba helyezni, ha más service-ek is használni fogják.

## Bizonyíték

```typescript
// pin.service.ts
private validatePinFormat(pin: string): void {
  if (!pin || !PIN_REGEX.test(pin)) {
    throw new Error('PIN must be 4-6 numeric digits');
  }
}

async hashPin(pin: string): Promise<string> {
  this.validatePinFormat(pin);
  // ...
}
```

## Megoldás

Tegye a `validatePinFormat` metódust statikussá, vagy helyezze át egy megosztott `validation.utils.ts` fájlba.

```typescript
// pin.service.ts
static validatePinFormat(pin: string): void {
  // ...
}

async hashPin(pin: string): Promise<string> {
  PinService.validatePinFormat(pin);
  // ...
}
```
