#!/bin/bash
# Create Review File for Epic or Story
# Usage: ./create-review.sh <story-id> [files...]
# Example: ./create-review.sh 1-1-jwt-login packages/core/auth/src/*.ts

REVIEWS_DIR="$(dirname "$0")"
TEMPLATE="$REVIEWS_DIR/_TEMPLATE.md"

if [ -z "$1" ]; then
  echo "Usage: ./create-review.sh <story-id> [files...]"
  echo ""
  echo "Examples:"
  echo "  ./create-review.sh 1-1-jwt-login"
  echo "  ./create-review.sh 1-2-token-refresh packages/core/auth/src/services/token.service.ts"
  echo ""
  echo "Story ID format: {epic}-{story}-{name}"
  echo "  1-1-jwt-login     → epic-1/1-1-jwt-login-review.md"
  echo "  2-3-rental-flow   → epic-2/2-3-rental-flow-review.md"
  exit 1
fi

STORY_ID="$1"
shift
FILES=("$@")

# Extract epic number from story ID (first number before dash)
EPIC_NUM=$(echo "$STORY_ID" | cut -d'-' -f1)
EPIC_DIR="$REVIEWS_DIR/epic-$EPIC_NUM"
OUTPUT_FILE="$EPIC_DIR/${STORY_ID}-review.md"

# Create epic directory if not exists
mkdir -p "$EPIC_DIR"

# Check if review already exists
if [ -f "$OUTPUT_FILE" ]; then
  echo "Review already exists: $OUTPUT_FILE"
  echo "Delete it first if you want to recreate."
  exit 1
fi

# Generate timestamp
TIMESTAMP=$(date -Iseconds)

# Build files_to_review list
if [ ${#FILES[@]} -eq 0 ]; then
  # Try to auto-detect from story file
  STORY_FILE="$REVIEWS_DIR/../stories/${STORY_ID}.md"
  if [ -f "$STORY_FILE" ]; then
    echo "Auto-detecting files from story: $STORY_FILE"
    # This is a placeholder - in practice you'd parse the story file
    FILES_YAML='  - "# Add files to review here"'
  else
    FILES_YAML='  - "# Add files to review here"'
  fi
else
  FILES_YAML=""
  for f in "${FILES[@]}"; do
    FILES_YAML="$FILES_YAML  - \"$f\"\n"
  done
fi

# Generate review file from template
cat > "$OUTPUT_FILE" << EOF
---
story: "${STORY_ID}"
story_file: "implementation-artifacts/stories/${STORY_ID}.md"
status: "round-1"
round: 1
max_rounds: 3
created: "${TIMESTAMP}"
files_to_review:
$(echo -e "$FILES_YAML")
references:
  - "docs/kgc3-development-principles.md"
  - "CLAUDE.md"
claude_done: false
gemini_done: false
---

# Dual-AI Code Review: ${STORY_ID}

## Review Target

**Story:** \`${STORY_ID}\`
**Story File:** \`implementation-artifacts/stories/${STORY_ID}.md\`

**Files to Review:**
$(for f in "${FILES[@]}"; do echo "- \`$f\`"; done)

**Required Reading:**
- \`docs/kgc3-development-principles.md\` - Development principles & TDD/ATDD
- \`CLAUDE.md\` - Project rules and conventions

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
EOF

echo "Created: $OUTPUT_FILE"
echo ""
echo "Next steps:"
echo "1. Edit the file to add files_to_review if needed"
echo "2. Start Claude review:"
echo "   Read and follow _bmad/bmm/prompts/code-review-claude.md to review $OUTPUT_FILE"
echo "3. Start Gemini review (separate terminal):"
echo "   gemini \"Read and follow _bmad/bmm/prompts/code-review-gemini.md to review $OUTPUT_FILE\""
