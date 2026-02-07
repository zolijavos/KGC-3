---
name: yolo-story-pipeline
description: 'Automatikus Story Pipeline - yolo módban végigmegy a teljes story fejlesztési cikluson minimális user interakcióval'
version: 1.0.0
created: 2026-02-07
author: BMAD Workflow Builder
tags: [story, tdd, code-review, tea, automation, yolo]
---

# YOLO Story Pipeline

**Cél:** Automatizált story fejlesztési ciklus - lezárás → következő story → TDD implementáció → code review → TEA teszt → lezárás.

**Mód:** YOLO - minimális user interakció, auto-proceed ahol lehet, csak BLOCKER esetén áll meg.

---

## WORKFLOW ARCHITEKTÚRA

### Ciklus Áttekintés

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: STORY LEZÁRÁS                                      │
│  → Aktuális story DONE státuszra                            │
│  → sprint-status.yaml frissítés                             │
│  → Git commit                                               │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: KÖVETKEZŐ STORY INDÍTÁS                            │
│  → Epic backlog scan (sorrendben)                           │
│  → Story fájl létrehozás (create-story pattern)             │
│  → Státusz: ready-for-dev                                   │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: TDD IMPLEMENTÁCIÓ                                  │
│  → Tesztek ELŐBB (szigorú TDD)                              │
│  → Pénzügyi: TDD KÖTELEZŐ                                   │
│  → Implementáció (dev-story pattern)                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: ADVERSARIAL CODE REVIEW                            │
│  → Minimum 3 hiba keresése                                  │
│  → HIGH+MEDIUM auto-fix                                     │
│  → Újrafuttatás ha szükséges                                │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: TEA TESZT VALIDÁLÁS                                │
│  → Tesztek futtatása                                        │
│  → Lefedettség ellenőrzés (80%)                             │
│  → Kockázat értékelés                                       │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 6: FINALIZÁLÁS                                        │
│  → Story DONE                                               │
│  → Git commit                                               │
│  → VISSZA STEP 1-RE (következő story)                       │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 7: EPIC LEZÁRÁS (Epic utolsó story után)              │
│  → Epic státusz DONE                                        │
│  → sprint-status.yaml frissítés                             │
│  → Git commit + PUSH to remote                              │
└─────────────────────────────────────────────────────────────┘
```

### Yolo Mód Szabályok

- **AUTO-PROCEED:** Minden lépés automatikusan folytatódik sikeres befejezés után
- **SKIP BLOCKER:** Blokkolt story-t átugorja, következőre lép
- **MIN INTERACTION:** Csak kritikus döntéseknél áll meg
- **AUTO-FIX:** HIGH és MEDIUM hibákat automatikusan javítja
- **AUTO-COMMIT:** Minden lépés után commit

### Konfiguráció

```yaml
story_selection: sequential # Sorban az epic-ben
epic_boundary: auto_continue # Automatikusan átlép
sprint_boundary: respect # Sprint határokat tiszteli
tdd_mode: strict # Teszt ELŐBB
financial_tdd: mandatory # Pénzügyi: kötelező
min_issues: 3 # Code review minimum
auto_fix: high_medium # AUTO-FIX szint
tea_level: quick # Gyors teszt review
coverage_threshold: 80 # Lefedettségi küszöb
git_commit: per_step # Lépésenkénti commit
git_push: per_epic # Epic végén push to remote
blocker_handling: skip_next # Skip és tovább
test_scope: unit # Unit tesztek
report: summary_end # Végén összefoglaló
```

---

## INICIALIZÁLÁS

### 1. Konfiguráció Betöltés

Töltsd be: `{project-root}/_bmad/bmm/config.yaml`

- `project_name`, `user_name`, `communication_language`
- `implementation_artifacts` → story fájlok helye
- Sprint-status: `implementation-artifacts/sprint-status.yaml`

### 2. Aktuális Állapot Felmérés

Olvasd be:

1. `sprint-status.yaml` - aktuális sprint és story státuszok
2. Aktív story fájl (ha van `in-progress` státuszú)
3. Epic fájlok a backlog-ból

### 3. Indítás

**HA van in-progress story:**
→ Kérdezd meg: "Folytatom a [story-id] story-t? [Y/n]"
→ Ha Y: Ugorj STEP 3-ra (TDD implementáció)
→ Ha n: Ugorj STEP 1-re (lezárás)

**HA nincs in-progress story:**
→ Ugorj STEP 2-re (következő story)

**HA nincs több story a backlog-ban:**
→ "Minden story DONE! Sprint COMPLETE."
→ Készíts összefoglaló riportot

---

## LÉPÉSEK

### STEP 1: Story Lezárás

Töltsd be és hajtsd végre: `steps/step-01-close-story.md`

### STEP 2: Következő Story

Töltsd be és hajtsd végre: `steps/step-02-next-story.md`

### STEP 3: TDD Implementáció

Töltsd be és hajtsd végre: `steps/step-03-tdd-implement.md`

### STEP 4: Code Review

Töltsd be és hajtsd végre: `steps/step-04-code-review.md`

### STEP 5: TEA Teszt

Töltsd be és hajtsd végre: `steps/step-05-tea-test.md`

### STEP 6: Finalizálás

Töltsd be és hajtsd végre: `steps/step-06-finalize.md`

### STEP 7: Epic Lezárás (Epic utolsó story után)

**Triggerelés:** Automatikusan, ha az utolsó story DONE az epic-ben

1. Frissítsd `sprint-status.yaml`:
   - Epic státusz → `done`
   - Epic retrospective → `optional` vagy `done`

2. Git commit:

   ```bash
   git add .
   git commit -m "feat(epic-XX): Complete Epic XX - YOLO Pipeline"
   ```

3. **Push to remote:**

   ```bash
   git push origin main
   ```

4. Folytasd a következő epic-kel (STEP 2)

---

## BLOCKER KEZELÉS

Ha bármely lépésben BLOCKER:

1. Logold a blocker okát a story fájlba
2. Állítsd a story státuszt `blocked`-ra
3. Frissítsd sprint-status.yaml
4. **SKIP:** Ugorj STEP 2-re (következő story)

---

## SIKERKRITÉRIUMOK

### Per Story:

- [ ] Tesztek PASS (unit)
- [ ] Code review: min 3 issue found + fixed
- [ ] TEA: 80%+ lefedettség
- [ ] Story státusz: DONE

### Pipeline Összefoglaló (végén):

- Befejezett story-k száma
- Összes teszt szám
- Átlagos lefedettség
- Talált és javított hibák
- Blokkolt story-k listája
