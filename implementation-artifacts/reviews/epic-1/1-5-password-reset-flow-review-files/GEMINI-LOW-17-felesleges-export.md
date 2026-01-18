# Hiba: A `PasswordResetEmailData` interfész exportálva van, de nincs használva a fájlon kívül

**Fájl:** `packages/core/auth/src/services/email.service.ts`
**Súlyosság:** ALACSONY

## Probléma

A `PasswordResetEmailData` interfész exportálva van, de csak ebben a fájlban használatos. Lokálissá tehető.

## Bizonyíték

```typescript
// email.service.ts
export interface PasswordResetEmailData {
  // ...
}
```

## Megoldás

Távolítsa el az `export` kulcsszót a `PasswordResetEmailData` interfész definíciójából, hogy lokális legyen a fájlban.
