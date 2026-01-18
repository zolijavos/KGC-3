# Hiba: A `TrustedDevice` interfész duplikálva van

**Fájl:** `packages/core/auth/src/services/trusted-device.service.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `TrustedDevice` interfész definiálva van ebben a fájlban, de a `prisma/schema.prisma` fájlban is. Az interfészt a Prisma kliensből kellene importálni.

## Bizonyíték

```typescript
// trusted-device.service.ts
export interface TrustedDevice {
  id: string;
  // ...
}
```

## Megoldás

Távolítsa el a `TrustedDevice` interfész definícióját, és importálja a Prisma kliensből.

```typescript
// trusted-device.service.ts
import type { TrustedDevice } from '@prisma/client';
```
