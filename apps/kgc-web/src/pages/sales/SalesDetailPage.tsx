/**
 * Sales Detail Page
 * Értékesítés részletek nézet - API integration
 */

import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { PaymentStatus, SaleStatus, useSale, useSaleMutations } from '@/hooks/use-sales';
import { useNavigate, useParams } from 'react-router-dom';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
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
    label: 'Érvénytelenített',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; icon: string }> = {
  [PaymentStatus.PENDING]: { label: 'Függőben', icon: '⏳' },
  [PaymentStatus.PARTIAL]: { label: 'Részlegesen fizetve', icon: '💰' },
  [PaymentStatus.PAID]: { label: 'Fizetve', icon: '✅' },
  [PaymentStatus.REFUNDED]: { label: 'Visszatérítve', icon: '↩️' },
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SalesDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { transaction, items, isLoading, error, refetch } = useSale(id ?? '');
  const { voidTransaction, isVoiding } = useSaleMutations();

  const handleVoid = async () => {
    if (!transaction || !id) return;
    if (confirm('Biztosan érvényteleníti ezt a tranzakciót?')) {
      try {
        await voidTransaction(id, 'Felhasználói kérésre');
        refetch();
      } catch {
        alert('Hiba történt az érvénytelenítés során');
      }
    }
  };

  const handlePrintReceipt = () => {
    alert('Nyugta nyomtatása...');
  };

  const handlePrintInvoice = () => {
    alert('Számla nyomtatása...');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kgc-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Betöltés...</p>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center kgc-bg">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {error ? 'Hiba történt a betöltés során.' : 'Tranzakció nem található.'}
        </p>
        <Button onClick={() => navigate('/sales')}>Vissza a listához</Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[transaction.status] ?? {
    label: transaction.status,
    color: 'bg-gray-100 text-gray-700',
  };

  const paymentConfig = PAYMENT_STATUS_CONFIG[transaction.paymentStatus] ?? {
    label: transaction.paymentStatus,
    icon: '💳',
  };

  const canVoid =
    transaction.status === SaleStatus.IN_PROGRESS ||
    transaction.status === SaleStatus.PENDING_PAYMENT;

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/sales')}>
              ← Vissza
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {transaction.transactionNumber}
                </h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(transaction.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrintReceipt}>
              Nyugta
            </Button>
            {transaction.customerId && (
              <Button variant="outline" onClick={handlePrintInvoice}>
                Számla
              </Button>
            )}
            {canVoid && (
              <Button
                variant="outline"
                onClick={handleVoid}
                disabled={isVoiding}
                className="text-red-600 hover:text-red-700 dark:text-red-400"
              >
                {isVoiding ? 'Feldolgozás...' : 'Érvénytelenítés'}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle>Tételek ({items.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {items.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    Nincsenek tételek
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xl dark:bg-gray-700">
                            📦
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {item.productName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {item.productCode}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.quantity} × {formatPrice(item.unitPrice)}
                          </p>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {formatPrice(item.lineTotal)}
                          </p>
                          {item.discountPercent > 0 && (
                            <p className="text-xs text-green-600 dark:text-green-400">
                              -{item.discountPercent}% kedvezmény
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Info */}
            {(transaction.customerId || transaction.customerName) && (
              <Card>
                <CardHeader>
                  <CardTitle>Vevő adatai</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {transaction.customerName && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Név</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {transaction.customerName}
                        </p>
                      </div>
                    )}
                    {transaction.customerTaxNumber && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Adószám</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {transaction.customerTaxNumber}
                        </p>
                      </div>
                    )}
                    {transaction.customerId && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Partner ID</p>
                        <p className="font-mono text-sm text-gray-600 dark:text-gray-300">
                          {transaction.customerId}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Void Info */}
            {transaction.status === SaleStatus.VOIDED && transaction.voidedAt && (
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">
                    Érvénytelenítés adatai
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Időpont</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDate(transaction.voidedAt)}
                      </p>
                    </div>
                    {transaction.voidReason && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Indok</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {transaction.voidReason}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Összesítés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Részösszeg</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatPrice(transaction.subtotal)}
                    </span>
                  </div>
                  {transaction.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Kedvezmény</span>
                      <span>-{formatPrice(transaction.discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">ÁFA</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatPrice(transaction.taxAmount)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-gray-900 dark:text-white">Összesen</span>
                      <span className="text-kgc-primary">{formatPrice(transaction.total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Status */}
            <Card>
              <CardHeader>
                <CardTitle>Fizetési státusz</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                    <span className="text-2xl">{paymentConfig.icon}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {paymentConfig.label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Fizetve: {formatPrice(transaction.paidAmount)}
                      </p>
                    </div>
                  </div>
                  {transaction.changeAmount > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Visszajáró</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatPrice(transaction.changeAmount)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Transaction Info */}
            <Card>
              <CardHeader>
                <CardTitle>Tranzakció adatok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tranzakció szám</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-white">
                      {transaction.transactionNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Létrehozva</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(transaction.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Státusz</p>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Session ID</p>
                    <p className="font-mono text-xs text-gray-600 dark:text-gray-400 truncate">
                      {transaction.sessionId}
                    </p>
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
