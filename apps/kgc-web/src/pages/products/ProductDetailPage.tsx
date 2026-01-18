import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MOCK_PRODUCTS, PRODUCT_CATEGORIES, PRODUCT_STATUSES } from './mock-data';
import type { ProductCategory, ProductStatus } from './types';

type TabType = 'overview' | 'stock' | 'pricing' | 'rental' | 'history';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const product = MOCK_PRODUCTS.find(p => p.id === id);

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Cikk nem található
          </h1>
          <Button onClick={() => navigate('/products')} className="mt-4">
            Vissza a listához
          </Button>
        </div>
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('hu-HU');
  };

  const getStatusBadge = (status: ProductStatus) => {
    const config = PRODUCT_STATUSES.find(s => s.value === status);
    return (
      <span className={`rounded-full px-3 py-1 text-sm font-medium ${config?.color ?? ''}`}>
        {config?.label ?? status}
      </span>
    );
  };

  const getCategoryBadge = (category: ProductCategory) => {
    const config = PRODUCT_CATEGORIES.find(c => c.value === category);
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${config?.color ?? ''}`}>
        {config?.label ?? category}
      </span>
    );
  };

  const getStockStatusColor = () => {
    if (product.stockQuantity === 0) return 'text-red-600 dark:text-red-400';
    if (product.stockQuantity < product.minStockLevel)
      return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  const isRentalEquipment = product.category === 'rental_equipment';

  const tabs = ([
    { id: 'overview' as const, label: 'Áttekintés', show: true },
    { id: 'stock' as const, label: 'Készlet', show: true },
    { id: 'pricing' as const, label: 'Árazás', show: true },
    { id: 'rental' as const, label: 'Bérlés', show: isRentalEquipment },
    { id: 'history' as const, label: 'Előzmények', show: true },
  ] as const).filter(t => t.show);

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/products')}>
                ← Vissza
              </Button>
              <div className="flex items-center gap-4">
                {product.thumbnailUrl ? (
                  <img
                    src={product.thumbnailUrl}
                    alt={product.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-100 text-2xl dark:bg-slate-700">
                    📦
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {product.name}
                    </h1>
                    {getStatusBadge(product.status)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {product.sku}
                    {product.brand && ` • ${product.brand}`}
                    {product.model && ` ${product.model}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/products/${product.id}/edit`)}>
                Szerkesztés
              </Button>
              {!isRentalEquipment && (
                <Button
                  className="bg-kgc-primary hover:bg-kgc-primary/90"
                  onClick={() => navigate('/sales/new')}
                >
                  + Eladás
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 border-b border-gray-200 dark:border-slate-700">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-kgc-primary text-kgc-primary'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column - Main info */}
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
                      <p className="text-gray-900 dark:text-gray-100 font-mono">{product.sku}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Kategória
                      </label>
                      <div className="mt-1">{getCategoryBadge(product.category)}</div>
                    </div>
                    {product.barcode && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Vonalkód
                        </label>
                        <p className="text-gray-900 dark:text-gray-100 font-mono">
                          {product.barcode}
                        </p>
                      </div>
                    )}
                    {product.manufacturerCode && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Gyártói kód
                        </label>
                        <p className="text-gray-900 dark:text-gray-100">
                          {product.manufacturerCode}
                        </p>
                      </div>
                    )}
                    {product.brand && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Márka
                        </label>
                        <p className="text-gray-900 dark:text-gray-100">{product.brand}</p>
                      </div>
                    )}
                    {product.model && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Típus
                        </label>
                        <p className="text-gray-900 dark:text-gray-100">{product.model}</p>
                      </div>
                    )}
                  </div>
                  {product.description && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Leírás
                      </label>
                      <p className="mt-1 text-gray-900 dark:text-gray-100">{product.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Supplier info */}
              <Card>
                <CardHeader>
                  <CardTitle>Beszállító</CardTitle>
                </CardHeader>
                <CardContent>
                  {product.supplier ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Beszállító neve
                        </label>
                        <p className="text-gray-900 dark:text-gray-100">{product.supplier.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Beszállító kód
                        </label>
                        <p className="text-gray-900 dark:text-gray-100">{product.supplier.code}</p>
                      </div>
                      {product.lastPurchaseDate && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Utolsó rendelés
                          </label>
                          <p className="text-gray-900 dark:text-gray-100">
                            {formatDate(product.lastPurchaseDate)}
                          </p>
                        </div>
                      )}
                      {product.lastPurchasePrice && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Utolsó beszerzési ár
                          </label>
                          <p className="text-gray-900 dark:text-gray-100">
                            {formatPrice(product.lastPurchasePrice)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">Nincs beszállító megadva</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column - Stats & Quick actions */}
            <div className="space-y-6">
              {/* Quick stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Gyors áttekintés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Eladási ár (bruttó):</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {formatPrice(product.sellingPriceGross)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Készleten:</span>
                      <span className={`font-bold ${getStockStatusColor()}`}>
                        {product.availableQuantity} db
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Foglalt:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {product.reservedQuantity} db
                      </span>
                    </div>
                    {product.location && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Helykód:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">
                          {product.location}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-4 dark:border-slate-700">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Árrés:</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {product.marginPercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Gyors műveletek</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate('/inventory/receive')}
                    >
                      📦 Bevételezés
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate('/inventory/movements')}
                    >
                      📋 Mozgások
                    </Button>
                    {!isRentalEquipment && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => navigate('/sales/new')}
                      >
                        🛒 Eladás
                      </Button>
                    )}
                    {isRentalEquipment && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => navigate('/rental/new')}
                      >
                        🔧 Bérlés indítása
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Készletadatok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-300">Teljes készlet:</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {product.stockQuantity} db
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-300">Foglalt:</span>
                    <span className="text-xl font-medium text-orange-600 dark:text-orange-400">
                      {product.reservedQuantity} db
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-300">Elérhető:</span>
                    <span className={`text-xl font-bold ${getStockStatusColor()}`}>
                      {product.availableQuantity} db
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-gray-300">Minimum szint:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {product.minStockLevel} db
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-gray-300">Rendelési mennyiség:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {product.reorderQuantity} db
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Elhelyezés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Helykód (K-P-D)
                    </label>
                    <p className="text-2xl font-mono text-gray-900 dark:text-gray-100">
                      {product.location ?? 'Nincs megadva'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 dark:bg-slate-700/50">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      A helykód formátuma: <strong>Készlet - Polc - Doboz</strong>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Például: A-02-03 = A készlet, 2. polc, 3. doboz
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {product.stockQuantity < product.minStockLevel && (
              <Card className="lg:col-span-2 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-medium text-orange-800 dark:text-orange-200">
                        Alacsony készletszint!
                      </p>
                      <p className="text-sm text-orange-600 dark:text-orange-300">
                        A készlet ({product.stockQuantity} db) a minimum szint (
                        {product.minStockLevel} db) alatt van. Javasolt rendelési mennyiség:{' '}
                        {product.reorderQuantity} db
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Árak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-300">Beszerzési ár (nettó):</span>
                    <span className="text-xl font-medium text-gray-900 dark:text-gray-100">
                      {formatPrice(product.purchasePrice)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-300">Eladási ár (nettó):</span>
                    <span className="text-xl font-medium text-gray-900 dark:text-gray-100">
                      {formatPrice(product.sellingPriceNet)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-300">ÁFA kulcs:</span>
                    <span className="text-gray-900 dark:text-gray-100">{product.vatRate}%</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-gray-300">Eladási ár (bruttó):</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatPrice(product.sellingPriceGross)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Árrés számítás</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-300">Árrés (Ft):</span>
                    <span className="text-xl font-medium text-green-600 dark:text-green-400">
                      {formatPrice(product.sellingPriceNet - product.purchasePrice)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-gray-300">Árrés (%):</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {product.marginPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Árrés számítás: (Eladási - Beszerzési) / Beszerzési × 100
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'rental' && isRentalEquipment && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Bérlési díjak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-300">Napi díj:</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {product.rentalDailyRate ? formatPrice(product.rentalDailyRate) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-300">Heti díj:</span>
                    <span className="text-xl font-medium text-gray-900 dark:text-gray-100">
                      {product.rentalWeeklyRate ? formatPrice(product.rentalWeeklyRate) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-300">Havi díj (30 nap):</span>
                    <span className="text-xl font-medium text-gray-900 dark:text-gray-100">
                      {product.rentalMonthlyRate ? formatPrice(product.rentalMonthlyRate) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-gray-300">Kaució összeg:</span>
                    <span className="text-xl font-medium text-orange-600 dark:text-orange-400">
                      {product.rentalDepositAmount ? formatPrice(product.rentalDepositAmount) : '-'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bérlési státusz</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-300">Összes gép:</span>
                    <span className="text-xl font-medium text-gray-900 dark:text-gray-100">
                      {product.stockQuantity} db
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b dark:border-slate-700">
                    <span className="text-gray-600 dark:text-gray-300">Kiadva (bérben):</span>
                    <span className="text-xl font-medium text-orange-600 dark:text-orange-400">
                      {product.reservedQuantity} db
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 dark:text-gray-300">Elérhető kiadásra:</span>
                    <span className={`text-xl font-bold ${getStockStatusColor()}`}>
                      {product.availableQuantity} db
                    </span>
                  </div>
                </div>

                <Button
                  className="mt-4 w-full bg-kgc-primary hover:bg-kgc-primary/90"
                  onClick={() => navigate('/rental/new')}
                >
                  🔧 Új bérlés indítása
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <Card>
            <CardHeader>
              <CardTitle>Előzmények</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 dark:border-slate-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(product.updatedAt)}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Cikk adatok frissítve
                  </p>
                </div>
                {product.lastPurchaseDate && (
                  <div className="rounded-lg border p-4 dark:border-slate-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(product.lastPurchaseDate)}
                    </p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      Utolsó beszerzés - {formatPrice(product.lastPurchasePrice ?? 0)}
                    </p>
                  </div>
                )}
                <div className="rounded-lg border p-4 dark:border-slate-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(product.createdAt)}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Cikk létrehozva ({product.createdBy})
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
