// ProblemStep - Problem description and worksheet type selection
import { Card, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { isUnderWarranty } from '../mock-data';
import { PRIORITY_LABELS, TYPE_LABELS, WorksheetPriority, WorksheetType } from '../types';
import { useWorksheetWizardStore } from '../wizard-store';

export function ProblemStep() {
  const { product, worksheetType, priority, faultDescription, costLimit, setProblemInfo } =
    useWorksheetWizardStore();

  const underWarranty = product ? isUnderWarranty(product) : false;

  const handleTypeChange = (type: WorksheetType) => {
    // Auto-set priority for warranty
    const newPriority =
      type === WorksheetType.GARANCIALIS
        ? WorksheetPriority.GARANCIALIS
        : priority === WorksheetPriority.GARANCIALIS
          ? WorksheetPriority.NORMAL
          : priority;
    setProblemInfo(type, newPriority, faultDescription, costLimit);
  };

  const handlePriorityChange = (newPriority: WorksheetPriority) => {
    setProblemInfo(worksheetType, newPriority, faultDescription, costLimit);
  };

  const handleDescriptionChange = (desc: string) => {
    setProblemInfo(worksheetType, priority, desc, costLimit);
  };

  const handleCostLimitChange = (value: string) => {
    const limit = value ? parseInt(value, 10) : null;
    setProblemInfo(worksheetType, priority, faultDescription, limit);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Hibabejelentés</h2>
        <p className="mt-1 text-sm text-gray-500">
          Adja meg a hiba leírását és válassza ki a munkalap típusát.
        </p>
      </div>

      {/* Warranty notice */}
      {underWarranty && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium text-green-800">A gép garanciális időszakban van!</span>
          </div>
          <p className="mt-1 text-sm text-green-700">
            Garancia lejárat: {product?.warrantyExpiry?.toLocaleDateString('hu-HU')}
          </p>
        </div>
      )}

      {/* Worksheet Type */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Munkalap típusa</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <Card
              key={value}
              className={cn(
                'cursor-pointer p-3 transition-all hover:shadow-md',
                worksheetType === value && 'ring-2 ring-kgc-primary bg-kgc-primary/5'
              )}
              onClick={() => handleTypeChange(value as WorksheetType)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full border-2',
                    worksheetType === value
                      ? 'border-kgc-primary bg-kgc-primary'
                      : 'border-gray-300'
                  )}
                >
                  {worksheetType === value && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <div>
                  <span className="font-medium text-gray-900">{label}</span>
                  {value === WorksheetType.GARANCIALIS && underWarranty && (
                    <span className="ml-2 text-xs text-green-600">(Ajánlott)</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Prioritás</label>
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => {
            const isWarrantyPriority = value === WorksheetPriority.GARANCIALIS;
            const disabled = isWarrantyPriority && worksheetType !== WorksheetType.GARANCIALIS;

            return (
              <Card
                key={value}
                className={cn(
                  'p-3 transition-all',
                  disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-md',
                  priority === value && !disabled && 'ring-2 ring-kgc-primary bg-kgc-primary/5'
                )}
                onClick={() => !disabled && handlePriorityChange(value as WorksheetPriority)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full border-2',
                      priority === value && !disabled
                        ? 'border-kgc-primary bg-kgc-primary'
                        : 'border-gray-300'
                    )}
                  >
                    {priority === value && !disabled && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'font-medium',
                      value === WorksheetPriority.SURGOS && 'text-red-600',
                      value === WorksheetPriority.NORMAL && 'text-gray-900',
                      value === WorksheetPriority.GARANCIALIS && 'text-green-600'
                    )}
                  >
                    {label}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Fault Description */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Hiba leírása *</label>
        <textarea
          placeholder="Írja le részletesen a hibát, tüneteket, mikor jelentkezett..."
          value={faultDescription}
          onChange={e => handleDescriptionChange(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary"
        />
        <p className="mt-1 text-xs text-gray-400">
          Minél részletesebb a leírás, annál gyorsabb a diagnosztika.
        </p>
      </div>

      {/* Cost Limit (only for paid repairs) */}
      {worksheetType === WorksheetType.FIZETOS && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Költséghatár (opcionális)
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="pl. 50000"
              value={costLimit ?? ''}
              onChange={e => handleCostLimitChange(e.target.value)}
              className="w-48"
            />
            <span className="text-sm text-gray-500">Ft</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Ha a javítás költsége meghaladja ezt az összeget, előzetes egyeztetés szükséges.
          </p>
        </div>
      )}

      {/* Summary */}
      {faultDescription && (
        <div className="rounded-lg bg-blue-50 p-4">
          <h4 className="font-medium text-blue-800">Összefoglaló</h4>
          <ul className="mt-2 space-y-1 text-sm text-blue-700">
            <li>Típus: {TYPE_LABELS[worksheetType]}</li>
            <li>Prioritás: {PRIORITY_LABELS[priority]}</li>
            {costLimit && <li>Költséghatár: {costLimit.toLocaleString()} Ft</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
