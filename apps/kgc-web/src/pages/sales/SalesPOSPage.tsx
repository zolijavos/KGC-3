/**
 * SalesPOSPage - Kassza (Point of Sale) Főoldal
 *
 * Teljes kassza workflow:
 * 1. Session ellenőrzés/nyitás
 * 2. Termékkeresés (kézi + vonalkód)
 * 3. Kosárkezelés
 * 4. Fizetés feldolgozás
 * 5. Session zárás (Z-report)
 */

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import {
  useAddTransactionItem,
  useBarcodeScanner,
  useCompleteTransaction,
  useCreateTransaction,
  useCurrentSession,
  useFindProductByBarcode,
  useOpenSession,
  useProcessCardPayment,
  useProcessCashPayment,
  useProductSearch,
  useRemoveTransactionItem,
  useUpdateTransactionItem,
  useVoidTransaction,
} from '@/hooks/pos';
import { useAudioFeedback } from '@/hooks/use-audio-feedback';
import type { CashRegisterSession, SaleTransaction, ZReport } from '@/types/pos.types';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SessionCloseModal,
  SessionOpenModal,
  SessionStatusBadge,
  SessionSuspendModal,
  ZReportView,
} from './components';
import { MOCK_CUSTOMERS, MOCK_PRODUCTS, PRODUCT_CATEGORIES } from './mock-data';
import { useSalesStore } from './sales-store';
import type { Customer, Product } from './types';
import { PaymentMethod } from './types';

// Loading spinner component
function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6';
  return (
    <div
      className={`${sizeClass} animate-spin rounded-full border-2 border-gray-300 border-t-kgc-primary`}
    />
  );
}

// Error alert component
function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-center gap-2">
        <span className="text-red-500">⚠️</span>
        <p className="text-sm text-red-700">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="ml-auto">
            Újra
          </Button>
        )}
      </div>
    </div>
  );
}

