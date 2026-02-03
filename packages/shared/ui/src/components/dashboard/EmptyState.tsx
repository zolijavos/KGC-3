import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  className?: string;
}

/**
 * EmptyState Component
 *
 * Displays a simple empty state with icon and message
 */
export function EmptyState({ icon: Icon, message, className }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-8 text-center ${className || ''}`}
    >
      <Icon className="mb-2 h-12 w-12 text-muted-foreground/50" />
      <div className="text-lg font-semibold text-gray-700">{message}</div>
    </div>
  );
}
