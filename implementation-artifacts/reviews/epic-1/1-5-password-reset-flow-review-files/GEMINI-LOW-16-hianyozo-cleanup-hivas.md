# Hiba: A `cleanupExpiredRateLimits` nincs meghívva a modul megsemmisülésekor

**Fájl:** `packages/core/auth/src/services/password-reset.service.ts`
**Súlyosság:** ALACSONY

## Probléma

Az `onModuleDestroy` metódus definiálva van, de nem hívja meg a `cleanupExpiredRateLimits`-t. Ez azt jelenti, hogy az intervallum továbbra is futni fog a modul megsemmisülése után.

## Bizonyíték

```typescript
// password-reset.service.ts
export class PasswordResetService implements OnModuleDestroy {
  // ...
  onModuleDestroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
  }

  private cleanupExpiredRateLimits(): void {
    // ...
  }
}
```

## Megoldás

Hívja meg a `cleanupExpiredRateLimits` metódust az `onModuleDestroy`-ban, hogy a memóriában lévő rate limit adatok törlődjenek a modul megsemmisülésekor.

```typescript
// password-reset.service.ts
onModuleDestroy(): void {
  if (this.cleanupIntervalId) {
    clearInterval(this.cleanupIntervalId);
  }
  this.cleanupExpiredRateLimits();
}
```
