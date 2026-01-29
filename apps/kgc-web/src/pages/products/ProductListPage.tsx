import { Button, Card, CardContent, Input } from '@/components/ui';
import { useProducts, useProductStats } from '@/hooks/use-products';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_SUPPLIERS, PRODUCT_CATEGORIES, PRODUCT_STATUSES } from './mock-data';
import type { ProductCategory, ProductStatus } from './types';

export function ProductListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [supplierFilter, setSupplierFilter] = useState<string | 'all'>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Build API filters
  const apiFilters = useMemo(() => {
    const filters: {
      status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
      search?: string;
      lowStock?: boolean;
    } = {};
    if (statusFilter !== 'all') {
      const statusMap: Record<string, 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED'> = {
        active: 'ACTIVE',
        inactive: 'INACTIVE',
        discontinued: 'DISCONTINUED',
      };
      filters.status = statusMap[statusFilter];
    }
    if (searchTerm) {
      filters.search = searchTerm;
    }
    if (lowStockOnly) {
      filters.lowStock = true;
    }
    return filters;
  }, [statusFilter, searchTerm, lowStockOnly]);

  const { products, isLoading, error } = useProducts(apiFilters);
  const { stats } = useProductStats();

  // Client-side category and supplier filters (since API doesn't support all of them)
  const filteredProducts = useMemo(() => {
    let result = products;
    if (categoryFilter !== 'all') {
      result = result.filter(p => p.category === categoryFilter);
    }
    if (supplierFilter !== 'all') {
      result = result.filter(p => p.supplier?.id === supplierFilter);
    }
    return result;
  }, [products, categoryFilter, supplierFilter]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: ProductStatus) => {
    const config = PRODUCT_STATUSES.find(s => s.value === status);
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${config?.color ?? ''}`}>
        {config?.label ?? status}
      </span>
    );
  };

  const getCategoryBadge = (category: ProductCategory) => {
    const config = PRODUCT_CATEGORIES.find(c => c.value === category);
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config?.color ?? ''}`}>
        {config?.label ?? category}
      </span>
    );
  };

  const getStockBadge = (product: { stockQuantity: number; minStockLevel: number }) => {
    if (product.stockQuantity === 0) {
      return (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
          Nincs
        </span>
      );
    }
    if (product.stockQuantity < product.minStockLevel) {
      return (
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
          Alacsony
        </span>
      );
    }
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
        OK
      </span>
    );
  };

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cikkek</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Termékek, alkatrészek és bérgépek kezelése
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/products/new')}
            className="bg-kgc-primary hover:bg-kgc-primary/90"
          >
            + Új cikk
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats?.total ?? 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Összes cikk</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats?.active ?? 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aktív</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats?.lowStock ?? 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Alacsony készlet</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats?.outOfStock ?? 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nincs készleten</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatPrice(stats?.totalValue ?? 0)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Készletérték</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-[250px] flex-1">
                <Input
                  placeholder="Keresés név, cikkszám, vonalkód, márka..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as ProductCategory | 'all')}
                className="rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">Minden kategória</option>
                {PRODUCT_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as ProductStatus | 'all')}
                className="rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">Minden státusz</option>
                {PRODUCT_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                value={supplierFilter}
                onChange={e => setSupplierFilter(e.target.value)}
                className="rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">Minden beszállító</option>
                {MOCK_SUPPLIERS.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={e => setLowStockOnly(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                Csak alacsony készlet
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Products table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                      Cikk
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                      Kategória
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                      Vonalkód
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                      Beszállító
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                      Nettó ár
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                      Bruttó ár
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                      Készlet
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                      Státusz
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {filteredProducts.map(product => (
                    <tr
                      key={product.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.thumbnailUrl ? (
                            <div className="h-10 w-10 flex-shrink-0 rounded bg-gray-100 dark:bg-slate-700">
                              <img
                                src={product.thumbnailUrl}
                                alt={product.name}
                                className="h-full w-full object-cover rounded"
                              />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-gray-500">
                              📦
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {product.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {product.sku}
                              {product.brand && ` • ${product.brand}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getCategoryBadge(product.category)}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                          {product.barcode ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {product.supplier?.name ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatPrice(product.sellingPriceNet)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-gray-600 dark:text-gray-300">
                          {formatPrice(product.sellingPriceGross)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {product.availableQuantity} / {product.stockQuantity}
                          </span>
                          {getStockBadge(product)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(product.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/products/${product.id}`);
                          }}
                        >
                          Részletek →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredProducts.length === 0 && (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                  <p>Nincs találat a szűrési feltételeknek megfelelően.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {filteredProducts.length} cikk megjelenítve
        </p>
      </main>
    </div>
  );
}
