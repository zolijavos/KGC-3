import { Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useEffect, useState } from 'react';
import { formatCurrency } from '../mock-data';
import { CATEGORY_LABELS, PricingTier } from '../types';
import { useWizardStore } from '../wizard-store';

const TIER_LABELS: Record<PricingTier, string> = {
  [PricingTier.DAILY]: 'Napi díjazás',
  [PricingTier.WEEKLY]: 'Heti díjazás',
  [PricingTier.MONTHLY]: 'Havi díjazás',
};

export function DetailsStep() {
  const { partner, equipment, startDate, endDate, pricing, setDates, notes, setNotes } =
    useWizardStore();

  // Format date for input
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0] ?? '';
  };

  // Initialize dates if not set
  const [localStartDate, setLocalStartDate] = useState(() => {
    if (startDate) return formatDateForInput(startDate);
    const today = new Date();
    return formatDateForInput(today);
  });

  const [localEndDate, setLocalEndDate] = useState(() => {
    if (endDate) return formatDateForInput(endDate);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateForInput(tomorrow);
  });

  // Update store when dates change
  useEffect(() => {
    if (localStartDate && localEndDate) {
      const start = new Date(localStartDate);
      const end = new Date(localEndDate);
      if (start <= end) {
        setDates(start, end);
      }
    }
  }, [localStartDate, localEndDate, setDates]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Bérlés részletei</h2>
        <p className="mt-1 text-sm text-gray-500">
          Adja meg a bérlési időszakot és ellenőrizze az árakat
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column - Dates & Notes */}
        <div className="space-y-6">
          {/* Selected items summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kiválasztott tételek</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Partner</p>
                  <p className="text-sm text-gray-600">{partner?.name}</p>
                </div>
                <span className="text-xs text-gray-400">✓</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Bérgép</p>
                  <p className="text-sm text-gray-600">{equipment?.name}</p>
                  <p className="text-xs text-gray-400">
                    {equipment?.brand} {equipment?.model} •{' '}
                    {equipment && CATEGORY_LABELS[equipment.category]}
                  </p>
                </div>
                <span className="text-xs text-gray-400">✓</span>
              </div>
            </CardContent>
          </Card>

          {/* Date selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bérlési időszak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  type="date"
                  label="Kezdő dátum"
                  value={localStartDate}
                  onChange={e => setLocalStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <Input
                  type="date"
                  label="Visszahozatal dátuma"
                  value={localEndDate}
                  onChange={e => setLocalEndDate(e.target.value)}
                  min={localStartDate}
                />
              </div>

              {pricing && (
                <div className="rounded-lg bg-blue-50 p-3 text-sm">
                  <p className="font-medium text-blue-800">
                    {pricing.durationDays} nap • {TIER_LABELS[pricing.tier as PricingTier]}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Megjegyzés</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-kgc-primary focus:outline-none focus:ring-2 focus:ring-kgc-primary/20"
                rows={3}
                placeholder="Opcionális megjegyzés a bérléshez..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right column - Pricing */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Árkalkuláció</CardTitle>
            </CardHeader>
            <CardContent>
              {pricing ? (
                <div className="space-y-4">
                  {/* Base pricing */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Napi díj</span>
                      <span className="text-gray-900">{formatCurrency(pricing.dailyRate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Időtartam</span>
                      <span className="text-gray-900">{pricing.durationDays} nap</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Díjazás típusa</span>
                      <span className="text-gray-900">
                        {TIER_LABELS[pricing.tier as PricingTier]}
                      </span>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  {/* Amounts */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bruttó összeg</span>
                      <span className="text-gray-900">{formatCurrency(pricing.grossAmount)}</span>
                    </div>
                    {pricing.discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Kedvezmény</span>
                        <span>-{formatCurrency(pricing.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Nettó összeg</span>
                      <span className="text-gray-900">{formatCurrency(pricing.netAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        ÁFA ({(pricing.vatRate * 100).toFixed(0)}%)
                      </span>
                      <span className="text-gray-900">{formatCurrency(pricing.vatAmount)}</span>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-900">Bérleti díj összesen</span>
                      <span className="text-lg text-kgc-primary">
                        {formatCurrency(pricing.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-600">Kaució</span>
                      <span className="font-medium text-amber-600">
                        {formatCurrency(pricing.depositAmount)}
                      </span>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  {/* Grand total */}
                  <div className="rounded-lg bg-kgc-primary/5 p-4">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Fizetendő most</span>
                      <span className="text-xl font-bold text-kgc-primary">
                        {formatCurrency(pricing.totalAmount + pricing.depositAmount)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      (Bérleti díj: {formatCurrency(pricing.totalAmount)} + Kaució:{' '}
                      {formatCurrency(pricing.depositAmount)})
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <p>Válassza ki a dátumokat az árkalkulációhoz</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
