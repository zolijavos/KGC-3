import { Button, Card, CardContent, Input } from '@/components/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORY_LABELS, MOCK_INVENTORY, MOCK_WAREHOUSES, STATUS_LABELS } from './mock-data';
import { ItemCategory, StockStatus } from './types';

export function InventoryListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | ''>('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | ''>('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const filteredItems = MOCK_INVENTORY.filter(item => {
    const matchesSearch =
      searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.barcode && item.barcode.includes(searchTerm));
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    const matchesStatus = !statusFilter || item.status === statusFilter;
    const matchesWarehouse = !warehouseFilter || item.warehouseId === warehouseFilter;
    return matchesSearch && matchesCategory && matchesStatus && matchesWarehouse;
  });

  // Statistics
  const stats = {
    totalItems: MOCK_INVENTORY.length,
    totalValue: MOCK_INVENTORY.reduce(
      (sum, item) => sum + item.currentStock * item.purchasePrice,
      0
    ),
    lowStock: MOCK_INVENTORY.filter(item => item.status === StockStatus.LOW_STOCK).length,
    outOfStock: MOCK_INVENTORY.filter(item => item.status === StockStatus.OUT_OF_STOCK).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Készlet kezelés</h1>
              <p className="text-sm text-gray-500">Raktárkészlet és mozgások</p>
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
              <p className="text-sm font-medium text-gray-500">Összes termék</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalItems} féle</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Készletérték</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">
                {formatPrice(stats.totalValue)}
              </p>
            </CardContent>
          </Card>
          <Card className={stats.lowStock > 0 ? 'border-yellow-300 bg-yellow-50' : ''}>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Alacsony készlet</p>
              <p
                className={`mt-1 text-2xl font-bold ${stats.lowStock > 0 ? 'text-yellow-600' : 'text-gray-900'}`}
              >
                {stats.lowStock} termék
              </p>
            </CardContent>
          </Card>
          <Card className={stats.outOfStock > 0 ? 'border-red-300 bg-red-50' : ''}>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Hiányzó termék</p>
              <p
                className={`mt-1 text-2xl font-bold ${stats.outOfStock > 0 ? 'text-red-600' : 'text-gray-900'}`}
              >
                {stats.outOfStock} termék
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <Input
            type="text"
            placeholder="Keresés (név, cikkszám, vonalkód)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as ItemCategory | '')}
            className="rounded-md border px-3 py-2"
          >
            <option value="">Minden kategória</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StockStatus | '')}
            className="rounded-md border px-3 py-2"
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
            className="rounded-md border px-3 py-2"
          >
            <option value="">Minden raktár</option>
            {MOCK_WAREHOUSES.map(wh => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
        </div>

        {/* Inventory table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Termék</th>
                  <th className="px-4 py-3 font-medium">Kategória</th>
                  <th className="px-4 py-3 font-medium text-right">Készlet</th>
                  <th className="px-4 py-3 font-medium text-right">Foglalt</th>
                  <th className="px-4 py-3 font-medium text-right">Elérhető</th>
                  <th className="px-4 py-3 font-medium text-right">Eladási ár</th>
                  <th className="px-4 py-3 font-medium">Raktár</th>
                  <th className="px-4 py-3 font-medium">Státusz</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Nincs találat
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">{item.sku}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {CATEGORY_LABELS[item.category]}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-medium ${item.currentStock <= item.minStock ? 'text-red-600' : 'text-gray-900'}`}
                        >
                          {item.currentStock}
                        </span>
                        <span className="text-sm text-gray-500"> {item.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {item.reservedStock > 0 ? item.reservedStock : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-green-600">{item.availableStock}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatPrice(item.sellingPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p className="text-gray-900">{item.warehouseName}</p>
                          {item.location && <p className="text-gray-500">{item.location}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_LABELS[item.status].color}`}
                        >
                          {STATUS_LABELS[item.status].label}
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

        {/* Quick actions legend */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-500"></span>
            Készleten ({MOCK_INVENTORY.filter(i => i.status === StockStatus.IN_STOCK).length})
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
            Alacsony ({MOCK_INVENTORY.filter(i => i.status === StockStatus.LOW_STOCK).length})
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500"></span>
            Hiányzik ({MOCK_INVENTORY.filter(i => i.status === StockStatus.OUT_OF_STOCK).length})
          </span>
        </div>
      </main>
    </div>
  );
}
