/**
 * Invoice Form Page
 * Számla létrehozása / szerkesztése
 */

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { INVOICE_STATUSES, INVOICE_TYPES, PAYMENT_METHODS } from './mock-data';
import type { InvoiceItem, InvoiceStatus, InvoiceType, PaymentMethod } from './types';

interface FormData {
  type: InvoiceType;
  status: InvoiceStatus;
  partnerId: string;
  partnerName: string;
  partnerAddress: string;
  partnerTaxNumber: string;
  issueDate: string;
  dueDate: string;
  paymentMethod: PaymentMethod;
  items: InvoiceItem[];
  notes: string;
}

const DEFAULT_FORM_DATA: FormData = {
  type: 'normal',
  status: 'draft',
  partnerId: '',
  partnerName: '',
  partnerAddress: '',
  partnerTaxNumber: '',
  issueDate: new Date().toISOString().split('T')[0] ?? '',
  dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '',
  paymentMethod: 'transfer',
  items: [],
  notes: '',
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(price);
}

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0');
  return `KGC-${year}-${seq}`;
}

export function InvoiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const item = newItems[index];
      if (!item) return prev;

      const updatedItem = { ...item, [field]: value };

      // Recalculate totals if quantity, unit price or VAT rate changes
      if (field === 'quantity' || field === 'unitPrice' || field === 'vatRate') {
        const quantity = field === 'quantity' ? Number(value) : updatedItem.quantity;
        const unitPrice = field === 'unitPrice' ? Number(value) : updatedItem.unitPrice;
        const vatRate = field === 'vatRate' ? Number(value) : updatedItem.vatRate;
        updatedItem.netAmount = quantity * unitPrice;
        updatedItem.vatAmount = Math.round(updatedItem.netAmount * (vatRate / 100));
        updatedItem.grossAmount = updatedItem.netAmount + updatedItem.vatAmount;
      }

      newItems[index] = updatedItem;
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: `item-new-${Date.now()}`,
      description: '',
      quantity: 1,
      unit: 'db',
      unitPrice: 0,
      vatRate: 27,
      netAmount: 0,
      vatAmount: 0,
      grossAmount: 0,
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
    const netTotal = formData.items.reduce((sum, item) => sum + item.netAmount, 0);
    const vatTotal = formData.items.reduce((sum, item) => sum + item.vatAmount, 0);
    const grossTotal = netTotal + vatTotal;
    return { netTotal, vatTotal, grossTotal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.partnerName.trim()) {
      alert('Kérjük adja meg a partner nevét!');
      return;
    }

    if (formData.items.length === 0) {
      alert('Legalább egy tételt adjon meg!');
      return;
    }

    setIsSaving(true);

    const totals = calculateTotals();
    const invoiceNumber = generateInvoiceNumber();

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    alert(
      `Számla ${isEditMode ? 'frissítve' : 'létrehozva'}!\nSzám: ${invoiceNumber}\nÖsszeg: ${formatPrice(totals.grossTotal)}`
    );

    setIsSaving(false);
    navigate('/invoices');
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/invoices')}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {isEditMode ? 'Számla szerkesztése' : 'Új számla'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isEditMode ? 'Számla adatainak módosítása' : 'Új számla létrehozása'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-kgc-primary hover:bg-kgc-primary/90"
          >
            {isSaving ? 'Mentés...' : 'Mentés'}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Type & Status */}
          <Card>
            <CardHeader>
              <CardTitle>Számla típusa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Típus
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => updateField('type', e.target.value as InvoiceType)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {INVOICE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Státusz
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => updateField('status', e.target.value as InvoiceStatus)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {INVOICE_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fizetési mód
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={e => updateField('paymentMethod', e.target.value as PaymentMethod)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {PAYMENT_METHODS.map(p => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Partner Info */}
          <Card>
            <CardHeader>
              <CardTitle>Partner adatai</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Partner neve *
                  </label>
                  <Input
                    value={formData.partnerName}
                    onChange={e => updateField('partnerName', e.target.value)}
                    placeholder="Partner neve..."
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Adószám
                  </label>
                  <Input
                    value={formData.partnerTaxNumber}
                    onChange={e => updateField('partnerTaxNumber', e.target.value)}
                    placeholder="12345678-2-13"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cím
                  </label>
                  <Input
                    value={formData.partnerAddress}
                    onChange={e => updateField('partnerAddress', e.target.value)}
                    placeholder="1011 Budapest, Fő utca 1."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Dátumok</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kiállítás dátuma
                  </label>
                  <Input
                    type="date"
                    value={formData.issueDate}
                    onChange={e => updateField('issueDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fizetési határidő
                  </label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={e => updateField('dueDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Összesen (bruttó)
                  </label>
                  <p className="mt-2 text-xl font-bold text-kgc-primary">
                    {formatPrice(totals.grossTotal)}
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
                      <div className="sm:col-span-4">
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
                          Egységár (nettó)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={e => updateItem(index, 'unitPrice', Number(e.target.value))}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                          ÁFA %
                        </label>
                        <select
                          value={item.vatRate}
                          onChange={e => updateItem(index, 'vatRate', Number(e.target.value))}
                          className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        >
                          <option value={27}>27%</option>
                          <option value={18}>18%</option>
                          <option value={5}>5%</option>
                          <option value={0}>0%</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                          Bruttó összesen
                        </label>
                        <p className="mt-2 font-medium text-gray-900 dark:text-white">
                          {formatPrice(item.grossAmount)}
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
                      {formatPrice(totals.netTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">ÁFA:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatPrice(totals.vatTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span className="text-gray-900 dark:text-white">Bruttó összesen:</span>
                    <span className="text-kgc-primary">{formatPrice(totals.grossTotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Megjegyzés</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={formData.notes}
                onChange={e => updateField('notes', e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Pl.: Fizetési feltételek, szállítási információk..."
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/invoices')}>
              Mégse
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-kgc-primary hover:bg-kgc-primary/90"
            >
              {isSaving ? 'Mentés...' : isEditMode ? 'Változtatások mentése' : 'Számla létrehozása'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
