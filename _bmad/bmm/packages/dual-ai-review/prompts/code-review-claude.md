# Claude Code Review Instructions

You are conducting an **ADVERSARIAL CODE REVIEW** as part of a dual-AI review process with Gemini CLI.

## CRITICAL: Required Reading First

Before ANY code review, you MUST read these files:
1. `docs/kgc3-development-principles.md` - TDD/ATDD methodology, testing requirements
2. `CLAUDE.md` - Project conventions, architecture rules, coding standards

These define what "correct" code looks like for this project.

---

## Your Task

1. **Read the review file** to understand context
2. **Check which round** you're in (frontmatter: `round`)
3. **Read ALL code files** listed in `files_to_review`
4. **Write your review** in YOUR section only
5. **Update the frontmatter** when done

---

## File Handling Instructions

### Step 1: Read the Review File
```
Read: implementation-artifacts/reviews/{review-file}.md
```

Extract from frontmatter:
- `round`: Current round number (1, 2, or 3)
- `files_to_review`: List of files to review
- `claude_done`: Whether you've completed this round
- `gemini_done`: Whether Gemini completed this round

### Step 2: Read Required References
```
Read: docs/kgc3-development-principles.md
Read: CLAUDE.md
```

### Step 3: Read All Code Files
Read every file in `files_to_review` list.

### Step 4: Write Your Review
Use the Edit tool to replace your section content.

### Step 5: Update Frontmatter
After completing your review, update:
```yaml
claude_done: true
```

If both `claude_done` AND `gemini_done` are true, also update:
```yaml
round: {next_round}
claude_done: false
gemini_done: false
status: "round-{next_round}"
```

---

## Round-Specific Instructions

### ROUND 1 - Independent Review

**DO NOT read Gemini's section!** Conduct a completely independent review.

Write in: `<!-- CLAUDE:ROUND:1:START -->` to `<!-- CLAUDE:ROUND:1:END -->`

Your review must include:
1. **Minimum 3 issues, aim for 5-10** (per BMAD adversarial review rules)
2. **Severity levels**: `[CRITICAL]`, `[HIGH]`, `[MEDIUM]`, `[LOW]`
3. **Specific locations**: file path and line numbers
4. **Evidence**: Code snippets or references
5. **Check against**: Development principles, CLAUDE.md rules

Format:
```markdown
**Status:** COMPLETE

### Findings

1. **[CRITICAL]** {Title}
   - **File:** `{path}:{line}`
   - **Issue:** {Description}
   - **Evidence:** {Code snippet or rule violated}
   - **Recommendation:** {Fix}

2. **[HIGH]** {Title}
   ...
```

### ROUND 2 - Cross-Analysis

Now you MAY read Gemini's Round 1 section.

Write in: `<!-- CLAUDE:ROUND:2:START -->` to `<!-- CLAUDE:ROUND:2:END -->`

Your analysis must include:
1. **Response to each Gemini finding**: AGREE / DISAGREE / EXPAND
2. **New findings** you may have missed
3. **Reassessment** of your Round 1 findings after seeing Gemini's perspective
4. **Consensus proposals** for issues you both found

Format:
```markdown
**Status:** COMPLETE

### Analysis of Gemini's Findings

**G1: {Gemini's first finding}**
- Response: AGREE
- Comment: {Your thoughts}

**G2: {Gemini's second finding}**
- Response: DISAGREE
- Reason: {Why you disagree with evidence}

### Updated Findings

{Your revised list incorporating Gemini's insights}

### Consensus Proposal

Issues we both agree on:
- {Issue 1}
- {Issue 2}
```

### ROUND 3 - Final Consensus

Write in: `<!-- CLAUDE:ROUND:3:START -->` to `<!-- CLAUDE:ROUND:3:END -->`

1. Review Gemini's Round 2 analysis
2. **Reach consensus** or **escalate disagreements**
3. Update the FINAL CONSENSUS section

Format:
```markdown
**Status:** COMPLETE

### Final Position

**CONSENSUS REACHED** on:
- {Issue 1} - {Severity}
- {Issue 2} - {Severity}

**DISAGREEMENTS** (if any):
- {Issue}: Claude says X, Gemini says Y

### Sign-off
**Claude: SIGNED** - I accept this consensus.
```

Also update `<!-- CONSENSUS:START -->` section with final agreed issues.

---

## Code Review Checklist (from Development Principles)

Check the code against:

- [ ] **TDD compliance** - Do tests exist? Were they written first?
- [ ] **Auth/RBAC** - Is authorization properly implemented?
- [ ] **State machines** - Are transitions valid?
- [ ] **Financial calculations** - Are they tested with property tests?
- [ ] **Input validation** - Especially at system boundaries
- [ ] **Multi-tenancy** - No manual tenant_id in queries
- [ ] **TypeScript strict mode** - noUncheckedIndexedAccess compliance
- [ ] **Error handling** - Appropriate try-catch, error types
- [ ] **Security** - No SQL injection, XSS, OWASP top 10
- [ ] **Naming conventions** - Per CLAUDE.md
- [ ] **Package boundaries** - Per ADR-010/ADR-014

---

## Important Rules

- **NEVER read Gemini's section in Round 1** - independent review first
- **Minimum 3 issues** per BMAD adversarial review requirements
- **Always reference specific files and lines**
- **Always check against development principles**
- **Update frontmatter after EVERY review**
