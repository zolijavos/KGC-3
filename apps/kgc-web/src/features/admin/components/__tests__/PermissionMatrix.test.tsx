import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AdminWidgetPermission,
  PermissionUpdate,
} from '../../hooks/useAdminWidgetPermissions';
import { PermissionMatrix } from '../PermissionMatrix';

/**
 * PermissionMatrix Component Tests (Story 45-1)
 *
 * Tests for the widget permission matrix table component
 */
describe('PermissionMatrix', () => {
  const mockWidgets: AdminWidgetPermission[] = [
    {
      id: 'revenue-kpi',
      name: 'Bevétel KPI',
      category: 'finance',
      roles: { OPERATOR: false, STORE_MANAGER: true, ADMIN: true },
    },
    {
      id: 'net-revenue-kpi',
      name: 'Nettó bevétel KPI',
      category: 'finance',
      roles: { OPERATOR: false, STORE_MANAGER: true, ADMIN: true },
    },
    {
      id: 'stock-summary',
      name: 'Készlet összesítő',
      category: 'inventory',
      roles: { OPERATOR: true, STORE_MANAGER: true, ADMIN: true },
    },
    {
      id: 'notification-panel',
      name: 'Értesítések',
      category: 'alerts',
      roles: { OPERATOR: true, STORE_MANAGER: true, ADMIN: true },
    },
  ];

  let mockOnToggle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnToggle = vi.fn();
  });

  const renderMatrix = (
    widgets = mockWidgets,
    pendingChanges = new Map<string, PermissionUpdate>(),
    isLoading = false
  ) => {
    return render(
      <PermissionMatrix
        widgets={widgets}
        pendingChanges={pendingChanges}
        onToggle={mockOnToggle}
        isLoading={isLoading}
      />
    );
  };

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      renderMatrix([], new Map(), true);

      expect(screen.getByText('Betöltés...')).toBeInTheDocument();
    });

    it('should not show loading spinner when isLoading is false', () => {
      renderMatrix();

      expect(screen.queryByText('Betöltés...')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no widgets', () => {
      renderMatrix([]);

      expect(screen.getByText('Nincsenek widgetek a rendszerben.')).toBeInTheDocument();
    });
  });

  describe('Table Structure', () => {
    it('should render table headers', () => {
      renderMatrix();

      expect(screen.getByText('Widget')).toBeInTheDocument();
      expect(screen.getByText('Operátor')).toBeInTheDocument();
      expect(screen.getByText('Boltvezető')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should render widget names', () => {
      renderMatrix();

      expect(screen.getByText('Bevétel KPI')).toBeInTheDocument();
      expect(screen.getByText('Nettó bevétel KPI')).toBeInTheDocument();
      expect(screen.getByText('Készlet összesítő')).toBeInTheDocument();
      expect(screen.getByText('Értesítések')).toBeInTheDocument();
    });

    it('should render category headers', () => {
      renderMatrix();

      // Category headers are rows with bg-muted/30 class
      const rows = screen.getAllByRole('row');
      const categoryRows = rows.filter(row => row.classList.contains('bg-muted/30'));

      // Should have 3 category rows: finance, inventory, alerts
      expect(categoryRows.length).toBe(3);

      // Verify category header has colspan=4 (spans all columns)
      const categoryCell = categoryRows[0]?.querySelector('td[colspan="4"]');
      expect(categoryCell).toBeInTheDocument();
    });
  });

  describe('Checkbox States', () => {
    it('should render checkboxes with correct initial state', () => {
      renderMatrix();

      // Get all checkboxes with aria-labels
      const revenueOperator = screen.getByRole('checkbox', {
        name: /Bevétel KPI - Operátor/,
      });
      const revenueManager = screen.getByRole('checkbox', {
        name: /Bevétel KPI - Boltvezető/,
      });

      expect(revenueOperator).not.toBeChecked();
      expect(revenueManager).toBeChecked();
    });

    it('should render Admin checkboxes as always checked and disabled', () => {
      renderMatrix();

      const adminCheckboxes = screen.getAllByRole('checkbox', {
        name: /Admin \(mindig aktív\)/,
      });

      adminCheckboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked();
        expect(checkbox).toBeDisabled();
      });
    });
  });

  describe('Toggle Interaction', () => {
    it('should call onToggle when OPERATOR checkbox is clicked', () => {
      renderMatrix();

      const checkbox = screen.getByRole('checkbox', {
        name: /Bevétel KPI - Operátor/,
      });
      fireEvent.click(checkbox);

      expect(mockOnToggle).toHaveBeenCalledWith('revenue-kpi', 'OPERATOR', false);
    });

    it('should call onToggle when STORE_MANAGER checkbox is clicked', () => {
      renderMatrix();

      const checkbox = screen.getByRole('checkbox', {
        name: /Bevétel KPI - Boltvezető/,
      });
      fireEvent.click(checkbox);

      expect(mockOnToggle).toHaveBeenCalledWith('revenue-kpi', 'STORE_MANAGER', true);
    });

    it('should not call onToggle for Admin checkboxes (they are disabled)', () => {
      renderMatrix();

      const adminCheckboxes = screen.getAllByRole('checkbox', {
        name: /Admin \(mindig aktív\)/,
      });

      // Admin checkboxes should be disabled, so clicking won't trigger onToggle
      adminCheckboxes.forEach(checkbox => {
        expect(checkbox).toBeDisabled();
      });
    });
  });

  describe('Pending Changes', () => {
    it('should apply visual indicator to checkboxes with pending changes', () => {
      const pendingChanges = new Map<string, PermissionUpdate>([
        ['revenue-kpi:OPERATOR', { widgetId: 'revenue-kpi', role: 'OPERATOR', enabled: true }],
      ]);

      renderMatrix(mockWidgets, pendingChanges);

      const checkbox = screen.getByRole('checkbox', {
        name: /Bevétel KPI - Operátor/,
      });

      // Should have ring-2 class for pending indicator
      expect(checkbox).toHaveClass('ring-2');
    });

    it('should show effective value from pending changes', () => {
      const pendingChanges = new Map<string, PermissionUpdate>([
        ['revenue-kpi:OPERATOR', { widgetId: 'revenue-kpi', role: 'OPERATOR', enabled: true }],
      ]);

      renderMatrix(mockWidgets, pendingChanges);

      const checkbox = screen.getByRole('checkbox', {
        name: /Bevétel KPI - Operátor/,
      });

      // Original value was false, but pending change sets it to true
      expect(checkbox).toBeChecked();
    });
  });

  describe('Category Grouping', () => {
    it('should group widgets by category', () => {
      renderMatrix();

      // Finance category should have 2 widgets
      const financeSection = screen.getByText(/Pénzügy/).closest('tr');
      expect(financeSection).toBeInTheDocument();

      // Check widgets appear after their category header
      const rows = screen.getAllByRole('row');
      const financeHeaderIndex = rows.findIndex(row => row.textContent?.includes('Pénzügy'));
      const revenueKpiIndex = rows.findIndex(row => row.textContent?.includes('Bevétel KPI'));

      expect(revenueKpiIndex).toBeGreaterThan(financeHeaderIndex);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible checkbox labels', () => {
      renderMatrix();

      // Each checkbox should have an aria-label
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('aria-label');
      });
    });
  });
});
