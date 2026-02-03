import { Inbox } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface EmptyStateWidgetProps {
  message?: string;
  className?: string;
}

export function EmptyStateWidget({
  message = 'Nincs megjeleníthető widget',
  className
}: EmptyStateWidgetProps) {
  return (
    <Card className={cn('empty-state-widget', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
        <Inbox
          className="h-16 w-16 text-muted-foreground/50"
          data-testid="empty-state-icon"
        />
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-muted-foreground">
            {message}
          </p>
          <p className="text-sm text-muted-foreground/75">
            Adjon hozzá widgeteket a dashboard testreszabásához
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
