import { Button, Card, CardContent, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { MOCK_PARTNERS } from '../mock-data';
import type { Partner } from '../types';
import { useWizardStore } from '../wizard-store';

export function PartnerStep() {
  const { partner: selectedPartner, setPartner } = useWizardStore();
  const [search, setSearch] = useState('');

  const filteredPartners = useMemo(() => {
    if (!search.trim()) return MOCK_PARTNERS;

    const q = search.toLowerCase();
    return MOCK_PARTNERS.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.taxNumber?.includes(q)
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Partner kiválasztása</h2>
        <p className="mt-1 text-sm text-gray-500">Keresse meg vagy válassza ki a bérlő partnert</p>
      </div>

      {/* Search */}
      <Input
        placeholder="Keresés név, email, telefon vagy adószám alapján..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-md"
      />

      {/* Partner list */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPartners.map(partner => (
          <PartnerCard
            key={partner.id}
            partner={partner}
            isSelected={selectedPartner?.id === partner.id}
            onSelect={() => setPartner(partner)}
          />
        ))}
      </div>

      {filteredPartners.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
          <p className="text-gray-500">Nincs találat a keresésre</p>
          <Button variant="link" className="mt-2">
            + Új partner létrehozása
          </Button>
        </div>
      )}

      {/* Selected partner summary */}
      {selectedPartner && (
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            Kiválasztott partner: <span className="font-bold">{selectedPartner.name}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function PartnerCard({
  partner,
  isSelected,
  onSelect,
}: {
  partner: Partner;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-kgc-primary bg-kgc-primary/5'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium text-gray-900">{partner.name}</h3>
              {partner.isVip && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  VIP
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {partner.type === 'COMPANY' ? 'Cég' : 'Magánszemély'}
            </p>
          </div>
          {isSelected && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-kgc-primary text-white">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="mt-3 space-y-1 text-sm text-gray-600">
          {partner.phone && (
            <p className="flex items-center gap-2">
              <span className="text-gray-400">📞</span>
              {partner.phone}
            </p>
          )}
          {partner.email && (
            <p className="flex items-center gap-2 truncate">
              <span className="text-gray-400">✉️</span>
              {partner.email}
            </p>
          )}
          {partner.taxNumber && (
            <p className="flex items-center gap-2">
              <span className="text-gray-400">🏢</span>
              {partner.taxNumber}
            </p>
          )}
        </div>

        {partner.balance !== 0 && (
          <div
            className={cn(
              'mt-3 text-sm font-medium',
              partner.balance < 0 ? 'text-red-600' : 'text-green-600'
            )}
          >
            Egyenleg: {partner.balance < 0 ? '-' : '+'}
            {Math.abs(partner.balance).toLocaleString('hu-HU')} Ft
          </div>
        )}
      </CardContent>
    </Card>
  );
}
