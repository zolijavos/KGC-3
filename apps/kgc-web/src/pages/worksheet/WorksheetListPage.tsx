// WorksheetListPage - List of worksheets with filtering
import { Button, Card, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  WorksheetPriority,
  WorksheetStatus,
  WorksheetType,
} from './types';

const STATUS_COLORS: Record<WorksheetStatus, string> = {
  [WorksheetStatus.FELVEVE]: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
  [WorksheetStatus.FOLYAMATBAN]:
    'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
  [WorksheetStatus.VARHATO]:
    'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
  [WorksheetStatus.KESZ]: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
  [WorksheetStatus.SZAMLAZANDO]: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200',
  [WorksheetStatus.LEZART]: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  [WorksheetStatus.TOROLVE]: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
};

interface Worksheet {
  id: string;
  worksheetNumber: string;
  partnerName: string;
  deviceName: string;
  type: WorksheetType;
  priority: WorksheetPriority;
  status: WorksheetStatus;
  faultDescription: string;
  createdAt: Date;
  estimatedCompletion: Date | null;
  totalAmount: number;
  assignedTo: string | null;
}

// Mock worksheets
const MOCK_WORKSHEETS: Worksheet[] = [
  {
    id: 'w1',
    worksheetNumber: 'M-2026-0001',
    partnerName: 'Kovács Építőipari Kft.',
    deviceName: 'Makita HR2470 Fúrókalapács',
    type: WorksheetType.FIZETOS,
    priority: WorksheetPriority.NORMAL,
    status: WorksheetStatus.FOLYAMATBAN,
    faultDescription: 'Nem forog, füstszag érezhető',
    createdAt: new Date('2026-01-15'),
    estimatedCompletion: new Date('2026-01-20'),
    totalAmount: 25600,
    assignedTo: 'Tóth Péter',
  },
  {
    id: 'w2',
    worksheetNumber: 'M-2026-0002',
    partnerName: 'Nagy János EV',
    deviceName: 'Bosch GBH 2-26 DRE Fúrókalapács',
    type: WorksheetType.GARANCIALIS,
    priority: WorksheetPriority.GARANCIALIS,
    status: WorksheetStatus.VARHATO,
    faultDescription: 'Ütvető mechanika nem működik',
    createdAt: new Date('2026-01-14'),
    estimatedCompletion: new Date('2026-01-25'),
    totalAmount: 0,
    assignedTo: null,
  },
  {
    id: 'w3',
    worksheetNumber: 'M-2026-0003',
    partnerName: 'Szabó és Társa Bt.',
    deviceName: 'Stihl MS 170 Láncfűrész',
    type: WorksheetType.KARBANTARTAS,
    priority: WorksheetPriority.NORMAL,
    status: WorksheetStatus.KESZ,
    faultDescription: 'Éves karbantartás',
    createdAt: new Date('2026-01-12'),
    estimatedCompletion: new Date('2026-01-18'),
    totalAmount: 18500,
    assignedTo: 'Kiss Gábor',
  },
  {
    id: 'w4',
    worksheetNumber: 'M-2026-0004',
    partnerName: 'Pintér Kertészet',
    deviceName: 'Husqvarna Automower 315X',
    type: WorksheetType.FIZETOS,
    priority: WorksheetPriority.SURGOS,
    status: WorksheetStatus.FELVEVE,
    faultDescription: 'Nem indul, hibajelzés a kijelzőn',
    createdAt: new Date('2026-01-18'),
    estimatedCompletion: null,
    totalAmount: 0,
    assignedTo: null,
  },
  {
    id: 'w5',
    worksheetNumber: 'M-2026-0005',
    partnerName: 'Magyar Tisztító Kft.',
    deviceName: 'Kärcher K5 Premium Magasnyomású mosó',
    type: WorksheetType.BERLESI,
    priority: WorksheetPriority.NORMAL,
    status: WorksheetStatus.SZAMLAZANDO,
    faultDescription: 'Bérlés utáni szerviz - szivattyú ellenőrzés',
    createdAt: new Date('2026-01-10'),
    estimatedCompletion: new Date('2026-01-15'),
    totalAmount: 32400,
    assignedTo: 'Tóth Péter',
  },
  {
    id: 'w6',
    worksheetNumber: 'M-2026-0006',
    partnerName: 'Kovács Építőipari Kft.',
    deviceName: 'Hilti TE 30-A36 Akkus fúrókalapács',
    type: WorksheetType.FIZETOS,
    priority: WorksheetPriority.NORMAL,
    status: WorksheetStatus.LEZART,
    faultDescription: 'Akku nem tölt',
    createdAt: new Date('2026-01-05'),
    estimatedCompletion: new Date('2026-01-10'),
    totalAmount: 45000,
    assignedTo: 'Kiss Gábor',
  },
];

