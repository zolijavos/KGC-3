// PartnerStep - Partner selection for worksheet
import { Card, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { MOCK_PARTNERS } from '../mock-data';
import { useWorksheetWizardStore } from '../wizard-store';

export function PartnerStep() {
  const { partner, setPartner } = useWorksheetWizardStore();
  const [search, setSearch] = useState('');

  const filteredPartners = useMemo(() => {
    if (!search.trim()) return MOCK_PARTNERS;
    const term = search.toLowerCase();
    return MOCK_PARTNERS.filter(
      p =>
        p.name.toLowerCase().includes(term) ||
        (p.email && p.email.toLowerCase().includes(term)) ||
        (p.phone && p.phone.includes(term)) ||
        (p.taxNumber && p.taxNumber.includes(term))
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Partner kiválasztása</h2>
        <p className="mt-1 text-sm text-gray-500">
          Válassza ki az ügyfelet, akinek a gépét szervizelni szeretné.
        </p>
      </div>

      {/* Search */}
      <div>
        <Input
          placeholder="Keresés név, email, telefon vagy adószám alapján..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Partner list */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filteredPartners.map(p => (
          <Card
            key={p.id}
            className={cn(
              'cursor-pointer p-4 transition-all hover:shadow-md',
              partner?.id === p.id && 'ring-2 ring-kgc-primary bg-kgc-primary/5'
            )}
            onClick={() => setPartner(p)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{p.name}</h3>
                {p.email && <p className="mt-1 text-sm text-gray-500">{p.email}</p>}
                {p.phone && <p className="text-sm text-gray-500">{p.phone}</p>}
                {p.taxNumber && (
                  <p className="mt-1 text-xs text-gray-400">Adószám: {p.taxNumber}</p>
                )}
              </div>
              {partner?.id === p.id && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-kgc-primary text-white">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredPartners.length === 0 && (
        <div className="py-8 text-center text-gray-500">Nincs találat a keresési feltételekre.</div>
      )}

      {/* Selected partner summary */}
      {partner && (
        <div className="rounded-lg bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium text-green-800">Kiválasztott partner: {partner.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}
