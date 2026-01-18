import { Button, Card, CardContent, Input } from '@/components/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_RECENT_SALES } from './mock-data';
import { PaymentMethod, SaleStatus } from './types';

const STATUS_LABELS: Record<SaleStatus, { label: string; color: string }> = {
  [SaleStatus.DRAFT]: { label: 'Vázlat', color: 'bg-gray-100 text-gray-700' },
  [SaleStatus.COMPLETED]: { label: 'Befejezett', color: 'bg-green-100 text-green-700' },
  [SaleStatus.CANCELLED]: { label: 'Törölt', color: 'bg-red-100 text-red-700' },
  [SaleStatus.REFUNDED]: { label: 'Visszatérített', color: 'bg-orange-100 text-orange-700' },
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: '💵 Készpénz',
  [PaymentMethod.CARD]: '💳 Kártya',
  [PaymentMethod.TRANSFER]: '🏦 Átutalás',
  [PaymentMethod.MIXED]: '🔀 Vegyes',
};

export function SalesListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | ''>('');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('hu-HU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredSales = MOCK_RECENT_SALES.filter(sale => {
    const matchesSearch =
      searchTerm === '' ||
      sale.saleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (sale.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = !statusFilter || sale.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    today: MOCK_RECENT_SALES.filter(s => s.status === SaleStatus.COMPLETED).length,
    revenue: MOCK_RECENT_SALES.filter(s => s.status === SaleStatus.COMPLETED).reduce(
      (sum, s) => sum + s.total,
      0
    ),
    avgBasket: Math.round(
      MOCK_RECENT_SALES.filter(s => s.status === SaleStatus.COMPLETED).reduce(
        (sum, s) => sum + s.total,
        0
      ) / Math.max(1, MOCK_RECENT_SALES.filter(s => s.status === SaleStatus.COMPLETED).length)
    ),
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
              <h1 className="text-xl font-bold text-gray-900">Értékesítések</h1>
              <p className="text-sm text-gray-500">Mai és korábbi eladások</p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/sales/new')}
            className="bg-kgc-primary hover:bg-kgc-primary/90"
          >
            + Új eladás
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Mai eladások</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.today} db</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Mai bevétel</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{formatPrice(stats.revenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500">Átlag kosár</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatPrice(stats.avgBasket)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <Input
            type="text"
            placeholder="Keresés (bizonylat, vevő)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as SaleStatus | '')}
            className="rounded-md border px-3 py-2"
          >
            <option value="">Minden státusz</option>
            {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Sales list */}
        <Card>
          <div className="divide-y">
            {filteredSales.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Nincs találat</div>
            ) : (
              filteredSales.map(sale => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      {PAYMENT_LABELS[sale.paymentMethod].split(' ')[0]}
                    </div>
                    <div>
                      <p className="font-medium">{sale.saleNumber}</p>
                      <p className="text-sm text-gray-500">
                        {sale.customer?.name || 'Készpénzes vásárló'} • {formatDate(sale.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">{formatPrice(sale.total)}</p>
                      <p className="text-xs text-gray-500">{sale.receiptNumber}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_LABELS[sale.status].color}`}
                    >
                      {STATUS_LABELS[sale.status].label}
                    </span>
                    <Button variant="ghost" size="sm">
                      Részletek
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
