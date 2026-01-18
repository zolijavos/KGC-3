// SummaryStep - Final summary and completion date
import { Card, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { isUnderWarranty } from '../mock-data';
import { CATEGORY_LABELS, PRIORITY_LABELS, TYPE_LABELS } from '../types';
import { useWorksheetWizardStore } from '../wizard-store';

export function SummaryStep() {
  const {
    partner,
    product,
    deviceName,
    serialNumber,
    worksheetType,
    priority,
    faultDescription,
    costLimit,
    diagnosis,
    workPerformed,
    items,
    totals,
    estimatedCompletionDate,
    internalNote,
    setSummaryInfo,
  } = useWorksheetWizardStore();

  const underWarranty = product ? isUnderWarranty(product) : false;

  const handleDateChange = (value: string) => {
    const date = value ? new Date(value) : null;
    setSummaryInfo(date, internalNote);
  };

  const handleNoteChange = (value: string) => {
    setSummaryInfo(estimatedCompletionDate, value);
  };

  // Format date for input
  const dateInputValue = estimatedCompletionDate
    ? estimatedCompletionDate.toISOString().split('T')[0]
    : '';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Összegzés</h2>
        <p className="mt-1 text-sm text-gray-500">
          Ellenőrizze az adatokat és véglegesítse a munkalapot.
        </p>
      </div>

      {/* Partner summary */}
      <Card className="p-4">
        <h3 className="mb-3 font-medium text-gray-900">Partner</h3>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Név:</span>
            <span className="font-medium">{partner?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email:</span>
            <span>{partner?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Telefon:</span>
            <span>{partner?.phone}</span>
          </div>
        </div>
      </Card>

      {/* Product summary */}
      <Card className="p-4">
        <h3 className="mb-3 font-medium text-gray-900">Gép</h3>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Megnevezés:</span>
            <span className="font-medium">{product?.name ?? deviceName}</span>
          </div>
          {(product?.serialNumber ?? serialNumber) && (
            <div className="flex justify-between">
              <span className="text-gray-500">Gyári szám:</span>
              <span>{product?.serialNumber ?? serialNumber}</span>
            </div>
          )}
          {product && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Kategória:</span>
                <span>{CATEGORY_LABELS[product.category]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Garancia:</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    underWarranty ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {underWarranty ? 'Aktív' : 'Lejárt/Nincs'}
                </span>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Problem summary */}
      <Card className="p-4">
        <h3 className="mb-3 font-medium text-gray-900">Hibabejelentés</h3>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Típus:</span>
            <span className="font-medium">{TYPE_LABELS[worksheetType]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Prioritás:</span>
            <span
              className={cn(
                'font-medium',
                priority === 'SURGOS' && 'text-red-600',
                priority === 'GARANCIALIS' && 'text-green-600'
              )}
            >
              {PRIORITY_LABELS[priority]}
            </span>
          </div>
          {costLimit && (
            <div className="flex justify-between">
              <span className="text-gray-500">Költséghatár:</span>
              <span>{costLimit.toLocaleString()} Ft</span>
            </div>
          )}
          <div className="mt-2">
            <span className="text-gray-500">Hiba leírása:</span>
            <p className="mt-1 rounded bg-gray-50 p-2 text-gray-700">{faultDescription}</p>
          </div>
        </div>
      </Card>

      {/* Diagnostics summary */}
      <Card className="p-4">
        <h3 className="mb-3 font-medium text-gray-900">Diagnosztika</h3>
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-gray-500">Megállapítás:</span>
            <p className="mt-1 rounded bg-gray-50 p-2 text-gray-700">{diagnosis}</p>
          </div>
          {workPerformed && (
            <div>
              <span className="text-gray-500">Elvégzett munka:</span>
              <p className="mt-1 rounded bg-gray-50 p-2 text-gray-700">{workPerformed}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Items summary */}
      <Card className="p-4">
        <h3 className="mb-3 font-medium text-gray-900">Tételek ({items.length} tétel)</h3>
        {items.length > 0 ? (
          <>
            <div className="divide-y text-sm">
              {items.map(item => (
                <div key={item.id} className="flex justify-between py-2">
                  <div>
                    <span
                      className={cn(
                        'mr-2 rounded px-1.5 py-0.5 text-xs',
                        item.type === 'ALKATRESZ' && 'bg-blue-100 text-blue-700',
                        item.type === 'MUNKADIJ' && 'bg-purple-100 text-purple-700',
                        item.type === 'EGYEB' && 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {item.type === 'ALKATRESZ' && 'A'}
                      {item.type === 'MUNKADIJ' && 'M'}
                      {item.type === 'EGYEB' && 'E'}
                    </span>
                    {item.description}
                    <span className="ml-2 text-gray-400">× {item.quantity}</span>
                  </div>
                  <span className="font-medium">{item.grossAmount.toLocaleString()} Ft</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Nettó:</span>
                <span>{totals.netTotal.toLocaleString()} Ft</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ÁFA (27%):</span>
                <span>{totals.vatTotal.toLocaleString()} Ft</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Bruttó összesen:</span>
                <span className="text-kgc-primary">{totals.grossTotal.toLocaleString()} Ft</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-500">Nincs hozzáadott tétel.</p>
        )}
      </Card>

      {/* Completion date and notes */}
      <Card className="p-4">
        <h3 className="mb-3 font-medium text-gray-900">Befejezés</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Várható elkészülés
            </label>
            <Input
              type="date"
              value={dateInputValue}
              onChange={e => handleDateChange(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Belső megjegyzés</label>
            <textarea
              placeholder="Csak a szerviz munkatársak számára látható..."
              value={internalNote}
              onChange={e => handleNoteChange(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary"
            />
          </div>
        </div>
      </Card>

      {/* Cost limit warning */}
      {costLimit && totals.grossTotal > costLimit && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium text-amber-800">Figyelmeztetés!</span>
          </div>
          <p className="mt-1 text-sm text-amber-700">
            A munkalap összege ({totals.grossTotal.toLocaleString()} Ft) meghaladja a megadott
            költséghatárt ({costLimit.toLocaleString()} Ft). Egyeztetés szükséges az ügyféllel!
          </p>
        </div>
      )}

      {/* Ready indicator */}
      <div className="rounded-lg bg-green-50 p-4">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium text-green-800">A munkalap készen áll a létrehozásra</span>
        </div>
      </div>
    </div>
  );
}
