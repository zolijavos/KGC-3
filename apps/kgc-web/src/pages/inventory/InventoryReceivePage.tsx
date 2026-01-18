import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_INVENTORY, MOCK_WAREHOUSES } from './mock-data';
import type { InventoryItem } from './types';

interface ReceiveItem {
  item: InventoryItem;
  quantity: number;
  note?: string;
}

export function InventoryReceivePage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState(MOCK_WAREHOUSES[0]?.id ?? '');
  const [reference, setReference] = useState('');
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([]);

  const filteredProducts = MOCK_INVENTORY.filter(
    item =>
      searchTerm !== '' &&
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.barcode && item.barcode.includes(searchTerm)))
  );

  const addItem = (item: InventoryItem) => {
    const existing = receiveItems.find(r => r.item.id === item.id);
    if (existing) {
      setReceiveItems(
        receiveItems.map(r => (r.item.id === item.id ? { ...r, quantity: r.quantity + 1 } : r))
      );
    } else {
      setReceiveItems([...receiveItems, { item, quantity: 1 }]);
    }
    setSearchTerm('');
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setReceiveItems(receiveItems.filter(r => r.item.id !== itemId));
    } else {
      setReceiveItems(receiveItems.map(r => (r.item.id === itemId ? { ...r, quantity } : r)));
    }
  };

  const removeItem = (itemId: string) => {
    setReceiveItems(receiveItems.filter(r => r.item.id !== itemId));
  };

  const handleSubmit = () => {
    if (receiveItems.length === 0) return;
    // In real app, this would call API
    alert(
      `Bevételezés sikeres!\n${receiveItems.length} termék, összesen ${receiveItems.reduce((sum, r) => sum + r.quantity, 0)} db`
    );
    navigate('/inventory');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const totalItems = receiveItems.reduce((sum, r) => sum + r.quantity, 0);
  const totalValue = receiveItems.reduce((sum, r) => sum + r.quantity * r.item.purchasePrice, 0);

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
              <h1 className="text-xl font-bold text-gray-900">Árubevételezés</h1>
              <p className="text-sm text-gray-500">Készlet bevételezése raktárba</p>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={receiveItems.length === 0}
            className="bg-kgc-primary hover:bg-kgc-primary/90"
          >
            Bevételezés mentése
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Add items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Document info */}
            <Card>
              <CardHeader>
                <CardTitle>Bizonylat adatok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Hivatkozás / Rendelésszám
                    </label>
                    <Input
                      value={reference}
                      onChange={e => setReference(e.target.value)}
                      placeholder="PO-2024-0035"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Cél raktár</label>
                    <select
                      value={selectedWarehouse}
                      onChange={e => setSelectedWarehouse(e.target.value)}
                      className="w-full rounded-md border px-3 py-2"
                    >
                      {MOCK_WAREHOUSES.map(wh => (
                        <option key={wh.id} value={wh.id}>
                          {wh.name} ({wh.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product search */}
            <Card>
              <CardHeader>
                <CardTitle>Termék hozzáadása</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Keresés név, cikkszám vagy vonalkód alapján..."
                    className="w-full"
                  />
                  {filteredProducts.length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-white shadow-lg">
                      {filteredProducts.map(item => (
                        <button
                          key={item.id}
                          onClick={() => addItem(item)}
                          className="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50"
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">{item.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatPrice(item.purchasePrice)}</p>
                            <p className="text-sm text-gray-500">Készlet: {item.currentStock}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Items list */}
            <Card>
              <CardHeader>
                <CardTitle>Bevételezendő tételek ({receiveItems.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {receiveItems.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    Adjon hozzá termékeket a keresőmezővel
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receiveItems.map(ri => (
                      <div
                        key={ri.item.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{ri.item.name}</p>
                          <p className="text-sm text-gray-500">
                            {ri.item.sku} • {formatPrice(ri.item.purchasePrice)}/{ri.item.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(ri.item.id, ri.quantity - 1)}
                              className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 hover:bg-gray-200"
                            >
                              -
                            </button>
                            <Input
                              type="number"
                              value={ri.quantity}
                              onChange={e =>
                                updateQuantity(ri.item.id, Number(e.target.value) || 0)
                              }
                              className="w-20 text-center"
                            />
                            <button
                              onClick={() => updateQuantity(ri.item.id, ri.quantity + 1)}
                              className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 hover:bg-gray-200"
                            >
                              +
                            </button>
                          </div>
                          <p className="w-28 text-right font-bold">
                            {formatPrice(ri.quantity * ri.item.purchasePrice)}
                          </p>
                          <button
                            onClick={() => removeItem(ri.item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Összesítés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Termékfajták:</span>
                    <span className="font-medium">{receiveItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Összes darab:</span>
                    <span className="font-medium">{totalItems} db</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Beszerzési érték:</span>
                      <span className="text-kgc-primary">{formatPrice(totalValue)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="mb-4 text-sm font-medium text-gray-500">Megjegyzés</p>
                <textarea
                  className="w-full rounded-md border p-3"
                  rows={4}
                  placeholder="Opcionális megjegyzés a bevételezéshez..."
                />
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Button
                onClick={handleSubmit}
                disabled={receiveItems.length === 0}
                className="w-full bg-kgc-primary hover:bg-kgc-primary/90"
              >
                Bevételezés mentése
              </Button>
              <Button variant="outline" onClick={() => navigate('/inventory')} className="w-full">
                Mégse
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
