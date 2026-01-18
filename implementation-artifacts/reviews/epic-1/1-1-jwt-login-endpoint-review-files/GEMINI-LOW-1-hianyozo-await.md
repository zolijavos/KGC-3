# Hiba: Hiányzó `await` a `login` metódusban

**Fájl:** `packages/core/auth/src/auth.controller.ts`
**Súlyosság:** ALACSONY

## Probléma

A `recordLoginAttempt` hívások a `login` metódusban nincsenek `await`-elve. Bár ez nem blokkolja a login folyamatot, a promise-ok `await`-elése biztosítja, hogy a művelet befejeződik a metódus visszatérése előtt.

## Bizonyíték

```typescript
// Nincs await
this.authService.recordLoginAttempt(email, ipAddress, true, userAgent);
```

## Megoldás

Adjon `await`-et a `recordLoginAttempt` hívások elé.

```typescript
await this.authService.recordLoginAttempt(email, ipAddress, true, userAgent);
```
