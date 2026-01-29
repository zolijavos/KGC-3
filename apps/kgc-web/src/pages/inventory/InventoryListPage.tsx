import type { InventoryItemType, InventoryStatus } from '@/api/inventory';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { useInventory, useLowStockAlerts, useWarehouses } from '@/hooks/use-inventory';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TYPE_LABELS: Record<InventoryItemType, string> = {
  PRODUCT: 'Termék',
  RENTAL_EQUIPMENT: 'Bérleti eszköz',
  PART: 'Alkatrész',
  CONSUMABLE: 'Fogyóeszköz',
};

const STATUS_LABELS: Record<InventoryStatus, { label: string; color: string }> = {
  AVAILABLE: {
    label: 'Elérhető',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  RESERVED: {
    label: 'Foglalt',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  IN_TRANSIT: {
    label: 'Szállítás alatt',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  IN_SERVICE: {
    label: 'Szervizben',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  SOLD: { label: 'Eladva', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  RENTED: {
    label: 'Kiadva',
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  DAMAGED: {
    label: 'Sérült',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  LOST: {
    label: 'Elveszett',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  SCRAPPED: {
    label: 'Selejtezve',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
};

export function InventoryListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<InventoryItemType | ''>('');
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | ''>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');

  // API hooks
  const { items, total, isLoading, error, refetch } = useInventory({
    search: searchTerm || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    warehouseId: warehouseFilter || undefined,
  });
  const { alerts } = useLowStockAlerts();
  const { warehouses } = useWarehouses();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Statistics computed from API data
  const stats = useMemo(
    () => ({
      totalItems: total,
      totalValue: items.reduce((sum, item) => sum + item.quantity * (item.purchasePrice || 0), 0),
      lowStock: alerts.length,
      available: items.filter(item => item.status === 'AVAILABLE').length,
      reserved: items.filter(item => item.status === 'RESERVED').length,
    }),
    [items, total, alerts]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Készlet kezelés</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Raktárkészlet és mozgások</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/inventory/movements')}>
              Mozgások
            </Button>
            <Button
              onClick={() => navigate('/inventory/receive')}
              className="bg-kgc-primary hover:bg-kgc-primary/90"
            >
              + Bevételezés
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Összes tétel</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalItems}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Készletérték</p>
              <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatPrice(stats.totalValue)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Elérhető</p>
              <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.available}
              </p>
            </CardContent>
          </Card>
          <Card
            className={
              stats.lowStock > 0
                ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-600 dark:bg-yellow-900/30'
                : ''
            }
          >
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Alacsony készlet
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${stats.lowStock > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}
              >
                {stats.lowStock} tétel
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <Input
            type="text"
            placeholder="Keresés (termék, cikkszám)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as InventoryItemType | '')}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
          >
            <option value="">Minden típus</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as InventoryStatus | '')}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
          >
            <option value="">Minden státusz</option>
            {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={warehouseFilter}
            onChange={e => setWarehouseFilter(e.target.value)}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
          >
            <option value="">Minden raktár</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
        </div>

        {/* Loading state */}
        {isLoading && (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Készlet betöltése...</p>
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="py-8 text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">Hiba: {error}</p>
              <Button onClick={() => refetch()}>Újrapróbálás</Button>
            </CardContent>
          </Card>
        )}

        {/* Inventory table */}
        {!isLoading && !error && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 text-left text-sm text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Termék</th>
                    <th className="px-4 py-3 font-medium">Típus</th>
                    <th className="px-4 py-3 font-medium text-right">Mennyiség</th>
                    <th className="px-4 py-3 font-medium text-right">Foglalt</th>
                    <th className="px-4 py-3 font-medium text-right">Elérhető</th>
                    <th className="px-4 py-3 font-medium text-right">Beszerzési ár</th>
                    <th className="px-4 py-3 font-medium">Raktár</th>
                    <th className="px-4 py-3 font-medium">Státusz</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        Nincs találat
                      </td>
                    </tr>
                  ) : (
                    items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {item.productName || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {item.productSku || item.serialNumber || '-'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {TYPE_LABELS[item.type] || item.type}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-medium ${item.minStockLevel && item.quantity <= item.minStockLevel ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}
                          >
                            {item.quantity}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {' '}
                            {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                          {item.reservedQuantity > 0 ? item.reservedQuantity : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {item.quantity - item.reservedQuantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                          {item.purchasePrice ? formatPrice(item.purchasePrice) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <p className="text-gray-900 dark:text-white">
                              {item.warehouseName || '-'}
                            </p>
                            {item.locationCode && (
                              <p className="text-gray-500 dark:text-gray-400">
                                {item.locationCode}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_LABELS[item.status]?.color || 'bg-gray-100 text-gray-800'}`}
                          >
                            {STATUS_LABELS[item.status]?.label || item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/inventory/${item.id}`)}
                          >
                            Részletek
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Quick actions legend */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500"></span>
            Elérhető ({stats.available})
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
            Foglalt ({stats.reserved})
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-orange-500"></span>
            Alacsony készlet ({stats.lowStock})
          </span>
        </div>
      </main>
    </div>
  );
}
