# Story 5.1: shadcn/ui Setup és Core Components

**Status:** done
**Epic:** Epic 5 - UI Component Library (@kgc/ui)
**Package:** `packages/shared/ui/` → `@kgc/ui`
**FR:** FR116-FR121 (PWA & Offline), NFR-U1-U10 (Usability)

---

## Story

**As a** fejlesztő,
**I want** shadcn/ui komponens könyvtárat használni,
**So that** konzisztens UI-t építhessek a KGC ERP-hez.

---

## Acceptance Criteria

### AC1: Package és Projekt Struktúra Létrehozása

**Given** üres packages/shared/ui mappa
**When** Story implementálva
**Then** @kgc/ui package létrejön a következő struktúrával:
```
packages/shared/ui/
├── package.json          # @kgc/ui scope
├── tsconfig.json         # Extends base, strict mode
├── vite.config.ts        # Library build config
├── tailwind.config.ts    # Tailwind preset export
├── src/
│   ├── index.ts          # Public exports
│   ├── components/
│   │   └── ui/           # shadcn/ui komponensek
│   ├── lib/
│   │   └── utils.ts      # cn() utility
│   └── styles/
│       └── globals.css   # Base styles + CSS variables
└── tests/
    └── setup.ts
```

### AC2: Tailwind CSS Konfiguráció

**Given** @kgc/ui package
**When** Tailwind konfigurálva
**Then** tailwind.config.ts exportálja a KGC preset-et:
- Custom colors (brand primary, secondary, accent)
- Responsive breakpoints (sm: 640px, md: 768px, lg: 1024px, xl: 1280px)
- Dark mode: "class" strategy
- Custom spacing és typography
**And** CSS variables definiálva a theming-hez (franchise white-label)
**And** @tailwindcss/forms és @tailwindcss/typography plugin aktív

### AC3: Core UI Komponensek (shadcn/ui)

**Given** shadcn/ui CLI telepítve
**When** core komponensek hozzáadva
**Then** az alábbi komponensek elérhetők:

| Komponens | Típus | shadcn/ui Név |
|-----------|-------|---------------|
| Button | Forms | button |
| Input | Forms | input |
| Select | Forms | select |
| Checkbox | Forms | checkbox |
| Label | Forms | label |
| Card | Layout | card |
| Separator | Layout | separator |
| Table | Data Display | table |
| Badge | Data Display | badge |
| Dialog (Modal) | Overlay | dialog |
| Toast | Feedback | toast (sonner) |
| Skeleton | Feedback | skeleton |
| Alert | Feedback | alert |

**And** minden komponens TypeScript-ben van írva strict mode-dal
**And** minden komponens exportálva van index.ts-ből

### AC4: cn() Utility és Class Merging

**Given** Tailwind class-ok kezelése
**When** cn() utility implementálva
**Then** clsx + tailwind-merge kombináció működik:
```typescript
import { cn } from '@kgc/ui';
cn('px-4 py-2', isActive && 'bg-primary', className);
```
**And** re-exportálva @kgc/ui-ból

### AC5: Dark/Light Theme Support

**Given** felhasználói preferencia
**When** theme váltás történik
**Then** dark mode működik "class" strategy-val:
- `<html class="dark">` → dark mode aktív
- CSS variables átváltanak (--background, --foreground, --primary, stb.)
- System preference detection (prefers-color-scheme)
**And** franchise setting override: "Force Light" / "Force Dark" / "System Default"
**And** minimum 4.5:1 kontraszt arány mindkét módban (WCAG 2.1 AA)

### AC6: Franchise Theming CSS Variables

**Given** multi-tenant franchise modell (ADR-001)
**When** franchise bejelentkezik
**Then** CSS variables tenant-specifikus értékeket kaphatnak:
```css
:root {
  --brand-primary: 222.2 47.4% 11.2%;  /* Default KGC */
  --brand-secondary: ...;
  --brand-accent: ...;
}
[data-tenant="franchise-xyz"] {
  --brand-primary: 210 100% 50%;  /* Franchise override */
}
```
**And** logo és színek testreszabhatók tenant config-ból

