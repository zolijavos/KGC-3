#!/bin/bash
# Dual-AI Adversarial Code Review - Installer
# Installs Claude + Gemini code review system into any project
#
# Usage: ./install.sh [target-project-root]
# Example: ./install.sh /path/to/my-project

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_ROOT="${1:-.}"

# Resolve to absolute path
TARGET_ROOT="$(cd "$TARGET_ROOT" && pwd)"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Dual-AI Adversarial Code Review - Installer                 ║"
echo "║  Claude Code + Gemini CLI                                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Target: $TARGET_ROOT"
echo ""

# Check if target is a valid project
if [ ! -d "$TARGET_ROOT" ]; then
  echo "Error: Target directory does not exist: $TARGET_ROOT"
  exit 1
fi

# Create directories
echo "[1/4] Creating directories..."
mkdir -p "$TARGET_ROOT/implementation-artifacts/reviews"
mkdir -p "$TARGET_ROOT/_bmad/bmm/prompts"

# Copy review files
echo "[2/4] Copying review templates..."
cp "$SCRIPT_DIR/templates/_TEMPLATE.md" "$TARGET_ROOT/implementation-artifacts/reviews/"
cp "$SCRIPT_DIR/templates/README.md" "$TARGET_ROOT/implementation-artifacts/reviews/"
cp "$SCRIPT_DIR/templates/create-review.sh" "$TARGET_ROOT/implementation-artifacts/reviews/"
chmod +x "$TARGET_ROOT/implementation-artifacts/reviews/create-review.sh"

# Copy prompts
echo "[3/4] Copying AI prompts..."
cp "$SCRIPT_DIR/prompts/code-review-claude.md" "$TARGET_ROOT/_bmad/bmm/prompts/"
cp "$SCRIPT_DIR/prompts/code-review-gemini.md" "$TARGET_ROOT/_bmad/bmm/prompts/"

# Create example epic folder
echo "[4/4] Creating example structure..."
mkdir -p "$TARGET_ROOT/implementation-artifacts/reviews/epic-1"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Installation Complete!                                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Installed files:"
echo "  implementation-artifacts/reviews/"
echo "    ├── README.md"
echo "    ├── _TEMPLATE.md"
echo "    ├── create-review.sh"
echo "    └── epic-1/"
echo ""
echo "  _bmad/bmm/prompts/"
echo "    ├── code-review-claude.md"
echo "    └── code-review-gemini.md"
echo ""
echo "Next steps:"
echo "  1. Ensure docs/kgc3-development-principles.md exists (or similar)"
echo "  2. Ensure CLAUDE.md exists with project conventions"
echo "  3. Install Gemini CLI: npm install -g @google/gemini-cli"
echo "  4. Create your first review:"
echo "     cd implementation-artifacts/reviews"
echo "     ./create-review.sh 1-1-my-story path/to/files/*.ts"
echo ""
