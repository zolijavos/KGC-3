import { Checkbox } from '@kgc/ui';
import { Loader2 } from 'lucide-react';
import { useCallback } from 'react';
import {
  AdminWidgetPermission,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  PermissionUpdate,
  ROLE_LABELS,
  WidgetCategory,
  WidgetRole,
} from '../hooks/useAdminWidgetPermissions';

/**
 * Permission Matrix Component (Story 45-1)
 *
 * Displays a table of widgets with role-based permission checkboxes.
 * Groups widgets by category with section headers.
 */

interface PermissionMatrixProps {
  widgets: AdminWidgetPermission[];
  pendingChanges: Map<string, PermissionUpdate>;
  onToggle: (widgetId: string, role: WidgetRole, currentValue: boolean) => void;
  isLoading?: boolean;
}

const EDITABLE_ROLES: WidgetRole[] = ['OPERATOR', 'STORE_MANAGER'];

export function PermissionMatrix({
  widgets,
  pendingChanges,
  onToggle,
  isLoading = false,
}: PermissionMatrixProps) {
  // Group widgets by category
  const widgetsByCategory = new Map<WidgetCategory, AdminWidgetPermission[]>();
  for (const widget of widgets) {
    const existing = widgetsByCategory.get(widget.category) ?? [];
    widgetsByCategory.set(widget.category, [...existing, widget]);
  }

  // Get effective value considering pending changes
  const getEffectiveValue = useCallback(
    (widgetId: string, role: WidgetRole, originalValue: boolean): boolean => {
      const key = `${widgetId}:${role}`;
      const pending = pendingChanges.get(key);
      return pending ? pending.enabled : originalValue;
    },
    [pendingChanges]
  );

  // Check if value has pending change
  const hasPendingChange = useCallback(
    (widgetId: string, role: WidgetRole): boolean => {
      const key = `${widgetId}:${role}`;
      return pendingChanges.has(key);
    },
    [pendingChanges]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Betöltés...</span>
      </div>
    );
  }

  if (widgets.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Nincsenek widgetek a rendszerben.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Widget</th>
            {EDITABLE_ROLES.map(role => (
              <th key={role} className="px-4 py-3 text-center font-medium w-28">
                {ROLE_LABELS[role]}
              </th>
            ))}
            <th className="px-4 py-3 text-center font-medium w-28 text-muted-foreground">
              {ROLE_LABELS.ADMIN}
            </th>
          </tr>
        </thead>
        <tbody>
          {CATEGORY_ORDER.filter(cat => widgetsByCategory.has(cat)).map(category => (
            <CategorySection
              key={category}
              category={category}
              widgets={widgetsByCategory.get(category) ?? []}
              getEffectiveValue={getEffectiveValue}
              hasPendingChange={hasPendingChange}
              onToggle={onToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface CategorySectionProps {
  category: WidgetCategory;
  widgets: AdminWidgetPermission[];
  getEffectiveValue: (widgetId: string, role: WidgetRole, originalValue: boolean) => boolean;
  hasPendingChange: (widgetId: string, role: WidgetRole) => boolean;
  onToggle: (widgetId: string, role: WidgetRole, currentValue: boolean) => void;
}

function CategorySection({
  category,
  widgets,
  getEffectiveValue,
  hasPendingChange,
  onToggle,
}: CategorySectionProps) {
  return (
    <>
      {/* Category header row */}
      <tr className="bg-muted/30">
        <td colSpan={4} className="px-4 py-2 font-semibold text-sm">
          {getCategoryIcon(category)} {CATEGORY_LABELS[category]}
        </td>
      </tr>
      {/* Widget rows */}
      {widgets.map(widget => (
        <WidgetRow
          key={widget.id}
          widget={widget}
          getEffectiveValue={getEffectiveValue}
          hasPendingChange={hasPendingChange}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

interface WidgetRowProps {
  widget: AdminWidgetPermission;
  getEffectiveValue: (widgetId: string, role: WidgetRole, originalValue: boolean) => boolean;
  hasPendingChange: (widgetId: string, role: WidgetRole) => boolean;
  onToggle: (widgetId: string, role: WidgetRole, currentValue: boolean) => void;
}

function WidgetRow({ widget, getEffectiveValue, hasPendingChange, onToggle }: WidgetRowProps) {
  return (
    <tr className="border-b hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 pl-8">{widget.name}</td>
      {EDITABLE_ROLES.map(role => {
        const originalValue = widget.roles[role];
        const effectiveValue = getEffectiveValue(widget.id, role, originalValue);
        const isPending = hasPendingChange(widget.id, role);

        return (
          <td key={role} className="px-4 py-3 text-center">
            <Checkbox
              checked={effectiveValue}
              onCheckedChange={() => onToggle(widget.id, role, effectiveValue)}
              className={isPending ? 'ring-2 ring-primary' : ''}
              aria-label={`${widget.name} - ${ROLE_LABELS[role]}`}
            />
          </td>
        );
      })}
      {/* ADMIN column - always checked, disabled */}
      <td className="px-4 py-3 text-center">
        <Checkbox checked disabled aria-label={`${widget.name} - Admin (mindig aktív)`} />
      </td>
    </tr>
  );
}

function getCategoryIcon(category: WidgetCategory): string {
  const icons: Record<WidgetCategory, string> = {
    finance: '📊',
    inventory: '📦',
    service: '🔧',
    partner: '👥',
    alerts: '🔔',
    general: '🏠',
    analytics: '📈',
  };
  return icons[category];
}
