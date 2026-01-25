// @kgc/ui - KGC ERP UI Component Library
// Based on shadcn/ui with Tailwind CSS

// =============================================================================
// Utility
// =============================================================================
export { cn } from './lib/utils';

// =============================================================================
// Hooks
// =============================================================================
export { initializeTheme, useTheme } from './hooks/use-theme';
export type { ResolvedTheme, Theme, UseThemeReturn } from './hooks/use-theme';

export { MOBILE_BREAKPOINT, useMobile } from './hooks/use-mobile';

export { SidebarContext, SidebarProvider, useSidebar } from './hooks/use-sidebar';
export type { SidebarContextValue, SidebarProviderProps } from './hooks/use-sidebar';

export { useOnlineStatus } from './hooks/use-online-status';
export type { UseOnlineStatusReturn } from './hooks/use-online-status';

export { useServiceWorker } from './hooks/use-service-worker';
export type {
  ServiceWorkerState,
  UseServiceWorkerOptions,
  UseServiceWorkerReturn,
} from './hooks/use-service-worker';

export { useInstallPrompt } from './hooks/use-install-prompt';
export type { BeforeInstallPromptEvent, UseInstallPromptReturn } from './hooks/use-install-prompt';

export { useIndexedDB } from './hooks/use-indexed-db';
export type { UseIndexedDBReturn, UseIndexedDBState } from './hooks/use-indexed-db';

export { useOfflineCache } from './hooks/use-offline-cache';
export type { UseOfflineCacheOptions, UseOfflineCacheReturn } from './hooks/use-offline-cache';

export { useSyncQueue } from './hooks/use-sync-queue';
export type { UseSyncQueueReturn } from './hooks/use-sync-queue';

export { useBackgroundSync } from './hooks/use-background-sync';
export type {
  UseBackgroundSyncOptions,
  UseBackgroundSyncReturn,
} from './hooks/use-background-sync';

// =============================================================================
// IndexedDB Store
// =============================================================================
export { IndexedDBStore } from './lib/indexeddb';
export type {
  CacheOptions,
  CacheRecord,
  IndexDefinition,
  QueryOptions,
  StoreConfig,
  StoreDefinition,
  TransactionMode,
} from './lib/indexeddb';

// =============================================================================
// Sync Queue & Conflict Resolution
// =============================================================================
export { SyncQueue, createConflictInfo, lastWriteWins, resolveConflict } from './lib/sync';
export type {
  ConflictInfo,
  ConflictResolution,
  ConflictResolutionResult,
  ConflictResolver,
  SyncExecutor,
  SyncMethod,
  SyncOperation,
  SyncOperationMetadata,
  SyncPriority,
  SyncProgress as SyncProgressState,
  SyncQueueConfig,
  SyncResult,
  SyncStatus,
} from './lib/sync';

// =============================================================================
// Form Components
// =============================================================================
export { Button, buttonVariants } from './components/ui/button';
export type { ButtonProps } from './components/ui/button';

export { Input } from './components/ui/input';

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';

export { Checkbox } from './components/ui/checkbox';

export { Label } from './components/ui/label';

export { Textarea } from './components/ui/textarea';
export type { TextareaProps } from './components/ui/textarea';

export { Switch } from './components/ui/switch';

export { RadioGroup, RadioGroupItem } from './components/ui/radio-group';

export { Progress } from './components/ui/progress';

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from './components/ui/form';

// =============================================================================
// Validation
// =============================================================================
export { commonSchemas, createValidationSchema, hungarianErrorMap, z } from './lib/validation';
export type { InferSchema } from './lib/validation';

// =============================================================================
// Layout Components
// =============================================================================
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/ui/card';

export { Separator } from './components/ui/separator';

// Sheet (drawer/modal overlay)
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from './components/ui/sheet';
export type { SheetContentProps } from './components/ui/sheet';

// App Layout Components
export {
  Sidebar,
  SidebarCollapsible,
  SidebarGroup,
  SidebarItem,
  SidebarSeparator,
} from './components/layout/sidebar';
export type {
  SidebarCollapsibleProps,
  SidebarGroupProps,
  SidebarItemProps,
  SidebarProps,
} from './components/layout/sidebar';

