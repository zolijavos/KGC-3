---
story: "{STORY_ID}"
story_file: "implementation-artifacts/stories/{STORY_ID}.md"
status: "round-1"
round: 1
max_rounds: 3
created: "{TIMESTAMP}"
files_to_review:
  - "{FILE_1}"
  - "{FILE_2}"
references:
  - "docs/kgc3-development-principles.md"
  - "CLAUDE.md"
claude_done: false
gemini_done: false
---

# Dual-AI Code Review: {STORY_TITLE}

## Review Target

**Story:** `{STORY_ID}`
**Files:**
{FILES_LIST}

**Required Reading:**
- `docs/kgc3-development-principles.md` - Development principles & TDD/ATDD
- `CLAUDE.md` - Project rules and conventions

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

After BOTH complete Round 1, each reviewer analyzes the other's findings and conducts a second review.

## Claude Cross-Analysis
<!-- CLAUDE:ROUND:2:START -->
**Status:** WAITING FOR ROUND 1

*Claude: Analyze Gemini's Round 1 findings, then conduct another independent review incorporating insights.*
<!-- CLAUDE:ROUND:2:END -->

## Gemini Cross-Analysis
<!-- GEMINI:ROUND:2:START -->
**Status:** WAITING FOR ROUND 1

*Gemini: Analyze Claude's Round 1 findings, then conduct another independent review incorporating insights.*
<!-- GEMINI:ROUND:2:END -->

---

# ROUND 3 - Consensus

Final round to reach consensus on all findings.

## Claude Consensus Position
<!-- CLAUDE:ROUND:3:START -->
**Status:** WAITING FOR ROUND 2

*Claude: Review Gemini's Round 2, propose or accept consensus.*
<!-- CLAUDE:ROUND:3:END -->

## Gemini Consensus Position
<!-- GEMINI:ROUND:3:START -->
**Status:** WAITING FOR ROUND 2

*Gemini: Review Claude's Round 2, propose or accept consensus.*
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
