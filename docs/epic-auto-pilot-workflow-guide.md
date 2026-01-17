# Epic Auto-Pilot Workflow - Részletes Útmutató

## Áttekintés

Az **Epic Auto-Pilot** egy teljesen automatizált BMAD workflow, amely user beavatkozás nélkül végigviszi egy teljes epic fejlesztését. A workflow automatikusan:

- Létrehozza a story fájlokat
- Implementálja a kódot TDD módszerrel
- Elvégzi az adversarial code review-t
- Javítja a talált hibákat
- Lezárja a story-kat és az epic-et

---

## Workflow Metaadatok

| Tulajdonság | Érték |
|-------------|-------|
| **ID** | `epic-auto-pilot` |
| **Verzió** | 1.0.0 |
| **Kategória** | 4-implementation |
| **Fázis** | Implementation |
| **Agent** | dev |
| **Nyelv** | Hungarian |

---

## Mikor Használd?

### Ideális Esetekben

- **Jól definiált epic** - Az epic fájl tartalmazza az összes story definíciót
- **Független story-k** - A story-k egymástól függetlenül implementálhatók
- **Egyszerűbb logika** - Nem igényel komplex döntéseket fejlesztés közben
- **Háttér futtatás** - Éjszakai vagy háttérben futó fejlesztéshez
- **Prototípus gyártás** - Gyors MVP vagy proof-of-concept készítéshez

### Kerülendő Esetekben

- **Komplex architektúra döntések** - Ahol emberi mérlegelés szükséges
- **Külső integráció** - API-k vagy 3rd party rendszerek integrációja
- **UI/UX kritikus fejlesztés** - Ahol vizuális visszajelzés fontos
- **Biztonsági kritikus kód** - Auth, payment, stb. (inkább Dual-AI review)

---

## Paraméterek

### Kötelező Paraméterek

| Paraméter | Típus | Leírás |
|-----------|-------|--------|
| `epic_number` | string | Az epic száma (pl. "5" az Epic 5-höz) |

### Opcionális Paraméterek

| Paraméter | Típus | Default | Leírás |
|-----------|-------|---------|--------|
| `max_retries` | number | 3 | Maximum újrapróbálkozás story-nként hiba esetén |
| `review_strictness` | enum | `all` | Mely issue-kat kell javítani |
| `coverage_threshold` | number | 80 | Minimum coverage % (figyelmeztetés ha alatta) |
| `skip_on_failure` | boolean | true | Max retry után skip-elje a story-t és folytassa |

### Review Strictness Értékek

| Érték | Javítandó Issue-k | Mikor használd? |
|-------|-------------------|-----------------|
| `critical_only` | Csak CRITICAL | Gyors prototípus, POC |
| `critical_medium` | CRITICAL + MEDIUM | Normál fejlesztés |
| `all` | CRITICAL + MEDIUM + MINOR | Production-ready kód |

---

