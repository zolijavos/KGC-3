# Hiba: Használaton Kívüli Import az `auth.controller.ts`-ben

**Fájl:** `packages/core/auth/src/auth.controller.ts`
**Súlyosság:** ALACSONY

## Probléma

Az `ELEVATED_ACCESS_SERVICE` importálva van, de nincs használva a fájlban.

## Bizonyíték

```typescript
// auth.controller.ts
import { ELEVATED_ACCESS_SERVICE } from './interfaces/elevated-access.interface'; // Nincs használva
```

## Megoldás

Távolítsa el a felesleges importot.
