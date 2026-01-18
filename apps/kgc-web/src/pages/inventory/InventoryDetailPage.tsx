import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CATEGORY_LABELS,
  MOCK_INVENTORY,
  MOCK_MOVEMENTS,
  MOVEMENT_LABELS,
  STATUS_LABELS,
} from './mock-data';

export function InventoryDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isEditing, setIsEditing] = useState(false);

  const item = MOCK_INVENTORY.find(i => i.id === id);
  const movements = MOCK_MOVEMENTS.filter(m => m.itemId === id);

  if (!item) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-96 text-center">
          <CardContent className="pt-6">
            <p className="text-gray-500">Termék nem található</p>
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

  const stockValue = item.currentStock * item.purchasePrice;
  const margin = (((item.sellingPrice - item.purchasePrice) / item.purchasePrice) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/inventory')}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{item.name}</h1>
              <p className="text-sm text-gray-500">{item.sku}</p>
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
                    <label className="text-sm font-medium text-gray-500">Cikkszám</label>
                    <p className="text-lg font-medium">{item.sku}</p>
                  </div>
                  {item.barcode && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Vonalkód</label>
                      <p className="font-mono text-lg">{item.barcode}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Kategória</label>
                    <p className="text-lg">{CATEGORY_LABELS[item.category]}</p>
                  </div>
                  {item.brand && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Márka</label>
                      <p className="text-lg">{item.brand}</p>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Leírás</label>
                    <p className="text-gray-700">{item.description || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Árazás</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Beszerzési ár</label>
                    {isEditing ? (
                      <Input type="number" defaultValue={item.purchasePrice} className="mt-1" />
                    ) : (
                      <p className="text-lg font-medium">{formatPrice(item.purchasePrice)}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Eladási ár</label>
                    {isEditing ? (
                      <Input type="number" defaultValue={item.sellingPrice} className="mt-1" />
                    ) : (
                      <p className="text-lg font-medium text-kgc-primary">
                        {formatPrice(item.sellingPrice)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Árrés</label>
                    <p className="text-lg font-medium text-green-600">{margin}%</p>
                  </div>
                  {item.rentalPriceDaily && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Napi bérleti díj</label>
                      {isEditing ? (
                        <Input
                          type="number"
                          defaultValue={item.rentalPriceDaily}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-lg font-medium">{formatPrice(item.rentalPriceDaily)}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">ÁFA</label>
                    <p className="text-lg">{item.vatRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock levels */}
            <Card>
              <CardHeader>
                <CardTitle>Készletszintek</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Minimum</label>
                    {isEditing ? (
                      <Input type="number" defaultValue={item.minStock} className="mt-1" />
                    ) : (
                      <p className="text-lg">
                        {item.minStock} {item.unit}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Maximum</label>
                    {isEditing ? (
                      <Input type="number" defaultValue={item.maxStock} className="mt-1" />
                    ) : (
                      <p className="text-lg">
                        {item.maxStock} {item.unit}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Raktár</label>
                    <p className="text-lg">{item.warehouseName}</p>
                  </div>
                  {item.location && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Hely</label>
                      {isEditing ? (
                        <Input type="text" defaultValue={item.location} className="mt-1" />
                      ) : (
                        <p className="text-lg font-mono">{item.location}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent movements */}
            <Card>
              <CardHeader>
                <CardTitle>Utolsó mozgások</CardTitle>
              </CardHeader>
              <CardContent>
                {movements.length === 0 ? (
                  <p className="text-gray-500">Nincs mozgás</p>
                ) : (
                  <div className="space-y-3">
                    {movements.slice(0, 5).map(mov => (
                      <div
                        key={mov.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold ${MOVEMENT_LABELS[mov.type].color}`}>
                            {mov.quantity > 0 ? '+' : ''}
                            {mov.quantity}
                          </span>
                          <div>
                            <p className="font-medium">{MOVEMENT_LABELS[mov.type].label}</p>
                            <p className="text-sm text-gray-500">{mov.note || mov.reference}</p>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <p>{formatDate(mov.createdAt)}</p>
                          <p>{mov.createdByName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                    className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_LABELS[item.status].color}`}
                  >
                    {STATUS_LABELS[item.status].label}
                  </span>
                  <p className="mt-4 text-4xl font-bold text-gray-900">{item.currentStock}</p>
                  <p className="text-gray-500">{item.unit} összesen</p>

                  <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4">
                    <div>
                      <p className="text-2xl font-bold text-orange-500">{item.reservedStock}</p>
                      <p className="text-sm text-gray-500">Foglalt</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{item.availableStock}</p>
                      <p className="text-sm text-gray-500">Elérhető</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock value */}
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-gray-500">Készletérték</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">{formatPrice(stockValue)}</p>
                <p className="text-sm text-gray-500">
                  ({item.currentStock} × {formatPrice(item.purchasePrice)})
                </p>
              </CardContent>
            </Card>

            {/* Attributes */}
            <Card>
              <CardContent className="pt-6">
                <p className="mb-4 text-sm font-medium text-gray-500">Tulajdonságok</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Eladható</span>
                    <span className={item.isSellable ? 'text-green-600' : 'text-gray-400'}>
                      {item.isSellable ? '✓ Igen' : '✗ Nem'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Bérelhető</span>
                    <span className={item.isRentable ? 'text-green-600' : 'text-gray-400'}>
                      {item.isRentable ? '✓ Igen' : '✗ Nem'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardContent className="pt-6">
                <p className="mb-4 text-sm font-medium text-gray-500">Gyors műveletek</p>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full">
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
                    <span>Utolsó frissítés:</span>
                    <span>{formatDate(item.lastStockUpdate)}</span>
                  </div>
                  {item.lastInventoryCheck && (
                    <div className="flex justify-between">
                      <span>Utolsó leltár:</span>
                      <span>{formatDate(item.lastInventoryCheck)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
