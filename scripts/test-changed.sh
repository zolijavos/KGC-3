#!/bin/bash
#
# KGC ERP - Run E2E Tests for Changed Files Only
#
# Usage:
#   ./scripts/test-changed.sh              # Tests affected by changes since main
#   ./scripts/test-changed.sh develop      # Tests affected by changes since develop
#   ./scripts/test-changed.sh HEAD~3       # Tests affected by last 3 commits
#
# This script identifies E2E tests that may be affected by code changes
# and runs only those tests for faster feedback.

set -e

BASE_BRANCH="${1:-main}"

echo "================================================"
echo "KGC ERP - Selective E2E Testing"
echo "================================================"
echo "Base branch: $BASE_BRANCH"
echo ""

# Get changed files
CHANGED_FILES=$(git diff --name-only "$BASE_BRANCH"...HEAD 2>/dev/null || git diff --name-only HEAD~1)

if [ -z "$CHANGED_FILES" ]; then
    echo "No changes detected. Running critical tests only."
    pnpm test:e2e:critical
    exit 0
fi

echo "Changed files:"
echo "$CHANGED_FILES" | head -20
if [ $(echo "$CHANGED_FILES" | wc -l) -gt 20 ]; then
    echo "... and more"
fi
echo ""

# Determine which test suites to run based on changed files
TESTS_TO_RUN=""

# Auth changes -> run auth tests
if echo "$CHANGED_FILES" | grep -qE 'packages/core/auth|apps/kgc-api.*auth'; then
    TESTS_TO_RUN="$TESTS_TO_RUN @Auth"
    echo "📦 Auth package changed -> @Auth tests"
fi

# Rental changes -> run rental tests
if echo "$CHANGED_FILES" | grep -qE 'packages/berles|rental'; then
    TESTS_TO_RUN="$TESTS_TO_RUN @Berles"
    echo "📦 Rental package changed -> @Berles tests"
fi

# Service changes -> run service tests
if echo "$CHANGED_FILES" | grep -qE 'packages/szerviz|service'; then
    TESTS_TO_RUN="$TESTS_TO_RUN @Szerviz"
    echo "📦 Service package changed -> @Szerviz tests"
fi

# Sales/POS changes -> run aruhaz tests
if echo "$CHANGED_FILES" | grep -qE 'packages/aruhaz|sales|pos'; then
    TESTS_TO_RUN="$TESTS_TO_RUN @Aruhaz"
    echo "📦 Sales package changed -> @Aruhaz tests"
fi

# Invoice/NAV changes -> run NAV tests
if echo "$CHANGED_FILES" | grep -qE 'nav-online|szamlazz|invoice'; then
    TESTS_TO_RUN="$TESTS_TO_RUN @NAV"
    echo "📦 Invoice package changed -> @NAV tests"
fi

# Tenant changes -> run multi-tenant tests
if echo "$CHANGED_FILES" | grep -qE 'packages/core/tenant|rls|multi-tenant'; then
    TESTS_TO_RUN="$TESTS_TO_RUN @Multi-tenant"
    echo "📦 Tenant package changed -> @Multi-tenant tests"
fi

# UI changes -> run smoke tests
if echo "$CHANGED_FILES" | grep -qE 'packages/shared/ui|apps/kgc-web'; then
    TESTS_TO_RUN="$TESTS_TO_RUN @smoke"
    echo "📦 UI package changed -> @smoke tests"
fi

# E2E test changes -> run the changed tests directly
if echo "$CHANGED_FILES" | grep -qE 'e2e/.*\.e2e\.ts'; then
    E2E_FILES=$(echo "$CHANGED_FILES" | grep 'e2e/.*\.e2e\.ts')
    echo "📝 E2E test files changed:"
    echo "$E2E_FILES"
fi

echo ""
echo "================================================"

# If specific tests identified, run them
if [ -n "$TESTS_TO_RUN" ]; then
    # Build grep pattern from test tags
    PATTERN=$(echo "$TESTS_TO_RUN" | tr ' ' '|' | sed 's/^|//;s/|$//')
    echo "Running tests matching: $PATTERN"
    echo ""
    pnpm test:e2e --grep "$PATTERN"
elif [ -n "$E2E_FILES" ]; then
    # Run only changed E2E files
    echo "Running only changed E2E test files..."
    echo ""
    pnpm test:e2e $E2E_FILES
else
    # Default: run critical tests
    echo "No specific test suite identified. Running critical tests."
    echo ""
    pnpm test:e2e:critical
fi

echo ""
echo "✅ Selective testing complete"
