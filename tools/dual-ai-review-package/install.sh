#!/usr/bin/env bash
#
# Dual-AI Code Review - Telepítő Script
# ======================================
#
# Telepíti a Dual-AI Review rendszert a célprojektbe.
#

set -euo pipefail

# Színek
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Script könyvtár
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Alapértelmezett értékek
TARGET_DIR=""
REVIEWS_DIR="implementation-artifacts/reviews"
PROMPTS_DIR="_bmad/bmm/prompts"
FORCE=false
INTERACTIVE=true

# Használat
usage() {
    cat << EOF
Dual-AI Code Review Telepítő

Használat:
    $0 [opciók] <célkönyvtár>

Opciók:
    -r, --reviews-dir DIR    Review-k könyvtára (default: implementation-artifacts/reviews)
    -p, --prompts-dir DIR    Promptok könyvtára (default: _bmad/bmm/prompts)
    -f, --force              Felülírja a meglévő fájlokat
    -y, --yes                Nem-interaktív mód (minden kérdésre igen)
    -h, --help               Súgó megjelenítése

Példák:
    $0 /path/to/my-project
    $0 -r docs/reviews -p prompts /path/to/my-project
    $0 --force --yes /path/to/my-project

EOF
    exit 0
}

# Argumentumok feldolgozása
while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--reviews-dir)
            REVIEWS_DIR="$2"
            shift 2
            ;;
        -p|--prompts-dir)
            PROMPTS_DIR="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -y|--yes)
            INTERACTIVE=false
            shift
            ;;
        -h|--help)
            usage
            ;;
        -*)
            log_error "Ismeretlen opció: $1"
            usage
            ;;
        *)
            TARGET_DIR="$1"
            shift
            ;;
    esac
done

# Célkönyvtár ellenőrzése
if [[ -z "$TARGET_DIR" ]]; then
    log_error "Célkönyvtár megadása kötelező!"
    echo ""
    usage
fi

# Abszolút útvonal
TARGET_DIR="$(cd "$TARGET_DIR" 2>/dev/null && pwd)" || {
    log_error "A célkönyvtár nem létezik: $TARGET_DIR"
    exit 1
}

# Header
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          Dual-AI Code Review - Telepítő                      ║"
echo "║          Claude Code + Gemini CLI                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

log_info "Célkönyvtár: $TARGET_DIR"
log_info "Reviews könyvtár: $REVIEWS_DIR"
log_info "Prompts könyvtár: $PROMPTS_DIR"
echo ""

# Megerősítés
if [[ "$INTERACTIVE" == "true" ]]; then
    read -p "Folytatod a telepítést? (i/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ii]$ ]]; then
        log_warn "Telepítés megszakítva."
        exit 0
    fi
fi

# Előfeltételek ellenőrzése
log_info "Előfeltételek ellenőrzése..."

check_command() {
    if command -v "$1" &> /dev/null; then
        log_success "$1 megtalálva: $(command -v "$1")"
        return 0
    else
        log_warn "$1 nem található"
        return 1
    fi
}

MISSING_DEPS=false

if ! check_command "claude"; then
    log_warn "Claude Code CLI telepítése szükséges: npm install -g @anthropic-ai/claude-code"
    MISSING_DEPS=true
fi

if ! check_command "gemini"; then
    log_warn "Gemini CLI telepítése szükséges: npm install -g @google/gemini-cli"
    MISSING_DEPS=true
fi

if [[ "$MISSING_DEPS" == "true" ]]; then
    log_warn "Néhány függőség hiányzik. A telepítés folytatódik, de a review futtatásához szükségesek."
    echo ""
fi

# Könyvtárak létrehozása
log_info "Könyvtárak létrehozása..."

mkdir -p "$TARGET_DIR/$REVIEWS_DIR"
log_success "Reviews könyvtár: $TARGET_DIR/$REVIEWS_DIR"

mkdir -p "$TARGET_DIR/$PROMPTS_DIR"
log_success "Prompts könyvtár: $TARGET_DIR/$PROMPTS_DIR"

# Fájlok másolása
log_info "Fájlok másolása..."

copy_file() {
    local src="$1"
    local dest="$2"
    local desc="$3"

    if [[ -f "$dest" && "$FORCE" != "true" ]]; then
        log_warn "$desc már létezik, kihagyva: $dest"
        return 0
    fi

    cp "$src" "$dest"
    log_success "$desc: $dest"
}

# Scripts
copy_file "$SCRIPT_DIR/scripts/dual-ai-review.sh" "$TARGET_DIR/$REVIEWS_DIR/dual-ai-review.sh" "Fő script"
copy_file "$SCRIPT_DIR/scripts/create-review.sh" "$TARGET_DIR/$REVIEWS_DIR/create-review.sh" "Review létrehozó"

# Templates
copy_file "$SCRIPT_DIR/templates/_TEMPLATE.md" "$TARGET_DIR/$REVIEWS_DIR/_TEMPLATE.md" "Review template"
copy_file "$SCRIPT_DIR/templates/README.md" "$TARGET_DIR/$REVIEWS_DIR/README.md" "Reviews README"

# Prompts
copy_file "$SCRIPT_DIR/prompts/code-review-claude.md" "$TARGET_DIR/$PROMPTS_DIR/code-review-claude.md" "Claude prompt"
copy_file "$SCRIPT_DIR/prompts/code-review-gemini.md" "$TARGET_DIR/$PROMPTS_DIR/code-review-gemini.md" "Gemini prompt"

# Jogosultságok
log_info "Jogosultságok beállítása..."
chmod +x "$TARGET_DIR/$REVIEWS_DIR"/*.sh
log_success "Scriptek futtathatóak"

# Konfiguráció frissítése
log_info "Konfiguráció frissítése..."

# Prompt útvonalak frissítése a főscriptben
sed -i "s|_bmad/bmm/prompts|$PROMPTS_DIR|g" "$TARGET_DIR/$REVIEWS_DIR/dual-ai-review.sh" 2>/dev/null || true

log_success "Konfiguráció frissítve"

# Összefoglaló
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Telepítés sikeres!                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
log_info "Telepített fájlok:"
echo "    $TARGET_DIR/$REVIEWS_DIR/"
echo "    ├── dual-ai-review.sh      (fő script)"
echo "    ├── create-review.sh       (review létrehozó)"
echo "    ├── _TEMPLATE.md           (review template)"
echo "    └── README.md              (dokumentáció)"
echo ""
echo "    $TARGET_DIR/$PROMPTS_DIR/"
echo "    ├── code-review-claude.md  (Claude prompt)"
echo "    └── code-review-gemini.md  (Gemini prompt)"
echo ""
log_info "Használat:"
echo ""
echo "    # Új review létrehozása"
echo "    cd $TARGET_DIR/$REVIEWS_DIR"
echo "    ./dual-ai-review.sh -c <story-id> <fájlok...>"
echo ""
echo "    # Review futtatása"
echo "    ./dual-ai-review.sh epic-1/my-story-review.md"
echo ""
log_info "Részletes dokumentáció: $TARGET_DIR/$REVIEWS_DIR/README.md"
echo ""