export { Header, HeaderActions, HeaderTitle } from './components/layout/header';
export type { HeaderProps, HeaderTitleProps } from './components/layout/header';

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './components/layout/breadcrumb';
export type {
  BreadcrumbLinkProps,
  BreadcrumbProps,
  BreadcrumbSeparatorProps,
} from './components/layout/breadcrumb';

export { AppShell, AppShellPage } from './components/layout/app-shell';
export type { AppShellPageProps, AppShellProps } from './components/layout/app-shell';

// =============================================================================
// Data Display Components
// =============================================================================
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table';

export { Badge, badgeVariants } from './components/ui/badge';
export type { BadgeProps } from './components/ui/badge';

// =============================================================================
// Overlay Components
// =============================================================================
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog';

// =============================================================================
// Feedback Components
// =============================================================================
export { Toaster, toast } from './components/ui/sonner';

export { Skeleton } from './components/ui/skeleton';

export { Alert, AlertDescription, AlertTitle } from './components/ui/alert';

// =============================================================================
// PWA Components
// =============================================================================
export { OfflineIndicator } from './components/pwa/offline-indicator';
export type { OfflineIndicatorProps } from './components/pwa/offline-indicator';

export { UpdatePrompt } from './components/pwa/update-prompt';
export type { UpdatePromptProps } from './components/pwa/update-prompt';

export { InstallPrompt } from './components/pwa/install-prompt';
export type { InstallPromptProps } from './components/pwa/install-prompt';

export { NotificationPrompt } from './components/pwa/notification-prompt';
export type { NotificationPromptProps } from './components/pwa/notification-prompt';

// =============================================================================
// Sync Components
// =============================================================================
export { SyncProgress } from './components/sync/sync-progress';
export type { SyncProgressProps } from './components/sync/sync-progress';

export { ConflictDialog } from './components/sync/conflict-dialog';
export type { ConflictDialogProps } from './components/sync/conflict-dialog';

// =============================================================================
// Scanner Components
// =============================================================================
export { BarcodeScanner } from './components/scanner/barcode-scanner';
export type { BarcodeScannerProps } from './components/scanner/barcode-scanner';

export { CameraScanner } from './components/scanner/camera-scanner';
export type { CameraScannerProps } from './components/scanner/camera-scanner';

// =============================================================================
// Scanner Hooks
// =============================================================================
export { useBarcodeScanner } from './hooks/use-barcode-scanner';
export type { KeyboardScannerConfig, UseBarcodeScanner } from './hooks/use-barcode-scanner';

export { useCameraScanner } from './hooks/use-camera-scanner';
export type { CameraScannerConfig, UseCameraScanner } from './hooks/use-camera-scanner';

// =============================================================================
// Scanner Types & Utilities
// =============================================================================
export { parseScanResult, playAudioFeedback } from './lib/scanner';
export type {
  BarcodeFormat,
  OnErrorCallback,
  OnScanCallback,
  ScanResult,
  ScannerError,
  ScannerErrorType,
  ScannerState,
} from './lib/scanner';

// =============================================================================
// Notification Hook
// =============================================================================
export { usePushNotifications } from './hooks/use-push-notifications';
export type { UsePushNotifications } from './hooks/use-push-notifications';

export { useFavorites } from './hooks/use-favorites';
export type { PendingChange, UserFavorite } from './hooks/use-favorites';

// =============================================================================
// Notification Types & Utilities
// =============================================================================
export {
  DEFAULT_NOTIFICATION_PREFERENCES,
  generateNotificationId,
  getCurrentPermission,
  isNotificationSupported,
} from './lib/notifications';
export type {
  NotificationAction,
  NotificationCategory,
  NotificationData,
  NotificationOptions,
  NotificationPermission,
  NotificationPreferences,
  NotificationPriority,
  NotificationState,
  OnNotificationClick,
  OnNotificationClose,
  OnPermissionChange,
  QueuedNotification,
} from './lib/notifications';

// =============================================================================
// Stores
// =============================================================================
export {
  MAX_FAVORITES,
  selectPendingChangesCount,
  selectSortedFavorites,
  useFavoritesStore,
} from './stores/favorites.store';

// =============================================================================
// Favorites Components
// =============================================================================
export { FavoriteButton, FavoritesSidebar } from './components/favorites';
export type { FavoriteButtonProps, FavoritesSidebarProps } from './components/favorites';
