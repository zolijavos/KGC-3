import { AlertCircle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface WidgetErrorProps {
  error?: Error | unknown;
  onRetry: () => void;
  className?: string;
}

export function WidgetError({ error, onRetry, className }: WidgetErrorProps) {
  const errorMessage = error instanceof Error
    ? error.message
    : 'Hiba történt az adatok betöltése során';

  return (
    <Card className={cn('border-destructive', className)}>
      <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-destructive">
            Widget betöltési hiba
          </p>
          <p className="text-xs text-muted-foreground max-w-md">
            {errorMessage}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-2"
        >
          <RotateCw className="h-4 w-4" />
          Újra
        </Button>
      </CardContent>
    </Card>
  );
}
