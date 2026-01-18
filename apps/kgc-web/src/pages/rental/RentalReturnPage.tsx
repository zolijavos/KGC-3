import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MOCK_ACTIVE_RENTALS, formatCurrency } from './mock-data';
import type { Rental } from './types';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  EquipmentCondition,
  RENTAL_STATUS_LABELS,
  RentalStatus,
} from './types';

type ReturnStep = 'select' | 'inspect' | 'payment' | 'confirm';

interface ReturnData {
  rental: Rental | null;
  returnCondition: EquipmentCondition;
  damageDescription: string;
  damageCharge: number;
  lateFee: number;
  depositRefund: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  notes: string;
}

export function RentalReturnPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('id');

  const [step, setStep] = useState<ReturnStep>(preselectedId ? 'inspect' : 'select');
  const [searchTerm, setSearchTerm] = useState('');
  const [returnData, setReturnData] = useState<ReturnData>(() => {
    const preselected = preselectedId
      ? MOCK_ACTIVE_RENTALS.find(r => r.id === preselectedId)
      : null;
    return {
      rental: preselected ?? null,
      returnCondition: preselected?.equipment.condition ?? EquipmentCondition.GOOD,
      damageDescription: '',
      damageCharge: 0,
      lateFee: preselected?.lateFee ?? 0,
      depositRefund: preselected ? preselected.depositPaid : 0,
      paymentMethod: 'cash',
      notes: '',
    };
  });

  // Filter active rentals
  const activeRentals = useMemo(() => {
    return MOCK_ACTIVE_RENTALS.filter(
      r => r.status === RentalStatus.ACTIVE || r.status === RentalStatus.OVERDUE
    ).filter(r => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        r.contractNumber.toLowerCase().includes(search) ||
        r.partner.name.toLowerCase().includes(search) ||
        r.equipment.name.toLowerCase().includes(search) ||
        r.equipment.serialNumber.toLowerCase().includes(search)
      );
    });
  }, [searchTerm]);

  const selectRental = (rental: Rental) => {
    setReturnData({
      ...returnData,
      rental,
      returnCondition: rental.equipment.condition,
      lateFee: rental.lateFee,
      depositRefund: rental.depositPaid - rental.lateFee,
    });
    setStep('inspect');
  };

  const updateReturnData = <K extends keyof ReturnData>(field: K, value: ReturnData[K]) => {
    const newData = { ...returnData, [field]: value };

    // Recalculate deposit refund when damage or condition changes
    if (field === 'damageCharge' || field === 'returnCondition') {
      const damage = field === 'damageCharge' ? (value as number) : returnData.damageCharge;
      const late = returnData.rental?.lateFee ?? 0;
      const deposit = returnData.rental?.depositPaid ?? 0;
      newData.depositRefund = Math.max(0, deposit - damage - late);
    }

    setReturnData(newData);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('hu-HU');
  };

  const getDaysOverdue = (rental: Rental) => {
    const endDate = new Date(rental.endDate);
    const today = new Date();
    const diffTime = today.getTime() - endDate.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const handleComplete = () => {
    if (!returnData.rental) return;

    alert(
      `Visszavétel sikeres!\n\n` +
        `Szerződés: ${returnData.rental.contractNumber}\n` +
        `Gép: ${returnData.rental.equipment.name}\n` +
        `Állapot: ${CONDITION_LABELS[returnData.returnCondition]}\n` +
        `Kaució visszajár: ${formatCurrency(returnData.depositRefund)}`
    );
    navigate('/rental');
  };

  const getStatusColor = (status: RentalStatus) => {
    switch (status) {
      case RentalStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case RentalStatus.OVERDUE:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/rental')}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bérlés visszavétel</h1>
              <p className="text-sm text-gray-500">
                {step === 'select' && 'Válassza ki a visszaveendő bérlést'}
                {step === 'inspect' && 'Gép állapot ellenőrzése'}
                {step === 'payment' && 'Fizetési elszámolás'}
                {step === 'confirm' && 'Visszavétel megerősítése'}
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {['select', 'inspect', 'payment', 'confirm'].map((s, i) => (
              <div
                key={s}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step === s
                    ? 'bg-kgc-primary text-white'
                    : ['select', 'inspect', 'payment', 'confirm'].indexOf(step) > i
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Step 1: Select rental */}
        {step === 'select' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Aktív bérlések ({activeRentals.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Keresés szerződésszám, partner vagy gép alapján..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="mb-4"
                />

                <div className="space-y-3">
                  {activeRentals.map(rental => (
                    <div
                      key={rental.id}
                      onClick={() => selectRental(rental)}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors hover:border-kgc-primary hover:bg-kgc-primary/5 ${
                        rental.status === RentalStatus.OVERDUE ? 'border-red-200 bg-red-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-kgc-primary">
                              {rental.contractNumber}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(rental.status)}`}
                            >
                              {RENTAL_STATUS_LABELS[rental.status]}
                            </span>
                            {rental.status === RentalStatus.OVERDUE && (
                              <span className="text-xs text-red-600 font-medium">
                                {getDaysOverdue(rental)} nap késés
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-gray-900">{rental.equipment.name}</p>
                          <p className="text-sm text-gray-500">
                            {rental.equipment.serialNumber} •{' '}
                            {CATEGORY_LABELS[rental.equipment.category]}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Partner: <span className="font-medium">{rental.partner.name}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {formatDate(rental.startDate)} - {formatDate(rental.endDate)}
                          </p>
                          <p className="font-medium text-gray-900">
                            Kaució: {formatCurrency(rental.depositPaid)}
                          </p>
                          {rental.lateFee > 0 && (
                            <p className="text-sm text-red-600 font-medium">
                              Késedelmi díj: {formatCurrency(rental.lateFee)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {activeRentals.length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                      Nincs aktív bérlés a keresési feltételeknek megfelelően.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Inspect equipment */}
        {step === 'inspect' && returnData.rental && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Equipment info */}
              <Card>
                <CardHeader>
                  <CardTitle>Visszaveendő gép</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100 text-3xl">
                      🔧
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-gray-900">
                        {returnData.rental.equipment.name}
                      </p>
                      <p className="text-gray-600">
                        {returnData.rental.equipment.brand} {returnData.rental.equipment.model}
                      </p>
                      <p className="text-sm text-gray-500">
                        Sorozatszám: {returnData.rental.equipment.serialNumber}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Kiadáskori állapot:{' '}
                        <span className="font-medium">
                          {CONDITION_LABELS[returnData.rental.equipment.condition]}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Condition check */}
              <Card>
                <CardHeader>
                  <CardTitle>Állapot felmérés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Visszavételi állapot *
                      </label>
                      <div className="flex gap-3">
                        {Object.values(EquipmentCondition).map(value => (
                          <button
                            key={value}
                            onClick={() => updateReturnData('returnCondition', value)}
                            className={`flex-1 rounded-lg border-2 p-3 text-center transition-colors ${
                              returnData.returnCondition === value
                                ? 'border-kgc-primary bg-kgc-primary/10 text-kgc-primary'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <p className="font-medium">{CONDITION_LABELS[value]}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Sérülés leírása (ha van)
                      </label>
                      <textarea
                        value={returnData.damageDescription}
                        onChange={e => updateReturnData('damageDescription', e.target.value)}
                        className="w-full rounded-md border p-3"
                        rows={3}
                        placeholder="Írja le az észlelt sérüléseket, hiányosságokat..."
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Kártérítés összege (Ft)
                      </label>
                      <Input
                        type="number"
                        value={returnData.damageCharge || ''}
                        onChange={e =>
                          updateReturnData('damageCharge', Number(e.target.value) || 0)
                        }
                        placeholder="0"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        A kaució összegéből kerül levonásra
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bérlési adatok</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Szerződés:</span>
                      <span className="font-medium">{returnData.rental.contractNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Partner:</span>
                      <span className="font-medium">{returnData.rental.partner.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Időszak:</span>
                      <span className="font-medium">
                        {formatDate(returnData.rental.startDate)} -{' '}
                        {formatDate(returnData.rental.endDate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bérleti díj:</span>
                      <span className="font-medium">
                        {formatCurrency(returnData.rental.pricing.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Kaució befizetve:</span>
                      <span className="font-medium">
                        {formatCurrency(returnData.rental.depositPaid)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
                  Vissza
                </Button>
                <Button
                  onClick={() => setStep('payment')}
                  className="flex-1 bg-kgc-primary hover:bg-kgc-primary/90"
                >
                  Tovább
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 'payment' && returnData.rental && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pénzügyi elszámolás</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Charges */}
                    <div className="rounded-lg border p-4 space-y-3">
                      <h4 className="font-medium">Levonások</h4>
                      {returnData.rental.lateFee > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Késedelmi díj ({getDaysOverdue(returnData.rental)} nap)</span>
                          <span className="font-medium">
                            -{formatCurrency(returnData.rental.lateFee)}
                          </span>
                        </div>
                      )}
                      {returnData.damageCharge > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Kártérítés</span>
                          <span className="font-medium">
                            -{formatCurrency(returnData.damageCharge)}
                          </span>
                        </div>
                      )}
                      {returnData.rental.lateFee === 0 && returnData.damageCharge === 0 && (
                        <p className="text-gray-500">Nincs levonás</p>
                      )}
                    </div>

                    {/* Summary */}
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Kaució befizetve:</span>
                          <span className="font-medium">
                            {formatCurrency(returnData.rental.depositPaid)}
                          </span>
                        </div>
                        {(returnData.rental.lateFee > 0 || returnData.damageCharge > 0) && (
                          <div className="flex justify-between text-red-600">
                            <span>Levonások összesen:</span>
                            <span className="font-medium">
                              -{formatCurrency(returnData.rental.lateFee + returnData.damageCharge)}
                            </span>
                          </div>
                        )}
                        <div className="border-t pt-2 flex justify-between text-lg font-bold text-green-700">
                          <span>Visszajáró kaució:</span>
                          <span>{formatCurrency(returnData.depositRefund)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment method */}
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Kaució visszafizetés módja
                      </label>
                      <div className="flex gap-3">
                        {[
                          { value: 'cash', label: '💵 Készpénz' },
                          { value: 'card', label: '💳 Kártya' },
                          { value: 'transfer', label: '🏦 Átutalás' },
                        ].map(method => (
                          <button
                            key={method.value}
                            onClick={() =>
                              updateReturnData(
                                'paymentMethod',
                                method.value as 'cash' | 'card' | 'transfer'
                              )
                            }
                            className={`flex-1 rounded-lg border-2 p-3 text-center transition-colors ${
                              returnData.paymentMethod === method.value
                                ? 'border-kgc-primary bg-kgc-primary/10'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {method.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="mb-2 block text-sm font-medium">Megjegyzés</label>
                      <textarea
                        value={returnData.notes}
                        onChange={e => updateReturnData('notes', e.target.value)}
                        className="w-full rounded-md border p-3"
                        rows={2}
                        placeholder="Opcionális megjegyzés..."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Összesítés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gép:</span>
                      <span className="font-medium">{returnData.rental.equipment.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Visszavételi állapot:</span>
                      <span className="font-medium">
                        {CONDITION_LABELS[returnData.returnCondition]}
                      </span>
                    </div>
                    {returnData.damageDescription && (
                      <div>
                        <span className="text-gray-500">Sérülés:</span>
                        <p className="text-sm text-red-600">{returnData.damageDescription}</p>
                      </div>
                    )}
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-bold text-green-700">
                        <span>Visszajáró:</span>
                        <span>{formatCurrency(returnData.depositRefund)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('inspect')} className="flex-1">
                  Vissza
                </Button>
                <Button
                  onClick={() => setStep('confirm')}
                  className="flex-1 bg-kgc-primary hover:bg-kgc-primary/90"
                >
                  Tovább
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && returnData.rental && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Visszavétel megerősítése</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="rounded-lg bg-gray-50 p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Szerződés:</span>
                      <span className="font-bold">{returnData.rental.contractNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Partner:</span>
                      <span className="font-medium">{returnData.rental.partner.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gép:</span>
                      <span className="font-medium">{returnData.rental.equipment.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Visszavételi állapot:</span>
                      <span className="font-medium">
                        {CONDITION_LABELS[returnData.returnCondition]}
                      </span>
                    </div>
                  </div>

                  {/* Financial summary */}
                  <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                    <div className="text-center">
                      <p className="text-gray-600">Visszajáró kaució</p>
                      <p className="text-3xl font-bold text-green-700">
                        {formatCurrency(returnData.depositRefund)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {returnData.paymentMethod === 'cash' && '💵 Készpénzben'}
                        {returnData.paymentMethod === 'card' && '💳 Kártyára'}
                        {returnData.paymentMethod === 'transfer' && '🏦 Átutalással'}
                      </p>
                    </div>
                  </div>

                  {/* Warnings */}
                  {(returnData.rental.lateFee > 0 || returnData.damageCharge > 0) && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                      <p className="font-medium text-orange-800 mb-2">Levonások:</p>
                      {returnData.rental.lateFee > 0 && (
                        <p className="text-sm text-orange-700">
                          • Késedelmi díj: {formatCurrency(returnData.rental.lateFee)}
                        </p>
                      )}
                      {returnData.damageCharge > 0 && (
                        <p className="text-sm text-orange-700">
                          • Kártérítés: {formatCurrency(returnData.damageCharge)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('payment')} className="flex-1">
                      Vissza
                    </Button>
                    <Button
                      onClick={handleComplete}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      ✓ Visszavétel véglegesítése
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
