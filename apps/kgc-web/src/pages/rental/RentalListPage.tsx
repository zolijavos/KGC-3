// RentalListPage - List of rentals with filtering
import { Button, Card, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Rental status
enum RentalStatus {
  ACTIVE = 'ACTIVE',
  OVERDUE = 'OVERDUE',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

const STATUS_LABELS: Record<RentalStatus, string> = {
  [RentalStatus.ACTIVE]: 'Aktív',
  [RentalStatus.OVERDUE]: 'Lejárt',
  [RentalStatus.RETURNED]: 'Visszavéve',
  [RentalStatus.CANCELLED]: 'Lemondva',
};

const STATUS_COLORS: Record<RentalStatus, string> = {
  [RentalStatus.ACTIVE]: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
  [RentalStatus.OVERDUE]: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
  [RentalStatus.RETURNED]: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  [RentalStatus.CANCELLED]: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
};

interface Rental {
  id: string;
  rentalNumber: string;
  partnerName: string;
  equipmentName: string;
  startDate: Date;
  endDate: Date;
  status: RentalStatus;
  dailyRate: number;
  totalAmount: number;
  depositAmount: number;
  depositPaid: boolean;
}

// Mock rentals
const MOCK_RENTALS: Rental[] = [
  {
    id: 'r1',
    rentalNumber: 'B-2026-0001',
    partnerName: 'Kovács Építőipari Kft.',
    equipmentName: 'Makita HR2470 Fúrókalapács',
    startDate: new Date('2026-01-15'),
    endDate: new Date('2026-01-22'),
    status: RentalStatus.ACTIVE,
    dailyRate: 5000,
    totalAmount: 35000,
    depositAmount: 50000,
    depositPaid: true,
  },
  {
    id: 'r2',
    rentalNumber: 'B-2026-0002',
    partnerName: 'Nagy János EV',
    equipmentName: 'Kärcher K5 Premium Magasnyomású mosó',
    startDate: new Date('2026-01-10'),
    endDate: new Date('2026-01-17'),
    status: RentalStatus.OVERDUE,
    dailyRate: 4500,
    totalAmount: 31500,
    depositAmount: 40000,
    depositPaid: true,
  },
  {
    id: 'r3',
    rentalNumber: 'B-2026-0003',
    partnerName: 'Szabó és Társa Bt.',
    equipmentName: 'Hilti TE 30-A36 Akkus fúrókalapács',
    startDate: new Date('2026-01-08'),
    endDate: new Date('2026-01-15'),
    status: RentalStatus.RETURNED,
    dailyRate: 8000,
    totalAmount: 56000,
    depositAmount: 80000,
    depositPaid: true,
  },
  {
    id: 'r4',
    rentalNumber: 'B-2026-0004',
    partnerName: 'Pintér Kertészet',
    equipmentName: 'Stihl MS 170 Láncfűrész',
    startDate: new Date('2026-01-18'),
    endDate: new Date('2026-01-25'),
    status: RentalStatus.ACTIVE,
    dailyRate: 6000,
    totalAmount: 42000,
    depositAmount: 60000,
    depositPaid: false,
  },
  {
    id: 'r5',
    rentalNumber: 'B-2026-0005',
    partnerName: 'Magyar Tisztító Kft.',
    equipmentName: 'Nilfisk SC401 Padlótisztító',
    startDate: new Date('2026-01-12'),
    endDate: new Date('2026-01-14'),
    status: RentalStatus.CANCELLED,
    dailyRate: 12000,
    totalAmount: 24000,
    depositAmount: 100000,
    depositPaid: false,
  },
];

export function RentalListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RentalStatus | 'ALL'>('ALL');

  const filteredRentals = useMemo(() => {
    let filtered = MOCK_RENTALS;

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.rentalNumber.toLowerCase().includes(term) ||
          r.partnerName.toLowerCase().includes(term) ||
          r.equipmentName.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [search, statusFilter]);

  const stats = useMemo(
    () => ({
      active: MOCK_RENTALS.filter(r => r.status === RentalStatus.ACTIVE).length,
      overdue: MOCK_RENTALS.filter(r => r.status === RentalStatus.OVERDUE).length,
      returned: MOCK_RENTALS.filter(r => r.status === RentalStatus.RETURNED).length,
      total: MOCK_RENTALS.length,
    }),
    []
  );

  const formatDate = (date: Date) => date.toLocaleDateString('hu-HU');

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
              onChange={e => setStatusFilter(e.target.value as RentalStatus | 'ALL')}
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

        {/* Rental list */}
        <div className="space-y-4">
          {filteredRentals.map(rental => (
            <Card
              key={rental.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/rental/${rental.id}`)}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium text-kgc-primary">
                      {rental.rentalNumber}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        STATUS_COLORS[rental.status]
                      )}
                    >
                      {STATUS_LABELS[rental.status]}
                    </span>
                    {!rental.depositPaid && (
                      <span className="rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                        Kaució hiányzik
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                    {rental.partnerName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{rental.equipmentName}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 dark:text-gray-500">Időszak</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(rental.startDate)} - {formatDate(rental.endDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 dark:text-gray-500">Összeg</p>
                    <p className="font-medium text-kgc-primary">
                      {rental.totalAmount.toLocaleString()} Ft
                    </p>
                  </div>
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    {rental.status === RentalStatus.ACTIVE && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/rental/return?id=${rental.id}`)}
                      >
                        Visszavétel
                      </Button>
                    )}
                    {rental.status === RentalStatus.OVERDUE && (
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

          {filteredRentals.length === 0 && (
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
      </main>
    </div>
  );
}
