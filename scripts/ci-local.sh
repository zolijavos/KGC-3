#!/bin/bash
#
# KGC ERP - Run CI Pipeline Locally
#
# Usage:
#   ./scripts/ci-local.sh           # Full CI pipeline simulation
#   ./scripts/ci-local.sh --fast    # Skip build, run tests only
#   ./scripts/ci-local.sh --e2e     # E2E tests only
#   ./scripts/ci-local.sh --yolo    # YOLO mode (fast, no retries)
#
# This script simulates the GitHub Actions CI pipeline locally
# to catch issues before pushing.

set -e

# Parse arguments
FAST=false
E2E_ONLY=false
YOLO=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --fast)
            FAST=true
            shift
            ;;
        --e2e)
            E2E_ONLY=true
            shift
            ;;
        --yolo)
            YOLO=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--fast] [--e2e] [--yolo]"
            exit 1
            ;;
    esac
done

echo "================================================"
echo "KGC ERP - Local CI Pipeline"
echo "================================================"
echo "Fast mode: $FAST"
echo "E2E only: $E2E_ONLY"
echo "YOLO mode: $YOLO"
echo ""

# Set CI environment
export CI=true

if [ "$YOLO" = true ]; then
    export TEST_YOLO=true
fi

# Step 1: Lint & Type Check (skip if --e2e)
if [ "$E2E_ONLY" = false ]; then
    echo "================================================"
    echo "Step 1: Lint & Type Check"
    echo "================================================"

    echo "Running linter..."
    pnpm lint || { echo "❌ Lint failed"; exit 1; }

    echo "Running type check..."
    pnpm typecheck || { echo "❌ Type check failed"; exit 1; }

    echo "Checking format..."
    pnpm format:check || { echo "❌ Format check failed"; exit 1; }

    echo "✅ Lint & Type Check passed"
    echo ""
fi

# Step 2: Unit Tests (skip if --fast or --e2e)
if [ "$FAST" = false ] && [ "$E2E_ONLY" = false ]; then
    echo "================================================"
    echo "Step 2: Unit Tests"
    echo "================================================"

    echo "Running unit tests..."
    pnpm test || { echo "❌ Unit tests failed"; exit 1; }

    echo "✅ Unit tests passed"
    echo ""
fi

# Step 3: Build (skip if --fast)
if [ "$FAST" = false ]; then
    echo "================================================"
    echo "Step 3: Build"
    echo "================================================"

    echo "Building applications..."
    pnpm build || { echo "❌ Build failed"; exit 1; }

    echo "✅ Build passed"
    echo ""
fi

# Step 4: E2E Tests
echo "================================================"
echo "Step 4: E2E Tests"
echo "================================================"

if [ "$YOLO" = true ]; then
    echo "Running E2E tests (YOLO mode)..."
    pnpm test:e2e:yolo || { echo "❌ E2E tests failed"; exit 1; }
else
    echo "Running E2E tests..."
    pnpm test:e2e || { echo "❌ E2E tests failed"; exit 1; }
fi

echo "✅ E2E tests passed"
echo ""

# Summary
echo "================================================"
echo "CI Pipeline Complete"
echo "================================================"
echo "✅ All steps passed!"
echo ""
echo "Your code is ready to push. 🚀"
