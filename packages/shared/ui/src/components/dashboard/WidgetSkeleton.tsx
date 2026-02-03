import { cn } from '@/lib/utils';

export interface WidgetSkeletonProps {
  size: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
}

const sizeClasses = {
  small: 'h-32 widget-skeleton-small',
  medium: 'h-48 widget-skeleton-medium',
  large: 'h-64 widget-skeleton-large',
  xlarge: 'h-96 widget-skeleton-xlarge',
};

export function WidgetSkeleton({ size, className }: WidgetSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-muted animate-pulse',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading widget"
      data-testid="widget-skeleton"
    >
      <div className="h-full w-full space-y-3 p-4">
        <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
        <div className="h-4 bg-muted-foreground/20 rounded w-1/2" />
        <div className="h-4 bg-muted-foreground/20 rounded w-5/6" />
      </div>
    </div>
  );
}
