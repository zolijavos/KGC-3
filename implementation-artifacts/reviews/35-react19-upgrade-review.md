# Adversarial Code Review: React 19 Upgrade + Widget Tests

**Story:** React 19 compatibility upgrade (Stories 35-5, 35-6)
**Reviewer:** Claude Code (Adversarial Mode)
**Dátum:** 2026-02-04
**Commit:** b81c2eb feat(ui): React 19 compatibility upgrade + widget unit tests

---

## Review Summary

| Kategória    | Talált Problémák |
| ------------ | ---------------- |
| **CRITICAL** | 1                |
| **HIGH**     | 3                |
| **MEDIUM**   | 4                |
| **LOW**      | 2                |
| **Összesen** | **10**           |

---

## CRITICAL Issues

### CR-1: Missing `TooltipProvider` wrapper in test setup

**Fájl:** `apps/kgc-web/src/features/dashboard/widgets/__tests__/WarrantyRatioPlaceholder.test.tsx:12-14`

**Probléma:** A Radix UI Tooltip komponens **KÖTELEZŐEN** `TooltipProvider`-t igényel a fa tetején. A tesztek működhetnek (mert a komponens tartalmaz belső provider-t), de production-ben nem konzisztens viselkedést eredményezhet.

```tsx
// HIBÁS - nincs TooltipProvider
const renderWidget = () => {
  return render(<WarrantyRatioPlaceholder />);
};

// HELYES - TooltipProvider wrapper
const renderWidget = () => {
  return render(
    <TooltipProvider>
      <WarrantyRatioPlaceholder />
    </TooltipProvider>
  );
};
```

**Érintett fájlok:**

- `WarrantyRatioPlaceholder.test.tsx`
- `PartnerCreditPlaceholder.test.tsx`

**Javítás:** Wrapper hozzáadása mindkét teszt fájlhoz.

---

## HIGH Issues

### CR-2: React Testing Library best practice violation - `fireEvent.focus` vs `userEvent`

**Fájl:** `WarrantyRatioPlaceholder.test.tsx:78`, `PartnerCreditPlaceholder.test.tsx:78`

**Probléma:** A React Testing Library dokumentáció szerint `userEvent` preferált `fireEvent` helyett, mert reálisabban szimulálja a felhasználói interakciót. A `fireEvent.focus` nem triggereli a tooltip-et megbízhatóan.

```tsx
// HIBÁS
fireEvent.focus(infoIcon);

// HELYES
import userEvent from '@testing-library/user-event';
await userEvent.hover(infoIcon);
```

**Impact:** Flaky tesztek - a tooltip nem mindig jelenik meg.

---

### CR-3: Inconsistent API mock pattern between test files

**Fájl:** Több widget teszt fájl

**Probléma:** A mock import sorrendje nem konzisztens. A `vi.mock()` a hoisting miatt működik, de a pattern nem egyértelmű:

```tsx
// Jelenlegi (működik, de confusing)
vi.mock('@/api/client', () => ({
  api: { get: vi.fn() },
}));
import { api } from '@/api/client';

// Javasolt (explicit)
import { api } from '@/api/client';
vi.mock('@/api/client');
vi.mocked(api.get).mockResolvedValue(...);
```

**Impact:** Maintainability - nehéz megérteni új fejlesztőknek.

---

### CR-4: Missing error state test coverage

**Fájl:** Összes widget teszt

**Probléma:** Egyik widget teszt sem teszteli az API hiba esetét:

```tsx
// HIÁNYZIK
it('[P1] should display error state when API fails', async () => {
  vi.mocked(api.get).mockRejectedValue(new Error('Network error'));
  renderWidget();
  await waitFor(() => {
    expect(screen.getByText(/hiba|error/i)).toBeInTheDocument();
  });
});
```

**Impact:** A widget error boundary/error state nem tesztelt - production crash-eket okozhat.

---

## MEDIUM Issues

### CR-5: Hardcoded timeout values in tooltip tests

