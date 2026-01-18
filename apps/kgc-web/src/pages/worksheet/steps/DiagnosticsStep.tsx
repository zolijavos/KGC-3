// DiagnosticsStep - Diagnosis, parts and labor management
import { Button, Card, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { MOCK_LABOR_NORMS, MOCK_PARTS } from '../mock-data';
import type { LaborNorm, Part } from '../types';
import { useWorksheetWizardStore } from '../wizard-store';

type TabType = 'parts' | 'labor' | 'custom';

export function DiagnosticsStep() {
  const {
    diagnosis,
    workPerformed,
    items,
    setDiagnostics,
    addPart,
    addLabor,
    addCustomItem,
    removeItem,
    updateItemQuantity,
    totals,
  } = useWorksheetWizardStore();

  const [activeTab, setActiveTab] = useState<TabType>('parts');
  const [partSearch, setPartSearch] = useState('');
  const [laborSearch, setLaborSearch] = useState('');

  // Custom item state
  const [customDesc, setCustomDesc] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('1');

  const filteredParts = MOCK_PARTS.filter(
    p =>
      p.name.toLowerCase().includes(partSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(partSearch.toLowerCase())
  );

  const filteredNorms = MOCK_LABOR_NORMS.filter(
    n =>
      n.description.toLowerCase().includes(laborSearch.toLowerCase()) ||
      n.code.toLowerCase().includes(laborSearch.toLowerCase())
  );

  const handleAddPart = (part: Part) => {
    addPart(part, 1);
  };

  const handleAddLabor = (norm: LaborNorm) => {
    addLabor(norm, 1);
  };

  const handleAddCustom = () => {
    if (customDesc && customPrice) {
      addCustomItem(customDesc, parseInt(customPrice, 10), parseInt(customQty, 10) || 1);
      setCustomDesc('');
      setCustomPrice('');
      setCustomQty('1');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Diagnosztika és tételek</h2>
        <p className="mt-1 text-sm text-gray-500">
          Rögzítse a diagnosztikát, majd adja hozzá az alkatrészeket és munkadíjakat.
        </p>
      </div>

      {/* Diagnosis fields */}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Diagnosztika / Megállapítás *
          </label>
          <textarea
            placeholder="A gép állapota, talált hibák, szükséges javítások..."
            value={diagnosis}
            onChange={e => setDiagnostics(e.target.value, workPerformed)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Elvégzett munka</label>
          <textarea
            placeholder="Részletes leírás az elvégzett munkáról..."
            value={workPerformed}
            onChange={e => setDiagnostics(diagnosis, e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {[
            { id: 'parts' as TabType, label: 'Alkatrészek', count: totals.partsCount },
            { id: 'labor' as TabType, label: 'Munkadíj normák', count: totals.laborCount },
            {
              id: 'custom' as TabType,
              label: 'Egyéb tétel',
              count: items.filter(i => i.type === 'EGYEB').length,
            },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-kgc-primary text-kgc-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 rounded-full bg-kgc-primary/10 px-2 py-0.5 text-xs text-kgc-primary">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[200px]">
        {activeTab === 'parts' && (
          <div className="space-y-4">
            <Input
              placeholder="Keresés alkatrész név vagy cikkszám alapján..."
              value={partSearch}
              onChange={e => setPartSearch(e.target.value)}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredParts.map(part => (
                <Card
                  key={part.id}
                  className="cursor-pointer p-3 transition-all hover:shadow-md"
                  onClick={() => handleAddPart(part)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{part.name}</h4>
                      <p className="text-xs text-gray-500">{part.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-kgc-primary">
                        {part.unitPrice.toLocaleString()} Ft
                      </p>
                      <p className="text-xs text-gray-400">Készlet: {part.inStock} db</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'labor' && (
          <div className="space-y-4">
            <Input
              placeholder="Keresés norma kód vagy leírás alapján..."
              value={laborSearch}
              onChange={e => setLaborSearch(e.target.value)}
            />
            <div className="grid gap-2">
              {filteredNorms.map(norm => (
                <Card
                  key={norm.id}
                  className="cursor-pointer p-3 transition-all hover:shadow-md"
                  onClick={() => handleAddLabor(norm)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {norm.code}
                        </span>
                        <h4 className="font-medium text-gray-900">{norm.description}</h4>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{norm.minutes} perc</p>
                    </div>
                    <p className="font-medium text-kgc-primary">
                      {norm.calculatedPrice.toLocaleString()} Ft
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'custom' && (
          <Card className="p-4">
            <h4 className="mb-4 font-medium text-gray-900">Egyéb tétel hozzáadása</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Megnevezés</label>
                <Input
                  placeholder="pl. Kiszállási díj"
                  value={customDesc}
                  onChange={e => setCustomDesc(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Egységár (Ft)
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={customPrice}
                  onChange={e => setCustomPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Mennyiség</label>
                <Input
                  type="number"
                  min="1"
                  value={customQty}
                  onChange={e => setCustomQty(e.target.value)}
                />
              </div>
              <div className="flex items-end sm:col-span-2">
                <Button
                  onClick={handleAddCustom}
                  disabled={!customDesc || !customPrice}
                  className="w-full sm:w-auto"
                >
                  Hozzáadás
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Added items list */}
      {items.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Hozzáadott tételek ({items.length})</h3>
          <div className="divide-y rounded-lg border">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-xs font-medium',
                        item.type === 'ALKATRESZ' && 'bg-blue-100 text-blue-800',
                        item.type === 'MUNKADIJ' && 'bg-purple-100 text-purple-800',
                        item.type === 'EGYEB' && 'bg-gray-100 text-gray-800'
                      )}
                    >
                      {item.type === 'ALKATRESZ' && 'Alkatrész'}
                      {item.type === 'MUNKADIJ' && 'Munkadíj'}
                      {item.type === 'EGYEB' && 'Egyéb'}
                    </span>
                    <span className="font-medium text-gray-900">{item.description}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {item.unitPrice.toLocaleString()} Ft × {item.quantity} db
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateItemQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="flex h-6 w-6 items-center justify-center rounded border hover:bg-gray-100"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                      className="flex h-6 w-6 items-center justify-center rounded border hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                  <p className="w-24 text-right font-medium text-gray-900">
                    {item.grossAmount.toLocaleString()} Ft
                  </p>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Nettó összesen:</span>
              <span className="font-medium">{totals.netTotal.toLocaleString()} Ft</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ÁFA (27%):</span>
              <span className="font-medium">{totals.vatTotal.toLocaleString()} Ft</span>
            </div>
            <div className="mt-2 flex justify-between border-t pt-2">
              <span className="font-medium text-gray-900">Bruttó összesen:</span>
              <span className="text-lg font-bold text-kgc-primary">
                {totals.grossTotal.toLocaleString()} Ft
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
