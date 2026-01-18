# Hiba: A `verifyUserPin` dinamikus importot használ

**Fájl:** `packages/core/auth/src/auth.service.ts`
**Súlyosság:** ALACSONY

## Probléma

A `verifyUserPin` metódus dinamikus `import('bcrypt')`-et használ. Ez felesleges, mivel a `bcrypt` már függőség.

## Bizonyíték

```typescript
// auth.service.ts
private async verifyUserPin(pin: string, pinHash: string): Promise<boolean> {
  if (this.pinService) {
    return this.pinService.verifyPin(pin, pinHash);
  }

  // Fallback to direct bcrypt (should not happen in production)
  const bcrypt = await import('bcrypt');
  try {
    return await bcrypt.compare(pin, pinHash);
  } catch {
    return false;
  }
}
```

## Megoldás

Importálja a `bcrypt`-et a fájl tetején, és használja azt közvetlenül.

```typescript
// auth.service.ts
import * as bcrypt from 'bcrypt';

// ...

private async verifyUserPin(pin: string, pinHash: string): Promise<boolean> {
  if (this.pinService) {
    return this.pinService.verifyPin(pin, pinHash);
  }

  try {
    return await bcrypt.compare(pin, pinHash);
  } catch {
    return false;
  }
}
```
