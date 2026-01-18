import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_CUSTOMERS, MOCK_PRODUCTS, PRODUCT_CATEGORIES } from './mock-data';
import { useSalesStore } from './sales-store';
import type { Customer, Product } from './types';
import { PaymentMethod } from './types';

export function SalesPOSPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);

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

  const filteredProducts = MOCK_PRODUCTS.filter(p => {
    const matchesSearch =
      searchTerm === '' ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleProductClick = (product: Product) => {
    if (product.stock > 0) {
      addToCart(product);
    }
  };

  const handleCompleteSale = () => {
    // In real app, this would call API
    alert(
      `Eladás sikeres!\nÖsszeg: ${formatPrice(getTotal())}\nVissza: ${formatPrice(getChange())}`
    );
    reset();
    setShowPayment(false);
  };

  const handleSelectCustomer = (c: Customer | null) => {
    setCustomer(c);
    setShowCustomerSelect(false);
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
          </div>
          <div className="flex items-center gap-2">
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
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Products */}
        <div className="flex w-2/3 flex-col border-r bg-white">
          {/* Search & Categories */}
          <div className="border-b p-4">
            <Input
              type="text"
              placeholder="Keresés név, cikkszám vagy vonalkód alapján..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="mb-3"
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`rounded-full px-3 py-1 text-sm ${
                  !selectedCategory
                    ? 'bg-kgc-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Mind
              </button>
              {PRODUCT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    selectedCategory === cat
                      ? 'bg-kgc-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-auto p-4">
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
                    <span className="font-bold text-kgc-primary">{formatPrice(product.price)}</span>
                    <span
                      className={`text-xs ${product.stock <= 3 ? 'text-red-500' : 'text-gray-500'}`}
                    >
                      {product.stock} {product.unit}
                    </span>
                  </div>
                </button>
              ))}
            </div>
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
              <Button variant="outline" onClick={clearCart} disabled={cart.length === 0}>
                Kosár törlése
              </Button>
              <Button
                onClick={() => setShowPayment(true)}
                disabled={cart.length === 0}
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
                      ].map(amount => (
                        <button
                          key={amount}
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
                  >
                    Mégse
                  </Button>
                  <Button
                    onClick={handleCompleteSale}
                    disabled={!canCompleteSale}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Fizetés befejezése
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
    </div>
  );
}
