#!/bin/bash
# Dual-AI Code Review Orchestrator
# Automates Claude Code + Gemini CLI parallel code reviews
#
# Usage: ./dual-ai-review.sh <review-file>
# Example: ./dual-ai-review.sh epic-1/1-2-token-refresh-review.md
#
# Prerequisites:
# - claude CLI installed and authenticated
# - gemini CLI installed and authenticated
# - Both CLIs must be available in PATH

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REVIEWS_DIR="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Log functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# Status file for tracking progress
STATUS_FILE=""
PID_FILE="/tmp/dual-ai-review.pid"

# Cleanup on exit
cleanup() {
    rm -f "$PID_FILE"
}
trap cleanup EXIT

# Write PID for external control
echo $$ > "$PID_FILE"

# Stop running review
stop_review() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Stopping dual-AI review process (PID: $pid)..."
            kill "$pid"
            rm -f "$PID_FILE"
            log_success "Process stopped."
        else
            log_warn "Process not running (stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        log_warn "No dual-AI review process running"
    fi
}

# Help message
show_help() {
    cat << EOF
Dual-AI Code Review Orchestrator
================================

Usage: ./dual-ai-review.sh [OPTIONS] <review-file>

Arguments:
  review-file    Path to review file (relative to reviews/ or absolute)

Options:
  -h, --help     Show this help message
  -l, --list     List available stories and existing reviews
  -e, --epic N   Review all stories in epic N (creates reviews if needed)
  -c, --create   Create new review file first (requires story-id and files)
  -s, --status   Show status of existing review
  -r, --round N  Start from specific round (default: auto-detect)
  --stop         Stop running dual-AI review process
  --claude-only  Run only Claude review
  --gemini-only  Run only Gemini review
  --parallel     Run Claude and Gemini in parallel (default: sequential)
  --dry-run      Show what would be executed without running

Examples:
  # Run full dual-AI review
  ./dual-ai-review.sh epic-1/1-2-token-refresh-review.md

  # Create and review in one step
  ./dual-ai-review.sh -c 1-2-token-refresh packages/core/auth/src/services/*.ts

  # Check status
  ./dual-ai-review.sh -s epic-1/1-2-token-refresh-review.md

  # Run only Claude (for debugging)
  ./dual-ai-review.sh --claude-only epic-1/1-2-token-refresh-review.md

EOF
}

# List available stories and reviews
list_available() {
    local stories_dir="$PROJECT_ROOT/implementation-artifacts/stories"

    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}                    DUAL-AI CODE REVIEW                         ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    # List existing reviews with status
    echo -e "${YELLOW}MEGLÉVŐ REVIEW-K:${NC}"
    echo -e "${YELLOW}─────────────────${NC}"

    local has_reviews=false
    for epic_dir in "$REVIEWS_DIR"/epic-*/; do
        if [[ -d "$epic_dir" ]]; then
            local epic_name=$(basename "$epic_dir")
            for review in "$epic_dir"*-review.md; do
                if [[ -f "$review" ]]; then
                    has_reviews=true
                    local filename=$(basename "$review")
                    local round=$(parse_frontmatter "$review" "round")
                    local status=$(parse_frontmatter "$review" "status")
                    local claude=$(parse_frontmatter "$review" "claude_done")
                    local gemini=$(parse_frontmatter "$review" "gemini_done")

                    # Status indicator
                    local indicator="⏳"
                    if [[ "$status" == "done" || "$status" == "consensus" ]]; then
                        indicator="✅"
                    elif [[ "$claude" == "true" && "$gemini" == "true" ]]; then
                        indicator="🔄"
                    fi

                    printf "  ${indicator} %-50s R%s  C:%-5s G:%-5s\n" \
                        "${epic_name}/${filename}" "$round" "$claude" "$gemini"
                fi
            done
        fi
    done

    if [[ "$has_reviews" == "false" ]]; then
        echo "  (nincs még review)"
    fi

    echo ""
    echo -e "${GREEN}ELÉRHETŐ STORY-K (review nélkül):${NC}"
    echo -e "${GREEN}──────────────────────────────────${NC}"

    local story_count=0
    if [[ -d "$stories_dir" ]]; then
        for story in "$stories_dir"/*.md; do
            if [[ -f "$story" ]]; then
                local story_name=$(basename "$story" .md)
                local epic_num=$(echo "$story_name" | cut -d'-' -f1)

                # Check if any review exists for this story (with any suffix)
                local has_review=false
                local review_pattern="$REVIEWS_DIR/epic-${epic_num}/${story_name}*-review.md"
                # shellcheck disable=SC2086
                if ls $review_pattern 1>/dev/null 2>&1; then
                    has_review=true
                fi

                # Only show if no review exists
                if [[ "$has_review" == "false" ]]; then
                    story_count=$((story_count + 1))
                    # Extract status from story file
                    local story_status=$(grep -m1 "^Status:" "$story" 2>/dev/null | sed 's/Status:[[:space:]]*//' || echo "unknown")
                    printf "  %2d. %-45s [%s]\n" "$story_count" "$story_name" "$story_status"
                fi
            fi
        done
    fi

    if [[ $story_count -eq 0 ]]; then
        echo "  (minden story-hoz van már review)"
    fi

    echo ""
    echo -e "${BLUE}HASZNÁLAT:${NC}"
    echo "  Meglévő review futtatása:"
    echo "    ./dual-ai-review.sh epic-1/1-2-token-refresh-review.md"
    echo ""
    echo "  Teljes epic review:"
    echo "    ./dual-ai-review.sh -e 1        # Epic 1 összes story-ja"
    echo "    ./dual-ai-review.sh -e 2        # Epic 2 összes story-ja"
    echo ""
    echo "  Új review létrehozása:"
    echo "    ./dual-ai-review.sh -c <story-id> <files...>"
    echo "    ./dual-ai-review.sh -c 2-1-user-crud packages/core/users/src/*.ts"
    echo ""
}

