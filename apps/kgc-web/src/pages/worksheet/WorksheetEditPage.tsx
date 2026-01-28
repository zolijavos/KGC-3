/**
 * Worksheet Edit Page
 * Munkalap szerkesztése
 */

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatCurrency, MOCK_LABOR_NORMS, MOCK_PARTS, MOCK_WORKSHEETS } from './mock-data';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  WorksheetPriority,
  WorksheetStatus,
  WorksheetType,
  type Worksheet,
  type WorksheetItem,
} from './types';

interface FormData {
  status: WorksheetStatus;
  worksheetType: WorksheetType;
  priority: WorksheetPriority;
  diagnosis: string;
  workPerformed: string;
  internalNote: string;
  customerNote: string;
  assignedTo: string;
  estimatedCompletionDate: string;
  items: WorksheetItem[];
}

const MOCK_TECHNICIANS = [
  { id: 't1', name: 'Szabó Péter' },
  { id: 't2', name: 'Tóth Gábor' },
  { id: 't3', name: 'Kiss Béla' },
  { id: 't4', name: 'Varga István' },
];

function worksheetToFormData(worksheet: Worksheet): FormData {
  return {
    status: worksheet.status,
    worksheetType: worksheet.worksheetType,
    priority: worksheet.priority,
    diagnosis: worksheet.diagnosis,
    workPerformed: worksheet.workPerformed,
    internalNote: worksheet.internalNote,
    customerNote: worksheet.customerNote,
    assignedTo: worksheet.assignedTo ?? '',
    estimatedCompletionDate: worksheet.estimatedCompletionDate ?? '',
    items: [...worksheet.items],
  };
}

function calculateTotals(items: WorksheetItem[]) {
  const netTotal = items.reduce((sum, item) => sum + item.netAmount, 0);
  const vatTotal = items.reduce((sum, item) => sum + (item.grossAmount - item.netAmount), 0);
  const grossTotal = netTotal + vatTotal;
  return { netTotal, vatTotal, grossTotal };
}

