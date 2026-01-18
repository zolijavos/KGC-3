// ProductStep - Product/equipment identification for worksheet
import { Button, Card, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { MOCK_PRODUCTS, isUnderWarranty } from '../mock-data';
import { CATEGORY_LABELS, ProductCategory } from '../types';
import { useWorksheetWizardStore } from '../wizard-store';

export function ProductStep() {
  const { product, deviceName, serialNumber, setProduct, setDeviceInfo } =
    useWorksheetWizardStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'ALL'>('ALL');
  const [manualEntry, setManualEntry] = useState(false);

  const filteredProducts = useMemo(() => {
    let filtered = MOCK_PRODUCTS;

    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(term) ||
          p.brand?.toLowerCase().includes(term) ||
          p.model?.toLowerCase().includes(term) ||
          p.serialNumber?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [search, categoryFilter]);

  const handleSelectProduct = (p: (typeof MOCK_PRODUCTS)[0]) => {
    setProduct(p);
    setManualEntry(false);
  };

  const handleManualEntry = () => {
    setProduct(null);
    setManualEntry(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Gép azonosítása</h2>
        <p className="mt-1 text-sm text-gray-500">
          Válassza ki a szervizelendő gépet a rendszerből, vagy adja meg kézzel.
        </p>
      </div>

      {/* Toggle between search and manual */}
      <div className="flex gap-2">
        <Button
          variant={!manualEntry ? 'default' : 'outline'}
          onClick={() => setManualEntry(false)}
          size="sm"
        >
          Keresés a rendszerben
        </Button>
        <Button variant={manualEntry ? 'default' : 'outline'} onClick={handleManualEntry} size="sm">
          Kézi bevitel
        </Button>
      </div>

      {!manualEntry ? (
        <>
          {/* Search and filter */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Keresés név, gyártó, modell vagy gyári szám alapján..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1"
            />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as ProductCategory | 'ALL')}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary"
            >
              <option value="ALL">Minden kategória</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Product list */}
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredProducts.map(p => {
              const underWarranty = isUnderWarranty(p);
              return (
                <Card
                  key={p.id}
                  className={cn(
                    'cursor-pointer p-4 transition-all hover:shadow-md',
                    product?.id === p.id && 'ring-2 ring-kgc-primary bg-kgc-primary/5'
                  )}
                  onClick={() => handleSelectProduct(p)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{p.name}</h3>
                        {underWarranty && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Garancia
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {p.brand} {p.model}
                      </p>
                      {p.serialNumber && (
                        <p className="text-xs text-gray-400">Gy.sz.: {p.serialNumber}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">{CATEGORY_LABELS[p.category]}</p>
                    </div>
                    {product?.id === p.id && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-kgc-primary text-white">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              <p>Nincs találat a keresési feltételekre.</p>
              <Button variant="link" onClick={handleManualEntry} className="mt-2">
                Gép kézi bevitele
              </Button>
            </div>
          )}
        </>
      ) : (
        /* Manual entry form */
        <Card className="p-4">
          <h3 className="mb-4 font-medium text-gray-900">Gép adatok kézi bevitele</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Gép megnevezése *
              </label>
              <Input
                placeholder="pl. Makita HR2470 Fúrókalapács"
                value={deviceName}
                onChange={e => setDeviceInfo(e.target.value, serialNumber)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Gyári szám</label>
              <Input
                placeholder="pl. MK-2024-001234"
                value={serialNumber}
                onChange={e => setDeviceInfo(deviceName, e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Selected product summary */}
      {(product || (manualEntry && deviceName)) && (
        <div className="rounded-lg bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium text-green-800">
              Kiválasztott gép: {product?.name ?? deviceName}
              {(product?.serialNumber ?? serialNumber) && (
                <span className="ml-2 text-sm font-normal">
                  (Gy.sz.: {product?.serialNumber ?? serialNumber})
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
