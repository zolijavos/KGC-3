// RentalListPage - List of rentals with filtering
import { RentalStatus as ApiRentalStatus } from '@/api/rentals';
import { Button, Card, Input } from '@/components/ui';
import { useRentals } from '@/hooks/use-rentals';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Vázlat',
  ACTIVE: 'Aktív',
  OVERDUE: 'Lejárt',
  RETURNED: 'Visszavéve',
  COMPLETED: 'Lezárt',
  CANCELLED: 'Lemondva',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
  ACTIVE: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
  OVERDUE: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
  RETURNED: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  COMPLETED: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
  CANCELLED: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
};

export function RentalListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApiRentalStatus | 'ALL'>('ALL');

  // Fetch rentals from API
  const { rentals, total, loading, error } = useRentals({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    search: search.trim() || undefined,
  });

  const stats = useMemo(
    () => ({
      active: rentals.filter(r => r.status === ApiRentalStatus.ACTIVE).length,
      overdue: rentals.filter(r => r.status === ApiRentalStatus.OVERDUE).length,
      returned: rentals.filter(
        r => r.status === ApiRentalStatus.RETURNED || r.status === ApiRentalStatus.COMPLETED
      ).length,
      total: total,
    }),
    [rentals, total]
  );

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('hu-HU');

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bérlések</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Bérlés kezelés és nyomon követés
              </p>
            </div>
          </div>

          <Button onClick={() => navigate('/rental/new')}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Új bérlés
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Aktív</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Lejárt</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Visszavéve</p>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{stats.returned}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Összes</p>
            <p className="text-2xl font-bold text-kgc-primary">{stats.total}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Input
              placeholder="Keresés bérlésszám, partner vagy gép alapján..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as ApiRentalStatus | 'ALL')}
              className="rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary"
            >
              <option value="ALL">Minden státusz</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Loading state */}
        {loading && (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-kgc-primary border-r-transparent" />
            <p className="mt-2 text-gray-500 dark:text-gray-400">Betöltés...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card className="p-6 text-center border-red-200 dark:border-red-800">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Újrapróbálás
            </Button>
          </Card>
        )}

        {/* Rental list */}
        {!loading && !error && (
          <div className="space-y-4">
            {rentals.map(rental => (
              <Card
                key={rental.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/rental/${rental.id}`)}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium text-kgc-primary">
                        {rental.rentalCode}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_COLORS[rental.status] ?? STATUS_COLORS.ACTIVE
                        )}
                      >
                        {STATUS_LABELS[rental.status] ?? rental.status}
                      </span>
                      {rental.depositPaid < rental.depositAmount && (
                        <span className="rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                          Kaució hiányzik
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                      {rental.customerName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {rental.equipmentName}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 dark:text-gray-500">Időszak</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(rental.startDate)} - {formatDate(rental.expectedReturnDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 dark:text-gray-500">Összeg</p>
                      <p className="font-medium text-kgc-primary">
                        {rental.totalAmount.toLocaleString()} Ft
                      </p>
                    </div>
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      {rental.status === ApiRentalStatus.ACTIVE && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/rental/return?id=${rental.id}`)}
                        >
                          Visszavétel
                        </Button>
                      )}
                      {rental.status === ApiRentalStatus.OVERDUE && (
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => navigate(`/rental/return?id=${rental.id}`)}
                        >
                          Visszavétel
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/rental/${rental.id}`)}
                      >
                        Részletek
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {rentals.length === 0 && (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="mt-2">Nincs találat a keresési feltételekre.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