## Workflow Architektúra

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EPIC AUTO-PILOT                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  STEP 1: INICIALIZÁLÁS                                      │     │
│  │  ─────────────────────                                      │     │
│  │  • Sprint status betöltés (sprint-status.yaml)              │     │
│  │  • Epic fájl olvasás (epic-{n}.md)                          │     │
│  │  • Backlog story-k azonosítása                              │     │
│  │  • Target package meghatározás                              │     │
│  │  • Állapot változók inicializálás                           │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  STEP 2: STORY LOOP (while hasBacklogStories)               │     │
│  │  ────────────────────────────────────────────               │     │
│  │                                                              │     │
│  │    ┌──────────────┐                                         │     │
│  │    │ 2A. CREATE   │  • Story fájl generálás                 │     │
│  │    │    STORY     │  • Template kitöltés                    │     │
│  │    │              │  • Status: backlog → ready-for-dev      │     │
│  │    └──────┬───────┘                                         │     │
│  │           │                                                  │     │
│  │           ▼                                                  │     │
│  │    ┌──────────────┐                                         │     │
│  │    │ 2B. DEV      │  • TDD: Red-Green-Refactor              │     │
│  │    │    STORY     │  • Tesztek ELŐSZÖR                      │     │
│  │    │              │  • Status: ready → in-progress → review │     │
│  │    └──────┬───────┘                                         │     │
│  │           │                                                  │     │
│  │           ▼                                                  │     │
│  │    ┌──────────────┐                                         │     │
│  │    │ 2C. CODE     │  • Adversarial review (Claude only)     │     │
│  │    │    REVIEW    │  • Minimum 3 issue keresés              │     │
│  │    │              │  • Automatikus javítás                  │     │
│  │    └──────┬───────┘                                         │     │
│  │           │                                                  │     │
│  │           ▼                                                  │     │
│  │    ┌──────────────┐                                         │     │
│  │    │ 2D. COVERAGE │  • pnpm test:coverage futtatás          │     │
│  │    │    CHECK     │  • Threshold ellenőrzés                 │     │
│  │    │              │  • Warn if below (nem áll le)           │     │
│  │    └──────┬───────┘                                         │     │
│  │           │                                                  │     │
│  │           ▼                                                  │     │
│  │    ┌──────────────┐                                         │     │
│  │    │ 2E. MARK     │  • Status: → done                       │     │
│  │    │    DONE      │  • Story fájl frissítés                 │     │
│  │    │              │  • Következő story vagy exit            │     │
│  │    └──────────────┘                                         │     │
│  │                                                              │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  STEP 3: EPIC LEZÁRÁS                                       │     │
│  │  ────────────────────                                       │     │
│  │  • Epic status: → done                                      │     │
│  │  • Összefoglaló statisztikák                                │     │
│  │  • Processed/Skipped listák                                 │     │
│  └────────────────────────────────────────────────────────────┘     │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  STEP 4: EPIC RETROSPECTIVE                                 │     │
│  │  ──────────────────────────                                 │     │
│  │  • Sikeres/sikertelen story-k elemzése                      │     │
│  │  • Lessons learned dokumentálás                             │     │
│  │  • Következő epic-re vonatkozó javaslatok                   │     │
│  │  • Retro fájl generálása                                    │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Lépések Részletezése

### Step 1: Inicializálás

#### Betöltendő fájlok

1. **Sprint Status** (`implementation-artifacts/sprint-status.yaml`)
   - Epic story-k azonosítása
   - Státusz ellenőrzés (backlog, drafted, stb.)

2. **Epic File** (`planning-artifacts/epics/epic-{n}.md`)
   - Story definíciók
   - Acceptance criteria
   - Technical context

3. **Development Principles** (`docs/kgc3-development-principles.md`)
   - TDD/ATDD szabályok
   - Kódolási konvenciók

#### Package Mapping

| Epic | Package |
|------|---------|
| Epic 1 | `@kgc/auth` |
| Epic 2 | `@kgc/users` |
| Epic 3 | `@kgc/tenant` |
| Epic 4 | `@kgc/config` |
| Epic 5 | `@kgc/ui` |
| Epic 6 | `@kgc/audit` |

#### Inicializált Állapot

```javascript
{
  processed_stories: [],      // Sikeresen befejezett story-k
  skipped_stories: [],        // Kihagyott story-k (max retry után)
  current_retry_count: 0,     // Aktuális retry számláló
  epic_complete: false        // Epic befejezettség flag
}
```

---

### Step 2A: Story Létrehozás

A `bmad:bmm:workflows:create-story` workflow-t hívja automatikusan.

#### Folyamat

1. Epic fájlból story definíció kiolvasása
2. Story markdown fájl generálása
3. Sprint status frissítése: `backlog → ready-for-dev`

#### Generált Story Struktúra

```markdown
# Story {story_id}: {title}

## Status: ready-for-dev

## User Story
As a [role], I want [feature] so that [benefit].

## Acceptance Criteria
- [ ] AC1: ...
- [ ] AC2: ...
- [ ] AC3: ...

## Tasks
1. Task 1
2. Task 2
3. Task 3

## Technical Notes
- Package: @kgc/{package}
- Dependencies: ...
- Files to create/modify: ...
```

---

### Step 2B: Story Implementálás

A `bmad:bmm:workflows:dev-story` workflow-t hívja automatikusan.

#### TDD Folyamat (Red-Green-Refactor)

