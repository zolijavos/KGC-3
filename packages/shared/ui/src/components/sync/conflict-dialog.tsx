import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { ConflictInfo, ConflictResolution } from '../../lib/sync';

export interface ConflictDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** The conflict to display */
  conflict: ConflictInfo;
  /** Callback when user resolves the conflict */
  onResolve: (resolution: ConflictResolution) => void;
  /** Callback when dialog is closed without resolution */
  onClose: () => void;
  /** Custom label for the entity type */
  entityLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
}

/**
 * Format data for display (JSON with highlighting)
 */
function DataDisplay({
  data,
  label,
  timestamp,
  variant,
}: {
  data: unknown;
  label: string;
  timestamp: number;
  variant: 'local' | 'server';
}) {
  const formatted = JSON.stringify(data, null, 2);

  return (
    <div
      className={cn(
        'flex-1 rounded-lg border p-3',
        variant === 'local' ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950' : 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {formatTimestamp(timestamp)}
        </span>
      </div>
      <pre className="max-h-48 overflow-auto rounded bg-background/50 p-2 text-xs">
        {formatted}
      </pre>
    </div>
  );
}

/**
 * Dialog for resolving sync conflicts.
 *
 * @example
 * ```tsx
 * function ConflictManager() {
 *   const [conflict, setConflict] = useState<ConflictInfo | null>(null);
 *
 *   const handleResolve = async (resolution: ConflictResolution) => {
 *     // Apply resolution
 *     setConflict(null);
 *   };
 *
 *   return (
 *     <ConflictDialog
 *       open={!!conflict}
 *       conflict={conflict!}
 *       onResolve={handleResolve}
 *       onClose={() => setConflict(null)}
 *       entityLabel="Bérlés"
 *     />
 *   );
 * }
 * ```
 */
export function ConflictDialog({
  open,
  conflict,
  onResolve,
  onClose,
  entityLabel,
  className,
}: ConflictDialogProps) {
  if (!open) {
    return null;
  }

  const label = entityLabel ?? conflict.operation.type ?? 'Record';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={cn('max-w-2xl', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
            </span>
            Sync Conflict - {label}
          </DialogTitle>
          <DialogDescription>
            A conflict was detected between your local changes and the server data.
            Please choose which version to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 py-4">
          <DataDisplay
            data={conflict.clientData}
            label="Your Changes (Local)"
            timestamp={conflict.clientTimestamp}
            variant="local"
          />
          <DataDisplay
            data={conflict.serverData}
            label="Server Version"
            timestamp={conflict.serverTimestamp}
            variant="server"
          />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => onResolve('server-wins')}
          >
            Use Server Version
          </Button>
          <Button
            variant="default"
            onClick={() => onResolve('client-wins')}
          >
            Keep Local Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
