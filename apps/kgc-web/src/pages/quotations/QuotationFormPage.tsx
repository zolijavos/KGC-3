/**
 * Quotation Form Page
 * Árajánlat szerkesztése
 */

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MOCK_QUOTATIONS, QUOTATION_STATUSES } from './mock-data';
import type { Quotation, QuotationItem, QuotationStatus } from './types';

interface FormData {
  status: QuotationStatus;
  validUntil: string;
  notes: string;
  internalNotes: string;
  items: QuotationItem[];
}

function quotationToFormData(quotation: Quotation): FormData {
  return {
    status: quotation.status,
    validUntil: quotation.validUntil.split('T')[0] ?? '',
    notes: quotation.notes ?? '',
    internalNotes: quotation.internalNotes ?? '',
    items: [...quotation.items],
  };
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(price);
}

export function QuotationFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    status: 'draft',
    validUntil: '',
    notes: '',
    internalNotes: '',
    items: [],
  });

  useEffect(() => {
    const found = MOCK_QUOTATIONS.find(q => q.id === id);
    if (found) {
      setQuotation(found);
      setFormData(quotationToFormData(found));
    }
    setIsLoading(false);
  }, [id]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const item = newItems[index];
      if (!item) return prev;

      const updatedItem = { ...item, [field]: value };

      // Recalculate totals if quantity or price changes
      if (field === 'quantity' || field === 'unitPriceNet' || field === 'vatRate') {
        const quantity = field === 'quantity' ? Number(value) : updatedItem.quantity;
        const unitPriceNet = field === 'unitPriceNet' ? Number(value) : updatedItem.unitPriceNet;
        const vatRate = field === 'vatRate' ? Number(value) : updatedItem.vatRate;
        updatedItem.totalNet = quantity * unitPriceNet;
        updatedItem.totalGross = Math.round(updatedItem.totalNet * (1 + vatRate / 100));
      }

      newItems[index] = updatedItem;
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    const newItem: QuotationItem = {
      id: `qi-new-${Date.now()}`,
      description: '',
      quantity: 1,
      unit: 'db',
      unitPriceNet: 0,
      vatRate: 27,
      totalNet: 0,
      totalGross: 0,
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = () => {
    const subtotalNet = formData.items.reduce((sum, item) => sum + item.totalNet, 0);
    const vatAmount = formData.items.reduce(
      (sum, item) => sum + (item.totalGross - item.totalNet),
      0
    );
    const totalGross = subtotalNet + vatAmount;
    return { subtotalNet, vatAmount, totalGross };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      alert('Legalább egy tételt adjon meg!');
      return;
    }

    const totals = calculateTotals();
    alert(
      `Árajánlat frissítve!\nSzám: ${quotation?.quotationNumber}\nÖsszeg: ${formatPrice(totals.totalGross)}`
    );
    navigate(`/quotations/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <p className="text-gray-500">Betöltés...</p>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <p className="text-gray-500">Árajánlat nem található.</p>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(`/quotations/${id}`)}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Árajánlat szerkesztése
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {quotation.quotationNumber} • {quotation.partnerName}
              </p>
            </div>
          </div>
          <Button onClick={handleSubmit} className="bg-kgc-primary hover:bg-kgc-primary/90">
            Mentés
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status & Validity */}
          <Card>
            <CardHeader>
              <CardTitle>Árajánlat adatai</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Státusz
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => updateField('status', e.target.value as QuotationStatus)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {QUOTATION_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Érvényesség vége
                  </label>
                  <Input
                    type="date"
                    value={formData.validUntil}
                    onChange={e => updateField('validUntil', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Összesen (bruttó)
                  </label>
                  <p className="mt-2 text-xl font-bold text-kgc-primary">
                    {formatPrice(totals.totalGross)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tételek</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  + Tétel hozzáadása
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {formData.items.map((item, index) => (
                  <div key={item.id} className="p-4">
                    <div className="grid gap-4 sm:grid-cols-12">
                      <div className="sm:col-span-5">
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                          Megnevezés
                        </label>
                        <Input
                          value={item.description}
                          onChange={e => updateItem(index, 'description', e.target.value)}
                          placeholder="Tétel megnevezése..."
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                          Menny.
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                          Egység
                        </label>
                        <Input
                          value={item.unit}
                          onChange={e => updateItem(index, 'unit', e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                          Nettó ár
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPriceNet}
                          onChange={e => updateItem(index, 'unitPriceNet', Number(e.target.value))}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                          Bruttó összesen
                        </label>
                        <p className="mt-2 font-medium text-gray-900 dark:text-white">
                          {formatPrice(item.totalGross)}
                        </p>
                      </div>
                      <div className="flex items-end sm:col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Törlés
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {formData.items.length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Nincs tétel. Kattintson a "Tétel hozzáadása" gombra.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Nettó összesen:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatPrice(totals.subtotalNet)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">ÁFA:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatPrice(totals.vatAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span className="text-gray-900 dark:text-white">Bruttó összesen:</span>
                    <span className="text-kgc-primary">{formatPrice(totals.totalGross)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Megjegyzések</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ügyfél számára látható megjegyzés
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={e => updateField('notes', e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Pl.: Várható elkészülési idő, fizetési feltételek..."
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Belső megjegyzés (nem látja az ügyfél)
                  </label>
                  <textarea
                    value={formData.internalNotes}
                    onChange={e => updateField('internalNotes', e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Pl.: Kedvezmény oka, ügyféllel folytatott egyeztetés..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(`/quotations/${id}`)}>
              Mégse
            </Button>
            <Button type="submit" className="bg-kgc-primary hover:bg-kgc-primary/90">
              Változtatások mentése
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