```
┌─────────────────────────────────────────────────────────┐
│  RED PHASE - Failing Tests                              │
│  ───────────────────────                                │
│  1. Acceptance criteria → Test cases                    │
│  2. Tesztek megírása (FIRST!)                          │
│  3. Tesztek FAILELNEK (expected)                       │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  GREEN PHASE - Make Tests Pass                          │
│  ─────────────────────────────                          │
│  1. Minimum kód írása a tesztek átmenéséhez            │
│  2. Csak annyi kód, ami KELL                           │
│  3. Tesztek ZÖLDEK                                     │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  REFACTOR PHASE - Clean Code                            │
│  ───────────────────────────                            │
│  1. Kód tisztítás (DRY, SOLID)                         │
│  2. Tesztek továbbra is ZÖLDEK                         │
│  3. Status: → review                                   │
└─────────────────────────────────────────────────────────┘
```

#### Automatikus Hibajavítás

Ha a tesztek failelnek:
1. Hibaüzenet elemzése
2. Kód automatikus javítása
3. Tesztek újrafuttatása
4. Ismétlés max `{max_retries}` alkalommal

---

### Step 2C: Code Review

Adversarial code review automatikus javítással.

#### Review Kritériumok (BMAD szabály: min. 3 issue)

| Kategória | Leírás | Példák |
|-----------|--------|--------|
| **CRITICAL** | Biztonsági, adatvesztés, crash | SQL injection, null pointer, memory leak |
| **MEDIUM** | Teljesítmény, maintainability | N+1 query, code duplication, missing error handling |
| **MINOR** | Style, naming, minor refactor | Naming convention, magic numbers, missing types |

#### Ellenőrzési Checklist

- [ ] TypeScript strict compliance
- [ ] Tesztek megfelelő coverage-gel (80%+)
- [ ] Nincs hardcoded érték
- [ ] Error handling megfelelő
- [ ] Acceptance criteria teljesül
- [ ] Development principles betartva
- [ ] Nincs security vulnerability
- [ ] Nincs console.log/debug kód
- [ ] Import-ok rendezettek

#### Strictness Szerinti Javítás

| `review_strictness` | Javítandó |
|---------------------|-----------|
| `critical_only` | CRITICAL |
| `critical_medium` | CRITICAL + MEDIUM |
| `all` | CRITICAL + MEDIUM + MINOR |

---

### Step 2D: Coverage Ellenőrzés

#### Parancs

```bash
pnpm test:coverage --filter @kgc/{package}
```

#### Threshold Kezelés

| Coverage | Threshold | Eredmény |
|----------|-----------|----------|
| 85% | 80% | ✅ OK - folytatódik |
| 75% | 80% | ⚠️ WARNING - folytatódik (logolva) |
| 50% | 80% | ⚠️ WARNING - folytatódik (logolva) |

**Fontos:** A coverage alatt nem áll le a workflow, csak figyelmeztetést logol!

---

### Step 2E: Story Lezárás

#### Sprint Status Frissítés

```yaml
stories:
  5-1-shadcn-ui-setup: done
  5-2-layout-navigation: in-progress  # következő
```

#### Story File Frissítés

```markdown
## Status: done

## Completion
- Date: 2026-01-16
- Tests: 15 passed
- Coverage: 87%
```

---

### Step 3: Epic Lezárás

#### Összefoglaló Output

```
═══════════════════════════════════════════════════════
  EPIC 5 COMPLETE ✅
═══════════════════════════════════════════════════════

📊 Statisztikák:
   - Feldolgozott story-k: 4
   - Kihagyott story-k: 0

📝 Feldolgozott:
   ✅ 5-1-shadcn-ui-setup
   ✅ 5-2-layout-navigation
   ✅ 5-3-pwa-service-worker
   ✅ 5-4-offline-caching

⚠️ Kihagyott:
   (nincs)

🎯 Következő lépés:
   - Step 4: Epic Retrospective automatikusan indul...

═══════════════════════════════════════════════════════
```

---

### Step 4: Epic Retrospective

Az Epic Retrospective a workflow **kötelező záró lépése**, amely automatikusan fut az epic lezárása után.

#### Célja

1. **Sikerelemzés** - Mi működött jól?
2. **Problémák azonosítása** - Mi okozott nehézséget?
3. **Lessons learned** - Tanulságok dokumentálása
4. **Javaslatok** - Következő epic-hez ajánlások

#### Folyamat

