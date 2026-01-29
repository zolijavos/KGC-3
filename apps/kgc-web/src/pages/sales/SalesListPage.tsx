/**
 * Sales List Page
 * Értékesítések listázása API-ból
 */

import { PaymentStatus, SaleStatus } from '@/api/sales';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { useSales, useSalesStats } from '@/hooks/use-sales';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_LABELS: Record<SaleStatus, { label: string; color: string }> = {
  [SaleStatus.IN_PROGRESS]: {
    label: 'Folyamatban',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  [SaleStatus.PENDING_PAYMENT]: {
    label: 'Fizetésre vár',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  [SaleStatus.COMPLETED]: {
    label: 'Befejezett',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  [SaleStatus.VOIDED]: {
    label: 'Sztornózott',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: '⏳ Függőben',
  [PaymentStatus.PARTIAL]: '🔄 Részleges',
  [PaymentStatus.PAID]: '✅ Fizetve',
  [PaymentStatus.REFUNDED]: '↩️ Visszatérítve',
};

export function SalesListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | ''>('');

  // Build filter for API
  const filter = useMemo(
    () => ({
      status: statusFilter || undefined,
      search: searchTerm || undefined,
    }),
    [statusFilter, searchTerm]
  );

  // Fetch transactions from API
  const { transactions, isLoading, error } = useSales(filter);
  const stats = useSalesStats(transactions);

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
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Értékesítések</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Mai és korábbi eladások</p>
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
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Összes eladás</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.completedCount} db
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Összes bevétel</p>
              <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                {formatPrice(stats.totalRevenue)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Átlag kosár</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatPrice(stats.averageBasket)}
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
            className="rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Minden státusz</option>
            {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Error state */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="pt-6">
              <p className="text-red-600 dark:text-red-400">Hiba történt: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-500 dark:text-gray-400">Betöltés...</p>
            </CardContent>
          </Card>
        )}

        {/* Sales list */}
        {!isLoading && !error && (
          <Card>
            <div className="divide-y dark:divide-slate-700">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Nincs eladás a rendszerben. A POS modulból indított tranzakciók itt jelennek meg.
                </div>
              ) : (
                transactions.map(sale => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer"
                    onClick={() => navigate(`/sales/${sale.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        {PAYMENT_STATUS_LABELS[sale.paymentStatus].split(' ')[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {sale.transactionNumber}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {sale.customerName ?? 'Készpénzes vásárló'} • {formatDate(sale.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-gray-100">
                          {formatPrice(sale.total)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {sale.receiptNumber ?? '-'}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_LABELS[sale.status].color}`}
                      >
                        {STATUS_LABELS[sale.status].label}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/sales/${sale.id}`);
                        }}
                      >
                        Részletek →
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
