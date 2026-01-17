#!/usr/bin/env bash
#
# Create Review - Új review fájl létrehozása
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_FILE="$SCRIPT_DIR/_TEMPLATE.md"

# Színek
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

usage() {
    cat << EOF
Új review fájl létrehozása

Használat:
    $0 <story-id> [fájlok...]

Példa:
    $0 1-2-token-refresh packages/auth/src/*.ts

EOF
    exit 1
}

if [[ $# -lt 1 ]]; then
    usage
fi

STORY_ID="$1"
shift
FILES_TO_REVIEW=("$@")

# Epic könyvtár meghatározása
EPIC_DIR="epic-1"  # Default
if [[ "$STORY_ID" =~ ^([0-9]+)- ]]; then
    EPIC_NUM="${BASH_REMATCH[1]}"
    EPIC_DIR="epic-$EPIC_NUM"
fi

# Review fájl útvonal
REVIEW_DIR="$SCRIPT_DIR/$EPIC_DIR"
REVIEW_FILE="$REVIEW_DIR/${STORY_ID}-review.md"

# Könyvtár létrehozása
mkdir -p "$REVIEW_DIR"

# Template ellenőrzése
if [[ ! -f "$TEMPLATE_FILE" ]]; then
    log_error "Template nem található: $TEMPLATE_FILE"
    exit 1
fi

# Fájl létrehozása
log_info "Review fájl létrehozása: $REVIEW_FILE"

# Fájlok lista generálása
FILES_YAML=""
for file in "${FILES_TO_REVIEW[@]}"; do
    FILES_YAML+="  - \"$file\"\n"
done

# Template másolása és kitöltése
cp "$TEMPLATE_FILE" "$REVIEW_FILE"

# Frontmatter frissítése
sed -i "s|story: \"\"|story: \"$STORY_ID\"|" "$REVIEW_FILE"
sed -i "s|story_file: \"\"|story_file: \"implementation-artifacts/stories/${STORY_ID}.md\"|" "$REVIEW_FILE"
sed -i "s|created: \"\"|created: \"$(date -Iseconds)\"|" "$REVIEW_FILE"

# Fájlok hozzáadása
if [[ -n "$FILES_YAML" ]]; then
    # Cseréljük ki a files_to_review szekciót
    awk -v files="$FILES_YAML" '
    /^files_to_review:/ {
        print "files_to_review:"
        printf "%s", files
        skip = 1
        next
    }
    skip && /^  - / { next }
    skip && /^[a-z]/ { skip = 0 }
    !skip { print }
    ' "$REVIEW_FILE" > "$REVIEW_FILE.tmp" && mv "$REVIEW_FILE.tmp" "$REVIEW_FILE"
fi

# Cím frissítése
sed -i "s|# Dual-AI Code Review: {STORY_ID}|# Dual-AI Code Review: $STORY_ID|" "$REVIEW_FILE"

log_success "Review fájl létrehozva: $REVIEW_FILE"
log_info "Következő lépés: ./dual-ai-review.sh $EPIC_DIR/${STORY_ID}-review.md"
