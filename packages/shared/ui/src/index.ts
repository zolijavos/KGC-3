// @kgc/ui - KGC ERP UI Component Library
// Based on shadcn/ui with Tailwind CSS

// =============================================================================
// Utility
// =============================================================================
export { cn } from './lib/utils';

// =============================================================================
// Hooks
// =============================================================================
export { useTheme, initializeTheme } from './hooks/use-theme';
export type { Theme, ResolvedTheme, UseThemeReturn } from './hooks/use-theme';

export { useMobile, MOBILE_BREAKPOINT } from './hooks/use-mobile';

export { useSidebar, SidebarProvider, SidebarContext } from './hooks/use-sidebar';
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
export type {
  BeforeInstallPromptEvent,
  UseInstallPromptReturn,
} from './hooks/use-install-prompt';

export { useIndexedDB } from './hooks/use-indexed-db';
export type {
  UseIndexedDBState,
  UseIndexedDBReturn,
} from './hooks/use-indexed-db';

export { useOfflineCache } from './hooks/use-offline-cache';
export type {
  UseOfflineCacheOptions,
  UseOfflineCacheReturn,
} from './hooks/use-offline-cache';

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
  StoreConfig,
  StoreDefinition,
  IndexDefinition,
  CacheRecord,
  CacheOptions,
  QueryOptions,
  TransactionMode,
} from './lib/indexeddb';

// =============================================================================
// Sync Queue & Conflict Resolution
// =============================================================================
export { SyncQueue, createConflictInfo, lastWriteWins, resolveConflict } from './lib/sync';
export type {
  SyncMethod,
  SyncStatus,
  SyncPriority,
  SyncOperation,
  SyncOperationMetadata,
  ConflictInfo,
  ConflictResolution,
  SyncResult,
  SyncQueueConfig,
  SyncProgress,
  SyncExecutor,
  ConflictResolver,
  ConflictResolutionResult,
} from './lib/sync';

// =============================================================================
// Form Components
// =============================================================================
export { Button, buttonVariants } from './components/ui/button';
export type { ButtonProps } from './components/ui/button';

export { Input } from './components/ui/input';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
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
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
} from './components/ui/form';

// =============================================================================
// Validation
// =============================================================================
export {
  z,
  hungarianErrorMap,
  commonSchemas,
  createValidationSchema,
} from './lib/validation';
export type { InferSchema } from './lib/validation';

// =============================================================================
// Layout Components
// =============================================================================
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/ui/card';

export { Separator } from './components/ui/separator';

// Sheet (drawer/modal overlay)
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './components/ui/sheet';
export type { SheetContentProps } from './components/ui/sheet';

// App Layout Components
export {
  Sidebar,
  SidebarGroup,
  SidebarCollapsible,
  SidebarItem,
  SidebarSeparator,
} from './components/layout/sidebar';
export type {
  SidebarProps,
  SidebarGroupProps,
  SidebarCollapsibleProps,
  SidebarItemProps,
} from './components/layout/sidebar';

export {
  Header,
  HeaderTitle,
  HeaderActions,
} from './components/layout/header';
export type { HeaderProps, HeaderTitleProps } from './components/layout/header';

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from './components/layout/breadcrumb';
export type {
  BreadcrumbProps,
  BreadcrumbLinkProps,
  BreadcrumbSeparatorProps,
} from './components/layout/breadcrumb';

export {
  AppShell,
  AppShellPage,
} from './components/layout/app-shell';
export type { AppShellProps, AppShellPageProps } from './components/layout/app-shell';

// =============================================================================
// Data Display Components
// =============================================================================
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './components/ui/table';

export { Badge, badgeVariants } from './components/ui/badge';
export type { BadgeProps } from './components/ui/badge';

// =============================================================================
// Overlay Components
// =============================================================================
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/ui/dialog';

// =============================================================================
// Feedback Components
// =============================================================================
export { Toaster, toast } from './components/ui/sonner';

export { Skeleton } from './components/ui/skeleton';

export { Alert, AlertTitle, AlertDescription } from './components/ui/alert';

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
export type { UseBarcodeScanner, KeyboardScannerConfig } from './hooks/use-barcode-scanner';

export { useCameraScanner } from './hooks/use-camera-scanner';
export type { UseCameraScanner, CameraScannerConfig } from './hooks/use-camera-scanner';

// =============================================================================
// Scanner Types & Utilities
// =============================================================================
export {
  parseScanResult,
  playAudioFeedback,
} from './lib/scanner';
export type {
  BarcodeFormat,
  ScanResult,
  ScannerError,
  ScannerErrorType,
  ScannerState,
  OnScanCallback,
  OnErrorCallback,
} from './lib/scanner';

// =============================================================================
// Notification Hook
// =============================================================================
export { usePushNotifications } from './hooks/use-push-notifications';
export type { UsePushNotifications } from './hooks/use-push-notifications';

// =============================================================================
// Notification Types & Utilities
// =============================================================================
export {
  isNotificationSupported,
  getCurrentPermission,
  generateNotificationId,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from './lib/notifications';
export type {
  NotificationPermission,
  NotificationPriority,
  NotificationCategory,
  NotificationAction,
  NotificationData,
  NotificationOptions,
  QueuedNotification,
  NotificationPreferences,
  NotificationState,
  OnNotificationClick,
  OnNotificationClose,
  OnPermissionChange,
} from './lib/notifications';