```
┌─────────────────────────────────────────────────────────┐
│  4A. ADATGYŰJTÉS                                         │
│  ────────────────                                        │
│  • Story fájlok olvasása (completion status, issues)     │
│  • Code review eredmények összegzése                     │
│  • Coverage adatok gyűjtése                              │
│  • Skipped/failed story-k elemzése                       │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  4B. ELEMZÉS                                             │
│  ───────────                                             │
│  • Sikeres pattern-ek azonosítása                        │
│  • Ismétlődő problémák felismerése                       │
│  • TDD compliance értékelés                              │
│  • Workflow hatékonyság mérése                           │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  4C. DOKUMENTÁLÁS                                        │
│  ──────────────                                          │
│  • Retro fájl generálása (epic-{n}-retro-{date}.md)     │
│  • Lessons learned szekció                               │
│  • Action items következő epic-hez                       │
│  • Metrikák összefoglaló táblázat                        │
└─────────────────────────────────────────────────────────┘
```

#### Generált Retro Fájl Struktúra

```markdown
# Epic {n} Retrospective - {date}

## Összefoglaló

| Metrika | Érték |
|---------|-------|
| Story-k össz. | 6 |
| Sikeres | 6 |
| Kihagyott | 0 |
| Átlag coverage | 87% |
| Code review issues | 18 |

## Mi működött jól? ✅

- TDD folyamat konzisztens volt
- Tesztek hamar elkapták a hibákat
- Service pattern jól működött

## Mi okozott nehézséget? ⚠️

- Memory issues teszt futtatásnál
- Mock setup bonyolult volt
- ...

## Lessons Learned 📚

1. **Teszt futtatás**: Használj `--sequence.concurrent=false` flag-et nagy package-eknél
2. **Mock pattern**: Mindig ellenőrizd a teljes call chain-t
3. ...

## Action Items következő Epic-hez 🎯

- [ ] Memory limit növelése CI-ben
- [ ] Mock helper utilities létrehozása
- [ ] ...

## Code Review Summary

| Story | Issues Found | Fixed | Severity |
|-------|--------------|-------|----------|
| {n}-1 | 4 | 4 | 2M, 2L |
| {n}-2 | 3 | 3 | 1M, 2L |
| ... | ... | ... | ... |
```

#### Output Fájl

```
implementation-artifacts/epic-{n}-retro-{date}.md
```

**Példa:** `implementation-artifacts/epic-3-retro-2026-01-16.md`

#### Automatikus Elemzési Szempontok

| Szempont | Vizsgálat |
|----------|-----------|
| **TDD Compliance** | Tesztek előbb íródtak-e? |
| **Coverage Trend** | Növekedett-e a coverage? |
| **Review Efficiency** | Hány issue lett javítva vs. kihagyva? |
| **Retry Rate** | Hány story igényelt retry-t? |
| **Pattern Detection** | Ismétlődő hibák azonosítása |

---

## Hibakezelés

### Retry Logika

```
┌─────────────────────────────────────────────────────────┐
│  HIBA TÖRTÉNT                                           │
│                                                          │
│  retry_count < max_retries?                             │
│       │                                                  │
│       ├─── IGEN → retry_count++ → Újrapróbálás          │
│       │                                                  │
│       └─── NEM → Skip story → skipped_stories.push()    │
│                       │                                  │
│                       ▼                                  │
│              skipped_stories.length > 2?                │
│                       │                                  │
│                       ├─── IGEN → CRITICAL STOP ❌       │
│                       │                                  │
│                       └─── NEM → Következő story        │
└─────────────────────────────────────────────────────────┘
```

### Hiba Típusok és Kezelésük

| Hiba Típus | Kezelés | Max Retry |
|------------|---------|-----------|
| **Test Failure** | Auto-fix + retry | 3 |
| **Review Issue** | Auto-fix + retry | 3 |
| **Story Failure** | Skip + continue | - |
| **File I/O Error** | CRITICAL STOP | - |
| **Package Not Found** | CRITICAL STOP | - |

### Critical Stop Triggerek

- Több mint 2 story kihagyva
- Nem olvasható/írható fájl
- Package nem található
- Sprint status fájl hibás

---

## Input/Output Fájlok

### Input Fájlok

