import { describe, it, expect } from 'vitest';
import {
  getLayoutForRole,
  ROLE_LAYOUT_MAP,
  type LayoutType,
  type UserRole,
} from './layout-config';

describe('Layout Configuration', () => {
  describe('ROLE_LAYOUT_MAP', () => {
    it('maps OPERATOR to scanner-focus layout', () => {
      expect(ROLE_LAYOUT_MAP.OPERATOR).toBe('scanner-focus');
    });

    it('maps STORE_MANAGER to dashboard-first layout', () => {
      expect(ROLE_LAYOUT_MAP.STORE_MANAGER).toBe('dashboard-first');
    });

    it('maps ADMIN to dashboard-first layout', () => {
      expect(ROLE_LAYOUT_MAP.ADMIN).toBe('dashboard-first');
    });

    it('has mapping for all user roles', () => {
      const roles: UserRole[] = ['OPERATOR', 'STORE_MANAGER', 'ADMIN'];
      roles.forEach(role => {
        expect(ROLE_LAYOUT_MAP[role]).toBeDefined();
      });
    });
  });

  describe('getLayoutForRole', () => {
    it('returns scanner-focus for OPERATOR', () => {
      const layout = getLayoutForRole('OPERATOR');
      expect(layout).toBe('scanner-focus');
    });

    it('returns dashboard-first for STORE_MANAGER', () => {
      const layout = getLayoutForRole('STORE_MANAGER');
      expect(layout).toBe('dashboard-first');
    });

    it('returns dashboard-first for ADMIN', () => {
      const layout = getLayoutForRole('ADMIN');
      expect(layout).toBe('dashboard-first');
    });

    it('returns correct layout type', () => {
      const layout = getLayoutForRole('OPERATOR');
      const validLayouts: LayoutType[] = ['scanner-focus', 'dashboard-first'];
      expect(validLayouts).toContain(layout);
    });
  });
});