# Review all stories in an epic
review_epic() {
    local epic_num="$1"
    local stories_dir="$PROJECT_ROOT/implementation-artifacts/stories"

    log_info "═══════════════════════════════════════════════════════════════"
    log_info "              EPIC $epic_num - TELJES REVIEW                    "
    log_info "═══════════════════════════════════════════════════════════════"

    # Find all stories for this epic
    local story_files=()
    for story in "$stories_dir"/${epic_num}-*.md; do
        if [[ -f "$story" ]]; then
            story_files+=("$story")
        fi
    done

    if [[ ${#story_files[@]} -eq 0 ]]; then
        log_error "Nincs story az Epic $epic_num-ben"
        exit 1
    fi

    log_info "Talált story-k: ${#story_files[@]}"
    echo ""

    # Process each story
    local completed=0
    local failed=0

    for story_file in "${story_files[@]}"; do
        local story_name=$(basename "$story_file" .md)
        local review_file="$REVIEWS_DIR/epic-${epic_num}/${story_name}-review.md"

        echo ""
        log_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_step "Story: $story_name"
        log_step "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        # Create review file if doesn't exist
        if [[ ! -f "$review_file" ]]; then
            log_info "Review fájl létrehozása..."

            # Find source files for this story from story file
            local source_files=""
            if grep -q "File List" "$story_file" 2>/dev/null; then
                # Extract files from Dev Agent Record -> File List section
                source_files=$(sed -n '/## Dev Agent Record/,/## /p' "$story_file" | grep -E "^\s*-\s+\`" | sed 's/.*`\([^`]*\)`.*/\1/' | head -10 | tr '\n' ' ')
            fi

            if [[ -z "$source_files" ]]; then
                # Try to guess package from story name
                local package_guess=""
                case "$story_name" in
                    1-*) package_guess="packages/core/auth/src" ;;
                    2-*) package_guess="packages/core/users/src" ;;
                    *) package_guess="packages" ;;
                esac
                log_warn "Nem találtam fájlokat a story-ban, használom: $package_guess"
                source_files="$package_guess"
            fi

            # Create the review
            mkdir -p "$REVIEWS_DIR/epic-${epic_num}"
            if [[ "$DRY_RUN" == "true" ]]; then
                log_info "[DRY-RUN] Would create: $review_file"
            else
                "$SCRIPT_DIR/create-review.sh" "$story_name" $source_files
            fi
        else
            log_info "Review már létezik: $review_file"
        fi

        # Check current status
        if [[ -f "$review_file" ]]; then
            local status=$(parse_frontmatter "$review_file" "status")
            local claude_done=$(parse_frontmatter "$review_file" "claude_done")
            local gemini_done=$(parse_frontmatter "$review_file" "gemini_done")

            if [[ "$status" == "done" || "$status" == "consensus" ]]; then
                log_success "Már kész: $story_name ✅"
                completed=$((completed + 1))
                continue
            fi

            # Run the review
            if [[ "$DRY_RUN" == "true" ]]; then
                log_info "[DRY-RUN] Would review: $review_file"
                failed=$((failed + 1))
            else
                orchestrate_review "$review_file"

                # Check result
                status=$(parse_frontmatter "$review_file" "status")
                if [[ "$status" == "done" || "$status" == "consensus" ]]; then
                    completed=$((completed + 1))
                else
                    failed=$((failed + 1))
                fi
            fi
        fi
    done

    echo ""
    log_info "═══════════════════════════════════════════════════════════════"
    log_success "EPIC $epic_num ÖSSZESÍTÉS"
    log_info "  Összes story: ${#story_files[@]}"
    log_info "  Befejezett:   $completed"
    log_info "  Folyamatban:  $failed"
    log_info "═══════════════════════════════════════════════════════════════"
}

