import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { formatCurrency } from '../mock-data';
import { CATEGORY_LABELS, CONDITION_LABELS, PricingTier } from '../types';
import { useWizardStore } from '../wizard-store';

const TIER_LABELS: Record<PricingTier, string> = {
  [PricingTier.DAILY]: 'Napi díjazás',
  [PricingTier.WEEKLY]: 'Heti díjazás',
  [PricingTier.MONTHLY]: 'Havi díjazás',
};

export function SummaryStep() {
  const { partner, equipment, startDate, endDate, pricing, notes } = useWizardStore();

  const formatDate = (date: Date | null): string => {
    if (!date) return '-';
    return date.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Összegzés</h2>
        <p className="mt-1 text-sm text-gray-500">Ellenőrizze a bérlés adatait és hagyja jóvá</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Partner */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-kgc-primary text-xs text-white">
                  1
                </span>
                Partner adatai
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Név</span>
                  <span className="font-medium text-gray-900">{partner?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Típus</span>
                  <span className="text-gray-900">
                    {partner?.type === 'COMPANY' ? 'Cég' : 'Magánszemély'}
                  </span>
                </div>
                {partner?.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Telefon</span>
                    <span className="text-gray-900">{partner.phone}</span>
                  </div>
                )}
                {partner?.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="text-gray-900">{partner.email}</span>
                  </div>
                )}
                {partner?.taxNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Adószám</span>
                    <span className="text-gray-900">{partner.taxNumber}</span>
                  </div>
                )}
                {partner?.isVip && (
                  <div className="mt-2">
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                      ⭐ VIP Partner
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Equipment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-kgc-primary text-xs text-white">
                  2
                </span>
                Bérgép adatai
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Megnevezés</span>
                  <span className="font-medium text-gray-900">{equipment?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sorozatszám</span>
                  <span className="text-gray-900">{equipment?.serialNumber}</span>
                </div>
                {equipment?.brand && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Márka / Modell</span>
                    <span className="text-gray-900">
                      {equipment.brand} {equipment.model}
                    </span>
                  </div>
                )}
                {equipment && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Kategória</span>
                      <span className="text-gray-900">{CATEGORY_LABELS[equipment.category]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Állapot</span>
                      <span className="text-gray-900">{CONDITION_LABELS[equipment.condition]}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-kgc-primary text-xs text-white">
                  3
                </span>
                Bérlési időszak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Kezdő dátum</span>
                  <span className="text-gray-900">{formatDate(startDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Visszahozatal</span>
                  <span className="text-gray-900">{formatDate(endDate)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-gray-500">Időtartam</span>
                  <span className="text-kgc-primary">{pricing?.durationDays} nap</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Megjegyzés</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Pricing summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Fizetési összesítő</CardTitle>
            </CardHeader>
            <CardContent>
              {pricing && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Díjazás típusa</span>
                      <span className="text-gray-900">
                        {TIER_LABELS[pricing.tier as PricingTier]}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Nettó bérleti díj</span>
                      <span className="text-gray-900">{formatCurrency(pricing.netAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ÁFA (27%)</span>
                      <span className="text-gray-900">{formatCurrency(pricing.vatAmount)}</span>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">Bérleti díj bruttó</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(pricing.totalAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between text-amber-600">
                    <span className="font-medium">Kaució</span>
                    <span className="font-medium">{formatCurrency(pricing.depositAmount)}</span>
                  </div>

                  <hr className="border-gray-200" />

                  <div className="rounded-lg bg-kgc-primary p-4 text-white">
                    <div className="flex justify-between">
                      <span className="font-semibold">FIZETENDŐ ÖSSZESEN</span>
                      <span className="text-2xl font-bold">
                        {formatCurrency(pricing.totalAmount + pricing.depositAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Payment info */}
                  <div className="rounded-lg bg-gray-50 p-4 text-sm">
                    <p className="font-medium text-gray-700">Fizetési lehetőségek:</p>
                    <ul className="mt-2 space-y-1 text-gray-600">
                      <li className="flex items-center gap-2">
                        <span>💵</span> Készpénz
                      </li>
                      <li className="flex items-center gap-2">
                        <span>💳</span> Bankkártya (MyPOS)
                      </li>
                      <li className="flex items-center gap-2">
                        <span>🏦</span> Átutalás (cég esetén)
                      </li>
                    </ul>
                  </div>

                  {/* Disclaimer */}
                  <p className="text-xs text-gray-500">
                    A bérlés véglegesítésével a partner elfogadja a bérleti szerződés feltételeit. A
                    kaució a gép sértetlen visszahozatala után visszajár.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
