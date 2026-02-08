import { api } from '@/api/client';
import { StockAlertList, type StockAlert } from '@kgc/ui';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { ExpandableWidgetWrapper } from '../components';

interface StockAlertApiResponse {
  data: StockAlert[];
}

// Module-level formatter to avoid re-creation
const numberFormatter = new Intl.NumberFormat('hu-HU');

/**
 * Expanded view showing all alerts with full details
 */
function AlertsExpandedView({ alerts }: { alerts: StockAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-500" />
        <p className="text-lg font-medium">Nincs készlethiány</p>
        <p className="text-sm">Minden termék megfelelő készletszinten</p>
      </div>
    );
  }

  // Group alerts by severity
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="text-sm text-muted-foreground">Összes alert</div>
          <div className="text-3xl font-bold">{alerts.length}</div>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-sm text-red-600 dark:text-red-400">Kritikus</div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {criticalAlerts.length}
          </div>
        </div>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="text-sm text-yellow-600 dark:text-yellow-400">Figyelmeztetés</div>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {warningAlerts.length}
          </div>
        </div>
      </div>

      {/* Critical Alerts Section */}
      {criticalAlerts.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Kritikus Készlethiányok ({criticalAlerts.length})
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-red-50 dark:bg-red-900/30">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Modell</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Típus</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Jelenlegi</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Minimum</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Hiány</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Utolsó rendelés</th>
                </tr>
              </thead>
              <tbody>
                {criticalAlerts.map(alert => (
                  <tr key={alert.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold">{alert.model}</td>
                    <td className="px-4 py-3 text-sm">{alert.type}</td>
                    <td className="px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 text-right">
                      {numberFormatter.format(alert.currentStock)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {numberFormatter.format(alert.minimumThreshold)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 text-right">
                      -{numberFormatter.format(alert.minimumThreshold - alert.currentStock)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(alert.lastPurchase).toLocaleDateString('hu-HU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warning Alerts Section */}
      {warningAlerts.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold mb-3 flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-5 w-5" />
            Figyelmeztetések ({warningAlerts.length})
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-yellow-50 dark:bg-yellow-900/30">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Modell</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Típus</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Jelenlegi</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Minimum</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Státusz</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Utolsó rendelés</th>
                </tr>
              </thead>
              <tbody>
                {warningAlerts.map(alert => (
                  <tr key={alert.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold">{alert.model}</td>
                    <td className="px-4 py-3 text-sm">{alert.type}</td>
                    <td className="px-4 py-3 text-sm font-bold text-yellow-600 dark:text-yellow-400 text-right">
                      {numberFormatter.format(alert.currentStock)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {numberFormatter.format(alert.minimumThreshold)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                        Figyelmeztetés
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(alert.lastPurchase).toLocaleDateString('hu-HU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * StockAlertListWidget Wrapper
 *
 * Fetches stock alerts data from backend and passes it to StockAlertList component
 * with expandable view for full details
 */
export default function StockAlertListWidget() {
  const { data: apiData, isLoading } = useQuery<StockAlertApiResponse>({
    queryKey: ['dashboard-inventory', 'alerts'],
    queryFn: () => api.get('/dashboard/inventory/alerts'),
    refetchInterval: 300_000, // 5 minutes
    staleTime: 240_000, // 4 minutes
  });

  const alerts = apiData?.data ?? [];

  // Show loading state or render with data
  if (isLoading || !apiData?.data) {
    return <StockAlertList data={[]} isLoading={true} />;
  }

  // If no alerts, just show the simple component
  if (alerts.length === 0) {
    return <StockAlertList data={[]} />;
  }

  return (
    <ExpandableWidgetWrapper
      title="Készlethiány Alertek"
      icon={<AlertTriangle className="h-5 w-5" />}
      expandedContent={<AlertsExpandedView alerts={alerts} />}
    >
      <StockAlertList data={alerts} />
    </ExpandableWidgetWrapper>
  );
}