# Parse frontmatter from review file
parse_frontmatter() {
    local file="$1"
    local key="$2"

    # Extract value between --- markers
    sed -n '/^---$/,/^---$/p' "$file" | grep "^${key}:" | sed "s/^${key}:[[:space:]]*//" | tr -d '"'
}

# Update frontmatter value
update_frontmatter() {
    local file="$1"
    local key="$2"
    local value="$3"

    # Use sed to update the value in place
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^${key}:.*/${key}: ${value}/" "$file"
    else
        sed -i "s/^${key}:.*/${key}: ${value}/" "$file"
    fi
}

# Check if both AIs completed current round
check_round_complete() {
    local file="$1"
    local claude_done=$(parse_frontmatter "$file" "claude_done")
    local gemini_done=$(parse_frontmatter "$file" "gemini_done")

    if [[ "$claude_done" == "true" && "$gemini_done" == "true" ]]; then
        return 0
    fi
    return 1
}

# Get current round status
get_status() {
    local file="$1"

    local round=$(parse_frontmatter "$file" "round")
    local status=$(parse_frontmatter "$file" "status")
    local claude_done=$(parse_frontmatter "$file" "claude_done")
    local gemini_done=$(parse_frontmatter "$file" "gemini_done")

    echo "Round: $round"
    echo "Status: $status"
    echo "Claude: $claude_done"
    echo "Gemini: $gemini_done"
}

# Run Claude review
run_claude_review() {
    local review_file="$1"
    local round="$2"

    log_step "Starting Claude Code review (Round $round)..."

    local prompt=""
    if [[ "$round" == "1" ]]; then
        prompt="Read and follow _bmad/bmm/prompts/code-review-claude.md to review $review_file"
    else
        prompt="Continue code review Round $round: $review_file"
    fi

    # Run Claude in non-interactive mode
    cd "$PROJECT_ROOT"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would execute: claude --print \"$prompt\""
        return 0
    fi

    # Use --print for non-interactive output
    claude --print "$prompt" 2>&1 | tee -a "$STATUS_FILE.claude.log"

    log_success "Claude review complete for Round $round"
}

