import { Button, Card, CardContent, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { MOCK_EQUIPMENT, formatCurrency } from '../mock-data';
import type { Equipment } from '../types';
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  EquipmentCategory,
  EquipmentStatus,
  STATUS_LABELS,
} from '../types';
import { useWizardStore } from '../wizard-store';

export function EquipmentStep() {
  const { equipment: selectedEquipment, setEquipment, partner } = useWizardStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | 'ALL'>('ALL');

  const filteredEquipment = useMemo(() => {
    return MOCK_EQUIPMENT.filter(eq => {
      // Only show available equipment
      if (eq.status !== EquipmentStatus.AVAILABLE) return false;

      // Category filter
      if (categoryFilter !== 'ALL' && eq.category !== categoryFilter) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          eq.name.toLowerCase().includes(q) ||
          eq.serialNumber.toLowerCase().includes(q) ||
          eq.brand?.toLowerCase().includes(q) ||
          eq.model?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [search, categoryFilter]);

  const allEquipmentCount = MOCK_EQUIPMENT.filter(
    eq => eq.status === EquipmentStatus.AVAILABLE
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Bérgép kiválasztása</h2>
        <p className="mt-1 text-sm text-gray-500">
          Partner: <span className="font-medium text-gray-700">{partner?.name}</span> - Válassza ki
          a bérbeadandó gépet
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Input
          placeholder="Keresés név, sorozatszám, márka..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />

        <div className="flex flex-wrap gap-2">
          <Button
            variant={categoryFilter === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter('ALL')}
          >
            Mind ({allEquipmentCount})
          </Button>
          {Object.values(EquipmentCategory).map(cat => {
            const count = MOCK_EQUIPMENT.filter(
              eq => eq.category === cat && eq.status === EquipmentStatus.AVAILABLE
            ).length;
            if (count === 0) return null;
            return (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
              >
                {CATEGORY_LABELS[cat]} ({count})
              </Button>
            );
          })}
        </div>
      </div>

      {/* Equipment grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEquipment.map(equipment => (
          <EquipmentCard
            key={equipment.id}
            equipment={equipment}
            isSelected={selectedEquipment?.id === equipment.id}
            onSelect={() => setEquipment(equipment)}
          />
        ))}
      </div>

      {filteredEquipment.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
          <p className="text-gray-500">Nincs elérhető gép a szűrési feltételeknek megfelelően</p>
        </div>
      )}

      {/* Selected equipment summary */}
      {selectedEquipment && (
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            Kiválasztott gép: <span className="font-bold">{selectedEquipment.name}</span> (
            {selectedEquipment.serialNumber})
          </p>
        </div>
      )}
    </div>
  );
}

function EquipmentCard({
  equipment,
  isSelected,
  onSelect,
}: {
  equipment: Equipment;
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
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                equipment.status === EquipmentStatus.AVAILABLE
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              )}
            >
              {STATUS_LABELS[equipment.status]}
            </span>
            <h3 className="mt-2 font-medium text-gray-900 line-clamp-2">{equipment.name}</h3>
          </div>
          {isSelected && (
            <div className="ml-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-kgc-primary text-white">
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

        {/* Details */}
        <div className="mt-3 space-y-1 text-sm text-gray-600">
          <p>
            <span className="text-gray-400">SN:</span> {equipment.serialNumber}
          </p>
          {equipment.brand && (
            <p>
              <span className="text-gray-400">Márka:</span> {equipment.brand} {equipment.model}
            </p>
          )}
          <p>
            <span className="text-gray-400">Állapot:</span> {CONDITION_LABELS[equipment.condition]}
          </p>
          <p>
            <span className="text-gray-400">Kategória:</span> {CATEGORY_LABELS[equipment.category]}
          </p>
        </div>

        {/* Pricing */}
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="text-gray-500">Napi</p>
              <p className="font-semibold text-gray-900">{formatCurrency(equipment.dailyRate)}</p>
            </div>
            <div>
              <p className="text-gray-500">Heti</p>
              <p className="font-semibold text-gray-900">{formatCurrency(equipment.weeklyRate)}</p>
            </div>
            <div>
              <p className="text-gray-500">Havi</p>
              <p className="font-semibold text-gray-900">{formatCurrency(equipment.monthlyRate)}</p>
            </div>
          </div>
          <div className="mt-2 border-t border-gray-200 pt-2 text-center">
            <p className="text-xs text-gray-500">Kaució</p>
            <p className="font-semibold text-amber-600">
              {formatCurrency(equipment.depositAmount)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