export function WorksheetListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorksheetStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<WorksheetType | 'ALL'>('ALL');

  const filteredWorksheets = useMemo(() => {
    let filtered = MOCK_WORKSHEETS;

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(w => w.status === statusFilter);
    }

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(w => w.type === typeFilter);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        w =>
          w.worksheetNumber.toLowerCase().includes(term) ||
          w.partnerName.toLowerCase().includes(term) ||
          w.deviceName.toLowerCase().includes(term) ||
          w.faultDescription.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [search, statusFilter, typeFilter]);

  const stats = useMemo(
    () => ({
      new: MOCK_WORKSHEETS.filter(w => w.status === WorksheetStatus.FELVEVE).length,
      inProgress: MOCK_WORKSHEETS.filter(w => w.status === WorksheetStatus.FOLYAMATBAN).length,
      ready: MOCK_WORKSHEETS.filter(w => w.status === WorksheetStatus.KESZ).length,
      toBill: MOCK_WORKSHEETS.filter(w => w.status === WorksheetStatus.SZAMLAZANDO).length,
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
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Munkalapok</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Szerviz munkalap kezelés</p>
            </div>
          </div>

          <Button onClick={() => navigate('/worksheet/new')}>
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
            Új munkalap
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Felvéve</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.new}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Folyamatban</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.inProgress}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Kész</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.ready}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Számlázandó</p>
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats.toBill}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Input
              placeholder="Keresés munkalapszám, partner, gép vagy hiba alapján..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as WorksheetStatus | 'ALL')}
              className="rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary"
            >
              <option value="ALL">Minden státusz</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as WorksheetType | 'ALL')}
              className="rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary"
            >
              <option value="ALL">Minden típus</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Worksheet list */}
        <div className="space-y-4">
          {filteredWorksheets.map(worksheet => (
            <Card key={worksheet.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-medium text-kgc-primary">
                      {worksheet.worksheetNumber}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        STATUS_COLORS[worksheet.status]
                      )}
                    >
                      {STATUS_LABELS[worksheet.status]}
                    </span>
                    <span className="rounded-full bg-gray-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                      {TYPE_LABELS[worksheet.type]}
                    </span>
                    {worksheet.priority === WorksheetPriority.SURGOS && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        {PRIORITY_LABELS[worksheet.priority]}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                    {worksheet.partnerName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{worksheet.deviceName}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {worksheet.faultDescription}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 dark:text-gray-500">Felvétel</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(worksheet.createdAt)}
                    </p>
                  </div>
                  {worksheet.estimatedCompletion && (
                    <div>
                      <p className="text-gray-400 dark:text-gray-500">Határidő</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(worksheet.estimatedCompletion)}
                      </p>
                    </div>
                  )}
                  {worksheet.totalAmount > 0 && (
                    <div>
                      <p className="text-gray-400 dark:text-gray-500">Összeg</p>
                      <p className="font-medium text-kgc-primary">
                        {worksheet.totalAmount.toLocaleString()} Ft
                      </p>
                    </div>
                  )}
                  {worksheet.assignedTo && (
                    <div>
                      <p className="text-gray-400 dark:text-gray-500">Szerelő</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {worksheet.assignedTo}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {worksheet.status === WorksheetStatus.FELVEVE && (
                      <Button size="sm" variant="outline">
                        Elkezdés
                      </Button>
                    )}
                    {worksheet.status === WorksheetStatus.KESZ && (
                      <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                        Számlázás
                      </Button>
                    )}
                    {worksheet.status === WorksheetStatus.SZAMLAZANDO && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        Lezárás
                      </Button>
                    )}
                    <Button size="sm" variant="ghost">
                      Részletek
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {filteredWorksheets.length === 0 && (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
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
