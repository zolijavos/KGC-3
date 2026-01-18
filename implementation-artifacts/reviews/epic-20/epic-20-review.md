# Epic 20 Code Review - Service Norma (@kgc/service-norma)

**Review Date**: 2026-01-17
**Reviewer**: Claude (BMAD Adversarial Review)
**Status**: COMPLETED - Auto-fixes Applied

---

## Summary

| Severity | Count | Auto-fixed |
|----------|-------|------------|
| HIGH     | 1     | 1          |
| MEDIUM   | 4     | 2          |
| LOW      | 2     | 0          |
| **Total**| **7** | **3**      |

---

## Issues Found

### Issue #1 - HIGH - CSV Parsing Doesn't Handle Quoted Fields
**File**: `norma-import.service.ts:172`
**Description**: The CSV parser uses simple comma splitting which will break if fields contain commas (e.g., "Motor, 3-phase" as description).
**Impact**: Import will fail or produce corrupted data for legitimate CSV files.
**Fix**: Add proper CSV field handling with quote support.
**Auto-fixed**: YES

### Issue #2 - MEDIUM - No Duplicate Norma Code Check
**File**: `norma-import.service.ts:62-97`
**Description**: During import, there's no check for duplicate norma codes within the same import batch.
**Impact**: Multiple items with the same code could be created, causing lookup ambiguity.
**Fix**: Add duplicate detection and skip/error on duplicates.
**Auto-fixed**: YES

### Issue #3 - MEDIUM - searchNormaCodes Loads All Items Into Memory
**File**: `norma-labor.service.ts:132-139`
**Description**: The search loads all items from a version into memory and filters client-side.
**Impact**: Doesn't scale with large norma lists (thousands of items). Performance issue.
**Fix**: Add search method to repository interface for database-level filtering.
**Auto-fixed**: NO (infrastructure change - tracked as tech debt)

### Issue #4 - MEDIUM - Missing Warranty Check
**File**: `norma-labor.service.ts:44-51`
**Description**: The worksheet has `isWarranty` flag but it's not used. Norma pricing typically only applies to warranty work.
**Impact**: Non-warranty worksheets might incorrectly use warranty norma pricing.
**Fix**: Add warning log when using norma on non-warranty worksheet.
**Auto-fixed**: YES

### Issue #5 - MEDIUM - No Transaction Wrapper
**File**: `norma-import.service.ts:103-132`
**Description**: The import creates version, archives old version, and creates items without a transaction.
**Impact**: If item creation fails, we'd have an orphaned version with no items.
**Fix**: Wrap in transaction at repository/database layer.
**Auto-fixed**: NO (infrastructure dependency - tracked as tech debt)

### Issue #6 - LOW - Missing List Versions Method
**File**: `norma-version.service.ts`
**Description**: There's no method to list all versions for a supplier (for UI version history).
**Impact**: Cannot display version history in admin UI.
**Fix**: Add listVersionsBySupplier method.
**Auto-fixed**: NO (scope expansion - deferred)

### Issue #7 - LOW - Hourly Rate Validation Warning
**File**: `norma-import.service.ts:85`
**Description**: If hourlyRate is 0, labor cost will be 0 which might be unintended.
**Impact**: Could result in 0 labor cost items being created.
**Fix**: Track as warning in import errors (not blocking).
**Auto-fixed**: NO (minor - existing behavior acceptable)

---

## Auto-Fix Summary

The following fixes were applied automatically:

1. **CSV quote handling** - Added proper CSV field parsing with quote support
2. **Duplicate code detection** - Added check and error for duplicate norma codes in import
3. **Warranty check warning** - Added console warning for non-warranty worksheet usage

---

## Recommendations

1. Add transaction support at repository layer for atomic imports
2. Move search to database-level filtering for scalability
3. Consider adding version listing endpoint for admin UI

---

## Test Results After Auto-Fix

```
 ✓ src/services/norma-import.service.spec.ts (10 tests)
 ✓ src/services/norma-labor.service.spec.ts (10 tests)
 ✓ src/services/norma-version.service.spec.ts (9 tests)

 Test Files  3 passed (3)
      Tests  29 passed (29)
```

---

## Conclusion

Epic 20 implementation meets the core requirements with 7 issues identified.
3 issues were auto-fixed. Remaining issues are tracked for future work.

**Verdict**: APPROVED with fixes applied