export function WorksheetEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [worksheet, setWorksheet] = useState<Worksheet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    status: WorksheetStatus.FELVEVE,
    worksheetType: WorksheetType.FIZETOS,
    priority: WorksheetPriority.NORMAL,
    diagnosis: '',
    workPerformed: '',
    internalNote: '',
    customerNote: '',
    assignedTo: '',
    estimatedCompletionDate: '',
    items: [],
  });
  const [showPartSelector, setShowPartSelector] = useState(false);
  const [showLaborSelector, setShowLaborSelector] = useState(false);

  useEffect(() => {
    const found = MOCK_WORKSHEETS.find(w => w.id === id);
    if (found) {
      setWorksheet(found);
      setFormData(worksheetToFormData(found));
    }
    setIsLoading(false);
  }, [id]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: keyof WorksheetItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const item = newItems[index];
      if (!item) return prev;

      const updatedItem = { ...item, [field]: value };

      if (field === 'quantity' || field === 'unitPrice') {
        const quantity = field === 'quantity' ? Number(value) : updatedItem.quantity;
        const unitPrice = field === 'unitPrice' ? Number(value) : updatedItem.unitPrice;
        updatedItem.netAmount = quantity * unitPrice;
        updatedItem.grossAmount = Math.round(
          updatedItem.netAmount * (1 + updatedItem.vatRate / 100)
        );
      }

      newItems[index] = updatedItem;
      return { ...prev, items: newItems };
    });
  };

  const addPart = (partId: string) => {
    const part = MOCK_PARTS.find(p => p.id === partId);
    if (!part) return;

    const newItem: WorksheetItem = {
      id: `item-${Date.now()}`,
      type: 'ALKATRESZ',
      description: part.name,
      quantity: 1,
      unitPrice: part.unitPrice,
      vatRate: 27,
      netAmount: part.unitPrice,
      grossAmount: Math.round(part.unitPrice * 1.27),
      partId: part.id,
    };

    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setShowPartSelector(false);
  };

  const addLabor = (normId: string) => {
    const norm = MOCK_LABOR_NORMS.find(n => n.id === normId);
    if (!norm) return;

    const newItem: WorksheetItem = {
      id: `item-${Date.now()}`,
      type: 'MUNKADIJ',
      description: norm.description,
      quantity: 1,
      unitPrice: norm.calculatedPrice,
      vatRate: 27,
      netAmount: norm.calculatedPrice,
      grossAmount: Math.round(norm.calculatedPrice * 1.27),
      normId: norm.id,
    };

    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
    setShowLaborSelector(false);
  };

  const addCustomItem = () => {
    const newItem: WorksheetItem = {
      id: `item-${Date.now()}`,
      type: 'EGYEB',
      description: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 27,
      netAmount: 0,
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

  const getAvailableStatuses = (): WorksheetStatus[] => {
    if (!worksheet) return [];

    switch (worksheet.status) {
      case WorksheetStatus.FELVEVE:
        return [WorksheetStatus.FELVEVE, WorksheetStatus.FOLYAMATBAN, WorksheetStatus.TOROLVE];
      case WorksheetStatus.FOLYAMATBAN:
        return [WorksheetStatus.FOLYAMATBAN, WorksheetStatus.VARHATO, WorksheetStatus.KESZ];
      case WorksheetStatus.VARHATO:
        return [WorksheetStatus.VARHATO, WorksheetStatus.FOLYAMATBAN, WorksheetStatus.KESZ];
      case WorksheetStatus.KESZ:
        return [WorksheetStatus.KESZ, WorksheetStatus.SZAMLAZANDO];
      case WorksheetStatus.SZAMLAZANDO:
        return [WorksheetStatus.SZAMLAZANDO, WorksheetStatus.LEZART];
      default:
        return [worksheet.status];
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const totals = calculateTotals(formData.items);
    alert(
      `Munkalap frissítve!\nSzám: ${worksheet?.worksheetNumber}\nÖsszeg: ${formatCurrency(totals.grossTotal)}`
    );
    navigate(`/worksheet/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <p className="text-gray-500">Betöltés...</p>
      </div>
    );
  }

  if (!worksheet) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <p className="text-gray-500">Munkalap nem található.</p>
      </div>
    );
  }

  const totals = calculateTotals(formData.items);
  const isEditable = ![WorksheetStatus.LEZART, WorksheetStatus.TOROLVE].includes(worksheet.status);

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(`/worksheet/${id}`)}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Munkalap szerkesztése
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {worksheet.worksheetNumber} • {worksheet.partnerName}
              </p>
            </div>
          </div>
          {isEditable && (
            <Button onClick={handleSubmit} className="bg-kgc-primary hover:bg-kgc-primary/90">
              Mentés
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {!isEditable && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/30">
            <p className="text-amber-800 dark:text-amber-200">
              Ez a munkalap {STATUS_LABELS[worksheet.status].toLowerCase()} státuszban van, ezért
              nem szerkeszthető.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status & Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Munkalap adatai</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Státusz
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => updateField('status', e.target.value as WorksheetStatus)}
                    disabled={!isEditable}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {getAvailableStatuses().map(s => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Típus
                  </label>
                  <select
                    value={formData.worksheetType}
                    onChange={e => updateField('worksheetType', e.target.value as WorksheetType)}
                    disabled={!isEditable}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prioritás
                  </label>
                  <select
                    value={formData.priority}
                    onChange={e => updateField('priority', e.target.value as WorksheetPriority)}
                    disabled={!isEditable}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Felelős technikus
                  </label>
                  <select
                    value={formData.assignedTo}
                    onChange={e => updateField('assignedTo', e.target.value)}
                    disabled={!isEditable}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">-- Nincs kiválasztva --</option>
                    {MOCK_TECHNICIANS.map(t => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Várható elkészülés
                  </label>
                  <Input
                    type="date"
                    value={formData.estimatedCompletionDate}
                    onChange={e => updateField('estimatedCompletionDate', e.target.value)}
                    disabled={!isEditable}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Összesen (bruttó)
                  </label>
                  <p className="mt-2 text-xl font-bold text-kgc-primary">
                    {formatCurrency(totals.grossTotal)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diagnosis & Work */}
          <Card>
            <CardHeader>
              <CardTitle>Diagnózis és munka</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Diagnózis
                  </label>
                  <textarea
                    value={formData.diagnosis}
                    onChange={e => updateField('diagnosis', e.target.value)}
                    rows={4}
                    disabled={!isEditable}
                    className="w-full rounded-md border border-gray-300 bg-white p-3 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Mi a hiba oka?"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Elvégzett munka
                  </label>
                  <textarea
                    value={formData.workPerformed}
                    onChange={e => updateField('workPerformed', e.target.value)}
                    rows={4}
                    disabled={!isEditable}
                    className="w-full rounded-md border border-gray-300 bg-white p-3 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Milyen munkákat végeztünk el?"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tételek</CardTitle>
                {isEditable && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPartSelector(!showPartSelector)}
                    >
                      + Alkatrész
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLaborSelector(!showLaborSelector)}
                    >
                      + Munkadíj
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={addCustomItem}>
                      + Egyéb
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Part Selector */}
              {showPartSelector && (
                <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                  <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Válasszon alkatrészt:
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {MOCK_PARTS.map(part => (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => addPart(part.id)}
                        className="rounded-lg border border-gray-200 bg-white p-2 text-left hover:border-kgc-primary dark:border-gray-600 dark:bg-gray-700"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {part.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(part.unitPrice)} • Készlet: {part.inStock}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Labor Selector */}
              {showLaborSelector && (
                <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                  <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Válasszon munkadíjat:
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {MOCK_LABOR_NORMS.map(norm => (
                      <button
                        key={norm.id}
                        type="button"
                        onClick={() => addLabor(norm.id)}
                        className="rounded-lg border border-gray-200 bg-white p-2 text-left hover:border-kgc-primary dark:border-gray-600 dark:bg-gray-700"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {norm.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(norm.calculatedPrice)} • {norm.minutes} perc
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {formData.items.map((item, index) => (
                  <div key={item.id} className="p-4">
                    <div className="grid gap-4 sm:grid-cols-12">
                      <div className="sm:col-span-1">
                        <span
                          className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                            item.type === 'ALKATRESZ'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : item.type === 'MUNKADIJ'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {item.type === 'ALKATRESZ'
                            ? 'Alk.'
                            : item.type === 'MUNKADIJ'
                              ? 'Munka'
                              : 'Egyéb'}
                        </span>
                      </div>
                      <div className="sm:col-span-4">
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                          Megnevezés
                        </label>
                        <Input
                          value={item.description}
                          onChange={e => updateItem(index, 'description', e.target.value)}
                          disabled={!isEditable}
                          placeholder="Tétel megnevezése..."
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                          Mennyiség
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                          disabled={!isEditable}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                          Egységár (Ft)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={e => updateItem(index, 'unitPrice', Number(e.target.value))}
                          disabled={!isEditable}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                          Bruttó
                        </label>
                        <p className="mt-2 font-medium text-gray-900 dark:text-white">
                          {formatCurrency(item.grossAmount)}
                        </p>
                      </div>
                      <div className="flex items-end sm:col-span-1">
                        {isEditable && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {formData.items.length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  Nincs tétel. Használja a fenti gombokat tételek hozzáadásához.
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
                      {formatCurrency(totals.netTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">ÁFA (27%):</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(totals.vatTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span className="text-gray-900 dark:text-white">Bruttó összesen:</span>
                    <span className="text-kgc-primary">{formatCurrency(totals.grossTotal)}</span>
                  </div>
                  {worksheet.depositPaid > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Előleg fizetve:</span>
                        <span>-{formatCurrency(worksheet.depositPaid)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-bold">
                        <span className="text-gray-900 dark:text-white">Fizetendő:</span>
                        <span className="text-kgc-primary">
                          {formatCurrency(Math.max(0, totals.grossTotal - worksheet.depositPaid))}
                        </span>
                      </div>
                    </>
                  )}
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
                    Belső megjegyzés (nem látja az ügyfél)
                  </label>
                  <textarea
                    value={formData.internalNote}
                    onChange={e => updateField('internalNote', e.target.value)}
                    rows={3}
                    disabled={!isEditable}
                    className="w-full rounded-md border border-gray-300 bg-white p-3 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Belső feljegyzések..."
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ügyfél megjegyzése
                  </label>
                  <textarea
                    value={formData.customerNote}
                    onChange={e => updateField('customerNote', e.target.value)}
                    rows={3}
                    disabled={!isEditable}
                    className="w-full rounded-md border border-gray-300 bg-white p-3 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Ügyfél kérései..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {isEditable && (
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(`/worksheet/${id}`)}>
                Mégse
              </Button>
              <Button type="submit" className="bg-kgc-primary hover:bg-kgc-primary/90">
                Változtatások mentése
              </Button>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
