import { Button, Card, CardContent, Input } from '@/components/ui';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_QUOTATIONS, QUOTATION_STATUSES } from './mock-data';
import type { QuotationStatus } from './types';

export function QuotationListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('all');

  const filteredQuotations = useMemo(() => {
    return MOCK_QUOTATIONS.filter(quotation => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          quotation.quotationNumber.toLowerCase().includes(search) ||
          quotation.partnerName.toLowerCase().includes(search) ||
          (quotation.worksheetNumber?.toLowerCase().includes(search) ?? false);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && quotation.status !== statusFilter) return false;

      return true;
    });
  }, [searchTerm, statusFilter]);

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

  const getStatusBadge = (status: QuotationStatus) => {
    const config = QUOTATION_STATUSES.find(s => s.value === status);
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${config?.color ?? ''}`}>
        {config?.label ?? status}
      </span>
    );
  };

  const isExpiringSoon = (validUntil: string) => {
    const daysUntilExpiry = Math.ceil(
      (new Date(validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 3;
  };

  // Stats
  const stats = {
    total: MOCK_QUOTATIONS.length,
    draft: MOCK_QUOTATIONS.filter(q => q.status === 'draft').length,
    sent: MOCK_QUOTATIONS.filter(q => q.status === 'sent').length,
    accepted: MOCK_QUOTATIONS.filter(q => q.status === 'accepted').length,
    totalValue: MOCK_QUOTATIONS.filter(q => q.status === 'sent').reduce(
      (sum, q) => sum + q.totalGross,
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
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Árajánlatok</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Szerviz árajánlatok kezelése
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/worksheet')}
            className="bg-kgc-primary hover:bg-kgc-primary/90"
          >
            Munkalapok →
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
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.draft}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Piszkozat</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.sent}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Elküldve</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.accepted}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Elfogadva</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatPrice(stats.totalValue)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Várakozó érték</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-[250px] flex-1">
                <Input
                  placeholder="Keresés szám, partner, munkalap..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as QuotationStatus | 'all')}
                className="rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">Minden státusz</option>
                {QUOTATION_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Quotations list */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                      Árajánlat
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                      Partner
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                      Munkalap
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                      Létrehozva
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                      Érvényes
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                      Összeg
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                      Státusz
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {filteredQuotations.map(quotation => (
                    <tr
                      key={quotation.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50"
                      onClick={() => navigate(`/quotations/${quotation.id}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {quotation.quotationNumber}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {quotation.items.length} tétel
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900 dark:text-gray-100">{quotation.partnerName}</p>
                        {quotation.partnerEmail && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {quotation.partnerEmail}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {quotation.worksheetNumber ? (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/worksheet/${quotation.worksheetId}`);
                            }}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {quotation.worksheetNumber}
                          </button>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-600 dark:text-gray-300">
                          {formatDate(quotation.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-300">
                            {formatDate(quotation.validUntil)}
                          </span>
                          {quotation.status === 'sent' && isExpiringSoon(quotation.validUntil) && (
                            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                              Hamarosan lejár!
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatPrice(quotation.totalGross)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">bruttó</p>
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(quotation.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/quotations/${quotation.id}`);
                          }}
                        >
                          Részletek →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredQuotations.length === 0 && (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                  <p>Nincs találat a szűrési feltételeknek megfelelően.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {filteredQuotations.length} árajánlat megjelenítve
        </p>

        {/* Info box */}
        <Card className="mt-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Új árajánlat készítése
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  Árajánlat készítéséhez nyisd meg a munkalapot, és kattints az "Árajánlat készítés"
                  gombra. A munkalap tételei automatikusan átkerülnek az árajánlatba.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
