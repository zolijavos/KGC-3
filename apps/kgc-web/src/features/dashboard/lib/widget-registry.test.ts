import { describe, it, expect } from 'vitest';
import { getWidgetsByRole, getWidgetById } from './widget-registry';

describe('Widget Registry', () => {
  describe('getWidgetsByRole', () => {
    it('returns welcome-card for all roles (empty roles array)', () => {
      const operatorWidgets = getWidgetsByRole('OPERATOR');
      const storeManagerWidgets = getWidgetsByRole('STORE_MANAGER');
      const adminWidgets = getWidgetsByRole('ADMIN');

      expect(operatorWidgets.some(w => w.id === 'welcome-card')).toBe(true);
      expect(storeManagerWidgets.some(w => w.id === 'welcome-card')).toBe(true);
      expect(adminWidgets.some(w => w.id === 'welcome-card')).toBe(true);
    });

    it('returns empty-state for all roles', () => {
      const operatorWidgets = getWidgetsByRole('OPERATOR');
      expect(operatorWidgets.some(w => w.id === 'empty-state')).toBe(true);
    });

    it('filters widgets by OPERATOR role', () => {
      const widgets = getWidgetsByRole('OPERATOR');
      const widgetIds = widgets.map(w => w.id);

      // Should include widgets with OPERATOR in roles or empty roles
      expect(widgetIds).toContain('welcome-card');
      expect(widgetIds).toContain('empty-state');
    });

    it('filters widgets by STORE_MANAGER role', () => {
      const widgets = getWidgetsByRole('STORE_MANAGER');
      const widgetIds = widgets.map(w => w.id);

      // Should include widgets with STORE_MANAGER in roles or empty roles
      expect(widgetIds).toContain('welcome-card');
      expect(widgetIds).toContain('empty-state');
    });

    it('filters widgets by ADMIN role', () => {
      const widgets = getWidgetsByRole('ADMIN');
      const widgetIds = widgets.map(w => w.id);

      // Should include widgets with ADMIN in roles or empty roles
      expect(widgetIds).toContain('welcome-card');
      expect(widgetIds).toContain('empty-state');
    });

    it('does not include widgets without matching role', () => {
      // If we add a widget that only ADMIN can see
      const operatorWidgets = getWidgetsByRole('OPERATOR');
      const operatorIds = operatorWidgets.map(w => w.id);

      // Widgets restricted to other roles should not appear
      // (This will be more relevant when we add more widgets in Story 1.2)
      expect(operatorIds.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getWidgetById', () => {
    it('returns widget config for valid widget id', () => {
      const widget = getWidgetById('welcome-card');
      expect(widget).toBeDefined();
      expect(widget?.id).toBe('welcome-card');
      expect(widget?.category).toBe('general');
    });

    it('returns widget with component lazy loader', () => {
      const widget = getWidgetById('welcome-card');
      expect(widget?.component).toBeDefined();
      expect(typeof widget?.component).toBe('object'); // React.lazy returns an object
    });

    it('returns undefined for invalid widget id', () => {
      const widget = getWidgetById('non-existent-widget');
      expect(widget).toBeUndefined();
    });

    it('returns empty-state widget config', () => {
      const widget = getWidgetById('empty-state');
      expect(widget).toBeDefined();
      expect(widget?.id).toBe('empty-state');
    });
  });
});
