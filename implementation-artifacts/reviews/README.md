# Dual-AI Adversarial Code Review System

**Claude Code + Gemini CLI** conducting independent, parallel code reviews with iterative consensus.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         ROUND 1                                 │
│                   Independent Reviews                           │
├────────────────────────┬────────────────────────────────────────┤
│       CLAUDE           │           GEMINI                       │
│  (does NOT read        │    (does NOT read                     │
│   Gemini's section)    │     Claude's section)                 │
│         │              │            │                          │
│         ▼              │            ▼                          │
│   Independent          │      Independent                      │
│   Code Review          │      Code Review                      │
│         │              │            │                          │
│         ▼              │            ▼                          │
│   Publish Findings     │      Publish Findings                 │
└────────────────────────┴────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ROUND 2                                 │
│                     Cross-Analysis                              │
├────────────────────────┬────────────────────────────────────────┤
│       CLAUDE           │           GEMINI                       │
│  Reads Gemini R1       │    Reads Claude R1                    │
│         │              │            │                          │
│         ▼              │            ▼                          │
│   Analyze + New        │      Analyze + New                    │
│   Review               │      Review                           │
│         │              │            │                          │
│         ▼              │            ▼                          │
│   Consensus Proposal   │      Consensus Proposal               │
└────────────────────────┴────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ROUND 3                                 │
│                    Final Consensus                              │
├─────────────────────────────────────────────────────────────────┤
│   Both reviewers finalize:                                      │
│   - Agreed issues                                               │
│   - Disagreements (escalated)                                   │
│   - Action items                                                │
│   - Sign-off                                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Create Review File
```bash
cd implementation-artifacts/reviews

# Use helper script (recommended)
./create-review.sh 1-2-token-refresh packages/core/auth/src/services/token.service.ts

# Creates: epic-1/1-2-token-refresh-review.md
```

### 2. Round 1 - Both AI Review Independently

**Claude (you trigger manually):**
```
Read and follow _bmad/bmm/prompts/code-review-claude.md
to review implementation-artifacts/reviews/epic-1/1-2-token-refresh-review.md
```

**Gemini (separate terminal):**
```bash
gemini "Read and follow _bmad/bmm/prompts/code-review-gemini.md to review implementation-artifacts/reviews/epic-1/1-2-token-refresh-review.md"
```

### 3. Round 2 - Cross-Analysis
After BOTH complete Round 1 (check `claude_done: true` and `gemini_done: true`):

**Claude:**
```
Continue code review Round 2: implementation-artifacts/reviews/{story-id}-review.md
```

**Gemini:**
```bash
gemini "Continue code review Round 2: implementation-artifacts/reviews/{story-id}-review.md"
```

### 4. Round 3 - Consensus
Same pattern - trigger each AI to complete their final round.

## Frontmatter Status Tracking

```yaml
status: "round-1"      # round-1 | round-2 | round-3 | consensus | escalated
round: 1               # Current round number
claude_done: false     # Has Claude completed this round?
gemini_done: false     # Has Gemini completed this round?
```

When both are `true`, increment round and reset flags.

## Required Reading

Both AIs must read before reviewing:
- `docs/kgc3-development-principles.md` - TDD/ATDD, testing rules
- `CLAUDE.md` - Project conventions, architecture

## Files & Structure

```
implementation-artifacts/reviews/
├── README.md                        # This file
├── _TEMPLATE.md                     # Template for new reviews
├── create-review.sh                 # Helper script to create reviews
│
├── epic-1/                          # Epic 1 reviews
│   ├── 1-1-jwt-login-review.md     # Story 1.1 review
│   ├── 1-2-token-refresh-review.md # Story 1.2 review
│   └── ...
│
├── epic-2/                          # Epic 2 reviews
│   └── ...
│
└── epic-N/                          # Epic N reviews

_bmad/bmm/prompts/
├── code-review-claude.md            # Claude instructions
└── code-review-gemini.md            # Gemini instructions
```

## Creating a New Review

### Option 1: Helper Script (Recommended)
```bash
cd implementation-artifacts/reviews

# Create review with auto-detected epic folder
./create-review.sh 1-2-token-refresh packages/core/auth/src/services/token.service.ts

# Script automatically:
# - Extracts epic number from story ID (1-2-... → epic-1/)
# - Creates epic folder if needed
# - Generates review file from template
```

### Option 2: Manual
```bash
mkdir -p epic-1
cp _TEMPLATE.md epic-1/{story-id}-review.md
# Edit frontmatter: story, files_to_review
```

## Automated Orchestration

### Full Automation with `dual-ai-review.sh`

```bash
cd implementation-artifacts/reviews

# Full automated review
./dual-ai-review.sh epic-1/1-2-token-refresh-review.md

# Create and review in one command
./dual-ai-review.sh -c 1-2-token-refresh packages/core/auth/src/*.ts

# Check status
./dual-ai-review.sh -s epic-1/1-2-token-refresh-review.md

# Run only Claude (debugging)
./dual-ai-review.sh --claude-only epic-1/1-2-token-refresh-review.md

# Run in parallel mode
./dual-ai-review.sh --parallel epic-1/1-2-token-refresh-review.md

# Dry run (show commands without executing)
./dual-ai-review.sh --dry-run epic-1/1-2-token-refresh-review.md
```

### Output Files

After running, you'll find:
- `{story-id}-review.md` - Main review document with findings
- `{story-id}-review.status` - Execution timestamps
- `{story-id}-review.status.claude.log` - Claude's full output
- `{story-id}-review.status.gemini.log` - Gemini's full output

### Integration with BMAD Workflow

From `/bmad:bmm:workflows:code-review`:
1. Workflow creates review file automatically
2. Claude completes Round 1
3. User triggers Gemini via terminal or automation script
4. After Gemini completes, re-run workflow to continue

```
/bmad:bmm:workflows:code-review 1-2-token-refresh
```

---

## Rules

1. **Round 1 is INDEPENDENT** - no peeking at the other's findings
2. **Minimum 3 issues** per reviewer (BMAD adversarial requirement)
3. **Max 3 rounds** - then escalate unresolved disagreements
4. **Always update frontmatter** after completing a round
5. **Reference development principles** in every review
