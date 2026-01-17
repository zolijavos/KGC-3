import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  SidebarProvider,
  useSidebar,
  type SidebarContextValue,
} from '../../src/hooks/use-sidebar';

// Wrapper component for testing hooks that need provider
const createWrapper = (props?: { defaultOpen?: boolean; defaultCollapsed?: boolean }) => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SidebarProvider {...props}>{children}</SidebarProvider>;
  };
};

describe('useSidebar hook', () => {
  describe('without provider', () => {
    it('should throw error when used outside SidebarProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSidebar());
      }).toThrow('useSidebar must be used within a SidebarProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('with provider', () => {
    describe('default values', () => {
      it('should have isOpen true by default', () => {
        const { result } = renderHook(() => useSidebar(), {
          wrapper: createWrapper(),
        });

        expect(result.current.isOpen).toBe(true);
      });

      it('should have isCollapsed false by default', () => {
        const { result } = renderHook(() => useSidebar(), {
          wrapper: createWrapper(),
        });

        expect(result.current.isCollapsed).toBe(false);
      });
    });

    describe('custom default values', () => {
      it('should respect defaultOpen prop', () => {
        const { result } = renderHook(() => useSidebar(), {
          wrapper: createWrapper({ defaultOpen: false }),
        });

        expect(result.current.isOpen).toBe(false);
      });

      it('should respect defaultCollapsed prop', () => {
        const { result } = renderHook(() => useSidebar(), {
          wrapper: createWrapper({ defaultCollapsed: true }),
        });

        expect(result.current.isCollapsed).toBe(true);
      });
    });

    describe('toggle function', () => {
      it('should toggle isOpen from true to false', () => {
        const { result } = renderHook(() => useSidebar(), {
          wrapper: createWrapper({ defaultOpen: true }),
        });

        act(() => {
          result.current.toggle();
        });

        expect(result.current.isOpen).toBe(false);
      });

      it('should toggle isOpen from false to true', () => {
        const { result } = renderHook(() => useSidebar(), {
          wrapper: createWrapper({ defaultOpen: false }),
        });

        act(() => {
          result.current.toggle();
        });

        expect(result.current.isOpen).toBe(true);
      });
    });

    describe('setOpen function', () => {
      it('should set isOpen to true', () => {
        const { result } = renderHook(() => useSidebar(), {
          wrapper: createWrapper({ defaultOpen: false }),
        });

        act(() => {
          result.current.setOpen(true);
        });

        expect(result.current.isOpen).toBe(true);
      });

      it('should set isOpen to false', () => {
        const { result } = renderHook(() => useSidebar(), {
          wrapper: createWrapper({ defaultOpen: true }),
        });

        act(() => {
          result.current.setOpen(false);
        });

        expect(result.current.isOpen).toBe(false);
      });
    });

    describe('setCollapsed function', () => {
      it('should set isCollapsed to true', () => {
        const { result } = renderHook(() => useSidebar(), {
          wrapper: createWrapper({ defaultCollapsed: false }),
        });

        act(() => {
          result.current.setCollapsed(true);
        });

        expect(result.current.isCollapsed).toBe(true);
      });

      it('should set isCollapsed to false', () => {
        const { result } = renderHook(() => useSidebar(), {
          wrapper: createWrapper({ defaultCollapsed: true }),
        });

        act(() => {
          result.current.setCollapsed(false);
        });

        expect(result.current.isCollapsed).toBe(false);
      });
    });

    describe('close function', () => {
      it('should set isOpen to false', () => {
        const { result } = renderHook(() => useSidebar(), {
          wrapper: createWrapper({ defaultOpen: true }),
        });

        act(() => {
          result.current.close();
        });

        expect(result.current.isOpen).toBe(false);
      });
    });

    describe('return value types', () => {
      it('should return all required properties and functions', () => {
        const { result } = renderHook(() => useSidebar(), {
          wrapper: createWrapper(),
        });

        const value: SidebarContextValue = result.current;

        expect(typeof value.isOpen).toBe('boolean');
        expect(typeof value.isCollapsed).toBe('boolean');
        expect(typeof value.toggle).toBe('function');
        expect(typeof value.setOpen).toBe('function');
        expect(typeof value.setCollapsed).toBe('function');
        expect(typeof value.close).toBe('function');
      });
    });
  });
});

// Import vi for spying
import { vi } from 'vitest';
