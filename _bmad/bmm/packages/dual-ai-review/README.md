# Dual-AI Adversarial Code Review Package

**Claude Code + Gemini CLI** conducting independent, parallel code reviews with iterative consensus.

## Installation

```bash
# From this package directory
./install.sh /path/to/target-project

# Or copy this package and run
cp -r dual-ai-review /path/to/target-project/_bmad/bmm/packages/
cd /path/to/target-project/_bmad/bmm/packages/dual-ai-review
./install.sh ../../../
```

## Prerequisites

1. **Gemini CLI** installed globally:
   ```bash
   npm install -g @google/gemini-cli
   gemini  # First run to authenticate
   ```

2. **Project documentation** (for AI reference):
   - Development principles document (e.g., `docs/development-principles.md`)
   - Project conventions (e.g., `CLAUDE.md`)

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
└────────────────────────┴────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ROUND 2                                 │
│                     Cross-Analysis                              │
├────────────────────────┬────────────────────────────────────────┤
│  Claude reads Gemini   │   Gemini reads Claude                 │
│  Analyze + New Review  │   Analyze + New Review                │
│  Consensus Proposal    │   Consensus Proposal                  │
└────────────────────────┴────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ROUND 3                                 │
│                    Final Consensus                              │
├─────────────────────────────────────────────────────────────────┤
│   - Agreed issues with severity                                 │
│   - Disagreements (escalated to human)                          │
│   - Action items                                                │
│   - Sign-off from both AIs                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Package Contents

```
dual-ai-review/
├── README.md           # This file
├── install.sh          # Installer script
├── templates/
│   ├── _TEMPLATE.md    # Review file template
│   ├── README.md       # Reviews folder documentation
│   └── create-review.sh # Helper script
└── prompts/
    ├── code-review-claude.md  # Claude instructions
    └── code-review-gemini.md  # Gemini instructions
```

## Usage After Installation

### 1. Create a Review File

```bash
cd implementation-artifacts/reviews
./create-review.sh 1-1-my-feature src/feature/*.ts
```

### 2. Start Both AI Reviews (Parallel)

**Terminal 1 - Claude:**
```
Read and follow _bmad/bmm/prompts/code-review-claude.md
to review implementation-artifacts/reviews/epic-1/1-1-my-feature-review.md
```

**Terminal 2 - Gemini:**
```bash
gemini "Read and follow _bmad/bmm/prompts/code-review-gemini.md to review implementation-artifacts/reviews/epic-1/1-1-my-feature-review.md"
```

### 3. Continue Rounds

After both complete Round 1 (check frontmatter flags), trigger Round 2:

**Claude:** `Continue code review Round 2: implementation-artifacts/reviews/epic-1/1-1-my-feature-review.md`

**Gemini:** `gemini "Continue code review Round 2: implementation-artifacts/reviews/epic-1/1-1-my-feature-review.md"`

## Customization

### Modify Reference Documents

Edit the prompts to point to your project's documentation:

```markdown
# In code-review-claude.md and code-review-gemini.md

## CRITICAL: Required Reading First
1. `docs/YOUR-development-principles.md`
2. `YOUR-CLAUDE.md` or similar
```

### Adjust Review Checklist

The checklist in both prompts can be customized for your project's specific requirements.

## Benefits

| Benefit | Description |
|---------|-------------|
| **Two perspectives** | Different AIs catch different issues |
| **Reduced blind spots** | Independent first review eliminates bias |
| **Iterative quality** | Multiple rounds improve thoroughness |
| **Structured process** | Trackable, documented review history |
| **Enforced standards** | Both AIs reference project rules |
| **Escalation path** | Unresolved issues go to human |

## License

Part of BMAD Method Module (BMM)
