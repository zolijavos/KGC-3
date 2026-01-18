# Hiba: JWT Secret Kezelése a `token.service.ts`-ben

**Fájl:** `packages/core/auth/src/services/token.service.ts`
**Súlyosság:** MAGAS

## Probléma

A `jwtSecret` a konstruktorban van átadva és egy privát property-ben van tárolva. Bár ez nem direkt szivárgás, biztonságosabb lenne a `@Inject('JWT_SECRET')` dekorátort közvetlenül ott használni, ahol szükség van rá (`jwt.sign`, `jwt.verify`), hogy a secret hatóköre a lehető legszűkebb legyen.

## Bizonyíték

```typescript
// token.service.ts
constructor(@Inject('JWT_SECRET') @Optional() jwtSecret?: string, ...) {
  // ...
  this.jwtSecret = jwtSecret;
}
// ...
jwt.sign(payload, this.jwtSecret, { ... });
```

## Megoldás

Távolítsa el a `jwtSecret` property-t a service-ből. Injektálja a secret-et közvetlenül a metódusokba, ahol használva van, vagy használjon egy `ConfigService`-t a secret-ek biztonságos kezelésére.
