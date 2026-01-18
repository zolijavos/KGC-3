# Hiba: A memóriában tárolt rate limiting nem alkalmas éles környezetben

**Fájl:** `packages/core/auth/src/services/password-reset.service.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `rateLimitMap` egy memóriában tárolt térkép, ami azt jelenti, hogy minden alkalommal visszaáll, amikor az alkalmazás újraindul. Ez nem alkalmas éles környezetben. A rate limitinghez egy elosztott gyorsítótárat, például Redis-t kellene használni.

## Bizonyíték

```typescript
// password-reset.service.ts
export class PasswordResetService implements OnModuleDestroy {
  /** In-memory rate limiting (for email-based limiting) */
  private rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  // ...
}
```

## Megoldás

Használjon egy elosztott gyorsítótárat, mint például a Redis, a rate limit adatok tárolására. Ez biztosítja, hogy a rate limit állapota megmarad az alkalmazás újraindítása után is, és több node-on is konzisztens marad.
