#!/bin/bash
#
# KGC ERP - Local Burn-In Testing
#
# Usage:
#   ./scripts/burn-in.sh              # 10 iterations, critical tests
#   ./scripts/burn-in.sh 5            # 5 iterations
#   ./scripts/burn-in.sh 10 @Auth     # 10 iterations, only @Auth tests
#
# Runs the same burn-in loop as the CI pipeline locally
# to catch flaky tests before they hit CI.

set -e

ITERATIONS=${1:-10}
FILTER=${2:-""}

echo "================================================"
echo "KGC ERP - Local Burn-In Testing"
echo "================================================"
echo "Iterations: $ITERATIONS"
echo "Filter: ${FILTER:-'(all critical tests)'}"
echo ""

FAILED=0
SUCCESS=0
FAILED_ITERATIONS=""

for i in $(seq 1 $ITERATIONS); do
    echo "------------------------------------------------"
    echo "Iteration $i of $ITERATIONS"
    echo "------------------------------------------------"

    START_TIME=$(date +%s)

    if [ -n "$FILTER" ]; then
        if pnpm test:e2e:critical --grep "$FILTER" --retries=0 2>&1; then
            SUCCESS=$((SUCCESS + 1))
            RESULT="✅ PASS"
        else
            FAILED=$((FAILED + 1))
            FAILED_ITERATIONS="$FAILED_ITERATIONS $i"
            RESULT="❌ FAIL"
        fi
    else
        if pnpm test:e2e:critical --retries=0 2>&1; then
            SUCCESS=$((SUCCESS + 1))
            RESULT="✅ PASS"
        else
            FAILED=$((FAILED + 1))
            FAILED_ITERATIONS="$FAILED_ITERATIONS $i"
            RESULT="❌ FAIL"
        fi
    fi

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    echo "$RESULT (${DURATION}s)"
    echo ""
done

echo "================================================"
echo "BURN-IN SUMMARY"
echo "================================================"
echo ""
echo "Total iterations: $ITERATIONS"
echo "Passed:           $SUCCESS"
echo "Failed:           $FAILED"
echo "Success rate:     $(( SUCCESS * 100 / ITERATIONS ))%"

if [ $FAILED -gt 0 ]; then
    echo ""
    echo "Failed iterations:$FAILED_ITERATIONS"
    echo ""
    echo "❌ BURN-IN FAILED"
    echo ""
    echo "Tips for debugging:"
    echo "  1. Check test-results/ for failure traces"
    echo "  2. Run specific failing test with: pnpm test:e2e --grep 'test name' --debug"
    echo "  3. Look for timing issues, race conditions, or external dependencies"
    exit 1
else
    echo ""
    echo "✅ BURN-IN PASSED"
    echo ""
    echo "All $ITERATIONS iterations completed successfully."
    echo "Tests are stable and ready for CI."
fi
