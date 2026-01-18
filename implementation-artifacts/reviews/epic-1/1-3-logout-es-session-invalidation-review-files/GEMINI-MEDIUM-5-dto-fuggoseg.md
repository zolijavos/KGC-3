# Hiba: A `ValidationError` a `login.dto.ts`-ből van importálva

**Fájl:** `packages/core/auth/src/dto/logout.dto.ts`
**Súlyosság:** KÖZEPES

## Probléma

A `logout.dto.ts` fájl a `ValidationError` típust a `login.dto.ts`-ből importálja. Ez függőséget hoz létre a két DTO fájl között. Jobb lenne egy külön, megosztott `error.dto.ts` fájlt létrehozni a közös hibatípusok számára.

## Bizonyíték

```typescript
// logout.dto.ts
import type { ValidationError } from './login.dto';
```

## Megoldás

Hozzon létre egy `packages/core/auth/src/dto/error.dto.ts` fájlt, és helyezze át a `ValidationError` interfészt oda. Ezután mindkét DTO fájl ebből az új fájlból importálja a típust.