# Run Gemini review
run_gemini_review() {
    local review_file="$1"
    local round="$2"

    log_step "Starting Gemini CLI review (Round $round)..."

    local prompt=""
    if [[ "$round" == "1" ]]; then
        prompt="Read and follow _bmad/bmm/prompts/code-review-gemini.md to review $review_file"
    else
        prompt="Continue code review Round $round: $review_file"
    fi

    cd "$PROJECT_ROOT"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY-RUN] Would execute: gemini \"$prompt\""
        return 0
    fi

    # Run Gemini with --yolo mode to enable all tools (write_file, replace, etc.)
    local gemini_output
    gemini_output=$(gemini --yolo "$prompt" 2>&1)
    echo "$gemini_output" >> "$STATUS_FILE.gemini.log"

    # Parse Gemini output for review content
    local review_content
    review_content=$(echo "$gemini_output" | sed -n "/=== GEMINI ROUND $round REVIEW START ===/,/=== GEMINI ROUND $round REVIEW END ===/p" | sed '1d;$d')

    if [[ -n "$review_content" ]]; then
        log_info "Gemini review tartalom megtalálva, beillesztés a fájlba..."
        inject_gemini_review "$review_file" "$round" "$review_content"
        update_frontmatter "$review_file" "gemini_done" "true"
        log_success "Gemini review beillesztve a fájlba"
    else
        log_warn "Gemini review tartalom nem található a standard formátumban"
        log_info "Ellenőrizd a log fájlt: $STATUS_FILE.gemini.log"
    fi

    log_success "Gemini review complete for Round $round"
}

# Inject Gemini review content into file
inject_gemini_review() {
    local review_file="$1"
    local round="$2"
    local content="$3"

    local marker_start="<!-- GEMINI:ROUND:${round}:START -->"
    local marker_end="<!-- GEMINI:ROUND:${round}:END -->"

    # Create temp file with injected content
    local temp_file=$(mktemp)

    awk -v start="$marker_start" -v end="$marker_end" -v content="$content" '
    BEGIN { in_section = 0; printed = 0 }
    $0 ~ start {
        print;
        print content;
        in_section = 1;
        printed = 1;
        next
    }
    $0 ~ end {
        in_section = 0;
        print;
        next
    }
    !in_section { print }
    ' "$review_file" > "$temp_file"

    mv "$temp_file" "$review_file"
}

# Advance to next round
advance_round() {
    local file="$1"
    local current_round=$(parse_frontmatter "$file" "round")
    local next_round=$((current_round + 1))

    if [[ $next_round -gt 3 ]]; then
        log_warn "Max rounds (3) reached. Moving to consensus."
        update_frontmatter "$file" "status" "consensus"
        return 1
    fi

    update_frontmatter "$file" "round" "$next_round"
    update_frontmatter "$file" "status" "round-$next_round"
    update_frontmatter "$file" "claude_done" "false"
    update_frontmatter "$file" "gemini_done" "false"

    log_info "Advanced to Round $next_round"
    return 0
}

# Run single round
run_round() {
    local review_file="$1"
    local round="$2"

    log_info "========================================="
    log_info "ROUND $round"
    log_info "========================================="

    if [[ "$PARALLEL" == "true" ]]; then
        # Run in parallel using background processes
        log_info "Running Claude and Gemini in parallel..."

        run_claude_review "$review_file" "$round" &
        local claude_pid=$!

        run_gemini_review "$review_file" "$round" &
        local gemini_pid=$!

        # Wait for both to complete
        wait $claude_pid
        wait $gemini_pid
    else
        # Run sequentially
        if [[ "$CLAUDE_ONLY" != "true" && "$GEMINI_ONLY" != "true" ]]; then
            run_claude_review "$review_file" "$round"
            run_gemini_review "$review_file" "$round"
        elif [[ "$CLAUDE_ONLY" == "true" ]]; then
            run_claude_review "$review_file" "$round"
        elif [[ "$GEMINI_ONLY" == "true" ]]; then
            run_gemini_review "$review_file" "$round"
        fi
    fi
}

