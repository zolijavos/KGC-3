import { api } from '@/api/client';
import { Badge } from '@kgc/ui/components/ui/badge';
import { Button } from '@kgc/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kgc/ui/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Shield,
  Wrench,
  X,
} from 'lucide-react';
import { dashboardKeys } from '../lib/query-keys';

interface ServiceHistoryWorksheetItem {
  id: string;
  createdAt: string;
  completedAt: string | null;
  status: string;
  issue: string;
  resolution: string;
  isWarranty: boolean;
  laborCost: number;
  partsCost: number;
}

interface ServiceHistoryData {
  equipment: {
    id: string;
    name: string;
    serialNumber: string;
  };
  worksheets: ServiceHistoryWorksheetItem[];
}

interface ServiceHistoryApiResponse {
  data: ServiceHistoryData;
}

interface ServiceHistoryModalProps {
  equipmentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Status labels in Hungarian
 */
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Vazlat',
  DIAGNOSED: 'Diagnosztizalt',
  IN_PROGRESS: 'Folyamatban',
  WAITING_PARTS: 'Alkatresz-re var',
  COMPLETED: 'Befejezett',
  CLOSED: 'Lezart',
};

/**
 * Format date to Hungarian locale with time
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format currency to Hungarian format
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * ServiceHistoryModal (Story 49-2)
 *
 * Displays detailed service history for equipment with recurring issues
 */
export function ServiceHistoryModal({ equipmentId, open, onOpenChange }: ServiceHistoryModalProps) {
  const {
    data: apiData,
    isLoading,
    error,
    isError,
  } = useQuery<ServiceHistoryApiResponse>({
    queryKey: [...dashboardKeys.serviceItem('service-history'), equipmentId],
    queryFn: () =>
      api.get(`/dashboard/service/equipment/${encodeURIComponent(equipmentId)}/service-history`),
    enabled: open && !!equipmentId,
  });

  const data = apiData?.data;

  // Calculate totals
  const totalLaborCost = data?.worksheets?.reduce((sum, ws) => sum + ws.laborCost, 0) ?? 0;
  const totalPartsCost = data?.worksheets?.reduce((sum, ws) => sum + ws.partsCost, 0) ?? 0;
  const warrantyCount = data?.worksheets?.filter(ws => ws.isWarranty).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {isLoading ? 'Betoltes...' : (data?.equipment.name ?? 'Szerviz elozmeny')}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Bezaras"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {data?.equipment && (
            <DialogDescription>Sorozatszam: {data.equipment.serialNumber}</DialogDescription>
          )}
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <p className="text-sm text-muted-foreground">Hiba tortent az adatok betoltesekor</p>
              <p className="text-xs text-muted-foreground mt-1">
                {error instanceof Error ? error.message : 'Ismeretlen hiba'}
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold">{data?.worksheets?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Osszes szerviz</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{warrantyCount}</p>
                  <p className="text-xs text-muted-foreground">Garancialis</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(totalLaborCost + totalPartsCost)}
                  </p>
                  <p className="text-xs text-muted-foreground">Osszes koltseg</p>
                </div>
              </div>

              {/* Worksheets List */}
              <div className="space-y-3">
                {(data?.worksheets?.length ?? 0) === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nincs szerviz elozmeny</p>
                  </div>
                ) : (
                  data?.worksheets?.map(worksheet => (
                    <div key={worksheet.id} className="border rounded-lg p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={
                                worksheet.status === 'COMPLETED' || worksheet.status === 'CLOSED'
                                  ? 'default'
                                  : 'secondary'
                              }
                              className="shrink-0"
                            >
                              {STATUS_LABELS[worksheet.status] ?? worksheet.status}
                            </Badge>
                            {worksheet.isWarranty && (
                              <Badge className="shrink-0 bg-green-500 hover:bg-green-600 text-white border-transparent">
                                <Shield className="h-3 w-3 mr-1" />
                                Garancia
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground shrink-0">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(worksheet.createdAt)}
                          </div>
                          {worksheet.completedAt && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              {formatDateTime(worksheet.completedAt)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Issue and Resolution */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Hiba</p>
                          <p className="text-sm">{worksheet.issue}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Megoldas</p>
                          <p className="text-sm">{worksheet.resolution}</p>
                        </div>
                      </div>

                      {/* Costs */}
                      {!worksheet.isWarranty &&
                        (worksheet.laborCost > 0 || worksheet.partsCost > 0) && (
                          <div className="flex items-center gap-4 pt-2 border-t text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Munkadij:</span>
                              <span className="font-medium text-foreground">
                                {formatCurrency(worksheet.laborCost)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Wrench className="h-3 w-3" />
                              <span>Alkatresz:</span>
                              <span className="font-medium text-foreground">
                                {formatCurrency(worksheet.partsCost)}
                              </span>
                            </div>
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bezaras
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