export function SalesPOSPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [showSessionOpen, setShowSessionOpen] = useState(false);
  const [showSessionClose, setShowSessionClose] = useState(false);
  const [showSessionSuspend, setShowSessionSuspend] = useState(false);
  const [showZReport, setShowZReport] = useState(false);
  const [lastZReport, setLastZReport] = useState<ZReport | null>(null);
  const [currentTransaction, setCurrentTransaction] = useState<SaleTransaction | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Audio feedback
  const { playScan, playSuccess, playError, playPayment } = useAudioFeedback();

  // API Hooks
  const {
    data: session,
    isLoading: sessionLoading,
    error: _sessionError,
    refetch: refetchSession,
  } = useCurrentSession();

  const _openSessionMutation = useOpenSession();
  const createTransactionMutation = useCreateTransaction();
  const addItemMutation = useAddTransactionItem();
  const _removeItemMutation = useRemoveTransactionItem();
  const _updateItemMutation = useUpdateTransactionItem();
  const voidTransactionMutation = useVoidTransaction();
  const cashPaymentMutation = useProcessCashPayment();
  const cardPaymentMutation = useProcessCardPayment();
  const completeTransactionMutation = useCompleteTransaction();

  // Product search from API (fallback to mock for now)
  const { data: searchResults, isLoading: searchLoading } = useProductSearch(
    { search: searchTerm },
    { enabled: searchTerm.length >= 2 }
  );

  // Barcode product lookup
  const findByBarcode = useFindProductByBarcode();

  // Zustand store for local cart state
  const {
    cart,
    customer,
    paymentMethod,
    cashReceived,
    globalDiscount,
    getSubtotal,
    getTotal,
    getChange,
    addToCart,
    removeFromCart,
    updateQuantity,
    setCustomer,
    setPaymentMethod,
    setCashReceived,
    setGlobalDiscount,
    clearCart,
    reset,
  } = useSalesStore();

  // Handle barcode scan
  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      try {
        playScan();

        // Try to find product by barcode via API
        const result = await findByBarcode.mutateAsync(barcode);

        if (result) {
          // Convert POSProduct to local Product type and add to cart
          const product: Product = {
            id: result.id,
            sku: result.sku,
            name: result.name,
            category: result.category ?? 'Egyéb',
            price: result.price,
            vatRate: result.vatRate,
            stock: result.stock,
            unit: result.unit,
            barcode: result.barcode ?? undefined,
          };

          if (product.stock > 0) {
            addToCart(product);
            playSuccess();
          } else {
            playError();
            setApiError('A termék nincs készleten');
          }
        } else {
          // Fallback to mock data
          const mockProduct = MOCK_PRODUCTS.find(p => p.barcode === barcode);
          if (mockProduct) {
            if (mockProduct.stock > 0) {
              addToCart(mockProduct);
              playSuccess();
            } else {
              playError();
              setApiError('A termék nincs készleten');
            }
          } else {
            playError();
            setApiError(`Ismeretlen vonalkód: ${barcode}`);
          }
        }
      } catch (error) {
        playError();
        setApiError('Hiba a vonalkód beolvasásakor');
        console.error('Barcode scan error:', error);
      }
    },
    [findByBarcode, addToCart, playScan, playSuccess, playError]
  );

  // Setup barcode scanner - only when session is open
  useBarcodeScanner({
    onScan: handleBarcodeScan,
    onError: error => {
      setApiError(error);
      playError();
    },
    enabled: session?.status === 'OPEN',
    minLength: 5,
    maxGap: 50,
  });

  // Check if session needs to be opened on mount
  useEffect(() => {
    if (!sessionLoading && !session) {
      setShowSessionOpen(true);
    }
  }, [sessionLoading, session]);

  // Clear API error after 5 seconds
  useEffect(() => {
    if (apiError) {
      const timer = setTimeout(() => setApiError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [apiError]);

  // Filter products - prefer API results, fallback to mock
  const products = searchResults?.length ? searchResults : MOCK_PRODUCTS;
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      searchTerm === '' ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) as Product[];

  const handleProductClick = (product: Product) => {
    if (product.stock > 0) {
      addToCart(product);
      playSuccess();
    }
  };

  const handleCompleteSale = async () => {
    if (!session) {
      setApiError('Nincs aktív kassza session');
      return;
    }

    try {
      // Create transaction if not exists
      let transaction = currentTransaction;
      if (!transaction) {
        transaction = await createTransactionMutation.mutateAsync({
          sessionId: session.id,
          customerId: customer?.id,
        });
        setCurrentTransaction(transaction);

        // Add all cart items
        for (const item of cart) {
          await addItemMutation.mutateAsync({
            transactionId: transaction.id,
            dto: {
              productId: item.product.id,
              productCode: item.product.sku,
              productName: item.product.name,
              quantity: item.quantity,
              unitPrice: item.product.price,
              taxRate: item.product.vatRate,
              discountPercent: item.discount,
            },
          });
        }
      }

      // Process payment
      const total = getTotal();
      if (paymentMethod === PaymentMethod.CASH) {
        await cashPaymentMutation.mutateAsync({
          transactionId: transaction.id,
          dto: { receivedAmount: cashReceived },
        });
      } else if (paymentMethod === PaymentMethod.CARD) {
        await cardPaymentMutation.mutateAsync({
          transactionId: transaction.id,
          dto: { amount: total },
        });
      }

      // Complete transaction
      await completeTransactionMutation.mutateAsync(transaction.id);

      // Success!
      playPayment();
      reset();
      setCurrentTransaction(null);
      setShowPayment(false);

      // Show success message
      alert(`Eladás sikeres!\nÖsszeg: ${formatPrice(total)}\nVissza: ${formatPrice(getChange())}`);
    } catch (error) {
      playError();
      setApiError('Hiba a fizetés feldolgozásakor');
      console.error('Payment error:', error);
    }
  };

  const handleVoidTransaction = async () => {
    if (currentTransaction) {
      try {
        await voidTransactionMutation.mutateAsync({
          transactionId: currentTransaction.id,
          dto: { reason: 'Felhasználó által törölve' },
        });
        setCurrentTransaction(null);
        reset();
      } catch (error) {
        setApiError('Hiba a tranzakció törlésekor');
        console.error('Void error:', error);
      }
    }
  };

  const handleSelectCustomer = (c: Customer | null) => {
    setCustomer(c);
    setShowCustomerSelect(false);
  };

  const handleSessionOpened = (_newSession: CashRegisterSession) => {
    setShowSessionOpen(false);
    refetchSession();
  };

  const handleSessionClosed = (zReport: ZReport) => {
    setShowSessionClose(false);
    setLastZReport(zReport);
    setShowZReport(true);
    refetchSession();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const subtotal = getSubtotal();
  const total = getTotal();
  const change = getChange();
  const canCompleteSale =
    cart.length > 0 && (paymentMethod !== PaymentMethod.CASH || cashReceived >= total);
  const isSessionOpen = session?.status === 'OPEN';
  const isLoading =
    createTransactionMutation.isPending ||
    cashPaymentMutation.isPending ||
    cardPaymentMutation.isPending ||
    completeTransactionMutation.isPending;

  // Show session open modal if no active session
  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Kassza session betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              ← Vissza
            </Button>
            <h1 className="text-xl font-bold">Pénztár (POS)</h1>
            {session && <SessionStatusBadge session={session} />}
          </div>
          <div className="flex items-center gap-2">
            {/* Session controls */}
            {!session && (
              <Button onClick={() => setShowSessionOpen(true)} className="bg-green-600">
                Kassza nyitás
              </Button>
            )}
            {session?.status === 'OPEN' && (
              <>
                <Button variant="outline" onClick={() => setShowSessionSuspend(true)}>
                  Felfüggesztés
                </Button>
                <Button variant="outline" onClick={() => setShowSessionClose(true)}>
                  Kassza zárás
                </Button>
              </>
            )}
            {session?.status === 'SUSPENDED' && (
              <Button onClick={() => setShowSessionSuspend(true)} className="bg-blue-600">
                Folytatás
              </Button>
            )}

            {/* Customer badge */}
            {customer ? (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1">
                <span className="text-sm font-medium text-blue-700">{customer.name}</span>
                <button
                  onClick={() => setCustomer(null)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  ✕
                </button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowCustomerSelect(true)}>
                + Vevő
              </Button>
            )}
          </div>
        </div>

        {/* API Error display */}
        {apiError && (
          <div className="mt-2">
            <ErrorAlert message={apiError} onRetry={() => setApiError(null)} />
          </div>
        )}

        {/* Offline/Session warning */}
        {!isSessionOpen && session && (
          <div className="mt-2 rounded-lg bg-yellow-50 p-2 text-center text-sm text-yellow-700">
            A kassza {session.status === 'SUSPENDED' ? 'felfüggesztve' : 'zárva'} van. Nyissa meg a
            kasszát a tranzakciók indításához.
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Products */}
        <div className="flex w-2/3 flex-col border-r bg-white">
          {/* Search & Categories */}
          <div className="border-b p-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Keresés név, cikkszám vagy vonalkód alapján..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="mb-3 pr-10"
                disabled={!isSessionOpen}
              />
              {searchLoading && (
                <div className="absolute right-3 top-2">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                disabled={!isSessionOpen}
                className={`rounded-full px-3 py-1 text-sm ${
                  !selectedCategory
                    ? 'bg-kgc-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                Mind
              </button>
              {PRODUCT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  disabled={!isSessionOpen}
                  className={`rounded-full px-3 py-1 text-sm ${
                    selectedCategory === cat
                      ? 'bg-kgc-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-auto p-4">
            {!isSessionOpen ? (
              <div className="flex h-full items-center justify-center text-gray-400">
                <div className="text-center">
                  <p className="text-lg">Nyissa meg a kasszát a termékek megjelenítéséhez</p>
                  <Button onClick={() => setShowSessionOpen(true)} className="mt-4 bg-green-600">
                    Kassza nyitás
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    disabled={product.stock === 0}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      product.stock === 0
                        ? 'cursor-not-allowed bg-gray-100 opacity-60'
                        : 'bg-white hover:border-kgc-primary hover:shadow-md'
                    }`}
                  >
                    <p className="text-xs text-gray-500">{product.sku}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-medium">{product.name}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-bold text-kgc-primary">
                        {formatPrice(product.price)}
                      </span>
                      <span
                        className={`text-xs ${product.stock <= 3 ? 'text-red-500' : 'text-gray-500'}`}
                      >
                        {product.stock} {product.unit}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="flex w-1/3 flex-col bg-gray-50">
          <div className="flex-1 overflow-auto p-4">
            <h2 className="mb-4 text-lg font-semibold">Kosár ({cart.length} tétel)</h2>

            {cart.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-gray-400">
                A kosár üres
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.product.id} className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.product.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatPrice(item.product.price)} / {item.product.unit}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 hover:bg-gray-200"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock}
                          className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-bold">{formatPrice(item.lineTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart footer */}
          <div className="border-t bg-white p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Részösszeg:</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {globalDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Kedvezmény:</span>
                  <span>-{formatPrice(globalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <span>Összesen:</span>
                <span className="text-kgc-primary">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  clearCart();
                  if (currentTransaction) {
                    handleVoidTransaction();
                  }
                }}
                disabled={cart.length === 0 || !isSessionOpen}
              >
                Kosár törlése
              </Button>
              <Button
                onClick={() => setShowPayment(true)}
                disabled={cart.length === 0 || !isSessionOpen}
                className="bg-green-600 hover:bg-green-700"
              >
                Fizetés
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Fizetés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Payment method */}
                <div>
                  <label className="mb-2 block text-sm font-medium">Fizetési mód</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { method: PaymentMethod.CASH, label: 'Készpénz', icon: '💵' },
                      { method: PaymentMethod.CARD, label: 'Kártya', icon: '💳' },
                      { method: PaymentMethod.TRANSFER, label: 'Átutalás', icon: '🏦' },
                    ].map(({ method, label, icon }) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`rounded-lg border-2 p-3 text-center transition-all ${
                          paymentMethod === method
                            ? 'border-kgc-primary bg-kgc-primary/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl">{icon}</span>
                        <p className="mt-1 text-sm font-medium">{label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discount */}
                <div>
                  <label className="mb-2 block text-sm font-medium">Kedvezmény (Ft)</label>
                  <Input
                    type="number"
                    value={globalDiscount || ''}
                    onChange={e => setGlobalDiscount(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>

                {/* Cash received (only for cash payment) */}
                {paymentMethod === PaymentMethod.CASH && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">Kapott összeg (Ft)</label>
                    <Input
                      type="number"
                      value={cashReceived || ''}
                      onChange={e => setCashReceived(Number(e.target.value) || 0)}
                      placeholder="0"
                      autoFocus
                    />
                    {/* Quick amounts */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        total,
                        Math.ceil(total / 1000) * 1000,
                        Math.ceil(total / 5000) * 5000,
                        Math.ceil(total / 10000) * 10000,
                      ].map((amount, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCashReceived(amount)}
                          className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
                        >
                          {formatPrice(amount)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Fizetendő:</span>
                      <span className="text-kgc-primary">{formatPrice(total)}</span>
                    </div>
                    {paymentMethod === PaymentMethod.CASH && cashReceived > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Visszajáró:</span>
                        <span className="text-xl font-bold">{formatPrice(change)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowPayment(false)}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Mégse
                  </Button>
                  <Button
                    onClick={handleCompleteSale}
                    disabled={!canCompleteSale || isLoading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        <span>Feldolgozás...</span>
                      </div>
                    ) : (
                      'Fizetés befejezése'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customer Select Modal */}
      {showCustomerSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Vevő kiválasztása</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <button
                  onClick={() => handleSelectCustomer(null)}
                  className="w-full rounded-lg border p-3 text-left hover:bg-gray-50"
                >
                  <p className="font-medium text-gray-500">Nincs vevő (készpénzes vásárlás)</p>
                </button>
                {MOCK_CUSTOMERS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="w-full rounded-lg border p-3 text-left hover:bg-gray-50"
                  >
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-gray-500">
                      {c.type === 'COMPANY' ? c.taxNumber : c.phone || c.email}
                    </p>
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowCustomerSelect(false)}
                className="mt-4 w-full"
              >
                Mégse
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Session Modals */}
      <SessionOpenModal
        open={showSessionOpen}
        onOpenChange={setShowSessionOpen}
        onSessionOpened={handleSessionOpened}
      />

      <SessionCloseModal
        open={showSessionClose}
        onOpenChange={setShowSessionClose}
        session={session ?? undefined}
        onSessionClosed={handleSessionClosed}
      />

      <SessionSuspendModal
        open={showSessionSuspend}
        onOpenChange={setShowSessionSuspend}
        session={session ?? undefined}
        onSessionUpdated={() => refetchSession()}
      />

      {/* Z-Report View */}
      {showZReport && lastZReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] overflow-auto rounded-lg bg-white">
            <ZReportView
              report={lastZReport}
              isOpen={showZReport}
              onClose={() => {
                setShowZReport(false);
                setLastZReport(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