### AC7: Unit Tests (TDD)

**Given** TDD módszertan
**When** komponensek implementálva
**Then** min 15 unit teszt Vitest-tel:
- cn() utility tesztek (class merging)
- Button variants tesztek (default, destructive, outline, ghost)
- Input validation integration
- Card composition tesztek
- Toast trigger tesztek
- Dark mode class toggle tesztek
**And** test coverage > 80%

### AC8: Storybook Setup (Opcionális)

**Given** komponens dokumentáció igény
**When** Storybook konfigurálva
**Then** minden komponenshez story fájl:
- Default state
- All variants
- Dark mode preview
**And** Storybook futtatható: `pnpm --filter @kgc/ui storybook`

---

## Tasks / Subtasks

- [x] **Task 1: Package Scaffolding** (AC: #1)
  - [x] 1.1: `packages/shared/ui/` mappa létrehozása
  - [x] 1.2: `package.json` létrehozása (@kgc/ui, dependencies)
  - [x] 1.3: `tsconfig.json` létrehozása (extends base, strict)
  - [x] 1.4: `vite.config.ts` library build config
  - [x] 1.5: Workspace integration (pnpm-workspace.yaml)

- [x] **Task 2: Tailwind CSS Setup** (AC: #2, #5, #6)
  - [x] 2.1: Tailwind CSS + PostCSS installáció
  - [x] 2.2: `tailwind.config.ts` preset konfiguráció
  - [x] 2.3: CSS variables definíció (globals.css)
  - [x] 2.4: Dark mode "class" strategy
  - [x] 2.5: Responsive breakpoints (sm, md, lg, xl)
  - [x] 2.6: @tailwindcss/forms, @tailwindcss/typography plugins

- [x] **Task 3: shadcn/ui Base Setup** (AC: #3, #4)
  - [x] 3.1: shadcn/ui CLI init (`npx shadcn@latest init`)
  - [x] 3.2: `lib/utils.ts` - cn() utility (clsx + tailwind-merge)
  - [x] 3.3: components.json konfiguráció

- [x] **Task 4: Core Form Komponensek** (AC: #3)
  - [x] 4.1: Button komponens (`npx shadcn@latest add button`)
  - [x] 4.2: Input komponens
  - [x] 4.3: Select komponens
  - [x] 4.4: Checkbox komponens
  - [x] 4.5: Label komponens

- [x] **Task 5: Layout Komponensek** (AC: #3)
  - [x] 5.1: Card komponens
  - [x] 5.2: Separator komponens

- [x] **Task 6: Data Display Komponensek** (AC: #3)
  - [x] 6.1: Table komponens
  - [x] 6.2: Badge komponens

- [x] **Task 7: Overlay és Feedback Komponensek** (AC: #3)
  - [x] 7.1: Dialog (Modal) komponens
  - [x] 7.2: Toast komponens (sonner)
  - [x] 7.3: Skeleton komponens
  - [x] 7.4: Alert komponens

- [x] **Task 8: Exports és Integration** (AC: #1, #4)
  - [x] 8.1: `src/index.ts` - összes komponens export
  - [x] 8.2: Tailwind preset export (használható más packages-ben)
  - [x] 8.3: CSS import path dokumentáció

- [x] **Task 9: Unit Tests** (AC: #7) - TDD
  - [x] 9.1: cn() utility tesztek
  - [x] 9.2: Button tesztek (variants, disabled, loading)
  - [x] 9.3: Input tesztek
  - [x] 9.4: Card tesztek
  - [x] 9.5: Toast tesztek
  - [x] 9.6: Theme toggle tesztek
  - [x] 9.7: Test setup (vitest.config.ts, @testing-library/react)

- [ ] **Task 10: Storybook (Opcionális)** (AC: #8)
  - [ ] 10.1: Storybook installáció
  - [ ] 10.2: Button.stories.tsx
  - [ ] 10.3: Input.stories.tsx
  - [ ] 10.4: Card.stories.tsx
  - [ ] 10.5: Dialog.stories.tsx

---

## Dev Notes

### Technológiai Stack (project-context.md + Architecture)

| Technológia | Verzió | Használat |
|-------------|--------|-----------|
| React | 18.x | UI Framework |
| TypeScript | 5.3+ | Strict mode |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.4.x | Utility-first CSS |
| shadcn/ui | latest | Component primitives |
| Radix UI | latest | Accessible primitives (shadcn dependency) |
| clsx | 2.x | Conditional classes |
| tailwind-merge | 2.x | Class deduplication |
| Vitest | 2.1+ | Unit tesztek |
| @testing-library/react | 14.x | Component testing |

### KRITIKUS: Package Struktúra (ADR-010)

```
packages/shared/ui/               # @kgc/ui
├── package.json
│   {
│     "name": "@kgc/ui",
│     "version": "0.1.0",
│     "type": "module",
│     "main": "./dist/index.js",
│     "module": "./dist/index.js",
│     "types": "./dist/index.d.ts",
│     "exports": {
│       ".": {
│         "import": "./dist/index.js",
│         "types": "./dist/index.d.ts"
│       },
│       "./globals.css": "./src/styles/globals.css",
│       "./tailwind.config": "./tailwind.config.ts"
│     },
│     "peerDependencies": {
│       "react": "^18.0.0",
│       "react-dom": "^18.0.0"
│     },
│     "dependencies": {
│       "@radix-ui/react-dialog": "^1.0.0",
│       "@radix-ui/react-select": "^2.0.0",
│       "@radix-ui/react-checkbox": "^1.0.0",
│       "@radix-ui/react-label": "^2.0.0",
│       "@radix-ui/react-slot": "^1.0.0",
│       "class-variance-authority": "^0.7.0",
│       "clsx": "^2.0.0",
│       "tailwind-merge": "^2.0.0",
│       "sonner": "^1.0.0"
│     },
│     "devDependencies": {
│       "tailwindcss": "^3.4.0",
│       "@tailwindcss/forms": "^0.5.0",
│       "@tailwindcss/typography": "^0.5.0",
│       "postcss": "^8.0.0",
│       "autoprefixer": "^10.0.0"
│     }
│   }
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json              # shadcn/ui config
├── src/
│   ├── index.ts                 # Public exports
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── checkbox.tsx
│   │       ├── label.tsx
│   │       ├── card.tsx
│   │       ├── separator.tsx
│   │       ├── table.tsx
│   │       ├── badge.tsx
│   │       ├── dialog.tsx
│   │       ├── toast.tsx        # sonner wrapper
│   │       ├── skeleton.tsx
│   │       └── alert.tsx
│   ├── lib/
│   │   └── utils.ts             # cn() utility
│   └── styles/
│       └── globals.css          # Base styles + CSS variables
└── tests/
    ├── setup.ts
    ├── utils.spec.ts
    └── components/
        ├── button.spec.tsx
        └── ...
```

### shadcn/ui Inicializálás

**FONTOS:** A shadcn/ui NEM npm package, hanem copy-paste komponensek!

```bash
# 1. Package mappában
cd packages/shared/ui

# 2. shadcn/ui init
npx shadcn@latest init

# Válaszok:
# - Style: New York
# - Base color: Slate
# - CSS variables: yes
# - tailwind.config.ts location: ./tailwind.config.ts
# - components.json location: ./components.json
# - Components alias: @/components
# - Utils alias: @/lib/utils

# 3. Komponensek hozzáadása
npx shadcn@latest add button input select checkbox label card separator table badge dialog alert skeleton

# 4. Toast (sonner)
npx shadcn@latest add sonner
```

### cn() Utility Pattern

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 * @example cn('px-4 py-2', isActive && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

### Tailwind Config Preset

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

const config: Config = {
  darkMode: 'class', // AC#5: class strategy
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // CSS variables for theming (AC#6)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // KGC brand colors
        brand: {
          primary: 'hsl(var(--brand-primary))',
          secondary: 'hsl(var(--brand-secondary))',
          accent: 'hsl(var(--brand-accent))',
        },
      },
      // Responsive breakpoints (UX Design)
      screens: {
        sm: '640px',   // Tablet portrait
        md: '768px',   // Tablet landscape
        lg: '1024px',  // Laptop
        xl: '1280px',  // Desktop
        '2xl': '1536px',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [forms, typography],
};

export default config;
```

### CSS Variables (globals.css)

```css
/* src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* shadcn/ui default theme */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;

    /* KGC Brand (AC#6 - Franchise theming) */
    --brand-primary: 222.2 47.4% 11.2%;
    --brand-secondary: 210 40% 96.1%;
    --brand-accent: 210 100% 50%;
  }

  .dark {
    /* Dark mode values (AC#5) */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### Vite Library Config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'KgcUI',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

### Export Pattern (index.ts)

```typescript
// src/index.ts

// Utility
export { cn } from './lib/utils';

// Form Components
export { Button, buttonVariants } from './components/ui/button';
export { Input } from './components/ui/input';
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
export { Checkbox } from './components/ui/checkbox';
export { Label } from './components/ui/label';

// Layout Components
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/ui/card';
export { Separator } from './components/ui/separator';

// Data Display Components
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table';
export { Badge, badgeVariants } from './components/ui/badge';

// Overlay Components
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog';

// Feedback Components
export { Toaster } from './components/ui/sonner';
export { toast } from 'sonner';
export { Skeleton } from './components/ui/skeleton';
export { Alert, AlertDescription, AlertTitle } from './components/ui/alert';

// Types re-export
export type { ButtonProps } from './components/ui/button';
```

### Error Response Format (UX Design)

Magyar nyelvű hibaüzenetek konzisztens formátumban:

```typescript
// Használati példa a Button komponensben
<Button disabled={isLoading}>
  {isLoading ? 'Betöltés...' : 'Mentés'}
</Button>

// Toast hibaüzenet
toast.error('Hiba történt a mentés során');
toast.success('Sikeresen mentve');
```

### TDD Teszt Példák

```typescript
// tests/utils.spec.ts
import { describe, it, expect } from 'vitest';
import { cn } from '../src/lib/utils';

describe('cn() utility', () => {
  it('should merge classes', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active', false && 'hidden')).toBe('base active');
  });

  it('should dedupe Tailwind classes', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2'); // tailwind-merge removes px-4
  });

  it('should handle undefined and null', () => {
    expect(cn('base', undefined, null)).toBe('base');
  });
});

// tests/components/button.spec.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../../src/components/ui/button';

describe('Button component', () => {
  it('renders with default variant', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('applies variant classes correctly', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Project Structure Notes

**Alignment with ADR-010 (Micro-modules):**
- Package location: `packages/shared/ui/` ✅
- Package scope: `@kgc/ui` ✅
- English naming: "ui" not "felhasználói-felület" ✅

**Dependencies from other packages:**
- NONE - @kgc/ui is a leaf package with no internal dependencies
- Only React peer dependency

**Future packages that will depend on @kgc/ui:**
- `apps/kgc-web/` - Main PWA frontend
- `apps/kgc-admin/` - Admin dashboard
- All feature packages with UI components

### References

- [Source: planning-artifacts/epics.md#Epic-5 - Story 5.1 acceptance criteria]
- [Source: planning-artifacts/ux-design-specification.md#Design-System-Choice - shadcn/ui selection rationale]
- [Source: planning-artifacts/ux-design-specification.md#Component-Strategy - Component architecture]
- [Source: planning-artifacts/architecture.md#3.2-Frontend - Technology stack]
- [Source: planning-artifacts/adr/ADR-023-composable-frontend-strategia.md - Composable frontend approach]
- [Source: docs/project-context.md - TypeScript strict rules, package conventions]
- [Source: docs/kgc3-development-principles.md - TDD methodology]

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - Clean implementation

### Completion Notes List

1. **Package Setup Complete**: Created @kgc/ui at packages/shared/ui/ with proper monorepo integration
2. **Tailwind CSS 3.4**: Configured with dark mode "class" strategy, custom brand colors, CSS variables
3. **shadcn/ui Components**: All 13 core components added (Button, Input, Select, Checkbox, Label, Card, Separator, Table, Badge, Dialog, Toast/Sonner, Skeleton, Alert)
4. **cn() Utility**: Implemented with clsx + tailwind-merge for proper class merging
5. **TDD Tests**: 146 unit tests with 97.61% code coverage
6. **Build System**: Vite library build with TypeScript declarations
7. **Sonner Fix**: Removed next-themes dependency, made Toaster framework-agnostic
8. **Franchise Theming**: CSS variables with `[data-tenant]` selectors for tenant-specific brand colors
9. **useTheme Hook**: System preference detection with localStorage persistence (AC#5)
10. **Dark Mode Tests**: Comprehensive dark mode toggle and system preference tests (AC#7)

### File List

**Package Configuration:**
- packages/shared/ui/package.json
- packages/shared/ui/tsconfig.json
- packages/shared/ui/vite.config.ts
- packages/shared/ui/vitest.config.ts
- packages/shared/ui/postcss.config.js
- packages/shared/ui/tailwind.config.ts
- packages/shared/ui/components.json

**Source Files:**
- packages/shared/ui/src/index.ts
- packages/shared/ui/src/lib/utils.ts
- packages/shared/ui/src/styles/globals.css
- packages/shared/ui/src/hooks/use-theme.ts (NEW - AC#5)
- packages/shared/ui/src/components/ui/button.tsx
- packages/shared/ui/src/components/ui/input.tsx
- packages/shared/ui/src/components/ui/select.tsx
- packages/shared/ui/src/components/ui/checkbox.tsx
- packages/shared/ui/src/components/ui/label.tsx
- packages/shared/ui/src/components/ui/card.tsx
- packages/shared/ui/src/components/ui/separator.tsx
- packages/shared/ui/src/components/ui/table.tsx
- packages/shared/ui/src/components/ui/badge.tsx
- packages/shared/ui/src/components/ui/dialog.tsx
- packages/shared/ui/src/components/ui/sonner.tsx
- packages/shared/ui/src/components/ui/skeleton.tsx
- packages/shared/ui/src/components/ui/alert.tsx

**Test Files:**
- packages/shared/ui/tests/setup.ts
- packages/shared/ui/src/lib/utils.spec.ts
- packages/shared/ui/tests/theme.spec.ts (NEW - AC#7 dark mode)
- packages/shared/ui/tests/franchise-theming.spec.ts (NEW - AC#6)
- packages/shared/ui/tests/hooks/use-theme.spec.tsx (NEW - AC#5)
- packages/shared/ui/tests/components/button.spec.tsx
- packages/shared/ui/tests/components/input.spec.tsx
- packages/shared/ui/tests/components/card.spec.tsx
- packages/shared/ui/tests/components/badge.spec.tsx
- packages/shared/ui/tests/components/alert.spec.tsx
- packages/shared/ui/tests/components/label.spec.tsx
- packages/shared/ui/tests/components/separator.spec.tsx
- packages/shared/ui/tests/components/skeleton.spec.tsx
- packages/shared/ui/tests/components/checkbox.spec.tsx
- packages/shared/ui/tests/components/table.spec.tsx
- packages/shared/ui/tests/components/select.spec.tsx
- packages/shared/ui/tests/components/dialog.spec.tsx
- packages/shared/ui/tests/components/sonner.spec.tsx

---

## Change Log

| Dátum | Változás | Szerző |
|-------|----------|--------|
| 2026-01-16 | Story created by create-story workflow - comprehensive UI Component Library developer guide | Claude Opus 4.5 |
| 2026-01-16 | Story implementation complete - 13 components, 106 tests, 100% coverage | Claude Opus 4.5 |
| 2026-01-16 | Adversarial code review - 3 critical issues found (AC#5, #6, #7) | Claude Opus 4.5 |
| 2026-01-16 | Fixes applied: useTheme hook, data-tenant CSS selectors, dark mode tests - 146 tests, 97.61% coverage | Claude Opus 4.5 |
| 2026-01-16 | Story DONE - all AC criteria verified and passing | Claude Opus 4.5 |