# Main orchestration function
orchestrate_review() {
    local review_file="$1"

    # Resolve full path
    if [[ ! "$review_file" = /* ]]; then
        if [[ -f "$REVIEWS_DIR/$review_file" ]]; then
            review_file="$REVIEWS_DIR/$review_file"
        elif [[ -f "$PROJECT_ROOT/$review_file" ]]; then
            review_file="$PROJECT_ROOT/$review_file"
        else
            log_error "Review file not found: $review_file"
            exit 1
        fi
    fi

    log_info "Starting Dual-AI Code Review"
    log_info "Review file: $review_file"

    # Setup status file
    STATUS_FILE="${review_file%.md}.status"
    echo "Started: $(date -Iseconds)" > "$STATUS_FILE"

    # Get current status
    local current_round=$(parse_frontmatter "$review_file" "round")
    local status=$(parse_frontmatter "$review_file" "status")

    log_info "Current status: $status (Round $current_round)"

    # Override round if specified
    if [[ -n "$START_ROUND" ]]; then
        current_round="$START_ROUND"
        update_frontmatter "$review_file" "round" "$current_round"
        update_frontmatter "$review_file" "status" "round-$current_round"
        update_frontmatter "$review_file" "claude_done" "false"
        update_frontmatter "$review_file" "gemini_done" "false"
    fi

    # Run rounds until consensus or max rounds
    while [[ $current_round -le 3 ]]; do
        run_round "$review_file" "$current_round"

        # Check if round is complete
        if check_round_complete "$review_file"; then
            log_success "Round $current_round complete!"

            if ! advance_round "$review_file"; then
                break
            fi
            current_round=$((current_round + 1))
        else
            log_warn "Waiting for both AIs to complete Round $current_round"
            log_info "Claude done: $(parse_frontmatter "$review_file" "claude_done")"
            log_info "Gemini done: $(parse_frontmatter "$review_file" "gemini_done")"
            break
        fi
    done

    # Final status
    echo "Completed: $(date -Iseconds)" >> "$STATUS_FILE"

    log_info "========================================="
    log_success "Dual-AI Review Session Complete"
    log_info "Review file: $review_file"
    log_info "Status file: $STATUS_FILE"
    log_info "Claude log: ${STATUS_FILE}.claude.log"
    log_info "Gemini log: ${STATUS_FILE}.gemini.log"
    log_info "========================================="
}

# Parse arguments
PARALLEL=false
CLAUDE_ONLY=false
GEMINI_ONLY=false
DRY_RUN=false
SHOW_STATUS=false
CREATE_REVIEW=false
LIST_MODE=false
EPIC_MODE=false
STOP_MODE=false
EPIC_NUM=""
START_ROUND=""
REVIEW_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -l|--list)
            LIST_MODE=true
            shift
            ;;
        -e|--epic)
            EPIC_MODE=true
            EPIC_NUM="$2"
            shift 2
            ;;
        --stop)
            STOP_MODE=true
            shift
            ;;
        -c|--create)
            CREATE_REVIEW=true
            shift
            ;;
        -s|--status)
            SHOW_STATUS=true
            shift
            ;;
        -r|--round)
            START_ROUND="$2"
            shift 2
            ;;
        --claude-only)
            CLAUDE_ONLY=true
            shift
            ;;
        --gemini-only)
            GEMINI_ONLY=true
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            if [[ -z "$REVIEW_FILE" ]]; then
                REVIEW_FILE="$1"
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [[ -z "$REVIEW_FILE" && "$CREATE_REVIEW" != "true" && "$LIST_MODE" != "true" && "$EPIC_MODE" != "true" && "$STOP_MODE" != "true" ]]; then
    log_error "Review file required"
    show_help
    exit 1
fi

# Execute
if [[ "$STOP_MODE" == "true" ]]; then
    stop_review
    exit 0
elif [[ "$LIST_MODE" == "true" ]]; then
    list_available
    exit 0
elif [[ "$EPIC_MODE" == "true" ]]; then
    if [[ -z "$EPIC_NUM" ]]; then
        log_error "Epic number required with -e option"
        exit 1
    fi
    review_epic "$EPIC_NUM"
    exit 0
elif [[ "$SHOW_STATUS" == "true" ]]; then
    if [[ ! -f "$REVIEWS_DIR/$REVIEW_FILE" && ! -f "$REVIEW_FILE" ]]; then
        log_error "Review file not found: $REVIEW_FILE"
        exit 1
    fi

    if [[ -f "$REVIEWS_DIR/$REVIEW_FILE" ]]; then
        get_status "$REVIEWS_DIR/$REVIEW_FILE"
    else
        get_status "$REVIEW_FILE"
    fi
elif [[ "$CREATE_REVIEW" == "true" ]]; then
    # Pass remaining args to create-review.sh
    "$SCRIPT_DIR/create-review.sh" "$@"
else
    orchestrate_review "$REVIEW_FILE"
fi
