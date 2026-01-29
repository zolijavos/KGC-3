import type { InventoryStatus } from '@/api/inventory';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useInventoryItem } from '@/hooks/use-inventory';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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

const TYPE_LABELS: Record<string, string> = {
  PRODUCT: 'Termék',
  RENTAL_EQUIPMENT: 'Bérleti eszköz',
  PART: 'Alkatrész',
  CONSUMABLE: 'Fogyóeszköz',
};

export function InventoryDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { item, isLoading, error, refetch } = useInventoryItem(id);
  const [isEditing, setIsEditing] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-96 text-center">
          <CardContent className="pt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Betöltés...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-96 text-center">
          <CardContent className="pt-6">
            <p className="text-red-500 mb-4">Hiba: {error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => refetch()}>Újrapróbálás</Button>
              <Button variant="outline" onClick={() => navigate('/inventory')}>
                Vissza a listához
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not found state
  if (!item) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-96 text-center">
          <CardContent className="pt-6">
            <p className="text-gray-500 dark:text-gray-400">Tétel nem található</p>
            <Button variant="outline" onClick={() => navigate('/inventory')} className="mt-4">
              Vissza a listához
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stockValue = item.quantity * (item.purchasePrice || 0);
  const availableQuantity = item.quantity - item.reservedQuantity;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/inventory')}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {item.productName || 'N/A'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {item.productSku || item.serialNumber || '-'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? 'Mégse' : 'Szerkesztés'}
            </Button>
            {isEditing && (
              <Button className="bg-kgc-primary hover:bg-kgc-primary/90">Mentés</Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info */}
            <Card>
              <CardHeader>
                <CardTitle>Alapadatok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Cikkszám
                    </label>
                    <p className="text-lg font-medium">{item.productSku || '-'}</p>
                  </div>
                  {item.serialNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Sorozatszám
                      </label>
                      <p className="font-mono text-lg">{item.serialNumber}</p>
                    </div>
                  )}
                  {item.batchNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Batch szám
                      </label>
                      <p className="font-mono text-lg">{item.batchNumber}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Típus
                    </label>
                    <p className="text-lg">{TYPE_LABELS[item.type] || item.type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            {item.purchasePrice && (
              <Card>
                <CardHeader>
                  <CardTitle>Árazás</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Beszerzési ár
                      </label>
                      {isEditing ? (
                        <Input type="number" defaultValue={item.purchasePrice} className="mt-1" />
                      ) : (
                        <p className="text-lg font-medium">{formatPrice(item.purchasePrice)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stock levels */}
            <Card>
              <CardHeader>
                <CardTitle>Készletszintek</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {item.minStockLevel !== undefined && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Minimum
                      </label>
                      {isEditing ? (
                        <Input type="number" defaultValue={item.minStockLevel} className="mt-1" />
                      ) : (
                        <p className="text-lg">
                          {item.minStockLevel} {item.unit}
                        </p>
                      )}
                    </div>
                  )}
                  {item.maxStockLevel !== undefined && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Maximum
                      </label>
                      {isEditing ? (
                        <Input type="number" defaultValue={item.maxStockLevel} className="mt-1" />
                      ) : (
                        <p className="text-lg">
                          {item.maxStockLevel} {item.unit}
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Raktár
                    </label>
                    <p className="text-lg">{item.warehouseName || '-'}</p>
                  </div>
                  {item.locationCode && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Hely
                      </label>
                      {isEditing ? (
                        <Input type="text" defaultValue={item.locationCode} className="mt-1" />
                      ) : (
                        <p className="text-lg font-mono">{item.locationCode}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current stock */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_LABELS[item.status]?.color || 'bg-gray-100 text-gray-800'}`}
                  >
                    {STATUS_LABELS[item.status]?.label || item.status}
                  </span>
                  <p className="mt-4 text-4xl font-bold text-gray-900 dark:text-white">
                    {item.quantity}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">{item.unit} összesen</p>

                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div>
                      <p className="text-2xl font-bold text-orange-500">{item.reservedQuantity}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Foglalt</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {availableQuantity}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Elérhető</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock value */}
            {item.purchasePrice && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Készletérték
                  </p>
                  <p className="mt-1 text-2xl font-bold text-blue-600">{formatPrice(stockValue)}</p>
                  <p className="text-sm text-gray-500">
                    ({item.quantity} × {formatPrice(item.purchasePrice)})
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Quick actions */}
            <Card>
              <CardContent className="pt-6">
                <p className="mb-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Gyors műveletek
                </p>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/inventory/receive')}
                  >
                    + Készlet bevételezés
                  </Button>
                  <Button variant="outline" className="w-full">
                    - Készlet kiadás
                  </Button>
                  <Button variant="outline" className="w-full">
                    ± Korrekció
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardContent className="pt-6 text-sm text-gray-500">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Létrehozva:</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Módosítva:</span>
                    <span>{formatDate(item.updatedAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
