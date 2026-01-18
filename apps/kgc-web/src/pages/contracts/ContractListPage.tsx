import { Button, Card, CardContent, Input } from '@/components/ui';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CONTRACT_STATUSES, CONTRACT_TYPES, MOCK_CONTRACTS } from './mock-data';
import type { ContractStatus, ContractType } from './types';

export function ContractListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ContractType | 'all'>('all');

  const filteredContracts = useMemo(() => {
    return MOCK_CONTRACTS.filter(contract => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          contract.contractNumber.toLowerCase().includes(search) ||
          contract.partnerName.toLowerCase().includes(search) ||
          (contract.rentalNumber?.toLowerCase().includes(search) ?? false);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && contract.status !== statusFilter) return false;

      // Type filter
      if (typeFilter !== 'all' && contract.type !== typeFilter) return false;

      return true;
    });
  }, [searchTerm, statusFilter, typeFilter]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('hu-HU');
  };

  const getStatusBadge = (status: ContractStatus) => {
    const config = CONTRACT_STATUSES.find(s => s.value === status);
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${config?.color ?? ''}`}>
        {config?.label ?? status}
      </span>
    );
  };

  const getTypeBadge = (type: ContractType) => {
    const config = CONTRACT_TYPES.find(t => t.value === type);
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config?.color ?? ''}`}>
        {config?.label ?? type}
      </span>
    );
  };

  // Stats
  const stats = {
    total: MOCK_CONTRACTS.length,
    active: MOCK_CONTRACTS.filter(c => c.status === 'active').length,
    draft: MOCK_CONTRACTS.filter(c => c.status === 'draft').length,
    totalDeposit: MOCK_CONTRACTS.filter(c => c.status === 'active').reduce(
      (sum, c) => sum + c.depositAmount,
      0
    ),
    totalValue: MOCK_CONTRACTS.filter(c => c.status === 'active').reduce(
      (sum, c) => sum + c.totalAmount,
      0
    ),
  };

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Szerződések</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Bérlési és szolgáltatási szerződések
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/rental')}
            className="bg-kgc-primary hover:bg-kgc-primary/90"
          >
            Bérlések →
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Összes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.active}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aktív</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.draft}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Piszkozat</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatPrice(stats.totalDeposit)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aktív kaució</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatPrice(stats.totalValue)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aktív érték</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-[250px] flex-1">
                <Input
                  placeholder="Keresés szám, partner, bérlés..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as ContractType | 'all')}
                className="rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">Minden típus</option>
                {CONTRACT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as ContractStatus | 'all')}
                className="rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">Minden státusz</option>
                {CONTRACT_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Contracts list */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                      Szerződés
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                      Partner
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                      Időszak
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                      Összeg
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                      Kaució
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                      Státusz
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {filteredContracts.map(contract => (
                    <tr
                      key={contract.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50"
                      onClick={() => navigate(`/contracts/${contract.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {contract.contractNumber}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {getTypeBadge(contract.type)}
                              {contract.rentalNumber && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {contract.rentalNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900 dark:text-gray-100">{contract.partnerName}</p>
                        {contract.partnerPhone && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {contract.partnerPhone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900 dark:text-gray-100">
                          {formatDate(contract.startDate)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          → {formatDate(contract.actualEndDate ?? contract.expectedEndDate)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatPrice(contract.totalAmount)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p
                          className={`font-medium ${contract.depositPaid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                        >
                          {formatPrice(contract.depositAmount)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {contract.depositPaid ? '✓ Befizetve' : '✗ Nincs'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(contract.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/contracts/${contract.id}`);
                          }}
                        >
                          Részletek →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredContracts.length === 0 && (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                  <p>Nincs találat a szűrési feltételeknek megfelelően.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {filteredContracts.length} szerződés megjelenítve
        </p>

        {/* Info box */}
        <Card className="mt-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Szerződés automatikus generálás
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  A szerződések automatikusan generálódnak a bérlés indításakor. PDF letöltés és
                  nyomtatás a részletek oldalon érhető el.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