**Fájl:** `WarrantyRatioPlaceholder.test.tsx:87`, `PartnerCreditPlaceholder.test.tsx:87`

**Probléma:** A `{ timeout: 1000 }` hardcoded érték:

```tsx
await waitFor(
  () => { ... },
  { timeout: 1000 }
);
```

**Javaslat:** Konstansba kiemelni vagy `waitFor` default timeout-ot használni.

---

### CR-6: Test data coupling - mock data contains implementation details

**Fájl:** `ServiceRevenueWidget.test.tsx:24-33`

**Probléma:** A mock data túl specifikus - a `periodStart`/`periodEnd` ISO string formátum implementációs részlet:

```tsx
periodStart: '2026-01-28T00:00:00.000Z',
periodEnd: '2026-02-04T12:00:00.000Z',
```

Ha a backend formátum változik, a teszt nem fogja elkapni a hibát.

**Javaslat:** Factory pattern használata mock data-hoz.

---

### CR-7: Duplicate test logic across widget tests

**Fájl:** Összes widget teszt

**Probléma:** A következő pattern 8x ismétlődik:

```tsx
const renderWidget = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <SomeWidget />
    </QueryClientProvider>
  );
};
```

**Javaslat:** Közös test utility:

```tsx
// test-utils/render-widget.tsx
export const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({...});
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};
```

---

### CR-8: Type safety gap in tooltip.tsx

**Fájl:** `packages/shared/ui/src/components/ui/tooltip.tsx:14-16`

**Probléma:** A `React.ElementRef` és `React.ComponentPropsWithoutRef` típusok helyesek, de a re-export-ok nem tartalmaznak explicit típusokat:

```tsx
// Jelenlegi
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

// Biztonságosabb
const TooltipProvider: typeof TooltipPrimitive.Provider = TooltipPrimitive.Provider;
```

Nem kritikus, de konzisztencia a `form.tsx` mintával.

---

## LOW Issues

### CR-9: Color assertion weakness

**Fájl:** `TechnicianWorkloadWidget.test.tsx:160-201`, `TopPartnersWidget.test.tsx:168-195`

**Probléma:** A color coding tesztek gyengítve lettek:

```tsx
// Eredeti (specifikus)
expect(greenElements.length).toBeGreaterThan(0);

// Most (túl általános)
expect(screen.getByText('Nagy Péter')).toBeInTheDocument();
```

A color coding funkcionalitás ténylegesen nincs tesztelve.

**Javaslat:** Ha a Progress komponens nem támogatja a custom színeket, azt dokumentálni kell és/vagy a komponenst bővíteni.

---

### CR-10: Missing displayName for re-exported Tooltip components

**Fájl:** `tooltip.tsx:8-11`

**Probléma:** A `TooltipProvider`, `Tooltip`, `TooltipTrigger` nem kapnak `displayName`-et (csak `TooltipContent`). React DevTools-ban nehezebb debug.

```tsx
TooltipProvider.displayName = 'TooltipProvider';
Tooltip.displayName = 'Tooltip';
TooltipTrigger.displayName = 'TooltipTrigger';
```

---

## Összegzés

### Kötelező javítások (PR merge előtt):

1. **CR-1** - TooltipProvider wrapper hozzáadása tesztekhez
2. **CR-4** - Error state teszt coverage hozzáadása legalább 1-2 widget-hez

### Ajánlott javítások:

3. **CR-2** - userEvent használata fireEvent helyett
4. **CR-7** - Közös test utility létrehozása

### Alacsony prioritás (tech debt):

5-10. - Dokumentálni és backlog-ba felvenni

---

**Reviewer Decision:** ⚠️ **CONDITIONAL APPROVE**

A PR merge-elhető az alábbi feltételekkel:

- CR-1 és CR-4 javítása kötelező
- CR-2 javítása erősen ajánlott

---

_Generated by BMAD Adversarial Code Review Workflow_
