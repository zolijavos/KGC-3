import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SectionId } from '../dashboard-types';
import { useAllVisibleWidgets, useVisibleWidgets, useWidgetAccess } from '../useVisibleWidgets';

// Mock useAuth
const mockUser = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser(),
    isAuthenticated: !!mockUser(),
    isLoading: false,
  }),
}));

describe('useVisibleWidgets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUser.mockReturnValue(null);
    });

    it('should return empty array when no user', () => {
      const { result } = renderHook(() => useVisibleWidgets('finance'));
      expect(result.current).toEqual([]);
    });
  });

  describe('when user is ADMIN', () => {
    beforeEach(() => {
      mockUser.mockReturnValue({ id: '1', name: 'Admin', role: 'ADMIN' });
    });

    it('should return finance widgets for admin', () => {
      const { result } = renderHook(() => useVisibleWidgets('finance'));

      // Admin should see all finance widgets
      expect(result.current.length).toBeGreaterThan(0);
      result.current.forEach(widget => {
        expect(widget.isVisible).toBe(true);
        expect(widget.accessLevel).toBe('FULL');
        expect(widget.category).toBe('finance');
      });
    });

    it('should return inventory widgets for admin', () => {
      const { result } = renderHook(() => useVisibleWidgets('inventory'));

      expect(result.current.length).toBeGreaterThan(0);
      result.current.forEach(widget => {
        expect(widget.isVisible).toBe(true);
        expect(widget.category).toBe('inventory');
      });
    });
  });

  describe('when user is OPERATOR', () => {
    beforeEach(() => {
      mockUser.mockReturnValue({ id: '2', name: 'Operator', role: 'OPERATOR' });
    });

    it('should return inventory widgets with READ access for operator', () => {
      const { result } = renderHook(() => useVisibleWidgets('inventory'));

      // Operator should see inventory widgets with READ access
      expect(result.current.length).toBeGreaterThan(0);

      const visibleWidgets = result.current.filter(w => w.isVisible);
      expect(visibleWidgets.length).toBeGreaterThan(0);

      visibleWidgets.forEach(widget => {
        expect(widget.accessLevel).toBe('READ');
      });
    });

    it('should not return finance widgets for operator', () => {
      const { result } = renderHook(() => useVisibleWidgets('finance'));

      // Operator should not see restricted finance widgets
      // Only widgets with empty roles array are visible
      result.current.forEach(widget => {
        expect(widget.isVisible).toBe(true);
      });
    });
  });

  describe('when user is STORE_MANAGER', () => {
    beforeEach(() => {
      mockUser.mockReturnValue({ id: '3', name: 'Manager', role: 'STORE_MANAGER' });
    });

    it('should return finance widgets with FULL access', () => {
      const { result } = renderHook(() => useVisibleWidgets('finance'));

      expect(result.current.length).toBeGreaterThan(0);
      result.current.forEach(widget => {
        expect(widget.isVisible).toBe(true);
        expect(widget.accessLevel).toBe('FULL');
      });
    });

    it('should return service widgets with FULL access', () => {
      const { result } = renderHook(() => useVisibleWidgets('service'));

      expect(result.current.length).toBeGreaterThan(0);
      result.current.forEach(widget => {
        expect(widget.isVisible).toBe(true);
        expect(widget.accessLevel).toBe('FULL');
      });
    });
  });

  describe('invalid section', () => {
    beforeEach(() => {
      mockUser.mockReturnValue({ id: '1', name: 'Admin', role: 'ADMIN' });
    });

    it('should return empty array for unknown section', () => {
      const { result } = renderHook(() => useVisibleWidgets('unknown' as SectionId));
      expect(result.current).toEqual([]);
    });
  });
});

describe('useAllVisibleWidgets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is ADMIN', () => {
    beforeEach(() => {
      mockUser.mockReturnValue({ id: '1', name: 'Admin', role: 'ADMIN' });
    });

    it('should return widgets grouped by category', () => {
      const { result } = renderHook(() => useAllVisibleWidgets());

      expect(result.current instanceof Map).toBe(true);

      // Admin should see widgets in multiple categories
      expect(result.current.size).toBeGreaterThan(0);

      // Check finance category exists
      expect(result.current.has('finance')).toBe(true);
      const financeWidgets = result.current.get('finance');
      expect(financeWidgets?.length).toBeGreaterThan(0);
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUser.mockReturnValue(null);
    });

    it('should return empty map', () => {
      const { result } = renderHook(() => useAllVisibleWidgets());
      expect(result.current.size).toBe(0);
    });
  });
});

describe('useWidgetAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockUser.mockReturnValue(null);
    });

    it('should return no access', () => {
      const { result } = renderHook(() => useWidgetAccess('revenue-kpi'));

      expect(result.current.hasAccess).toBe(false);
      expect(result.current.accessLevel).toBe('NONE');
    });
  });

  describe('when checking known widget', () => {
    beforeEach(() => {
      mockUser.mockReturnValue({ id: '1', name: 'Admin', role: 'ADMIN' });
    });

    it('should return FULL access for admin on finance widget', () => {
      const { result } = renderHook(() => useWidgetAccess('revenue-kpi'));

      expect(result.current.hasAccess).toBe(true);
      expect(result.current.accessLevel).toBe('FULL');
    });

    it('should return FULL access for general widgets (empty roles)', () => {
      const { result } = renderHook(() => useWidgetAccess('welcome-card'));

      expect(result.current.hasAccess).toBe(true);
      expect(result.current.accessLevel).toBe('FULL');
    });
  });

  describe('when checking unknown widget', () => {
    beforeEach(() => {
      mockUser.mockReturnValue({ id: '1', name: 'Admin', role: 'ADMIN' });
    });

    it('should return no access for unknown widget', () => {
      const { result } = renderHook(() => useWidgetAccess('unknown-widget'));

      expect(result.current.hasAccess).toBe(false);
      expect(result.current.accessLevel).toBe('NONE');
    });
  });

  describe('when user is OPERATOR', () => {
    beforeEach(() => {
      mockUser.mockReturnValue({ id: '2', name: 'Operator', role: 'OPERATOR' });
    });

    it('should return READ access for inventory widget', () => {
      const { result } = renderHook(() => useWidgetAccess('stock-summary'));

      expect(result.current.hasAccess).toBe(true);
      expect(result.current.accessLevel).toBe('READ');
    });

    it('should return no access for restricted finance widget', () => {
      const { result } = renderHook(() => useWidgetAccess('revenue-kpi'));

      expect(result.current.hasAccess).toBe(false);
      expect(result.current.accessLevel).toBe('NONE');
    });
  });
});
