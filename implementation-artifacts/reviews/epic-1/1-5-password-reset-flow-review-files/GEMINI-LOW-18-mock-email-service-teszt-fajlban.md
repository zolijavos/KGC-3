# Hiba: A `MockEmailService`-nek egy külön tesztfájlban kellene lennie

**Fájl:** `packages/core/auth/src/services/email.service.ts`
**Súlyosság:** ALACSONY

## Probléma

A `MockEmailService` egy mock implementáció teszteléshez. Ennek egy külön `*.spec.ts` vagy `*.test.ts` fájlban kellene lennie.

## Bizonyíték

```typescript
// email.service.ts
@Injectable()
export class MockEmailService implements IEmailService {
  // ...
}
```

## Megoldás

Hozzon létre egy `packages/core/auth/src/services/email.service.mock.ts` vagy hasonló nevű fájlt, és helyezze át a `MockEmailService` osztályt oda. Ez tisztábbá teszi a kódot, és elválasztja a tesztelési logikát a termelési kódtól.
