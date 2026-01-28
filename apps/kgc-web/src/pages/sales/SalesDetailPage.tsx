/**
 * Sales Detail Page
 * Értékesítés részletek nézet
 */

import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MOCK_PRODUCTS, MOCK_RECENT_SALES } from './mock-data';
import { PaymentMethod, SaleStatus, type CartItem, type Sale } from './types';

const STATUS_CONFIG: Record<SaleStatus, { label: string; color: string }> = {
  [SaleStatus.DRAFT]: {
    label: 'Vázlat',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  },
  [SaleStatus.COMPLETED]: {
    label: 'Befejezett',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  [SaleStatus.CANCELLED]: {
    label: 'Törölt',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  [SaleStatus.REFUNDED]: {
    label: 'Visszatérített',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
};

const PAYMENT_CONFIG: Record<PaymentMethod, { label: string; icon: string }> = {
  [PaymentMethod.CASH]: { label: 'Készpénz', icon: '💵' },
  [PaymentMethod.CARD]: { label: 'Bankkártya', icon: '💳' },
  [PaymentMethod.TRANSFER]: { label: 'Átutalás', icon: '🏦' },
  [PaymentMethod.MIXED]: { label: 'Vegyes', icon: '🔀' },
};

// Enhanced mock data with items for detail view
function getEnhancedSale(sale: Sale): Sale & { items: CartItem[] } {
  const items: CartItem[] = [
    {
      product: MOCK_PRODUCTS[0]!,
      quantity: 1,
      discount: 0,
      lineTotal: MOCK_PRODUCTS[0]!.price,
    },
  ];

  if (sale.total > 100000) {
    items.push({
      product: MOCK_PRODUCTS[8]!,
      quantity: 2,
      discount: 0,
      lineTotal: MOCK_PRODUCTS[8]!.price * 2,
    });
  }

  return { ...sale, items };
}

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
  const [sale, setSale] = useState<(Sale & { items: CartItem[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const found = MOCK_RECENT_SALES.find(s => s.id === id);
    if (found) {
      setSale(getEnhancedSale(found));
    }
    setIsLoading(false);
  }, [id]);

  const handleRefund = () => {
    if (sale && confirm('Biztosan visszatéríti ezt az értékesítést?')) {
      alert('Visszatérítés feldolgozva');
      navigate('/sales');
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">Betöltés...</p>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">Értékesítés nem található.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white shadow-sm dark:bg-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/sales')}>
              ← Vissza
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {sale.saleNumber}
                </h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CONFIG[sale.status].color}`}
                >
                  {STATUS_CONFIG[sale.status].label}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(sale.date)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrintReceipt}>
              Nyugta
            </Button>
            {sale.customer && (
              <Button variant="outline" onClick={handlePrintInvoice}>
                Számla
              </Button>
            )}
            {sale.status === SaleStatus.COMPLETED && (
              <Button
                variant="outline"
                onClick={handleRefund}
                className="text-red-600 hover:text-red-700"
              >
                Visszatérítés
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
                <CardTitle>Tételek</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sale.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xl dark:bg-gray-700">
                          🔧
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.product.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.product.sku} • {item.product.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.quantity} × {formatPrice(item.product.price)}
                        </p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatPrice(item.lineTotal)}
                        </p>
                        {item.discount > 0 && (
                          <p className="text-xs text-green-600">
                            -{formatPrice(item.discount)} kedvezmény
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            {sale.customer && (
              <Card>
                <CardHeader>
                  <CardTitle>Vevő adatai</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Név</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {sale.customer.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Típus</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {sale.customer.type === 'COMPANY' ? 'Céges' : 'Magánszemély'}
                      </p>
                    </div>
                    {sale.customer.taxNumber && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Adószám</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {sale.customer.taxNumber}
                        </p>
                      </div>
                    )}
                    {sale.customer.email && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {sale.customer.email}
                        </p>
                      </div>
                    )}
                    {sale.customer.phone && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Telefon</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {sale.customer.phone}
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
                      {formatPrice(sale.subtotal)}
                    </span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Kedvezmény</span>
                      <span>-{formatPrice(sale.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">ÁFA (27%)</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatPrice(sale.vatAmount)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-gray-900 dark:text-white">Összesen</span>
                      <span className="text-kgc-primary">{formatPrice(sale.total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Fizetés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                    <span className="text-2xl">{PAYMENT_CONFIG[sale.paymentMethod].icon}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {PAYMENT_CONFIG[sale.paymentMethod].label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatPrice(sale.total)}
                      </p>
                    </div>
                  </div>
                  {sale.receiptNumber && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Nyugtaszám</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {sale.receiptNumber}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cashier Info */}
            <Card>
              <CardHeader>
                <CardTitle>Tranzakció adatok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pénztáros</p>
                    <p className="font-medium text-gray-900 dark:text-white">{sale.cashierName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Dátum</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(sale.date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Státusz</p>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CONFIG[sale.status].color}`}
                    >
                      {STATUS_CONFIG[sale.status].label}
                    </span>
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
