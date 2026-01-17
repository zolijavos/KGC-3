# Story 5.6: Form Components és Validation

## Status: done

## User Story

**As a** fejlesztő,
**I want** form komponenseket Zod validációval,
**So that** konzisztens form kezelést kapjak.

## Acceptance Criteria

- [x] AC1: React Hook Form + Zod integráció
- [x] AC2: FormField, FormLabel, FormMessage, FormDescription komponensek
- [x] AC3: Client-side és server-side validáció
- [x] AC4: Magyar nyelvű hibaüzenetek
- [x] AC5: Textarea, Switch, RadioGroup komponensek
- [x] AC6: FormProvider context

## Technical Context

**Package:** @kgc/ui
**Architecture:** ADR-023 (Composable frontend with shadcn/ui)

**Dependencies:**
- react-hook-form
- @hookform/resolvers
- zod
- @testing-library/user-event

**Related Files:**
- packages/shared/ui/src/components/ui/form.tsx
- packages/shared/ui/src/components/ui/textarea.tsx
- packages/shared/ui/src/components/ui/switch.tsx
- packages/shared/ui/src/components/ui/radio-group.tsx
- packages/shared/ui/src/lib/validation/index.ts

## Tasks

1. [x] Install react-hook-form, @hookform/resolvers, zod
2. [x] Create Form components (Form, FormField, FormItem, FormLabel, etc.)
3. [x] Create Textarea component
4. [x] Create Switch component
5. [x] Create RadioGroup component
6. [x] Create validation utilities with Hungarian error messages
7. [x] Write unit tests for all components
8. [x] Export all from index.ts

## Test Plan

- Unit tests: Vitest with @testing-library/react
- Test files: tests/components/form.spec.tsx, etc.
- Coverage target: 80%+

## Implementation Summary

### Components Created

1. **Form Components** (form.tsx):
   - Form (wraps FormProvider)
   - FormField, FormItem, FormLabel
   - FormControl, FormDescription, FormMessage
   - useFormField hook

2. **Textarea Component** (textarea.tsx):
   - Standard textarea with shadcn/ui styling

3. **Switch Component** (switch.tsx):
   - Radix UI based toggle switch

4. **RadioGroup Component** (radio-group.tsx):
   - RadioGroup and RadioGroupItem

### Validation Utilities (lib/validation/index.ts)

- **hungarianErrorMap**: Global Zod error map for Hungarian messages
- **commonSchemas**: Pre-built schemas for common fields:
  - email, phone, taxNumber, iban
  - password, pin
  - requiredString, optionalString
  - positiveNumber, nonNegativeNumber
  - pastDate, futureDate, uuid
- **createValidationSchema**: Helper function
- Re-exports zod for convenience

### Test Coverage

- 567 tests passing
- 89.8% overall coverage
- 85.43% validation coverage

## Notes

- Form components use Context API for field registration
- Zod schemas can be shared between client and server
- Hungarian messages configured in validation/index.ts

## Changelog

- 2026-01-16: Story created (in-progress)
- 2026-01-16: Implementation completed - all components working, 567 tests passing (done)
