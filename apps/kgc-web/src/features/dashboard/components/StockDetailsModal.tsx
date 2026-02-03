import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kgc/ui/components/ui/dialog';
import { Button } from '@kgc/ui/components/ui/button';
import { Badge } from '@kgc/ui/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kgc/ui/components/ui/tabs';
import { AlertCircle, Package, TrendingUp, X } from 'lucide-react';

export interface StockAlert {
  id: string;
  model: string;
  type: string;
  serialNumber: string;
  currentStock: number;
  minimumThreshold: number;
  severity: 'critical' | 'warning';
  lastPurchase: string;
  lastPurchaseQuantity: number;
  averageMonthlyUsage: number;
}

interface StockDetailsModalProps {
  stockAlert: StockAlert;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockDetailsModal({ stockAlert, open, onOpenChange }: StockDetailsModalProps) {
  const recommendedQuantity = Math.max(0, stockAlert.minimumThreshold - stockAlert.currentStock);

  const severityColor = stockAlert.severity === 'critical' ? 'destructive' : 'warning';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {stockAlert.model}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Bezárás"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>Készlet részletek és beszerzési javaslat</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Információ</TabsTrigger>
            <TabsTrigger value="movement">Mozgási Előzmények</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Modell</p>
                <p className="text-lg font-semibold">{stockAlert.model}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Típus</p>
                <p className="text-lg font-semibold">{stockAlert.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sorozatszám</p>
                <p className="text-lg font-semibold">{stockAlert.serialNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Státusz</p>
                <Badge variant={severityColor} className="mt-1">
                  {stockAlert.severity === 'critical' ? 'Kritikus' : 'Figyelmeztetés'}
                </Badge>
              </div>
            </div>

            {/* Stock Levels */}
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aktuális készlet</p>
                <p className="text-2xl font-bold">{stockAlert.currentStock}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Minimum threshold</p>
                <p className="text-2xl font-bold">{stockAlert.minimumThreshold}</p>
              </div>
            </div>

            {/* Purchasing Recommendation */}
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div className="flex-1">
                  <h4 className="font-semibold text-orange-900 dark:text-orange-100">
                    Beszerzési Javaslat
                  </h4>
                  <p className="mt-1 text-sm text-orange-800 dark:text-orange-200">
                    Javasolt beszerzés: <span className="font-bold">{recommendedQuantity}</span> gép
                    (a minimum {stockAlert.minimumThreshold}-ra emeléshez)
                  </p>
                </div>
              </div>
            </div>

            {/* Last Purchase & Usage */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold">Beszerzési Előzmények</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Utolsó beszerzés</p>
                  <p className="font-medium">{stockAlert.lastPurchase}</p>
                  <p className="text-sm text-muted-foreground">
                    Mennyiség: {stockAlert.lastPurchaseQuantity} db
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Átlagos felhasználás/hó</p>
                  <p className="font-medium">{stockAlert.averageMonthlyUsage} db</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="movement" className="space-y-4">
            <div className="rounded-lg border p-4 text-center text-muted-foreground">
              <p>Mozgási előzmények (30 nap)</p>
              <p className="mt-2 text-sm">Funkció Phase 2-ben érhető el</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bezárás
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