| Fájl | Kötelező | Leírás |
|------|----------|--------|
| `implementation-artifacts/sprint-status.yaml` | ✅ | Sprint állapot és story státuszok |
| `planning-artifacts/epics/epic-{n}.md` | ✅ | Epic definíció és story-k |
| `docs/kgc3-development-principles.md` | ⚠️ | TDD/ATDD szabályok (ajánlott) |

### Output Fájlok

| Fájl | Leírás |
|------|--------|
| `implementation-artifacts/stories/{epic}-*.md` | Generált story fájlok |
| `implementation-artifacts/reviews/epic-{n}/` | Review dokumentumok |
| `implementation-artifacts/logs/epic-{n}-autopilot.log` | Futási log |
| `implementation-artifacts/epic-{n}-retro-{date}.md` | Epic retrospective dokumentum |

---

## Delegált Workflow-k

Az Epic Auto-Pilot a következő BMAD workflow-kat hívja:

| Workflow | Mikor | Célja |
|----------|-------|-------|
| `bmad:bmm:workflows:create-story` | Story létrehozás | Backlog → Ready-for-dev |
| `bmad:bmm:workflows:dev-story` | Implementáció | TDD fejlesztés |
| `bmad:bmm:workflows:code-review` | Review | Adversarial review + auto-fix |
| `bmad:bmm:workflows:retrospective` | Epic lezárás után | Lessons learned + action items |

**Megjegyzés:** A code-review CSAK Claude-ot használ, nincs Dual-AI (Gemini) review!

---

## Használati Példák

### Alapvető Használat

```bash
# Epic 5 automatikus feldolgozása
/bmad:bmm:workflows:epic-auto-pilot epic_number=5
```

### Szigorúbb Review-val

```bash
# Minden issue javítása, 90% coverage threshold
/bmad:bmm:workflows:epic-auto-pilot \
  epic_number=5 \
  review_strictness=all \
  coverage_threshold=90
```

### Gyors Prototípus (lazább beállítások)

```bash
# Csak kritikus hibák javítása, alacsony coverage
/bmad:bmm:workflows:epic-auto-pilot \
  epic_number=5 \
  review_strictness=critical_only \
  coverage_threshold=60 \
  max_retries=5
```

### Szigorú Mód (nem skip-el)

```bash
# Ha bármi hiba, álljon le
/bmad:bmm:workflows:epic-auto-pilot \
  epic_number=5 \
  skip_on_failure=false \
  max_retries=5
```

---

## Összehasonlítás: Auto-Pilot vs Manuális

| Szempont | Epic Auto-Pilot | Manuális Workflow-k |
|----------|-----------------|---------------------|
| **User beavatkozás** | Nincs | Minden lépésnél |
| **Review típus** | Claude only | Dual-AI (Claude + Gemini) |
| **Döntéshozatal** | Automatikus | User dönt |
| **Sebesség** | Gyors | Lassabb |
| **Minőség kontroll** | Alapszintű | Magas |
| **Ideális** | Egyszerű epic-ek | Komplex fejlesztés |

---

## Best Practices

### DO ✅

- Használj jól definiált epic fájlokat
- Ellenőrizd a sprint-status.yaml-t indítás előtt
- Állíts be megfelelő coverage threshold-ot
- Futtasd éjszaka vagy háttérben
- **Várj a retrospective befejezéséig** - ez kötelező lépés!
- Használd a retro action items-eket a következő epic-nél

### DON'T ❌

- Ne használd komplex architektúra döntésekhez
- Ne használd security-kritikus kódhoz (auth, payment)
- Ne hagyatkozz 100%-ban az auto-fix-re
- Ne skip-elj több mint 2 story-t
- Ne futtasd Dual-AI review nélkül production kódra

---

## Kapcsolódó Dokumentumok

- [Development Principles](./kgc3-development-principles.md) - TDD/ATDD módszertan
- [Dual-AI Code Review Guide](./dual-ai-code-review-guide.md) - Manuális review folyamat
- [Sprint Status](../implementation-artifacts/sprint-status.yaml) - Aktuális sprint állapot
- [BMAD Retrospective Workflow](./_bmad/bmm/workflows/retrospective/) - Retrospective workflow részletek

---

## Verzió Történet

| Verzió | Dátum | Változások |
|--------|-------|------------|
| 1.1.0 | 2026-01-16 | Step 4: Epic Retrospective hozzáadva |
| 1.0.0 | 2026-01-16 | Kezdeti verzió |
