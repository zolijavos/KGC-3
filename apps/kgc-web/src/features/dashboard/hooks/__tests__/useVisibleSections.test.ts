import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SectionId } from '../dashboard-types';
import {
  useSectionVisibility,
  useVisibleSectionIds,
  useVisibleSections,
} from '../useVisibleSections';

// Mock useAuth
const mockUser = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser(),
    isAuthenticated: !!mockUser(),
    isLoading: false,
  }),
}));

describe('useVisibleSections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUser.mockReturnValue(null);
    });

    it('should return empty array', () => {
      const { result } = renderHook(() => useVisibleSections());
      expect(result.current).toEqual([]);
    });
  });

  describe('when user is ADMIN', () => {
    beforeEach(() => {
      mockUser.mockReturnValue({ id: '1', name: 'Admin', role: 'ADMIN' });
    });

    it('should return all sections with visibility info', () => {
      const { result } = renderHook(() => useVisibleSections());

      // Admin sees all sections
      expect(result.current.length).toBe(6); // executive, finance, inventory, service, partner, analytics

      // Check structure of each section
      result.current.forEach(section => {
        expect(section).toHaveProperty('sectionId');
        expect(section).toHaveProperty('isVisible');
        expect(section).toHaveProperty('visibleWidgetCount');
        expect(section).toHaveProperty('alertCount');
        expect(section).toHaveProperty('icon');
        expect(section).toHaveProperty('title');
      });
    });

    it('should show finance section with widgets', () => {
      const { result } = renderHook(() => useVisibleSections());

      const financeSection = result.current.find(s => s.sectionId === 'finance');
      expect(financeSection).toBeDefined();
      expect(financeSection?.isVisible).toBe(true);
      expect(financeSection?.visibleWidgetCount).toBeGreaterThan(0);
      expect(financeSection?.icon).toBe('💰');
      expect(financeSection?.title).toBe('Pénzügy');
    });

    it('should show inventory section with widgets', () => {
      const { result } = renderHook(() => useVisibleSections());

      const inventorySection = result.current.find(s => s.sectionId === 'inventory');
      expect(inventorySection).toBeDefined();
      expect(inventorySection?.isVisible).toBe(true);
      expect(inventorySection?.visibleWidgetCount).toBeGreaterThan(0);
      expect(inventorySection?.icon).toBe('📦');
    });
  });

  describe('when user is OPERATOR', () => {
    beforeEach(() => {
      mockUser.mockReturnValue({ id: '2', name: 'Operator', role: 'OPERATOR' });
    });

    it('should return sections with proper visibility', () => {
      const { result } = renderHook(() => useVisibleSections());

      // Operator has limited access
      expect(result.current.length).toBe(6);

      // Inventory should be visible for operator
      const inventorySection = result.current.find(s => s.sectionId === 'inventory');
      expect(inventorySection?.isVisible).toBe(true);
    });
  });
});

describe('useSectionVisibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUser.mockReturnValue(null);
    });

    it('should return null', () => {
      const { result } = renderHook(() => useSectionVisibility('finance'));
      expect(result.current).toBeNull();
    });
  });

  describe('when user is STORE_MANAGER', () => {
    beforeEach(() => {
      mockUser.mockReturnValue({ id: '3', name: 'Manager', role: 'STORE_MANAGER' });
    });

    it('should return visibility for finance section', () => {
      const { result } = renderHook(() => useSectionVisibility('finance'));

      expect(result.current).not.toBeNull();
      expect(result.current?.sectionId).toBe('finance');
      expect(result.current?.isVisible).toBe(true);
      expect(result.current?.visibleWidgetCount).toBeGreaterThan(0);
    });

    it('should return visibility for service section', () => {
      const { result } = renderHook(() => useSectionVisibility('service'));

      expect(result.current).not.toBeNull();
      expect(result.current?.sectionId).toBe('service');
      expect(result.current?.isVisible).toBe(true);
    });
  });

  describe('when checking unknown section', () => {
    beforeEach(() => {
      mockUser.mockReturnValue({ id: '1', name: 'Admin', role: 'ADMIN' });
    });

    it('should return null for unknown section', () => {
      const { result } = renderHook(() => useSectionVisibility('unknown' as SectionId));
      expect(result.current).toBeNull();
    });
  });
});

describe('useVisibleSectionIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is ADMIN', () => {
    beforeEach(() => {
      mockUser.mockReturnValue({ id: '1', name: 'Admin', role: 'ADMIN' });
    });

    it('should return array of visible section IDs', () => {
      const { result } = renderHook(() => useVisibleSectionIds());

      expect(Array.isArray(result.current)).toBe(true);
      expect(result.current.length).toBeGreaterThan(0);

      // Check that returned IDs are valid section IDs
      const validSectionIds: SectionId[] = [
        'executive',
        'finance',
        'inventory',
        'service',
        'partner',
        'analytics',
      ];

      result.current.forEach(sectionId => {
        expect(validSectionIds).toContain(sectionId);
      });
    });
  });

  describe('when user is OPERATOR', () => {
    beforeEach(() => {
      mockUser.mockReturnValue({ id: '2', name: 'Operator', role: 'OPERATOR' });
    });

    it('should return only sections operator can access', () => {
      const { result } = renderHook(() => useVisibleSectionIds());

      expect(Array.isArray(result.current)).toBe(true);
      // Operator should have access to at least inventory
      expect(result.current).toContain('inventory');
    });
  });
});
