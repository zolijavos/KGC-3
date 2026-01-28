/**
 * Contract Form Page
 * Szerződés szerkesztése
 */

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CONTRACT_STATUSES, CONTRACT_TYPES, MOCK_CONTRACTS } from './mock-data';
import type { Contract, ContractItem, ContractStatus, ContractType } from './types';

interface FormData {
  type: ContractType;
  status: ContractStatus;
  startDate: string;
  expectedEndDate: string;
  terms: string;
  notes: string;
  items: ContractItem[];
  depositAmount: number;
  depositPaid: boolean;
}

function contractToFormData(contract: Contract): FormData {
  return {
    type: contract.type,
    status: contract.status,
    startDate: contract.startDate,
    expectedEndDate: contract.expectedEndDate,
    terms: contract.terms ?? '',
    notes: contract.notes ?? '',
    items: [...contract.items],
    depositAmount: contract.depositAmount,
    depositPaid: contract.depositPaid,
  };
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(price);
}

export function ContractFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    type: 'rental',
    status: 'draft',
    startDate: '',
    expectedEndDate: '',
    terms: '',
    notes: '',
    items: [],
    depositAmount: 0,
    depositPaid: false,
  });

  useEffect(() => {
    const found = MOCK_CONTRACTS.find(c => c.id === id);
    if (found) {
      setContract(found);
      setFormData(contractToFormData(found));
    }
    setIsLoading(false);
  }, [id]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: keyof ContractItem, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const item = newItems[index];
      if (!item) return prev;

      const updatedItem = { ...item, [field]: value };

      if (field === 'quantity' || field === 'dailyRate') {
        const quantity = field === 'quantity' ? Number(value) : updatedItem.quantity;
        const dailyRate = field === 'dailyRate' ? Number(value) : (updatedItem.dailyRate ?? 0);
        const days = calculateDays();
        updatedItem.totalAmount = quantity * dailyRate * days;
      }

      newItems[index] = updatedItem;
      return { ...prev, items: newItems };
    });
  };

  const calculateDays = (): number => {
    if (!formData.startDate || !formData.expectedEndDate) return 1;
    const start = new Date(formData.startDate);
    const end = new Date(formData.expectedEndDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  };

  const calculateTotal = (): number => {
    return formData.items.reduce((sum, item) => sum + item.totalAmount, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.startDate || !formData.expectedEndDate) {
      alert('A kezdő és záró dátum megadása kötelező!');
      return;
    }

    const total = calculateTotal();
    alert(`Szerződés frissítve!\nSzám: ${contract?.contractNumber}\nÖsszeg: ${formatPrice(total)}`);
    navigate(`/contracts/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <p className="text-gray-500">Betöltés...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <p className="text-gray-500">Szerződés nem található.</p>
      </div>
    );
  }

  const total = calculateTotal();
  const days = calculateDays();

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(`/contracts/${id}`)}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Szerződés szerkesztése
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {contract.contractNumber} • {contract.partnerName}
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
          {/* Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle>Szerződés adatai</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Típus
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => updateField('type', e.target.value as ContractType)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {CONTRACT_TYPES.map(t => (
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
                    onChange={e => updateField('status', e.target.value as ContractStatus)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {CONTRACT_STATUSES.map(s => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kezdés
                  </label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={e => updateField('startDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Várható vég
                  </label>
                  <Input
                    type="date"
                    value={formData.expectedEndDate}
                    onChange={e => updateField('expectedEndDate', e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Időtartam: <strong>{days} nap</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Tételek</CardTitle>
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
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                          Napi díj
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={item.dailyRate ?? 0}
                          onChange={e => updateItem(index, 'dailyRate', Number(e.target.value))}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
                          Összesen ({days} nap)
                        </label>
                        <p className="mt-2 font-medium text-gray-900 dark:text-white">
                          {formatPrice(item.totalAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Financial */}
          <Card>
            <CardHeader>
              <CardTitle>Pénzügyi adatok</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kaució összege
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.depositAmount}
                    onChange={e => updateField('depositAmount', Number(e.target.value))}
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.depositPaid}
                      onChange={e => updateField('depositPaid', e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Kaució befizetve
                    </span>
                  </label>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Szerződés összege
                  </label>
                  <p className="mt-2 text-xl font-bold text-kgc-primary">{formatPrice(total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms & Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Feltételek és megjegyzések</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Szerződési feltételek
                  </label>
                  <textarea
                    value={formData.terms}
                    onChange={e => updateField('terms', e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="A szerződés általános feltételei..."
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Megjegyzések
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={e => updateField('notes', e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Egyéb megjegyzések..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(`/contracts/${id}`)}>
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
