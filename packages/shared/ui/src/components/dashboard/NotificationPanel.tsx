import { CheckCircle, RefreshCw, Trash2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { NotificationList } from './NotificationList';
import { WidgetSkeleton } from './WidgetSkeleton';

interface Notification {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onClearAll,
  onRefresh,
  isLoading,
}: NotificationPanelProps) {
  // Sort notifications by timestamp (newest first)
  const sortedNotifications = [...notifications].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:w-[400px] md:w-[500px]"
        data-side="right"
        aria-label="Értesítések"
      >
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Értesítések</SheetTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isLoading}
                aria-label="Frissítés"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              </Button>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" aria-label="Bezárás">
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </SheetClose>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              <WidgetSkeleton size="medium" />
              <p className="text-center text-sm text-gray-500">Betöltés...</p>
            </div>
          ) : sortedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nincs értesítés</h3>
              <p className="text-sm text-gray-500">Jelenleg nincsenek értesítéseid</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {sortedNotifications.length}{' '}
                  {sortedNotifications.length === 1 ? 'értesítés' : 'értesítés'}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  aria-label="Összes törlése"
                >
                  <Trash2 className="h-4 w-4 mr-1" aria-hidden="true" />
                  Összes törlése
                </Button>
              </div>
              <NotificationList notifications={sortedNotifications} onMarkAsRead={onMarkAsRead} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
