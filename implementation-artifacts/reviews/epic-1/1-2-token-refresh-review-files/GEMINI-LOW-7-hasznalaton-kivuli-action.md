# Hiba: Használaton Kívüli `Action` az `AUDIT_SERVICE`-ből

**Fájl:** `packages/core/auth/src/auth.service.ts`
**Súlyosság:** ALACSONY

## Probléma

Az `AuditAction` importálva van az `audit.interface.ts`-ből, de nincs használva a fájlban.

## Bizonyíték

```typescript
// auth.service.ts
import { AUDIT_SERVICE, AuditAction, type IAuditService } from './interfaces/audit.interface';
```

## Megoldás

Távolítsa el a felesleges `AuditAction` importot.
