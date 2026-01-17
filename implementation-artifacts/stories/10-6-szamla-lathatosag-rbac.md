# Story 10-6: Számla Láthatóság RBAC

## Story Info
- **Epic**: 10 - Invoice Core
- **Package**: @kgc/sales-invoice
- **Status**: DONE
- **Methodology**: TDD (Test-Driven Development)

## Description
Számla láthatóság és műveleti jogosultságok RBAC alapú kezelése TDD módszertannal.

## Acceptance Criteria
- [x] Confidential számla láthatóság korlátozása
- [x] Role-based megtekintési jogosultság
- [x] Role-based szerkesztési jogosultság
- [x] Role-based törlési jogosultság
- [x] Kiállítási jogosultság ellenőrzés
- [x] Sztornózási jogosultság ellenőrzés
- [x] Fizetés rögzítési jogosultság
- [x] Számlák szűrése láthatóság alapján

## Implementation Details

### Created Files
- `packages/aruhaz/sales-invoice/src/services/rbac.service.ts` - InvoiceRbacService
- `packages/aruhaz/sales-invoice/tests/rbac.service.spec.ts` - 37 tesztek

### Role Permissions

| Művelet | ADMIN | FINANCE | CASHIER | SALES | MANAGER |
|---------|-------|---------|---------|-------|---------|
| View (public) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View (confidential) | ✅ | ❓ | ❌ | ❌ | ❓ |
| Edit (DRAFT) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete (DRAFT) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Issue | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cancel/Storno | ✅ | ✅ | ❌ | ❌ | ❌ |
| Record Payment | ✅ | ✅ | ✅ | ❌ | ❌ |

❓ = Depends on visibleToRoles setting

### API Methods
```typescript
canView(invoice: IInvoice, userRoles: string[]): boolean
canEdit(invoice: IInvoice, userRoles: string[]): boolean
canDelete(invoice: IInvoice, userRoles: string[]): boolean
canIssue(invoice: IInvoice, userRoles: string[]): boolean
canCancel(invoice: IInvoice, userRoles: string[]): boolean
canRecordPayment(invoice: IInvoice, userRoles: string[]): boolean
filterByVisibility(invoices: IInvoice[], userRoles: string[]): IInvoice[]
assertCanView(invoice: IInvoice, userRoles: string[]): void
assertCanEdit(invoice: IInvoice, userRoles: string[]): void
```

### Confidential Invoice Rules
1. Non-confidential invoices: visible to all
2. Confidential invoices:
   - ADMIN/SUPER_ADMIN: always visible
   - Others: visible only if role is in `visibleToRoles` array
   - Empty `visibleToRoles`: only ADMIN/SUPER_ADMIN can view

## TDD Test Coverage
- **37 teszt** sikeresen fut
- Confidential és non-confidential megtekintés
- Admin override tesztelése
- visibleToRoles szűrés
- Szerkesztési, törlési jogosultságok
- Kiállítási jogosultság
- Sztornózási jogosultság
- Fizetés rögzítés jogosultság
- Tömeges szűrés (filterByVisibility)
- Assert metódusok

## Test Results
```
✓ tests/rbac.service.spec.ts (37 tests)
```

## Completed
- Date: 2026-01-17
- Developer: Claude AI (Epic Auto-Pilot)
