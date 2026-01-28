import { Button, Card, Input } from '@/components/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_MOVEMENTS, MOVEMENT_LABELS } from './mock-data';
import { MovementType } from './types';

export function InventoryMovementsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<MovementType | ''>('');

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('hu-HU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredMovements = MOCK_MOVEMENTS.filter(mov => {
    const matchesSearch =
      searchTerm === '' ||
      mov.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.itemSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mov.reference && mov.reference.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = !typeFilter || mov.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/inventory')}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Készletmozgások</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Bevételezések, kiadások, korrekciók
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <Input
            type="text"
            placeholder="Keresés (termék, cikkszám, hivatkozás)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as MovementType | '')}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
          >
            <option value="">Minden típus</option>
            {Object.entries(MOVEMENT_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Movements list */}
        <Card>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredMovements.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">Nincs találat</div>
            ) : (
              filteredMovements.map(mov => (
                <div
                  key={mov.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        mov.quantity > 0
                          ? 'bg-green-100 dark:bg-green-900/50'
                          : 'bg-red-100 dark:bg-red-900/50'
                      }`}
                    >
                      <span
                        className={`text-xl ${mov.quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {mov.quantity > 0 ? '↓' : '↑'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{mov.itemName}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{mov.itemSku}</span>
                        {mov.reference && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 dark:text-blue-400">
                              {mov.reference}
                            </span>
                          </>
                        )}
                      </div>
                      {mov.note && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{mov.note}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`text-lg font-bold ${MOVEMENT_LABELS[mov.type].color}`}>
                        {mov.quantity > 0 ? '+' : ''}
                        {mov.quantity}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {mov.previousStock} → {mov.newStock}
                      </p>
                    </div>

                    <div className="w-24 text-right">
                      <span className={`text-sm font-medium ${MOVEMENT_LABELS[mov.type].color}`}>
                        {MOVEMENT_LABELS[mov.type].label}
                      </span>
                    </div>

                    <div className="w-32 text-right text-sm text-gray-500 dark:text-gray-400">
                      <p>{formatDate(mov.createdAt)}</p>
                      <p>{mov.createdByName}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
