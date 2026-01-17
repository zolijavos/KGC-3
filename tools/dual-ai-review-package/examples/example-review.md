---
story: "example-feature"
story_file: "docs/stories/example-feature.md"
status: round-1
round: 1
max_rounds: 3
created: "2024-01-01T00:00:00+00:00"
files_to_review:
  - "src/services/example.service.ts"
  - "src/controllers/example.controller.ts"
  - "src/dto/example.dto.ts"
references:
  - "docs/development-principles.md"
  - "README.md"
claude_done: false
gemini_done: false
---

# Dual-AI Code Review: example-feature

## Review Target

**Story:** `example-feature`
**Story File:** `docs/stories/example-feature.md`

**Files to Review:**
- `src/services/example.service.ts`
- `src/controllers/example.controller.ts`
- `src/dto/example.dto.ts`

**Required Reading:**
- `docs/development-principles.md` - Development principles
- `README.md` - Project rules and conventions

---

# ROUND 1 - Independent Reviews

Both reviewers conduct **independent** code reviews without seeing each other's findings.

## Claude Independent Review
<!-- CLAUDE:ROUND:1:START -->
**Status:** NOT STARTED

*Claude: Read the code files and conduct your independent review. Do NOT read Gemini's section until you complete yours.*
<!-- CLAUDE:ROUND:1:END -->

## Gemini Independent Review
<!-- GEMINI:ROUND:1:START -->
**Status:** NOT STARTED

*Gemini: Read the code files and conduct your independent review. Do NOT read Claude's section until you complete yours.*
<!-- GEMINI:ROUND:1:END -->

---

# ROUND 2 - Cross-Analysis

After BOTH complete Round 1, each reviewer analyzes the other's findings.

## Claude Cross-Analysis
<!-- CLAUDE:ROUND:2:START -->
**Status:** WAITING FOR ROUND 1

*Claude: Analyze Gemini's Round 1 findings.*
<!-- CLAUDE:ROUND:2:END -->

## Gemini Cross-Analysis
<!-- GEMINI:ROUND:2:START -->
**Status:** WAITING FOR ROUND 1

*Gemini: Analyze Claude's Round 1 findings.*
<!-- GEMINI:ROUND:2:END -->

---

# ROUND 3 - Consensus

Final round to reach consensus on all findings.

## Claude Consensus Position
<!-- CLAUDE:ROUND:3:START -->
**Status:** WAITING FOR ROUND 2

*Claude: Propose or accept consensus.*
<!-- CLAUDE:ROUND:3:END -->

## Gemini Consensus Position
<!-- GEMINI:ROUND:3:START -->
**Status:** WAITING FOR ROUND 2

*Gemini: Propose or accept consensus.*
<!-- GEMINI:ROUND:3:END -->

---

# FINAL CONSENSUS

<!-- CONSENSUS:START -->
## Status: PENDING

### Agreed Critical Issues
- (none yet)

### Agreed High Issues
- (none yet)

### Agreed Medium Issues
- (none yet)

### Agreed Low Issues
- (none yet)

### Disagreements (if escalated)
- (none)

### Action Items
- [ ] (none yet)

### Sign-off
- [ ] Claude: NOT SIGNED
- [ ] Gemini: NOT SIGNED
<!-- CONSENSUS:END -->

---

# IMPLEMENTATION INSTRUCTIONS

> **FONTOS**: Ez a szekció a konszenzus után töltendő ki.

## Recommended Agent

**Ügynök:** `(válassz egyet)`
- `dev` - Kód implementáció
- `architect` - Architektúra változtatás
- `tea` - Test Engineering

## Instructions for Agent

```markdown
# Code Review Implementáció - example-feature

## Feladatok

### HIGH Issues
1. [ ] **Issue neve** - `file.ts:line`
   - Probléma: ...
   - Megoldás: ...

## Acceptance Criteria
- [ ] Minden HIGH issue javítva
- [ ] Tesztek sikeresek
- [ ] Build sikeres
```
