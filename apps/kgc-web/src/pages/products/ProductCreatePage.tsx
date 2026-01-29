import { createProduct } from '@/api/products';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_SUPPLIERS, PRODUCT_CATEGORIES, VAT_RATES } from './mock-data';
import type { ProductCategory, VatRate } from './types';

interface FormData {
  category: ProductCategory;
  sku: string;
  barcode: string;
  manufacturerCode: string;
  name: string;
  shortName: string;
  description: string;
  brand: string;
  model: string;
  purchasePrice: string;
  sellingPriceNet: string;
  vatRate: VatRate;
  minStockLevel: string;
  reorderQuantity: string;
  location: string;
  supplierId: string;
  // Rental fields
  rentalDailyRate: string;
  rentalWeeklyRate: string;
  rentalMonthlyRate: string;
  rentalDepositAmount: string;
}

export function ProductCreatePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    category: 'power_tool',
    sku: '',
    barcode: '',
    manufacturerCode: '',
    name: '',
    shortName: '',
    description: '',
    brand: '',
    model: '',
    purchasePrice: '',
    sellingPriceNet: '',
    vatRate: 27,
    minStockLevel: '5',
    reorderQuantity: '10',
    location: '',
    supplierId: '',
    rentalDailyRate: '',
    rentalWeeklyRate: '',
    rentalMonthlyRate: '',
    rentalDepositAmount: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateGrossPrice = () => {
    const net = parseFloat(formData.sellingPriceNet) || 0;
    return Math.round(net * (1 + formData.vatRate / 100));
  };

  const calculateMargin = () => {
    const purchase = parseFloat(formData.purchasePrice) || 0;
    const selling = parseFloat(formData.sellingPriceNet) || 0;
    if (purchase === 0) return 0;
    return (((selling - purchase) / purchase) * 100).toFixed(1);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('A név megadása kötelező!');
      return;
    }

    if (!formData.sku.trim()) {
      alert('A cikkszám megadása kötelező!');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await createProduct({
        sku: formData.sku,
        name: formData.name,
        shortName: formData.shortName || undefined,
        description: formData.description || undefined,
        categoryId: undefined, // API would handle this
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        barcode: formData.barcode || undefined,
        purchasePrice: parseFloat(formData.purchasePrice) || undefined,
        sellingPrice: parseFloat(formData.sellingPriceNet) || undefined,
        vatPercent: formData.vatRate,
        minStockLevel: parseInt(formData.minStockLevel) || undefined,
        reorderQuantity: parseInt(formData.reorderQuantity) || undefined,
      });

      navigate(`/products/${response.data.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mentés sikertelen';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const isRentalEquipment = formData.category === 'rental_equipment';

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/products')}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Új cikk</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Termék adatok rögzítése</p>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            className="bg-kgc-primary hover:bg-kgc-primary/90"
            disabled={isSaving}
          >
            {isSaving ? 'Mentés...' : 'Mentés'}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {saveError && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {saveError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category */}
          <Card>
            <CardHeader>
              <CardTitle>Kategória</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => updateField('category', cat.value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      formData.category === cat.value
                        ? cat.color
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle>Azonosítók</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cikkszám (belső) *
                  </label>
                  <Input
                    value={formData.sku}
                    onChange={e => updateField('sku', e.target.value)}
                    placeholder="MAK-DHP481"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Vonalkód (EAN)
                  </label>
                  <Input
                    value={formData.barcode}
                    onChange={e => updateField('barcode', e.target.value)}
                    placeholder="0088381678940"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Gyártói cikkszám
                  </label>
                  <Input
                    value={formData.manufacturerCode}
                    onChange={e => updateField('manufacturerCode', e.target.value)}
                    placeholder="DHP481RTJ"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Helykód (K-P-D)
                  </label>
                  <Input
                    value={formData.location}
                    onChange={e => updateField('location', e.target.value)}
                    placeholder="A-02-03"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product details */}
          <Card>
            <CardHeader>
              <CardTitle>Termék adatok</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Megnevezés *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={e => updateField('name', e.target.value)}
                    placeholder="Makita DHP481RTJ akkus ütvefúró-csavarozó"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Rövid név
                  </label>
                  <Input
                    value={formData.shortName}
                    onChange={e => updateField('shortName', e.target.value)}
                    placeholder="DHP481RTJ"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Márka
                  </label>
                  <Input
                    value={formData.brand}
                    onChange={e => updateField('brand', e.target.value)}
                    placeholder="Makita"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Típus/Modell
                  </label>
                  <Input
                    value={formData.model}
                    onChange={e => updateField('model', e.target.value)}
                    placeholder="DHP481RTJ"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Beszállító
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={e => updateField('supplierId', e.target.value)}
                    className="w-full rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">-- Válasszon --</option>
                    {MOCK_SUPPLIERS.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Leírás
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => updateField('description', e.target.value)}
                    className="w-full rounded-md border p-3 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                    rows={3}
                    placeholder="Részletes termékleírás..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Árazás</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Beszerzési ár (nettó)
                  </label>
                  <Input
                    type="number"
                    value={formData.purchasePrice}
                    onChange={e => updateField('purchasePrice', e.target.value)}
                    placeholder="89000"
                    min={0}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Eladási ár (nettó)
                  </label>
                  <Input
                    type="number"
                    value={formData.sellingPriceNet}
                    onChange={e => updateField('sellingPriceNet', e.target.value)}
                    placeholder="125000"
                    min={0}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    ÁFA kulcs
                  </label>
                  <select
                    value={formData.vatRate}
                    onChange={e => updateField('vatRate', parseInt(e.target.value) as VatRate)}
                    className="w-full rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                  >
                    {VAT_RATES.map(v => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Eladási ár (bruttó)
                  </label>
                  <div className="rounded-md border px-3 py-2 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 font-medium">
                    {formatPrice(calculateGrossPrice())}
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                <p className="text-sm text-green-700 dark:text-green-300">
                  Számított árrés: <strong>{calculateMargin()}%</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stock settings */}
          <Card>
            <CardHeader>
              <CardTitle>Készlet beállítások</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Minimum készletszint
                  </label>
                  <Input
                    type="number"
                    value={formData.minStockLevel}
                    onChange={e => updateField('minStockLevel', e.target.value)}
                    min={0}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Rendelési mennyiség
                  </label>
                  <Input
                    type="number"
                    value={formData.reorderQuantity}
                    onChange={e => updateField('reorderQuantity', e.target.value)}
                    min={0}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rental settings */}
          {isRentalEquipment && (
            <Card>
              <CardHeader>
                <CardTitle>Bérlési beállítások</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Napi díj (Ft)
                    </label>
                    <Input
                      type="number"
                      value={formData.rentalDailyRate}
                      onChange={e => updateField('rentalDailyRate', e.target.value)}
                      placeholder="8500"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Heti díj (Ft)
                    </label>
                    <Input
                      type="number"
                      value={formData.rentalWeeklyRate}
                      onChange={e => updateField('rentalWeeklyRate', e.target.value)}
                      placeholder="45000"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Havi díj (Ft)
                    </label>
                    <Input
                      type="number"
                      value={formData.rentalMonthlyRate}
                      onChange={e => updateField('rentalMonthlyRate', e.target.value)}
                      placeholder="140000"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Kaució összeg (Ft)
                    </label>
                    <Input
                      type="number"
                      value={formData.rentalDepositAmount}
                      onChange={e => updateField('rentalDepositAmount', e.target.value)}
                      placeholder="150000"
                      min={0}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/products')}
              disabled={isSaving}
            >
              Mégse
            </Button>
            <Button
              type="submit"
              className="bg-kgc-primary hover:bg-kgc-primary/90"
              disabled={isSaving}
            >
              {isSaving ? 'Létrehozás...' : 'Cikk létrehozása'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
