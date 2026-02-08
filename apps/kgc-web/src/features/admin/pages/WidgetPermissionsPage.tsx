import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kgc/ui';
import { AlertCircle, AlertTriangle, ArrowLeft, RotateCcw, Save } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { PermissionMatrix } from '../components/PermissionMatrix';
import {
  PermissionUpdate,
  useAdminWidgetPermissions,
  WidgetRole,
} from '../hooks/useAdminWidgetPermissions';

/**
 * Widget Permissions Admin Page (Story 45-1)
 *
 * Admin interface for configuring dashboard widget visibility per role.
 *
 * Features:
 * - View all widgets grouped by category
 * - Toggle permissions with checkboxes
 * - Save changes with audit logging
 * - Reset to default permissions
 */

export function WidgetPermissionsPage() {
  const {
    widgets,
    isLoading,
    isError,
    error,
    refetch,
    updatePermissions,
    isUpdating,
    resetToDefaults,
    isResetting,
  } = useAdminWidgetPermissions();

  // Track pending changes before save
  const [pendingChanges, setPendingChanges] = useState<Map<string, PermissionUpdate>>(new Map());
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  // Reset confirmation dialog state (LOW-2 fix: replaced confirm() with Dialog)
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Handle checkbox toggle
  const handleToggle = useCallback(
    (widgetId: string, role: WidgetRole, currentValue: boolean) => {
      // ADMIN role cannot be modified
      if (role === 'ADMIN') return;

      const key = `${widgetId}:${role}`;
      setPendingChanges(prev => {
        const next = new Map(prev);

        // Find original value from widgets
        const widget = widgets.find(w => w.id === widgetId);
        const originalValue = widget?.roles[role] ?? false;

        // If new value equals original, remove from pending (cancel change)
        const newValue = !currentValue;
        if (newValue === originalValue) {
          next.delete(key);
        } else {
          next.set(key, { widgetId, role, enabled: newValue });
        }

        return next;
      });
      setSaveMessage(null);
    },
    [widgets]
  );

  // Handle save
  const handleSave = useCallback(async () => {
    if (pendingChanges.size === 0) return;

    try {
      const updates = Array.from(pendingChanges.values());
      const result = await updatePermissions(updates);
      setPendingChanges(new Map());
      setSaveMessage({ type: 'success', text: result.message });
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Hiba történt a mentés során',
      });
    }
  }, [pendingChanges, updatePermissions]);

  // Handle reset confirmation
  const handleResetConfirm = useCallback(async () => {
    setShowResetDialog(false);

    try {
      const result = await resetToDefaults();
      setPendingChanges(new Map());
      setSaveMessage({ type: 'success', text: result.message });
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Hiba történt a visszaállítás során',
      });
    }
  }, [resetToDefaults]);

  // Cancel pending changes
  const handleCancel = useCallback(() => {
    setPendingChanges(new Map());
    setSaveMessage(null);
  }, []);

  const hasChanges = pendingChanges.size > 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Dashboard Widget Jogosultságok</h1>
          <p className="text-muted-foreground">
            Állítsd be, melyik szerepkör melyik dashboard widgetet láthassa
          </p>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Hiba történt a betöltés során</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Ismeretlen hiba'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Újrapróbálás
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main content */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Mátrix</CardTitle>
          <CardDescription>
            Az Admin szerepkör mindig látja az összes widgetet és nem módosítható.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PermissionMatrix
            widgets={widgets}
            pendingChanges={pendingChanges}
            onToggle={handleToggle}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowResetDialog(true)}
            disabled={isResetting || isUpdating}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Visszaállítás alapértelmezettre
          </Button>
          {hasChanges && (
            <Button variant="ghost" onClick={handleCancel}>
              Mégse
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Save message */}
          {saveMessage && (
            <span
              className={`text-sm ${
                saveMessage.type === 'success' ? 'text-green-600' : 'text-destructive'
              }`}
            >
              {saveMessage.text}
            </span>
          )}

          {/* Change indicator */}
          {hasChanges && (
            <span className="text-sm text-muted-foreground">
              {pendingChanges.size} módosítás mentésre vár
            </span>
          )}

          <Button onClick={handleSave} disabled={!hasChanges || isUpdating}>
            <Save className="h-4 w-4 mr-2" />
            {isUpdating ? 'Mentés...' : 'Mentés'}
          </Button>
        </div>
      </div>

      {/* Reset Confirmation Dialog (LOW-2 fix: replaced confirm() with Dialog) */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Visszaállítás megerősítése
            </DialogTitle>
            <DialogDescription>
              Biztosan visszaállítod az alapértelmezett jogosultságokat? Ez törli az összes egyedi
              beállítást és a widgetek az eredeti szerepkör-jogosultságokkal fognak megjelenni.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Mégse
            </Button>
            <Button variant="destructive" onClick={handleResetConfirm} disabled={isResetting}>
              {isResetting ? 'Visszaállítás...' : 'Visszaállítás'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
