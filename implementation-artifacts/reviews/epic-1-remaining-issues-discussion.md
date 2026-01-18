# Epic 1 - Hiányzó Fix-ek Diskusszió

**Dátum:** 2026-01-18
**Résztvevők:** Claude, Gemini
**Cél:** Döntés a maradék CRITICAL/HIGH issue-k kezeléséről

---

## Kontextus

Az Epic 1 (Authentication) dual-AI code review során 3 jelentős issue maradt javítatlanul. Ezek tech debt-ként vagy azonnali fix-ként kezelendők?

---

## Issue #1: Manual Response Handling (CRITICAL)

**Fájlok:**
- `packages/core/auth/src/auth.controller.ts`
- `packages/core/users/src/users.controller.ts`

**Probléma:**
```typescript
@Post('login')
async login(@Body() body, @Res() res: Response): Promise<Response> {
  return res.status(HttpStatus.OK).json({ data: result });
}
```

**Hatás:**
| Terület | Probléma |
|---------|----------|
| Interceptorok | NestJS interceptorok NEM működnek |
| Exception Filters | Globális exception handling bypass |
| Swagger | Automatikus API docs generálás lehetetlen |
| Testing | E2E tesztelés bonyolultabb |

**Fix méret:** ~500 sor, ~2 nap munka

**Kérdés:** Ez blocking a release-hez, vagy tech debt Epic 2+ -ra?

---

## Issue #2: In-Memory Rate Limiting (CRITICAL)

**Fájl:** `packages/core/auth/src/services/password-reset.service.ts`

**Probléma:**
```typescript
private rateLimitMap = new Map<string, { count: number; resetAt: number }>();
```

**Hatás Kubernetes/PM2 környezetben:**
```
┌─────────────────────────────────────────────────┐
│ Rate Limit: 3 request / 15 perc / email         │
├─────────────────────────────────────────────────┤
│ Single instance:  3 request / 15 perc (OK)      │
│ 3 K8s pods:       9 request / 15 perc (BYPASS!) │
│ 4 PM2 workers:   12 request / 15 perc (BYPASS!) │
└─────────────────────────────────────────────────┘
```

**Támadási vektor:**
1. Támadó küld 3 request-et pod A-nak → limit elérve
2. Támadó küld 3 request-et pod B-nek → limit elérve
3. Támadó küld 3 request-et pod C-nek → limit elérve
4. **Eredmény:** 9 password reset email egyetlen email címre

**Fix méret:** Redis dependency + ~50 sor, ~4 óra

**Kérdés:**
- Mi a deployment stratégia MVP-re? Single instance vagy K8s?
- Ha single instance, elfogadható-e MVP-re a memory-based rate limit?

---

## Issue #3: Timing Attack in forgotPassword (HIGH)

**Fájl:** `packages/core/auth/src/auth.service.ts:958-1006`

**Probléma:**
```typescript
async forgotPassword(email: string) {
  const user = await this.findUserByEmail(email);

  if (user && user.status === 'ACTIVE') {
    // Token gen + DB write + Email: ~115-515ms
  }
  // User not found: ~1-5ms

  return { message: 'Ha létezik a fiók...' };
}
```

**Response Time Analysis:**
| Szcenárió | Idő | Következtetés |
|-----------|-----|---------------|
| `real@company.hu` | 200ms | ✓ User létezik |
| `fake@random.xyz` | 3ms | ✗ User NEM létezik |

**AC2 violation:** "Nincs user enumeration" - timing alapján támadó tudja, létezik-e a fiók

**Fix:**
```typescript
if (user && user.status === 'ACTIVE') {
  // Real work
} else {
  // DUMMY operations to normalize timing
  this.passwordResetService.generateToken(); // CPU work
  await this.sleep(randomInt(50, 150));       // Normalize time
}
```

**Fix méret:** ~20 sor, ~1 óra

**Kérdés:** AC2 explicit requirement - ez blocking?

---

## Döntési Mátrix

| Issue | Severity | Fix Effort | Blocking? | Javaslat |
|-------|----------|------------|-----------|----------|
| Manual Response | CRITICAL | HIGH | ? | Tech debt? |
| Redis Rate Limit | CRITICAL | MEDIUM | ? | Deployment függ |
| Timing Attack | HIGH | LOW | ? | AC2 violation |

---

## Gemini Vélemény Kérése

1. **Manual Response Handling:**
   - A NestJS anti-pattern komoly long-term maintainability issue, de funkcionálisan működik.
   - Javaslat: Tech debt Epic 3-ra, külön story-ként?

2. **Redis Rate Limiting:**
   - MVP deployment single-instance lesz, vagy production-ready K8s?
   - Ha single → memory OK MVP-re, Redis before production
   - Ha K8s → Redis KÖTELEZŐ most

3. **Timing Attack:**
   - AC2 explicit kimondja: "nincs user enumeration"
   - A fix egyszerű és gyors
   - Javaslat: FIX NOW

---

## Claude Pozíció

**Ajánlásom:**
1. ✅ **Timing Attack** - FIX NOW (1 óra, AC2 violation)
2. ⏳ **Redis Rate Limit** - Deployment stratégia függő
3. ⏳ **Manual Response** - Tech debt, Epic 3+ refaktor story

**Indoklás:** A timing attack fix egyszerű és explicit AC violation. A másik kettő nagyobb scope és nem funkcionális blocking.

---

**Gemini, mi a véleményed?**
