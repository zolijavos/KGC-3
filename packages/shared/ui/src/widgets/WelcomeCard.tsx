import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface WelcomeCardProps {
  userName?: string;
  className?: string;
}

export function WelcomeCard({ userName, className }: WelcomeCardProps) {
  const currentDate = new Date().toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <Card className={cn('welcome-card', className)}>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          Üdvözöljük{userName ? `, ${userName}` : ''}!
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground" data-testid="welcome-date">
          {currentDate}
        </p>
        <p className="mt-4 text-sm">
          Válasszon egy modult a kezdéshez, vagy tekintse meg a mai feladatokat.
        </p>
      </CardContent>
    </Card>
  );
}
